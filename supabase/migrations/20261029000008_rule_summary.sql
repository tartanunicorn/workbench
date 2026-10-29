-- How each rule came out across a run, for the rules page
create view rule_summary with (security_invoker = on) as
select r.run_id, rr.rule_id, rr.result, count(*)::int as returns
from rule_results rr join returns r on r.return_id = rr.return_id
where r.deleted_at is null
group by r.run_id, rr.rule_id, rr.result;
