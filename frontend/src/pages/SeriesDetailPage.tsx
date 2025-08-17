import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import seriesApi, { Article } from '../services/seriesApi';
import LoadingSpinner from '../components/LoadingSpinner';
import Pagination from '../components/Pagination';
import { formatDate } from '../utils';

export default function SeriesDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const { data, isLoading, error } = useQuery({
    queryKey: ['series-articles', slug, currentPage],
    queryFn: () => seriesApi.getArticlesBySeriesSlug(slug!, currentPage, pageSize),
    enabled: !!slug,
  });

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-go-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-go-900/20 flex items-center justify-center">
        <div className="max-w-md mx-auto px-4">
          <div className="card p-8 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
              </svg>
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              系列不存在
            </h2>
            
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              抱歉，您访问的系列不存在或已被删除
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/" className="btn btn-primary">
                返回首页
              </Link>
              <Link to="/series" className="btn btn-outline">
                系列列表
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { series } = data;

  return (
    <>
      {/* Hero Section with Gradient Background */}
      <div className="bg-gradient-to-br from-gray-50 via-white to-go-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-go-900/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Breadcrumb */}
          <nav className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 mb-8">
            <Link to="/" className="hover:text-go-600 dark:hover:text-go-400 transition-colors">
              首页
            </Link>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            <Link to="/series" className="hover:text-go-600 dark:hover:text-go-400 transition-colors">
              系列
            </Link>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            <span className="text-gray-900 dark:text-white">{series.name}</span>
          </nav>

          {/* Series Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex-1">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-go-100 dark:bg-go-900/30 rounded-xl flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-go-600 dark:text-go-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                  </svg>
                </div>
                <div>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-go-100 dark:bg-go-900/30 text-go-700 dark:text-go-300 mb-2">
                    系列
                  </span>
                </div>
              </div>
              
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                {series.name}
              </h1>
              
              {series.description && (
                <p className="text-xl text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                  {series.description}
                </p>
              )}
              
              <div className="flex items-center space-x-6 text-gray-500 dark:text-gray-400">
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                  </svg>
                  <span className="text-lg font-medium">{data.total}</span>
                  <span className="ml-1">篇文章</span>
                </div>
                
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                  </svg>
                  <span>创建于 {formatDate(series.created_at)}</span>
                </div>
              </div>
            </div>

            {/* Large Series Icon */}
            <div className="hidden lg:block">
              <div className="w-24 h-24 bg-gradient-to-br from-go-100 to-go-200 dark:from-go-900/30 dark:to-go-800/30 rounded-2xl flex items-center justify-center shadow-soft">
                <svg className="w-12 h-12 text-go-600 dark:text-go-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

        {/* Articles List */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 mb-8">
          <div className="card">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                系列文章
              </h2>
            </div>
          
            {data.items.length > 0 ? (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {data.items.map((article: Article, index: number) => (
                  <ArticleItem
                    key={article.id}
                    article={article}
                    index={((currentPage - 1) * pageSize) + index + 1}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  暂无文章
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  此系列还没有添加任何文章
                </p>
              </div>
            )}
        </div>

          {/* Pagination */}
          {data.totalPages > 1 && (
            <div className="px-6 pb-6">
              <Pagination
                current_page={currentPage}
                total_pages={data.totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
    </>
  );
}

interface ArticleItemProps {
  article: Article;
  index: number;
}

function ArticleItem({ article, index }: ArticleItemProps) {
  return (
    <Link
      to={`/article/${article.slug}`}
      className="block px-6 py-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-200 group"
    >
      <div className="flex items-start space-x-4">
        {/* Index Number */}
        <div className="flex-shrink-0 w-10 h-10 bg-go-100 dark:bg-go-900/30 rounded-xl flex items-center justify-center text-sm font-semibold text-go-700 dark:text-go-300 group-hover:bg-go-200 dark:group-hover:bg-go-900/50 transition-colors">
          {index}
        </div>
        
        {/* Article Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-go-600 dark:group-hover:text-go-400 transition-colors mb-2 leading-tight">
                {article.title}
              </h3>
              
              {article.excerpt && (
                <p className="text-gray-600 dark:text-gray-400 line-clamp-2 mb-4 leading-relaxed">
                  {article.excerpt}
                </p>
              )}
              
              <div className="flex items-center space-x-6 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                  </svg>
                  {formatDate(article.published_at)}
                </div>
                
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                  {(article.views_count ?? 0).toLocaleString()} 次阅读
                </div>
                
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                  </svg>
                  {(article.likes_count ?? 0).toLocaleString()} 点赞
                </div>
              </div>
            </div>
            
            {/* Arrow Icon */}
            <div className="flex-shrink-0 ml-4">
              <svg className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-go-500 transition-colors" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}