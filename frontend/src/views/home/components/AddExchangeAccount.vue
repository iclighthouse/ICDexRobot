<template>
  <div>
    <a-modal
      v-model="visible"
      centered
      :title="title"
      width="550px"
      :footer="null"
      :keyboard="false"
      :maskClosable="false"
      class="add-robot-modal global-spinning"
      :after-close="afterClose"
      :z-index="9999"
    >
      <a-spin :spinning="spinningAddAccount">
        <div v-if="addExchangeId && exchangeName">
          <div v-show="exchangeName === 'ICDex'">
            <a-form-model
              :model="addICDexAccountForm"
              :rules="addICDexAccountFormRules"
              ref="addICDexAccountForm"
            >
              <a-form-model-item label="Account Name" prop="name">
                <a-input
                  v-model="addICDexAccountForm.name"
                  autocomplete="off"
                  placeholder="Enter account name"
                />
              </a-form-model-item>
              <a-form-model-item class="binance-form-item" :colon="false">
                <template slot="label">
                  <div class="ant-form-item-required">
                    <span>ICDex PEM file: </span>
                  </div>
                </template>
                <a-upload
                  class="upload-item w100"
                  accept="file"
                  :file-list="fileListICDex"
                  :before-upload="handleBeforeUploadICDex"
                  :on-remove="handleRemoveICDex"
                >
                  <button type="button" class="normal-upload-button w100">
                    <span v-if="!fileNameICDex"
                      ><a-icon type="upload" /> Click to Upload ICDex PEM
                      private key</span
                    >
                    <span v-else
                      >{{ fileNameICDex | ellipsisAccount(20) }}
                      <a-icon
                        type="close"
                        @click.stop="removeFileICDex"
                        style="margin-left: 5px; cursor: pointer"
                    /></span>
                  </button>
                </a-upload>
              </a-form-model-item>
              <a-form-model-item>
                <button
                  style="height: 36px"
                  class="primary w100 mt20"
                  type="button"
                  @click="addICDexAccount"
                >
                  Confirm
                </button>
              </a-form-model-item>
            </a-form-model>
          </div>
          <div v-show="exchangeName === 'Binance'">
            <a-form-model
              :model="addBinanceAccountForm"
              ref="addBinanceAccountForm"
              :rules="addBinanceAccountFormRules"
              style="align-items: flex-start"
            >
              <a-form-model-item label="Account Name" prop="name">
                <a-input
                  v-model="addBinanceAccountForm.name"
                  autocomplete="off"
                  placeholder="Enter account name"
                />
              </a-form-model-item>
              <a-form-model-item label="API Key" prop="APIKey">
                <a-input
                  v-model="addBinanceAccountForm.APIKey"
                  autocomplete="off"
                  placeholder="Enter your APIKey"
                />
              </a-form-model-item>
              <a-form-model-item class="binance-form-item" :colon="false">
                <template slot="label">
                  <div class="ant-form-item-required" style="text-align: left">
                    <span>RSA Private Key(PKCS#8): </span>
                    <div
                      style="margin-top: -10px; line-height: 26px"
                      class="link"
                    >
                      <a
                        href="https://www.binance.com/en/support/faq/how-to-generate-an-rsa-key-pair-to-send-api-requests-on-binance-2b79728f331e43079b27440d9d15c5db?hl=en"
                        rel="nofollow noreferrer noopener"
                        target="_blank"
                        >How to Generate an RSA Key Pair?</a
                      >
                      <span class="base-font-title">
                        (We only support RSA keys)</span
                      >
                    </div>
                  </div>
                </template>
                <a-upload
                  class="upload-item w100"
                  accept="file"
                  :file-list="fileList"
                  :before-upload="handleBeforeUpload"
                  :on-remove="handleRemove"
                >
                  <button type="button" class="normal-upload-button w100">
                    <span v-if="!fileName"
                      ><a-icon type="upload" /> Click to Upload RSA private
                      key</span
                    >
                    <span v-else
                      >{{ fileName | ellipsisAccount }}
                      <a-icon
                        type="close"
                        @click.stop="removeFile"
                        style="margin-left: 5px; cursor: pointer"
                    /></span>
                  </button>
                </a-upload>
                <div class="base-font-light" style="margin-top: 5px">
                  Enable Spot & Margin Trading
                </div>
              </a-form-model-item>
              <a-form-model-item>
                <button
                  style="height: 36px"
                  class="primary w100 mt20"
                  type="button"
                  @click="addBinanceAccount"
                >
                  Confirm
                </button>
              </a-form-model-item>
            </a-form-model>
          </div>
        </div>
      </a-spin>
    </a-modal>
  </div>
</template>
<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import { WrappedFormUtils } from 'ant-design-vue/types/form/form';
import { identityFromPem } from '@/ic/utils';
@Component({
  name: 'AddExchangeAccount',
  components: {}
})
export default class extends Vue {
  @Prop({ type: Number, default: 1 })
  public addExchangeId!: number;
  @Prop({ type: String, default: '' })
  public exchangeName!: string;
  private spinningAddAccount = false;
  private visible = false;
  private title = 'Add ICDex account';
  private addICDexAccountForm = {
    name: '',
    pem: ''
  };
  private addICDexAccountFormRules = {
    name: [
      {
        required: true,
        message: 'Please enter account name',
        trigger: ['blur', 'change']
      }
    ]
  };
  private fileListICDex = [];
  private fileNameICDex = '';
  private addBinanceAccountForm = {
    name: '',
    APIKey: '',
    privateKey: ''
  };
  private addBinanceAccountFormRules = {
    name: [
      {
        required: true,
        message: 'Please enter account name',
        trigger: ['blur', 'change']
      }
    ],
    APIKey: [
      {
        required: true,
        message: 'Please enter APIKey',
        trigger: ['blur', 'change']
      }
    ]
  };
  private fileList = [];
  private fileName = '';
  created(): void {
    //
  }
  public init(): void {
    this.$nextTick(() => {
      if (this.exchangeName === 'ICDex') {
        this.title = 'Add ICDex account';
      } else if (this.exchangeName === 'Binance') {
        this.title = 'Add Binance account';
      }
      this.visible = true;
    });
  }
  public addICDexAccount(): void {
    (this.$refs.addICDexAccountForm as Vue & { validate: any }).validate(
      async (valid: any) => {
        if (valid) {
          if (!this.addICDexAccountForm.pem) {
            this.$message.error('The ICDex PEM file is required.');
            return;
          }
          this.spinningAddAccount = true;
          try {
            const flag = identityFromPem(this.addICDexAccountForm.pem);
            if (!flag) {
              this.$message.error('Invalid PEM formatted');
            } else {
              const res = await this.$axios.post('/addExchangeAccount', {
                exchangeId: this.addExchangeId,
                name: this.addICDexAccountForm.name,
                value: JSON.stringify({
                  fileName: this.fileNameICDex,
                  pem: this.addICDexAccountForm.pem
                })
              });
              if (res && res.status === 200) {
                this.$emit('addExchangeAccountSuccess');
                this.$message.success('Add success');
                this.visible = false;
              }
            }
          } catch (e) {
            this.$message.error('Add error');
          }
          this.spinningAddAccount = false;
        }
      }
    );
  }
  private handleBeforeUploadICDex(file): boolean {
    if (this.fileListICDex.length >= 1) {
      this.fileListICDex = [];
    }
    this.fileNameICDex = file.name;
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result as string;
      this.addICDexAccountForm.pem = content.trim();
    };
    reader.readAsText(file, 'utf8');
    return false;
  }
  private handleRemoveICDex(file): void {
    this.fileListICDex = this.fileListICDex.filter(
      (item) => item.uid !== file.uid
    );
  }
  private removeFileICDex(): void {
    this.fileListICDex = [];
    this.fileNameICDex = '';
    this.addICDexAccountForm.pem = '';
  }
  private afterClose(): void {
    this.fileList = [];
    this.fileName = '';
    this.fileListICDex = [];
    this.fileNameICDex = '';
    (this.$refs.addICDexAccountForm as Vue & WrappedFormUtils).resetFields();
    (this.$refs.addBinanceAccountForm as Vue & WrappedFormUtils).resetFields();
  }
  public addBinanceAccount(): void {
    (this.$refs.addBinanceAccountForm as Vue & { validate: any }).validate(
      async (valid: any) => {
        if (valid) {
          const isValidRSAPrivateKey = this.isValidRSAPrivateKey(
            this.addBinanceAccountForm.privateKey
          );
          if (!isValidRSAPrivateKey) {
            this.$message.error(
              'RSA Private Key format is incorrect. Please refer to the instructions.'
            );
            this.spinningAddAccount = false;
            return;
          }
          this.spinningAddAccount = true;
          const testBinance = await this.tradeOfBinanceTest(
            this.addBinanceAccountForm.APIKey,
            this.addBinanceAccountForm.privateKey
          );
          if (testBinance) {
            this.$message.error(testBinance);
            this.spinningAddAccount = false;
            return;
          }
          try {
            const res = await this.$axios.post('/addExchangeAccount', {
              exchangeId: this.addExchangeId,
              name: this.addBinanceAccountForm.name,
              value: JSON.stringify({
                fileName: this.fileName,
                APIKey: this.addBinanceAccountForm.APIKey,
                privateKey: this.addBinanceAccountForm.privateKey
              })
            });
            if (res && res.status === 200) {
              this.$emit('addExchangeAccountSuccess');
              this.$message.success('Add success');
              this.visible = false;
            }
          } catch (e) {
            this.$message.error('Add error');
          }
          this.spinningAddAccount = false;
        }
      }
    );
  }
  private handleBeforeUpload(file): boolean {
    if (this.fileList.length >= 1) {
      this.fileList = [];
    }
    this.fileName = file.name;
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result as string;
      this.addBinanceAccountForm.privateKey = content.trim();
    };
    reader.readAsText(file, 'utf8');
    return false;
  }
  private handleRemove(file): void {
    this.fileList = this.fileList.filter((item) => item.uid !== file.uid);
  }
  private removeFile(): void {
    this.fileList = [];
    this.fileName = '';
    this.addBinanceAccountForm.privateKey = '';
  }
  private isValidRSAPrivateKey(privateKey): boolean {
    const pkcs8Regex =
      /^-----BEGIN PRIVATE KEY-----[\s\S]+-----END PRIVATE KEY-----$/;
    return pkcs8Regex.test(privateKey);
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
}
</script>
<style scoped lang="scss">
.add-robot-modal {
  ::v-deep .ant-upload.ant-upload-select {
    width: 100%;
  }
}
</style>
