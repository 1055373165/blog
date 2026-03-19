import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import LoadingSpinner from '../../components/LoadingSpinner';
import PromptTreeView from '../../components/admin/PromptTreeView';
import StringMultiSelect from '../../components/admin/StringMultiSelect';
import Toast, { ToastType } from '../../components/ui/Toast';
import { promptsApi } from '../../api/prompts';
import type { Prompt, PromptStatus } from '../../types';

type StatusFilter = 'all' | PromptStatus;

function flattenPrompts(prompts: Prompt[]): Prompt[] {
  return prompts.flatMap((prompt) => [prompt, ...(prompt.children ? flattenPrompts(prompt.children) : [])]);
}

function includesAny(values: string[], selected: string[]) {
  const loweredValues = values.map((value) => value.toLowerCase());
  return selected.some((value) => loweredValues.includes(value.toLowerCase()));
}

function filterPromptTree(prompts: Prompt[], filters: {
  search: string;
  status: StatusFilter;
  selectedTags: string[];
  selectedModels: string[];
}): Prompt[] {
  const search = filters.search.trim().toLowerCase();

  return prompts.reduce<Prompt[]>((result, prompt) => {
    const filteredChildren = filterPromptTree(prompt.children || [], filters);
    const matchesSearch =
      !search ||
      [
        prompt.name,
        prompt.slug,
        prompt.description || '',
        prompt.content || '',
        prompt.notes || '',
        prompt.tags.join(' '),
        prompt.applicable_models.join(' '),
      ].some((value) => value.toLowerCase().includes(search));

    const matchesStatus = filters.status === 'all' || prompt.status === filters.status;
    const matchesTags = filters.selectedTags.length === 0 || includesAny(prompt.tags, filters.selectedTags);
    const matchesModels =
      filters.selectedModels.length === 0 || includesAny(prompt.applicable_models, filters.selectedModels);

    if ((matchesSearch && matchesStatus && matchesTags && matchesModels) || filteredChildren.length > 0) {
      result.push({
        ...prompt,
        children: filteredChildren,
        child_count: filteredChildren.length,
      });
    }

    return result;
  }, []);
}

const statusOptions: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'active', label: '启用' },
  { key: 'draft', label: '草稿' },
  { key: 'archived', label: '归档' },
];

