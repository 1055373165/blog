import { useState, useEffect } from 'react';
import { Series, CreateSeriesRequest, UpdateSeriesRequest } from '../../types';
import { seriesApi } from '../../api';
import LoadingSpinner from '../../components/LoadingSpinner';
import SeriesModal from '../../components/admin/SeriesModal';
import Toast, { ToastType } from '../../components/ui/Toast';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

export default function AdminSeries() {
  const [series, setSeries] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSeries, setEditingSeries] = useState<Series | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingSeries, setDeletingSeries] = useState<Series | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType; isVisible: boolean }>({ 
    message: '', 
    type: 'success', 
    isVisible: false 
  });

  useEffect(() => {
    loadSeries();
  }, []);

  const loadSeries = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await seriesApi.getSeries();
      
      // Handle ApiResponse<SeriesListResponse> format
      if (response.success && response.data) {
        setSeries(response.data.series || []);
      } else {
        throw new Error(response.error || '加载系列失败');
      }
    } catch (err) {
      console.error('Failed to load series:', err);
      setError(err instanceof Error ? err.message : '加载系列时出错');
      
      // Show error toast
      showToast('加载系列失败，请稍后重试', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: ToastType) => {
    setToast({ message, type, isVisible: true });
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, isVisible: false }));
  };

  const handleCreateSeries = () => {
    setShowCreateModal(true);
  };

  const handleEditSeries = (seriesItem: Series) => {
    setEditingSeries(seriesItem);
    setShowEditModal(true);
  };

  const handleDeleteSeries = (seriesItem: Series) => {
    setDeletingSeries(seriesItem);
    setShowDeleteDialog(true);
  };

  const handleCreateSubmit = async (data: CreateSeriesRequest) => {
    try {
      const response = await seriesApi.createSeries(data);

      // Backend returns Series object directly, wrapped in ApiResponse by client
      if (response.success && response.data) {
        await loadSeries(); // Refresh the list
        showToast('系列创建成功', 'success');
      } else {
        throw new Error(response.error || '创建系列失败');
      }
    } catch (err) {
      console.error('Failed to create series:', err);
      const message = err instanceof Error ? err.message : '创建系列失败';
      throw new Error(message);
    }
  };

  const handleEditSubmit = async (data: UpdateSeriesRequest) => {
    if (!editingSeries) return;

    try {
      const response = await seriesApi.updateSeries(editingSeries.id.toString(), data);

      // Backend returns Series object directly, wrapped in ApiResponse by client
      if (response.success && response.data) {
        await loadSeries(); // Refresh the list
        showToast('系列更新成功', 'success');
      } else {
        throw new Error(response.error || '更新系列失败');
      }
    } catch (err) {
      console.error('Failed to update series:', err);
      const message = err instanceof Error ? err.message : '更新系列失败';
      throw new Error(message);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingSeries) return;

    try {
      setDeleteLoading(true);
      
      const response = await seriesApi.deleteSeries(deletingSeries.id.toString());

      // Backend returns { message: string }, wrapped in ApiResponse by client
      if (response.success) {
        await loadSeries(); // Refresh the list
        showToast(response.data?.message || '系列删除成功', 'success');
        setShowDeleteDialog(false);
        setDeletingSeries(null);
      } else {
        throw new Error(response.error || '删除系列失败');
      }
    } catch (err) {
      console.error('Failed to delete series:', err);
      const message = err instanceof Error ? err.message : '删除系列失败';
      showToast(message, 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteDialog(false);
    setDeletingSeries(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          系列管理
        </h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">
          管理和组织您的博客文章系列
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-red-400 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        </div>
      )}

      {/* Series List */}
      <div className="card overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                系列列表
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                共 {series.length} 个系列
              </p>
            </div>
            <button 
              onClick={handleCreateSeries}
              className="btn btn-primary"
            >
              添加系列
            </button>
          </div>
        </div>
        
        {series.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 bg-go-100 dark:bg-go-900/30 rounded-2xl flex items-center justify-center">
              <svg className="w-10 h-10 text-go-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              暂无系列
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-sm mx-auto">
              开始创建您的第一个系列，为文章进行系列化组织
            </p>
            <button 
              onClick={handleCreateSeries}
              className="btn btn-primary"
            >
              添加系列
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    系列名称
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    路径
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    描述
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    文章数
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    创建时间
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {series.map((seriesItem) => (
                  <tr key={seriesItem.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-go-100 dark:bg-go-900/30 rounded-xl flex items-center justify-center mr-3">
                          <svg className="w-5 h-5 text-go-600 dark:text-go-400" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                          </svg>
                        </div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                          {seriesItem.name}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <code className="text-sm text-go-600 dark:text-go-400 bg-go-50 dark:bg-go-900/20 px-2 py-1 rounded-lg">
                        /{seriesItem.slug}
                      </code>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">
                        {seriesItem.description || (
                          <span className="italic text-gray-400 dark:text-gray-500">无描述</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold bg-go-100 dark:bg-go-900/30 text-go-700 dark:text-go-300 rounded-full">
                        {seriesItem.articles_count} 篇
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(seriesItem.created_at).toLocaleDateString('zh-CN')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <button 
                          onClick={() => handleEditSeries(seriesItem)}
                          className="p-2 text-go-600 dark:text-go-400 hover:text-go-700 dark:hover:text-go-300 hover:bg-go-50 dark:hover:bg-go-900/20 rounded-lg transition-all duration-200"
                          title="编辑系列"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button 
                          onClick={() => handleDeleteSeries(seriesItem)}
                          className="p-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200"
                          title="删除系列"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Series Modal */}
      <SeriesModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateSubmit}
        mode="create"
      />

      <SeriesModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingSeries(null);
        }}
        onSubmit={handleEditSubmit}
        series={editingSeries}
        mode="edit"
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        title="确认删除系列"
        message={`您确定要删除系列"${deletingSeries?.name}"吗？此操作无法撤销。`}
        confirmText="删除"
        cancelText="取消"
        type="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        loading={deleteLoading}
      />

      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
    </div>
  );
}