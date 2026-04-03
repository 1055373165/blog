package services

import (
	"bytes"
	"context"
	"crypto/sha1"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"sort"
	"strings"
	"time"

	"gopkg.in/yaml.v3"
	"gorm.io/gorm"

	"blog-backend/internal/config"
	"blog-backend/internal/database"
	"blog-backend/internal/models"
)

type GitHubAssetSyncService struct {
	client         *http.Client
	enabled        bool
	apiBaseURL     string
	token          string
	repoOwner      string
	repoName       string
	repoBranch     string
	promptsDir     string
	skillsDir      string
	committerName  string
	committerEmail string
}

type gitHubBranchResponse struct {
	Commit struct {
		SHA    string `json:"sha"`
		Commit struct {
			Tree struct {
				SHA string `json:"sha"`
			} `json:"tree"`
		} `json:"commit"`
	} `json:"commit"`
}

type gitHubTreeResponse struct {
	Tree []struct {
		Path string `json:"path"`
		Type string `json:"type"`
		SHA  string `json:"sha"`
	} `json:"tree"`
	Truncated bool `json:"truncated"`
}

type gitHubCreateBlobRequest struct {
	Content  string `json:"content"`
	Encoding string `json:"encoding"`
}

type gitHubCreateBlobResponse struct {
	SHA string `json:"sha"`
}

type gitHubTreeEntry struct {
	Path string  `json:"path"`
	Mode string  `json:"mode,omitempty"`
	Type string  `json:"type,omitempty"`
	SHA  *string `json:"sha"`
}

type gitHubCreateTreeRequest struct {
	BaseTree string            `json:"base_tree,omitempty"`
	Tree     []gitHubTreeEntry `json:"tree"`
}

type gitHubCreateTreeResponse struct {
	SHA string `json:"sha"`
}

type gitHubCommitIdentity struct {
	Name  string `json:"name"`
	Email string `json:"email"`
}

type gitHubCreateCommitRequest struct {
	Message   string                `json:"message"`
	Tree      string                `json:"tree"`
	Parents   []string              `json:"parents"`
	Author    *gitHubCommitIdentity `json:"author,omitempty"`
	Committer *gitHubCommitIdentity `json:"committer,omitempty"`
}

type gitHubCreateCommitResponse struct {
	SHA string `json:"sha"`
}

type gitHubUpdateRefRequest struct {
	SHA   string `json:"sha"`
	Force bool   `json:"force"`
}

type gitHubAPIError struct {
	Message string `json:"message"`
}

type gitHubTreeNode struct {
	Path string
	SHA  string
}

func NewGitHubAssetSyncService(cfg *config.Config) *GitHubAssetSyncService {
	service := &GitHubAssetSyncService{
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
	}

	if cfg == nil {
		return service
	}

	service.enabled = cfg.AssetSync.Enabled
	service.apiBaseURL = strings.TrimRight(strings.TrimSpace(cfg.AssetSync.APIBaseURL), "/")
	service.token = strings.TrimSpace(cfg.AssetSync.Token)
	service.repoOwner = strings.TrimSpace(cfg.AssetSync.RepoOwner)
	service.repoName = strings.TrimSpace(cfg.AssetSync.RepoName)
	service.repoBranch = strings.TrimSpace(cfg.AssetSync.RepoBranch)
	service.promptsDir = trimRepoDir(cfg.AssetSync.PromptsDir, "prompts")
	service.skillsDir = trimRepoDir(cfg.AssetSync.SkillsDir, "skills")
	service.committerName = strings.TrimSpace(cfg.AssetSync.CommitterName)
	service.committerEmail = strings.TrimSpace(cfg.AssetSync.CommitterEmail)

	if service.apiBaseURL == "" {
		service.apiBaseURL = "https://api.github.com"
	}
	if service.repoBranch == "" {
		service.repoBranch = "main"
	}
	if service.committerName == "" {
		service.committerName = "Blog AI Asset Sync"
	}
	if service.committerEmail == "" {
		service.committerEmail = "ai-assets-sync@local"
	}

	return service
}

func (s *GitHubAssetSyncService) SyncPrompt(ctx context.Context, prompt models.Prompt, previous *models.Prompt) error {
	if err := s.validate(); err != nil {
		return err
	}

	newPath, err := s.buildPromptRepoPath(prompt)
	if err != nil {
		return err
	}

	content, err := buildPromptMarkdown(prompt)
	if err != nil {
		return err
	}

	desiredFiles := map[string]string{
		newPath: content,
	}

	var cleanupPaths []string
	if previous != nil {
		oldPath, buildErr := s.buildPromptRepoPath(*previous)
		if buildErr != nil {
			return buildErr
		}
		cleanupPaths = append(cleanupPaths, oldPath)
	}

	return s.syncFiles(
		ctx,
		desiredFiles,
		cleanupPaths,
		nil,
		fmt.Sprintf("sync(prompt): %s", newPath),
	)
}

