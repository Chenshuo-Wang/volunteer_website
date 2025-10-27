import axios from 'axios';

// 【【【 修改这里 】】】
// 我们将不再使用本地回退地址，而是完全依赖 Vercel 上的环境变量
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const apiClient = axios.create({
  baseURL: API_BASE_URL
});

export default apiClient;