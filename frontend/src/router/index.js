import { createRouter, createWebHistory } from 'vue-router';
import EventList from '../views/EventList.vue';
import EventDetail from '../views/EventDetail.vue';
// 1. 引入新组件
import PublishEvent from '../views/PublishEvent.vue'; 

const routes = [
  {
    path: '/',
    name: 'EventList',
    component: EventList
  },
  {
    path: '/event/:id',
    name: 'EventDetail',
    component: EventDetail
  },
  // 2. 添加新路由
  {
    path: '/publish',
    name: 'PublishEvent',
    component: PublishEvent
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;