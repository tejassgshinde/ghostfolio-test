import {
  activityDummyData,
  assetProfileDummyData,
  loadExportFile,
  userDummyData
} from '@ghostfolio/api/app/portfolio/calculator/portfolio-calculator-test-utils';
import { PortfolioCalculatorFactory } from '@ghostfolio/api/app/portfolio/calculator/portfolio-calculator.factory';
import { CurrentRateService } from '@ghostfolio/api/app/portfolio/current-rate.service';
import { CurrentRateServiceMock } from '@ghostfolio/api/app/portfolio/current-rate.service.mock';
import { RedisCacheService } from '@ghostfolio/api/app/redis-cache/redis-cache.service';
import { RedisCacheServiceMock } from '@ghostfolio/api/app/redis-cache/redis-cache.service.mock';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { ExchangeRateDataServiceMock } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service.mock';
import { PortfolioSnapshotService } from '@ghostfolio/api/services/queues/portfolio-snapshot/portfolio-snapshot.service';
import { PortfolioSnapshotServiceMock } from '@ghostfolio/api/services/queues/portfolio-snapshot/portfolio-snapshot.service.mock';
import { parseDate } from '@ghostfolio/common/helper';
import { Activity, ExportResponse } from '@ghostfolio/common/interfaces';
import { PerformanceCalculationType } from '@ghostfolio/common/types/performance-calculation-type.type';

import { join } from 'node:path';

jest.mock('@ghostfolio/api/app/portfolio/current-rate.service', () => {
  return {
    CurrentRateService: jest.fn().mockImplementation(() => {
      return CurrentRateServiceMock;
    })
  };
});

jest.mock(
  '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service',
  () => {
    return {
      ExchangeRateDataService: jest.fn().mockImplementation(() => {
        return ExchangeRateDataServiceMock;
      })
    };
  }
);

jest.mock(
  '@ghostfolio/api/services/queues/portfolio-snapshot/portfolio-snapshot.service',
  () => {
    return {
      PortfolioSnapshotService: jest.fn().mockImplementation(() => {
        return PortfolioSnapshotServiceMock;
      })
    };
  }
);

jest.mock('@ghostfolio/api/app/redis-cache/redis-cache.service', () => {
  return {
    RedisCacheService: jest.fn().mockImplementation(() => {
      return RedisCacheServiceMock;
    })
  };
});

describe('PortfolioCalculator', () => {
  let exportResponse: ExportResponse;

  let configurationService: ConfigurationService;
  let currentRateService: CurrentRateService;
  let exchangeRateDataService: ExchangeRateDataService;
  let portfolioCalculatorFactory: PortfolioCalculatorFactory;
  let portfolioSnapshotService: PortfolioSnapshotService;
  let redisCacheService: RedisCacheService;

  beforeAll(() => {
    exportResponse = loadExportFile(
      join(__dirname, '../../../../../../../test/import/ok/btceur.json')
    );
  });

  beforeEach(() => {
    PortfolioSnapshotServiceMock.reset();
    RedisCacheServiceMock.reset();

    configurationService = new ConfigurationService();

    currentRateService = new CurrentRateService(null, null, null);

    exchangeRateDataService = new ExchangeRateDataService(
      null,
      null,
      null,
      null
    );

    portfolioSnapshotService = new PortfolioSnapshotService(null, null);

    redisCacheService = new RedisCacheService(null, null);

    portfolioCalculatorFactory = new PortfolioCalculatorFactory(
      configurationService,
      currentRateService,
      exchangeRateDataService,
      portfolioSnapshotService,
      redisCacheService
    );
  });

  describe('get current positions', () => {
    it('skips activities with a missing exchange rate', async () => {
      jest.useFakeTimers().setSystemTime(parseDate('2022-01-14').getTime());

      const validActivities: Activity[] = exportResponse.activities.map(
        (activity) => ({
          ...activityDummyData,
          assetProfile: {
            ...assetProfileDummyData,
            currency: 'USD',
            dataSource: activity.dataSource,
            name: 'Bitcoin',
            symbol: activity.symbol
          },
          ...activity,
          date: parseDate(activity.date),
          feeInAssetProfileCurrency: 4.46,
          feeInBaseCurrency: 3.94,
          unitPriceInAssetProfileCurrency: 44558.42
        })
      );

      // Earlier activity whose converted amounts are undefined, e.g. because
      // no exchange rate has been found
      const activityWithMissingExchangeRate = {
        ...validActivities[0],
        date: parseDate('2021-04-15'),
        feeInBaseCurrency: undefined,
        unitPriceInAssetProfileCurrency: undefined
      } as unknown as Activity;

      const expectedSnapshot = await portfolioCalculatorFactory
        .createCalculator({
          activities: validActivities,
          calculationType: PerformanceCalculationType.ROAI,
          currency: 'EUR',
          userId: userDummyData.id
        })
        .computeSnapshot();

      let portfolioCalculator: ReturnType<
        PortfolioCalculatorFactory['createCalculator']
      >;

      expect(() => {
        portfolioCalculator = portfolioCalculatorFactory.createCalculator({
          activities: [activityWithMissingExchangeRate, ...validActivities],
          calculationType: PerformanceCalculationType.ROAI,
          currency: 'EUR',
          userId: userDummyData.id
        });
      }).not.toThrow();

      const portfolioSnapshot = await portfolioCalculator.computeSnapshot();

      expect(portfolioSnapshot.totalInvestment).toEqual(
        expectedSnapshot.totalInvestment
      );
      expect(portfolioSnapshot.positions).toHaveLength(
        expectedSnapshot.positions.length
      );
      expect(portfolioSnapshot.positions.map(({ symbol }) => symbol)).toEqual(
        expectedSnapshot.positions.map(({ symbol }) => symbol)
      );
      expect(portfolioSnapshot.historicalData[0].date).toEqual(
        expectedSnapshot.historicalData[0].date
      );
    });
  });
});
