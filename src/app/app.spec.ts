import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { API_BASE_URL } from './core/households.api';
import { HouseholdMember, HouseholdSummary, PagedResponse } from './core/households.models';
import { HouseholdsPage } from './features/households/households-page';
import { HouseholdDetail } from './features/households/household-detail';

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
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Clients');
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
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Household not found');
  });
});
