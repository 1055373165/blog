import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import LoadingSpinner from '../../components/LoadingSpinner';
import AssetTreeView from '../../components/admin/AssetTreeView';
import StringMultiSelect from '../../components/admin/StringMultiSelect';
import Toast, { ToastType } from '../../components/ui/Toast';
import { promptsApi } from '../../api/prompts';
import { skillsApi } from '../../api/skills';
import type { AiAssetBase, AiAssetStatus, AiAssetType, Prompt, Skill } from '../../types';

type StatusFilter = 'all' | AiAssetStatus;
type AssetRecord = Prompt | Skill;

interface AdminPromptsProps {
  defaultAssetType?: AiAssetType;
}

const statusOptions: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'active', label: '启用' },
  { key: 'draft', label: '草稿' },
  { key: 'archived', label: '归档' },
];

const assetConfig: Record<
  AiAssetType,
  {
    singular: string;
    plural: string;
    switchLabel: string;
    description: string;
    childLabel: string;
    newPath: string;
    getEditPath: (id: number) => string;
    emptyTitle: string;
    emptyDescription: string;
    noMatchDescription: string;
    searchPlaceholder: string;
    refreshSuccess: string;
    deleteSuccess: string;
    deletePrompt: (name: string) => string;
  }
> = {
  prompt: {
    singular: '提示词',
    plural: '提示词',
    switchLabel: 'Prompt Library',
    description: '用树形结构整理你的提示词资产。每个父节点本身也可以直接使用，并继续延展出更细的子提示词。',
    childLabel: '提示词',
    newPath: '/admin/prompts/new',
    getEditPath: (id) => `/admin/prompts/${id}/edit`,
    emptyTitle: '还没有提示词',
    emptyDescription: '从一个根提示词开始，再按业务场景逐层向下拆分。',
    noMatchDescription: '换一个关键词，或者放宽标签、模型与状态筛选条件。',
    searchPlaceholder: '搜索名称、说明、正文、标签或模型',
    refreshSuccess: '提示词列表已刷新',
    deleteSuccess: '提示词已删除',
    deletePrompt: (name) => `确定要删除提示词「${name}」吗？此操作不可恢复。`,
  },
  skill: {
    singular: 'Skill',
    plural: 'Skills',
    switchLabel: 'Skill Library',
    description: '把可复用能力也组织成树。父 Skill 可以直接使用，也可以继续拆成更细的执行单元或领域能力。',
    childLabel: 'Skill',
    newPath: '/admin/skills/new',
    getEditPath: (id) => `/admin/skills/${id}/edit`,
    emptyTitle: '还没有 Skills',
    emptyDescription: '先创建一个根 Skill，再按职责、领域或任务链路继续拆分。',
    noMatchDescription: '换一个关键词，或者放宽标签与状态筛选条件。',
    searchPlaceholder: '搜索名称、说明、正文、备注或标签',
    refreshSuccess: 'Skill 列表已刷新',
    deleteSuccess: 'Skill 已删除',
    deletePrompt: (name) => `确定要删除 Skill「${name}」吗？此操作不可恢复。`,
  },
};

function flattenAssets<T extends { children?: T[] }>(assets: T[]): T[] {
  return assets.flatMap((asset) => [asset, ...(asset.children ? flattenAssets(asset.children) : [])]);
}

function includesAny(values: string[], selected: string[]) {
  const loweredValues = values.map((value) => value.toLowerCase());
  return selected.some((value) => loweredValues.includes(value.toLowerCase()));
}

function getApplicableModels(asset: AssetRecord): string[] {
  return 'applicable_models' in asset && Array.isArray(asset.applicable_models) ? asset.applicable_models : [];
}

function filterAssetTree<T extends AssetRecord>(assets: T[], filters: {
  search: string;
  status: StatusFilter;
  selectedTags: string[];
  selectedModels: string[];
}): T[] {
  const search = filters.search.trim().toLowerCase();

  return assets.reduce<T[]>((result, asset) => {
    const filteredChildren = filterAssetTree((asset.children || []) as T[], filters);
    const applicableModels = getApplicableModels(asset);
    const matchesSearch =
      !search ||
      [
        asset.name,
        asset.slug,
        asset.description || '',
        asset.content || '',
        asset.notes || '',
        asset.tags.join(' '),
        applicableModels.join(' '),
      ].some((value) => value.toLowerCase().includes(search));

    const matchesStatus = filters.status === 'all' || asset.status === filters.status;
    const matchesTags = filters.selectedTags.length === 0 || includesAny(asset.tags, filters.selectedTags);
    const matchesModels =
      filters.selectedModels.length === 0 || includesAny(applicableModels, filters.selectedModels);

    if ((matchesSearch && matchesStatus && matchesTags && matchesModels) || filteredChildren.length > 0) {
      result.push({
        ...asset,
        children: filteredChildren,
        child_count: filteredChildren.length,
      } as T);
    }

    return result;
  }, []);
}

