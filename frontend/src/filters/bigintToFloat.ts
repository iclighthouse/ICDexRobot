import BigNumber from 'bignumber.js';
export const bigintToFloat = (
  val: bigint | string,
  num = 4,
  decimal = 12,
  mode: BigNumber.RoundingMode = 1
): string => {
  if (val === '-') {
    return val;
  }
  if (val) {
    const n = new BigNumber(val.toString(10)).div(10 ** decimal);
    if (n.gt(10 ** 7)) {
      return n.decimalPlaces(0, mode).toString(10);
    } else if (n.gt(10 ** 5)) {
      return n.decimalPlaces(Math.min(2, num), mode).toString(10);
    } else {
      return n.decimalPlaces(num, mode).toString(10);
    }
  } else {
    return '0';
  }
};
