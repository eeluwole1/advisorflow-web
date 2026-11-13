import { Component, input } from '@angular/core';
import { HouseholdMember } from '../../core/households.models';

/** Members (Contacts) of one household; the API returns the primary member first. */
@Component({
  selector: 'app-household-members',
  template: `
    @if (members().length === 0) {
      <p
        class="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-500"
      >
        No members linked to this household yet.
      </p>
    } @else {
      <ul class="space-y-2">
        @for (m of members(); track m.id) {
          <li class="rounded-xl bg-white px-4 py-3 ring-1 ring-slate-200" data-testid="member">
            <div class="flex items-center justify-between gap-3">
              <p class="font-medium">
                {{ m.fullName }}
                @if (m.isPrimary) {
                  <span
                    class="ml-1.5 rounded bg-brand-500 px-1.5 py-0.5 align-middle text-[10px] font-semibold tracking-wide text-white uppercase"
                    >Primary</span
                  >
                }
              </p>
              <p class="text-xs text-slate-500">
                @if (m.preferredContactMethod) {
                  Prefers <span class="font-medium text-ink">{{ m.preferredContactMethod }}</span>
                } @else {
                  <span class="text-amber-700">No contact preference</span>
                }
              </p>
            </div>
            <p class="mt-1 truncate text-sm text-slate-500">
              {{ m.email ?? 'No email' }} <span class="text-slate-300">·</span>
              {{ m.phone ?? 'No phone' }}
            </p>
          </li>
        }
      </ul>
    }
  `,
})
export class HouseholdMembers {
  readonly members = input.required<HouseholdMember[]>();
}