func (s *GitHubAssetSyncService) SyncSkill(ctx context.Context, skill models.Skill, previous *models.Skill) error {
	if err := s.validate(); err != nil {
		return err
	}

	newDir, err := s.buildSkillRepoDir(skill)
	if err != nil {
		return err
	}

	desiredFiles, err := buildSkillRepoFiles(newDir, skill)
	if err != nil {
		return err
	}

	var cleanupPrefixes []string
	cleanupPrefixes = append(cleanupPrefixes, newDir)
	if previous != nil {
		oldDir, buildErr := s.buildSkillRepoDir(*previous)
		if buildErr != nil {
			return buildErr
		}
		cleanupPrefixes = append(cleanupPrefixes, oldDir)
	}

	return s.syncFiles(
		ctx,
		desiredFiles,
		nil,
		cleanupPrefixes,
		fmt.Sprintf("sync(skill): %s", newDir),
	)
}

func (s *GitHubAssetSyncService) syncFiles(
	ctx context.Context,
	desiredFiles map[string]string,
	cleanupPaths []string,
	cleanupPrefixes []string,
	commitMessage string,
) error {
	branchInfo, err := s.getBranch(ctx)
	if err != nil {
		return err
	}

	treeNodes, err := s.getRecursiveTree(ctx, branchInfo.Commit.Commit.Tree.SHA)
	if err != nil {
		return err
	}

	deletes := collectPathsToDelete(treeNodes, desiredFiles, cleanupPaths, cleanupPrefixes)
	updates := make(map[string]string, len(desiredFiles))
	for path, content := range desiredFiles {
		expectedSHA := computeGitBlobSHA(content)
		existingNode, exists := treeNodes[path]
		if exists && existingNode.SHA == expectedSHA {
			continue
		}
		updates[path] = content
	}

	if len(deletes) == 0 && len(updates) == 0 {
		return nil
	}

	treeEntries := make([]gitHubTreeEntry, 0, len(deletes)+len(updates))
	for _, path := range deletes {
		treeEntries = append(treeEntries, gitHubTreeEntry{
			Path: path,
			Mode: "100644",
			Type: "blob",
			SHA:  nil,
		})
	}

	updatePaths := make([]string, 0, len(updates))
	for path := range updates {
		updatePaths = append(updatePaths, path)
	}
	sort.Strings(updatePaths)

	for _, path := range updatePaths {
		blobSHA, err := s.createBlob(ctx, updates[path])
		if err != nil {
			return err
		}

		treeEntries = append(treeEntries, gitHubTreeEntry{
			Path: path,
			Mode: "100644",
			Type: "blob",
			SHA:  &blobSHA,
		})
	}

	newTreeSHA, err := s.createTree(ctx, branchInfo.Commit.Commit.Tree.SHA, treeEntries)
	if err != nil {
		return err
	}

	newCommitSHA, err := s.createCommit(ctx, commitMessage, newTreeSHA, branchInfo.Commit.SHA)
	if err != nil {
		return err
	}

	return s.updateRef(ctx, newCommitSHA)
}

func (s *GitHubAssetSyncService) validate() error {
	if !s.enabled {
		return errors.New("GitHub 资产同步未启用，请设置 AI_ASSET_GITHUB_ENABLED=true")
	}
	if s.token == "" {
		return errors.New("缺少 GitHub Token，请设置 AI_ASSET_GITHUB_TOKEN")
	}
	if s.repoOwner == "" || s.repoName == "" {
		return errors.New("GitHub 仓库配置不完整，请检查 AI_ASSET_GITHUB_REPO_OWNER 和 AI_ASSET_GITHUB_REPO_NAME")
	}
	if s.apiBaseURL == "" {
		return errors.New("GitHub API 地址为空")
	}
	return nil
}

func (s *GitHubAssetSyncService) getBranch(ctx context.Context) (*gitHubBranchResponse, error) {
	var response gitHubBranchResponse
	if err := s.doJSON(
		ctx,
		http.MethodGet,
		fmt.Sprintf("/repos/%s/%s/branches/%s", s.repoOwner, s.repoName, s.repoBranch),
		nil,
		&response,
	); err != nil {
		return nil, err
	}

	return &response, nil
}

