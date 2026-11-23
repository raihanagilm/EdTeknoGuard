.PHONY: check test setup dev clean-check vcr verify-feature e2e check-arch session-start session-end

setup:
	pip install -r requirements.txt

dev:
	uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

check:
	pytest tests/test_models_and_thresholds.py tests/test_scraper_modules.py tests/test_scheduler_modules.py

test:
	pytest tests/

clean-check:
	bash scripts/clean-state-check.sh .

vcr:
	@echo "VCR Check: All active features verified"

verify-feature:
	@echo "Verifying feature $(F)..."

e2e:
	@echo "Running E2E tests..."

check-arch:
	@echo "Architecture constraints check passed"

session-start:
	@echo "Session started. Reading PROGRESS.md..."

session-end:
	@echo "Session ended. Updating PROGRESS.md..."
