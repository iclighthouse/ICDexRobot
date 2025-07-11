import { Principal } from '@dfinity/principal';
import { sha224 } from '@noble/hashes/sha256';
// @ts-ignore no type definitions for crc are available)
import crc from 'crc';
const SUB_ACCOUNT_BYTE_LENGTH = 32;
/**
 * uint8ArrayToBigInt
 * @param array: Uint8Array
 * @return bigint
 */
const uint8ArrayToBigInt = (array: Uint8Array): bigint => {
  const view = new DataView(array.buffer, array.byteOffset, array.byteLength);
  if (typeof view.getBigUint64 === 'function') {
    return view.getBigUint64(0);
  } else {
    const high = BigInt(view.getUint32(0));
    const low = BigInt(view.getUint32(4));
    return (high << BigInt(32)) + low;
  }
};
const TWO_TO_THE_32 = BigInt(1) << BigInt(32);
const bigIntToUint8Array = (value: bigint): Uint8Array => {
  const array = new Uint8Array(8);
  const view = new DataView(array.buffer, array.byteOffset, array.byteLength);
  if (typeof view.setBigUint64 === 'function') {
    view.setBigUint64(0, value);
  } else {
    view.setUint32(0, Number(value >> BigInt(32)));
    view.setUint32(4, Number(value % TWO_TO_THE_32));
  }
  return array;
};
const asciiStringToByteArray = (text: string): Array<number> => {
  return Array.from(text).map((c) => c.charCodeAt(0));
};
const principalToAccountIdentifier = (
  principal: Principal,
  subAccount?: Uint8Array
): string => {
  // convert to a hex string
  const bytes = new Uint8Array(principalToAccount(principal, subAccount));
  return toHexString(bytes);
};
const principalToAccount = (
  principal: Principal,
  subAccount?: Uint8Array
): Array<number> => {
  // Hash (sha224) the principal, the subAccount and some padding
  const padding = asciiStringToByteArray('\x0Aaccount-id');
  const shaObj = sha224.create();
  shaObj.update(
    new Uint8Array([
      ...padding,
      ...principal.toUint8Array(),
      ...(subAccount ?? Array(32).fill(0))
    ])
  );
  const hash = new Uint8Array(shaObj.digest());
  // Prepend the checksum of the hash
  const checksum = calculateCrc32(hash);
  return [...checksum, ...hash];
};
const toHexString = (bytes: Uint8Array): string => {
  return bytes.reduce(
    (str, byte) => str + byte.toString(16).padStart(2, '0'),
    ''
  );
};
// 4 bytes
const calculateCrc32 = (bytes: Uint8Array): Uint8Array => {
  const checksumArrayBuf = new ArrayBuffer(4);
  const view = new DataView(checksumArrayBuf);
  view.setUint32(0, crc.crc32(Buffer.from(bytes)), false);
  return Buffer.from(checksumArrayBuf);
};
const hexToBytes = (hex: string): number[] => {
  if (hex.substr(0, 2) === '0x') {
    hex = hex.replace(/^0x/i, '');
  }
  const bytes = [];
  for (let c = 0; c < hex.length; c += 2) {
    bytes.push(parseInt(hex.substr(c, 2), 16));
  }
  return bytes;
};
const numberToArrayBuffer = (
  value: number,
  byteLength: number
): ArrayBuffer => {
  const buffer = new ArrayBuffer(byteLength);
  new DataView(buffer).setUint32(byteLength - 4, value);
  return buffer;
};
const arrayBufferToArrayOfNumber = (buffer: ArrayBuffer): Array<number> => {
  const typedArray = new Uint8Array(buffer);
  return Array.from(typedArray);
};
const isHex = (h: any): boolean => {
  const regexp = /^[0-9a-fA-F]+$/;
  return regexp.test(h);
};
const SerializableIC = (x) => {
  if (x === undefined || x === null) return x;
  if (ArrayBuffer.isView(x) || x instanceof ArrayBuffer) {
    // @ts-ignore
    return [...x].map((y) => SerializableIC(y));
  }
  if (Array.isArray(x)) {
    return x.map((y) => SerializableIC(y));
  }
  if (typeof x === 'object') {
    if (x._isPrincipal) {
      return x;
    }
    return Object.fromEntries(
      Object.keys(x).map((k) => {
        return [k, SerializableIC(x[k])];
      })
    );
  }
  return x;
};
/**
 * @return {string}
 */
function appendZero(obj: number) {
  if (obj < 10) {
    return '0' + obj;
  } else {
    return obj;
  }
}
const fromSubAccountId = (subAccountId: number): Array<number> => {
  const buffer = numberToArrayBuffer(subAccountId, SUB_ACCOUNT_BYTE_LENGTH);
  return arrayBufferToArrayOfNumber(buffer);
};
const validateAccount = (a: any): boolean => {
  return isHex(a) && a.length === 64;
};
const validatePrincipal = (principal: string): boolean => {
  try {
    return principal === Principal.fromText(principal).toText();
  } catch (e) {
    return false;
  }
};
const toPrincipalAndAccountId = (
  val: string
): { principal: string; subaccount: string; accountId: string } => {
  if (!val) {
    return {
      principal: null,
      subaccount: null,
      accountId: null
    };
  }
  try {
    if (val.includes('|') || val.includes('.')) {
      let account;
      if (val.includes('|')) {
        account = val.split('|');
      } else {
        account = val.split('.');
      }
      const principal = account[0].trim();
      let subaccount = hexToBytes(account[1].trim());
      const flag = subaccount.every((item) => {
        return item === 0;
      });
      if (!subaccount || flag) {
        return {
          principal: principal,
          subaccount: null,
          accountId: principalToAccountIdentifier(Principal.from(principal))
        };
      }
      subaccount = new Array(32 - subaccount.length).fill(0).concat(subaccount);
      if (validatePrincipal(principal)) {
        return {
          principal: principal,
          subaccount: toHexString(new Uint8Array(subaccount)),
          accountId: principalToAccountIdentifier(
            Principal.from(principal),
            new Uint8Array(subaccount)
          )
        };
      } else {
        return {
          principal: null,
          subaccount: null,
          accountId: null
        };
      }
    } else {
      if (validatePrincipal(val)) {
        return {
          principal: val,
          subaccount: null,
          accountId: principalToAccountIdentifier(Principal.from(val))
        };
      } else if (validateAccount(val)) {
        return {
          principal: null,
          subaccount: null,
          accountId: val
        };
      }
      return {
        principal: null,
        subaccount: null,
        accountId: null
      };
    }
  } catch (e) {
    return {
      principal: null,
      subaccount: null,
      accountId: null
    };
  }
};
export {
  bigIntToUint8Array,
  uint8ArrayToBigInt,
  asciiStringToByteArray,
  principalToAccountIdentifier,
  toHexString,
  calculateCrc32,
  hexToBytes,
  numberToArrayBuffer,
  principalToAccount,
  arrayBufferToArrayOfNumber,
  SerializableIC,
  appendZero,
  fromSubAccountId,
  toPrincipalAndAccountId
};
