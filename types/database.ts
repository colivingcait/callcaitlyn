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
  created_at: string;
}

export interface Tag {
  id: string;
  owner_id: string;
  name: string;
  color: string;
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

// One row per closed transaction, written when a contact enters a
// "Win" stage and never touched again - lets a repeat investor cycle
// back to active after closing without losing that they converted.
export interface Deal {
  id: string;
  owner_id: string;
  contact_id: string;
  stage_id: string | null;
  closed_at: string;
  address: string | null;
  property_type: PropertyType | null;
  side: DealSide | null;
  sale_price: number | null;
  commission_amount: number | null;
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
