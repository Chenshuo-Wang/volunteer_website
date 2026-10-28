<template>
  <div class="container">
    <header class="editorial-header">
      <div class="header-main">
        <div class="editorial-kicker">INDEX // 02 — WEEKLY ROTATION</div>
        <h1 class="editorial-title">周常岗位值日<span class="editorial-dot">.</span></h1>
        <p class="editorial-subtitle">工作日固定时段的常态化校园执勤岗位，培养持之以恒的公共服务习惯。</p>
      </div>
      <div v-if="!loading && isWeekday" class="editorial-meta-stat">
        <span class="stat-num">{{ String(getShiftCountForSelectedDay).padStart(2, '0') }}</span>
        <span class="stat-label">{{ selectedDayName }} OPEN SHIFTS // 可报岗位</span>
      </div>
    </header>

    <!-- 瑞士控制栏：左侧本周轮值班级 + 右侧日期选择器 -->
    <section class="swiss-control-strip">
      <div class="control-cell rotation-cell">
        <span class="control-key">WEEKLY ROTATION // 本周轮值班级</span>
        <div v-if="currentRotation" class="rotation-value-row">
          <span class="rotation-class-code">{{ currentRotation }}</span>
          <span class="rotation-week-note">WEEK OF {{ currentRotationWeek }}</span>
        </div>
        <div v-else class="rotation-value-row">
          <span class="rotation-empty">UNASSIGNED // 当前周期暂未指定轮值班级</span>
        </div>
      </div>

      <div class="control-cell date-cell">
        <label class="control-key" for="shift-date-input">TARGET DATE // 选择值日日期</label>
        <div class="date-input-row">
          <input id="shift-date-input" type="date" v-model="selectedDate" :min="today" class="swiss-date-input" />
          <span v-if="selectedDayName" class="day-badge">
            {{ selectedDayName }} · {{ getShiftCountForSelectedDay }} 岗
          </span>
        </div>
      </div>
    </section>

    <div v-if="loading" class="swiss-state-box">
      <div class="swiss-loader-line"></div>
      <p class="state-mono">LOADING SCHEDULE // 正在读取岗位排班表...</p>
    </div>

    <div v-else-if="!isWeekday" class="swiss-state-box">
      <p class="state-title">WEEKEND NOTICE // 周常岗位仅在工作日（周一至周五）开放</p>
      <p class="state-mono">请在上方日期选择器中切换至周一至周五的日期</p>
    </div>

    <div v-else>
      <div v-if="filteredShifts.length > 0" class="swiss-shift-grid">
        <div
          v-for="(shift, idx) in filteredShifts"
          :key="shift.id"
          class="swiss-shift-cell"
          :class="getShiftTypeClass(shift.name)"
        >
          <div class="shift-cell-top">
            <span class="shift-index">SHIFT // {{ String(idx + 1).padStart(2, '0') }}</span>
            <span class="shift-hours">+{{ shift.hoursValue }} HRS</span>
          </div>

          <div class="shift-cell-main">
            <h3 class="shift-name">{{ shift.name }}</h3>
            <div class="shift-time-display">{{ shift.timeRange }}</div>
            <p v-if="shift.description" class="shift-desc">{{ shift.description }}</p>
          </div>

          <div class="shift-cell-footer">
            <div class="capacity-meta">
              <span class="cap-label">CAPACITY // 报名容量</span>
              <span class="cap-num">{{ currentSignupCount(shift.id) }} / {{ shift.capacity }} 人</span>
            </div>

            <div class="capacity-bar">
              <div
                class="capacity-fill"
                :style="{ width: getCapacityPercent(shift) + '%' }"
                :class="{ full: isShiftFull(shift) }"
              ></div>
            </div>

            <button
              @click="handleSignup(shift)"
              class="btn-primary shift-btn"
              :disabled="signingUp === shift.id || isShiftFull(shift) || hasSignedUp(shift.id)"
            >
              <span v-if="signingUp === shift.id">SUBMITTING // 提交中...</span>
              <span v-else-if="hasSignedUp(shift.id)"><Check :size="14" :stroke-width="2.5" class="icon-inline" /> REGISTERED // 已报名</span>
              <span v-else-if="isShiftFull(shift)">FULL // 已满员</span>
              <span v-else>SIGN UP // 立即报名</span>
            </button>
          </div>
        </div>
      </div>

      <div v-else class="swiss-state-box">
        <p class="state-mono">{{ noShiftsMessage }}</p>
      </div>
    </div>

    <!-- 我的周常任务报名台账 -->
    <section v-if="mySignups.length > 0" class="swiss-ledger-section">
      <div class="ledger-header">
        <span class="ledger-kicker">PERSONAL ARCHIVE // 我的周常值日记录</span>
        <span class="ledger-count">{{ mySignups.length }} RECORDS</span>
      </div>
      <div class="ledger-list">
        <div v-for="signup in mySignups" :key="signup.id" class="ledger-row">
          <div class="ledger-main">
            <strong class="ledger-name">{{ signup.shiftName }}</strong>
            <span class="ledger-time">{{ signup.shiftTime }}</span>
          </div>
          <div class="ledger-date">{{ formatDate(signup.date) }}</div>
          <div class="ledger-status-cell">
            <span class="swiss-tag" :class="signup.status">
              {{ getStatusText(signup.status) }}
            </span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import apiClient from '../services/api';
