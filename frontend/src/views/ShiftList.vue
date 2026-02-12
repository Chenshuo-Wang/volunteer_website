<template>
  <div class="container">
    <header class="page-header">
      <h1>🗓️ 周常岗位值日</h1>
      <p>固定时间的志愿服务，培养每日坚持的好习惯</p>
    </header>

    <div v-if="currentRotation" class="rotation-banner">
      🔔 本周 ({{ currentRotationWeek }}) 轮值班级：
      <span class="highlight-class">{{ currentRotation }}</span>
    </div>

    <div class="date-selector glass-panel">
      <label>选择值日日期：</label>
      <input type="date" v-model="selectedDate" :min="today" />
      <span class="date-hint">请选择您要参与值日的具体日期</span>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>正在加载岗位安排...</p>
    </div>

    <div v-else class="shifts-grid">
      <div v-for="day in 5" :key="day" class="day-column">
        <h3 class="day-title">周{{ ['一','二','三','四','五'][day-1] }}</h3>
        
        <div class="shift-list">
          <div 
            v-for="shift in getShiftsByDay(day)" 
            :key="shift.id" 
            class="shift-card glass-panel"
            :class="{ 'disabled': !isDateMatchingDay(day) }"
          >
            <div class="shift-header">
              <span class="shift-name">{{ shift.name }}</span>
              <span class="shift-hours">{{ shift.hoursValue }}h</span>
            </div>
            
            <div class="shift-time">🕒 {{ shift.timeRange }}</div>
            <div class="shift-capacity">👤 容量: {{ shift.capacity }}人</div>

            <button 
              @click="handleSignup(shift)" 
              class="btn-sm btn-primary"
              :disabled="!isDateMatchingDay(day) || signingUp === shift.id"
            >
              {{ signingUp === shift.id ? '提交中...' : '报名' }}
            </button>
            
            <p v-if="!isDateMatchingDay(day)" class="warning-text">
              日期不符
            </p>
          </div>
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

// Default to tomorrow
const today = new Date().toISOString().split('T')[0];
const selectedDate = ref(today);

onMounted(async () => {
  try {
    // 加载周常岗位
    const shiftRes = await apiClient.get('/shifts');
    shifts.value = shiftRes.data;
    
    // 尝试加载轮换信息（非管理员无权限时忽略）
    try {
      const rotRes = await apiClient.get('/admin/rotations');
      const rotations = rotRes.data;
      
      // 更新轮换显示
      updateRotationInfo(rotations, selectedDate.value);
      
      // 监听日期变化
      watch(selectedDate, (newDate) => {
        updateRotationInfo(rotations, newDate);
      });
    } catch (err) {
      // 非管理员用户，不显示轮换信息
      console.log('未加载轮换信息（需要管理员权限）');
    }

  } catch (error) {
    console.error('加载周常岗位失败:', error);
    alert('加载失败，请检查网络');
  } finally {
    loading.value = false;
  }
});

const updateRotationInfo = (rotations, dateStr) => {
  if (!dateStr) return;
  const date = new Date(dateStr);
  // Get Monday of that week
  const day = date.getDay() || 7; // Get current day number, converting Sun (0) to 7
  if (day !== 1) date.setHours(-24 * (day - 1)); // Adjust to Monday
  
  const mondayStr = date.toISOString().split('T')[0];
  const rot = rotations.find(r => r.weekStartDate === mondayStr);
  
  if (rot) {
    currentRotation.value = rot.assignedClass + " (含对应年份)";
    currentRotationWeek.value = mondayStr;
  } else {
    currentRotation.value = null;
    currentRotationWeek.value = '';
  }
};

const getShiftsByDay = (day) => {
  return shifts.value.filter(s => s.dayOfWeek === day);
};

const isDateMatchingDay = (dayOfWeek) => {
  if (!selectedDate.value) return false;
  const date = new Date(selectedDate.value);
  // getDay(): Sun=0, Mon=1...
  return date.getDay() === dayOfWeek;
};

const handleSignup = async (shift) => {
  if (!store.user) {
    if (confirm('请先登录再报名。去登录？')) {
      router.push('/login');
    }
    return;
  }

  if (!confirm(`确认报名 ${selectedDate.value} 的 ${shift.name} 吗？`)) return;

  signingUp.value = shift.id;
  try {
    await apiClient.post(`/shifts/${shift.id}/signup`, {
      studentId: store.user.id,
      date: selectedDate.value
    });
    alert('报名成功！');
  } catch (error) {
    alert(error.response?.data?.message || '报名失败');
  } finally {
    signingUp.value = null;
  }
};
</script>

<style scoped>
.page-header {
  text-align: center;
  margin-bottom: 30px;
}

.date-selector {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 20px;
  margin-bottom: 30px;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}

.date-hint {
  color: var(--text-muted);
  font-size: 0.9rem;
}

.shifts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  overflow-x: auto;
}

.day-column {
  min-width: 200px;
}

.day-title {
  text-align: center;
  margin-bottom: 16px;
  color: var(--primary-color);
  border-bottom: 2px solid rgba(79, 70, 229, 0.2);
  padding-bottom: 8px;
}

.shift-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.shift-card {
  padding: 16px;
  transition: all 0.2s;
  border-left: 4px solid var(--accent-color);
}

.shift-card.disabled {
  opacity: 0.6;
  filter: grayscale(0.8);
  pointer-events: none; /* simple disable */
}

.shift-header {
  display: flex;
  justify-content: space-between;
  font-weight: 600;
  margin-bottom: 8px;
}

.shift-hours {
  font-size: 0.8rem;
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 4px;
}

.shift-time, .shift-capacity {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-bottom: 4px;
}

.btn-sm {
  width: 100%;
  margin-top: 8px;
  padding: 6px;
  font-size: 0.9rem;
}

.warning-text {
  font-size: 0.75rem;
  color: #ef4444;
  text-align: center;
  margin-top: 4px;
}

.rotation-banner {
  text-align: center;
  background: #fffbeb;
  color: #b45309;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 24px;
  font-weight: 500;
  border: 1px solid #fcd34d;
}

.highlight-class {
  font-weight: 800;
  color: #d97706;
}
</style>
