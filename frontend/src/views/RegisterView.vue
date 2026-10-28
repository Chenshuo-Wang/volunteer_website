<template>
  <div class="container auth-container">
    <div class="swiss-auth-frame register-frame">
      <header class="auth-header">
        <div class="editorial-kicker">PORTAL // REGISTRATION</div>
        <h1 class="auth-title">建立志愿者档案<span class="editorial-dot">.</span></h1>
        <p class="auth-sub">填写个人学籍与联络信息，激活校园志愿服务与工时记录账户。</p>
      </header>

      <form @submit.prevent="handleRegister" class="auth-form">
        <div class="form-row">
          <div class="form-group">
            <label>01 // FULL NAME 姓名 *</label>
            <input v-model="form.name" placeholder="真实姓名" required />
          </div>
          <div class="form-group">
            <label>02 // PHONE 手机号 *</label>
            <input v-model="form.phone" type="tel" placeholder="11 位手机号" required />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>03 // COHORT 入学年份 *</label>
            <input v-model="form.enrollmentYear" type="number" min="2000" max="2030" required />
          </div>
          <div class="form-group">
            <label>04 // CLASS 班级号 *</label>
            <input v-model="form.classNumber" type="number" min="1" max="20" required />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>05 // PASSWORD 密码 *</label>
            <input v-model="form.password" type="password" placeholder="至少 6 位字符" required />
          </div>
          <div class="form-group">
            <label>06 // CONFIRM 确认密码 *</label>
            <input v-model="form.confirmPassword" type="password" placeholder="再次输入密码" required />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>07 // QQ (OPTIONAL)</label>
            <input v-model="form.qq" placeholder="选填" />
          </div>
          <div class="form-group">
            <label>08 // WECHAT (OPTIONAL)</label>
            <input v-model="form.wechat" placeholder="选填" />
          </div>
        </div>

        <div v-if="errorMsg" class="swiss-error">
          {{ errorMsg }}
        </div>

        <button type="submit" class="btn-primary w-100 auth-submit" :disabled="loading">
          {{ loading ? 'CREATING DOSSIER // 注册中...' : 'CREATE ACCOUNT // 完成注册' }}
        </button>

        <div class="auth-footer">
          <span class="footer-prompt">已有志愿者档案？</span>
          <router-link to="/login" class="auth-switch-link">SIGN IN // 返回登录 →</router-link>
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
.auth-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 180px);
}

.swiss-auth-frame {
  width: 100%;
  max-width: 580px;
  background: var(--surface-white);
  border-top: var(--rule-heavy);
  border-left: var(--hairline);
  border-right: var(--hairline);
  border-bottom: var(--hairline);
}

.auth-header {
  padding: 36px 36px 26px;
  border-bottom: var(--hairline);
}

.auth-title {
  font-size: 2rem;
  font-weight: 900;
  letter-spacing: -0.03em;
  line-height: 1.05;
  color: var(--c-dark);
  margin: 0 0 10px;
}

.auth-sub {
  margin: 0;
  font-size: 0.88rem;
  color: var(--text-muted);
}

.auth-form {
  padding: 30px 36px 36px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-group {
  margin-bottom: 18px;
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
  margin-top: 6px;
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
    padding: 24px 20px;
  }

  .form-row {
    grid-template-columns: 1fr;
    gap: 0;
  }
}
</style>
