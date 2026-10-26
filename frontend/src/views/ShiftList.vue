<template>
  <div class="container">
    <header class="page-header">
      <h1>周常岗位值日</h1>
      <p>固定时间的志愿服务，培养每日坚持的好习惯</p>
    </header>

    <div v-if="currentRotation" class="rotation-banner">
      🔔 本周 ({{ currentRotationWeek }}) 轮值班级：
      <span class="highlight-class">{{ currentRotation }}</span>
    </div>

    <div class="date-selector glass-panel">
      <label>选择值日日期：</label>
      <input type="date" v-model="selectedDate" :min="today" />
      <span v-if="selectedDayName" class="date-hint">
        {{ selectedDayName }} - {{ getShiftCountForSelectedDay }} 个岗位可报名
      </span>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>正在加载岗位安排...</p>
    </div>

    <div v-else-if="!isWeekday" class="notice-box">
      <p>⚠️ 周常任务仅限工作日（周一到周五）</p>
      <p>请选择工作日的日期</p>
    </div>

    <div v-else class="shifts-grid">
      <!-- 只显示选中日期对应星期的岗位 -->
      <div v-for="shift in filteredShifts" :key="shift.id" class="shift-card glass-panel"
           :class="getShiftTypeClass(shift.name)">
        <div class="shift-header">
          <span class="shift-name">{{ shift.name }}</span>
          <span class="shift-hours">{{ shift.hoursValue }}小时</span>
        </div>
        
        <div class="shift-info">
          <div class="info-row">
            <span class="icon">🕒</span>
            <span>{{ shift.timeRange }}</span>
          </div>
          <div class="info-row">
            <span class="icon">👥</span>
            <span>容量: {{ currentSignupCount(shift.id) }} / {{ shift.capacity }} 人</span>
          </div>
          <div v-if="shift.description" class="info-row">
            <span class="icon">💡</span>
            <span class="description">{{ shift.description }}</span>
          </div>
        </div>

        <!-- 容量进度条 -->
        <div class="capacity-bar">
          <div class="capacity-fill" :style="{ width: getCapacityPercent(shift) + '%' }"
               :class="{ 'full': isShiftFull(shift) }"></div>
        </div>

        <button 
          @click="handleSignup(shift)" 
          class="btn-sm btn-primary"
          :disabled="signingUp === shift.id || isShiftFull(shift) || hasSignedUp(shift.id)"
        >
          <span v-if="signingUp === shift.id">提交中...</span>
          <span v-else-if="hasSignedUp(shift.id)">✓ 已报名</span>
          <span v-else-if="isShiftFull(shift)">已满员</span>
          <span v-else>立即报名</span>
        </button>
      </div>

      <div v-if="filteredShifts.length === 0" class="notice-box">
        <p>{{ noShiftsMessage }}</p>
      </div>
    </div>

    <!-- 我的报名记录 -->
    <div v-if="mySignups.length > 0" class="my-signups glass-panel">
      <h3>我的周常任务报名</h3>
      <div class="signup-list">
        <div v-for="signup in mySignups" :key="signup.id" class="signup-item">
          <div class="signup-info">
            <strong>{{ signup.shiftName }}</strong>
            <span class="text-muted">{{ signup.shiftTime }}</span>
          </div>
          <div class="signup-date">{{ formatDate(signup.date) }}</div>
          <span class="status-badge" :class="signup.status">
            {{ getStatusText(signup.status) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import apiClient from '../services/api';
import { store } from '../store';
import { useRouter } from 'vue-router';

const router = useRouter();
const shifts = ref([]);
const loading = ref(true);
const signingUp = ref(null);
const currentRotation = ref(null);
const currentRotationWeek = ref('');
const mySignups = ref([]);
const shiftSignupCounts = ref({}); // 存储每个岗位的当前报名人数

// 默认选择明天
const today = new Date().toISOString().split('T')[0];
const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
const selectedDate = ref(tomorrow);

// 星期名称映射
const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

// 计算选中日期的星期
const selectedDayOfWeek = computed(() => {
  if (!selectedDate.value) return 0;
  const date = new Date(selectedDate.value + 'T00:00:00');
  return date.getDay(); // 0=周日, 1=周一, ..., 6=周六
});

const selectedDayName = computed(() => {
  return selectedDayOfWeek.value ? dayNames[selectedDayOfWeek.value] : '';
});

// 是否是工作日
const isWeekday = computed(() => {
  const day = selectedDayOfWeek.value;
  return day >= 1 && day <= 5; // 周一到周五
});

// 过滤当前选中日期的岗位
const filteredShifts = computed(() => {
  if (!isWeekday.value) return [];
  
  // JavaScript getDay(): 周日=0, 周一=1, 周二=2, ..., 周六=6
  // 我们的 dayOfWeek: 周一=1, 周二=2, ..., 周五=5
  // 所以直接使用 selectedDayOfWeek.value (1-5 对应周一到周五)
  return shifts.value.filter(s => s.dayOfWeek === selectedDayOfWeek.value);
});

const getShiftCountForSelectedDay = computed(() => {
  return filteredShifts.value.length;
});

const noShiftsMessage = computed(() => {
  if (selectedDayOfWeek.value === 1) {
    return '周一没有文明礼仪站岗哦！只有食堂志愿岗位。';
  }
  return '当天没有可报名的岗位';
});

onMounted(async () => {
  try {
    // 加载周常岗位
    const shiftRes = await apiClient.get('/shifts');
    shifts.value = shiftRes.data;
    
    // 加载我的报名记录
    if (store.user) {
      await loadMySignups();
    }
    
    // 加载轮值班级信息（使用公开接口）
    await loadRotationInfo();

  } catch (error) {
    console.error('加载周常岗位失败:', error);
    alert('加载失败，请检查网络');
  } finally {
    loading.value = false;
  }
});

// 监听日期变化，自动更新轮值信息
watch(selectedDate, () => {
  loadRotationInfo();
});

const loadRotationInfo = async () => {
  try {
    const res = await apiClient.get('/shifts/rotation', {
      params: { date: selectedDate.value }
    });
    if (res.data.assignedClass) {
      currentRotation.value = res.data.assignedClass;
      currentRotationWeek.value = res.data.weekStartDate;
    } else {
      currentRotation.value = null;
      currentRotationWeek.value = '';
    }
  } catch (err) {
    console.error('加载轮值信息失败:', err);
  }
};

const loadMySignups = async () => {
  try {
    const res = await apiClient.get('/shifts/my-signups', {
      params: { phone: store.user.phone }
    });
    mySignups.value = res.data;
  } catch (error) {
    console.error('加载我的报名记录失败:', error);
  }
};



const handleSignup = async (shift) => {
  if (!store.user) {
    if (confirm('请先登录再报名。去登录？')) {
      router.push('/login');
    }
    return;
  }

  if (!confirm(`确认报名 ${selectedDate.value} (${selectedDayName.value}) 的 ${shift.name} 吗？\n时间：${shift.timeRange}`)) return;

  signingUp.value = shift.id;
  try {
    await apiClient.post(`/shifts/${shift.id}/signup`, {
      studentId: store.user.id,
      date: selectedDate.value
    });
    alert('报名成功！');
    
    // 重新加载我的报名记录
    await loadMySignups();
    
    // 更新该岗位的报名人数
    shiftSignupCounts.value[shift.id] = (shiftSignupCounts.value[shift.id] || 0) + 1;
  } catch (error) {
    alert(error.response?.data?.message || '报名失败');
  } finally {
    signingUp.value = null;
  }
};

// 检查是否已报名该岗位
const hasSignedUp = (shiftId) => {
  return mySignups.value.some(s => 
    s.shiftId === shiftId && 
    s.date === selectedDate.value &&
    s.status !== 'cancelled'
  );
};

// 获取当前报名人数（估算）
const currentSignupCount = (shiftId) => {
  return shiftSignupCounts.value[shiftId] || 0;
};

// 检查岗位是否已满
const isShiftFull = (shift) => {
  return currentSignupCount(shift.id) >= shift.capacity;
};

// 获取容量百分比
const getCapacityPercent = (shift) => {
  return Math.min(100, (currentSignupCount(shift.id) / shift.capacity) * 100);
};

// 根据岗位类型返回CSS类
const getShiftTypeClass = (shiftName) => {
  if (shiftName.includes('食堂')) return 'shift-canteen';
  if (shiftName.includes('文明') || shiftName.includes('礼仪')) return 'shift-etiquette';
  return '';
};

// 格式化日期
const formatDate = (dateStr) => {
  const date = new Date(dateStr + 'T00:00:00');
  return `${date.getMonth() + 1}月${date.getDate()}日 ${dayNames[date.getDay()]}`;
};

// 获取状态文本
const getStatusText = (status) => {
  const statusMap = {
    'signed_up': '已报名',
    'pending': '待确认',
    'completed': '已完成',
    'uncompleted': '未完成',
    'cancelled': '已取消',
  };
  return statusMap[status] || status;
};
</script>

<style scoped>
.page-header {
  text-align: center;
  margin-bottom: 30px;
}

.date-selector {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 20px;
  margin-bottom: 30px;
  max-width: 500px;
  margin-left: auto;
  margin-right: auto;
}

.date-selector {
  border: 2px solid #012030;
  border-radius: 2px;
  box-shadow: 4px 4px 0px #012030;
  background: #ffffff;
}

.date-selector input[type="date"] {
  padding: 8px 12px;
  border: 2px solid #012030;
  border-radius: 2px;
  font-size: 1rem;
  font-weight: 700;
  color: #012030;
  min-width: 200px;
}

.date-hint {
  color: #13678A;
  font-size: 0.9rem;
  font-weight: 700;
}

.shifts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
}

.shift-card {
  padding: 20px;
  transition: transform 0.15s, box-shadow 0.15s;
  background: #ffffff;
  border: 2px solid #012030;
  border-left: 6px solid #45C4B0;
  border-radius: 2px;
  box-shadow: 4px 4px 0px #012030;
  position: relative;
  overflow: hidden;
}

.shift-card.shift-canteen {
  border-left: 6px solid #45C4B0; /* 薄荷青 - 食堂 */
}

.shift-card.shift-etiquette {
  border-left: 6px solid #13678A; /* 海蓝 - 文明礼仪 */
}

.shift-card:hover {
  transform: translate(-2px, -2px);
  box-shadow: 7px 7px 0px #012030;
}

.shift-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 800;
  margin-bottom: 12px;
  font-size: 1.1rem;
}

