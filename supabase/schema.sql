-- ============================================================================
-- RadConnect – Supabase Schema (PostgreSQL)
-- Keine Patientendaten! Nur Projekt-Metadaten, Kapazitäten und SOPs.
-- Ausführen im Supabase SQL-Editor (einmalig).
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tabellen
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  username       text not null,
  email          text,
  full_name      text,
  role           text not null default 'shk' check (role in ('shk','arzt','admin')),
  contract_hours integer not null default 0 check (contract_hours between 0 and 80),
  free_hours     numeric not null default 0,         -- wird per Trigger gepflegt
  skills         text[] not null default '{}',
  onboarded      boolean not null default false,
  created_at     timestamptz not null default now()
);
create unique index if not exists profiles_username_key on public.profiles (lower(username));

create table if not exists public.wiki_articles (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  category   text not null,
  summary    text not null default '',
  steps      text[] not null default '{}',
  links      jsonb not null default '[]'::jsonb,      -- [{ "label": "...", "url": "https://..." }]
  author_id  uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id                uuid primary key default gen_random_uuid(),
  title             text not null,
  description       text not null default '',
  estimated_hours   integer not null default 0 check (estimated_hours >= 0),
  deadline          date not null,
  skills            text[] not null default '{}',
  milestone_target  integer not null default 0 check (milestone_target >= 0),
  milestone_current integer not null default 0 check (milestone_current >= 0),
  milestone_unit    text not null default 'Datensätze',
  sop_ids           uuid[] not null default '{}',
  owner_id          uuid not null references public.profiles(id) on delete cascade,
  status            text not null default 'beantragt'
                    check (status in ('beantragt','offen','aktiv','review','abgeschlossen','abgelehnt')),
  priority          text not null default 'Mittel' check (priority in ('Hoch','Mittel','Niedrig')),
  "technicalContactName"  text not null default '',
  "technicalContactPhone" text not null default '',
  comments          jsonb not null default '[]'::jsonb,
  created_at        timestamptz not null default now()
);

create table if not exists public.project_assignments (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  shk_id      uuid not null references public.profiles(id) on delete cascade,
  status      text not null default 'beworben' check (status in ('beworben','aktiv','abgelehnt')),
  hours_month integer not null default 0 check (hours_month >= 0),  -- Kontingent / Monat
  hours_total numeric not null default 0 check (hours_total >= 0),  -- geleistet gesamt
  created_at  timestamptz not null default now(),
  unique (project_id, shk_id)
);

create table if not exists public.absences (
  id            uuid primary key default gen_random_uuid(),
  shk_id        uuid not null references public.profiles(id) on delete cascade,
  type          text not null check (type in ('klausur','famulatur','urlaub')),
  start_date    date not null,
  end_date      date not null,
  available_pct integer not null default 0 check (available_pct between 0 and 100),
  note          text not null default '',
  created_at    timestamptz not null default now(),
  check (end_date >= start_date)
);

create index if not exists assignments_shk_idx     on public.project_assignments (shk_id);
create index if not exists assignments_project_idx on public.project_assignments (project_id);
create index if not exists absences_shk_idx        on public.absences (shk_id);
create index if not exists projects_owner_idx      on public.projects (owner_id);

-- ---------------------------------------------------------------------------
-- Hilfsfunktionen
-- ---------------------------------------------------------------------------
create or replace function public.current_app_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false)
$$;

-- Login per Benutzername: löst Benutzername -> E-Mail auf (für anon + authenticated).
-- Gibt NUR die E-Mail zurück und nur bei exaktem Treffer.
create or replace function public.email_for_username(p_username text) returns text
language sql stable security definer set search_path = public as $$
  select email from public.profiles where lower(username) = lower(trim(p_username)) limit 1
$$;
revoke all on function public.email_for_username(text) from public;
grant execute on function public.email_for_username(text) to anon, authenticated;

