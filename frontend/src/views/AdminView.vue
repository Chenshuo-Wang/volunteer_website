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
              </tr>
            </thead>
            <tbody>
              <tr v-for="v in volunteers" :key="v.id">
                <td>{{ v.name }}</td>
                <td>{{ v.phone }}</td>
                <td>{{ v.className }}</td>
                <td>{{ v.qq || '-' }}</td>
                <td>{{ v.wechat || '-' }}</td>
                <td>
                  <button @click="deleteVolunteer(v.id)" class="delete-button">删除</button>
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
import { ref, onMounted, computed } from 'vue';
import apiClient from '../services/api';

// --- 密码保护 ---
const ADMIN_PASSWORD = 'admin42'; // 【【【 在这里修改为您的管理员密码 】】】
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

// --- 数据获取 ---
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

const deleteVolunteer = async (volunteerId) => {
  // 关键：在执行危险操作前，给用户一个确认的机会
  if (!window.confirm("您确定要删除这条报名记录吗？此操作不可撤销。")) {
    return;
  }
  
  try {
    // 向后端发送 DELETE 请求
    await apiClient.delete(`/volunteers/${volunteerId}`);
    
    // 删除成功后，从前端列表中移除该条目，实现页面实时更新，无需刷新
    volunteers.value = volunteers.value.filter(v => v.id !== volunteerId);
    
    // 可选：实时更新活动列表中的报名人数
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

</script>

<style scoped>
.admin-container { max-width: 1000px; margin: 0 auto; }
.password-gate { text-align: center; padding: 40px; }
.event-selector { margin: 20px 0; }
.event-selector select { padding: 10px; font-size: 1em; }
.table-wrapper { overflow-x: auto; } /* 关键：让表格可以在手机上横向滚动 */
table { width: 100%; border-collapse: collapse; }
th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
th { background-color: #f2f2f2; }
tr:nth-child(even) { background-color: #f9f9f9; }
.delete-button {
  background-color: #dc3545; /* 红色 */
  color: white;
  border: none;
  padding: 5px 10px;
  font-size: 0.9em;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.delete-button:hover {
  background-color: #c82333; /* 深红色 */
}
</style>