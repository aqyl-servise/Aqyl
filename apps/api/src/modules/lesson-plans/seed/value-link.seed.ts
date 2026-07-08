import { ADAL_AZAMAT_VALUES } from '../../kmzh/constants/adal-azamat.constants';

export interface ValueLinkSeed {
  month: string;
  valueKz: string;
  valueRu: string;
  valueEn: string;
}

// Reuse the existing Adal Azamat reference (month → value) as the seed.
export const VALUE_LINK_SEED: ValueLinkSeed[] = Object.entries(ADAL_AZAMAT_VALUES).map(
  ([month, v]) => ({ month, valueKz: v.kz, valueRu: v.ru, valueEn: v.en }),
);
