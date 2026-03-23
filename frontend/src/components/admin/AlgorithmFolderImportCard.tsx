import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Toast from '../ui/Toast';
import { algorithmsApi } from '../../api/algorithms';
import type { AlgorithmAsset } from '../../types';

interface DirectoryFile extends File {
  webkitRelativePath?: string;
}

interface AlgorithmFolderImportCardProps {
  onImported?: () => void | Promise<void>;
}

interface ImportResultSummary {
  assetId: number;
  assetTitle: string;
  sourceDirName: string;
  importMode: 'created' | 'updated';
  markdownCount: number;
  videoCount: number;
}

interface ParsedMarkdownFile {
  kind: 'markdown';
  displayName: string;
  originalName: string;
  relativePath: string;
  content: string;
  role: 'primary_analysis' | 'supplement';
  isPrimaryCandidate: boolean;
  sortOrder: number;
}

interface ParsedVideoFile {
  kind: 'video';
  displayName: string;
  originalName: string;
  relativePath: string;
  file: DirectoryFile;
  role: 'animation' | 'alternate_animation' | 'supplement';
  isPrimaryCandidate: boolean;
  sortOrder: number;
}

interface FolderImportPlan {
  sourceDirName: string;
  title: string;
  leetcodeId?: number;
  sourceUrl?: string;
  description?: string;
  markdownFiles: ParsedMarkdownFile[];
  videoFiles: ParsedVideoFile[];
}

const markdownExtensions = new Set(['.md', '.markdown']);

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'object' && error) {
    if ('error' in error && typeof error.error === 'string' && error.error) {
      return error.error;
    }

    if ('message' in error && typeof error.message === 'string' && error.message) {
      return error.message;
    }
  }

  return fallback;
}

function normalizeRelativePath(input: string) {
  const normalized = input.replace(/\\/g, '/').trim();
  const segments = normalized.split('/');
  const resolvedSegments: string[] = [];

  for (const segment of segments) {
    if (!segment || segment === '.') {
      continue;
    }

    if (segment === '..') {
      if (resolvedSegments.length > 0) {
        resolvedSegments.pop();
      }
      continue;
    }

    resolvedSegments.push(segment);
  }

  return resolvedSegments.join('/');
}

function splitPathSegments(input: string) {
  return normalizeRelativePath(input)
    .split('/')
    .filter(Boolean);
}

function getRelativePath(file: DirectoryFile) {
  return normalizeRelativePath(file.webkitRelativePath || file.name);
}

function getRelativePathWithinRoot(relativePath: string) {
  const segments = splitPathSegments(relativePath);
  return segments.slice(1).join('/') || segments[segments.length - 1] || '';
}

function getBaseName(relativePath: string) {
  const segments = splitPathSegments(relativePath);
  return segments[segments.length - 1] || '';
}

function getExtension(name: string) {
  const index = name.lastIndexOf('.');
  return index >= 0 ? name.slice(index).toLowerCase() : '';
}

function isHiddenOrSystemPath(path: string) {
  return splitPathSegments(path).some((segment) => (
    segment === '__MACOSX'
    || segment === '.DS_Store'
    || (segment.startsWith('.') && segment !== '.' && segment !== '..')
  ));
}

function isMarkdownFile(file: DirectoryFile) {
  return markdownExtensions.has(getExtension(file.name));
}

function isMp4File(file: DirectoryFile) {
  return file.name.toLowerCase().endsWith('.mp4');
}

