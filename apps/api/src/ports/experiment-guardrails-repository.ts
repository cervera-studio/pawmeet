export interface VariantUnmatchRow {
  [key: string]: unknown;
  variant: string;
  unmatches: string;
  creates: string;
}

export interface VariantFeedRow {
  [key: string]: unknown;
  variant: string;
  exhausted: string;
  loaded: string;
}

export interface VariantRetentionRow {
  [key: string]: unknown;
  variant: string;
  active_users: string;
  enrolled_users: string;
}

export interface ExperimentGuardrailsRepository {
  getVariantUnmatchRates(baseFilter: {
    dayStart: Date;
    nextDayStart: Date;
  }): Promise<VariantUnmatchRow[]>;
  getVariantFeedEmptyRates(baseFilter: {
    dayStart: Date;
    nextDayStart: Date;
  }): Promise<VariantFeedRow[]>;
  getVariantRetentionRates(baseFilter: {
    dayStart: Date;
    nextDayStart: Date;
  }): Promise<VariantRetentionRow[]>;
}
