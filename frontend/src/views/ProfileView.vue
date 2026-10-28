<template>
  <div class="container">
    <div v-if="profile">
      <header class="editorial-header">
        <div class="header-main">
          <div class="editorial-kicker">INDEX // 03 — VOLUNTEER DOSSIER</div>
          <h1 class="editorial-title">{{ profile.name }}<span class="editorial-dot">.</span></h1>
          <p class="editorial-subtitle">{{ profile.fullClassName }} · 个人志愿服务档案与工时认证台账</p>
        </div>
        <div class="editorial-meta-stat">
          <span class="stat-num">{{ profile.totalHours }}<small class="unit-hrs">h</small></span>
          <span class="stat-label">VERIFIED HOURS // 累计认证工时</span>
        </div>
      </header>

      <div class="swiss-profile-grid">
        <!-- 左侧栏：身份信息 + 密码修改 -->
        <div class="profile-side-col">
          <section class="swiss-panel">
            <div class="panel-header">
              <span class="panel-index">01 // IDENTITY 联络档案</span>
            </div>
            <div class="identity-body">
              <div class="identity-top">
                <div class="swiss-monogram">{{ profile.name[0] }}</div>
                <div>
                  <div class="identity-name">{{ profile.name }}</div>
                  <div class="identity-class">{{ profile.fullClassName }}</div>
                </div>
              </div>

              <div class="contact-specs">
                <div class="contact-row">
                  <span class="contact-key">PHONE</span>
                  <span class="contact-val tabular">{{ profile.phone }}</span>
                </div>
                <div v-if="profile.qq" class="contact-row">
                  <span class="contact-key">QQ</span>
                  <span class="contact-val tabular">{{ profile.qq }}</span>
                </div>
                <div v-if="profile.wechat" class="contact-row">
                  <span class="contact-key">WECHAT</span>
                  <span class="contact-val">{{ profile.wechat }}</span>
                </div>
              </div>

              <button @click="handleLogout" class="btn-secondary btn-logout-full" title="退出当前登录账号">
                <LogOut :size="15" :stroke-width="2" class="icon-inline" />
                <span>SIGN OUT // 退出当前账号</span>
              </button>
            </div>
          </section>

          <section class="swiss-panel">
            <div class="panel-header">
              <span class="panel-index">02 // SECURITY 修改密码</span>
            </div>
            <form @submit.prevent="handlePasswordChange" class="password-form">
              <div class="form-group">
                <label>CURRENT PASSWORD // 旧密码</label>
                <input v-model="passwordForm.oldPassword" type="password" required />
              </div>
              <div class="form-group">
                <label>NEW PASSWORD // 新密码</label>
                <input v-model="passwordForm.newPassword" type="password" required minlength="6" />
              </div>
              <div class="form-group">
                <label>CONFIRM // 确认新密码</label>
                <input v-model="passwordForm.confirmPassword" type="password" required />
              </div>
              <div v-if="passwordError" class="swiss-msg msg-error">{{ passwordError }}</div>
              <div v-if="passwordSuccess" class="swiss-msg msg-success">{{ passwordSuccess }}</div>
              <button type="submit" class="btn-primary w-full" :disabled="passwordLoading">
                {{ passwordLoading ? 'UPDATING // 修改中...' : 'UPDATE PASSWORD // 确认修改' }}
              </button>
            </form>
          </section>
        </div>

        <!-- 右侧主栏：志愿履历台账 -->
        <section class="swiss-panel history-panel">
          <div class="panel-header">
            <span class="panel-index">03 // SERVICE ARCHIVE 志愿服务履历</span>
            <span class="panel-count">{{ profile.history ? profile.history.length : 0 }} ENTRIES</span>
          </div>

          <div v-if="profile.history && profile.history.length > 0" class="archive-list">
            <div
              v-for="(item, index) in profile.history"
              :key="index"
              class="archive-row"
            >
              <div class="archive-idx">{{ String(index + 1).padStart(2, '0') }}</div>
              <div class="archive-main">
                <span class="archive-title">{{ item.title }}</span>
                <span class="archive-date">{{ formatDate(item.date) }}</span>
              </div>
              <div class="archive-right">
                <span class="archive-hours">+{{ item.hours }} HRS</span>
                <span
                  class="archive-status"
                  :class="{
                    'st-completed': item.status === '已完成',
                    'st-pending': item.status === '待确认',
                    'st-failed': item.status === '未完成',
                    'st-registered': item.status === '已报名' || item.status === '已参加'
                  }"
                >
                  {{ item.status }}
                </span>
              </div>
            </div>
          </div>

          <div v-else class="empty-archive">
            <p class="empty-mono">NO RECORDS FOUND // 暂无志愿服务记录</p>
            <router-link to="/events" class="btn-primary">EXPLORE EVENTS // 前往报名活动</router-link>
          </div>
        </section>
      </div>
    </div>

    <div v-else class="swiss-loading">
      LOADING DOSSIER // 正在读取志愿者档案...
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import apiClient from '../services/api';
import { store } from '../store';
import { useRouter } from 'vue-router';
import { LogOut } from '../components/icons';

const router = useRouter();
const profile = ref(null);

const passwordForm = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
});
const passwordError = ref('');
const passwordSuccess = ref('');
const passwordLoading = ref(false);

onMounted(async () => {
  if (!store.user) {
    router.push('/login');
    return;
  }

  try {
    const response = await apiClient.get('/students/profile', {
      params: { phone: store.user.phone }
    });
    profile.value = response.data;
    store.updateUser(response.data);
  } catch (error) {
    console.error('Failed to load profile', error);
  }
});

