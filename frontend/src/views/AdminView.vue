<template>
  <div class="container">
    <div class="glass-panel admin-container">
      <header class="admin-header">
        <div class="flex-between">
            <h2>🛡️ 管理员后台</h2>
            <button @click="handleLogout" class="btn-sm btn-logout">退出登录</button>
        </div>
        <div class="tabs">
          <button 
            v-for="tab in ['发布活动', '班级轮换', '学生数据']" 
            :key="tab"
            class="tab-btn"
            :class="{ active: currentTab === tab }"
            @click="currentTab = tab"
          >
            {{ tab }}
          </button>
        </div>
      </header>

      <!-- Tab 1: 发布活动 -->
      <div v-if="currentTab === '发布活动'" class="tab-content">
        <h3>发布新活动</h3>
        <form @submit.prevent="handlePublish">
          <div class="form-group">
            <label>活动标题</label>
            <input v-model="eventForm.title" required />
          </div>
          
          <div class="form-group">
            <label>描述</label>
            <textarea v-model="eventForm.description" rows="3"></textarea>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>开始时间</label>
              <input v-model="eventForm.startTime" type="datetime-local" required />
            </div>
            <div class="form-group">
              <label>结束时间</label>
              <input v-model="eventForm.endTime" type="datetime-local" required />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>报名截止</label>
              <input v-model="eventForm.registrationDeadline" type="datetime-local" required />
            </div>
            <div class="form-group">
              <label>招募人数</label>
              <input v-model="eventForm.requiredVolunteers" type="number" required />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>地点</label>
              <input v-model="eventForm.location" required />
            </div>
            <div class="form-group">
              <label>志愿工时</label>
              <input v-model="eventForm.hoursValue" type="number" step="0.1" required />
            </div>
          </div>
          
          <div class="form-row">
             <div class="form-group">
              <label>年级限制 (逗号分隔，或ALL)</label>
              <input v-model="eventForm.gradeLimit" placeholder="ALL" />
            </div>
            <div class="form-group">
               <label>负责人姓名</label>
              <input v-model="eventForm.leaderName" />
            </div>
          </div>

          <button type="submit" class="btn-primary" :disabled="loading">
            {{ loading ? '发布中...' : '发布活动' }}
          </button>
        </form>
      </div>

      <!-- Tab 2: 班级轮换 -->
      <div v-if="currentTab === '班级轮换'" class="tab-content">
        <h3>周常岗位轮值设置</h3>
        
        <div class="rotation-form">
          <div class="form-group">
             <label>周一日期 (一周开始)</label>
             <input v-model="rotationForm.weekStartDate" type="date" required />
             <small class="hint">必须选择周一的日期</small>
          </div>
          <div class="form-group">
             <label>轮值班级 (格式: 入学年份-班级号)</label>
             <input v-model="rotationForm.assignedClass" placeholder="例如: 2023-1" required />
          </div>
          <button @click="handleSetRotation" class="btn-primary" :disabled="loading">保存设置</button>
        </div>

        <hr />
        
        <h4>已设置的轮换</h4>
        <div v-if="rotations.length > 0" class="rotation-list">
           <div v-for="rot in rotations" :key="rot.id" class="rotation-item">
             <span class="rot-date">{{ rot.weekStartDate }}</span>
             <span class="arrow">➡️</span>
             <span class="rot-class">{{ rot.assignedClass }}</span>
           </div>
        </div>
        <p v-else class="empty-text">暂无记录</p>
      </div>

      <!-- Tab 3: 学生数据 -->
      <div v-if="currentTab === '学生数据'" class="tab-content">
        <h3>学生时长统计</h3>
        
        <div class="filter-row">
          <div class="search-box">
            <label>搜索姓名:</label>
            <input v-model="searchName" type="text" placeholder="输入学生姓名" />
          </div>
          
          <div class="search-box">
            <label>筛选班级:</label>
            <select v-model="selectedClass">
              <option value="">全部班级</option>
              <option v-for="cls in uniqueClasses" :key="cls" :value="cls">
                {{ cls }}
              </option>
            </select>
          </div>
          
          <button @click="loadStudents" class="btn-sm btn-secondary">刷新数据</button>
        </div>
        
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>姓名</th>
                <th>班级</th>
                <th>总时长</th>
                <th>手机号</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="student in filteredStudents" :key="student.id">
                <td>{{ student.name }}</td>
                <td>{{ student.fullClassName }}</td>
                <td class="font-bold text-primary">{{ student.totalHours }}h</td>
                <td>{{ student.phone }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router'; // [NEW]
import { store } from '../store'; // [NEW]
import apiClient from '../services/api';

const router = useRouter(); // [NEW]
const currentTab = ref('发布活动');
const loading = ref(false);

// ... (forms)

const handleLogout = () => {
  store.logout();
  router.push('/');
};

const eventForm = reactive({
  title: '', description: '', startTime: '', endTime: '', 
  registrationDeadline: '', location: '', requiredVolunteers: 10, 
  hoursValue: 2.0, gradeLimit: 'ALL', leaderName: ''
});

const rotationForm = reactive({
  weekStartDate: '',
  assignedClass: ''
});

const rotations = ref([]);
const students = ref([]);

// 学生数据筛选
const searchName = ref('');
const selectedClass = ref('');

const uniqueClasses = computed(() => {
  const classes = students.value.map(s => s.fullClassName);
  return [...new Set(classes)].sort();
});

const filteredStudents = computed(() => {
  return students.value.filter(student => {
    const nameMatch = !searchName.value || student.name.includes(searchName.value);
    const classMatch = !selectedClass.value || student.fullClassName === selectedClass.value;
    return nameMatch && classMatch;
  });
});

// Methods
const handlePublish = async () => {
  loading.value = true;
  try {
    await apiClient.post('/admin/events', eventForm);
    alert('活动发布成功！');
    Object.keys(eventForm).forEach(k => eventForm[k] = ''); // reset
    eventForm.requiredVolunteers = 10;
    eventForm.hoursValue = 2.0;
    eventForm.gradeLimit = 'ALL';
  } catch (error) {
    alert('发布失败: ' + error.message);
  } finally {
    loading.value = false;
  }
};

const loadRotations = async () => {
  try {
    const res = await apiClient.get('/admin/rotations');
    rotations.value = res.data;
  } catch (e) {
    console.error(e);
  }
};

const handleSetRotation = async () => {
  if (!rotationForm.weekStartDate || !rotationForm.assignedClass) return alert('请填写完整');
  loading.value = true;
  try {
    await apiClient.post('/admin/rotations', rotationForm);
    alert('设置成功');
    loadRotations();
  } catch (e) {
    alert(e.response?.data?.message || '设置失败');
  } finally {
    loading.value = false;
  }
};

const loadStudents = async () => {
  try {
    const res = await apiClient.get('/admin/students');
    students.value = res.data;
  } catch (e) {
    console.error(e);
  }
};

// Lifecycle
watch(currentTab, (newTab) => {
  if (newTab === '班级轮换') loadRotations();
  if (newTab === '学生数据') loadStudents();
});
</script>

<style scoped>
.admin-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 0;
  overflow: hidden;
}

