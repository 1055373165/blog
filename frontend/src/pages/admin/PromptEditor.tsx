import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import ByteMDEditor from '../../components/ByteMDEditor';
import LoadingSpinner from '../../components/LoadingSpinner';
import TokenInput from '../../components/admin/TokenInput';
import Toast, { ToastType } from '../../components/ui/Toast';
import { promptsApi } from '../../api/prompts';
import type { CreatePromptInput, Prompt, PromptStatus, UpdatePromptInput } from '../../types';

interface PromptOption extends Prompt {
  depth: number;
}

const statusOptions: { value: PromptStatus; label: string; description: string }[] = [
  { value: 'active', label: '启用', description: '当前可直接使用的正式提示词' },
  { value: 'draft', label: '草稿', description: '正在整理或待验证的提示词' },
  { value: 'archived', label: '归档', description: '保留记录但不作为当前主用版本' },
];

function flattenPromptOptions(prompts: Prompt[], depth = 0): PromptOption[] {
  return prompts.flatMap((prompt) => [
    { ...prompt, depth },
    ...(prompt.children ? flattenPromptOptions(prompt.children, depth + 1) : []),
  ]);
}

function collectDescendantIds(prompt: Prompt): number[] {
  return (prompt.children || []).flatMap((child) => [child.id, ...collectDescendantIds(child)]);
}

