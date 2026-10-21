import { IsISO31661Alpha2, IsNumber, Max, Min } from 'class-validator';

const WEIGHT_RANGE_MESSAGE = '$property must be between 0 and 1';

export class CountryDto {
  @IsISO31661Alpha2()
  code: string;

  @IsNumber()
  @Max(1, { message: WEIGHT_RANGE_MESSAGE })
  @Min(0, { message: WEIGHT_RANGE_MESSAGE })
  weight: number;
}
