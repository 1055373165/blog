import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { clsx } from 'clsx';
import { useAuth } from '../contexts/AuthContext';
import {
  DocumentTextIcon,
  VideoCameraIcon,
  EyeIcon,
  BookmarkIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

interface SubmissionForm {
  title: string;
  content: string;
  excerpt: string;
  type: 'article' | 'blog';
  category_id?: number;
  tag_ids: number[];
  status: 'draft' | 'pending';
}

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface Tag {
  id: number;
  name: string;
  slug: string;
  color?: string;
}

export default function SubmissionEditorPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);

  const [formData, setFormData] = useState<SubmissionForm>({
    title: '',
    content: '',
    excerpt: '',
    type: 'article',
    category_id: undefined,
    tag_ids: [],
    status: 'draft'
  });

  useEffect(() => {
    fetchCategories();
    fetchTags();
    if (isEditing) {
      fetchSubmission();
    }
  }, [id]);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      if (response.ok) {
        const responseData = await response.json();
        // Safely access the categories array, assuming it's nested (e.g., under a 'data' key)
        // and ensure we always set an array.
        const categoriesArray = Array.isArray(responseData) ? responseData : Array.isArray(responseData.data) ? responseData.data : [];
        setCategories(categoriesArray);
      }
    } catch (error) {
      console.error('获取分类失败:', error);
    }
  };

  const fetchTags = async () => {
    try {
      const response = await fetch('/api/tags?limit=100');
      if (response.ok) {
        const responseData = await response.json();
        const tagsArray = Array.isArray(responseData) ? responseData : Array.isArray(responseData.data?.tags) ? responseData.data.tags : [];
        setTags(tagsArray);
      }
    } catch (error) {
      console.error('获取标签失败:', error);
    }
  };

  const fetchSubmission = async () => {
    if (!id) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/submissions/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const submissionData = data.data || data;
        const submissionTags = submissionData.tags || [];

        setFormData({
          title: submissionData.title || '',
          content: submissionData.content || '',
          excerpt: submissionData.excerpt || '',
          type: submissionData.type || 'article',
          category_id: submissionData.category_id,
          tag_ids: submissionTags.map((tag: any) => tag.id),
          status: submissionData.status || 'draft'
        });

        setSelectedTags(submissionTags);
      }
    } catch (error) {
      console.error('获取投稿详情失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (status: 'draft' | 'pending') => {
    try {
      setSaving(true);

      const submitData = {
        ...formData,
        status
      };

      const url = isEditing ? `/api/submissions/${id}` : '/api/submissions';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(submitData)
      });

      if (response.ok) {
        navigate('/submissions');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || '提交失败');
      }
    } catch (error) {
      console.error('保存投稿失败:', error);
      alert(error instanceof Error ? error.message : '保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof SubmissionForm, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTagToggle = (tag: Tag) => {
    const isSelected = selectedTags.some(t => t.id === tag.id);

    if (isSelected) {
      const newSelectedTags = selectedTags.filter(t => t.id !== tag.id);
      setSelectedTags(newSelectedTags);
      setFormData(prev => ({
        ...prev,
        tag_ids: newSelectedTags.map(t => t.id)
      }));
    } else {
      const newSelectedTags = [...selectedTags, tag];
      setSelectedTags(newSelectedTags);
      setFormData(prev => ({
        ...prev,
        tag_ids: newSelectedTags.map(t => t.id)
      }));
    }
  };

  const handleRemoveTag = (tagToRemove: Tag) => {
    const newSelectedTags = selectedTags.filter(t => t.id !== tagToRemove.id);
    setSelectedTags(newSelectedTags);
    setFormData(prev => ({
      ...prev,
      tag_ids: newSelectedTags.map(t => t.id)
    }));
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            请先登录
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            您需要登录后才能创建投稿
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-20 pb-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 头部 */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-6">
            <button
              onClick={() => navigate('/submissions')}
              className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            >
              <ArrowLeftIcon className="w-6 h-6" />
            </button>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {isEditing ? '编辑投稿' : '新建投稿'}
            </h1>
          </div>
        </div>

        {/* 编辑器 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          <div className="p-6">
            {/* 类型选择 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                内容类型
              </label>
              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => handleInputChange('type', 'article')}
                  className={clsx(
                    'flex items-center px-4 py-3 rounded-lg border-2 transition-colors',
                    formData.type === 'article'
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                  )}
                >
                  <DocumentTextIcon className="w-5 h-5 mr-2" />
                  文章
                </button>
                <button
                  type="button"
                  onClick={() => handleInputChange('type', 'blog')}
                  className={clsx(
                    'flex items-center px-4 py-3 rounded-lg border-2 transition-colors',
                    formData.type === 'blog'
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                  )}
                >
                  <VideoCameraIcon className="w-5 h-5 mr-2" />
                  博客
                </button>
              </div>
            </div>

            {/* 标题 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                标题 *
              </label>
              <Input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="请输入标题"
                className="text-lg"
              />
            </div>

            {/* 摘要 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                摘要
              </label>
              <textarea
                value={formData.excerpt}
                onChange={(e) => handleInputChange('excerpt', e.target.value)}
                placeholder="请输入摘要..."
                rows={3}
                className={clsx(
                  'w-full px-3 py-2 border border-gray-300 dark:border-gray-600',
                  'rounded-lg shadow-sm placeholder-gray-400',
                  'bg-white dark:bg-gray-700 text-gray-900 dark:text-white',
                  'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent'
                )}
              />
            </div>

            {/* 分类 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                分类
              </label>
              <select
                value={formData.category_id || ''}
                onChange={(e) => handleInputChange('category_id', e.target.value ? Number(e.target.value) : undefined)}
                className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">请选择分类</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 标签 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                标签
              </label>

              {/* 已选择的标签 */}
              {selectedTags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {selectedTags.map(tag => (
                    <span
                      key={tag.id}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary-100 dark:bg-primary-900/20 text-primary-800 dark:text-primary-300"
                      style={tag.color ? { backgroundColor: tag.color + '20', color: tag.color } : {}}
                    >
                      {tag.name}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-2 text-current hover:text-red-600"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* 可选择的标签 */}
              <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 max-h-40 overflow-y-auto">
                {tags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {tags.map(tag => {
                      const isSelected = selectedTags.some(t => t.id === tag.id);
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => handleTagToggle(tag)}
                          className={clsx(
                            'px-3 py-1 rounded-full text-sm border transition-colors',
                            isSelected
                              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                          )}
                          style={tag.color && isSelected ? { backgroundColor: tag.color + '20', borderColor: tag.color, color: tag.color } : {}}
                        >
                          {tag.name}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    暂无可用标签，请联系管理员添加标签
                  </p>
                )}
              </div>
            </div>

            {/* 内容 */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                内容 *
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => handleInputChange('content', e.target.value)}
                placeholder="请输入内容..."
                rows={20}
                className={clsx(
                  'w-full px-3 py-2 border border-gray-300 dark:border-gray-600',
                  'rounded-lg shadow-sm placeholder-gray-400 font-mono text-sm',
                  'bg-white dark:bg-gray-700 text-gray-900 dark:text-white',
                  'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent'
                )}
              />
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                支持 Markdown 格式
              </p>
            </div>

            {/* 操作按钮 */}
            <div className="flex justify-center space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="secondary"
                onClick={() => handleSubmit('draft')}
                loading={isSaving}
                disabled={isSaving || !formData.title.trim()}
                size="lg"
              >
                <BookmarkIcon className="w-5 h-5 mr-2" />
                保存草稿
              </Button>
              <Button
                onClick={() => handleSubmit('pending')}
                loading={isSaving}
                disabled={isSaving || !formData.title.trim() || !formData.content.trim()}
                size="lg"
              >
                提交审核
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}