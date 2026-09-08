-- Quick health check after activating Supabase
-- Supabase Dashboard → SQL Editor → Run

select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'profiles',
    'user_wordbooks',
    'wordbook_items',
    'user_favorites',
    'user_phrases',
    'word_submissions',
    'cloud_word_records',
    'cloud_chapter_records'
  )
order by table_name;

-- Expect 8 rows. RLS should be enabled:
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename like any (array[
    'profiles', 'user_wordbooks', 'wordbook_items', 'user_favorites',
    'user_phrases', 'word_submissions', 'cloud_word_records', 'cloud_chapter_records'
  ]);
