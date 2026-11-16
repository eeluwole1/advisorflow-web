import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

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
export class App {
  protected readonly nav: NavItem[] = [
    { label: 'Clients', link: '/clients' },
    { label: 'Opportunities', link: '/opportunities' },
    { label: 'Activities', milestone: 'M5' },
    { label: 'Dashboard', milestone: 'M6' },
  ];
}
