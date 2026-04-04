import { useState } from 'react';
import LoadingSpinner from '../LoadingSpinner';

interface ImportSkillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (githubUrl: string) => Promise<void>;
}

export default function ImportSkillModal({ isOpen, onClose, onImport }: ImportSkillModalProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    try {
      setLoading(true);
      await onImport(url.trim());
      setUrl('');
      onClose();
    } finally {
      if (document.body) {
          // hack to ensure we don't accidentally leak loading state to parent
      }
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-gray-900/50 backdrop-blur-sm">
      <div className="relative w-full max-w-lg p-4">
        <div className="relative rounded-3xl bg-white p-6 shadow-2xl dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              从 GitHub 导入 Skill
            </h3>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-gray-700 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label htmlFor="github_url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                GitHub 目录链接
              </label>
              <input
                type="url"
                id="github_url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={loading}
                placeholder="例如: https://github.com/lijigang/ljg-skills/tree/master/skills"
                className="block w-full rounded-2xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50 px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 focus:border-go-500 focus:ring-go-500 sm:text-sm transition-colors disabled:opacity-50"
              />
              <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                支持仓库根目录或具体子目录。导入时会自动解析该目录下的 SKILL.md 并维持其层级结构。同名的 Skill 会被<b>覆盖更新</b>。导入成功后将自动推送到您配置的 GitHub 存储库。
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="rounded-full px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 border border-gray-200 dark:border-gray-700"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={!url.trim() || loading}
                className="inline-flex items-center justify-center rounded-full bg-go-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-go-700 focus:outline-none focus:ring-2 focus:ring-go-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2 border-white" />
                    导入中...
                  </>
                ) : (
                  '开始导入'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
