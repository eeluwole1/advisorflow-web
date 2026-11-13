import { httpResource } from '@angular/common/http';
import { InjectionToken, Signal, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import {
  HouseholdDetail,
  HouseholdListQuery,
  HouseholdMember,
  PagedResponse,
  HouseholdSummary,
} from './households.models';

/**
 * Base URL of advisorflow-api, from src/environments. Empty in development, where the
 * Angular dev server proxies /api to the API (proxy.conf.json); absolute in production,
 * because the API is deployed separately.
 */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => environment.apiBaseUrl.replace(/\/+$/, ''),
});

/** Reactive household list that refetches whenever the query signal changes. */
export function householdsResource(query: Signal<HouseholdListQuery>) {
  const base = inject(API_BASE_URL);
  return httpResource<PagedResponse<HouseholdSummary>>(() => {
    const q = query();
    const params: Record<string, string | number> = { page: q.page, pageSize: q.pageSize };
    if (q.search.trim()) params['search'] = q.search.trim();
    if (q.status) params['status'] = q.status;
    return { url: `${base}/api/households`, params };
  });
}

/** Household detail for the selected id; idle when no household is selected. */
export function householdResource(id: Signal<string | undefined>) {
  const base = inject(API_BASE_URL);
  return httpResource<HouseholdDetail>(() => {
    const value = id();
    return value ? `${base}/api/households/${encodeURIComponent(value)}` : undefined;
  });
}

/** Members (Contacts) of the selected household. */
export function householdMembersResource(id: Signal<string | undefined>) {
  const base = inject(API_BASE_URL);
  return httpResource<HouseholdMember[]>(() => {
    const value = id();
    return value ? `${base}/api/households/${encodeURIComponent(value)}/contacts` : undefined;
  });
}
