import { AccountService } from '@ghostfolio/api/app/account/account.service';
import { ActivitiesService } from '@ghostfolio/api/app/activities/activities.service';
import {
  activityDummyData,
  assetProfileDummyData
} from '@ghostfolio/api/app/portfolio/calculator/portfolio-calculator-test-utils';
import { MarketDataService } from '@ghostfolio/api/services/market-data/market-data.service';
import { TagService } from '@ghostfolio/api/services/tag/tag.service';
import { Filter, UserSettings } from '@ghostfolio/common/interfaces';

import { DataSource } from '@prisma/client';

import { ExportService } from './export.service';

describe('ExportService', () => {
  const userSettings = { baseCurrency: 'USD' } as UserSettings;

  let accounts: jest.Mock;
  let exportService: ExportService;
  let getActivities: jest.Mock;
  let getTagsForUser: jest.Mock;
  let marketDataItems: jest.Mock;

  beforeEach(() => {
    accounts = jest.fn().mockResolvedValue([]);
    getActivities = jest.fn().mockResolvedValue({ activities: [], count: 0 });
    getTagsForUser = jest.fn().mockResolvedValue([]);
    marketDataItems = jest.fn().mockResolvedValue([]);

    exportService = new ExportService(
      { accounts } as unknown as AccountService, // ts-escape-ok: partial mock, only accounts is used
      { getActivities } as unknown as ActivitiesService, // ts-escape-ok: partial mock, only getActivities is used
      { marketDataItems } as unknown as MarketDataService, // ts-escape-ok: partial mock, only marketDataItems is used
      { getTagsForUser } as unknown as TagService // ts-escape-ok: partial mock, only getTagsForUser is used
    );
  });

  describe('export', () => {
    it('exports a large number of activities of an account in the order returned', async () => {
      const filters: Filter[] = [{ id: 'account-a', type: 'ACCOUNT' }];
      const activities = Array.from({ length: 2500 }, (_, index) => {
        return createActivity({
          accountId: 'account-a',
          date: new Date(Date.UTC(2020, 0, 1) + index * 60_000),
          id: `activity-${index}`
        });
      });

      accounts.mockResolvedValue([createAccount('account-a')]);
      getActivities.mockResolvedValue({
        activities,
        count: activities.length
      });

      const response = await exportService.export({
        filters,
        userSettings,
        userId: 'user-a'
      });

      expect(response.activities).toHaveLength(2500);
      expect(
        response.activities.map(({ id }) => {
          return id;
        })
      ).toEqual(
        activities.map(({ id }) => {
          return id;
        })
      );

      expect(getActivities).toHaveBeenCalledTimes(1);
      expect(getActivities).toHaveBeenCalledWith(
        expect.objectContaining({
          filters,
          includeDrafts: true,
          sortColumn: 'date',
          sortDirection: 'asc',
          userId: 'user-a',
          withExcludedAccountsAndActivities: true
        })
      );

      expect(
        response.accounts.map(({ id }) => {
          return id;
        })
      ).toEqual(['account-a']);
    });

    describe('user scoping', () => {
      it('scopes the accounts to the user and the account filter', async () => {
        await exportService.export({
          filters: [{ id: 'account-a', type: 'ACCOUNT' }],
          userSettings,
          userId: 'user-a'
        });

        expect(accounts).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { userId: 'user-a', id: { in: ['account-a'] } }
          })
        );
      });

      it('scopes the accounts to the user without an account filter', async () => {
        await exportService.export({ userSettings, userId: 'user-a' });

        expect(accounts).toHaveBeenCalledWith(
          expect.objectContaining({ where: { userId: 'user-a' } })
        );
      });

      it('requests the tags of the user', async () => {
        await exportService.export({ userSettings, userId: 'user-a' });

        expect(getTagsForUser).toHaveBeenCalledWith('user-a');
      });

      it('includes only custom asset profiles of the user', async () => {
        getActivities.mockResolvedValue({
          activities: [
            createActivity({
              accountId: 'account-a',
              assetProfile: {
                dataSource: DataSource.MANUAL,
                id: 'profile-a',
                symbol: 'SYMBOL-A',
                userId: 'user-a'
              },
              id: 'activity-a'
            }),
            createActivity({
              accountId: 'account-a',
              assetProfile: {
                dataSource: DataSource.MANUAL,
                id: 'profile-b',
                symbol: 'SYMBOL-B',
                userId: 'user-b'
              },
              id: 'activity-b'
            })
          ],
          count: 2
        });

        const response = await exportService.export({
          userSettings,
          userId: 'user-a'
        });

        expect(
          response.assetProfiles.map(({ symbol }) => {
            return symbol;
          })
        ).toEqual(['SYMBOL-A']);
        expect(marketDataItems).toHaveBeenCalledTimes(1);
        expect(marketDataItems).toHaveBeenCalledWith({
          where: { dataSource: DataSource.MANUAL, symbol: 'SYMBOL-A' }
        });
        expect(marketDataItems).not.toHaveBeenCalledWith({
          where: { dataSource: DataSource.MANUAL, symbol: 'SYMBOL-B' }
        });
      });
    });

    it('returns the same output for the activity IDs and the account filter of a small account', async () => {
      const activitiesOfAccount = [
        createActivity({
          accountId: 'account-a',
          date: new Date('2024-01-01T00:00:00.000Z'),
          id: 'activity-1'
        }),
        createActivity({
          accountId: 'account-a',
          date: new Date('2024-02-01T00:00:00.000Z'),
          id: 'activity-2'
        }),
        createActivity({
          accountId: 'account-a',
          date: new Date('2024-03-01T00:00:00.000Z'),
          id: 'activity-3'
        })
      ];
      const activityOfOtherAccount = createActivity({
        accountId: 'account-b',
        date: new Date('2024-01-15T00:00:00.000Z'),
        id: 'activity-4'
      });
      const allAccounts = [
        createAccount('account-a'),
        createAccount('account-b')
      ];

      accounts.mockImplementation(
        async ({
          where
        }: {
          where: { id?: { in: string[] }; userId: string };
        }) => {
          return where.id?.in
            ? allAccounts.filter(({ id }) => {
                return where.id.in.includes(id);
              })
            : allAccounts;
        }
      );

      // ID based export: all activities of the user are loaded and then selected by ID
      getActivities.mockResolvedValueOnce({
        activities: [...activitiesOfAccount, activityOfOtherAccount],
        count: 4
      });

      const responseByIds = await exportService.export({
        activityIds: activitiesOfAccount.map(({ id }) => {
          return id;
        }),
        userSettings,
        userId: 'user-a'
      });

      // Filter based export: only the activities of the account are loaded
      getActivities.mockResolvedValueOnce({
        activities: activitiesOfAccount,
        count: 3
      });

      const responseByFilter = await exportService.export({
        filters: [{ id: 'account-a', type: 'ACCOUNT' }],
        userSettings,
        userId: 'user-a'
      });

      expect(responseByIds.activities).toHaveLength(3);
      expect(responseByIds.accounts).toHaveLength(1);
      expect({
        ...responseByFilter,
        meta: { ...responseByFilter.meta, date: undefined }
      }).toEqual({
        ...responseByIds,
        meta: { ...responseByIds.meta, date: undefined }
      });
    });

    it('exports only the selected activities in date order for activity IDs', async () => {
      const activities = [1, 2, 3, 4, 5].map((index) => {
        return createActivity({
          accountId: 'account-a',
          date: new Date(Date.UTC(2024, index, 1)),
          id: `activity-${index}`
        });
      });

      accounts.mockResolvedValue([createAccount('account-a')]);
      getActivities.mockResolvedValue({
        activities,
        count: activities.length
      });

      const response = await exportService.export({
        activityIds: ['activity-4', 'activity-2'],
        userSettings,
        userId: 'user-a'
      });

      expect(
        response.activities.map(({ id }) => {
          return id;
        })
      ).toEqual(['activity-2', 'activity-4']);
    });
  });

  function createAccount(id: string) {
    return {
      id,
      balances: [],
      comment: null,
      currency: 'USD',
      name: id,
      platform: null,
      platformId: null,
      tags: []
    };
  }

  function createActivity({
    accountId,
    assetProfile = {},
    date = new Date('2024-01-01T00:00:00.000Z'),
    id
  }: {
    accountId: string;
    assetProfile?: Record<string, unknown>;
    date?: Date;
    id: string;
  }) {
    return {
      ...activityDummyData,
      accountId,
      date,
      id,
      assetProfile: {
        ...assetProfileDummyData,
        currency: 'USD',
        dataSource: DataSource.YAHOO,
        id: 'profile-aapl',
        name: 'Apple Inc.',
        symbol: 'AAPL',
        userId: undefined,
        ...assetProfile
      },
      comment: null,
      currency: 'USD',
      fee: 0,
      quantity: 1,
      tags: [],
      type: 'BUY',
      unitPrice: 100
    };
  }
});
