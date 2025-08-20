import React, { useState, useEffect } from 'react';
import { Category, CreateCategoryRequest, UpdateCategoryRequest } from '../../types';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateCategoryRequest | UpdateCategoryRequest) => Promise<void>;
  category?: Category | null;
  categories: Category[];
  mode: 'create' | 'edit';
}

export default function CategoryModal({
  isOpen,
  onClose,
  onSubmit,
  category,
  categories,
  mode
}: CategoryModalProps) {
  const [formData, setFormData] = useState<CreateCategoryRequest | UpdateCategoryRequest>({
    name: '',
    slug: '',
    description: '',
    parent_id: undefined
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens/closes or category changes
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && category) {
        setFormData({
          name: category.name,
          slug: category.slug,
          description: category.description || '',
          parent_id: category.parent_id || undefined
        });
      } else {
        setFormData({
          name: '',
          slug: '',
          description: '',
          parent_id: undefined
        });
      }
      setError(null);
    }
  }, [isOpen, mode, category]);

  // Generate slug from name
  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[\s\u4e00-\u9fff]+/g, '-') // Replace spaces and Chinese characters with dashes
      .replace(/[^\w\-]+/g, '') // Remove non-word chars except dashes
      .replace(/\-\-+/g, '-') // Replace multiple dashes with single dash
      .replace(/^-+/, '') // Trim dashes from start
      .replace(/-+$/, ''); // Trim dashes from end
  };

  const handleNameChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      name: value,
      // Auto-generate slug only for create mode or when slug is empty
      ...(mode === 'create' || !prev.slug ? { slug: generateSlug(value) } : {})
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Basic validation
    if (!formData.name?.trim()) {
      setError('分类名称不能为空');
      return;
    }

    // Prevent setting parent as itself
    if (mode === 'edit' && category && formData.parent_id === category.id) {
      setError('不能将分类设置为自己的父分类');
      return;
    }

    try {
      setLoading(true);
      await onSubmit(formData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败');
    } finally {
      setLoading(false);
    }
  };

  // Filter out current category and its descendants for parent selection
  const getAvailableParentCategories = (): Category[] => {
    if (mode === 'create') {
      return categories;
    }
    
    if (!category) return categories;
    
    // Helper function to get all descendant IDs
    const getDescendantIds = (cat: Category): number[] => {
      const ids = [cat.id];
      if (cat.children) {
        cat.children.forEach(child => {
          ids.push(...getDescendantIds(child));
        });
      }
      return ids;
    };

    const excludeIds = getDescendantIds(category);
    return categories.filter(cat => !excludeIds.includes(cat.id));
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  const availableParentCategories = getAvailableParentCategories();

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="category-modal-title"
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 
              id="category-modal-title"
              className="text-xl font-semibold text-gray-900 dark:text-white"
            >
              {mode === 'create' ? '添加分类' : '编辑分类'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              aria-label="关闭"
            >
              <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex">
                <svg className="w-5 h-5 text-red-400 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            </div>
          )}

          {/* Name Field */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              分类名称 *
            </label>
            <input
              type="text"
              id="name"
              value={formData.name || ''}
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-go-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="输入分类名称"
              required
            />
          </div>

          {/* Slug Field */}
          <div>
            <label htmlFor="slug" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              分类路径 (URL Slug)
            </label>
            <input
              type="text"
              id="slug"
              value={formData.slug || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-go-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="自动生成或手动输入"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              用于URL中的路径，如：/categories/{formData.slug || 'example'}
            </p>
          </div>

          {/* Parent Category Field */}
          <div>
            <label htmlFor="parent_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              父分类
            </label>
            <select
              id="parent_id"
              value={formData.parent_id || ''}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                parent_id: e.target.value ? parseInt(e.target.value) : undefined 
              }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-go-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">无父分类 (顶级分类)</option>
              {availableParentCategories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Description Field */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              描述
            </label>
            <textarea
              id="description"
              rows={3}
              value={formData.description || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-go-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
              placeholder="分类描述（可选）"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-go-500 hover:bg-go-600 disabled:bg-go-300 text-white font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {mode === 'create' ? '创建中...' : '更新中...'}
                </div>
              ) : (
                mode === 'create' ? '创建分类' : '更新分类'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}