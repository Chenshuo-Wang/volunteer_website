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
  padding: 3px 8px;
  border-radius: 2px;
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  box-shadow: 1.5px 1.5px 0px #012030;
}

.status-recruiting { background-color: #DAFDBA; color: #012030; border: 1.5px solid #012030; }
.status-active { background-color: #45C4B0; color: #012030; border: 1.5px solid #012030; }
.status-full { background-color: #9AEBA3; color: #012030; border: 1.5px solid #012030; }
.status-closed { background-color: rgba(1, 32, 48, 0.08); color: #012030; border: 1.5px solid #012030; }
.status-finished { background-color: rgba(1, 32, 48, 0.08); color: #13678A; border: 1.5px solid #13678A; }
.status-default { background-color: rgba(1, 32, 48, 0.08); color: #13678A; border: 1.5px solid #13678A; }
</style>
