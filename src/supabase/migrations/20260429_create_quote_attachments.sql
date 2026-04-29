-- Create quote_attachments table
create table if not exists public.quote_attachments (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid references public.organisations(id) on delete cascade,
  quote_id uuid not null references public.quotes(id) on delete cascade,
  uploaded_by_user_id uuid references public.user_profiles(id) on delete set null,
  file_path text not null,
  file_name text not null,
  file_type text,
  description text,
  created_at timestamptz not null default now()
);

-- RLS
alter table public.quote_attachments enable row level security;

create policy "Org members can view quote attachments"
  on public.quote_attachments for select
  using (organisation_id = get_my_org());

create policy "Org members can insert quote attachments"
  on public.quote_attachments for insert
  with check (organisation_id = get_my_org());

create policy "Org members can delete quote attachments"
  on public.quote_attachments for delete
  using (organisation_id = get_my_org());

-- Index for fast lookup by quote
create index if not exists quote_attachments_quote_id_idx
  on public.quote_attachments (quote_id);
