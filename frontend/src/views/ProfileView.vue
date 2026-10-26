<template>
  <div class="container">
    <div v-if="profile" class="profile-layout">
      <!-- Left: User Info -->
      <div class="glass-panel profile-card">
        <div class="avatar-placeholder">{{ profile.name[0] }}</div>
        <h2>{{ profile.name }}</h2>
        <p class="class-info">{{ profile.fullClassName }}</p>
        
        <div class="stats-box">
          <div class="stat-value">{{ profile.totalHours }}</div>
          <div class="stat-label">累计志愿时长 (小时)</div>
        </div>

        <div class="contact-info">
          <div class="info-row">📱 {{ profile.phone }}</div>
          <div v-if="profile.qq" class="info-row">🐧 {{ profile.qq }}</div>
          <div v-if="profile.wechat" class="info-row">💬 {{ profile.wechat }}</div>
        </div>

        <button @click="handleLogout" class="btn-logout-profile" title="退出当前登录账号">
          <svg class="logout-icon" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clip-rule="evenodd" />
          </svg>
          退出登录
        </button>
      </div>

      <!-- Middle: Password Change -->
      <div class="glass-panel password-card">
        <h3>修改密码</h3>
        <form @submit.prevent="handlePasswordChange" class="password-form">
          <div class="form-group">
            <label>旧密码</label>
            <input v-model="passwordForm.oldPassword" type="password" required />
          </div>
          <div class="form-group">
            <label>新密码</label>
            <input v-model="passwordForm.newPassword" type="password" required minlength="6" />
          </div>
          <div class="form-group">
            <label>确认新密码</label>
            <input v-model="passwordForm.confirmPassword" type="password" required />
          </div>
          <div v-if="passwordError" class="error-msg">{{ passwordError }}</div>
          <div v-if="passwordSuccess" class="success-msg">{{ passwordSuccess }}</div>
          <button type="submit" class="btn-primary" :disabled="passwordLoading">
            {{ passwordLoading ? '修改中...' : '确认修改' }}
          </button>
        </form>
      </div>

      <!-- Right: History -->
      <div class="glass-panel history-card">
        <h3>志愿履历</h3>
        <div v-if="profile.history && profile.history.length > 0" class="history-list">
          <div 
            v-for="(item, index) in profile.history" 
            :key="index" 
            class="history-item"
          >
            <div class="history-left">
              <span class="history-date">{{ formatDate(item.date) }}</span>
              <span class="history-title">{{ item.title }}</span>
            </div>
            <div class="history-right">
              <span class="hours-badge">+{{ item.hours }}h</span>
              <span 
                class="status-text" 
                :class="{
                  'text-green': item.status === '已完成',
                  'text-orange': item.status === '待确认',
                  'text-red': item.status === '未完成',
                  'text-gray': item.status === '已报名' || item.status === '已参加'
                }"
              >
                {{ item.status }}
              </span>
            </div>
          </div>
        </div>
        <div v-else class="empty-history">
          <p>暂无志愿记录，快去报名活动吧！</p>
          <router-link to="/events" class="btn-primary btn-sm">去报名</router-link>
        </div>
      </div>
    </div>
    
    <div v-else class="loading-state">
      加载用户信息中...
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import apiClient from '../services/api';
import { store } from '../store';
import { useRouter } from 'vue-router';

const router = useRouter();
const profile = ref(null);

// 密码修改相关
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
    // Update local store in case details changed
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
  
  // 验证密码
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
    
    passwordSuccess.value = '密码修改成功！';
    // 重置表单
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
.profile-layout {
  display: grid;
  grid-template-columns: 1fr 1fr 2fr;
  gap: 24px;
}

@media (max-width: 1024px) {
  .profile-layout {
    grid-template-columns: 1fr;
  }
}

.profile-card {
  padding: 40px 20px;
  text-align: center;
  height: fit-content;
  background: #ffffff;
  border: 2px solid #012030;
  border-radius: 2px;
  box-shadow: 4px 4px 0px #012030;
}

