import React, { useState } from 'react';
import { clsx } from 'clsx';
import { XMarkIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import Button from './ui/Button';
import Input from './ui/Input';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'login' | 'register';
}

interface LoginFormData {
  email: string;
  password: string;
}

interface RegisterFormData {
  email: string;
  name: string;
  password: string;
  confirmPassword: string;
  github_url?: string;
  bio?: string;
}

export default function AuthModal({ isOpen, onClose, defaultMode = 'login' }: AuthModalProps) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>(defaultMode);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // 登录表单数据
  const [loginForm, setLoginForm] = useState<LoginFormData>({
    email: '',
    password: '',
  });

  // 注册表单数据
  const [registerForm, setRegisterForm] = useState<RegisterFormData>({
    email: '',
    name: '',
    password: '',
    confirmPassword: '',
    github_url: '',
    bio: '',
  });

  // 重置表单
  const resetForms = () => {
    setLoginForm({ email: '', password: '' });
    setRegisterForm({
      email: '',
      name: '',
      password: '',
      confirmPassword: '',
      github_url: '',
      bio: '',
    });
    setError(null);
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  // 关闭模态框
  const handleClose = () => {
    resetForms();
    onClose();
  };

  // 切换模式
  const switchMode = (newMode: 'login' | 'register') => {
    setMode(newMode);
    setError(null);
  };

  // 处理登录
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setError(null);
    setIsLoading(true);

    try {
      await login(loginForm.email, loginForm.password);
      handleClose();
    } catch (error: any) {
      console.error('登录错误:', error);
      // 提供更详细的错误信息
      let errorMessage = '登录失败，请重试';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // 处理注册
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    // 表单验证
    if (registerForm.password !== registerForm.confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    if (registerForm.password.length < 6) {
      setError('密码长度不能少于6位');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const { confirmPassword, ...registerData } = registerForm;
      await register({
        ...registerData,
        github_url: registerData.github_url || undefined,
        bio: registerData.bio || undefined,
      });
      handleClose();
    } catch (error: any) {
      console.error('注册错误:', error);
      // 提供更详细的错误信息
      let errorMessage = '注册失败，请重试';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      // 处理常见的注册错误
      if (errorMessage.includes('email') || errorMessage.includes('邮箱')) {
        errorMessage = '该邮箱已被注册，请使用其他邮箱';
      } else if (errorMessage.includes('username') || errorMessage.includes('用户名')) {
        errorMessage = '该用户名已存在，请选择其他用户名';
      } else if (errorMessage.includes('password') || errorMessage.includes('密码')) {
        errorMessage = '密码格式不正确，请确保密码长度至少6位';
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* 背景遮罩 */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity"
        onClick={handleClose}
      />

      {/* 模态框 */}
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div
            className={clsx(
              'relative w-full max-w-md transform rounded-2xl shadow-2xl transition-all',
              'bg-white dark:bg-gray-900',
              'border border-gray-200 dark:border-gray-700'
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 关闭按钮 */}
            <button
              onClick={handleClose}
              className={clsx(
                'absolute right-4 top-4 z-10 p-2 rounded-full transition-colors',
                'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
                'hover:bg-gray-100 dark:hover:bg-gray-800'
              )}
            >
              <XMarkIcon className="w-5 h-5" />
            </button>

            {/* 内容 */}
            <div className="p-6">
              {/* 头部 */}
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {mode === 'login' ? '登录' : '注册'}
                </h2>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  {mode === 'login' ? '欢迎回来！请登录您的账户' : '创建新账户开始您的旅程'}
                </p>
              </div>

              {/* 错误提示 */}
              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                  {error}
                </div>
              )}

              {/* 登录表单 */}
              {mode === 'login' && (
                <form onSubmit={handleLogin} className="space-y-4">
                  <Input
                    label="邮箱"
                    type="email"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                    placeholder="请输入邮箱"
                    required
                  />

                  <div className="relative">
                    <Input
                      label="密码"
                      type={showPassword ? 'text' : 'password'}
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      placeholder="请输入密码"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <EyeSlashIcon className="w-5 h-5" />
                      ) : (
                        <EyeIcon className="w-5 h-5" />
                      )}
                    </button>
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full"
                    loading={isLoading}
                  >
                    登录
                  </Button>
                </form>
              )}

              {/* 注册表单 */}
              {mode === 'register' && (
                <form onSubmit={handleRegister} className="space-y-4">
                  <Input
                    label="邮箱"
                    type="email"
                    value={registerForm.email}
                    onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                    placeholder="请输入邮箱"
                    required
                  />

                  <Input
                    label="用户名"
                    type="text"
                    value={registerForm.name}
                    onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                    placeholder="请输入用户名"
                    required
                  />

                  <div className="relative">
                    <Input
                      label="密码"
                      type={showPassword ? 'text' : 'password'}
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                      placeholder="请输入密码（至少6位）"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <EyeSlashIcon className="w-5 h-5" />
                      ) : (
                        <EyeIcon className="w-5 h-5" />
                      )}
                    </button>
                  </div>

                  <div className="relative">
                    <Input
                      label="确认密码"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={registerForm.confirmPassword}
                      onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                      placeholder="请再次输入密码"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? (
                        <EyeSlashIcon className="w-5 h-5" />
                      ) : (
                        <EyeIcon className="w-5 h-5" />
                      )}
                    </button>
                  </div>

                  <Input
                    label="GitHub链接（可选）"
                    type="url"
                    value={registerForm.github_url}
                    onChange={(e) => setRegisterForm({ ...registerForm, github_url: e.target.value })}
                    placeholder="https://github.com/username"
                  />

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      个人简介（可选）
                    </label>
                    <textarea
                      value={registerForm.bio}
                      onChange={(e) => setRegisterForm({ ...registerForm, bio: e.target.value })}
                      placeholder="简单介绍一下自己..."
                      rows={3}
                      className={clsx(
                        'w-full px-3 py-2 border rounded-lg transition-colors',
                        'border-gray-300 dark:border-gray-600',
                        'bg-white dark:bg-gray-800',
                        'text-gray-900 dark:text-white',
                        'placeholder-gray-500 dark:placeholder-gray-400',
                        'focus:ring-2 focus:ring-primary-500 focus:border-transparent',
                        'resize-none'
                      )}
                    />
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full"
                    loading={isLoading}
                  >
                    注册
                  </Button>
                </form>
              )}

              {/* 切换模式 */}
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {mode === 'login' ? '还没有账户？' : '已有账户？'}
                  <button
                    onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
                    className="ml-1 text-primary-600 hover:text-primary-500 font-medium"
                  >
                    {mode === 'login' ? '立即注册' : '立即登录'}
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}