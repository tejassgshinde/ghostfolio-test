import {
  TAG_ID_EMERGENCY_FUND,
  TAG_ID_EXCLUDE_FROM_ANALYSIS
} from '@ghostfolio/common/config';
import {
  canApplyFiltersToAccess,
  canUseCustomAssetProfileSymbol,
  extractNumberFromString,
  formatNumberForLocaleInput,
  getCountryCodeFromCurrency,
  getEmojiFlag,
  getHoldingName,
  getNumberFormatGroup,
  getStringOrNull,
  getStringOrUndefined,
  isAccountBalanceInFuture,
  isAccountExcluded,
  isCurrency,
  isCurrencySymbol,
  isDarkColorScheme,
  isSplitRatio,
  isValidAccountBalanceDate,
  isValidCurrencyCode,
  isValidCustomAssetProfileSymbol,
  isValidDateAfter1970,
  isValidGranteeOfAccess,
  parseNumberFromLocaleString,
  resolveUserSettings
} from '@ghostfolio/common/helper';
import { UserSettings } from '@ghostfolio/common/interfaces';

describe('Helper', () => {
  describe('Can apply filters to access', () => {
    it('An access of the model context protocol', () => {
      expect(canApplyFiltersToAccess({ type: 'MCP' })).toEqual(false);
    });

    it('A private access', () => {
      expect(canApplyFiltersToAccess({ type: 'PRIVATE' })).toEqual(false);
    });

    it('A public access', () => {
      expect(canApplyFiltersToAccess({ type: 'PUBLIC' })).toEqual(true);
    });
  });

  describe('Can use custom asset profile symbol', () => {
    const assetProfile = { id: 'asset-profile-id' };
    const symbol = '7e91b7d4-1430-4212-8380-289a06c9bbc1';

    it('Free-text symbol', () => {
      expect(
        canUseCustomAssetProfileSymbol({
          assetProfile: null,
          symbol: 'Penthouse Apartment'
        })
      ).toEqual(false);
    });

    it('New asset profile with UUID', () => {
      expect(
        canUseCustomAssetProfileSymbol({ symbol, assetProfile: null })
      ).toEqual(true);
    });

    it('New asset profile with Ghostfolio prefix', () => {
      expect(
        canUseCustomAssetProfileSymbol({
          assetProfile: null,
          symbol: 'GF_PENTHOUSE_APARTMENT'
        })
      ).toEqual(false);
    });

    it('Existing asset profile with UUID', () => {
      expect(canUseCustomAssetProfileSymbol({ assetProfile, symbol })).toEqual(
        true
      );
    });

    it('Existing asset profile with Ghostfolio prefix', () => {
      expect(
        canUseCustomAssetProfileSymbol({
          assetProfile,
          symbol: 'GF_PENTHOUSE_APARTMENT'
        })
      ).toEqual(true);
    });
  });

  describe('Extract number from string', () => {
    it('Get decimal number', () => {
      expect(extractNumberFromString({ value: '999.99' })).toEqual(999.99);
    });

    it('Get negative decimal number', () => {
      expect(extractNumberFromString({ value: '-999.99' })).toEqual(-999.99);
    });

    it('Get decimal number (with spaces)', () => {
      expect(extractNumberFromString({ value: ' 999.99 ' })).toEqual(999.99);
    });

    it('Get decimal number (with currency)', () => {
      expect(extractNumberFromString({ value: '999.99 CHF' })).toEqual(999.99);
    });

    it('Get negative decimal number (with currency)', () => {
      expect(extractNumberFromString({ value: '-999.99 CHF' })).toEqual(
        -999.99
      );
    });

    it('Get decimal number (comma notation)', () => {
      expect(
        extractNumberFromString({ locale: 'de-DE', value: '999,99' })
      ).toEqual(999.99);
    });

    it('Get decimal number with group (dot notation)', () => {
      expect(
        extractNumberFromString({ locale: 'de-CH', value: `99'999.99` })
      ).toEqual(99999.99);
    });

    it('Get decimal number with group (comma notation)', () => {
      expect(
        extractNumberFromString({ locale: 'de-DE', value: '99.999,99' })
      ).toEqual(99999.99);
    });

    it('Get negative decimal number with group (comma notation)', () => {
      expect(
        extractNumberFromString({ locale: 'de-DE', value: '-99.999,99' })
      ).toEqual(-99999.99);
    });

    it('Get decimal number (comma notation) for locale where currency is not grouped by default', () => {
      expect(
        extractNumberFromString({ locale: 'es-ES', value: '999,99' })
      ).toEqual(999.99);
    });

    it('Get decimal number (with hyphenated text)', () => {
      expect(extractNumberFromString({ value: 'BRK-B 425.30' })).toEqual(425.3);
    });

    it('Not a number', () => {
      expect(extractNumberFromString({ value: 'X' })).toEqual(NaN);
    });
  });

  describe('Format number for locale input', () => {
    it('Format number in de-DE', () => {
      expect(
        formatNumberForLocaleInput({ locale: 'de-DE', value: 1234.5 })
      ).toEqual('1.234,5');
    });

    it('Format number in en-US', () => {
      expect(
        formatNumberForLocaleInput({ locale: 'en-US', value: 1234.5 })
      ).toEqual('1,234.5');
    });

    it('Format small number without exponent', () => {
      expect(
        formatNumberForLocaleInput({ locale: 'de-DE', value: 0.00001234 })
      ).toEqual('0,00001234');
    });

    it('Format zero', () => {
      expect(formatNumberForLocaleInput({ locale: 'de-DE', value: 0 })).toEqual(
        '0'
      );
    });

    it('Format null, undefined and NaN as empty string', () => {
      expect(
        formatNumberForLocaleInput({ locale: 'de-DE', value: null })
      ).toEqual('');
      expect(
        formatNumberForLocaleInput({ locale: 'de-DE', value: undefined })
      ).toEqual('');
      expect(
        formatNumberForLocaleInput({ locale: 'de-DE', value: NaN })
      ).toEqual('');
    });

    describe('Round-trip with parse', () => {
      const locales = ['de-DE', 'en-US', 'de-CH', 'fr-FR'];
      const values = [1234.5, 0.1, 0.00001234, 1e-7, 123456789.123];

      for (const locale of locales) {
        for (const value of values) {
          it(`Value ${value} in ${locale}`, () => {
            const formatted = formatNumberForLocaleInput({ locale, value });

            expect(
              parseNumberFromLocaleString({ locale, value: formatted })
            ).toEqual(value);
          });
        }
      }
    });
  });

  describe('Get country code from currency', () => {
    it('ISO 4217 currency code', () => {
      expect(getCountryCodeFromCurrency('CHF')).toEqual('CH');
      expect(getCountryCodeFromCurrency('USD')).toEqual('US');
    });

    it('Currency of the European Union', () => {
      expect(getCountryCodeFromCurrency('EUR')).toEqual('EU');
    });

    it('Derived currency', () => {
      expect(getCountryCodeFromCurrency('GBp')).toEqual('GB');
    });

    it('Supranational currency', () => {
      expect(getCountryCodeFromCurrency('XAU')).toEqual('');
      expect(getCountryCodeFromCurrency('XOF')).toEqual('');
    });

    it('Empty currency', () => {
      expect(getCountryCodeFromCurrency('')).toEqual('');
    });
  });

  describe('Get emoji flag', () => {
    it('Country code', () => {
      expect(getEmojiFlag('US')).toEqual('🇺🇸');
      expect(getEmojiFlag('us')).toEqual('🇺🇸');
    });

    it('European Union code', () => {
      expect(getEmojiFlag('EU')).toEqual('🇪🇺');
    });

    it('Invalid country code', () => {
      expect(getEmojiFlag('XX')).toEqual(undefined);
    });

    it('Empty country code', () => {
      expect(getEmojiFlag('')).toEqual(undefined);
    });
  });

  describe('Get holding name', () => {
    it('Cash position', () => {
      expect(
        getHoldingName({
          assetSubClass: 'CASH',
          assetSubClassLabel: 'Cash',
          name: 'CHF',
          symbol: 'CHF'
        })
      ).toEqual('Cash (CHF)');
    });

    it('Cash position without asset sub class label', () => {
      expect(
        getHoldingName({
          assetSubClass: 'CASH',
          assetSubClassLabel: undefined,
          name: 'CHF',
          symbol: 'CHF'
        })
      ).toEqual('CHF');
    });

    it('Holding with name', () => {
      expect(
        getHoldingName({
          assetSubClass: 'STOCK',
          assetSubClassLabel: 'Stock',
          name: 'Apple Inc.',
          symbol: 'AAPL'
        })
      ).toEqual('Apple Inc.');
    });

    it('Holding without name', () => {
      expect(
        getHoldingName({
          assetSubClass: 'STOCK',
          assetSubClassLabel: 'Stock',
          name: undefined,
          symbol: 'AAPL'
        })
      ).toEqual('AAPL');
    });
  });

  describe('Get number format group', () => {
    let languageGetter: jest.SpyInstance<string, [], any>;

    beforeEach(() => {
      languageGetter = jest.spyOn(window.navigator, 'language', 'get');
    });

    it('Get de-CH number format group', () => {
      expect(getNumberFormatGroup('de-CH')).toEqual(`'`);
    });

    it('Get de-CH number format group when it is default', () => {
      languageGetter.mockReturnValue('de-CH');
      expect(getNumberFormatGroup()).toEqual(`'`);
    });

    it('Get de-DE number format group', () => {
      expect(getNumberFormatGroup('de-DE')).toEqual('.');
    });

    it('Get de-DE number format group when it is default', () => {
      languageGetter.mockReturnValue('de-DE');
      expect(getNumberFormatGroup()).toEqual('.');
    });

    it('Get en-GB number format group', () => {
      expect(getNumberFormatGroup('en-GB')).toEqual(',');
    });

    it('Get en-GB number format group when it is default', () => {
      languageGetter.mockReturnValue('en-GB');
      expect(getNumberFormatGroup()).toEqual(',');
    });

    it('Get en-US number format group', () => {
      expect(getNumberFormatGroup('en-US')).toEqual(',');
    });

    it('Get en-US number format group when it is default', () => {
      languageGetter.mockReturnValue('en-US');
      expect(getNumberFormatGroup()).toEqual(',');
    });

    it('Get es-ES number format group', () => {
      expect(getNumberFormatGroup('es-ES')).toEqual('.');
    });

    it('Get es-ES number format group when it is default', () => {
      languageGetter.mockReturnValue('es-ES');
      expect(getNumberFormatGroup()).toEqual('.');
    });

    it('Get ru-RU number format group', () => {
      expect(getNumberFormatGroup('ru-RU')).toEqual(' ');
    });

    it('Get ru-RU number format group when it is default', () => {
      languageGetter.mockReturnValue('ru-RU');
      expect(getNumberFormatGroup()).toEqual(' ');
    });

    it('Get zh-CN number format group', () => {
      expect(getNumberFormatGroup('zh-CN')).toEqual(',');
    });

    it('Get zh-CN number format group when it is default', () => {
      languageGetter.mockReturnValue('zh-CN');
      expect(getNumberFormatGroup()).toEqual(',');
    });
  });

  describe('Get string or null', () => {
    it('String', () => {
      expect(getStringOrNull('https://ghostfol.io')).toEqual(
        'https://ghostfol.io'
      );
    });

    it('String (with spaces)', () => {
      expect(getStringOrNull(' https://ghostfol.io ')).toEqual(
        'https://ghostfol.io'
      );
    });

    it('Empty string', () => {
      expect(getStringOrNull('')).toEqual(null);
    });

    it('Blank string', () => {
      expect(getStringOrNull('   ')).toEqual(null);
    });

    it('Null', () => {
      expect(getStringOrNull(null)).toEqual(null);
    });

    it('Undefined', () => {
      expect(getStringOrNull(undefined)).toEqual(null);
    });
  });

  describe('Get string or undefined', () => {
    it('String', () => {
      expect(getStringOrUndefined('de-DE')).toEqual('de-DE');
    });

    it('String (with spaces)', () => {
      expect(getStringOrUndefined(' de-DE ')).toEqual('de-DE');
    });

    it('Empty string', () => {
      expect(getStringOrUndefined('')).toEqual(undefined);
    });

    it('Blank string', () => {
      expect(getStringOrUndefined('   ')).toEqual(undefined);
    });

    it('Null', () => {
      expect(getStringOrUndefined(null)).toEqual(undefined);
    });

    it('Undefined', () => {
      expect(getStringOrUndefined(undefined)).toEqual(undefined);
    });
  });

  // A user in a time zone ahead of the instance is already on the next day at
  // this moment. The expected limit is a moment in UTC, hence this suite must
  // give the same result with the instance in any time zone.
  describe('Is account balance in future', () => {
    beforeAll(() => {
      jest.useFakeTimers().setSystemTime(new Date('2026-09-03T23:30:00.000Z'));
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    it('should accept the account balance of the current day', () => {
      expect(
        isAccountBalanceInFuture({ date: new Date('2026-09-03T00:00:00.000Z') })
      ).toBe(false);
    });

    it('should accept the account balance of a user in a time zone ahead of the instance', () => {
      expect(
        isAccountBalanceInFuture({ date: new Date('2026-09-04T00:00:00.000Z') })
      ).toBe(false);
    });

    it('should reject an account balance after the start of the UTC date of tomorrow', () => {
      expect(
        isAccountBalanceInFuture({ date: new Date('2026-09-04T00:00:00.001Z') })
      ).toBe(true);
    });

    it('should reject an account balance of the day after tomorrow', () => {
      expect(
        isAccountBalanceInFuture({ date: new Date('2026-09-05T00:00:00.000Z') })
      ).toBe(true);
    });
  });

  describe('Is account excluded', () => {
    it('Account with Exclude from Analysis tag', () => {
      expect(
        isAccountExcluded({ tags: [{ id: TAG_ID_EXCLUDE_FROM_ANALYSIS }] })
      ).toEqual(true);
    });

    it('Account with another tag', () => {
      expect(
        isAccountExcluded({ tags: [{ id: TAG_ID_EMERGENCY_FUND }] })
      ).toEqual(false);
    });

    it('Account without tags', () => {
      expect(isAccountExcluded({ tags: [] })).toEqual(false);
    });

    it('Undefined account', () => {
      expect(isAccountExcluded(undefined)).toEqual(false);
    });
  });

  describe('Is currency', () => {
    it('ISO 4217 currency code', () => {
      expect(isCurrency('USD')).toEqual(true);
    });

    it('Derived currency', () => {
      expect(isCurrency('GBp')).toEqual(true);
    });

    it('Non-currency', () => {
      expect(isCurrency('AAPL')).toEqual(false);
    });

    it('Empty currency', () => {
      expect(isCurrency('')).toEqual(false);
    });
  });

  describe('Is currency symbol', () => {
    it('Currency symbol (default currency as base)', () => {
      expect(isCurrencySymbol('USDCHF')).toEqual(true);
      expect(isCurrencySymbol('USDZAR')).toEqual(true);
    });

    it('Currency symbol (default currency as quote)', () => {
      expect(isCurrencySymbol('EURUSD')).toEqual(true);
    });

    it('Currency symbol (derived currency)', () => {
      expect(isCurrencySymbol('USDGBp')).toEqual(true);
    });

    it('Stock symbol with currency-like prefix', () => {
      expect(isCurrencySymbol('ERNA.L')).toEqual(false);
    });

    it('Cryptocurrency symbol', () => {
      expect(isCurrencySymbol('BTCUSD')).toEqual(false);
    });

    it('Stock symbol', () => {
      expect(isCurrencySymbol('AAPL')).toEqual(false);
    });

    it('Symbol with non-currency suffix', () => {
      expect(isCurrencySymbol('USD.AX')).toEqual(false);
    });

    it('Plain currency code', () => {
      expect(isCurrencySymbol('USD')).toEqual(false);
    });

    it('Empty symbol', () => {
      expect(isCurrencySymbol('')).toEqual(false);
    });
  });

  describe('Is dark color scheme', () => {
    const mockPrefersColorSchemeDark = (matches: boolean) => {
      window.matchMedia = jest.fn(() => {
        return { matches } as MediaQueryList;
      });
    };

    afterEach(() => {
      Reflect.deleteProperty(window, 'matchMedia');
    });

    it('Dark color scheme with operating system in light mode', () => {
      mockPrefersColorSchemeDark(false);
      expect(isDarkColorScheme('DARK')).toEqual(true);
    });

    it('Light color scheme with operating system in dark mode', () => {
      mockPrefersColorSchemeDark(true);
      expect(isDarkColorScheme('LIGHT')).toEqual(false);
    });

    it('Auto color scheme with operating system in dark mode', () => {
      mockPrefersColorSchemeDark(true);
      expect(isDarkColorScheme()).toEqual(true);
      expect(isDarkColorScheme(null)).toEqual(true);
    });

    it('Auto color scheme with operating system in light mode', () => {
      mockPrefersColorSchemeDark(false);
      expect(isDarkColorScheme()).toEqual(false);
      expect(isDarkColorScheme(null)).toEqual(false);
    });
  });

  describe('Is split ratio', () => {
    it('Forward split', () => {
      expect(isSplitRatio({ denominator: 1, numerator: 2 })).toEqual(true);
      expect(isSplitRatio({ denominator: 1, numerator: 4 })).toEqual(true);
      expect(isSplitRatio({ denominator: 2, numerator: 3 })).toEqual(true);
    });

    it('Reverse split', () => {
      expect(isSplitRatio({ denominator: 10, numerator: 1 })).toEqual(true);
      expect(isSplitRatio({ denominator: 3, numerator: 1 })).toEqual(true);
    });

    it('Ratio without effect', () => {
      expect(isSplitRatio({ denominator: 1, numerator: 1 })).toEqual(false);
      expect(isSplitRatio({ denominator: 3, numerator: 3 })).toEqual(false);
    });

    it('Zero or negative ratio', () => {
      expect(isSplitRatio({ denominator: 1, numerator: 0 })).toEqual(false);
      expect(isSplitRatio({ denominator: 0, numerator: 1 })).toEqual(false);
      expect(isSplitRatio({ denominator: 1, numerator: -2 })).toEqual(false);
      expect(isSplitRatio({ denominator: -2, numerator: 1 })).toEqual(false);
    });

    it('Non-integer ratio', () => {
      expect(isSplitRatio({ denominator: 1, numerator: 1.5 })).toEqual(false);
      expect(isSplitRatio({ denominator: 2.5, numerator: 1 })).toEqual(false);
      expect(isSplitRatio({ denominator: 1, numerator: Number.NaN })).toEqual(
        false
      );
      expect(
        isSplitRatio({ denominator: 1, numerator: Number.POSITIVE_INFINITY })
      ).toEqual(false);
    });

    it('Missing ratio', () => {
      expect(
        isSplitRatio({ denominator: undefined, numerator: undefined })
      ).toEqual(false);
      expect(isSplitRatio({ denominator: null, numerator: null })).toEqual(
        false
      );
    });
  });

  describe('Is valid account balance date', () => {
    beforeAll(() => {
      jest.useFakeTimers().setSystemTime(new Date('2026-09-03T23:30:00.000Z'));
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    it('Accepts a date in the past', () => {
      expect(isValidAccountBalanceDate('2026-09-02')).toBe(true);
    });

    it('Accepts the current date', () => {
      expect(isValidAccountBalanceDate('2026-09-03')).toBe(true);
    });

    it('Accepts the current date of a user in a time zone ahead of the instance', () => {
      expect(isValidAccountBalanceDate('2026-09-04')).toBe(true);
    });

    it('Refuses a date in the future', () => {
      expect(isValidAccountBalanceDate('2026-09-05')).toBe(false);
    });

    it('Refuses a date which is not valid', () => {
      expect(isValidAccountBalanceDate('2026-02-30')).toBe(false);
    });
  });

  describe('Is valid currency code', () => {
    it('Currency code in lower case', () => {
      expect(isValidCurrencyCode('usd')).toEqual(false);
    });

    it('Currency code in upper case', () => {
      expect(isValidCurrencyCode('USD')).toEqual(true);
    });

    it('Derived currency', () => {
      expect(isValidCurrencyCode('GBp')).toEqual(true);
    });

    it('Empty currency code', () => {
      expect(isValidCurrencyCode('')).toEqual(false);
    });

    it('Unknown currency code', () => {
      expect(isValidCurrencyCode('XYZ')).toEqual(false);
    });
  });

  describe('Is valid custom asset profile symbol', () => {
    it('Empty symbol', () => {
      expect(isValidCustomAssetProfileSymbol('')).toEqual(false);
    });

    it('Free-text symbol', () => {
      expect(isValidCustomAssetProfileSymbol('Penthouse Apartment')).toEqual(
        false
      );
    });

    it('Stock symbol', () => {
      expect(isValidCustomAssetProfileSymbol('AAPL')).toEqual(false);
    });

    it('Symbol with Ghostfolio prefix', () => {
      expect(isValidCustomAssetProfileSymbol('GF_PENTHOUSE_APARTMENT')).toEqual(
        true
      );
    });

    it('UUID', () => {
      expect(
        isValidCustomAssetProfileSymbol('7e91b7d4-1430-4212-8380-289a06c9bbc1')
      ).toEqual(true);
    });
  });

  describe('Is valid date after 1970', () => {
    it('Date', () => {
      expect(isValidDateAfter1970('2024-01-01')).toEqual(true);
    });

    it('Date and time', () => {
      expect(isValidDateAfter1970('2024-01-01T12:00:00.000Z')).toEqual(true);
    });

    it('Date before 1970', () => {
      expect(isValidDateAfter1970('0000-01-01')).toEqual(false);
    });

    it('Date object', () => {
      expect(
        isValidDateAfter1970(new Date('2024-01-01T12:00:00.000Z'))
      ).toEqual(true);
    });

    it('Date object of 1970', () => {
      expect(isValidDateAfter1970(new Date(0))).toEqual(false);
    });

    it('Date of 1970', () => {
      expect(isValidDateAfter1970('1970-01-01T00:00:00.000Z')).toEqual(false);
    });

    // A date without a time is read in UTC, hence the result is the same in
    // every time zone of the server
    it('Date of 1970 without a time', () => {
      expect(isValidDateAfter1970('1970-01-01')).toEqual(false);
    });

    it('Date after 1970 without a time', () => {
      expect(isValidDateAfter1970('1970-01-02')).toEqual(true);
    });

    it('Date with an expanded year', () => {
      expect(isValidDateAfter1970('+010000-01-01')).toEqual(true);
    });

    it('Empty date', () => {
      expect(isValidDateAfter1970('')).toEqual(false);
    });

    it('Free-text date', () => {
      expect(isValidDateAfter1970('yesterday')).toEqual(false);
    });
  });

  describe('Is valid grantee of access', () => {
    const granteeUserId = 'ffb08949-2f8a-4b6e-88fd-0f1e6b6b5f5d';

    it('A private access with a grantee', () => {
      expect(
        isValidGranteeOfAccess({ granteeUserId, type: 'PRIVATE' })
      ).toEqual(true);
    });

    it('A private access without a grantee', () => {
      expect(isValidGranteeOfAccess({ type: 'PRIVATE' })).toEqual(false);
    });

    it('A private access with an empty grantee', () => {
      expect(
        isValidGranteeOfAccess({ granteeUserId: null, type: 'PRIVATE' })
      ).toEqual(false);
    });

    it('A public access without a grantee', () => {
      expect(isValidGranteeOfAccess({ type: 'PUBLIC' })).toEqual(true);
    });

    it('A public access with a grantee', () => {
      expect(isValidGranteeOfAccess({ granteeUserId, type: 'PUBLIC' })).toEqual(
        false
      );
    });

    it('An access of the model context protocol without a grantee', () => {
      expect(isValidGranteeOfAccess({ type: 'MCP' })).toEqual(true);
    });

    it('An access of the model context protocol with a grantee', () => {
      expect(isValidGranteeOfAccess({ granteeUserId, type: 'MCP' })).toEqual(
        false
      );
    });
  });

  describe('Parse number from locale string', () => {
    it('Parse de-DE number with group and decimal', () => {
      expect(
        parseNumberFromLocaleString({ locale: 'de-DE', value: '1.234,50' })
      ).toEqual(1234.5);
    });

    it('Parse en-US number with group and decimal', () => {
      expect(
        parseNumberFromLocaleString({ locale: 'en-US', value: '1,234.50' })
      ).toEqual(1234.5);
    });

    it('Parse ambiguous number per locale', () => {
      expect(
        parseNumberFromLocaleString({ locale: 'de-DE', value: '1.234' })
      ).toEqual(1234);
      expect(
        parseNumberFromLocaleString({ locale: 'en-US', value: '1.234' })
      ).toEqual(1.234);
    });

    it('Parse plain decimal', () => {
      expect(
        parseNumberFromLocaleString({ locale: 'de-DE', value: '12,5' })
      ).toEqual(12.5);
      expect(
        parseNumberFromLocaleString({ locale: 'en-US', value: '12.5' })
      ).toEqual(12.5);
    });

    it('Parse negative number', () => {
      expect(
        parseNumberFromLocaleString({ locale: 'en-US', value: '-12.5' })
      ).toEqual(-12.5);
    });

    it('Parse empty and blank string as null', () => {
      expect(
        parseNumberFromLocaleString({ locale: 'en-US', value: '' })
      ).toEqual(null);
      expect(
        parseNumberFromLocaleString({ locale: 'en-US', value: '  ' })
      ).toEqual(null);
    });

    it('Parse text which is not a number as NaN', () => {
      for (const value of ['abc', '12abc', '1e5']) {
        expect(
          parseNumberFromLocaleString({ locale: 'en-US', value })
        ).toBeNaN();
      }
    });

    it('Parse number in the format of another locale as NaN', () => {
      expect(
        parseNumberFromLocaleString({ locale: 'de-DE', value: '1,234.50' })
      ).toBeNaN();
      expect(
        parseNumberFromLocaleString({ locale: 'en-US', value: '1.234,50' })
      ).toBeNaN();
      expect(
        parseNumberFromLocaleString({ locale: 'en-US', value: '12,5' })
      ).toBeNaN();
    });

    it('Parse de-CH number with apostrophe group', () => {
      expect(
        parseNumberFromLocaleString({ locale: 'de-CH', value: `1'234.5` })
      ).toEqual(1234.5);
      expect(
        parseNumberFromLocaleString({ locale: 'de-CH', value: '1’234.5' })
      ).toEqual(1234.5);
    });

    it('Parse fr-FR number with space group', () => {
      expect(
        parseNumberFromLocaleString({ locale: 'fr-FR', value: '1 234,5' })
      ).toEqual(1234.5);
      expect(
        parseNumberFromLocaleString({ locale: 'fr-FR', value: '1\u202f234,5' })
      ).toEqual(1234.5);
    });

    it('Parse es-ES number with group', () => {
      expect(
        parseNumberFromLocaleString({ locale: 'es-ES', value: '1.234,5' })
      ).toEqual(1234.5);
    });
  });

  describe('Resolve user settings', () => {
    const userSettings: UserSettings = {
      baseCurrency: 'CHF',
      colorScheme: 'DARK',
      dateRange: '1y',
      emergencyFund: 10000,
      language: 'de',
      locale: 'de-CH',
      savingsRate: 500,
      viewMode: 'DEFAULT'
    };

    const impersonationUserSettings: UserSettings = {
      baseCurrency: 'USD',
      colorScheme: 'LIGHT',
      dateRange: 'ytd',
      emergencyFund: 25000,
      language: 'en',
      locale: 'en-US',
      savingsRate: 1000,
      viewMode: 'ZEN'
    };

    it('Without impersonation', () => {
      expect(
        resolveUserSettings({
          userSettings,
          impersonationUserSettings: undefined
        })
      ).toEqual(userSettings);
    });

    it('Portfolio settings follow the impersonated user', () => {
      const { baseCurrency, emergencyFund, savingsRate } = resolveUserSettings({
        impersonationUserSettings,
        userSettings
      });

      expect({ baseCurrency, emergencyFund, savingsRate }).toEqual({
        baseCurrency: 'USD',
        emergencyFund: 25000,
        savingsRate: 1000
      });
    });

    it('Presentation settings stay with the authenticated user', () => {
      const { colorScheme, dateRange, language, locale, viewMode } =
        resolveUserSettings({ impersonationUserSettings, userSettings });

      expect({ colorScheme, dateRange, language, locale, viewMode }).toEqual({
        colorScheme: 'DARK',
        dateRange: '1y',
        language: 'de',
        locale: 'de-CH',
        viewMode: 'DEFAULT'
      });
    });

    it('Benchmark stays with the authenticated user', () => {
      // The benchmark is a comparison of the person looking at the screen and
      // is gated by their subscription, so it must not follow the impersonated
      // user
      const { benchmark } = resolveUserSettings({
        impersonationUserSettings: {
          benchmark: '82fd8dcc-4a0e-4dd0-b6cb-7b8a4b03e6b1'
        },
        userSettings: { benchmark: '1e5a0e6a-1b8b-4d0e-9f0a-4c2b3d5e6f7a' }
      });

      expect(benchmark).toEqual('1e5a0e6a-1b8b-4d0e-9f0a-4c2b3d5e6f7a');
    });

    it('Filters stay with the authenticated user', () => {
      // The filters are always written back to the authenticated user, so
      // reading them from the impersonated user would overwrite them
      const { 'filters.accounts': filtersAccounts } = resolveUserSettings({
        impersonationUserSettings: {
          'filters.accounts': ['3b3c2b5d-5a4f-4b0a-9d4f-9b1f5e6a7c8d']
        },
        userSettings: {
          'filters.accounts': ['0a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d']
        }
      });

      expect(filtersAccounts).toEqual(['0a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d']);
    });

    it('Presentation settings unset for the authenticated user do not leak', () => {
      // An unset presentation setting must not fall back to the impersonated
      // user, otherwise their appearance and language apply to the
      // authenticated user
      const { colorScheme, language, locale } = resolveUserSettings({
        impersonationUserSettings,
        userSettings: { baseCurrency: 'CHF' }
      });

      expect(colorScheme).toBeUndefined();
      expect(language).toBeUndefined();
      expect(locale).toBeUndefined();
    });

    it('Unknown settings default to the impersonated user', () => {
      // A setting which is not classified as presentation must not leak from
      // the authenticated user into the impersonated portfolio
      expect(
        resolveUserSettings({
          impersonationUserSettings: { annualInterestRate: 5 },
          userSettings: { annualInterestRate: 3 }
        }).annualInterestRate
      ).toEqual(5);
    });

    it('Impersonated user without settings', () => {
      expect(
        resolveUserSettings({
          userSettings,
          impersonationUserSettings: {}
        })
      ).toEqual({
        colorScheme: 'DARK',
        dateRange: '1y',
        language: 'de',
        locale: 'de-CH',
        viewMode: 'DEFAULT'
      });
    });
  });
});