const formatDate = (isoString) => {
  return new Date(isoString).toLocaleDateString('zh-CN');
};

const handleLogout = () => {
  store.logout();
  router.push('/login');
};

const handlePasswordChange = async () => {
  passwordError.value = '';
  passwordSuccess.value = '';

  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    passwordError.value = '两次输入的新密码不一致';
    return;
  }

  if (passwordForm.value.newPassword.length < 6) {
    passwordError.value = '密码长度至少6位';
    return;
  }

  passwordLoading.value = true;

  try {
    await apiClient.put('/students/profile', {
      oldPassword: passwordForm.value.oldPassword,
      newPassword: passwordForm.value.newPassword
    }, {
      params: { phone: store.user.phone }
    });

    passwordSuccess.value = '密码修改成功';
    passwordForm.value = {
      oldPassword: '',
      newPassword: '',
      confirmPassword: ''
    };
  } catch (err) {
    console.error(err);
    passwordError.value = err.response?.data?.message || '修改失败';
  } finally {
    passwordLoading.value = false;
  }
};
</script>

<style scoped>
.unit-hrs {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--c-teal);
  margin-left: 2px;
}

.swiss-profile-grid {
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: 32px;
  align-items: start;
}

.profile-side-col {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.swiss-panel {
  background: var(--surface-white);
  border-top: var(--rule-heavy);
  border-left: var(--hairline);
  border-right: var(--hairline);
  border-bottom: var(--hairline);
}

.panel-header {
  padding: 16px 24px;
  border-bottom: var(--hairline);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-index {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: var(--text-muted);
}

.panel-count {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--text-subtle);
}

.identity-body {
  padding: 24px;
}

.identity-top {
  display: flex;
  align-items: center;
  gap: 16px;
  padding-bottom: 20px;
  border-bottom: var(--hairline);
  margin-bottom: 18px;
}

.swiss-monogram {
  width: 52px;
  height: 52px;
  background: var(--c-dark);
  color: #FFFFFF;
  font-size: 1.4rem;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.identity-name {
  font-size: 1.25rem;
  font-weight: 900;
  letter-spacing: -0.02em;
  color: var(--c-dark);
}

.identity-class {
  font-family: var(--font-mono);
  font-size: 0.78rem;
  color: var(--text-muted);
  margin-top: 2px;
}

.contact-specs {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 24px;
}

.contact-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 0.86rem;
}

.contact-key {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  letter-spacing: 0.1em;
  color: var(--text-subtle);
}

.contact-val {
  font-weight: 700;
  color: var(--c-dark);
}

.tabular {
  font-variant-numeric: tabular-nums;
}

.btn-logout-full {
  width: 100%;
  font-family: var(--font-mono);
  font-size: 0.76rem;
}

.btn-logout-full:hover {
  background: #991B1B !important;
  border-color: #991B1B !important;
  color: #FFFFFF !important;
}

.password-form {
  padding: 24px;
}

.form-group {
  margin-bottom: 16px;
}

.w-full {
  width: 100%;
}

.swiss-msg {
  font-family: var(--font-mono);
  font-size: 0.78rem;
  padding: 10px 12px;
  margin-bottom: 14px;
  border-left: 3px solid var(--c-dark);
  background: var(--surface-subtle);
}

.msg-error {
  border-left-color: #DC2626;
  color: #991B1B;
}

.msg-success {
  border-left-color: var(--c-teal);
  color: var(--c-dark);
}

/* 右侧履历列表 */
.archive-list {
  display: flex;
  flex-direction: column;
}

.archive-row {
  display: grid;
  grid-template-columns: 36px 1fr auto;
  align-items: center;
  gap: 16px;
  padding: 18px 24px;
  border-bottom: var(--hairline);
  transition: background-color var(--transition-fast);
}

.archive-row:last-child {
  border-bottom: none;
}

.archive-row:hover {
  background: #FCFCFD;
}

.archive-idx {
  font-family: var(--font-mono);
  font-size: 0.74rem;
  color: var(--text-subtle);
}

.archive-main {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.archive-title {
  font-size: 0.98rem;
  font-weight: 800;
  color: var(--c-dark);
}

.archive-date {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--text-muted);
}

.archive-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.archive-hours {
  font-family: var(--font-mono);
  font-size: 0.85rem;
  font-weight: 800;
  color: var(--c-dark);
  font-variant-numeric: tabular-nums;
}

.archive-status {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  padding: 2px 7px;
  border: var(--hairline);
}

.st-completed {
  background: rgba(69, 196, 176, 0.12);
  border-color: rgba(69, 196, 176, 0.5);
  color: var(--c-dark);
}

.st-pending {
  background: var(--surface-subtle);
  color: var(--text-muted);
}

.st-failed {
  color: #991B1B;
  border-color: rgba(153, 27, 27, 0.25);
}

.st-registered {
  color: var(--text-subtle);
}

.empty-archive {
  padding: 72px 24px;
  text-align: center;
}

.empty-mono {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  margin: 0 0 20px;
}

.swiss-loading {
  padding: 72px 24px;
  text-align: center;
  border: var(--hairline);
  background: var(--surface-white);
  font-family: var(--font-mono);
  font-size: 0.8rem;
  letter-spacing: 0.1em;
  color: var(--text-muted);
}

@media (max-width: 960px) {
  .swiss-profile-grid {
    grid-template-columns: 1fr;
  }
}
</style>
