import { httpResource } from '@angular/common/http';
import { Signal, inject } from '@angular/core';
import { API_BASE_URL } from './households.api';
import { DataRefresh } from './data-refresh';
import { PagedResponse } from './households.models';
import { Opportunity, OpportunityListQuery } from './opportunities.models';

/** The pipeline loads one page of this size and groups it by stage on the client. */
export const PIPELINE_PAGE_SIZE = 100;

/** Reactive opportunity pipeline that refetches whenever the query signal changes. */
export function opportunitiesResource(query: Signal<OpportunityListQuery>) {
  const base = inject(API_BASE_URL);
  const refresh = inject(DataRefresh);
  return httpResource<PagedResponse<Opportunity>>(() => {
    refresh.version();
    const q = query();
    const params: Record<string, string | number> = { page: 1, pageSize: PIPELINE_PAGE_SIZE };
    if (q.search.trim()) params['search'] = q.search.trim();
    if (q.householdId) params['householdId'] = q.householdId;
    return { url: `${base}/api/opportunities`, params };
  });
}

/** Opportunities of the selected household, ordered by close date. */
export function householdOpportunitiesResource(id: Signal<string | undefined>) {
  const base = inject(API_BASE_URL);
  const refresh = inject(DataRefresh);
  return httpResource<Opportunity[]>(() => {
    refresh.version();
    const value = id();
    return value ? `${base}/api/households/${encodeURIComponent(value)}/opportunities` : undefined;
  });
}
