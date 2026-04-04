package services

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"sort"
	"strings"
	"encoding/json"

	"gopkg.in/yaml.v3"
	"gorm.io/gorm"

	"blog-backend/internal/config"
	"blog-backend/internal/database"
	"blog-backend/internal/models"
	"blog-backend/pkg/utils"
)

type GitHubImporterService struct {
	client     *http.Client
	token      string
	apiBaseURL string
}

func NewGitHubImporterService(cfg *config.Config) *GitHubImporterService {
	token := ""
	apiBaseURL := "https://api.github.com"
	if cfg != nil {
		token = strings.TrimSpace(cfg.AssetSync.Token)
		if cfg.AssetSync.APIBaseURL != "" {
			apiBaseURL = strings.TrimRight(strings.TrimSpace(cfg.AssetSync.APIBaseURL), "/")
		}
	}
	return &GitHubImporterService{
		client:     &http.Client{},
		token:      token,
		apiBaseURL: apiBaseURL,
	}
}

// ExtractGitHubURL parses a github URL.
func ExtractGitHubURL(urlStr string) (owner, repo, branch, path string, err error) {
	urlStr = strings.TrimSpace(urlStr)
	// Example: https://github.com/lijigang/ljg-skills/tree/master/skills/ljg-card
	// Example: https://github.com/lijigang/ljg-skills

	re := regexp.MustCompile(`^https?://github\.com/([^/]+)/([^/]+)(?:/tree/([^/]+)/(.*))?$`)
	matches := re.FindStringSubmatch(urlStr)

	if len(matches) == 0 {
		return "", "", "", "", errors.New("无效的 GitHub URL 格式")
	}

	owner = matches[1]
	repo = strings.TrimSuffix(matches[2], ".git")
	branch = "main" // default
	if len(matches) > 3 && matches[3] != "" {
		branch = matches[3]
		path = strings.TrimSuffix(matches[4], "/")
	}

	return owner, repo, branch, path, nil
}

func (s *GitHubImporterService) fetchTree(ctx context.Context, owner, repo, branch string) (*gitHubTreeResponse, error) {
	url := fmt.Sprintf("%s/repos/%s/%s/git/trees/%s?recursive=1", s.apiBaseURL, owner, repo, branch)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	if s.token != "" {
		req.Header.Set("Authorization", "Bearer "+s.token)
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("获取 GitHub Tree 失败 (%d): %s", resp.StatusCode, string(body))
	}

	// Manual JSON decoding, we can reuse gitHubTreeResponse from github_asset_sync.go
	// wait, it is tightly coupled in the other file. Let's redeclare or use helper.
	// they are in the same package 'services', so we can reuse gitHubTreeResponse!
	var treeResp gitHubTreeResponse
	if err := json.NewDecoder(resp.Body).Decode(&treeResp); err != nil {
		return nil, err
	}

	return &treeResp, nil
}

func (s *GitHubImporterService) fetchRawFile(ctx context.Context, owner, repo, branch, path string) (string, error) {
	// e.g. https://raw.githubusercontent.com/lijigang/ljg-skills/master/skills/ljg-card/SKILL.md
	url := fmt.Sprintf("https://raw.githubusercontent.com/%s/%s/%s/%s", owner, repo, branch, path)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return "", err
	}
	// Note: raw.githubusercontent.com may accept auth, but usually public is fine.
	if s.token != "" {
		req.Header.Set("Authorization", "Token "+s.token)
	}

	resp, err := s.client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("下载文件失败: %s", path)
	}

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}
	return string(bodyBytes), nil
}

type importSkillNode struct {
	RelativeDir string
	SkillName   string
	IsVirtual   bool
	Content     string
	Frontmatter map[string]interface{}
	Files       []models.SkillSupportingFile
	ParentID    *uint
	DBID        uint
}

