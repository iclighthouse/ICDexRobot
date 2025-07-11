import BigNumber from 'bignumber.js';
export const formatAmount = (
  num: bigint | string,
  decimalPlaces: number
): string => {
  if (num === '-') {
    return '-';
  }
  if (new BigNumber(num.toString(10)).gt(10 ** 12)) {
    return (
      setSeparator(
        new BigNumber(num.toString(10))
          .div(10 ** 12)
          .decimalPlaces(2, 1)
          .toString(10)
      ) + 'T'
    );
  } else if (new BigNumber(num.toString(10)).gt(10 ** 9)) {
    return (
      setSeparator(
        new BigNumber(num.toString(10))
          .div(10 ** 9)
          .decimalPlaces(2, 1)
          .toString(10)
      ) + 'B'
    );
  } else if (new BigNumber(num.toString(10)).gt(10 ** 6)) {
    return (
      setSeparator(
        new BigNumber(num.toString(10))
          .div(10 ** 6)
          .decimalPlaces(2, 1)
          .toString(10)
      ) + 'M'
    );
  } else {
    return setSeparator(
      new BigNumber(num.toString(10))
        .decimalPlaces(decimalPlaces, 1)
        .toString(10)
    );
  }
};
export const formatH5Amount = (
  num: bigint | string,
  decimalPlaces: number
): string => {
  if (num === '-') {
    return '-';
  }
  if (new BigNumber(num.toString(10)).gte(10 ** 12)) {
    return (
      new BigNumber(num.toString(10))
        .div(10 ** 12)
        .decimalPlaces(2, 1)
        .toString(10) + 'T'
    );
  } else if (new BigNumber(num.toString(10)).gte(10 ** 9)) {
    return (
      new BigNumber(num.toString(10))
        .div(10 ** 9)
        .decimalPlaces(2, 1)
        .toString(10) + 'B'
    );
  } else if (new BigNumber(num.toString(10)).gte(10 ** 6)) {
    return (
      new BigNumber(num.toString(10))
        .div(10 ** 6)
        .decimalPlaces(2, 1)
        .toString(10) + 'M'
    );
  } else if (new BigNumber(num.toString(10)).gte(10 ** 3)) {
    return (
      new BigNumber(num.toString(10))
        .div(10 ** 3)
        .decimalPlaces(2, 1)
        .toString(10) + 'K'
    );
  } else {
    return new BigNumber(num.toString(10))
      .decimalPlaces(decimalPlaces, 1)
      .toString(10);
  }
};
const setSeparator = (num: string): string => {
  const tag = (num || 0).toString(10).split('.');
  tag[0] = tag[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return tag.join('.');
};
