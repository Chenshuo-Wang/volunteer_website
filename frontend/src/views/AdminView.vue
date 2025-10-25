<template>
  <div class="admin-container">
    <div v-if="!isAuthenticated" class="password-gate">
      <h1>管理后台</h1>
      <p>请输入访问密码</p>
      <form @submit.prevent="checkPassword">
        <input v-model="passwordInput" type="password" placeholder="请输入密码">
        <button type="submit">进入</button>
        <p v-if="passwordError" class="error-message">{{ passwordError }}</p>
      </form>
    </div>

    <div v-else>
      <h1>管理后台</h1>
      <p>在这里查看各个活动的报名情况。</p>

      <div class="event-selector">
        <label for="event-select">选择一个活动查看:</label>
        <select id="event-select" v-model="selectedEventId" @change="fetchVolunteers">
          <option disabled value="">请选择</option>
          <option v-for="event in events" :key="event.id" :value="event.id">
            {{ event.title }}
          </option>
        </select>
        
        <button 
          v-if="selectedEventId" 
          @click="deleteEvent" 
          class="delete-event-button"
        >
          删除这个活动
        </button>
      </div>

      <div v-if="loadingVolunteers" class="loading-message">正在加载报名信息...</div>
      <div v-else-if="volunteers.length > 0" class="volunteer-list">
        <h2>{{ selectedEventTitle }} - 报名名单 ({{ volunteers.length }}人)</h2>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>姓名</th>
                <th>手机号</th>
                <th>年级班级</th>
                <th>QQ</th>
                <th>微信</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="v in volunteers" :key="v.registrationId">
                <td>{{ v.name }}</td>
                <td>{{ v.phone }}</td>
                <td>{{ v.className }}</td>
                <td>{{ v.qq || '-' }}</td>
                <td>{{ v.wechat || '-' }}</td>
                <td>
                  <button @click="deleteVolunteer(v.registrationId)" class="delete-button">删除</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div v-else-if="selectedEventId" class="empty-message">该活动暂无报名信息。</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import apiClient from '../services/api';

// --- 密码保护 (保持不变) ---
const ADMIN_PASSWORD = 'admin42';
const isAuthenticated = ref(false);
const passwordInput = ref('');
const passwordError = ref('');

const checkPassword = () => {
  if (passwordInput.value === ADMIN_PASSWORD) {
    isAuthenticated.value = true;
    fetchEvents();
  } else {
    passwordError.value = '密码错误';
  }
};

// --- 数据获取 (保持不变) ---
const events = ref([]);
const selectedEventId = ref('');
const volunteers = ref([]);
const loadingVolunteers = ref(false);

const selectedEventTitle = computed(() => {
  const event = events.value.find(e => e.id === selectedEventId.value);
  return event ? event.title : '';
});

const fetchEvents = async () => {
  try {
    const response = await apiClient.get('/events');
    events.value = response.data;
  } catch (error) {
    console.error("获取活动列表失败:", error);
  }
};

const fetchVolunteers = async () => {
  if (!selectedEventId.value) return;
  loadingVolunteers.value = true;
  volunteers.value = [];
  try {
    const response = await apiClient.get(`/events/${selectedEventId.value}/volunteers`);
    volunteers.value = response.data;
  } catch (error) {
    console.error("获取报名者列表失败:", error);
  } finally {
    loadingVolunteers.value = false;
  }
};

// --- 删除报名记录的逻辑 (保持不变) ---
const deleteVolunteer = async (registrationId) => {
  if (!window.confirm("您确定要删除这条报名记录吗？此操作不可撤销。")) {
    return;
  }
  try {
    await apiClient.delete(`/volunteers/${registrationId}`);
    volunteers.value = volunteers.value.filter(v => v.registrationId !== registrationId);
    const event = events.value.find(e => e.id === selectedEventId.value);
    if (event && event.currentVolunteers > 0) {
      event.currentVolunteers--;
    }
    alert("删除成功！");
  } catch (error) {
    console.error("删除失败:", error);
    alert("删除失败，请稍后重试。");
  }
};

// 【【【 脚本修改: 新增删除整个活动的函数 】】】
const deleteEvent = async () => {
  if (!selectedEventId.value) {
    alert("请先选择一个活动。");
    return;
  }

  // 弹出带有活动名称的二次确认框，防止误操作
  const eventTitle = selectedEventTitle.value;
  if (!window.confirm(`您确定要永久删除活动 “${eventTitle}” 吗？\n此操作将同时删除所有相关的报名信息，且不可撤销！`)) {
    return;
  }

  try {
    await apiClient.delete(`/events/${selectedEventId.value}`);
    
    // 从前端的活动列表中移除该活动
    events.value = events.value.filter(e => e.id !== selectedEventId.value);
    
    // 重置选择状态，清空报名列表
    selectedEventId.value = '';
    volunteers.value = [];
    
    alert(`活动 “${eventTitle}” 已成功删除。`);

  } catch (error) {
    console.error("删除活动失败:", error);
    alert("删除活动失败，请稍后重试。");
  }
};
</script>

<style scoped>
/* (大部分样式保持不变) */
.admin-container { max-width: 1000px; margin: 0 auto; }
.password-gate { text-align: center; padding: 40px; }
.table-wrapper { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; }
th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
th { background-color: #f2f2f2; }
tr:nth-child(even) { background-color: #f9f9f9; }
.delete-button { background-color: #dc3545; color: white; border: none; padding: 5px 10px; font-size: 0.9em; border-radius: 5px; cursor: pointer; transition: background-color 0.2s; }
.delete-button:hover { background-color: #c82333; }
.loading-message, .error-message, .empty-message { text-align: center; padding: 40px; color: #6c757d; }

/* 【【【 样式修改: 为选择器和新按钮添加样式 】】】 */
.event-selector {
  margin: 20px 0;
  display: flex;
  align-items: center;
  gap: 15px; /* 在下拉框和按钮之间增加间距 */
  flex-wrap: wrap; /* 允许在小屏幕上换行 */
}
.event-selector select { 
  padding: 10px; 
  font-size: 1em; 
  border-radius: 5px;
  border: 1px solid #ccc;
}
.delete-event-button {
  background-color: #c82333; /* 使用更深的红色以示区别和危险 */
  color: white;
  border: none;
  padding: 10px 15px;
  font-size: 1em;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.2s;
}
.delete-event-button:hover {
  background-color: #a71d2a;
}
</style>