<template>
  <div class="list-container">
    <header class="list-header">
      <h1>校园志愿者活动</h1>
      <p>选择你感兴趣的活动，点击查看详情并报名</p>
    </header>

    <div v-if="loading" class="loading-message">正在加载活动列表...</div>
    <div v-else-if="error" class="error-message">加载失败: {{ error.message }}</div>
    
    <div v-else-if="events.length > 0" class="event-grid">
      <router-link 
        v-for="event in events" 
        :key="event.id" 
        :to="{ name: 'EventDetail', params: { id: event.id } }" 
        class="event-card-link"
      >
        <div class="event-card">
          <div class="card-content">
            <span class="card-status" :class="getStatusClass(event.status)">
              {{ event.status }}
            </span>
            <h2 class="card-title">{{ event.title }}</h2>
            <p class="card-info">📍 {{ event.location }}</p>
            <p class="card-info">🕒 {{ formatDate(event.startTime) }}</p>
          </div>
        </div>
      </router-link>
    </div>

    <div v-else class="empty-message">
      <p>目前没有可报名的活动，请稍后再来看看吧！</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import apiClient from '../services/api';

const events = ref([]);
const loading = ref(true);
const error = ref(null);

onMounted(async () => {
  try {
    const response = await apiClient.get('/events');
    events.value = response.data;
  } catch (err) {
    error.value = err;
    console.error("获取活动列表失败:", err);
  } finally {
    loading.value = false;
  }
});

const formatDate = (dateString) => {
  const options = { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(dateString).toLocaleDateString('zh-CN', options);
};

// 【【【 新增：将状态文字映射到CSS类的辅助函数 】】】
const getStatusClass = (status) => {
  switch (status) {
    case '招募中': return 'status-recruiting';
    case '报名已满': return 'status-full';
    case '报名已截止': return 'status-closed';
    case '进行中': return 'status-active';
    case '已结束': return 'status-finished';
    default: return '';
  }
};
</script>

<style scoped>
/* (大部分样式不变) */
.list-container { max-width: 1200px; margin: 0 auto; font-family: sans-serif; }
.list-header { text-align: center; margin-bottom: 40px; }
.event-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 24px; }
.event-card-link { text-decoration: none; color: inherit; }
.event-card { background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); overflow: hidden; transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out; border: 1px solid #e9ecef; height: 100%; }
.event-card:hover { transform: translateY(-5px); box-shadow: 0 8px 20px rgba(0,0,0,0.08); }
.card-content { padding: 20px; }
.card-title { margin: 0 0 8px 0; font-size: 1.25em; color: #343a40; }
.card-info { margin: 4px 0; color: #6c757d; font-size: 0.9em; }
.loading-message, .error-message, .empty-message { text-align: center; padding: 50px; font-size: 1.2em; color: #6c757d; }

/* 【【【 新增：为所有状态徽章定义通用样式和具体颜色 】】】 */
.card-status {
  display: inline-block;
  padding: 5px 12px;
  font-size: 0.8em;
  font-weight: bold;
  border-radius: 999px;
  margin-bottom: 12px;
}
.status-recruiting { background-color: #dcfce7; color: #166534; } /* 绿色 */
.status-full { background-color: #ffedd5; color: #9a3412; } /* 橙色 */
.status-closed { background-color: #fee2e2; color: #991b1b; } /* 红色 */
.status-active { background-color: #dbeafe; color: #1e40af; } /* 蓝色 */
.status-finished { background-color: #e5e7eb; color: #4b5563; } /* 灰色 */
</style>