import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, input } from '@angular/core';
import { householdMembersResource, householdResource } from '../../core/households.api';
import { householdActivitiesResource } from '../../core/activities.api';
import { householdOpportunitiesResource } from '../../core/opportunities.api';
import { StatusBadge } from '../../shared/status-badge';
import { HouseholdActivities } from '../activities/household-activities';
import { HouseholdMembers } from '../contacts/household-members';
import { HouseholdOpportunities } from '../opportunities/household-opportunities';

@Component({
  selector: 'app-household-detail',
  imports: [StatusBadge, HouseholdMembers, HouseholdOpportunities, HouseholdActivities],
  templateUrl: './household-detail.html',
})
export class HouseholdDetail {
  /** Bound from the :id route parameter. */
  readonly id = input<string>();

  protected readonly household = householdResource(this.id);
  protected readonly members = householdMembersResource(this.id);
  protected readonly opportunities = householdOpportunitiesResource(this.id);
  protected readonly activities = householdActivitiesResource(this.id);

  protected readonly notFound = computed(() => {
    const err = this.household.error();
    return err instanceof HttpErrorResponse && (err.status === 404 || err.status === 400);
  });
}
