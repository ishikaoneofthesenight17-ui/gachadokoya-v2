-- Run after all four seed files. This does not change data.
with expected(chain_name, expected_count) as (
  values
    ('ガシャポンのデパート', 40),
    ('ガチャガチャの森', 118),
    ('Pon!', 15),
    ('#C-pla（シープラ）', 246),
    ('ドリームカプセル', 85)
), actual as (
  select chain_name, count(*)::integer as actual_count
  from public.locations
  where source_type = 'official'
    and chain_name in (select chain_name from expected)
  group by chain_name
)
select
  expected.chain_name,
  expected.expected_count,
  coalesce(actual.actual_count, 0) as actual_count,
  coalesce(actual.actual_count, 0) >= expected.expected_count as ready
from expected
left join actual using (chain_name)
order by expected.chain_name;

select count(*) as official_priority_store_count
from public.locations
where source_type = 'official'
  and chain_name in ('ガシャポンのデパート', 'ガチャガチャの森', 'Pon!', '#C-pla（シープラ）', 'ドリームカプセル');
