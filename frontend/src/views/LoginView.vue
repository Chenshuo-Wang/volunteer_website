<template>
  <div class="container login-container">
    <div class="glass-panel login-card">
      <div class="login-header">
        <h2>🌿 登录志愿星火</h2>
        <p>使用手机号和密码登录</p>
      </div>

      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <label>手机号</label>
          <input 
            v-model="phone" 
            type="tel" 
            placeholder="请输入手机号" 
            required 
          />
        </div>

        <div class="form-group">
          <label>密码</label>
          <input 
            v-model="password" 
            type="password" 
            placeholder="请输入密码" 
            required 
          />
        </div>

        <div v-if="errorMsg" class="error-msg">
          {{ errorMsg }}
        </div>

        <button type="submit" class="btn-primary w-100" :disabled="loading">
          {{ loading ? '登录中...' : '立即登录' }}
        </button>

        <div class="form-footer">
          还没有账号？<router-link to="/register">立即注册</router-link>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { store } from '../store';
import apiClient from '../services/api';

const router = useRouter();
const phone = ref('');
const password = ref('');
const loading = ref(false);
const errorMsg = ref('');

const handleLogin = async () => {
  loading.value = true;
  errorMsg.value = '';
  
  try {
    const response = await apiClient.post('/students/login', {
      phone: phone.value,
      password: password.value
    });
    
    // 登录成功
    store.login(response.data.student);
    router.push('/');
    
  } catch (err) {
    console.error(err);
    errorMsg.value = err.response?.data?.message || '登录失败，请检查网络';
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 160px);
}

.login-card {
  width: 100%;
  max-width: 400px;
  padding: 40px;
}

.login-header {
  text-align: center;
  margin-bottom: 30px;
}

.login-header h2 {
  color: var(--primary-color);
  margin-bottom: 8px;
}

.login-header p {
  color: var(--text-muted);
  font-size: 0.9rem;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: var(--text-color);
}

.form-group input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.9);
  transition: all 0.3s ease;
}

.form-group input:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  outline: none;
}

.error-msg {
  color: #ef4444;
  font-size: 0.9rem;
  text-align: center;
  margin-bottom: 16px;
  background: #fee2e2;
  padding: 8px;
  border-radius: 4px;
}

.w-100 {
  width: 100%;
}

.form-footer {
  text-align: center;
  margin-top: 20px;
  color: var(--text-muted);
}

.form-footer a {
  color: var(--primary-color);
  text-decoration: none;
}

/* 移动端适配 */
@media (max-width: 640px) {
  .login-card {
    padding: 24px;
  }
}
</style>
