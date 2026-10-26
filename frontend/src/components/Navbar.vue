<template>
  <header class="floating-nav-wrapper">
    <div class="nav-squircle" :class="{ 'menu-open': isMobileMenuOpen }">
      <!-- 品牌标题（已移除所有Logo） -->
      <div class="brand-container">
        <router-link to="/" class="brand-link" @click="closeMobileMenu">
          <span class="brand-title">志愿星火</span>
          <span class="brand-badge">Campus</span>
        </router-link>
      </div>

      <!-- 桌面端纯文本导航链接 -->
      <nav class="desktop-nav">
        <router-link to="/events" class="nav-link">
          <span>活动</span>
        </router-link>
        <router-link to="/shifts" class="nav-link">
          <span>周常</span>
        </router-link>
        
        <!-- 管理员入口 -->
        <router-link 
          v-if="store.user?.isAdmin" 
          to="/admin" 
          class="nav-link admin-nav-link"
        >
          <svg class="admin-icon" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z" clip-rule="evenodd" />
          </svg>
          <span>管理</span>
        </router-link>
      </nav>

      <!-- 右侧纯文本操作区 -->
      <div class="nav-actions">
        <!-- 桌面端用户账户信息：在竖屏/移动端下隐藏，只在展开菜单中显现 -->
        <template v-if="store.user">
          <router-link to="/profile" class="user-text-link" title="查看个人主页">
            <div class="user-avatar">{{ store.user.name ? store.user.name.charAt(0) : 'U' }}</div>
            <span class="user-name">{{ store.user.name }}</span>
            <span v-if="store.user.isAdmin" class="user-admin-badge">Admin</span>
          </router-link>
        </template>
        <template v-else>
          <router-link to="/login" class="nav-link login-text-link">登录</router-link>
        </template>

        <!-- 手机端折叠按钮（无边框纯净图标） -->
        <button 
          class="mobile-toggle-btn" 
          :class="{ 'is-open': isMobileMenuOpen }" 
          @click="toggleMobileMenu"
          aria-label="切换导航菜单"
        >
          <span class="bar bar-top"></span>
          <span class="bar bar-bottom"></span>
        </button>
      </div>
    </div>

    <!-- 手机端悬浮毛玻璃折叠面板 -->
    <transition name="mobile-card-slide">
      <div v-if="isMobileMenuOpen" class="mobile-dropdown-card">
        <div class="mobile-nav-section">
          <router-link to="/events" class="mobile-nav-item" @click="closeMobileMenu">
            <div class="mobile-item-left">
              <span class="mobile-icon">📅</span>
              <span class="mobile-title">校园活动</span>
            </div>
            <svg class="chevron-svg" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
            </svg>
          </router-link>

          <router-link to="/shifts" class="mobile-nav-item" @click="closeMobileMenu">
            <div class="mobile-item-left">
              <span class="mobile-icon">🗓️</span>
              <span class="mobile-title">周常岗位值日</span>
            </div>
            <svg class="chevron-svg" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
            </svg>
          </router-link>

          <router-link 
            v-if="store.user?.isAdmin" 
            to="/admin" 
            class="mobile-nav-item admin-item" 
            @click="closeMobileMenu"
          >
            <div class="mobile-item-left">
              <span class="mobile-icon">🛡️</span>
              <span class="mobile-title">管理员后台</span>
            </div>
            <svg class="chevron-svg" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
            </svg>
          </router-link>
        </div>

        <div class="mobile-action-section">
          <!-- 竖屏移动端下：用户账户在此处专属显现 -->
          <template v-if="store.user">
            <router-link to="/profile" class="mobile-profile-card" @click="closeMobileMenu">
              <div class="user-avatar-lg">{{ store.user.name ? store.user.name.charAt(0) : 'U' }}</div>
              <div class="mobile-user-details">
                <div class="mobile-user-name">{{ store.user.name }}</div>
                <div class="mobile-user-role">{{ store.user.isAdmin ? '系统管理员' : '志愿者学生' }} · 点击进入个人中心</div>
              </div>
              <svg class="chevron-svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
              </svg>
            </router-link>
          </template>
          <template v-else>
            <div class="mobile-auth-single">
              <router-link to="/login" class="mobile-login-pure-link" @click="closeMobileMenu">登录账号</router-link>
            </div>
          </template>
        </div>
      </div>
    </transition>
  </header>

  <!-- 占位垫高层：确保固定位置导航栏不被滚动影响，且不遮挡文档流起始内容 -->
  <div class="nav-fixed-placeholder" aria-hidden="true"></div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { store } from '../store';
