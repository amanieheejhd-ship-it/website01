/** Format an amount stored in minor units (paise) for display. */
export function formatMinor(minor: number, currency = 'INR'): string {
  const major = minor / 100;
  if (currency === 'INR') return `₹${major.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  return `${currency} ${major.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}
