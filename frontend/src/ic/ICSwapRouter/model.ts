import { Principal } from '@dfinity/principal';
export type DexName = string;
export interface TrieList {
  total: bigint;
  totalPage: bigint;
  data: Array<PairsData>;
}
export type PairsData = [PairCanisterId, TradingPair];
export type PairCanisterId = Principal;
export interface TradingPair {
  startingOverG1: [bigint];
  updatedTime: bigint;
  score1: bigint;
  score2: bigint;
  score3: bigint;
  pair: PairInfo;
  startingBelowG2: [bigint];
  startingBelowG4: [bigint];
  createdTime: bigint;
  marketBoard: MarketBoard;
}
export interface PairInfo {
  feeRate: string;
  token0: TokenInfo;
  token1: TokenInfo;
  dexName: DexName;
  canisterId: Principal;
}
export type TokenInfo = [Principal, string, TokenStd];
export type TokenStd =
  | { dft: null }
  | { icp: null }
  | { other: null }
  | { cycles: null }
  | { dip20: null }
  | { drc20: null }
  | { icrc1: null }
  | { icrc2: null };
export type MarketBoard =
  | {
      STAGE0: null;
    }
  | {
      STAGE1: null;
    }
  | {
      STAGE2: null;
    };
export default interface Service {
  getPairs(
    dexName: Array<DexName>,
    page: Array<number>,
    size: Array<number>
  ): Promise<TrieList>;
}
