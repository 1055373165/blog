import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { parse, stringify } from 'yaml';
import ByteMDEditor from '../../components/ByteMDEditor';
import LoadingSpinner from '../../components/LoadingSpinner';
import TokenInput from '../../components/admin/TokenInput';
import Toast, { ToastType } from '../../components/ui/Toast';
import { promptsApi } from '../../api/prompts';
import { skillsApi } from '../../api/skills';
import type {
  AiAssetBase,
  AiAssetStatus,
  AiAssetType,
  CreatePromptInput,
  CreateSkillInput,
  Prompt,
  Skill,
  SkillSupportingFile,
  UpdatePromptInput,
  UpdateSkillInput,
} from '../../types';

interface AssetEditorProps {
  assetType: AiAssetType;
}

interface AssetOption extends AiAssetBase {
  depth: number;
  children?: AssetOption[];
  applicable_models?: string[];
}

type AssetRecord = Prompt | Skill;
type AssetFormData = CreateSkillInput & { applicable_models: string[] };
type AnthropicSkillMetadata = Record<string, unknown>;

interface DirectoryFile extends File {
  webkitRelativePath?: string;
}

interface DirectoryHandleLike {
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<DirectoryHandleLike>;
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileHandleLike>;
}

interface FileHandleLike {
  createWritable(): Promise<{
    write(data: string): Promise<void>;
    close(): Promise<void>;
  }>;
}

const ANTHROPIC_RESERVED_KEYS = new Set(['name', 'description']);

const statusOptions: { value: AiAssetStatus; label: string; description: string }[] = [
  { value: 'active', label: '启用', description: '当前可直接使用的正式资产' },
  { value: 'draft', label: '草稿', description: '正在整理、验证或待补充的资产' },
  { value: 'archived', label: '归档', description: '保留记录但不作为当前主用版本' },
];

const assetConfig: Record<
  AiAssetType,
  {
    name: string;
    pluralName: string;
    listPath: string;
    newPath: string;
    getEditPath: (id: number) => string;
    parentLabel: string;
    summaryPlaceholder: string;
    contentTitle: string;
    contentDescription: string;
    contentPlaceholder: string;
    notesPlaceholder: string;
    tagPlaceholder: string;
    tagHelper: string;
    structureRootText: string;
    emptyTagText: string;
    summaryTagText: string;
    supportsModels: boolean;
    modelLabel: string;
    modelPlaceholder: string;
    modelHelper: string;
    emptyModelText: string;
    summaryModelText: string;
  }
> = {
  prompt: {
    name: '提示词',
    pluralName: '提示词',
    listPath: '/admin/prompts?type=prompt',
    newPath: '/admin/prompts/new',
    getEditPath: (id) => `/admin/prompts/${id}/edit`,
    parentLabel: '父级提示词',
    summaryPlaceholder: '用 1-2 句话说明这个提示词适合什么场景、解决什么问题。',
    contentTitle: '提示词正文',
    contentDescription: '使用 Markdown 编写，适合长提示词、结构化模板与多段说明。',
    contentPlaceholder: '开始编写提示词正文...',
    notesPlaceholder: '记录适用边界、使用注意事项、和其他提示词之间的关系等。',
    tagPlaceholder: '输入后按回车，例如：写作、代码生成、销售',
    tagHelper: '标签体系独立于博客标签，用于业务语义和场景筛选。',
    structureRootText: '根提示词',
    emptyTagText: '未设置标签',
    summaryTagText: '个标签',
    supportsModels: true,
    modelLabel: '适用模型',
    modelPlaceholder: '输入后按回车，例如：GPT-5、Claude 4、DeepSeek',
    modelHelper: '支持自由扩展，用来快速筛选适合某类模型的提示词。',
    emptyModelText: '未设置模型',
    summaryModelText: '个模型标签',
  },
  skill: {
    name: 'Skill',
    pluralName: 'Skills',
    listPath: '/admin/prompts?type=skill',
    newPath: '/admin/skills/new',
    getEditPath: (id) => `/admin/skills/${id}/edit`,
    parentLabel: '父级 Skill',
    summaryPlaceholder: '用 1-2 句话说明这个 Skill 负责什么能力、适合在什么任务链路中调用。',
    contentTitle: 'Skill 定义',
    contentDescription: '使用 Markdown 描述职责、触发条件、输入输出约束与使用示例。',
    contentPlaceholder: '开始编写 Skill 定义...',
    notesPlaceholder: '记录依赖关系、维护说明、失效条件与调用注意事项。',
    tagPlaceholder: '输入后按回车，例如：research、qa、frontend、automation',
    tagHelper: '标签用于按能力域、执行方式与维护归属组织 Skills。',
    structureRootText: '根 Skill',
    emptyTagText: '未设置标签',
    summaryTagText: '个标签',
    supportsModels: false,
    modelLabel: '',
    modelPlaceholder: '',
    modelHelper: '',
    emptyModelText: '',
    summaryModelText: '',
  },
};

