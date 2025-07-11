<template>
  <div>
    <a-select
      v-show="exchangeName === 'ICDex'"
      class="account-list-select"
      v-model="selectedPair.id"
      :disabled="selectedPairDisabled"
      show-search
      :filter-option="filterPair"
      style="width: 270px"
      :placeholder="`Search ${type} exchange pair`"
      notFoundContent="Not Found"
      @change="changePair"
    >
      <a-select-option v-for="pair in ICDexPairs" :key="pair[0].toString()">
        <span class="base-color-w">
          {{ pair[1].pair.token0[1] }}/{{ pair[1].pair.token1[1] }}
        </span>
      </a-select-option>
    </a-select>
    <a-select
      v-show="exchangeName === 'Binance'"
      class="account-list-select"
      v-model="selectedPair.id"
      :disabled="selectedPairDisabled"
      show-search
      :filter-option="false"
      @search="handleSearch"
      @popupScroll="handleScroll"
      :loading="loading"
      style="width: 270px"
      :placeholder="`Search ${type} exchange pair`"
      notFoundContent="Not Found"
      @change="changePair"
    >
      <a-select-option v-for="pair in displayedOptions" :key="pair.symbol">
        <span class="base-color-w">
          {{ pair.symbol }}
        </span>
      </a-select-option>
      <a-select-option v-if="hasMore" key="loading" disabled>
        <a-spin size="small" />
      </a-select-option>
    </a-select>
  </div>
</template>
<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import { PairsData } from '@/ic/ICSwapRouter/model';
import { BinanceSymbol, ExchangeInfo, ExchangeName } from '@/views/home/model';
import { PairInfo } from '@/ic/ICDex/model';
import { ICDexService } from '@/ic/ICDex/ICDexService';
@Component({
  name: 'selectExchangePair',
  components: {}
})
export default class extends Vue {
  @Prop({ type: String, default: '' })
  public type!: string;
  @Prop({ type: String, default: '' })
  public exchangeName!: string;
  @Prop({ type: Boolean, default: true })
  public selectedPairDisabled!: boolean;
  @Prop({ type: Array, default: () => [] })
  public ICDexPairs!: Array<PairsData>;
  @Prop({ type: Object, default: () => null })
  public binancePairs!: ExchangeInfo;
  private ICDexService: ICDexService;
  private ICDexPairInfo: { [key: string]: PairInfo } = {};
  private filteredData: Array<BinanceSymbol> = [];
  private displayedData: Array<BinanceSymbol> = [];
  private selectedPair = { id: undefined };
  private currentPage = 1;
  private pageSize = 100;
  private loading = false;
  private hasMore = false;
  get displayedOptions(): Array<BinanceSymbol> {
    return this.displayedData.slice(0, this.currentPage * this.pageSize);
  }
  created(): void {
    this.ICDexService = new ICDexService();
  }
  private initBinancePairs(): void {
    this.filteredData = [...this.binancePairs.symbols];
    this.updateDisplay();
  }
  private handleSearch(keyword: string): void {
    this.selectedPair.id = keyword;
    this.currentPage = 1;
    this.filteredData = this.binancePairs.symbols.filter((item) =>
      item.symbol.includes(this.selectedPair.id.toLocaleUpperCase())
    );
    this.updateDisplay();
  }
  private handleScroll({ target }): void {
    const { scrollTop, scrollHeight, clientHeight } = target;
    const reachBottom = scrollHeight - scrollTop <= clientHeight + 50;
    if (reachBottom && this.hasMore) {
      this.currentPage++;
      this.updateDisplay();
    }
  }
  private updateDisplay(): void {
    this.hasMore = this.filteredData.length > this.currentPage * this.pageSize;
    this.displayedData = this.filteredData;
  }
  private filterPair(input: string, option): boolean {
    return (
      option.componentOptions.children[0].children[0].text
        .toUpperCase()
        .indexOf(input.toUpperCase()) >= 0
    );
  }
  private async changePair(): Promise<void> {
    const pairInfo = await this.getPairInfo();
    this.$emit('changePair', this.selectedPair.id, pairInfo);
  }
  private async getPairInfo(): Promise<PairInfo | BinanceSymbol> {
    if (this.exchangeName === ExchangeName.ICDex) {
      if (this.ICDexPairInfo[this.selectedPair.id]) {
        return this.ICDexPairInfo[this.selectedPair.id];
      }
      const pairInfo = await this.ICDexService.info(this.selectedPair.id);
      this.$set(this.ICDexPairInfo, this.selectedPair.id, pairInfo);
      return pairInfo;
    } else if (this.exchangeName === ExchangeName.Binance) {
      return this.binancePairs.symbols.find((pair) => {
        return pair.symbol === this.selectedPair.id;
      });
    }
    return null;
  }
  public changeExchange(): void {
    this.selectedPair.id = undefined;
    this.$emit('changePair', undefined, null);
  }
}
</script>
<style scoped lang="scss"></style>
