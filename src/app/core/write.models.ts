// Request bodies of the advisorflow-api create/update endpoints (contract 1.1.0–1.6.0).
// PUT replaces every editable field: an omitted or empty optional field is cleared.

import { OpportunityStage } from './opportunities.models';

export const RISK_PROFILES = ['Conservative', 'Moderate', 'Aggressive'] as const;
export const PRIORITIES = ['High', 'Medium', 'Low'] as const;
export const CONTACT_METHODS = ['Email', 'Phone', 'SMS'] as const;
export const SERVICE_TYPES = [
  'Retirement Planning',
  'Investment Advisory',
  'Financial Review',
  'Other',
] as const;
export const ENGAGEMENT_PRIORITIES = ['High', 'Medium', 'Low'] as const;
export const LOSS_REASONS = [
  'Chose another advisor',
  'Fees',
  'Timing',
  'Needs changed',
  'No response',
  'Other',
] as const;

export interface HouseholdWrite {
  name: string;
  clientStatus: string;
  riskProfile: string | null;
  priority: string | null;
  phone: string | null;
}

export interface MemberWrite {
  firstName: string | null;
  lastName: string;
  email: string | null;
  phone: string | null;
  preferredContactMethod: string | null;
  isPrimary: boolean;
}

export interface OpportunityWrite {
  name: string;
  stage: OpportunityStage;
  /** yyyy-MM-dd */
  closeDate: string;
  amount: number | null;
  serviceType: string | null;
  engagementPriority: string | null;
  nextStep: string | null;
  lossReason: string | null;
}
