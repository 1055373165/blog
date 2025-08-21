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
            <span className="text-gray-900 dark:text-white">系列</span>
          </nav>

          {/* Page Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex-1">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-go-100 dark:bg-go-900/30 rounded-xl flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-go-600 dark:text-go-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                  </svg>
                </div>
                <div>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-go-100 dark:bg-go-900/30 text-go-700 dark:text-go-300 mb-2">
                    系列中心
                  </span>
                </div>
              </div>
              
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                文章系列
              </h1>
              
              <p className="text-xl text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                探索精心组织的技术系列文章，深入学习专业主题的完整知识体系
              </p>
              
              <div className="flex items-center text-gray-500 dark:text-gray-400">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                </svg>
                <span className="text-lg font-medium">{data?.items.length || 0}</span>
                <span className="ml-1">个系列</span>
              </div>
            </div>

            {/* Large Series Icon */}
            <div className="hidden lg:block">
              <div className="w-24 h-24 bg-gradient-to-br from-go-100 to-go-200 dark:from-go-900/30 dark:to-go-800/30 rounded-2xl flex items-center justify-center shadow-soft">
                <svg className="w-12 h-12 text-go-600 dark:text-go-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Series Grid */}
        {data && data.items.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
              {data.items.map((series: Series) => (
                <SeriesCard key={series.id} series={series} />
              ))}
            </div>

            {/* Pagination */}
            {data.totalPages > 1 && (
              <div className="flex justify-center">
                <Pagination
                  current_page={currentPage}
                  total_pages={data.totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </>
        ) : (
          <div className="card p-12 text-center">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              暂无系列
            </h3>
            <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
              还没有创建任何文章系列。系列文章可以帮助读者系统性地学习特定主题，敬请期待。
            </p>
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
      className="group block relative"
    >
      <div className="card p-6 h-full overflow-hidden
                      hover:shadow-2xl hover:shadow-go-500/10
                      hover:border-go-300/50 dark:hover:border-go-600/50
                      transition-all duration-500 hover:scale-[1.02] hover:-translate-y-2
                      border-2 border-transparent
                      bg-gradient-to-br from-white via-white to-go-50/20
                      dark:from-gray-800 dark:via-gray-800 dark:to-go-900/10
                      relative">
        
        {/* 背景装饰效果 */}
        <div className="absolute inset-0 bg-gradient-to-br from-go-100/20 via-transparent to-blue-100/20 dark:from-go-900/20 dark:to-blue-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-lg" />
        
        {/* 内容区域 */}
        <div className="relative z-10 h-full flex flex-col">
        {/* Series Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="w-14 h-14 bg-gradient-to-br from-go-100 to-go-200 dark:from-go-900/40 dark:to-go-800/30 rounded-2xl flex items-center justify-center transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-sm group-hover:shadow-md">
            <svg className="w-7 h-7 text-go-600 dark:text-go-400 transform group-hover:scale-105 transition-transform duration-300" fill="currentColor" viewBox="0 0 20 20">
              <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
            </svg>
          </div>
          
          <div className="flex flex-col items-end space-y-2">
            <span className="px-3 py-1.5 bg-gradient-to-r from-go-100 to-go-50 dark:from-go-900/40 dark:to-go-800/20 text-go-700 dark:text-go-300 text-xs font-semibold rounded-full border border-go-200/50 dark:border-go-700/50 group-hover:border-go-300 dark:group-hover:border-go-600 transition-all duration-300">
              📚 系列
            </span>
            <div className="text-right">
              <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                {series.articles_count || 0} 篇文章
              </div>
            </div>
          </div>
        </div>

        {/* Series Title */}
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 group-hover:text-go-600 dark:group-hover:text-go-400 transition-all duration-300 line-clamp-2 group-hover:translate-x-1">
          {series.name}
        </h3>

        {/* Series Description */}
        {series.description && (
          <div className="mb-6 flex-grow">
            <p className="text-gray-600 dark:text-gray-400 line-clamp-3 leading-relaxed group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors duration-300">
              {series.description}
            </p>
            {/* 渐变遮罩效果 */}
            <div className="absolute bottom-0 right-0 w-6 h-6 bg-gradient-to-tl from-white dark:from-gray-800 via-white/90 dark:via-gray-800/90 to-transparent group-hover:from-gray-50 dark:group-hover:from-gray-750" />
          </div>
        )}

        {/* Series Stats */}
        <div className="flex items-center justify-between text-sm mb-6 py-3 border-t border-gray-100 dark:border-gray-700 group-hover:border-gray-200 dark:group-hover:border-gray-600 transition-colors duration-300">
          <div className="flex items-center space-x-4">
            <div className="flex items-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
              </svg>
              <span className="font-semibold text-go-600 dark:text-go-400">{series.articles_count || 0}</span>
              <span className="ml-1 text-xs">篇</span>
            </div>
            
            <div className="flex items-center text-gray-500 dark:text-gray-400">
              <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
              <span className="text-xs">{formatDate(series.created_at)}</span>
            </div>
          </div>
          
          {/* 进度指示器 */}
          <div className="flex items-center space-x-1">
            {[...Array(Math.min(5, series.articles_count || 1))].map((_, i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-go-300 dark:bg-go-600 group-hover:bg-go-500 dark:group-hover:bg-go-400 transition-colors duration-300" style={{animationDelay: `${i * 100}ms`}} />
            ))}
          </div>
        </div>

        {/* Action Indicator */}
        <div className="flex items-center justify-between pt-4 mt-auto border-t border-gray-200 dark:border-gray-700 group-hover:border-go-300/50 dark:group-hover:border-go-600/50 transition-colors duration-300">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-semibold text-go-600 dark:text-go-400 group-hover:text-go-700 dark:group-hover:text-go-300 transition-colors duration-300">
              探索系列
            </span>
            <div className="flex items-center space-x-1">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="w-1 h-1 rounded-full bg-go-400 dark:bg-go-500 opacity-60 group-hover:opacity-100 transition-opacity duration-300" style={{animationDelay: `${i * 200}ms`}} />
              ))}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-go-100 dark:bg-go-900/30 rounded-full flex items-center justify-center group-hover:bg-go-200 dark:group-hover:bg-go-800/50 group-hover:scale-110 transition-all duration-300">
              <svg 
                className="w-4 h-4 text-go-600 dark:text-go-400 transform group-hover:translate-x-0.5 transition-transform duration-300" 
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
        
        </div> {/* Close content area */}
        
        {/* Hover overlay effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-go-500/5 via-transparent to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-lg pointer-events-none" />
        
      </div>
    </Link>
  );
}