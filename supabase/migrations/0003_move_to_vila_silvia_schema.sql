-- Moves Vila Silvia's tables out of the shared "public" schema into their
-- own "vila_silvia" schema, so they're no longer commingled with other
-- businesses' data (Tag Stop's contact form, and eventually Insta Grup)
-- on the same self-hosted instance's "default" project.
--
-- ALTER TABLE ... SET SCHEMA preserves the table's data, identity
-- sequences, indexes and RLS policies as-is — nothing else to redo.

create schema if not exists vila_silvia;

do $$
declare
  t text;
begin
  foreach t in array array[
    'reservations', 'extras', 'room_prices', 'services',
    'minibar', 'expenses', 'maintenance', 'push_subscriptions'
  ]
  loop
    if exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = t
    ) then
      execute format('alter table public.%I set schema vila_silvia', t);
    end if;
  end loop;
end $$;
