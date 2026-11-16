import { httpResource } from '@angular/common/http';
import { Signal, inject } from '@angular/core';
import { Activity, ActivityListQuery } from './activities.models';
import { API_BASE_URL } from './households.api';
import { DataRefresh } from './data-refresh';
import { PagedResponse } from './households.models';

/** Reactive task list that refetches whenever the query signal changes. */
export function activitiesResource(query: Signal<ActivityListQuery>) {
  const base = inject(API_BASE_URL);
  const refresh = inject(DataRefresh);
  return httpResource<PagedResponse<Activity>>(() => {
    refresh.version();
    const q = query();
    const params: Record<string, string | number> = {
      page: q.page,
      pageSize: q.pageSize,
      state: q.state,
    };
    if (q.search.trim()) params['search'] = q.search.trim();
    return { url: `${base}/api/activities`, params };
  });
}

/** Tasks of the selected household, including those on its opportunities (open first). */
export function householdActivitiesResource(id: Signal<string | undefined>) {
  const base = inject(API_BASE_URL);
  const refresh = inject(DataRefresh);
  return httpResource<Activity[]>(() => {
    refresh.version();
    const value = id();
    return value ? `${base}/api/households/${encodeURIComponent(value)}/activities` : undefined;
  });
}
