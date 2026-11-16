import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { API_BASE_URL } from './core/households.api';
import { HouseholdMember, HouseholdSummary, PagedResponse } from './core/households.models';
import { HouseholdsPage } from './features/households/households-page';
import { HouseholdDetail } from './features/households/household-detail';
import { Opportunity } from './core/opportunities.models';
import { OpportunitiesPage } from './features/opportunities/opportunities-page';
import { Activity } from './core/activities.models';
import { ActivitiesPage } from './features/activities/activities-page';
import { DashboardSummary } from './core/dashboard.models';
import { DashboardPage } from './features/dashboard/dashboard-page';

const page: PagedResponse<HouseholdSummary> = {
  items: [
    {
      id: '001MOCK00000000001',
      name: 'Williams Household',
      clientStatus: 'Prospect',
      riskProfile: 'Moderate',
      priority: 'Medium',
      memberCount: 2,
      primaryContactName: 'James Williams',
    },
    {
      id: '001MOCK00000000002',
      name: 'Okafor Household',
      clientStatus: 'Active',
      riskProfile: 'Conservative',
      priority: 'High',
      memberCount: 1,
      primaryContactName: 'Chinedu Okafor',
    },
  ],
  page: 1,
  pageSize: 10,
  totalCount: 2,
  totalPages: 1,
};

function opportunity(overrides: Partial<Opportunity>): Opportunity {
  return {
    id: '006MOCK00000000001',
    householdId: '001MOCK00000000001',
    householdName: 'Williams Household',
    name: 'Williams Household - Retirement Planning',
    stage: 'Qualification',
    isClosed: false,
    closeDate: '2099-12-15',
    amount: 4500,
    probability: 10,
    serviceType: 'Retirement Planning',
    engagementPriority: 'High',
    nextStep: 'Book a discovery meeting',
    lossReason: null,
    ...overrides,
  };
}

const pipeline: PagedResponse<Opportunity> = {
  items: [
    opportunity({}),
    opportunity({
      id: '006MOCK00000000002',
      householdId: '001MOCK00000000002',
      householdName: 'Okafor Household',
      name: 'Okafor Household - Investment Advisory',
      stage: 'Proposal Presented',
      amount: 12000,
    }),
    opportunity({
      id: '006MOCK00000000006',
      name: 'Fischer Household - Financial Review',
      stage: 'Closed Lost',
      isClosed: true,
      amount: 3000,
      lossReason: 'Timing',
    }),
  ],
  page: 1,
  pageSize: 100,
  totalCount: 3,
  totalPages: 1,
};

function activity(overrides: Partial<Activity>): Activity {
  return {
    id: '00TMOCK00000000001',
    subject: 'Qualification follow-up: Williams Household - Retirement Planning',
    status: 'Not Started',
    priority: 'Normal',
    dueDate: '2026-11-12',
    isClosed: false,
    isOverdue: true,
    householdId: '001MOCK00000000001',
    householdName: 'Williams Household',
    relatedToId: '006MOCK00000000001',
    relatedToName: 'Williams Household - Retirement Planning',
    relatedToType: 'Opportunity',
    contactName: null,
    ownerName: 'Demo Advisor',
    automation: 'Qualification follow-up',
    ...overrides,
  };
}

function setup() {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: API_BASE_URL, useValue: '' },
    ],
  });
  return TestBed.inject(HttpTestingController);
}

describe('App shell', () => {
  it('shows the Clients navigation link', async () => {
    setup();
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Clients');
    expect(text).not.toContain('M4');
    const links = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('aside nav a'),
    );
    expect(links.map((a) => a.textContent?.trim())).toEqual([
      'Clients',
      'Opportunities',
      'Activities',
      'Dashboard',
    ]);
  });
});

