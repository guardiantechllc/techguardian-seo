"""
Jobs / profit tracker package.

Two CLIs:
    python -m lead_system.jobs.log_job       # interactively log a completed repair
    python -m lead_system.jobs.report        # daily profit + $400/day progress

Data lives in data/jobs.csv (always) and your Airtable Jobs table (if
AIRTABLE_API_KEY is configured). CSV is the audit trail.
"""
