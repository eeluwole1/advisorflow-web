import {
  HttpClient,
  HttpErrorResponse,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';
import { firstValueFrom } from 'rxjs';
import { App } from './app';
import { AuthService } from './core/auth';
import { authInterceptor } from './core/auth.interceptor';
import { API_BASE_URL } from './core/households.api';
import { HouseholdDetail as HouseholdDetailModel } from './core/households.models';
import { Opportunity } from './core/opportunities.models';
import { toSaveProblem } from './core/write.api';
import { HouseholdDetail } from './features/households/household-detail';
import { HouseholdForm } from './features/households/household-form';
import { StageMover } from './features/opportunities/stage-mover';
import { nextStages } from './features/opportunities/stage-rules';

/** Stands in for MSAL: sign-in state is a signal the test controls. */
function fakeAuth(options: { configured?: boolean; signedIn?: boolean } = {}) {
  const account = signal(options.signedIn ? 'Ada Advisor' : '');
  return {
    configured: options.configured ?? true,
    signedIn: computed(() => account() !== ''),
    displayName: computed(() => account()),
    signIn: vi.fn(async () => undefined),
    signOut: vi.fn(async () => undefined),
    getApiToken: vi.fn(async () => 'test-token'),
    takeReturnUrl: () => null,
    init: async () => undefined,
  };
}

function setup(auth = fakeAuth()) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideHttpClient(withInterceptors([authInterceptor])),
      provideHttpClientTesting(),
      { provide: API_BASE_URL, useValue: '' },
      { provide: AuthService, useValue: auth },
    ],
  });
  return TestBed.inject(HttpTestingController);
}

const tick = () => new Promise((resolve) => setTimeout(resolve));

function type(root: HTMLElement, selector: string, value: string) {
  const el = root.querySelector<HTMLInputElement | HTMLSelectElement>(selector)!;
  el.value = value;
  el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input'));
}

const household: HouseholdDetailModel = {
  id: '001MOCK00000000001',
  name: 'Williams Household',
  clientStatus: 'Prospect',
  riskProfile: 'Moderate',
  priority: 'Medium',
  phone: null,
  accountNumber: null,
  memberCount: 0,
};

const okafor: Opportunity = {
  id: '006MOCK00000000002',
  householdId: '001MOCK00000000002',
  householdName: 'Okafor Household',
  name: 'Okafor Household - Investment Advisory',
  stage: 'Needs Assessment',
  isClosed: false,
  closeDate: '2099-12-01',
  amount: 12000,
  probability: 30,
  serviceType: 'Investment Advisory',
  engagementPriority: 'High',
  nextStep: 'Present the proposal',
  lossReason: null,
};

describe('Stage rule (BR-OP-004)', () => {
  it('allows forward moves and one step back', () => {
    expect(nextStages('Needs Assessment')).toEqual([
      'Qualification',
      'Proposal Presented',
      'Negotiation/Review',
      'Closed Won',
      'Closed Lost',
    ]);
  });

  it('allows nothing back from the first stage', () => {
    expect(nextStages('Prospecting')[0]).toBe('Qualification');
  });

  it('treats closed opportunities as final', () => {
    expect(nextStages('Closed Won')).toEqual([]);
    expect(nextStages('Closed Lost')).toEqual([]);
  });
});

describe('Save problems', () => {
  it('maps API field errors to fields', () => {
    const problem = toSaveProblem(
      new HttpErrorResponse({ status: 400, error: { errors: { name: ['Name is required.'] } } }),
    );
    expect(problem.fields['name']).toEqual(['Name is required.']);
  });

  it('tells a signed-out advisor to sign in again', () => {
    expect(toSaveProblem(new HttpErrorResponse({ status: 401 })).message).toContain('Sign in');
  });

  it('tells apart a read-only site and a missing Advisor role', () => {
    const readOnly = new HttpErrorResponse({
      status: 403,
      error: { title: 'Changes are disabled in this environment.' },
    });
    expect(toSaveProblem(readOnly).message).toContain('turned off');
    expect(toSaveProblem(new HttpErrorResponse({ status: 403 })).message).toContain('advisor');
  });
});

