import { articlesApi } from '../api';
import { Article, PaginatedResponse } from '../types';
import ArticleList from '../components/ArticleList';

export default function ArticlesPage() {
  const fetchArticles = async (page: number, limit: number): Promise<PaginatedResponse<Article>> => {
    const response = await articlesApi.getArticles({
      page,
      limit,
      is_published: true,
      sort_by: 'published_at',
      sort_order: 'desc',
    });
    // 转换API返回的数据格式为ArticleList期望的格式
    return {
      items: response.data.articles || [],
      total: response.data.pagination?.total || 0,
      page: response.data.pagination?.page || page,
      limit: response.data.pagination?.limit || limit,
      totalPages: response.data.pagination?.total_pages || 1,
    };
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Page Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6 font-heading text-shadow-sm">
          技术文章
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed mb-8">
          探索我的技术文章和思考，涵盖前端开发、后端架构、数据库设计等多个领域
        </p>
        <div className="flex items-center justify-center space-x-2 text-go-600 dark:text-go-400">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
          </svg>
          <span className="font-medium">持续更新中</span>
        </div>
      </div>

      <ArticleList
        fetchArticles={fetchArticles}
        title=""
        description=""
        variant="default"
        columns={2}
        showCategory={true}
        showTags={true}
        showStats={true}
        showPagination={true}
        initialPage={1}
        pageSize={12}
      />
    </div>
  );
}