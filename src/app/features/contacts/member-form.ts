import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HouseholdMember } from '../../core/households.models';
import { SaveProblem, WriteApi, toSaveProblem } from '../../core/write.api';
import { CONTACT_METHODS, MemberWrite } from '../../core/write.models';
import { FormDialog } from '../../shared/form-dialog';

type MemberField = 'firstName' | 'lastName' | 'email' | 'phone' | 'isPrimary';

/**
 * Add or edit a household member (contract 1.2). The primary-member rule (BR-HH-003): making
 * someone primary replaces the current primary; the current primary can't be un-set directly,
 * and a household's first member becomes primary automatically.
 */
@Component({
  selector: 'app-member-form',
  imports: [ReactiveFormsModule, FormDialog],
  template: `
    <app-form-dialog
      [heading]="member() ? 'Edit member' : 'Add member'"
      [subheading]="householdName()"
      (closed)="done.emit(null)"
    >
      <form [formGroup]="form" (ngSubmit)="save()" novalidate class="space-y-4">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label class="af-label" for="m-first">First name</label>
            <input id="m-first" class="af-input" formControlName="firstName" maxlength="40" />
            @if (error('firstName'); as message) {
              <p class="af-error">{{ message }}</p>
            }
          </div>
          <div>
            <label class="af-label" for="m-last">Last name</label>
            <input
              id="m-last"
              class="af-input"
              formControlName="lastName"
              maxlength="80"
              [attr.aria-invalid]="!!error('lastName')"
            />
            @if (error('lastName'); as message) {
              <p class="af-error">{{ message }}</p>
            }
          </div>
        </div>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label class="af-label" for="m-email">Email</label>
            <input
              id="m-email"
              class="af-input"
              type="email"
              formControlName="email"
              maxlength="80"
              [attr.aria-invalid]="!!error('email')"
            />
            @if (error('email'); as message) {
              <p class="af-error">{{ message }}</p>
            }
          </div>
          <div>
            <label class="af-label" for="m-phone">Phone</label>
            <input
              id="m-phone"
              class="af-input"
              type="tel"
              formControlName="phone"
              maxlength="40"
            />
            @if (error('phone'); as message) {
              <p class="af-error">{{ message }}</p>
            }
          </div>
        </div>

        <div>
          <label class="af-label" for="m-method">Preferred contact method</label>
          <select id="m-method" class="af-input" formControlName="preferredContactMethod">
            <option value="">Not set</option>
            @for (c of methods; track c) {
              <option [value]="c">{{ c }}</option>
            }
          </select>
        </div>

        <label class="flex items-start gap-2 text-sm">
          <input type="checkbox" class="mt-0.5 accent-brand-500" formControlName="isPrimary" />
          <span>
            Primary member
            <span class="af-hint block">
              @if (wasPrimary()) {
                This is the primary member. To change it, make another member primary.
              } @else {
                Replaces the household's current primary member.
              }
            </span>
          </span>
        </label>
        @if (error('isPrimary'); as message) {
          <p class="af-error">{{ message }}</p>
        }

        @if (problem(); as p) {
          <p class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
            {{ p.message }}
          </p>
        }

        <div class="flex justify-end gap-2 pt-2">
          <button type="button" class="af-btn-secondary" (click)="done.emit(null)">Cancel</button>
          <button type="submit" class="af-btn-primary" [disabled]="saving()">
            {{ saving() ? 'Saving…' : member() ? 'Save changes' : 'Add member' }}
          </button>
        </div>
      </form>
    </app-form-dialog>
  `,
})
export class MemberForm implements OnInit {
  private readonly api = inject(WriteApi);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly householdId = input.required<string>();
  readonly householdName = input<string>();
  /** The member to edit; null adds a new one. */
  readonly member = input<HouseholdMember | null>(null);
  readonly done = output<HouseholdMember | null>();

  protected readonly methods = CONTACT_METHODS;
  protected readonly form = this.fb.group({
    firstName: ['', [Validators.maxLength(40)]],
    lastName: ['', [Validators.required, Validators.maxLength(80)]],
    email: ['', [Validators.email, Validators.maxLength(80)]],
    phone: ['', [Validators.maxLength(40)]],
    preferredContactMethod: [''],
    isPrimary: [false],
  });

  protected readonly wasPrimary = signal(false);
  protected readonly saving = signal(false);
  protected readonly problem = signal<SaveProblem | null>(null);
  private readonly submitted = signal(false);

  ngOnInit(): void {
    const m = this.member();
    if (m) {
      this.form.setValue({
        firstName: m.firstName,
        lastName: m.lastName,
        email: m.email ?? '',
        phone: m.phone ?? '',
        preferredContactMethod: m.preferredContactMethod ?? '',
        isPrimary: m.isPrimary,
      });
      this.wasPrimary.set(m.isPrimary);
      if (m.isPrimary) {
        this.form.controls.isPrimary.disable();
      }
    }
  }

  protected error(field: MemberField): string | null {
    const control = this.form.controls[field];
    if (this.submitted() && control.hasError('required')) return 'Last name is required.';
    if (this.submitted() && control.hasError('email')) return 'Enter a valid email address.';
    if (control.hasError('maxlength')) return 'That is too long.';
    return this.problem()?.fields[field]?.[0] ?? null;
  }

  protected async save(): Promise<void> {
    this.submitted.set(true);
    this.form.controls.lastName.setValue(this.form.controls.lastName.value.trim());
    if (this.form.invalid || this.saving()) {
      return;
    }
    const v = this.form.getRawValue();
    const body: MemberWrite = {
      firstName: v.firstName.trim() || null,
      lastName: v.lastName,
      email: v.email.trim() || null,
      phone: v.phone.trim() || null,
      preferredContactMethod: v.preferredContactMethod || null,
      isPrimary: v.isPrimary,
    };
    this.saving.set(true);
    this.problem.set(null);
    try {
      const m = this.member();
      this.done.emit(
        m
          ? await this.api.updateMember(this.householdId(), m.id, body)
          : await this.api.addMember(this.householdId(), body),
      );
    } catch (error) {
      this.problem.set(toSaveProblem(error));
    } finally {
      this.saving.set(false);
    }
  }
}
