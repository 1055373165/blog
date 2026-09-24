import GithubSlugger, { slug as baseSlug } from 'github-slugger';

/* ──────────────────────────────────────────────────────────
   markdownChunks
   Splits a long markdown document into independently
   renderable chunks and extracts its heading outline from the
   source, so the renderer can parse/render progressively and
   the TOC is complete before the body has rendered.

   Chunks only break at block boundaries that are safe to parse
   in isolation: never inside a fenced code block or an HTML
   <details> block, and never mid-list.
   ────────────────────────────────────────────────────────── */

export interface MarkdownHeading {
  id: string;
  /** Base slug of the heading text, before de-duplication */
  base: string;
  text: string;
  level: number;
  chunk: number;
}

export interface MarkdownChunk {
  index: number;
  source: string;
  headings: MarkdownHeading[];
}

export interface MarkdownDocument {
  /** Unique per split, usable as a React key */
  id: number;
  chunks: MarkdownChunk[];
  headings: MarkdownHeading[];
  length: number;
}

/* The first chunk is kept small so the article paints fast */
const FIRST_CHUNK_CHARS = 4_000;
/* Don't start a new chunk at a heading until the current one has this much */
const MIN_CHUNK_CHARS = 3_000;
/* Force a break at the next safe blank line once a chunk grows past this */
const MAX_CHUNK_CHARS = 12_000;

const FENCE_RE = /^ {0,3}(`{3,}|~{3,})/;
const ATX_RE = /^ {0,3}(#{1,6})[ \t]+(.*?)[ \t]*#*[ \t]*$/;
const LIST_OR_INDENT_RE = /^(?: {4}|\t| {0,3}(?:[-*+]|\d{1,9}[.)])(?:[ \t]|$)| {0,3}>| {0,3}\|)/;
const REF_DEF_RE = /^ {0,3}\[(?!\^)[^\]]+\]:[ \t]*\S/;
const FOOTNOTE_DEF_RE = /^ {0,3}\[\^[^\]]+\]:/;

/** Plain text of a heading's inline markdown, approximating what renders. */
export function headingText(raw: string): string {
  return raw
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // images contribute no text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links → label
    .replace(/<[^>]+>/g, '') // inline html tags
    .replace(/`+/g, '')
    .replace(/\*\*|__|~~|\*/g, '')
    .replace(/(^|\W)_+|_+(?=\W|$)/g, '$1')
    .replace(/\\(.)/g, '$1')
    .trim();
}

let docCounter = 0;

function splitDocument(content: string): MarkdownDocument {
  const lines = content.split('\n');
  const slugger = new GithubSlugger();
  const headings: MarkdownHeading[] = [];

  const hasFootnotes = lines.some((l) => FOOTNOTE_DEF_RE.test(l));
  const refDefs = lines.filter((l) => REF_DEF_RE.test(l));

  const chunks: MarkdownChunk[] = [];
  let buf: string[] = [];
  let bufLen = 0;
  let bufHeadings: MarkdownHeading[] = [];

  const flush = () => {
    if (buf.length === 0) return;
    let source = buf.join('\n');
    // 引用式链接的定义可能在别的 chunk 里，逐 chunk 解析时补上
    if (refDefs.length > 0 && chunks.length > 0) source += '\n\n' + refDefs.join('\n');
    chunks.push({ index: chunks.length, source, headings: bufHeadings });
    buf = [];
    bufLen = 0;
    bufHeadings = [];
  };

  let fence: { char: string; len: number } | null = null;
  let detailsDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (fence) {
      const m = FENCE_RE.exec(line);
      if (m && m[1][0] === fence.char && m[1].length >= fence.len && line.trim() === m[1]) fence = null;
      buf.push(line);
      bufLen += line.length + 1;
      continue;
    }

    const fenceOpen = FENCE_RE.exec(line);
    const atx = ATX_RE.exec(line);
    const safe = detailsDepth === 0;
    const limit = chunks.length === 0 ? FIRST_CHUNK_CHARS : MIN_CHUNK_CHARS;

    // Break before a top-level (h1–h3) heading once the chunk has enough content
    if (!hasFootnotes && safe && atx && atx[1].length <= 3 && bufLen >= limit) flush();

    // Break at a blank line when the chunk is too big, if the next line starts a fresh block
    if (
      !hasFootnotes && safe && !fenceOpen && line.trim() === '' && bufLen >= MAX_CHUNK_CHARS &&
      i + 1 < lines.length && lines[i + 1].trim() !== '' && !LIST_OR_INDENT_RE.test(lines[i + 1])
    ) {
      buf.push(line);
      flush();
      continue;
    }

    if (atx) {
      const text = headingText(atx[2]);
      if (text) {
        const heading: MarkdownHeading = {
          id: slugger.slug(text),
          base: baseSlug(text),
          text,
          level: atx[1].length,
          chunk: chunks.length,
        };
        headings.push(heading);
        bufHeadings.push(heading);
      }
    }

    if (fenceOpen) fence = { char: fenceOpen[1][0], len: fenceOpen[1].length };
    detailsDepth += (line.match(/<details[\s>]/gi) || []).length;
    detailsDepth = Math.max(0, detailsDepth - (line.match(/<\/details>/gi) || []).length);

    buf.push(line);
    bufLen += line.length + 1;
  }
  flush();

  return { id: ++docCounter, chunks, headings, length: content.length };
}

/* ArticlePage (for the TOC) and MarkdownRenderer split the same string; keep the last result */
let cache: { content: string; doc: MarkdownDocument } | null = null;

export function getMarkdownDocument(content: string): MarkdownDocument {
  if (cache && cache.content === content) return cache.doc;
  const doc = splitDocument(content);
  cache = { content, doc };
  return doc;
}

export { baseSlug };
