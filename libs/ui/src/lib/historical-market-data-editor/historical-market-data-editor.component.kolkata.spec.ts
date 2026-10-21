/**
 * @jest-environment <rootDir>/jest-environment-tz.js
 * @jest-environment-options {"timeZone": "Asia/Kolkata"}
 */
import { DataService } from '@ghostfolio/ui/services';

import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { parseISO } from 'date-fns';
import { DeviceDetectorService } from 'ngx-device-detector';
import { of } from 'rxjs';

import { GfHistoricalMarketDataEditorComponent } from './historical-market-data-editor.component';

jest.mock(
  './historical-market-data-editor-dialog/historical-market-data-editor-dialog.component',
  () => ({
    GfHistoricalMarketDataEditorDialogComponent: class {}
  })
);

describe('GfHistoricalMarketDataEditorComponent in Asia/Kolkata (ahead of UTC)', () => {
  const expectedTimezoneOffset = -330;

  let component: GfHistoricalMarketDataEditorComponent;
  let dialog: { open: jest.Mock };
  let dataService: { postMarketData: jest.Mock };
  let fixture: ComponentFixture<GfHistoricalMarketDataEditorComponent>;

  // Only fake `Date`, everything else (zone.js, timers) stays real
  const useFakeNow = (now: Date) => {
    jest.useFakeTimers({
      doNotFake: [
        'cancelAnimationFrame',
        'cancelIdleCallback',
        'clearImmediate',
        'clearInterval',
        'clearTimeout',
        'hrtime',
        'nextTick',
        'performance',
        'queueMicrotask',
        'requestAnimationFrame',
        'requestIdleCallback',
        'setImmediate',
        'setInterval',
        'setTimeout'
      ],
      now
    });
  };

  const setMarketData = (
    marketData: { date: Date; marketPrice: number }[],
    dateOfFirstActivity?: unknown
  ) => {
    fixture.componentRef.setInput('marketData', marketData);

    if (dateOfFirstActivity) {
      fixture.componentRef.setInput('dateOfFirstActivity', dateOfFirstActivity);
    }

    component.ngOnChanges();
  };

  beforeEach(async () => {
    dataService = { postMarketData: jest.fn().mockReturnValue(of({})) };
    dialog = {
      open: jest.fn().mockReturnValue({ afterClosed: () => of(undefined) })
    };

    await TestBed.configureTestingModule({
      imports: [GfHistoricalMarketDataEditorComponent],
      providers: [
        FormBuilder,
        { provide: DataService, useValue: dataService },
        {
          provide: DeviceDetectorService,
          useValue: {
            deviceInfo: signal({ deviceType: 'desktop' })
          }
        },
        { provide: MatDialog, useValue: dialog },
        { provide: MatSnackBar, useValue: {} }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(GfHistoricalMarketDataEditorComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('runs in the expected time zone', () => {
    expect(new Date(2024, 0, 5).getTimezoneOffset()).toBe(
      expectedTimezoneOffset
    );
  });

  it('places a stored price on its entered day', () => {
    setMarketData([
      { date: parseISO('2024-01-05T00:00:00.000Z'), marketPrice: 100 }
    ]);

    expect(component.marketDataByMonth['2024-01']['05'].marketPrice).toBe(100);
    expect(component.marketDataByMonth['2024-01']['04']?.marketPrice).toBe(
      undefined
    );
    expect(component['historicalDataItems']()[0].date).toBe('2024-01-05');
  });

  it('keeps the day when re-saving an existing cell', () => {
    setMarketData([
      { date: parseISO('2024-01-05T00:00:00.000Z'), marketPrice: 100 }
    ]);

    component.onOpenMarketDataDetail({ day: '05', yearMonth: '2024-01' });

    expect(dialog.open).toHaveBeenCalledTimes(1);
    expect(dialog.open.mock.calls[0][1].data).toEqual(
      expect.objectContaining({ dateString: '2024-01-05', marketPrice: 100 })
    );
  });

  it('posts the date of a CSV row as entered', () => {
    component.historicalDataForm.controls.historicalData.controls.csvString.setValue(
      'date;marketPrice\n2024-01-05;100'
    );

    component.onImportHistoricalData();

    expect(dataService.postMarketData).toHaveBeenCalledTimes(1);

    const { marketData } =
      dataService.postMarketData.mock.calls[0][0].marketData;
    const serialized = JSON.parse(JSON.stringify(marketData[0]));

    expect(serialized.date).toBe('2024-01-05');
    expect(serialized.marketPrice).toBe(100);
  });

  describe('today placeholder', () => {
    it('does not overwrite a stored price of the current day', () => {
      // Local 2024-01-05 10:00
      useFakeNow(new Date(2024, 0, 5, 10, 0, 0));

      setMarketData([
        { date: parseISO('2024-01-05T00:00:00.000Z'), marketPrice: 100 }
      ]);

      expect(component.marketDataByMonth['2024-01']['05'].marketPrice).toBe(
        100
      );
    });

    it('adds the current day without a price if none is stored', () => {
      // Local 2024-01-10 10:00
      useFakeNow(new Date(2024, 0, 10, 10, 0, 0));

      setMarketData([
        { date: parseISO('2024-01-05T00:00:00.000Z'), marketPrice: 100 }
      ]);

      expect(component.marketDataByMonth['2024-01']['10']).toBeDefined();
      expect(
        component.marketDataByMonth['2024-01']['10'].marketPrice
      ).toBeUndefined();
      expect(component.marketDataByMonth['2024-01']['05'].marketPrice).toBe(
        100
      );
    });
  });

  it('accepts dateOfFirstActivity as ISO string', () => {
    setMarketData(
      [{ date: parseISO('2024-01-05T00:00:00.000Z'), marketPrice: 100 }],
      '2024-01-03T00:00:00.000Z'
    );

    expect(component.marketDataByMonth['2024-01']['03']).toBeDefined();
    expect(
      component.marketDataByMonth['2024-01']['03'].marketPrice
    ).toBeUndefined();
    expect(component.marketDataByMonth['2024-01']['04']).toBeDefined();
    expect(
      component.marketDataByMonth['2024-01']['04'].marketPrice
    ).toBeUndefined();
    expect(component.marketDataByMonth['2024-01']['05'].marketPrice).toBe(100);
  });

  it('fills up missing months', () => {
    setMarketData([
      { date: parseISO('2024-01-05T00:00:00.000Z'), marketPrice: 100 },
      { date: parseISO('2024-03-05T00:00:00.000Z'), marketPrice: 110 }
    ]);

    expect(Object.keys(component.marketDataByMonth)).toContain('2024-02');
  });
});
