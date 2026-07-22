export function daytripEstimate(adults: number): string {
  if (adults <= 2) return '$300 USD';
  if (adults <= 4) return '$500 USD';
  if (adults <= 6) return '$700 USD';
  return '$900 USD';
}
