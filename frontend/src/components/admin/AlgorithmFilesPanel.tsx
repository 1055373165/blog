import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { algorithmsApi } from '../../api/algorithms';
import type { AlgorithmAsset, AlgorithmAssetFile } from '../../types';

interface MarkdownEditorState {
  id?: number;
  display_name: string;
  original_name: string;
  role: 'primary_analysis' | 'supplement';
  sort_order: number;
  is_primary: boolean;
  markdown_content: string;
}

interface AlgorithmFilesPanelProps {
  asset: AlgorithmAsset | null;
  onAssetChange: (asset: AlgorithmAsset) => void;
}

interface VideoEditorState {
  id?: number;
  display_name: string;
  original_name: string;
  role: 'animation' | 'alternate_animation' | 'supplement';
  sort_order: number;
  is_primary: boolean;
  storage_url: string;
  mime_type: string;
  size_bytes: number;
}

function createEmptyMarkdownState(isPrimary = false): MarkdownEditorState {
  return {
    display_name: '',
    original_name: '',
    role: 'primary_analysis',
    sort_order: 0,
    is_primary: isPrimary,
    markdown_content: '',
  };
}

function createEmptyVideoState(isPrimary = false): VideoEditorState {
  return {
    display_name: '',
    original_name: '',
    role: 'animation',
    sort_order: 0,
    is_primary: isPrimary,
    storage_url: '',
    mime_type: '',
    size_bytes: 0,
  };
}

