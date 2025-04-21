<template>
  <div>
    <div class="mt20">
      <span class="add-label">{{ type }} exchange:</span>
      <a-select
        class="account-list-select"
        v-model="selectedExchange.id"
        :disabled="disabledSelectedExchange"
        style="width: 270px"
        :placeholder="`Select ${type} exchange`"
        notFoundContent="Not Found"
        @change="changeExchange"
      >
        <a-select-option
          class="account-select-option"
          v-for="item in exchanges"
          :key="item.id"
        >
          <span>{{ item.name }}</span>
        </a-select-option>
      </a-select>
    </div>
    <div class="mt20 flex-center">
      <span class="add-label">{{ type }} exchange pair:</span>
      <div class="flex-center">
        <select-exchange-pair
          v-show="ICDexPairs && binancePairs"
          ref="selectExchangePair"
          :type="type"
          :exchange-name="exchange[selectedExchange.id]"
          :ICDexPairs="ICDexPairs"
          :binance-pairs="binancePairs"
          :selectedPairDisabled="disabledSelectedExchange"
          @changePair="changePair"
        ></select-exchange-pair>
        <span
          class="ml10"
          v-show="
            type === 'Second' &&
            selectedExchange.id &&
            !twoPair &&
            !disabledSelectedExchange
          "
        ></span>
        <a-tooltip placement="top">
          <template slot="title">
            <span>Two second exchange pair</span>
          </template>
          <a-icon
            v-show="
              type === 'Second' &&
              selectedExchange.id &&
              !twoPair &&
              !disabledSelectedExchange
            "
            type="plus-circle"
            @click="morePair"
          />
        </a-tooltip>
        <a-select
          v-show="!selectedExchange.id"
          class="account-list-select"
          disabled
          style="width: 270px"
          :placeholder="`Search ${type} exchange pair`"
        >
        </a-select>
      </div>
    </div>
    <div class="flex-center second-two-pair">
      <select-exchange-pair
        v-show="ICDexPairs && binancePairs && twoPair"
        ref="selectExchangePairTwo"
        type="Second"
        :exchange-name="exchange[selectedExchange.id]"
        :ICDexPairs="ICDexPairs"
        :binance-pairs="binancePairs"
        :selectedPairDisabled="disabledSelectedExchange"
        @changePair="changePairTwo"
      ></select-exchange-pair>
      <span
        class="ml10"
        v-show="
          type === 'Second' &&
          selectedExchange.id &&
          twoPair &&
          !disabledSelectedExchange
        "
      ></span>
      <a-tooltip
        v-show="
          type === 'Second' &&
          selectedExchange.id &&
          twoPair &&
          !disabledSelectedExchange
        "
        placement="top"
      >
        <template slot="title">
          <span>One second exchange pair</span>
        </template>
        <a-icon type="minus-circle" @click="onePair" />
      </a-tooltip>
    </div>
    <a-checkbox
      v-show="!disabledSelectedExchange && type === 'Second' && !twoPair"
      :disabled="disabledSelectedExchange"
      v-model="invert"
      class="base-font-title invert-pair"
      @change="changeInvert"
    >
      Invert
    </a-checkbox>
    <div class="mt20 flex-center">
      <span class="add-label">{{ type }} exchange account:</span>
      <select-exchange-account
        ref="selectExchangeAccount"
        :type="type"
        :exchange-id="selectedExchange.id"
        :exchange-name="exchange[selectedExchange.id]"
        :selected-account-disabled="disabledSelectedExchange"
        :ICDexAccounts="ICDexAccounts"
        :binance-accounts="BinanceAccounts"
        @addExchangeAccountSuccess="addExchangeAccountSuccess"
        @changeAccount="changeAccount"
      ></select-exchange-account>
      <a-select
        v-show="!selectedExchange.id"
        class="account-list-select"
        disabled
        style="width: 270px"
        :placeholder="`Select ${type} exchange account`"
      >
      </a-select>
    </div>
    <div class="mt20 flex-center">
      <span class="add-label">{{ type }} exchange fee:</span>
      <select-exchange-account-fee
        :type="type"
        :exchange-name="exchange[selectedExchange.id]"
        :ICDexAccounts="ICDexAccounts"
        :binance-accounts="BinanceAccounts"
        ref="selectExchangeAccountFee"
        @changeExchangeAccountFee="changeExchangeAccountFee"
      ></select-exchange-account-fee>
    </div>
  </div>
