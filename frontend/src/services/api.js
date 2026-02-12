import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:5000/api',
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