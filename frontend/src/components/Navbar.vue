<template>
  <header class="swiss-nav-header" :class="{ 'is-navigating': isTransitioning }">
    <div class="swiss-nav-bar" :class="{ 'menu-open': isMobileMenuOpen, 'is-navigating': isTransitioning }">
      <div class="swiss-nav-inner">
        <!-- 左侧：瑞士排印品牌标识（与幕布完全呼应） -->
        <div class="brand-cell">
          <router-link to="/" class="brand-link" @click="closeMobileMenu">
            <span class="brand-wordmark">ANSHEN VOLUNTEER<span class="brand-dot">.</span></span>
            <span class="brand-edition">CAMPUS // 26</span>
          </router-link>
        </div>

        <!-- 中部：带索引编号的桌面端瑞士网格导航 -->
        <nav class="desktop-nav" aria-label="主导航">
          <router-link to="/events" class="nav-item">
            <span class="nav-index">01</span>
            <span class="nav-label">活动</span>
          </router-link>
          <router-link to="/shifts" class="nav-item">
            <span class="nav-index">02</span>
            <span class="nav-label">周常</span>
          </router-link>
          <router-link
            v-if="store.user?.isAdmin"
            to="/admin"
            class="nav-item admin-nav-item"
          >
            <span class="nav-index">03</span>
            <span class="nav-label">管理</span>
          </router-link>
        </nav>

        <!-- 右侧：身份档案入口与移动端开关 -->
        <div class="action-cell">
          <template v-if="store.user">
            <router-link to="/profile" class="user-dossier-link" title="进入志愿者个人档案">
              <span class="user-initial">{{ store.user.name ? store.user.name.charAt(0) : 'U' }}</span>
              <span class="user-name">{{ store.user.name }}</span>
              <span v-if="store.user.isAdmin" class="user-role-tag">ADMIN</span>
            </router-link>
          </template>
          <template v-else>
            <router-link to="/login" class="login-entry-link">
              <span class="login-prefix">PORTAL //</span>
              <span>登录</span>
            </router-link>
          </template>

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
    </div>

    <!-- 移动端：瑞士网格抽屉面板 -->
    <transition name="swiss-drawer-slide">
      <div v-if="isMobileMenuOpen" class="mobile-drawer" :class="{ 'is-navigating': isTransitioning }">
        <div class="mobile-nav-list">
          <router-link to="/events" class="mobile-row" @click="closeMobileMenu">
            <div class="mobile-row-left">
              <span class="mobile-idx">01 // DISPATCH</span>
              <span class="mobile-title">校园志愿活动</span>
            </div>
            <ChevronRight :size="16" :stroke-width="2" class="chevron-svg" />
          </router-link>

          <router-link to="/shifts" class="mobile-row" @click="closeMobileMenu">
            <div class="mobile-row-left">
              <span class="mobile-idx">02 // ROTATION</span>
              <span class="mobile-title">周常岗位值日</span>
            </div>
            <ChevronRight :size="16" :stroke-width="2" class="chevron-svg" />
          </router-link>

          <router-link
            v-if="store.user?.isAdmin"
            to="/admin"
            class="mobile-row"
            @click="closeMobileMenu"
          >
            <div class="mobile-row-left">
              <span class="mobile-idx">03 // CONSOLE</span>
              <span class="mobile-title">管理员系统后台</span>
            </div>
            <ChevronRight :size="16" :stroke-width="2" class="chevron-svg" />
          </router-link>
        </div>

        <div class="mobile-account-zone">
          <template v-if="store.user">
            <router-link to="/profile" class="mobile-user-row" @click="closeMobileMenu">
              <div class="mobile-user-left">
                <div class="mobile-avatar-sq">{{ store.user.name ? store.user.name.charAt(0) : 'U' }}</div>
                <div class="mobile-user-meta">
                  <div class="mobile-user-name">{{ store.user.name }}</div>
                  <div class="mobile-user-sub">{{ store.user.isAdmin ? 'SYSTEM ADMIN · 查看档案' : 'VOLUNTEER · 查看个人档案' }}</div>
                </div>
              </div>
              <ChevronRight :size="16" :stroke-width="2" class="chevron-svg" />
            </router-link>
          </template>
          <template v-else>
            <router-link to="/login" class="mobile-login-btn" @click="closeMobileMenu">
              <span>ACCESS PORTAL // 立即登录</span>
            </router-link>
          </template>
        </div>
      </div>
    </transition>
  </header>

  <!-- 顶部导航高度占位 -->
  <div class="nav-fixed-placeholder" aria-hidden="true"></div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { store } from '../store';
import { useRoute } from 'vue-router';
import { ChevronRight } from './icons';
import { isTransitioning } from '../services/pageTransition';

const route = useRoute();
const isMobileMenuOpen = ref(false);

const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value;
};

const closeMobileMenu = () => {
  isMobileMenuOpen.value = false;
};

watch(() => route.fullPath, () => {
  isMobileMenuOpen.value = false;
});
</script>

<style scoped>
.swiss-nav-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  width: 100%;
  z-index: 100;
}

.nav-fixed-placeholder {
  width: 100%;
  height: 64px;
  flex-shrink: 0;
}

/* 过渡期间彻底锁定导航栏交互 */
.swiss-nav-header.is-navigating,
.swiss-nav-bar.is-navigating,
.mobile-drawer.is-navigating {
  pointer-events: none !important;
  cursor: default !important;
  user-select: none !important;
}

.swiss-nav-bar {
  width: 100%;
  height: 64px;
  background: rgba(247, 248, 249, 0.9);
  backdrop-filter: saturate(180%) blur(16px);
  -webkit-backdrop-filter: saturate(180%) blur(16px);
  border-bottom: var(--hairline);
}

