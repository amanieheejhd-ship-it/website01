import { formatINR } from '@fardeen/utils';

/** Prices are stored in minor units (paise). Format to a rupee string. */
export function formatPriceFromMinor(minorUnits: number): string {
  return formatINR(Math.round(minorUnits / 100));
}

export { formatINR };
