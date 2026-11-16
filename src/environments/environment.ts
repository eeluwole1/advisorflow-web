/**
 * Production settings. advisorflow-web and advisorflow-api deploy separately
 * (Azure Static Web Apps and Azure App Service), so the API needs an absolute URL here.
 * This site's origin is listed in the API's Cors:AllowedOrigins (App Service setting).
 */
export const environment = {
  production: true,
  apiBaseUrl: 'https://app-advisorflow-api-ee1.azurewebsites.net',
  /**
   * Microsoft Entra ID sign-in for changes (ADR-015). Identifiers only, not secrets: a browser
   * app has no secret and uses the authorization code flow with PKCE. Empty values turn
   * sign-in off; the app is then view-only.
   */
  auth: {
    tenantId: 'b7695219-ac29-4031-9eec-798fb17de6ea',
    /** Application (client) ID of the "AdvisorFlow Web" registration. */
    clientId: 'c300a82d-5810-4080-8b4d-3cf31a8cda7f',
    /** The API's delegated scope, api://<AdvisorFlow API client ID>/access_as_user. */
    apiScope: 'api://bdb9c640-466c-4a1b-89ef-c354332cd93f/access_as_user',
  },
};
