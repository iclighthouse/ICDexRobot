import BigNumber from 'bignumber.js';
export const formatNum = (num: bigint, type?: string): string => {
  if (type && new BigNumber(num.toString(10)).gt(10 ** 12)) {
    return new BigNumber(num.toString(10))
      .div(10 ** 12)
      .decimalPlaces(0, 1)
      .toString(10);
  }
  const tag = (num || 0).toString(10).split('.');
  tag[0] = tag[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return tag.join('.');
  // return num.toString(10).toLocaleString();
};
