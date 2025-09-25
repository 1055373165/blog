import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { clsx } from 'clsx';
import { submissionsApi } from '../../api';
import type { Submission, PaginatedResponse } from '../../types';
import {
  DocumentTextIcon,
  VideoCameraIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckIcon,
  HandThumbDownIcon,
  RocketLaunchIcon
} from '@heroicons/react/24/outline';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

const statusConfig = {
  draft: {
    label: '草稿',
    icon: DocumentTextIcon,
    className: 'text-gray-500 bg-gray-100 dark:bg-gray-700'
  },
  pending: {
    label: '待审核',
    icon: ClockIcon,
    className: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20'
  },
  submitted: {
    label: '待审核',
    icon: ClockIcon,
    className: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20'
  },
  approved: {
    label: '已通过',
    icon: CheckCircleIcon,
    className: 'text-green-600 bg-green-100 dark:bg-green-900/20'
  },
  rejected: {
    label: '已拒绝',
    icon: XCircleIcon,
    className: 'text-red-600 bg-red-100 dark:bg-red-900/20'
  },
  published: {
    label: '已发布',
    icon: RocketLaunchIcon,
    className: 'text-blue-600 bg-blue-100 dark:bg-blue-900/20'
  }
};

export default function AdminSubmissions() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });

  // 筛选条件
  const [filters, setFilters] = useState({
    status: 'all',
    type: 'all',
    search: ''
  });

  // 审核模态框
  const [reviewModal, setReviewModal] = useState<{
    isOpen: boolean;
    submission: Submission | null;
    action: 'approve' | 'reject' | 'publish' | null;
    notes: string;
    isSubmitting: boolean;
  }>({
    isOpen: false,
    submission: null,
    action: null,
    notes: '',
    isSubmitting: false
  });

  useEffect(() => {
    fetchSubmissions();
  }, [pagination.page, filters]);

  const fetchSubmissions = async () => {
    try {
      setIsLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...(filters.status !== 'all' && { status: filters.status }),
        ...(filters.type !== 'all' && { type: filters.type }),
        ...(filters.search && { search: filters.search })
      };

      const response = await submissionsApi.getAllSubmissions(params);

      if (response.success) {
        setSubmissions(response.data.submissions || []);
        setPagination({
          ...pagination,
          total: response.data.pagination.total,
          pages: response.data.pagination.pages
        });
      }
    } catch (error) {
      console.error('获取投稿列表失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
  };

  const openReviewModal = (submission: Submission, action: 'approve' | 'reject' | 'publish') => {
    setReviewModal({
      isOpen: true,
      submission,
      action,
      notes: '',
      isSubmitting: false
    });
  };

  const closeReviewModal = () => {
    setReviewModal({
      isOpen: false,
      submission: null,
      action: null,
      notes: '',
      isSubmitting: false
    });
  };

  const handleReview = async () => {
    if (!reviewModal.submission || !reviewModal.action) return;

    try {
      setReviewModal(prev => ({ ...prev, isSubmitting: true }));

      if (reviewModal.action === 'publish') {
        const response = await submissionsApi.publishSubmission(reviewModal.submission.id);
        if (response.success) {
          alert(`投稿已成功发布为文章！文章ID: ${response.data.article_id}`);
          fetchSubmissions();
        }
      } else {
        const response = await submissionsApi.reviewSubmission(reviewModal.submission.id, {
          status: reviewModal.action === 'approve' ? 'approved' : 'rejected',
          review_notes: reviewModal.notes
        });

        if (response.success) {
          alert(`投稿已${reviewModal.action === 'approve' ? '通过' : '拒绝'}！`);
          fetchSubmissions();
        }
      }

      closeReviewModal();
    } catch (error) {
      console.error('审核投稿失败:', error);
      alert('操作失败，请重试');
    } finally {
      setReviewModal(prev => ({ ...prev, isSubmitting: false }));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个投稿吗？此操作不可恢复。')) return;

    try {
      const response = await submissionsApi.deleteSubmission(id);
      if (response.success) {
        alert('投稿删除成功！');
        fetchSubmissions();
      }
    } catch (error) {
      console.error('删除投稿失败:', error);
      alert('删除失败，请重试');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* 头部 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          投稿管理
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          管理用户投稿，审核内容并发布为正式文章
        </p>
      </div>

      {/* 筛选栏 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* 搜索 */}
          <div className="relative">
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="搜索标题或内容..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="pl-10"
            />
          </div>

          {/* 状态筛选 */}
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">所有状态</option>
            <option value="pending">待审核(pending)</option>
            <option value="submitted">待审核(submitted)</option>
            <option value="approved">已通过</option>
            <option value="rejected">已拒绝</option>
            <option value="published">已发布</option>
            <option value="draft">草稿</option>
          </select>

          {/* 类型筛选 */}
          <select
            value={filters.type}
            onChange={(e) => handleFilterChange('type', e.target.value)}
            className="rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">所有类型</option>
            <option value="article">文章</option>
            <option value="blog">博客</option>
          </select>

          {/* 刷新按钮 */}
          <Button onClick={fetchSubmissions} variant="secondary">
            刷新
          </Button>
        </div>
      </div>

      {/* 投稿列表 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {submissions.length === 0 ? (
          <div className="p-8 text-center">
            <DocumentTextIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              暂无投稿
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              当前没有符合条件的投稿内容
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {submissions.map((submission) => {
              const status = statusConfig[submission.status as keyof typeof statusConfig] || {
                label: submission.status || '未知',
                icon: ClockIcon,
                className: 'text-gray-500 bg-gray-100 dark:bg-gray-700'
              };
              const StatusIcon = status.icon;

              return (
                <div key={submission.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      {/* 标题和状态 */}
                      <div className="flex items-center space-x-3 mb-3">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white truncate">
                          {submission.title}
                        </h3>
                        <span className={clsx(
                          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                          status.className
                        )}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {status.label}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                          {submission.type === 'article' ? '文章' : '博客'}
                        </span>
                      </div>

                      {/* 作者和时间信息 */}
                      <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                        <span>作者: {submission.author?.name || '未知'}</span>
                        <span>创建: {new Date(submission.created_at).toLocaleDateString()}</span>
                        <span>更新: {new Date(submission.updated_at).toLocaleDateString()}</span>
                        {submission.submitted_at && (
                          <span>提交: {new Date(submission.submitted_at).toLocaleDateString()}</span>
                        )}
                      </div>

                      {/* 摘要 */}
                      {submission.excerpt && (
                        <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2 mb-3">
                          {submission.excerpt}
                        </p>
                      )}

                      {/* 审核备注 */}
                      {submission.review_notes && (
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-3">
                          <p className="text-sm text-yellow-800 dark:text-yellow-200">
                            <strong>审核备注:</strong> {submission.review_notes}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex items-center space-x-2 ml-4">
                      {/* 查看 */}
                      <Link
                        to={`/submissions/${submission.id}`}
                        className="p-2 text-gray-600 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400"
                        title="查看详情"
                      >
                        <EyeIcon className="w-5 h-5" />
                      </Link>

                      {/* 编辑（仅草稿和被拒绝的可编辑） */}
                      {(submission.status === 'draft' || submission.status === 'rejected') && (
                        <Link
                          to={`/submissions/${submission.id}/edit`}
                          className="p-2 text-gray-600 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400"
                          title="编辑"
                        >
                          <PencilIcon className="w-5 h-5" />
                        </Link>
                      )}

                      {/* 审核操作 */}
                      {(submission.status === 'submitted' || submission.status === 'pending') && (
                        <>
                          <button
                            onClick={() => openReviewModal(submission, 'approve')}
                            className="p-2 text-green-600 hover:text-green-700 dark:text-green-400"
                            title="通过审核"
                          >
                            <CheckIcon className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => openReviewModal(submission, 'reject')}
                            className="p-2 text-red-600 hover:text-red-700 dark:text-red-400"
                            title="拒绝审核"
                          >
                            <HandThumbDownIcon className="w-5 h-5" />
                          </button>
                        </>
                      )}

                      {/* 发布 */}
                      {submission.status === 'approved' && (
                        <button
                          onClick={() => openReviewModal(submission, 'publish')}
                          className="p-2 text-blue-600 hover:text-blue-700 dark:text-blue-400"
                          title="发布为文章"
                        >
                          <RocketLaunchIcon className="w-5 h-5" />
                        </button>
                      )}

                      {/* 删除 */}
                      {submission.status !== 'published' && (
                        <button
                          onClick={() => handleDelete(submission.id)}
                          className="p-2 text-red-600 hover:text-red-700 dark:text-red-400"
                          title="删除"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 分页 */}
        {pagination.pages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                显示第 {(pagination.page - 1) * pagination.limit + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} 条，
                共 {pagination.total} 条记录
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeftIcon className="w-5 h-5" />
                </button>

                {/* 页码 */}
                {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={clsx(
                      'px-3 py-1 rounded-md text-sm',
                      page === pagination.page
                        ? 'bg-primary-600 text-white'
                        : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                    )}
                  >
                    {page}
                  </button>
                ))}

                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.pages}
                  className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRightIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 审核模态框 */}
      {reviewModal.isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={closeReviewModal}></div>

            <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-gray-800 shadow-xl rounded-2xl">
              <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-4">
                {reviewModal.action === 'approve' && '通过审核'}
                {reviewModal.action === 'reject' && '拒绝审核'}
                {reviewModal.action === 'publish' && '发布文章'}
              </h3>

              <div className="mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  投稿标题: {reviewModal.submission?.title}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  作者: {reviewModal.submission?.author?.name}
                </p>
              </div>

              {reviewModal.action !== 'publish' && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    审核备注 {reviewModal.action === 'reject' && '(必填)'}
                  </label>
                  <textarea
                    value={reviewModal.notes}
                    onChange={(e) => setReviewModal(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder={reviewModal.action === 'approve' ? '可选择添加通过理由...' : '请说明拒绝原因...'}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm placeholder-gray-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              )}

              {reviewModal.action === 'publish' && (
                <div className="mb-6">
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      确认将此投稿发布为正式文章？发布后将在网站上公开显示。
                    </p>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <Button
                  variant="secondary"
                  onClick={closeReviewModal}
                  disabled={reviewModal.isSubmitting}
                >
                  取消
                </Button>
                <Button
                  onClick={handleReview}
                  loading={reviewModal.isSubmitting}
                  disabled={reviewModal.action === 'reject' && !reviewModal.notes.trim()}
                  variant={reviewModal.action === 'reject' ? 'danger' : 'primary'}
                >
                  {reviewModal.action === 'approve' && '通过'}
                  {reviewModal.action === 'reject' && '拒绝'}
                  {reviewModal.action === 'publish' && '发布'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}