package utils

import (
	"strings"
	"testing"
	"unicode/utf8"
)

func TestGenerateSlugKeepsMixedLanguageTitleValid(t *testing.T) {
	title := "【译】长时运行 Agent 的有效 Harness：Anthropic 是怎么让 Agent 跨上下文持续推进工作的"

	slug := GenerateSlug(title)

	if !utf8.ValidString(slug) {
		t.Fatalf("expected valid utf-8 slug, got %q", slug)
	}
	if strings.ContainsAny(slug, "【】：") {
		t.Fatalf("expected decorative punctuation to be removed, got %q", slug)
	}

	expected := "译长时运行-agent-的有效-harnessanthropic-是怎么让-agent-跨上下文持续推进工作的"
	if slug != expected {
		t.Fatalf("expected slug %q, got %q", expected, slug)
	}
}

func TestGenerateSlugTruncatesByRuneWithoutBreakingUnicode(t *testing.T) {
	title := "【译】" + strings.Repeat("长", 120)

	slug := GenerateSlug(title)

	if !utf8.ValidString(slug) {
		t.Fatalf("expected valid utf-8 slug, got %q", slug)
	}
	if utf8.RuneCountInString(slug) != 100 {
		t.Fatalf("expected slug to be truncated to 100 runes, got %d", utf8.RuneCountInString(slug))
	}
	if !strings.HasPrefix(slug, "译") {
		t.Fatalf("expected slug to keep leading translated marker, got %q", slug)
	}
}