function toSentenceCaseTitle(raw: string) {
  return raw
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseFolderIdentity(folderName: string) {
  const trimmed = folderName.trim();
  const separatedMatch = trimmed.match(/^0*(\d{1,5})[._\-\s]+(.+)$/);
  if (separatedMatch) {
    return {
      leetcodeId: Number(separatedMatch[1]),
      title: toSentenceCaseTitle(separatedMatch[2]) || trimmed,
    };
  }

  const compactMatch = trimmed.match(/^0*(\d{1,5})([A-Z].+)$/);
  if (compactMatch) {
    return {
      leetcodeId: Number(compactMatch[1]),
      title: toSentenceCaseTitle(compactMatch[2]) || trimmed,
    };
  }

  return {
    title: toSentenceCaseTitle(trimmed) || trimmed,
  };
}

function extractMarkdownHeading(content: string) {
  const match = content.match(/^\s*#\s+(.+)$/m);
  return match ? match[1].trim() : '';
}

function cleanHeadingForTitle(heading: string, leetcodeId?: number) {
  if (!heading) {
    return '';
  }

  let cleaned = heading.trim();
  if (leetcodeId) {
    cleaned = cleaned.replace(new RegExp(`^0*${leetcodeId}[\\s.\\-_:：、]+`), '').trim();
  }

  return cleaned || heading.trim();
}

function extractLeetCodeUrl(content: string) {
  const match = content.match(/https?:\/\/(?:leetcode\.com|www\.leetcode\.com|leetcode\.cn)\/problems\/[^\s)]+/i);
  return match ? match[0] : '';
}

function extractDescription(content: string) {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const paragraph = lines.find((line) => (
    !line.startsWith('#')
    && !line.startsWith('```')
    && !line.startsWith('>')
    && !line.startsWith('- ')
    && !line.startsWith('* ')
  ));

  if (!paragraph) {
    return '';
  }

  return paragraph.length > 180 ? `${paragraph.slice(0, 177)}...` : paragraph;
}

function choosePrimaryMarkdownPath(paths: string[]) {
  const sorted = [...paths].sort((left, right) => left.localeCompare(right, 'zh-CN'));
  const preferred = sorted.find((path) => path.toLowerCase() === 'readme.md')
    || sorted.find((path) => path.toLowerCase() === 'readme.markdown')
    || sorted.find((path) => getBaseName(path).toLowerCase() === 'readme.md')
    || sorted.find((path) => getBaseName(path).toLowerCase() === 'readme.markdown');
  return preferred || sorted[0] || '';
}

function choosePrimaryVideoPath(paths: string[]) {
  const sorted = [...paths].sort((left, right) => left.localeCompare(right, 'zh-CN'));
  const preferred = sorted.find((path) => path.toLowerCase() === 'animation.mp4')
    || sorted.find((path) => getBaseName(path).toLowerCase() === 'animation.mp4');
  return preferred || sorted[0] || '';
}

function sortImportPaths(paths: string[], primaryPath: string) {
  return [...paths].sort((left, right) => {
    if (left === primaryPath) {
      return -1;
    }
    if (right === primaryPath) {
      return 1;
    }
    return left.localeCompare(right, 'zh-CN');
  });
}

function buildVideoRole(path: string, isPrimaryCandidate: boolean): 'animation' | 'alternate_animation' | 'supplement' {
  const baseName = getBaseName(path).toLowerCase();
  if (isPrimaryCandidate || baseName === 'animation.mp4') {
    return 'animation';
  }

  if (baseName.startsWith('animation-') || baseName.startsWith('animation_')) {
    return 'alternate_animation';
  }

  return 'supplement';
}

function findMatchingFile(asset: AlgorithmAsset, fileKind: 'markdown' | 'video', displayName: string) {
  const candidates = (asset.files || []).filter((file) => file.file_kind === fileKind && file.display_name === displayName);
  return candidates.sort((left, right) => {
    if (left.is_primary && !right.is_primary) {
      return -1;
    }
    if (!left.is_primary && right.is_primary) {
      return 1;
    }
    return left.id - right.id;
  })[0];
}

async function buildImportPlan(files: DirectoryFile[]): Promise<FolderImportPlan> {
  const visibleFiles = files.filter((file) => !isHiddenOrSystemPath(getRelativePath(file)));
  if (visibleFiles.length === 0) {
    throw new Error('所选文件夹中没有可导入的文件');
  }

  const rootFolders = Array.from(
    new Set(
      visibleFiles
        .map((file) => splitPathSegments(getRelativePath(file))[0])
        .filter(Boolean),
    ),
  );

  if (rootFolders.length !== 1) {
    throw new Error('请一次只选择一个算法题文件夹');
  }

  const sourceDirName = rootFolders[0];
  const markdownEntries = visibleFiles
    .filter(isMarkdownFile)
    .map((file) => ({
      file,
      relativePath: getRelativePathWithinRoot(getRelativePath(file)),
    }));
  const videoEntries = visibleFiles
    .filter(isMp4File)
    .map((file) => ({
      file,
      relativePath: getRelativePathWithinRoot(getRelativePath(file)),
    }));

  if (markdownEntries.length === 0 && videoEntries.length === 0) {
    throw new Error('所选文件夹中没有发现 markdown 或 mp4 文件');
  }

  const primaryMarkdownPath = choosePrimaryMarkdownPath(markdownEntries.map((entry) => entry.relativePath));
  const primaryVideoPath = choosePrimaryVideoPath(videoEntries.map((entry) => entry.relativePath));

  const markdownFiles = await Promise.all(
    sortImportPaths(markdownEntries.map((entry) => entry.relativePath), primaryMarkdownPath).map(async (relativePath, index) => {
      const entry = markdownEntries.find((item) => item.relativePath === relativePath);
      if (!entry) {
        throw new Error(`无法读取 Markdown 文件：${relativePath}`);
      }

      return {
        kind: 'markdown' as const,
        displayName: relativePath,
        originalName: entry.file.name,
        relativePath,
        content: await entry.file.text(),
        role: relativePath === primaryMarkdownPath ? 'primary_analysis' : 'supplement',
        isPrimaryCandidate: relativePath === primaryMarkdownPath,
        sortOrder: index,
      };
    }),
  );

  const videoFiles = sortImportPaths(videoEntries.map((entry) => entry.relativePath), primaryVideoPath).map((relativePath, index) => {
    const entry = videoEntries.find((item) => item.relativePath === relativePath);
    if (!entry) {
      throw new Error(`无法读取视频文件：${relativePath}`);
    }

    const isPrimaryCandidate = relativePath === primaryVideoPath;
    return {
      kind: 'video' as const,
      displayName: relativePath,
      originalName: entry.file.name,
      relativePath,
      file: entry.file,
      role: buildVideoRole(relativePath, isPrimaryCandidate),
      isPrimaryCandidate,
      sortOrder: index,
    };
  });

  const folderIdentity = parseFolderIdentity(sourceDirName);
  const primaryMarkdown = markdownFiles.find((file) => file.isPrimaryCandidate) || markdownFiles[0];
  const inferredHeading = primaryMarkdown ? cleanHeadingForTitle(extractMarkdownHeading(primaryMarkdown.content), folderIdentity.leetcodeId) : '';
  const inferredSourceUrl = markdownFiles.map((file) => extractLeetCodeUrl(file.content)).find(Boolean);
  const inferredDescription = primaryMarkdown ? extractDescription(primaryMarkdown.content) : '';

  return {
    sourceDirName,
    title: inferredHeading || folderIdentity.title || sourceDirName,
    leetcodeId: folderIdentity.leetcodeId,
    sourceUrl: inferredSourceUrl || undefined,
    description: inferredDescription || undefined,
    markdownFiles,
    videoFiles,
  };
}

export default function AlgorithmFolderImportCard({ onImported }: AlgorithmFolderImportCardProps) {
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stageText, setStageText] = useState('选择本地算法题文件夹后，会自动创建或补齐一个算法资产');
  const [activeFolderName, setActiveFolderName] = useState('');
  const [lastResult, setLastResult] = useState<ImportResultSummary | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info'; visible: boolean }>({
    message: '',
    type: 'success',
    visible: false,
  });

  function showToast(message: string, type: 'success' | 'error' | 'info') {
    setToast({ message, type, visible: true });
  }

  async function resolveTargetAsset(plan: FolderImportPlan): Promise<{ asset: AlgorithmAsset; importMode: 'created' | 'updated' }> {
    const existingList = await algorithmsApi.getAssets({
      page: 1,
      limit: 100,
      search: plan.sourceDirName,
      sort_by: 'updated_at',
      sort_order: 'desc',
    });

    if (!existingList.success) {
      throw new Error(existingList.error || '查询现有算法资产失败');
    }

    const existing = (existingList.data.assets || []).find((asset) => asset.source_dir_name === plan.sourceDirName);
    if (existing) {
      const detail = await algorithmsApi.getAsset(existing.id);
      if (!detail.success) {
        throw new Error(detail.error || '加载现有算法资产失败');
      }
      return { asset: detail.data, importMode: 'updated' };
    }

    const created = await algorithmsApi.createAsset({
      title: plan.title,
      slug: undefined,
      leetcode_id: plan.leetcodeId ?? null,
      source_url: plan.sourceUrl,
      source_dir_name: plan.sourceDirName,
      description: plan.description,
      difficulty: '',
      tags: [],
      status: 'draft',
      summary_note: '',
      weak_points: '',
      review_status: 'new',
      next_review_at: null,
      primary_markdown_file_id: null,
      primary_video_file_id: null,
    });

    if (!created.success) {
      throw new Error(created.error || '创建算法资产失败');
    }

    return { asset: created.data, importMode: 'created' };
  }

  async function upsertMarkdownFiles(asset: AlgorithmAsset, markdownFiles: ParsedMarkdownFile[]) {
    let currentAsset = asset;

    for (let index = 0; index < markdownFiles.length; index += 1) {
      const file = markdownFiles[index];
      setStageText(`导入 Markdown ${index + 1}/${markdownFiles.length}: ${file.displayName}`);
      setProgress(25 + Math.round(((index + 1) / Math.max(markdownFiles.length, 1)) * 25));

      const existingFile = findMatchingFile(currentAsset, 'markdown', file.displayName);
      const payload = {
        display_name: file.displayName,
        original_name: file.originalName,
        role: file.role,
        sort_order: file.sortOrder,
        is_primary: file.isPrimaryCandidate,
        markdown_content: file.content,
      };

      const response = existingFile
        ? await algorithmsApi.updateFile(currentAsset.id, existingFile.id, payload)
        : await algorithmsApi.createMarkdownFile(currentAsset.id, payload);

      if (!response.success) {
        throw new Error(response.error || `保存 Markdown 失败：${file.displayName}`);
      }

      currentAsset = response.data;
    }

    return currentAsset;
  }

  async function upsertVideoFiles(asset: AlgorithmAsset, videoFiles: ParsedVideoFile[]) {
    let currentAsset = asset;

    for (let index = 0; index < videoFiles.length; index += 1) {
      const file = videoFiles[index];
      setStageText(`上传视频 ${index + 1}/${videoFiles.length}: ${file.displayName}`);

      const uploadResult = await algorithmsApi.uploadVideo(file.file, (uploadProgress) => {
        const fractionalIndex = index + uploadProgress / 100;
        const ratio = fractionalIndex / Math.max(videoFiles.length, 1);
        setProgress(55 + Math.round(ratio * 35));
      });

      const storageUrl = uploadResult.url;
      if (!storageUrl) {
        throw new Error(`上传视频后未返回可用地址：${file.displayName}`);
      }

      const existingFile = findMatchingFile(currentAsset, 'video', file.displayName);
      const payload = {
        display_name: file.displayName,
        original_name: file.originalName,
        role: file.role,
        sort_order: file.sortOrder,
        is_primary: file.isPrimaryCandidate,
        storage_url: storageUrl,
        mime_type: file.file.type || 'video/mp4',
        size_bytes: file.file.size,
      };

      const response = existingFile
        ? await algorithmsApi.updateFile(currentAsset.id, existingFile.id, payload)
        : await algorithmsApi.createVideoFile(currentAsset.id, payload);

      if (!response.success) {
        throw new Error(response.error || `保存视频文件失败：${file.displayName}`);
      }

      currentAsset = response.data;
      setProgress(55 + Math.round(((index + 1) / Math.max(videoFiles.length, 1)) * 35));
    }

    return currentAsset;
  }

  async function handleFolderImport(files: DirectoryFile[]) {
    if (files.length === 0) {
      return;
    }

    try {
      setImporting(true);
      setProgress(6);
      setLastResult(null);
      setStageText('解析目录结构与可导入文件...');

      const plan = await buildImportPlan(files);
      setActiveFolderName(plan.sourceDirName);
      setStageText(`识别到 ${plan.markdownFiles.length} 份 Markdown、${plan.videoFiles.length} 个视频，准备创建或更新资产...`);
      setProgress(16);

      const { asset: targetAsset, importMode } = await resolveTargetAsset(plan);
      let currentAsset = targetAsset;
      setStageText(importMode === 'created'
        ? `已创建资产「${targetAsset.title}」，开始写入文件`
        : `已找到现有资产「${targetAsset.title}」，开始补齐或覆盖文件`);
      setProgress(24);

      if (plan.markdownFiles.length > 0) {
        currentAsset = await upsertMarkdownFiles(currentAsset, plan.markdownFiles);
      }

      if (plan.videoFiles.length > 0) {
        currentAsset = await upsertVideoFiles(currentAsset, plan.videoFiles);
      }

      setStageText('导入完成，正在刷新资产摘要...');
      setProgress(100);

      setLastResult({
        assetId: currentAsset.id,
        assetTitle: currentAsset.title,
        sourceDirName: plan.sourceDirName,
        importMode,
        markdownCount: plan.markdownFiles.length,
        videoCount: plan.videoFiles.length,
      });

      try {
        await onImported?.();
      } catch (refreshError) {
        console.warn('Algorithm asset list refresh failed after folder import:', refreshError);
      }
      showToast(importMode === 'created' ? '文件夹已导入为新的算法资产' : '文件夹内容已同步到现有算法资产', 'success');
    } catch (error) {
      const message = getErrorMessage(error, '导入算法文件夹失败');
      setStageText(message);
      showToast(message, 'error');
    } finally {
      setImporting(false);
    }
  }

  return (
    <>
      <input
        ref={folderInputRef}
        type="file"
        // @ts-expect-error webkitdirectory is non-standard
        webkitdirectory=""
        multiple
        className="hidden"
        onChange={(event) => {
          const files = Array.from(event.target.files || []) as DirectoryFile[];
          if (files.length > 0) {
            void handleFolderImport(files);
          }
          event.target.value = '';
        }}
      />

      <div className="mb-6 rounded-[1.75rem] border border-go-100 bg-white p-5 shadow-soft dark:border-go-900/40 dark:bg-gray-900">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-go-50 px-3 py-1 text-xs font-semibold text-go-700 dark:bg-go-900/20 dark:text-go-300">
              Folder Import
            </div>
            <h2 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">通过题目文件夹快速导入</h2>
            <p className="mt-3 text-sm leading-7 text-gray-600 dark:text-gray-300">
              直接选择本地算法题目录。系统会识别其中的 <code>README*.md</code> 和 <code>*.mp4</code>，自动创建或更新一个算法资产。
              这一步只解决资产整理，不替代你后续的复习和闭卷回忆。
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span className="rounded-full bg-gray-100 px-3 py-1 dark:bg-gray-800">一个文件夹对应一个资产</span>
              <span className="rounded-full bg-gray-100 px-3 py-1 dark:bg-gray-800">自动识别主 README 与主视频</span>
              <span className="rounded-full bg-gray-100 px-3 py-1 dark:bg-gray-800">重复导入会优先更新同名文件</span>
            </div>
          </div>

          <div className="shrink-0">
            <button
              type="button"
              onClick={() => folderInputRef.current?.click()}
              disabled={importing}
              className="btn btn-primary flex items-center gap-2"
            >
              {importing ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l3-3m0 0l3-3m-3 3v12M4 4h16a2 2 0 012 2v4a2 2 0 01-2 2h-3M4 4a2 2 0 00-2 2v4a2 2 0 002 2h3" />
                </svg>
              )}
              {importing ? '导入中...' : '选择文件夹导入'}
            </button>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-800 dark:bg-gray-950/50">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {activeFolderName ? `当前目录：${activeFolderName}` : '当前尚未选择文件夹'}
              </p>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{stageText}</p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">进度</p>
              <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">{progress}%</p>
            </div>
          </div>
          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-go-500 to-sky-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {lastResult ? (
          <div className="mt-5 flex flex-col gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                  {lastResult.importMode === 'created' ? '已创建新的算法资产' : '已更新现有算法资产'}
                </p>
                <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-200">
                  {lastResult.assetTitle} · 目录 {lastResult.sourceDirName}
                </p>
              </div>
              <Link to={`/admin/algorithms/${lastResult.assetId}`} className="btn btn-secondary">
                进入资产详情
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-white/70 px-4 py-3 text-sm text-emerald-800 dark:bg-gray-900/60 dark:text-emerald-200">
                导入 Markdown：{lastResult.markdownCount}
              </div>
              <div className="rounded-2xl bg-white/70 px-4 py-3 text-sm text-emerald-800 dark:bg-gray-900/60 dark:text-emerald-200">
                导入视频：{lastResult.videoCount}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.visible}
        onClose={() => setToast((current) => ({ ...current, visible: false }))}
      />
    </>
  );
}
