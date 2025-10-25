import { createRouter, createWebHistory } from 'vue-router';
import EventList from '../views/EventList.vue';
import EventDetail from '../views/EventDetail.vue';
import PublishEvent from '../views/PublishEvent.vue'; 
// 1. 引入新组件
import AdminView from '../views/AdminView.vue';

const routes = [
  { path: '/', name: 'EventList', component: EventList },
  { path: '/event/:id', name: 'EventDetail', component: EventDetail },
  { path: '/publish', name: 'PublishEvent', component: PublishEvent },
  // 2. 添加新路由
  { path: '/admin', name: 'AdminView', component: AdminView }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;