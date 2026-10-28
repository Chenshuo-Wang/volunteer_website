<template>
  <div class="container detail-container" v-if="event">
    <div class="back-bar">
      <router-link to="/events" class="back-link">
        <ArrowLeft :size="15" :stroke-width="2" class="icon-inline" />
        <span>RETURN TO INDEX // 返回活动列表</span>
      </router-link>
    </div>

    <article class="swiss-dossier">
      <!-- 顶部档案标题区 -->
      <header class="dossier-header">
        <div class="dossier-meta-top">
          <span class="dossier-id">EVENT DOSSIER // #{{ String(event.id).padStart(3, '0') }}</span>
          <StatusBadge :status="event.status" />
        </div>
        <h1 class="dossier-title">{{ event.title }}<span class="editorial-dot">.</span></h1>
      </header>

      <!-- 核心指标三栏网格 -->
      <div class="metrics-strip">
        <div class="metric-cell">
          <span class="metric-key">LOCATION // 活动地点</span>
          <span class="metric-val">{{ event.location }}</span>
        </div>
        <div class="metric-cell">
          <span class="metric-key">CREDIT // 志愿工时</span>
          <span class="metric-val tabular">+{{ event.hoursValue }} 小时</span>
        </div>
        <div class="metric-cell">
          <span class="metric-key">CAPACITY // 招募进度</span>
          <span class="metric-val tabular">{{ event.currentVolunteers }} / {{ event.requiredVolunteers }} 人</span>
        </div>
      </div>

      <!-- 双栏正文与规格参数表 -->
      <div class="dossier-body-grid">
        <section class="dossier-briefing">
          <div class="section-index">01 // BRIEFING 活动说明</div>
          <p class="description">{{ event.description || '暂无详细文字说明。请按下方规格参数中的时间与地点准时参与。' }}</p>
        </section>

        <section class="dossier-specs">
          <div class="section-index">02 // SPECIFICATIONS 规格参数</div>
          <div class="spec-table">
            <div class="spec-item">
              <span class="spec-label">开始时间</span>
              <span class="spec-value tabular">{{ formatFullDate(event.startTime) }}</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">结束时间</span>
              <span class="spec-value tabular">{{ formatFullDate(event.endTime) }}</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">报名截止</span>
              <span class="spec-value tabular">{{ formatFullDate(event.registrationDeadline) }}</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">项目负责人</span>
              <span class="spec-value">{{ event.leaderName || '未指定' }} {{ event.leaderContact ? `(${event.leaderContact})` : '' }}</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">年级限制</span>
              <span class="spec-value">{{ event.gradeLimit === 'ALL' ? '面向全校' : event.gradeLimit + ' 级' }}</span>
            </div>
          </div>
        </section>
      </div>

      <!-- 管理员快捷入口 -->
      <div v-if="store.user?.isAdmin" class="admin-strip">
        <span class="admin-strip-label">
          <ShieldCheck :size="15" :stroke-width="2" class="icon-inline" />
          ADMINISTRATION // 管理员快捷操作
        </span>
        <router-link
          :to="{ path: '/admin', query: { tab: '活动管理', editId: event.id } }"
          class="btn-secondary btn-compact"
        >
          <Pencil :size="14" :stroke-width="2" class="icon-inline" /> 编辑此活动参数
        </router-link>
      </div>

      <!-- 底部报名动作栏 -->
      <footer class="dossier-footer">
        <div class="footer-note">
          <span class="note-mono">REGISTRATION PROTOCOL // 报名确认后请准时签到参与</span>
        </div>
        <div class="footer-cta">
          <button
            v-if="store.user"
            @click="handleSignup"
            class="btn-primary btn-register-action"
            :disabled="!canSignup || loading"
          >
            {{ loading ? 'PROCESSING // 处理中...' : signupButtonText }}
          </button>
          <div v-else class="login-inline">
            <span class="login-hint">需登录志愿者账号后报名</span>
            <router-link to="/login" class="btn-primary">PORTAL // 前往登录</router-link>
          </div>
        </div>
      </footer>
    </article>
  </div>
  <div v-else class="container">
    <div class="swiss-loading">LOADING DOSSIER // 正在读取活动档案...</div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import apiClient from '../services/api';
import { store } from '../store';
import StatusBadge from '../components/StatusBadge.vue';
import { ShieldCheck, Pencil, ArrowLeft } from '../components/icons';

const route = useRoute();
const router = useRouter();
const event = ref(null);
const loading = ref(false);

const eventId = route.params.id;

onMounted(async () => {
  try {
    const response = await apiClient.get(`/events/${eventId}`);
    event.value = response.data;
  } catch (error) {
    alert('无法加载活动详情');
    router.push('/events');
  }
});

const canSignup = computed(() => {
  return event.value && event.value.status === '招募中';
});