.swiss-nav-inner {
  max-width: 1180px;
  height: 100%;
  margin: 0 auto;
  padding: 0 clamp(20px, 4vw, 48px);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* 左侧品牌区 */
.brand-cell {
  display: flex;
  align-items: center;
}

.brand-link {
  display: inline-flex;
  align-items: baseline;
  gap: 12px;
  text-decoration: none;
  user-select: none;
}

.brand-wordmark {
  font-size: 0.98rem;
  font-weight: 900;
  letter-spacing: -0.03em;
  color: var(--c-dark);
  text-transform: uppercase;
}

.brand-dot {
  color: var(--c-teal);
  margin-left: 1px;
}

.brand-edition {
  font-family: var(--font-mono);
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: var(--text-subtle);
}

/* 中部桌面导航 */
.desktop-nav {
  display: flex;
  align-items: stretch;
  height: 100%;
  gap: 36px;
}

.nav-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 100%;
  position: relative;
  text-decoration: none;
  color: var(--text-muted);
  transition: color var(--transition-fast);
}

.nav-index {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: var(--text-subtle);
  transition: color var(--transition-fast);
}

.nav-label {
  font-size: 0.88rem;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.nav-item:hover {
  color: var(--c-dark);
}

.nav-item:hover .nav-index {
  color: var(--c-teal);
}

.nav-item.router-link-active {
  color: var(--c-dark);
}

.nav-item.router-link-active .nav-index {
  color: var(--c-dark);
  font-weight: 700;
}

.nav-item.router-link-active .nav-label {
  font-weight: 800;
}

.nav-item.router-link-active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 2px;
  background-color: var(--c-teal);
}

/* 右侧用户与登录入口 */
.action-cell {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-dossier-link {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 6px 0;
  text-decoration: none;
  transition: opacity var(--transition-fast);
}

.user-dossier-link:hover {
  opacity: 0.75;
}

.user-initial {
  width: 24px;
  height: 24px;
  background: var(--c-dark);
  color: #FFFFFF;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.user-name {
  font-size: 0.86rem;
  font-weight: 700;
  color: var(--c-dark);
  max-width: 110px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-role-tag {
  font-family: var(--font-mono);
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  padding: 2px 6px;
  background: var(--surface-subtle);
  border: var(--hairline);
  color: var(--c-dark);
}

.login-entry-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.86rem;
  font-weight: 700;
  color: var(--c-dark);
  padding: 6px 12px;
  border: var(--hairline-strong);
  transition: background-color var(--transition-fast), color var(--transition-fast);
}

.login-prefix {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--text-subtle);
  font-weight: 500;
}

.login-entry-link:hover {
  background: var(--c-dark);
  color: #FFFFFF;
}

.login-entry-link:hover .login-prefix {
  color: var(--c-teal);
}

/* 手机端折叠按钮 */
.mobile-toggle-btn {
  display: none;
  width: 34px;
  height: 34px;
  padding: 6px;
  background: transparent;
  border: none;
  cursor: pointer;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 5px;
}

.bar {
  width: 20px;
  height: 1.5px;
  background-color: var(--c-dark);
  transition: transform 0.2s ease;
}

.mobile-toggle-btn.is-open .bar-top {
  transform: translateY(3.25px) rotate(45deg);
}

.mobile-toggle-btn.is-open .bar-bottom {
  transform: translateY(-3.25px) rotate(-45deg);
}

/* 手机端瑞士抽屉面板 */
.mobile-drawer {
  width: 100%;
  background: var(--surface-white);
  border-bottom: var(--rule-heavy);
}

.mobile-nav-list {
  display: flex;
  flex-direction: column;
}

.mobile-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: var(--hairline);
  text-decoration: none;
  color: var(--c-dark);
  transition: background-color var(--transition-fast);
}

.mobile-row.router-link-active {
  background: var(--surface-subtle);
  border-left: 3px solid var(--c-teal);
}

.mobile-row-left {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.mobile-idx {
  font-family: var(--font-mono);
  font-size: 0.68rem;
  letter-spacing: 0.1em;
  color: var(--text-subtle);
}

.mobile-title {
  font-size: 0.98rem;
  font-weight: 800;
  color: var(--c-dark);
}

.chevron-svg {
  color: var(--text-subtle);
}

.mobile-account-zone {
  padding: 16px 20px;
  background: var(--bg-color);
}

.mobile-user-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  text-decoration: none;
}

.mobile-user-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.mobile-avatar-sq {
  width: 36px;
  height: 36px;
  background: var(--c-dark);
  color: #FFFFFF;
  font-family: var(--font-mono);
  font-size: 0.85rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mobile-user-name {
  font-size: 0.92rem;
  font-weight: 800;
  color: var(--c-dark);
}

.mobile-user-sub {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  letter-spacing: 0.06em;
  color: var(--text-muted);
}

.mobile-login-btn {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  padding: 12px;
  background: var(--c-dark);
  color: #FFFFFF;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.swiss-drawer-slide-enter-active,
.swiss-drawer-slide-leave-active {
  transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.swiss-drawer-slide-enter-from,
.swiss-drawer-slide-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

@media (max-width: 768px), (orientation: portrait) and (max-width: 1024px) {
  .swiss-nav-bar,
  .nav-fixed-placeholder {
    height: 56px;
  }

  .desktop-nav,
  .brand-edition,
  .user-dossier-link,
  .login-entry-link {
    display: none !important;
  }

  .mobile-toggle-btn {
    display: flex;
  }
}
</style>
