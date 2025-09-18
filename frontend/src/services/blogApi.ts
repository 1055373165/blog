<<<<<<< Updated upstream
import { BlogListResponse, Blog, CreateBlogInput, UpdateBlogInput, BlogFilters } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

class BlogApiService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = localStorage.getItem('auth_token');
    
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // 获取博客列表
  async getBlogs(filters: BlogFilters = {}, page = 1, limit = 10): Promise<BlogListResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    // 添加筛选参数
    if (filters.search) {
      params.append('search', filters.search);
    }
    if (filters.type) {
      params.append('type', filters.type);
    }
    if (filters.category_id) {
      params.append('category_id', filters.category_id.toString());
    }
    if (filters.tag_ids && filters.tag_ids.length > 0) {
      filters.tag_ids.forEach(id => params.append('tag_ids', id.toString()));
    }
    if (filters.is_published !== undefined) {
      params.append('is_published', filters.is_published.toString());
    }
    if (filters.sort_by) {
      params.append('sort_by', filters.sort_by);
    }
    if (filters.sort_order) {
      params.append('sort_order', filters.sort_order);
    }

    return this.request<BlogListResponse>(`/blogs?${params}`);
  }

  // 获取单个博客
  async getBlog(id: number): Promise<Blog> {
    return this.request<Blog>(`/blogs/${id}`);
  }

  // 通过slug获取博客
  async getBlogBySlug(slug: string): Promise<Blog> {
    return this.request<Blog>(`/blogs/slug/${slug}`);
  }

  // 创建博客
  async createBlog(data: CreateBlogInput): Promise<Blog> {
    return this.request<Blog>('/blogs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // 更新博客
  async updateBlog(id: number, data: UpdateBlogInput): Promise<Blog> {
    return this.request<Blog>(`/blogs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // 删除博客
  async deleteBlog(id: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/blogs/${id}`, {
      method: 'DELETE',
    });
  }

  // 批量删除博客
  async deleteBulkBlogs(ids: number[]): Promise<{ message: string }> {
    return this.request<{ message: string }>('/blogs/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
  }

  // 切换博客发布状态
  async togglePublishStatus(id: number): Promise<Blog> {
    return this.request<Blog>(`/blogs/${id}/toggle-publish`, {
      method: 'PATCH',
    });
  }

  // 批量发布/取消发布
  async bulkPublish(ids: number[], is_published: boolean): Promise<{ message: string }> {
    return this.request<{ message: string }>('/blogs/bulk-publish', {
      method: 'POST',
      body: JSON.stringify({ ids, is_published }),
    });
  }

  // 点赞博客
  async likeBlog(id: number): Promise<{ message: string; is_liked: boolean; likes_count: number }> {
    return this.request<{ message: string; is_liked: boolean; likes_count: number }>(`/blogs/${id}/like`, {
      method: 'POST',
    });
  }

  // 记录博客浏览
  async viewBlog(id: number): Promise<{ message: string; views_count: number }> {
    return this.request<{ message: string; views_count: number }>(`/blogs/${id}/view`, {
      method: 'POST',
    });
  }

  // 上传媒体文件
  async uploadMedia(file: File, onProgress?: (progress: number) => void): Promise<{ url: string; filename: string; size: number; duration?: number; mime_type: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('auth_token');
    
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = (e.loaded / e.total) * 100;
            onProgress(progress);
          }
        });
      }

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (error) {
            reject(new Error('Invalid response format'));
          }
        } else {
          reject(new Error(`Upload failed: ${xhr.statusText}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });

      xhr.open('POST', `${API_BASE_URL}/upload/media`);
      
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      xhr.send(formData);
    });
  }

  // 上传缩略图
  async uploadThumbnail(file: File, onProgress?: (progress: number) => void): Promise<{ url: string; filename: string; size: number }> {
    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('auth_token');
    
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = (e.loaded / e.total) * 100;
            onProgress(progress);
          }
        });
      }

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (error) {
            reject(new Error('Invalid response format'));
          }
        } else {
          reject(new Error(`Upload failed: ${xhr.statusText}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });

      xhr.open('POST', `${API_BASE_URL}/upload/thumbnail`);
      
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      xhr.send(formData);
    });
  }

  // 获取博客统计信息
  async getBlogStats(): Promise<{
    total_blogs: number;
    published_blogs: number;
    draft_blogs: number;
    total_views: number;
    total_likes: number;
    audio_blogs: number;
    video_blogs: number;
  }> {
    return this.request<{
      total_blogs: number;
      published_blogs: number;
      draft_blogs: number;
      total_views: number;
      total_likes: number;
      audio_blogs: number;
      video_blogs: number;
    }>('/blogs/stats');
  }
}

export const blogApi = new BlogApiService();
=======
import { BlogListResponse, Blog, CreateBlogInput, UpdateBlogInput, BlogFilters } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

