import { apiClient } from './client';
import type { CreateSkillInput, Skill, UpdateSkillInput } from '../types';

function normalizeSkill(skill: Skill): Skill {
  return {
    ...skill,
    tags: skill.tags || [],
    children: (skill.children || []).map(normalizeSkill),
  };
}

export const skillsApi = {
  async getSkillTree(params?: {
    search?: string;
    status?: string;
    tags?: string[];
  }) {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.status) query.set('status', params.status);
    if (params?.tags?.length) query.set('tags', params.tags.join(','));

    const queryString = query.toString();
    const response = await apiClient.get<Skill[]>(`/api/skills/tree${queryString ? `?${queryString}` : ''}`);
    return {
      ...response,
      data: (response.data || []).map(normalizeSkill),
    };
  },

  async getSkill(id: string) {
    const response = await apiClient.get<Skill>(`/api/skills/${id}`);
    return {
      ...response,
      data: normalizeSkill(response.data),
    };
  },

  async createSkill(data: CreateSkillInput) {
    const response = await apiClient.post<Skill>('/api/skills', data);
    return {
      ...response,
      data: normalizeSkill(response.data),
    };
  },

  async updateSkill(id: string, data: UpdateSkillInput) {
    const response = await apiClient.put<Skill>(`/api/skills/${id}`, data);
    return {
      ...response,
      data: normalizeSkill(response.data),
    };
  },

  async deleteSkill(id: number) {
    return apiClient.delete<void>(`/api/skills/${id}`);
  },
};
