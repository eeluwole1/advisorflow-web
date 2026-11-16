import { Component, ElementRef, afterNextRender, inject, input, output } from '@angular/core';

/**
 * Modal panel for a create/edit form. Escape or the backdrop closes it; focus moves to the
 * first field when it opens. The form inside is projected.
 */
@Component({
  selector: 'app-form-dialog',
  host: { '(document:keydown.escape)': 'closed.emit()' },
  template: `
    <div class="fixed inset-0 z-40 bg-ink/40" aria-hidden="true" (click)="closed.emit()"></div>
    <div
      class="fixed inset-x-0 top-0 z-50 mx-auto mt-10 max-h-[calc(100vh-5rem)] w-[min(36rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl ring-1 ring-slate-200"
      role="dialog"
      aria-modal="true"
      [attr.aria-labelledby]="headingId"
    >
      <div class="flex items-start justify-between gap-4">
        <h2 [id]="headingId" class="text-lg font-semibold tracking-tight">{{ heading() }}</h2>
        <button
          type="button"
          class="-m-1 rounded p-1 text-slate-400 hover:text-ink"
          aria-label="Close"
          (click)="closed.emit()"
        >
          ✕
        </button>
      </div>
      @if (subheading()) {
        <p class="mt-1 text-sm text-slate-500">{{ subheading() }}</p>
      }
      <div class="mt-5"><ng-content /></div>
    </div>
  `,
})
export class FormDialog {
  private static nextId = 0;
  readonly heading = input.required<string>();
  readonly subheading = input<string>();
  readonly closed = output<void>();
  protected readonly headingId = `form-dialog-${FormDialog.nextId++}`;

  constructor() {
    const host = inject(ElementRef<HTMLElement>);
    afterNextRender(() =>
      (host.nativeElement as HTMLElement)
        .querySelector<HTMLElement>('input, select, textarea')
        ?.focus(),
    );
  }
}