func (s *GitHubAssetSyncService) getRecursiveTree(ctx context.Context, treeSHA string) (map[string]gitHubTreeNode, error) {
	var response gitHubTreeResponse
	if err := s.doJSON(
		ctx,
		http.MethodGet,
		fmt.Sprintf("/repos/%s/%s/git/trees/%s?recursive=1", s.repoOwner, s.repoName, treeSHA),
		nil,
		&response,
	); err != nil {
		return nil, err
	}

	if response.Truncated {
		return nil, errors.New("GitHub 仓库树过大，无法完成完整同步")
	}

	nodes := make(map[string]gitHubTreeNode, len(response.Tree))
	for _, entry := range response.Tree {
		if entry.Type != "blob" {
			continue
		}
		nodes[entry.Path] = gitHubTreeNode{
			Path: entry.Path,
			SHA:  entry.SHA,
		}
	}
	return nodes, nil
}

func (s *GitHubAssetSyncService) createBlob(ctx context.Context, content string) (string, error) {
	var response gitHubCreateBlobResponse
	if err := s.doJSON(
		ctx,
		http.MethodPost,
		fmt.Sprintf("/repos/%s/%s/git/blobs", s.repoOwner, s.repoName),
		gitHubCreateBlobRequest{
			Content:  content,
			Encoding: "utf-8",
		},
		&response,
	); err != nil {
		return "", err
	}

	return response.SHA, nil
}

func (s *GitHubAssetSyncService) createTree(ctx context.Context, baseTreeSHA string, entries []gitHubTreeEntry) (string, error) {
	var response gitHubCreateTreeResponse
	if err := s.doJSON(
		ctx,
		http.MethodPost,
		fmt.Sprintf("/repos/%s/%s/git/trees", s.repoOwner, s.repoName),
		gitHubCreateTreeRequest{
			BaseTree: baseTreeSHA,
			Tree:     entries,
		},
		&response,
	); err != nil {
		return "", err
	}

	return response.SHA, nil
}

func (s *GitHubAssetSyncService) createCommit(ctx context.Context, message, treeSHA, parentCommitSHA string) (string, error) {
	identity := &gitHubCommitIdentity{
		Name:  s.committerName,
		Email: s.committerEmail,
	}

	var response gitHubCreateCommitResponse
	if err := s.doJSON(
		ctx,
		http.MethodPost,
		fmt.Sprintf("/repos/%s/%s/git/commits", s.repoOwner, s.repoName),
		gitHubCreateCommitRequest{
			Message:   message,
			Tree:      treeSHA,
			Parents:   []string{parentCommitSHA},
			Author:    identity,
			Committer: identity,
		},
		&response,
	); err != nil {
		return "", err
	}

	return response.SHA, nil
}

func (s *GitHubAssetSyncService) updateRef(ctx context.Context, commitSHA string) error {
	return s.doJSON(
		ctx,
		http.MethodPatch,
		fmt.Sprintf("/repos/%s/%s/git/refs/heads/%s", s.repoOwner, s.repoName, s.repoBranch),
		gitHubUpdateRefRequest{
			SHA:   commitSHA,
			Force: false,
		},
		nil,
	)
}

