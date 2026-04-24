# Mirrors justfile for environments without `just`.
.PHONY: install backend-dev frontend-dev seed db-up db-down test smoke-glm

install:
	python3 -m venv .venv
	.venv/bin/pip install -e backend[dev,ocr]
	cd frontend && pnpm install

backend-dev:
	.venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 --app-dir backend

frontend-dev:
	cd frontend && pnpm dev

seed:
	.venv/bin/python -m app.seed.seed_demo

db-up:
	docker compose up -d db

db-down:
	docker compose down

test:
	.venv/bin/pytest backend/tests -q

smoke-glm:
	.venv/bin/python backend/scripts/glm_smoke.py
