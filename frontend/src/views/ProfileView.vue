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
      </div>

      <!-- Middle: Password Change -->
      <div class="glass-panel password-card">
        <h3>🔐 修改密码</h3>
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
        <h3>📄 志愿履历</h3>
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
              <span class="status-text" :class="item.status === '已结束' || item.status === '已完成' ? 'text-green' : 'text-gray'">
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
}

.avatar-placeholder {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, var(--primary-color), var(--accent-color));
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: bold;
  margin: 0 auto 16px;
}

.class-info {
  color: var(--text-muted);
  margin-bottom: 24px;
}

.stats-box {
  background: rgba(255, 255, 255, 0.5);
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 24px;
}

.stat-value {
  font-size: 2rem;
  font-weight: 800;
  color: var(--primary-color);
}

.stat-label {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.contact-info {
  text-align: left;
  font-size: 0.9rem;
  color: var(--text-main);
}

.info-row {
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.history-card {
  padding: 30px;
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
  background: rgba(255, 255, 255, 0.4);
  border-radius: 8px;
  border-left: 4px solid var(--secondary-color);
}

.history-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.history-date {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.history-title {
  font-weight: 600;
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
  color: var(--primary-color);
}

.status-text {
  font-size: 0.8rem;
}
.text-green { color: #059669; }
.text-gray { color: #6b7280; }

.empty-history {
  text-align: center;
  padding: 40px;
  color: var(--text-muted);
}

.password-card {
  padding: 30px;
}

.password-form .form-group {
  margin-bottom: 16px;
}

.password-form label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
}

.password-form input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
}

.error-msg {
  color: #ef4444;
  background: #fee2e2;
  padding: 8px;
  border-radius: 4px;
  margin-bottom: 12px;
  font-size: 0.9rem;
}

.success-msg {
  color: #059669;
  background: #d1fae5;
  padding: 8px;
  border-radius: 4px;
  margin-bottom: 12px;
  font-size: 0.9rem;
}
</style>
