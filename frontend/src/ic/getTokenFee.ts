import { TokenInfo } from '@/views/home/model';
export const getFee = (token: TokenInfo): string => {
  if (token) {
    if (typeof token.fee === 'bigint') {
      return (token.fee as bigint).toString();
    } else if (typeof token.fee === 'string') {
      return token.fee;
    } else if ((token.fee as { token: bigint }).token.toString()) {
      return (token.fee as { token: bigint }).token.toString(10);
    }
  }
  return '0';
};
