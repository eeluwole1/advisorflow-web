import { Component, computed, input } from '@angular/core';

const STYLES: Record<string, string> = {
  Prospect: 'bg-amber-50 text-amber-800 ring-amber-200',
  Active: 'bg-brand-50 text-brand-700 ring-brand-100',
  Inactive: 'bg-slate-100 text-slate-600 ring-slate-200',
};

@Component({
  selector: 'app-status-badge',
  template: `<span
    class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset"
    [class]="classes()"
    >{{ status() }}</span
  >`,
})
export class StatusBadge {
  readonly status = input.required<string>();
  protected readonly classes = computed(() => STYLES[this.status()] ?? STYLES['Inactive']);
}
