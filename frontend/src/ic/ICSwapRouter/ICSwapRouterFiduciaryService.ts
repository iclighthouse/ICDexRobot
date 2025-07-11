import Service, { DexName, TrieList } from '@/ic/ICSwapRouter/model';
import ICSwapRouterIDL from './ICSwapRouterFiduciary.did';
import { buildService } from '@/ic/Service';
// let IC_SWAP_ROUTER_CANISTER_ID_Fiduciary = 'i2ied-uqaaa-aaaar-qaaza-cai';
let IC_SWAP_ROUTER_CANISTER_ID_Fiduciary = 'pwokq-miaaa-aaaak-act6a-cai';
if (process.env.NODE_ENV === 'production') {
  IC_SWAP_ROUTER_CANISTER_ID_Fiduciary = 'i2ied-uqaaa-aaaar-qaaza-cai';
}
export class ICSwapRouterFiduciaryService {
  public getPairs = async (
    dexName: Array<DexName> = [],
    page: Array<number> = [],
    size: Array<number> = []
  ): Promise<TrieList> => {
    const service = buildService<Service>(
      null,
      ICSwapRouterIDL,
      IC_SWAP_ROUTER_CANISTER_ID_Fiduciary
    );
    return await service.getPairs(dexName, page, size);
  };
}
