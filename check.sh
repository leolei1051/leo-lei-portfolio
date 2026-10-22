#!/usr/bin/env bash
# Self-check for the static portfolio. Run from the repo root:
#   bash check.sh
set -u
cd "$(dirname "$0")"

fail=0
ok()  { echo "  [ok]   $1"; }
bad() { echo "  [FAIL] $1"; fail=1; }

echo "== files =="
for f in index.html forecast.html vercel.json README.md .gitignore assets/Leo_Lei_Resume.pdf; do
  [ -f "$f" ] && ok "$f" || bad "missing $f"
done

echo "== no leftover placeholders =="
if grep -rn "<your-\|\[add your profile URL\]" index.html forecast.html README.md >/dev/null 2>&1; then
  bad "placeholder found:"; grep -rn "<your-\|\[add your profile URL\]" index.html forecast.html README.md
else
  ok "no placeholders"
fi

echo "== internal links =="
grep -q 'href="forecast.html"' index.html && ok "index -> forecast.html" || bad "index missing forecast.html link"
for id in about skills projects experience education contact main; do
  grep -q "id=\"$id\"" index.html && ok "anchor #$id" || bad "anchor #$id missing"
done

echo "== key content markers =="
grep -q "In Progress" index.html && ok "forecast = In Progress" || bad "forecast status"
grep -q "Archived" index.html && ok "archived section" || bad "archived section"
grep -q "leo-lei-37705a349" index.html && ok "linkedin url" || bad "linkedin url"

echo "== resume pdf =="
[ -s assets/Leo_Lei_Resume.pdf ] && ok "pdf non-empty" || bad "pdf missing/empty"

echo
if [ "$fail" -eq 0 ]; then echo "ALL CHECKS PASSED"; else echo "SOME CHECKS FAILED"; fi
exit $fail
