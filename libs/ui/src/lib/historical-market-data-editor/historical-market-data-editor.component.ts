import { UpdateMarketDataDto } from '@ghostfolio/common/dtos';
import {
  DATE_FORMAT,
  getDateFormatString,
  getLocale
} from '@ghostfolio/common/helper';
import { LineChartItem, User } from '@ghostfolio/common/interfaces';
import type { MarketData } from '@ghostfolio/prisma/browser';
import { DataSource } from '@ghostfolio/prisma/enums';
import { DataService } from '@ghostfolio/ui/services';

import { CommonModule } from '@angular/common';
import type { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  EventEmitter,
  inject,
  input,
  Input,
  OnChanges,
  OnInit,
  Output
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { utc, UTCDate } from '@date-fns/utc';
import {
  addDays,
  addMonths,
  format,
  isBefore,
  isSameDay,
  isValid,
  min,
  parse,
  parseISO,
  startOfDay
} from 'date-fns';
import ms from 'ms';
import { DeviceDetectorService } from 'ngx-device-detector';
import { parse as csvToJson } from 'papaparse';
import { EMPTY } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { GfHistoricalMarketDataEditorDialogComponent } from './historical-market-data-editor-dialog/historical-market-data-editor-dialog.component';
import { HistoricalMarketDataEditorDialogParams } from './historical-market-data-editor-dialog/interfaces/interfaces';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatButtonModule, MatInputModule, ReactiveFormsModule],
  selector: 'gf-historical-market-data-editor',
  styleUrls: ['./historical-market-data-editor.component.scss'],
  templateUrl: './historical-market-data-editor.component.html'
})
export class GfHistoricalMarketDataEditorComponent
  implements OnChanges, OnInit
{
  private static readonly HISTORICAL_DATA_TEMPLATE = `date;marketPrice\n${format(
    new Date(),
    DATE_FORMAT
  )};123.45`;

  @Input() currency?: string;
  @Input() dataSource: DataSource;
  @Input() dateOfFirstActivity?: Date;
  @Input() symbol: string;
  @Input() user: User;

  @Output() marketDataChanged = new EventEmitter<boolean>();

  public historicalDataForm = this.formBuilder.group({
    historicalData: this.formBuilder.group({
      csvString: ''
    })
  });
  public marketDataByMonth: {
    [yearMonth: string]: {
      [day: string]: {
        date: Date;
        day: number;
        marketPrice?: number;
      };
    };
  } = {};

  public readonly locale = input(getLocale());
  public readonly marketData = input.required<MarketData[]>();

  protected readonly days = Array.from({ length: 31 }, (_, i) => i + 1);
  protected readonly defaultDateFormat = computed(() =>
    getDateFormatString(this.locale())
  );

  private readonly destroyRef = inject(DestroyRef);
  private readonly deviceDetectorService = inject(DeviceDetectorService);
  private readonly deviceType = computed(
    () => this.deviceDetectorService.deviceInfo().deviceType
  );
  private readonly historicalDataItems = computed<LineChartItem[]>(() =>
    this.marketData().map(({ date, marketPrice }) => {
      return {
        date: format(date, DATE_FORMAT, { in: utc }),
        value: marketPrice
      };
    })
  );

  public constructor(
    private dataService: DataService,
    private dialog: MatDialog,
    private formBuilder: FormBuilder,
    private snackBar: MatSnackBar
  ) {}

  public ngOnInit() {
    this.initializeHistoricalDataForm();
  }

  public ngOnChanges() {
    // Market data is stored per calendar day (UTC midnight), so the days are
    // derived in UTC to be independent of the time zone of the browser
    const firstDate = this.dateOfFirstActivity ?? this.marketData()[0]?.date;

    if (!firstDate) {
      return;
    }

    // `dateOfFirstActivity` may be an ISO string at runtime
    const startDate = startOfDay(new UTCDate(firstDate), { in: utc });

    let date = startDate;

    const missingMarketData: { date: Date; marketPrice?: number }[] = [];

    if (this.historicalDataItems()?.[0]?.date) {
      const firstMarketDataDate = parseISO(this.historicalDataItems()[0].date, {
        in: utc
      });

      while (isBefore(date, firstMarketDataDate)) {
        missingMarketData.push({
          date,
          marketPrice: undefined
        });

        date = addDays(date, 1, { in: utc });
      }
    }

    const marketDataItems = [...missingMarketData, ...this.marketData()];

    // Add the current day of the browser as placeholder, unless the day is
    // already available (to not overwrite a stored price)
    const todayString = format(new Date(), DATE_FORMAT);

    if (
      !marketDataItems.some(({ date: itemDate }) => {
        return format(itemDate, DATE_FORMAT, { in: utc }) === todayString;
      })
    ) {
      marketDataItems.push({ date: parseISO(todayString, { in: utc }) });
    }

    this.marketDataByMonth = {};

    for (const marketDataItem of marketDataItems) {
      const currentDay = parseInt(
        format(marketDataItem.date, 'd', { in: utc }),
        10
      );
      const key = format(marketDataItem.date, 'yyyy-MM', { in: utc });

      if (!this.marketDataByMonth[key]) {
        this.marketDataByMonth[key] = {};
      }

      this.marketDataByMonth[key][
        currentDay < 10 ? `0${currentDay}` : currentDay
      ] = {
        date: marketDataItem.date,
        day: currentDay,
        marketPrice: marketDataItem.marketPrice
      };
    }

    // Fill up missing months
    const dates = Object.keys(this.marketDataByMonth).sort();
    const startDateString = dates[0];
    const endDateString = dates.at(-1);

    if (endDateString) {
      const endDate = parseISO(endDateString, { in: utc });

      let currentDate = min(
        [
          startDate,
          ...(startDateString ? [parseISO(startDateString, { in: utc })] : [])
        ],
        { in: utc }
      );

      while (isBefore(currentDate, endDate)) {
        const key = format(currentDate, 'yyyy-MM', { in: utc });
        if (!this.marketDataByMonth[key]) {
          this.marketDataByMonth[key] = {};
        }

        currentDate = addMonths(currentDate, 1, { in: utc });
      }
    }
  }

  public formatDay(day: number): string {
    return day < 10 ? `0${day}` : `${day}`;
  }

  public isDateOfInterest(aDateString: string) {
    // Date is valid and in the past
    const date = parse(aDateString, DATE_FORMAT, new Date());
    return isValid(date) && isBefore(date, new Date());
  }

  public isToday(aDateString: string) {
    const date = parse(aDateString, DATE_FORMAT, new Date());
    return isValid(date) && isSameDay(date, new Date());
  }

  public onOpenMarketDataDetail({
    day,
    yearMonth
  }: {
    day: string;
    yearMonth: string;
  }) {
    const marketPrice = this.marketDataByMonth[yearMonth]?.[day]?.marketPrice;

    const dialogRef = this.dialog.open<
      GfHistoricalMarketDataEditorDialogComponent,
      HistoricalMarketDataEditorDialogParams,
      { withRefresh: boolean }
    >(GfHistoricalMarketDataEditorDialogComponent, {
      data: {
        marketPrice,
        currency: this.currency,
        dataSource: this.dataSource,
        dateString: `${yearMonth}-${day}`,
        symbol: this.symbol,
        user: this.user
      },
      height: this.deviceType() === 'mobile' ? '98vh' : '80vh',
      width: this.deviceType() === 'mobile' ? '100vw' : '50rem'
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ withRefresh } = { withRefresh: false }) => {
        this.marketDataChanged.emit(withRefresh);
      });
  }

  public onImportHistoricalData() {
    try {
      const marketData = csvToJson<UpdateMarketDataDto>(
        this.historicalDataForm.controls.historicalData.controls.csvString
          .value ?? '',
        {
          dynamicTyping: true,
          header: true,
          skipEmptyLines: true
        }
      ).data;

      this.dataService
        .postMarketData({
          dataSource: this.dataSource,
          marketData: {
            marketData
          },
          symbol: this.symbol
        })
        .pipe(
          catchError(({ error, message }: HttpErrorResponse) => {
            this.snackBar.open(`${error}: ${message[0]}`, undefined, {
              duration: ms('3 seconds')
            });
            return EMPTY;
          }),
          takeUntilDestroyed(this.destroyRef)
        )
        .subscribe(() => {
          this.initializeHistoricalDataForm();

          this.marketDataChanged.emit(true);
        });
    } catch {
      this.snackBar.open(
        $localize`Oops! Could not parse historical data.`,
        undefined,
        {
          duration: ms('3 seconds')
        }
      );
    }
  }

  private initializeHistoricalDataForm() {
    this.historicalDataForm.setValue({
      historicalData: {
        csvString:
          GfHistoricalMarketDataEditorComponent.HISTORICAL_DATA_TEMPLATE
      }
    });
  }
}
