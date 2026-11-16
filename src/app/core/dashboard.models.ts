// Mirrors advisorflow-api docs/api/openapi.v1.yaml (contract v1.5.0, schema DashboardSummary).
import { OpportunityStage } from './opportunities.models';

export interface NamedCount {
  name: string;
  count: number;
}

export interface StageSummary {
  stage: OpportunityStage;
  count: number;
  /** Advisory fees in the stage (not assets under management). */
  fees: number;
  probability: number;
  weightedFees: number;
}

export interface DashboardSummary {
  /** Today in the practice's time zone (yyyy-MM-dd). */
  asOf: string;
  pipeline: { openCount: number; openFees: number; weightedFees: number; stages: StageSummary[] };
  outcomes: {
    wonCount: number;
    wonFees: number;
    lostCount: number;
    lostFees: number;
    /** won / (won + lost), 0 to 1; null when nothing has closed. */
    winRate: number | null;
    lossReasons: NamedCount[];
  };
  activities: {
    open: number;
    overdue: number;
    dueNext7Days: number;
    completed: number;
    openFromAutomation: number;
  };
  households: { total: number; byStatus: NamedCount[] };
}