function toAssetOption(asset: AssetRecord, depth: number): AssetOption {
  return {
    ...asset,
    depth,
    applicable_models: getApplicableModels(asset),
    children: (asset.children || []).map((child) => toAssetOption(child as AssetRecord, depth + 1)),
  };
}

function getApplicableModels(asset: AssetRecord | AssetOption): string[] {
  return 'applicable_models' in asset && Array.isArray(asset.applicable_models) ? asset.applicable_models : [];
}

function flattenAssetOptions<T extends AssetRecord>(assets: T[], depth = 0): AssetOption[] {
  return assets.flatMap((asset) => [
    toAssetOption(asset, depth),
    ...(asset.children ? flattenAssetOptions(asset.children as T[], depth + 1) : []),
  ]);
}

function collectDescendantIds(asset: AssetOption): number[] {
  return (asset.children || []).flatMap((child) => [child.id, ...collectDescendantIds(child)]);
}

function sanitizeAnthropicSkillName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function splitImportedSkillPath(path: string) {
  const normalizedPath = path.replace(/\\/g, '/').replace(/^\/+/, '');
  const parts = normalizedPath.split('/').filter(Boolean);
  const relativePath = parts.length <= 1 ? parts[0] || '' : parts.slice(1).join('/');
  return normalizeSupportingFilePath(relativePath);
}

function normalizeSupportingFilePath(path: string) {
  const parts = path
    .replace(/\\/g, '/')
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.some((part) => part === '..')) {
    return '';
  }

  return parts.filter((part) => part !== '.').join('/');
}

function parseAnthropicSkillMarkdown(markdown: string) {
  const normalized = markdown.replace(/\r\n/g, '\n');
  if (!normalized.startsWith('---\n')) {
    return {
      name: '',
      description: '',
      anthropicConfig: {} as AnthropicSkillMetadata,
      content: normalized.trim(),
    };
  }

  const closingIndex = normalized.indexOf('\n---\n', 4);
  if (closingIndex === -1) {
    throw new Error('SKILL.md 的 frontmatter 缺少结束分隔符 ---');
  }

  const yamlSource = normalized.slice(4, closingIndex).trim();
  const content = normalized.slice(closingIndex + 5).replace(/^\n+/, '');
  const parsed = yamlSource ? parse(yamlSource) : {};

  if (parsed !== null && (typeof parsed !== 'object' || Array.isArray(parsed))) {
    throw new Error('SKILL.md 的 frontmatter 必须是 YAML 对象');
  }

  const frontmatter = (parsed || {}) as AnthropicSkillMetadata;
  const anthropicConfig = Object.fromEntries(
    Object.entries(frontmatter).filter(([key]) => !ANTHROPIC_RESERVED_KEYS.has(key))
  );

  return {
    name: typeof frontmatter.name === 'string' ? frontmatter.name.trim() : '',
    description: typeof frontmatter.description === 'string' ? frontmatter.description.trim() : '',
    anthropicConfig,
    content,
  };
}

function stringifyAnthropicConfig(config: AnthropicSkillMetadata) {
  if (Object.keys(config).length === 0) {
    return '';
  }

  return stringify(config).trim();
}

