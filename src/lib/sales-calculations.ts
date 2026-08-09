export const COMMERCIAL_RATES_COP = {
  foodPerPersonPerServiceDay: 150_000,
  baruBoatRoundTripPerGroup: 300_000,
  cartagenaBoatEachWayPerGroup: 700_000,
} as const;

export function calculateFullFoodServiceCop(people: number, serviceDays: number): number {
  if (!Number.isInteger(people) || people < 0 || !Number.isInteger(serviceDays) || serviceDays < 0) {
    throw new Error('People and service days must be non-negative integers');
  }
  return people * serviceDays * COMMERCIAL_RATES_COP.foodPerPersonPerServiceDay;
}

export function calculateTransportCop(route: 'baru_round_trip' | 'cartagena', cartagenaLegs = 2): number {
  if (route === 'baru_round_trip') return COMMERCIAL_RATES_COP.baruBoatRoundTripPerGroup;
  if (!Number.isInteger(cartagenaLegs) || cartagenaLegs < 1 || cartagenaLegs > 2) throw new Error('Cartagena legs must be 1 or 2');
  return cartagenaLegs * COMMERCIAL_RATES_COP.cartagenaBoatEachWayPerGroup;
}

export function calculatePackageCop(parts: { accommodation: number; food?: number; transport?: number }): number {
  const values = [parts.accommodation, parts.food ?? 0, parts.transport ?? 0];
  if (values.some((value) => !Number.isFinite(value) || value < 0)) throw new Error('Package amounts must be non-negative');
  return values.reduce((sum, value) => sum + value, 0);
}
