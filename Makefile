.PHONY: verify lint typecheck test build e2e

# Comprobaciones reales: termina con error en cuanto falla una etapa.
verify: lint typecheck build test
	npm run verify

lint:
	npm run lint

typecheck:
	npm run typecheck

test:
	npm test

build:
	npm run build

e2e:
	npm run test:e2e
