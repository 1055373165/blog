import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import LoadingSpinner from '../../components/LoadingSpinner';
import Pagination from '../../components/Pagination';
import AlgorithmFolderImportCard from '../../components/admin/AlgorithmFolderImportCard';
import { algorithmsApi } from '../../api/algorithms';
import type {
  AlgorithmAsset,
  AlgorithmAssetStatus,
  AlgorithmDifficulty,
  AlgorithmReviewStatus,
} from '../../types';

type StatusFilter = 'all' | AlgorithmAssetStatus;
type ReviewFilter = 'all' | AlgorithmReviewStatus;
type DifficultyFilter = 'all' | Exclude<AlgorithmDifficulty, ''>;
type HasVideoFilter = 'all' | 'with_video' | 'without_video';

const statusOptions: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: '全部状态' },
  { value: 'draft', label: '草稿' },
  { value: 'ready', label: '就绪' },
  { value: 'archived', label: '归档' },
];

const reviewOptions: Array<{ value: ReviewFilter; label: string }> = [
  { value: 'all', label: '全部复习状态' },
  { value: 'new', label: '未开始' },
  { value: 'read', label: '已阅读' },
  { value: 'failed_recall', label: '闭卷失败' },
  { value: 'passed_recall', label: '闭卷通过' },
  { value: 'needs_review', label: '待复习' },
];

