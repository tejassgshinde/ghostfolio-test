import { getOwnManualAssetChartSeries } from './holding-detail-dialog.helper';

describe('getOwnManualAssetChartSeries', () => {
  // Local constructors keep the results independent of the time zone
  const D = (day: number) => new Date(2024, 0, day);
  const key = (day: number) => `2024-01-${String(day).padStart(2, '0')}`;
  const now = new Date(2024, 0, 15, 12, 0, 0);

  const row = (day: number, marketPrice: number) => ({
    date: D(day),
    marketPrice
  });

  const item = (day: number, averagePrice: number) => ({
    averagePrice,
    date: key(day)
  });

  it('should start the average line at the first purchase and run to today (price history before first purchase)', () => {
    const marketData = [
      row(10, 1),
      row(11, 2),
      row(12, 3),
      row(13, 4),
      row(14, 5),
      row(15, 6)
    ];

    // Rows D0..D5 = 10..15 with today being D5, first purchase D2 = 12
    const { benchmarkDataItems, historicalDataItems } =
      getOwnManualAssetChartSeries({
        averagePrice: 12,
        dateOfFirstActivity: D(12),
        historicalData: [
          item(12, 10),
          item(13, 11),
          item(14, 11.5),
          item(15, 12)
        ],
        marketData,
        now
      });

    expect(benchmarkDataItems.map(({ date }) => date)).toEqual(
      historicalDataItems.map(({ date }) => date)
    );
    expect(benchmarkDataItems).toHaveLength(historicalDataItems.length);
    expect(historicalDataItems.map(({ value }) => value)).toEqual([
      1, 2, 3, 4, 5, 6
    ]);
    expect(benchmarkDataItems.map(({ value }) => value)).toEqual([
      null,
      null,
      10,
      11,
      11.5,
      12
    ]);
    expect(benchmarkDataItems[benchmarkDataItems.length - 1].date).toBe(
      key(15)
    );
  });

  it('should insert a point at the first purchase between two stored rows', () => {
    const { benchmarkDataItems, historicalDataItems } =
      getOwnManualAssetChartSeries({
        averagePrice: 10,
        dateOfFirstActivity: D(12),
        historicalData: [item(12, 10), item(14, 10), item(15, 10)],
        marketData: [row(10, 1), row(11, 2), row(14, 5), row(15, 6)],
        now
      });

    expect(historicalDataItems).toEqual([
      { date: key(10), value: 1 },
      { date: key(11), value: 2 },
      { date: key(12), value: 2 },
      { date: key(14), value: 5 },
      { date: key(15), value: 6 }
    ]);
    expect(benchmarkDataItems).toEqual([
      { date: key(10), value: null },
      { date: key(11), value: null },
      { date: key(12), value: 10 },
      { date: key(14), value: 10 },
      { date: key(15), value: 10 }
    ]);
  });

  it('should use the average as market value if the first purchase is before all stored rows', () => {
    const { benchmarkDataItems, historicalDataItems } =
      getOwnManualAssetChartSeries({
        averagePrice: 10,
        dateOfFirstActivity: D(8),
        historicalData: [item(8, 9), item(12, 10), item(15, 10)],
        marketData: [row(12, 3), row(15, 6)],
        now
      });

    expect(historicalDataItems[0]).toEqual({ date: key(8), value: 9 });
    expect(benchmarkDataItems[0]).toEqual({ date: key(8), value: 9 });
    expect(historicalDataItems).toHaveLength(3);
    expect(benchmarkDataItems).toHaveLength(3);
  });

  it('should return exactly two points for empty market data', () => {
    const { benchmarkDataItems, historicalDataItems } =
      getOwnManualAssetChartSeries({
        averagePrice: 10,
        dateOfFirstActivity: D(12),
        historicalData: [],
        marketData: [],
        now
      });

    expect(historicalDataItems).toEqual([
      { date: key(12), value: 10 },
      { date: key(15), value: 10 }
    ]);
    expect(benchmarkDataItems).toEqual([
      { date: key(12), value: 10 },
      { date: key(15), value: 10 }
    ]);
  });

  it('should not duplicate the label of today if a stored row is dated today', () => {
    const { benchmarkDataItems, historicalDataItems } =
      getOwnManualAssetChartSeries({
        averagePrice: 10,
        dateOfFirstActivity: D(12),
        historicalData: [item(12, 10), item(15, 10)],
        marketData: [row(12, 3), row(15, 6)],
        now
      });

    expect(
      historicalDataItems.filter(({ date }) => date === key(15))
    ).toHaveLength(1);
    expect(
      benchmarkDataItems.filter(({ date }) => date === key(15))
    ).toHaveLength(1);
    expect(historicalDataItems).toHaveLength(2);
  });

  it('should keep null for an average price of 0 (sold out)', () => {
    const { benchmarkDataItems } = getOwnManualAssetChartSeries({
      averagePrice: 0,
      dateOfFirstActivity: D(12),
      historicalData: [item(12, 10), item(13, 10), item(14, 0), item(15, 0)],
      marketData: [row(12, 3), row(13, 4), row(14, 5), row(15, 6)],
      now
    });

    expect(benchmarkDataItems.map(({ value }) => value)).toEqual([
      10,
      10,
      null,
      null
    ]);
  });

  it('should carry the earlier average forward for stored rows without an item', () => {
    const { benchmarkDataItems } = getOwnManualAssetChartSeries({
      averagePrice: 12,
      dateOfFirstActivity: D(10),
      historicalData: [item(10, 10), item(13, 12)],
      marketData: [row(10, 1), row(11, 2), row(13, 4), row(14, 5)],
      now
    });

    expect(benchmarkDataItems).toEqual([
      { date: key(10), value: 10 },
      { date: key(11), value: 10 },
      { date: key(13), value: 12 },
      { date: key(14), value: 12 },
      { date: key(15), value: 12 }
    ]);
  });

  it('should add two ISO points if the first purchase is today', () => {
    const { benchmarkDataItems, historicalDataItems } =
      getOwnManualAssetChartSeries({
        averagePrice: 10,
        dateOfFirstActivity: now,
        historicalData: [item(15, 10)],
        marketData: [row(13, 1), row(14, 2)],
        now
      });

    expect(benchmarkDataItems).toEqual([
      { date: key(13), value: null },
      { date: key(14), value: null },
      { date: now.toISOString(), value: 10 },
      { date: now.toISOString(), value: 10 }
    ]);
    expect(historicalDataItems.map(({ date }) => date)).toEqual(
      benchmarkDataItems.map(({ date }) => date)
    );
    expect(historicalDataItems.slice(0, 2).map(({ value }) => value)).toEqual([
      1, 2
    ]);
  });

  it('should return a null benchmark if the date of first activity is undefined', () => {
    const { benchmarkDataItems, historicalDataItems } =
      getOwnManualAssetChartSeries({
        averagePrice: 10,
        dateOfFirstActivity: undefined,
        historicalData: [item(12, 10)],
        marketData: [row(10, 1), row(11, 2)],
        now
      });

    expect(benchmarkDataItems).toHaveLength(historicalDataItems.length);
    expect(benchmarkDataItems.every(({ value }) => value === null)).toBe(true);
    expect(historicalDataItems.map(({ value }) => value)).toEqual([1, 2]);
  });
});
