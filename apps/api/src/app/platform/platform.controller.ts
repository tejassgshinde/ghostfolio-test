import { AllowDuringImpersonation } from '@ghostfolio/api/decorators/allow-during-impersonation.decorator';
import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';
import { HasPermissionGuard } from '@ghostfolio/api/guards/has-permission.guard';
import { CreatePlatformDto, UpdatePlatformDto } from '@ghostfolio/common/dtos';
import { permissions } from '@ghostfolio/common/permissions';

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  Param,
  Post,
  Put,
  UseGuards
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Platform } from '@prisma/client';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

import { PlatformService } from './platform.service';

@AllowDuringImpersonation()
@Controller('platform')
export class PlatformController {
  public constructor(private readonly platformService: PlatformService) {}

  /**
   * @deprecated Use `GET /api/v1/platforms` instead
   */
  @Get()
  @HasPermission(permissions.readPlatformsWithAccountCount)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async getPlatforms() {
    return this.platformService.getPlatformsWithAccountCount();
  }

  /**
   * @deprecated Use `POST /api/v1/platforms` instead
   */
  @HasPermission(permissions.createPlatform)
  @Post()
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async createPlatform(
    @Body() data: CreatePlatformDto
  ): Promise<Platform> {
    return this.platformService.createPlatform(data);
  }

  /**
   * @deprecated Use `PUT /api/v1/platforms/:id` instead
   */
  @HasPermission(permissions.updatePlatform)
  @Put(':id')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async updatePlatform(
    @Param('id') id: string,
    @Body() data: UpdatePlatformDto
  ) {
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

  /**
   * @deprecated Use `DELETE /api/v1/platforms/:id` instead
   */
  @Delete(':id')
  @HasPermission(permissions.deletePlatform)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async deletePlatform(@Param('id') id: string) {
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