describe('Auth interceptor (ADR-015)', () => {
  it('sends no token on reads, so browsing stays anonymous', async () => {
    const http = setup(fakeAuth({ signedIn: true }));
    void firstValueFrom(TestBed.inject(HttpClient).get('/api/households'));
    await tick();
    expect(http.expectOne('/api/households').request.headers.has('Authorization')).toBe(false);
  });

  it('adds the advisor token to changes', async () => {
    const http = setup(fakeAuth({ signedIn: true }));
    void firstValueFrom(TestBed.inject(HttpClient).post('/api/households', {}));
    await tick();
    expect(http.expectOne('/api/households').request.headers.get('Authorization')).toBe(
      'Bearer test-token',
    );
  });

  it('never sends the token to another host', async () => {
    const http = setup(fakeAuth({ signedIn: true }));
    void firstValueFrom(TestBed.inject(HttpClient).post('https://example.com/api/x', {}));
    await tick();
    expect(http.expectOne('https://example.com/api/x').request.headers.has('Authorization')).toBe(
      false,
    );
  });

  it('sends changes without a token when nobody is signed in (the API answers 401)', async () => {
    const http = setup(fakeAuth({ signedIn: false }));
    void firstValueFrom(TestBed.inject(HttpClient).post('/api/households', {}));
    await tick();
    expect(http.expectOne('/api/households').request.headers.has('Authorization')).toBe(false);
  });
});

describe('Sidebar sign-in', () => {
  it('offers Sign in to a visitor', async () => {
    const auth = fakeAuth({ signedIn: false });
    setup(auth);
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const account = (fixture.nativeElement as HTMLElement).querySelector(
      '[data-testid="account"]',
    )!;
    expect(account.textContent).toContain('Viewing only');
    account.querySelector('button')!.click();
    expect(auth.signIn).toHaveBeenCalled();
  });

  it('shows who is signed in', async () => {
    setup(fakeAuth({ signedIn: true }));
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Ada Advisor');
    expect(text).toContain('Sign out');
  });

  it('shows nothing when sign-in is not configured', async () => {
    setup(fakeAuth({ configured: false }));
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('[data-testid="account"]'),
    ).toBeNull();
  });
});

describe('Mobile header', () => {
  const mobileAccount = (root: HTMLElement) =>
    root.querySelector<HTMLElement>('[data-testid="mobile-account"]');

  it('offers Sign in on small screens', async () => {
    const auth = fakeAuth({ signedIn: false });
    setup(auth);
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const account = mobileAccount(fixture.nativeElement)!;
    expect(account.textContent).toContain('Sign in');
    account.querySelector('button')!.click();
    expect(auth.signIn).toHaveBeenCalled();
  });

  it('shows the advisor initials and Sign out once signed in', async () => {
    const auth = fakeAuth({ signedIn: true });
    setup(auth);
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const account = mobileAccount(fixture.nativeElement)!;
    expect(account.textContent).toContain('AA');
    expect(account.querySelector('[aria-label]')?.getAttribute('aria-label')).toBe(
      'Signed in as Ada Advisor',
    );
    account.querySelector('button')!.click();
    expect(auth.signOut).toHaveBeenCalled();
  });

  it('lists every page in the mobile tabs', async () => {
    setup();
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const links = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('nav[aria-label="Main (mobile)"] a'),
    );
    expect(links.map((a) => a.textContent?.trim())).toEqual([
      'Clients',
      'Opportunities',
      'Activities',
      'Dashboard',
    ]);
  });

  it('hides the account area when sign-in is not configured', async () => {
    setup(fakeAuth({ configured: false }));
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    expect(mobileAccount(fixture.nativeElement)).toBeNull();
  });
});

describe('Clients on small screens', () => {
  function setupRoutes() {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: '' },
        { provide: AuthService, useValue: fakeAuth() },
      ],
    });
  }
  const pane = (root: HTMLElement, id: string) =>
    root.querySelector<HTMLElement>(`[data-testid="${id}"]`)!;

  it('shows the list and hides the empty pane when nothing is selected', async () => {
    setupRoutes();
    const harness = await RouterTestingHarness.create('/clients');
    const root = harness.routeNativeElement!;
    expect(pane(root, 'household-list').classList).not.toContain('max-lg:hidden');
    expect(pane(root, 'household-pane').classList).toContain('max-lg:hidden');
  });

  it('shows the household instead of the list once one is opened', async () => {
    setupRoutes();
    const harness = await RouterTestingHarness.create('/clients/001HH0000000001');
    harness.detectChanges();
    const root = harness.routeNativeElement!;
    expect(pane(root, 'household-list').classList).toContain('max-lg:hidden');
    expect(pane(root, 'household-pane').classList).not.toContain('max-lg:hidden');
    // The static layout classes survive the binding.
    expect(pane(root, 'household-list').classList).toContain('flex');
  });
});

