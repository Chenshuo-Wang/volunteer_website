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

        <div class="form-grid">
          <div class="form-group">
            <label for="requiredVolunteers">招募人数</label>
            <input id="requiredVolunteers" v-model="form.requiredVolunteers" type="number" min="1" required>
          </div>

          <div class="form-group">
            <label>年级限制 (可不选)</label>
            <div class="checkbox-group">
              <div v-for="grade in allGrades" :key="grade.value" class="checkbox-item">
                <input type="checkbox" :id="grade.value" :value="grade.value" v-model="form.gradeRestriction">
                <label :for="grade.value">{{ grade.label }}</label>
              </div>
            </div>
          </div>
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

// --- 密码保护逻辑 (保持不变) ---
const PUBLISH_PASSWORD = 'admin42';
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

// 【【【 核心修改：将年级选项扩展为 G1-G12 】】】
const allGrades = [
  { label: '一年级', value: 'G1' }, { label: '二年级', value: 'G2' },
  { label: '三年级', value: 'G3' }, { label: '四年级', value: 'G4' },
  { label: '五年级', value: 'G5' }, { label: '六年级', value: 'G6' },
  { label: '初一', value: 'G7' },   { label: '初二', value: 'G8' },
  { label: '初三', value: 'G9' },   { label: '高一', value: 'G10' },
  { label: '高二', value: 'G11' },  { label: '高三', value: 'G12' },
];

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
  gradeRestriction: [], // 初始化为空数组
});

const submitting = ref(false);
const submitError = ref('');
const submitSuccess = ref(false);

const handlePublish = async () => {
  submitting.value = true;
  submitError.value = '';
  submitSuccess.value = false;

  try {
    const payload = {
      ...form.value,
      // 【【【 修复：直接使用表单中的原始时间字符串，不再转换 】】】
      // startTime: new Date(form.value.startTime).toISOString(), // 删除此行
      // endTime: new Date(form.value.endTime).toISOString(), // 删除此行
      // registrationDeadline: new Date(form.value.registrationDeadline).toISOString(), // 删除此行
      gradeRestriction: form.value.gradeRestriction.join(','),
    };
    // apiClient 会自动将 payload 对象转换为 JSON，时间字符串将保持原样
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
  padding: 30px;
  background-color: #fff;
  border-radius: 12px;
  border: 1px solid rgba(69, 196, 176, 0.3);
  box-shadow: 0 8px 32px rgba(1, 32, 48, 0.08);
}
h1 { color: #012030; }
.password-gate { text-align: center; padding: 40px; }
.password-input {
  font-size: 1.2em;
  padding: 10px;
  margin-bottom: 20px;
  width: 100%;
  max-width: 300px;
  box-sizing: border-box;
  border: 1px solid rgba(19, 103, 138, 0.25);
  border-radius: 6px;
  color: #012030;
}
.password-input:focus {
  border-color: #45C4B0;
  box-shadow: 0 0 0 3px rgba(69, 196, 176, 0.2);
  outline: none;
}
.form-group { margin-bottom: 20px; }
.form-group label { display: block; margin-bottom: 8px; font-weight: bold; color: #012030; }
.form-group input, .form-group textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid rgba(19, 103, 138, 0.25);
  border-radius: 6px;
  font-size: 1em;
  color: #012030;
  box-sizing: border-box;
}
.form-group input:focus, .form-group textarea:focus {
  border-color: #45C4B0;
  box-shadow: 0 0 0 3px rgba(69, 196, 176, 0.2);
  outline: none;
}
.form-grid { display: grid; grid-template-columns: 1fr; gap: 20px; }
@media (min-width: 600px) { .form-grid { grid-template-columns: 1fr 1fr; } }
.submit-button {
  width: 100%;
  padding: 15px;
  background: linear-gradient(135deg, #13678A, #45C4B0);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1.2em;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 14px rgba(19, 103, 138, 0.25);
}
.submit-button:hover:not(:disabled) {
  background: linear-gradient(135deg, #012030, #13678A);
  transform: translateY(-2px);
}
.submit-button:disabled { background: #9AEBA3; color: #012030; cursor: not-allowed; }
.error-message {
  color: #012030;
  background: rgba(1, 32, 48, 0.08);
  border: 1px solid #13678A;
  padding: 10px;
  border-radius: 6px;
  margin-top: 10px;
}
.success-message {
  color: #012030;
  background: #DAFDBA;
  border: 1px solid #45C4B0;
  font-size: 1.2em;
  font-weight: 600;
  text-align: center;
  padding: 20px;
  border-radius: 8px;
}
.checkbox-group {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  background-color: #DAFDBA;
  border: 1px solid rgba(69, 196, 176, 0.3);
  padding: 15px;
  border-radius: 6px;
}
.checkbox-item { display: flex; align-items: center; }
.checkbox-item input[type="checkbox"] { width: auto; margin-right: 8px; width: 1.2em; height: 1.2em; }
.checkbox-item label { font-weight: normal; margin-bottom: 0; cursor: pointer; color: #012030; }
</style>