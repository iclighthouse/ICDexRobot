import { appendZero } from '@/ic/converter';
export const formatDateToUTC = (time: number): string => {
  const date = new Date(time);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const hour = date.getUTCHours();
  const minute = date.getUTCMinutes();
  const second = date.getUTCSeconds();
  return (
    year +
    '/' +
    appendZero(month) +
    '/' +
    appendZero(day) +
    ' ' +
    hour +
    ':' +
    appendZero(minute) +
    ':' +
    appendZero(second) +
    ' UTC'
  );
};
