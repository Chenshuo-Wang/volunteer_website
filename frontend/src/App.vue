<template>
  <div id="app-container">
    <NoticeModal :show="showNotice" @close="handleNoticeClose" />

    <nav class="main-nav">
      <div class="nav-content">
        <router-link to="/" class="nav-logo">校园志愿者</router-link>

        <button class="hamburger-menu" @click="toggleMenu">
          <span></span>
          <span></span>
          <span></span>
        </button>

        <div class="nav-menu" :class="{ 'is-open': isMenuOpen }">
          <router-link to="/" class="nav-link" @click="closeMenu">活动列表</router-link>
          <router-link to="/publish" class="nav-link" @click="closeMenu">发布活动</router-link>
          <router-link to="/admin" class="nav-link" @click="closeMenu">管理后台</router-link>
        </div>
      </div>
    </nav>

    <main class="main-content">
      <div class="page-container">
        <router-view />
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import NoticeModal from './components/NoticeModal.vue';

const showNotice = ref(false);
// 新增：控制手机菜单的开关状态
const isMenuOpen = ref(false);

const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value;
};
// 新增：点击链接后自动关闭菜单
const closeMenu = () => {
  isMenuOpen.value = false;
};

onMounted(() => {
  if (!localStorage.getItem('volunteerNoticeShown')) {
    showNotice.value = true;
  }
});

const handleNoticeClose = () => {
  showNotice.value = false;
  localStorage.setItem('volunteerNoticeShown', 'true');
};
</script>

<style>
/* 全局样式不变 */
body { margin: 0; font-family: sans-serif; background-color: #f8f9fa; color: #212529; }
.page-container { max-width: 1000px; margin: 0 auto; padding: 20px; background-color: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
</style>

<style scoped>
/* --- 全新的、适配手机的导航栏样式 --- */
.main-nav {
  background-color: white;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}
.nav-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 64px;
  padding: 0 20px;
}
.nav-logo {
  font-weight: 700;
  font-size: 1.4em;
  color: #007bff;
  text-decoration: none;
  /* 防止 logo 被挤压换行 */
  white-space: nowrap;
}
.nav-link {
  color: #495057;
  text-decoration: none;
  padding: 10px 16px;
  border-radius: 8px;
  font-weight: 500;
  transition: background-color 0.2s, color 0.2s;
}
.nav-menu .nav-link:hover {
  background-color: #e9ecef;
}
.router-link-exact-active {
  background-color: #007bff;
  color: white !important;
}
.main-content {
  padding: 30px 20px;
}

/* 汉堡菜单按钮默认隐藏 */
.hamburger-menu {
  display: none;
  flex-direction: column;
  justify-content: space-around;
  width: 30px;
  height: 25px;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  z-index: 101;
}
.hamburger-menu span {
  width: 100%;
  height: 3px;
  background-color: #333;
  border-radius: 2px;
}

/* --- 响应式关键部分：当屏幕宽度小于768px时生效 --- */
@media (max-width: 768px) {
  .nav-menu {
    display: none; /* 默认隐藏菜单 */
    flex-direction: column;
    position: absolute;
    top: 64px;
    left: 0;
    width: 100%;
    background-color: white;
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  }
  .nav-menu.is-open {
    display: flex; /* 点击后显示菜单 */
  }
  .nav-menu .nav-link {
    text-align: center;
    padding: 15px;
    border-bottom: 1px solid #f1f1f1;
  }
  .hamburger-menu {
    display: flex; /* 在手机端显示汉堡按钮 */
  }
}
</style>