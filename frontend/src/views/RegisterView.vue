<template>
  <div class="container register-container">
    <div class="glass-panel register-card">
      <div class="register-header">
        <h2>📝 学生注册</h2>
        <p>填写信息创建账号</p>
      </div>

      <form @submit.prevent="handleRegister" class="register-form">
        <div class="form-group">
          <label>姓名 *</label>
          <input v-model="form.name" required />
        </div>

        <div class="form-group">
          <label>手机号 *</label>
          <input v-model="form.phone" type="tel" required />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>入学年份 *</label>
            <input v-model="form.enrollmentYear" type="number" min="2000" max="2030" required />
          </div>
          <div class="form-group">
            <label>班级号 *</label>
            <input v-model="form.classNumber" type="number" min="1" max="20" required />
          </div>
        </div>

        <div class="form-group">
          <label>密码 *</label>
          <input v-model="form.password" type="password" required />
        </div>

        <div class="form-group">
          <label>确认密码 *</label>
          <input v-model="form.confirmPassword" type="password" required />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>QQ（选填）</label>
            <input v-model="form.qq" />
          </div>
          <div class="form-group">
            <label>微信（选填）</label>
            <input v-model="form.wechat" />
          </div>
        </div>

        <div v-if="errorMsg" class="error-msg">
          {{ errorMsg }}
        </div>

        <button type="submit" class="btn-primary w-100" :disabled="loading">
          {{ loading ? '注册中...' : '注册账号' }}
        </button>

        <div class="form-footer">
          已有账号？<router-link to="/login">立即登录</router-link>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import apiClient from '../services/api';

const router = useRouter();
const loading = ref(false);
const errorMsg = ref('');

const form = reactive({
  name: '',
  phone: '',
  enrollmentYear: 2023,
  classNumber: 1,
  password: '',
  confirmPassword: '',
  qq: '',
  wechat: ''
});

const handleRegister = async () => {
  loading.value = true;
  errorMsg.value = '';
  
  // 验证密码
  if (form.password !== form.confirmPassword) {
    errorMsg.value = '两次输入的密码不一致';
    loading.value = false;
    return;
  }

  if (form.password.length < 6) {
    errorMsg.value = '密码长度至少6位';
    loading.value = false;
    return;
  }

  try {
    await apiClient.post('/students/register', {
      name: form.name,
      phone: form.phone,
      enrollmentYear: form.enrollmentYear,
      classNumber: form.classNumber,
      password: form.password,
      qq: form.qq,
      wechat: form.wechat
    });

    alert('注册成功！请登录');
    router.push('/login');
    
  } catch (err) {
    console.error(err);
    errorMsg.value = err.response?.data?.message || '注册失败，请稍后重试';
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.register-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 160px);
  padding: 20px;
}

.register-card {
  width: 100%;
  max-width: 500px;
  padding: 40px;
}

.register-header {
  text-align: center;
  margin-bottom: 30px;
}

.register-header h2 {
  color: var(--primary-color);
  margin-bottom: 8px;
}

.register-header p {
  color: var(--text-muted);
  font-size: 0.9rem;
}

.form-group {
  margin-bottom: 20px;
}

.form-row {
  display: flex;
  gap: 16px;
}

.form-row .form-group {
  flex: 1;
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
  .register-card {
    padding: 24px;
  }

  .form-row {
    flex-direction: column;
    gap: 0;
  }
}
</style>