function parseAnthropicConfigYaml(yamlSource: string) {
  const trimmed = yamlSource.trim();
  if (!trimmed) {
    return {} as AnthropicSkillMetadata;
  }

  const parsed = parse(trimmed);
  if (parsed !== null && (typeof parsed !== 'object' || Array.isArray(parsed))) {
    throw new Error('Anthropic frontmatter 必须是 YAML 对象');
  }

  const config = (parsed || {}) as AnthropicSkillMetadata;
  return Object.fromEntries(Object.entries(config).filter(([key]) => !ANTHROPIC_RESERVED_KEYS.has(key)));
}

function buildAnthropicSkillMarkdown(skillName: string, description: string, anthropicConfig: AnthropicSkillMetadata, content: string) {
  const frontmatter: AnthropicSkillMetadata = {
    name: skillName,
  };

  if (description.trim()) {
    frontmatter.description = description.trim();
  }

  for (const [key, value] of Object.entries(anthropicConfig)) {
    if (ANTHROPIC_RESERVED_KEYS.has(key)) {
      continue;
    }
    frontmatter[key] = value;
  }

  const yamlText = stringify(frontmatter).trim();
  const body = content.trim();
  return `---\n${yamlText}\n---\n\n${body}`;
}

async function writeExportedSkillFile(
  directoryHandle: DirectoryHandleLike,
  path: string,
  content: string
) {
  const segments = path.split('/').filter(Boolean);
  if (segments.length === 0) {
    return;
  }

  let currentDirectory = directoryHandle;
  for (const segment of segments.slice(0, -1)) {
    currentDirectory = await currentDirectory.getDirectoryHandle(segment, { create: true });
  }

  const fileHandle = await currentDirectory.getFileHandle(segments[segments.length - 1], { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
}

export default function AssetEditor({ assetType }: AssetEditorProps) {
  const { id } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isEditing = !!id;
  const config = assetConfig[assetType];
  const skillImportInputRef = useRef<HTMLInputElement | null>(null);
  const isSkillEditor = assetType === 'skill';

  const [formData, setFormData] = useState<AssetFormData>({
    name: '',
    slug: '',
    description: '',
    content: '',
    notes: '',
    status: 'draft',
    tags: [],
    applicable_models: [],
    anthropic_config: {},
    supporting_files: [],
    parent_id: undefined,
  });
  const [anthropicConfigYaml, setAnthropicConfigYaml] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importingSkillFolder, setImportingSkillFolder] = useState(false);
  const [exportingSkillFolder, setExportingSkillFolder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [toast, setToast] = useState<{ message: string; type: ToastType; isVisible: boolean }>({
    message: '',
    type: 'success',
    isVisible: false,
  });

  useEffect(() => {
    void loadAssetTree();
  }, [assetType]);

  useEffect(() => {
    if (isEditing && id) {
      void loadAsset(id);
      return;
    }

    if (isSkillEditor) {
      setAnthropicConfigYaml('');
    }

    const parentId = searchParams.get('parent');
    if (!parentId) {
      setFormData((current) => ({ ...current, parent_id: undefined }));
      return;
    }

    const parsedParentId = Number(parentId);
    if (!Number.isFinite(parsedParentId) || parsedParentId <= 0) {
      return;
    }

    setFormData((current) => ({
      ...current,
      parent_id: parsedParentId,
    }));
  }, [assetType, id, isEditing, isSkillEditor, searchParams]);

  const loadAssetTree = async () => {
    try {
      const response = assetType === 'prompt' ? await promptsApi.getPromptTree() : await skillsApi.getSkillTree();
      if (!response.success) {
        throw new Error(response.error || `加载${config.pluralName}失败`);
      }
      setAssets(response.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : `加载${config.pluralName}失败`);
    }
  };

  const loadAsset = async (assetId: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = assetType === 'prompt' ? await promptsApi.getPrompt(assetId) : await skillsApi.getSkill(assetId);
      if (!response.success) {
        throw new Error(response.error || `加载${config.name}失败`);
      }

      const asset = response.data;
      setFormData({
        name: asset.name,
        slug: asset.slug,
        description: asset.description || '',
        content: asset.content || '',
        notes: asset.notes || '',
        status: asset.status,
        tags: asset.tags || [],
        applicable_models: getApplicableModels(asset),
        anthropic_config: 'anthropic_config' in asset ? asset.anthropic_config || {} : {},
        supporting_files: 'supporting_files' in asset ? asset.supporting_files || [] : [],
        parent_id: asset.parent_id,
      });
      if ('anthropic_config' in asset) {
        setAnthropicConfigYaml(stringifyAnthropicConfig(asset.anthropic_config || {}));
      } else {
        setAnthropicConfigYaml('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : `加载${config.name}失败`);
    } finally {
      setLoading(false);
    }
  };

  const assetOptions = useMemo(() => flattenAssetOptions(assets), [assets]);

  const currentAsset = useMemo(
    () => (id ? assetOptions.find((asset) => asset.id === Number(id)) : undefined),
    [assetOptions, id]
  );

  const disallowedParentIds = useMemo(() => {
    if (!currentAsset) {
      return new Set<number>();
    }
    return new Set<number>([currentAsset.id, ...collectDescendantIds(currentAsset)]);
  }, [currentAsset]);

  const parentOptions = useMemo(
    () => assetOptions.filter((asset) => !disallowedParentIds.has(asset.id)),
    [assetOptions, disallowedParentIds]
  );

  const tagSuggestions = useMemo(
    () => Array.from(new Set(assetOptions.flatMap((asset) => asset.tags))).sort((a, b) => a.localeCompare(b, 'zh-CN')),
    [assetOptions]
  );

  const modelSuggestions = useMemo(
    () =>
      Array.from(new Set(assetOptions.flatMap((asset) => getApplicableModels(asset)))).sort((a, b) => a.localeCompare(b, 'zh-CN')),
    [assetOptions]
  );

  const selectedParent = useMemo(
    () => parentOptions.find((asset) => asset.id === formData.parent_id),
    [formData.parent_id, parentOptions]
  );

  const handleInputChange = <K extends keyof AssetFormData>(field: K, value: AssetFormData[K]) => {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleImportSkillFolder = async (files: DirectoryFile[]) => {
    if (!isSkillEditor || files.length === 0) {
      return;
    }

    try {
      setImportingSkillFolder(true);
      setError(null);

      const normalizedFiles = files
        .map((file) => ({
          path: splitImportedSkillPath(file.webkitRelativePath || file.name),
          file,
        }))
        .filter((item) => item.path && !item.path.startsWith('.DS_Store'));

      const entryFile = normalizedFiles.find((item) => item.path === 'SKILL.md');
      if (!entryFile) {
        throw new Error('导入失败：未找到根目录下的 SKILL.md');
      }

      const parsedSkill = parseAnthropicSkillMarkdown(await entryFile.file.text());
      const supportingFiles = (
        await Promise.all(
          normalizedFiles
            .filter((item) => item.path !== 'SKILL.md')
            .map(async (item) => ({
              path: item.path,
              content: await item.file.text(),
            }))
        )
      ).sort((a, b) => a.path.localeCompare(b.path, 'zh-CN'));

      const importedSlug =
        parsedSkill.name ||
        sanitizeAnthropicSkillName(formData.slug || formData.name || entryFile.file.name.replace(/\.md$/i, '')) ||
        'imported-skill';

      setFormData((current) => ({
        ...current,
        name: parsedSkill.name || current.name || importedSlug,
        slug: importedSlug,
        description: parsedSkill.description || current.description,
        content: parsedSkill.content,
        anthropic_config: parsedSkill.anthropicConfig,
        supporting_files: supportingFiles,
      }));
      setAnthropicConfigYaml(stringifyAnthropicConfig(parsedSkill.anthropicConfig));
      setToast({
        message: `已导入 Anthropic Skill 文件夹，共 ${supportingFiles.length + 1} 个文件`,
        type: 'success',
        isVisible: true,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : '导入 Skill 文件夹失败';
      setError(message);
      setToast({ message, type: 'error', isVisible: true });
    } finally {
      setImportingSkillFolder(false);
    }
  };

  const handleExportSkillFolder = async () => {
    if (!isSkillEditor) {
      return;
    }

    try {
      setExportingSkillFolder(true);
      setError(null);

      const anthropicConfig = parseAnthropicConfigYaml(anthropicConfigYaml);
      const anthropicSkillName = sanitizeAnthropicSkillName(formData.slug || formData.name);
      if (!anthropicSkillName) {
        throw new Error('请先填写一个符合 Anthropic 标准的 slug，建议只用小写字母、数字和连字符');
      }

      const skillMarkdown = buildAnthropicSkillMarkdown(
        anthropicSkillName,
        formData.description || '',
        anthropicConfig,
        formData.content || ''
      );

      const fileAccessWindow = window as Window & {
        showDirectoryPicker?: () => Promise<DirectoryHandleLike>;
      };

      if (!fileAccessWindow.showDirectoryPicker) {
        throw new Error('当前浏览器不支持目录导出，请使用支持 File System Access API 的 Chromium 浏览器');
      }

      const targetDirectory = await fileAccessWindow.showDirectoryPicker();
      const skillDirectory = await targetDirectory.getDirectoryHandle(anthropicSkillName, { create: true });
      await writeExportedSkillFile(skillDirectory, 'SKILL.md', skillMarkdown);

      for (const file of formData.supporting_files) {
        const path = normalizeSupportingFilePath(file.path);
        if (!path) {
          continue;
        }
        await writeExportedSkillFile(skillDirectory, path, file.content);
      }

      setToast({
        message: `已导出 Anthropic Skill 文件夹：${anthropicSkillName}`,
        type: 'success',
        isVisible: true,
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }

      const message = err instanceof Error ? err.message : '导出 Skill 文件夹失败';
      setError(message);
      setToast({ message, type: 'error', isVisible: true });
    } finally {
      setExportingSkillFolder(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError(`请填写${config.name}名称`);
      return;
    }

    try {
      setSaving(true);
      setError(null);

      if (assetType === 'prompt') {
        const payload: CreatePromptInput = {
          name: formData.name.trim(),
          slug: formData.slug?.trim(),
          description: formData.description?.trim(),
          content: formData.content,
          notes: formData.notes?.trim(),
          status: formData.status,
          tags: formData.tags,
          applicable_models: formData.applicable_models,
          parent_id: formData.parent_id,
        };

        const response = isEditing && id
          ? await promptsApi.updatePrompt(id, { ...(payload as UpdatePromptInput), id: Number(id) })
          : await promptsApi.createPrompt(payload);

        if (!response.success) {
          throw new Error(response.error || '保存失败');
        }

        setToast({
          message: isEditing ? `${config.name}已更新` : `${config.name}已创建`,
          type: 'success',
          isVisible: true,
        });

        if (!isEditing) {
          navigate(config.getEditPath(response.data.id), { replace: true });
        }
        return;
      }

      const anthropicConfig = parseAnthropicConfigYaml(anthropicConfigYaml);
      const payload: CreateSkillInput = {
        name: formData.name.trim(),
        slug: formData.slug?.trim(),
        description: formData.description?.trim(),
        content: formData.content,
        notes: formData.notes?.trim(),
        status: formData.status,
        tags: formData.tags,
        anthropic_config: anthropicConfig,
        supporting_files: formData.supporting_files,
        parent_id: formData.parent_id,
      };

      const response = isEditing && id
        ? await skillsApi.updateSkill(id, { ...(payload as UpdateSkillInput), id: Number(id) })
        : await skillsApi.createSkill(payload);

      if (!response.success) {
        throw new Error(response.error || '保存失败');
      }

      setToast({
        message: isEditing ? `${config.name}已更新` : `${config.name}已创建`,
        type: 'success',
        isVisible: true,
      });

      if (!isEditing) {
        navigate(config.getEditPath(response.data.id), { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="card sticky top-0 z-10 rounded-none border-x-0 border-t-0">
        <div className="px-6">
          <div className="flex flex-col gap-4 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => navigate(config.listPath)}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-go-600 dark:hover:text-go-400 hover:bg-go-50 dark:hover:bg-go-900/20 rounded-2xl transition-all duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {isEditing ? `编辑${config.name}` : `新建${config.name}`}
                </h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {selectedParent ? `当前挂载在「${selectedParent.name}」下` : `当前为${config.structureRootText}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {isSkillEditor && (
                <>
                  <input
                    ref={skillImportInputRef}
                    type="file"
                    // @ts-expect-error webkitdirectory is non-standard
                    webkitdirectory=""
                    multiple
                    className="hidden"
                    onChange={(event) => {
                      const files = Array.from(event.target.files || []) as DirectoryFile[];
                      if (files.length > 0) {
                        void handleImportSkillFolder(files);
                      }
                      event.target.value = '';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => skillImportInputRef.current?.click()}
                    disabled={importingSkillFolder || saving}
                    className="btn btn-secondary flex items-center gap-2"
                  >
                    {importingSkillFolder && <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                    {importingSkillFolder ? '导入中...' : '导入 Anthropic Skill'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleExportSkillFolder()}
                    disabled={exportingSkillFolder || saving}
                    className="btn btn-secondary flex items-center gap-2"
                  >
                    {exportingSkillFolder && <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                    {exportingSkillFolder ? '导出中...' : '导出 Skill 文件夹'}
                  </button>
                </>
              )}
              <span className="hidden md:inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                {statusOptions.find((option) => option.value === formData.status)?.label}
              </span>
              <button type="button" onClick={handleSave} disabled={saving} className="btn btn-primary flex items-center gap-2">
                {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {saving ? '保存中...' : `保存${config.name}`}
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="px-6 mt-4">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4">
            <div className="flex">
              <svg className="w-5 h-5 text-red-400 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="px-6 py-8">
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <div className="card p-6 space-y-5">
              <div className="grid gap-5 lg:grid-cols-2">
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {config.name}名称 *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(event) => handleInputChange('name', event.target.value)}
                    placeholder={assetType === 'prompt' ? '例如：长文润色系统提示词' : '例如：PR Review Skill'}
                    className="input text-lg py-3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Slug
                  </label>
                  <input
                    type="text"
                    value={formData.slug || ''}
                    onChange={(event) => handleInputChange('slug', event.target.value)}
                    placeholder="留空则根据名称自动生成"
                    className="input"
                  />
                  {isSkillEditor && (
                    <p className="mt-2 text-xs leading-5 text-gray-500 dark:text-gray-400">
                      Anthropic 导出会把 `slug` 用作目录名和 `SKILL.md` frontmatter 里的 `name`。建议使用小写字母、数字和连字符。
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {config.parentLabel}
                  </label>
                  <select
                    value={formData.parent_id || ''}
                    onChange={(event) =>
                      handleInputChange(
                        'parent_id',
                        event.target.value ? parseInt(event.target.value, 10) : undefined
                      )
                    }
                    className="input"
                  >
                    <option value="">{`作为${config.structureRootText}`}</option>
                    {parentOptions.map((asset) => (
                      <option key={asset.id} value={asset.id}>
                        {'　'.repeat(asset.depth)}
                        {asset.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  摘要说明
                </label>
                <textarea
                  value={formData.description || ''}
                  onChange={(event) => handleInputChange('description', event.target.value)}
                  rows={3}
                  placeholder={config.summaryPlaceholder}
                  className="input resize-none"
                />
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{config.contentTitle}</h2>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {config.contentDescription}
                  </p>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {formData.content.length} 字符
                </div>
              </div>
              <ByteMDEditor
                value={formData.content}
                onChange={(value) => handleInputChange('content', value)}
                height={960}
                placeholder={config.contentPlaceholder}
              />
            </div>

            <div className="card p-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                备注 / 维护说明
              </label>
              <textarea
                value={formData.notes || ''}
                onChange={(event) => handleInputChange('notes', event.target.value)}
                rows={6}
                placeholder={config.notesPlaceholder}
                className="input resize-none"
              />
            </div>
          </div>

          <div className="space-y-6">
            <div className="card p-6 space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">元数据</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  这些字段会直接影响列表页的检索与筛选效率。
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  状态
                </label>
                <div className="space-y-2">
                  {statusOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleInputChange('status', option.value)}
                      className={`w-full text-left rounded-2xl border px-4 py-3 transition-colors ${
                        formData.status === option.value
                          ? 'border-go-500 bg-go-50 dark:bg-go-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-go-300 dark:hover:border-go-600'
                      }`}
                    >
                      <div className="font-medium text-gray-900 dark:text-white">{option.label}</div>
                      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{option.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              <TokenInput
                label="标签"
                values={formData.tags}
                onChange={(values) => handleInputChange('tags', values)}
                placeholder={config.tagPlaceholder}
                suggestions={tagSuggestions}
                helperText={config.tagHelper}
              />

              {config.supportsModels && (
                <TokenInput
                  label={config.modelLabel}
                  values={formData.applicable_models}
                  onChange={(values) => handleInputChange('applicable_models', values)}
                  placeholder={config.modelPlaceholder}
                  suggestions={modelSuggestions}
                  helperText={config.modelHelper}
                />
              )}
            </div>

            {isSkillEditor && (
              <div className="card p-6 space-y-5">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Anthropic 兼容</h2>
                  <p className="mt-1 text-sm leading-6 text-gray-500 dark:text-gray-400">
                    导入时会解析标准 Skill 文件夹中的 `SKILL.md`、YAML frontmatter 和 supporting files；导出时会按同样结构重新写出。
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    附加 frontmatter（YAML）
                  </label>
                  <textarea
                    value={anthropicConfigYaml}
                    onChange={(event) => setAnthropicConfigYaml(event.target.value)}
                    rows={10}
                    placeholder={'allowed-tools: Read, Grep\nuser-invocable: false\ncontext: fork'}
                    className="input font-mono text-sm resize-y min-h-[220px]"
                  />
                  <p className="mt-2 text-xs leading-5 text-gray-500 dark:text-gray-400">
                    这里填写除 `name` 和 `description` 之外的 Anthropic frontmatter。导出时系统会自动补回这两个字段。
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Supporting Files
                    </label>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formData.supporting_files.length} 个文件
                    </span>
                  </div>

                  {formData.supporting_files.length === 0 ? (
                    <div className="mt-3 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 px-4 py-5 text-sm text-gray-500 dark:text-gray-400">
                      还没有 supporting files。导入 Anthropic Skill 文件夹后，这里会显示除 `SKILL.md` 外的其他文件。
                    </div>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {formData.supporting_files.map((file) => (
                        <div
                          key={file.path}
                          className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 px-4 py-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate font-mono text-sm text-gray-800 dark:text-gray-100">{file.path}</div>
                              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                {file.content.length} 字符
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                handleInputChange(
                                  'supporting_files',
                                  formData.supporting_files.filter((item) => item.path !== file.path)
                                )
                              }
                              className="rounded-full px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                            >
                              移除
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="mt-2 text-xs leading-5 text-gray-500 dark:text-gray-400">
                    当前 supporting files 按文本文件导入和导出，适合 Markdown、脚本、模板和说明文档。
                  </p>
                </div>
              </div>
            )}

            <div className="card p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">结构信息</h2>
              <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/70 p-4">
                <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">当前层级</div>
                <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                  {selectedParent ? `挂载在「${selectedParent.name}」下` : config.structureRootText}
                </div>
              </div>
              <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/70 p-4">
                <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">筛选摘要</div>
                <div className="mt-2 text-sm text-gray-700 dark:text-gray-300 leading-6">
                  {formData.tags.length > 0 ? `${formData.tags.length}${config.summaryTagText}` : config.emptyTagText}
                  {config.supportsModels && (
                    <>
                      <span className="mx-2 text-gray-300 dark:text-gray-600">/</span>
                      {formData.applicable_models.length > 0
                        ? `${formData.applicable_models.length}${config.summaryModelText}`
                        : config.emptyModelText}
                    </>
                  )}
                  {isSkillEditor && (
                    <>
                      <span className="mx-2 text-gray-300 dark:text-gray-600">/</span>
                      {formData.supporting_files.length > 0
                        ? `${formData.supporting_files.length} 个 supporting files`
                        : '无 supporting files'}
                    </>
                  )}
                </div>
              </div>
              {isEditing && currentAsset && (
                <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/70 p-4">
                  <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">更新时间</div>
                  <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                    {new Date(currentAsset.updated_at).toLocaleString('zh-CN')}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast((current) => ({ ...current, isVisible: false }))}
      />
    </div>
  );
}
