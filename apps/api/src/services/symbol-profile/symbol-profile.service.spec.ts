import { BadRequestException } from '@nestjs/common';

import { SymbolProfileService } from './symbol-profile.service';

describe('SymbolProfileService', () => {
  let prismaService: { symbolProfile: { create: jest.Mock } };
  let symbolProfileService: SymbolProfileService;

  beforeEach(() => {
    prismaService = {
      symbolProfile: { create: jest.fn().mockResolvedValue({}) }
    };

    symbolProfileService = new SymbolProfileService(prismaService as any); // ts-escape-ok: partial mock of PrismaService
  });

  describe('add', () => {
    const base = {
      currency: 'USD',
      dataSource: 'YAHOO' as const,
      name: 'Apple',
      symbol: 'AAPL'
    };

    it.each([60, 1.01, -0.01])(
      'rejects a country weight of %s without persisting',
      async (weight) => {
        await expect(
          symbolProfileService.add({
            ...base,
            countries: [{ code: 'US', weight }]
          })
        ).rejects.toThrow(BadRequestException);

        await expect(
          symbolProfileService.add({
            ...base,
            countries: [{ code: 'US', weight }]
          })
        ).rejects.toThrow('between 0 and 1');

        expect(prismaService.symbolProfile.create).not.toHaveBeenCalled();
      }
    );

    it.each([0, 0.6, 1])(
      'persists a country weight of %s unchanged',
      async (weight) => {
        const data = { ...base, countries: [{ code: 'US', weight }] };

        await symbolProfileService.add(data);

        expect(prismaService.symbolProfile.create).toHaveBeenCalledWith({
          data
        });
      }
    );

    it('persists a profile without countries', async () => {
      await symbolProfileService.add(base);

      expect(prismaService.symbolProfile.create).toHaveBeenCalledWith({
        data: base
      });
    });
  });
});
