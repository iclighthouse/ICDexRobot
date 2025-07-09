<template>
  <div>
    <a-select
      v-show="exchangeName === 'ICDex'"
      ref="selectICDexAccount"
      class="account-list-select"
      v-model="selectedAccount.id"
      :disabled="selectedAccountDisabled"
      show-search
      style="width: 270px"
      :placeholder="`Select ${type} exchange account`"
      notFoundContent="Not Found"
      @change="changeAccount"
    >
      <a-select-option v-for="account in ICDexAccounts" :key="account.id">
        <span class="base-color-w">
          {{ account.name }} ({{
            account.value | filterICDexAccount | ellipsisAccount
          }})
        </span>
      </a-select-option>
      <div slot="dropdownRender" slot-scope="menu">
        <v-nodes :vnodes="menu" />
        <a-divider style="margin: 4px 0" />
        <div
          style="padding: 4px 8px; cursor: pointer"
          class="base-font-title"
          @mousedown="(e) => e.preventDefault()"
          @click="addAccount(type)"
        >
          <a-icon type="plus" /> Add {{ exchangeName }} account
        </div>
      </div>
    </a-select>
    <a-select
      v-show="exchangeName === 'Binance'"
      ref="selectBinanceAccount"
      class="account-list-select"
      v-model="selectedAccount.id"
      :disabled="selectedAccountDisabled"
      show-search
      style="width: 270px"
      :placeholder="`Select ${type} exchange account`"
      notFoundContent="Not Found"
      @change="changeAccount"
    >
      <a-select-option v-for="account in BinanceAccounts" :key="account.id">
        <span class="base-color-w">
          {{ account.name }} ({{
            account.value | filterBinanceAPIKey | ellipsisAccount
          }})
        </span>
      </a-select-option>
      <div slot="dropdownRender" slot-scope="menu">
        <v-nodes :vnodes="menu" />
        <a-divider style="margin: 4px 0" />
        <div
          style="padding: 4px 8px; cursor: pointer"
          class="base-font-title"
          @mousedown="(e) => e.preventDefault()"
          @click="addAccount(type)"
        >
          <a-icon type="plus" /> Add {{ exchangeName }} account
        </div>
      </div>
    </a-select>
    <add-exchange-account
      ref="addExchangeAccount"
      :add-exchange-id="exchangeId"
      :exchange-name="exchangeName"
      @addExchangeAccountSuccess="addExchangeAccountSuccess"
    ></add-exchange-account>
  </div>
</template>
<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import { Account, ExchangeName } from '@/views/home/model';
import { identityFromPem } from '@/ic/utils';
import addExchangeAccount from '@/views/home/components/AddExchangeAccount.vue';
@Component({
  name: 'SelectExchangeAccount',
  components: {
    addExchangeAccount,
    VNodes: {
      functional: true,
      render: (h, ctx) => ctx.props.vnodes
    }
  },
  filters: {
    filterICDexAccount(value: string): string {
      try {
        if (value) {
          const val = JSON.parse(value);
          const pem = val.pem;
          const identity = identityFromPem(pem);
          if (identity) {
            return identity.getPrincipal().toString();
          }
        }
      } catch (e) {
        //
      }
      return '-';
    },
    filterBinanceAPIKey(value: string): string {
      try {
        if (value) {
          const val = JSON.parse(value);
          return val.APIKey;
        }
      } catch (e) {
        //
      }
      return '-';
    }
  }
})
export default class extends Vue {
  @Prop({ type: String, default: '' })
  public type!: ExchangeName;
  @Prop({ type: Number, default: 1 })
  public exchangeId!: number;
  @Prop({ type: String, default: '' })
  public exchangeName!: string;
  @Prop({ type: Boolean, default: true })
  public selectedAccountDisabled!: boolean;
  @Prop({ type: Array, default: () => [] })
  public ICDexAccounts!: Array<Account>;
  @Prop({ type: Array, default: () => [] })
  public BinanceAccounts!: Array<Account>;
  private selectedAccount = { id: undefined };
  private addAccount(type: ExchangeName): void {
    if (type === ExchangeName.ICDex) {
      (this.$refs.selectICDexAccount as any).blur();
    } else if (type === ExchangeName.Binance) {
      (this.$refs.selectBinanceAccount as any).blur();
    }
    (this.$refs.addExchangeAccount as any).init();
  }
  private addExchangeAccountSuccess(): void {
    this.$emit('addExchangeAccountSuccess');
  }
  public changeExchange(): void {
    this.selectedAccount.id = undefined;
    this.$emit('changeAccount', this.selectedAccount.id);
  }
  private async changeAccount(): Promise<void> {
    this.$emit('changeAccount', this.selectedAccount.id);
  }
}
</script>
<style scoped lang="scss"></style>
