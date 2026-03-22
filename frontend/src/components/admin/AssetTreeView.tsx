import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AiAssetBase, Prompt } from '../../types';

type TreeAsset = AiAssetBase & {
  children?: TreeAsset[];
  parent?: TreeAsset;
  applicable_models?: Prompt['applicable_models'];
};

interface AssetTreeViewProps {
  assets: TreeAsset[];
  childLabel: string;
  autoExpandAll?: boolean;
  expandAction?: {
    type: 'expandAll' | 'collapseAll';
    token: number;
  } | null;
  onAddChild: (asset: TreeAsset) => void;
  onDelete: (asset: TreeAsset) => void;
  getEditPath: (asset: TreeAsset) => string;
}

function collectAssetIds(assets: TreeAsset[]): number[] {
  return assets.flatMap((asset) => [asset.id, ...(asset.children ? collectAssetIds(asset.children) : [])]);
}

function getStatusClasses(status: TreeAsset['status']) {
  switch (status) {
    case 'active':
      return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300';
    case 'archived':
      return 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
    default:
      return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300';
  }
}

function getStatusLabel(status: TreeAsset['status']) {
  switch (status) {
    case 'active':
      return '启用';
    case 'archived':
      return '归档';
    default:
      return '草稿';
  }
}

interface AssetNodeProps {
  asset: TreeAsset;
  depth: number;
  childLabel: string;
  expandedIds: Set<number>;
  onToggleExpand: (id: number) => void;
  onAddChild: (asset: TreeAsset) => void;
  onDelete: (asset: TreeAsset) => void;
  getEditPath: (asset: TreeAsset) => string;
}

function AssetNode({
  asset,
  depth,
  childLabel,
  expandedIds,
  onToggleExpand,
  onAddChild,
  onDelete,
  getEditPath,
}: AssetNodeProps) {
  const hasChildren = !!asset.children?.length;
  const isExpanded = expandedIds.has(asset.id);

  return (
    <div className={`${depth > 0 ? 'ml-5 pl-5 border-l border-dashed border-gray-200 dark:border-gray-700' : ''}`}>
      <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/90 shadow-soft overflow-hidden">
        <div className="px-5 py-4">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => hasChildren && onToggleExpand(asset.id)}
              className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-2xl flex items-center justify-center transition-colors ${
                hasChildren
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-go-50 dark:hover:bg-go-900/20 hover:text-go-600 dark:hover:text-go-300'
                  : 'bg-gray-50 dark:bg-gray-800 text-gray-300 dark:text-gray-600 cursor-default'
              }`}
            >
              <svg
                className={`w-4 h-4 transition-transform ${hasChildren && isExpanded ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-base font-semibold text-gray-900 dark:text-white">
                  {asset.name}
                </span>
                <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full ${getStatusClasses(asset.status)}`}>
                  {getStatusLabel(asset.status)}
                </span>
                {asset.child_count > 0 && (
                  <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                    {asset.child_count} 个子{childLabel}
                  </span>
                )}
              </div>

              {asset.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 leading-6">
                  {asset.description}
                </p>
              )}

              <div className="flex flex-wrap gap-2 mb-3">
                {asset.tags.slice(0, 4).map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2 py-1 text-xs rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                  >
                    #{tag}
                  </span>
                ))}
                {(asset.applicable_models || []).slice(0, 3).map((model) => (
                  <span
                    key={model}
                    className="inline-flex items-center px-2 py-1 text-xs rounded-full bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300"
                  >
                    {model}
                  </span>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                <span>slug: {asset.slug}</span>
                <span>更新于 {new Date(asset.updated_at).toLocaleString('zh-CN')}</span>
              </div>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                type="button"
                onClick={() => onAddChild(asset)}
                className="p-2 text-go-600 dark:text-go-400 hover:text-go-700 dark:hover:text-go-300 hover:bg-go-50 dark:hover:bg-go-900/20 rounded-2xl transition-colors"
                title={`添加子${childLabel}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
              <Link
                to={getEditPath(asset)}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-go-700 dark:hover:text-go-300 hover:bg-go-50 dark:hover:bg-go-900/20 rounded-2xl transition-colors"
                title={`编辑${childLabel}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </Link>
              <button
                type="button"
                onClick={() => onDelete(asset)}
                className="p-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-colors"
                title={`删除${childLabel}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div className="mt-3 space-y-3">
          {asset.children!.map((child) => (
            <AssetNode
              key={child.id}
              asset={child}
              depth={depth + 1}
              childLabel={childLabel}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
              onAddChild={onAddChild}
              onDelete={onDelete}
              getEditPath={getEditPath}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function AssetTreeView({
  assets,
  childLabel,
  autoExpandAll = false,
  expandAction = null,
  onAddChild,
  onDelete,
  getEditPath,
}: AssetTreeViewProps) {
  const allIds = useMemo(() => collectAssetIds(assets), [assets]);
  const rootIds = useMemo(() => assets.map((asset) => asset.id), [assets]);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set(rootIds));

  useEffect(() => {
    setExpandedIds(new Set(autoExpandAll ? allIds : rootIds));
  }, [allIds, autoExpandAll, rootIds]);

  useEffect(() => {
    if (!expandAction) {
      return;
    }

    setExpandedIds(new Set(expandAction.type === 'expandAll' ? allIds : []));
  }, [allIds, expandAction]);

  const handleToggleExpand = (id: number) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {assets.map((asset) => (
        <AssetNode
          key={asset.id}
          asset={asset}
          depth={0}
          childLabel={childLabel}
          expandedIds={expandedIds}
          onToggleExpand={handleToggleExpand}
          onAddChild={onAddChild}
          onDelete={onDelete}
          getEditPath={getEditPath}
        />
      ))}
    </div>
  );
}