export default function AdminPrompts({ defaultAssetType = 'prompt' }: AdminPromptsProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryType = searchParams.get('type');
  const activeType: AiAssetType = queryType === 'skill' ? 'skill' : queryType === 'prompt' ? 'prompt' : defaultAssetType;
  const config = assetConfig[activeType];

  const [assetsByType, setAssetsByType] = useState<Record<AiAssetType, AssetRecord[]>>({
    prompt: [],
    skill: [],
  });
  const [loadingByType, setLoadingByType] = useState<Record<AiAssetType, boolean>>({
    prompt: false,
    skill: false,
  });
  const [loadedByType, setLoadedByType] = useState<Record<AiAssetType, boolean>>({
    prompt: false,
    skill: false,
  });
  const [errorByType, setErrorByType] = useState<Record<AiAssetType, string | null>>({
    prompt: null,
    skill: null,
  });
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [treeExpandAction, setTreeExpandAction] = useState<{
    type: 'expandAll' | 'collapseAll';
    token: number;
  } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType; isVisible: boolean }>({
    message: '',
    type: 'success',
    isVisible: false,
  });

  useEffect(() => {
    if (!queryType && defaultAssetType !== 'prompt') {
      setSearchParams({ type: defaultAssetType }, { replace: true });
    }
  }, [defaultAssetType, queryType, setSearchParams]);

  useEffect(() => {
    if (!loadedByType[activeType]) {
      void loadAssetTree(activeType);
    }
  }, [activeType, loadedByType]);

  useEffect(() => {
    if (activeType === 'skill' && selectedModels.length > 0) {
      setSelectedModels([]);
    }
  }, [activeType, selectedModels.length]);

  const loadAssetTree = async (type: AiAssetType, showSuccessToast = false) => {
    try {
      setLoadingByType((current) => ({ ...current, [type]: true }));
      setErrorByType((current) => ({ ...current, [type]: null }));

      const response = type === 'prompt' ? await promptsApi.getPromptTree() : await skillsApi.getSkillTree();
      if (!response.success) {
        throw new Error(response.error || `加载${assetConfig[type].plural}失败`);
      }

      setAssetsByType((current) => ({ ...current, [type]: response.data || [] }));
      setLoadedByType((current) => ({ ...current, [type]: true }));

      if (showSuccessToast) {
        setToast({ message: assetConfig[type].refreshSuccess, type: 'success', isVisible: true });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : `加载${assetConfig[type].plural}失败`;
      setErrorByType((current) => ({ ...current, [type]: message }));
      setToast({ message, type: 'error', isVisible: true });
    } finally {
      setLoadingByType((current) => ({ ...current, [type]: false }));
    }
  };

  const currentAssets = assetsByType[activeType];
  const flatAssets = useMemo(() => flattenAssets(currentAssets), [currentAssets]);

  const filteredAssets = useMemo(
    () =>
      filterAssetTree(currentAssets as AssetRecord[], {
        search: searchTerm,
        status: statusFilter,
        selectedTags,
        selectedModels: activeType === 'prompt' ? selectedModels : [],
      }),
    [activeType, currentAssets, searchTerm, selectedModels, selectedTags, statusFilter]
  );

  const availableTags = useMemo(
    () => Array.from(new Set(flatAssets.flatMap((asset) => asset.tags))).sort((a, b) => a.localeCompare(b, 'zh-CN')),
    [flatAssets]
  );

  const availableModels = useMemo(
    () =>
      activeType === 'prompt'
        ? Array.from(
            new Set(
              flatAssets.flatMap((asset) => getApplicableModels(asset))
            )
          ).sort((a, b) => a.localeCompare(b, 'zh-CN'))
        : [],
    [activeType, flatAssets]
  );

  const activeCount = useMemo(() => flatAssets.filter((asset) => asset.status === 'active').length, [flatAssets]);
  const draftCount = useMemo(() => flatAssets.filter((asset) => asset.status === 'draft').length, [flatAssets]);
  const activeFilters =
    !!searchTerm || statusFilter !== 'all' || selectedTags.length > 0 || (activeType === 'prompt' && selectedModels.length > 0);

  const handleDeleteAsset = async (asset: AiAssetBase) => {
    if (!window.confirm(config.deletePrompt(asset.name))) {
      return;
    }

    try {
      const response = activeType === 'prompt' ? await promptsApi.deletePrompt(asset.id) : await skillsApi.deleteSkill(asset.id);
      if (!response.success) {
        throw new Error(response.error || `删除${config.singular}失败`);
      }
      setToast({ message: config.deleteSuccess, type: 'success', isVisible: true });
      await loadAssetTree(activeType);
    } catch (err) {
      const message = err instanceof Error ? err.message : `删除${config.singular}失败`;
      setToast({ message, type: 'error', isVisible: true });
    }
  };

  const error = errorByType[activeType];
  const loading = loadingByType[activeType];

  if (loading && !loadedByType[activeType]) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8 rounded-[2rem] border border-go-100 dark:border-go-900/40 bg-gradient-to-br from-white via-go-50/70 to-blue-50/60 dark:from-gray-900 dark:via-go-950/20 dark:to-gray-900 p-6 shadow-soft">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 dark:bg-gray-800/80 border border-white/80 dark:border-gray-700 text-xs font-medium text-go-700 dark:text-go-300 mb-4">
                <span className="w-2 h-2 rounded-full bg-go-500" />
                {config.switchLabel}
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                AI 资产管理
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-400">
                {config.description}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => void loadAssetTree(activeType, true)}
                className="btn btn-secondary flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                刷新
              </button>
              <Link to={config.newPath} className="btn btn-primary flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {`新建${config.singular}`}
              </Link>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {(['prompt', 'skill'] as AiAssetType[]).map((type) => {
              const isActive = activeType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSearchParams({ type })}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-go-600 text-white shadow-soft'
                      : 'bg-white/80 dark:bg-gray-800/80 text-gray-600 dark:text-gray-300 hover:bg-go-50 dark:hover:bg-go-900/20'
                  }`}
                >
                  <span className={`h-2.5 w-2.5 rounded-full ${isActive ? 'bg-white/90' : 'bg-go-500'}`} />
                  {assetConfig[type].plural}
                </button>
              );
            })}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                label: `${config.singular}总数`,
                value: flatAssets.length,
                tone: 'from-go-500/10 to-go-100 dark:from-go-500/10 dark:to-go-900/20',
              },
              {
                label: '启用中',
                value: activeCount,
                tone: 'from-emerald-500/10 to-emerald-100 dark:from-emerald-500/10 dark:to-emerald-900/20',
              },
              {
                label: '草稿中',
                value: draftCount,
                tone: 'from-amber-500/10 to-amber-100 dark:from-amber-500/10 dark:to-amber-900/20',
              },
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
        <div className={`grid gap-4 ${activeType === 'prompt' ? 'xl:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,0.8fr)]' : 'xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]'}`}>
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
                placeholder={config.searchPlaceholder}
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

          {activeType === 'prompt' && (
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
          )}
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
            {filteredAssets.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setTreeExpandAction({
                      type: 'expandAll',
                      token: Date.now(),
                    })
                  }
                  className="px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 hover:text-go-600 dark:hover:text-go-300 transition-colors"
                >
                  全部展开
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setTreeExpandAction({
                      type: 'collapseAll',
                      token: Date.now(),
                    })
                  }
                  className="px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 hover:text-go-600 dark:hover:text-go-300 transition-colors"
                >
                  全部折叠
                </button>
              </>
            )}
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
            <span>{`当前展示 ${flattenAssets(filteredAssets).length} 条${config.singular}`}</span>
          </div>
        </div>
      </div>

      {filteredAssets.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-go-100 dark:bg-go-900/30 flex items-center justify-center mb-5">
            <svg className="w-8 h-8 text-go-600 dark:text-go-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {flatAssets.length === 0 ? config.emptyTitle : `没有匹配的${config.plural}`}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-6">
            {flatAssets.length === 0 ? config.emptyDescription : config.noMatchDescription}
          </p>
          <Link to={config.newPath} className="btn btn-primary inline-flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {`新建${config.singular}`}
          </Link>
        </div>
      ) : (
        <AssetTreeView
          assets={filteredAssets as AssetRecord[]}
          childLabel={config.childLabel}
          autoExpandAll={activeFilters}
          expandAction={treeExpandAction}
          onAddChild={(asset) => navigate(`${config.newPath}?parent=${asset.id}`)}
          onDelete={handleDeleteAsset}
          getEditPath={(asset) => config.getEditPath(asset.id)}
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
