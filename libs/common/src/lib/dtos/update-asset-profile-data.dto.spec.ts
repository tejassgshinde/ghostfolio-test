import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { CreateAssetProfileDto } from './create-asset-profile.dto';
import { UpdateAssetProfileDataDto } from './update-asset-profile-data.dto';
import { UpdateAssetProfileDto } from './update-asset-profile.dto';

const RANGE_MESSAGE = 'must be between 0 and 1';

function collectConstraintMessages(
  errors: Awaited<ReturnType<typeof validate>>
): string[] {
  return errors.flatMap(({ children, constraints }) => [
    ...Object.values(constraints ?? {}),
    ...collectConstraintMessages(children ?? [])
  ]);
}

async function validateData(body: unknown) {
  const dto = plainToInstance(UpdateAssetProfileDataDto, body);

  return validate(dto, { forbidNonWhitelisted: true, whitelist: true });
}

describe('UpdateAssetProfileDataDto', () => {
  it.each([1.01, -0.01, 60])('rejects weight %p', async (weight) => {
    const errors = await validateData({ countries: [{ code: 'US', weight }] });

    expect(errors).toHaveLength(1);
    expect(
      collectConstraintMessages(errors).some((message) =>
        message.includes(RANGE_MESSAGE)
      )
    ).toBe(true);
  });

  it.each([0, 1, 0.5])('accepts weight %p', async (weight) => {
    const errors = await validateData({ countries: [{ code: 'US', weight }] });

    expect(errors).toHaveLength(0);
  });

  it('rejects a non-ISO country code', async () => {
    const errors = await validateData({
      countries: [{ code: 'USA', weight: 0.5 }]
    });

    expect(errors).toHaveLength(1);
  });

  it('rejects a string weight', async () => {
    const errors = await validateData({
      countries: [{ code: 'US', weight: '0.5' }]
    });

    expect(errors).toHaveLength(1);
  });

  it('accepts omitted countries', async () => {
    const errors = await validateData({});

    expect(errors).toHaveLength(0);
  });

  it('rejects out-of-range weight via ValidationPipe with the path in the message', async () => {
    const pipe = new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true
    });

    let error: BadRequestException;

    try {
      await pipe.transform(
        { countries: [{ code: 'US', weight: 60 }] },
        { metatype: UpdateAssetProfileDataDto, type: 'body' }
      );
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(BadRequestException);
    expect((error.getResponse() as { message: string[] }).message).toContain(
      `countries.0.weight ${RANGE_MESSAGE}`
    );
  });
});

describe('UpdateAssetProfileDto and CreateAssetProfileDto', () => {
  it('UpdateAssetProfileDto rejects weight 60', async () => {
    const errors = await validate(
      plainToInstance(UpdateAssetProfileDto, {
        countries: [{ code: 'US', weight: 60 }]
      })
    );

    expect(
      collectConstraintMessages(errors).some((message) =>
        message.includes(RANGE_MESSAGE)
      )
    ).toBe(true);
  });

  it('CreateAssetProfileDto rejects weight 60', async () => {
    const errors = await validate(
      plainToInstance(CreateAssetProfileDto, {
        countries: [{ code: 'US', weight: 60 }],
        currency: 'USD',
        dataSource: 'YAHOO',
        symbol: 'TEST'
      })
    );

    expect(
      collectConstraintMessages(errors).some((message) =>
        message.includes(RANGE_MESSAGE)
      )
    ).toBe(true);
  });
});
