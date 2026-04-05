import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import type { ApiResponse } from '../types';

// API基础配置
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // 请求拦截器
    this.client.interceptors.request.use(
      (config) => {
        // 添加认证token - 优先使用headers中已设置的token，否则从localStorage读取
        if (!config.headers.Authorization) {
          const token = localStorage.getItem('auth_token');
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
            console.log('🔐 Added auth token to request:', token.substring(0, 20) + '...');
          } else {
            console.log('🔓 No auth token found in localStorage');
          }
        }

        // 添加请求日志
        const logData = config.data ? `Data: ${JSON.stringify(config.data)}` :
                       config.params ? `Params: ${JSON.stringify(config.params)}` :
                       'No payload';
        console.log(`🚀 ${config.method?.toUpperCase()} ${config.url} - ${logData}`);

        return config;
      },
      (error) => {
        console.error('Request error:', error);
        return Promise.reject(error);
      }
    );

    // 响应拦截器
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url}`, response.data);
        return response;
      },
      (error) => {
        console.error('Response error:', error.response?.data || error.message);
        
        // 处理认证错误
        if (error.response?.status === 401) {
          // 只清理localStorage，不自动重定向
          // 让AuthContext处理认证失败的逻辑
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user');

          // 抛出具体的认证错误
          const authError = new Error('token无效或已过期');
          authError.name = 'AuthenticationError';
          return Promise.reject(authError);
        }

        // 处理网络错误
        if (!error.response) {
          return Promise.reject({
            message: '网络连接失败，请检查网络状态',
            code: 'NETWORK_ERROR'
          });
        }

        return Promise.reject(error.response?.data || error);
      }
    );
  }

  // GET请求
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.get<ApiResponse<T>>(url, config);
    return response.data;
  }

  // POST请求
  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.post<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  // PUT请求
  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.put<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  // PATCH请求
  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.patch<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  // DELETE请求
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.delete<ApiResponse<T>>(url, config);
    return response.data;
  }

  // 文件上传
  async upload<T>(url: string, file: File, onProgress?: (progress: number) => void, timeout?: number): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.client.post<ApiResponse<T>>(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
      timeout: timeout, // 使用传入的超时时间
    });

    return response.data;
  }

  // 文件上传 + 额外字段
  async uploadWithFields<T>(url: string, file: File, fields?: Record<string, string>, onProgress?: (progress: number) => void): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);
    if (fields) {
      for (const [key, value] of Object.entries(fields)) {
        formData.append(key, value);
      }
    }

    const response = await this.client.post<ApiResponse<T>>(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });

    return response.data;
  }

  // 批量请求
  async batch<T>(requests: Promise<any>[]): Promise<T[]> {
    try {
      const responses = await Promise.allSettled(requests);
      return responses.map((response, index) => {
        if (response.status === 'fulfilled') {
          return response.value;
        } else {
          console.error(`Batch request ${index} failed:`, response.reason);
          return null;
        }
      }).filter(Boolean);
    } catch (error) {
      console.error('Batch request failed:', error);
      throw error;
    }
  }

  // 设置认证token
  setAuthToken(token: string) {
    localStorage.setItem('auth_token', token);
    this.client.defaults.headers.Authorization = `Bearer ${token}`;
  }

  // 清除认证token
  clearAuthToken() {
    localStorage.removeItem('auth_token');
    delete this.client.defaults.headers.Authorization;
  }

  // 获取原始axios实例（用于特殊需求）
  getRawClient(): AxiosInstance {
    return this.client;
  }
}

// 导出单例实例
export const apiClient = new ApiClient();
export default apiClient;