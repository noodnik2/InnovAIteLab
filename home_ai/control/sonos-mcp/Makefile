# Sonos MCP server — common developer tasks.
# Compatible with the GNU Make 3.81 that ships with macOS.

NPM   ?= npm
NODE  ?= node
STAMP := node_modules/.install-stamp

.DEFAULT_GOAL := help
.PHONY: all help install build run dev test coverage lint typecheck check clean distclean

all: check build ## Lint, type-check, test, then build (default)

help: ## Show available targets
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "}; {printf "  %-10s %s\n", $$1, $$2}'

install: $(STAMP) ## Install dependencies from package-lock.json

$(STAMP): package.json package-lock.json
	$(NPM) ci
	@touch $@

build: $(STAMP) ## Compile TypeScript to dist/
	$(NPM) run build

run: build ## Run the server on stdio (what Claude Code launches)
	$(NODE) dist/index.js

dev: $(STAMP) ## Run from source without building
	$(NPM) run dev

test: $(STAMP) ## Run unit tests
	$(NPM) test

coverage: $(STAMP) ## Run unit tests with coverage (fails under 80%)
	$(NPM) run coverage

lint: $(STAMP) ## Lint with ESLint
	$(NPM) run lint

typecheck: $(STAMP) ## Type-check sources and tests
	$(NPM) run typecheck

check: lint typecheck coverage ## All quality gates

clean: ## Remove build and coverage output
	rm -rf dist coverage

distclean: clean ## Also remove node_modules
	rm -rf node_modules
