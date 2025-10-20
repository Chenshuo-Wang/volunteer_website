// frontend/src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    // ... 其他可能存在的路由
    
    // --- 在这里添加新路由 ---
    {
      path: '/event/:id', // :id 是一个动态参数，会匹配 /event/1, /event/2 等
      name: 'EventDetail',
      // 使用路由懒加载，优化性能
      component: () => import('../views/EventDetailView.vue')
    }
    // ----------------------
  ]
})

export default router