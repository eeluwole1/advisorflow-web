import { Component, computed, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { activitiesResource } from '../../core/activities.api';
import { ActivityListQuery, ActivityState } from '../../core/activities.models';
import { TaskMeta } from './task-meta';

const PAGE_SIZE = 20;

/** Follow-up tasks across all households: open by default, with overdue, closed and all views. */
@Component({
  selector: 'app-activities-page',
  imports: [RouterLink, TaskMeta],
  templateUrl: './activities-page.html',
})
export class ActivitiesPage {
  protected readonly views: { state: ActivityState; label: string }[] = [
    { state: 'open', label: 'Open' },
    { state: 'overdue', label: 'Overdue' },
    { state: 'closed', label: 'Completed' },
    { state: 'all', label: 'All' },
  ];

  protected readonly searchText = signal('');
  protected readonly state = signal<ActivityState>('open');
  protected readonly page = signal(1);

  private readonly debouncedSearch = toSignal(
    toObservable(this.searchText).pipe(debounceTime(250), distinctUntilChanged()),
    { initialValue: '' },
  );

  private readonly query = computed<ActivityListQuery>(() => ({
    page: this.page(),
    pageSize: PAGE_SIZE,
    search: this.debouncedSearch(),
    state: this.state(),
  }));

  protected readonly activities = activitiesResource(this.query);

  protected readonly result = computed(() =>
    this.activities.hasValue() ? this.activities.value() : undefined,
  );

  protected readonly countLabel = computed(() => {
    const r = this.result();
    if (!r) return '';
    const noun = r.totalCount === 1 ? 'task' : 'tasks';
    switch (this.state()) {
      case 'open':
        return `${r.totalCount} open ${noun}`;
      case 'overdue':
        return `${r.totalCount} overdue ${noun}`;
      case 'closed':
        return `${r.totalCount} completed ${noun}`;
      default:
        return `${r.totalCount} ${noun}`;
    }
  });

  protected onSearch(value: string): void {
    this.searchText.set(value);
    this.page.set(1);
  }

  protected show(state: ActivityState): void {
    this.state.set(state);
    this.page.set(1);
  }

  protected goTo(page: number): void {
    const total = this.result()?.totalPages ?? 1;
    this.page.set(Math.min(Math.max(1, page), Math.max(1, total)));
  }
}
