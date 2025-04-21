export const ellipsisAccount = (account: string, num = 4): string => {
  if (account) {
    if (account.length > num + 4) {
      return account.slice(0, num) + '***' + account.slice(-4);
    } else {
      return account;
    }
  }
  return '';
};
