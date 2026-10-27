import axios from 'axios';
import { onRequestStart, onRequestEnd } from './pageTransition';

const apiClient = axios.create({
  // 支持通过环境变量 VITE_API_BASE_URL 指定外部后端（例如 Render / Railway 独立服务），
  // 未指定时：生产环境默认为同域相对路径 /api (Vercel Serverless)，开发环境默认为 http://localhost:5000/api
  baseURL: import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5000/api' : '/api'),
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器：附加管理员凭证并通知页面过渡管理器请求开始
apiClient.interceptors.request.use(
  (config) => {
    onRequestStart();
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && user.isAdmin) {
      // 使用管理员的手机号作为 Token
      config.headers['X-Admin-Token'] = user.phone;
    }
    return config;
  },
  (error) => {
    onRequestEnd();
    return Promise.reject(error);
  }
);

// 响应拦截器：通知页面过渡管理器请求结束
apiClient.interceptors.response.use(
  (response) => {
    onRequestEnd();
    return response;
  },
  (error) => {
    onRequestEnd();
    return Promise.reject(error);
  }
);

export default apiClient;
