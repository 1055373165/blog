import { apiClient } from './client';
import type { CreatePromptInput, Prompt, UpdatePromptInput } from '../types';

function normalizePrompt(prompt: Prompt): Prompt {
  return {
    ...prompt,
    tags: prompt.tags || [],
    applicable_models: prompt.applicable_models || [],
    children: (prompt.children || []).map(normalizePrompt),
  };
}

export const promptsApi = {
  async getPromptTree(params?: {
    search?: string;
    status?: string;
    tags?: string[];
    models?: string[];
  }) {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.status) query.set('status', params.status);
    if (params?.tags?.length) query.set('tags', params.tags.join(','));
    if (params?.models?.length) query.set('models', params.models.join(','));

    const queryString = query.toString();
    const response = await apiClient.get<Prompt[]>(`/api/prompts/tree${queryString ? `?${queryString}` : ''}`);
    return {
      ...response,
      data: (response.data || []).map(normalizePrompt),
    };
  },

  async getPrompt(id: string) {
    const response = await apiClient.get<Prompt>(`/api/prompts/${id}`);
    return {
      ...response,
      data: normalizePrompt(response.data),
    };
  },

  async createPrompt(data: CreatePromptInput) {
    const response = await apiClient.post<Prompt>('/api/prompts', data);
    return {
      ...response,
      data: normalizePrompt(response.data),
    };
  },

  async updatePrompt(id: string, data: UpdatePromptInput) {
    const response = await apiClient.put<Prompt>(`/api/prompts/${id}`, data);
    return {
      ...response,
      data: normalizePrompt(response.data),
    };
  },

  async deletePrompt(id: number) {
    return apiClient.delete<void>(`/api/prompts/${id}`);
  },
};
