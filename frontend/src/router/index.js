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
  { path: '/', redirect: '/events', meta: { isFirstLevel: true } },
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
  startInitialCurtain,
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

  // 3. 判断是否为初次加载（进入网站/刷新）及是否为同路径
  const isInitial = !from.name || from.matched.length === 0;
  const isSamePath = to.fullPath === from.fullPath || to.path === from.path;

  // 4. 非初次加载且处于过渡中时拦截连击，防止重复触发与中断动画
  if (!isInitial && isTransitioning.value) {
    return next(false);
  }

  // 5. 非初次加载且点击相同路径则直接放行，不重复施加动画
  if (!isInitial && isSamePath) {
    return next();
  }

  // 6. 只要目标是一级页面（无论是首次进入、刷新、二级切一级、还是一级互切），均施加机能幕布动画
  const isTargetFirstLevel = Boolean(to.meta?.isFirstLevel || to.path === '/' || to.path === '/events');

  try {
    if (isTargetFirstLevel) {
      if (isInitial) {
        // 初次进入网站或刷新一级页面：以全屏幕布起手，无旧画面模糊等待，避免白屏或无序闪烁
        startInitialCurtain();
      } else {
        // 常规切换进入一级页面（含二级返回一级、一级互切）：旧画面先延时模糊，再平滑切入幕布
        await startSlideToBlank();
      }
    } else {
      // 目标为二级页面（如活动详情/注册）：执行轻量级淡入淡出动画
      if (!isInitial) {
        await startSubPageFadeOut();
      }
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
  if (!isInitial && isSamePath) {
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
