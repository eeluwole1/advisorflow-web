import { Injectable, InjectionToken, computed, inject, signal } from '@angular/core';
import type { AccountInfo, IPublicClientApplication } from '@azure/msal-browser';
import { environment } from '../../environments/environment';

/** Entra ID identifiers for sign-in (src/environments). */
export interface AuthConfig {
  tenantId: string;
  clientId: string;
  apiScope: string;
}

export const AUTH_CONFIG = new InjectionToken<AuthConfig>('AUTH_CONFIG', {
  providedIn: 'root',
  factory: () => environment.auth,
});

/** Where to come back to after the sign-in redirect. */
const RETURN_URL_KEY = 'advisorflow.returnUrl';
/** Set while this tab has a signed-in advisor, so MSAL is only loaded when it's needed. */
const SESSION_KEY = 'advisorflow.signedIn';

type Msal = typeof import('@azure/msal-browser');

/**
 * Advisor sign-in with Microsoft Entra ID (ADR-015), using MSAL's redirect flow
 * (authorization code with PKCE). Reading needs no sign-in; the access token is only
 * requested for changes, and the API checks it carries the Advisor role.
 *
 * MSAL is loaded on demand (a separate ~300 kB chunk): only when an advisor signs in, returns
 * from the Microsoft sign-in page, or already has a session in this tab. Visitors who only
 * read never download it.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly config = inject(AUTH_CONFIG);
  private msal?: IPublicClientApplication;
  private lib?: Msal;
  private readonly _account = signal<AccountInfo | null>(null);

  /** False when no Entra IDs are configured: the app is view-only. */
  readonly configured = !!(this.config.tenantId && this.config.clientId && this.config.apiScope);

  readonly signedIn = computed(() => this._account() !== null);
  readonly displayName = computed(() => {
    const account = this._account();
    return account ? account.name || account.username : '';
  });

  /** Runs once at start-up: completes a returning sign-in redirect and restores the session. */
  async init(): Promise<void> {
    if (!this.configured || !(this.hasSession() || this.isSignInResponse())) {
      return;
    }
    await this.start();
  }

  /** Loads MSAL and completes any sign-in response in the URL. */
  private async start(): Promise<IPublicClientApplication | undefined> {
    if (this.msal) {
      return this.msal;
    }
    try {
      this.lib = await import('@azure/msal-browser');
      const msal = await this.lib.createStandardPublicClientApplication({
        auth: {
          clientId: this.config.clientId,
          authority: `https://login.microsoftonline.com/${this.config.tenantId}`,
          redirectUri: window.location.origin,
          postLogoutRedirectUri: window.location.origin,
        },
        // Per tab and cleared when the tab closes: nothing stays behind on a shared computer.
        cache: { cacheLocation: 'sessionStorage' },
      });
      const result = await msal.handleRedirectPromise();
      const account =
        result?.account ?? msal.getActiveAccount() ?? msal.getAllAccounts()[0] ?? null;
      if (account) {
        msal.setActiveAccount(account);
        sessionStorage.setItem(SESSION_KEY, '1');
      } else {
        sessionStorage.removeItem(SESSION_KEY);
      }
      this.msal = msal;
      this._account.set(account);
      return msal;
    } catch (error) {
      // Sign-in problems must never stop the read-only views from working.
      console.error('Sign-in could not be started.', error);
      this._account.set(null);
      return undefined;
    }
  }

  private hasSession(): boolean {
    return sessionStorage.getItem(SESSION_KEY) === '1';
  }

  /** True on the page Microsoft redirects back to (code or error in the URL). */
  private isSignInResponse(): boolean {
    const response = window.location.hash + window.location.search;
    return /[#?&](code|error)=/.test(response);
  }

  /** The page to return to after a sign-in redirect, read once. */
  takeReturnUrl(): string | null {
    const url = sessionStorage.getItem(RETURN_URL_KEY);
    sessionStorage.removeItem(RETURN_URL_KEY);
    return url && url.startsWith('/') && !url.startsWith('//') ? url : null;
  }

  async signIn(): Promise<void> {
    const msal = this.configured ? await this.start() : undefined;
    if (!msal) {
      return;
    }
    this.rememberPage();
    await msal.loginRedirect({ scopes: [this.config.apiScope] });
  }

  async signOut(): Promise<void> {
    const account = this._account();
    sessionStorage.removeItem(SESSION_KEY);
    if (!this.msal || !account) {
      this._account.set(null);
      return;
    }
    await this.msal.logoutRedirect({ account });
  }

  /**
   * An access token for the API, from MSAL's cache or refreshed silently. When Entra needs the
   * advisor again (expired session, consent), the page redirects to sign in and this returns null.
   */
  async getApiToken(): Promise<string | null> {
    const account = this._account();
    if (!this.msal || !account) {
      return null;
    }
    const request = { scopes: [this.config.apiScope], account };
    try {
      return (await this.msal.acquireTokenSilent(request)).accessToken;
    } catch (error) {
      if (this.lib && error instanceof this.lib.InteractionRequiredAuthError) {
        this.rememberPage();
        await this.msal.acquireTokenRedirect(request);
        return null;
      }
      throw error;
    }
  }

  private rememberPage(): void {
    sessionStorage.setItem(
      RETURN_URL_KEY,
      window.location.pathname + window.location.search + window.location.hash,
    );
  }
}
