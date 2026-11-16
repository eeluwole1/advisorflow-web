import { Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { householdsResource } from '../../core/households.api';
import { CLIENT_STATUSES, ClientStatus, HouseholdListQuery } from '../../core/households.models';
import { AuthService } from '../../core/auth';
import { HouseholdDetail } from '../../core/households.models';
import { StatusBadge } from '../../shared/status-badge';
import { HouseholdForm } from './household-form';
import { HouseholdDetail as HouseholdDetailView } from './household-detail';

const PAGE_SIZE = 10;

@Component({
  selector: 'app-households-page',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, StatusBadge, HouseholdForm],
  templateUrl: './households-page.html',
})
export class HouseholdsPage {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /**
   * A household is open in the right-hand pane. On phones and small tablets
   * the list and the household take turns on screen instead of stacking.
   */
  protected readonly showingHousehold = signal(false);

  protected onActivate(component: unknown): void {
    this.showingHousehold.set(component instanceof HouseholdDetailView);
  }

  /** The New household form is open. */
  protected readonly creating = signal(false);

  protected onCreated(household: HouseholdDetail | null): void {
    this.creating.set(false);
    if (household) {
      void this.router.navigate(['/clients', household.id]);
    }
  }

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
