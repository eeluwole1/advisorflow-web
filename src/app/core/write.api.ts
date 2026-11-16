import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { DataRefresh } from './data-refresh';
import { API_BASE_URL } from './households.api';
import { HouseholdDetail, HouseholdMember } from './households.models';
import { Opportunity } from './opportunities.models';
import { HouseholdWrite, MemberWrite, OpportunityWrite } from './write.models';

/**
 * Create/update calls to advisorflow-api. The auth interceptor adds the advisor's token;
 * after every successful change all views refetch (DataRefresh).
 */
@Injectable({ providedIn: 'root' })
export class WriteApi {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);
  private readonly refresh = inject(DataRefresh);

  createHousehold(body: HouseholdWrite): Promise<HouseholdDetail> {
    return this.send(this.http.post<HouseholdDetail>(`${this.base}/api/households`, body));
  }

  updateHousehold(id: string, body: HouseholdWrite): Promise<HouseholdDetail> {
    return this.send(
      this.http.put<HouseholdDetail>(`${this.base}/api/households/${enc(id)}`, body),
    );
  }

  addMember(householdId: string, body: MemberWrite): Promise<HouseholdMember> {
    return this.send(
      this.http.post<HouseholdMember>(
        `${this.base}/api/households/${enc(householdId)}/contacts`,
        body,
      ),
    );
  }

  updateMember(householdId: string, memberId: string, body: MemberWrite): Promise<HouseholdMember> {
    return this.send(
      this.http.put<HouseholdMember>(
        `${this.base}/api/households/${enc(householdId)}/contacts/${enc(memberId)}`,
        body,
      ),
    );
  }

  createOpportunity(householdId: string, body: OpportunityWrite): Promise<Opportunity> {
    return this.send(
      this.http.post<Opportunity>(
        `${this.base}/api/households/${enc(householdId)}/opportunities`,
        body,
      ),
    );
  }

  updateOpportunity(id: string, body: OpportunityWrite): Promise<Opportunity> {
    return this.send(this.http.put<Opportunity>(`${this.base}/api/opportunities/${enc(id)}`, body));
  }

  private async send<T>(request: Observable<T>): Promise<T> {
    const result = await firstValueFrom(request);
    this.refresh.changed();
    return result;
  }
}

function enc(id: string): string {
  return encodeURIComponent(id);
}

/** What a form shows when a save fails. */
export interface SaveProblem {
  message: string;
  /** Field name (as in the API body) → messages, from a 400 validation problem. */
  fields: Record<string, string[]>;
}

const READ_ONLY_TITLE = 'Changes are disabled in this environment.';

/** Turns an API error into words an advisor can act on. */
export function toSaveProblem(error: unknown): SaveProblem {
  if (!(error instanceof HttpErrorResponse)) {
    return { message: "Couldn't save. Check your connection and try again.", fields: {} };
  }
  const body = (error.error ?? {}) as { title?: string; errors?: Record<string, string[]> };
  switch (error.status) {
    case 400: {
      const fields = body.errors ?? {};
      const general = [...(fields['body'] ?? []), ...(fields['id'] ?? [])];
      return {
        message: general[0] ?? 'Please correct the highlighted fields.',
        fields,
      };
    }
    case 401:
      return { message: 'Your sign-in has expired. Sign in again, then save.', fields: {} };
    case 403:
      return {
        message:
          body.title === READ_ONLY_TITLE
            ? 'Changes are turned off on this site right now.'
            : "Your account isn't set up as an advisor, so it can't make changes.",
        fields: {},
      };
    case 404:
      return { message: 'This record no longer exists. Refresh the page.', fields: {} };
    default:
      return { message: "Salesforce couldn't save the change. Try again in a moment.", fields: {} };
  }
}
