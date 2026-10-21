import { AdminService } from './admin.service';

describe('AdminService', () => {
  describe('repairCountryWeights', () => {
    let symbolProfiles: any[];
    let overrides: any[];
    let prismaService: any;
    let adminService: AdminService;

    beforeEach(() => {
      symbolProfiles = [
        {
          countries: [
            { code: 'US', weight: 60 },
            { code: 'DE', weight: 40 }
          ],
          dataSource: 'YAHOO',
          id: 'sp-1',
          symbol: 'AAA'
        },
        {
          countries: [{ code: 'US', weight: 1 }],
          dataSource: 'YAHOO',
          id: 'sp-2',
          symbol: 'BBB'
        },
        { countries: null, dataSource: 'YAHOO', id: 'sp-3', symbol: 'CCC' },
        {
          countries: [{ code: 'US', weight: 150 }],
          dataSource: 'YAHOO',
          id: 'sp-4',
          symbol: 'DDD'
        }
      ];

      overrides = [
        {
          countries: [{ code: 'FR', weight: 100 }],
          symbolProfile: { dataSource: 'MANUAL', symbol: 'EEE' },
          symbolProfileId: 'sp-5'
        },
        {
          countries: [{ code: 'FR', weight: 0.5 }],
          symbolProfile: { dataSource: 'MANUAL', symbol: 'FFF' },
          symbolProfileId: 'sp-6'
        }
      ];

      prismaService = {
        assetProfileOverrides: {
          findMany: jest.fn().mockImplementation(async () => overrides),
          updateMany: jest
            .fn()
            .mockImplementation(async ({ data, where }: any) => {
              const row = overrides.find(({ symbolProfileId }) => {
                return symbolProfileId === where.symbolProfileId;
              });

              row.countries = data.countries;

              return { count: 1 };
            })
        },
        symbolProfile: {
          findMany: jest.fn().mockImplementation(async () => symbolProfiles),
          updateMany: jest
            .fn()
            .mockImplementation(async ({ data, where }: any) => {
              const row = symbolProfiles.find(({ id }) => {
                return id === where.id;
              });

              row.countries = data.countries;

              return { count: 1 };
            })
        }
      };

      // Positional constructor: prismaService is the 7th dependency
      adminService = new AdminService(
        null,
        null,
        null,
        null,
        null,
        null,
        prismaService,
        null,
        null
      );
    });

    it('should scan both stores and write only repaired rows with compare-and-set', async () => {
      const report = await adminService.repairCountryWeights({
        dryRun: false
      });

      expect(prismaService.symbolProfile.findMany).toHaveBeenCalledTimes(1);
      expect(prismaService.assetProfileOverrides.findMany).toHaveBeenCalledTimes(
        1
      );

      expect(prismaService.symbolProfile.updateMany).toHaveBeenCalledTimes(1);
      expect(prismaService.symbolProfile.updateMany).toHaveBeenCalledWith({
        data: {
          countries: [
            { code: 'US', weight: 0.6 },
            { code: 'DE', weight: 0.4 }
          ]
        },
        where: {
          countries: {
            equals: [
              { code: 'US', weight: 60 },
              { code: 'DE', weight: 40 }
            ]
          },
          id: 'sp-1'
        }
      });

      expect(prismaService.assetProfileOverrides.updateMany).toHaveBeenCalledTimes(
        1
      );
      expect(prismaService.assetProfileOverrides.updateMany).toHaveBeenCalledWith(
        {
          data: { countries: [{ code: 'FR', weight: 1 }] },
          where: {
            countries: { equals: [{ code: 'FR', weight: 100 }] },
            symbolProfileId: 'sp-5'
          }
        }
      );

      expect(report.dryRun).toBe(false);
      expect(report.repaired).toEqual([
        {
          after: [
            { code: 'US', weight: 0.6 },
            { code: 'DE', weight: 0.4 }
          ],
          before: [
            { code: 'US', weight: 60 },
            { code: 'DE', weight: 40 }
          ],
          dataSource: 'YAHOO',
          store: 'SymbolProfile',
          symbol: 'AAA'
        },
        {
          after: [{ code: 'FR', weight: 1 }],
          before: [{ code: 'FR', weight: 100 }],
          dataSource: 'MANUAL',
          store: 'AssetProfileOverrides',
          symbol: 'EEE'
        }
      ]);
      expect(report.skipped).toEqual([
        {
          before: [{ code: 'US', weight: 150 }],
          dataSource: 'YAHOO',
          reason: 'weight is above 100',
          store: 'SymbolProfile',
          symbol: 'DDD'
        }
      ]);
    });

    it('should write nothing in dry-run mode but return the same repaired list', async () => {
      const dryRunReport = await adminService.repairCountryWeights({
        dryRun: true
      });

      expect(prismaService.symbolProfile.updateMany).not.toHaveBeenCalled();
      expect(
        prismaService.assetProfileOverrides.updateMany
      ).not.toHaveBeenCalled();

      const report = await adminService.repairCountryWeights({ dryRun: false });

      expect(dryRunReport.dryRun).toBe(true);
      expect(dryRunReport.repaired).toEqual(report.repaired);
      expect(dryRunReport.skipped).toEqual(report.skipped);
    });

    it('should default to dry-run', async () => {
      const report = await adminService.repairCountryWeights();

      expect(report.dryRun).toBe(true);
      expect(prismaService.symbolProfile.updateMany).not.toHaveBeenCalled();
    });

    it('should be idempotent: a second run reports nothing repaired and writes nothing', async () => {
      await adminService.repairCountryWeights({ dryRun: false });

      prismaService.symbolProfile.updateMany.mockClear();
      prismaService.assetProfileOverrides.updateMany.mockClear();

      const report = await adminService.repairCountryWeights({
        dryRun: false
      });

      expect(report.repaired).toEqual([]);
      expect(prismaService.symbolProfile.updateMany).not.toHaveBeenCalled();
      expect(
        prismaService.assetProfileOverrides.updateMany
      ).not.toHaveBeenCalled();
    });

    it('should report a row as skipped when the compare-and-set update count is 0', async () => {
      prismaService.symbolProfile.updateMany.mockResolvedValue({ count: 0 });

      const report = await adminService.repairCountryWeights({
        dryRun: false
      });

      expect(
        report.repaired.find(({ symbol }) => {
          return symbol === 'AAA';
        })
      ).toBeUndefined();
      expect(report.skipped).toContainEqual({
        before: [
          { code: 'US', weight: 60 },
          { code: 'DE', weight: 40 }
        ],
        dataSource: 'YAHOO',
        reason: 'row changed concurrently, not written',
        store: 'SymbolProfile',
        symbol: 'AAA'
      });
    });
  });
});
