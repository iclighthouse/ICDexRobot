<template>
  <a-tooltip :placement="placement">
    <template slot="title">
      <span>{{ account }}</span>
    </template>
    <div
      v-if="isCopy"
      class="copy-account-main"
      v-clipboard:copy="account"
      v-clipboard:success="onCopy"
      v-clipboard:error="onError"
    >
      {{ account | ellipsisAccount(front)
      }}<a-icon
        v-if="showCopy"
        type="copy"
        @click.stop.prevent
        v-clipboard:copy="account"
        v-clipboard:success="onCopy"
        v-clipboard:error="onError"
      />
    </div>
    <div class="copy-account-main" v-else>
      <a
        v-if="href"
        :href="href"
        rel="nofollow noreferrer noopener"
        target="_blank"
        >{{ account | ellipsisAccount(front) }}</a
      >
      <span v-else>{{ account | ellipsisAccount(front) }}</span
      ><a-icon
        v-if="showCopy"
        type="copy"
        @click.stop.prevent
        v-clipboard:copy="account"
        v-clipboard:success="onCopy"
        v-clipboard:error="onError"
      />
    </div>
  </a-tooltip>
</template>
<script lang="ts">
import { Component, Vue, Prop } from 'vue-property-decorator';
import { type } from 'os';
@Component({
  name: 'Index',
  components: {},
  filters: {
    ellipsisAccount(account: string, num = 4): string {
      if (account) {
        if (account.length > num + 4) {
          return account.slice(0, num) + '***' + account.slice(-4);
        } else {
          return account;
        }
      }
      return '';
    }
  }
})
export default class extends Vue {
  @Prop({ type: String, default: '' })
  public account!: string;
  @Prop({ type: String, default: 'Account ID' })
  public copyText!: string;
  @Prop({ type: Boolean, default: true })
  public showCopy!: boolean;
  @Prop({ type: Number, default: 4 })
  public front!: number;
  @Prop({ type: Boolean, default: true })
  public isCopy!: boolean;
  @Prop({ type: String, default: '' })
  public href!: string;
  @Prop({ type: String, default: 'top' })
  public placement!: string;
  private onCopy(): void {
    this.$message.success(`${this.copyText} Copied`);
  }
  private onError(): void {
    //
  }
}
</script>
<style scoped lang="scss">
.copy-account-main {
  display: flex;
  align-items: center;
  cursor: pointer;
}
i {
  margin-left: 5px;
  font-size: 12px;
  cursor: pointer;
  vertical-align: middle;
}
a {
  color: #1996c4 !important;
}
</style>
