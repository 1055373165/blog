import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import LoadingSpinner from '../../components/LoadingSpinner';
import Toast from '../../components/ui/Toast';
import AlgorithmLearningPanel from '../../components/admin/AlgorithmLearningPanel';
import AlgorithmFilesPanel from '../../components/admin/AlgorithmFilesPanel';
import {
  importAlgorithmFolder,
  type AlgorithmFolderImportProgress,
  type DirectoryFile,
} from '../../components/admin/algorithmFolderImport';
import { algorithmsApi } from '../../api/algorithms';
import type {
  AlgorithmAsset,
  AlgorithmAssetStatus,
  AlgorithmDifficulty,
  AlgorithmReviewStatus,
  SaveAlgorithmAssetInput,
} from '../../types';

interface AssetFormState {
  title: string;
  slug: string;
  leetcodeId: string;
  sourceUrl: string;
  sourceDirName: string;
  description: string;
  difficulty: AlgorithmDifficulty;
  tagsText: string;
  status: AlgorithmAssetStatus;
}

interface LearningFormState {
  summaryNote: string;
  weakPoints: string;
  reviewStatus: AlgorithmReviewStatus;
  nextReviewAt: string;
}

const statusOptions: Array<{ value: AlgorithmAssetStatus; label: string }> = [
  { value: 'draft', label: '草稿' },
  { value: 'ready', label: '就绪' },
  { value: 'archived', label: '归档' },
];

