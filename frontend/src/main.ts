import Vue, { DirectiveOptions } from 'vue';
import App from './App.vue';
import router from './router';
import Antd from 'ant-design-vue';
import 'ant-design-vue/dist/antd.css';
import '@/styles/base.scss';
import '@/styles/style.css';
import '@/styles/common.scss';
import copyAccount from '@/components/common/copyAccount/Index.vue';
import VueClipboard from 'vue-clipboard2';
import * as directives from '@/directives';
import * as filters from '@/filters';
import http from '@/http/Index';

Vue.prototype.$axios = http;
// Register global filter functions
Object.keys(filters).forEach((key) => {
  Vue.filter(key, filters[key]);
});
// Register global directives
Object.keys(directives).forEach((key) => {
  Vue.directive(key, (directives as { [key: string]: DirectiveOptions })[key]);
});
Vue.use(VueClipboard);
Vue.use(Antd);
Vue.component('copyAccount', copyAccount);
// Vue.use(senCssMore);
Vue.config.productionTip = false;
router.beforeEach(async (to, from, next) => {
  if (to.meta.title) {
    document.title = to.meta.title;
  }
  next();
});
new Vue({
  router,
  render: (h) => h(App)
}).$mount('#app');
