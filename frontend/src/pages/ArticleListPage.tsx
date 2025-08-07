import { articlesApi } from '../api';
import { Article, PaginatedResponse } from '../types';
import ArticleList from '../components/ArticleList';

export default function ArticleListPage() {
  const fetchArticles = async (page: number, limit: number): Promise<PaginatedResponse<Article>> => {
    const response = await articlesApi.getArticles({
      page,
      limit,
      isPublished: true,
      sortBy: 'published_at',
      sortOrder: 'desc',
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <ArticleList
        fetchArticles={fetchArticles}
        title="所有文章"
        description="浏览所有已发布的文章"
        variant="default"
        columns={2}
        initialPage={1}
        pageSize={20}
      />
    </div>
  );
}