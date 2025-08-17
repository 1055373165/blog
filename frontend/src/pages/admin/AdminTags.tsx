import { useState, useEffect } from 'react';
import { Tag } from '../../types';
import { tagsApi } from '../../api/tags';
import LoadingSpinner from '../../components/LoadingSpinner';

interface TagFormData {
  name: string;
  slug: string;
  color: string;
}

interface EditingTag extends Tag {
  isEditing: boolean;
}

export default function AdminTags() {
  const [tags, setTags] = useState<EditingTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState<TagFormData>({
    name: '',
    slug: '',
    color: '#3b82f6',
  });
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'articles_count' | 'created_at'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  useEffect(() => {
    loadTags();
  }, [searchTerm, sortBy, sortOrder]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const loadTags = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await tagsApi.getTags({
        search: searchTerm || undefined,
        sortBy,
        sortOrder,
        limit: 100,
      });
      
      const tagsWithEditing = (response.data.tags || response.data).map((tag: Tag) => ({
        ...tag,
        isEditing: false,
      }));
      setTags(tagsWithEditing);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载标签时出错');
      // Use mock data as fallback
      setTags([
        {
          id: '1',
          name: 'React',
          slug: 'react',
          color: '#61DAFB',
          articles_count: 3,
          created_at: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          isEditing: false,
        },
        {
          id: '2',
          name: 'JavaScript',
          slug: 'javascript',
          color: '#F7DF1E',
          articles_count: 4,
          created_at: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          isEditing: false,
        },
        {
          id: '3',
          name: 'Go',
          slug: 'go',
          color: '#00ADD8',
          articles_count: 2,
          created_at: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          isEditing: false,
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleCreateTag = async () => {
    if (!formData.name.trim()) {
      setError('请输入标签名称');
      return;
    }

    try {
      setError(null);
      const slug = formData.slug || generateSlug(formData.name);
      
      await tagsApi.createTag({
        name: formData.name,
        slug,
        color: formData.color,
      });
      
      setSuccess('标签创建成功');
      setShowCreateForm(false);
      setFormData({ name: '', slug: '', color: '#3b82f6' });
      loadTags();
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建标签失败');
    }
  };

  const handleUpdateTag = async (tagId: string) => {
    const tag = tags.find(t => t.id === tagId);
    if (!tag) return;

    try {
      setError(null);
      
      await tagsApi.updateTag(tagId, {
        name: tag.name,
        slug: tag.slug,
        color: tag.color,
      });
      
      setSuccess('标签更新成功');
      setEditingTagId(null);
      setTags(tags.map(t => t.id === tagId ? { ...t, isEditing: false } : t));
      loadTags();
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新标签失败');
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    if (!confirm('确定要删除这个标签吗？此操作无法撤销。')) return;

    try {
      setError(null);
      await tagsApi.deleteTag(tagId);
      setSuccess('标签删除成功');
      loadTags();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除标签失败');
    }
  };

  const startEditing = (tagId: string) => {
    setEditingTagId(tagId);
    setTags(tags.map(tag => 
      tag.id === tagId ? { ...tag, isEditing: true } : { ...tag, isEditing: false }
    ));
  };

  const cancelEditing = () => {
    setEditingTagId(null);
    setTags(tags.map(tag => ({ ...tag, isEditing: false })));
    loadTags(); // Reload to reset any changes
  };

  const handleTagFieldChange = (tagId: string, field: keyof Tag, value: string) => {
    setTags(tags.map(tag => 
      tag.id === tagId ? { ...tag, [field]: value } : tag
    ));
  };

  const handleBulkDelete = async () => {
    if (selectedTags.length === 0) return;
    if (!confirm(`确定要删除选中的 ${selectedTags.length} 个标签吗？此操作无法撤销。`)) return;

    try {
      setError(null);
      await tagsApi.deleteTags(selectedTags);
      setSuccess(`成功删除 ${selectedTags.length} 个标签`);
      setSelectedTags([]);
      loadTags();
    } catch (err) {
      setError(err instanceof Error ? err.message : '批量删除失败');
    }
  };

  const toggleTagSelection = (tagId: string) => {
    setSelectedTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const selectAllTags = () => {
    if (selectedTags.length === tags.length) {
      setSelectedTags([]);
    } else {
      setSelectedTags(tags.map(tag => tag.id));
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
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          标签管理
        </h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">
          管理和编辑您的博客标签，为文章添加标识
        </p>
      </div>

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

      {success && (
        <div className="mb-6 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-emerald-500 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-emerald-800 dark:text-emerald-200">{success}</p>
          </div>
        </div>
      )}

      {/* Search and Controls */}
      <div className="mb-6 card p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="搜索标签名称..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="input min-w-[140px]"
            >
              <option value="name">按名称排序</option>
              <option value="articles_count">按文章数排序</option>
              <option value="created_at">按创建时间排序</option>
            </select>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="input min-w-[80px]"
            >
              <option value="asc">升序</option>
              <option value="desc">降序</option>
            </select>
          </div>
        </div>
      </div>

      {/* Create Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="card max-w-md w-full mx-4 shadow-strong">
            <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">创建新标签</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">为您的文章添加一个新的标签</p>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  标签名称 *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    if (!formData.slug) {
                      setFormData({ ...formData, name: e.target.value, slug: generateSlug(e.target.value) });
                    }
                  }}
                  placeholder="输入标签名称"
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  URL路径
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="自动生成或手动输入"
                  className="input"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  用于 URL 中的标签标识符
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  标签颜色
                </label>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-12 h-12 border-2 border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer"
                    />
                  </div>
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    placeholder="#3b82f6"
                    className="input flex-1"
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  标签的显示颜色
                </p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setFormData({ name: '', slug: '', color: '#3b82f6' });
                }}
                className="btn btn-secondary"
              >
                取消
              </button>
              <button
                onClick={handleCreateTag}
                disabled={!formData.name.trim()}
                className="btn btn-primary"
              >
                创建标签
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tags List */}
      <div className="card overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  标签列表
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  共 {tags.length} 个标签
                  {selectedTags.length > 0 && (
                    <span className="ml-2">· 已选择 {selectedTags.length} 个</span>
                  )}
                </p>
              </div>
              {selectedTags.length > 0 && (
                <button
                  onClick={handleBulkDelete}
                  className="btn bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700 hover:bg-red-200 dark:hover:bg-red-900/50 flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  批量删除
                </button>
              )}
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="btn btn-primary"
            >
              添加标签
            </button>
          </div>
        </div>
        
        {tags.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 bg-go-100 dark:bg-go-900/30 rounded-2xl flex items-center justify-center">
              <svg className="w-10 h-10 text-go-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              暂无标签
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-sm mx-auto">
              开始创建您的第一个标签，为文章添加标识和分类
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="btn btn-primary"
            >
              添加标签
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-6 py-4 text-left">
                    <input
                      type="checkbox"
                      checked={selectedTags.length === tags.length && tags.length > 0}
                      onChange={selectAllTags}
                      className="rounded border-gray-300 dark:border-gray-600 text-go-600 focus:ring-go-500 dark:bg-gray-700"
                    />
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    标签名称
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    路径
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    颜色
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    文章数
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
                {tags.map((tag) => (
                  <tr key={tag.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedTags.includes(tag.id)}
                        onChange={() => toggleTagSelection(tag.id)}
                        className="rounded border-gray-300 dark:border-gray-600 text-go-600 focus:ring-go-500 dark:bg-gray-700"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {tag.isEditing ? (
                        <input
                          type="text"
                          value={tag.name}
                          onChange={(e) => handleTagFieldChange(tag.id, 'name', e.target.value)}
                          className="input text-sm"
                        />
                      ) : (
                        <div className="flex items-center">
                          <span
                            className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-semibold text-white shadow-soft"
                            style={{ backgroundColor: tag.color }}
                          >
                            {tag.name}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {tag.isEditing ? (
                        <input
                          type="text"
                          value={tag.slug}
                          onChange={(e) => handleTagFieldChange(tag.id, 'slug', e.target.value)}
                          className="input text-sm"
                        />
                      ) : (
                        <code className="text-sm text-go-600 dark:text-go-400 bg-go-50 dark:bg-go-900/20 px-2 py-1 rounded-lg">
                          /{tag.slug}
                        </code>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {tag.isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={tag.color}
                            onChange={(e) => handleTagFieldChange(tag.id, 'color', e.target.value)}
                            className="w-8 h-8 border-2 border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer"
                          />
                          <input
                            type="text"
                            value={tag.color}
                            onChange={(e) => handleTagFieldChange(tag.id, 'color', e.target.value)}
                            className="input text-sm w-24"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <div
                            className="w-6 h-6 rounded-lg border-2 border-gray-200 dark:border-gray-600 mr-3 shadow-soft"
                            style={{ backgroundColor: tag.color }}
                          ></div>
                          <code className="text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                            {tag.color}
                          </code>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold bg-go-100 dark:bg-go-900/30 text-go-700 dark:text-go-300 rounded-full">
                        {tag.articles_count} 篇
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(tag.created_at).toLocaleDateString('zh-CN')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {tag.isEditing ? (
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => handleUpdateTag(tag.id)}
                            className="p-2 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-all duration-200"
                            title="保存更改"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-all duration-200"
                            title="取消编辑"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => startEditing(tag.id)}
                            className="p-2 text-go-600 dark:text-go-400 hover:text-go-700 dark:hover:text-go-300 hover:bg-go-50 dark:hover:bg-go-900/20 rounded-lg transition-all duration-200"
                            title="编辑标签"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteTag(tag.id)}
                            className="p-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200"
                            title="删除标签"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}