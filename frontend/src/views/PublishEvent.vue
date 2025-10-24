<template>
  <div class="publish-container">
    <div v-if="!isAuthenticated" class="password-gate">
      <h1>发布新活动</h1>
      <p>请输入访问密码</p>
      <form @submit.prevent="checkPassword">
        <input v-model="passwordInput" type="password" placeholder="请输入密码" class="password-input">
        <button type="submit" class="submit-button">进入</button>
        <p v-if="passwordError" class="error-message">{{ passwordError }}</p>
      </form>
    </div>

    <div v-else class="form-container">
      <h1>发布新活动</h1>

      <div v-if="submitSuccess" class="success-message">
        🎉 活动发布成功！<router-link to="/">返回列表页</router-link>
      </div>

      <form v-else @submit.prevent="handlePublish">
        <div class="form-group">
          <label for="title">活动标题</label>
          <input id="title" v-model="form.title" type="text" required>
        </div>

        <div class="form-group">
          <label for="description">活动描述</label>
          <textarea id="description" v-model="form.description" rows="5" required></textarea>
        </div>

        <div class="form-grid">
          <div class="form-group">
            <label for="startTime">开始时间</label>
            <input id="startTime" v-model="form.startTime" type="datetime-local" required>
          </div>
          <div class="form-group">
            <label for="endTime">结束时间</label>
            <input id="endTime" v-model="form.endTime" type="datetime-local" required>
          </div>
        </div>

        <div class="form-group">
          <label for="location">活动地点</label>
          <input id="location" v-model="form.location" type="text" required>
        </div>

        <div class="form-group">
          <label for="requiredVolunteers">招募人数</label>
          <input id="requiredVolunteers" v-model="form.requiredVolunteers" type="number" min="1" required>
        </div>

        <hr>

        <div class="form-grid">
          <div class="form-group">
            <label for="leaderName">负责人姓名 (选填)</label>
            <input id="leaderName" v-model="form.leaderName" type="text">
          </div>
          <div class="form-group">
            <label for="leaderContact">负责人联系方式 (选填)</label>
            <input id="leaderContact" v-model="form.leaderContact" type="text">
          </div>
        </div>

        <div class="form-group">
          <label for="registrationDeadline">报名截止时间</label>
          <input id="registrationDeadline" v-model="form.registrationDeadline" type="datetime-local" required>
        </div>

        <div class="form-group">
          <label for="imageUrl">图片URL (选填)</label>
          <input id="imageUrl" v-model="form.imageUrl" type="url" placeholder="https://...">
        </div>

        <p v-if="submitError" class="error-message">{{ submitError }}</p>
        <button type="submit" class="submit-button" :disabled="submitting">
          {{ submitting ? '发布中...' : '确认发布' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import apiClient from '../services/api';

// --- 密码保护逻辑 ---
const PUBLISH_PASSWORD = 'admin42'; // 【【【 在这里修改为您自己的密码 】】】
const isAuthenticated = ref(false);
const passwordInput = ref('');
const passwordError = ref('');

const checkPassword = () => {
  if (passwordInput.value === PUBLISH_PASSWORD) {
    isAuthenticated.value = true;
    passwordError.value = '';
  } else {
    passwordError.value = '密码错误，请重试。';
  }
};

// --- 表单提逻辑 ---
const form = ref({
  title: '',
  description: '',
  startTime: '',
  endTime: '',
  location: '',
  requiredVolunteers: 10,
  leaderName: '',
  leaderContact: '',
  registrationDeadline: '',
  imageUrl: ''
});

const submitting = ref(false);
const submitError = ref('');
const submitSuccess = ref(false);

const handlePublish = async () => {
  submitting.value = true;
  submitError.value = '';
  submitSuccess.value = false;

  try {
    // 将 datetime-local 的值转换为后端需要的 ISO 格式
    const payload = {
      ...form.value,
      startTime: new Date(form.value.startTime).toISOString(),
      endTime: new Date(form.value.endTime).toISOString(),
      registrationDeadline: new Date(form.value.registrationDeadline).toISOString(),
    };
    await apiClient.post('/events', payload);
    submitSuccess.value = true;
  } catch (err) {
    submitError.value = err.response?.data?.message || '发布失败，请检查填写的内容。';
    console.error("发布失败:", err);
  } finally {
    submitting.value = false;
  }
};
</script>

<style scoped>
.publish-container {
  max-width: 800px;
  margin: 40px auto;
  padding: 20px;
  font-family: sans-serif;
  background-color: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
}

/* 密码输入页面样式 */
.password-gate {
  text-align: center;
  padding: 40px;
}
.password-input {
  font-size: 1.2em;
  padding: 10px;
  margin-bottom: 20px;
  width: 100%;
  max-width: 300px;
  box-sizing: border-box;
}

/* 表单通用样式 */
.form-group {
  margin-bottom: 20px;
}
.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: bold;
}
.form-group input,
.form-group textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 1em;
  box-sizing: border-box;
}

/* 适配手机的双列布局 */
.form-grid {
  display: grid;
  grid-template-columns: 1fr; /* 手机上默认单列 */
  gap: 20px;
}
/* 在大于600px的屏幕上变为双列 */
@media (min-width: 600px) {
  .form-grid {
    grid-template-columns: 1fr 1fr;
  }
}

.submit-button {
  width: 100%;
  padding: 15px;
  background-color: #28a745; /* 绿色 */
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1.2em;
  cursor: pointer;
}
.submit-button:disabled {
  background-color: #94d3a2;
  cursor: not-allowed;
}
.error-message { color: #dc3545; margin-top: 10px; }
.success-message { color: #28a745; font-size: 1.2em; text-align: center; padding: 20px; }
</style>