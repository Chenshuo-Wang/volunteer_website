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
  border: 1px solid rgba(69, 196, 176, 0.3);
  box-shadow: 0 12px 32px rgba(1, 32, 48, 0.08);
}

.register-header {
  text-align: center;
  margin-bottom: 30px;
}

.register-header h2 {
  color: #012030;
  margin-bottom: 8px;
}

.register-header p {
  color: #13678A;
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
  color: #012030;
}

.form-group input {
  width: 100%;
  padding: 12px;
  border: 1px solid rgba(19, 103, 138, 0.25);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.95);
  color: #012030;
  transition: all 0.3s ease;
}

.form-group input:focus {
  border-color: #45C4B0;
  box-shadow: 0 0 0 3px rgba(69, 196, 176, 0.25);
  outline: none;
}

.error-msg {
  color: #012030;
  font-size: 0.9rem;
  text-align: center;
  margin-bottom: 16px;
  background: rgba(1, 32, 48, 0.08);
  border: 1px solid #13678A;
  padding: 8px;
  border-radius: 6px;
}

.w-100 {
  width: 100%;
}

.form-footer {
  text-align: center;
  margin-top: 20px;
  color: #13678A;
}

.form-footer a {
  color: #012030;
  font-weight: 700;
  border-bottom: 1px solid #45C4B0;
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