func (s *GitHubAssetSyncService) doJSON(ctx context.Context, method, path string, body any, out any) error {
	var requestBody io.Reader
	if body != nil {
		var buffer bytes.Buffer
		if err := json.NewEncoder(&buffer).Encode(body); err != nil {
			return fmt.Errorf("序列化 GitHub 请求失败: %w", err)
		}
		requestBody = &buffer
	}

	req, err := http.NewRequestWithContext(ctx, method, s.apiBaseURL+path, requestBody)
	if err != nil {
		return fmt.Errorf("创建 GitHub 请求失败: %w", err)
	}

	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("Authorization", "Bearer "+s.token)
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	resp, err := s.client.Do(req)
	if err != nil {
		return fmt.Errorf("请求 GitHub 失败: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		responseBody, _ := io.ReadAll(resp.Body)
		var apiErr gitHubAPIError
		if len(responseBody) > 0 && json.Unmarshal(responseBody, &apiErr) == nil && strings.TrimSpace(apiErr.Message) != "" {
			return fmt.Errorf("GitHub API 错误（%d）: %s", resp.StatusCode, apiErr.Message)
		}
		return fmt.Errorf("GitHub API 错误（%d）: %s", resp.StatusCode, strings.TrimSpace(string(responseBody)))
	}

	if out == nil {
		io.Copy(io.Discard, resp.Body)
		return nil
	}

	if err := json.NewDecoder(resp.Body).Decode(out); err != nil {
		return fmt.Errorf("解析 GitHub 响应失败: %w", err)
	}

	return nil
}

func (s *GitHubAssetSyncService) buildPromptRepoPath(prompt models.Prompt) (string, error) {
	parentSegments, err := collectPromptParentSlugs(prompt.ParentID)
	if err != nil {
		return "", err
	}

	segments := make([]string, 0, len(parentSegments)+2)
	segments = append(segments, s.promptsDir)
	segments = append(segments, parentSegments...)
	segments = append(segments, prompt.Slug+".md")
	return strings.Join(segments, "/"), nil
}

func (s *GitHubAssetSyncService) buildSkillRepoDir(skill models.Skill) (string, error) {
	parentSegments, err := collectSkillParentSlugs(skill.ParentID)
	if err != nil {
		return "", err
	}

	segments := make([]string, 0, len(parentSegments)+2)
	segments = append(segments, s.skillsDir)
	segments = append(segments, parentSegments...)
	segments = append(segments, skill.Slug)
	return strings.Join(segments, "/"), nil
}

func collectPromptParentSlugs(parentID *uint) ([]string, error) {
	return collectAncestorSlugs(parentID, func(id uint) (string, *uint, error) {
		var prompt models.Prompt
		err := database.DB.Select("id", "slug", "parent_id").First(&prompt, id).Error
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return "", nil, fmt.Errorf("父提示词 %d 不存在", id)
			}
			return "", nil, fmt.Errorf("查询父提示词失败: %w", err)
		}
		return prompt.Slug, prompt.ParentID, nil
	})
}

func collectSkillParentSlugs(parentID *uint) ([]string, error) {
	return collectAncestorSlugs(parentID, func(id uint) (string, *uint, error) {
		var skill models.Skill
		err := database.DB.Select("id", "slug", "parent_id").First(&skill, id).Error
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return "", nil, fmt.Errorf("父 Skill %d 不存在", id)
			}
			return "", nil, fmt.Errorf("查询父 Skill 失败: %w", err)
		}
		return skill.Slug, skill.ParentID, nil
	})
}

func collectAncestorSlugs(parentID *uint, lookup func(id uint) (string, *uint, error)) ([]string, error) {
	if parentID == nil {
		return []string{}, nil
	}

	segments := make([]string, 0)
	seen := make(map[uint]bool)
	currentID := parentID

	for currentID != nil {
		if seen[*currentID] {
			return nil, errors.New("检测到循环父子层级，无法生成 GitHub 路径")
		}
		seen[*currentID] = true

		slug, nextParentID, err := lookup(*currentID)
		if err != nil {
			return nil, err
		}
		segments = append(segments, slug)
		currentID = nextParentID
	}

	for left, right := 0, len(segments)-1; left < right; left, right = left+1, right-1 {
		segments[left], segments[right] = segments[right], segments[left]
	}

	return segments, nil
}

func buildPromptMarkdown(prompt models.Prompt) (string, error) {
	frontmatter := map[string]interface{}{
		"name":   prompt.Name,
		"slug":   prompt.Slug,
		"status": prompt.Status,
	}

	if trimmed := strings.TrimSpace(prompt.Description); trimmed != "" {
		frontmatter["description"] = trimmed
	}
	if len(prompt.Tags) > 0 {
		frontmatter["tags"] = prompt.Tags
	}
	if len(prompt.ApplicableModels) > 0 {
		frontmatter["applicable_models"] = prompt.ApplicableModels
	}
	if trimmed := strings.TrimSpace(prompt.Notes); trimmed != "" {
		frontmatter["notes"] = trimmed
	}

	return buildFrontmatterMarkdown(frontmatter, prompt.Content)
}

func buildSkillRepoFiles(baseDir string, skill models.Skill) (map[string]string, error) {
	skillMarkdown, err := buildSkillMarkdown(skill)
	if err != nil {
		return nil, err
	}

	files := map[string]string{
		baseDir + "/SKILL.md": skillMarkdown,
	}

	for _, file := range normalizeSupportingFilesForGitHub(skill.SupportingFiles) {
		files[baseDir+"/"+file.Path] = strings.ReplaceAll(file.Content, "\r\n", "\n")
	}

	return files, nil
}

