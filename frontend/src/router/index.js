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

router.beforeEach((to, from, next) => {
  // 1. 检查管理员权限
  if (to.meta.requiresAdmin) {
    if (!store.user?.isAdmin) {
      return next({ name: 'EventList' }); // 无管理员权限则跳转活动列表
    }
  }

  // 2. 检查普通用户登录权限
  if (to.meta.requiresAuth && !store.user) {
    next({ name: 'Login' });
  } else {
    next();
  }
});

export default router