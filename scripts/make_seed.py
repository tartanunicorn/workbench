# Workbook → seed SQL for the Supabase schema. Usage: python3 make_seed.py sphere_filing_db.xlsx seed.sql
import sys, datetime as dt, openpyxl
wb = openpyxl.load_workbook(sys.argv[1], read_only=True)
MAP = {"Settings":"settings","Owners":"owners","Countries":"countries","Regions":"regions","Customers":"customers","Runs":"runs",
       "ReturnTypes":"return_types","ReturnTypeRules":"return_type_rules","Registrations":"registrations","Returns":"returns",
       "ReturnEvents":"return_events","Issues":"issues","IssueLinks":"issue_links","BalancesNotices":"balances_notices",
       "Tasks":"tasks","TaskRelations":"task_relations","Ownerships":"ownerships","Holidays":"holidays"}
BOOL = {"active","is_union","internal_review","systemic_fix"}
def lit(k, v):
    if v is None or v == "": return "null"
    if k in BOOL: return "true" if str(v) in ("Yes","True","true","1") else "false"
    if isinstance(v, dt.datetime): return "'" + (v.strftime("%Y-%m-%d %H:%M") if (v.hour or v.minute) else v.strftime("%Y-%m-%d")) + "'"
    if isinstance(v, (int, float)): return repr(v)
    return "'" + str(v).strip().replace("'", "''") + "'"
out = ["begin;", "set constants all deferred;"]
for sheet, table in MAP.items():
    rows = list(wb[sheet].values); cols = [c for c in rows[0] if c]
    for i in range(1, len(rows), 500):
        chunk = rows[i:i+500]
        vals = ",\n".join("(" + ",".join(lit(c, r[j]) for j, c in enumerate(cols)) + ")" for r in chunk if any(x is not None for x in r))
        if vals: out.append(f'insert into {table} ({",".join(chr(34)+c+chr(34) for c in cols)}) values\n{vals};')
out.append("commit;")
open(sys.argv[2], "w").write("\n".join(out).replace("set constants all deferred;\n", ""))
