import { algorithmsApi } from '../../api/algorithms';
import type { AlgorithmAsset } from '../../types';

export interface DirectoryFile extends File {
  webkitRelativePath?: string;
}

export interface AlgorithmFolderImportProgress {
  progress: number;
  stageText: string;
  activeFolderName?: string;
}

export interface ImportAlgorithmFolderResult {
  asset: AlgorithmAsset;
  assetId: number;
  assetTitle: string;
  sourceDirName: string;
  importMode: 'created' | 'updated';
  markdownCount: number;
  videoCount: number;
}

interface ParsedMarkdownFile {
  displayName: string;
  originalName: string;
  content: string;
  role: 'primary_analysis' | 'supplement';
  isPrimaryCandidate: boolean;
  sortOrder: number;
}

interface ParsedVideoFile {
  displayName: string;
  originalName: string;
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

function reportProgress(
  callback: ((progress: AlgorithmFolderImportProgress) => void) | undefined,
  progress: number,
  stageText: string,
  activeFolderName?: string,
) {
  callback?.({
    progress,
    stageText,
    activeFolderName,
  });
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
        displayName: relativePath,
        originalName: entry.file.name,
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
      displayName: relativePath,
      originalName: entry.file.name,
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

async function resolveTargetAsset(plan: FolderImportPlan) {
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
    return { asset: detail.data, importMode: 'updated' as const };
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

  return { asset: created.data, importMode: 'created' as const };
}

async function upsertMarkdownFiles(
  asset: AlgorithmAsset,
  markdownFiles: ParsedMarkdownFile[],
  onProgress?: (progress: AlgorithmFolderImportProgress) => void,
) {
  let currentAsset = asset;

  for (let index = 0; index < markdownFiles.length; index += 1) {
    const file = markdownFiles[index];
    reportProgress(
      onProgress,
      25 + Math.round(((index + 1) / Math.max(markdownFiles.length, 1)) * 25),
      `导入 Markdown ${index + 1}/${markdownFiles.length}: ${file.displayName}`,
      currentAsset.source_dir_name,
    );

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

async function upsertVideoFiles(
  asset: AlgorithmAsset,
  videoFiles: ParsedVideoFile[],
  onProgress?: (progress: AlgorithmFolderImportProgress) => void,
) {
  let currentAsset = asset;

  for (let index = 0; index < videoFiles.length; index += 1) {
    const file = videoFiles[index];
    reportProgress(
      onProgress,
      55 + Math.round((index / Math.max(videoFiles.length, 1)) * 35),
      `上传视频 ${index + 1}/${videoFiles.length}: ${file.displayName}`,
      currentAsset.source_dir_name,
    );

    const uploadResult = await algorithmsApi.uploadVideo(file.file, (uploadProgress) => {
      const fractionalIndex = index + uploadProgress / 100;
      const ratio = fractionalIndex / Math.max(videoFiles.length, 1);
      reportProgress(
        onProgress,
        55 + Math.round(ratio * 35),
        `上传视频 ${index + 1}/${videoFiles.length}: ${file.displayName}`,
        currentAsset.source_dir_name,
      );
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
  }

  return currentAsset;
}

export async function importAlgorithmFolder(
  files: DirectoryFile[],
  options?: {
    onProgress?: (progress: AlgorithmFolderImportProgress) => void;
  },
): Promise<ImportAlgorithmFolderResult> {
  if (files.length === 0) {
    throw new Error('请选择一个算法题目录');
  }

  reportProgress(options?.onProgress, 6, '解析目录结构与可导入文件...');
  const plan = await buildImportPlan(files);
  reportProgress(
    options?.onProgress,
    16,
    `识别到 ${plan.markdownFiles.length} 份 Markdown、${plan.videoFiles.length} 个视频，准备创建或更新资产...`,
    plan.sourceDirName,
  );

  const { asset: targetAsset, importMode } = await resolveTargetAsset(plan);
  reportProgress(
    options?.onProgress,
    24,
    importMode === 'created'
      ? `已创建资产「${targetAsset.title}」，开始写入文件`
      : `已找到现有资产「${targetAsset.title}」，开始补齐或覆盖文件`,
    plan.sourceDirName,
  );

  let currentAsset = targetAsset;
  if (plan.markdownFiles.length > 0) {
    currentAsset = await upsertMarkdownFiles(currentAsset, plan.markdownFiles, options?.onProgress);
  }

  if (plan.videoFiles.length > 0) {
    currentAsset = await upsertVideoFiles(currentAsset, plan.videoFiles, options?.onProgress);
  }

  reportProgress(options?.onProgress, 100, '导入完成，正在刷新资产摘要...', plan.sourceDirName);

  return {
    asset: currentAsset,
    assetId: currentAsset.id,
    assetTitle: currentAsset.title,
    sourceDirName: plan.sourceDirName,
    importMode,
    markdownCount: plan.markdownFiles.length,
    videoCount: plan.videoFiles.length,
  };
}