describe('OpportunitiesPage', () => {
  async function render() {
    const http = setup();
    const fixture = TestBed.createComponent(OpportunitiesPage);
    TestBed.tick();
    const req = http.expectOne((r) => r.url === '/api/opportunities');
    expect(req.request.params.get('pageSize')).toBe('100');
    req.flush(pipeline);
    await fixture.whenStable();
    return { http, fixture, el: fixture.nativeElement as HTMLElement };
  }

  it('groups open opportunities by stage and hides closed ones by default', async () => {
    const { el } = await render();

    const columns = Array.from(el.querySelectorAll('[data-testid="stage-column"]'));
    expect(columns.map((c) => c.getAttribute('aria-label'))).toEqual([
      'Prospecting',
      'Qualification',
      'Needs Assessment',
      'Proposal Presented',
      'Negotiation/Review',
    ]);
    expect(columns[1].textContent).toContain('Williams Household - Retirement Planning');
    expect(columns[3].textContent).toContain('Okafor Household - Investment Advisory');
    expect(el.textContent).not.toContain('Fischer Household');
  });

  it('labels amounts as advisory fees and totals the open ones (BR-OP-003)', async () => {
    const { el } = await render();

    expect(el.querySelector('[data-testid="open-summary"]')?.textContent).toContain('2 open');
    expect(el.querySelector('[data-testid="open-summary"]')?.textContent).toContain('$16,500');
    expect(el.textContent).toContain('Advisory fee');
    expect(el.textContent).toContain('not assets under management');
  });

  it('shows the closed stages with the loss reason when asked', async () => {
    const { fixture, el } = await render();

    const toggle = el.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
    toggle.checked = true;
    toggle.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    const lost = el.querySelector('[aria-label="Closed Lost"]');
    expect(lost?.textContent).toContain('Fischer Household - Financial Review');
    expect(lost?.textContent).toContain('Timing');
  });

  it('shows a retry message when the API fails', async () => {
    const http = setup();
    const fixture = TestBed.createComponent(OpportunitiesPage);
    TestBed.tick();
    http
      .expectOne((r) => r.url === '/api/opportunities')
      .flush(null, { status: 503, statusText: 'Unavailable' });
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      "Opportunities couldn't be loaded",
    );
  });
});

describe('ActivitiesPage', () => {
  const openTasks: PagedResponse<Activity> = {
    items: [
      activity({}),
      activity({
        id: '00TMOCK00000000003',
        subject: 'Call Amara about RESP contributions',
        dueDate: '2026-11-18',
        isOverdue: false,
        priority: 'High',
        householdId: '001MOCK00000000002',
        householdName: 'Okafor Household',
        relatedToId: '001MOCK00000000002',
        relatedToName: 'Okafor Household',
        relatedToType: 'Household',
        contactName: 'Amara Okafor',
        automation: null,
      }),
    ],
    page: 1,
    pageSize: 20,
    totalCount: 2,
    totalPages: 1,
  };

  it('lists open tasks with overdue, priority and Flow-created tags', async () => {
    const http = setup();
    const fixture = TestBed.createComponent(ActivitiesPage);
    TestBed.tick();
    const req = http.expectOne((r) => r.url === '/api/activities');
    expect(req.request.params.get('state')).toBe('open');
    req.flush(openTasks);
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[data-testid="total-count"]')?.textContent).toContain('2 open tasks');
    const tasks = Array.from(el.querySelectorAll('[data-testid="task"]'));
    expect(tasks).toHaveLength(2);
    expect(tasks[0].querySelector('[data-testid="overdue"]')).not.toBeNull();
    expect(tasks[0].querySelector('[data-testid="automation"]')?.textContent).toContain(
      'Qualification follow-up',
    );
    expect(tasks[0].textContent).toContain('Williams Household - Retirement Planning');
    expect(tasks[1].querySelector('[data-testid="overdue"]')).toBeNull();
    expect(tasks[1].textContent).toContain('High priority');
    expect(tasks[1].textContent).toContain('Amara Okafor');
    expect(tasks[1].querySelector('a')?.getAttribute('href')).toBe('/clients/001MOCK00000000002');
  });

  it('switches to the overdue view and shows a friendly empty state', async () => {
    const http = setup();
    const fixture = TestBed.createComponent(ActivitiesPage);
    TestBed.tick();
    http.expectOne((r) => r.url === '/api/activities').flush(openTasks);
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    const overdue = Array.from(el.querySelectorAll<HTMLButtonElement>('button')).find(
      (b) => b.textContent?.trim() === 'Overdue',
    )!;
    overdue.click();
    TestBed.tick();
    const req = http.expectOne((r) => r.url === '/api/activities');
    expect(req.request.params.get('state')).toBe('overdue');
    req.flush({ items: [], page: 1, pageSize: 20, totalCount: 0, totalPages: 0 });
    await fixture.whenStable();

    expect(overdue.getAttribute('aria-pressed')).toBe('true');
    expect(el.querySelector('[data-testid="empty"]')?.textContent).toContain('Nothing is overdue');
  });

  it('shows a retry message when the API fails', async () => {
    const http = setup();
    const fixture = TestBed.createComponent(ActivitiesPage);
    TestBed.tick();
    http
      .expectOne((r) => r.url === '/api/activities')
      .flush(null, { status: 503, statusText: 'Unavailable' });
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      "Tasks couldn't be loaded",
    );
  });
});

