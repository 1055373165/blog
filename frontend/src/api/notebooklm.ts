import { apiClient } from './client';
import type {
  CreateNotebookLMImportJobInput,
  CreateNotebookLMNotebookInput,
  NotebookLMImportJob,
  NotebookLMImportJobListResponse,
  NotebookLMNotebook,
} from '../types';

export const notebooklmApi = {
  async getNotebooks() {
    return apiClient.get<NotebookLMNotebook[]>('/api/notebooklm/notebooks');
  },

  async createNotebook(data: CreateNotebookLMNotebookInput) {
    return apiClient.post<NotebookLMNotebook>('/api/notebooklm/notebooks', data);
  },

  async getImportJobs(params?: {
    page?: number;
    limit?: number;
    notebook_id?: number;
    status?: string;
    source_type?: string;
  }) {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.notebook_id) query.append('notebook_id', String(params.notebook_id));
    if (params?.status) query.append('status', params.status);
    if (params?.source_type) query.append('source_type', params.source_type);

    const queryString = query.toString();
    return apiClient.get<NotebookLMImportJobListResponse>(`/api/notebooklm/import-jobs${queryString ? `?${queryString}` : ''}`);
  },

  async getImportJob(id: number) {
    return apiClient.get<NotebookLMImportJob>(`/api/notebooklm/import-jobs/${id}`);
  },

  async createImportJob(data: CreateNotebookLMImportJobInput) {
    return apiClient.post<NotebookLMImportJob>('/api/notebooklm/import-jobs', data);
  },

  async retryImportJob(id: number) {
    return apiClient.post<NotebookLMImportJob>(`/api/notebooklm/import-jobs/${id}/retry`);
  },

  async syncImportJob(id: number) {
    return apiClient.post<NotebookLMImportJob>(`/api/notebooklm/import-jobs/${id}/sync`);
  },
};
