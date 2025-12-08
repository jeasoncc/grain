// 简单的认证管理（生产环境应该使用更安全的方案）
const AUTH_TOKEN_KEY = 'admin_auth_token';
const AUTH_USER_KEY = 'admin_user';

export interface User {
  username: string;
  name?: string;
}

// 简单的认证逻辑（实际项目中应该调用 API）
export const auth = {
  // 登录（简化版，实际应该调用 API）
  login: async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    // 这里简化处理，实际应该调用后端 API
    // 临时：简单的用户名密码验证
    if (username === 'admin' && password === 'admin123') {
      const token = `token_${Date.now()}`;
      localStorage.setItem(AUTH_TOKEN_KEY, token);
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify({ username, name: '管理员' }));
      return { success: true };
    }
    return { success: false, error: '用户名或密码错误' };
  },

  // 登出
  logout: () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
  },

  // 检查是否已登录
  isAuthenticated: (): boolean => {
    return !!localStorage.getItem(AUTH_TOKEN_KEY);
  },

  // 获取当前用户
  getCurrentUser: (): User | null => {
    const userStr = localStorage.getItem(AUTH_USER_KEY);
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  // 获取 token
  getToken: (): string | null => {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  },
};

