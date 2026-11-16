import { Component, computed, input } from '@angular/core';

const STYLES: Record<string, string> = {
  'Closed Won': 'bg-brand-50 text-brand-700 ring-brand-100',
  'Closed Lost': 'bg-slate-100 text-slate-600 ring-slate-200',
};
const OPEN = 'bg-sky-50 text-sky-800 ring-sky-200';

/** An opportunity stage; open stages share one colour, the closed ones are distinct. */
@Component({
  selector: 'app-stage-badge',
  template: `<span
    class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset"
    [class]="classes()"
    >{{ stage() }}</span
  >`,
})
export class StageBadge {
  readonly stage = input.required<string>();
  protected readonly classes = computed(() => STYLES[this.stage()] ?? OPEN);
}
