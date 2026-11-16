import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { Opportunity } from '../../core/opportunities.models';
import { todayIso } from '../../shared/dates';
import { StageBadge } from '../../shared/stage-badge';

/** A household's opportunities, ordered by close date (as the API returns them). */
@Component({
  selector: 'app-household-opportunities',
  imports: [CurrencyPipe, DatePipe, StageBadge],
  template: `
    @if (opportunities().length === 0) {
      <p
        class="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-500"
      >
        No opportunities for this household yet.
      </p>
    } @else {
      <ul class="space-y-2">
        @for (o of opportunities(); track o.id) {
          <li class="rounded-xl bg-white px-4 py-3 ring-1 ring-slate-200" data-testid="opportunity">
            <div class="flex items-start justify-between gap-3">
              <p class="font-medium">{{ o.name }}</p>
              <app-stage-badge [stage]="o.stage" />
            </div>
            <p class="mt-1 text-sm text-slate-500">
              <span title="Estimated advisory service revenue, not assets under management.">
                Advisory fee
                {{
                  o.amount === null ? '—' : (o.amount | currency: 'CAD' : 'symbol-narrow' : '1.0-0')
                }}
              </span>
              <span class="text-slate-300">·</span>
              <span [class.text-red-700]="!o.isClosed && o.closeDate < today">
                {{ o.isClosed ? 'Closed' : 'Closes' }} {{ o.closeDate | date: 'mediumDate' }}
              </span>
              @if (o.lossReason) {
                <span class="text-slate-300">·</span> {{ o.lossReason }}
              }
            </p>
          </li>
        }
      </ul>
    }
  `,
})
export class HouseholdOpportunities {
  readonly opportunities = input.required<Opportunity[]>();
  protected readonly today = todayIso();
}
