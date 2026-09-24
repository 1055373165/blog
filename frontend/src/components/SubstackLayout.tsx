import { ReactNode } from 'react';
import { clsx } from 'clsx';

interface SubstackLayoutProps {
  children: ReactNode;
  tocContent?: ReactNode;
  className?: string;
}

/* 桌面三栏（目录 20% · 正文 60% · 留白 20%）与移动单栏共用同一份 children。
   只挂载一次正文：长文若分别为两种布局各渲染一遍，解析与 DOM 开销都会翻倍。 */
export default function SubstackLayout({ children, tocContent, className }: SubstackLayoutProps) {
  return (
    <div className={clsx('min-h-screen bg-white dark:bg-gray-900', className)}>
      <div className="w-full lg:grid lg:grid-cols-[20%_60%_20%]">
        {/* Left TOC Column — desktop only */}
        <aside
          className="hidden lg:block sticky top-0 h-screen overflow-y-auto border-r border-gray-100 dark:border-gray-800"
          aria-label="目录导航"
        >
          <div className="py-8 px-4">
            {tocContent}
          </div>
        </aside>

        {/* Content Column */}
        <main
          className="min-w-0 px-6 xl:px-8"
          role="main"
        >
          <div className="max-w-4xl lg:max-w-none mx-auto">
            {children}
          </div>
        </main>

        {/* Right Empty Column - 20% width for balance */}
        <aside className="hidden lg:block" aria-hidden="true" />
      </div>
    </div>
  );
}

// Export for use in other components
export { SubstackLayout };
