import { Component } from '@angular/core';

@Component({
  selector: 'app-no-selection',
  template: `
    <div
      class="hidden h-full min-h-64 flex-col lg:flex items-center justify-center p-8 text-center"
    >
      <svg
        class="size-10 text-slate-300"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        aria-hidden="true"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M2.25 12 11.2 3.05a1.125 1.125 0 0 1 1.6 0L21.75 12M4.5 9.75v10.125c0 .62.5 1.125 1.125 1.125H9.75v-4.875c0-.62.5-1.125 1.125-1.125h2.25c.62 0 1.125.5 1.125 1.125V21h4.125c.62 0 1.125-.5 1.125-1.125V9.75"
        />
      </svg>
      <p class="mt-3 font-medium">Select a household</p>
      <p class="mt-1 max-w-xs text-sm text-slate-500">Its details and members will appear here.</p>
    </div>
  `,
})
export class NoSelection {}