const difficultyOptions: Array<{ value: AlgorithmDifficulty; label: string }> = [
  { value: '', label: '未标注' },
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

function createEmptyAssetForm(): AssetFormState {
  return {
    title: '',
    slug: '',
    leetcodeId: '',
    sourceUrl: '',
    sourceDirName: '',
    description: '',
    difficulty: '',
    tagsText: '',
    status: 'draft',
  };
}

function createEmptyLearningForm(): LearningFormState {
  return {
    summaryNote: '',
    weakPoints: '',
    reviewStatus: 'new',
    nextReviewAt: '',
  };
}

function formatDate(date?: string | null) {
  if (!date) {
    return '未记录';
  }

  return new Date(date).toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function toDateTimeLocalValue(date?: string | null) {
  if (!date) {
    return '';
  }

  const value = new Date(date);
  const timezoneOffset = value.getTimezoneOffset();
  const localDate = new Date(value.getTime() - timezoneOffset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
}

function tagsToText(tags: string[]) {
  return tags.join(', ');
}

function parseTags(tagsText: string) {
  return Array.from(
    new Set(
      tagsText
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  );
}

function buildAssetForm(asset: AlgorithmAsset): AssetFormState {
  return {
    title: asset.title,
    slug: asset.slug || '',
    leetcodeId: asset.leetcode_id ? String(asset.leetcode_id) : '',
    sourceUrl: asset.source_url || '',
    sourceDirName: asset.source_dir_name || '',
    description: asset.description || '',
    difficulty: asset.difficulty || '',
    tagsText: tagsToText(asset.tags || []),
    status: asset.status,
  };
}

function buildLearningForm(asset: AlgorithmAsset): LearningFormState {
  return {
    summaryNote: asset.summary_note || '',
    weakPoints: asset.weak_points || '',
    reviewStatus: asset.review_status,
    nextReviewAt: toDateTimeLocalValue(asset.next_review_at),
  };
}

export default function AlgorithmAssetDetail() {
  const navigate = useNavigate();
  const params = useParams<{ id?: string }>();
  const assetId = params.id;
  const isCreateMode = !assetId || assetId === 'new';

  const [asset, setAsset] = useState<AlgorithmAsset | null>(null);
  const [loading, setLoading] = useState(!isCreateMode);
  const [savingAsset, setSavingAsset] = useState(false);
  const [savingLearning, setSavingLearning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assetForm, setAssetForm] = useState<AssetFormState>(createEmptyAssetForm);
  const [learningForm, setLearningForm] = useState<LearningFormState>(createEmptyLearningForm);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info'; visible: boolean }>({
    message: '',
    type: 'success',
    visible: false,
  });
  const folderImportInputRef = useRef<HTMLInputElement | null>(null);
  const [importingFolder, setImportingFolder] = useState(false);
  const [folderImportProgress, setFolderImportProgress] = useState(0);
  const [folderImportStageText, setFolderImportStageText] = useState('选择一个本地算法题目录，系统会自动创建资产并导入 Markdown 与视频。');
  const [folderImportName, setFolderImportName] = useState('');

  function scrollToFilesPanel() {
    document.getElementById('algorithm-files-panel')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }

  useEffect(() => {
    if (isCreateMode) {
      setAsset(null);
      setError(null);
      setLoading(false);
      setAssetForm(createEmptyAssetForm());
      setLearningForm(createEmptyLearningForm());
      return;
    }

    void loadAsset(assetId);
  }, [assetId, isCreateMode]);

  async function loadAsset(id?: string) {
    if (!id) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await algorithmsApi.getAsset(id);
      if (!response.success) {
        throw new Error(response.error || '加载算法资产失败');
      }

      setAsset(response.data);
      setAssetForm(buildAssetForm(response.data));
      setLearningForm(buildLearningForm(response.data));
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载算法资产失败');
    } finally {
      setLoading(false);
    }
  }

  function showToast(message: string, type: 'success' | 'error' | 'info') {
    setToast({ message, type, visible: true });
  }

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

  function handleFolderImportProgress(progressState: AlgorithmFolderImportProgress) {
    setFolderImportProgress(progressState.progress);
    setFolderImportStageText(progressState.stageText);
    if (progressState.activeFolderName) {
      setFolderImportName(progressState.activeFolderName);
    }
  }

  function buildSavePayload(): SaveAlgorithmAssetInput {
    return {
      title: assetForm.title.trim(),
      slug: assetForm.slug.trim() || undefined,
      leetcode_id: assetForm.leetcodeId.trim() ? Number(assetForm.leetcodeId.trim()) : null,
      source_url: assetForm.sourceUrl.trim() || undefined,
      source_dir_name: assetForm.sourceDirName.trim(),
      description: assetForm.description.trim() || undefined,
      difficulty: assetForm.difficulty,
      tags: parseTags(assetForm.tagsText),
      status: assetForm.status,
      summary_note: learningForm.summaryNote.trim(),
      weak_points: learningForm.weakPoints.trim(),
      review_status: learningForm.reviewStatus,
      next_review_at: learningForm.nextReviewAt ? new Date(learningForm.nextReviewAt).toISOString() : null,
      primary_markdown_file_id: asset?.primary_markdown_file_id ?? null,
      primary_video_file_id: asset?.primary_video_file_id ?? null,
    };
  }

  async function handleSaveAsset() {
    if (!asset) {
      return;
    }

    try {
      setSavingAsset(true);
      setError(null);

      const payload = buildSavePayload();
      const response = await algorithmsApi.updateAsset(asset.id, payload);

      if (!response.success) {
        throw new Error(response.error || '保存算法资产失败');
      }

      setAsset(response.data);
      setAssetForm(buildAssetForm(response.data));
      setLearningForm(buildLearningForm(response.data));
      showToast('算法资产已保存', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : '保存算法资产失败';
      setError(message);
      showToast(message, 'error');
    } finally {
      setSavingAsset(false);
    }
  }

  async function handleSaveLearning() {
    if (!asset) {
      return;
    }

    try {
      setSavingLearning(true);
      const response = await algorithmsApi.updateLearning(asset.id, {
        summary_note: learningForm.summaryNote.trim(),
        weak_points: learningForm.weakPoints.trim(),
        review_status: learningForm.reviewStatus,
        next_review_at: learningForm.nextReviewAt ? new Date(learningForm.nextReviewAt).toISOString() : null,
      });

      if (!response.success) {
        throw new Error(response.error || '保存学习字段失败');
      }

      setAsset(response.data);
      setLearningForm(buildLearningForm(response.data));
      showToast('学习字段已更新', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : '保存学习字段失败';
      showToast(message, 'error');
    } finally {
      setSavingLearning(false);
    }
  }

  async function handleCreateFromFolder(files: DirectoryFile[]) {
    if (files.length === 0) {
      return;
    }

    try {
      setImportingFolder(true);
      setFolderImportProgress(0);
      setFolderImportName('');
      setFolderImportStageText('正在准备导入...');

      const result = await importAlgorithmFolder(files, {
        onProgress: handleFolderImportProgress,
      });

      showToast(result.importMode === 'created' ? '算法资产已通过目录导入创建' : '已识别到现有资产，正在跳转到详情页', 'success');
      navigate(`/admin/algorithms/${result.assetId}`, { replace: true });
    } catch (err) {
      const message = getErrorMessage(err, '通过目录创建算法资产失败');
      setFolderImportStageText(message);
      showToast(message, 'error');
    } finally {
      setImportingFolder(false);
    }
  }

  const primaryMarkdownName = asset?.primary_markdown_file?.display_name || '未选择';
  const primaryVideoName = asset?.primary_video_file?.display_name || '未选择';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (isCreateMode) {
    return (
      <>
        <div className="p-6">
          <input
            ref={folderImportInputRef}
            type="file"
            // @ts-expect-error webkitdirectory is non-standard
            webkitdirectory=""
            multiple
            className="hidden"
            onChange={(event) => {
              const files = Array.from(event.target.files || []) as DirectoryFile[];
              if (files.length > 0) {
                void handleCreateFromFolder(files);
              }
              event.target.value = '';
            }}
          />

          <div className="mb-8 rounded-[2rem] border border-sky-100 bg-gradient-to-br from-white via-sky-50/70 to-go-50/70 p-6 shadow-soft dark:border-sky-900/40 dark:from-gray-900 dark:via-sky-950/20 dark:to-go-950/20">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <Link
                  to="/admin/algorithms"
                  className="inline-flex items-center gap-2 text-sm font-medium text-sky-700 transition hover:text-sky-800 dark:text-sky-300 dark:hover:text-sky-200"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  返回算法列表
                </Link>
                <p className="mt-5 text-xs font-semibold uppercase tracking-[0.24em] text-sky-600 dark:text-sky-300">
                  Create Algorithm Asset
                </p>
                <h1 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                  通过目录上传创建算法资产
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-gray-600 dark:text-gray-300">
                  这里不再要求你手填“本地目录名”。先选择算法题目录，系统会自动识别目录名、主 Markdown、视频和基础元数据，然后创建资产并跳转到详情页继续编辑。
                </p>
              </div>

              <button
                type="button"
                onClick={() => folderImportInputRef.current?.click()}
                disabled={importingFolder}
                className="btn btn-primary flex items-center gap-2"
              >
                {importingFolder ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l3-3m0 0l3-3m-3 3v12M4 4h16a2 2 0 012 2v4a2 2 0 01-2 2h-3M4 4a2 2 0 00-2 2v4a2 2 0 002 2h3" />
                  </svg>
                )}
                {importingFolder ? '导入中...' : '选择目录创建'}
              </button>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.8fr)]">
            <section className="rounded-[1.75rem] border border-gray-200 bg-white p-6 shadow-soft dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-go-600 dark:text-go-300">
                    Folder Upload
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold text-gray-900 dark:text-white">目录导入进度</h2>
                </div>
                <span className="rounded-full bg-go-50 px-3 py-1 text-xs font-medium text-go-700 dark:bg-go-900/20 dark:text-go-300">
                  一个目录对应一个资产
                </span>
              </div>

              <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50/80 p-5 dark:border-gray-800 dark:bg-gray-950/50">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {folderImportName ? `当前目录：${folderImportName}` : '当前尚未选择目录'}
                    </p>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{folderImportStageText}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">进度</p>
                    <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">{folderImportProgress}%</p>
                  </div>
                </div>
                <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-go-500 to-sky-500 transition-all duration-300"
                    style={{ width: `${folderImportProgress}%` }}
                  />
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span className="rounded-full bg-gray-100 px-3 py-1 dark:bg-gray-800">自动识别目录名</span>
                <span className="rounded-full bg-gray-100 px-3 py-1 dark:bg-gray-800">自动导入 README 与 mp4</span>
                <span className="rounded-full bg-gray-100 px-3 py-1 dark:bg-gray-800">自动创建或复用资产</span>
              </div>
            </section>

            <aside className="space-y-6">
              <section className="rounded-[1.75rem] border border-gray-200 bg-white p-6 shadow-soft dark:border-gray-800 dark:bg-gray-900">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">
                  Auto Detection
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-gray-900 dark:text-white">将自动带出的信息</h2>
                <div className="mt-6 grid gap-4">
                  <div className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-950/60">
                    <p className="text-xs uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">资产身份</p>
                    <p className="mt-2 text-sm leading-7 text-gray-700 dark:text-gray-300">目录名会作为资产来源标识，不再要求你手动填写。</p>
                  </div>
                  <div className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-950/60">
                    <p className="text-xs uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">内容识别</p>
                    <p className="mt-2 text-sm leading-7 text-gray-700 dark:text-gray-300">系统会识别主 README、主视频，并尝试从目录名和 Markdown 标题提取题号与标题。</p>
                  </div>
                  <div className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-950/60">
                    <p className="text-xs uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">后续编辑</p>
                    <p className="mt-2 text-sm leading-7 text-gray-700 dark:text-gray-300">导入完成后会跳到详情页，你可以再补标签、难度、学习状态和文件主次关系。</p>
                  </div>
                </div>
              </section>
            </aside>
          </div>
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

  return (
    <>
      <div className="p-6">
        <div className="mb-8 rounded-[2rem] border border-sky-100 bg-gradient-to-br from-white via-sky-50/70 to-go-50/70 p-6 shadow-soft dark:border-sky-900/40 dark:from-gray-900 dark:via-sky-950/20 dark:to-go-950/20">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Link
                to="/admin/algorithms"
                className="inline-flex items-center gap-2 text-sm font-medium text-sky-700 transition hover:text-sky-800 dark:text-sky-300 dark:hover:text-sky-200"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                返回算法列表
              </Link>
              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.24em] text-sky-600 dark:text-sky-300">
                Algorithm Asset Detail
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                {asset?.title || '算法资产详情'}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-gray-600 dark:text-gray-300">
                目录来源由上传时自动确定，这里负责补齐元数据、文件主次关系和学习纠偏。
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {asset ? (
                <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm text-gray-600 shadow-soft dark:border-gray-700 dark:bg-gray-900/80 dark:text-gray-300">
                  最近更新：{formatDate(asset.updated_at)}
                </div>
              ) : null}
              <button type="button" onClick={handleSaveAsset} disabled={savingAsset} className="btn btn-primary">
                {savingAsset ? '保存中...' : '保存资产'}
              </button>
            </div>
          </div>
        </div>

        {error ? (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300">
            {error}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
          <section className="rounded-[1.75rem] border border-gray-200 bg-white p-6 shadow-soft dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-go-600 dark:text-go-300">
                  Asset Metadata
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-gray-900 dark:text-white">基础信息</h2>
              </div>
              <span className="rounded-full bg-go-50 px-3 py-1 text-xs font-medium text-go-700 dark:bg-go-900/20 dark:text-go-300">
                一个目录对应一个资产
              </span>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">标题</label>
                <input
                  value={assetForm.title}
                  onChange={(event) => setAssetForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder="例如：Implement Trie"
                  className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-go-500 focus:ring-4 focus:ring-go-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Slug</label>
                <input
                  value={assetForm.slug}
                  onChange={(event) => setAssetForm((current) => ({ ...current, slug: event.target.value }))}
                  placeholder="为空则自动生成"
                  className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-go-500 focus:ring-4 focus:ring-go-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">LeetCode 题号</label>
                <input
                  value={assetForm.leetcodeId}
                  onChange={(event) => setAssetForm((current) => ({ ...current, leetcodeId: event.target.value }))}
                  placeholder="例如 208"
                  className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-go-500 focus:ring-4 focus:ring-go-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">来源目录</label>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-950/60">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{assetForm.sourceDirName || '未导入目录'}</p>
                  <p className="mt-1 text-xs leading-6 text-gray-500 dark:text-gray-400">
                    该字段由目录上传自动生成，用来标识一个本地文件夹对应一个资产，不支持手动编辑。
                  </p>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">LeetCode 链接</label>
                <input
                  value={assetForm.sourceUrl}
                  onChange={(event) => setAssetForm((current) => ({ ...current, sourceUrl: event.target.value }))}
                  placeholder="https://leetcode.com/problems/..."
                  className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-go-500 focus:ring-4 focus:ring-go-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">难度</label>
                <select
                  value={assetForm.difficulty}
                  onChange={(event) => setAssetForm((current) => ({ ...current, difficulty: event.target.value as AlgorithmDifficulty }))}
                  className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-go-500 focus:ring-4 focus:ring-go-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                >
                  {difficultyOptions.map((option) => (
                    <option key={option.value || 'empty'} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">状态</label>
                <select
                  value={assetForm.status}
                  onChange={(event) => setAssetForm((current) => ({ ...current, status: event.target.value as AlgorithmAssetStatus }))}
                  className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-go-500 focus:ring-4 focus:ring-go-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">标签</label>
                <input
                  value={assetForm.tagsText}
                  onChange={(event) => setAssetForm((current) => ({ ...current, tagsText: event.target.value }))}
                  placeholder="用逗号分隔，例如 trie, string, prefix-tree"
                  className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-go-500 focus:ring-4 focus:ring-go-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">简述</label>
                <textarea
                  value={assetForm.description}
                  onChange={(event) => setAssetForm((current) => ({ ...current, description: event.target.value }))}
                  rows={5}
                  placeholder="这道题要解决什么、当前资产覆盖到什么程度。"
                  className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm leading-7 text-gray-900 outline-none transition focus:border-go-500 focus:ring-4 focus:ring-go-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                />
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-[1.75rem] border border-gray-200 bg-white p-6 shadow-soft dark:border-gray-800 dark:bg-gray-900">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">
                Asset Snapshot
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-gray-900 dark:text-white">当前概览</h2>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-950/60">
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">Markdown / 视频</p>
                  <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                    {asset?.markdown_count ?? 0}
                    <span className="mx-2 text-base font-medium text-gray-400">/</span>
                    {asset?.video_count ?? 0}
                  </p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-950/60">
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">主 Markdown</p>
                  <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">{primaryMarkdownName}</p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-950/60">
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">主视频</p>
                  <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">{primaryVideoName}</p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-950/60">
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">创建 / 更新</p>
                  <p className="mt-2 text-sm leading-7 text-gray-700 dark:text-gray-300">
                    {asset ? `${formatDate(asset.created_at)} / ${formatDate(asset.updated_at)}` : '创建后可查看'}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-[1.75rem] border border-go-200 bg-white p-6 shadow-soft dark:border-go-900/40 dark:bg-gray-900">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-go-600 dark:text-go-300">
                File Workspace
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-gray-900 dark:text-white">
                {asset ? '文件工作区已接入' : '创建后即可管理文件'}
              </h2>
              <p className="mt-3 text-sm leading-7 text-gray-600 dark:text-gray-300">
                {asset
                  ? '下方已经接入 Markdown 文件管理、视频上传和主文件选择。这里不再用占位文案，而是直接把你带到真实工作区。'
                  : '先保存资产基础信息，随后就可以在下方的文件工作区里添加 Markdown、上传视频并选择主文件。'}
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span className="rounded-full bg-go-50 px-3 py-1 text-go-700 dark:bg-go-900/20 dark:text-go-300">Markdown 管理</span>
                <span className="rounded-full bg-go-50 px-3 py-1 text-go-700 dark:bg-go-900/20 dark:text-go-300">视频上传</span>
                <span className="rounded-full bg-go-50 px-3 py-1 text-go-700 dark:bg-go-900/20 dark:text-go-300">主文件选择</span>
              </div>
              <div className="mt-5">
                {asset ? (
                  <button type="button" onClick={scrollToFilesPanel} className="btn btn-secondary">
                    跳到文件工作区
                  </button>
                ) : (
                  <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                    创建资产后解锁
                  </span>
                )}
              </div>
            </section>
          </aside>
        </div>

        <div id="algorithm-files-panel" className="mt-6 scroll-mt-24">
          <AlgorithmFilesPanel
            asset={asset}
            onAssetChange={(nextAsset) => {
              setAsset(nextAsset);
            }}
          />
        </div>

        <div className="mt-6">
          <AlgorithmLearningPanel
            summaryNote={learningForm.summaryNote}
            weakPoints={learningForm.weakPoints}
            reviewStatus={learningForm.reviewStatus}
            nextReviewAt={learningForm.nextReviewAt}
            disabled={!asset}
            saving={savingLearning}
            onChange={(field, value) => {
              setLearningForm((current) => ({
                ...current,
                [field]: value,
              }));
            }}
            onSave={() => void handleSaveLearning()}
          />
        </div>
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