.avatar-placeholder {
  width: 80px;
  height: 80px;
  background: #45C4B0;
  color: #012030;
  border-radius: 4px;
  border: 2px solid #012030;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.2rem;
  font-weight: 900;
  margin: 0 auto 16px;
  box-shadow: 3px 3px 0px #012030;
}

.class-info {
  color: #13678A;
  font-weight: 600;
  margin-bottom: 24px;
}

.stats-box {
  background: #DAFDBA;
  border: 2px solid #012030;
  box-shadow: 2px 2px 0px #012030;
  padding: 16px;
  border-radius: 2px;
  margin-bottom: 24px;
}

.stat-value {
  font-size: 2rem;
  font-weight: 900;
  color: #012030;
}

.stat-label {
  font-size: 0.8rem;
  color: #13678A;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.contact-info {
  text-align: left;
  font-size: 0.9rem;
  color: #012030;
  font-weight: 600;
}

.info-row {
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.history-card {
  padding: 30px;
  background: #ffffff;
  border: 2px solid #012030;
  border-radius: 2px;
  box-shadow: 4px 4px 0px #012030;
}

.history-card h3 {
  font-weight: 800;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #ffffff;
  border-radius: 2px;
  border: 2px solid #012030;
  border-left: 6px solid #45C4B0;
  box-shadow: 3px 3px 0px #012030;
}

.history-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.history-date {
  font-size: 0.8rem;
  font-weight: 600;
  color: #13678A;
}

.history-title {
  font-weight: 700;
  color: #012030;
}

.history-right {
  text-align: right;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.hours-badge {
  font-weight: 800;
  color: #13678A;
}

.status-text {
  font-size: 0.8rem;
}
.text-green { color: #13678A; font-weight: 700; }
.text-orange { color: #e17055; font-weight: 700; }
.text-red { color: #d63031; font-weight: 700; }
.text-gray { color: #012030; font-weight: 500; opacity: 0.6; }

.empty-history {
  text-align: center;
  padding: 40px;
  color: #13678A;
  font-weight: 600;
}

.password-card {
  padding: 30px;
  background: #ffffff;
  border: 2px solid #012030;
  border-radius: 2px;
  box-shadow: 4px 4px 0px #012030;
}

.password-card h3 {
  font-weight: 800;
}

.password-form .form-group {
  margin-bottom: 16px;
}

.password-form label {
  display: block;
  margin-bottom: 6px;
  font-weight: 700;
  color: #012030;
}

.password-form input {
  width: 100%;
  padding: 10px 12px;
  border: 2px solid #012030;
  border-radius: 2px;
  color: #012030;
  font-weight: 600;
  box-sizing: border-box;
}

.password-form input:focus {
  border-color: #012030;
  box-shadow: 3px 3px 0px #45C4B0;
  outline: none;
}

.error-msg {
  color: #012030;
  background: rgba(1, 32, 48, 0.08);
  border: 2px solid #012030;
  box-shadow: 2px 2px 0px #012030;
  padding: 8px;
  border-radius: 2px;
  margin-bottom: 12px;
  font-size: 0.9rem;
  font-weight: 700;
}

.success-msg {
  color: #012030;
  background: #DAFDBA;
  border: 2px solid #012030;
  box-shadow: 2px 2px 0px #012030;
  padding: 8px;
  border-radius: 2px;
  margin-bottom: 12px;
  font-size: 0.9rem;
  font-weight: 700;
}

.btn-logout-profile {
  width: 100%;
  margin-top: 24px;
  padding: 10px 16px;
  background: #ffffff;
  color: #012030;
  border: 2px solid #012030;
  border-radius: 2px;
  font-weight: 800;
  letter-spacing: 0.03em;
  font-size: 0.95rem;
  cursor: pointer;
  box-shadow: 3px 3px 0px #012030;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-sizing: border-box;
  transition: all 0.15s ease;
}

.btn-logout-profile .logout-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.btn-logout-profile:hover {
  background: #ffe3e3;
  color: #d63031;
  transform: translate(-1px, -1px);
  box-shadow: 4px 4px 0px #012030;
}

.btn-logout-profile:active {
  transform: translate(2px, 2px);
  box-shadow: 1px 1px 0px #012030;
}
</style>
