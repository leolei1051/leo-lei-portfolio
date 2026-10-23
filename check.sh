#!/usr/bin/env bash
# Self-check for the static portfolio. Run from the repo root:
#   bash check.sh
set -u
cd "$(dirname "$0")"

fail=0
ok()  { echo "  [ok]   $1"; }
bad() { echo "  [FAIL] $1"; fail=1; }

echo "== files =="
for f in index.html forecast.html assets/site.css assets/site.js \
         vercel.json README.md .gitignore assets/Leo_Lei_Resume.pdf; do
  [ -f "$f" ] && ok "$f" || bad "missing $f"
done

echo "== no leftover placeholders =="
if grep -rn "<your-\|\[add your profile URL\]" index.html forecast.html README.md >/dev/null 2>&1; then
  bad "placeholder found:"; grep -rn "<your-\|\[add your profile URL\]" index.html forecast.html README.md
else
  ok "no placeholders"
fi

echo "== external links are allowlisted =="
# Every external https URL in deployable files must match the allowlist below.
# Fails closed: a private repo or a signed/tokenised URL breaks the check until
# it is explicitly approved here. No private identifier is named in this file.
urls=$(grep -ohE 'https://[^" >]+' index.html forecast.html assets/site.js assets/site.css 2>/dev/null | sort -u)
badlink=0
for u in $urls; do
  case "$u" in
    https://github.com/leolei1051|https://github.com/leolei1051/*|\
    https://www.linkedin.com/in/leo-lei-37705a349/*|\
    https://leo-lei-portfolio.vercel.app/*|https://cdn.tailwindcss.com)
      ok "$u" ;;
    *)
      bad "unexpected external link: $u"; badlink=1 ;;
  esac
done
[ "$badlink" -eq 0 ] && ok "all external links allowlisted"

echo "== internal links =="
grep -q 'href="forecast.html"' index.html && ok "index -> forecast.html" || bad "index missing forecast.html link"
for id in main about skills projects learning experience education contact; do
  grep -q "id=\"$id\"" index.html && ok "anchor #$id" || bad "anchor #$id missing"
done

echo "== key content markers =="
grep -q "In Progress" index.html && ok "forecast = In Progress" || bad "forecast status"
grep -q "Archived" index.html && ok "archived section" || bad "archived section"
grep -q "leo-lei-37705a349" index.html && ok "linkedin url" || bad "linkedin url"
grep -q 'href="https://github.com/leolei1051"' index.html && ok "github profile link" || bad "github profile link"

echo "== resume pdf =="
[ -s assets/Leo_Lei_Resume.pdf ] && ok "pdf non-empty" || bad "pdf missing/empty"

echo
if [ "$fail" -eq 0 ]; then echo "ALL CHECKS PASSED"; else echo "SOME CHECKS FAILED"; fi
exit $fail
