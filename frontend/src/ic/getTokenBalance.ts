import { DRC20TokenService } from '@/ic/DRC20Token/DRC20TokenService';
import { Principal } from '@dfinity/principal';
import { TokenStd } from '@/ic/ICSwapRouter/model';
const LEDGER_CANISTER_ID = 'ryjl3-tyaaa-aaaaa-aaaba-cai';
export const getTokenBalance = async (
  tokenStd: TokenStd,
  tokenId: string,
  principal?: string
): Promise<string> => {
  const currentDRC20TokenService = new DRC20TokenService();
  if (!principal) {
    return;
  }
  let balance = BigInt(0);
  try {
    let std;
    if (tokenStd) {
      std = Object.keys(tokenStd)[0].toLocaleLowerCase();
    }
    if (std && std === 'icp') {
      balance = BigInt(await getIcpBalance(principal));
    } else if (std && std === 'drc20') {
      balance = await currentDRC20TokenService.drc20_balanceOf(
        principal,
        tokenId
      );
    } else if (std && (std === 'icrc1' || std === 'icrc2')) {
      const to = {
        owner: Principal.fromText(principal),
        subaccount: []
      };
      balance = await currentDRC20TokenService.icrc1_balance_of(tokenId, to);
    }
    return balance.toString(10);
  } catch (e) {}
};
const getIcpBalance = async (principal: string): Promise<string> => {
  const currentDRC20TokenService = new DRC20TokenService();
  const balanceRes = await currentDRC20TokenService.icrc1_balance_of(
    LEDGER_CANISTER_ID,
    { owner: Principal.fromText(principal), subaccount: [] }
  );
  return balanceRes.toString(10);
};