export default function AlgorithmFilesPanel({ asset, onAssetChange }: AlgorithmFilesPanelProps) {
  const markdownFiles = (asset?.files || [])
    .filter((file) => file.file_kind === 'markdown')
    .sort((left, right) => left.sort_order - right.sort_order || left.id - right.id);
  const videoFiles = (asset?.files || [])
    .filter((file) => file.file_kind === 'video')
    .sort((left, right) => left.sort_order - right.sort_order || left.id - right.id);

  const [selectedMarkdownId, setSelectedMarkdownId] = useState<number | null>(null);
  const [editorState, setEditorState] = useState<MarkdownEditorState>(createEmptyMarkdownState(true));
  const [selectedVideoId, setSelectedVideoId] = useState<number | null>(null);
  const [videoEditor, setVideoEditor] = useState<VideoEditorState>(createEmptyVideoState(true));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingVideo, setSavingVideo] = useState(false);
  const [deletingVideo, setDeletingVideo] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [videoMessage, setVideoMessage] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!asset) {
      setSelectedMarkdownId(null);
      setEditorState(createEmptyMarkdownState(true));
      setSelectedVideoId(null);
      setVideoEditor(createEmptyVideoState(true));
      return;
    }

    const preferredId = asset.primary_markdown_file?.id || markdownFiles[0]?.id || null;
    setSelectedMarkdownId((current) => {
      const existing = current ? markdownFiles.find((file) => file.id === current) : undefined;
      return existing ? current : preferredId;
    });

    const preferredVideoId = asset.primary_video_file?.id || videoFiles[0]?.id || null;
    setSelectedVideoId((current) => {
      const existing = current ? videoFiles.find((file) => file.id === current) : undefined;
      return existing ? current : preferredVideoId;
    });
  }, [asset?.id, asset?.primary_markdown_file_id, asset?.files]);

  useEffect(() => {
    if (!asset) {
      return;
    }

    const selectedFile = markdownFiles.find((file) => file.id === selectedMarkdownId);
    if (selectedFile) {
      setEditorState({
        id: selectedFile.id,
        display_name: selectedFile.display_name,
        original_name: selectedFile.original_name,
        role: selectedFile.role === 'supplement' ? 'supplement' : 'primary_analysis',
        sort_order: selectedFile.sort_order,
        is_primary:
          asset.primary_markdown_file_id === selectedFile.id || Boolean(selectedFile.is_primary),
        markdown_content: selectedFile.markdown_content || '',
      });
      return;
    }

    setEditorState(createEmptyMarkdownState(markdownFiles.length === 0));
  }, [asset, selectedMarkdownId]);

  useEffect(() => {
    if (!asset) {
      return;
    }

    const selectedFile = videoFiles.find((file) => file.id === selectedVideoId);
    if (selectedFile) {
      setVideoEditor({
        id: selectedFile.id,
        display_name: selectedFile.display_name,
        original_name: selectedFile.original_name,
        role:
          selectedFile.role === 'alternate_animation' || selectedFile.role === 'supplement'
            ? selectedFile.role
            : 'animation',
        sort_order: selectedFile.sort_order,
        is_primary: asset.primary_video_file_id === selectedFile.id || Boolean(selectedFile.is_primary),
        storage_url: selectedFile.storage_url || '',
        mime_type: selectedFile.mime_type || '',
        size_bytes: selectedFile.size_bytes || 0,
      });
      return;
    }

    setVideoEditor(createEmptyVideoState(videoFiles.length === 0));
  }, [asset, selectedVideoId]);

  async function handleSaveMarkdown() {
    if (!asset) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setMessage(null);

      const payload = {
        display_name: editorState.display_name.trim(),
        original_name: editorState.original_name.trim() || editorState.display_name.trim(),
        role: editorState.role,
        sort_order: Number(editorState.sort_order) || 0,
        is_primary: editorState.is_primary,
        markdown_content: editorState.markdown_content,
      };

      let response;
      if (editorState.id) {
        response = await algorithmsApi.updateFile(asset.id, editorState.id, payload);
      } else {
        response = await algorithmsApi.createMarkdownFile(asset.id, payload);
      }

      if (!response.success) {
        throw new Error(response.error || '保存 Markdown 文件失败');
      }

      onAssetChange(response.data);
      setSelectedMarkdownId(response.data.primary_markdown_file?.id || response.data.files.find((file) => file.file_kind === 'markdown')?.id || null);
      setMessage(editorState.id ? 'Markdown 文件已更新' : 'Markdown 文件已创建');
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存 Markdown 文件失败');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteMarkdown() {
    if (!asset || !editorState.id) {
      return;
    }
    if (!window.confirm(`确定要删除 Markdown 文件「${editorState.display_name}」吗？`)) {
      return;
    }

    try {
      setDeleting(true);
      setError(null);
      setMessage(null);
      const response = await algorithmsApi.deleteFile(asset.id, editorState.id);
      if (!response.success) {
        throw new Error(response.error || '删除 Markdown 文件失败');
      }

      onAssetChange(response.data);
      setSelectedMarkdownId(response.data.primary_markdown_file?.id || response.data.files.find((file) => file.file_kind === 'markdown')?.id || null);
      setMessage('Markdown 文件已删除');
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除 Markdown 文件失败');
    } finally {
      setDeleting(false);
    }
  }

  async function handleUploadVideo(file?: File) {
    if (!file) {
      return;
    }

    try {
      setUploadingVideo(true);
      setUploadProgress(0);
      setVideoError(null);
      setVideoMessage(null);

      const uploadResult = await algorithmsApi.uploadVideo(file, setUploadProgress);
      setVideoEditor((current) => ({
        ...current,
        display_name: current.display_name || file.name,
        original_name: file.name,
        storage_url: uploadResult.url,
        mime_type: uploadResult.mime_type || file.type,
        size_bytes: uploadResult.size || file.size,
      }));
      setVideoMessage('视频文件上传成功，记得保存视频记录。');
    } catch (err) {
      setVideoError(err instanceof Error ? err.message : '视频上传失败');
    } finally {
      setUploadingVideo(false);
      setUploadProgress(0);
      if (videoInputRef.current) {
        videoInputRef.current.value = '';
      }
    }
  }

  async function handleSaveVideo() {
    if (!asset) {
      return;
    }

    try {
      setSavingVideo(true);
      setVideoError(null);
      setVideoMessage(null);

      const payload = {
        display_name: videoEditor.display_name.trim(),
        original_name: videoEditor.original_name.trim() || videoEditor.display_name.trim(),
        role: videoEditor.role,
        sort_order: Number(videoEditor.sort_order) || 0,
        is_primary: videoEditor.is_primary,
        storage_url: videoEditor.storage_url.trim(),
        mime_type: videoEditor.mime_type.trim(),
        size_bytes: Number(videoEditor.size_bytes) || 0,
      };

      let response;
      if (videoEditor.id) {
        response = await algorithmsApi.updateFile(asset.id, videoEditor.id, payload);
      } else {
        response = await algorithmsApi.createVideoFile(asset.id, payload);
      }

      if (!response.success) {
        throw new Error(response.error || '保存视频记录失败');
      }

      onAssetChange(response.data);
      setSelectedVideoId(response.data.primary_video_file?.id || response.data.files.find((file) => file.file_kind === 'video')?.id || null);
      setVideoMessage(videoEditor.id ? '视频记录已更新' : '视频记录已创建');
    } catch (err) {
      setVideoError(err instanceof Error ? err.message : '保存视频记录失败');
    } finally {
      setSavingVideo(false);
    }
  }

  async function handleDeleteVideo() {
    if (!asset || !videoEditor.id) {
      return;
    }
    if (!window.confirm(`确定要删除视频记录「${videoEditor.display_name}」吗？`)) {
      return;
    }

    try {
      setDeletingVideo(true);
      setVideoError(null);
      setVideoMessage(null);
      const response = await algorithmsApi.deleteFile(asset.id, videoEditor.id);
      if (!response.success) {
        throw new Error(response.error || '删除视频记录失败');
      }

      onAssetChange(response.data);
      setSelectedVideoId(response.data.primary_video_file?.id || response.data.files.find((file) => file.file_kind === 'video')?.id || null);
      setVideoMessage('视频记录已删除');
    } catch (err) {
      setVideoError(err instanceof Error ? err.message : '删除视频记录失败');
    } finally {
      setDeletingVideo(false);
    }
  }

  if (!asset) {
    return (
      <section className="rounded-[1.75rem] border border-dashed border-gray-300 bg-white p-6 shadow-soft dark:border-gray-700 dark:bg-gray-900">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">文件管理</h2>
        <p className="mt-3 text-sm leading-7 text-gray-600 dark:text-gray-300">
          先创建算法资产，再管理 Markdown 和视频文件。
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-[1.75rem] border border-gray-200 bg-white p-6 shadow-soft dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-go-600 dark:text-go-300">
            Markdown Workspace
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-gray-900 dark:text-white">Markdown 文件管理</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-gray-600 dark:text-gray-300">
            在这里整理一题多稿的 Markdown，选择主稿，并即时预览当前版本。
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setSelectedMarkdownId(null);
            setEditorState(createEmptyMarkdownState(markdownFiles.length === 0));
            setMessage(null);
            setError(null);
          }}
          className="btn btn-secondary"
        >
          新建 Markdown
        </button>
      </div>

      {message ? (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300">
          {error}
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)_minmax(0,1fr)]">
        <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-800 dark:bg-gray-950/60">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">现有稿件</h3>
            <span className="rounded-full bg-white px-3 py-1 text-xs text-gray-500 shadow-soft dark:bg-gray-900 dark:text-gray-400">
              {markdownFiles.length} 份
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {markdownFiles.length > 0 ? markdownFiles.map((file) => {
              const active = file.id === selectedMarkdownId;
              const isPrimary = asset.primary_markdown_file_id === file.id || file.is_primary;
              return (
                <button
                  key={file.id}
                  type="button"
                  onClick={() => {
                    setSelectedMarkdownId(file.id);
                    setMessage(null);
                    setError(null);
                  }}
                  className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                    active
                      ? 'border-go-300 bg-white shadow-soft dark:border-go-700 dark:bg-gray-900'
                      : 'border-transparent bg-white/70 hover:border-go-200 dark:bg-gray-900/70 dark:hover:border-go-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{file.display_name}</p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {file.role === 'supplement' ? '补充稿' : '主分析稿候选'}
                      </p>
                    </div>
                    {isPrimary ? (
                      <span className="rounded-full bg-go-100 px-2.5 py-1 text-[11px] font-semibold text-go-700 dark:bg-go-900/30 dark:text-go-300">
                        主稿
                      </span>
                    ) : null}
                  </div>
                </button>
              );
            }) : (
              <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                当前还没有 Markdown 文件。
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {editorState.id ? '编辑 Markdown' : '创建 Markdown'}
            </h3>
            <div className="flex items-center gap-2">
              {editorState.id ? (
                <button
                  type="button"
                  onClick={() => void handleDeleteMarkdown()}
                  disabled={deleting}
                  className="btn btn-secondary text-rose-600 hover:text-rose-700 dark:text-rose-300"
                >
                  {deleting ? '删除中...' : '删除'}
                </button>
              ) : null}
              <button type="button" onClick={() => void handleSaveMarkdown()} disabled={saving} className="btn btn-primary">
                {saving ? '保存中...' : editorState.id ? '保存修改' : '创建文件'}
              </button>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">显示名称</label>
              <input
                value={editorState.display_name}
                onChange={(event) => setEditorState((current) => ({ ...current, display_name: event.target.value }))}
                placeholder="例如 README.md"
                className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-go-500 focus:ring-4 focus:ring-go-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">原始文件名</label>
                <input
                  value={editorState.original_name}
                  onChange={(event) => setEditorState((current) => ({ ...current, original_name: event.target.value }))}
                  placeholder="例如 README-2.md"
                  className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-go-500 focus:ring-4 focus:ring-go-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">排序</label>
                <input
                  type="number"
                  value={editorState.sort_order}
                  onChange={(event) => setEditorState((current) => ({ ...current, sort_order: Number(event.target.value) || 0 }))}
                  className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-go-500 focus:ring-4 focus:ring-go-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">角色</label>
                <select
                  value={editorState.role}
                  onChange={(event) => setEditorState((current) => ({ ...current, role: event.target.value as MarkdownEditorState['role'] }))}
                  className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-go-500 focus:ring-4 focus:ring-go-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                >
                  <option value="primary_analysis">主分析稿</option>
                  <option value="supplement">补充稿</option>
                </select>
              </div>

              <label className="flex items-end gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-950/60 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={editorState.is_primary}
                  onChange={(event) => setEditorState((current) => ({ ...current, is_primary: event.target.checked }))}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-go-600 focus:ring-go-500"
                />
                设为主稿
              </label>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Markdown 内容</label>
              <textarea
                value={editorState.markdown_content}
                onChange={(event) => setEditorState((current) => ({ ...current, markdown_content: event.target.value }))}
                rows={20}
                placeholder="在这里粘贴或编辑 Markdown 内容"
                className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 font-mono text-sm leading-7 text-gray-900 outline-none transition focus:border-go-500 focus:ring-4 focus:ring-go-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">实时预览</h3>
          <div className="mt-5 max-h-[820px] overflow-auto rounded-2xl border border-gray-200 bg-gray-50/80 p-5 dark:border-gray-800 dark:bg-gray-950/50">
            {editorState.markdown_content.trim() ? (
              <article className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-li:text-gray-700 dark:prose-invert">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {editorState.markdown_content}
                </ReactMarkdown>
              </article>
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-10 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                当前还没有可预览的 Markdown 内容。
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)_minmax(0,1fr)]">
        <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-800 dark:bg-gray-950/60">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">视频资产</h3>
            <span className="rounded-full bg-white px-3 py-1 text-xs text-gray-500 shadow-soft dark:bg-gray-900 dark:text-gray-400">
              {videoFiles.length} 份
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {videoFiles.length > 0 ? videoFiles.map((file) => {
              const active = file.id === selectedVideoId;
              const isPrimary = asset.primary_video_file_id === file.id || file.is_primary;
              return (
                <button
                  key={file.id}
                  type="button"
                  onClick={() => {
                    setSelectedVideoId(file.id);
                    setVideoMessage(null);
                    setVideoError(null);
                  }}
                  className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                    active
                      ? 'border-sky-300 bg-white shadow-soft dark:border-sky-700 dark:bg-gray-900'
                      : 'border-transparent bg-white/70 hover:border-sky-200 dark:bg-gray-900/70 dark:hover:border-sky-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{file.display_name}</p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {file.role === 'alternate_animation' ? '替代动画' : file.role === 'supplement' ? '补充视频' : '主动画候选'}
                      </p>
                    </div>
                    {isPrimary ? (
                      <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-semibold text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">
                        主视频
                      </span>
                    ) : null}
                  </div>
                </button>
              );
            }) : (
              <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                当前还没有视频资产。
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {videoEditor.id ? '编辑视频记录' : '创建视频记录'}
            </h3>
            <div className="flex items-center gap-2">
              <input
                ref={videoInputRef}
                type="file"
                accept="video/mp4,video/*"
                className="hidden"
                onChange={(event) => void handleUploadVideo(event.target.files?.[0])}
              />
              <button
                type="button"
                onClick={() => {
                  setSelectedVideoId(null);
                  setVideoEditor(createEmptyVideoState(videoFiles.length === 0));
                  setVideoMessage(null);
                  setVideoError(null);
                }}
                className="btn btn-secondary"
              >
                新建视频
              </button>
              <button type="button" onClick={() => videoInputRef.current?.click()} className="btn btn-secondary">
                {uploadingVideo ? `上传中 ${uploadProgress}%` : '上传 mp4'}
              </button>
            </div>
          </div>

          {videoMessage ? (
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300">
              {videoMessage}
            </div>
          ) : null}

          {videoError ? (
            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300">
              {videoError}
            </div>
          ) : null}

          <div className="mt-5 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">显示名称</label>
                <input
                  value={videoEditor.display_name}
                  onChange={(event) => setVideoEditor((current) => ({ ...current, display_name: event.target.value }))}
                  placeholder="例如 animation.mp4"
                  className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">原始文件名</label>
                <input
                  value={videoEditor.original_name}
                  onChange={(event) => setVideoEditor((current) => ({ ...current, original_name: event.target.value }))}
                  placeholder="例如 animation-dual-stack.mp4"
                  className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">角色</label>
                <select
                  value={videoEditor.role}
                  onChange={(event) => setVideoEditor((current) => ({ ...current, role: event.target.value as VideoEditorState['role'] }))}
                  className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                >
                  <option value="animation">主动画</option>
                  <option value="alternate_animation">替代动画</option>
                  <option value="supplement">补充视频</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">排序</label>
                <input
                  type="number"
                  value={videoEditor.sort_order}
                  onChange={(event) => setVideoEditor((current) => ({ ...current, sort_order: Number(event.target.value) || 0 }))}
                  className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                />
              </div>
              <label className="flex items-end gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-950/60 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={videoEditor.is_primary}
                  onChange={(event) => setVideoEditor((current) => ({ ...current, is_primary: event.target.checked }))}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                />
                设为主视频
              </label>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">视频地址</label>
              <input
                value={videoEditor.storage_url}
                onChange={(event) => setVideoEditor((current) => ({ ...current, storage_url: event.target.value }))}
                placeholder="先上传 mp4，或粘贴已有媒体地址"
                className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">MIME Type</label>
                <input
                  value={videoEditor.mime_type}
                  onChange={(event) => setVideoEditor((current) => ({ ...current, mime_type: event.target.value }))}
                  placeholder="video/mp4"
                  className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">文件大小（字节）</label>
                <input
                  type="number"
                  value={videoEditor.size_bytes}
                  onChange={(event) => setVideoEditor((current) => ({ ...current, size_bytes: Number(event.target.value) || 0 }))}
                  className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {videoEditor.id ? (
                <button
                  type="button"
                  onClick={() => void handleDeleteVideo()}
                  disabled={deletingVideo}
                  className="btn btn-secondary text-rose-600 hover:text-rose-700 dark:text-rose-300"
                >
                  {deletingVideo ? '删除中...' : '删除视频'}
                </button>
              ) : null}
              <button type="button" onClick={() => void handleSaveVideo()} disabled={savingVideo || uploadingVideo} className="btn btn-primary">
                {savingVideo ? '保存中...' : videoEditor.id ? '保存视频记录' : '创建视频记录'}
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">视频预览</h3>
          <div className="mt-5 overflow-hidden rounded-2xl border border-gray-200 bg-gray-950 dark:border-gray-800">
            {videoEditor.storage_url ? (
              <video
                key={videoEditor.storage_url}
                src={videoEditor.storage_url}
                controls
                className="aspect-video w-full bg-black"
              />
            ) : (
              <div className="flex aspect-video items-center justify-center px-6 text-center text-sm text-gray-400">
                上传或填写视频地址后，这里会直接播放当前选中的 mp4。
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
