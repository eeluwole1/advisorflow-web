/**
 * The advisorflow-api contract version this frontend is built and tested against.
 * Source of truth: advisorflow-api/docs/api/openapi.v1.yaml (info.version).
 *
 * Compatibility: this app works with any 1.x API, since minor versions only add
 * optional fields and endpoints. When the API publishes 2.0.0, update the models in
 * households.models.ts, opportunities.models.ts, activities.models.ts, dashboard.models.ts and this constant in the same pull request.
 */
export const API_CONTRACT_VERSION = '1.5.0';
