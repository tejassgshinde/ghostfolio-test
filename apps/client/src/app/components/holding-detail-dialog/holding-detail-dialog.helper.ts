import { DATE_FORMAT } from '@ghostfolio/common/helper';
import {
  HistoricalDataItem,
  LineChartItem,
  NullableLineChartItem
} from '@ghostfolio/common/interfaces';
import type { MarketData } from '@ghostfolio/prisma/browser';

import { format, parseISO } from 'date-fns';
import { isNumber } from 'lodash-es';

// Builds the date-aligned market price and average price series of the chart
// for own assets with data source MANUAL. Both series always have the same
// length and the same dates.
//
// - The market price series keeps all stored rows (including the ones before
//   the first purchase). Points for the first purchase and for today are added
//   if they are missing.
// - The average price series is null before the first purchase, starts at the
//   first purchase and runs to today. Rows without an item in `historicalData`
//   carry the previous average price forward. An average price of 0 (e.g. sold
//   out) is kept as null.
export function getOwnManualAssetChartSeries({
  averagePrice,
  dateOfFirstActivity,
  historicalData,
  marketData,
  now
}: {
  averagePrice: number;
  dateOfFirstActivity: Date | undefined;
  historicalData: Pick<HistoricalDataItem, 'averagePrice' | 'date'>[];
  marketData: Pick<MarketData, 'date' | 'marketPrice'>[];
  now: Date;
}): {
  benchmarkDataItems: NullableLineChartItem[];
  historicalDataItems: LineChartItem[];
} {
  const storedPriceByDate = new Map<string, number>();

  for (const { date, marketPrice } of marketData) {
    storedPriceByDate.set(format(date, DATE_FORMAT), marketPrice);
  }

  const todayKey = format(now, DATE_FORMAT);

  const purchaseKey =
    dateOfFirstActivity && !Number.isNaN(dateOfFirstActivity.getTime())
      ? format(dateOfFirstActivity, DATE_FORMAT)
      : undefined;

  if (!dateOfFirstActivity || !purchaseKey || purchaseKey > todayKey) {
    // Without a (valid) first purchase there is no average price line
    const storedItems = [...storedPriceByDate.entries()]
      .sort(([a], [b]) => {
        return a < b ? -1 : a > b ? 1 : 0;
      })
      .map(([date, value]) => {
        return { date, value };
      });

    return {
      benchmarkDataItems: storedItems.map(({ date }) => {
        return { date, value: null };
      }),
      historicalDataItems: storedItems
    };
  }

  const averagePriceByDate = new Map<string, number>();

  for (const { averagePrice: itemAveragePrice, date } of historicalData) {
    if (isNumber(itemAveragePrice)) {
      averagePriceByDate.set(
        format(parseISO(date), DATE_FORMAT),
        itemAveragePrice
      );
    }
  }

  const keys = [
    ...new Set([...storedPriceByDate.keys(), purchaseKey, todayKey])
  ].sort();

  // Start value of the average price line, if there is no item at the first
  // purchase: next known average price, otherwise the current average price
  const firstAveragePriceKey = [...averagePriceByDate.keys()]
    .sort()
    .find((key) => {
      return key >= purchaseKey;
    });

  let lastAveragePrice: number | null =
    firstAveragePriceKey === undefined
      ? averagePrice
      : (averagePriceByDate.get(firstAveragePriceKey) ?? null);

  if (lastAveragePrice === 0) {
    lastAveragePrice = null;
  }

  let lastMarketPrice: number | undefined;

  const benchmarkDataItems: NullableLineChartItem[] = [];
  const historicalDataItems: LineChartItem[] = [];

  for (const key of keys) {
    let benchmarkValue: number | null = null;

    if (key >= purchaseKey) {
      const itemAveragePrice = averagePriceByDate.get(key);

      if (itemAveragePrice !== undefined) {
        lastAveragePrice = itemAveragePrice === 0 ? null : itemAveragePrice;
      }

      benchmarkValue = lastAveragePrice;
    }

    const storedPrice = storedPriceByDate.get(key);

    if (storedPrice !== undefined) {
      lastMarketPrice = storedPrice;
    }

    benchmarkDataItems.push({ date: key, value: benchmarkValue });

    historicalDataItems.push({
      date: key,
      value: storedPrice ?? lastMarketPrice ?? benchmarkValue ?? averagePrice
    });
  }

  if (purchaseKey === todayKey) {
    // Replace the single point of today by two points to get a visible line
    const todayIndex = keys.indexOf(todayKey);

    const marketPriceOfToday =
      storedPriceByDate.get(todayKey) ??
      historicalDataItems[todayIndex - 1]?.value ??
      averagePrice;

    benchmarkDataItems.splice(
      todayIndex,
      1,
      { date: dateOfFirstActivity.toISOString(), value: averagePrice },
      { date: now.toISOString(), value: averagePrice }
    );

    historicalDataItems.splice(
      todayIndex,
      1,
      { date: dateOfFirstActivity.toISOString(), value: averagePrice },
      { date: now.toISOString(), value: marketPriceOfToday }
    );
  }

  return { benchmarkDataItems, historicalDataItems };
}