// ImportSkills processes the GitHub URL, builds the hierarchy, and saves to DB.
// Returns the list of affected parent IDs and all skills that need to be synced back.
func (s *GitHubImporterService) ImportSkills(ctx context.Context, urlStr string, currentUserID uint) ([]models.Skill, error) {
	owner, repo, branch, subpath, err := ExtractGitHubURL(urlStr)
	if err != nil {
		return nil, err
	}

	treeResp, err := s.fetchTree(ctx, owner, repo, branch)
	if err != nil {
		return nil, err
	}

	// 过滤出位于 subpath 下的文件
	subpathPrefix := ""
	if subpath != "" {
		subpathPrefix = subpath + "/"
	}

	fileNodes := make(map[string]string) // path -> sha
	for _, entry := range treeResp.Tree {
		if entry.Type == "blob" {
			if subpath == "" || entry.Path == subpath || strings.HasPrefix(entry.Path, subpathPrefix) {
				fileNodes[entry.Path] = entry.SHA
			}
		}
	}

	// 找出所有 SKILL.md 的目录
	skillDirs := make(map[string]bool)
	for path := range fileNodes {
		if strings.HasSuffix(strings.ToLower(path), "skill.md") {
			dir := getDir(path)
			skillDirs[dir] = true
		}
	}

	if len(skillDirs) == 0 {
		return nil, errors.New("在指定的路径下未找到任何 SKILL.md 文件")
	}

	// 计算所有虚拟父目录
	allDirs := make(map[string]bool)
	for dir := range skillDirs {
		current := dir
		allDirs[current] = true
		for current != subpath && current != "" {
			parent := getDir(current)
			if parent == current { // should not happen if subpath handled
				break
			}
			allDirs[parent] = true
			current = parent
		}
	}
	allDirs[subpath] = true

	// 排序目录，为了按深度从浅到深创建
	var sortedDirs []string
	for dir := range allDirs {
		sortedDirs = append(sortedDirs, dir)
	}
	sort.Slice(sortedDirs, func(i, j int) bool {
		return len(strings.Split(sortedDirs[i], "/")) < len(strings.Split(sortedDirs[j], "/"))
	})

	nodes := make(map[string]*importSkillNode)
	
	// 如果 subpath 是空，虚拟根节点名字为 repo 名称；否则为 subpath 的最终部分
	rootName := repo
	if subpath != "" {
		parts := strings.Split(subpath, "/")
		rootName = parts[len(parts)-1]
	}

	// 组装节点信息
	for _, dir := range sortedDirs {
		isVirtual := !skillDirs[dir]
		nodeName := rootName
		if dir != subpath {
			parts := strings.Split(dir, "/")
			nodeName = parts[len(parts)-1]
		}

		nodes[dir] = &importSkillNode{
			RelativeDir: dir,
			SkillName:   nodeName,
			IsVirtual:   isVirtual,
			Frontmatter: make(map[string]interface{}),
		}
	}

	// 拉取文件内容
	for dir := range skillDirs {
		node := nodes[dir]
		// SKILL.md 可以是大写或小写，尝试在 fileNodes 里找真实的
		var skillMDPath string
		for p := range fileNodes {
			if getDir(p) == dir && strings.ToLower(basename(p)) == "skill.md" {
				skillMDPath = p
				break
			}
		}

		if skillMDPath != "" {
			rawContent, err := s.fetchRawFile(ctx, owner, repo, branch, skillMDPath)
			if err != nil {
				return nil, err
			}
			fm, mdContent := parseFrontmatter(rawContent)
			node.Content = mdContent
			node.Frontmatter = fm
			if name, ok := fm["name"].(string); ok && name != "" {
				node.SkillName = name
			}
		}
		
		// 收集其 supporting files
		for p := range fileNodes {
			if getDir(p) == dir && strings.ToLower(basename(p)) != "skill.md" {
				rawContent, _ := s.fetchRawFile(ctx, owner, repo, branch, p)
				node.Files = append(node.Files, models.SkillSupportingFile{
					Path:    basename(p),
					Content: rawContent,
				})
			}
		}
	}

	// 开始存入数据库
	var importedSkills []models.Skill
	tx := database.DB.Begin()
	if tx.Error != nil {
		return nil, tx.Error
	}
	defer tx.Rollback()

	for _, dir := range sortedDirs {
		node := nodes[dir]

		// 确定 ParentID
		if dir != subpath {
			parentDir := getDir(dir)
			if parentNode, exists := nodes[parentDir]; exists {
				node.ParentID = &parentNode.DBID
			}
		}

		// 存入或更新 DB
		skill := models.Skill{
			Name: node.SkillName,
			Slug: utils.GenerateSlug(node.SkillName), 
			// 如果已存在同名 slug，我们将覆盖更新
		}

		var existing models.Skill
		result := tx.Where("slug = ?", skill.Slug).First(&existing)
		if result.Error == nil {
			// 更新现有项
			node.DBID = existing.ID
			existing.Name = node.SkillName
			existing.Content = node.Content
			existing.ParentID = node.ParentID
			existing.Status = "active" // imported ones goes active
			existing.AuthorID = currentUserID
			// Extract anthropic config from frontmatter
			existing.Description = extractString(node.Frontmatter, "description")
			existing.AnthropicConfig = extractConfig(node.Frontmatter)
			existing.SupportingFiles = node.Files
			if err := tx.Save(&existing).Error; err != nil {
				return nil, err
			}
			importedSkills = append(importedSkills, existing)
		} else {
			// 创建新项
			skill.Content = node.Content
			skill.ParentID = node.ParentID
			skill.Status = "active"
			skill.AuthorID = currentUserID
			skill.Description = extractString(node.Frontmatter, "description")
			skill.AnthropicConfig = extractConfig(node.Frontmatter)
			skill.SupportingFiles = node.Files
			
			// Generate unique slug if collision
			skill.Slug = resolveSkillSlugForImport(tx, skill.Slug, 0)
			
			if err := tx.Create(&skill).Error; err != nil {
				return nil, err
			}
			node.DBID = skill.ID
			importedSkills = append(importedSkills, skill)
		}
	}

	if err := tx.Commit().Error; err != nil {
		return nil, err
	}

	// 重新从数据库拉取完整的以备后续 Sync 动作
	var finalSkills []models.Skill
	var ids []uint
	for _, s := range importedSkills {
		ids = append(ids, s.ID)
	}
	database.DB.Where("id IN ?", ids).Find(&finalSkills)

	return finalSkills, nil
}

