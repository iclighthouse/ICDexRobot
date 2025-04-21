import BigNumber from 'bignumber.js';
export const ratioGrade = (
  ratio: string,
  minRatio: string,
  defaultRatio: string
): string => {
  if (Number(ratio) === 0) {
    return '';
  }
  let ratioGradeClass = 'ratio-danger';
  if (new BigNumber(parseFloat(ratio)).times(100).div(1.2).gt(minRatio)) {
    ratioGradeClass = 'ratio-warning';
  }
  if (
    new BigNumber(parseFloat(ratio)).times(100).div(1.5).gt(minRatio) ||
    new BigNumber(parseFloat(ratio)).times(100).gte(defaultRatio)
  ) {
    ratioGradeClass = 'ratio-default';
  }
  return ratioGradeClass;
};
export const ratioGradeBg = (
  ratio: string,
  minRatio: string,
  defaultRatio: string
): string => {
  if (Number(ratio) === 0) {
    return '';
  }
  let ratioGradeClass = 'ratio-danger-bg';
  if (new BigNumber(parseFloat(ratio)).times(100).div(1.2).gt(minRatio)) {
    ratioGradeClass = 'ratio-warning-bg';
  }
  if (
    new BigNumber(parseFloat(ratio)).times(100).div(1.5).gt(minRatio) ||
    new BigNumber(parseFloat(ratio)).times(100).gte(defaultRatio)
  ) {
    ratioGradeClass = 'ratio-default-bg';
  }
  return ratioGradeClass;
};
