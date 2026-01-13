import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Article, CategoryTreeNode } from '../../types';
import { categoriesApi } from '../../api/categories';

interface CategoryTreeViewProps {
    categories: CategoryTreeNode[];
    onRefresh: () => void;
    onAddArticles: (categoryId: number) => void;
    onAddSubCategory?: (parentId: number, parentName: string) => void;
}

interface SortableArticleRowProps {
    article: Article;
    categoryId: number;
    onRemove: (categoryId: number, articleId: number) => void;
    formatDate: (dateString: string) => string;
}

// 可拖拽的文章行组件
function SortableArticleRow({ article, categoryId, onRemove, formatDate }: SortableArticleRowProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: article.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`flex items-center gap-3 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${isDragging ? 'shadow-lg z-10' : ''
                }`}
        >
            {/* 拖拽手柄 */}
            <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                </svg>
            </div>

            {/* 封面图 */}
            {article.cover_image && (
                <div className="flex-shrink-0 w-10 h-10">
                    <img
                        src={article.cover_image}
                        alt=""
                        className="w-10 h-10 rounded-lg object-cover"
                    />
                </div>
            )}

            {/* 文章信息 */}
            <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {article.title}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDate(article.created_at)}
                </div>
            </div>

            {/* 状态标签 */}
            <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${article.is_published
                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                }`}>
                {article.is_published ? '已发布' : '草稿'}
            </span>

            {/* 操作按钮 */}
            <div className="flex items-center gap-1">
                <Link
                    to={`/admin/articles/${article.id}/edit`}
                    className="p-1.5 text-go-600 dark:text-go-400 hover:bg-go-50 dark:hover:bg-go-900/20 rounded-lg transition-colors"
                    title="编辑文章"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                </Link>
                <button
                    onClick={() => onRemove(categoryId, article.id)}
                    className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="从分类移除"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
    );
}

// 分类节点组件
interface CategoryNodeProps {
    category: CategoryTreeNode;
    depth: number;
    onRefresh: () => void;
    onAddArticles: (categoryId: number) => void;
    onAddSubCategory?: (parentId: number, parentName: string) => void;
    expandedIds: Set<number>;
    onToggleExpand: (id: number) => void;
}

function CategoryNode({ category, depth, onRefresh, onAddArticles, onAddSubCategory, expandedIds, onToggleExpand }: CategoryNodeProps) {
    const isExpanded = expandedIds.has(category.id);
    const [articles, setArticles] = useState<Article[]>(category.articles || []);
    const [isSaving, setIsSaving] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('zh-CN', {
            month: 'short',
            day: 'numeric',
        });
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = articles.findIndex((a) => a.id === active.id);
            const newIndex = articles.findIndex((a) => a.id === over.id);

            const newArticles = arrayMove(articles, oldIndex, newIndex);
            setArticles(newArticles);

            // 保存排序到后端
            setIsSaving(true);
            try {
                await categoriesApi.updateCategoryArticlesOrder(
                    category.id,
                    newArticles.map((a) => a.id)
                );
            } catch (error) {
                console.error('Failed to save order:', error);
                // 恢复原来的顺序
                setArticles(articles);
            } finally {
                setIsSaving(false);
            }
        }
    };

    const handleRemoveArticle = async (categoryId: number, articleId: number) => {
        if (!confirm('确定要从该分类中移除这篇文章吗？')) return;

        try {
            await categoriesApi.removeArticleFromCategory(categoryId, articleId);
            setArticles(articles.filter((a) => a.id !== articleId));
        } catch (error) {
            console.error('Failed to remove article:', error);
            alert('移除文章失败');
        }
    };

    const hasChildren = category.children && category.children.length > 0;
    const hasArticles = articles.length > 0;
    const hasContent = hasChildren || hasArticles;

    return (
        <div className={`${depth > 0 ? 'ml-6' : ''}`}>
            {/* 分类头部 */}
            <div className="flex items-center gap-2 py-2">
                {/* 展开/折叠按钮 */}
                <button
                    onClick={() => onToggleExpand(category.id)}
                    className={`p-1 rounded-lg transition-colors ${hasContent
                        ? 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500'
                        : 'text-gray-300 cursor-default'
                        }`}
                    disabled={!hasContent}
                >
                    <svg
                        className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>

                {/* 分类图标 */}
                <div className="w-8 h-8 bg-go-100 dark:bg-go-900/30 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-go-600 dark:text-go-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                    </svg>
                </div>

                {/* 分类名称和统计 */}
                <div className="flex-1">
                    <span className="font-medium text-gray-900 dark:text-white">{category.name}</span>
                    <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                        ({articles.length} 篇文章)
                    </span>
                    {isSaving && (
                        <span className="ml-2 text-xs text-go-500">保存中...</span>
                    )}
                </div>

                {/* 添加子分类按钮 */}
                {onAddSubCategory && (
                    <button
                        onClick={() => onAddSubCategory(category.id, category.name)}
                        className="flex items-center gap-1 px-2 py-1 text-sm text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                        title="添加子分类"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                        子分类
                    </button>
                )}

                {/* 添加文章按钮 */}
                <button
                    onClick={() => onAddArticles(category.id)}
                    className="flex items-center gap-1 px-2 py-1 text-sm text-go-600 dark:text-go-400 hover:bg-go-50 dark:hover:bg-go-900/20 rounded-lg transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    添加文章
                </button>
            </div>

            {/* 展开的内容 */}
            {isExpanded && hasContent && (
                <div className="pl-6 border-l-2 border-gray-200 dark:border-gray-700 ml-2">
                    {/* 文章列表 */}
                    {hasArticles && (
                        <div className="space-y-2 my-2">
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <SortableContext
                                    items={articles.map((a) => a.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {articles.map((article) => (
                                        <SortableArticleRow
                                            key={article.id}
                                            article={article}
                                            categoryId={category.id}
                                            onRemove={handleRemoveArticle}
                                            formatDate={formatDate}
                                        />
                                    ))}
                                </SortableContext>
                            </DndContext>
                        </div>
                    )}

                    {/* 子分类 */}
                    {hasChildren &&
                        category.children!.map((child) => (
                            <CategoryNode
                                key={child.id}
                                category={child}
                                depth={depth + 1}
                                onRefresh={onRefresh}
                                onAddArticles={onAddArticles}
                                onAddSubCategory={onAddSubCategory}
                                expandedIds={expandedIds}
                                onToggleExpand={onToggleExpand}
                            />
                        ))}
                </div>
            )}
        </div>
    );
}

// 获取所有分类 ID（用于全部展开）
function getAllCategoryIds(categories: CategoryTreeNode[]): number[] {
    const ids: number[] = [];
    for (const cat of categories) {
        ids.push(cat.id);
        if (cat.children && cat.children.length > 0) {
            ids.push(...getAllCategoryIds(cat.children));
        }
    }
    return ids;
}

// 主组件
export default function CategoryTreeView({ categories, onRefresh, onAddArticles, onAddSubCategory }: CategoryTreeViewProps) {
    // 默认全部折叠（空集合）
    const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

    // 当分类数据变化时，重置为默认折叠状态
    useEffect(() => {
        setExpandedIds(new Set());
    }, [categories]);

    const handleToggleExpand = (id: number) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const handleExpandAll = () => {
        setExpandedIds(new Set(getAllCategoryIds(categories)));
    };

    const handleCollapseAll = () => {
        setExpandedIds(new Set());
    };

    if (categories.length === 0) {
        return (
            <div className="text-center py-16">
                <div className="w-20 h-20 mx-auto mb-6 bg-go-100 dark:bg-go-900/30 rounded-2xl flex items-center justify-center">
                    <svg className="w-10 h-10 text-go-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                    </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    暂无分类
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-sm mx-auto">
                    请先在分类管理页面创建分类，然后再来这里管理分类下的文章
                </p>
                <Link to="/admin/categories" className="btn btn-primary">
                    前往分类管理
                </Link>
            </div>
        );
    }

    const allExpanded = expandedIds.size >= getAllCategoryIds(categories).length;

    return (
        <div className="space-y-4">
            {/* 工具栏 */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                    共 {categories.length} 个顶级分类
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleExpandAll}
                        disabled={allExpanded}
                        className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg transition-colors ${allExpanded
                                ? 'text-gray-400 cursor-not-allowed'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                        全部展开
                    </button>
                    <button
                        onClick={handleCollapseAll}
                        disabled={expandedIds.size === 0}
                        className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg transition-colors ${expandedIds.size === 0
                                ? 'text-gray-400 cursor-not-allowed'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        全部折叠
                    </button>
                </div>
            </div>

            {/* 分类树 */}
            <div className="space-y-2">
                {categories.map((category) => (
                    <CategoryNode
                        key={category.id}
                        category={category}
                        depth={0}
                        onRefresh={onRefresh}
                        onAddArticles={onAddArticles}
                        onAddSubCategory={onAddSubCategory}
                        expandedIds={expandedIds}
                        onToggleExpand={handleToggleExpand}
                    />
                ))}
            </div>
        </div>
    );
}
