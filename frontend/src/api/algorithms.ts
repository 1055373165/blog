import { apiClient } from './client';
import type {
  AlgorithmAsset,
  AlgorithmAssetFile,
  AlgorithmAssetListResponse,
  AlgorithmAssetStatus,
  AlgorithmDifficulty,
  AlgorithmReviewStatus,
  SaveAlgorithmAssetInput,
  SaveAlgorithmAssetMarkdownFileInput,
  SaveAlgorithmAssetVideoFileInput,
  UpdateAlgorithmAssetFileInput,
  UpdateAlgorithmAssetLearningInput,
  UpdateAlgorithmAssetPrimaryFilesInput,
  UploadMediaResponse,
} from '../types';

export interface AlgorithmAssetListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: AlgorithmAssetStatus;
  review_status?: AlgorithmReviewStatus;
  difficulty?: AlgorithmDifficulty;
  tag?: string;
  has_video?: boolean;
  sort_by?:
    | 'created_at'
    | 'updated_at'
    | 'title'
    | 'source_dir_name'
    | 'difficulty'
    | 'status'
    | 'review_status'
    | 'next_review_at'
    | 'leetcode_id';
  sort_order?: 'asc' | 'desc';
}

function normalizeAlgorithmAssetFile(file: AlgorithmAssetFile): AlgorithmAssetFile {
  return {
    ...file,
    markdown_content: file.markdown_content ?? '',
    storage_url: file.storage_url ?? '',
    mime_type: file.mime_type ?? '',
    size_bytes: file.size_bytes ?? 0,
  };
}

function normalizeAlgorithmAsset(asset: AlgorithmAsset): AlgorithmAsset {
  return {
    ...asset,
    tags: asset.tags || [],
    files: (asset.files || []).map(normalizeAlgorithmAssetFile),
    markdown_count: asset.markdown_count ?? 0,
    video_count: asset.video_count ?? 0,
    primary_markdown_file: asset.primary_markdown_file
      ? normalizeAlgorithmAssetFile(asset.primary_markdown_file)
      : undefined,
    primary_video_file: asset.primary_video_file
      ? normalizeAlgorithmAssetFile(asset.primary_video_file)
      : undefined,
  };
}

function buildAlgorithmAssetQuery(params?: AlgorithmAssetListParams): string {
  const query = new URLSearchParams();

  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.search) query.set('search', params.search);
  if (params?.status) query.set('status', params.status);
  if (params?.review_status) query.set('review_status', params.review_status);
  if (params?.difficulty !== undefined) query.set('difficulty', params.difficulty);
  if (params?.tag) query.set('tag', params.tag);
  if (params?.has_video !== undefined) query.set('has_video', String(params.has_video));
  if (params?.sort_by) query.set('sort_by', params.sort_by);
  if (params?.sort_order) query.set('sort_order', params.sort_order);

  const queryString = query.toString();
  return queryString ? `?${queryString}` : '';
}

export const algorithmsApi = {
  async getAssets(params?: AlgorithmAssetListParams) {
    const response = await apiClient.get<AlgorithmAssetListResponse>(
      `/api/algorithm-assets${buildAlgorithmAssetQuery(params)}`,
    );

    return {
      ...response,
      data: {
        ...response.data,
        assets: (response.data.assets || []).map(normalizeAlgorithmAsset),
      },
    };
  },

  async getAsset(id: number | string) {
    const response = await apiClient.get<AlgorithmAsset>(`/api/algorithm-assets/${id}`);
    return {
      ...response,
      data: normalizeAlgorithmAsset(response.data),
    };
  },

  async createAsset(data: SaveAlgorithmAssetInput) {
    const response = await apiClient.post<AlgorithmAsset>('/api/algorithm-assets', data);
    return {
      ...response,
      data: normalizeAlgorithmAsset(response.data),
    };
  },

  async updateAsset(id: number | string, data: SaveAlgorithmAssetInput) {
    const response = await apiClient.put<AlgorithmAsset>(`/api/algorithm-assets/${id}`, data);
    return {
      ...response,
      data: normalizeAlgorithmAsset(response.data),
    };
  },

  async createMarkdownFile(assetId: number | string, data: SaveAlgorithmAssetMarkdownFileInput) {
    const response = await apiClient.post<AlgorithmAsset>(
      `/api/algorithm-assets/${assetId}/files/markdown`,
      data,
    );
    return {
      ...response,
      data: normalizeAlgorithmAsset(response.data),
    };
  },

  async createVideoFile(assetId: number | string, data: SaveAlgorithmAssetVideoFileInput) {
    const response = await apiClient.post<AlgorithmAsset>(
      `/api/algorithm-assets/${assetId}/files/video`,
      data,
    );
    return {
      ...response,
      data: normalizeAlgorithmAsset(response.data),
    };
  },

  async updateFile(assetId: number | string, fileId: number | string, data: UpdateAlgorithmAssetFileInput) {
    const response = await apiClient.put<AlgorithmAsset>(
      `/api/algorithm-assets/${assetId}/files/${fileId}`,
      data,
    );
    return {
      ...response,
      data: normalizeAlgorithmAsset(response.data),
    };
  },

  async deleteFile(assetId: number | string, fileId: number | string) {
    const response = await apiClient.delete<AlgorithmAsset>(`/api/algorithm-assets/${assetId}/files/${fileId}`);
    return {
      ...response,
      data: normalizeAlgorithmAsset(response.data),
    };
  },

  async updatePrimaryFiles(assetId: number | string, data: UpdateAlgorithmAssetPrimaryFilesInput) {
    const response = await apiClient.patch<AlgorithmAsset>(
      `/api/algorithm-assets/${assetId}/primary-files`,
      data,
    );
    return {
      ...response,
      data: normalizeAlgorithmAsset(response.data),
    };
  },

  async updateLearning(assetId: number | string, data: UpdateAlgorithmAssetLearningInput) {
    const response = await apiClient.patch<AlgorithmAsset>(`/api/algorithm-assets/${assetId}/learning`, data);
    return {
      ...response,
      data: normalizeAlgorithmAsset(response.data),
    };
  },

  async uploadVideo(file: File, onProgress?: (progress: number) => void) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.getRawClient().post<UploadMediaResponse>('/api/upload/media', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
      timeout: 120000,
    });

    return response.data;
  },
};
