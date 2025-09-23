import React, { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import {
  UserIcon,
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  ShieldExclamationIcon,
  TrashIcon,
  PencilIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

interface User {
  id: number;
  name: string;
  email: string;
  is_admin: boolean;
  is_active: boolean;
  github_url?: string;
  bio?: string;
  created_at: string;
  last_login_at?: string;
  articles_count?: number;
  submissions_count?: number;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'user'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchUsers();
  }, [currentPage, searchQuery, statusFilter, roleFilter]);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20'
      });

      if (searchQuery) params.append('search', searchQuery);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (roleFilter !== 'all') params.append('role', roleFilter);

      const response = await fetch(`/api/admin/users?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
        setTotalPages(Math.ceil((data.total || 0) / 20));
      }
    } catch (error) {
      console.error('获取用户列表失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleAdmin = async (userId: number, isAdmin: boolean) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/toggle-admin`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ is_admin: !isAdmin })
      });

      if (response.ok) {
        setUsers(users.map(user =>
          user.id === userId ? { ...user, is_admin: !isAdmin } : user
        ));
      }
    } catch (error) {
      console.error('更新用户权限失败:', error);
    }
  };

  const handleToggleActive = async (userId: number, isActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/toggle-active`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ is_active: !isActive })
      });

      if (response.ok) {
        setUsers(users.map(user =>
          user.id === userId ? { ...user, is_active: !isActive } : user
        ));
      }
    } catch (error) {
      console.error('更新用户状态失败:', error);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm('确定要删除此用户吗？此操作不可恢复。')) return;

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (response.ok) {
        setUsers(users.filter(user => user.id !== userId));
      }
    } catch (error) {
      console.error('删除用户失败:', error);
    }
  };

  const filteredUsers = users;

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            用户管理
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            管理系统中的所有用户账户
          </p>
        </div>
      </div>

      {/* 筛选器 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              搜索用户
            </label>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="搜索姓名或邮箱..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              用户状态
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">全部状态</option>
              <option value="active">启用</option>
              <option value="inactive">禁用</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              用户角色
            </label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">全部角色</option>
              <option value="admin">管理员</option>
              <option value="user">普通用户</option>
            </select>
          </div>

          <div className="flex items-end">
            <Button
              onClick={() => {
                setCurrentPage(1);
                fetchUsers();
              }}
              className="w-full"
            >
              搜索
            </Button>
          </div>
        </div>
      </div>

      {/* 用户列表 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">加载中...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center">
            <UserIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              没有找到用户
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              尝试调整筛选条件或搜索关键词
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      用户信息
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      角色
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      状态
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      统计
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      注册时间
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                              <UserIcon className="h-6 w-6 text-gray-400" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {user.name}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={clsx(
                            'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                            user.is_admin
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          )}
                        >
                          {user.is_admin ? (
                            <>
                              <ShieldCheckIcon className="w-3 h-3 mr-1" />
                              管理员
                            </>
                          ) : (
                            <>
                              <UserIcon className="w-3 h-3 mr-1" />
                              普通用户
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={clsx(
                            'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                            user.is_active
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                          )}
                        >
                          {user.is_active ? (
                            <>
                              <CheckCircleIcon className="w-3 h-3 mr-1" />
                              启用
                            </>
                          ) : (
                            <>
                              <XCircleIcon className="w-3 h-3 mr-1" />
                              禁用
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        <div>文章: {user.articles_count || 0}</div>
                        <div>投稿: {user.submissions_count || 0}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleToggleAdmin(user.id, user.is_admin)}
                          className={clsx(
                            'inline-flex items-center px-2 py-1 text-xs rounded',
                            user.is_admin
                              ? 'text-orange-700 bg-orange-100 hover:bg-orange-200 dark:bg-orange-900/20 dark:text-orange-300'
                              : 'text-purple-700 bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/20 dark:text-purple-300'
                          )}
                          title={user.is_admin ? '移除管理员' : '设为管理员'}
                        >
                          {user.is_admin ? <ShieldExclamationIcon className="w-3 h-3" /> : <ShieldCheckIcon className="w-3 h-3" />}
                        </button>

                        <button
                          onClick={() => handleToggleActive(user.id, user.is_active)}
                          className={clsx(
                            'inline-flex items-center px-2 py-1 text-xs rounded',
                            user.is_active
                              ? 'text-red-700 bg-red-100 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-300'
                              : 'text-green-700 bg-green-100 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-300'
                          )}
                          title={user.is_active ? '禁用用户' : '启用用户'}
                        >
                          {user.is_active ? <XCircleIcon className="w-3 h-3" /> : <CheckCircleIcon className="w-3 h-3" />}
                        </button>

                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="inline-flex items-center px-2 py-1 text-xs rounded text-red-700 bg-red-100 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-300"
                          title="删除用户"
                        >
                          <TrashIcon className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="bg-white dark:bg-gray-800 px-4 py-3 border-t border-gray-200 dark:border-gray-700 sm:px-6">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    第 {currentPage} 页，共 {totalPages} 页
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    >
                      上一页
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                    >
                      下一页
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}