<template>
  <div class="container auth-container">
    <div class="swiss-auth-frame">
      <header class="auth-header">
        <div class="editorial-kicker">PORTAL // AUTHENTICATION</div>
        <h1 class="auth-title">ANSHEN<br />VOLUNTEER<span class="editorial-dot">.</span></h1>
        <p class="auth-sub">输入注册手机号与安全凭据，进入校园志愿服务档案系统。</p>
      </header>

      <form @submit.prevent="handleLogin" class="auth-form">
        <div class="form-group">
          <label>01 // PHONE NUMBER 手机号</label>
          <input
            v-model="phone"
            type="tel"
            placeholder="请输入手机号"
            required
          />
        </div>

        <div class="form-group">
          <label>02 // PASSWORD 密码</label>
          <input
            v-model="password"
            type="password"
            placeholder="请输入密码"
            required
          />
        </div>

        <div v-if="errorMsg" class="swiss-error">
          {{ errorMsg }}
        </div>

        <button type="submit" class="btn-primary w-100 auth-submit" :disabled="loading">
          {{ loading ? 'AUTHENTICATING // 登录中...' : 'SIGN IN // 立即登录' }}
        </button>

        <div class="auth-footer">
          <span class="footer-prompt">尚未建立志愿者档案？</span>
          <router-link to="/register" class="auth-switch-link">REGISTER // 立即注册 →</router-link>
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
.auth-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 180px);
}

.swiss-auth-frame {
  width: 100%;
  max-width: 440px;
  background: var(--surface-white);
  border-top: var(--rule-heavy);
  border-left: var(--hairline);
  border-right: var(--hairline);
  border-bottom: var(--hairline);
}

.auth-header {
  padding: 36px 36px 28px;
  border-bottom: var(--hairline);
}

.auth-title {
  font-size: 2.3rem;
  font-weight: 900;
  letter-spacing: -0.035em;
  line-height: 0.96;
  color: var(--c-dark);
  margin: 0 0 14px;
}

.auth-sub {
  margin: 0;
  font-size: 0.88rem;
  color: var(--text-muted);
  line-height: 1.5;
}

.auth-form {
  padding: 32px 36px 36px;
}

.form-group {
  margin-bottom: 22px;
}

.swiss-error {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: #991B1B;
  background: #FEF2F2;
  border-left: 3px solid #DC2626;
  padding: 10px 14px;
  margin-bottom: 18px;
}

.w-100 {
  width: 100%;
}

.auth-submit {
  padding: 14px;
  margin-top: 4px;
}

.auth-footer {
  margin-top: 24px;
  padding-top: 18px;
  border-top: var(--hairline);
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.84rem;
}

.footer-prompt {
  color: var(--text-muted);
}

.auth-switch-link {
  font-family: var(--font-mono);
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--c-dark);
  border-bottom: 1px solid var(--c-dark);
  padding-bottom: 2px;
  transition: color var(--transition-fast), border-color var(--transition-fast);
}

.auth-switch-link:hover {
  color: var(--c-teal);
  border-color: var(--c-teal);
}

@media (max-width: 640px) {
  .auth-header,
  .auth-form {
    padding: 26px 22px;
  }
}
</style>
