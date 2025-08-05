import { articlesApi } from '../api';
import { Article, PaginatedResponse } from '../types';
import ArticleList from '../components/ArticleList';

export default function ArticlesPage() {
  const fetchArticles = async (page: number, limit: number): Promise<PaginatedResponse<Article>> => {
    const response = await articlesApi.getArticles({
      page,
      limit,
      isPublished: true,
      sortBy: 'published_at',
      sortOrder: 'desc',
    });
    return response.data;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <ArticleList
        fetchArticles={fetchArticles}
        title="所有文章"
        description="探索我的技术文章和思考，涵盖前端开发、后端架构、数据库设计等多个领域。"
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