import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { PIPELINE_PAGE_SIZE, opportunitiesResource } from '../../core/opportunities.api';
import {
  OPPORTUNITY_STAGES,
  Opportunity,
  OpportunityListQuery,
  OpportunityStage,
} from '../../core/opportunities.models';
import { AuthService } from '../../core/auth';
import { todayIso } from '../../shared/dates';
import { StageMover } from './stage-mover';

interface StageColumn {
  stage: OpportunityStage;
  items: Opportunity[];
  /** Sum of the advisory fees in this column (null amounts count as 0). */
  total: number;
}

/**
 * The opportunity pipeline (M4): one column per stage of the AdvisorFlow Advisory sales
 * process, ordered by close date within each column. A signed-in advisor can move a card to
 * another stage (BR-OP-004); everyone else sees it read-only (ADR-015).
 */
@Component({
  selector: 'app-opportunities-page',
  imports: [RouterLink, CurrencyPipe, DatePipe, StageMover],
  templateUrl: './opportunities-page.html',
})
export class OpportunitiesPage {
  protected readonly auth = inject(AuthService);

  protected readonly pageSize = PIPELINE_PAGE_SIZE;
  protected readonly today = todayIso();

  protected readonly searchText = signal('');
  protected readonly showClosed = signal(false);

  private readonly debouncedSearch = toSignal(
    toObservable(this.searchText).pipe(debounceTime(250), distinctUntilChanged()),
    { initialValue: '' },
  );

  private readonly query = computed<OpportunityListQuery>(() => ({
    search: this.debouncedSearch(),
  }));

  protected readonly opportunities = opportunitiesResource(this.query);

  protected readonly result = computed(() =>
    this.opportunities.hasValue() ? this.opportunities.value() : undefined,
  );

  protected readonly columns = computed<StageColumn[]>(() => {
    const items = this.result()?.items ?? [];
    const stages = OPPORTUNITY_STAGES.filter(
      (s) => this.showClosed() || (s !== 'Closed Won' && s !== 'Closed Lost'),
    );
    return stages.map((stage) => {
      const inStage = items.filter((o) => o.stage === stage);
      return { stage, items: inStage, total: inStage.reduce((sum, o) => sum + (o.amount ?? 0), 0) };
    });
  });

  /** Open opportunities and their estimated advisory fees (BR-OP-003: not AUM). */
  protected readonly openSummary = computed(() => {
    const open = (this.result()?.items ?? []).filter((o) => !o.isClosed);
    return { count: open.length, fees: open.reduce((sum, o) => sum + (o.amount ?? 0), 0) };
  });

  protected isOverdue(o: Opportunity): boolean {
    return !o.isClosed && o.closeDate < this.today;
  }
}
