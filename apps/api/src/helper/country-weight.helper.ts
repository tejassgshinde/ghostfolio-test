export const COUNTRY_WEIGHT_ERROR_MESSAGE =
  'Country weights must be between 0 and 1';

// Checks whether all country weights are numbers within 0 and 1 (inclusive).
// null, undefined and an empty array are valid (no countries).
export function isValidCountryWeights(countries: unknown): boolean {
  if (countries === null || countries === undefined) {
    return true;
  }

  if (!Array.isArray(countries)) {
    return false;
  }

  return countries.every((country) => {
    const weight = country?.weight;

    return typeof weight === 'number' && weight >= 0 && weight <= 1;
  });
}