export default function PromptEditor() {
  const { id } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [formData, setFormData] = useState<CreatePromptInput>({
    name: '',
    slug: '',
    description: '',
    content: '',
    notes: '',
    status: 'draft',
    tags: [],
    applicable_models: [],
    parent_id: undefined,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [toast, setToast] = useState<{ message: string; type: ToastType; isVisible: boolean }>({
    message: '',
    type: 'success',
    isVisible: false,
  });

  useEffect(() => {
    loadPromptTree();
  }, []);

  useEffect(() => {
    if (isEditing && id) {
      loadPrompt(id);
      return;
    }

    const parentId = searchParams.get('parent');
    if (parentId) {
      const parsedParentId = Number(parentId);
      if (!Number.isFinite(parsedParentId) || parsedParentId <= 0) {
        return;
      }
      setFormData((current) => ({
        ...current,
        parent_id: parsedParentId,
      }));
    }
  }, [id, isEditing, searchParams]);

  const loadPromptTree = async () => {
    try {
      const response = await promptsApi.getPromptTree();
      if (!response.success) {
        throw new Error(response.error || '加载提示词树失败');
      }
      setPrompts(response.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载提示词树失败');
    }
  };

  const loadPrompt = async (promptId: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await promptsApi.getPrompt(promptId);
      if (!response.success) {
        throw new Error(response.error || '加载提示词失败');
      }

      const prompt = response.data;
      setFormData({
        name: prompt.name,
        slug: prompt.slug,
        description: prompt.description || '',
        content: prompt.content || '',
        notes: prompt.notes || '',
        status: prompt.status,
        tags: prompt.tags || [],
        applicable_models: prompt.applicable_models || [],
        parent_id: prompt.parent_id,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载提示词失败');
    } finally {
      setLoading(false);
    }
  };

  const promptOptions = useMemo(() => flattenPromptOptions(prompts), [prompts]);

  const currentPrompt = useMemo(
    () => (id ? promptOptions.find((prompt) => prompt.id === Number(id)) : undefined),
    [id, promptOptions]
  );

  const disallowedParentIds = useMemo(() => {
    if (!currentPrompt) {
      return new Set<number>();
    }
    return new Set<number>([currentPrompt.id, ...collectDescendantIds(currentPrompt)]);
  }, [currentPrompt]);

  const parentOptions = useMemo(
    () => promptOptions.filter((prompt) => !disallowedParentIds.has(prompt.id)),
    [disallowedParentIds, promptOptions]
  );

  const tagSuggestions = useMemo(
    () => Array.from(new Set(promptOptions.flatMap((prompt) => prompt.tags))).sort((a, b) => a.localeCompare(b, 'zh-CN')),
    [promptOptions]
  );

  const modelSuggestions = useMemo(
    () =>
      Array.from(new Set(promptOptions.flatMap((prompt) => prompt.applicable_models))).sort((a, b) =>
        a.localeCompare(b, 'zh-CN')
      ),
    [promptOptions]
  );

  const selectedParent = useMemo(
    () => parentOptions.find((prompt) => prompt.id === formData.parent_id),
    [formData.parent_id, parentOptions]
  );

  const handleInputChange = <K extends keyof CreatePromptInput>(field: K, value: CreatePromptInput[K]) => {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError('请填写提示词名称');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const payload: CreatePromptInput = {
        ...formData,
        name: formData.name.trim(),
        slug: formData.slug?.trim(),
        description: formData.description?.trim(),
        notes: formData.notes?.trim(),
      };

      let response;
      if (isEditing && id) {
        response = await promptsApi.updatePrompt(id, {
          ...(payload as UpdatePromptInput),
          id: Number(id),
        });
      } else {
        response = await promptsApi.createPrompt(payload);
      }

      if (!response.success) {
        throw new Error(response.error || '保存失败');
      }

      setToast({
        message: isEditing ? '提示词已更新' : '提示词已创建',
        type: 'success',
        isVisible: true,
      });

      if (!isEditing) {
        navigate(`/admin/prompts/${response.data.id}/edit`, { replace: true });
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
                onClick={() => navigate('/admin/prompts')}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-go-600 dark:hover:text-go-400 hover:bg-go-50 dark:hover:bg-go-900/20 rounded-2xl transition-all duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {isEditing ? '编辑提示词' : '新建提示词'}
                </h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {selectedParent ? `当前挂载在「${selectedParent.name}」下` : '当前为根提示词'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="hidden md:inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                {statusOptions.find((option) => option.value === formData.status)?.label}
              </span>
              <button type="button" onClick={handleSave} disabled={saving} className="btn btn-primary flex items-center gap-2">
                {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {saving ? '保存中...' : '保存提示词'}
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
                    提示词名称 *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(event) => handleInputChange('name', event.target.value)}
                    placeholder="例如：长文润色系统提示词"
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
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    父级提示词
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
                    <option value="">作为根提示词</option>
                    {parentOptions.map((prompt) => (
                      <option key={prompt.id} value={prompt.id}>
                        {'　'.repeat(prompt.depth)}
                        {prompt.name}
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
                  placeholder="用 1-2 句话说明这个提示词适合什么场景、解决什么问题。"
                  className="input resize-none"
                />
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">提示词正文</h2>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    使用 Markdown 编写，适合长提示词、结构化模板与多段说明。
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
                placeholder="开始编写提示词正文..."
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
                placeholder="记录适用边界、使用注意事项、和其他提示词之间的关系等。"
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
                placeholder="输入后按回车，例如：写作、代码生成、销售"
                suggestions={tagSuggestions}
                helperText="标签体系独立于博客标签，用于业务语义和场景筛选。"
              />

              <TokenInput
                label="适用模型"
                values={formData.applicable_models}
                onChange={(values) => handleInputChange('applicable_models', values)}
                placeholder="输入后按回车，例如：GPT-5、Claude 4、DeepSeek"
                suggestions={modelSuggestions}
                helperText="支持自由扩展，用来快速筛选适合某类模型的提示词。"
              />
            </div>

            <div className="card p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">结构信息</h2>
              <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/70 p-4">
                <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">当前层级</div>
                <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                  {selectedParent ? `挂载在「${selectedParent.name}」下` : '根提示词'}
                </div>
              </div>
              <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/70 p-4">
                <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">筛选摘要</div>
                <div className="mt-2 text-sm text-gray-700 dark:text-gray-300 leading-6">
                  {formData.tags.length > 0 ? `${formData.tags.length} 个标签` : '未设置标签'}
                  <span className="mx-2 text-gray-300 dark:text-gray-600">/</span>
                  {formData.applicable_models.length > 0
                    ? `${formData.applicable_models.length} 个模型标签`
                    : '未设置模型'}
                </div>
              </div>
              {isEditing && currentPrompt && (
                <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/70 p-4">
                  <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">更新时间</div>
                  <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                    {new Date(currentPrompt.updated_at).toLocaleString('zh-CN')}
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
