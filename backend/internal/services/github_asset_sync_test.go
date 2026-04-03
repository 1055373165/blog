package services

import (
	"strings"
	"testing"

	"gopkg.in/yaml.v3"

	"blog-backend/internal/models"
)

func TestCollectPathsToDeleteKeepsDesiredFileEvenWhenContentIsEmpty(t *testing.T) {
	treeNodes := map[string]gitHubTreeNode{
		"skills/review-skill/SKILL.md": {Path: "skills/review-skill/SKILL.md", SHA: "keep"},
		"skills/review-skill/old.md":   {Path: "skills/review-skill/old.md", SHA: "drop"},
	}
	desiredFiles := map[string]string{
		"skills/review-skill/SKILL.md": "",
	}

	paths := collectPathsToDelete(treeNodes, desiredFiles, nil, []string{"skills/review-skill"})
	if len(paths) != 1 || paths[0] != "skills/review-skill/old.md" {
		t.Fatalf("expected only old.md to be deleted, got %#v", paths)
	}
}

func TestBuildPromptMarkdownIncludesStructuredMetadata(t *testing.T) {
	markdown, err := buildPromptMarkdown(models.Prompt{
		Name:             "代码评审提示词",
		Slug:             "code-review",
		Status:           "active",
		Description:      "用于 PR 审查",
		Notes:            "只在需要时补充意见",
		Tags:             []string{"review", "engineering"},
		ApplicableModels: []string{"GPT-5", "Claude 4"},
		Content:          "## Checklist\n- correctness\n",
	})
	if err != nil {
		t.Fatalf("buildPromptMarkdown returned error: %v", err)
	}

	frontmatter, body := splitFrontmatter(t, markdown)
	if body != "## Checklist\n- correctness\n" {
		t.Fatalf("unexpected prompt body: %q", body)
	}

	var metadata map[string]interface{}
	if err := yaml.Unmarshal([]byte(frontmatter), &metadata); err != nil {
		t.Fatalf("failed to parse frontmatter: %v", err)
	}

	if metadata["name"] != "代码评审提示词" {
		t.Fatalf("unexpected name: %#v", metadata["name"])
	}
	if metadata["slug"] != "code-review" {
		t.Fatalf("unexpected slug: %#v", metadata["slug"])
	}
	if metadata["status"] != "active" {
		t.Fatalf("unexpected status: %#v", metadata["status"])
	}
}

func TestBuildSkillRepoFilesProducesAnthropicLayout(t *testing.T) {
	files, err := buildSkillRepoFiles("skills/review-skill", models.Skill{
		Slug:        "review-skill",
		Description: "审查 PR 质量",
		Content:     "Use this skill when reviewing pull requests.\n",
		AnthropicConfig: map[string]interface{}{
			"model":        "claude-sonnet",
			"max_tokens":   4000,
			"description":  "should be ignored",
			"temperature":  0.1,
			"custom_flags": []string{"safe"},
		},
		SupportingFiles: []models.SkillSupportingFile{
			{Path: "guides/setup.md", Content: "Install dependencies first.\n"},
			{Path: "../secret.txt", Content: "must not sync"},
		},
	})
	if err != nil {
		t.Fatalf("buildSkillRepoFiles returned error: %v", err)
	}

	if _, exists := files["skills/review-skill/guides/setup.md"]; !exists {
		t.Fatalf("expected supporting file to be exported: %#v", files)
	}
	if _, exists := files["skills/review-skill/../secret.txt"]; exists {
		t.Fatalf("unexpected invalid supporting file path in export")
	}

	frontmatter, body := splitFrontmatter(t, files["skills/review-skill/SKILL.md"])
	if body != "Use this skill when reviewing pull requests.\n" {
		t.Fatalf("unexpected skill body: %q", body)
	}

	var metadata map[string]interface{}
	if err := yaml.Unmarshal([]byte(frontmatter), &metadata); err != nil {
		t.Fatalf("failed to parse SKILL frontmatter: %v", err)
	}

	if metadata["name"] != "review-skill" {
		t.Fatalf("unexpected skill frontmatter name: %#v", metadata["name"])
	}
	if metadata["description"] != "审查 PR 质量" {
		t.Fatalf("unexpected skill description: %#v", metadata["description"])
	}
	if metadata["description"] == "should be ignored" {
		t.Fatalf("reserved description key should not be copied from config")
	}
	if metadata["model"] != "claude-sonnet" {
		t.Fatalf("unexpected model: %#v", metadata["model"])
	}
}

func splitFrontmatter(t *testing.T, markdown string) (string, string) {
	t.Helper()

	if !strings.HasPrefix(markdown, "---\n") {
		t.Fatalf("markdown does not start with frontmatter: %q", markdown)
	}

	closing := strings.Index(markdown[4:], "\n---\n")
	if closing < 0 {
		t.Fatalf("markdown does not contain closing frontmatter separator: %q", markdown)
	}

	closing += 4
	body := markdown[closing+5:]
	body = strings.TrimPrefix(body, "\n")
	return markdown[4:closing], body
}
