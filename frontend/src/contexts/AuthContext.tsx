import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient, authApi } from '../api';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; name: string; password: string; github_url?: string; bio?: string }) => Promise<void>;
  logout: () => void;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user && !!token;

  // 初始化认证状态
  useEffect(() => {
    initAuth();
  }, []);

  const initAuth = async () => {
    try {
      const savedToken = localStorage.getItem('auth_token');
      const savedUser = localStorage.getItem('user');

      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
        apiClient.setAuthToken(savedToken);

        // 验证token是否仍然有效
        try {
          const response = await authApi.getProfile();
          if (response.success) {
            setUser(response.data);
            localStorage.setItem('user', JSON.stringify(response.data));
          } else {
            throw new Error('Token invalid');
          }
        } catch (error) {
          // Token无效，清理状态
          handleLogout();
        }
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      handleLogout();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await authApi.login(email, password);
      
      if (response.success) {
        const { token: newToken, user: userData } = response.data;
        
        // 设置状态
        setToken(newToken);
        setUser(userData);
        
        // 持久化存储
        localStorage.setItem('auth_token', newToken);
        localStorage.setItem('user', JSON.stringify(userData));
        
        // 设置API客户端token
        apiClient.setAuthToken(newToken);
      } else {
        throw new Error(response.error || '登录失败');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (data: { email: string; name: string; password: string; github_url?: string; bio?: string }) => {
    try {
      const response = await authApi.register(data);
      
      if (response.success) {
        const { token: newToken, user: userData } = response.data;
        
        // 设置状态
        setToken(newToken);
        setUser(userData);
        
        // 持久化存储
        localStorage.setItem('auth_token', newToken);
        localStorage.setItem('user', JSON.stringify(userData));
        
        // 设置API客户端token
        apiClient.setAuthToken(newToken);
      } else {
        throw new Error(response.error || '注册失败');
      }
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // 调用后端登出接口
      if (token) {
        await authApi.logout();
      }
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      handleLogout();
    }
  };

  const handleLogout = () => {
    // 清理状态
    setUser(null);
    setToken(null);
    
    // 清理本地存储
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    
    // 清理API客户端token
    apiClient.clearAuthToken();
  };

  const refreshAuth = async () => {
    try {
      const response = await authApi.getProfile();
      if (response.success) {
        setUser(response.data);
        localStorage.setItem('user', JSON.stringify(response.data));
      }
    } catch (error) {
      console.error('Refresh auth error:', error);
      handleLogout();
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    refreshAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;