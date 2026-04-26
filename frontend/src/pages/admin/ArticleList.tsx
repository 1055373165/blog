import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Article, PaginatedResponse, Category, CategoryTreeNode, Tag } from '../../types';
import LoadingSpinner from '../../components/LoadingSpinner';
import Pagination from '../../components/Pagination';
import { apiClient } from '../../api/client';
import { categoriesApi } from '../../api/categories';
import { tagsApi } from '../../api/tags';
import CategoryTreeView from '../../components/admin/CategoryTreeView';
import ArticleSelectorModal from '../../components/admin/ArticleSelectorModal';
import { getThumbnailUrl } from '../../utils/imageUtils';

const PAGE_SIZE = 20;

export default function ArticleList() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [searchInput, setSearchInput] = useState(''); // 用户输入的搜索词
  const [searchTerm, setSearchTerm] = useState(''); // 实际用于搜索的词
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [showTagsDropdown, setShowTagsDropdown] = useState(false);
  const tagsDropdownRef = useRef<HTMLDivElement>(null);

  // Tab 视图模式
  const [viewMode, setViewMode] = useState<'articles' | 'categories'>('articles');
  const [categoryTree, setCategoryTree] = useState<CategoryTreeNode[]>([]);
  const [categoryTreeLoading, setCategoryTreeLoading] = useState(false);

  // 文章选择器
  const [showArticleSelector, setShowArticleSelector] = useState(false);
  const [selectedCategoryForAdd, setSelectedCategoryForAdd] = useState<number | null>(null);

  // 子分类创建
  const [showSubCategoryModal, setShowSubCategoryModal] = useState(false);
  const [subCategoryParentId, setSubCategoryParentId] = useState<number | null>(null);
  const [subCategoryParentName, setSubCategoryParentName] = useState<string>('');
  const [subCategoryName, setSubCategoryName] = useState('');
  const [subCategorySlug, setSubCategorySlug] = useState('');
  const [subCategoryCreating, setSubCategoryCreating] = useState(false);

  useEffect(() => {
    loadArticles();
  }, [currentPage, filter, searchTerm, selectedCategoryId, selectedTagIds]);

  useEffect(() => {
    loadCategories();
    loadTags();
  }, []);

  // 当切换到分类视图时加载分类树
  useEffect(() => {
    if (viewMode === 'categories') {
      loadCategoryTree();
    }
  }, [viewMode]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tagsDropdownRef.current && !tagsDropdownRef.current.contains(event.target as Node)) {
        setShowTagsDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const loadCategories = async () => {
    try {
      setCategoriesLoading(true);
      const response = await categoriesApi.getCategories({ limit: 100 });
      if (response.success) {
        setCategories(response.data.categories || response.data.items || []);
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const loadCategoryTree = async () => {
    try {
      setCategoryTreeLoading(true);
      const response = await categoriesApi.getCategoryTreeWithArticles();
      if (response.success) {
        setCategoryTree(response.data || []);
      }
    } catch (err) {
      console.error('Failed to load category tree:', err);
    } finally {
      setCategoryTreeLoading(false);
    }
  };

  const loadTags = async () => {
    try {
      setTagsLoading(true);
      const response = await tagsApi.getTags({ limit: 100, sort_by: 'articles_count', sort_order: 'desc' });
      if (response.success && response.data) {
        const data = response.data as PaginatedResponse<Tag>;
        setTags(data.tags || data.items || []);
      }
    } catch (err) {
      console.error('Failed to load tags:', err);
    } finally {
      setTagsLoading(false);
    }
  };

  const loadArticles = async () => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: String(PAGE_SIZE),
      });

      if (filter !== 'all') {
        queryParams.set('is_published', filter === 'published' ? 'true' : 'false');
      }

      if (searchTerm.trim()) {
        queryParams.set('search', searchTerm.trim());
      }

      if (selectedCategoryId) {
        queryParams.set('category_id', selectedCategoryId.toString());
      }

      if (selectedTagIds.length > 0) {
        queryParams.set('tag_ids', selectedTagIds.join(','));
      }

      const response = await apiClient.get(`/api/articles?${queryParams}`);

      if (!response.success) {
        throw new Error('Failed to fetch articles');
      }

      setArticles(response.data.articles || []);
      setTotalPages(response.data.pagination?.total_pages || 1);
      setTotal(Number(response.data.pagination?.total) || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载文章时出错');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setSearchTerm(searchInput.trim());
    setCurrentPage(1);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearchTerm('');
    setCurrentPage(1);
  };

  const handleTagToggle = (tagId: number) => {
    setSelectedTagIds(prev => {
      const newSelection = prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId];
      setCurrentPage(1); // Reset to first page when filtering
      return newSelection;
    });
  };

  const handleClearAllTags = () => {
    setSelectedTagIds([]);
    setCurrentPage(1);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这篇文章吗？此操作不可恢复。')) {
      return;
    }

    try {
      await apiClient.delete(`/api/articles/${id}`);
      setArticles(articles.filter(article => article.id !== id));
    } catch (err: any) {
      alert(err.message || '删除时出错');
    }
  };

  const handleTogglePublish = async (article: Article) => {
    try {
      // ⚠️ 只发要改的字段：列表接口不返回 content，全展开会把 content="" 推回后端，导致正文被清空。
      await apiClient.put(`/api/articles/${article.id}`, {
        is_published: !article.is_published,
      });

      setArticles(articles.map(a =>
        a.id === article.id
          ? { ...a, is_published: !a.is_published }
          : a
      ));
    } catch (err: any) {
      alert(err.message || '更新时出错');
    }
  };

  const handleCategoryChange = async (article: Article, categoryId: number | null) => {
    try {
      await apiClient.put(`/api/articles/${article.id}`, {
        category_id: categoryId,
      });

      const newCategory = categoryId ? categories.find(c => c.id === categoryId) : null;
      setArticles(articles.map(a =>
        a.id === article.id
          ? { ...a, category: newCategory || undefined, category_id: categoryId || undefined }
          : a
      ));
    } catch (err: any) {
      alert(err.message || '更新分类时出错');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 处理添加文章到分类
  const handleAddArticlesToCategory = (categoryId: number) => {
    setSelectedCategoryForAdd(categoryId);
    setShowArticleSelector(true);
  };

  const handleArticlesSelected = async (articleIds: number[]) => {
    if (selectedCategoryForAdd === null) return;

    try {
      await categoriesApi.addArticlesToCategory(selectedCategoryForAdd, articleIds);
      // 刷新分类树
      loadCategoryTree();
    } catch (error) {
      console.error('Failed to add articles:', error);
      alert('添加文章失败');
    }
  };

  // 处理添加子分类
  const handleAddSubCategory = (parentId: number, parentName: string) => {
    setSubCategoryParentId(parentId);
    setSubCategoryParentName(parentName);
    setSubCategoryName('');
    setSubCategorySlug('');
    setShowSubCategoryModal(true);
  };

  const handleCreateSubCategory = async () => {
    if (!subCategoryName.trim() || !subCategorySlug.trim() || subCategoryParentId === null) return;

    setSubCategoryCreating(true);
    try {
      await categoriesApi.createCategory({
        name: subCategoryName.trim(),
        slug: subCategorySlug.trim(),
        parent_id: subCategoryParentId,
      });
      setShowSubCategoryModal(false);
      setSubCategoryName('');
      setSubCategorySlug('');
      // 刷新分类树和分类列表
      loadCategoryTree();
      loadCategories();
    } catch (error) {
      console.error('Failed to create sub-category:', error);
      alert('创建子分类失败');
    } finally {
      setSubCategoryCreating(false);
    }
  };

  // 处理加载状态
  if (loading && viewMode === 'articles') {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            文章管理
          </h1>
          <Link
            to="/admin/articles/new"
            className="btn btn-primary flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新建文章
          </Link>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          管理和编辑您的博客文章
        </p>
      </div>

      {/* Tab 切换 */}
      <div className="mb-6">
        <div className="flex rounded-lg overflow-hidden shadow-soft w-fit">
          <button
            onClick={() => setViewMode('articles')}
            className={`px-4 py-2 text-sm font-medium border-r border-gray-200 dark:border-gray-600 transition-all duration-200 ${viewMode === 'articles'
              ? 'bg-go-100 dark:bg-go-900/30 text-go-700 dark:text-go-300'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-go-50 dark:hover:bg-go-900/10'
              }`}
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              文章维度
            </span>
          </button>
          <button
            onClick={() => setViewMode('categories')}
            className={`px-4 py-2 text-sm font-medium transition-all duration-200 ${viewMode === 'categories'
              ? 'bg-go-100 dark:bg-go-900/30 text-go-700 dark:text-go-300'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-go-50 dark:hover:bg-go-900/10'
              }`}
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
              </svg>
              分类维度
            </span>
          </button>
        </div>
      </div>

      {/* 文章维度视图 */}
      {viewMode === 'articles' && (
        <div>
          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
              <div className="flex">
                <svg className="w-5 h-5 text-red-400 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            </div>
          )}

          {/* Search and Filters */}
          <div className="mb-6 space-y-4">
            {/* Search Box */}
            <div className="card p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="搜索文章标题... (按回车搜索)"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSearch();
                        }
                      }}
                      className="block w-full pl-10 pr-12 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-go-500 focus:border-transparent transition-all duration-200"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center">
                      {/* Search button */}
                      <button
                        onClick={handleSearch}
                        className="mr-1 p-1.5 text-gray-400 hover:text-go-600 dark:hover:text-go-400 transition-colors"
                        title="搜索"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </button>
                      {/* Clear button */}
                      {(searchInput || searchTerm) && (
                        <button
                          onClick={handleClearSearch}
                          className="mr-3 p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                          title="清除搜索"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-48">
                    <select
                      value={selectedCategoryId || ''}
                      onChange={(e) => {
                        setSelectedCategoryId(e.target.value ? parseInt(e.target.value) : null);
                        setCurrentPage(1); // Reset to first page when filtering
                      }}
                      className="block w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-go-500 focus:border-transparent transition-all duration-200"
                      disabled={categoriesLoading}
                    >
                      <option value="">全部分类</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name} ({category.articles_count})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="relative" ref={tagsDropdownRef}>
                      <div
                        className="flex flex-wrap gap-2 p-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 min-h-[42px] focus-within:ring-2 focus-within:ring-go-500 focus-within:border-transparent transition-all duration-200 cursor-pointer"
                        onClick={() => setShowTagsDropdown(!showTagsDropdown)}
                      >
                        {selectedTagIds.length > 0 ? (
                          <>
                            {selectedTagIds.map(tagId => {
                              const tag = tags.find(t => t.id === tagId);
                              return tag ? (
                                <span
                                  key={tag.id}
                                  className="inline-flex items-center px-2 py-1 text-xs bg-go-100 dark:bg-go-900/30 text-go-700 dark:text-go-300 rounded-md"
                                >
                                  {tag.name}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleTagToggle(tag.id);
                                    }}
                                    className="ml-1 text-go-500 hover:text-go-700 dark:hover:text-go-300"
                                  >
                                    ×
                                  </button>
                                </span>
                              ) : null;
                            })}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleClearAllTags();
                              }}
                              className="text-xs text-gray-500 hover:text-red-600 dark:hover:text-red-400 px-2 py-1"
                            >
                              清空
                            </button>
                          </>
                        ) : (
                          <span className="text-sm text-gray-500 dark:text-gray-400">选择标签...</span>
                        )}
                        <div className="ml-auto flex items-center">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                      {/* Tags dropdown */}
                      {showTagsDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl shadow-lg z-10 max-h-48 overflow-y-auto">
                          {tagsLoading ? (
                            <div className="p-3 text-center text-gray-500">加载中...</div>
                          ) : tags.length > 0 ? (
                            tags.map(tag => (
                              <button
                                key={tag.id}
                                onClick={() => {
                                  handleTagToggle(tag.id);
                                  if (!selectedTagIds.includes(tag.id)) {
                                    // Only close dropdown when deselecting, keep open when selecting multiple
                                  }
                                }}
                                className={`w-full text-left px-3 py-2 text-sm transition-colors ${selectedTagIds.includes(tag.id)
                                  ? 'bg-go-100 dark:bg-go-900/30 text-go-700 dark:text-go-300'
                                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                                  }`}
                              >
                                <span className="flex items-center justify-between">
                                  <span className="flex items-center">
                                    {selectedTagIds.includes(tag.id) && (
                                      <svg className="w-4 h-4 mr-2 text-go-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                    )}
                                    {tag.name}
                                  </span>
                                  <span className="text-xs text-gray-500">({tag.articles_count})</span>
                                </span>
                              </button>
                            ))
                          ) : (
                            <div className="p-3 text-center text-gray-500">暂无标签</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Status Filters */}
            <div className="card p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">状态筛选:</span>
                  <div className="flex rounded-lg overflow-hidden shadow-soft">
                    {[
                      { key: 'all', label: '全部' },
                      { key: 'published', label: '已发布' },
                      { key: 'draft', label: '草稿' },
                    ].map((option) => (
                      <button
                        key={option.key}
                        onClick={() => {
                          setFilter(option.key as any);
                          setCurrentPage(1); // Reset to first page when filtering
                        }}
                        className={`px-4 py-2 text-sm font-medium border-r border-gray-200 dark:border-gray-600 last:border-r-0 transition-all duration-200 ${filter === option.key
                          ? 'bg-go-100 dark:bg-go-900/30 text-go-700 dark:text-go-300'
                          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-go-50 dark:hover:bg-go-900/10'
                          }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {/* Active filters indicator */}
                  {(searchTerm || selectedCategoryId || selectedTagIds.length > 0) && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 flex-wrap">
                      <span>筛选已激活:</span>
                      {searchTerm && (
                        <span className="inline-flex items-center px-2 py-1 text-xs bg-go-100 dark:bg-go-900/30 text-go-700 dark:text-go-300 rounded-md">
                          搜索: {searchTerm}
                          <button
                            onClick={() => {
                              setSearchTerm('');
                              setSearchInput('');
                              setCurrentPage(1);
                            }}
                            className="ml-1 text-go-500 hover:text-go-700 dark:hover:text-go-300"
                          >
                            ×
                          </button>
                        </span>
                      )}
                      {selectedCategoryId && (
                        <span className="inline-flex items-center px-2 py-1 text-xs bg-go-100 dark:bg-go-900/30 text-go-700 dark:text-go-300 rounded-md">
                          分类: {categories.find(c => c.id === selectedCategoryId)?.name || '未知'}
                          <button
                            onClick={() => {
                              setSelectedCategoryId(null);
                              setCurrentPage(1);
                            }}
                            className="ml-1 text-go-500 hover:text-go-700 dark:hover:text-go-300"
                          >
                            ×
                          </button>
                        </span>
                      )}
                      {selectedTagIds.length > 0 && (
                        <span className="inline-flex items-center px-2 py-1 text-xs bg-go-100 dark:bg-go-900/30 text-go-700 dark:text-go-300 rounded-md">
                          标签: {selectedTagIds.length} 个
                          <button
                            onClick={handleClearAllTags}
                            className="ml-1 text-go-500 hover:text-go-700 dark:hover:text-go-300"
                          >
                            ×
                          </button>
                        </span>
                      )}
                    </div>
                  )}
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    共 {total} 篇文章
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Articles Table */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      文章
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      状态
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      分类
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      统计
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      创建时间
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {articles.map((article) => (
                    <tr key={article.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          {article.cover_image && (
                            <div className="flex-shrink-0 w-12 h-12 mr-4">
                              <img
                                src={getThumbnailUrl(article.cover_image) || article.cover_image}
                                alt=""
                                loading="lazy"
                                decoding="async"
                                width={48}
                                height={48}
                                className="w-12 h-12 rounded-xl object-cover shadow-soft"
                              />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                              {article.title}
                            </div>
                            {article.excerpt && (
                              <div className="text-sm text-gray-500 dark:text-gray-400 truncate mt-1">
                                {article.excerpt}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full ${article.is_published
                          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300'
                          : 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300'
                          }`}>
                          <svg className={`w-2 h-2 mr-1.5 ${article.is_published ? 'text-emerald-500' : 'text-amber-500'
                            }`} fill="currentColor" viewBox="0 0 8 8">
                            <circle cx="4" cy="4" r="3" />
                          </svg>
                          {article.is_published ? '已发布' : '草稿'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={article.category?.id || ''}
                          onChange={(e) => handleCategoryChange(article, e.target.value ? parseInt(e.target.value) : null)}
                          className="text-xs font-medium bg-go-50 dark:bg-go-900/20 text-go-700 dark:text-go-300 border border-go-200 dark:border-go-700 rounded-lg px-2 py-1 focus:ring-2 focus:ring-go-500 focus:border-go-500 cursor-pointer hover:bg-go-100 dark:hover:bg-go-900/30 transition-colors"
                        >
                          <option value="">未分类</option>
                          {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                            <svg className="w-4 h-4 mr-1.5 text-go-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            <span className="font-medium">{article.views_count}</span>
                          </div>
                          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                            <svg className="w-4 h-4 mr-1.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                            <span className="font-medium">{article.likes_count}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(article.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <Link
                            to={`/admin/articles/${article.id}/edit`}
                            className="p-2 text-go-600 dark:text-go-400 hover:text-go-700 dark:hover:text-go-300 hover:bg-go-50 dark:hover:bg-go-900/20 rounded-lg transition-all duration-200"
                            title="编辑文章"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </Link>
                          <button
                            onClick={() => handleTogglePublish(article)}
                            className={`p-2 rounded-lg transition-all duration-200 ${article.is_published
                              ? 'text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                              : 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                              }`}
                            title={article.is_published ? '取消发布' : '发布文章'}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              {article.is_published ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                              ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              )}
                            </svg>
                          </button>
                          <Link
                            to={`/article/${article.slug || article.id}`}
                            target="_blank"
                            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-all duration-200"
                            title="查看文章"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </Link>
                          <button
                            onClick={() => handleDelete(article.id)}
                            className="p-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200"
                            title="删除文章"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {articles.length === 0 && !loading && (
              <div className="text-center py-16">
                <div className="w-20 h-20 mx-auto mb-6 bg-go-100 dark:bg-go-900/30 rounded-2xl flex items-center justify-center">
                  <svg className="w-10 h-10 text-go-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  暂无文章
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-sm mx-auto">
                  开始创建您的第一篇文章，分享您的思考和经验
                </p>
                <Link
                  to="/admin/articles/new"
                  className="btn btn-primary inline-flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  新建文章
                </Link>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex justify-center">
              <Pagination
                current_page={currentPage}
                total_pages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      )}

      {/* 分类维度视图 */}
      {viewMode === 'categories' && (
        <div className="card p-6">
          {categoryTreeLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <CategoryTreeView
              categories={categoryTree}
              onRefresh={loadCategoryTree}
              onAddArticles={handleAddArticlesToCategory}
              onAddSubCategory={handleAddSubCategory}
            />
          )}
        </div>
      )}

      {/* 文章选择器模态框 */}
      <ArticleSelectorModal
        isOpen={showArticleSelector}
        onClose={() => {
          setShowArticleSelector(false);
          setSelectedCategoryForAdd(null);
        }}
        onSelect={handleArticlesSelected}
        excludeArticleIds={
          selectedCategoryForAdd !== null
            ? categoryTree
              .flatMap((c: CategoryTreeNode) => c.articles || [])
              .map((a) => a.id)
            : []
        }
        categoryName={
          selectedCategoryForAdd !== null
            ? categories.find((c) => c.id === selectedCategoryForAdd)?.name
            : undefined
        }
      />

      {/* 子分类创建模态框 */}
      {showSubCategoryModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/50 transition-opacity"
              onClick={() => setShowSubCategoryModal(false)}
            />
            <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                创建子分类
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                将在「{subCategoryParentName}」下创建子分类
              </p>
              <input
                type="text"
                placeholder="子分类名称"
                value={subCategoryName}
                onChange={(e) => setSubCategoryName(e.target.value)}
                className="block w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-go-500 focus:border-transparent mb-3"
                autoFocus
              />
              <input
                type="text"
                placeholder="分类路径 (URL Slug)，如: my-category"
                value={subCategorySlug}
                onChange={(e) => setSubCategorySlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCreateSubCategory();
                  }
                }}
                className="block w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-go-500 focus:border-transparent mb-1"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                只能包含小写字母、数字和连字符 (-)
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowSubCategoryModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleCreateSubCategory}
                  disabled={!subCategoryName.trim() || !subCategorySlug.trim() || subCategoryCreating}
                  className="px-4 py-2 text-sm font-medium text-white bg-go-600 hover:bg-go-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  {subCategoryCreating ? '创建中...' : '创建'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}