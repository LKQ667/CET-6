insert into public.users (id, email, target_score, prep_start_date, prep_end_date)
values
  ('11111111-1111-4111-8111-111111111111', 'demo@example.com', 500, '2026-03-01', '2026-12-11')
on conflict (id) do update set
  email = excluded.email,
  target_score = excluded.target_score,
  prep_start_date = excluded.prep_start_date,
  prep_end_date = excluded.prep_end_date,
  updated_at = now();

insert into public.scores_baseline (id, user_id, total_score, listening_score, reading_score, writing_translation_score)
values
  ('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', 339, 103, 149, 87)
on conflict (user_id) do update set
  total_score = excluded.total_score,
  listening_score = excluded.listening_score,
  reading_score = excluded.reading_score,
  writing_translation_score = excluded.writing_translation_score;

insert into public.reminder_preferences (id, user_id, email_enabled, push_enabled, reminder_times, timezone)
values
  ('33333333-3333-4333-8333-333333333333', '11111111-1111-4111-8111-111111111111', true, true, array['12:00', '21:40'], 'Asia/Shanghai')
on conflict (user_id) do update set
  email_enabled = excluded.email_enabled,
  push_enabled = excluded.push_enabled,
  reminder_times = excluded.reminder_times,
  timezone = excluded.timezone,
  updated_at = now();

insert into public.game_profiles (id, user_id, level, exp, coins, streak_days, last_active_date)
values
  ('66666666-6666-4666-8666-666666666661', '11111111-1111-4111-8111-111111111111', 1, 0, 0, 0, null)
on conflict (user_id) do update set
  level = excluded.level,
  exp = excluded.exp,
  coins = excluded.coins,
  streak_days = excluded.streak_days,
  last_active_date = excluded.last_active_date,
  updated_at = now();

insert into public.builtin_resources (id, title, description, file_name, public_path, source_url, is_active)
values
  (
    'builtin-cet4-6',
    'CET4-6 词频资料（内置）',
    '站内可下载，也可一键导入抽词入待审核池。',
    'cet4-6.pdf',
    '/resources/cet4-6.pdf',
    null,
    true
  ),
  (
    'builtin-cet6-shuffle-vocab',
    '大学英语六级词汇乱序版（内置）',
    '站内可下载，也可一键导入抽词入待审核池。',
    '大学英语六级词汇乱序版.pdf',
    '/resources/大学英语六级词汇乱序版.pdf',
    null,
    true
  )
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  file_name = excluded.file_name,
  public_path = excluded.public_path,
  source_url = excluded.source_url,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.vocab_entries (id, lemma, phonetic, pos, meaning_zh, frequency_in_papers, is_verified, verification_status)
values
  ('44444444-4444-4444-8444-444444444401', 'motivation', '/ˌməʊtɪˈveɪʃn/', 'n.', '动机；学习动力', 1, false, 'public_source'),
  ('44444444-4444-4444-8444-444444444402', 'method', '/ˈmeθəd/', 'n.', '方法', 1, false, 'public_source'),
  ('44444444-4444-4444-8444-444444444403', 'mutual', '/ˈmjuːtʃuəl/', 'adj.', '相互的', 1, false, 'public_source'),
  ('44444444-4444-4444-8444-444444444404', 'interpersonal', '/ˌɪntəˈpɜːsənl/', 'adj.', '人际的', 1, false, 'public_source'),
  ('44444444-4444-4444-8444-444444444405', 'responsibility', '/rɪˌspɒnsəˈbɪləti/', 'n.', '责任', 1, false, 'public_source'),
  ('44444444-4444-4444-8444-444444444406', 'harmony', '/ˈhɑːməni/', 'n.', '和谐', 1, false, 'public_source')
on conflict (lemma) do nothing;

insert into public.vocab_provenance
  (id, vocab_entry_id, exam_year, exam_month, paper_code, question_type, source_url, source_snippet, source_file)
values
  (
    '55555555-5555-4555-8555-555555555501',
    '44444444-4444-4444-8444-444444444401',
    2019, 6, 'set-1-writing', 'writing',
    'https://cet6.koolearn.com/20190615/828149.html',
    'the importance of motivation and methods in learning',
    null
  ),
  (
    '55555555-5555-4555-8555-555555555502',
    '44444444-4444-4444-8444-444444444402',
    2019, 6, 'set-1-writing', 'writing',
    'https://cet6.koolearn.com/20190615/828149.html',
    'the importance of motivation and methods in learning',
    null
  ),
  (
    '55555555-5555-4555-8555-555555555503',
    '44444444-4444-4444-8444-444444444403',
    2019, 6, 'set-2-writing', 'writing',
    'https://cet6.koolearn.com/20190615/828165.html',
    'the importance of mutual understanding and respect in interpersonal relationships',
    null
  ),
  (
    '55555555-5555-4555-8555-555555555504',
    '44444444-4444-4444-8444-444444444404',
    2019, 6, 'set-2-writing', 'writing',
    'https://cet6.koolearn.com/20190615/828165.html',
    'the importance of mutual understanding and respect in interpersonal relationships',
    null
  ),
  (
    '55555555-5555-4555-8555-555555555505',
    '44444444-4444-4444-8444-444444444405',
    2019, 12, 'set-1-writing', 'writing',
    'http://edu.newdu.com/CET6/Synthetical/OldExam/201912/626841.html',
    'the importance of having a sense of social responsibility',
    null
  ),
  (
    '55555555-5555-4555-8555-555555555506',
    '44444444-4444-4444-8444-444444444406',
    2019, 12, 'set-1-writing', 'writing',
    'http://edu.newdu.com/CET6/Synthetical/OldExam/201912/626841.html',
    'of great significance for social harmony',
    null
  )
on conflict (id) do nothing;

update public.vocab_entries
set is_verified = true
where id in (
  '44444444-4444-4444-8444-444444444401',
  '44444444-4444-4444-8444-444444444402',
  '44444444-4444-4444-8444-444444444403',
  '44444444-4444-4444-8444-444444444404',
  '44444444-4444-4444-8444-444444444405',
  '44444444-4444-4444-8444-444444444406'
);
