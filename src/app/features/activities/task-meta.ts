import { DatePipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { Activity } from '../../core/activities.models';

/**
 * The due date and status line shared by every task list: overdue in red, "No due date" when
 * there is none, the priority when it is High, and a tag for tasks the follow-up Flow created.
 */
@Component({
  selector: 'app-task-meta',
  imports: [DatePipe],
  template: `
    @let t = task();
    @if (t.isOverdue) {
      <span
        class="rounded bg-red-50 px-1.5 py-0.5 text-xs font-medium text-red-700 ring-1 ring-red-200"
        data-testid="overdue"
        >Overdue</span
      >
    }
    <span [class.text-red-700]="t.isOverdue" [class.font-medium]="t.isOverdue">
      @if (t.dueDate) {
        {{ t.isClosed ? 'Was due' : 'Due' }} {{ t.dueDate | date: 'MMM d, y' }}
      } @else {
        No due date
      }
    </span>
    <span class="text-slate-300">·</span>
    <span>{{ t.status }}</span>
    @if (t.priority === 'High') {
      <span class="text-slate-300">·</span>
      <span class="font-medium text-amber-700">High priority</span>
    }
    @if (t.automation) {
      <span
        class="rounded bg-sky-50 px-1.5 py-0.5 text-xs font-medium text-sky-800 ring-1 ring-sky-200"
        title="Created automatically by the Salesforce follow-up Flow"
        data-testid="automation"
        >Auto · {{ t.automation }}</span
      >
    }
  `,
  host: { class: 'flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-slate-500' },
})
export class TaskMeta {
  readonly task = input.required<Activity>();
}
