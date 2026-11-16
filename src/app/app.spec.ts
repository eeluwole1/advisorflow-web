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
    const links = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('nav a'));
    expect(links.map((a) => a.textContent?.trim())).toEqual(['Clients', 'Opportunities']);
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
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Household not found');
  });
});
