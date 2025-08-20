import React from 'react';
import Hero from '../components/ui/Hero';
import ButtonShowcase from '../components/ui/ButtonShowcase';
import CardShowcase from '../components/ui/CardShowcase';
import InputShowcase from '../components/ui/InputShowcase';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

export default function ComponentShowcasePage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Component Showcase
            </h1>
            <div className="flex space-x-4">
              <a href="#hero" className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
                Hero
              </a>
              <a href="#buttons" className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
                Buttons
              </a>
              <a href="#cards" className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
                Cards
              </a>
              <a href="#inputs" className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
                Inputs
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="hero">
        <Hero />
      </section>

      {/* Quick Overview */}
      <section className="py-20 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">
              Modern UI Component Library
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              A comprehensive collection of modern, accessible, and customizable React components
              built with TypeScript and Tailwind CSS
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card variant="glass" size="lg" className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Responsive Design
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                完全响应式设计，适配所有设备尺寸
              </p>
            </Card>

            <Card variant="glass" size="lg" className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-go-500 to-go-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                High Performance
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                优化的渲染性能和流畅的动画效果
              </p>
            </Card>

            <Card variant="glass" size="lg" className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-accent-purple-500 to-accent-pink-500 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100-4m0 4v2m0-6V4" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Customizable
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                灵活的主题系统和丰富的自定义选项
              </p>
            </Card>

            <Card variant="glass" size="lg" className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-success-500 to-success-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Accessible
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                完整的无障碍支持和键盘导航
              </p>
            </Card>
          </div>

          <div className="text-center mt-12">
            <Button variant="gradient" size="lg">
              开始使用组件库
            </Button>
          </div>
        </div>
      </section>

      {/* Button Components */}
      <section id="buttons">
        <ButtonShowcase />
      </section>

      {/* Card Components */}
      <section id="cards">
        <CardShowcase />
      </section>

      {/* Input Components */}
      <section id="inputs">
        <InputShowcase />
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-2xl font-bold mb-4">Ready to build something amazing?</h3>
          <p className="text-gray-400 mb-8">
            这些组件只是开始，更多精彩功能正在路上...
          </p>
          <div className="flex justify-center space-x-4">
            <Button variant="outline" size="lg" className="border-white text-white hover:bg-white hover:text-gray-900">
              查看源码
            </Button>
            <Button variant="glass" size="lg">
              开始使用
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}