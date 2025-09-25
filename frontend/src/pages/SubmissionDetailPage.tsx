import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { submissionsApi } from '../api';
import type { Submission } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import MarkdownRenderer from '../components/MarkdownRenderer';
import OptimizedImage from '../components/ui/OptimizedImage';
import SubstackLayout from '../components/SubstackLayout';
import { formatDate } from '../utils';
import {
  DocumentTextIcon,
  VideoCameraIcon,
  EyeIcon,
  PencilIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  RocketLaunchIcon,
  CalendarIcon,
  UserIcon,
  TagIcon,
  FolderIcon
} from '@heroicons/react/24/outline';

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

export default function SubmissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubmission = async () => {
      if (!id) {
        setError('无效的投稿ID');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await submissionsApi.getSubmission(parseInt(id));
        if (response.success) {
          setSubmission(response.data);
        } else {
          setError(response.error || '获取投稿详情失败');
        }
      } catch (err) {
        setError('获取投稿详情失败');
        console.error('Error fetching submission:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubmission();
  }, [id]);

  if (isLoading) {
    return (
      <SubstackLayout>
        <LoadingSpinner />
      </SubstackLayout>
    );
  }

  if (error) {
    return (
      <SubstackLayout>
        <div className="min-h-[400px] flex flex-col items-center justify-center">
          <div className="text-center">
            <DocumentTextIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              投稿不存在
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              {error}
            </p>
            <Link
              to="/submissions"
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              返回投稿列表
            </Link>
          </div>
        </div>
      </SubstackLayout>
    );
  }

  if (!submission) {
    return (
      <SubstackLayout>
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">投稿不存在</p>
        </div>
      </SubstackLayout>
    );
  }

  const status = statusConfig[submission.status as keyof typeof statusConfig] || {
    label: submission.status || '未知',
    icon: ClockIcon,
    className: 'text-gray-500 bg-gray-100 dark:bg-gray-700'
  };
  const StatusIcon = status.icon;

  return (
    <SubstackLayout>
      <article className="max-w-none">
        {/* 头部信息 */}
        <header className="mb-8">
          {/* 状态和操作栏 */}
          <div className="flex items-center justify-between mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center space-x-4">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${status.className}`}>
                <StatusIcon className="w-4 h-4 mr-1" />
                {status.label}
              </span>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                {submission.type === 'article' ? '文章' : '博客'}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              {/* 编辑按钮（仅草稿和被拒绝的可编辑） */}
              {(submission.status === 'draft' || submission.status === 'rejected') && (
                <Link
                  to={`/submissions/${submission.id}/edit`}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  <PencilIcon className="w-4 h-4 mr-1" />
                  编辑
                </Link>
              )}
              <Link
                to="/submissions"
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                返回列表
              </Link>
            </div>
          </div>

          {/* 封面图 */}
          {submission.cover_image && (
            <div className="mb-8">
              <OptimizedImage
                src={submission.cover_image}
                alt={submission.title}
                className="w-full h-64 md:h-96 object-cover rounded-lg"
              />
            </div>
          )}

          {/* 标题 */}
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6 font-heading">
            {submission.title}
          </h1>

          {/* 摘要 */}
          {submission.excerpt && (
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
              {submission.excerpt}
            </p>
          )}

          {/* 元信息 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="space-y-2">
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <UserIcon className="w-4 h-4 mr-2" />
                <span>作者: {submission.author?.name || '未知'}</span>
              </div>
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <CalendarIcon className="w-4 h-4 mr-2" />
                <span>创建: {formatDate(submission.created_at)}</span>
              </div>
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <CalendarIcon className="w-4 h-4 mr-2" />
                <span>更新: {formatDate(submission.updated_at)}</span>
              </div>
              {submission.submitted_at && (
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  <span>提交: {formatDate(submission.submitted_at)}</span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              {submission.category && (
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <FolderIcon className="w-4 h-4 mr-2" />
                  <span>分类: {submission.category.name}</span>
                </div>
              )}
              {submission.tags && submission.tags.length > 0 && (
                <div className="flex items-start text-sm text-gray-600 dark:text-gray-400">
                  <TagIcon className="w-4 h-4 mr-2 mt-0.5" />
                  <div className="flex flex-wrap gap-1">
                    {submission.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-200"
                        style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <EyeIcon className="w-4 h-4 mr-2" />
                <span>阅读时间: {submission.reading_time} 分钟</span>
              </div>
            </div>
          </div>

          {/* 审核备注 */}
          {submission.review_notes && (
            <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                审核备注:
              </h3>
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                {submission.review_notes}
              </p>
            </div>
          )}
        </header>

        {/* 正文内容 */}
        <div className="prose prose-lg dark:prose-invert max-w-none">
          <MarkdownRenderer content={submission.content} />
        </div>

        {/* SEO元信息 */}
        {(submission.meta_title || submission.meta_description || submission.meta_keywords) && (
          <div className="mt-12 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              SEO 设置
            </h3>
            <div className="space-y-3">
              {submission.meta_title && (
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">标题:</span>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{submission.meta_title}</p>
                </div>
              )}
              {submission.meta_description && (
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">描述:</span>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{submission.meta_description}</p>
                </div>
              )}
              {submission.meta_keywords && (
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">关键词:</span>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{submission.meta_keywords}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </article>
    </SubstackLayout>
  );
}