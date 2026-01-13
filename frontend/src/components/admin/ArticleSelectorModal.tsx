import { useState, useEffect } from 'react';
import { Article } from '../../types';
import { apiClient } from '../../api/client';
import LoadingSpinner from '../LoadingSpinner';

interface ArticleSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (articleIds: number[]) => void;
    excludeArticleIds?: number[];
    categoryName?: string;
}

export default function ArticleSelectorModal({
    isOpen,
    onClose,
    onSelect,
    excludeArticleIds = [],
    categoryName,
}: ArticleSelectorModalProps) {
    const [articles, setArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    useEffect(() => {
        if (isOpen) {
            loadArticles();
            setSelectedIds([]);
            setSearchTerm('');
        }
    }, [isOpen]);

    const loadArticles = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get<{
                articles: Article[];
                pagination: { total: number };
            }>('/api/articles?limit=100');

            if (response.success) {
                // 过滤掉已经在该分类中的文章
                const filteredArticles = response.data.articles.filter(
                    (a) => !excludeArticleIds.includes(a.id)
                );
                setArticles(filteredArticles);
            }
        } catch (error) {
            console.error('Failed to load articles:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleSelection = (articleId: number) => {
        setSelectedIds((prev) =>
            prev.includes(articleId)
                ? prev.filter((id) => id !== articleId)
                : [...prev, articleId]
        );
    };

    const handleSelectAll = () => {
        const filteredArticles = getFilteredArticles();
        if (selectedIds.length === filteredArticles.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredArticles.map((a) => a.id));
        }
    };

    const handleConfirm = () => {
        onSelect(selectedIds);
        onClose();
    };

    const getFilteredArticles = () => {
        if (!searchTerm.trim()) return articles;
        const term = searchTerm.toLowerCase();
        return articles.filter(
            (a) =>
                a.title.toLowerCase().includes(term) ||
                a.excerpt?.toLowerCase().includes(term)
        );
    };

    const filteredArticles = getFilteredArticles();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
                {/* 背景遮罩 */}
                <div
                    className="fixed inset-0 bg-black/50 transition-opacity"
                    onClick={onClose}
                />

                {/* 模态框内容 */}
                <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-xl">
                    {/* 头部 */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                选择文章
                            </h3>
                            {categoryName && (
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    添加到分类: {categoryName}
                                </p>
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* 搜索和选择所有 */}
                    <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-4">
                            <div className="relative flex-1">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <input
                                    type="text"
                                    placeholder="搜索文章..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="block w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-go-500 focus:border-transparent"
                                />
                            </div>
                            <button
                                onClick={handleSelectAll}
                                className="text-sm text-go-600 dark:text-go-400 hover:text-go-700 dark:hover:text-go-300 whitespace-nowrap"
                            >
                                {selectedIds.length === filteredArticles.length && filteredArticles.length > 0
                                    ? '取消全选'
                                    : '全选'}
                            </button>
                        </div>
                        <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                            已选择 {selectedIds.length} 篇文章
                        </div>
                    </div>

                    {/* 文章列表 */}
                    <div className="max-h-96 overflow-y-auto">
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <LoadingSpinner size="lg" />
                            </div>
                        ) : filteredArticles.length === 0 ? (
                            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                                {searchTerm ? '没有找到匹配的文章' : '暂无可添加的文章'}
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-200 dark:divide-gray-700">
                                {filteredArticles.map((article) => (
                                    <label
                                        key={article.id}
                                        className="flex items-center gap-3 px-6 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(article.id)}
                                            onChange={() => toggleSelection(article.id)}
                                            className="w-4 h-4 text-go-600 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-go-500"
                                        />
                                        {article.cover_image && (
                                            <img
                                                src={article.cover_image}
                                                alt=""
                                                className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                                            />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                {article.title}
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                {article.excerpt || '暂无摘要'}
                                            </div>
                                        </div>
                                        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${article.is_published
                                                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                                                : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                                            }`}>
                                            {article.is_published ? '已发布' : '草稿'}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 底部操作 */}
                    <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                        >
                            取消
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={selectedIds.length === 0}
                            className="px-4 py-2 text-sm font-medium text-white bg-go-600 hover:bg-go-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg transition-colors"
                        >
                            添加 ({selectedIds.length})
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
