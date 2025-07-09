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
            <td>
              <a-checkbox
                :checked="checked.includes(exchange.id)"
                class="base-font-title"
                @change="onChange(exchange.id)"
              >
                {{ exchange.id }}
              </a-checkbox>
            </td>
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
                  @click="checkAccount(item)"
                >
                  Check
                </button>
                <!--robot running-->
                <button
                  :disabled="item.account.hasStrategy"
                  type="button"
                  class="primary"
                  @click="deleteAccount(item.account)"
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
  private checked: Array<number> = [];
  private exchangesTable: Array<ExchangeTable> = [];
  private checkedExchangesTable: Array<ExchangeTable> = [];
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
      this.checked = [];
      const res = await this.$axios.get('/getExchanges');
      if (res && res.status === 200) {
        this.exchanges = res.data;
        this.exchanges.forEach((item) => {
          this.checked.push(item.id);
        });
        this.initExchangesTable();
      }
    } catch (e) {}
  }
  private initExchangesTable(): void {
    const checkedExchangesTable: Array<ExchangeTable> = [];
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
            checkedExchangesTable.push(exchange);
          });
        }
        this.checkedExchangesTable = checkedExchangesTable.sort((a, b) => {
          return b.account.time - a.account.time;
        });
        this.exchangesTable = this.checkedExchangesTable.filter((item) =>
          this.checked.includes(item.id)
        );
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
    this.checkedExchangesTable = [];
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
  private onChange(id: number): void {
    if (this.checked.includes(id)) {
      this.checked = this.checked.filter((item) => item !== id);
    } else {
      this.checked.push(id);
    }
    this.exchangesTable = this.checkedExchangesTable.filter((item) =>
      this.checked.includes(item.id)
    );
  }
  private async checkAccount(item: ExchangeTable): Promise<void> {
    if (this.exchange[item.id]) {
      if (this.exchange[item.id] === 'ICDex') {
        if (item.account && item.account.value) {
          const val = JSON.parse(item.account.value);
          const pem = val.pem;
          console.log(pem);
          const flag = identityFromPem(pem);
          if (!flag) {
            this.$message.error('Invalid Account');
          } else {
            // setAccountAvailable
            const res = await this.$axios.post('setAccountAvailable', {
              accountId: item.account.id
            });
            if (res && res.status === 200) {
              this.$message.success('Account available');
              this.exchangesTable = [];
              this.checkedExchangesTable = [];
              this.initExchangesTable();
            } else {
              this.$message.error('Update error');
            }
          }
        }
      } else if (this.exchange[item.id] === 'Binance') {
        const val = JSON.parse(item.account.value);
        const APIKey = val.APIKey;
        const privateKey = val.privateKey;
        const testBinance = await this.tradeOfBinanceTest(APIKey, privateKey);
        console.log(testBinance);
        if (testBinance) {
          this.$message.error(testBinance);
          this.spinning = false;
          return;
        } else {
          const res = await this.$axios.post('setAccountAvailable', {
            accountId: item.account.id
          });
          if (res && res.status === 200) {
            this.$message.success('Account available');
            this.exchangesTable = [];
            this.checkedExchangesTable = [];
            this.initExchangesTable();
          } else {
            this.$message.error('Update error');
          }
        }
      }
    }
  }
  private async tradeOfBinanceTest(
    APIKey: string,
    privateKey: string
  ): Promise<string> {
    try {
      const res = await this.$axios.post('/tradeOfBinanceTest', {
        APIKey: APIKey,
        privateKey: privateKey,
        symbol: 'BTCUSDT',
        quantity: 1
      });
      if (res.data && res.data.code) {
        if (res.data.code === 5000) {
          return 'Please enable Spot & Margin Trading.';
        } else {
          const errMsg = res.data.msg;
          if (errMsg.includes('API-key')) {
            return res.data.msg;
          } else {
            return 'Invalid private key.';
          }
        }
      } else {
        return '';
      }
    } catch (e) {}
    return '';
  }
  private async deleteAccount(item: Account): Promise<void> {
    if (item.hasStrategy) {
      return;
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const that = this;
      this.$confirm({
        content: 'Are you sure you want to delete the account?',
        class: 'connect-plug message-info',
        centered: true,
        okText: 'Confirm',
        onOk() {
          that.spinning = false;
          that.$axios
            .post('deleteAccount', {
              accountId: item.id
            })
            .then((res) => {
              if (res && res.status === 200) {
                that.$message.success('Delete strategy success');
                that.exchangesTable = [];
                that.checkedExchangesTable = [];
                that.initExchangesTable();
              } else {
                that.$message.error('Error');
              }
            })
            .finally(() => {
              that.spinning = false;
            });
        }
      });
    } catch (e) {
      this.$message.error('Error');
    }
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
.change-exchange {
  ::v-deep &.ant-checkbox-wrapper-disabled {
    span {
      color: #adb3c4;
      padding-left: 0;
    }
  }
}
</style>