-- Freie Kapazität = Vertragsstunden - Summe(Kontingent aktiver Zuweisungen)
create or replace function public.recalc_free_hours(p_shk uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform set_config('radconnect.sys', '1', true);
  update public.profiles p
     set free_hours = greatest(0, p.contract_hours - coalesce((
           select sum(a.hours_month) from public.project_assignments a
            where a.shk_id = p.id and a.status = 'aktiv'), 0))
   where p.id = p_shk;
  perform set_config('radconnect.sys', '0', true);
end $$;

create or replace function public.trg_assignments_recalc() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op in ('UPDATE','DELETE') then perform public.recalc_free_hours(old.shk_id); end if;
  if tg_op in ('INSERT','UPDATE') then perform public.recalc_free_hours(new.shk_id); end if;
  return null;
end $$;
drop trigger if exists assignments_recalc on public.project_assignments;
create trigger assignments_recalc after insert or update or delete on public.project_assignments
  for each row execute function public.trg_assignments_recalc();

create or replace function public.trg_profiles_recalc() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.recalc_free_hours(new.id);
  return null;
end $$;
drop trigger if exists profiles_recalc on public.profiles;
create trigger profiles_recalc after insert or update of contract_hours on public.profiles
  for each row execute function public.trg_profiles_recalc();

-- Profil automatisch bei Registrierung (E-Mail/Passwort ODER Google) anlegen
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  base  text;
  uname text;
  r     text;
  n     integer := 0;
begin
  base := lower(regexp_replace(
            coalesce(nullif(new.raw_user_meta_data->>'username', ''), split_part(new.email, '@', 1)),
            '[^a-zA-Z0-9_.-]', '', 'g'));
  if base = '' then base := 'user'; end if;
  uname := base;
  while exists (select 1 from public.profiles where lower(username) = uname) loop
    n := n + 1; uname := base || n::text;
  end loop;

  r := new.raw_user_meta_data->>'role';
  if r not in ('shk','arzt') then r := null; end if;   -- Admin kann NIE selbst gewählt werden

  insert into public.profiles (id, username, email, full_name, role, contract_hours, onboarded)
  values (
    new.id, uname, new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    coalesce(r, 'shk'),
    least(80, greatest(0, coalesce((new.raw_user_meta_data->>'contract_hours')::int, 0))),
    r is not null            -- Google-Erstanmeldung => onboarded=false => Onboarding-Modal
  );
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Schutz sensibler Profilfelder (Rolle, E-Mail, free_hours)
create or replace function public.trg_protect_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(current_setting('radconnect.sys', true), '0') = '1' then return new; end if;
  if not public.is_admin() then
    if old.onboarded then
      new.role := old.role;            -- Rolle nach Onboarding fix
      new.onboarded := true;
    elsif new.role not in ('shk','arzt') then
      new.role := old.role;            -- Selbstbeförderung zu Admin unmöglich
    end if;
    new.free_hours := old.free_hours;
    new.email := old.email;
    new.id := old.id;
  end if;
  return new;
end $$;
drop trigger if exists protect_profile on public.profiles;
create trigger protect_profile before update on public.profiles
  for each row execute function public.trg_protect_profile();

-- Projekte: Nicht-Admins dürfen Status nicht ändern; zugewiesene SHKs nur den Zähler
create or replace function public.trg_guard_project() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() then return new; end if;
  if old.owner_id = auth.uid() then
    new.owner_id := old.owner_id;
    new.milestone_current := new.milestone_current;  -- Arzt darf Zähler korrigieren
    if not (
      new.status = old.status
      or (old.status = 'aktiv' and new.status = 'abgeschlossen')
      or (old.status = 'abgeschlossen' and new.status = 'aktiv')
      or (old.status = 'abgelehnt' and new.status = 'beantragt')
    ) then
      new.status := old.status;
    end if;
  else
    new.title := old.title; new.description := old.description;
    new.estimated_hours := old.estimated_hours; new.deadline := old.deadline;
    new.skills := old.skills; new.milestone_target := old.milestone_target;
    new.milestone_unit := old.milestone_unit; new.sop_ids := old.sop_ids;
    new.owner_id := old.owner_id; new.status := old.status;
  end if;
  return new;
end $$;
drop trigger if exists guard_project on public.projects;
create trigger guard_project before update on public.projects
  for each row execute function public.trg_guard_project();

-- Zuweisungen: SHKs dürfen nur Stunden ändern, nicht Status/Projekt/Person
create or replace function public.trg_guard_assignment() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() then return new; end if;
  new.status := old.status; new.project_id := old.project_id; new.shk_id := old.shk_id;
  return new;
end $$;
drop trigger if exists guard_assignment on public.project_assignments;
create trigger guard_assignment before update on public.project_assignments
  for each row execute function public.trg_guard_assignment();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles            enable row level security;
alter table public.projects            enable row level security;
alter table public.project_assignments enable row level security;
alter table public.absences            enable row level security;
alter table public.wiki_articles       enable row level security;

-- profiles: alle angemeldeten Nutzer sehen Name/Skills/freie Stunden (neutrale Kapazitätsübersicht)
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using (true);
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());
-- INSERT erfolgt ausschließlich per Trigger (security definer); kein Client-Insert/Delete.

