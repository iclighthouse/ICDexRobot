declare module '*.vue' {
  import Vue from 'vue';
  import { AxiosInstance } from 'axios';
  declare module 'vue/types/vue' {
    interface Vue {
      $setLoading: any;
      $axios: AxiosInstance;
    }
  }
  export default Vue;
}
