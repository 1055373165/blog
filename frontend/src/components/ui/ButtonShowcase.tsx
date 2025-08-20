import React, { useState } from 'react';
import Button from './Button';

// 图标组件示例
const HeartIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
  </svg>
);

const ArrowIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
  </svg>
);

const DownloadIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const PlusIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
  </svg>
);

export default function ButtonShowcase() {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

  const toggleLoading = (id: string) => {
    setLoadingStates(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
    
    // 自动停止加载状态
    setTimeout(() => {
      setLoadingStates(prev => ({
        ...prev,
        [id]: false
      }));
    }, 2000);
  };

  return (
    <div className="p-8 space-y-12 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Button Component Showcase
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            现代化按钮组件系统，支持多种变体、大小和状态
          </p>
        </div>

        {/* 按钮变体展示 */}
        <section className="space-y-8">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">Button Variants</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="tertiary">Tertiary</Button>
              <Button variant="success">Success</Button>
              <Button variant="warning">Warning</Button>
              <Button variant="error">Error</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="glass">Glass</Button>
              <Button variant="gradient">Gradient</Button>
            </div>
          </div>

          {/* 按钮大小展示 */}
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">Button Sizes</h2>
            <div className="flex flex-wrap items-end gap-4">
              <Button size="xs">Extra Small</Button>
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
              <Button size="xl">Extra Large</Button>
            </div>
          </div>

          {/* 带图标的按钮 */}
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">Buttons with Icons</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Button leftIcon={<HeartIcon />} variant="primary">
                Like This
              </Button>
              <Button rightIcon={<ArrowIcon />} variant="secondary">
                Continue
              </Button>
              <Button leftIcon={<DownloadIcon />} variant="success">
                Download
              </Button>
              <Button rightIcon={<PlusIcon />} variant="outline">
                Add Item
              </Button>
              <Button iconPosition="only" variant="ghost">
                <HeartIcon />
              </Button>
              <Button iconPosition="only" variant="glass" rounded>
                <PlusIcon />
              </Button>
            </div>
          </div>

          {/* 特殊状态按钮 */}
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">Button States</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button 
                variant="primary"
                loading={loadingStates.loading1}
                onClick={() => toggleLoading('loading1')}
              >
                {loadingStates.loading1 ? 'Loading...' : 'Click to Load'}
              </Button>
              <Button disabled variant="secondary">
                Disabled Button
              </Button>
              <Button fullWidth variant="success">
                Full Width Button
              </Button>
              <Button rounded elevated variant="gradient">
                Rounded & Elevated
              </Button>
            </div>
          </div>

          {/* 玻璃形态按钮 */}
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">Glassmorphism Buttons</h2>
            <div className="relative p-8 rounded-2xl overflow-hidden bg-gradient-mesh">
              <div className="absolute inset-0 bg-black/10 dark:bg-white/5"></div>
              <div className="relative grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button variant="glass" size="lg">
                  Glass Effect
                </Button>
                <Button variant="glass" leftIcon={<HeartIcon />} size="lg">
                  Glass with Icon
                </Button>
                <Button 
                  variant="glass" 
                  size="lg" 
                  rounded
                  loading={loadingStates.glassLoading}
                  onClick={() => toggleLoading('glassLoading')}
                >
                  Glass Loading
                </Button>
              </div>
            </div>
          </div>

          {/* 交互式示例 */}
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">Interactive Examples</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* 点赞按钮 */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Like Button</h3>
                <div className="flex items-center gap-4">
                  <Button 
                    variant={loadingStates.liked ? "error" : "ghost"}
                    leftIcon={<HeartIcon />}
                    onClick={() => setLoadingStates(prev => ({ ...prev, liked: !prev.liked }))}
                    className={loadingStates.liked ? "text-red-500" : ""}
                  >
                    {loadingStates.liked ? "Liked" : "Like"}
                  </Button>
                  <span className="text-sm text-gray-500">
                    {loadingStates.liked ? "You liked this!" : "Click to like"}
                  </span>
                </div>
              </div>

              {/* 切换按钮 */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Toggle Button</h3>
                <div className="flex items-center gap-4">
                  <Button 
                    variant={loadingStates.toggle ? "success" : "outline"}
                    onClick={() => setLoadingStates(prev => ({ ...prev, toggle: !prev.toggle }))}
                  >
                    {loadingStates.toggle ? "ON" : "OFF"}
                  </Button>
                  <span className="text-sm text-gray-500">
                    State: {loadingStates.toggle ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 实际应用场景 */}
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">Real-world Examples</h2>
            <div className="space-y-8">
              {/* 表单按钮组 */}
              <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-soft">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Form Actions</h3>
                <div className="flex flex-wrap gap-3">
                  <Button variant="primary" size="md">
                    Save Changes
                  </Button>
                  <Button variant="outline" size="md">
                    Cancel
                  </Button>
                  <Button variant="tertiary" size="md">
                    Reset
                  </Button>
                </div>
              </div>

              {/* 导航按钮组 */}
              <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-soft">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Navigation</h3>
                <div className="flex flex-wrap gap-3">
                  <Button variant="gradient" leftIcon={<ArrowIcon className="rotate-180" />}>
                    Previous
                  </Button>
                  <Button variant="gradient" rightIcon={<ArrowIcon />}>
                    Next
                  </Button>
                </div>
              </div>

              {/* CTA 按钮 */}
              <div className="p-8 bg-gradient-to-br from-primary-50 to-accent-purple-50 dark:from-gray-800 dark:to-gray-900 rounded-xl">
                <div className="text-center space-y-4">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Ready to Get Started?
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Join thousands of developers building amazing things.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button variant="gradient" size="lg" rightIcon={<ArrowIcon />}>
                      Get Started Free
                    </Button>
                    <Button variant="glass" size="lg">
                      Learn More
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}