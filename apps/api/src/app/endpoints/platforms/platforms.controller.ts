import { PlatformService } from '@ghostfolio/api/app/platform/platform.service';
import { AllowDuringImpersonation } from '@ghostfolio/api/decorators/allow-during-impersonation.decorator';
import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';
import { HasPermissionGuard } from '@ghostfolio/api/guards/has-permission.guard';
import { CreatePlatformDto, UpdatePlatformDto } from '@ghostfolio/common/dtos';
import { PlatformsResponse } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import type { RequestWithUser } from '@ghostfolio/common/types';

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  Inject,
  Param,
  Post,
  Put,
  UseGuards
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Platform } from '@prisma/client';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

@AllowDuringImpersonation()
@Controller('platforms')
export class PlatformsController {
  public constructor(
    private readonly platformService: PlatformService,
    @Inject(REQUEST) private readonly request: RequestWithUser
  ) {}

  @Get()
  @HasPermission(permissions.readPlatforms)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async getPlatforms(): Promise<PlatformsResponse> {
    if (
      hasPermission(
        this.request.user.permissions,
        permissions.readPlatformsWithAccountCount
      )
    ) {
      const platforms = await this.platformService.getPlatformsWithAccountCount(
        { orderBy: { name: 'asc' } }
      );

      return { platforms };
    }

    const platforms = await this.platformService.getPlatforms({
      orderBy: { name: 'asc' }
    });

    return { platforms };
  }

  @HasPermission(permissions.createPlatform)
  @Post()
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async createPlatform(
    @Body() data: CreatePlatformDto
  ): Promise<Platform> {
    return this.platformService.createPlatform(data);
  }

  @HasPermission(permissions.updatePlatform)
  @Put(':id')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async updatePlatform(
    @Param('id') id: string,
    @Body() data: UpdatePlatformDto
  ): Promise<Platform> {
    const originalPlatform = await this.platformService.getPlatform({
      id
    });

    if (!originalPlatform) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    return this.platformService.updatePlatform({
      data: {
        ...data
      },
      where: {
        id
      }
    });
  }

  @Delete(':id')
  @HasPermission(permissions.deletePlatform)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async deletePlatform(@Param('id') id: string): Promise<Platform> {
    const originalPlatform = await this.platformService.getPlatform({
      id
    });

    if (!originalPlatform) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    return this.platformService.deletePlatform({ id });
  }
}
