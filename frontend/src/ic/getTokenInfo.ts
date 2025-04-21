import { DRC20TokenService } from '@/ic/DRC20Token/DRC20TokenService';
import { Principal } from '@dfinity/principal';
import { TokenStd } from '@/ic/ICSwapRouter/model';
import { TokenInfo } from '@/views/home/model';
import { getFee } from '@/ic/getTokenFee';
const LEDGER_CANISTER_ID = 'ryjl3-tyaaa-aaaaa-aaaba-cai';
const DRC20Token = new DRC20TokenService();
export const getTokenInfo = async (
  tokenId: Principal,
  tokenStd: TokenStd
): Promise<TokenInfo> => {
  let tokenInfo: TokenInfo = {
    name: '',
    symbol: '',
    decimals: null,
    fee: '',
    tokenStd: tokenStd
  };
  if (
    tokenId.toString() === LEDGER_CANISTER_ID ||
    (tokenStd && (tokenStd as { icp: null }).icp === null)
  ) {
    tokenInfo.name = 'ICP';
    tokenInfo.symbol = 'ICP';
    tokenInfo.fee = '10000';
    tokenInfo.decimals = 8;
  } else if (tokenStd && (tokenStd as { drc20: null }).drc20 === null) {
    tokenInfo = await getDrc20TokenInfo(tokenId.toString(), tokenInfo);
  } else if (
    tokenStd &&
    ((tokenStd as { icrc1: null }).icrc1 === null ||
      (tokenStd as { icrc2: null }).icrc2 === null)
  ) {
    tokenInfo = await getIcrc1TokenInfo(tokenId.toString(), tokenInfo);
  }
  const tokens = JSON.parse(localStorage.getItem('tokens')) || {};
  if (!tokens[tokenId.toString()]) {
    tokens[tokenId.toString()] = {
      name: tokenInfo.name,
      decimals: tokenInfo.decimals,
      symbol: tokenInfo.symbol,
      tokenStd: tokenInfo.tokenStd,
      fee: tokenInfo.fee
    };
    // localStorage.setItem(
    //   'tokens',
    //   JSON.stringify(
    //     tokens,
    //     (key, value) => (typeof value === 'bigint' ? value.toString(10) : value) // return everything else unchanged
    //   )
    // );
  }
  return tokenInfo;
};
const getDrc20TokenInfo = async (
  tokenId: string,
  tokenInfo: TokenInfo
): Promise<TokenInfo> => {
  const promiseAllValue = [];
  promiseAllValue.push(
    DRC20Token.name(tokenId),
    DRC20Token.symbol(tokenId),
    DRC20Token.decimals(tokenId),
    DRC20Token.gas(tokenId)
  );
  // const token = await Promise.all(promiseAllValue);
  return Promise.all(promiseAllValue).then((token) => {
    tokenInfo.name = token[0];
    tokenInfo.symbol = token[1];
    tokenInfo.decimals = token[2];
    tokenInfo.fee = token[3];
    return tokenInfo;
  });
  // return tokenInfo;
};
const getIcrc1TokenInfo = async (
  tokenId: string,
  tokenInfo: TokenInfo
): Promise<TokenInfo> => {
  const promiseAllValue = [];
  promiseAllValue.push(
    DRC20Token.icrcName(tokenId),
    DRC20Token.icrcSymbol(tokenId),
    DRC20Token.icrcDecimals(tokenId),
    DRC20Token.icrcFee(tokenId)
  );
  // const token = await Promise.all(promiseAllValue);
  return Promise.all(promiseAllValue).then((token) => {
    tokenInfo.name = token[0];
    tokenInfo.symbol = token[1];
    tokenInfo.decimals = token[2];
    tokenInfo.fee = token[3];
    return tokenInfo;
  });
};
