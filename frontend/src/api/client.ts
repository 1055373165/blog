import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import type { ApiResponse } from '../types';

// API基础配置
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

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
        // 添加认证token
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // 添加请求日志
        console.log(`🚀 ${config.method?.toUpperCase()} ${config.url}`, config.data || config.params);
        
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
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user');
          // 重定向到登录页
          window.location.href = '/admin/login';
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
  async upload<T>(url: string, file: File, onProgress?: (progress: number) => void): Promise<ApiResponse<T>> {
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