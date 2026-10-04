#!/usr/bin/env bash
set -euo pipefail
test -e 'src/lib/sync/queue.ts' && test -e 'src/lib/storage/schema.ts' && test -e 'src/lib/sync/conflict-policy.ts' && test -e 'docs/sync-policy.md' && test -e 'tests/sync.spec.ts'
test -f README.md
! rg -n -i '(api[_-]?key|secret|password|token)' --glob '!public-tests/check.sh' .
echo PUBLIC_OK

