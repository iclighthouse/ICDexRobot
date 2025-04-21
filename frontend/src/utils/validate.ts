import { ValidationRule } from 'ant-design-vue/types/form/form';
import { validatePrincipal, validateAccount, isHexString } from '@/ic/utils';
export const validateCanister = (
  rule: ValidationRule,
  value: string,
  callback: (arg0?: string) => void
): void => {
  if (value && !validatePrincipal(value)) {
    callback('invalid principal');
  } else {
    callback();
  }
};
export const validateCanisterOrAccount = (
  rule: ValidationRule,
  value: string,
  callback: (arg0?: string) => void
): void => {
  if (value && !validatePrincipal(value) && !validateAccount(value)) {
    callback('invalid principal Or Account');
  } else {
    callback();
  }
};
export const validateAccountId = (
  rule: ValidationRule,
  value: string,
  callback: (arg0?: string) => void
): void => {
  if (value && !validateAccount(value)) {
    callback('invalid account');
  } else {
    callback();
  }
};
export const validateData = (
  rule: ValidationRule,
  value: string,
  callback: (arg0?: string) => void
): void => {
  if (value && !isHexString(value)) {
    callback('Please enter hex format');
  } else {
    callback();
  }
};
