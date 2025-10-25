<template>
  <div class="event-container">
    <div v-if="loading" class="loading-message">
      正在加载活动详情...
    </div>

    <div v-else-if="error" class="error-message">
      加载活动失败: {{ error.message }}
    </div>

    <div v-else-if="event" class="event-card">
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
        
        <form v-if="registrationStep === 'enterName'" @submit.prevent="handleNameLookup">
          <div class="form-group">
            <label for="name-lookup">请输入您的姓名</label>
            <input id="name-lookup" v-model="form.name" type="text" placeholder="确认后将查找您过往的报名信息" required>
          </div>
          <p v-if="lookupError" class="error-message">{{ lookupError }}</p>
          <button type="submit" class="register-button" :disabled="isLookupDisabled">
            {{ lookupLoading ? '查找中...' : '下一步' }}
          </button>
        </form>

        <div v-if="registrationStep === 'fillDetails'">
          <p class="welcome-back">欢迎您，<strong>{{ form.name }}</strong>！请确认或修改以下信息：</p>
          <form @submit.prevent="handleRegistration">
            <div class="form-group">
              <label for="phone">手机号</label>
              <input id="phone" v-model="form.phone" type="tel" required>
            </div>
            <div class="form-group">
              <label for="className">年级班级</label>
              <input id="className" v-model="form.className" type="text" required>
            </div>
            <div class="form-group">
              <label for="qq">QQ号</label>
              <input id="qq" v-model="form.qq" type="text">
            </div>
            <div class="form-group">
              <label for="wechat">微信号</label>
              <input id="wechat" v-model="form.wechat" type="text">
              <small>QQ和微信至少填一项</small>
            </div>
            <p v-if="registrationError" class="error-message">{{ registrationError }}</p>
            <div class="button-group">
              <button type="button" @click="resetStep" class="secondary-button">返回上一步</button>
              <button type="submit" class="register-button" :disabled="isSubmitDisabled">{{ buttonText }}</button>
            </div>
          </form>
        </div>

        <div v-if="registrationStep === 'success'" class="success-message">
          🎉 报名成功！期待您的参与！
        </div>
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

const registrationStep = ref('enterName');
const lookupLoading = ref(false);
const lookupError = ref('');

const form = ref({
  name: '', phone: '', className: '', qq: '', wechat: ''
});
const submitting = ref(false);
const registrationError = ref('');

const handleNameLookup = async () => {
  lookupLoading.value = true;
  lookupError.value = '';
  try {
    const response = await apiClient.get(`/volunteers/lookup?name=${form.value.name}`);
    form.value.phone = response.data.phone || '';
    form.value.className = response.data.className || '';
    form.value.qq = response.data.qq || '';
    form.value.wechat = response.data.wechat || '';
    registrationStep.value = 'fillDetails';
  } catch (err) {
    lookupError.value = "查找信息失败，请稍后重试。";
  } finally {
    lookupLoading.value = false;
  }
};

const handleRegistration = async () => {
  if (!form.value.qq && !form.value.wechat) {
    registrationError.value = 'QQ号和微信号必须至少填写一项。';
    return;
  }
  submitting.value = true;
  registrationError.value = '';
  try {
    await apiClient.post(`/events/${route.params.id}/register`, form.value);
    registrationStep.value = 'success';
    if (event.value) event.value.currentVolunteers++;
  } catch (err) {
    registrationError.value = err.response?.data?.message || '报名失败，请稍后再试。';
  } finally {
    submitting.value = false;
  }
};

const resetStep = () => {
  registrationStep.value = 'enterName';
  form.value.phone = '';
  form.value.className = '';
  form.value.qq = '';
  form.value.wechat = '';
};

// 【【【【【 这里是关键的修复 】】】】】
// onMounted 钩子需要包含获取数据的完整逻辑
onMounted(async () => {
  const eventId = route.params.id;
  try {
    // 1. 发送 API 请求
    const response = await apiClient.get(`/events/${eventId}`);
    // 2. 将返回的数据赋值给 event
    event.value = response.data;
  } catch (err) {
    // 3. 如果出错，记录错误
    error.value = err;
    console.error('获取活动详情失败:', err);
  } finally {
    // 4. 无论成功还是失败，都将 loading 设置为 false，这样页面才能继续渲染
    loading.value = false;
  }
});

const isLookupDisabled = computed(() => !event.value || event.value.status !== '招募中' || lookupLoading.value);
const isSubmitDisabled = computed(() => submitting.value);
const buttonText = computed(() => submitting.value ? '提交中...' : '确认提交');

// 添加 formatDate 函数
const formatDate = (dateString) => {
  const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(dateString).toLocaleDateString('zh-CN', options);
};

</script>

<style scoped>
/* 样式部分可以保持不变，这里为您补全，以防万一 */
.event-container { max-width: 900px; margin: 0 auto; }
.event-card { background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); overflow: hidden; margin-top: 20px; }
.event-content { padding: 24px; }
h1 { margin-top: 0; }
.registration-section { padding: 24px; background-color: #f8f9fa; border-top: 1px solid #e9ecef; }
.form-group { margin-bottom: 16px; }
.form-group label { display: block; margin-bottom: 6px; font-weight: 500; }
.form-group input { width: 100%; padding: 12px; border: 1px solid #ced4da; border-radius: 6px; font-size: 1em; box-sizing: border-box; }
.register-button { display: block; width: 100%; padding: 16px; margin-top: 24px; background-color: #007bff; color: white; border: none; border-radius: 8px; font-size: 1.2em; cursor: pointer; }
.register-button:disabled { background-color: #6c757d; cursor: not-allowed; }
.error-message { color: #dc3545; background-color: #f8d7da; padding: 12px; border-radius: 6px; margin-top: 10px; text-align: center; }
.success-message { color: #155724; background-color: #d4edda; padding: 20px; border-radius: 6px; text-align: center; font-size: 1.2em; font-weight: bold; }
.loading-message { text-align: center; padding: 50px; font-size: 1.5em; color: #6c757d; }
.welcome-back { background-color: #e9f5ff; padding: 10px; border-radius: 5px; margin-bottom: 20px; }
.button-group { display: flex; gap: 10px; margin-top: 20px; }
.button-group .register-button, .button-group .secondary-button { width: 100%; margin-top: 0; }
.secondary-button { background-color: #6c757d; color: white; border: none; border-radius: 8px; padding: 16px; font-size: 1.2em; cursor: pointer; }
</style>