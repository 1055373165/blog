import React, { useState, useRef } from 'react';
import { clsx } from 'clsx';
import { useAuth } from '../contexts/AuthContext';
import { UserIcon, CameraIcon, PencilIcon } from '@heroicons/react/24/outline';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { uploadApi } from '../api';

interface UserProfile {
  name: string;
  email: string;
  bio: string;
  github_url: string;
  avatar?: string;
}

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profileData, setProfileData] = useState<UserProfile>({
    name: user?.name || '',
    email: user?.email || '',
    bio: user?.bio || '',
    github_url: user?.github_url || '',
    avatar: user?.avatar
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await updateProfile(profileData);
      setIsEditing(false);
    } catch (error) {
      console.error('更新资料失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof UserProfile, value: string) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAvatarUpload = async (file: File) => {
    if (!file) return;

    // 检查文件类型
    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件');
      return;
    }

    // 检查文件大小（5MB限制）
    if (file.size > 5 * 1024 * 1024) {
      alert('图片大小不能超过5MB');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const response = await uploadApi.uploadImage(file);
      console.log('Avatar upload response:', response);
      
      // 检查不同的响应格式
      let avatarUrl: string;
      
      if (response && response.success && response.data && response.data.url) {
        // 标准 ApiResponse 格式：{ success: true, data: { url: "..." } }
        avatarUrl = response.data.url;
      } else if (response && response.data && response.data.url) {
        // ApiResponse 格式但没有 success 字段：{ data: { url: "..." } }
        avatarUrl = response.data.url;
      } else if (response && (response as any).url) {
        // 直接返回数据格式：{ url: "..." }
        avatarUrl = (response as any).url;
      } else {
        console.error('Unexpected upload response format:', response);
        throw new Error('上传响应格式错误');
      }
      
      const newProfileData = {
        ...profileData,
        avatar: avatarUrl
      };
      setProfileData(newProfileData);
      
      // 直接更新用户资料
      await updateProfile({ 
        name: newProfileData.name,
        bio: newProfileData.bio,
        github_url: newProfileData.github_url,
        avatar: avatarUrl
      });
    } catch (error) {
      console.error('头像上传失败:', error);
      alert(`头像上传失败：${error instanceof Error ? error.message : '请重试'}`);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleAvatarClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleAvatarUpload(file);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            请先登录
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            您需要登录后才能查看个人资料
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          {/* 头部 */}
          <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-6 py-8">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-white">个人资料</h1>
            </div>
          </div>

          {/* 内容区域 */}
          <div className="p-6">
            <form onSubmit={handleSubmit}>
              {/* 头像区域 */}
              <div className="flex items-center space-x-6 mb-8">
                <div className="relative">
                  {profileData.avatar ? (
                    <img
                      src={profileData.avatar}
                      alt={profileData.name}
                      className="w-24 h-24 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <UserIcon className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleAvatarClick}
                    disabled={isUploadingAvatar}
                    className={clsx(
                      "absolute -bottom-2 -right-2 p-2 rounded-full transition-colors",
                      isUploadingAvatar
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-primary-600 hover:bg-primary-700 cursor-pointer",
                      "text-white"
                    )}
                  >
                    {isUploadingAvatar ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <CameraIcon className="w-4 h-4" />
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
                <div className="flex-grow">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {profileData.name || '未设置姓名'}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {profileData.email}
                  </p>
                </div>
                {!isEditing && (
                  <Button
                    variant="secondary"
                    onClick={() => setIsEditing(true)}
                  >
                    <PencilIcon className="w-4 h-4 mr-2" />
                    编辑资料
                  </Button>
                )}
              </div>

              {/* 表单字段 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    姓名
                  </label>
                  {isEditing ? (
                    <Input
                      type="text"
                      value={profileData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="请输入您的姓名"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      {profileData.name || '未设置'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    邮箱
                  </label>
                  <p className="text-gray-900 dark:text-white p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    {profileData.email}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">邮箱地址不可修改</p>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    个人简介
                  </label>
                  {isEditing ? (
                    <textarea
                      value={profileData.bio}
                      onChange={(e) => handleInputChange('bio', e.target.value)}
                      placeholder="介绍一下自己吧..."
                      rows={4}
                      className={clsx(
                        'w-full px-3 py-2 border border-gray-300 dark:border-gray-600',
                        'rounded-lg shadow-sm placeholder-gray-400',
                        'bg-white dark:bg-gray-700 text-gray-900 dark:text-white',
                        'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent'
                      )}
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white p-3 bg-gray-50 dark:bg-gray-700 rounded-lg min-h-[100px]">
                      {profileData.bio || '暂无个人简介'}
                    </p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    GitHub 链接
                  </label>
                  {isEditing ? (
                    <Input
                      type="url"
                      value={profileData.github_url}
                      onChange={(e) => handleInputChange('github_url', e.target.value)}
                      placeholder="https://github.com/your-username"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      {profileData.github_url ? (
                        <a
                          href={profileData.github_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-600 hover:text-primary-700"
                        >
                          {profileData.github_url}
                        </a>
                      ) : (
                        '未设置'
                      )}
                    </p>
                  )}
                </div>
              </div>

              {/* 操作按钮 */}
              {isEditing && (
                <div className="mt-8 flex justify-end space-x-4">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setIsEditing(false);
                      setProfileData({
                        name: user?.name || '',
                        email: user?.email || '',
                        bio: user?.bio || '',
                        github_url: user?.github_url || '',
                        avatar: user?.avatar
                      });
                    }}
                  >
                    取消
                  </Button>
                  <Button
                    type="submit"
                    loading={isLoading}
                    disabled={isLoading}
                  >
                    保存更改
                  </Button>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}