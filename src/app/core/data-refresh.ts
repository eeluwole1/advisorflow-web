import { Injectable, signal } from '@angular/core';

/**
 * After a successful change, every data view refetches: each httpResource reads
 * {@link version}, so bumping it reloads lists, details, follow-ups and the dashboard.
 * A changed stage can make Salesforce's Flow create a follow-up task (ADR-011), and the
 * dashboard totals move too, so refreshing everything keeps the screens consistent.
 */
@Injectable({ providedIn: 'root' })
export class DataRefresh {
  private readonly _version = signal(0);
  readonly version = this._version.asReadonly();

  changed(): void {
    this._version.update((v) => v + 1);
  }
}
