<template>
  <div>
    <a-input
      v-model="exchangeAccountFee"
      :disabled="!accountId"
      autocomplete="off"
      :placeholder="`${type} exchange fee`"
      style="width: 270px"
      suffix="%"
      @change="changeFee"
    >
    </a-input>
  </div>
</template>
<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import {
  Account,
  AccountInfo,
  BinanceSymbol,
  ExchangeName,
  RobotBinanceConfig
} from '@/views/home/model';
import { PairInfo } from '@/ic/ICDex/model';
import { ICDexService } from '@/ic/ICDex/ICDexService';
import BigNumber from 'bignumber.js';
@Component({
  name: 'SelectExchangeAccountFee',
  components: {}
})
export default class extends Vue {
  @Prop({ type: String, default: '' })
  public type!: ExchangeName;
  @Prop({ type: String, default: '' })
  public exchangeName!: string;
  @Prop({ type: Array, default: () => [] })
  public ICDexAccounts!: Array<Account>;
  @Prop({ type: Array, default: () => [] })
  public BinanceAccounts!: Array<Account>;
  private ICDexService: ICDexService;
  private accountId = 0;
  private pairId: string;
  private pairInfo: PairInfo | BinanceSymbol;
  private pairIdTwo: string;
  private pairInfoTwo: PairInfo | BinanceSymbol;
  private binanceAccountInfo: { [key: string]: AccountInfo } = {};
  private exchangeAccountFee = '';
  created(): void {
    this.ICDexService = new ICDexService();
  }
  public changeExchange(): void {
    this.accountId = 0;
    this.pairId = undefined;
    this.pairInfo = null;
    this.pairIdTwo = undefined;
    this.pairIdTwo = null;
    this.exchangeAccountFee = '';
    this.$emit('changeExchangeAccountFee', this.exchangeAccountFee);
  }
  private changeFee(): void {
    this.$emit('changeExchangeAccountFee', this.exchangeAccountFee);
  }
  private async getExchangeAccountFee(): Promise<void> {
    if (this.accountId && this.pairId && this.pairInfo) {
      if (this.exchangeName === ExchangeName.ICDex) {
        const fee = await this.getICDexFee();
        this.exchangeAccountFee = new BigNumber(fee).times(100).toString(10);
      } else if (this.exchangeName === ExchangeName.Binance) {
        const account = this.BinanceAccounts.find(
          (item) => item.id === this.accountId
        );
        if (account) {
          const res = JSON.parse(account.value) as RobotBinanceConfig;
          const accountInfo = await this.getBinanceTokenAmount(account.id, res);
          if (accountInfo && this.accountId && this.pairId && this.pairInfo) {
            this.exchangeAccountFee = new BigNumber(
              accountInfo.commissionRates.taker
            )
              .times(100)
              .toString(10);
          }
        }
      }
    }
    this.$emit('changeExchangeAccountFee', this.exchangeAccountFee);
  }
  private changePairTwo(
    pairId: string,
    pairInfo: PairInfo | BinanceSymbol
  ): void {
    this.pairIdTwo = pairId;
    this.pairInfoTwo = pairInfo;
    this.getExchangeAccountFee();
  }
  private changePair(pairId: string, pairInfo: PairInfo | BinanceSymbol): void {
    this.pairId = pairId;
    this.pairInfo = pairInfo;
    this.getExchangeAccountFee();
  }
  private changeAccount(accountId: number): void {
    this.accountId = accountId;
    this.getExchangeAccountFee();
  }
  private async getBinanceTokenAmount(
    accountId: number,
    binanceAccount: RobotBinanceConfig
  ): Promise<AccountInfo> {
    try {
      if (binanceAccount.APIKey && binanceAccount.privateKey) {
        if (this.binanceAccountInfo[binanceAccount.APIKey]) {
          return this.binanceAccountInfo[binanceAccount.APIKey];
        }
        const res = await this.$axios.get(`/getAccountInfo`, {
          params: {
            accountId: accountId
          }
        });
        if (res && res.status === 200) {
          this.$set(this.binanceAccountInfo, binanceAccount.APIKey, res.data);
          return this.binanceAccountInfo[binanceAccount.APIKey];
        }
      }
    } catch (e) {
      if (e.response && e.response.data && e.response.data.code) {
        if (e.response.data.code === 429 || e.response.data.code === 418) {
          this.$message.error(e.response.data.msg);
        }
      }
      return;
    }
  }
  private async getICDexFee(): Promise<string> {
    if (this.pairId && this.pairInfo) {
      const res = await this.ICDexService.info(this.pairId);
      if (res) {
        return new BigNumber(res.setting.TRADING_FEE.toString())
          .div(10 ** 6)
          .toString(10);
      }
    }
  }
}
</script>
<style scoped lang="scss"></style>
