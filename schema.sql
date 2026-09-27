create extension if not exists pgcrypto;

create table if not exists profiles(
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null, stage_name text, age int check(age is null or age between 5 and 120),
 city text, whatsapp text,
 voice_type text check(voice_type is null or voice_type in('male','female','child','teen','adult','elderly','character_voice','other')),
 experience text, equipment text, software text, about_me text,
 role text not null default 'voice_actor' check(role in('voice_actor','admin')),
 status text not null default 'active' check(status in('active','suspended')),
 terms_accepted boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists profiles_role_idx on profiles(role);
create index if not exists profiles_voice_type_idx on profiles(voice_type);

create table if not exists voice_samples(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references profiles(id) on delete cascade,
 file_name text not null, storage_path text not null, file_url text, sample_type text,
 created_at timestamptz not null default now()
);
create index if not exists voice_samples_user_idx on voice_samples(user_id);

create table if not exists castings(
 id uuid primary key default gen_random_uuid(),
 title text not null, description text, voice_type text, age_range text, requirements text,
 voice_direction text, audition_script text, deadline timestamptz,
 status text not null default 'draft' check(status in('draft','open','closed','archived')),
 created_by uuid references profiles(id) on delete set null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists castings_status_idx on castings(status);
create index if not exists castings_deadline_idx on castings(deadline);

create table if not exists casting_characters(
 id uuid primary key default gen_random_uuid(),
 casting_id uuid not null references castings(id) on delete cascade,
 name text not null, category text, voice_type text, description text, voice_direction text,
 audition_script text, icon_svg text, sample_storage_path text, sample_url text,
 sort_order int not null default 0, is_active boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists characters_casting_idx on casting_characters(casting_id);
create index if not exists characters_sort_idx on casting_characters(sort_order);

create table if not exists voice_auditions(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references profiles(id) on delete cascade,
 casting_id uuid not null references castings(id) on delete cascade,
 character_id uuid not null references casting_characters(id) on delete cascade,
 storage_path text not null, file_name text, mime_type text, duration_seconds numeric,
 status text not null default 'submitted' check(status in('draft','recording','submitted','reviewing','shortlisted','selected','rejected')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists auditions_user_idx on voice_auditions(user_id);
create index if not exists auditions_casting_idx on voice_auditions(casting_id);
create index if not exists auditions_character_idx on voice_auditions(character_id);
create index if not exists auditions_status_idx on voice_auditions(status);
create index if not exists auditions_created_idx on voice_auditions(created_at);

create table if not exists applications(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references profiles(id) on delete cascade,
 casting_id uuid not null references castings(id) on delete cascade,
 character_id uuid not null references casting_characters(id) on delete restrict,
 voice_sample_id uuid references voice_samples(id) on delete set null,
 voice_audition_id uuid references voice_auditions(id) on delete set null,
 status text not null default 'pending' check(status in('pending','reviewing','shortlisted','selected','rejected')),
 notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(user_id,casting_id)
);
create index if not exists applications_user_idx on applications(user_id);
create index if not exists applications_casting_idx on applications(casting_id);
create index if not exists applications_character_idx on applications(character_id);
create index if not exists applications_status_idx on applications(status);

create table if not exists notifications(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references profiles(id) on delete cascade,
 title text not null, message text not null, type text, is_read boolean not null default false,
 created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on notifications(user_id);
create index if not exists notifications_read_idx on notifications(is_read);

create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at=now(); return new; end $$;

do $$
declare t text;
begin
 foreach t in array array['profiles','castings','casting_characters','voice_auditions','applications'] loop
  execute format('drop trigger if exists %I_updated_at on %I',t,t);
  execute format('create trigger %I_updated_at before update on %I for each row execute function set_updated_at()',t,t);
 end loop;
end $$;

create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path=public as $$
begin
 insert into profiles(id,full_name,stage_name,age,city,whatsapp,voice_type,experience,equipment,software,about_me,terms_accepted)
 values(
  new.id,coalesce(new.raw_user_meta_data->>'full_name','New Voice Actor'),
  new.raw_user_meta_data->>'stage_name',
  nullif(new.raw_user_meta_data->>'age','')::int,
  new.raw_user_meta_data->>'city',new.raw_user_meta_data->>'whatsapp',
  new.raw_user_meta_data->>'voice_type',new.raw_user_meta_data->>'experience',
  new.raw_user_meta_data->>'equipment',new.raw_user_meta_data->>'software',
  new.raw_user_meta_data->>'about_me',
  coalesce((new.raw_user_meta_data->>'terms_accepted')::boolean,false)
 ) on conflict(id) do nothing;
 return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function handle_new_user();

create or replace function notify_application_status_change() returns trigger
language plpgsql security definer set search_path=public as $$
declare n text;
begin
 if new.status is distinct from old.status then
  select name into n from casting_characters where id=new.character_id;
  insert into notifications(user_id,title,message,type)
  values(
   new.user_id,'AUDITION STATUS UPDATED',
   case new.status
    when 'reviewing' then 'Audisi kamu untuk karakter '||coalesce(n,'-')||' sedang dalam proses review.'
    when 'shortlisted' then 'Selamat! Audisi kamu untuk karakter '||coalesce(n,'-')||' masuk shortlist.'
    when 'selected' then 'Selamat! Kamu terpilih untuk karakter '||coalesce(n,'-')||'.'
    when 'rejected' then 'Audisi kamu untuk karakter '||coalesce(n,'-')||' belum berhasil kali ini.'
    else 'Status audisi kamu untuk karakter '||coalesce(n,'-')||' telah diperbarui.'
   end,new.status
  );
 end if;
 return new;
end $$;

drop trigger if exists application_status_notify on applications;
create trigger application_status_notify after update on applications
for each row execute function notify_application_status_change();

alter table profiles enable row level security;
alter table voice_samples enable row level security;
alter table castings enable row level security;
alter table casting_characters enable row level security;
alter table voice_auditions enable row level security;
alter table applications enable row level security;
alter table notifications enable row level security;

create or replace function is_admin() returns boolean
language sql security definer stable set search_path=public as $$
 select exists(select 1 from profiles where id=auth.uid() and role='admin')
$$;

drop policy if exists profiles_select on profiles;
create policy profiles_select on profiles for select using(id=auth.uid() or is_admin());
drop policy if exists profiles_insert on profiles;
create policy profiles_insert on profiles for insert with check(id=auth.uid());
drop policy if exists profiles_update on profiles;
create policy profiles_update on profiles for update using(id=auth.uid() or is_admin());
drop policy if exists profiles_delete on profiles;
create policy profiles_delete on profiles for delete using(is_admin() and id<>auth.uid());

drop policy if exists voice_samples_select on voice_samples;
create policy voice_samples_select on voice_samples for select using(user_id=auth.uid() or is_admin());
drop policy if exists voice_samples_insert on voice_samples;
create policy voice_samples_insert on voice_samples for insert with check(user_id=auth.uid());
drop policy if exists voice_samples_delete on voice_samples;
create policy voice_samples_delete on voice_samples for delete using(user_id=auth.uid() or is_admin());

drop policy if exists castings_select on castings;
create policy castings_select on castings for select using(status='open' or is_admin());
drop policy if exists castings_insert on castings;
create policy castings_insert on castings for insert with check(is_admin());
drop policy if exists castings_update on castings;
create policy castings_update on castings for update using(is_admin());
drop policy if exists castings_delete on castings;
create policy castings_delete on castings for delete using(is_admin());

drop policy if exists characters_select on casting_characters;
create policy characters_select on casting_characters for select using(
 is_admin() or exists(select 1 from castings c where c.id=casting_id and c.status='open')
);
drop policy if exists characters_insert on casting_characters;
create policy characters_insert on casting_characters for insert with check(is_admin());
drop policy if exists characters_update on casting_characters;
create policy characters_update on casting_characters for update using(is_admin());
drop policy if exists characters_delete on casting_characters;
create policy characters_delete on casting_characters for delete using(is_admin());

drop policy if exists auditions_select on voice_auditions;
create policy auditions_select on voice_auditions for select using(user_id=auth.uid() or is_admin());
drop policy if exists auditions_insert on voice_auditions;
create policy auditions_insert on voice_auditions for insert with check(user_id=auth.uid());
drop policy if exists auditions_update on voice_auditions;
create policy auditions_update on voice_auditions for update using(user_id=auth.uid() or is_admin());

drop policy if exists applications_select on applications;
create policy applications_select on applications for select using(user_id=auth.uid() or is_admin());
drop policy if exists applications_insert on applications;
create policy applications_insert on applications for insert with check(user_id=auth.uid());
drop policy if exists applications_update on applications;
create policy applications_update on applications for update using(user_id=auth.uid() or is_admin());

drop policy if exists notifications_select on notifications;
create policy notifications_select on notifications for select using(user_id=auth.uid());
drop policy if exists notifications_update on notifications;
create policy notifications_update on notifications for update using(user_id=auth.uid());
drop policy if exists notifications_insert on notifications;
create policy notifications_insert on notifications for insert with check(is_admin());

insert into storage.buckets(id,name,public) values
('voice-samples','voice-samples',false),
('voice-auditions','voice-auditions',false),
('character-samples','character-samples',true)
on conflict(id) do nothing;

drop policy if exists voice_samples_storage_select on storage.objects;
create policy voice_samples_storage_select on storage.objects for select using(
 bucket_id='voice-samples' and(auth.uid()::text=(storage.foldername(name))[1] or is_admin())
);
drop policy if exists voice_samples_storage_insert on storage.objects;
create policy voice_samples_storage_insert on storage.objects for insert with check(
 bucket_id='voice-samples' and auth.uid()::text=(storage.foldername(name))[1]
);
drop policy if exists voice_samples_storage_delete on storage.objects;
create policy voice_samples_storage_delete on storage.objects for delete using(
 bucket_id='voice-samples' and(auth.uid()::text=(storage.foldername(name))[1] or is_admin())
);

drop policy if exists voice_auditions_storage_select on storage.objects;
create policy voice_auditions_storage_select on storage.objects for select using(
 bucket_id='voice-auditions' and(auth.uid()::text=(storage.foldername(name))[1] or is_admin())
);
drop policy if exists voice_auditions_storage_insert on storage.objects;
create policy voice_auditions_storage_insert on storage.objects for insert with check(
 bucket_id='voice-auditions' and auth.uid()::text=(storage.foldername(name))[1]
);

drop policy if exists character_samples_storage_select on storage.objects;
create policy character_samples_storage_select on storage.objects for select using(bucket_id='character-samples');
drop policy if exists character_samples_storage_write on storage.objects;
create policy character_samples_storage_write on storage.objects for insert with check(bucket_id='character-samples' and is_admin());
drop policy if exists character_samples_storage_update on storage.objects;
create policy character_samples_storage_update on storage.objects for update using(bucket_id='character-samples' and is_admin());
drop policy if exists character_samples_storage_delete on storage.objects;
create policy character_samples_storage_delete on storage.objects for delete using(bucket_id='character-samples' and is_admin());

do $$
declare c uuid;
begin
 insert into castings(title,description,voice_type,age_range,requirements,voice_direction,deadline,status)
 values(
  'Misteri Rumah Tua',
  'Casting suara untuk serial animasi pendek HAR Animasi bertema misteri remaja.',
  'Teen / Male','15 - 22 tahun (rentang usia suara)',
  'Memiliki mikrofon yang jelas, ruangan minim noise, dan mampu membawakan emosi sesuai arahan.',
  'Bawakan suasana tegang, penasaran, dan natural khas remaja.',
  now()+interval '30 days','open'
 ) returning id into c;

 insert into casting_characters(casting_id,name,category,voice_type,description,voice_direction,audition_script,sort_order)
 values
 (c,'YONAS','VOICE OVER REMAJA','Teen / Male','Natural, tenang, penasaran, dan mampu membawakan suasana tegang.','Gunakan suara remaja yang natural, jelas, sedikit tenang, dan ekspresif. Berikan nuansa penasaran ketika membaca dialog.','Kalian yakin kita harus masuk ke rumah itu?',1),
 (c,'HASAN','VOICE OVER REMAJA','Teen / Male','Aktif, ekspresif, energik, dan percaya diri.','Gunakan suara remaja yang energik, ekspresif, natural, dan percaya diri. Jangan terlalu berlebihan.','Tenang, kita cuma lihat sebentar. Setelah itu kita langsung pergi.',2),
 (c,'IZHAR','VOICE OVER REMAJA','Teen / Male','Tenang, misterius, serius, dan emosional.','Gunakan suara remaja yang lebih tenang dan serius. Berikan nuansa misterius dan emosional sesuai dialog.','Tunggu... kalian dengar suara itu?',3),
 (c,'RAKA','VOICE OVER REMAJA','Teen / Male','Santai, natural, ramah, dan ekspresif.','Gunakan suara remaja yang santai, natural, friendly, dan tetap ekspresif.','Jangan bilang kalian benar-benar percaya cerita tentang rumah ini.',4);
end $$;
