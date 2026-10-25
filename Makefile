# ─────────────────────────────────────────────────────────────────────────────
# SkillQuest — project tasks
#
# Run `make` or `make help` to see everything.
# Requires: Node 18.18+ and npm. Supabase creds live in .env.local.
# ─────────────────────────────────────────────────────────────────────────────

NPM := npm

# Use bash and fail fast on errors inside recipes.
SHELL := /bin/bash
.SHELLFLAGS := -eu -o pipefail -c

.DEFAULT_GOAL := help

# ── Help ─────────────────────────────────────────────────────────────────────
.PHONY: help
help: ## Show this help
	@echo "SkillQuest — available commands:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| sort \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'
	@echo ""

# ── Setup ────────────────────────────────────────────────────────────────────
.PHONY: setup
setup: install env ## First-time setup: install deps + create .env.local
	@echo ""
	@echo "✓ Setup complete. Next steps:"
	@echo "  1. Fill in Supabase keys in .env.local (Dashboard → Project Settings → API)"
	@echo "  2. make db-migrate   # apply the SQL migrations (see instructions)"
	@echo "  3. make seed         # load the quest catalog into Supabase"
	@echo "  4. make dev          # start the app"

.PHONY: install
install: ## Install dependencies (npm install)
	$(NPM) install

.PHONY: ci
ci: ## Clean, reproducible install from the lockfile (npm ci)
	$(NPM) ci

.PHONY: env
env: ## Create .env.local from the example (never overwrites an existing one)
	@if [ -f .env.local ]; then \
		echo ".env.local already exists — leaving it untouched."; \
	else \
		cp .env.local.example .env.local; \
		echo "Created .env.local from .env.local.example — now fill in your Supabase keys."; \
	fi

# ── Develop / run ────────────────────────────────────────────────────────────
.PHONY: dev
dev: ## Start the Next.js dev server (hot reload)
	$(NPM) run dev

.PHONY: build
build: ## Production build
	$(NPM) run build

.PHONY: start
start: ## Serve the production build (run `make build` first)
	$(NPM) run start

# ── Quality ──────────────────────────────────────────────────────────────────
.PHONY: lint
lint: ## Run ESLint (next lint)
	$(NPM) run lint

.PHONY: typecheck
typecheck: ## Type-check without emitting (tsc --noEmit)
	npx tsc --noEmit

.PHONY: test
test: ## Run the test suite (vitest)
	$(NPM) run test

.PHONY: check
check: lint typecheck test ## Run lint + typecheck + tests (pre-push / CI gate)
	@echo "✓ All checks passed."

# ── Database (Supabase) ──────────────────────────────────────────────────────
.PHONY: seed
seed: ## Seed the quest catalog into Supabase (idempotent)
	$(NPM) run seed

.PHONY: db-migrate
db-migrate: ## How to apply the SQL migrations (no CLI configured yet)
	@echo "Apply these in order in the Supabase SQL Editor"
	@echo "(Dashboard → SQL Editor → paste each file → Run):"
	@echo ""
	@for f in $$(ls supabase/migrations/*.sql | sort); do echo "  • $$f"; done
	@echo ""
	@echo "Using the Supabase CLI instead?  supabase link  &&  supabase db push"

# ── Housekeeping ─────────────────────────────────────────────────────────────
.PHONY: clean
clean: ## Remove build artifacts and caches (.next, tsbuildinfo)
	rm -rf .next
	rm -f *.tsbuildinfo tsconfig.tsbuildinfo

.PHONY: distclean
distclean: clean ## clean + remove node_modules
	rm -rf node_modules

.PHONY: fresh
fresh: distclean install ## Nuke node_modules + build caches, then reinstall
	@echo "✓ Fresh install complete."
