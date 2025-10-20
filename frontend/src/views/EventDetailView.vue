<template>
  <div class="event-detail-page">
    <div v-if="isLoading" class="loading-state">
      <p>正在加载活动详情...</p>
    </div>

    <div v-else-if="error" class="error-state">
      <h2>加载失败</h2>
      <p>{{ error }}</p>
      <router-link to="/">返回首页</router-link>
    </div>

    <main v-else-if="event" class="event-container">
      <img :src="event.imageUrl" alt="活动封面" class="event-banner">
      
      <div class="event-content">
        <h1 class="event-title">{{ event.title }}</h1>
        <p class="event-description">{{ event.description }}</p>

        <div class="info-grid">
          <div class="info-item">
            <span class="info-icon">🗓️</span>
            <div>
              <p class="info-label">开展时间</p>
              <p class="info-value">{{ formatDateTime(event.startTime) }} - {{ formatTime(event.endTime) }}</p>
            </div>
          </div>
          <div class="info-item">
            <span class="info-icon">📍</span>
            <div>
              <p class="info-label">开展地点</p>
              <p class="info-value">{{ event.location }}</p>
            </div>
          </div>
          <div class="info-item">
            <span class="info-icon">👥</span>
            <div>
              <p class="info-label">招募人数</p>
              <p class="info-value">{{ event.currentVolunteers }} / {{ event.requiredVolunteers }} 人</p>
            </div>
          </div>
          <div class="info-item">
            <span class="info-icon">📞</span>
            <div>
              <p class="info-label">负责人</p>
              <p class="info-value">{{ event.leaderName }} ({{ event.leaderContact }})</p>
            </div>
          </div>
          <div class="info-item">
            <span class="info-icon">⏳</span>
            <div>
              <p class="info-label">报名截止</p>
              <p class="info-value">{{ formatDateTime(event.registrationDeadline) }}</p>
            </div>
          </div>
        </div>

        <button class="signup-button" :disabled="event.status !== '招募中'">
          {{ getButtonText(event.status) }}
        </button>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import axios from 'axios';

// --- 响应式状态定义 ---
const event = ref(null); // 存储活动数据
const isLoading = ref(true); // 加载状态
const error = ref(null); // 错误信息
const route = useRoute(); // 获取当前路由信息

// --- 组件挂载后执行 ---
onMounted(async () => {
  const eventId = route.params.id; // 从 URL 中获取 id
  try {
    // 向后端 API 发起请求
    const response = await axios.get(`http://localhost:5000/api/events/${eventId}`);
    event.value = response.data;
  } catch (err) {
    // 处理错误情况
    if (err.response && err.response.status === 404) {
      error.value = '抱歉，我们没有找到这个活动。';
    } else {
      error.value = '网络连接出现问题，请稍后再试。';
    }
    console.error('Failed to fetch event:', err);
  } finally {
    // 无论成功或失败，最后都设置加载完成
    isLoading.value = false;
  }
});

// --- 辅助函数 ---
// 格式化日期时间，例如：2025-10-28 14:00
const formatDateTime = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).replace(/\//g, '-');
};

// 仅格式化时间，例如：17:00
const formatTime = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
};

// 根据活动状态返回按钮文本
const getButtonText = (status) => {
  switch (status) {
    case '招募中':
      return '立即报名';
    case '已满员':
      return '报名人数已满';
    case '已结束':
      return '活动已结束';
    default:
      return '报名已截止';
  }
};
</script>

<style scoped>
/* --- 全局和布局 --- */
.event-detail-page {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  max-width: 800px;
  margin: 0 auto; /* 页面居中 */
  padding-bottom: 100px; /* 底部留出空间给按钮 */
}

.loading-state, .error-state {
  text-align: center;
  padding: 50px 20px;
  color: #666;
}

.event-container {
  width: 100%;
  background-color: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

/* --- 手机端适配 --- */
@media (max-width: 768px) {
  .event-container {
    border-radius: 0;
    box-shadow: none;
  }
}

/* --- 内容样式 --- */
.event-banner {
  width: 100%;
  height: 250px;
  object-fit: cover; /* 图片不变形 */
}

.event-content {
  padding: 24px;
}

.event-title {
  font-size: 28px;
  font-weight: 600;
  margin-bottom: 16px;
  color: #1a1a1a;
}

.event-description {
  font-size: 16px;
  line-height: 1.7;
  color: #555;
  margin-bottom: 32px;
}

/* --- 信息网格 --- */
.info-grid {
  display: grid;
  gap: 20px;
  margin-bottom: 32px;
}

.info-item {
  display: flex;
  align-items: flex-start;
}

.info-icon {
  font-size: 24px;
  margin-right: 16px;
  margin-top: -2px;
}

.info-label {
  font-size: 14px;
  color: #888;
  margin: 0 0 4px 0;
}

.info-value {
  font-size: 16px;
  color: #333;
  font-weight: 500;
  margin: 0;
}

/* --- 报名按钮 --- */
.signup-button {
  display: block;
  width: 100%;
  padding: 15px;
  font-size: 18px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(90deg, #4f46e5, #7c3aed);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.signup-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 15px rgba(79, 70, 229, 0.4);
}

.signup-button:disabled {
  background: #ccc;
  cursor: not-allowed;
}
</style>