.admin-header {
  background: rgba(255,255,255,0.5);
  padding: 20px 30px;
  border-bottom: 1px solid rgba(0,0,0,0.05);
}

.flex-between {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.btn-logout {
    background: #fca5a5;
    color: #991b1b;
    border: none;
    padding: 6px 12px;
    border-radius: 6px;
    cursor: pointer;
}


.tabs {
  display: flex;
  gap: 10px;
  margin-top: 16px;
}

.tab-btn {
  padding: 8px 16px;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  font-weight: 600;
  color: var(--text-muted);
  cursor: pointer;
}

.tab-btn.active {
  color: var(--primary-color);
  border-bottom-color: var(--primary-color);
}

.tab-content {
  padding: 30px;
}

.form-group { margin-bottom: 20px; }

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  color: var(--text-color);
}

textarea, input, select {
  width: 100%;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid #ddd;
  background: rgba(255, 255, 255, 0.9);
}

.form-row { 
  display: flex; 
  gap: 20px; 
}

.form-row .form-group {
  flex: 1;
}

.rotation-form {
  display: flex;
  gap: 16px;
  align-items: flex-end;
  margin-bottom: 30px;
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .form-row {
    flex-direction: column;
    gap: 0;
  }
  
  .rotation-form {
    flex-direction: column;
    align-items: stretch;
  }
  
  .admin-header {
    padding: 15px;
  }
  
  .tab-content {
    padding: 15px;
  }
  
  .tabs {
    flex-wrap: wrap; /* Allow tabs to wrap on very small screens */
  }
}

.rotation-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  border-bottom: 1px solid #eee;
}

.table-container {
  overflow-x: auto;
  margin-top: 20px;
}

table {
  width: 100%;
  border-collapse: collapse;
  background: rgba(255, 255, 255, 0.5);
}

th, td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
}

th {
  background: rgba(79, 70, 229, 0.1);
  font-weight: 600;
  color: var(--primary-color);
}

tr:hover {
  background: rgba(79, 70, 229, 0.05);
}

/* 筛选框样式 */
.filter-row {
  display: flex;
  gap: 16px;
  align-items: flex-end;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.search-box {
  flex: 1;
  min-width: 200px;
}

.search-box label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  font-size: 0.9rem;
}

.search-box input,
.search-box select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
}

.hint { font-size: 0.8rem; color: #666; display: block; margin-top: 4px; }
.mb-4 { margin-bottom: 16px; }
.font-bold { font-weight: bold; }
.text-primary { color: var(--primary-color); }
</style>