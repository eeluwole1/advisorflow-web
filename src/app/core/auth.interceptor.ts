import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap } from 'rxjs';
import { AuthService } from './auth';
import { API_BASE_URL } from './households.api';

/**
 * Adds the advisor's access token to changes sent to advisorflow-api (ADR-015). Reads stay
 * anonymous, and no token is ever sent to any other host.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const base = inject(API_BASE_URL);
  const toApi = base ? req.url.startsWith(`${base}/api/`) : req.url.startsWith('/api/');

  if (!toApi || req.method === 'GET' || !auth.signedIn()) {
    return next(req);
  }

  return from(auth.getApiToken()).pipe(
    switchMap((token) =>
      next(token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req),
    ),
  );
};
