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

.status-recruiting { background-color: #d1fae5; color: #065f46; } /* Green */
.status-full { background-color: #ffedd5; color: #9a3412; } /* Orange */
.status-closed { background-color: #fee2e2; color: #991b1b; } /* Red */
.status-active { background-color: #dbeafe; color: #1e40af; } /* Blue */
.status-finished { background-color: #f3f4f6; color: #4b5563; } /* Gray */
.status-default { background-color: #f3f4f6; color: #4b5563; }
</style>
