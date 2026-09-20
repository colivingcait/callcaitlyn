import type { ListingDocumentType } from "@/types/database";

export const LISTING_DOCUMENT_LABELS: Record<ListingDocumentType, string> = {
  earnings_statement: "Earnings statement",
  t12: "T12",
  buyer_workbook: "Vera's buyer workbook",
};

// earnings_statement / t12 stay on the DB enum so existing rows don't
// break. Marketing only offers buyer_workbook — the post-unlock download.
export const LISTING_DOCUMENT_ACCEPT: Record<ListingDocumentType, string> = {
  earnings_statement: ".pdf,.xlsx,.xls,.csv",
  t12: ".pdf,.xlsx,.xls,.csv",
  buyer_workbook: ".xlsx,.xls",
};

export const LISTING_DOCUMENT_TYPES = Object.keys(LISTING_DOCUMENT_LABELS) as ListingDocumentType[];

export const MARKETING_UPLOAD_TYPES: ListingDocumentType[] = ["buyer_workbook"];
