import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CLIENT_STATUSES, HouseholdDetail } from '../../core/households.models';
import { SaveProblem, WriteApi, toSaveProblem } from '../../core/write.api';
import { HouseholdWrite, PRIORITIES, RISK_PROFILES } from '../../core/write.models';
import { FormDialog } from '../../shared/form-dialog';

/**
 * New or edit household (contract 1.1). Rules mirror the API, which stays the authority:
 * name required (max 255), status one of Prospect/Active/Inactive, phone max 40. There is no
 * delete: set the status to Inactive instead (ADR-008).
 */
@Component({
  selector: 'app-household-form',
  imports: [ReactiveFormsModule, FormDialog],
  template: `
    <app-form-dialog
      [heading]="household() ? 'Edit household' : 'New household'"
      [subheading]="
        household()
          ? undefined
          : 'A new household starts as a Prospect unless you choose otherwise.'
      "
      (closed)="done.emit(null)"
    >
      <form [formGroup]="form" (ngSubmit)="save()" novalidate class="space-y-4">
        <div>
          <label class="af-label" for="hh-name">Household name</label>
          <input
            id="hh-name"
            class="af-input"
            formControlName="name"
            maxlength="255"
            placeholder="e.g. Nguyen Household"
            [attr.aria-invalid]="!!error('name')"
            aria-describedby="hh-name-error"
          />
          @if (error('name'); as message) {
            <p id="hh-name-error" class="af-error">{{ message }}</p>
          }
        </div>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label class="af-label" for="hh-status">Client status</label>
            <select id="hh-status" class="af-input" formControlName="clientStatus">
              @for (s of statuses; track s) {
                <option [value]="s">{{ s }}</option>
              }
            </select>
            @if (household()) {
              <p class="af-hint">Inactive deactivates; nothing is deleted.</p>
            }
          </div>
          <div>
            <label class="af-label" for="hh-priority">Priority</label>
            <select id="hh-priority" class="af-input" formControlName="priority">
              <option value="">Not set</option>
              @for (p of priorities; track p) {
                <option [value]="p">{{ p }}</option>
              }
            </select>
          </div>
          <div>
            <label class="af-label" for="hh-risk">Risk tag</label>
            <select id="hh-risk" class="af-input" formControlName="riskProfile">
              <option value="">Not set</option>
              @for (r of riskProfiles; track r) {
                <option [value]="r">{{ r }}</option>
              }
            </select>
            <p class="af-hint">A CRM tag, not a suitability assessment.</p>
          </div>
        </div>

        <div>
          <label class="af-label" for="hh-phone">Phone</label>
          <input
            id="hh-phone"
            class="af-input"
            type="tel"
            formControlName="phone"
            maxlength="40"
            [attr.aria-invalid]="!!error('phone')"
          />
          @if (error('phone'); as message) {
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
            {{ saving() ? 'Saving…' : household() ? 'Save changes' : 'Create household' }}
          </button>
        </div>
      </form>
    </app-form-dialog>
  `,
})
export class HouseholdForm implements OnInit {
  private readonly api = inject(WriteApi);
  private readonly fb = inject(NonNullableFormBuilder);

  /** The household to edit; null creates a new one. */
  readonly household = input<HouseholdDetail | null>(null);
  /** The saved household, or null when cancelled. */
  readonly done = output<HouseholdDetail | null>();

  protected readonly statuses = CLIENT_STATUSES;
  protected readonly priorities = PRIORITIES;
  protected readonly riskProfiles = RISK_PROFILES;

  protected readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(255)]],
    clientStatus: ['Prospect'],
    priority: [''],
    riskProfile: [''],
    phone: ['', [Validators.maxLength(40)]],
  });

  protected readonly saving = signal(false);
  protected readonly problem = signal<SaveProblem | null>(null);
  private readonly submitted = signal(false);

  ngOnInit(): void {
    const h = this.household();
    if (h) {
      this.form.setValue({
        name: h.name,
        clientStatus: h.clientStatus,
        priority: h.priority ?? '',
        riskProfile: h.riskProfile ?? '',
        phone: h.phone ?? '',
      });
    }
  }

  /** The first message for a field: the browser-side check, or the API's answer. */
  protected error(field: 'name' | 'phone'): string | null {
    const control = this.form.controls[field];
    if (this.submitted() && control.hasError('required')) return 'Name is required.';
    if (control.hasError('maxlength')) return 'That is too long.';
    return this.problem()?.fields[field]?.[0] ?? null;
  }

  protected async save(): Promise<void> {
    this.submitted.set(true);
    this.form.controls.name.setValue(this.form.controls.name.value.trim());
    if (this.form.invalid || this.saving()) {
      return;
    }
    const v = this.form.getRawValue();
    const body: HouseholdWrite = {
      name: v.name,
      clientStatus: v.clientStatus,
      priority: v.priority || null,
      riskProfile: v.riskProfile || null,
      phone: v.phone.trim() || null,
    };
    this.saving.set(true);
    this.problem.set(null);
    try {
      const h = this.household();
      this.done.emit(
        h ? await this.api.updateHousehold(h.id, body) : await this.api.createHousehold(body),
      );
    } catch (error) {
      this.problem.set(toSaveProblem(error));
    } finally {
      this.saving.set(false);
    }
  }
}