func getDir(path string) string {
	idx := strings.LastIndex(path, "/")
	if idx == -1 {
		return ""
	}
	return path[:idx]
}

func basename(path string) string {
	idx := strings.LastIndex(path, "/")
	if idx == -1 {
		return path
	}
	return path[idx+1:]
}

func parseFrontmatter(content string) (map[string]interface{}, string) {
	if !strings.HasPrefix(strings.TrimSpace(content), "---") {
		return make(map[string]interface{}), content
	}

	parts := strings.SplitN(content, "---", 3)
	if len(parts) >= 3 {
		fmRaw := parts[1]
		mdContent := strings.TrimSpace(parts[2])
		
		var fm map[string]interface{}
		if err := yaml.Unmarshal([]byte(fmRaw), &fm); err == nil && fm != nil {
			return fm, mdContent
		}
	}
	return make(map[string]interface{}), content
}

func extractString(m map[string]interface{}, key string) string {
	if v, ok := m[key]; ok {
		if s, ok := v.(string); ok {
			return s
		}
	}
	return ""
}

func extractConfig(m map[string]interface{}) map[string]interface{} {
	cfg := make(map[string]interface{})
	for k, v := range m {
		lo := strings.ToLower(k)
		if lo == "name" || lo == "description" || lo == "slug" || lo == "tags" || lo == "status" {
			continue
		}
		cfg[k] = v
	}
	return cfg
}

func resolveSkillSlugForImport(tx *gorm.DB, baseSlug string, excludeID uint) string {
	slug := baseSlug
	counter := 1
	for {
		var count int64
		query := tx.Model(&models.Skill{}).Where("slug = ?", slug)
		if excludeID != 0 {
			query = query.Where("id != ?", excludeID)
		}
		query.Count(&count)
		if count == 0 {
			break
		}
		slug = fmt.Sprintf("%s-%d", baseSlug, counter)
		counter++
	}
	return slug
}
