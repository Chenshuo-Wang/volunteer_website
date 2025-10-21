import axios from 'axios';

// 创建一个 axios 实例
const apiClient = axios.create({
  // 这里的 URL 就是您 Flask 后端的地址
  baseURL: 'http://127.0.0.1:5000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// 导出这个实例，以便在其他组件中使用
export default apiClient;