   // Mirrors advisorflow-api contract v1 (docs/api/openapi.v1.yaml); see api-contract.ts.

export type ClientStatus = 'Prospect' | 'Active' | 'Inactive';

export const CLIENT_STATUSES: readonly ClientStatus[] = ['Prospect', 'Active', 'Inactive'];

export interface HouseholdSummary {
  id: string;
  name: string;
  clientStatus: ClientStatus;
  /** CRM classification tag only — not an investment suitability assessment. */
  riskProfile: string | null;
  priority: string | null;
  memberCount: number;
  primaryContactName: string | null;
}

export interface HouseholdDetail {
  id: string;
  name: string;
  clientStatus: ClientStatus;
  riskProfile: string | null;
  priority: string | null;
  phone: string | null;
  accountNumber: string | null;
  memberCount: number;
}

export interface HouseholdMember {
  id: string;
  householdId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  preferredContactMethod: string | null;
  isPrimary: boolean;
}

export interface PagedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface HouseholdListQuery {
  page: number;
  pageSize: number;
  search: string;
  status: ClientStatus | '';
}
