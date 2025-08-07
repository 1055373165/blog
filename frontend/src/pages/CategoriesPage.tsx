import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { categoriesApi } from '../api';
import { Category } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const response = await categoriesApi.getCategories();
        setCategories(response.data.categories || []);
      } catch (err) {
        setError('获取分类失败');
        console.error('Failed to fetch categories:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  // 分离父分类和子分类
  const parentCategories = categories.filter(cat => !(cat as any).parent_id);
  const getSubCategories = (parentId: number) => 
    categories.filter(cat => (cat as any).parent_id === parentId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 页面标题 */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          文章分类
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          按主题分类浏览所有文章内容
        </p>
      </div>

      {/* 分类网格 */}
      <div className="grid gap-8">
        {parentCategories.map((category) => {
          const subCategories = getSubCategories(category.id);
          
          return (
            <div key={category.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              {/* 父分类 */}
              <div className="mb-6">
                <Link
                  to={`/category/${category.slug}`}
                  className="group flex items-start space-x-4"
                >
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center group-hover:bg-primary-200 dark:group-hover:bg-primary-900/50 transition-colors">
                      <svg className="w-6 h-6 text-primary-600 dark:text-primary-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                      {category.name}
                    </h2>
                    <p className="mt-1 text-gray-600 dark:text-gray-400">
                      {category.description}
                    </p>
                    <div className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-500">
                      <span>{(category as any).articles_count || 0} 篇文章</span>
                    </div>
                  </div>
                </Link>
              </div>

              {/* 子分类 */}
              {subCategories.length > 0 && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
                    子分类
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {subCategories.map((subCategory) => (
                      <Link
                        key={subCategory.id}
                        to={`/category/${subCategory.slug}`}
                        className="group flex items-center space-x-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all"
                      >
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-md flex items-center justify-center group-hover:bg-primary-100 dark:group-hover:bg-primary-900/30 transition-colors">
                            <svg className="w-4 h-4 text-gray-600 dark:text-gray-400 group-hover:text-primary-600 dark:group-hover:text-primary-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                            </svg>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                            {subCategory.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500">
                            {(subCategory as any).articles_count || 0} 篇文章
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 空状态 */}
      {parentCategories.length === 0 && (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 48 48">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M34 40H14a4 4 0 01-4-4V12a4 4 0 014-4h14l8 8v20a4 4 0 01-4 4z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            暂无分类
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            还没有创建任何分类，请先添加一些分类。
          </p>
        </div>
      )}
    </div>
  );
}