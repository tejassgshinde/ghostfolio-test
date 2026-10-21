/**
 * @jest-environment <rootDir>/jest-environment-tz.js
 * @jest-environment-options {"timeZone": "UTC"}
 */
import { MarketDataService } from '@ghostfolio/api/services/market-data/market-data.service';
import { SymbolProfileService } from '@ghostfolio/api/services/symbol-profile/symbol-profile.service';
import { UpdateBulkMarketDataDto } from '@ghostfolio/common/dtos';
import { permissions } from '@ghostfolio/common/permissions';
import type { RequestWithUser } from '@ghostfolio/common/types';

import { DataSource } from '@prisma/client';

import { MarketDataController } from './market-data.controller';

describe('MarketDataController in UTC', () => {
  let marketDataController: MarketDataController;
  let updateMany: jest.Mock;

  beforeEach(() => {
    updateMany = jest.fn().mockResolvedValue(undefined);

    marketDataController = new MarketDataController(
      { updateMany } as unknown as MarketDataService,
      {
        user: {
          id: 'user-id',
          permissions: [
            permissions.createMarketData,
            permissions.updateMarketData
          ]
        }
      } as unknown as RequestWithUser,
      {
        getSymbolProfiles: jest.fn().mockResolvedValue([{ userId: 'user-id' }])
      } as unknown as SymbolProfileService,
      null
    );
  });

  const updateMarketData = (
    marketData: UpdateBulkMarketDataDto['marketData']
  ) =>
    marketDataController.updateMarketData(
      { marketData },
      DataSource.MANUAL,
      'my-asset'
    );

  it('runs in the expected time zone', () => {
    // Guards against the test passing silently in the wrong time zone
    expect(new Date(2024, 0, 5).getTimezoneOffset()).toBe(0);
  });

  it('stores a date-only value at midnight (UTC)', async () => {
    await updateMarketData([{ date: '2024-01-05', marketPrice: 100 }]);

    expect(updateMany).toHaveBeenCalledTimes(1);

    const { data } = updateMany.mock.calls[0][0];

    expect(data).toHaveLength(1);
    expect((data[0].date as Date).toISOString()).toBe(
      '2024-01-05T00:00:00.000Z'
    );
    expect(data[0].marketPrice).toBe(100);
    expect(data[0].state).toBe('CLOSE');
  });

  it('stores the same date-only value on the same day when saved again', async () => {
    await updateMarketData([{ date: '2024-01-05', marketPrice: 100 }]);
    await updateMarketData([{ date: '2024-01-05', marketPrice: 110 }]);

    const [first, second] = updateMany.mock.calls.map(
      ([{ data }]) => data[0].date as Date
    );

    expect(first.toISOString()).toBe('2024-01-05T00:00:00.000Z');
    expect(second.getTime()).toBe(first.getTime());
  });

  it('keeps every row on its entered date across a year boundary', async () => {
    await updateMarketData([
      { date: '2024-01-05', marketPrice: 100 },
      { date: '2024-12-31', marketPrice: 200 }
    ]);

    const { data } = updateMany.mock.calls[0][0];

    expect(data.map(({ date }: { date: Date }) => date.toISOString())).toEqual([
      '2024-01-05T00:00:00.000Z',
      '2024-12-31T00:00:00.000Z'
    ]);
  });
});