</template>
<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import { PairsData } from '@/ic/ICSwapRouter/model';
import {
  Account,
  Exchange,
  ExchangeInfo,
  ExchangeName
} from '@/views/home/model';
import { ICSwapRouterFiduciaryService } from '@/ic/ICSwapRouter/ICSwapRouterFiduciaryService';
import selectExchangePair from '@/views/home/components/SelectExchangePair.vue';
import selectExchangeAccount from '@/views/home/components/SelectExchangeAccount.vue';
import selectExchangeAccountFee from '@/views/home/components/SelectExchangeAccountFee.vue';
@Component({
  name: 'SelectExchange',
  components: {
    selectExchangePair,
    selectExchangeAccount,
    selectExchangeAccountFee
  }
})
export default class extends Vue {
  @Prop({ type: String, default: '' })
  public type!: string;
  @Prop({ type: Array, default: () => [] })
  public exchanges!: Array<Exchange>;
  @Prop({ type: Object, default: () => null })
  public exchange!: { [key: number]: ExchangeName };
  @Prop({ type: Boolean, default: false })
  public disabledSelectedExchange!: boolean;
  @Prop({ type: Array, default: () => [] })
  public ICDexAccounts!: Array<Account>;
  @Prop({ type: Array, default: () => [] })
  public BinanceAccounts!: Array<Account>;
  private ICSwapRouterFiduciaryService: ICSwapRouterFiduciaryService;
  private selectedExchange = { id: undefined };
  private ICDexPairs: Array<PairsData> = [];
  private binancePairs: ExchangeInfo = null;
  private twoPair = false;
  private invert = false;
  created(): void {
    this.ICSwapRouterFiduciaryService = new ICSwapRouterFiduciaryService();
    this.getICDexPairs();
    this.getBinancePairs();
  }
  private init(pair: string, account: number, pairTwo?: string): void {
    this.$nextTick(() => {
      if (pair) {
        (this.$refs.selectExchangePair as any).selectedPair.id = pair;
        (this.$refs.selectExchangeAccount as any).selectedAccount.id = account;
        this.invert = false;
        if (pairTwo) {
          this.twoPair = true;
          this.$nextTick(() => {
            (this.$refs.selectExchangePairTwo as any).selectedPair.id = pairTwo;
          });
        } else {
          this.twoPair = false;
        }
      }
    });
  }
  private async getAccounts(): Promise<Array<Account>> {
    try {
      const res = await this.$axios.get('/getAccounts');
      if (res && res.status === 200) {
        const accounts: Array<Account> = res.data;
        this.ICDexAccounts = [];
        this.BinanceAccounts = [];
        accounts.forEach((account) => {
          if (this.exchange[account.exchangeId] === 'ICDex') {
            this.ICDexAccounts.push(account);
          } else if (this.exchange[account.exchangeId] === 'Binance') {
            this.BinanceAccounts.push(account);
          }
        });
      }
    } catch (e) {}
    return [];
  }
  private addExchangeAccountSuccess(): void {
    this.$emit('addExchangeAccountSuccess');
  }
  private morePair(): void {
    this.twoPair = true;
    this.invert = false;
    this.$emit('changeInvert', this.invert);
    this.$nextTick(() => {
      (this.$refs.selectExchangePairTwo as any).initBinancePairs();
    });
  }
  private onePair(): void {
    this.twoPair = false;
    this.invert = false;
    this.$emit('changePairTwo', null);
    this.$emit('changeInvert', this.invert);
    if (this.$refs.selectExchangePairTwo) {
      (this.$refs.selectExchangePairTwo as any).changeExchange();
    }
  }
  private changeInvert(): void {
    this.$emit('changeInvert', this.invert);
  }
  private async getBinancePairs(): Promise<void> {
    const res = await this.$axios.get('/getExchangeInfo');
    if (res && res.status === 200) {
      this.binancePairs = res.data;
      if (this.binancePairs && this.binancePairs.symbols) {
        this.$emit('getBinancePairs', this.binancePairs);
        this.$nextTick(() => {
          (this.$refs.selectExchangePair as any).initBinancePairs();
        });
      }
    }
  }
  private async getICDexPairs(): Promise<void> {
    const res = await this.ICSwapRouterFiduciaryService.getPairs(
      ['icdex'],
      [],
      []
    );
    if (res && res.data && res.data.length) {
      this.ICDexPairs = res.data
        .filter((item) => {
          return (
            !item[1].pair.token0[1].toLocaleLowerCase().includes('test') &&
            !item[1].pair.token1[1].toLocaleLowerCase().includes('test')
          );
        })
        .sort((a, b) => {
          return a[1].pair.token0[1].localeCompare(b[1].pair.token0[1]);
        });
    }
  }
  private changePair(pairId: string, pairInfo): void {
    this.$emit('changePair', pairId, pairInfo);
    (this.$refs.selectExchangeAccountFee as any).changePair(pairId, pairInfo);
  }
  private changeAccount(accountId: number): void {
    this.$emit('changeAccount', accountId);
    (this.$refs.selectExchangeAccountFee as any).changeAccount(accountId);
  }
  private changeExchangeAccountFee(fee: string): void {
    this.$emit('changeExchangeAccountFee', fee);
  }
  private changePairTwo(pairId: string, pairInfo): void {
    this.$emit('changePairTwo', pairId, pairInfo);
    (this.$refs.selectExchangeAccountFee as any).changePairTwo(
      pairId,
      pairInfo
    );
  }
  private changeExchange(): void {
    this.$emit('changeExchange', this.selectedExchange.id);
    this.twoPair = false;
    this.invert = false;
    this.$emit('changeInvert', this.invert);
    (this.$refs.selectExchangePair as any).changeExchange();
    (this.$refs.selectExchangeAccount as any).changeExchange();
    (this.$refs.selectExchangeAccountFee as any).changeExchange();
  }
  public initMainExchange(): void {
    this.selectedExchange.id = undefined;
    this.twoPair = false;
    this.invert = false;
    (this.$refs.selectExchangePair as any).changeExchange();
    (this.$refs.selectExchangeAccount as any).changeExchange();
    (this.$refs.selectExchangeAccountFee as any).changeExchange();
    this.$nextTick(() => {
      (this.$refs.selectExchangePair as any).initBinancePairs();
    });
  }
  public initSecondExchange(): void {
    this.selectedExchange.id = undefined;
    this.twoPair = false;
    this.invert = false;
    this.$emit('changeInvert', this.invert);
    if (this.$refs.selectExchangePairTwo) {
      (this.$refs.selectExchangePairTwo as any).changeExchange();
      this.$nextTick(() => {
        (this.$refs.selectExchangePairTwo as any).initBinancePairs();
      });
    }
    (this.$refs.selectExchangeAccount as any).changeExchange();
    (this.$refs.selectExchangeAccountFee as any).changeExchange();
  }
}
</script>
<style scoped lang="scss">
.ml10 {
  margin-left: 10px;
}
.second-two-pair {
  margin: 5px 0 0 210px;
}
.invert-pair {
  margin-left: 210px;
  margin-top: 5px;
  ::v-deep &.ant-checkbox-wrapper-disabled {
    span {
      color: #727a87;
    }
  }
}
</style>
