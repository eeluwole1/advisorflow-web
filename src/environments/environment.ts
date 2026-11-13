/**
 * Production settings. advisorflow-web and advisorflow-api deploy separately
 * (Azure Static Web Apps and Azure App Service), so the API needs an absolute URL here.
 * Set it when the API is deployed in M7, and add this site's origin to the API's
 * Cors:AllowedOrigins.
 */
export const environment = {
  production: true,
  apiBaseUrl: 'https://REPLACE-WITH-API-HOST.azurewebsites.net',
};