export default function AdminPrompts() {
  const navigate = useNavigate();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [toast, setToast] = useState<{ message: string; type: ToastType; isVisible: boolean }>({
    message: '',
    type: 'success',
    isVisible: false,
  });

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await promptsApi.getPromptTree();
      if (!response.success) {
        throw new Error(response.error || '加载提示词失败');
      }
      setPrompts(response.data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : '加载提示词失败';
      setError(message);
      setToast({ message, type: 'error', isVisible: true });
    } finally {
      setLoading(false);
    }
  };

  const flatPrompts = useMemo(() => flattenPrompts(prompts), [prompts]);

  const filteredPrompts = useMemo(
    () =>
      filterPromptTree(prompts, {
        search: searchTerm,
        status: statusFilter,
        selectedTags,
        selectedModels,
      }),
    [prompts, searchTerm, statusFilter, selectedTags, selectedModels]
  );

  const availableTags = useMemo(
    () => Array.from(new Set(flatPrompts.flatMap((prompt) => prompt.tags))).sort((a, b) => a.localeCompare(b, 'zh-CN')),
    [flatPrompts]
  );

  const availableModels = useMemo(
    () =>
      Array.from(new Set(flatPrompts.flatMap((prompt) => prompt.applicable_models))).sort((a, b) =>
        a.localeCompare(b, 'zh-CN')
      ),
    [flatPrompts]
  );

  const activeCount = useMemo(() => flatPrompts.filter((prompt) => prompt.status === 'active').length, [flatPrompts]);
  const draftCount = useMemo(() => flatPrompts.filter((prompt) => prompt.status === 'draft').length, [flatPrompts]);

  const activeFilters = !!searchTerm || statusFilter !== 'all' || selectedTags.length > 0 || selectedModels.length > 0;

  const handleDeletePrompt = async (prompt: Prompt) => {
    if (!window.confirm(`确定要删除提示词「${prompt.name}」吗？此操作不可恢复。`)) {
      return;
    }

    try {
      const response = await promptsApi.deletePrompt(prompt.id);
      if (!response.success) {
        throw new Error(response.error || '删除提示词失败');
      }
      setToast({ message: '提示词已删除', type: 'success', isVisible: true });
      await loadPrompts();
    } catch (err) {
      const message = err instanceof Error ? err.message : '删除提示词失败';
      setToast({ message, type: 'error', isVisible: true });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8 rounded-[2rem] border border-go-100 dark:border-go-900/40 bg-gradient-to-br from-white via-go-50/70 to-blue-50/60 dark:from-gray-900 dark:via-go-950/20 dark:to-gray-900 p-6 shadow-soft">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 dark:bg-gray-800/80 border border-white/80 dark:border-gray-700 text-xs font-medium text-go-700 dark:text-go-300 mb-4">
              <span className="w-2 h-2 rounded-full bg-go-500" />
              Nested Prompt Library
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
              提示词管理
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-400">
              用树形结构整理你的提示词资产。每个父节点本身也可以直接使用，并继续延展出更细的子提示词。
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={loadPrompts}
              className="btn btn-secondary flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              刷新
            </button>
            <Link to="/admin/prompts/new" className="btn btn-primary flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              新建提示词
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            { label: '提示词总数', value: flatPrompts.length, tone: 'from-go-500/10 to-go-100 dark:from-go-500/10 dark:to-go-900/20' },
            { label: '启用中', value: activeCount, tone: 'from-emerald-500/10 to-emerald-100 dark:from-emerald-500/10 dark:to-emerald-900/20' },
            { label: '草稿中', value: draftCount, tone: 'from-amber-500/10 to-amber-100 dark:from-amber-500/10 dark:to-amber-900/20' },
          ].map((item) => (
            <div
              key={item.label}
              className={`rounded-3xl border border-white/80 dark:border-gray-700 bg-gradient-to-br ${item.tone} p-5`}
            >
              <div className="text-sm text-gray-500 dark:text-gray-400">{item.label}</div>
              <div className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-red-400 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        </div>
      )}

      <div className="card p-5 mb-6">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,0.8fr)]">
          <div className="min-w-0">
            <label className="block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
              搜索
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    setSearchTerm(searchInput.trim());
                  }
                }}
                placeholder="搜索名称、说明、正文、标签或模型"
                className="block w-full pl-10 pr-20 py-2.5 border border-gray-300 dark:border-gray-600 rounded-2xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-go-500 focus:border-transparent transition-all duration-200"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 gap-1">
                <button
                  type="button"
                  onClick={() => setSearchTerm(searchInput.trim())}
                  className="p-1.5 text-gray-400 hover:text-go-600 dark:hover:text-go-400 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
                {(searchInput || searchTerm) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput('');
                      setSearchTerm('');
                    }}
                    className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>

          <StringMultiSelect
            label="标签筛选"
            options={availableTags}
            selected={selectedTags}
            onToggle={(value) =>
              setSelectedTags((current) =>
                current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
              )
            }
            onClear={() => setSelectedTags([])}
            placeholder="选择标签"
          />

          <StringMultiSelect
            label="模型筛选"
            options={availableModels}
            selected={selectedModels}
            onToggle={(value) =>
              setSelectedModels((current) =>
                current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
              )
            }
            onClear={() => setSelectedModels([])}
            placeholder="选择适用模型"
          />
        </div>

        <div className="mt-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            {statusOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setStatusFilter(option.key)}
                className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 ${
                  statusFilter === option.key
                    ? 'bg-go-100 dark:bg-go-900/30 text-go-700 dark:text-go-300'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-go-50 dark:hover:bg-go-900/10'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            {activeFilters && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  setSearchTerm('');
                  setStatusFilter('all');
                  setSelectedTags([]);
                  setSelectedModels([]);
                }}
                className="px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 hover:text-red-600 dark:hover:text-red-400 transition-colors"
              >
                清除所有筛选
              </button>
            )}
            <span>当前展示 {flattenPrompts(filteredPrompts).length} 条提示词</span>
          </div>
        </div>
      </div>

      {filteredPrompts.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-go-100 dark:bg-go-900/30 flex items-center justify-center mb-5">
            <svg className="w-8 h-8 text-go-600 dark:text-go-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {flatPrompts.length === 0 ? '还没有提示词' : '没有匹配的提示词'}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-6">
            {flatPrompts.length === 0
              ? '从一个根提示词开始，再按业务场景逐层向下拆分。'
              : '换一个关键词，或者放宽标签、模型与状态筛选条件。'}
          </p>
          <Link to="/admin/prompts/new" className="btn btn-primary inline-flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新建提示词
          </Link>
        </div>
      ) : (
        <PromptTreeView
          prompts={filteredPrompts}
          autoExpandAll={activeFilters}
          onAddChild={(prompt) => navigate(`/admin/prompts/new?parent=${prompt.id}`)}
          onDelete={handleDeletePrompt}
        />
      )}

      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast((current) => ({ ...current, isVisible: false }))}
      />
    </div>
  );
}
