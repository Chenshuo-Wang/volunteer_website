<template>
  <span class="status-badge" :class="statusClass">
    {{ status }}
  </span>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  status: {
    type: String,
    required: true
  }
});

const statusClass = computed(() => {
  switch (props.status) {
    case '招募中': return 'status-recruiting';
    case '已满员': return 'status-full';
    case '报名截止': return 'status-closed';
    case '进行中': return 'status-active';
    case '已结束': return 'status-finished';
    default: return 'status-default';
  }
});
</script>

<style scoped>
.status-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 99px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.status-recruiting { background-color: #DAFDBA; color: #012030; border: 1px solid #45C4B0; }
.status-active { background-color: #45C4B0; color: #012030; }
.status-full { background-color: #9AEBA3; color: #012030; border: 1px solid rgba(19, 103, 138, 0.2); }
.status-closed { background-color: rgba(1, 32, 48, 0.08); color: #13678A; border: 1px solid rgba(19, 103, 138, 0.2); }
.status-finished { background-color: rgba(1, 32, 48, 0.08); color: #13678A; }
.status-default { background-color: rgba(1, 32, 48, 0.08); color: #13678A; }
</style>
