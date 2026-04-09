import { useEffect, useMemo, useRef, useState } from 'react';
import LoadingSpinner from '../../components/LoadingSpinner';
import Toast, { ToastType } from '../../components/ui/Toast';
import { notebooklmApi } from '../../api/notebooklm';
import { uploadApi } from '../../api';
import type {
  CreateNotebookLMImportJobInput,
  NotebookLMImportJob,
  NotebookLMImportJobStatus,
  NotebookLMNotebook,
  NotebookLMSourceType,
} from '../../types';

type SourceOption = {
  type: NotebookLMSourceType;
  label: string;
  eyebrow: string;
  description: string;
  hint: string;
};

const sourceOptions: SourceOption[] = [
  {
    type: 'web_url',
    label: '资源链接',
    eyebrow: 'Public Web',
    description: '把公开网页、论文、文章或在线视频链接登记成导入任务。',
    hint: '适合网页、文档落地页与后续可转成 NotebookLM web source 的内容。',
  },
  {
    type: 'local_file',
    label: '本地文件',
    eyebrow: 'Upload Once',
    description: '先把单个文件上传到博客后台，再为它创建一条 NotebookLM 导入任务。',
    hint: '当前支持 pdf、txt、epub、json、csv 与 mp4 等现有上传通道。',
  },
  {
    type: 'local_folder',
    label: '本地文件夹',
    eyebrow: 'Batch Intake',
    description: '记录一个文件夹的导入意图，为下一步的批量同步保留任务上下文。',
    hint: '这一版先登记文件夹清单与目标 Notebook，批量 artifact 上传可在下一阶段接入。',
  },
  {
    type: 'wechat_channel',
    label: '微信视频号',
    eyebrow: 'Desktop Relay',
    description: '不要求手机端拿链接，只要求你在桌面微信打开目标视频，然后交给本地采集代理。',
    hint: '这是系统重点路径：手机负责选内容，桌面负责实体化内容。',
  },
];

const statusTone: Record<NotebookLMImportJobStatus, string> = {
  created: 'bg-[rgba(28,28,28,0.06)] text-[#1c1c1c]',
  awaiting_capture: 'bg-[#f1e8d8] text-[#6b4b2a]',
  capturing: 'bg-[#efe3ff] text-[#5d2f95]',
  artifact_received: 'bg-[#e4f2eb] text-[#205c3b]',
  processing: 'bg-[#efe7dd] text-[#714d2e]',
  syncing_to_notebooklm: 'bg-[#e7ecff] text-[#31438c]',
  completed: 'bg-[#dff2e7] text-[#1d5f39]',
  completed_with_degradation: 'bg-[#fff0cf] text-[#7a5a10]',
  failed: 'bg-[#f9dddb] text-[#8f352e]',
  cancelled: 'bg-[rgba(28,28,28,0.08)] text-[#5f5f5d]',
};

const statusLabel: Record<NotebookLMImportJobStatus, string> = {
  created: '已创建',
  awaiting_capture: '等待采集',
  capturing: '采集中',
  artifact_received: '已收件',
  processing: '处理中',
  syncing_to_notebooklm: '同步中',
  completed: '已完成',
  completed_with_degradation: '降级完成',
  failed: '失败',
  cancelled: '已取消',
};

const notebookStatusLabel: Record<string, string> = {
  draft: '草稿',
  ready: '就绪',
  archived: '归档',
};

const captureEventLabel: Record<string, string> = {
  directory_hints: '目录探测',
  scan_preview: '扫描预览',
  candidate_found: '命中新文件',
  upload_completed: '上传完成',
  error: '异常',
};

const captureEventFilterOptions = [
  { value: 'all', label: '全部' },
  { value: 'directory_hints', label: '目录' },
  { value: 'candidate_found', label: '命中' },
  { value: 'upload_completed', label: '上传' },
  { value: 'error', label: '异常' },
] as const;

function formatDate(date?: string | null) {
  if (!date) {
    return '刚刚创建';
  }

  return new Date(date).toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
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

function getPayloadStringList(payload: Record<string, unknown> | undefined, key: string) {
  const value = payload?.[key];
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
}

function getPayloadObjectList(payload: Record<string, unknown> | undefined, key: string) {
  const value = payload?.[key];
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null);
}

function getPayloadString(payload: Record<string, unknown> | undefined, key: string) {
  const value = payload?.[key];
  return typeof value === 'string' ? value : '';
}

function getPayloadNumber(payload: Record<string, unknown> | undefined, key: string) {
  const value = payload?.[key];
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
}

function hasPayloadContent(payload: Record<string, unknown> | undefined) {
  return Boolean(payload && Object.keys(payload).length > 0);
}

function stringifyPayload(payload: Record<string, unknown> | undefined) {
  if (!payload || Object.keys(payload).length === 0) {
    return '';
  }
  return JSON.stringify(payload, null, 2);
}

