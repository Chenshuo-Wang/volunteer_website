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
            v-for="tab in ['发布活动', '学生数据', '周常管理']" 
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

      <!-- Tab 2: 学生数据 -->
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

      <!-- Tab 3: 周常管理（合并了班级轮换和周常岗位管理） -->
      <div v-if="currentTab === '周常管理'" class="tab-content">
        
        <!-- 区域1: 班级轮换设置 -->
        <div class="section-block">
          <h3>📅 班级轮换设置</h3>
          <div class="rotation-form">
            <div class="form-row">
              <div class="form-group">
                <label>周一日期（一周开始）</label>
                <input v-model="rotationForm.weekStartDate" type="date" required />
                <small class="hint">必须选择周一的日期</small>
              </div>
              <div class="form-group">
                <label>轮值班级（格式: 入学年份-班级号）</label>
                <input v-model="rotationForm.assignedClass" placeholder="例如: 2023-1" required />
              </div>
              <div class="form-group" style="display: flex; align-items: flex-end;">
                <button @click="handleSetRotation" class="btn-primary" :disabled="loading">保存设置</button>
              </div>
            </div>
          </div>

          <div v-if="rotations.length > 0" class="rotation-list">
            <div v-for="rot in rotations" :key="rot.id" class="rotation-item">
              <span class="rot-date">{{ rot.weekStartDate }}</span>
              <span class="arrow">➡️</span>
              <span class="rot-class">{{ rot.assignedClass }}</span>
            </div>
          </div>
          <p v-else class="empty-text">暂无轮换记录</p>
        </div>

        <hr style="margin: 24px 0; border-color: #e5e7eb;" />

        <!-- 区域2: 报名统计查询（二维表格） -->
        <div class="section-block">
          <h3>📊 报名统计查询</h3>
          <div class="form-row">
            <div class="form-group">
              <label>选择周一日期</label>
              <input type="date" v-model="matrixWeekStart" />
            </div>
            <div class="form-group">
              <label>选择班级</label>
              <select v-model="matrixClassFilter">
                <option value="">-- 请选择班级 --</option>
                <option v-for="cls in matrixClassList" :key="cls" :value="cls">{{ cls }}</option>
              </select>
            </div>
            <div class="form-group" style="display: flex; align-items: flex-end;">
              <button @click="loadMatrixData" class="btn-sm btn-primary">查询</button>
            </div>
          </div>

          <div v-if="matrixColumns.length > 0 && matrixClassFilter" class="matrix-section">
            <p class="matrix-info">
              班级 <strong>{{ matrixClassFilter }}</strong> · 周 {{ matrixWeekStart }} · {{ matrixRows.length }} 名学生
            </p>
            <div class="table-container matrix-table-container">
              <table class="matrix-table">
                <thead>
                  <tr>
                    <th class="sticky-col">姓名</th>
                    <th v-for="col in matrixColumns" :key="col.id" class="matrix-header">
                      {{ col.label }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in matrixRows" :key="row.studentId">
                    <td class="sticky-col student-name">{{ row.name }}</td>
                    <td v-for="col in matrixColumns" :key="col.id" class="matrix-cell">
                      <span v-if="row.signups[String(col.id)]" class="check-mark">✅</span>
                      <span v-else class="empty-cell">—</span>
                    </td>
                  </tr>
                  <tr v-if="matrixRows.length === 0">
                    <td :colspan="matrixColumns.length + 1" style="text-align: center; color: var(--text-muted); padding: 20px;">
                      该班级暂无报名记录
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div v-else-if="matrixWeekStart && !matrixClassFilter" class="empty-text">
            请选择班级查看报名情况
          </div>
        </div>


      </div>

    </div>
  </div>
</template>

<script setup>
import { reactive, ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { store } from '../store';
import apiClient from '../services/api';

const router = useRouter();
const currentTab = ref('发布活动');
const loading = ref(false);

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

// 周常管理
const allShifts = ref([]);
const loadingShifts = ref(false);

// 二维表格
const matrixWeekStart = ref('');
const matrixClassFilter = ref('');
const matrixColumns = ref([]);
const matrixRows = ref([]);
const matrixClassList = ref([]);

// 学生数据筛选
const searchName = ref('');
const selectedClass = ref('');

const uniqueClasses = computed(() => {
  if (!students.value || students.value.length === 0) return [];
  const classes = students.value.map(s => s.fullClassName).filter(Boolean);
  return [...new Set(classes)].sort();
});

const filteredStudents = computed(() => {
  return students.value.filter(student => {
    const nameMatch = !searchName.value || student.name.includes(searchName.value);
    const classMatch = !selectedClass.value || student.fullClassName === selectedClass.value;
    return nameMatch && classMatch;
  });
});

// 方法
const handlePublish = async () => {
  loading.value = true;
  try {
    await apiClient.post('/admin/events', eventForm);
    alert('活动发布成功！');
    Object.keys(eventForm).forEach(k => eventForm[k] = '');
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

// 周常管理方法
const loadAllShifts = async () => {
  loadingShifts.value = true;
  try {
    const res = await apiClient.get('/admin/shifts');
    allShifts.value = res.data;
  } catch (e) {
    console.error('加载岗位失败:', e);
  } finally {
    loadingShifts.value = false;
  }
};

// 二维表格加载
const loadMatrixData = async () => {
  if (!matrixWeekStart.value) {
    alert('请先选择周一日期');
    return;
  }
  
  try {
    const params = { week_start: matrixWeekStart.value };
    if (matrixClassFilter.value) {
      params.class_name = matrixClassFilter.value;
    }
    const res = await apiClient.get('/admin/shifts/signups', { params });
    matrixColumns.value = res.data.columns;
    matrixRows.value = res.data.rows;
    matrixClassList.value = res.data.classList;
  } catch (e) {
    console.error('加载报名矩阵失败:', e);
    alert('加载失败: ' + (e.response?.data?.message || e.message));
  }
};

// 先加载班级列表（不需要class_name参数）
const loadClassList = async () => {
  if (!matrixWeekStart.value) return;
  try {
    const res = await apiClient.get('/admin/shifts/signups', { 
      params: { week_start: matrixWeekStart.value } 
    });
    matrixClassList.value = res.data.classList;
  } catch (e) {
    console.error('加载班级列表失败:', e);
  }
};

const getDayName = (day) => {
  const dayNames = { 1: '周一', 2: '周二', 3: '周三', 4: '周四', 5: '周五' };
  return dayNames[day] || '';
};

// 生命周期
onMounted(() => {
  console.log('AdminView mounted');
});

watch(currentTab, (newTab) => {
  if (newTab === '学生数据') loadStudents();
  if (newTab === '周常管理') {
    loadRotations();
    loadAllShifts();
  }
});

// 当周一日期改变时，自动加载班级列表
watch(matrixWeekStart, () => {
  matrixClassFilter.value = '';
  matrixColumns.value = [];
  matrixRows.value = [];
  loadClassList();
});
</script>

<style scoped>
.admin-container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 30px;
}

.admin-header {
  margin-bottom: 30px;
}

.tabs {
  display: flex;
  gap: 8px;
  margin-top: 20px;
  flex-wrap: wrap;
}

.tab-btn {
  padding: 8px 20px;
  border: 2px solid transparent;
  border-bottom-color: #ddd;
  background: none;
  cursor: pointer;
  font-weight: 500;
  border-radius: 8px 8px 0 0;
  transition: all 0.2s;
}

.tab-btn.active {
  border-color: var(--primary-color);
  color: var(--primary-color);
  background: rgba(79, 70, 229, 0.05);
}

.tab-content {
  padding-top: 20px;
}

.form-group {
  margin-bottom: 16px;
  flex: 1;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
}

.form-group input, .form-group select, .form-group textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
}

.form-row {
  display: flex;
  gap: 16px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.flex-between {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.btn-logout {
  background: #ef4444;
  color: white;
  border: none;
  padding: 6px 16px;
  border-radius: 6px;
  cursor: pointer;
}

.table-container {
  overflow-x: auto;
  margin-top: 16px;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 10px 14px;
  border-bottom: 1px solid #eee;
  text-align: left;
}

th {
  background: #f9fafb;
  font-weight: 600;
}

.rotation-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 16px;
}

.rotation-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  background: #f9fafb;
  border-radius: 8px;
}

.rot-date { font-weight: 600; color: var(--primary-color); }
.rot-class { font-weight: 700; color: #d97706; }

.empty-text {
  text-align: center;
  color: var(--text-muted);
  padding: 16px;
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

/* 周常管理样式 */
.section-block {
  margin-bottom: 8px;
}

.shifts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 16px;
  margin-top: 16px;
}

.shift-admin-card {
  padding: 16px;
  transition: all 0.2s;
  border-left: 4px solid var(--accent-color);
}

.shift-admin-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.shift-admin-card .shift-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e5e7eb;
}

.shift-admin-card .shift-name {
  font-weight: 600;
  color: var(--primary-color);
  font-size: 1.05rem;
}

.shift-day-badge {
  background: var(--primary-color);
  color: white;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 500;
}

.shift-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  color: var(--text-muted);
}

.detail-row .icon { font-size: 1rem; }
.detail-row .description { font-size: 0.85rem; font-style: italic; }

/* 二维矩阵表格样式 */
.matrix-section {
  margin-top: 20px;
}

.matrix-info {
  margin-bottom: 12px;
  font-size: 0.95rem;
  color: var(--text-muted);
}

.matrix-table-container {
  max-height: 500px;
  overflow: auto;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.matrix-table {
  border-collapse: separate;
  border-spacing: 0;
  width: auto;
  min-width: 100%;
}

.matrix-table th, .matrix-table td {
  padding: 10px 12px;
  white-space: nowrap;
  border-bottom: 1px solid #eee;
  border-right: 1px solid #f3f4f6;
}

.matrix-header {
  font-size: 0.8rem;
  font-weight: 600;
  text-align: center;
  background: #f0f4ff;
  min-width: 100px;
}

.sticky-col {
  position: sticky;
  left: 0;
  background: white;
  z-index: 1;
  box-shadow: 2px 0 4px rgba(0,0,0,0.05);
  min-width: 80px;
}

thead .sticky-col {
  background: #f9fafb;
  z-index: 2;
}

.student-name {
  font-weight: 600;
}

.matrix-cell {
  text-align: center;
}

.check-mark {
  font-size: 1.1rem;
}

.empty-cell {
  color: #d1d5db;
}

@media (max-width: 768px) {
  .shifts-grid {
    grid-template-columns: 1fr;
  }
  .form-row {
    flex-direction: column;
  }
}
</style>