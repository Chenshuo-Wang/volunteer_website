<template>
  <div class="event-container">
    <div v-if="loading" class="loading-message">正在加载活动详情...</div>
    <div v-else-if="error" class="error-message">加载失败：{{ error.message }}</div>

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
      </div>
      
      <div class="registration-section">
        <h2>立即报名</h2>
        <div v-if="registrationSuccess" class="success-message">🎉 报名成功！期待您的参与！</div>
        <form v-else @submit.prevent="handleRegistration">
          <div class="form-group">
            <label for="name">姓名</label>
            <input id="name" v-model="form.name" type="text" placeholder="请输入您的真实姓名" required>
          </div>
          <div class="form-group">
            <label for="phone">手机号</label>
            <input id="phone" v-model="form.phone" type="tel" placeholder="请输入您的手机号码" required>
          </div>
          <div class="form-group">
            <label for="className">年级班级</label>
            <input id="className" v-model="form.className" type="text" placeholder="例如：2023级软件工程1班" required>
          </div>
          <div class="form-group">
            <label for="qq">QQ号</label>
            <input id="qq" v-model="form.qq" type="text" placeholder="请输入您的QQ号">
          </div>
          <div class="form-group">
            <label for="wechat">微信号</label>
            <input id="wechat" v-model="form.wechat" type="text" placeholder="请输入您的微信号">
            <small class="form-hint">QQ号和微信号，至少填写一项</small>
          </div>
          <div v-if="registrationError" class="error-message">{{ registrationError }}</div>
          <button type="submit" class="register-button" :disabled="isSubmitDisabled">{{ buttonText }}</button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import apiClient from '../services/api';

const route = useRoute();
const event = ref(null);
const loading = ref(true);
const error = ref(null);

// 【【【 表单数据已更新 】】】
const form = ref({
  name: '',
  phone: '',
  className: '',
  qq: '',
  wechat: ''
});

const submitting = ref(false);
const registrationError = ref(null);
const registrationSuccess = ref(false);

const isSubmitDisabled = computed(() => {
  if (submitting.value || !event.value) return true;
  return event.value.status !== '招募中' || event.value.currentVolunteers >= event.value.requiredVolunteers;
});

const buttonText = computed(() => {
  if (submitting.value) return '提交中...';
  if (!event.value) return '加载中';
  if (event.value.status !== '招募中') return '招募已结束';
  if (event.value.currentVolunteers >= event.value.requiredVolunteers) return '报名已满';
  return '确认提交';
});

// 【【【 表单提交逻辑已更新 】】】
const handleRegistration = async () => {
  registrationError.value = null;

  // 前端验证：QQ和微信至少填一个
  if (!form.value.qq && !form.value.wechat) {
    registrationError.value = 'QQ号和微信号必须至少填写一项。';
    return;
  }

  submitting.value = true;
  const eventId = route.params.id;

  try {
    // 发送给后端的数据，注意 className
    await apiClient.post(`/events/${eventId}/register`, {
      name: form.value.name,
      phone: form.value.phone,
      className: form.value.className,
      qq: form.value.qq,
      wechat: form.value.wechat
    });

    registrationSuccess.value = true;
    if (event.value) {
      event.value.currentVolunteers++;
    }
  } catch (err) {
    registrationError.value = err.response?.data?.message || '报名失败，请稍后再试。';
    console.error('报名失败:', err);
  } finally {
    submitting.value = false;
  }
};

onMounted(async () => {
  const eventId = route.params.id;
  try {
    const response = await apiClient.get(`/events/${eventId}`);
    event.value = response.data;
  } catch (err) {
    error.value = err;
  } finally {
    loading.value = false;
  }
});

const formatDate = (dateString) => {
  const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(dateString).toLocaleDateString('zh-CN', options);
};
</script>

<style scoped>
/* ... (之前的样式可以保持不变，这里只添加提示文字的样式) ... */
.event-container { max-width: 900px; margin: 40px auto; padding: 20px; font-family: sans-serif; }
.event-card { border: 1px solid #e0e0e0; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); overflow: hidden; }
.event-image { width: 100%; height: 400px; object-fit: cover; }
.event-content { padding: 24px; }
h1 { margin-top: 0; font-size: 2em; }
.status { display: inline-block; padding: 4px 12px; background-color: #dcfce7; color: #166534; border-radius: 999px; font-weight: 500; }
.registration-section { padding: 24px; background-color: #f8f9fa; border-top: 1px solid #e0e0e0; }
.form-group { margin-bottom: 16px; }
.form-group label { display: block; margin-bottom: 6px; font-weight: 500; }
.form-group input { width: 100%; padding: 12px; border: 1px solid #ced4da; border-radius: 6px; font-size: 1em; box-sizing: border-box; }
.register-button { display: block; width: 100%; padding: 16px; margin-top: 24px; background-color: #2563eb; color: white; border: none; border-radius: 8px; font-size: 1.2em; cursor: pointer; transition: background-color 0.2s; }
.register-button:disabled { background-color: #a5b4fc; cursor: not-allowed; }
.error-message { color: #dc2626; background-color: #fee2e2; padding: 12px; border-radius: 6px; margin-bottom: 16px; text-align: center; }
.success-message { color: #166534; background-color: #dcfce7; padding: 20px; border-radius: 6px; text-align: center; font-size: 1.2em; font-weight: bold; }
.form-hint {
  display: block;
  font-size: 0.8em;
  color: #6c757d;
  margin-top: 4px;
}
</style>