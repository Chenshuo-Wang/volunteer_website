import { createRouter, createWebHistory } from 'vue-router';
// 我们稍后会创建这个 EventDetail.vue 文件
import EventDetail from '../views/EventDetail.vue';

const routes = [
  {
    path: '/',
    // 暂时重定向到我们的详情页进行测试
    redirect: '/event/1'
  },
  {
    // :id 是一个动态参数，它可以匹配 /event/1, /event/2 等
    path: '/event/:id',
    name: 'EventDetail',
    component: EventDetail
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;