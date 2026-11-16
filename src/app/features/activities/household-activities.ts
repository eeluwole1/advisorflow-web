import { Component, input } from '@angular/core';
import { Activity } from '../../core/activities.models';
import { TaskMeta } from './task-meta';

/** A household's follow-up tasks, open first (as the API returns them). */
@Component({
  selector: 'app-household-activities',
  imports: [TaskMeta],
  template: `
    @if (activities().length === 0) {
      <p
        class="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-500"
      >
        No follow-ups for this household yet.
      </p>
    } @else {
      <ul class="space-y-2">
        @for (t of activities(); track t.id) {
          <li class="rounded-xl bg-white px-4 py-3 ring-1 ring-slate-200" data-testid="activity">
            <p class="font-medium" [class.text-slate-500]="t.isClosed">{{ t.subject }}</p>
            @if (t.relatedToType === 'Opportunity' && t.relatedToName) {
              <p class="text-sm text-slate-500">{{ t.relatedToName }}</p>
            }
            <app-task-meta class="mt-1" [task]="t" />
          </li>
        }
      </ul>
    }
  `,
})
export class HouseholdActivities {
  readonly activities = input.required<Activity[]>();
}
