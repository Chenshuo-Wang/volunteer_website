<template>
  <Navbar />
  <div class="main-content">
    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
  </div>
  <footer class="footer">
    <p>© 2026 校园志愿者服务平台 | 让爱心点亮校园</p>
  </footer>
</template>

<script setup>
import Navbar from './components/Navbar.vue';
</script>

<style scoped>
.main-content {
  flex: 1;
  padding: 20px 0;
}

.footer {
  text-align: center;
  padding: 20px;
  color: var(--text-muted);
  font-size: 0.9rem;
  margin-top: 40px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>