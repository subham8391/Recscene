-- Devices (spec 277, Account board): every Mac that signed in registers a seat.
-- A user sees and frees only their own seats; the app upserts its row on sign-in
-- and on launch, and deletes it on sign-out or "Deactivate this device".
create table public.devices (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  model text,
  app_version text,
  activated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index devices_user_id_idx on public.devices (user_id, last_seen_at desc);

alter table public.devices enable row level security;

create policy "devices are private to their user"
  on public.devices for select to authenticated
  using (user_id = auth.uid());

create policy "a user registers their own devices"
  on public.devices for insert to authenticated
  with check (user_id = auth.uid());

create policy "a user touches their own devices"
  on public.devices for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "a user frees their own devices"
  on public.devices for delete to authenticated
  using (user_id = auth.uid());

grant select, insert, update, delete on public.devices to authenticated;