import { useRouter, useRoute } from 'vue-router';

const router = useRouter();
const route = useRoute();
const isMobileMenuOpen = ref(false);

const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value;
};

const closeMobileMenu = () => {
  isMobileMenuOpen.value = false;
};

// 路由切换时自动关闭手机端展开菜单
watch(() => route.fullPath, () => {
  isMobileMenuOpen.value = false;
});
</script>

<style scoped>
/* 悬浮固定包裹层：采用 position: fixed 保持绝对固定位置，滚动屏幕时完全保持原地不动 */
.floating-nav-wrapper {
  position: fixed;
  top: 14px;
  left: 0;
  right: 0;
  width: 100%;
  z-index: 100;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 16px;
  box-sizing: border-box;
  pointer-events: none; /* 让外层透明间隙不遮挡下层页面交互 */
}

/* 占位垫高层：在文档流中占据等同导航栏的高度，避免固定导航栏遮挡页面首屏内容 */
.nav-fixed-placeholder {
  width: 100%;
  height: 74px;
  pointer-events: none;
  flex-shrink: 0;
}

/* 核心连续曲率圆角矩形导航栏 (Squircle) */
.nav-squircle {
  pointer-events: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  max-width: 1020px; /* 适度舒展的黄金比例宽度 */
  height: 56px;
  padding: 0 24px;
  border-radius: 16px; /* 连续曲率平滑圆角 */
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  border: 1px solid rgba(1, 32, 48, 0.08);
  box-shadow: 
    0 10px 30px -4px rgba(1, 32, 48, 0.06),
    0 2px 8px -2px rgba(1, 32, 48, 0.03);
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  box-sizing: border-box;
}

/* 品牌纯文本标题区（无 Logo） */
.brand-container {
  display: flex;
  align-items: center;
}

.brand-link {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  user-select: none;
  transition: opacity 0.15s ease;
}

.brand-link:hover {
  opacity: 0.82;
}

.brand-title {
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: -0.015em;
  color: #012030;
}

.brand-badge {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(19, 103, 138, 0.08);
  color: #13678A;
}

/* 桌面端纯文本导航链接：去除边框与背景，保持合理呼吸距离 */
.desktop-nav {
  display: flex;
  align-items: center;
  gap: 28px; /* 舒展通透的间距 */
}

.nav-link {
  font-size: 0.9rem; /* 14.4px 黄金文字大小 */
  font-weight: 500;
  color: #525866;
  text-decoration: none;
  padding: 6px 4px;
  border: none;
  background: transparent;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  transition: color 0.15s ease;
  position: relative;
}

.nav-link:hover {
  color: #012030;
}

/* 激活状态：文字加深加粗，底部配合微指示点 */
.nav-link.router-link-active {
  color: #012030;
  font-weight: 600;
}

.nav-link.router-link-active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 14px;
  height: 2px;
  background-color: #012030;
  border-radius: 1px;
}

.admin-icon {
  width: 15px;
  height: 15px;
  color: #13678A;
}

/* 右侧纯文本操作区 */
.nav-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

/* 桌面端用户状态纯文本项（去边框） */
.user-text-link {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  border: none;
  background: transparent;
  padding: 4px 2px;
  transition: opacity 0.15s ease;
}

.user-text-link:hover {
  opacity: 0.85;
}

.user-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #13678A;
  color: #ffffff;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  text-transform: uppercase;
}

.user-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: #012030;
  max-width: 100px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-admin-badge {
  font-size: 9px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 4px;
  background: #DAFDBA;
  color: #012030;
}

