// Hand-written types matching supabase/migrations/0001_init.sql.
// If you use the Supabase CLI later, you can replace this with
// `supabase gen types typescript` output.

export type ContactType =
  | "buyer"
  | "seller"
  | "both"
  | "investor"
  | "renter"
  | "referral_partner"
  | "vendor"
  | "past_client"
  | "sphere"
  | "attendee"
  | "other";

export type Timeline =
  | "asap"
  | "1_3_months"
  | "3_6_months"
  | "6_12_months"
  | "12_plus_months"
  | "just_browsing"
  | "unknown";

export type ActivityType =
  | "call"
  | "text"
  | "email"
  | "note"
  | "meeting"
  | "showing"
  | "status_change"
  | "task_completed"
  | "system";

export type ActivityDirection = "inbound" | "outbound" | "none";

export type ActivitySource =
  | "manual"
  | "quo"
  | "gmail"
  | "calendly"
  | "eventbrite"
  | "jotform"
  | "ai"
  | "system";

export type TaskPriority = "low" | "medium" | "high";

export type Representing = "buyer" | "seller" | "both";

export type PropertyType = "primary_residence" | "house_hack" | "investment" | "co_living" | "other";

export type DealSide = "buyer" | "seller";

export interface PipelineStage {
  id: string;
  owner_id: string;
  name: string;
  color: string;
  sort_order: number;
  is_closed_won: boolean;
  is_closed_lost: boolean;
  is_trash: boolean;
  is_under_contract: boolean;
  created_at: string;
}

export interface Tag {
  id: string;
  owner_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface ContactFilterState {
  q?: string;
  stage?: string;
  tag?: string;
  type?: string;
  timeline?: string;
  representing?: string;
  phone?: string;
  sort?: string;
}

export interface ContactSegment {
  id: string;
  owner_id: string;
  name: string;
  filters: ContactFilterState;
  created_at: string;
}

export interface Contact {
  id: string;
  owner_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  secondary_phone: string | null;
  contact_type: ContactType;
  representing: Representing | null;
  listing_address: string | null;
  listing_timeline: Timeline | null;
  stage_id: string | null;
  lead_source: string | null;
  budget_min: number | null;
  budget_max: number | null;
  areas_of_interest: string[];
  timeline: Timeline;
  next_follow_up_at: string | null;
  birthday: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  notes: string | null;
  archived: boolean;
  last_event_name: string | null;
  last_event_at: string | null;
  ai_last_status_note: string | null;
  ai_last_analyzed_at: string | null;
  unsubscribe_token: string;
  quo_synced_at: string | null;
  dialer_contacted_at: string | null;
  dialer_snoozed_at: string | null;
  event_followup_contacted_at: string | null;
  event_followup_snoozed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Activity {
  id: string;
  owner_id: string;
  contact_id: string;
  type: ActivityType;
  direction: ActivityDirection;
  body: string | null;
  occurred_at: string;
  source: ActivitySource;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Task {
  id: string;
  owner_id: string;
  contact_id: string | null;
  title: string;
  description: string | null;
  due_at: string | null;
  completed_at: string | null;
  priority: TaskPriority;
  created_at: string;
}

export interface ImportantDate {
  id: string;
  owner_id: string;
  contact_id: string;
  label: string;
  date: string;
  recurring: boolean;
  created_at: string;
}

export interface AiInsight {
  id: string;
  owner_id: string;
  contact_id: string;
  summary: string;
  suggested_action: string | null;
  suggested_stage_id: string | null;
  suggested_timeline: Timeline | null;
  confidence: number | null;
  dismissed: boolean;
  applied: boolean;
  created_at: string;
}

export type DealStatus = "pending" | "won";

// A row is created 'pending' the moment a contact enters an Under
// Contract stage (captured early, doesn't count as a real conversion
// yet), promoted in place to 'won' if they later enter a Win stage, or
// deleted if the contract falls through. A 'won' row is never touched
// again after that, so a repeat closer can cycle back to active without
// losing that they converted.
export interface Deal {
  id: string;
  owner_id: string;
  // Nullable so historical deals can be recorded without recreating a
  // full contact for each one - client_name carries a plain-text name
  // for the commission table when there's no linked contact to read it
  // from.
  contact_id: string | null;
  client_name: string | null;
  stage_id: string | null;
  status: DealStatus;
  closed_at: string;
  expected_closing_date: string | null;
  address: string | null;
  property_type: PropertyType | null;
  side: DealSide | null;
  sale_price: number | null;
  gross_commission: number | null;
  referral_pct: number | null;
  misc_fee: number;
  oz_fee: number;
  on_fmls: boolean;
  // When true, kw_fee/kwri_fee/fmls_fee/tc_fee/referral_fee below are used
  // as-is instead of being computed from the formula - for backfilling
  // historical deals with their real, already-known paid amounts rather
  // than a reconstruction that might not match old exceptions exactly.
  manual_split: boolean;
  kw_fee: number | null;
  kwri_fee: number | null;
  fmls_fee: number | null;
  tc_fee: number | null;
  referral_fee: number | null;
  lead_started_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface ContactWithRelations extends Contact {
  pipeline_stages: PipelineStage | null;
  contact_tags: { tags: Tag }[];
}

export type MetricKey = "speed_to_lead" | "contacted_pct" | "follow_up_rate" | "conversion_rate";

export interface MetricGoal {
  id: string;
  owner_id: string;
  metric_key: MetricKey;
  target_value: number;
  created_at: string;
  updated_at: string;
}

export interface GmailAccount {
  id: string;
  owner_id: string;
  email_address: string;
  access_token: string;
  refresh_token: string;
  token_expiry: string;
  last_history_id: string | null;
  connected_at: string;
  updated_at: string;
}

export type SequenceType = "broadcast" | "drip" | "batch";
export type SequenceDelayUnit = "hours" | "days";
export type SequenceEnrollmentStatus = "active" | "paused" | "completed";

export interface EmailSequence {
  id: string;
  owner_id: string;
  name: string;
  type: SequenceType;
  target_tag_id: string | null;
  description: string | null;
  active: boolean;
  created_at: string;
}

export interface EmailSequenceStep {
  id: string;
  sequence_id: string;
  step_order: number;
  subject: string;
  body: string;
  send_at: string | null;
  delay_amount: number | null;
  delay_unit: SequenceDelayUnit | null;
  active: boolean;
  created_at: string;
}

export interface EmailSequenceEnrollment {
  id: string;
  sequence_id: string;
  contact_id: string;
  enrolled_at: string;
  current_step: number;
  status: SequenceEnrollmentStatus;
}

export interface EmailSequenceSend {
  id: string;
  sequence_id: string;
  step_id: string;
  contact_id: string;
  sent_at: string;
  opened_at: string | null;
  open_count: number;
  clicked_at: string | null;
  click_count: number;
  unsubscribed_at: string | null;
}

export interface EmailSequenceExclusion {
  id: string;
  sequence_id: string;
  contact_id: string;
  excluded_at: string;
}