-- projects
drop policy if exists projects_select on public.projects;
create policy projects_select on public.projects for select to authenticated using (
  status in ('offen','aktiv','abgeschlossen') or owner_id = auth.uid() or public.is_admin());
drop policy if exists projects_insert on public.projects;
create policy projects_insert on public.projects for insert to authenticated with check (
  public.is_admin() or (owner_id = auth.uid() and status = 'beantragt' and public.current_app_role() = 'arzt'));
drop policy if exists projects_update on public.projects;
create policy projects_update on public.projects for update to authenticated
  using (
    public.is_admin() or owner_id = auth.uid()
    or exists (select 1 from public.project_assignments a
                where a.project_id = projects.id and a.shk_id = auth.uid() and a.status = 'aktiv'))
  with check (true);
drop policy if exists projects_delete on public.projects;
create policy projects_delete on public.projects for delete to authenticated using (
  public.is_admin() or (owner_id = auth.uid() and status in ('beantragt','abgelehnt')));

-- project_assignments
drop policy if exists assign_select on public.project_assignments;
create policy assign_select on public.project_assignments for select to authenticated using (
  shk_id = auth.uid() or public.is_admin()
  or exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()));
drop policy if exists assign_insert on public.project_assignments;
create policy assign_insert on public.project_assignments for insert to authenticated with check (
  public.is_admin() or (shk_id = auth.uid() and status = 'beworben' and public.current_app_role() = 'shk'));
drop policy if exists assign_update on public.project_assignments;
create policy assign_update on public.project_assignments for update to authenticated
  using ((shk_id = auth.uid() and status = 'aktiv') or public.is_admin()) with check (true);
drop policy if exists assign_delete on public.project_assignments;
create policy assign_delete on public.project_assignments for delete to authenticated using (
  public.is_admin() or (shk_id = auth.uid() and status = 'beworben'));

-- absences: lesbar für alle (nur Kategorie + Zeitraum; Grundlage der Konflikt-Warnung), schreibbar nur eigene
drop policy if exists absences_select on public.absences;
create policy absences_select on public.absences for select to authenticated using (true);
drop policy if exists absences_write on public.absences;
create policy absences_write on public.absences for all to authenticated
  using (shk_id = auth.uid() or public.is_admin())
  with check (shk_id = auth.uid() or public.is_admin());

-- wiki
drop policy if exists wiki_select on public.wiki_articles;
create policy wiki_select on public.wiki_articles for select to authenticated using (true);
drop policy if exists wiki_write on public.wiki_articles;
create policy wiki_write on public.wiki_articles for all to authenticated
  using (public.is_admin() or (public.current_app_role() = 'arzt' and author_id = auth.uid()))
  with check (public.is_admin() or (public.current_app_role() = 'arzt' and author_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.projects;
alter publication supabase_realtime add table public.project_assignments;
alter publication supabase_realtime add table public.absences;
alter publication supabase_realtime add table public.wiki_articles;

-- ---------------------------------------------------------------------------
-- Start-SOPs (optional)
-- ---------------------------------------------------------------------------
insert into public.wiki_articles (title, category, summary, steps, links) values
('Willkommen im Team – Onboarding Tag 1', 'Allgemeines Onboarding',
 'Alles, was du in den ersten Tagen brauchst.',
 array['Zugang zum Klinik-PC beim IT-Service beantragen','Datenschutz- und Schweigepflichtbelehrung absolvieren','In RadConnect Skills und Vertragsstunden pflegen','Ansprechperson im Koordinationsteam kennenlernen'], '[]'),
('DICOM-Export aus dem PACS (anonymisiert)', 'PACS / DICOM',
 'Studien pseudonymisiert exportieren – nie mit Klarnamen.',
 array['Studie im PACS öffnen und Export-Dialog wählen','Option "Anonymisieren" aktivieren','Zielordner auf dem Forschungslaufwerk wählen','Export-Log im Projektordner ablegen'], '[]'),
('SPSS: Deskriptive Statistik & Gruppenvergleiche', 'Statistik & SPSS',
 'Standard-Auswertung für Kohortenstudien.',
 array['Datensatz importieren und Variablentypen prüfen','Analysieren > Deskriptive Statistiken > Explorative Datenanalyse','Normalverteilung prüfen (Shapiro-Wilk)','t-Test bzw. Mann-Whitney-U durchführen','Ergebnisse als Tabelle exportieren'], '[]');
