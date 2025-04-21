<template>
  <div>
    <a-spin class="global-spinning" type="loading" :spinning="spinning">
      <a-modal
        v-if="currentToken"
        v-model="visibleTransfer"
        centered
        :title="'Withdraw' + ' ' + currentToken.symbol"
        width="550px"
        :footer="null"
        :keyboard="false"
        :maskClosable="false"
        class="transfer-modal"
        :after-close="afterClose"
        :z-index="1400"
      >
        <a-form-model :model="form" ref="form" :rules="formRules">
          <a-form-model-item label="Amount" prop="amount">
            <a-input
              v-model="form.amount"
              autocomplete="off"
              type="text"
              v-only-float="currentToken.decimals"
              min="0"
              placeholder="0.00"
            />
          </a-form-model-item>
          <div class="transfer-balance">
            <div class="transfer-balance-left">
              <p>
                Balance: {{ currentToken.balance }} {{ currentToken.symbol }}
              </p>
              <p v-if="Number(currentToken.fee) > 0">
                Fee: {{ currentToken.fee }} {{ currentToken.symbol }}
              </p>
            </div>
            <div class="link margin-left-auto pointer" @click="setMaxBalance">
              Max
            </div>
          </div>
          <a-form-model-item>
            <button
              type="button"
              class="primary transfer-submit w100 large-primary mt20"
              @click="withdraw"
            >
              Withdraw
            </button>
          </a-form-model-item>
        </a-form-model>
      </a-modal>
    </a-spin>
  </div>
</template>
<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import {
  ValidationRule,
  WrappedFormUtils
} from 'ant-design-vue/types/form/form';
import BigNumber from 'bignumber.js';
import { DRC20TokenService } from '@/ic/DRC20Token/DRC20TokenService';
import { ICDexService } from '@/ic/ICDex/ICDexService';
import { TokenInfo } from '@/views/home/model';
import { Identity } from '@dfinity/agent';
@Component({
  name: 'Index',
  components: {}
})
export default class extends Vue {
  @Prop({ type: String, default: '' })
  public pairId!: string;
  @Prop()
  public identity!: Identity;
  private spinning = false;
  private DRC20TokenService: DRC20TokenService;
  private currentICDexService: ICDexService;
  private visibleTransfer = false;
  private isToken0 = true;
  private currentToken: TokenInfo = null;
  private form = {
    amount: ''
  };
  private formRules = {
    amount: [
      { required: true, message: 'Please enter Amount', trigger: 'change' },
      { validator: this.validateAmount, trigger: 'change' }
    ]
  };
  private validateAmount(
    rule: ValidationRule,
    value: number,
    callback: (arg0?: string) => void
  ): void {
    const min = Number(
      new BigNumber(this.currentToken.balance)
        .minus(this.currentToken.fee)
        .minus(value)
    );
    if (value && min < 0) {
      callback(`Insufficient ${this.currentToken.symbol}`);
    } else {
      callback();
    }
  }
  private withdraw(): void {
    (this.$refs.form as Vue & { validate: any }).validate(
      async (valid: any) => {
        if (valid) {
          this.spinning = true;
          const amount = new BigNumber(this.form.amount)
            .plus(this.currentToken.fee)
            .times(10 ** Number(this.currentToken.decimals))
            .toString(10);
          try {
            const res = await this.currentICDexService.withdraw(
              this.identity,
              this.pairId,
              this.isToken0 ? [BigInt(amount)] : [BigInt(0)],
              this.isToken0 ? [BigInt(0)] : [BigInt(amount)]
            );
            if (
              res &&
              res.length &&
              (Number(res[0]) !== 0 || Number(res[1]) !== 0)
            ) {
              this.$message.success('Success');
            } else {
              this.$message.error('Error');
            }
            this.visibleTransfer = false;
            this.$emit('withdrawSuccess', this.isToken0);
          } catch (e) {
            // this.$message.error(toHttpError(e).message);
          }
          this.spinning = false;
        }
      }
    );
  }
  public async init(token: TokenInfo, isToken0 = true): Promise<void> {
    this.currentToken = token;
    this.visibleTransfer = true;
    this.isToken0 = isToken0;
    this.DRC20TokenService = new DRC20TokenService();
    this.currentICDexService = new ICDexService();
  }
  private changeWithdrawToken(isToken0 = true): void {
    this.$emit('changeWithdrawToken', isToken0);
  }
  private setMaxBalance(): void {
    let max = new BigNumber(this.currentToken.balance).minus(
      this.currentToken.fee
    );
    if (new BigNumber(max).gt(0)) {
      this.form.amount = max.toString(10);
    } else {
      this.form.amount = '0';
    }
    (this.$refs.form as any).validateField('amount', () => {
      //
    });
  }
  private afterClose(): void {
    (this.$refs.form as Vue & WrappedFormUtils).resetFields();
  }
}
</script>
<style scoped lang="scss">
.withdraw-token-list {
  display: flex;
  align-items: center;
  font-size: 16px;
  margin: 50px 0 20px;
  li {
    margin-right: 20px;
    padding-bottom: 10px;
    cursor: pointer;
    color: #adb3c4;
    border-bottom: 1px solid transparent;
    &.active {
      border-color: #51b7c3;
    }
  }
}
</style>
