#!/usr/bin/env bash
set -euo pipefail
test -e 'Dockerfile' && test -e 'docs/release-process.md' && test -e 'docs/runbook.md' && test -e 'tests/smoke.spec.ts' && test -e '.github/workflows/academic-evaluation.yml'
test -f README.md
! rg -n -i '(api[_-]?key|secret|password|token)' --glob '!public-tests/check.sh' .
echo PUBLIC_OK