import { store } from '../store';
import { useRouter } from 'vue-router';
import { Check } from '../components/icons';

const router = useRouter();
const shifts = ref([]);
const loading = ref(true);
const signingUp = ref(null);
const currentRotation = ref(null);
const currentRotationWeek = ref('');
const mySignups = ref([]);
const shiftSignupCounts = ref({});

const today = new Date().toISOString().split('T')[0];
const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
const selectedDate = ref(tomorrow);

const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

const selectedDayOfWeek = computed(() => {
  if (!selectedDate.value) return 0;
  const date = new Date(selectedDate.value + 'T00:00:00');
  return date.getDay();
});

const selectedDayName = computed(() => {
  return selectedDayOfWeek.value ? dayNames[selectedDayOfWeek.value] : '';
});

const isWeekday = computed(() => {
  const day = selectedDayOfWeek.value;
  return day >= 1 && day <= 5;
});

const filteredShifts = computed(() => {
  if (!isWeekday.value) return [];
  return shifts.value.filter(s => s.dayOfWeek === selectedDayOfWeek.value);
});

const getShiftCountForSelectedDay = computed(() => {
  return filteredShifts.value.length;
});

const noShiftsMessage = computed(() => {
  if (selectedDayOfWeek.value === 1) {
    return '周一无文明礼仪站岗，仅开放食堂志愿岗位。';
  }
  return '当天没有可报名的岗位';
});

onMounted(async () => {
  try {
    const shiftRes = await apiClient.get('/shifts');
    shifts.value = shiftRes.data;

    if (store.user) {
      await loadMySignups();
    }

    await loadRotationInfo();
  } catch (error) {
    console.error('加载周常岗位失败:', error);
    alert('加载失败，请检查网络');
  } finally {
    loading.value = false;
  }
});

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
    await loadMySignups();
    shiftSignupCounts.value[shift.id] = (shiftSignupCounts.value[shift.id] || 0) + 1;
  } catch (error) {
    alert(error.response?.data?.message || '报名失败');
  } finally {
    signingUp.value = null;
  }
};

const hasSignedUp = (shiftId) => {
  return mySignups.value.some(s =>
    s.shiftId === shiftId &&
    s.date === selectedDate.value &&
    s.status !== 'cancelled'
  );
};

const currentSignupCount = (shiftId) => {
  return shiftSignupCounts.value[shiftId] || 0;
};

const isShiftFull = (shift) => {
  return currentSignupCount(shift.id) >= shift.capacity;
};

const getCapacityPercent = (shift) => {
  return Math.min(100, (currentSignupCount(shift.id) / shift.capacity) * 100);
};

const getShiftTypeClass = (shiftName) => {
  if (shiftName.includes('食堂')) return 'shift-canteen';
  if (shiftName.includes('文明') || shiftName.includes('礼仪')) return 'shift-etiquette';
  return '';
};

const formatDate = (dateStr) => {
  const date = new Date(dateStr + 'T00:00:00');
  return `${date.getMonth() + 1}月${date.getDate()}日 ${dayNames[date.getDay()]}`;
};

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
/* 顶部双栏控制带 */
.swiss-control-strip {
  display: grid;
  grid-template-columns: 1fr 1fr;
  border: var(--hairline);
  background: var(--surface-white);
  margin-bottom: 36px;
}

.control-cell {
  padding: 24px 28px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 10px;
}

.rotation-cell {
  border-right: var(--hairline);
}

.control-key {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: var(--text-subtle);
  margin: 0;
}

.rotation-value-row {
  display: flex;
  align-items: baseline;
  gap: 14px;
  flex-wrap: wrap;
}

.rotation-class-code {
  font-size: 1.5rem;
  font-weight: 900;
  letter-spacing: -0.03em;
  color: var(--c-dark);
}

.rotation-week-note {
  font-family: var(--font-mono);
  font-size: 0.74rem;
  color: var(--c-teal);
  font-weight: 700;
  letter-spacing: 0.08em;
}

.rotation-empty {
  font-size: 0.9rem;
  color: var(--text-muted);
  font-weight: 500;
}

.date-input-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.swiss-date-input {
  max-width: 220px;
  padding: 8px 12px;
  font-family: var(--font-mono);
  font-size: 0.9rem;
  font-weight: 700;
}

.day-badge {
  font-family: var(--font-mono);
  font-size: 0.76rem;
  font-weight: 700;
  color: var(--c-dark);
  padding: 6px 10px;
  background: var(--surface-subtle);
}

