<template>
  <div class="base-font-title exchange-main">
    <div class="base-font-normal flex-center">
      <div class="exchanges-title">Exchanges</div>
    </div>
    <a-spin class="table-spinning" :spinning="spinning">
      <table class="mt20">
        <thead>
          <tr>
            <th>Exchange Id</th>
            <th>Type</th>
            <th>Name</th>
            <th>Accounts</th>
            <th class="text-right pr20">Actions</th>
          </tr>
        </thead>
        <tbody class="lineHalf">
          <tr v-for="exchange in exchanges" :key="exchange.id">
            <td>{{ exchange.id }}</td>
            <td>{{ exchange.type }}</td>
            <td>{{ exchange.name }}</td>
            <td>
              <div>
                Available (<span v-if="exchangeStatus[exchange.id]">{{
                  exchangeStatus[exchange.id].Available
                }}</span
                ><span v-else>0</span>)
              </div>
              <div>
                Unavailable (<span
                  :class="{
                    'base-red': exchangeStatus[exchange.id].Unavailable > 0
                  }"
                  v-if="exchangeStatus[exchange.id]"
                  >{{ exchangeStatus[exchange.id].Unavailable }}</span
                ><span v-else>0</span>)
              </div>
            </td>
            <td align="right" class="pr20">
              <button
                type="button"
                class="primary"
                @click="addAccount(exchange.id)"
              >
                Add account
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </a-spin>
    <div class="base-font-normal flex-center mt20">
      <div class="exchanges-title">Accounts</div>
    </div>
    <a-spin class="table-spinning" :spinning="spinning">
      <table class="mt20">
        <thead>
          <tr>
            <th>Exchange Id</th>
            <th>Type</th>
            <th>Name</th>
            <th>Account</th>
            <th>Status</th>
            <th class="text-right pr20">Actions</th>
          </tr>
        </thead>
        <tbody class="lineHalf">
          <tr v-for="item in exchangesTable" :key="item.account.id">
            <td>{{ item.id }}</td>
            <td>{{ item.type }}</td>
            <td>{{ item.name }}</td>
            <td>
              <div v-if="item.account">
                <div>Name: {{ item.account.name }}</div>
                <div v-show="exchange[item.id] === 'ICDex'">
                  <div class="flex-center">
                    Account:&nbsp;
                    <copy-account
                      :account="filterICDexAccount(item.account.value)"
                    >
                    </copy-account>
                  </div>
                  <div>
                    Pem:
                    <span>
                      {{
                        item.account.value
                          | filterAccountName
                          | ellipsisAccount(20)
                      }}
                    </span>
                  </div>
                </div>
                <div v-show="exchange[item.id] === 'Binance'">
                  <div class="flex-center">
                    API Key:&nbsp;
                    <copy-account
                      :account="filterBinanceAPIKey(item.account.value)"
                      copy-text="API Key"
                    >
                    </copy-account>
                  </div>
                  <div>
                    RSA private key:
                    <span>
                      {{
                        item.account.value
                          | filterAccountName
                          | ellipsisAccount(20)
                      }}
                    </span>
                  </div>
                </div>
              </div>
              <div v-else>-</div>
            </td>
            <td>
              <span
                :class="{
                  'base-green': item.account.status === 'Available',
                  'base-red': item.account.status === 'Unavailable'
                }"
                >{{ item.account.status }}</span
              >
            </td>
            <td class="pr20">
              <div class="flex-center account-button">
                <button
                  :disabled="item.account.status === 'Available'"
                  type="button"
                  class="primary"
                >
                  Run
                </button>
                <!--robot running-->
                <button
                  :disabled="item.account.status === 'Available'"
                  type="button"
                  class="primary"
                >
                  Delete
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="!exchangesTable.length && !spinning">
            <td align="center" colspan="6">
              <div>No accounts</div>
            </td>
          </tr>
        </tbody>
      </table>
    </a-spin>
    <add-exchange-account
      ref="addExchangeAccount"
      :add-exchange-id="addExchangeId"
      :exchange-name="exchange[addExchangeId]"
      @addExchangeAccountSuccess="addExchangeAccountSuccess"
    ></add-exchange-account>
  </div>
</template>
<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import {
  Account,
  AccountStatus,
  Exchange,
  ExchangeName,
  ExchangeTable
} from '@/views/home/model';
import AddExchangeAccount from '@/views/home/components/AddExchangeAccount.vue';
import { identityFromPem } from '@/ic/utils';
@Component({
  name: 'index',
  components: {
    AddExchangeAccount
  },
  filters: {
    filterAccountName(value: string): string {
      try {
        if (value) {
          const val = JSON.parse(value);
          return val.fileName;
        }
      } catch (e) {
        //
      }
      return '-';
    }
  }
})
export default class extends Vue {
  private spinning = false;
  private exchanges: Array<Exchange> = [];
  private exchangesTable: Array<ExchangeTable> = [];
  private exchangeStatus: {
    [key: number]: { Available: number; Unavailable: number };
  } = {};
  private exchange: { [key: number]: ExchangeName } = {};
  private addExchangeId = 1;
  created(): void {
    this.getExchanges();
  }
  private async getExchanges(): Promise<void> {
    try {
      const res = await this.$axios.get('/getExchanges');
      if (res && res.status === 200) {
        this.exchanges = res.data;
        this.initExchangesTable();
      }
    } catch (e) {}
  }
  private initExchangesTable(): void {
    this.exchanges.forEach((item) => {
      let available = 0;
      let unavailable = 0;
      this.getExchangeAccounts(item.id).then((data) => {
        if (data && data.length) {
          data.forEach((account) => {
            if (account.status === AccountStatus.Available) {
              ++available;
            } else if (account.status === AccountStatus.Unavailable) {
              ++unavailable;
            }
            const exchange = { ...item, account: account };
            this.exchangesTable.push(exchange);
          });
        }
        this.$set(this.exchangeStatus, item.id, {
          Available: available,
          Unavailable: unavailable
        });
      });
      this.exchange[item.id] = item.name;
    });
  }
  private async getExchangeAccounts(
    exchangeId: number
  ): Promise<Array<Account>> {
    try {
      const res = await this.$axios.get(
        `/getExchangeAccounts?exchangeId=${exchangeId}`
      );
      if (res && res.status === 200) {
        return res.data;
      }
    } catch (e) {}
    return [];
  }
  private addAccount(id: number): void {
    this.addExchangeId = id;
    (this.$refs.addExchangeAccount as any).init();
  }
  private addExchangeAccountSuccess(): void {
    this.exchangesTable = [];
    this.initExchangesTable();
  }
  private filterBinanceAPIKey(value: string): string {
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
  private filterICDexAccount(value: string): string {
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
  }
}
</script>
<style scoped lang="scss">
.exchanges-title {
  font-size: 18px;
}
.pr20 {
  padding-right: 20px;
}
.account-button {
  justify-content: flex-end;
  button {
    width: 80px;
    &:first-child {
      margin-right: 10px;
    }
  }
}
</style>
