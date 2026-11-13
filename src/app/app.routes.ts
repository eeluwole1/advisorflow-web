import { Routes } from '@angular/router';
import { HouseholdsPage } from './features/households/households-page';
import { HouseholdDetail } from './features/households/household-detail';
import { NoSelection } from './features/households/no-selection';

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
  { path: '**', redirectTo: 'clients' },
];
