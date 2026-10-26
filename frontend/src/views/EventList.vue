<template>
  <div class="container">
    <header class="page-header">
      <h1>校园活动</h1>
      <p>发现更多有趣的志愿机会</p>
    </header>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>正在加载精彩活动...</p>
    </div>

    <div v-else-if="events.length > 0" class="event-grid">
      <router-link 
        v-for="event in events" 
        :key="event.id" 
        :to="{ name: 'EventDetail', params: { id: event.id } }"
        class="event-card-link"
      >
        <div class="glass-panel event-card">
          <div class="card-header">
            <StatusBadge :status="event.status" />
            <span class="hours-tag">
              <Clock :size="14" :stroke-width="2.5" class="icon-inline" /> {{ event.hoursValue }} 小时
            </span>
          </div>
          
          <h3>{{ event.title }}</h3>
          
          <div class="card-meta">
            <div class="meta-item"><MapPin :size="15" :stroke-width="2.3" class="icon-inline" /> {{ event.location }}</div>
            <div class="meta-item"><Clock :size="15" :stroke-width="2.3" class="icon-inline" /> {{ formatDate(event.startTime) }}</div>
            <div class="meta-item"><Users :size="15" :stroke-width="2.3" class="icon-inline" /> {{ event.currentVolunteers }} / {{ event.requiredVolunteers }} 人</div>
          </div>
        </div>
      </router-link>
    </div>

    <div v-else class="empty-state">
      <p>暂时没有活动，稍后再来看看吧！</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import apiClient from '../services/api';
import StatusBadge from '../components/StatusBadge.vue';
import { Clock, MapPin, Users } from '../components/icons';

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
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};
</script>

<style scoped>
.page-header {
  text-align: center;
  margin-bottom: 40px;
}

.page-header p {
  color: #13678A;
}

.event-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
}

.event-card-link {
  display: block;
  height: 100%;
}

.event-card {
  padding: 24px;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border: 2px solid #012030;
  border-radius: 2px;
  box-shadow: 4px 4px 0px #012030;
  transition: transform 0.15s, box-shadow 0.15s;
}

.event-card:hover {
  transform: translate(-2px, -2px);
  box-shadow: 7px 7px 0px #012030;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.hours-tag {
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 0.03em;
  color: #012030;
  background: #DAFDBA;
  border: 1.5px solid #012030;
  box-shadow: 1.5px 1.5px 0px #012030;
  padding: 4px 8px;
  border-radius: 2px;
}

h3 {
  font-size: 1.25rem;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: #012030;
  margin-bottom: 16px;
  line-height: 1.4;
  flex-grow: 1; /* Pushes meta to bottom */
}

.card-meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  color: #13678A;
}

.loading-state, .empty-state {
  text-align: center;
  padding: 60px;
  font-weight: 600;
  color: #13678A;
}

.spinner {
  border: 4px solid #13678A;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border-left-color: #45C4B0;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>