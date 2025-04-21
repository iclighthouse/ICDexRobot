<template>
  <div>
    <a-spin
      v-if="currentToken"
      class="global-spinning"
      type="loading"
      :spinning="spinning"
    >
      <a-modal
        v-model="visibleTransfer"
        centered
        :title="type + ' ' + currentToken.symbol"
        width="550px"
        :footer="null"
        :keyboard="false"
        :maskClosable="false"
        class="transfer-modal"
        :after-close="afterClose"
        :z-index="1400"
      >
        <a-form-model
          :model="transferForm"
          ref="transferForm"
          :rules="transferFormRules"
        >
          <a-form-model-item
            v-if="type === 'Transfer'"
            class="transfer-me-label"
            :colon="false"
            prop="to"
          >
            <template slot="label">
              <span>To:</span>
            </template>
            <a-input
              v-model="transferForm.to"
              autocomplete="off"
              :placeholder="placeholder"
            />
          </a-form-model-item>
          <a-form-model-item label="Amount" prop="amount">
            <a-input
              v-model="transferForm.amount"
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
              <p v-if="Number(fee) > 0">
                Fee: {{ fee }} {{ currentToken.symbol }}
              </p>
            </div>
            <div class="transfer-balance-right" @click="setMaxBalance">Max</div>
          </div>
          <a-form-model-item
            v-if="Object.keys(currentToken.tokenStd)[0] === 'drc20'"
            label="Data"
            prop="data"
          >
            <a-textarea
              v-model="transferForm.data"
              autocomplete="off"
              placeholder="Specifies hex format"
              :autoSize="{ minRows: 2 }"
            ></a-textarea>
          </a-form-model-item>
          <a-form-model-item>
            <button
              type="button"
              class="primary transfer-submit w100 large-primary"
              @click="transfer"
            >
              {{ type }}
            </button>
          </a-form-model-item>
        </a-form-model>
      </a-modal>
    </a-spin>
  </div>
