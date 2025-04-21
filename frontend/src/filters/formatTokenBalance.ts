import BigNumber from 'bignumber.js';
export const formatTokenBalance = (num: string): string => {
  if (new BigNumber(num).gt(10 ** 4)) {
    num = new BigNumber(num).decimalPlaces(4, 1).toString(10);
  }
  if (new BigNumber(num).gt(10 ** 6)) {
    num = new BigNumber(num).decimalPlaces(2, 1).toString(10);
  }
  const tag = (num || 0).toString(10).split('.');
  tag[0] = tag[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return tag.join('.');
};
