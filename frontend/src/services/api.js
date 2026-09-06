import axios from 'axios';

const apiClient = axios.create({
  // 支持通过环境变量 VITE_API_BASE_URL 指定外部后端（例如 Render / Railway 独立服务），
  // 未指定时：生产环境默认为同域相对路径 /api (Vercel Serverless)，开发环境默认为 http://localhost:5000/api
  baseURL: import.meta.env.VITE_API_BASE_URL || (import.meta.env.MODE === 'production' ? '/api' : 'http://localhost:5000/api'),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor
apiClient.interceptors.request.use(config => {
  const user = JSON.parse(localStorage.getItem('user'));
  if (user && user.isAdmin) {
    // 使用管理员的手机号作为 Token
    config.headers['X-Admin-Token'] = user.phone;
  }
  return config;
}, error => {
  return Promise.reject(error);
});

export default apiClient;