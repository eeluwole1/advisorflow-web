/**
 * Local development. An empty base URL keeps requests same-origin; the Angular dev
 * server forwards /api and /health to the API on http://localhost:5080 (proxy.conf.json).
 */
export const environment = {
  production: false,
  apiBaseUrl: '',
};