function formatBytes(bytes?: number) {
  if (!bytes || Number.isNaN(bytes)) {
    return '0 B';
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function normalizeServerOrigin(rawBaseUrl?: string) {
  const fallback = 'http://localhost:3001';
  const trimmed = (rawBaseUrl || fallback).trim();

  if (!trimmed) {
    return fallback;
  }

  return trimmed.replace(/\/api\/?$/, '').replace(/\/$/, '');
}

export default function NotebookLMImportCenter() {
  const [notebooks, setNotebooks] = useState<NotebookLMNotebook[]>([]);
  const [jobs, setJobs] = useState<NotebookLMImportJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creatingNotebook, setCreatingNotebook] = useState(false);
  const [creatingJob, setCreatingJob] = useState(false);
  const [busyJobIds, setBusyJobIds] = useState<number[]>([]);
  const [selectedSourceType, setSelectedSourceType] = useState<NotebookLMSourceType>('wechat_channel');
  const [notebookTitle, setNotebookTitle] = useState('视频号学习资料');
  const [notebookDescription, setNotebookDescription] = useState('把网页、文件与视频号内容整理成一条可持续导入 NotebookLM 的管线。');
  const [selectedNotebookId, setSelectedNotebookId] = useState<number>(0);
  const [sourceLabel, setSourceLabel] = useState('');
  const [publicUrl, setPublicUrl] = useState('');
  const [wechatNote, setWechatNote] = useState('建议先转发到文件传输助手，再在电脑微信里打开并播放或点击“下载内容”。');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFolderFiles, setSelectedFolderFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedAgentJobId, setSelectedAgentJobId] = useState<number>(0);
  const [captureEventFilter, setCaptureEventFilter] = useState<string>('all');
  const [expandedEventIds, setExpandedEventIds] = useState<number[]>([]);
  const [toast, setToast] = useState<{ message: string; type: ToastType; isVisible: boolean }>({
    message: '',
    type: 'success',
    isVisible: false,
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  const serverOrigin = useMemo(
    () => normalizeServerOrigin(import.meta.env.VITE_API_BASE_URL),
    [],
  );
  const wechatJobs = useMemo(
    () => jobs.filter((job) => job.source_type === 'wechat_channel'),
    [jobs],
  );
  const preferredWechatJob = useMemo(
    () =>
      wechatJobs.find((job) => ['awaiting_capture', 'capturing', 'artifact_received', 'failed'].includes(job.status)) ||
      wechatJobs[0] ||
      null,
    [wechatJobs],
  );
  const activeWechatJob = useMemo(
    () => wechatJobs.find((job) => job.id === selectedAgentJobId) || preferredWechatJob,
    [preferredWechatJob, selectedAgentJobId, wechatJobs],
  );
  const activeWechatDirectoryEvent = useMemo(
    () =>
      activeWechatJob?.capture_events?.find(
        (event) => event.event_kind === 'directory_hints' || event.event_kind === 'scan_preview',
      ),
    [activeWechatJob],
  );
  const activeWechatCandidateEvent = useMemo(
    () => activeWechatJob?.capture_events?.find((event) => event.event_kind === 'candidate_found'),
    [activeWechatJob],
  );
  const activeWechatUploadEvent = useMemo(
    () => activeWechatJob?.capture_events?.find((event) => event.event_kind === 'upload_completed'),
    [activeWechatJob],
  );
  const activeWechatWatchDirs = useMemo(
    () => getPayloadStringList(activeWechatDirectoryEvent?.payload, 'watch_dirs'),
    [activeWechatDirectoryEvent],
  );
  const activeWechatPreviewFiles = useMemo(
    () => getPayloadObjectList(activeWechatDirectoryEvent?.payload, 'preview_files'),
    [activeWechatDirectoryEvent],
  );
  const quickStartCommand = useMemo(() => {
    if (!activeWechatJob) {
      return '';
    }

    return `cd /Users/smy/projects/blog/backend
NOTEBOOKLM_AGENT_TOKEN=your-token \\
go run ./cmd/local-capture-agent \\
  --server ${serverOrigin} \\
  --job-id ${activeWechatJob.id} \\
  --extensions .mp4,.mov,.m4v \\
  --watch-timeout 10m`;
  }, [activeWechatJob, serverOrigin]);
  const diagnosticCommand = useMemo(() => {
    if (!activeWechatJob) {
      return '';
    }

    return `cd /Users/smy/projects/blog/backend
NOTEBOOKLM_AGENT_TOKEN=your-token \\
go run ./cmd/local-capture-agent \\
  --server ${serverOrigin} \\
  --job-id ${activeWechatJob.id} \\
  --list-candidates \\
  --preview-existing 10`;
  }, [activeWechatJob, serverOrigin]);
  const guidedWatchCommand = useMemo(() => {
    if (!activeWechatJob || activeWechatWatchDirs.length === 0) {
      return '';
    }

    return `cd /Users/smy/projects/blog/backend
NOTEBOOKLM_AGENT_TOKEN=your-token \\
go run ./cmd/local-capture-agent \\
  --server ${serverOrigin} \\
  --job-id ${activeWechatJob.id} \\
  --watch-dirs ${activeWechatWatchDirs.join(',')} \\
  --extensions .mp4,.mov,.m4v \\
  --watch-timeout 10m`;
  }, [activeWechatJob, activeWechatWatchDirs, serverOrigin]);
  const candidateFilePath = useMemo(() => {
    const path = activeWechatCandidateEvent?.payload?.path;
    return typeof path === 'string' ? path : '';
  }, [activeWechatCandidateEvent]);
  const candidateFileSize = useMemo(
    () => getPayloadNumber(activeWechatCandidateEvent?.payload, 'size'),
    [activeWechatCandidateEvent],
  );
  const candidateFileModified = useMemo(
    () => getPayloadString(activeWechatCandidateEvent?.payload, 'modified'),
    [activeWechatCandidateEvent],
  );
  const candidateFileExtension = useMemo(
    () => getPayloadString(activeWechatCandidateEvent?.payload, 'extension'),
    [activeWechatCandidateEvent],
  );
  const uploadedFilePath = useMemo(() => {
    const path = activeWechatUploadEvent?.payload?.path;
    return typeof path === 'string' ? path : '';
  }, [activeWechatUploadEvent]);
  const uploadedFileSize = useMemo(
    () => getPayloadNumber(activeWechatUploadEvent?.payload, 'size'),
    [activeWechatUploadEvent],
  );
  const transcriptFallbackCommand = useMemo(() => {
    if (!activeWechatJob) {
      return '';
    }

    return `cd /Users/smy/projects/blog/backend
NOTEBOOKLM_AGENT_TOKEN=your-token \\
go run ./cmd/local-capture-agent \\
  --server ${serverOrigin} \\
  --job-id ${activeWechatJob.id} \\
  --text-file /absolute/path/to/transcript.md \\
  --artifact-kind transcript \\
  --mime-type 'text/markdown; charset=utf-8' \\
  --stage '已上传 transcript 兜底稿' \\
  --auto-sync`;
  }, [activeWechatJob, serverOrigin]);
  const directFileCommand = useMemo(() => {
    if (!activeWechatJob) {
      return '';
    }

    return `cd /Users/smy/projects/blog/backend
NOTEBOOKLM_AGENT_TOKEN=your-token \\
go run ./cmd/local-capture-agent \\
  --server ${serverOrigin} \\
  --job-id ${activeWechatJob.id} \\
  --file /absolute/path/to/video.mp4 \\
  --artifact-kind source_file \\
  --mime-type video/mp4 \\
  --stage '已上传现成 MP4 文件' \\
  --auto-sync`;
  }, [activeWechatJob, serverOrigin]);
  const filteredCaptureEvents = useMemo(() => {
    const events = activeWechatJob?.capture_events || [];
    if (captureEventFilter === 'all') {
      return events;
    }
    return events.filter((event) => event.event_kind === captureEventFilter);
  }, [activeWechatJob, captureEventFilter]);

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    if (wechatJobs.length === 0) {
      if (selectedAgentJobId !== 0) {
        setSelectedAgentJobId(0);
      }
      return;
    }

    const hasSelected = wechatJobs.some((job) => job.id === selectedAgentJobId);
    if (!hasSelected) {
      setSelectedAgentJobId(preferredWechatJob?.id || wechatJobs[0].id);
    }
  }, [preferredWechatJob, selectedAgentJobId, wechatJobs]);

  useEffect(() => {
    setCaptureEventFilter('all');
    setExpandedEventIds([]);
  }, [selectedAgentJobId]);

  async function loadData(isRefresh = false) {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const [notebookResponse, jobsResponse] = await Promise.all([
        notebooklmApi.getNotebooks(),
        notebooklmApi.getImportJobs({ page: 1, limit: 10 }),
      ]);

      if (!notebookResponse.success) {
        throw new Error(notebookResponse.error || '加载 Notebook 列表失败');
      }
      if (!jobsResponse.success) {
        throw new Error(jobsResponse.error || '加载导入任务失败');
      }

      const notebookItems = notebookResponse.data || [];
      const jobItems = jobsResponse.data.jobs || [];
      setNotebooks(notebookItems);
      setJobs(jobItems);

      if (!selectedNotebookId && notebookItems.length > 0) {
        setSelectedNotebookId(notebookItems[0].id);
      }
    } catch (error) {
      setToast({
        message: getErrorMessage(error, '加载 NotebookLM 导入中心失败'),
        type: 'error',
        isVisible: true,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleCreateNotebook(event: React.FormEvent) {
    event.preventDefault();
    if (!notebookTitle.trim()) {
      setToast({ message: '请输入 Notebook 标题', type: 'warning', isVisible: true });
      return;
    }

    try {
      setCreatingNotebook(true);
      const response = await notebooklmApi.createNotebook({
        title: notebookTitle.trim(),
        description: notebookDescription.trim(),
      });

      if (!response.success) {
        throw new Error(response.error || '创建 Notebook 失败');
      }

      const notebook = response.data;
      setNotebooks((current) => [notebook, ...current]);
      setSelectedNotebookId(notebook.id);
      setToast({
        message: response.message || 'Notebook 已创建',
        type: 'success',
        isVisible: true,
      });
    } catch (error) {
      setToast({
        message: getErrorMessage(error, '创建 Notebook 失败'),
        type: 'error',
        isVisible: true,
      });
    } finally {
      setCreatingNotebook(false);
    }
  }

  async function handleCreateImportJob(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedNotebookId) {
      setToast({ message: '请先选择目标 Notebook', type: 'warning', isVisible: true });
      return;
    }

    try {
      setCreatingJob(true);

      let payload: CreateNotebookLMImportJobInput = {
        notebook_id: selectedNotebookId,
        source_type: selectedSourceType,
        source_label: sourceLabel.trim() || getFallbackLabel(),
        source_input: {},
      };

      if (selectedSourceType === 'web_url') {
        if (!publicUrl.trim()) {
          throw new Error('请输入公开资源链接');
        }

        payload = {
          ...payload,
          source_label: sourceLabel.trim() || publicUrl.trim(),
          source_input: {
            public_url: publicUrl.trim(),
          },
        };
      }

      if (selectedSourceType === 'local_file') {
        if (!selectedFile) {
          throw new Error('请先选择一个本地文件');
        }

        const uploadResponse = await uploadApi.uploadFile(selectedFile, setUploadProgress, 120000);
        if (!uploadResponse.success) {
          const uploadError = 'error' in uploadResponse && typeof uploadResponse.error === 'string'
            ? uploadResponse.error
            : '上传本地文件失败';
          throw new Error(uploadError);
        }

        payload = {
          ...payload,
          source_label: sourceLabel.trim() || selectedFile.name,
          source_input: {
            uploaded_url: uploadResponse.data.url,
            filename: uploadResponse.data.filename,
            original_name: selectedFile.name,
            size: selectedFile.size,
            mime_type: selectedFile.type || 'application/octet-stream',
          },
        };
      }

      if (selectedSourceType === 'local_folder') {
        if (selectedFolderFiles.length === 0) {
          throw new Error('请先选择一个本地文件夹');
        }

        payload = {
          ...payload,
          source_label: sourceLabel.trim() || `文件夹导入 (${selectedFolderFiles.length} 个文件)`,
          source_input: {
            file_count: selectedFolderFiles.length,
            sample_files: selectedFolderFiles.slice(0, 12).map((file) => file.webkitRelativePath || file.name),
          },
        };
      }

      if (selectedSourceType === 'wechat_channel') {
        payload = {
          ...payload,
          source_label: sourceLabel.trim() || '微信视频号导入任务',
          capture_mode: 'desktop_watch',
          source_input: {
            entry_mode: 'desktop_watch',
            note: wechatNote.trim(),
          },
        };
      }

      const response = await notebooklmApi.createImportJob(payload);
      if (!response.success) {
        throw new Error(response.error || '创建导入任务失败');
      }

      let nextJob = response.data;
      let toastMessage =
        payload.source_type === 'web_url' || payload.source_type === 'local_file'
          ? '导入任务已创建，并已尝试同步到 NotebookLM'
          : response.message || '导入任务已创建';
      let toastType: ToastType = 'success';
      setJobs((current) => [nextJob, ...current.filter((job) => job.id !== nextJob.id)].slice(0, 10));

      if (payload.source_type === 'web_url' || payload.source_type === 'local_file') {
        setBusyJobIds((current) => [...current, nextJob.id]);
        try {
          const syncResponse = await notebooklmApi.syncImportJob(nextJob.id);
          if (!syncResponse.success) {
            throw new Error(syncResponse.error || '同步到 NotebookLM 失败');
          }
          nextJob = syncResponse.data;
          setJobs((current) => current.map((job) => (job.id === nextJob.id ? nextJob : job)));
        } catch (syncError) {
          toastMessage = `任务已创建，但自动同步失败：${getErrorMessage(syncError, '请稍后重试')}`;
          toastType = 'warning';
        } finally {
          setBusyJobIds((current) => current.filter((id) => id !== nextJob.id));
        }
      }

      resetJobForm(payload.source_type);
      setToast({
        message: toastMessage,
        type: toastType,
        isVisible: true,
      });
    } catch (error) {
      setToast({
        message: getErrorMessage(error, '创建导入任务失败'),
        type: 'error',
        isVisible: true,
      });
    } finally {
      setCreatingJob(false);
      setUploadProgress(0);
    }
  }

  async function handleRetryJob(jobId: number) {
    try {
      setBusyJobIds((current) => [...current, jobId]);
      const response = await notebooklmApi.retryImportJob(jobId);
      if (!response.success) {
        throw new Error(response.error || '重试导入任务失败');
      }

      setJobs((current) => current.map((job) => (job.id === jobId ? response.data : job)));
      setToast({
        message: response.message || '导入任务已重置',
        type: 'success',
        isVisible: true,
      });
    } catch (error) {
      setToast({
        message: getErrorMessage(error, '重试导入任务失败'),
        type: 'error',
        isVisible: true,
      });
    } finally {
      setBusyJobIds((current) => current.filter((id) => id !== jobId));
    }
  }

  async function handleSyncJob(jobId: number) {
    try {
      setBusyJobIds((current) => [...current, jobId]);
      const response = await notebooklmApi.syncImportJob(jobId);
      if (!response.success) {
        throw new Error(response.error || '同步到 NotebookLM 失败');
      }

      setJobs((current) => current.map((job) => (job.id === jobId ? response.data : job)));
      setToast({
        message: response.message || '导入任务已同步到 NotebookLM',
        type: 'success',
        isVisible: true,
      });
    } catch (error) {
      setToast({
        message: getErrorMessage(error, '同步到 NotebookLM 失败'),
        type: 'error',
        isVisible: true,
      });
    } finally {
      setBusyJobIds((current) => current.filter((id) => id !== jobId));
    }
  }

  async function handleCopyText(value: string, successMessage: string) {
    if (!value.trim()) {
      setToast({ message: '当前还没有可复制的命令', type: 'warning', isVisible: true });
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      setToast({ message: successMessage, type: 'success', isVisible: true });
    } catch {
      setToast({ message: '复制失败，请检查浏览器剪贴板权限', type: 'error', isVisible: true });
    }
  }

  function toggleExpandedEvent(eventId: number) {
    setExpandedEventIds((current) =>
      current.includes(eventId) ? current.filter((id) => id !== eventId) : [...current, eventId],
    );
  }

  function resetJobForm(sourceType: NotebookLMSourceType) {
    setSourceLabel('');
    if (sourceType === 'web_url') {
      setPublicUrl('');
    }
    if (sourceType === 'local_file') {
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
    if (sourceType === 'local_folder') {
      setSelectedFolderFiles([]);
      if (folderInputRef.current) {
        folderInputRef.current.value = '';
      }
    }
  }

  function getFallbackLabel() {
    switch (selectedSourceType) {
      case 'web_url':
        return '公开资源链接';
      case 'local_file':
        return selectedFile?.name || '本地文件';
      case 'local_folder':
        return `本地文件夹 (${selectedFolderFiles.length} 个文件)`;
      case 'wechat_channel':
        return '微信视频号导入任务';
      default:
        return 'NotebookLM 导入任务';
    }
  }

  const selectedSource = useMemo(
    () => sourceOptions.find((option) => option.type === selectedSourceType) || sourceOptions[0],
    [selectedSourceType],
  );

  const completedJobs = jobs.filter((job) => job.status === 'completed' || job.status === 'completed_with_degradation').length;
  const awaitingJobs = jobs.filter((job) => job.status === 'awaiting_capture').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <>
      <div
        className="min-h-screen p-6 text-[#1c1c1c] dark:text-[#f4eee3]"
        style={{
          background:
            'radial-gradient(circle at top left, rgba(255, 205, 164, 0.18), transparent 26%), radial-gradient(circle at top right, rgba(145, 162, 255, 0.12), transparent 24%), #f7f4ed',
          fontFamily: 'Camera Plain Variable, ui-sans-serif, system-ui',
        }}
      >
        <div className="mx-auto flex max-w-7xl flex-col gap-6">
          <section className="overflow-hidden rounded-[28px] border border-[#eceae4] bg-[#fcfbf8] px-6 py-8 shadow-[rgba(0,0,0,0.03)_0px_18px_44px]">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(28,28,28,0.12)] bg-[rgba(28,28,28,0.03)] px-3 py-1 text-xs uppercase tracking-[0.22em] text-[#5f5f5d]">
                  NotebookLM Intake
                </div>
                <h1 className="mt-5 max-w-4xl text-[clamp(2.8rem,5vw,4.25rem)] font-semibold leading-[0.96] tracking-[-0.045em] text-[#1c1c1c]">
                  把链接、文件和视频号内容，整理成一条真正可持续的导入管线。
                </h1>
                <p className="mt-4 max-w-2xl text-[1.02rem] leading-7 text-[rgba(28,28,28,0.82)]">
                  这里不再假设你必须先拿到视频号链接。导入中心的工作是先把内容实体化，再把它推进 NotebookLM。
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[360px]">
                <div className="rounded-[20px] border border-[#eceae4] bg-[#f7f4ed] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#5f5f5d]">Notebooks</p>
                  <p className="mt-2 text-3xl font-semibold tracking-[-0.04em]">{notebooks.length}</p>
                </div>
                <div className="rounded-[20px] border border-[#eceae4] bg-[#f7f4ed] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#5f5f5d]">Completed</p>
                  <p className="mt-2 text-3xl font-semibold tracking-[-0.04em]">{completedJobs}</p>
                </div>
                <div className="rounded-[20px] border border-[#eceae4] bg-[#f7f4ed] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#5f5f5d]">Awaiting Capture</p>
                  <p className="mt-2 text-3xl font-semibold tracking-[-0.04em]">{awaitingJobs}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.15fr_1fr]">
            <div className="rounded-[28px] border border-[#eceae4] bg-[#fcfbf8] p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[#5f5f5d]">Notebook Register</p>
                  <h2 className="mt-3 text-[clamp(1.7rem,2.4vw,2.5rem)] font-semibold tracking-[-0.035em]">
                    先确定内容落到哪个知识容器里
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => void loadData(true)}
                  className="inline-flex items-center rounded-full border border-[rgba(28,28,28,0.22)] px-4 py-2 text-sm text-[#1c1c1c] transition hover:bg-[rgba(28,28,28,0.04)]"
                >
                  {refreshing ? '刷新中...' : '刷新数据'}
                </button>
              </div>

              <form onSubmit={handleCreateNotebook} className="mt-6 grid gap-4">
                <label className="grid gap-2">
                  <span className="text-sm text-[#5f5f5d]">Notebook 标题</span>
                  <input
                    value={notebookTitle}
                    onChange={(event) => setNotebookTitle(event.target.value)}
                    placeholder="例如：视频号学习资料"
                    className="rounded-2xl border border-[#eceae4] bg-[#f7f4ed] px-4 py-3 text-base outline-none transition focus:border-[rgba(28,28,28,0.4)] focus:shadow-[rgba(0,0,0,0.1)_0px_4px_12px]"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm text-[#5f5f5d]">用途说明</span>
                  <textarea
                    value={notebookDescription}
                    onChange={(event) => setNotebookDescription(event.target.value)}
                    rows={3}
                    className="rounded-2xl border border-[#eceae4] bg-[#f7f4ed] px-4 py-3 text-base outline-none transition focus:border-[rgba(28,28,28,0.4)] focus:shadow-[rgba(0,0,0,0.1)_0px_4px_12px]"
                  />
                </label>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={creatingNotebook}
                    className="inline-flex items-center justify-center rounded-2xl bg-[#1c1c1c] px-5 py-3 text-sm text-[#fcfbf8] shadow-[rgba(255,255,255,0.2)_0px_0.5px_0px_0px_inset,rgba(0,0,0,0.2)_0px_0px_0px_0.5px_inset,rgba(0,0,0,0.05)_0px_1px_2px_0px] transition hover:opacity-90 disabled:opacity-60"
                  >
                    {creatingNotebook ? '创建中...' : '新建 Notebook'}
                  </button>
                  <div className="inline-flex items-center rounded-2xl border border-[#eceae4] bg-[#f7f4ed] px-4 py-3 text-sm text-[#5f5f5d]">
                    当前已登记 {notebooks.length} 个 notebook
                  </div>
                </div>
              </form>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {notebooks.length === 0 ? (
                  <div className="rounded-[22px] border border-dashed border-[#d7d2c8] bg-[#f7f4ed] px-5 py-6 text-sm text-[#5f5f5d] sm:col-span-2">
                    还没有 Notebook。先创建一个，再开始导入任务。
                  </div>
                ) : (
                  notebooks.map((notebook) => (
                    <button
                      key={notebook.id}
                      type="button"
                      onClick={() => setSelectedNotebookId(notebook.id)}
                      className={`rounded-[22px] border p-4 text-left transition ${
                        selectedNotebookId === notebook.id
                          ? 'border-[rgba(28,28,28,0.4)] bg-[#f7f4ed] shadow-[rgba(0,0,0,0.08)_0px_10px_24px]'
                          : 'border-[#eceae4] bg-[#fcfbf8] hover:bg-[#f7f4ed]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-lg font-semibold tracking-[-0.02em]">{notebook.title}</p>
                          <p className="mt-1 text-sm leading-6 text-[#5f5f5d]">
                            {notebook.description || '暂未填写说明'}
                          </p>
                        </div>
                        <span className="rounded-full bg-[rgba(28,28,28,0.05)] px-3 py-1 text-xs text-[#5f5f5d]">
                          {notebookStatusLabel[notebook.status] || notebook.status}
                        </span>
                      </div>
                      <p className="mt-4 text-xs uppercase tracking-[0.16em] text-[#5f5f5d]">
                        更新于 {formatDate(notebook.updated_at)}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-[28px] border border-[#eceae4] bg-[#fcfbf8] p-6">
              <p className="text-xs uppercase tracking-[0.18em] text-[#5f5f5d]">Source Model</p>
              <h2 className="mt-3 text-[clamp(1.7rem,2.4vw,2.5rem)] font-semibold tracking-[-0.035em]">
                导入类型不再围绕“先拿链接”
              </h2>
              <div className="mt-6 grid gap-3">
                {sourceOptions.map((option) => (
                  <button
                    key={option.type}
                    type="button"
                    onClick={() => setSelectedSourceType(option.type)}
                    className={`rounded-[22px] border p-4 text-left transition ${
                      option.type === selectedSourceType
                        ? 'border-[rgba(28,28,28,0.4)] bg-[#f7f4ed]'
                        : 'border-[#eceae4] bg-[#fcfbf8] hover:bg-[#f7f4ed]'
                    }`}
                  >
                    <p className="text-xs uppercase tracking-[0.18em] text-[#5f5f5d]">{option.eyebrow}</p>
                    <p className="mt-2 text-lg font-semibold tracking-[-0.02em]">{option.label}</p>
                    <p className="mt-2 text-sm leading-6 text-[rgba(28,28,28,0.82)]">{option.description}</p>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.15fr_1fr]">
            <form onSubmit={handleCreateImportJob} className="rounded-[28px] border border-[#eceae4] bg-[#fcfbf8] p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[#5f5f5d]">{selectedSource.eyebrow}</p>
                  <h2 className="mt-3 text-[clamp(1.7rem,2.4vw,2.5rem)] font-semibold tracking-[-0.035em]">
                    {selectedSource.label} 导入任务
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-7 text-[rgba(28,28,28,0.82)]">
                    {selectedSource.hint}
                  </p>
                </div>
                <div className="rounded-2xl border border-[#eceae4] bg-[#f7f4ed] px-4 py-3 text-sm text-[#5f5f5d]">
                  目标 Notebook：{notebooks.find((notebook) => notebook.id === selectedNotebookId)?.title || '未选择'}
                </div>
              </div>

              <div className="mt-6 grid gap-4">
                <label className="grid gap-2">
                  <span className="text-sm text-[#5f5f5d]">目标 Notebook</span>
                  <select
                    value={selectedNotebookId}
                    onChange={(event) => setSelectedNotebookId(Number(event.target.value))}
                    className="rounded-2xl border border-[#eceae4] bg-[#f7f4ed] px-4 py-3 outline-none transition focus:border-[rgba(28,28,28,0.4)] focus:shadow-[rgba(0,0,0,0.1)_0px_4px_12px]"
                  >
                    <option value={0}>请选择 Notebook</option>
                    {notebooks.map((notebook) => (
                      <option key={notebook.id} value={notebook.id}>
                        {notebook.title}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className="text-sm text-[#5f5f5d]">资源标题</span>
                  <input
                    value={sourceLabel}
                    onChange={(event) => setSourceLabel(event.target.value)}
                    placeholder="给这次导入起一个易识别的名字"
                    className="rounded-2xl border border-[#eceae4] bg-[#f7f4ed] px-4 py-3 text-base outline-none transition focus:border-[rgba(28,28,28,0.4)] focus:shadow-[rgba(0,0,0,0.1)_0px_4px_12px]"
                  />
                </label>

                {selectedSourceType === 'web_url' ? (
                  <label className="grid gap-2">
                    <span className="text-sm text-[#5f5f5d]">公开链接</span>
                    <input
                      value={publicUrl}
                      onChange={(event) => setPublicUrl(event.target.value)}
                      placeholder="https://..."
                      className="rounded-2xl border border-[#eceae4] bg-[#f7f4ed] px-4 py-3 text-base outline-none transition focus:border-[rgba(28,28,28,0.4)] focus:shadow-[rgba(0,0,0,0.1)_0px_4px_12px]"
                    />
                  </label>
                ) : null}

                {selectedSourceType === 'local_file' ? (
                  <div className="grid gap-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={(event) => {
                        const nextFile = event.target.files?.[0] || null;
                        setSelectedFile(nextFile);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center justify-between rounded-[22px] border border-[#eceae4] bg-[#f7f4ed] px-4 py-4 text-left transition hover:border-[rgba(28,28,28,0.3)]"
                    >
                      <div>
                        <p className="text-base font-medium">{selectedFile ? selectedFile.name : '选择一个本地文件'}</p>
                        <p className="mt-1 text-sm text-[#5f5f5d]">
                          {selectedFile ? `${Math.round(selectedFile.size / 1024)} KB · ${selectedFile.type || 'unknown'}` : '支持直接沿用现有上传接口'}
                        </p>
                      </div>
                      <span className="rounded-full border border-[rgba(28,28,28,0.2)] px-3 py-1 text-xs text-[#5f5f5d]">选择文件</span>
                    </button>
                    {creatingJob && uploadProgress > 0 ? (
                      <div className="rounded-2xl border border-[#eceae4] bg-[#f7f4ed] p-4">
                        <div className="flex items-center justify-between text-sm text-[#5f5f5d]">
                          <span>上传进度</span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[rgba(28,28,28,0.08)]">
                          <div
                            className="h-full rounded-full bg-[#1c1c1c] transition-all"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {selectedSourceType === 'local_folder' ? (
                  <div className="grid gap-3">
                    <input
                      ref={folderInputRef}
                      type="file"
                      // @ts-expect-error webkitdirectory is non-standard but supported by Chromium-based browsers
                      webkitdirectory=""
                      multiple
                      className="hidden"
                      onChange={(event) => {
                        const files = Array.from(event.target.files || []);
                        setSelectedFolderFiles(files);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => folderInputRef.current?.click()}
                      className="flex items-center justify-between rounded-[22px] border border-[#eceae4] bg-[#f7f4ed] px-4 py-4 text-left transition hover:border-[rgba(28,28,28,0.3)]"
                    >
                      <div>
                        <p className="text-base font-medium">
                          {selectedFolderFiles.length > 0 ? `已选择 ${selectedFolderFiles.length} 个文件` : '选择一个本地文件夹'}
                        </p>
                        <p className="mt-1 text-sm text-[#5f5f5d]">
                          当前阶段会先登记文件清单与目标 Notebook，上线批量 artifact 上传前不会逐个同步。
                        </p>
                      </div>
                      <span className="rounded-full border border-[rgba(28,28,28,0.2)] px-3 py-1 text-xs text-[#5f5f5d]">选择文件夹</span>
                    </button>
                    {selectedFolderFiles.length > 0 ? (
                      <div className="rounded-[22px] border border-[#eceae4] bg-[#fcfbf8] p-4">
                        <p className="text-sm text-[#5f5f5d]">清单预览</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {selectedFolderFiles.slice(0, 8).map((file) => (
                            <span
                              key={file.webkitRelativePath || file.name}
                              className="rounded-full bg-[rgba(28,28,28,0.05)] px-3 py-1 text-xs text-[#5f5f5d]"
                            >
                              {file.webkitRelativePath || file.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {selectedSourceType === 'wechat_channel' ? (
                  <label className="grid gap-2">
                    <span className="text-sm text-[#5f5f5d]">桌面接力说明</span>
                    <textarea
                      value={wechatNote}
                      onChange={(event) => setWechatNote(event.target.value)}
                      rows={4}
                      className="rounded-2xl border border-[#eceae4] bg-[#f7f4ed] px-4 py-3 text-base outline-none transition focus:border-[rgba(28,28,28,0.4)] focus:shadow-[rgba(0,0,0,0.1)_0px_4px_12px]"
                    />
                  </label>
                ) : null}
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={creatingJob}
                  className="inline-flex items-center justify-center rounded-2xl bg-[#1c1c1c] px-5 py-3 text-sm text-[#fcfbf8] shadow-[rgba(255,255,255,0.2)_0px_0.5px_0px_0px_inset,rgba(0,0,0,0.2)_0px_0px_0px_0.5px_inset,rgba(0,0,0,0.05)_0px_1px_2px_0px] transition hover:opacity-90 disabled:opacity-60"
                >
                  {creatingJob ? '创建任务中...' : '创建导入任务'}
                </button>
                <div className="inline-flex items-center rounded-2xl border border-[#eceae4] bg-[#f7f4ed] px-4 py-3 text-sm text-[#5f5f5d]">
                  微信视频号任务会进入“等待桌面采集”；链接和本地文件会在创建后立即尝试同步。
                </div>
              </div>
            </form>

            <aside className="rounded-[28px] border border-[#eceae4] bg-[#fcfbf8] p-6">
              <p className="text-xs uppercase tracking-[0.18em] text-[#5f5f5d]">Wechat Workflow</p>
              <h2 className="mt-3 text-[clamp(1.7rem,2.4vw,2.5rem)] font-semibold tracking-[-0.035em]">
                手机拿不到链接时，系统怎么接住这件事
              </h2>
              <div className="mt-6 grid gap-3">
                {[
                  '手机端只需要转发到文件传输助手或收藏，不需要先拿链接。',
                  '在电脑微信中打开视频，播放一次或点击“下载内容”。',
                  '本地采集代理监听新的文件副作用，再把结果交给后台任务系统。',
                  '如果拿不到原视频，也要尽量产出 transcript，而不是让整个任务失败。',
                ].map((step, index) => (
                  <div key={step} className="rounded-[22px] border border-[#eceae4] bg-[#f7f4ed] px-4 py-4">
                    <div className="flex gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1c1c1c] text-sm text-[#fcfbf8]">
                        {index + 1}
                      </div>
                      <p className="text-sm leading-7 text-[rgba(28,28,28,0.82)]">{step}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-[24px] border border-[#eceae4] bg-[linear-gradient(180deg,rgba(252,251,248,0.96),rgba(244,239,229,0.95))] p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-[#1c1c1c]">Agent 配置卡片</p>
                    <p className="mt-2 text-sm leading-6 text-[#5f5f5d]">
                      这里会联动最近的视频号任务，直接生成当前 job 的启动命令，而不是继续给你一段静态模板。
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void loadData(true)}
                    className="inline-flex items-center justify-center rounded-full border border-[rgba(28,28,28,0.12)] bg-[#fcfbf8] px-3 py-2 text-xs text-[#5f5f5d] transition hover:border-[rgba(28,28,28,0.25)] hover:text-[#1c1c1c]"
                  >
                    刷新任务线索
                  </button>
                </div>

                {wechatJobs.length > 0 && activeWechatJob ? (
                  <div className="mt-4 space-y-4">
                    <div className="rounded-[20px] border border-[#e7e1d6] bg-[#fcfbf8] p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                        <label className="grid gap-2 lg:min-w-[220px]">
                          <span className="text-xs uppercase tracking-[0.16em] text-[#8a867f]">Active Job</span>
                          <select
                            value={activeWechatJob.id}
                            onChange={(event) => setSelectedAgentJobId(Number(event.target.value))}
                            className="rounded-2xl border border-[#eceae4] bg-[#f7f4ed] px-4 py-3 text-sm text-[#1c1c1c] outline-none transition focus:border-[rgba(28,28,28,0.35)]"
                          >
                            {wechatJobs.map((job) => (
                              <option key={job.id} value={job.id}>
                                #{job.id} · {job.source_label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <div className="flex flex-wrap gap-2 text-xs text-[#5f5f5d]">
                          <span className="rounded-full bg-[rgba(28,28,28,0.06)] px-3 py-1">
                            状态：{statusLabel[activeWechatJob.status] || activeWechatJob.status}
                          </span>
                          <span className="rounded-full bg-[rgba(28,28,28,0.06)] px-3 py-1">
                            Notebook：{activeWechatJob.notebook?.title || `#${activeWechatJob.notebook_id}`}
                          </span>
                          <span className="rounded-full bg-[rgba(28,28,28,0.06)] px-3 py-1">
                            进度：{activeWechatJob.progress}%
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-[18px] border border-[#eceae4] bg-[#f7f4ed] px-4 py-4">
                          <p className="text-xs uppercase tracking-[0.16em] text-[#8a867f]">Server</p>
                          <p className="mt-2 text-sm font-medium text-[#1c1c1c]">{serverOrigin}</p>
                          <p className="mt-2 text-xs leading-6 text-[#5f5f5d]">
                            桌面 agent 会把采集结果回传到这里；默认沿用 `VITE_API_BASE_URL`，否则回退到本地 3001。
                          </p>
                        </div>
                        <div className="rounded-[18px] border border-[#eceae4] bg-[#f7f4ed] px-4 py-4">
                          <p className="text-xs uppercase tracking-[0.16em] text-[#8a867f]">Token</p>
                          <p className="mt-2 text-sm font-medium text-[#1c1c1c]">NOTEBOOKLM_AGENT_TOKEN</p>
                          <p className="mt-2 text-xs leading-6 text-[#5f5f5d]">
                            前端不会回显真实 token。命令里保留 `your-token` 占位，只要替换成和后端环境变量一致的值即可。
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[20px] border border-[#e7e1d6] bg-[#1c1c1c] p-4 text-[#fcfbf8]">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-[rgba(252,251,248,0.68)]">Quick Start</p>
                          <p className="mt-2 text-sm leading-6 text-[rgba(252,251,248,0.82)]">
                            这是当前任务最短可执行的启动命令。默认让 agent 自动探测 `Downloads` 和常见微信目录。
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleCopyText(quickStartCommand, '已复制 agent 启动命令')}
                          className="inline-flex items-center justify-center rounded-full border border-[rgba(252,251,248,0.2)] px-3 py-2 text-xs text-[#fcfbf8] transition hover:bg-[rgba(252,251,248,0.08)]"
                        >
                          复制命令
                        </button>
                      </div>
                      <pre className="mt-4 overflow-x-auto rounded-2xl bg-[rgba(252,251,248,0.06)] px-4 py-4 text-xs leading-6 text-[#fcfbf8]">
{quickStartCommand}
                      </pre>
                    </div>

                    <div className="grid gap-3 xl:grid-cols-3">
                      <div className="rounded-[20px] border border-[#eceae4] bg-[#fcfbf8] p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-xs uppercase tracking-[0.18em] text-[#8a867f]">Diagnostic</p>
                            <p className="mt-2 text-sm leading-6 text-[#5f5f5d]">
                              如果你先想确认 agent 会命中哪些目录，就先跑这一条。它只打印候选目录和预览，不会开始监听。
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => void handleCopyText(diagnosticCommand, '已复制目录诊断命令')}
                            className="inline-flex items-center justify-center rounded-full border border-[rgba(28,28,28,0.12)] px-3 py-2 text-xs text-[#5f5f5d] transition hover:border-[rgba(28,28,28,0.25)] hover:text-[#1c1c1c]"
                          >
                            复制诊断命令
                          </button>
                        </div>
                        <pre className="mt-4 overflow-x-auto rounded-2xl bg-[#1c1c1c] px-4 py-4 text-xs leading-6 text-[#fcfbf8]">
{diagnosticCommand}
                        </pre>
                      </div>

                      <div className="rounded-[20px] border border-[#eceae4] bg-[#fcfbf8] p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-xs uppercase tracking-[0.18em] text-[#8a867f]">MP4 Direct Upload</p>
                            <p className="mt-2 text-sm leading-6 text-[#5f5f5d]">
                              如果你手里已经有现成的 `mp4`，就跳过监听，直接把视频文件推进当前 job。
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => void handleCopyText(directFileCommand, '已复制 MP4 直传命令')}
                            className="inline-flex items-center justify-center rounded-full border border-[rgba(28,28,28,0.12)] px-3 py-2 text-xs text-[#5f5f5d] transition hover:border-[rgba(28,28,28,0.25)] hover:text-[#1c1c1c]"
                          >
                            复制 MP4 命令
                          </button>
                        </div>
                        <pre className="mt-4 overflow-x-auto rounded-2xl bg-[#1c1c1c] px-4 py-4 text-xs leading-6 text-[#fcfbf8]">
{directFileCommand}
                        </pre>
                      </div>

                      <div className="rounded-[20px] border border-[#eceae4] bg-[#fcfbf8] p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-xs uppercase tracking-[0.18em] text-[#8a867f]">Transcript Fallback</p>
                            <p className="mt-2 text-sm leading-6 text-[#5f5f5d]">
                              如果原视频拿不到，就把已经整理好的 transcript 或笔记稿直接上传给当前 job，保证 NotebookLM 先有可理解材料。
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => void handleCopyText(transcriptFallbackCommand, '已复制 transcript 上传命令')}
                            className="inline-flex items-center justify-center rounded-full border border-[rgba(28,28,28,0.12)] px-3 py-2 text-xs text-[#5f5f5d] transition hover:border-[rgba(28,28,28,0.25)] hover:text-[#1c1c1c]"
                          >
                            复制 transcript 命令
                          </button>
                        </div>
                        <pre className="mt-4 overflow-x-auto rounded-2xl bg-[#1c1c1c] px-4 py-4 text-xs leading-6 text-[#fcfbf8]">
{transcriptFallbackCommand}
                        </pre>
                      </div>
                    </div>

                    {activeWechatWatchDirs.length > 0 ? (
                      <div className="rounded-[20px] border border-[#e7e1d6] bg-[#fcfbf8] p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-xs uppercase tracking-[0.18em] text-[#8a867f]">Guided Directories</p>
                            <p className="mt-2 text-sm leading-6 text-[#5f5f5d]">
                              这些目录来自 agent 最近一次目录探测。如果自动探测不稳定，可以直接用显式目录版命令。
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => void handleCopyText(guidedWatchCommand, '已复制带目录的 agent 命令')}
                            className="inline-flex items-center justify-center rounded-full border border-[rgba(28,28,28,0.12)] px-3 py-2 text-xs text-[#5f5f5d] transition hover:border-[rgba(28,28,28,0.25)] hover:text-[#1c1c1c]"
                          >
                            复制显式目录命令
                          </button>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {activeWechatWatchDirs.slice(0, 6).map((dir) => (
                            <span
                              key={dir}
                              className="rounded-full bg-[rgba(28,28,28,0.05)] px-3 py-1 text-xs text-[#5f5f5d]"
                            >
                              {dir}
                            </span>
                          ))}
                        </div>

                        <pre className="mt-4 overflow-x-auto rounded-2xl bg-[#1c1c1c] px-4 py-4 text-xs leading-6 text-[#fcfbf8]">
{guidedWatchCommand}
                        </pre>
                      </div>
                    ) : null}

                    <div className="grid gap-3 lg:grid-cols-[1.1fr,0.9fr]">
                      <div className="rounded-[20px] border border-[#eceae4] bg-[#fcfbf8] p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-xs uppercase tracking-[0.18em] text-[#8a867f]">最近事件</p>
                            <p className="mt-2 text-sm leading-6 text-[#5f5f5d]">
                              按阶段筛选桌面 agent 的时间线，快速区分“目录问题”“命中问题”还是“上传问题”。
                            </p>
                          </div>
                          <div className="rounded-full bg-[rgba(28,28,28,0.05)] px-3 py-1 text-xs text-[#5f5f5d]">
                            {filteredCaptureEvents.length} 条
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {captureEventFilterOptions.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => setCaptureEventFilter(option.value)}
                              className={`rounded-full px-3 py-2 text-xs transition ${
                                captureEventFilter === option.value
                                  ? 'bg-[#1c1c1c] text-[#fcfbf8]'
                                  : 'border border-[rgba(28,28,28,0.12)] text-[#5f5f5d] hover:border-[rgba(28,28,28,0.25)] hover:text-[#1c1c1c]'
                              }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>

                        <div className="mt-3 grid gap-2">
                          {filteredCaptureEvents.length > 0 ? (
                            filteredCaptureEvents.slice(0, 8).map((event) => (
                              <div
                                key={event.id}
                                className={`rounded-[18px] border px-4 py-3 ${
                                  event.event_kind === 'error'
                                    ? 'border-[#ead2cf] bg-[#fff5f4]'
                                    : 'border-[#eceae4] bg-[#f7f4ed]'
                                }`}
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="rounded-full bg-[rgba(28,28,28,0.06)] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-[#5f5f5d]">
                                      {captureEventLabel[event.event_kind] || event.event_kind}
                                    </span>
                                    <span className="text-xs text-[#8a867f]">{formatDate(event.created_at)}</span>
                                  </div>
                                  {hasPayloadContent(event.payload) ? (
                                    <button
                                      type="button"
                                      onClick={() => toggleExpandedEvent(event.id)}
                                      className="text-xs text-[#5f5f5d] underline decoration-[rgba(28,28,28,0.22)] underline-offset-4 transition hover:text-[#1c1c1c]"
                                    >
                                      {expandedEventIds.includes(event.id) ? '收起详情' : '展开详情'}
                                    </button>
                                  ) : null}
                                </div>
                                <p className="mt-2 text-sm leading-6 text-[#1c1c1c]">
                                  {event.summary || '桌面 agent 上报了一条新的线索'}
                                </p>
                                {expandedEventIds.includes(event.id) && hasPayloadContent(event.payload) ? (
                                  <div className="mt-3 rounded-2xl border border-[rgba(28,28,28,0.08)] bg-[rgba(28,28,28,0.04)] px-3 py-3">
                                    {getPayloadString(event.payload, 'error') ? (
                                      <p className="text-sm leading-6 text-[#8f352e]">
                                        {getPayloadString(event.payload, 'error')}
                                      </p>
                                    ) : null}
                                    <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all text-xs leading-6 text-[#5f5f5d]">
{stringifyPayload(event.payload)}
                                    </pre>
                                  </div>
                                ) : null}
                              </div>
                            ))
                          ) : (
                            <div className="rounded-[18px] border border-dashed border-[#d7d2c8] bg-[#f7f4ed] px-4 py-4 text-sm leading-6 text-[#5f5f5d]">
                              当前筛选条件下还没有事件。先切回“全部”，或者重新跑一次诊断/监听命令。
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="rounded-[20px] border border-[#eceae4] bg-[#fcfbf8] p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-[#8a867f]">最近线索</p>
                        <div className="mt-3 space-y-3">
                          <div className="rounded-[18px] border border-[#eceae4] bg-[#f7f4ed] px-4 py-3">
                            <p className="text-xs uppercase tracking-[0.16em] text-[#8a867f]">命中的文件</p>
                            <p className="mt-2 break-all text-sm leading-6 text-[#1c1c1c]">
                              {candidateFilePath || '还没有发现新的稳定文件'}
                            </p>
                            {candidateFilePath ? (
                              <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#5f5f5d]">
                                {candidateFileSize ? (
                                  <span className="rounded-full bg-[rgba(28,28,28,0.05)] px-3 py-1">
                                    大小：{formatBytes(candidateFileSize)}
                                  </span>
                                ) : null}
                                {candidateFileExtension ? (
                                  <span className="rounded-full bg-[rgba(28,28,28,0.05)] px-3 py-1">
                                    扩展名：{candidateFileExtension}
                                  </span>
                                ) : null}
                                {candidateFileModified ? (
                                  <span className="rounded-full bg-[rgba(28,28,28,0.05)] px-3 py-1">
                                    修改于：{formatDate(candidateFileModified)}
                                  </span>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                          <div className="rounded-[18px] border border-[#eceae4] bg-[#f7f4ed] px-4 py-3">
                            <p className="text-xs uppercase tracking-[0.16em] text-[#8a867f]">已上传文件</p>
                            <p className="mt-2 break-all text-sm leading-6 text-[#1c1c1c]">
                              {uploadedFilePath || '上传完成后，这里会显示最后一次提交的文件路径'}
                            </p>
                            {uploadedFilePath && uploadedFileSize ? (
                              <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#5f5f5d]">
                                <span className="rounded-full bg-[rgba(28,28,28,0.05)] px-3 py-1">
                                  大小：{formatBytes(uploadedFileSize)}
                                </span>
                              </div>
                            ) : null}
                          </div>
                          <div className="rounded-[18px] border border-[#eceae4] bg-[#f7f4ed] px-4 py-3">
                            <p className="text-xs uppercase tracking-[0.16em] text-[#8a867f]">目录预览</p>
                            {activeWechatPreviewFiles.length > 0 ? (
                              <div className="mt-2 grid gap-2">
                                {activeWechatPreviewFiles.slice(0, 3).map((item, index) => (
                                  <div key={`${String(item.path || index)}-${index}`} className="text-xs text-[#5f5f5d]">
                                    <p className="truncate text-[#1c1c1c]">{String(item.path || 'unknown')}</p>
                                    <p className="mt-1">
                                      {formatBytes(typeof item.size === 'number' ? item.size : Number(item.size || 0))}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="mt-2 text-sm leading-6 text-[#5f5f5d]">
                                启动 agent 后，这里会出现它在候选目录里看到的最近文件。
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 rounded-[20px] border border-dashed border-[#d7d2c8] bg-[#fcfbf8] px-4 py-4 text-sm leading-7 text-[#5f5f5d]">
                    还没有可联动的视频号任务。先创建一条“微信视频号”导入任务，这里就会自动生成带 job id 的 agent 配置卡片。
                  </div>
                )}
              </div>
            </aside>
          </section>

          <section className="rounded-[28px] border border-[#eceae4] bg-[#fcfbf8] p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[#5f5f5d]">Recent Jobs</p>
                <h2 className="mt-3 text-[clamp(1.7rem,2.4vw,2.5rem)] font-semibold tracking-[-0.035em]">
                  最近的导入任务
                </h2>
              </div>
              <p className="text-sm leading-7 text-[#5f5f5d]">
                现在已经能手动触发同步；桌面 agent 则可以通过独立 token 直传采集产物。
              </p>
            </div>

            <div className="mt-6 grid gap-3">
              {jobs.length === 0 ? (
                <div className="rounded-[22px] border border-dashed border-[#d7d2c8] bg-[#f7f4ed] px-5 py-6 text-sm text-[#5f5f5d]">
                  还没有导入任务。先从上面的四类入口里任选一种开始。
                </div>
              ) : (
                jobs.map((job) => {
                  const latestCaptureEvent = job.capture_events?.[0];
                  const eventPayload = latestCaptureEvent?.payload;
                  const watchDirs = getPayloadStringList(eventPayload, 'watch_dirs');
                  const previewFiles = getPayloadObjectList(eventPayload, 'preview_files');

                  return (
                  <article key={job.id} className="rounded-[24px] border border-[#eceae4] bg-[#f7f4ed] p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="max-w-3xl">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-[rgba(28,28,28,0.06)] px-3 py-1 text-xs uppercase tracking-[0.16em] text-[#5f5f5d]">
                            {job.source_type}
                          </span>
                          <span className={`rounded-full px-3 py-1 text-xs ${statusTone[job.status] || statusTone.created}`}>
                            {statusLabel[job.status] || job.status}
                          </span>
                        </div>
                        <h3 className="mt-3 text-xl font-semibold tracking-[-0.02em]">{job.source_label}</h3>
                        <p className="mt-2 text-sm leading-7 text-[rgba(28,28,28,0.82)]">{job.stage || '任务已创建'}</p>
                        <div className="mt-4 flex flex-wrap gap-4 text-sm text-[#5f5f5d]">
                          <span>Notebook：{job.notebook?.title || `#${job.notebook_id}`}</span>
                          <span>进度：{job.progress}%</span>
                          <span>Artifacts：{job.artifacts?.length || 0}</span>
                          <span>更新于：{formatDate(job.updated_at)}</span>
                        </div>
                        {(job.error_message || job.degraded_reason) ? (
                          <div className="mt-4 rounded-2xl border border-[#ead2cf] bg-[#fff5f4] px-4 py-3 text-sm text-[#8f352e]">
                            {job.error_message || job.degraded_reason}
                          </div>
                        ) : null}
                        {latestCaptureEvent ? (
                          <div className="mt-4 rounded-[20px] border border-[#eceae4] bg-[#fcfbf8] p-4">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-[rgba(28,28,28,0.06)] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-[#5f5f5d]">
                                Agent Insight
                              </span>
                              <span className="text-xs text-[#5f5f5d]">
                                {latestCaptureEvent.summary || latestCaptureEvent.event_kind}
                              </span>
                              <span className="text-xs text-[#8a867f]">
                                {formatDate(latestCaptureEvent.created_at)}
                              </span>
                            </div>

                            {watchDirs.length > 0 ? (
                              <div className="mt-3">
                                <p className="text-xs uppercase tracking-[0.16em] text-[#8a867f]">候选目录</p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {watchDirs.slice(0, 4).map((dir) => (
                                    <span
                                      key={dir}
                                      className="rounded-full bg-[rgba(28,28,28,0.05)] px-3 py-1 text-xs text-[#5f5f5d]"
                                    >
                                      {dir}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ) : null}

                            {previewFiles.length > 0 ? (
                              <div className="mt-3">
                                <p className="text-xs uppercase tracking-[0.16em] text-[#8a867f]">最近文件预览</p>
                                <div className="mt-2 grid gap-2">
                                  {previewFiles.slice(0, 3).map((item, index) => (
                                    <div
                                      key={`${String(item.path || index)}-${index}`}
                                      className="rounded-2xl border border-[#eceae4] bg-[#f7f4ed] px-3 py-3 text-xs text-[#5f5f5d]"
                                    >
                                      <p className="truncate font-medium text-[#1c1c1c]">{String(item.path || 'unknown')}</p>
                                      <p className="mt-1">
                                        {formatBytes(typeof item.size === 'number' ? item.size : Number(item.size || 0))}
                                        {' · '}
                                        {typeof item.modified === 'string' ? formatDate(item.modified) : '未知时间'}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                        {!latestCaptureEvent && job.source_type === 'wechat_channel' ? (
                          <div className="mt-4 rounded-[20px] border border-dashed border-[#d7d2c8] bg-[#fcfbf8] px-4 py-4 text-sm text-[#5f5f5d]">
                            还没有收到桌面 agent 的目录命中信息。启动 agent 后，这里会显示候选目录和最近文件预览。
                          </div>
                        ) : null}
                      </div>

                      <div className="flex gap-3">
                        {(job.status === 'created' || job.status === 'artifact_received') ? (
                          <button
                            type="button"
                            onClick={() => void handleSyncJob(job.id)}
                            disabled={busyJobIds.includes(job.id)}
                            className="rounded-2xl border border-[rgba(28,28,28,0.22)] px-4 py-2 text-sm text-[#1c1c1c] transition hover:bg-[rgba(28,28,28,0.04)] disabled:opacity-60"
                          >
                            {busyJobIds.includes(job.id) ? '同步中...' : '立即同步'}
                          </button>
                        ) : null}
                        {job.status === 'failed' ? (
                          <button
                            type="button"
                            onClick={() => void handleRetryJob(job.id)}
                            disabled={busyJobIds.includes(job.id)}
                            className="rounded-2xl border border-[rgba(28,28,28,0.22)] px-4 py-2 text-sm text-[#1c1c1c] transition hover:bg-[rgba(28,28,28,0.04)]"
                          >
                            {busyJobIds.includes(job.id) ? '处理中...' : '重试'}
                          </button>
                        ) : null}
                        <div className="rounded-2xl border border-[#eceae4] bg-[#fcfbf8] px-4 py-2 text-sm text-[#5f5f5d]">
                          #{job.id}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-[rgba(28,28,28,0.08)]">
                      <div
                        className="h-full rounded-full bg-[#1c1c1c] transition-all"
                        style={{ width: `${Math.max(6, job.progress)}%` }}
                      />
                    </div>
                  </article>
                );
                })
              )}
            </div>
          </section>
        </div>
      </div>

      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast((current) => ({ ...current, isVisible: false }))}
      />
    </>
  );
}
