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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面头部 */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            所有系列
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            探索我的技术系列文章，按主题组织的深入内容。
          </p>
        </div>

        {/* 系列网格 */}
        {data && data.items.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {data.items.map((series: Series) => (
                <SeriesCard key={series.id} series={series} />
              ))}
            </div>

            {/* 分页 */}
            {data.totalPages > 1 && (
              <div className="mt-12">
                <Pagination
                  current_page={currentPage}
                  total_pages={data.totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <div className="w-24 h-24 mx-auto mb-6 text-gray-400 dark:text-gray-500">
              <svg fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm1 1v10h12V5H4z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              暂无系列
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              还没有创建任何文章系列
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

interface SeriesCardProps {
  series: Series;
}

function SeriesCard({ series }: SeriesCardProps) {
  return (
    <Link
      to={`/series/${series.slug}`}
      className="group block bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600"
    >
      <div className="p-6">
        {/* 系列标题 */}
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
          {series.name}
        </h3>

        {/* 系列描述 */}
        {series.description && (
          <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
            {series.description}
          </p>
        )}

        {/* 文章统计 */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center text-gray-500 dark:text-gray-400">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
            </svg>
            {series.articles_count || 0} 篇文章
          </div>

          <div className="flex items-center text-gray-500 dark:text-gray-400">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
            </svg>
            {formatDate(series.created_at)}
          </div>
        </div>

        {/* 右箭头指示器 */}
        <div className="mt-4 flex justify-end">
          <svg 
            className="w-5 h-5 text-primary-600 dark:text-primary-400 transform group-hover:translate-x-1 transition-transform" 
            fill="currentColor" 
            viewBox="0 0 20 20"
          >
            <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>
      </div>
    </Link>
  );
}