const signupButtonText = computed(() => {
  if (!event.value) return '';
  if (event.value.status === '招募中') return 'CONFIRM SIGNUP // 立即报名参与';
  return `STATUS // ${event.value.status}`;
});

const formatFullDate = (iso) => {
  return new Date(iso).toLocaleString('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
};

const handleSignup = async () => {
  if (!confirm('确定要报名参加这个活动吗？')) return;

  loading.value = true;
  try {
    await apiClient.post(`/events/${eventId}/signup`, {
      studentId: store.user.id
    });
    alert('报名成功！');
    const response = await apiClient.get(`/events/${eventId}`);
    event.value = response.data;
  } catch (error) {
    alert(error.response?.data?.message || '报名失败');
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.detail-container {
  max-width: 980px;
}

.back-bar {
  margin-bottom: 24px;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: var(--text-muted);
  transition: color var(--transition-fast);
}

.back-link:hover {
  color: var(--c-dark);
}

.swiss-dossier {
  background: var(--surface-white);
  border-top: var(--rule-heavy);
  border-left: var(--hairline);
  border-right: var(--hairline);
  border-bottom: var(--hairline);
}

.dossier-header {
  padding: 36px 40px 32px;
  border-bottom: var(--hairline);
}

.dossier-meta-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;
  gap: 12px;
  flex-wrap: wrap;
}

.dossier-id {
  font-family: var(--font-mono);
  font-size: 0.74rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  color: var(--text-subtle);
}

.dossier-title {
  font-size: clamp(1.85rem, 3.5vw, 2.75rem);
  font-weight: 900;
  letter-spacing: -0.03em;
  line-height: 1.12;
  color: var(--c-dark);
  margin: 0;
}

/* 三栏核心指标带 */
.metrics-strip {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  border-bottom: var(--hairline);
  background: var(--bg-color);
}

.metric-cell {
  padding: 20px 40px;
  border-right: var(--hairline);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.metric-cell:last-child {
  border-right: none;
}

.metric-key {
  font-family: var(--font-mono);
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: var(--text-subtle);
}

.metric-val {
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--c-dark);
}

/* 双栏正文与规格表 */
.dossier-body-grid {
  display: grid;
  grid-template-columns: 1.25fr 1fr;
  border-bottom: var(--hairline);
}

.dossier-briefing {
  padding: 36px 40px;
  border-right: var(--hairline);
}

.dossier-specs {
  padding: 36px 40px;
}

.section-index {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: var(--text-muted);
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: var(--hairline);
}

.description {
  white-space: pre-wrap;
  line-height: 1.85;
  color: var(--c-dark);
  font-size: 0.98rem;
  margin: 0;
}

.spec-table {
  display: flex;
  flex-direction: column;
}

.spec-item {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 12px 0;
  border-bottom: var(--hairline);
  gap: 16px;
}

.spec-item:last-child {
  border-bottom: none;
}

.spec-label {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-muted);
  flex-shrink: 0;
}

.spec-value {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--c-dark);
  text-align: right;
}

.tabular {
  font-variant-numeric: tabular-nums;
}

/* 管理员快捷栏 */
.admin-strip {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 40px;
  background: var(--surface-subtle);
  border-bottom: var(--hairline);
  gap: 16px;
  flex-wrap: wrap;
}

.admin-strip-label {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--c-dark);
}

.btn-compact {
  padding: 7px 14px;
  font-size: 0.8rem;
}

/* 底部报名区 */
.dossier-footer {
  padding: 28px 40px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
}

.note-mono {
  font-family: var(--font-mono);
  font-size: 0.74rem;
  letter-spacing: 0.08em;
  color: var(--text-subtle);
}

.btn-register-action {
  min-width: 240px;
  padding: 15px 32px;
}

.login-inline {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.login-hint {
  font-size: 0.88rem;
  color: var(--text-muted);
}

.swiss-loading {
  padding: 72px 24px;
  text-align: center;
  border: var(--hairline);
  background: var(--surface-white);
  font-family: var(--font-mono);
  font-size: 0.8rem;
  letter-spacing: 0.1em;
  color: var(--text-muted);
}

@media (max-width: 768px) {
  .dossier-header,
  .dossier-briefing,
  .dossier-specs,
  .admin-strip,
  .dossier-footer {
    padding: 24px 20px;
  }

  .metrics-strip {
    grid-template-columns: 1fr;
  }

  .metric-cell {
    padding: 16px 20px;
    border-right: none;
    border-bottom: var(--hairline);
  }

  .metric-cell:last-child {
    border-bottom: none;
  }

  .dossier-body-grid {
    grid-template-columns: 1fr;
  }

  .dossier-briefing {
    border-right: none;
    border-bottom: var(--hairline);
  }

  .btn-register-action {
    width: 100%;
  }

  .footer-cta {
    width: 100%;
  }
}
</style>
