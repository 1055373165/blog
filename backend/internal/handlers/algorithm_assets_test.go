package handlers

import (
	"testing"

	"blog-backend/internal/models"
)

func TestNormalizeAlgorithmAssetMarkdownFileRequestPreservesMarkdownAndDefaultsRole(t *testing.T) {
	req := SaveAlgorithmAssetMarkdownFileRequest{
		DisplayName:     " Trie 分析 ",
		OriginalName:    " README.md ",
		MarkdownContent: "\n# Trie\n\ncontent\n",
	}

	normalized, err := normalizeAlgorithmAssetMarkdownFileRequest(req)
	if err != nil {
		t.Fatalf("expected markdown request to normalize successfully, got error: %v", err)
	}

	if normalized.DisplayName != "Trie 分析" {
		t.Fatalf("expected trimmed display name, got %q", normalized.DisplayName)
	}
	if normalized.OriginalName != "README.md" {
		t.Fatalf("expected trimmed original name, got %q", normalized.OriginalName)
	}
	if normalized.Role != models.AlgorithmAssetFileRolePrimaryAnalysis {
		t.Fatalf("expected default markdown role %q, got %q", models.AlgorithmAssetFileRolePrimaryAnalysis, normalized.Role)
	}
	if normalized.MarkdownContent != req.MarkdownContent {
		t.Fatalf("expected markdown content to remain unchanged")
	}
}

func TestNormalizeAlgorithmAssetVideoFileRequestRequiresStorageURL(t *testing.T) {
	req := SaveAlgorithmAssetVideoFileRequest{
		DisplayName: "Trie 动画",
		StorageURL:  "   ",
	}

	_, err := normalizeAlgorithmAssetVideoFileRequest(req)
	if err == nil {
		t.Fatal("expected empty storage url to be rejected")
	}
	if err.Error() != "视频文件地址不能为空" {
		t.Fatalf("expected storage url validation error, got %q", err.Error())
	}
}

func TestPopulateAlgorithmAssetDerivedFieldsCountsAndPrimaryFallbacks(t *testing.T) {
	asset := models.AlgorithmAsset{
		Files: []models.AlgorithmAssetFile{
			{
				BaseModel:   models.BaseModel{ID: 11},
				FileKind:    models.AlgorithmAssetFileKindMarkdown,
				DisplayName: "README-1.md",
			},
			{
				BaseModel:   models.BaseModel{ID: 12},
				FileKind:    models.AlgorithmAssetFileKindMarkdown,
				DisplayName: "README.md",
				IsPrimary:   true,
			},
			{
				BaseModel:   models.BaseModel{ID: 21},
				FileKind:    models.AlgorithmAssetFileKindVideo,
				DisplayName: "animation.mp4",
			},
		},
	}

	populateAlgorithmAssetDerivedFields(&asset)

	if asset.MarkdownCount != 2 {
		t.Fatalf("expected 2 markdown files, got %d", asset.MarkdownCount)
	}
	if asset.VideoCount != 1 {
		t.Fatalf("expected 1 video file, got %d", asset.VideoCount)
	}
	if asset.PrimaryMarkdownFile == nil || asset.PrimaryMarkdownFile.ID != 12 {
		t.Fatalf("expected markdown file 12 to be primary, got %#v", asset.PrimaryMarkdownFile)
	}
	if asset.PrimaryVideoFile == nil || asset.PrimaryVideoFile.ID != 21 {
		t.Fatalf("expected first video file to be fallback primary, got %#v", asset.PrimaryVideoFile)
	}
}

func TestResolveAlgorithmAssetOrderRejectsUnknownSortField(t *testing.T) {
	_, err := resolveAlgorithmAssetOrder("unknown_field", "desc")
	if err == nil {
		t.Fatal("expected invalid sort field to be rejected")
	}
	if err.Error() != "排序字段无效" {
		t.Fatalf("expected invalid sort field error, got %q", err.Error())
	}
}
