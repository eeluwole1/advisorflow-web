import { Component, inject, input, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { OPPORTUNITY_STAGES, Opportunity } from '../../core/opportunities.models';
import { SaveProblem, WriteApi, toSaveProblem } from '../../core/write.api';
import {
  ENGAGEMENT_PRIORITIES,
  LOSS_REASONS,
  OpportunityWrite,
  SERVICE_TYPES,
} from '../../core/write.models';
import { FormDialog } from '../../shared/form-dialog';

type OpportunityField = 'name' | 'stage' | 'closeDate' | 'amount' | 'nextStep' | 'lossReason';

/** In 90 days, the default close date for a new opportunity. */
function defaultCloseDate(now = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 90);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * New advisory opportunity for a household (contract 1.3, BR-OP-001 to 003). The amount is the
 * estimated advisory fee, not assets under management. Starting in Qualification or Proposal
 * Presented makes Salesforce's Flow create a follow-up task (ADR-011).
 */
@Component({
  selector: 'app-opportunity-form',
  imports: [ReactiveFormsModule, FormDialog],
  template: `
    <app-form-dialog
      heading="New opportunity"
      [subheading]="householdName()"
      (closed)="done.emit(null)"
    >
      <form [formGroup]="form" (ngSubmit)="save()" novalidate class="space-y-4">
        <div>
          <label class="af-label" for="o-name">Name</label>
          <input
            id="o-name"
            class="af-input"
            formControlName="name"
            maxlength="120"
            [attr.aria-invalid]="!!error('name')"
          />
          @if (error('name'); as message) {
            <p class="af-error">{{ message }}</p>
          }
        </div>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label class="af-label" for="o-service">Service type</label>
            <select
              id="o-service"
              class="af-input"
              formControlName="serviceType"
              (change)="suggestName()"
            >
              <option value="">Not set</option>
              @for (s of serviceTypes; track s) {
                <option [value]="s">{{ s }}</option>
              }
            </select>
          </div>
          <div>
            <label class="af-label" for="o-stage">Stage</label>
            <select id="o-stage" class="af-input" formControlName="stage">
              @for (s of stages; track s) {
                <option [value]="s">{{ s }}</option>
              }
            </select>
            @if (error('stage'); as message) {
              <p class="af-error">{{ message }}</p>
            }
          </div>
        </div>

        @if (form.controls.stage.value === 'Closed Lost') {
          <div>
            <label class="af-label" for="o-loss">Loss reason</label>
            <select id="o-loss" class="af-input" formControlName="lossReason">
              <option value="">Choose a reason</option>
              @for (r of lossReasons; track r) {
                <option [value]="r">{{ r }}</option>
              }
            </select>
            @if (error('lossReason'); as message) {
              <p class="af-error">{{ message }}</p>
            }
          </div>
        }

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label class="af-label" for="o-close">Close date</label>
            <input
              id="o-close"
              class="af-input"
              type="date"
              formControlName="closeDate"
              [attr.aria-invalid]="!!error('closeDate')"
            />
            @if (error('closeDate'); as message) {
              <p class="af-error">{{ message }}</p>
            }
          </div>
          <div>
            <label class="af-label" for="o-amount">Advisory fee (CAD)</label>
            <input
              id="o-amount"
              class="af-input"
              type="number"
              min="0"
              step="0.01"
              formControlName="amount"
              [attr.aria-invalid]="!!error('amount')"
            />
            <p class="af-hint">Estimated fee, not assets.</p>
            @if (error('amount'); as message) {
              <p class="af-error">{{ message }}</p>
            }
          </div>
          <div>
            <label class="af-label" for="o-priority">Priority</label>
            <select id="o-priority" class="af-input" formControlName="engagementPriority">
              <option value="">Not set</option>
              @for (p of priorities; track p) {
                <option [value]="p">{{ p }}</option>
              }
            </select>
          </div>
        </div>

        <div>
          <label class="af-label" for="o-next">Next step</label>
          <input id="o-next" class="af-input" formControlName="nextStep" maxlength="255" />
          @if (error('nextStep'); as message) {
            <p class="af-error">{{ message }}</p>
          }
        </div>

        @if (problem(); as p) {
          <p class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
            {{ p.message }}
          </p>
        }

        <div class="flex justify-end gap-2 pt-2">
          <button type="button" class="af-btn-secondary" (click)="done.emit(null)">Cancel</button>
          <button type="submit" class="af-btn-primary" [disabled]="saving()">
            {{ saving() ? 'Saving…' : 'Create opportunity' }}
          </button>
        </div>
      </form>
    </app-form-dialog>
  `,
})
export class OpportunityForm {
  private readonly api = inject(WriteApi);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly householdId = input.required<string>();
  readonly householdName = input<string>('');
  readonly done = output<Opportunity | null>();

  protected readonly stages = OPPORTUNITY_STAGES;
  protected readonly serviceTypes = SERVICE_TYPES;
  protected readonly priorities = ENGAGEMENT_PRIORITIES;
  protected readonly lossReasons = LOSS_REASONS;

  protected readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    serviceType: [''],
    stage: ['Prospecting'],
    lossReason: [''],
    closeDate: [defaultCloseDate(), [Validators.required]],
    amount: [''],
    engagementPriority: [''],
    nextStep: ['', [Validators.maxLength(255)]],
  });

  protected readonly saving = signal(false);
  protected readonly problem = signal<SaveProblem | null>(null);
  private readonly submitted = signal(false);

  /** Names follow the org's convention "<Household> - <Service type>" until the advisor types one. */
  protected suggestName(): void {
    const name = this.form.controls.name;
    const service = this.form.controls.serviceType.value;
    if (service && (!name.value || name.value.startsWith(`${this.householdName()} - `))) {
      name.setValue(`${this.householdName()} - ${service}`);
    }
  }

  protected error(field: OpportunityField): string | null {
    const control = this.form.controls[field];
    if (this.submitted() && control.hasError('required')) {
      return field === 'name' ? 'Name is required.' : 'Close date is required.';
    }
    if (control.hasError('maxlength')) return 'That is too long.';
    if (this.submitted() && field === 'lossReason' && this.needsLossReason()) {
      return 'A loss reason is required when the stage is Closed Lost.';
    }
    return this.problem()?.fields[field]?.[0] ?? null;
  }

  private needsLossReason(): boolean {
    return this.form.controls.stage.value === 'Closed Lost' && !this.form.controls.lossReason.value;
  }

  protected async save(): Promise<void> {
    this.submitted.set(true);
    this.form.controls.name.setValue(this.form.controls.name.value.trim());
    if (this.form.invalid || this.needsLossReason() || this.saving()) {
      return;
    }
    const v = this.form.getRawValue();
    const amount = String(v.amount).trim();
    const body: OpportunityWrite = {
      name: v.name,
      stage: v.stage as OpportunityWrite['stage'],
      closeDate: v.closeDate,
      amount: amount === '' ? null : Number(amount),
      serviceType: v.serviceType || null,
      engagementPriority: v.engagementPriority || null,
      nextStep: v.nextStep.trim() || null,
      lossReason: v.stage === 'Closed Lost' ? v.lossReason || null : null,
    };
    this.saving.set(true);
    this.problem.set(null);
    try {
      this.done.emit(await this.api.createOpportunity(this.householdId(), body));
    } catch (error) {
      this.problem.set(toSaveProblem(error));
    } finally {
      this.saving.set(false);
    }
  }
}
