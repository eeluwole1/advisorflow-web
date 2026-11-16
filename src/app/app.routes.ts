import { Routes } from '@angular/router';
import { HouseholdsPage } from './features/households/households-page';
import { HouseholdDetail } from './features/households/household-detail';
import { ActivitiesPage } from './features/activities/activities-page';
import { NoSelection } from './features/households/no-selection';
import { OpportunitiesPage } from './features/opportunities/opportunities-page';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'clients' },
  {
    path: 'clients',
    component: HouseholdsPage,
    title: 'Clients · AdvisorFlow',
    children: [
      { path: '', component: NoSelection },
      { path: ':id', component: HouseholdDetail },
    ],
  },
  { path: 'opportunities', component: OpportunitiesPage, title: 'Opportunities · AdvisorFlow' },
  { path: 'activities', component: ActivitiesPage, title: 'Activities · AdvisorFlow' },
  { path: '**', redirectTo: 'clients' },
];