.shift-name {
  color: #012030;
  font-weight: 800;
}

.shift-hours {
  font-size: 0.85rem;
  font-weight: 800;
  letter-spacing: 0.03em;
  background: #13678A;
  color: white;
  border: 1px solid #012030;
  padding: 4px 8px;
  border-radius: 2px;
}

.shift-info {
  margin-bottom: 12px;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  color: #13678A;
  margin-bottom: 6px;
}

.icon {
  font-size: 1rem;
}

.description {
  font-size: 0.85rem;
  font-style: italic;
  color: #012030;
}

.capacity-bar {
  height: 8px;
  background: #DAFDBA;
  border: 1.5px solid #012030;
  border-radius: 0;
  margin: 12px 0;
  overflow: hidden;
}

.capacity-fill {
  height: 100%;
  background: #45C4B0;
  transition: width 0.2s;
}

.capacity-fill.full {
  background: #012030;
}

.btn-sm {
  width: 100%;
  margin-top: 8px;
  padding: 10px;
  font-size: 0.95rem;
  font-weight: 700;
}

.rotation-banner {
  text-align: center;
  background: #DAFDBA;
  color: #012030;
  padding: 16px;
  border-radius: 2px;
  margin-bottom: 24px;
  font-weight: 700;
  border: 2px solid #012030;
  box-shadow: 4px 4px 0px #012030;
}

