import { ReactNode } from 'react';
import { clsx } from 'clsx';

interface SubstackLayoutProps {
  children: ReactNode;
  tocContent?: ReactNode;
  className?: string;
}

export default function SubstackLayout({ children, tocContent, className }: SubstackLayoutProps) {
  return (
    <div className={clsx('min-h-screen bg-white dark:bg-gray-900', className)}>
      {/* Desktop Three-Column Layout */}
      <div className="hidden lg:flex w-full">
        {/* Left TOC Column - 20% width */}
        <aside 
          className="w-[20%] flex-shrink-0 sticky top-0 h-screen overflow-y-auto border-r border-gray-100 dark:border-gray-800"
          aria-label="目录导航"
        >
          <div className="py-8 px-4">
            {tocContent}
          </div>
        </aside>

        {/* Center Content Column - 60% width */}
        <main 
          className="w-[60%] flex-shrink-0 px-6 xl:px-8"
          role="main"
        >
          <div className="max-w-none mx-auto">
            {children}
          </div>
        </main>

        {/* Right Empty Column - 20% width for balance */}
        <aside 
          className="w-[20%] flex-shrink-0"
          aria-hidden="true"
        >
          {/* Intentionally empty for visual balance */}
        </aside>
      </div>

      {/* Mobile/Tablet Single-Column Layout */}
      <div className="lg:hidden">
        <main 
          className="px-4 sm:px-6"
          role="main"
        >
          <div className="max-w-3xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

// Export for use in other components
export { SubstackLayout };