describe('DashboardPage', () => {
  const summary: DashboardSummary = {
    asOf: '2026-11-16',
    pipeline: {
      openCount: 5,
      openFees: 30500,
      weightedFees: 16650,
      stages: [
        { stage: 'Prospecting', count: 1, fees: 0, probability: 10, weightedFees: 0 },
        { stage: 'Qualification', count: 1, fees: 4500, probability: 10, weightedFees: 450 },
        { stage: 'Needs Assessment', count: 1, fees: 6000, probability: 30, weightedFees: 1800 },
        { stage: 'Proposal Presented', count: 1, fees: 12000, probability: 60, weightedFees: 7200 },
        { stage: 'Negotiation/Review', count: 1, fees: 8000, probability: 90, weightedFees: 7200 },
      ],
    },
    outcomes: {
      wonCount: 1,
      wonFees: 2500,
      lostCount: 1,
      lostFees: 3000,
      winRate: 0.5,
      lossReasons: [{ name: 'Timing', count: 1 }],
    },
    activities: { open: 6, overdue: 2, dueNext7Days: 2, completed: 2, openFromAutomation: 2 },
    households: {
      total: 7,
      byStatus: [
        { name: 'Prospect', count: 3 },
        { name: 'Active', count: 3 },
        { name: 'Inactive', count: 1 },
      ],
    },
  };

  async function render(body: DashboardSummary = summary) {
    const http = setup();
    const fixture = TestBed.createComponent(DashboardPage);
    TestBed.tick();
    http.expectOne('/api/dashboard').flush(body);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows the headline figures from the API', async () => {
    const el = await render();

    expect(el.querySelector('[data-testid="open-fees"]')?.textContent).toContain('$30,500');
    expect(el.querySelector('[data-testid="weighted-fees"]')?.textContent).toContain('$16,650');
    expect(el.querySelector('[data-testid="win-rate"]')?.textContent).toContain('50%');
    expect(el.querySelector('[data-testid="overdue"]')?.textContent).toContain('2');
    expect(el.querySelector('[data-testid="overdue"]')?.textContent).toContain('Needs attention');
    expect(el.querySelector('[data-testid="households"]')?.textContent).toContain('Prospect');
  });

  it('draws one bar per open stage, scaled to the largest stage', async () => {
    const el = await render();

    const bars = Array.from(el.querySelectorAll<HTMLElement>('[data-testid="stage-bar"]'));
    expect(bars).toHaveLength(5);
    const width = (i: number) => bars[i].querySelector<HTMLElement>('.bg-brand-500')!.style.width;
    expect(width(3)).toBe('100%'); // Proposal Presented, the largest
    expect(width(2)).toBe('50%'); // 6,000 of 12,000
    expect(width(0)).toBe('0%'); // no fees
    expect(bars[3].getAttribute('title')).toContain('60% probability');
  });

  it('explains the missing win rate when nothing has closed', async () => {
    const el = await render({
      ...summary,
      outcomes: { ...summary.outcomes, wonCount: 0, lostCount: 0, winRate: null, lossReasons: [] },
    });

    expect(el.querySelector('[data-testid="win-rate"]')?.textContent?.trim()).toBe(
      'No closed deals yet',
    );
    expect(el.querySelector('[data-testid="loss-reasons"]')).toBeNull();
  });
});

describe('HouseholdsPage', () => {
  it('requests the first page and renders households', async () => {
    const http = setup();
    const fixture = TestBed.createComponent(HouseholdsPage);
    TestBed.tick();

    const req = http.expectOne((r) => r.url === '/api/households');
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('pageSize')).toBe('10');
    expect(req.request.params.has('status')).toBe(false);
    req.flush(page);
    await fixture.whenStable();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Williams Household');
    expect(text).toContain('James Williams');
    expect(text).toContain('2 households');
    http.verify();
  });

  it('sends the status filter and resets to page 1', async () => {
    const http = setup();
    const fixture = TestBed.createComponent(HouseholdsPage);
    TestBed.tick();
    http.expectOne((r) => r.url === '/api/households').flush(page);
    await fixture.whenStable();

    const select = (fixture.nativeElement as HTMLElement).querySelector('select')!;
    select.value = 'Active';
    select.dispatchEvent(new Event('change'));
    TestBed.tick();

    const req = http.expectOne((r) => r.url === '/api/households');
    expect(req.request.params.get('status')).toBe('Active');
    expect(req.request.params.get('page')).toBe('1');
    req.flush({ ...page, items: [page.items[1]], totalCount: 1 });
  });

  it('shows a retry message when the API fails', async () => {
    const http = setup();
    const fixture = TestBed.createComponent(HouseholdsPage);
    TestBed.tick();

    http
      .expectOne((r) => r.url === '/api/households')
      .flush(null, { status: 503, statusText: 'Unavailable' });
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      "Households couldn't be loaded",
    );
  });
});

