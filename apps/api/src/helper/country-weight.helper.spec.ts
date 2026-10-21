import { isValidCountryWeights } from './country-weight.helper';

describe('isValidCountryWeights', () => {
  it.each([0, 0.5, 1])('accepts a weight of %s', (weight) => {
    expect(isValidCountryWeights([{ code: 'US', weight }])).toBe(true);
  });

  it.each([1.01, -0.01, 60, NaN, Infinity, -Infinity, '0.5', undefined, null])(
    'rejects a weight of %s',
    (weight) => {
      expect(isValidCountryWeights([{ code: 'US', weight }])).toBe(false);
    }
  );

  it('rejects if any of multiple weights is out of range', () => {
    expect(
      isValidCountryWeights([
        { code: 'US', weight: 0.4 },
        { code: 'DE', weight: 60 }
      ])
    ).toBe(false);
  });

  it.each(['US', 60, {}, { weight: 0.5 }])(
    'rejects a non-array (%p)',
    (countries) => {
      expect(isValidCountryWeights(countries)).toBe(false);
    }
  );

  it('accepts null, undefined and an empty array', () => {
    expect(isValidCountryWeights(null)).toBe(true);
    expect(isValidCountryWeights(undefined)).toBe(true);
    expect(isValidCountryWeights([])).toBe(true);
  });
});