class BlogApiService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = localStorage.getItem('auth_token'); // or 'auth_token' depending on your setup
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });
    
    if (!response.ok) {
      const errorData: any = await response.json().catch(() => ({}));
      const errMsg = errorData.error || errorData.message || response.statusText || `HTTP ${response.status}`;
      throw new Error(errMsg);
    }

    // Return raw JSON (do not unwrap globally) to preserve existing consumers
    return response.json();
  }

  // 获取博客列表
  async getBlogs(filters: BlogFilters = {}, page = 1, limit = 10): Promise<BlogListResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    // 添加筛选参数
    if (filters.search) {
      params.append('search', filters.search);
    }
    if (filters.type) {
      params.append('type', filters.type);
    }
    if (filters.category_id) {
      params.append('category_id', filters.category_id.toString());
    }
    if (filters.tag_ids && filters.tag_ids.length > 0) {
      filters.tag_ids.forEach(id => params.append('tag_ids', id.toString()));
    }
    if (filters.is_published !== undefined) {
      params.append('is_published', filters.is_published.toString());
    }
    if (filters.sort_by) {
      params.append('sort_by', filters.sort_by);
    }
    if (filters.sort_order) {
      params.append('sort_order', filters.sort_order);
    }

    return this.request<BlogListResponse>(`/api/blogs?${params}`);
  }

  // 获取单个博客
  async getBlog(id: number): Promise<Blog> {
    const res: any = await this.request<any>(`/api/blogs/${id}`);
    return res?.data ?? res;
  }

  // 通过slug获取博客
  async getBlogBySlug(slug: string): Promise<Blog> {
    const res: any = await this.request<any>(`/api/blogs/slug/${slug}`);
    return res?.data ?? res;
  }

  // 创建博客
  async createBlog(data: CreateBlogInput): Promise<Blog> {
    return this.request<Blog>('/api/blogs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // 更新博客
  async updateBlog(id: number, data: UpdateBlogInput): Promise<Blog> {
    return this.request<Blog>(`/api/blogs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // 删除博客
  async deleteBlog(id: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/api/blogs/${id}`, {
      method: 'DELETE',
    });
  }

  // 批量删除博客
  async deleteBulkBlogs(ids: number[]): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/api/blogs/bulk-delete`, {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
  }

  // 切换博客发布状态
  async togglePublishStatus(id: number): Promise<Blog> {
    return this.request<Blog>(`/api/blogs/${id}/toggle-publish`, {
      method: 'PATCH',
    });
  }

  // 批量发布/取消发布
  async bulkPublish(ids: number[], is_published: boolean): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/api/blogs/bulk-publish`, {
      method: 'POST',
      body: JSON.stringify({ ids, is_published }),
    });
  }

  // 点赞博客
  async likeBlog(id: number): Promise<{ message: string; is_liked: boolean; likes_count: number }> {
    return this.request<{ message: string; is_liked: boolean; likes_count: number }>(`/api/blogs/${id}/like`, {
      method: 'POST',
    });
  }

  // 记录博客浏览
  async viewBlog(id: number): Promise<{ message: string; views_count: number }> {
    return this.request<{ message: string; views_count: number }>(`/api/blogs/${id}/views`, {
      method: 'POST',
    });
  }

  // 上传媒体文件
  async uploadMedia(file: File, onProgress?: (progress: number) => void): Promise<{ url: string; filename: string; size: number; duration?: number; mime_type: string }> {
    const formData = new FormData();
    formData.append('file', file);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = (e.loaded / e.total) * 100;
            onProgress(progress);
          }
        });
      }

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (error) {
            reject(new Error('Invalid response format'));
          }
        } else {
          reject(new Error(`Upload failed: ${xhr.statusText}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });

      xhr.open('POST', `${API_BASE_URL}/upload/media`);
      const token = localStorage.getItem('auth_token');
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      xhr.send(formData);
    });
  }

  // 上传缩略图
  async uploadThumbnail(file: File, onProgress?: (progress: number) => void): Promise<{ url: string; filename: string; size: number }> {
    const formData = new FormData();
    formData.append('file', file);
    
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = (e.loaded / e.total) * 100;
            onProgress(progress);
          }
        });
      }

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (error) {
            reject(new Error('Invalid response format'));
          }
        } else {
          reject(new Error(`Upload failed: ${xhr.statusText}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });

      xhr.open('POST', `${API_BASE_URL}/upload/thumbnail`);
      const token = localStorage.getItem('auth_token');
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      xhr.send(formData);
    });
  }

  // 获取博客统计信息
  async getBlogStats(): Promise<{
    total_blogs: number;
    published_blogs: number;
    draft_blogs: number;
    total_views: number;
    total_likes: number;
    audio_blogs: number;
    video_blogs: number;
  }> {
    return this.request<{
      total_blogs: number;
      published_blogs: number;
      draft_blogs: number;
      total_views: number;
      total_likes: number;
      audio_blogs: number;
      video_blogs: number;
    }>('/api/blogs/stats');
  }
}

export const blogApi = new BlogApiService();
>>>>>>> Stashed changes
export default blogApi;