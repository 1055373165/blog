import { PaginationProps } from '../types';
import { cn } from '../utils';

// Extend props to accept both snake_case (preferred) and camelCase (backward compatibility)
type PaginationPropsCompat = PaginationProps & {
  currentPage?: number;
  totalPages?: number;
  showSizeChanger?: boolean;
  pageSize?: number;
};

export default function Pagination(props: PaginationPropsCompat) {
  // Normalize props to internal snake_case variables
  const current_page = props.current_page ?? props.currentPage ?? 1;
  const total_pages = props.total_pages ?? props.totalPages ?? 1;
  const onPageChange = props.onPageChange;
  const show_size_changer = props.show_size_changer ?? props.showSizeChanger ?? false;
  const page_size = props.page_size ?? props.pageSize ?? 10;
  const onPageSizeChange = props.onPageSizeChange;
  if (total_pages <= 1) return null;

  const getVisiblePages = () => {
    const visiblePages: (number | string)[] = [];
    const showEllipsis = total_pages > 7;

    if (!showEllipsis) {
      // 显示所有页面
      for (let i = 1; i <= total_pages; i++) {
        visiblePages.push(i);
      }
    } else {
      // 复杂分页逻辑
      if (current_page <= 4) {
        // 当前页在前面
        for (let i = 1; i <= 5; i++) {
          visiblePages.push(i);
        }
        visiblePages.push('ellipsis');
        visiblePages.push(total_pages);
      } else if (current_page >= total_pages - 3) {
        // 当前页在后面
        visiblePages.push(1);
        visiblePages.push('ellipsis');
        for (let i = total_pages - 4; i <= total_pages; i++) {
          visiblePages.push(i);
        }
      } else {
        // 当前页在中间
        visiblePages.push(1);
        visiblePages.push('ellipsis');
        for (let i = current_page - 1; i <= current_page + 1; i++) {
          visiblePages.push(i);
        }
        visiblePages.push('ellipsis');
        visiblePages.push(total_pages);
      }
    }

    return visiblePages;
  };

  const visiblePages = getVisiblePages();

  const buttonClass = (isActive: boolean, isDisabled: boolean = false) =>
    cn(
      'px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200',
      'border border-gray-200 dark:border-gray-700 backdrop-blur-sm',
      'hover:shadow-md hover:-translate-y-0.5',
      {
        'bg-gradient-to-r from-go-600 to-go-700 text-white border-go-600 shadow-md hover:from-go-700 hover:to-go-800': isActive,
        'bg-white/80 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 hover:border-go-300 dark:hover:border-go-600': !isActive && !isDisabled,
        'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-50': isDisabled,
      }
    );

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mt-12 p-6 bg-gradient-to-r from-gray-50 via-white to-gray-50 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
      {/* Page Size Changer */}
      {show_size_changer && onPageSizeChange && (
        <div className="flex items-center space-x-3">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">每页显示:</span>
          <select
            value={page_size}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300
                       focus:outline-none focus:ring-2 focus:ring-go-500 focus:border-transparent
                       hover:border-go-300 dark:hover:border-go-600 transition-all duration-200"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">条</span>
        </div>
      )}

      {/* Pagination Buttons */}
      <div className="flex items-center space-x-2">
        {/* Previous Button */}
        <button
          onClick={() => onPageChange(current_page - 1)}
          disabled={current_page === 1}
          className={cn(buttonClass(false, current_page === 1), 'group')}
          title="上一页"
        >
          <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </button>

        {/* Page Numbers */}
        {visiblePages.map((page, index) => {
          if (page === 'ellipsis') {
            return (
              <span
                key={`ellipsis-${index}`}
                className="px-3 py-2 text-gray-500 dark:text-gray-400"
              >
                ...
              </span>
            );
          }

          const pageNumber = page as number;
          return (
            <button
              key={pageNumber}
              onClick={() => onPageChange(pageNumber)}
              className={buttonClass(pageNumber === current_page)}
            >
              {pageNumber}
            </button>
          );
        })}

        {/* Next Button */}
        <button
          onClick={() => onPageChange(current_page + 1)}
          disabled={current_page === total_pages}
          className={cn(buttonClass(false, current_page === total_pages), 'group')}
          title="下一页"
        >
          <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Page Info */}
      <div className="flex items-center space-x-2 text-sm font-medium text-gray-600 dark:text-gray-400">
        <span className="bg-go-100 dark:bg-go-900/30 text-go-700 dark:text-go-300 px-3 py-1 rounded-full">
          第 {current_page} 页
        </span>
        <span>/</span>
        <span className="text-gray-500 dark:text-gray-400">
          共 {total_pages} 页
        </span>
      </div>
    </div>
  );
}