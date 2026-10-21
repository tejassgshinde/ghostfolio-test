import type { Prisma } from '@ghostfolio/prisma/browser';

import { Type } from 'class-transformer';
import { IsArray, IsOptional, ValidateNested } from 'class-validator';

import { CountryDto } from './country.dto';

export class UpdateAssetProfileDataDto {
  @IsArray()
  @IsOptional()
  @Type(() => CountryDto)
  @ValidateNested({ each: true })
  countries?: Prisma.InputJsonArray;

  @IsArray()
  @IsOptional()
  holdings?: Prisma.InputJsonArray;

  @IsArray()
  @IsOptional()
  sectors?: Prisma.InputJsonArray;
}
