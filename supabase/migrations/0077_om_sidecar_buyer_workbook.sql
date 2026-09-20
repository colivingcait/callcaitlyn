-- Apply-to-OM sidecar (schema_version 1) hydrates existing listings columns
-- plus listings.financials jsonb. Exact NOI / fees / DSCR stay in jsonb so
-- the public /listing/[slug] page never sees them. Extended financials shape
-- (number-like values stored as strings, matching current CRM storage):
-- {
--   t12: [{label, value, subtotal?}],
--   noi, cap_rate, vacancy_pct?, occupancy_summary?,
--   platform_fees?, pm_fees?, expense_load_pct?, dscr?, purchase_price?,
--   scenarios: [{label, coc, cash_in, debt_service, cash_flow, dscr?, loan_amount?}],
--   meta?, deal_key?, buyer_workbook_filename?
-- }
-- Extra keys from a sidecar are preserved. No new typed columns: those
-- scalars did not already exist on listings.

-- buyer_workbook is a new listing_documents slot for the post-unlock xlsx
-- packet. Do not reuse earnings_statement or t12.
alter table public.listing_documents drop constraint if exists listing_documents_doc_type_check;
alter table public.listing_documents
  add constraint listing_documents_doc_type_check
  check (doc_type in ('earnings_statement', 't12', 'buyer_workbook'));
