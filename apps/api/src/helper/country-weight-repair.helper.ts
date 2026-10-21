export type CountryWeightRepairResult =
  | { status: 'unchanged' }
  | { after: Record<string, unknown>[]; status: 'repaired' }
  | { reason: string; status: 'skipped' };

// Repairs country weights that were stored as 0-100 instead of 0-1.
//
// Rule: if any weight of a row is above 1, the row is considered to be stored
// as a percentage and every weight of that row is divided by 100. Rows with
// all weights within 0-1 (including exactly 0 and 1) are left untouched.
//
// Rows that cannot be repaired unambiguously are skipped (reported, never
// written): negative or non-numeric weights, or weights that would still be
// above 1 after the division (i.e. above 100).
export function repairCountryWeights(
  countries: unknown
): CountryWeightRepairResult {
  if (!Array.isArray(countries) || countries.length === 0) {
    return { status: 'unchanged' };
  }

  let needsRepair = false;

  for (const country of countries) {
    const weight = (country as { weight?: unknown } | null)?.weight;

    if (typeof weight !== 'number' || !Number.isFinite(weight)) {
      return { reason: 'weight is not a finite number', status: 'skipped' };
    }

    if (weight < 0) {
      return { reason: 'weight is below 0', status: 'skipped' };
    }

    if (weight > 100) {
      return { reason: 'weight is above 100', status: 'skipped' };
    }

    if (weight > 1) {
      needsRepair = true;
    }
  }

  if (!needsRepair) {
    return { status: 'unchanged' };
  }

  return {
    after: (countries as Record<string, unknown>[]).map((country) => {
      return { ...country, weight: (country.weight as number) / 100 };
    }),
    status: 'repaired'
  };
}
