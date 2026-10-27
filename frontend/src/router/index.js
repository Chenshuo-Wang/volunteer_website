import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import RegisterView from '../views/RegisterView.vue'
import EventList from '../views/EventList.vue'
import EventDetail from '../views/EventDetail.vue'
import ShiftList from '../views/ShiftList.vue'
import ProfileView from '../views/ProfileView.vue'
import AdminView from '../views/AdminView.vue'
import { store } from '../store'

const routes = [
  // 访问根路径直接跳转到活动列表
  { path: '/', redirect: '/events' },
  { path: '/login', name: 'Login', component: LoginView, meta: { isFirstLevel: true } },
  { path: '/register', name: 'Register', component: RegisterView, meta: { isFirstLevel: false } },
  { path: '/events', name: 'EventList', component: EventList, meta: { isFirstLevel: true } },
  { path: '/events/:id', name: 'EventDetail', component: EventDetail, props: true, meta: { isFirstLevel: false } },
  { path: '/shifts', name: 'ShiftList', component: ShiftList, meta: { isFirstLevel: true } },
  {
    path: '/profile',
    name: 'Profile',
    component: ProfileView,
    meta: { requiresAuth: true, isFirstLevel: true }
  },
  {
    path: '/admin',
    name: 'Admin',
    component: AdminView,
    meta: { requiresAdmin: true, isFirstLevel: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

import {
  isTransitioning,
  startSlideToBlank,
  startSubPageFadeOut,
  finishSlideToTarget,
  resetTransition,
} from '../services/pageTransition';

router.beforeEach(async (to, from, next) => {
  // 1. 检查管理员权限
  if (to.meta.requiresAdmin) {
    if (!store.user?.isAdmin) {
      return next({ name: 'EventList' }); // 无管理员权限则跳转活动列表
    }
  }

  // 2. 检查普通用户登录权限
  if (to.meta.requiresAuth && !store.user) {
    return next({ name: 'Login' });
  }

  // 3. 正在过渡中则拦截所有连击请求，防止重复触发与中断动画
  if (isTransitioning.value) {
    return next(false);
  }

  // 4. 首次进入页面或同页面/同路径则直接进入，不执行过渡动画
  const isInitial = !from.name || from.matched.length === 0;
  const isSamePath = to.fullPath === from.fullPath || to.path === from.path;
  if (isInitial || isSamePath) {
    return next();
  }

  // 5. 区分一级页面切换（机能幕布动画）与二级页面切换（轻量淡入淡出动画）
  const isFirstLevelTransition = Boolean(from.meta?.isFirstLevel && to.meta?.isFirstLevel);

  try {
    if (isFirstLevelTransition) {
      await startSlideToBlank();
    } else {
      await startSubPageFadeOut();
    }
    next();
  } catch (err) {
    resetTransition();
    next();
  }
});

router.afterEach(async (to, from) => {
  const isInitial = !from.name || from.matched.length === 0;
  const isSamePath = to.fullPath === from.fullPath || to.path === from.path;
  if (isInitial || isSamePath) {
    return;
  }

  // 切换后视口滚动置顶
  window.scrollTo({ top: 0, behavior: 'instant' });

  if (!isTransitioning.value) {
    return;
  }

  try {
    // 新页面数据就绪后，执行对应的阶段三动画（幕布淡出 或 二级页面淡入）
    await finishSlideToTarget();
  } catch (err) {
    resetTransition();
  }
});

router.onError(() => {
  resetTransition();
});

export default router
