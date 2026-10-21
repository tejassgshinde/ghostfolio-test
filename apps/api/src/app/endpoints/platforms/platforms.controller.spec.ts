import { PlatformService } from '@ghostfolio/api/app/platform/platform.service';
import { ALLOW_DURING_IMPERSONATION_KEY } from '@ghostfolio/api/decorators/allow-during-impersonation.decorator';
import { HAS_PERMISSION_KEY } from '@ghostfolio/api/decorators/has-permission.decorator';
import { getPermissions, permissions } from '@ghostfolio/common/permissions';
import type { RequestWithUser } from '@ghostfolio/common/types';

import { HttpException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { StatusCodes } from 'http-status-codes';

import { PlatformsController } from './platforms.controller';

describe('PlatformsController', () => {
  const platform = { id: 'platform-id', name: 'Platform', url: 'https://x.y' };

  let platformService: jest.Mocked<
    Pick<
      PlatformService,
      | 'createPlatform'
      | 'deletePlatform'
      | 'getPlatform'
      | 'getPlatforms'
      | 'getPlatformsWithAccountCount'
      | 'updatePlatform'
    >
  >;

  function createController(role: 'ADMIN' | 'DEMO' | 'USER') {
    return new PlatformsController(
      platformService as unknown as PlatformService,
      { user: { permissions: getPermissions(role) } } as RequestWithUser
    );
  }

  beforeEach(() => {
    platformService = {
      createPlatform: jest.fn().mockResolvedValue(platform),
      deletePlatform: jest.fn().mockResolvedValue(platform),
      getPlatform: jest.fn().mockResolvedValue(platform),
      getPlatforms: jest.fn().mockResolvedValue([platform]),
      getPlatformsWithAccountCount: jest
        .fn()
        .mockResolvedValue([{ ...platform, accountCount: 2 }]),
      updatePlatform: jest.fn().mockResolvedValue(platform)
    };
  });

  describe('metadata', () => {
    it.each([
      ['getPlatforms', permissions.readPlatforms],
      ['createPlatform', permissions.createPlatform],
      ['updatePlatform', permissions.updatePlatform],
      ['deletePlatform', permissions.deletePlatform]
    ] as const)('%s requires %s and is guarded', (handler, permission) => {
      const method = PlatformsController.prototype[handler];

      expect(Reflect.getMetadata(HAS_PERMISSION_KEY, method)).toBe(permission);
      expect(Reflect.getMetadata(GUARDS_METADATA, method)).toBeDefined();
    });

    it('allows during impersonation on the class', () => {
      expect(
        Reflect.getMetadata(ALLOW_DURING_IMPERSONATION_KEY, PlatformsController)
      ).toBe(true);
    });
  });

  describe('getPlatforms', () => {
    it('returns platforms with account count for admins', async () => {
      const response = await createController('ADMIN').getPlatforms();

      expect(
        platformService.getPlatformsWithAccountCount
      ).toHaveBeenCalledWith({ orderBy: { name: 'asc' } });
      expect(platformService.getPlatforms).not.toHaveBeenCalled();
      expect(response).toEqual({
        platforms: [{ ...platform, accountCount: 2 }]
      });
    });

    it('returns platforms without account count for users', async () => {
      const response = await createController('USER').getPlatforms();

      expect(platformService.getPlatforms).toHaveBeenCalledWith({
        orderBy: { name: 'asc' }
      });
      expect(
        platformService.getPlatformsWithAccountCount
      ).not.toHaveBeenCalled();
      expect(response).toEqual({ platforms: [platform] });
      expect(response.platforms[0]).not.toHaveProperty('accountCount');
    });
  });

  describe('createPlatform', () => {
    it('returns the service result', async () => {
      const data = { name: 'Platform', url: 'https://x.y' };

      await expect(
        createController('ADMIN').createPlatform(data)
      ).resolves.toBe(platform);
      expect(platformService.createPlatform).toHaveBeenCalledWith(data);
    });
  });

  describe('updatePlatform', () => {
    it('returns the service result', async () => {
      const data = { name: 'Platform', url: 'https://x.y' };

      await expect(
        createController('ADMIN').updatePlatform(platform.id, data)
      ).resolves.toBe(platform);
      expect(platformService.updatePlatform).toHaveBeenCalledWith({
        data,
        where: { id: platform.id }
      });
    });

    it('throws 403 if the platform does not exist', async () => {
      platformService.getPlatform.mockResolvedValue(null);

      const promise = createController('ADMIN').updatePlatform('missing', {
        name: 'Platform',
        url: 'https://x.y'
      });

      await expect(promise).rejects.toBeInstanceOf(HttpException);
      await expect(promise).rejects.toMatchObject({
        status: StatusCodes.FORBIDDEN
      });
      expect(platformService.updatePlatform).not.toHaveBeenCalled();
    });
  });

  describe('deletePlatform', () => {
    it('returns the service result', async () => {
      await expect(
        createController('ADMIN').deletePlatform(platform.id)
      ).resolves.toBe(platform);
      expect(platformService.deletePlatform).toHaveBeenCalledWith({
        id: platform.id
      });
    });

    it('throws 403 if the platform does not exist', async () => {
      platformService.getPlatform.mockResolvedValue(null);

      const promise = createController('ADMIN').deletePlatform('missing');

      await expect(promise).rejects.toBeInstanceOf(HttpException);
      await expect(promise).rejects.toMatchObject({
        status: StatusCodes.FORBIDDEN
      });
      expect(platformService.deletePlatform).not.toHaveBeenCalled();
    });
  });
});
