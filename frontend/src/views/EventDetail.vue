<template>
  <div class="container detail-container" v-if="event">
    <div class="glass-panel detail-card">
      <div class="header-section">
        <StatusBadge :status="event.status" />
        <h1 class="title">{{ event.title }}</h1>
        <div class="meta-row">
          <span>📍 {{ event.location }}</span>
          <span>⏱️ {{ event.hoursValue }} 志愿工时</span>
          <span>👥 {{ event.currentVolunteers }} / {{ event.requiredVolunteers }} 已报名</span>
        </div>
      </div>

      <div class="content-section">
        <h3>活动详情</h3>
        <p class="description">{{ event.description || '暂无详细描述' }}</p>
        
        <div class="info-grid">
          <div class="info-item">
            <span class="label">开始时间</span>
            <span class="value">{{ formatFullDate(event.startTime) }}</span>
          </div>
          <div class="info-item">
            <span class="label">结束时间</span>
            <span class="value">{{ formatFullDate(event.endTime) }}</span>
          </div>
          <div class="info-item">
            <span class="label">报名截止</span>
            <span class="value">{{ formatFullDate(event.registrationDeadline) }}</span>
          </div>
          <div class="info-item">
            <span class="label">负责人</span>
            <span class="value">{{ event.leaderName || '未指定' }} ({{ event.leaderContact || '无联系方式' }})</span>
          </div>
          <div class="info-item">
            <span class="label">年级限制</span>
            <span class="value">{{ event.gradeLimit === 'ALL' ? '全校' : event.gradeLimit + '级' }}</span>
          </div>
        </div>
      </div>

      <div class="action-section">
        <button 
          v-if="store.user" 
          @click="handleSignup" 
          class="btn-primary" 
          :disabled="!canSignup || loading"
          :class="{ 'btn-secondary': !canSignup }"
        >
          {{ loading ? '处理中...' : signupButtonText }}
        </button>
        <div v-else class="login-prompt">
          <p>请先登录后报名</p>
          <router-link to="/login" class="btn-primary">去登录</router-link>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="loading-state">
    加载中...
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import apiClient from '../services/api';
import { store } from '../store';
import StatusBadge from '../components/StatusBadge.vue';

const route = useRoute();
const router = useRouter();
const event = ref(null);
const loading = ref(false);

const eventId = route.params.id;

onMounted(async () => {
  try {
    const response = await apiClient.get(`/events/${eventId}`);
    event.value = response.data;
  } catch (error) {
    alert('无法加载活动详情');
    router.push('/events');
  }
});

const canSignup = computed(() => {
  return event.value && event.value.status === '招募中';
});

const signupButtonText = computed(() => {
  if (!event.value) return '';
  if (event.value.status === '招募中') return '立即报名';
  return event.value.status;
});

const formatFullDate = (iso) => {
  return new Date(iso).toLocaleString('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
};

const handleSignup = async () => {
  if (!confirm('确定要报名参加这个活动吗？')) return;
  
  loading.value = true;
  try {
    await apiClient.post(`/events/${eventId}/signup`, {
      studentId: store.user.id
    });
    alert('报名成功！');
    // Reload to update status
    const response = await apiClient.get(`/events/${eventId}`);
    event.value = response.data;
  } catch (error) {
    alert(error.response?.data?.message || '报名失败');
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.detail-container {
  max-width: 800px;
}

.detail-card {
  padding: 40px;
  background: #ffffff;
  border: 2px solid #012030;
  border-radius: 2px;
  box-shadow: 6px 6px 0px #012030;
}

.header-section {
  text-align: center;
  border-bottom: 2px solid #012030;
  padding-bottom: 24px;
  margin-bottom: 24px;
}

.title {
  margin: 16px 0;
  font-size: 2rem;
  font-weight: 900;
  letter-spacing: -0.01em;
  color: #012030;
}

.meta-row {
  display: flex;
  justify-content: center;
  gap: 24px;
  color: #13678A;
  font-weight: 600;
  font-size: 0.95rem;
}

.content-section {
  margin-bottom: 32px;
}

.content-section h3 {
  font-weight: 800;
  letter-spacing: 0.02em;
}

.description {
  white-space: pre-wrap;
  line-height: 1.8;
  color: #012030;
  font-weight: 500;
  margin-bottom: 24px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  background: #DAFDBA;
  border: 2px solid #012030;
  box-shadow: 3px 3px 0px #012030;
  padding: 20px;
  border-radius: 2px;
}

.info-item {
  display: flex;
  flex-direction: column;
}

.label {
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #13678A;
  margin-bottom: 4px;
}

.value {
  color: #012030;
  font-weight: 800;
}

.action-section {
  display: flex;
  justify-content: center;
  margin-top: 32px;
}

.action-section button {
  padding: 14px 48px;
  font-size: 1.1rem;
}

.login-prompt {
  text-align: center;
}

.login-prompt p {
  color: #13678A;
  margin-bottom: 12px;
}
</style>