</template>
<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import { Principal } from '@dfinity/principal';
import {
  ValidationRule,
  WrappedFormUtils
} from 'ant-design-vue/types/form/form';
import {
  validateCanister,
  validateCanisterOrAccount,
  validateData
} from '@/utils/validate';
import BigNumber from 'bignumber.js';
import { DRC20TokenService } from '@/ic/DRC20Token/DRC20TokenService';
import {
  hexToBytes,
  principalToAccountIdentifier,
  toPrincipalAndAccountId
} from '@/ic/converter';
import {
  ApproveError,
  IcrcTransferError,
  Txid,
  TxnResultErr
} from '@/ic/DRC20Token/model';
import { TokenInfo } from '@/views/home/model';
import { ICDexService } from '@/ic/ICDex/ICDexService';
import { Identity } from '@dfinity/agent';
@Component({
  name: 'Index',
  components: {}
})
export default class extends Vue {
  @Prop({ type: String, default: 'Transfer' })
  public type!: string;
  @Prop({ type: String, default: '' })
  public pairId!: string;
  @Prop({ type: Boolean, default: true })
  public isToken0!: boolean;
  @Prop()
  public identity!: Identity;
  private spinning = false;
  private currentToken: TokenInfo = null;
  private ICDexService: ICDexService;
  private DRC20TokenService: DRC20TokenService;
  public visibleTransfer = false;
  private fee = '0';
  private tokenFee = '0';
  private placeholder = 'Principal Or Account';
  private transferForm = {
    to: '',
    amount: '',
    data: ''
  };
  private transferFormRules = {
    to: [
      {
        required: true,
        message: 'Please enter Principal Or Account',
        trigger: 'blur'
      },
      { validator: validateCanisterOrAccount, trigger: 'blur' }
    ],
    amount: [
      { required: true, message: 'Please enter Amount', trigger: 'change' },
      { validator: this.validateAmount, trigger: 'change' }
    ],
    data: [{ validator: validateData, trigger: 'blur' }]
  };
  private validateAmount(
    rule: ValidationRule,
    value: number,
    callback: (arg0?: string) => void
  ): void {
    const min = Number(
      new BigNumber(this.currentToken.balance).minus(this.fee).minus(value)
    );
    if (value && min < 0) {
      callback(`Insufficient ${this.currentToken.symbol}`);
    } else {
      callback();
    }
  }
  public async init(token: TokenInfo): Promise<void> {
    this.currentToken = token;
    this.visibleTransfer = true;
    this.DRC20TokenService = new DRC20TokenService();
    this.ICDexService = new ICDexService();
    const std = Object.keys(token.tokenStd)[0];
    if (std === 'icrc1' || std === 'icrc2' || std === 'dip20') {
      this.placeholder = 'Principal';
      this.transferFormRules = {
        to: [
          {
            required: true,
            message: 'Please enter Principal',
            trigger: 'change'
          },
          { validator: validateCanister, trigger: 'change' }
        ],
        amount: [
          { required: true, message: 'Please enter Amount', trigger: 'change' },
          { validator: this.validateAmount, trigger: 'change' }
        ],
        data: [{ validator: validateData, trigger: 'blur' }]
      };
    } else {
      this.placeholder = 'Principal Or Account';
      this.transferFormRules = {
        to: [
          {
            required: true,
            message: 'Please enter Principal Or Account',
            trigger: 'blur'
          },
          { validator: validateCanisterOrAccount, trigger: 'blur' }
        ],
        amount: [
          { required: true, message: 'Please enter Amount', trigger: 'change' },
          { validator: this.validateAmount, trigger: 'change' }
        ],
        data: [{ validator: validateData, trigger: 'blur' }]
      };
    }
    this.getGas();
  }
  private async getGas(): Promise<void> {
    if (this.currentToken.fee || this.currentToken.fee.toString() === '0') {
      this.fee = this.currentToken.fee;
      this.tokenFee = this.currentToken.fee;
      const std = Object.keys(this.currentToken.tokenStd)[0];
      if ((std === 'drc20' || std === 'icrc2') && this.type === 'Deposit') {
        this.fee = new BigNumber(this.fee).times(3).toString(10);
      } else if (this.type === 'Deposit') {
        this.fee = new BigNumber(this.fee).times(2).toString(10);
      }
    }
  }
  private setMaxBalance(): void {
    let max = new BigNumber(this.currentToken.balance).minus(this.fee);
    if (new BigNumber(max).gt(0)) {
      this.transferForm.amount = max.toString(10);
    } else {
      this.transferForm.amount = '0';
    }
    (this.$refs.transferForm as any).validateField('amount');
  }
  private transfer(): void {
    (this.$refs.transferForm as Vue & { validate: any }).validate(
      async (valid: any) => {
        if (valid) {
          this.spinning = true;
          const std = Object.keys(this.currentToken.tokenStd)[0];
          try {
            let amount = BigInt(
              new BigNumber(10)
                .pow(this.currentToken.decimals.toString(10))
                .times(this.transferForm.amount.toString())
                .toString(10)
            );
            if (std === 'drc20') {
              let data = [];
              if (this.transferForm.data) {
                data = [
                  Array.from(Buffer.from(hexToBytes(this.transferForm.data)))
                ];
              }
              if (this.type === 'Deposit') {
                await this.onApprove(amount);
                this.onDeposit(amount);
              } else {
                const res = await this.DRC20TokenService.drc20_transfer(
                  this.identity,
                  this.transferForm.to,
                  amount,
                  [],
                  0,
                  data,
                  this.currentToken.canisterId.toString()
                );
                if (
                  (
                    res as {
                      ok: Txid;
                    }
                  ).ok
                ) {
                  if (this.type === 'Transfer') {
                    this.$message.success('Transfer Success');
                    this.visibleTransfer = false;
                  }
                } else {
                  this.$message.error((res as TxnResultErr).err.message);
                }
              }
            } else if (std === 'icrc1' || std === 'icrc2' || std === 'icp') {
              const principalAndAccountId = toPrincipalAndAccountId(
                this.transferForm.to
              );
              if (principalAndAccountId && principalAndAccountId.principal) {
                const to = {
                  owner: Principal.fromText(principalAndAccountId.principal),
                  subaccount: principalAndAccountId.subaccount
                    ? [hexToBytes(principalAndAccountId.subaccount)]
                    : []
                };
                if (this.type === 'Deposit') {
                  amount = BigInt(
                    new BigNumber(amount.toString(10))
                      .plus(
                        new BigNumber(this.tokenFee).times(
                          10 ** Number(this.currentToken.decimals)
                        )
                      )
                      .toString(10)
                  );
                }
                const res = await this.DRC20TokenService.icrc1Transfer(
                  this.identity,
                  this.currentToken.canisterId.toString(),
                  amount,
                  to,
                  [],
                  []
                );
                if (
                  (
                    res as {
                      Ok: bigint;
                    }
                  ).Ok
                ) {
                  if (this.type === 'Transfer') {
                    this.$message.success('Transfer Success');
                    this.visibleTransfer = false;
                  }
                  if (this.type === 'Deposit') {
                    let deposit = amount;
                    if (this.type === 'Deposit') {
                      deposit = BigInt(
                        new BigNumber(amount.toString(10))
                          .minus(
                            new BigNumber(this.tokenFee).times(
                              10 ** Number(this.currentToken.decimals)
                            )
                          )
                          .toString(10)
                      );
                    }
                    this.onDeposit(deposit);
                  }
                } else {
                  const err = (res as { Err: IcrcTransferError }).Err;
                  this.$message.error(
                    JSON.stringify(err, (key, value) =>
                      typeof value === 'bigint' ? value.toString(10) : value
                    )
                  );
                }
              }
            }
          } catch (e) {
            this.spinning = false;
            this.$message.error('Transfer fail');
          }
        }
      }
    );
  }
  private async onApprove(amount: bigint): Promise<void> {
    const allowance = await this.allowance();
    const needApprove = new BigNumber(amount.toString(10))
      .div(10 ** this.currentToken.decimals)
      .plus(this.currentToken.fee)
      .plus(this.currentToken.fee)
      .times(10 ** this.currentToken.decimals)
      .toString(10);
    // todo approve
    if (new BigNumber(allowance.toString(10)).lt(needApprove)) {
      const address = principalToAccountIdentifier(
        Principal.from(this.identity.getPrincipal().toString())
      );
      await this.approve(BigInt(needApprove), address);
    }
  }
  private async allowance(): Promise<bigint> {
    const tokenStd = Object.keys(this.currentToken.tokenStd)[0];
    const tokenId = this.currentToken.canisterId;
    const currentDrc20Token = new DRC20TokenService();
    if (this.identity) {
      const account = principalToAccountIdentifier(
        Principal.fromText(this.identity.getPrincipal().toString())
      );
      if (tokenStd === 'drc20') {
        return await currentDrc20Token.drc20_allowance(
          this.identity,
          tokenId,
          account,
          this.pairId
        );
      } else if (tokenStd === 'icrc2') {
        const res = await currentDrc20Token.icrc2_allowance(
          this.identity,
          tokenId,
          {
            account: {
              owner: Principal.fromText(
                this.identity.getPrincipal().toString()
              ),
              subaccount: []
            },
            spender: {
              owner: Principal.fromText(this.pairId),
              subaccount: []
            }
          }
        );
        return res.allowance;
      }
    }
  }
  private async approve(amount: bigint, address: string): Promise<boolean> {
    if (this.identity) {
      const currentAddress = principalToAccountIdentifier(
        this.identity.getPrincipal()
      );
      if (currentAddress !== address) {
        return false;
      }
    } else {
      return false;
    }
    const spender = Principal.fromText(this.pairId);
    const currentDrc20Token = new DRC20TokenService();
    const std = Object.keys(this.currentToken.tokenStd)[0];
    if (std === 'icrc2') {
      try {
        const res = await currentDrc20Token.icrc2_approve(
          this.identity,
          this.currentToken.canisterId,
          {
            owner: spender,
            subaccount: []
          },
          amount
        );
        if (
          (
            res as {
              Ok: bigint;
            }
          ).Ok
        ) {
          return true;
        } else {
          const err = Object.keys(
            (
              res as {
                Err: ApproveError;
              }
            ).Err
          )[0];
          this.$message.error(err);
          return false;
        }
      } catch (e) {
        return false;
      }
    } else {
      try {
        const res = await currentDrc20Token.drc20Approve(
          this.identity,
          amount,
          [],
          spender.toString(),
          [],
          0,
          this.currentToken.canisterId
        );
        if (
          (
            res as {
              ok: Txid;
            }
          ).ok
        ) {
          // this.tokenAllowance[currentPair[0].toString()][tokenId] = amount;
          return true;
        } else {
          this.$message.error((res as TxnResultErr).err.message);
          return false;
        }
      } catch (e) {
        return false;
      }
    }
  }
  private async onDeposit(amount: bigint): Promise<void> {
    let token;
    if (this.isToken0) {
      token = { token0: null };
    } else {
      token = { token1: null };
    }
    const address = principalToAccountIdentifier(this.identity.getPrincipal());
    const depositRes = await this.deposit(address, this.pairId, token, amount);
    if (depositRes === 'ErrAddress') {
      return;
    }
    if (depositRes === 'ErrDeposit') {
      return;
    }
    this.spinning = false;
    this.visibleTransfer = false;
    this.$message.success('Deposit Success');
  }
  private async deposit(
    address: string,
    pairId: string,
    token: { token0: null } | { token1: null },
    amount: bigint
  ): Promise<void | string> {
    if (this.identity) {
      const currentAddress = principalToAccountIdentifier(
        this.identity.getPrincipal()
      );
      if (currentAddress !== address) {
        return 'ErrAddress';
      }
    } else {
      return 'ErrAddress';
    }
    try {
      await this.ICDexService.deposit(this.identity, pairId, token, amount);
      this.$emit('DepositSuccess');
    } catch (e) {
      this.$message.error(e);
      return 'ErrDeposit';
    }
  }
  private afterClose(): void {
    (this.$refs.transferForm as Vue & WrappedFormUtils).resetFields();
  }
}
</script>
<style scoped lang="scss">
.transfer-submit {
  margin-top: 20px;
}
.transfer-balance-right {
  color: #1996c4;
}
.transfer-me-label {
  ::v-deep .ant-form-item-label {
    width: 100%;
  }
  ::v-deep label {
    display: flex;
    align-items: center;
  }
  .label-me-wallet {
    margin-left: auto;
    color: #1996c4;
    cursor: pointer;
  }
}
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