.highlight-class {
  font-weight: 800;
  color: #012030;
  background: #9AEBA3;
  padding: 2px 8px;
  border: 1.5px solid #012030;
  border-radius: 2px;
  box-shadow: 1.5px 1.5px 0px #012030;
  font-size: 1.1rem;
}

.notice-box {
  text-align: center;
  padding: 40px 20px;
  background: #ffffff;
  border: 2px solid #012030;
  border-radius: 2px;
  box-shadow: 4px 4px 0px #012030;
  color: #012030;
  font-weight: 600;
}

.notice-box p {
  margin: 8px 0;
}

.my-signups {
  padding: 24px;
  margin-top: 40px;
  background: #ffffff;
  border: 2px solid #012030;
  border-radius: 2px;
  box-shadow: 4px 4px 0px #012030;
}

.my-signups h3 {
  margin-bottom: 20px;
  font-weight: 800;
  color: #012030;
}

.signup-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.signup-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #ffffff;
  border-radius: 2px;
  border: 2px solid #012030;
  border-left: 6px solid #45C4B0;
  box-shadow: 3px 3px 0px #012030;
}

.signup-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.signup-info strong {
  color: #012030;
  font-weight: 800;
}

.text-muted {
  color: #13678A;
  font-size: 0.85rem;
}

.signup-date {
  font-weight: 700;
  color: #13678A;
}

.status-badge {
  padding: 3px 10px;
  border-radius: 2px;
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  border: 1.5px solid #012030;
  box-shadow: 1.5px 1.5px 0px #012030;
}

.status-badge.pending {
  background: #DAFDBA;
  color: #012030;
}

.status-badge.completed {
  background: #45C4B0;
  color: #012030;
}

.status-badge.cancelled {
  background: rgba(1, 32, 48, 0.08);
  color: #012030;
}

@media (max-width: 768px) {
  .shifts-grid {
    grid-template-columns: 1fr;
  }
  
  .signup-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}
</style>
