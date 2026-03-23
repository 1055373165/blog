import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Toast from '../ui/Toast';
import {
  importAlgorithmFolder,
  type AlgorithmFolderImportProgress,
  type DirectoryFile,
  type ImportAlgorithmFolderResult,
} from './algorithmFolderImport';

interface AlgorithmFolderImportCardProps {
  onImported?: () => void | Promise<void>;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'object' && error) {
    if ('error' in error && typeof error.error === 'string' && error.error) {
      return error.error;
    }

    if ('message' in error && typeof error.message === 'string' && error.message) {
      return error.message;
    }
  }

  return fallback;
}

export default function AlgorithmFolderImportCard({ onImported }: AlgorithmFolderImportCardProps) {
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stageText, setStageText] = useState('选择本地算法题文件夹后，会自动创建或补齐一个算法资产');
  const [activeFolderName, setActiveFolderName] = useState('');
  const [lastResult, setLastResult] = useState<ImportAlgorithmFolderResult | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info'; visible: boolean }>({
    message: '',
    type: 'success',
    visible: false,
  });

  function showToast(message: string, type: 'success' | 'error' | 'info') {
    setToast({ message, type, visible: true });
  }

  function handleProgressUpdate(progressState: AlgorithmFolderImportProgress) {
    setProgress(progressState.progress);
    setStageText(progressState.stageText);
    if (progressState.activeFolderName) {
      setActiveFolderName(progressState.activeFolderName);
    }
  }

  async function handleFolderImport(files: DirectoryFile[]) {
    if (files.length === 0) {
      return;
    }

    try {
      setImporting(true);
      setProgress(0);
      setLastResult(null);
      setActiveFolderName('');
      setStageText('正在准备导入...');

      const result = await importAlgorithmFolder(files, {
        onProgress: handleProgressUpdate,
      });

      setLastResult(result);

      try {
        await onImported?.();
      } catch (refreshError) {
        console.warn('Algorithm asset list refresh failed after folder import:', refreshError);
      }

      showToast(result.importMode === 'created' ? '文件夹已导入为新的算法资产' : '文件夹内容已同步到现有算法资产', 'success');
    } catch (error) {
      const message = getErrorMessage(error, '导入算法文件夹失败');
      setStageText(message);
      showToast(message, 'error');
    } finally {
      setImporting(false);
    }
  }

  return (
    <>
      <input
        ref={folderInputRef}
        type="file"
        // @ts-expect-error webkitdirectory is non-standard
        webkitdirectory=""
        multiple
        className="hidden"
        onChange={(event) => {
          const files = Array.from(event.target.files || []) as DirectoryFile[];
          if (files.length > 0) {
            void handleFolderImport(files);
          }
          event.target.value = '';
        }}
      />

      <div className="mb-6 rounded-[1.75rem] border border-go-100 bg-white p-5 shadow-soft dark:border-go-900/40 dark:bg-gray-900">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-go-50 px-3 py-1 text-xs font-semibold text-go-700 dark:bg-go-900/20 dark:text-go-300">
              Folder Import
            </div>
            <h2 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">通过题目文件夹快速导入</h2>
            <p className="mt-3 text-sm leading-7 text-gray-600 dark:text-gray-300">
              直接选择本地算法题目录。系统会识别其中的 <code>README*.md</code> 和 <code>*.mp4</code>，自动创建或更新一个算法资产。
              这一步只解决资产整理，不替代你后续的复习和闭卷回忆。
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span className="rounded-full bg-gray-100 px-3 py-1 dark:bg-gray-800">一个文件夹对应一个资产</span>
              <span className="rounded-full bg-gray-100 px-3 py-1 dark:bg-gray-800">自动识别主 README 与主视频</span>
              <span className="rounded-full bg-gray-100 px-3 py-1 dark:bg-gray-800">重复导入会优先更新同名文件</span>
            </div>
          </div>

          <div className="shrink-0">
            <button
              type="button"
              onClick={() => folderInputRef.current?.click()}
              disabled={importing}
              className="btn btn-primary flex items-center gap-2"
            >
              {importing ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l3-3m0 0l3-3m-3 3v12M4 4h16a2 2 0 012 2v4a2 2 0 01-2 2h-3M4 4a2 2 0 00-2 2v4a2 2 0 002 2h3" />
                </svg>
              )}
              {importing ? '导入中...' : '选择文件夹导入'}
            </button>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-800 dark:bg-gray-950/50">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {activeFolderName ? `当前目录：${activeFolderName}` : '当前尚未选择文件夹'}
              </p>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{stageText}</p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">进度</p>
              <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">{progress}%</p>
            </div>
          </div>
          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-go-500 to-sky-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {lastResult ? (
          <div className="mt-5 flex flex-col gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                  {lastResult.importMode === 'created' ? '已创建新的算法资产' : '已更新现有算法资产'}
                </p>
                <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-200">
                  {lastResult.assetTitle} · 目录 {lastResult.sourceDirName}
                </p>
              </div>
              <Link to={`/admin/algorithms/${lastResult.assetId}`} className="btn btn-secondary">
                进入资产详情
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-white/70 px-4 py-3 text-sm text-emerald-800 dark:bg-gray-900/60 dark:text-emerald-200">
                导入 Markdown：{lastResult.markdownCount}
              </div>
              <div className="rounded-2xl bg-white/70 px-4 py-3 text-sm text-emerald-800 dark:bg-gray-900/60 dark:text-emerald-200">
                导入视频：{lastResult.videoCount}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.visible}
        onClose={() => setToast((current) => ({ ...current, visible: false }))}
      />
    </>
  );
}
