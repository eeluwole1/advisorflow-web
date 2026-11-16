import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Opportunity } from '../../core/opportunities.models';
import { WriteApi, toSaveProblem } from '../../core/write.api';
import { LOSS_REASONS } from '../../core/write.models';
import { nextStages } from './stage-rules';

/**
 * Moves an opportunity to another stage. The API replaces every editable field (PUT), so the
 * opportunity's other values are sent unchanged. Entering Qualification or Proposal Presented
 * makes Salesforce's Flow create a follow-up task (ADR-011); the views refresh to show it.
 */
@Component({
  selector: 'app-stage-mover',
  imports: [FormsModule],
  template: `
    @if (options().length > 0) {
      <form class="flex flex-wrap items-center gap-2" (ngSubmit)="move()">
        <label class="sr-only" [for]="selectId">Move {{ opportunity().name }} to stage</label>
        <select
          [id]="selectId"
          class="rounded-md border border-slate-300 bg-white py-1 pr-7 pl-2 text-xs"
          [ngModel]="target()"
          (ngModelChange)="target.set($event)"
          name="stage"
        >
          <option value="">Move to…</option>
          @for (s of options(); track s) {
            <option [value]="s">{{ s }}</option>
          }
        </select>
        @if (target() === 'Closed Lost') {
          <label class="sr-only" [for]="selectId + '-reason'">Loss reason</label>
          <select
            [id]="selectId + '-reason'"
            class="rounded-md border border-slate-300 bg-white py-1 pr-7 pl-2 text-xs"
            [ngModel]="lossReason()"
            (ngModelChange)="lossReason.set($event)"
            name="lossReason"
          >
            <option value="">Loss reason…</option>
            @for (r of lossReasons; track r) {
              <option [value]="r">{{ r }}</option>
            }
          </select>
        }
        <button type="submit" class="af-btn-primary af-btn-small" [disabled]="!canMove()">
          {{ saving() ? 'Moving…' : 'Move' }}
        </button>
      </form>
      @if (problem(); as message) {
        <p class="af-error" role="alert">{{ message }}</p>
      }
    }
  `,
})
export class StageMover {
  private static nextId = 0;
  private readonly api = inject(WriteApi);

  readonly opportunity = input.required<Opportunity>();

  protected readonly selectId = `stage-mover-${StageMover.nextId++}`;
  protected readonly lossReasons = LOSS_REASONS;
  protected readonly options = computed(() => nextStages(this.opportunity().stage));
  protected readonly target = signal('');
  protected readonly lossReason = signal('');
  protected readonly saving = signal(false);
  protected readonly problem = signal<string | null>(null);

  protected readonly canMove = computed(
    () =>
      !this.saving() &&
      this.target() !== '' &&
      (this.target() !== 'Closed Lost' || this.lossReason() !== ''),
  );

  protected async move(): Promise<void> {
    if (!this.canMove()) return;
    const o = this.opportunity();
    const stage = this.target() as Opportunity['stage'];
    this.saving.set(true);
    this.problem.set(null);
    try {
      await this.api.updateOpportunity(o.id, {
        name: o.name,
        stage,
        closeDate: o.closeDate,
        amount: o.amount,
        serviceType: o.serviceType,
        engagementPriority: o.engagementPriority,
        nextStep: o.nextStep,
        lossReason: stage === 'Closed Lost' ? this.lossReason() : null,
      });
      this.target.set('');
      this.lossReason.set('');
    } catch (error) {
      const p = toSaveProblem(error);
      this.problem.set(p.fields['stage']?.[0] ?? p.fields['lossReason']?.[0] ?? p.message);
    } finally {
      this.saving.set(false);
    }
  }
}
