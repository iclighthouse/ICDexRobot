<template>
  <div>
    <div class="base-bg">
      <account-info>
        <div slot="content" class="home-main">
          <router-view></router-view>
        </div>
      </account-info>
    </div>
  </div>
</template>
<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import AccountInfo from '@/views/home/components/AccountInfo.vue';
@Component({
  name: 'index',
  components: {
    AccountInfo
  }
})
export default class extends Vue {}
</script>
<style scoped lang="scss">
/*.home-main {
  min-height: 100vh;
  margin: 0 auto;
  padding-top: 64px;
}*/
</style>
