<template>
  <div>
    <a-layout class="robot-layout">
      <a-layout-sider>
        <div style="height: 64px; background: #171b1f">
          <div class="base-font-normal header-title">Crypto Reaper</div>
        </div>
        <a-menu theme="dark" mode="inline" :default-selected-keys="['1']">
          <a-menu-item
            :class="{
              active: currentMenu === item.value
            }"
            v-for="item in menu"
            :key="item.value"
            @click="changeMenu(item)"
          >
            <span>{{ item.value }}</span>
          </a-menu-item>
        </a-menu>
      </a-layout-sider>
      <a-layout>
        <a-layout-header style="background: #171b1f; padding: 0 24px">
        </a-layout-header>
        <a-layout-content>
          <slot name="content"></slot>
        </a-layout-content>
      </a-layout>
    </a-layout>
  </div>
</template>
<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
@Component({
  name: 'AccountInfo',
  components: {}
})
export default class extends Vue {
  private menu = [];
  private currentMenu = 'Dashboard';
  created(): void {
    this.menu = [
      {
        value: 'Dashboard',
        path: '/dashboard'
      },
      {
        value: 'Exchanges',
        path: '/exchanges'
      }
      // ,
      // {
      //   value: 'Robot',
      //   path: '/robot'
      // },
      // {
      //   value: 'Arbitrage',
      //   path: '/arbitrage'
      // }
    ];
    this.currentMenu = this.$route.name;
  }
  private changeMenu(item): void {
    this.currentMenu = item.value;
    this.$router.push(item.path);
  }
}
</script>
<style scoped lang="scss">
.robot-layout {
  min-height: 100vh;
  ::v-deep .ant-layout-content {
    background: #000;
  }
  ::v-deep .ant-layout-sider {
    background: #000;
  }
  ::v-deep .ant-menu-dark {
    background: #000;
  }
  ::v-deep .ant-menu-dark li {
    height: 50px;
    line-height: 50px;
    color: #fff !important;
    background: #000;
    &.active,
    &:hover {
      background: #1b242e;
    }
  }
}
.header-title {
  line-height: 64px;
  font-size: 18px;
  padding-left: 24px;
}
</style>
