<template>
  <div id="app">
    <router-view class="app-main" />
  </div>
</template>
<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
@Component({
  name: 'App',
  components: {}
})
export default class extends Vue {}
</script>
<style scoped lang="scss">
#app {
  height: 100%;
  .app-main {
    min-height: 100%;
  }
}
</style>