/* 登录纯文本链接（去边框） */
.login-text-link {
  font-size: 0.9rem;
  font-weight: 500;
  color: #525866;
}

.login-text-link:hover {
  color: #012030;
}

/* 手机端折叠按钮（去边框） */
.mobile-toggle-btn {
  display: none;
  width: 32px;
  height: 32px;
  padding: 6px;
  background: transparent;
  border: none;
  cursor: pointer;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 4px;
}

.bar {
  width: 18px;
  height: 1.5px;
  background-color: #012030;
  border-radius: 2px;
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.mobile-toggle-btn.is-open .bar-top {
  transform: translateY(2.75px) rotate(45deg);
}

.mobile-toggle-btn.is-open .bar-bottom {
  transform: translateY(-2.75px) rotate(-45deg);
}

/* 手机端折叠卡片（与外层连续曲率一致） */
.mobile-dropdown-card {
  pointer-events: auto;
  width: 100%;
  max-width: 1020px;
  margin-top: 8px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: saturate(180%) blur(24px);
  -webkit-backdrop-filter: saturate(180%) blur(24px);
  border: 1px solid rgba(1, 32, 48, 0.08);
  box-shadow: 
    0 16px 40px -6px rgba(1, 32, 48, 0.1),
    0 0 0 1px rgba(1, 32, 48, 0.04);
  padding: 14px 16px 16px;
  box-sizing: border-box;
}

.mobile-nav-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mobile-nav-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 12px;
  border-radius: 10px;
  text-decoration: none;
  color: #012030;
  border: none;
  background: transparent;
  transition: background-color 0.15s ease;
}

.mobile-nav-item:hover,
.mobile-nav-item.router-link-active {
  background: rgba(1, 32, 48, 0.04);
}

.mobile-item-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.mobile-icon {
  font-size: 1.05rem;
}

.mobile-title {
  font-size: 0.92rem;
  font-weight: 600;
}

.chevron-svg {
  width: 16px;
  height: 16px;
  color: #8c93a0;
}

.mobile-action-section {
  border-top: 1px solid rgba(1, 32, 48, 0.06);
  margin-top: 8px;
  padding-top: 12px;
}

/* 竖屏移动端专属：用户账户卡片 */
.mobile-profile-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  text-decoration: none;
  background: rgba(19, 103, 138, 0.04);
  transition: background-color 0.15s ease;
}

.mobile-profile-card:hover {
  background: rgba(19, 103, 138, 0.08);
}

.user-avatar-lg {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: #13678A;
  color: #ffffff;
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.mobile-user-details {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.mobile-user-name {
  font-size: 0.92rem;
  font-weight: 700;
  color: #012030;
}

.mobile-user-role {
  font-size: 0.76rem;
  color: #13678A;
}

.mobile-auth-single {
  display: flex;
  justify-content: center;
  padding: 6px 0;
}

.mobile-login-pure-link {
  font-size: 0.92rem;
  font-weight: 600;
  color: #012030;
  text-decoration: none;
  padding: 8px 16px;
}

/* 下拉菜单动画 */
.mobile-card-slide-enter-active,
.mobile-card-slide-leave-active {
  transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.mobile-card-slide-enter-from,
.mobile-card-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* 竖屏及移动端断点适配 */
@media (max-width: 768px), (orientation: portrait) and (max-width: 1024px) {
  .floating-nav-wrapper {
    top: 10px;
    padding: 0 12px;
  }

  .nav-fixed-placeholder {
    height: 64px;
  }

  .nav-squircle {
    height: 50px;
    padding: 0 16px;
    border-radius: 14px;
  }

  .desktop-nav {
    display: none;
  }

  .brand-badge {
    display: none;
  }

  /* 核心需求：在竖屏/移动端下完全隐藏主栏上的用户账户与登录入口，仅在展开菜单中显示 */
  .user-text-link {
    display: none !important;
  }

  .login-text-link {
    display: none !important;
  }

  .mobile-toggle-btn {
    display: flex;
  }
}
</style>