describe('HouseholdForm', () => {
  it('creates a household and reports it', async () => {
    const http = setup(fakeAuth({ signedIn: true }));
    const fixture = TestBed.createComponent(HouseholdForm);
    const saved: unknown[] = [];
    fixture.componentInstance.done.subscribe((h) => saved.push(h));
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;

    type(root, '#hh-name', '  Nguyen Household ');
    type(root, '#hh-priority', 'High');
    root.querySelector('form')!.dispatchEvent(new Event('submit'));
    await tick();

    const req = http.expectOne('/api/households');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      name: 'Nguyen Household',
      clientStatus: 'Prospect',
      priority: 'High',
      riskProfile: null,
      phone: null,
    });
    req.flush({ ...household, id: '001MOCK00000000099', name: 'Nguyen Household' });
    await tick();
    expect(saved).toHaveLength(1);
  });

  it('does not send an empty name', async () => {
    const http = setup(fakeAuth({ signedIn: true }));
    const fixture = TestBed.createComponent(HouseholdForm);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    root.querySelector('form')!.dispatchEvent(new Event('submit'));
    await tick();
    fixture.detectChanges();
    http.expectNone('/api/households');
    expect(root.textContent).toContain('Name is required.');
  });

  it("shows the API's field error", async () => {
    const http = setup(fakeAuth({ signedIn: true }));
    const fixture = TestBed.createComponent(HouseholdForm);
    fixture.componentRef.setInput('household', household);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    root.querySelector('form')!.dispatchEvent(new Event('submit'));
    await tick();
    const req = http.expectOne(`/api/households/${household.id}`);
    expect(req.request.method).toBe('PUT');
    req.flush(
      { errors: { phone: ['Phone must be 40 characters or fewer.'] } },
      { status: 400, statusText: 'Bad Request' },
    );
    await tick();
    fixture.detectChanges();
    expect(root.textContent).toContain('Phone must be 40 characters or fewer.');
  });
});

describe('StageMover', () => {
  async function mover(o: Opportunity) {
    const http = setup(fakeAuth({ signedIn: true }));
    const fixture = TestBed.createComponent(StageMover);
    fixture.componentRef.setInput('opportunity', o);
    await fixture.whenStable();
    return { http, fixture, root: fixture.nativeElement as HTMLElement };
  }

  it('moves the stage and keeps every other field', async () => {
    const { http, fixture, root } = await mover(okafor);
    type(root, 'select', 'Proposal Presented');
    await fixture.whenStable();
    root.querySelector('form')!.dispatchEvent(new Event('submit'));
    await tick();

    const req = http.expectOne(`/api/opportunities/${okafor.id}`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({
      name: okafor.name,
      stage: 'Proposal Presented',
      closeDate: okafor.closeDate,
      amount: 12000,
      serviceType: 'Investment Advisory',
      engagementPriority: 'High',
      nextStep: 'Present the proposal',
      lossReason: null,
    });
  });

  it('asks for a loss reason before closing as lost', async () => {
    const { http, fixture, root } = await mover(okafor);
    type(root, 'select', 'Closed Lost');
    await fixture.whenStable();
    expect(root.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(true);

    type(root, `select[name="lossReason"]`, 'Fees');
    await fixture.whenStable();
    root.querySelector('form')!.dispatchEvent(new Event('submit'));
    await tick();
    expect(http.expectOne(`/api/opportunities/${okafor.id}`).request.body.lossReason).toBe('Fees');
  });

  it('shows nothing for a closed opportunity', async () => {
    const { root } = await mover({ ...okafor, stage: 'Closed Won', isClosed: true });
    expect(root.querySelector('select')).toBeNull();
  });
});

describe('HouseholdDetail editing controls', () => {
  async function detail(signedIn: boolean) {
    const http = setup(fakeAuth({ signedIn }));
    const fixture = TestBed.createComponent(HouseholdDetail);
    fixture.componentRef.setInput('id', household.id);
    fixture.detectChanges();
    http.expectOne(`/api/households/${household.id}`).flush(household);
    http.expectOne(`/api/households/${household.id}/contacts`).flush([]);
    http.expectOne(`/api/households/${household.id}/opportunities`).flush([]);
    http.expectOne(`/api/households/${household.id}/activities`).flush([]);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('lets a signed-in advisor edit, add members and add opportunities', async () => {
    const root = await detail(true);
    const buttons = Array.from(root.querySelectorAll('button')).map((b) => b.textContent?.trim());
    expect(buttons).toEqual(expect.arrayContaining(['Edit', '+ Add member', '+ New opportunity']));
    expect(root.querySelector('[data-testid="view-only"]')).toBeNull();
  });

  it('is view-only for a visitor', async () => {
    const root = await detail(false);
    expect(root.textContent).not.toContain('+ Add member');
    expect(root.querySelector('[data-testid="view-only"]')?.textContent).toContain('Sign in');
  });
});
