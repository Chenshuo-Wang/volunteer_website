<template>
  <div class="container">
    <header class="editorial-header">
      <div class="header-main">
        <div class="editorial-kicker">INDEX // 01 — CAMPUS DISPATCH</div>
        <h1 class="editorial-title">校园志愿活动<span class="editorial-dot">.</span></h1>
        <p class="editorial-subtitle">探索近期开放的校园志愿服务项目，记录每一次可量化的公共参与。</p>
      </div>
      <div v-if="!loading" class="editorial-meta-stat">
        <span class="stat-num">{{ String(events.length).padStart(2, '0') }}</span>
        <span class="stat-label">TOTAL LISTINGS // 项目总数</span>
      </div>
    </header>

    <div v-if="loading" class="swiss-state-box">
      <div class="swiss-loader-line"></div>
      <p class="state-mono">LOADING ARCHIVE // 正在同步活动目录...</p>
    </div>

    <div v-else-if="events.length > 0" class="swiss-event-grid">
      <router-link
        v-for="(event, idx) in events"
        :key="event.id"
        :to="{ name: 'EventDetail', params: { id: event.id } }"
        class="swiss-event-cell"
      >
        <div class="cell-top-bar">
          <div class="cell-index-group">
            <span class="cell-index">NO. {{ String(idx + 1).padStart(2, '0') }}</span>
            <StatusBadge :status="event.status" />
          </div>
          <span class="cell-hours">+{{ event.hoursValue }} HRS</span>
        </div>

        <div class="cell-body">
          <div class="title-row">
            <h3 class="cell-title">{{ event.title }}</h3>
            <ArrowUpRight :size="18" :stroke-width="2" class="cell-arrow" />
          </div>
        </div>

        <div class="cell-specs">
          <div class="spec-row">
            <span class="spec-key">LOCATION</span>
            <span class="spec-val">{{ event.location }}</span>
          </div>
          <div class="spec-row">
            <span class="spec-key">SCHEDULE</span>
            <span class="spec-val tabular">{{ formatDate(event.startTime) }}</span>
          </div>
          <div class="spec-row">
            <span class="spec-key">CAPACITY</span>
            <span class="spec-val tabular">{{ event.currentVolunteers }} / {{ event.requiredVolunteers }} 人</span>
          </div>
          <div class="micro-progress">
            <div
              class="micro-progress-fill"
              :style="{ width: Math.min(100, ((event.currentVolunteers || 0) / (event.requiredVolunteers || 1)) * 100) + '%' }"
            ></div>
          </div>
        </div>
      </router-link>
    </div>

    <div v-else class="swiss-state-box">
      <p class="state-mono">ARCHIVE EMPTY // 暂无进行中的校园志愿活动</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import apiClient from '../services/api';
import StatusBadge from '../components/StatusBadge.vue';
import { ArrowUpRight } from '../components/icons';

const events = ref([]);
const loading = ref(true);

onMounted(async () => {
  try {
    const response = await apiClient.get('/events');
    events.value = response.data;
  } catch (error) {
    console.error('Failed to load events', error);
  } finally {
    loading.value = false;
  }
});

const formatDate = (isoString) => {
  const date = new Date(isoString);
  return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
};
</script>

<style scoped>
/* 瑞士 1px 裸露网格展陈系统 */
.swiss-event-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(330px, 1fr));
  gap: 1px;
  background-color: rgba(1, 32, 48, 0.12);
  border: 1px solid rgba(1, 32, 48, 0.12);
}

.swiss-event-cell {
  position: relative;
  background-color: var(--surface-white);
  padding: 28px 26px 24px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 270px;
  transition: background-color var(--transition-fast);
  overflow: hidden;
}

.swiss-event-cell::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background-color: var(--c-teal);
  transform: scaleX(0);
  transform-origin: left center;
  transition: transform var(--transition-smooth);
}

.swiss-event-cell:hover {
  background-color: #FCFCFD;
}

.swiss-event-cell:hover::before {
  transform: scaleX(1);
}

.cell-top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  gap: 12px;
}

.cell-index-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.cell-index {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--text-subtle);
}

.cell-hours {
  font-family: var(--font-mono);
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--c-dark);
  padding: 3px 8px;
  background: var(--surface-subtle);
  font-variant-numeric: tabular-nums;
}

.cell-body {
  margin-bottom: 28px;
  flex-grow: 1;
}

.title-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 14px;
}

.cell-title {
  font-size: 1.32rem;
  font-weight: 800;
  letter-spacing: -0.025em;
  line-height: 1.32;
  color: var(--c-dark);
  margin: 0;
}

.cell-arrow {
  color: var(--text-subtle);
  flex-shrink: 0;
  margin-top: 3px;
  transition: transform var(--transition-fast), color var(--transition-fast);
}

.swiss-event-cell:hover .cell-arrow {
  color: var(--c-dark);
  transform: translate(3px, -3px);
}

.cell-specs {
  border-top: var(--hairline);
  padding-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.spec-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  font-size: 0.84rem;
}

.spec-key {
  font-family: var(--font-mono);
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: var(--text-subtle);
  flex-shrink: 0;
}

.spec-val {
  font-weight: 600;
  color: var(--c-dark);
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tabular {
  font-variant-numeric: tabular-nums;
}

.micro-progress {
  width: 100%;
  height: 2px;
  background: var(--surface-subtle);
  margin-top: 6px;
  overflow: hidden;
}

.micro-progress-fill {
  height: 100%;
  background: var(--c-dark);
  transition: width 0.3s ease, background-color var(--transition-fast);
}

.swiss-event-cell:hover .micro-progress-fill {
  background: var(--c-teal);
}

.swiss-state-box {
  border: var(--hairline);
  background: var(--surface-white);
  padding: 72px 24px;
  text-align: center;
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

.state-mono {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  letter-spacing: 0.1em;
  color: var(--text-muted);
  margin: 0;
}

@media (max-width: 768px) {
  .swiss-event-grid {
    grid-template-columns: 1fr;
  }

  .swiss-event-cell {
    padding: 22px 20px;
    min-height: auto;
  }
}
</style>
