<template>
  <div class="event-container">
    <div v-if="loading" class="loading-message">
      正在加载活动详情...
    </div>

    <div v-else-if="error" class="error-message">
      加载失败：{{ error.message }}
    </div>

    <div v-else-if="event" class="event-card">
      <img :src="event.imageUrl || 'https://via.placeholder.com/800x400'" :alt="event.title" class="event-image">
      <div class="event-content">
        <h1>{{ event.title }}</h1>
        <p class="status">状态: {{ event.status }}</p>
        <p class="location"><strong>地点:</strong> {{ event.location }}</p>
        <p class="time"><strong>时间:</strong> {{ formatDate(event.startTime) }} - {{ formatDate(event.endTime) }}</p>
        <p class="deadline"><strong>报名截止:</strong> {{ formatDate(event.registrationDeadline) }}</p>
        <hr>
        <p class="description">{{ event.description }}</p>
        <hr>
        <div class="leader-info">
          <p>负责人: {{ event.leaderName }}</p>
          <p>联系方式: {{ event.leaderContact }}</p>
        </div>
        <div class="volunteer-info">
          <p>招募人数: {{ event.requiredVolunteers }} 人</p>
          <p>当前报名: {{ event.currentVolunteers }} 人</p>
        </div>
        <button class="register-button">立即报名</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import apiClient from '../services/api'; // 引入我们创建的 API 服务

const route = useRoute();
const event = ref(null);
const loading = ref(true);
const error = ref(null);

// onMounted 是一个生命周期钩子，它会在组件加载到页面上后执行
onMounted(async () => {
  // 从 URL 中获取活动 ID
  const eventId = route.params.id;
  try {
    // 使用 apiClient 发送 GET 请求
    const response = await apiClient.get(`/events/${eventId}`);
    // 将获取到的数据赋值给 event
    event.value = response.data;
  } catch (err) {
    // 如果出错，记录错误信息
    error.value = err;
    console.error('获取活动详情失败:', err);
  } finally {
    // 无论成功还是失败，最后都设置 loading 为 false
    loading.value = false;
  }
});

// 一个简单的方法来格式化日期
const formatDate = (dateString) => {
  const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(dateString).toLocaleDateString('zh-CN', options);
};
</script>

<style scoped>
.event-container {
  max-width: 900px;
  margin: 40px auto;
  padding: 20px;
  font-family: sans-serif;
}
.event-card {
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  overflow: hidden;
}
.event-image {
  width: 100%;
  height: 400px;
  object-fit: cover;
}
.event-content {
  padding: 24px;
}
h1 {
  margin-top: 0;
  font-size: 2em;
}
.status {
  display: inline-block;
  padding: 4px 12px;
  background-color: #dcfce7;
  color: #166534;
  border-radius: 999px;
  font-weight: 500;
}
.register-button {
  display: block;
  width: 100%;
  padding: 16px;
  margin-top: 24px;
  background-color: #2563eb;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1.2em;
  cursor: pointer;
  transition: background-color 0.2s;
}
.register-button:hover {
  background-color: #1d4ed8;
}
</style>