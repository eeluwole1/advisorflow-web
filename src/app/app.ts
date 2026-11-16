import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth';

interface NavItem {
  label: string;
  link?: string;
  milestone?: string;
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="flex h-screen">
      <aside class="hidden w-60 shrink-0 flex-col bg-ink text-slate-300 md:flex">
        <div class="flex items-center gap-2.5 px-5 py-5">
          <span
            class="grid size-8 place-items-center rounded-lg bg-brand-500 text-sm font-bold text-white"
            aria-hidden="true"
            >A</span
          >
          <span class="text-[15px] font-semibold tracking-tight text-white">AdvisorFlow</span>
        </div>

        <nav class="mt-2 flex-1 space-y-0.5 px-3" aria-label="Main">
          @for (item of nav; track item.label) {
            @if (item.link) {
              <a
                [routerLink]="item.link"
                routerLinkActive="bg-white/10 text-white"
                class="block rounded-md px-3 py-2 text-sm font-medium hover:bg-white/5 hover:text-white"
                >{{ item.label }}</a
              >
            } @else {
              <span
                class="flex items-center justify-between rounded-md px-3 py-2 text-sm text-slate-500"
                aria-disabled="true"
              >
                {{ item.label }}
                <span class="rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-medium">{{
                  item.milestone
                }}</span>
              </span>
            }
          }
        </nav>

        @if (auth.configured) {
          <div class="mx-3 mb-1 rounded-lg bg-white/5 px-3 py-3" data-testid="account">
            @if (auth.signedIn()) {
              <p class="text-xs text-slate-400">Signed in as</p>
              <p class="truncate text-sm font-medium text-white" [title]="auth.displayName()">
                {{ auth.displayName() }}
              </p>
              <button
                type="button"
                class="mt-2 text-xs font-medium text-slate-300 underline hover:text-white"
                (click)="auth.signOut()"
              >
                Sign out
              </button>
            } @else {
              <p class="text-xs leading-relaxed text-slate-400">
                Viewing only. Advisors sign in to make changes.
              </p>
              <button
                type="button"
                class="mt-2 w-full rounded-md bg-brand-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600"
                (click)="auth.signIn()"
              >
                Sign in
              </button>
            }
          </div>
        }

        <p class="px-5 py-4 text-xs leading-relaxed text-slate-500">
          Prototype · fictional data only
        </p>
      </aside>

      <main class="min-w-0 flex-1 overflow-y-auto lg:overflow-hidden">
        <router-outlet />
      </main>
    </div>
  `,
})
export class App implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  ngOnInit(): void {
    // Back to the page the advisor was on before the sign-in redirect.
    const returnUrl = this.auth.takeReturnUrl();
    if (returnUrl) {
      void this.router.navigateByUrl(returnUrl);
    }
  }

  protected readonly nav: NavItem[] = [
    { label: 'Clients', link: '/clients' },
    { label: 'Opportunities', link: '/opportunities' },
    { label: 'Activities', link: '/activities' },
    { label: 'Dashboard', link: '/dashboard' },
  ];
}
