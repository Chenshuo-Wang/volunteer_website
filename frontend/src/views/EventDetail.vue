<template>
  <div class="event-container">
    <div v-if="loading" class="loading-message">正在加载活动详情...</div>
    <div v-else-if="error" class="error-message">加载活动失败: {{ error.message }}</div>

    <div v-else-if="event" class="event-card">
      <div class="event-content">
        <div class="header-with-status">
          <h1>{{ event.title }}</h1>
          <span class="status-badge" :class="getStatusClass(event.status)">{{ event.status }}</span>
        </div>
        <p v-if="event.gradeRestriction" class="grade-restriction">
          <strong>年级限制:</strong> {{ event.gradeRestriction.split(',').join('、') }}
        </p>
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
        
        <form v-if="registrationStep === 'enterPhone'" @submit.prevent="handlePhoneLookup">
          <div class="form-group">
            <label for="phone-lookup">请输入您的手机号</label>
            <input id="phone-lookup" v-model="form.phone" type="tel" placeholder="确认后将查找您过往的报名信息" required>
          </div>
          <p v-if="lookupError" class="error-message">{{ lookupError }}</p>
          <button type="submit" class="register-button" :disabled="isLookupDisabled">
            {{ lookupLoading ? '查找中...' : '下一步' }}
          </button>
        </form>

        <div v-if="registrationStep === 'fillDetails'">
          <p class="welcome-back">请确认或修改以下信息：</p>
          <form @submit.prevent="handleRegistration">
            <div class="form-group">
              <label for="name">姓名</label>
              <input id="name" v-model="form.name" type="text" required>
            </div>
            <div class="form-group">
              <label for="className">年级班级</label>
              <input 
                id="className" 
                v-model="form.className" 
                type="text" 
                required
                pattern="G\d+C\d+"
                title="格式必须为'G+年级号+C+班级号'，例如：G1C1 或 G10C5"
                placeholder="例如: G1C1 (一年级1班)">
              <small class="form-hint">格式必须为 G+年级号+C+班级号</small>
            </div>
            <div class="form-group">
              <label for="qq">QQ号</label>
              <input id="qq" v-model="form.qq" type="text">
            </div>
            <div class="form-group">
              <label for="wechat">微信号</label>
              <input id="wechat" v-model="form.wechat" type="text">
              <small class="form-hint">QQ和微信至少填一项</small>
            </div>
            <p v-if="registrationError" class="error-message">{{ registrationError }}</p>
            <div class="button-group">
              <button type="button" @click="resetStep" class="secondary-button">返回上一步</button>
              <button type="submit" class="register-button" :disabled="isSubmitDisabled">{{ buttonText }}</button>
            </div>
          </form>
        </div>

        <div v-if="registrationStep === 'success'" class="success-message">🎉 报名成功！期待您的参与！</div>
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

// --- 报名流程状态 ---
const registrationStep = ref('enterPhone'); // 'enterPhone', 'fillDetails', 'success'
const lookupLoading = ref(false);
const lookupError = ref('');

const form = ref({
  name: '', phone: '', className: '', qq: '', wechat: ''
});
const submitting = ref(false);
const registrationError = ref('');

// --- 步骤一：根据手机号查找信息 ---
const handlePhoneLookup = async () => {
  lookupLoading.value = true;
  lookupError.value = '';
  try {
    const response = await apiClient.get(`/volunteers/lookup?phone=${form.value.phone}`);
    // 用查找到的数据填充表单，如果找不到则为空
    form.value.name = response.data.name || '';
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

// --- 步骤二：提交完整信息 ---
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
  registrationStep.value = 'enterPhone';
  // 清空除手机号外的所有信息
  form.value.name = '';
  form.value.className = '';
  form.value.qq = '';
  form.value.wechat = '';
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

const isLookupDisabled = computed(() => {
  if (lookupLoading.value || !event.value) return true;
  // 只有在招募中时才能点击下一步
  return event.value.status !== '招募中';
});
const isSubmitDisabled = computed(() => submitting.value);
const buttonText = computed(() => submitting.value ? '提交中...' : '确认提交');

const formatDate = (dateString) => {
  const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(dateString).toLocaleDateString('zh-CN', options);
};

// 【【【 新增：状态徽章的辅助函数 】】】
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
.event-container { max-width: 900px; margin: 0 auto; }
.event-card { background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); overflow: hidden; }
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
.form-hint { font-size: 0.8em; color: #6c757d; margin-top: 4px; }
.grade-restriction { font-size: 0.9em; color: #495057; background-color: #e9ecef; padding: 8px 12px; border-radius: 6px; display: inline-block; }

/* 【【【 新增：状态徽章和标题的样式 】】】 */
.header-with-status {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap; /* 允许在小屏幕上换行 */
  gap: 10px;
  margin-bottom: 1rem;
}
.status-badge {
  display: inline-block;
  padding: 6px 14px;
  font-size: 0.9em;
  font-weight: bold;
  border-radius: 999px;
  white-space: nowrap; /* 防止文字换行 */
}
.status-recruiting { background-color: #dcfce7; color: #166534; }
.status-full { background-color: #ffedd5; color: #9a3412; }
.status-closed { background-color: #fee2e2; color: #991b1b; }
.status-active { background-color: #dbeafe; color: #1e40af; }
.status-finished { background-color: #e5e7eb; color: #4b5563; }
</style>