/* 岗位 1px 网格 */
.swiss-shift-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(310px, 1fr));
  gap: 1px;
  background-color: rgba(1, 32, 48, 0.12);
  border: 1px solid rgba(1, 32, 48, 0.12);
  margin-bottom: 48px;
}

.swiss-shift-cell {
  background: var(--surface-white);
  padding: 26px 24px 24px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
  transition: background-color var(--transition-fast);
}

.swiss-shift-cell::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--c-dark);
  opacity: 0.15;
  transition: opacity var(--transition-fast), background-color var(--transition-fast);
}

.swiss-shift-cell.shift-canteen::before {
  background: var(--c-teal);
  opacity: 1;
}

.swiss-shift-cell:hover {
  background: #FCFCFD;
}

.shift-cell-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.shift-index {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: var(--text-subtle);
}

.shift-hours {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 700;
  padding: 3px 8px;
  background: var(--surface-subtle);
  color: var(--c-dark);
}

.shift-cell-main {
  margin-bottom: 24px;
}

.shift-name {
  font-size: 1.22rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--c-dark);
  margin: 0 0 8px;
}

.shift-time-display {
  font-family: var(--font-mono);
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--c-dark);
  letter-spacing: 0.02em;
  font-variant-numeric: tabular-nums;
}

.shift-desc {
  margin: 10px 0 0;
  font-size: 0.84rem;
  color: var(--text-muted);
  line-height: 1.5;
}

.shift-cell-footer {
  border-top: var(--hairline);
  padding-top: 14px;
}

.capacity-meta {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 8px;
}

.cap-label {
  font-family: var(--font-mono);
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  color: var(--text-subtle);
}

.cap-num {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--c-dark);
  font-variant-numeric: tabular-nums;
}

.capacity-bar {
  height: 2px;
  background: var(--surface-subtle);
  margin-bottom: 16px;
  overflow: hidden;
}

.capacity-fill {
  height: 100%;
  background: var(--c-teal);
  transition: width 0.25s ease;
}

.capacity-fill.full {
  background: var(--c-dark);
}

.shift-btn {
  width: 100%;
  padding: 11px 16px;
  font-size: 0.8rem;
}

/* 状态提示框 */
.swiss-state-box {
  border: var(--hairline);
  background: var(--surface-white);
  padding: 64px 24px;
  text-align: center;
  margin-bottom: 40px;
}

.swiss-loader-line {
  width: 48px;
  height: 2px;
  background: var(--c-teal);
  margin: 0 auto 16px;
  animation: pulseWidth 1.2s ease-in-out infinite alternate;
}

@keyframes pulseWidth {
  from { transform: scaleX(0.35); opacity: 0.4; }
  to { transform: scaleX(1); opacity: 1; }
}

.state-title {
  font-size: 1rem;
  font-weight: 800;
  color: var(--c-dark);
  margin: 0 0 8px;
}

.state-mono {
  font-family: var(--font-mono);
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  margin: 0;
}

/* 我的报名台账 */
.swiss-ledger-section {
  border-top: var(--rule-heavy);
  background: var(--surface-white);
  border-left: var(--hairline);
  border-right: var(--hairline);
  border-bottom: var(--hairline);
}

.ledger-header {
  padding: 18px 24px;
  border-bottom: var(--hairline);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.ledger-kicker {
  font-family: var(--font-mono);
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: var(--c-dark);
}

.ledger-count {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  color: var(--text-subtle);
}

.ledger-list {
  display: flex;
  flex-direction: column;
}

.ledger-row {
  display: grid;
  grid-template-columns: 1.5fr 1fr auto;
  align-items: center;
  padding: 14px 24px;
  border-bottom: var(--hairline);
  gap: 16px;
}

.ledger-row:last-child {
  border-bottom: none;
}

.ledger-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ledger-name {
  font-size: 0.92rem;
  font-weight: 800;
  color: var(--c-dark);
}

.ledger-time {
  font-family: var(--font-mono);
  font-size: 0.76rem;
  color: var(--text-muted);
}

.ledger-date {
  font-family: var(--font-mono);
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--c-dark);
}

.swiss-tag {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  font-weight: 700;
  padding: 3px 9px;
  border: var(--hairline);
  background: var(--bg-color);
  color: var(--c-dark);
}

.swiss-tag.completed {
  border-color: rgba(69, 196, 176, 0.5);
  background: rgba(69, 196, 176, 0.1);
}

.swiss-tag.cancelled {
  color: var(--text-subtle);
}

@media (max-width: 768px) {
  .swiss-control-strip {
    grid-template-columns: 1fr;
  }

  .rotation-cell {
    border-right: none;
    border-bottom: var(--hairline);
  }

  .swiss-shift-grid {
    grid-template-columns: 1fr;
  }

  .ledger-row {
    grid-template-columns: 1fr;
    gap: 8px;
  }
}
</style>
