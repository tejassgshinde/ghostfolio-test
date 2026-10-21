import { repairCountryWeights } from './country-weight-repair.helper';

describe('repairCountryWeights', () => {
  it('should repair weights stored as 0-100', () => {
    expect(
      repairCountryWeights([
        { code: 'US', weight: 60 },
        { code: 'DE', weight: 40 }
      ])
    ).toEqual({
      after: [
        { code: 'US', weight: 0.6 },
        { code: 'DE', weight: 0.4 }
      ],
      status: 'repaired'
    });
  });

  it('should leave weights within 0-1 unchanged', () => {
    expect(
      repairCountryWeights([
        { code: 'US', weight: 0.6 },
        { code: 'DE', weight: 0.4 }
      ])
    ).toEqual({ status: 'unchanged' });
  });

  it('should leave weights of exactly 0 and 1 unchanged', () => {
    expect(repairCountryWeights([{ code: 'US', weight: 1 }])).toEqual({
      status: 'unchanged'
    });

    expect(
      repairCountryWeights([
        { code: 'US', weight: 1 },
        { code: 'DE', weight: 0 }
      ])
    ).toEqual({ status: 'unchanged' });
  });

  it('should leave null and empty arrays unchanged', () => {
    expect(repairCountryWeights(null)).toEqual({ status: 'unchanged' });
    expect(repairCountryWeights(undefined)).toEqual({ status: 'unchanged' });
    expect(repairCountryWeights([])).toEqual({ status: 'unchanged' });
  });

  it('should divide all weights of a mixed row by 100', () => {
    expect(
      repairCountryWeights([
        { code: 'US', weight: 60 },
        { code: 'DE', weight: 0.4 }
      ])
    ).toEqual({
      after: [
        { code: 'US', weight: 0.6 },
        { code: 'DE', weight: 0.004 }
      ],
      status: 'repaired'
    });
  });

  it('should skip weights that stay above 1 after the division', () => {
    expect(repairCountryWeights([{ code: 'US', weight: 150 }])).toEqual({
      reason: 'weight is above 100',
      status: 'skipped'
    });
  });

  it('should skip negative weights', () => {
    expect(repairCountryWeights([{ code: 'US', weight: -5 }])).toEqual({
      reason: 'weight is below 0',
      status: 'skipped'
    });
  });

  it('should skip non-numeric weights', () => {
    expect(repairCountryWeights([{ code: 'US', weight: '60' }]).status).toBe(
      'skipped'
    );
  });

  it('should be idempotent', () => {
    const result = repairCountryWeights([
      { code: 'US', weight: 60 },
      { code: 'DE', weight: 40 }
    ]);

    expect(result.status).toBe('repaired');

    if (result.status === 'repaired') {
      expect(repairCountryWeights(result.after)).toEqual({
        status: 'unchanged'
      });
    }
  });

  it('should preserve extra keys and not mutate the input', () => {
    const input = [
      { code: 'US', continent: 'North America', name: 'US', weight: 100 }
    ];

    expect(repairCountryWeights(input)).toEqual({
      after: [
        { code: 'US', continent: 'North America', name: 'US', weight: 1 }
      ],
      status: 'repaired'
    });

    expect(input[0].weight).toBe(100);
  });
});
