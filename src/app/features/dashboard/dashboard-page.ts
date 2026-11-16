import { CurrencyPipe, DatePipe, PercentPipe } from '@angular/common';
import { Component, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { dashboardResource } from '../../core/dashboard.api';

/**
 * The practice dashboard (M6): one headline number (open advisory fees), the pipeline by stage as
 * thin single-hue bars, outcomes, follow-ups and households. Every figure comes from the API's
 * aggregates and reconciles to the list pages.
 */
@Component({
  selector: 'app-dashboard-page',
  imports: [CurrencyPipe, DatePipe, PercentPipe, RouterLink],
  templateUrl: './dashboard-page.html',
})
export class DashboardPage {
  protected readonly dashboard = dashboardResource();

  protected readonly summary = computed(() =>
    this.dashboard.hasValue() ? this.dashboard.value() : undefined,
  );

  /** Bar length per stage as a share of the largest stage's fees (0 when all are empty). */
  protected readonly stageBars = computed(() => {
    const s = this.summary();
    if (!s) return [];
    const max = Math.max(0, ...s.pipeline.stages.map((st) => st.fees));
    return s.pipeline.stages.map((st) => ({
      ...st,
      width: max > 0 ? Math.max((st.fees / max) * 100, st.fees > 0 ? 2 : 0) : 0,
    }));
  });
}
