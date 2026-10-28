<template>
  <span class="swiss-status-badge" :class="statusClass">
    <span class="status-dot" aria-hidden="true"></span>
    <span class="status-text">{{ status }}</span>
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
.swiss-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 9px;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  border: 1px solid rgba(1, 32, 48, 0.14);
  background: var(--surface-white);
  color: var(--c-dark);
  line-height: 1.4;
}

.status-dot {
  width: 6px;
  height: 6px;
  background-color: var(--text-subtle);
  flex-shrink: 0;
}

.status-recruiting {
  border-color: rgba(69, 196, 176, 0.45);
  background: rgba(69, 196, 176, 0.08);
  color: var(--c-dark);
}

.status-recruiting .status-dot {
  background-color: var(--c-teal);
}

.status-active {
  background: var(--c-dark);
  color: #FFFFFF;
  border-color: var(--c-dark);
}

.status-active .status-dot {
  background-color: var(--c-teal);
}

.status-full {
  background: var(--surface-subtle);
  color: var(--text-muted);
}

.status-full .status-dot {
  background-color: var(--c-dark);
}

.status-closed,
.status-finished,
.status-default {
  background: transparent;
  color: var(--text-subtle);
  border-color: rgba(1, 32, 48, 0.1);
}

.status-closed .status-dot,
.status-finished .status-dot {
  background-color: var(--text-subtle);
}
</style>
