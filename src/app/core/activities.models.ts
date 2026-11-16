// Mirrors advisorflow-api docs/api/openapi.v1.yaml (contract v1.4.0, schemas Activity and ActivityPage).

/** Which tasks a list shows (`state` query parameter). */
export const ACTIVITY_STATES = ['open', 'overdue', 'closed', 'all'] as const;
export type ActivityState = (typeof ACTIVITY_STATES)[number];

/** A follow-up task (Salesforce Task) on a household or one of its opportunities. */
export interface Activity {
  id: string;
  subject: string;
  /** Salesforce task status, e.g. Not Started, In Progress, Waiting on someone else, Completed. */
  status: string;
  priority: string | null;
  /** ISO date (yyyy-MM-dd) or null. */
  dueDate: string | null;
  isClosed: boolean;
  /** Open and due before today in the practice's time zone (computed by the API, BR-ACT-003). */
  isOverdue: boolean;
  householdId: string;
  householdName: string;
  relatedToId: string | null;
  relatedToName: string | null;
  /** `Household` or `Opportunity`. */
  relatedToType: string | null;
  contactName: string | null;
  ownerName: string | null;
  /** Set when the follow-up Flow created the task: `Qualification follow-up` or `Proposal review`. */
  automation: string | null;
}

export interface ActivityListQuery {
  page: number;
  pageSize: number;
  search: string;
  state: ActivityState;
}
