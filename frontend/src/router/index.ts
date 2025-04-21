import Vue from 'vue';
import VueRouter, { RouteConfig } from 'vue-router';
Vue.use(VueRouter);
const routes: Array<RouteConfig> = [
  {
    path: '',
    name: 'Home',
    component: () => import('@/views/home/index.vue'),
    meta: {
      title: 'ICLightHouse'
    },
    redirect: '/dashboard',
    children: [
      {
        path: '/dashboard',
        name: 'Dashboard',
        component: () => import('@/views/home/dashboard/Index.vue'),
        meta: {
          title: 'Dashboard'
        }
      },
      {
        path: '/exchanges',
        name: 'Exchanges',
        component: () => import('@/views/home/exchanges/Index.vue'),
        meta: {
          title: 'Exchanges'
        }
      }
    ]
  }
];
const originalPush = VueRouter.prototype.push;
VueRouter.prototype.push = function push(location: any) {
  return originalPush.call(this, location).catch((err) => err);
};
const router = new VueRouter({
  mode: 'hash',
  // base: '/',
  routes
});
export default router;
