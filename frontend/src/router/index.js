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
  { path: '/login', name: 'Login', component: LoginView },
  { path: '/register', name: 'Register', component: RegisterView },
  { path: '/events', name: 'EventList', component: EventList },
  { path: '/events/:id', name: 'EventDetail', component: EventDetail, props: true },
  { path: '/shifts', name: 'ShiftList', component: ShiftList },
  {
    path: '/profile',
    name: 'Profile',
    component: ProfileView,
    meta: { requiresAuth: true }
  },
  {
    path: '/admin',
    name: 'Admin',
    component: AdminView,
    meta: { requiresAdmin: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

import {
  isTransitioning,
  startSlideToBlank,
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

  // 3. 正在过渡中则拦截连击
  if (isTransitioning.value) {
    return next(false);
  }

  // 4. 首次进入页面或同路径则直接进入，不执行过渡动画
  const isInitial = !from.name || from.matched.length === 0;
  const isSamePath = to.fullPath === from.fullPath;
  if (isInitial || isSamePath) {
    return next();
  }

  try {
    // 第一阶段：原有页面向左划出到空白过渡页面
    await startSlideToBlank();
    next();
  } catch (err) {
    resetTransition();
    next();
  }
});

router.afterEach(async (to, from) => {
  const isInitial = !from.name || from.matched.length === 0;
  const isSamePath = to.fullPath === from.fullPath;
  if (isInitial || isSamePath) {
    return;
  }

  // 切换后视口滚动置顶
  window.scrollTo({ top: 0, behavior: 'instant' });

  try {
    // 第二阶段：加载完成后，过渡页面向左划出到目标页面
    await finishSlideToTarget();
  } catch (err) {
    resetTransition();
  }
});

router.onError(() => {
  resetTransition();
});

export default router