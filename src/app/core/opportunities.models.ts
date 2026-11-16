// Mirrors advisorflow-api contract v1.3 (docs/api/openapi.v1.yaml); see api-contract.ts.

/** The AdvisorFlow Advisory sales process, in pipeline order (blueprint §9, ADR-010). */
export const OPPORTUNITY_STAGES = [
  'Prospecting',
  'Qualification',
  'Needs Assessment',
  'Proposal Presented',
  'Negotiation/Review',
  'Closed Won',
  'Closed Lost',
] as const;

export type OpportunityStage = (typeof OPPORTUNITY_STAGES)[number];

export interface Opportunity {
  id: string;
  householdId: string;
  householdName: string;
  name: string;
  stage: OpportunityStage;
  /** True for Closed Won and Closed Lost. */
  isClosed: boolean;
  /** ISO date, yyyy-MM-dd. */
  closeDate: string;
  /** Estimated advisory service revenue — NOT assets under management (BR-OP-003). */
  amount: number | null;
  /** Percent, set by Salesforce from the stage. */
  probability: number | null;
  serviceType: string | null;
  engagementPriority: string | null;
  nextStep: string | null;
  /** Set only when the stage is Closed Lost (BR-OP-002). */
  lossReason: string | null;
}

export interface OpportunityListQuery {
  search: string;
  householdId?: string;
}
