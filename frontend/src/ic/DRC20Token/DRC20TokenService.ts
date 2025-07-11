import { Principal } from '@dfinity/principal';
import Service, {
  _data,
  Allowance,
  AllowanceArgs,
  ApproveArgs,
  ApproveResponse,
  Gas,
  Icrc1Account,
  IcrcMetadata,
  IcrcReceipt,
  Metadata,
  SendICPTsRequest,
  TxnResult,
  TxReceipt
} from './model';
import DRC20IDL from './DRC20Token.did';
import { SerializableIC } from '@/ic/converter';
import { buildService } from '@/ic/Service';
import { Identity } from '@dfinity/agent';
export class DRC20TokenService {
  public decimals = async (canisterId: string): Promise<number> => {
    const service = buildService<Service>(null, DRC20IDL, canisterId);
    return await service.drc20_decimals();
  };
  public gas = async (canisterId: string): Promise<Gas> => {
    const service = buildService<Service>(null, DRC20IDL, canisterId);
    return await service.drc20_gas();
  };
  public fee = async (canisterId: string): Promise<bigint> => {
    const service = buildService<Service>(null, DRC20IDL, canisterId);
    return await service.drc20_fee();
  };
  public metadata = async (canisterId: string): Promise<Array<Metadata>> => {
    const service = buildService<Service>(null, DRC20IDL, canisterId);
    return await service.drc20_metadata();
  };
  public name = async (canisterId: string): Promise<string> => {
    const service = buildService<Service>(null, DRC20IDL, canisterId);
    return await service.drc20_name();
  };
  public tokenName = async (canisterId: string): Promise<string> => {
    const service = buildService<Service>(null, DRC20IDL, canisterId);
    return await service.name();
  };
  public symbol = async (canisterId: string): Promise<string> => {
    const service = buildService<Service>(null, DRC20IDL, canisterId);
    return await service.drc20_symbol();
  };
  public drc20_balanceOf = async (
    principal: string,
    canisterId: string
  ): Promise<bigint> => {
    const service = buildService<Service>(null, DRC20IDL, canisterId);
    return await service.drc20_balanceOf(principal);
  };
  public balanceOf = async (
    canisterId: string,
    account: Principal
  ): Promise<bigint> => {
    try {
      const service = buildService<Service>(null, DRC20IDL, canisterId);
      return await service.balanceOf(account);
    } catch (e) {
      return null;
    }
  };
  public drc20Approve = async (
    identity: Identity,
    amount: bigint,
    data: _data = [[]],
    spender: string,
    nonce: Array<bigint> = [],
    subAccountId = 0,
    canisterId: string
  ): Promise<TxnResult> => {
    const service = buildService<Service>(identity, DRC20IDL, canisterId);
    const res = await service.drc20_approve(spender, amount, nonce, [], data);
    return SerializableIC(res);
  };
  public approve = async (
    identity: Identity,
    canisterId: string,
    spender: Principal,
    amount: bigint
  ): Promise<TxReceipt> => {
    const service = buildService<Service>(identity, DRC20IDL, canisterId);
    const res = await service.approve(spender, amount);
    return SerializableIC(res);
  };
  public transfer = async (
    identity: Identity,
    canisterId: string,
    principal: Principal,
    amount: bigint
  ): Promise<TxReceipt> => {
    const service = buildService<Service>(identity, DRC20IDL, canisterId);
    const res = await service.transfer(principal, amount);
    return SerializableIC(res);
  };
  public getTokenFee = async (canisterId: string): Promise<bigint> => {
    const service = buildService<Service>(null, DRC20IDL, canisterId);
    return await service.getTokenFee();
  };
  public icrcDecimals = async (canisterId: string): Promise<number> => {
    const service = buildService<Service>(null, DRC20IDL, canisterId);
    return await service.icrc1_decimals();
  };
  public icrcName = async (canisterId: string): Promise<string> => {
    const service = buildService<Service>(null, DRC20IDL, canisterId);
    return await service.icrc1_name();
  };
  public icrcSymbol = async (canisterId: string): Promise<string> => {
    const service = buildService<Service>(null, DRC20IDL, canisterId);
    return await service.icrc1_symbol();
  };
  public icrcFee = async (canisterId: string): Promise<bigint> => {
    const service = buildService<Service>(null, DRC20IDL, canisterId);
    return await service.icrc1_fee();
  };
  public icrc1Metadata = async (canisterId: string): Promise<IcrcMetadata> => {
    const service = buildService<Service>(null, DRC20IDL, canisterId);
    return await service.icrc1_metadata();
  };
  public icrc1Transfer = async (
    identity: Identity,
    canisterId: string,
    amount: bigint,
    to: Icrc1Account,
    memo: Array<Array<number>> = [],
    fee: Array<bigint> = [],
    fromSubaccountId = 0,
    created_at_time = []
  ): Promise<IcrcReceipt> => {
    const service = buildService<Service>(identity, DRC20IDL, canisterId);
    const transferArgs = {
      to: to,
      fee: [],
      memo: memo,
      from_subaccount: [],
      created_at_time: created_at_time,
      amount: amount
    };
    const res = await service.icrc1_transfer(transferArgs);
    return SerializableIC(res);
  };
  public icrc1_balance_of = async (
    canisterId: string,
    to: Icrc1Account
  ): Promise<bigint> => {
    const service = buildService<Service>(null, DRC20IDL, canisterId);
    return await service.icrc1_balance_of(to);
  };
  public icpStandardTransfer = async (
    identity: Identity,
    canisterId: string,
    amount: bigint,
    fee: bigint,
    to: string,
    memo = BigInt('0'),
    subaccountId = 0
  ): Promise<bigint> => {
    try {
      const service = buildService<Service>(identity, DRC20IDL, canisterId);
      const request: SendICPTsRequest = {
        from_subaccount: [],
        to: to,
        amount: {
          e8s: amount
        },
        fee: {
          e8s: fee
        },
        memo: memo,
        created_at_time: []
      };
      return await service.send_dfx(request);
    } catch (e) {
      return null;
    }
  };
  public icrc2_approve = async (
    identity: Identity,
    canisterId: string,
    spender: Icrc1Account,
    amount: bigint,
    from_subaccount = []
  ): Promise<ApproveResponse> => {
    const service = buildService<Service>(identity, DRC20IDL, canisterId);
    const approveArgs: ApproveArgs = {
      fee: [],
      memo: [],
      from_subaccount: from_subaccount,
      created_at_time: [],
      amount: amount,
      expected_allowance: [],
      expires_at: [],
      spender: spender
    };
    try {
      return await service.icrc2_approve(approveArgs);
    } catch (e) {
      return null;
    }
  };
  public drc20_transfer = async (
    identity: Identity,
    to: string,
    amount: bigint,
    nonce: Array<bigint> = [],
    subAccountId: number,
    data: _data = [[]],
    canisterId: string
  ): Promise<TxnResult> => {
    const service = buildService<Service>(identity, DRC20IDL, canisterId);
    const res = await service.drc20_transfer(to, amount, nonce, [], data);
    return SerializableIC(res);
  };
  public drc20_allowance = async (
    identity: Identity,
    canisterId: string,
    address: string,
    spender: string
  ): Promise<bigint> => {
    const service = buildService<Service>(identity, DRC20IDL, canisterId);
    const res = await service.drc20_allowance(address, spender);
    return SerializableIC(res);
  };
  public icrc2_allowance = async (
    identity: Identity,
    canisterId,
    allowanceArgs: AllowanceArgs
  ): Promise<Allowance> => {
    const service = buildService<Service>(identity, DRC20IDL, canisterId);
    const res = await service.icrc2_allowance(allowanceArgs);
    return SerializableIC(res);
  };
}
