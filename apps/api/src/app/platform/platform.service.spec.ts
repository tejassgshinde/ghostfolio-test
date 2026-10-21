import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';

import { PlatformService } from './platform.service';

describe('PlatformService', () => {
  let findMany: jest.Mock;
  let platformService: PlatformService;

  beforeEach(() => {
    findMany = jest.fn().mockResolvedValue([
      {
        _count: { accounts: 3 },
        id: 'platform-id',
        name: 'Platform',
        url: 'https://x.y'
      }
    ]);

    platformService = new PlatformService({
      platform: { findMany }
    } as unknown as PrismaService);
  });

  describe('getPlatformsWithAccountCount', () => {
    it('passes no order when called without arguments', async () => {
      const platforms = await platformService.getPlatformsWithAccountCount();

      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: undefined })
      );
      expect(platforms).toEqual([
        {
          accountCount: 3,
          id: 'platform-id',
          name: 'Platform',
          url: 'https://x.y'
        }
      ]);
    });

    it('forwards the given order', async () => {
      await platformService.getPlatformsWithAccountCount({
        orderBy: { name: 'asc' }
      });

      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { name: 'asc' } })
      );
    });
  });
});
