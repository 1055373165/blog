import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { clsx } from 'clsx';
import { useAuth } from '../contexts/AuthContext';
import { submissionsApi } from '../api';
import {
  DocumentTextIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import Button from '../components/ui/Button';

import type { Submission } from '../types';

const statusConfig = {
  draft: {
    label: '草稿',
    icon: DocumentTextIcon,
    className: 'text-gray-500 bg-gray-100 dark:bg-gray-700'
  },
  submitted: {
    label: '待审核',
    icon: ClockIcon,
    className: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20'
  },
  pending: {
    label: '待审核',
    icon: ClockIcon,
    className: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20'
  },
  approved: {
    label: '已发布',
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
    icon: CheckCircleIcon,
    className: 'text-green-600 bg-green-100 dark:bg-green-900/20'
  }
};

export default function SubmissionsPage() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'article' | 'blog'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'submitted' | 'pending' | 'approved' | 'rejected' | 'published'>('all');

  useEffect(() => {
    fetchSubmissions();

    // 监听投稿更新事件
    const handleSubmissionUpdate = () => {
      fetchSubmissions();
    };

    window.addEventListener('submission-updated', handleSubmissionUpdate);

    return () => {
      window.removeEventListener('submission-updated', handleSubmissionUpdate);
    };
  }, []);

  const fetchSubmissions = async () => {
    try {
      setIsLoading(true);
      const response = await submissionsApi.getMySubmissions();

      if (response.success && response.data) {
        setSubmissions(response.data.submissions || []);
      }
    } catch (error) {
      console.error('获取投稿列表失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个投稿吗？')) return;

    try {
      const response = await submissionsApi.deleteSubmission(id);

      if (response.success) {
        setSubmissions(submissions.filter(s => s.id !== id));
      }
    } catch (error) {
      console.error('删除投稿失败:', error);
    }
  };

  const filteredSubmissions = submissions.filter(submission => {
    if (filter !== 'all' && submission.type !== filter) return false;
    if (statusFilter !== 'all' && submission.status !== statusFilter) return false;
    return true;
  });

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            请先登录
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            您需要登录后才能查看投稿列表
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-20 pb-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 头部 */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              我的投稿
            </h1>
            <Link to="/submissions/new">
              <Button>
                <PlusIcon className="w-5 h-5 mr-2" />
                新建投稿
              </Button>
            </Link>
          </div>

          {/* 筛选器 */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                类型:
              </label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                <option value="all">全部</option>
                <option value="article">文章</option>
                <option value="blog">博客</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                状态:
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                <option value="all">全部</option>
                <option value="draft">草稿</option>
                <option value="submitted">待审核</option>
                <option value="approved">已发布</option>
                <option value="rejected">已拒绝</option>
                <option value="published">已发布</option>
              </select>
            </div>
          </div>
        </div>

        {/* 投稿列表 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">加载中...</p>
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="p-8 text-center">
              <DocumentTextIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                暂无投稿
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                开始创建您的第一个投稿吧
              </p>
              <Link to="/submissions/new">
                <Button>
                  <PlusIcon className="w-5 h-5 mr-2" />
                  新建投稿
                </Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredSubmissions.map((submission) => {
                const status = statusConfig[submission.status];
                const StatusIcon = status.icon;

                return (
                  <div key={submission.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-2">
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
                        </div>

                        <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                          <span className="capitalize">
                            {submission.type === 'article' ? '文章' : '博客'}
                          </span>
                          <span>
                            创建于 {new Date(submission.created_at).toLocaleDateString()}
                          </span>
                          <span>
                            更新于 {new Date(submission.updated_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Link
                          to={`/submissions/${submission.id}/edit`}
                          className="p-2 text-gray-600 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400"
                          title="编辑"
                        >
                          <PencilIcon className="w-5 h-5" />
                        </Link>

                        <button
                          onClick={() => handleDelete(submission.id)}
                          className="p-2 text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                          title="删除"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}