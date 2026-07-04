export function normalizeCountryCode(value: string | null | undefined) {
  return value?.trim().toUpperCase() ?? '';
}

export function calculateLivePriceNgn({
  priceUsd,
  exchangeRate,
  marginPercent,
  overridePriceNgn,
}: {
  priceUsd: number;
  exchangeRate: number;
  marginPercent: number;
  overridePriceNgn?: number | null;
}) {
  if (overridePriceNgn != null) return Math.ceil(overridePriceNgn);
  const converted = Number(priceUsd || 0) * Number(exchangeRate || 0);
  const withMargin = converted * (1 + Number(marginPercent || 0) / 100);
  return Math.ceil(withMargin);
}
