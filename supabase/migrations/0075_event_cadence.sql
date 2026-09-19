-- Per-event communication cadence + optional venue for the Events hub.
-- Email invite stays T-10 (past attendees). Text reminder days-before is
-- editable (default T-3). cadence_show_on_today gates Today → To Dos rows.
alter table public.events
  add column if not exists location text,
  add column if not exists cadence_text_days_before integer not null default 3,
  add column if not exists cadence_show_on_today boolean not null default true;

alter table public.events
  add constraint events_cadence_text_days_before_positive
  check (cadence_text_days_before >= 1);