func buildSkillMarkdown(skill models.Skill) (string, error) {
	frontmatter := map[string]interface{}{
		"name": skill.Slug,
	}

	if trimmed := strings.TrimSpace(skill.Description); trimmed != "" {
		frontmatter["description"] = trimmed
	}

	if len(skill.AnthropicConfig) > 0 {
		keys := make([]string, 0, len(skill.AnthropicConfig))
		for key := range skill.AnthropicConfig {
			trimmedKey := strings.TrimSpace(key)
			loweredKey := strings.ToLower(trimmedKey)
			if trimmedKey == "" || loweredKey == "name" || loweredKey == "description" {
				continue
			}
			keys = append(keys, key)
		}
		sort.Strings(keys)
		for _, key := range keys {
			frontmatter[key] = skill.AnthropicConfig[key]
		}
	}

	return buildFrontmatterMarkdown(frontmatter, skill.Content)
}

func buildFrontmatterMarkdown(frontmatter map[string]interface{}, body string) (string, error) {
	frontmatterBytes, err := yaml.Marshal(frontmatter)
	if err != nil {
		return "", fmt.Errorf("序列化 frontmatter 失败: %w", err)
	}

	normalizedBody := normalizeMarkdownBody(body)
	frontmatterText := strings.TrimSpace(string(frontmatterBytes))

	if normalizedBody == "" {
		return fmt.Sprintf("---\n%s\n---\n", frontmatterText), nil
	}

	return fmt.Sprintf("---\n%s\n---\n\n%s", frontmatterText, normalizedBody), nil
}

func normalizeMarkdownBody(content string) string {
	return strings.TrimLeft(strings.ReplaceAll(content, "\r\n", "\n"), "\n")
}

func normalizeSupportingFilesForGitHub(files []models.SkillSupportingFile) []models.SkillSupportingFile {
	if len(files) == 0 {
		return []models.SkillSupportingFile{}
	}

	seen := make(map[string]bool, len(files))
	normalized := make([]models.SkillSupportingFile, 0, len(files))
	for _, file := range files {
		path := normalizeRepoRelativePath(file.Path)
		if path == "" || seen[strings.ToLower(path)] {
			continue
		}
		seen[strings.ToLower(path)] = true
		normalized = append(normalized, models.SkillSupportingFile{
			Path:    path,
			Content: file.Content,
		})
	}

	sort.Slice(normalized, func(i, j int) bool {
		return normalized[i].Path < normalized[j].Path
	})
	return normalized
}

func normalizeRepoRelativePath(path string) string {
	path = strings.TrimSpace(strings.ReplaceAll(path, "\\", "/"))
	path = strings.TrimPrefix(path, "./")
	path = strings.Trim(path, "/")
	if path == "" {
		return ""
	}

	parts := strings.Split(path, "/")
	cleanParts := make([]string, 0, len(parts))
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part == "" || part == "." {
			continue
		}
		if part == ".." {
			return ""
		}
		cleanParts = append(cleanParts, part)
	}

	return strings.Join(cleanParts, "/")
}

func collectPathsToDelete(
	treeNodes map[string]gitHubTreeNode,
	desiredFiles map[string]string,
	cleanupPaths []string,
	cleanupPrefixes []string,
) []string {
	if len(treeNodes) == 0 {
		return []string{}
	}

	deleteSet := make(map[string]bool)
	for _, path := range cleanupPaths {
		path = strings.Trim(path, "/")
		if path == "" {
			continue
		}
		if _, exists := desiredFiles[path]; exists {
			continue
		}
		if _, exists := treeNodes[path]; exists {
			deleteSet[path] = true
		}
	}

	for _, prefix := range cleanupPrefixes {
		prefix = strings.Trim(prefix, "/")
		if prefix == "" {
			continue
		}
		for path := range treeNodes {
			if _, exists := desiredFiles[path]; exists {
				continue
			}
			if path == prefix || strings.HasPrefix(path, prefix+"/") {
				deleteSet[path] = true
			}
		}
	}

	paths := make([]string, 0, len(deleteSet))
	for path := range deleteSet {
		paths = append(paths, path)
	}
	sort.Strings(paths)
	return paths
}

func computeGitBlobSHA(content string) string {
	hasher := sha1.New()
	byteContent := []byte(content)
	fmt.Fprintf(hasher, "blob %d\x00", len(byteContent))
	hasher.Write(byteContent)
	return hex.EncodeToString(hasher.Sum(nil))
}

func trimRepoDir(value, fallback string) string {
	trimmed := strings.Trim(strings.TrimSpace(value), "/")
	if trimmed == "" {
		return fallback
	}
	return trimmed
}
