import { httpResource } from '@angular/common/http';
import { inject } from '@angular/core';
import { DashboardSummary } from './dashboard.models';
import { API_BASE_URL } from './households.api';

/** The practice dashboard, loaded once per visit (Retry reloads it). */
export function dashboardResource() {
  const base = inject(API_BASE_URL);
  return httpResource<DashboardSummary>(() => `${base}/api/dashboard`);
}
