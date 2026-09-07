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
  background: #ffffff;
  border: 2px solid #012030;
  border-radius: 2px;
  box-shadow: 6px 6px 0px #012030;
}

.login-header {
  text-align: center;
  margin-bottom: 30px;
}

.login-header h2 {
  color: #012030;
  font-weight: 900;
  letter-spacing: -0.01em;
  margin-bottom: 8px;
}

.login-header p {
  color: #13678A;
  font-weight: 600;
  font-size: 0.9rem;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 700;
  color: #012030;
}

.form-group input {
  width: 100%;
  padding: 12px;
  border: 2px solid #012030;
  border-radius: 2px;
  background: #ffffff;
  color: #012030;
  font-weight: 600;
  transition: all 0.15s ease;
  box-sizing: border-box;
}

.form-group input:focus {
  border-color: #012030;
  box-shadow: 3px 3px 0px #45C4B0;
  outline: none;
}

.error-msg {
  color: #012030;
  font-size: 0.9rem;
  font-weight: 700;
  text-align: center;
  margin-bottom: 16px;
  background: rgba(1, 32, 48, 0.08);
  border: 2px solid #012030;
  box-shadow: 2px 2px 0px #012030;
  padding: 10px;
  border-radius: 2px;
}

.w-100 {
  width: 100%;
}

.form-footer {
  text-align: center;
  margin-top: 20px;
  color: #13678A;
  font-weight: 600;
}

.form-footer a {
  color: #012030;
  font-weight: 800;
  border-bottom: 2px solid #012030;
  text-decoration: none;
}

/* 移动端适配 */
@media (max-width: 640px) {
  .login-card {
    padding: 24px;
  }
}
</style>