describe('HouseholdDetail', () => {
  it('renders the household and its members, primary first', async () => {
    const http = setup();
    const fixture = TestBed.createComponent(HouseholdDetail);
    fixture.componentRef.setInput('id', '001MOCK00000000001');
    TestBed.tick();

    http.expectOne('/api/households/001MOCK00000000001').flush({
      id: '001MOCK00000000001',
      name: 'Williams Household',
      clientStatus: 'Prospect',
      riskProfile: 'Moderate',
      priority: 'Medium',
      phone: '204-555-0101',
      accountNumber: 'ADV-0001',
      memberCount: 2,
    });
    const members: HouseholdMember[] = [
      {
        id: '003A',
        householdId: '001MOCK00000000001',
        firstName: 'James',
        lastName: 'Williams',
        fullName: 'James Williams',
        email: null,
        phone: null,
        preferredContactMethod: 'Phone',
        isPrimary: true,
      },
      {
        id: '003B',
        householdId: '001MOCK00000000001',
        firstName: 'Sarah',
        lastName: 'Williams',
        fullName: 'Sarah Williams',
        email: null,
        phone: null,
        preferredContactMethod: null,
        isPrimary: false,
      },
    ];
    http.expectOne('/api/households/001MOCK00000000001/contacts').flush(members);
    http
      .expectOne('/api/households/001MOCK00000000001/opportunities')
      .flush([opportunity({}), opportunity({ id: '006B', stage: 'Closed Won', isClosed: true })]);
    http.expectOne('/api/households/001MOCK00000000001/activities').flush([
      activity({}),
      activity({
        id: '00TB',
        subject: 'Send a thank-you note',
        isClosed: true,
        isOverdue: false,
        status: 'Completed',
        automation: null,
      }),
    ]);
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[data-testid="household-name"]')?.textContent).toContain(
      'Williams Household',
    );
    const rendered = Array.from(el.querySelectorAll('[data-testid="member"]')).map(
      (m) => m.textContent ?? '',
    );
    expect(rendered).toHaveLength(2);
    expect(rendered[0]).toContain('Primary');
    expect(rendered[1]).toContain('No contact preference');

    const opps = Array.from(el.querySelectorAll('[data-testid="opportunity"]')).map(
      (o) => o.textContent ?? '',
    );
    expect(opps).toHaveLength(2);
    expect(opps[0]).toContain('Qualification');
    expect(opps[0]).toContain('Advisory fee');
    expect(opps[1]).toContain('Closed Won');

    const followUps = Array.from(el.querySelectorAll('[data-testid="activity"]'));
    expect(followUps).toHaveLength(2);
    expect(followUps[0].querySelector('[data-testid="overdue"]')).not.toBeNull();
    expect(followUps[1].textContent).toContain('Completed');
    expect(followUps[1].textContent).toContain('Was due');
  });

  it('shows not-found for a 404', async () => {
    const http = setup();
    const fixture = TestBed.createComponent(HouseholdDetail);
    fixture.componentRef.setInput('id', '001MOCK99999999999');
    TestBed.tick();

    http
      .expectOne('/api/households/001MOCK99999999999')
      .flush(null, { status: 404, statusText: 'Not Found' });
    http
      .expectOne('/api/households/001MOCK99999999999/contacts')
      .flush(null, { status: 404, statusText: 'Not Found' });
    http
      .expectOne('/api/households/001MOCK99999999999/opportunities')
      .flush(null, { status: 404, statusText: 'Not Found' });
    http
      .expectOne('/api/households/001MOCK99999999999/activities')
      .flush(null, { status: 404, statusText: 'Not Found' });
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Household not found');
  });
});
