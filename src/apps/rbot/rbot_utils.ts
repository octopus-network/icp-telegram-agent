import { TFunction } from "i18next"

import { TransferError, ApproveError } from '../ledger/declarations/icrc1_ledger_canister/icrc1_ledger_canister.did'

export function convertTransferError(err: TransferError | ApproveError, i18n: TFunction): string {
  let error = i18n('ledger_error_Unknown')
  if ('GenericError' in err) {
    error = i18n('ledger_error_GenericError', { error: err.GenericError.message })
  } else if ('TemporarilyUnavailable' in err) {
    error = i18n('ledger_error_TemporarilyUnavailable')
  } else if ('InsufficientFunds' in err) {
    // error = i18n('ledger_error_InsufficientFunds', { error: err.InsufficientFunds.balance.toString() })
    error = i18n('ledger_error_InsufficientFunds')
  }
  return error
}

export function stringToBigint(amount: string, decimals: number): bigint {
  let [integer, fraction] = amount.split(".");
  if (fraction && fraction.length > decimals) {
    fraction = fraction.substring(0, decimals);
  }
  let display = integer + (fraction ? fraction : "").padEnd(decimals, "0");
  return BigInt(display);
}

export function bigintToString(bigIntAmount: BigInt, decimals: number): string {
  const amountString = bigIntAmount.toString();
  const integer = amountString.length > decimals ? amountString.slice(0, -decimals) : '0';
  const fraction = amountString.slice(-decimals).padStart(decimals, '0');
  return `${integer}.${fraction}`;
}
