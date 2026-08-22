// Shared "site-form" lead endpoint hosted by the CRM (a separate Vercel
// project/deployment at crm.callcaitlyn.com) - forms on this site POST
// straight to it cross-origin instead of this site running its own
// backend. "callcaitlyn" identifies this site in the CRM's SITE_CONFIGS;
// it needs to be registered there (with this site's origin allowed for
// CORS) before submissions will actually succeed - see site/README.md.
export const CRM_SITE_FORM_URL = "https://crm.callcaitlyn.com/api/webhooks/site-form";
export const CRM_SITE_KEY = "callcaitlyn";
