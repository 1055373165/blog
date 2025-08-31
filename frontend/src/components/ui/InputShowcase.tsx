import React, { useState } from 'react';
import Input from './Input';
import Button from './Button';
import Card from './Card';

// 示例图标
const SearchIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const UserIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const EmailIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const EyeIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const LockIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

export default function InputShowcase() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    search: '',
    message: '',
    username: 'johndoe',
    website: '//',
    price: '99.99'
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [key]: e.target.value }));
    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = '姓名不能为空';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = '邮箱不能为空';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = '邮箱格式不正确';
    }
    
    if (formData.password.length < 6) {
      newErrors.password = '密码至少需要6个字符';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setLoading(false);
    alert('表单提交成功！');
  };

  return (
    <div className="p-8 space-y-12 bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Input Component Showcase
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            现代化输入组件系统，支持多种样式、状态和交互效果
          </p>
        </div>

        {/* 基本变体 */}
        <section className="space-y-8">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">Input Variants</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card variant="elevated" size="md">
                <h3 className="text-lg font-semibold mb-4">Default</h3>
                <Input
                  label="用户名"
                  placeholder="请输入用户名"
                  leftIcon={<UserIcon />}
                />
              </Card>

              <Card variant="elevated" size="md">
                <h3 className="text-lg font-semibold mb-4">Outlined</h3>
                <Input
                  variant="outlined"
                  label="邮箱地址"
                  placeholder="请输入邮箱"
                  leftIcon={<EmailIcon />}
                />
              </Card>

              <Card variant="elevated" size="md">
                <h3 className="text-lg font-semibold mb-4">Filled</h3>
                <Input
                  variant="filled"
                  label="搜索"
                  placeholder="搜索内容..."
                  leftIcon={<SearchIcon />}
                  clearable
                />
              </Card>

              <Card variant="elevated" size="md">
                <h3 className="text-lg font-semibold mb-4">Minimal</h3>
                <Input
                  variant="minimal"
                  label="简约输入框"
                  placeholder="极简风格"
                />
              </Card>

              <Card variant="gradient" size="md" className="col-span-2">
                <h3 className="text-lg font-semibold mb-4 text-white">Glass Effect</h3>
                <Input
                  variant="glass"
                  label="玻璃效果"
                  placeholder="毛玻璃风格输入框"
                  leftIcon={<SearchIcon />}
                  clearable
                />
              </Card>
            </div>
          </div>

          {/* 浮动标签 */}
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">Floating Labels</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Input
                floating
                label="姓名"
                leftIcon={<UserIcon />}
                value={formData.name}
                onChange={handleInputChange('name')}
              />
              
              <Input
                floating
                variant="outlined"
                label="邮箱地址"
                leftIcon={<EmailIcon />}
                value={formData.email}
                onChange={handleInputChange('email')}
              />
              
              <Input
                floating
                variant="filled"
                label="密码"
                type="password"
                leftIcon={<LockIcon />}
                rightIcon={<EyeIcon />}
                value={formData.password}
                onChange={handleInputChange('password')}
              />
            </div>
          </div>

          {/* 不同大小 */}
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">Input Sizes</h2>
            <div className="space-y-4">
              <Input
                size="sm"
                label="小号输入框"
                placeholder="Small size input"
                leftIcon={<UserIcon />}
              />
              
              <Input
                size="md"
                label="中号输入框"
                placeholder="Medium size input"
                leftIcon={<UserIcon />}
              />
              
              <Input
                size="lg"
                label="大号输入框"
                placeholder="Large size input"
                leftIcon={<UserIcon />}
              />
              
              <Input
                size="xl"
                label="超大输入框"
                placeholder="Extra large size input"
                leftIcon={<UserIcon />}
              />
            </div>
          </div>

          {/* 状态展示 */}
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">Input States</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <Input
                  label="成功状态"
                  state="success"
                  value="验证通过"
                  readOnly
                  helperText="输入内容验证成功"
                />
                
                <Input
                  label="警告状态"
                  state="warning"
                  value="需要注意"
                  helperText="输入内容需要注意某些问题"
                />
                
                <Input
                  label="错误状态"
                  state="error"
                  errorText="输入内容不符合要求"
                  placeholder="请重新输入"
                />
                
                <Input
                  label="禁用状态"
                  disabled
                  value="已禁用"
                  helperText="此输入框已被禁用"
                />
              </div>
              
              <div className="space-y-4">
                <Input
                  label="加载状态"
                  loading
                  placeholder="正在验证中..."
                  helperText="正在验证输入内容"
                />
                
                <Input
                  label="可清除输入框"
                  clearable
                  value={formData.search}
                  onChange={handleInputChange('search')}
                  onClear={() => setFormData(prev => ({ ...prev, search: '' }))}
                  placeholder="输入内容可清除"
                />
                
                <Input
                  label="带装饰的输入框"
                  leftAddon="@"
                  value={formData.username}
                  onChange={handleInputChange('username')}
                  placeholder="username"
                />
                
                <Input
                  label="网站地址"
                  rightAddon=".com"
                  value={formData.website}
                  onChange={handleInputChange('website')}
                  placeholder="your-website"
                />
              </div>
            </div>
          </div>

          {/* 表单示例 */}
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">Complete Form Example</h2>
            <Card variant="elevated" size="lg" className="max-w-2xl mx-auto">
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">用户注册</h3>
                  <p className="text-gray-600 dark:text-gray-400">填写下面的信息创建账户</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    floating
                    label="姓名"
                    leftIcon={<UserIcon />}
                    value={formData.name}
                    onChange={handleInputChange('name')}
                    state={errors.name ? 'error' : formData.name ? 'success' : 'default'}
                    errorText={errors.name}
                    placeholder="请输入您的姓名"
                  />
                  
                  <Input
                    floating
                    label="邮箱地址"
                    type="email"
                    leftIcon={<EmailIcon />}
                    value={formData.email}
                    onChange={handleInputChange('email')}
                    state={errors.email ? 'error' : formData.email && /\S+@\S+\.\S+/.test(formData.email) ? 'success' : 'default'}
                    errorText={errors.email}
                    placeholder="请输入邮箱地址"
                  />
                </div>
                
                <Input
                  floating
                  label="密码"
                  type="password"
                  leftIcon={<LockIcon />}
                  rightIcon={<EyeIcon />}
                  value={formData.password}
                  onChange={handleInputChange('password')}
                  state={errors.password ? 'error' : formData.password.length >= 6 ? 'success' : 'default'}
                  errorText={errors.password}
                  helperText="密码至少需要6个字符"
                  placeholder="请输入密码"
                />
                
                <Input
                  floating
                  variant="filled"
                  label="价格"
                  leftAddon="¥"
                  rightAddon="元"
                  value={formData.price}
                  onChange={handleInputChange('price')}
                  placeholder="0.00"
                />
                
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button
                    variant="primary"
                    loading={loading}
                    onClick={handleSubmit}
                    className="flex-1"
                  >
                    {loading ? '注册中...' : '立即注册'}
                  </Button>
                  
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setFormData({
                        name: '',
                        email: '',
                        password: '',
                        search: '',
                        message: '',
                        username: 'johndoe',
                        website: '//',
                        price: '99.99'
                      });
                      setErrors({});
                    }}
                    className="flex-1 sm:flex-initial"
                  >
                    重置
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Glass 风格表单 */}
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">Glass Style Form</h2>
            <div className="relative p-8 rounded-2xl overflow-hidden bg-gradient-mesh">
              <Card variant="glass" size="lg" className="max-w-md mx-auto">
                <div className="space-y-4">
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-bold">登录</h3>
                    <p className="text-gray-600 dark:text-gray-400">欢迎回来</p>
                  </div>
                  
                  <Input
                    variant="glass"
                    floating
                    label="邮箱"
                    leftIcon={<EmailIcon />}
                    placeholder="请输入邮箱"
                  />
                  
                  <Input
                    variant="glass"
                    floating
                    label="密码"
                    type="password"
                    leftIcon={<LockIcon />}
                    placeholder="请输入密码"
                  />
                  
                  <Button variant="glass" fullWidth size="lg" className="mt-6">
                    登录
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}