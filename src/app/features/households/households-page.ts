import { Component, computed, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { householdsResource } from '../../core/households.api';
import { CLIENT_STATUSES, ClientStatus, HouseholdListQuery } from '../../core/households.models';
import { StatusBadge } from '../../shared/status-badge';

const PAGE_SIZE = 10;

@Component({
  selector: 'app-households-page',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, StatusBadge],
  templateUrl: './households-page.html',
})
export class HouseholdsPage {
  protected readonly statuses = CLIENT_STATUSES;

  protected readonly searchText = signal('');
  protected readonly status = signal<ClientStatus | ''>('');
  protected readonly page = signal(1);

  private readonly debouncedSearch = toSignal(
    toObservable(this.searchText).pipe(debounceTime(250), distinctUntilChanged()),
    { initialValue: '' },
  );

  private readonly query = computed<HouseholdListQuery>(() => ({
    page: this.page(),
    pageSize: PAGE_SIZE,
    search: this.debouncedSearch(),
    status: this.status(),
  }));

  protected readonly households = householdsResource(this.query);

  protected readonly result = computed(() =>
    this.households.hasValue() ? this.households.value() : undefined,
  );

  protected onSearch(value: string): void {
    this.searchText.set(value);
    this.page.set(1);
  }

  protected onStatus(value: string): void {
    this.status.set(value as ClientStatus | '');
    this.page.set(1);
  }

  protected goTo(page: number): void {
    const total = this.result()?.totalPages ?? 1;
    this.page.set(Math.min(Math.max(1, page), Math.max(1, total)));
  }
}
