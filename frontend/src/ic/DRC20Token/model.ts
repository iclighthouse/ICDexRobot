import { Principal } from '@dfinity/principal';
export type Gas = { token: bigint } | { cycles: bigint } | { noFee: null };
export interface Metadata {
  content: string;
  name: string;
}
export interface TokenInfo {
  holderNumber: bigint;
  deployTime: bigint;
  metadata: Metadata;
  historySize: bigint;
  cycles: bigint;
  feeTo: Principal;
}
export type TxnResult =
  | {
      ok: Txid;
    }
  | TxnResultErr;
export type TxnResultErr = {
  err: {
    code:
      | { NonceError: null }
      | { InsufficientGas: null }
      | { InsufficientAllowance: null }
      | { UndefinedError: null }
      | { InsufficientBalance: null }
      | { LockedTransferExpired: null }
      | { NoLockedTransfer: null }
      | { DuplicateExecutedTransfer: null };
    message: string;
  };
};
export type Txid = Array<number>;
export type TxReceipt =
  | {
      Ok: bigint;
    }
  | {
      Err: TxReceiptErr;
    };
export type TxReceiptErr =
  | {
      InsufficientAllowance: null;
    }
  | {
      InsufficientBalance: null;
    }
  | {
      ErrorOperationStyle: null;
    }
  | {
      Unauthorized: null;
    }
  | {
      LedgerTrap: null;
    }
  | {
      ErrorTo: null;
    }
  | {
      Other: null;
    }
  | {
      BlockUsed: null;
    }
  | {
      AmountTooSmall: null;
    };
export interface Icrc1Account {
  owner: Principal;
  subaccount: Array<Array<number>>;
}
export interface TransferArgs {
  to: Icrc1Account;
  fee: Array<bigint>;
  memo: Array<Array<number>>;
  from_subaccount: Array<Array<number>>;
  created_at_time: Array<bigint>;
  amount: bigint;
}
export type AccountId = Array<number>;
export type _data = Array<Array<number>>;
export type IcrcReceipt = { Ok: bigint } | { Err: IcrcTransferError };
export type IcrcTransferError =
  | {
      GenericError: {
        message: string;
        error_code: bigint;
      };
    }
  | {
      TemporarilyUnavailable: null;
    }
  | {
      BadBurn: { min_burn_amount: bigint };
    }
  | {
      Duplicate: { duplicate_of: bigint };
    }
  | {
      BadFee: { expected_fee: bigint };
    }
  | {
      CreatedInFuture: null;
    }
  | {
      TooOld: { allowed_window_nanos: Duration };
    }
  | {
      InsufficientFunds: { balance: bigint };
    };
export type Duration = bigint;
export type IcrcMetadata = Array<[string, IcrcValue]>;
export type IcrcValue =
  | {
      Int: bigint;
    }
  | {
      Nat: bigint;
    }
  | {
      Blob: Array<number>;
    }
  | {
      Text: string;
    };
export interface SendICPTsRequest {
  to: string;
  amount: { e8s: bigint };
  memo: bigint;
  fee: { e8s: bigint };
  from_subaccount: number[][];
  created_at_time: Array<{ timestamp_nanos: bigint }>;
}
export interface NotifyCanisterRequest {
  to_canister: Principal;
  block_height: bigint;
  to_subaccount: number[][];
  from_subaccount: number[][];
  max_fee: { e8s: bigint };
}
export interface ApproveArgs {
  fee: Array<bigint>;
  memo: Array<Array<number>>;
  from_subaccount: Array<Array<number>>;
  created_at_time: Array<bigint>;
  amount: bigint;
  expected_allowance: Array<bigint>;
  expires_at: Array<bigint>;
  spender: Icrc1Account;
}
export type ApproveResponse =
  | {
      Ok: bigint;
    }
  | { Err: ApproveError };
export type ApproveError =
  | {
      GenericError: {
        message: string;
        error_code: bigint;
      };
    }
  | {
      TemporarilyUnavailable: null;
    }
  | {
      Duplicate: { duplicate_of: bigint };
    }
  | {
      BadFee: { expected_fee: bigint };
    }
  | {
      AllowanceChanged: { current_allowance: bigint };
    }
  | { CreatedInFuture: { ledger_time: bigint } }
  | { TooOld: null }
  | { Expired: { ledger_time: bigint } }
  | { InsufficientFunds: { balance: bigint } };
export interface AllowanceArgs {
  account: Icrc1Account;
  spender: Icrc1Account;
}
export interface Allowance {
  allowance: bigint;
  expires_at: Array<bigint>;
}
export default interface Service {
  drc20_decimals(): Promise<number>;
  decimals(): Promise<number>;
  drc20_gas(): Promise<Gas>;
  drc20_fee(): Promise<bigint>;
  drc20_metadata(): Promise<Array<Metadata>>;
  drc20_name(): Promise<string>;
  drc20_allowance(address: string, spender: string): Promise<bigint>;
  name(): Promise<string>;
  drc20_symbol(): Promise<string>;
  symbol(): Promise<string>;
  drc20_balanceOf(account: string): Promise<bigint>;
  balanceOf(account: Principal): Promise<bigint>;
  getMetadata(): Promise<TokenInfo>;
  drc20_approve(
    spender: string,
    amount: bigint,
    nonce: Array<bigint>,
    subAccount: Array<Array<number>>,
    data: _data
  ): Promise<TxnResult>;
  approve(spender: Principal, amount: bigint): Promise<TxReceipt>;
  transfer(principal: Principal, amount: bigint): Promise<TxReceipt>;
  getTokenFee(): Promise<bigint>;
  allowance(principal: Principal, principalSpender: Principal): Promise<bigint>;
  icrc1_transfer(transferArgs: TransferArgs): Promise<IcrcReceipt>;
  icrc1_metadata(): Promise<IcrcMetadata>;
  icrc1_decimals(): Promise<number>;
  icrc1_fee(): Promise<bigint>;
  icrc1_name(): Promise<string>;
  icrc1_symbol(): Promise<string>;
  icrc1_balance_of(to: Icrc1Account): Promise<bigint>;
  send_dfx(request: SendICPTsRequest): Promise<bigint>;
  icrc2_approve(approveArgs: ApproveArgs): Promise<ApproveResponse>;
  drc20_transfer(
    to: string,
    amount: bigint,
    nonce: Array<bigint>,
    subAccount: Array<Array<number>>,
    data: _data
  ): Promise<TxnResult>;
  icrc2_allowance(allowanceArgs: AllowanceArgs): Promise<Allowance>;
}
