/**
 * Production settings. advisorflow-web and advisorflow-api deploy separately
 * (Azure Static Web Apps and Azure App Service), so the API needs an absolute URL here.
 * This site's origin is listed in the API's Cors:AllowedOrigins (App Service setting).
 */
export const environment = {
  production: true,
  apiBaseUrl: 'https://app-advisorflow-api-ee1.azurewebsites.net',
};
