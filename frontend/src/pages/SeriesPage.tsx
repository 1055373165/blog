import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import seriesApi, { Series } from '../services/seriesApi';
import LoadingSpinner from '../components/LoadingSpinner';
import Pagination from '../components/Pagination';
import { formatDate } from '../utils';

export default function SeriesPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  const { data, isLoading, error } = useQuery({
    queryKey: ['series', currentPage],
    queryFn: () => seriesApi.getSeries(currentPage, pageSize),
  });

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            加载失败
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            无法加载系列列表，请稍后重试
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Compact Hero Section */}
      <div className="bg-gradient-to-r from-white via-gray-50/50 to-go-50/20 dark:from-gray-900 dark:via-gray-850 dark:to-go-900/10 border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumb Navigation */}
          <nav className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
              <Link to="/" className="hover:text-go-600 dark:hover:text-go-400 transition-colors font-medium">
                首页
              </Link>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-gray-900 dark:text-white font-medium">系列</span>
            </div>
            
            {/* Quick Actions */}
            <div className="flex items-center space-x-3">
              <Link
                to="/articles"
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                </svg>
                所有文章
              </Link>
              <Link
                to="/about"
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-go-600 dark:bg-go-500 rounded-lg hover:bg-go-700 dark:hover:bg-go-600 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                关于
              </Link>
            </div>
          </nav>

          {/* Compact Header */}
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gradient-to-br from-go-100 to-go-200 dark:from-go-900/40 dark:to-go-800/30 rounded-2xl flex items-center justify-center shadow-lg">
              <svg className="w-8 h-8 text-go-600 dark:text-go-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
              </svg>
            </div>
            
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  技术系列
                </h1>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-go-100 dark:bg-go-900/40 text-go-700 dark:text-go-300 border border-go-200 dark:border-go-700">
                  {data?.items.length || 0} 个系列
                </span>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-lg leading-relaxed">
                系统化学习路径，深入掌握技术主题
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Series Grid */}
        {data && data.items.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-12">
              {data.items.map((series: Series) => (
                <SeriesCard key={series.id} series={series} />
              ))}
            </div>

            {/* Pagination */}
            {data.totalPages > 1 && (
              <div className="flex justify-center pt-8 border-t border-gray-100 dark:border-gray-800">
                <Pagination
                  current_page={currentPage}
                  total_pages={data.totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              暂无系列
            </h3>
            <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-6">
              还没有创建任何文章系列。系列文章可以帮助读者系统性地学习特定主题，敬请期待。
            </p>
            <div className="flex justify-center">
              <Link
                to="/articles"
                className="inline-flex items-center px-6 py-3 text-sm font-medium text-white bg-go-600 dark:bg-go-500 rounded-lg hover:bg-go-700 dark:hover:bg-go-600 transition-colors duration-200"
              >
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                </svg>
                浏览所有文章
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

interface SeriesCardProps {
  series: Series;
}

function SeriesCard({ series }: SeriesCardProps) {
  return (
    <Link
      to={`/series/${series.slug}`}
      className="group block"
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 h-full
                      hover:shadow-xl hover:shadow-go-500/10 hover:border-go-300 dark:hover:border-go-600
                      transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1
                      relative overflow-hidden">
        
        {/* Subtle background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-go-50/30 via-transparent to-blue-50/20 dark:from-go-900/10 dark:to-blue-900/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Content */}
        <div className="relative z-10 h-full flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-go-100 to-go-200 dark:from-go-900/40 dark:to-go-800/30 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
              <svg className="w-6 h-6 text-go-600 dark:text-go-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
              </svg>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-1 bg-go-100 dark:bg-go-900/40 text-go-700 dark:text-go-300 text-xs font-medium rounded-full">
                📚 系列
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                {series.articles_count || 0} 篇
              </span>
            </div>
          </div>

          {/* Title */}
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 group-hover:text-go-600 dark:group-hover:text-go-400 transition-colors duration-300 line-clamp-2 leading-snug">
            {series.name}
          </h3>

          {/* Description */}
          {series.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-3 leading-relaxed flex-grow">
              {series.description}
            </p>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 mt-auto border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
              <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
              <span>{formatDate(series.created_at)}</span>
            </div>
            
            <div className="flex items-center text-go-600 dark:text-go-400 text-sm font-medium group-hover:text-go-700 dark:group-hover:text-go-300 transition-colors duration-300">
              <span className="mr-2">查看系列</span>
              <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform duration-300" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}