const difficultyOptions: Array<{ value: DifficultyFilter; label: string }> = [
  { value: 'all', label: '全部难度' },
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

const hasVideoOptions: Array<{ value: HasVideoFilter; label: string }> = [
  { value: 'all', label: '全部视频状态' },
  { value: 'with_video', label: '有视频' },
  { value: 'without_video', label: '无视频' },
];

const statusBadgeClass: Record<AlgorithmAssetStatus, string> = {
  draft: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  ready: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  archived: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

const reviewBadgeClass: Record<AlgorithmReviewStatus, string> = {
  new: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  read: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
  failed_recall: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  passed_recall: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  needs_review: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
};

const reviewLabel: Record<AlgorithmReviewStatus, string> = {
  new: '未开始',
  read: '已阅读',
  failed_recall: '闭卷失败',
  passed_recall: '闭卷通过',
  needs_review: '待复习',
};

const statusLabel: Record<AlgorithmAssetStatus, string> = {
  draft: '草稿',
  ready: '就绪',
  archived: '归档',
};

const difficultyLabel: Record<Exclude<AlgorithmDifficulty, ''>, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

function formatDate(date?: string | null) {
  if (!date) {
    return '未设置';
  }

  return new Date(date).toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function difficultyTone(difficulty: AlgorithmDifficulty) {
  switch (difficulty) {
    case 'easy':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
    case 'medium':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
    case 'hard':
      return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300';
    default:
      return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  }
}

export default function AdminAlgorithms() {
  const [assets, setAssets] = useState<AlgorithmAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>('all');
  const [hasVideoFilter, setHasVideoFilter] = useState<HasVideoFilter>('all');

  useEffect(() => {
    void loadAssets();
  }, [currentPage, pageSize, searchTerm, statusFilter, reviewFilter, difficultyFilter, hasVideoFilter]);

  async function loadAssets(isRefresh = false) {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response = await algorithmsApi.getAssets({
        page: currentPage,
        limit: pageSize,
        search: searchTerm || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        review_status: reviewFilter === 'all' ? undefined : reviewFilter,
        difficulty: difficultyFilter === 'all' ? undefined : difficultyFilter,
        has_video:
          hasVideoFilter === 'all'
            ? undefined
            : hasVideoFilter === 'with_video',
        sort_by: 'updated_at',
        sort_order: 'desc',
      });

      if (!response.success) {
        throw new Error(response.error || '加载算法资产失败');
      }

      setAssets(response.data.assets || []);
      setTotal(response.data.pagination?.total || 0);
      setTotalPages(response.data.pagination?.total_pages || 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载算法资产失败');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function handleSearchSubmit() {
    setCurrentPage(1);
    setSearchTerm(searchInput.trim());
  }

  function handleResetFilters() {
    setSearchInput('');
    setSearchTerm('');
    setStatusFilter('all');
    setReviewFilter('all');
    setDifficultyFilter('all');
    setHasVideoFilter('all');
    setCurrentPage(1);
  }

  const readyCount = assets.filter((asset) => asset.status === 'ready').length;
  const reviewCount = assets.filter((asset) => asset.review_status === 'needs_review').length;
  const videoCount = assets.filter((asset) => asset.video_count > 0).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8 rounded-[2rem] border border-go-100 bg-gradient-to-br from-white via-go-50/70 to-sky-50/70 p-6 shadow-soft dark:border-go-900/40 dark:from-gray-900 dark:via-go-950/20 dark:to-sky-950/20">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/80 px-3 py-1 text-xs font-medium text-go-700 dark:border-gray-700 dark:bg-gray-800/80 dark:text-go-300">
              <span className="h-2 w-2 rounded-full bg-go-500" />
              Algorithm Asset Workspace
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
              算法学习
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-gray-600 dark:text-gray-300">
              用一个列表把题目资产的状态、产物数量和复习节点集中看清。这里优先服务“管理和复习”，不是在线生成。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void loadAssets(true)}
              className="btn btn-secondary flex items-center gap-2"
            >
              <svg className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              刷新列表
            </button>
            <Link to="/admin/algorithms/new" className="btn btn-primary flex items-center gap-2">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              新建算法资产
            </Link>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/80 bg-white/90 p-5 shadow-soft dark:border-gray-700 dark:bg-gray-900/80">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">
              当前筛选总数
            </p>
            <p className="mt-3 text-3xl font-bold text-gray-900 dark:text-white">{total}</p>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">按当前筛选条件返回的资产总数</p>
          </div>
          <div className="rounded-2xl border border-white/80 bg-white/90 p-5 shadow-soft dark:border-gray-700 dark:bg-gray-900/80">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">
              本页就绪 / 待复习
            </p>
            <p className="mt-3 text-3xl font-bold text-gray-900 dark:text-white">
              {readyCount}
              <span className="mx-2 text-lg font-medium text-gray-400">/</span>
              <span className="text-violet-600 dark:text-violet-300">{reviewCount}</span>
            </p>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">帮助你快速判断哪些题可以回刷，哪些还只是草稿</p>
          </div>
          <div className="rounded-2xl border border-white/80 bg-white/90 p-5 shadow-soft dark:border-gray-700 dark:bg-gray-900/80">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">
              本页带视频资产
            </p>
            <p className="mt-3 text-3xl font-bold text-gray-900 dark:text-white">{videoCount}</p>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">双产物不是默认价值更高，先看哪些题真的值得保留视频</p>
          </div>
        </div>
      </div>

      <AlgorithmFolderImportCard onImported={() => void loadAssets(true)} />

      <div className="mb-6 rounded-[1.75rem] border border-gray-200 bg-white p-5 shadow-soft dark:border-gray-800 dark:bg-gray-900">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_repeat(4,minmax(0,1fr))]">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">搜索</label>
            <div className="flex gap-2">
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    handleSearchSubmit();
                  }
                }}
                placeholder="题号、标题、slug、目录名"
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-go-500 focus:ring-4 focus:ring-go-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
              />
              <button type="button" onClick={handleSearchSubmit} className="btn btn-primary whitespace-nowrap">
                搜索
              </button>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">状态</label>
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as StatusFilter);
                setCurrentPage(1);
              }}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-go-500 focus:ring-4 focus:ring-go-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">复习状态</label>
            <select
              value={reviewFilter}
              onChange={(event) => {
                setReviewFilter(event.target.value as ReviewFilter);
                setCurrentPage(1);
              }}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-go-500 focus:ring-4 focus:ring-go-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
            >
              {reviewOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">难度</label>
            <select
              value={difficultyFilter}
              onChange={(event) => {
                setDifficultyFilter(event.target.value as DifficultyFilter);
                setCurrentPage(1);
              }}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-go-500 focus:ring-4 focus:ring-go-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
            >
              {difficultyOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">视频</label>
            <div className="flex gap-2">
              <select
                value={hasVideoFilter}
                onChange={(event) => {
                  setHasVideoFilter(event.target.value as HasVideoFilter);
                  setCurrentPage(1);
                }}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-go-500 focus:ring-4 focus:ring-go-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
              >
                {hasVideoOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button type="button" onClick={handleResetFilters} className="btn btn-secondary whitespace-nowrap">
                重置
              </button>
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-5 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">加载算法资产失败</p>
              <p className="mt-1">{error}</p>
            </div>
            <button type="button" onClick={() => void loadAssets(true)} className="btn btn-secondary">
              重新加载
            </button>
          </div>
        </div>
      ) : assets.length === 0 ? (
        <div className="rounded-[1.75rem] border border-dashed border-gray-300 bg-white px-6 py-14 text-center shadow-soft dark:border-gray-700 dark:bg-gray-900">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-go-100 text-go-700 dark:bg-go-900/30 dark:text-go-300">
            <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
            </svg>
          </div>
          <h2 className="mt-5 text-xl font-semibold text-gray-900 dark:text-white">当前还没有匹配的算法资产</h2>
          <p className="mt-3 text-sm leading-7 text-gray-600 dark:text-gray-400">
            你可以先新建一个资产，或者放宽搜索、难度和视频筛选条件。
          </p>
          <div className="mt-6">
            <Link to="/admin/algorithms/new" className="btn btn-primary">
              创建第一个算法资产
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {assets.map((asset) => (
              <Link
                key={asset.id}
                to={`/admin/algorithms/${asset.id}`}
                className="group block rounded-[1.75rem] border border-gray-200 bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-go-300 hover:shadow-medium dark:border-gray-800 dark:bg-gray-900 dark:hover:border-go-700"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {asset.leetcode_id ? (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                          #{asset.leetcode_id}
                        </span>
                      ) : null}
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass[asset.status]}`}>
                        {statusLabel[asset.status]}
                      </span>
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${reviewBadgeClass[asset.review_status]}`}>
                        {reviewLabel[asset.review_status]}
                      </span>
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${difficultyTone(asset.difficulty)}`}>
                        {asset.difficulty ? difficultyLabel[asset.difficulty] : '未标注难度'}
                      </span>
                    </div>

                    <div className="mt-4 flex items-start gap-4">
                      <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-go-500 to-sky-500 text-white shadow-soft sm:flex">
                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 7h10M7 12h6m-6 5h10M5 4h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" />
                        </svg>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h2 className="truncate text-xl font-semibold text-gray-900 transition group-hover:text-go-700 dark:text-white dark:group-hover:text-go-300">
                              {asset.title}
                            </h2>
                            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                              <span>slug: {asset.slug}</span>
                              <span>目录: {asset.source_dir_name}</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-gray-50 p-3 text-sm dark:bg-gray-950/60 sm:grid-cols-3">
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Markdown</p>
                              <p className="mt-1 font-semibold text-gray-900 dark:text-white">{asset.markdown_count}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">视频</p>
                              <p className="mt-1 font-semibold text-gray-900 dark:text-white">{asset.video_count}</p>
                            </div>
                            <div className="col-span-2 sm:col-span-1">
                              <p className="text-xs text-gray-500 dark:text-gray-400">下次复习</p>
                              <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                                {asset.next_review_at ? formatDate(asset.next_review_at) : '未安排'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {asset.description ? (
                          <p className="mt-4 line-clamp-2 text-sm leading-7 text-gray-600 dark:text-gray-300">
                            {asset.description}
                          </p>
                        ) : null}

                        <div className="mt-4 flex flex-wrap gap-2">
                          {asset.tags.length > 0 ? asset.tags.map((tag) => (
                            <span
                              key={`${asset.id}-${tag}`}
                              className="inline-flex items-center rounded-full bg-go-50 px-3 py-1 text-xs font-medium text-go-700 dark:bg-go-900/20 dark:text-go-300"
                            >
                              {tag}
                            </span>
                          )) : (
                            <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                              暂无标签
                            </span>
                          )}
                        </div>

                        <div className="mt-4 grid gap-3 text-sm text-gray-500 dark:text-gray-400 sm:grid-cols-2 xl:grid-cols-4">
                          <div>
                            <p className="text-xs uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">主 Markdown</p>
                            <p className="mt-1 truncate font-medium text-gray-700 dark:text-gray-200">
                              {asset.primary_markdown_file?.display_name || '未选择'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">主视频</p>
                            <p className="mt-1 truncate font-medium text-gray-700 dark:text-gray-200">
                              {asset.primary_video_file?.display_name || '未选择'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">来源链接</p>
                            <p className="mt-1 truncate font-medium text-gray-700 dark:text-gray-200">
                              {asset.source_url || '未填写'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">最近更新</p>
                            <p className="mt-1 truncate font-medium text-gray-700 dark:text-gray-200">
                              {formatDate(asset.updated_at)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-go-700 dark:text-go-300">
                    <span className="text-sm font-medium">进入详情</span>
                    <svg className="h-5 w-5 transition group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <Pagination
            current_page={currentPage}
            total_pages={totalPages}
            onPageChange={(page) => setCurrentPage(page)}
            show_size_changer
            page_size={pageSize}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
          />
        </>
      )}
    </div>
  );
}
