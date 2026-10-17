import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { EntityLogoImageSourceService } from '../entity-logo/entity-logo-image-source.service';
import { EntityLogoImageSourceServiceMock } from '../mocks/entity-logo-image-source.service.mock';
import { GfHoldingsTableComponent } from './holdings-table.component';
import { HoldingsTableItem } from './interfaces/interfaces';

function createHolding({
  assetSubClass,
  quantity,
  symbol
}: {
  assetSubClass: 'CRYPTOCURRENCY' | 'STOCK';
  quantity: number;
  symbol: string;
}): HoldingsTableItem {
  return {
    allocationInPercentage: 0.5,
    assetProfile: {
      assetSubClass,
      currency: 'USD',
      dataSource: 'YAHOO',
      name: symbol,
      symbol
    },
    dateOfFirstActivity: new Date('2021-12-01T00:00:00.000Z'),
    netPerformancePercentWithCurrencyEffect: 0.1,
    netPerformanceWithCurrencyEffect: 10,
    quantity,
    valueInBaseCurrency: 1000
  } as HoldingsTableItem;
}

describe('GfHoldingsTableComponent', () => {
  let fixture: ComponentFixture<GfHoldingsTableComponent>;

  function getQuantityTexts() {
    return Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(
        'td.mat-column-quantity gf-value'
      )
    ).map((element) => {
      return element.textContent.trim();
    });
  }

  function getPrecision(holding: HoldingsTableItem) {
    return (
      fixture.componentInstance as unknown as {
        getQuantityPrecision: (item: HoldingsTableItem) => number | undefined;
      }
    ).getQuantityPrecision(holding);
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GfHoldingsTableComponent],
      providers: [
        provideNoopAnimations(),
        {
          provide: EntityLogoImageSourceService,
          useValue: new EntityLogoImageSourceServiceMock()
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(GfHoldingsTableComponent);
    fixture.componentRef.setInput('locale', 'en-US');
  });

  describe('getQuantityPrecision', () => {
    it('should return 8 for fractional crypto below 10', () => {
      expect(
        getPrecision(
          createHolding({
            assetSubClass: 'CRYPTOCURRENCY',
            quantity: 0.01525217,
            symbol: 'BTCUSD'
          })
        )
      ).toBe(8);
    });

    it('should return 6 for fractional crypto from 10 to below 1000', () => {
      expect(
        getPrecision(
          createHolding({
            assetSubClass: 'CRYPTOCURRENCY',
            quantity: 12.123456,
            symbol: 'ETHUSD'
          })
        )
      ).toBe(6);
    });

    it('should return 0 for integer crypto', () => {
      expect(
        getPrecision(
          createHolding({
            assetSubClass: 'CRYPTOCURRENCY',
            quantity: 5,
            symbol: 'BTCUSD'
          })
        )
      ).toBe(0);
    });

    it('should return undefined for non-crypto', () => {
      expect(
        getPrecision(
          createHolding({
            assetSubClass: 'STOCK',
            quantity: 0.01525217,
            symbol: 'AAPL'
          })
        )
      ).toBeUndefined();
    });
  });

  describe('Quantity column', () => {
    it('should show full precision for a fractional crypto holding', () => {
      fixture.componentRef.setInput('holdings', [
        createHolding({
          assetSubClass: 'CRYPTOCURRENCY',
          quantity: 0.01525217,
          symbol: 'BTCUSD'
        })
      ]);
      fixture.detectChanges();

      expect(getQuantityTexts()).toEqual(['0.01525217']);
    });

    it('should format fractional crypto with the locale', () => {
      fixture.componentRef.setInput('locale', 'de-DE');
      fixture.componentRef.setInput('holdings', [
        createHolding({
          assetSubClass: 'CRYPTOCURRENCY',
          quantity: 0.01525217,
          symbol: 'BTCUSD'
        })
      ]);
      fixture.detectChanges();

      expect(getQuantityTexts()).toEqual(['0,01525217']);
    });

    it('should keep two fraction digits for non-crypto holdings', () => {
      fixture.componentRef.setInput('holdings', [
        createHolding({
          assetSubClass: 'STOCK',
          quantity: 0.01525217,
          symbol: 'AAPL'
        })
      ]);
      fixture.detectChanges();

      expect(getQuantityTexts()).toEqual(['0.02']);
    });

    it('should hide the Quantity column without permission', () => {
      fixture.componentRef.setInput('hasPermissionToShowQuantities', false);
      fixture.componentRef.setInput('holdings', [
        createHolding({
          assetSubClass: 'CRYPTOCURRENCY',
          quantity: 0.01525217,
          symbol: 'BTCUSD'
        })
      ]);
      fixture.detectChanges();

      expect(getQuantityTexts()).toEqual([]);
    });
  });
});
