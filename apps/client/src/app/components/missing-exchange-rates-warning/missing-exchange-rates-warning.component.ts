import { AssetProfileIdentifier } from '@ghostfolio/common/interfaces';

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  input
} from '@angular/core';
import { addIcons } from 'ionicons';
import { warningOutline } from 'ionicons/icons';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'gf-missing-exchange-rates-warning',
  styleUrls: ['./missing-exchange-rates-warning.component.scss'],
  templateUrl: './missing-exchange-rates-warning.component.html'
})
export class GfMissingExchangeRatesWarningComponent {
  public readonly exchangeRateErrors = input<
    AssetProfileIdentifier[] | undefined
  >([]);

  protected readonly affectedAssets = computed(() => {
    return (this.exchangeRateErrors() ?? [])
      .map(({ dataSource, symbol }) => {
        return `${symbol} (${dataSource})`;
      })
      .join(', ');
  });

  protected readonly hasExchangeRateErrors = computed(() => {
    return (this.exchangeRateErrors()?.length ?? 0) > 0;
  });

  public constructor() {
    addIcons({ warningOutline });
  }
}
