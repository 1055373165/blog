import React from 'react';
import Card from './Card';
import Button from './Button';

// 示例图标
const HeartIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
  </svg>
);

const StarIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

const UserIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
  </svg>
);

export default function CardShowcase() {
  return (
    <div className="p-8 space-y-12 bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Card Component Showcase
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            现代化卡片组件系统，支持多种设计风格和视觉效果
          </p>
        </div>

        {/* 基本变体 */}
        <section className="space-y-8">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">Card Variants</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card variant="default">
                <h3 className="text-lg font-semibold mb-2">Default Card</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  基础卡片样式，适用于大多数场景。
                </p>
              </Card>

              <Card variant="elevated">
                <h3 className="text-lg font-semibold mb-2">Elevated Card</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  带有更明显阴影的卡片，突出重要内容。
                </p>
              </Card>

              <Card variant="outlined">
                <h3 className="text-lg font-semibold mb-2">Outlined Card</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  带有边框的卡片，清晰的视觉边界。
                </p>
              </Card>

              <Card variant="minimal">
                <h3 className="text-lg font-semibold mb-2">Minimal Card</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  极简风格卡片，去除多余装饰。
                </p>
              </Card>
            </div>
          </div>

          {/* Glassmorphism 卡片 */}
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">Glassmorphism Cards</h2>
            <div className="relative p-8 rounded-2xl overflow-hidden bg-gradient-mesh">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card variant="glass" size="lg">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center">
                      <HeartIcon className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold">Glass Effect</h3>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 mb-4">
                    毛玻璃效果卡片，现代感十足的设计风格。
                  </p>
                  <Button variant="glass" size="sm">
                    Learn More
                  </Button>
                </Card>

                <Card variant="glass" size="lg" radius="2xl">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-r from-primary-500 to-accent-purple-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <StarIcon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Premium Feature</h3>
                    <p className="text-gray-700 dark:text-gray-300 mb-4">
                      高级功能展示卡片
                    </p>
                    <Button variant="outline" size="sm" className="backdrop-blur-sm">
                      Upgrade
                    </Button>
                  </div>
                </Card>

                <Card variant="glass" size="lg" blurred>
                  <h3 className="text-lg font-semibold mb-2">Blurred Glass</h3>
                  <p className="text-gray-700 dark:text-gray-300">
                    增强模糊效果的玻璃卡片。
                  </p>
                </Card>
              </div>
            </div>
          </div>

          {/* 特殊效果卡片 */}
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">Special Effect Cards</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card variant="floating" className="group">
                <h3 className="text-lg font-semibold mb-2">Floating Card</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  悬浮效果卡片，鼠标悬停时会产生升起效果。
                </p>
                <Button variant="primary" size="sm">
                  Hover Me
                </Button>
              </Card>

              <Card variant="gradient">
                <h3 className="text-lg font-semibold mb-2">Gradient Card</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  渐变背景卡片，优雅的色彩过渡。
                </p>
                <Button variant="outline" size="sm">
                  Explore
                </Button>
              </Card>

              <Card variant="neo">
                <h3 className="text-lg font-semibold mb-2">Neumorphism Card</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  新拟态设计风格，柔和的阴影效果。
                </p>
                <Button variant="secondary" size="sm">
                  Touch Me
                </Button>
              </Card>
            </div>
          </div>

          {/* 带图片的卡片 */}
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">Cards with Images</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card 
                variant="elevated"
                image="https://images.unsplash.com/photo-1517180102446-f3ece451e9d8?w=400&h=300&fit=crop"
                imageAlt="Beautiful landscape"
                imagePosition="top"
              >
                <h3 className="text-lg font-semibold mb-2">Top Image Card</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  顶部图片卡片，适合展示产品或文章。
                </p>
                <Button variant="primary" size="sm">
                  Read More
                </Button>
              </Card>

              <Card 
                variant="elevated"
                image="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200&h=200&fit=crop"
                imageAlt="Profile"
                imagePosition="left"
                size="lg"
              >
                <h3 className="text-lg font-semibold mb-2">Side Image Card</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  侧边图片卡片，适合用户资料或列表项展示。
                </p>
              </Card>

              <Card 
                variant="gradient"
                image="https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=600&h=400&fit=crop"
                imageAlt="Background"
                imagePosition="background"
                size="lg"
                className="text-white"
              >
                <h3 className="text-xl font-bold mb-2">Background Image</h3>
                <p className="mb-4 opacity-90">
                  背景图片卡片，创造沉浸式体验。
                </p>
                <Button variant="glass" size="sm">
                  Discover
                </Button>
              </Card>
            </div>
          </div>

          {/* 不同大小和圆角 */}
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">Sizes & Radius</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card variant="elevated" size="sm" radius="sm">
                <h4 className="font-semibold mb-1">Small Card</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">紧凑的小卡片</p>
              </Card>

              <Card variant="elevated" size="md" radius="lg">
                <h4 className="font-semibold mb-2">Medium Card</h4>
                <p className="text-gray-600 dark:text-gray-400">标准大小卡片</p>
              </Card>

              <Card variant="elevated" size="lg" radius="xl">
                <h4 className="font-semibold mb-2">Large Card</h4>
                <p className="text-gray-600 dark:text-gray-400">大尺寸卡片，更多内容空间</p>
              </Card>

              <Card variant="elevated" size="xl" radius="2xl">
                <h4 className="font-semibold mb-3">Extra Large</h4>
                <p className="text-gray-600 dark:text-gray-400">超大卡片，适合重要内容展示</p>
              </Card>
            </div>
          </div>

          {/* 带头部和底部的卡片 */}
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">Cards with Header & Footer</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card 
                variant="elevated"
                header={
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center">
                        <UserIcon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold">John Doe</h3>
                        <p className="text-sm text-gray-500">Frontend Developer</p>
                      </div>
                    </div>
                    <Button variant="ghost" iconPosition="only" size="sm">
                      <HeartIcon />
                    </Button>
                  </div>
                }
                footer={
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span className="flex items-center space-x-1">
                        <HeartIcon className="w-4 h-4" />
                        <span>24</span>
                      </span>
                      <span>2 hours ago</span>
                    </div>
                    <Button variant="outline" size="sm">
                      Reply
                    </Button>
                  </div>
                }
              >
                <p className="text-gray-600 dark:text-gray-400">
                  刚刚完成了一个很棒的 React 项目！使用了最新的 React 18 特性和 TypeScript，
                  整个开发过程都很顺利。特别是新的 Concurrent Features 真的很强大。
                </p>
              </Card>

              <Card 
                variant="glass"
                header={
                  <div className="text-center">
                    <h3 className="text-xl font-bold">Premium Plan</h3>
                    <p className="text-gray-500">Everything you need</p>
                  </div>
                }
                footer={
                  <Button variant="gradient" fullWidth>
                    Upgrade Now
                  </Button>
                }
              >
                <div className="text-center space-y-4">
                  <div className="text-4xl font-bold text-primary-600">$29</div>
                  <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                    <li>✓ Unlimited projects</li>
                    <li>✓ Advanced analytics</li>
                    <li>✓ Priority support</li>
                    <li>✓ Custom integrations</li>
                  </ul>
                </div>
              </Card>
            </div>
          </div>

          {/* 实际应用场景 */}
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">Real-world Examples</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* 文章卡片 */}
              <Card 
                variant="elevated"
                image="https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400&h=200&fit=crop"
                imagePosition="top"
                hoverable
                animated
              >
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded-full">
                      技术
                    </span>
                    <span className="text-xs text-gray-500">5 min read</span>
                  </div>
                  <h3 className="text-lg font-semibold">React 18 新特性详解</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    深入了解 React 18 的并发特性、Suspense 改进和自动批处理等新功能...
                  </p>
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 bg-gray-300 rounded-full"></div>
                      <span className="text-sm text-gray-500">Alice Chen</span>
                    </div>
                    <Button variant="ghost" size="sm">
                      阅读
                    </Button>
                  </div>
                </div>
              </Card>

              {/* 统计卡片 */}
              <Card variant="gradient" size="lg">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-success-500 rounded-full mx-auto flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-success-600">+25%</div>
                    <div className="text-gray-600 dark:text-gray-400">增长率</div>
                  </div>
                  <p className="text-sm text-gray-500">
                    相比上月表现优异
                  </p>
                </div>
              </Card>

              {/* 功能卡片 */}
              <Card variant="floating" size="lg" className="group">
                <div className="text-center space-y-4">
                  <div className="w-12 h-12 bg-accent-purple-500 rounded-xl mx-auto flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold">快如闪电</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    极致的性能优化，毫秒级响应速度
                  </p>
                  <Button variant="outline" size="sm" className="group-hover:bg-accent-purple-50">
                    了解更多
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