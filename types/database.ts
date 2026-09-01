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
  | "checkin"
  | "house_hacking_site"
  | "site_form"
  | "instagram"
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

export type TextBlastStatus = "sending" | "completed" | "canceled";
export type TextBlastRecipientStatus = "pending" | "sent" | "failed" | "skipped";
export type TextBlastAttendanceStatus = "registered" | "attended" | "no_show" | "walk_in";

export interface TextBlast {
  id: string;
  owner_id: string;
  event_name: string;
  message: string;
  status: TextBlastStatus;
  created_at: string;
  completed_at: string | null;
  // Which specific occurrence + attendance slice this targeted - null on
  // blasts created before this existed, meaning "everyone ever registered
  // under this event name" (the original, still-supported behavior).
  event_id: string | null;
  attendance_status: TextBlastAttendanceStatus | null;
  // Set instead of event_id/attendance_status when this blast targeted a
  // tag's members directly rather than an event's registrants.
  tag_id: string | null;
}

export interface TextBlastRecipient {
  id: string;
  blast_id: string;
  contact_id: string;
  status: TextBlastRecipientStatus;
  sent_at: string | null;
  error: string | null;
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
  quo_contact_id: string | null;
  dialer_contacted_at: string | null;
  dialer_snoozed_at: string | null;
  event_followup_contacted_at: string | null;
  event_followup_snoozed_at: string | null;
  referred_by: string | null;
  lease_ends_at: string | null;
  known_personally: boolean;
  decision_maker: string | null;
  objection: string | null;
  consent_source: string | null;
  consent_at: string | null;
  opted_out_at: string | null;
  lead_date: string;
  created_at: string;
  updated_at: string;
}

export interface DismissedInsight {
  id: string;
  owner_id: string;
  insight_key: string;
  contact_id: string | null;
  dismissed_at: string;
}

export type MeetingTranscriptSource = "quo" | "tactiq" | "granola" | "memo";
export type MeetingTranscriptStatus = "pending" | "ready" | "no_proposals" | "failed";

export type TranscriptParticipant = { name: string | null; email: string | null; isContact: boolean; contactId: string | null };

export interface MeetingTranscript {
  id: string;
  owner_id: string;
  contact_id: string | null;
  source: MeetingTranscriptSource;
  external_id: string;
  raw_payload: Record<string, unknown>;
  participants: TranscriptParticipant[];
  duration_seconds: number | null;
  occurred_at: string;
  status: MeetingTranscriptStatus;
  summary_bullets: string[];
  created_at: string;
}

export type ProposedField = "budget" | "timeline" | "areas_of_interest" | "decision_maker" | "objection" | "note" | "task" | "stage" | "showing";
export type ProposedChangeStatus = "pending" | "accepted" | "rejected";

export interface ProposedChange {
  id: string;
  transcript_id: string;
  field: ProposedField;
  proposed_value: unknown;
  current_value: unknown;
  quote: string;
  timestamp_seconds: number | null;
  speaker: string | null;
  confidence: number;
  status: ProposedChangeStatus;
  created_at: string;
}

export interface WarmNotificationSettings {
  owner_id: string;
  rule_triple_open: boolean;
  rule_past_client_click: boolean;
  rule_hot_twice: boolean;
  rule_every_open: boolean;
  updated_at: string;
}

export interface GranolaMatchingSettings {
  owner_id: string;
  match_on_calendar_event: boolean;
  match_on_name_when_single: boolean;
  ask_when_ambiguous: boolean;
  updated_at: string;
}

export interface NoteNameMatch {
  id: string;
  owner_id: string;
  name_text: string;
  contact_id: string;
  created_at: string;
}

export interface PinnedTodayItem {
  id: string;
  owner_id: string;
  kind: "weekly_review" | "prep_sheet";
  payload: Record<string, unknown>;
  created_at: string;
  cleared_at: string | null;
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
  dedupe_field: string | null;
  dedupe_value: string | null;
  needs_reply: boolean | null;
  reply_reminder_sent_at: string | null;
  reply_dismissed_at: string | null;
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

export type MetricKey = "speed_to_lead" | "contacted_pct" | "follow_up_rate" | "conversion_rate" | "commission_goal";

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

export type LoanType = "fha_30" | "conventional_30" | "conventional_15";

export interface Quote {
  id: string;
  owner_id: string;
  contact_id: string | null;
  slug: string;
  client_first_name: string;
  property_address: string;
  property_description: string;
  purchase_price: number;
  down_payment_pct: number;
  interest_rate_pct: number;
  loan_type: LoanType;
  rent_from_other_unit: number | null;
  renting_now: number | null;
  taxes_annual: number;
  insurance_annual: number;
  loan_amount: number;
  monthly_principal_interest: number;
  monthly_taxes_insurance: number;
  monthly_mortgage_insurance: number;
  monthly_maintenance: number;
  monthly_out_of_pocket: number;
  cash_to_close: number;
  both_sides_rented_out_of_pocket: number | null;
  calc_version: number;
  created_at: string;
}

export interface InstagramMessage {
  id: string;
  owner_id: string;
  contact_id: string | null;
  ig_sender_id: string;
  ig_username: string | null;
  ig_name: string | null;
  ig_message_id: string;
  text: string;
  occurred_at: string;
  raw: Record<string, unknown>;
  created_at: string;
}

export interface InstagramContactLink {
  id: string;
  owner_id: string;
  ig_sender_id: string;
  contact_id: string;
  created_at: string;
}

export interface DailyRate {
  id: string;
  owner_id: string;
  rate_date: string;
  product: string;
  rate_pct: number;
  source: string;
  created_at: string;
}

export interface QuoteView {
  id: string;
  quote_id: string;
  visitor_key: string;
  viewed_at: string;
  user_agent: string | null;
}

export type AgentRecruitStage = "introduced" | "connected_with_lead" | "joined" | "fee_received" | "not_moving_forward";

export interface AgentRecruit {
  id: string;
  owner_id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  current_brokerage: string | null;
  notes: string | null;
  stage: AgentRecruitStage;
  referral_fee: number | null;
  joined_at: string | null;
  fee_received_at: string | null;
  created_at: string;
  updated_at: string;
}
