import { AssetProfileIdentifier } from '@ghostfolio/common/interfaces';

export interface ResponseError {
  errors?: AssetProfileIdentifier[];
  /** Asset profiles of activities excluded due to missing exchange rates */
  exchangeRateErrors?: AssetProfileIdentifier[];
  hasErrors: boolean;
}
