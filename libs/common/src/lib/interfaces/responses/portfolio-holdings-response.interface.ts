import {
  AssetProfileIdentifier,
  PortfolioPosition
} from '@ghostfolio/common/interfaces';

export interface PortfolioHoldingsResponse {
  /** Asset profiles of activities excluded due to missing exchange rates */
  exchangeRateErrors?: AssetProfileIdentifier[];
  holdings: PortfolioPosition[];
}
