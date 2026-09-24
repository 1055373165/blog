import { useEffect } from 'react';
import type { SavedPosition } from '../../hooks/useResumeReading';
import { scrollToHeading } from '../../utils/articleNavigation';

/* The prompt disappears on its own after this long */
const PROMPT_TIMEOUT_MS = 15_000;

/** "Continue reading" pill shown when a saved position exists for this article. */
export default function ResumeReadingPrompt({ saved, onDismiss }: { saved: SavedPosition | null; onDismiss: () => void }) {
  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(onDismiss, PROMPT_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [saved, onDismiss]);

  if (!saved) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 left-1/2 z-40 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-3 rounded-full border border-gray-200 bg-white/95 py-2 pl-5 pr-2 text-sm shadow-lg dark:border-gray-700 dark:bg-gray-800/95"
    >
      <span className="min-w-0 truncate text-gray-600 dark:text-gray-300">
        上次读到「<span className="font-medium text-gray-900 dark:text-white">{saved.text}</span>」
      </span>
      <button
        onClick={() => {
          // 恢复阅读位置是定位而不是动画：直接跳转并在周边内容加载时保持住
          scrollToHeading(saved.id, { instant: true });
          onDismiss();
        }}
        className="shrink-0 rounded-full bg-go-600 px-4 py-1.5 font-medium text-white transition-colors hover:bg-go-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-go-400"
      >
        继续阅读
      </button>
      <button
        onClick={onDismiss}
        aria-label="关闭"
        className="shrink-0 rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-go-400"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
