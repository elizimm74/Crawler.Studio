# Calibration: how Crawler learns from real results

Plain-English guide for the founder. Science notes: `docs/persona-research.md` ("Engine v2").

## What happens
1. A founder finishes a test, launches, and types the real conversion rate (and visitors) in
   "Launched it? Tell us what really happened" at the bottom of the report.
2. That queues a `calibrate` job. The worker (Railway) takes the SAME simulated crowd from that test and finds
   the one correction that makes its prediction match reality. Free, no AI, a few seconds.
3. The result is logged in `calibration_runs` (every submission is kept; a re-submission supersedes the older row).
4. The worker refits the global correction and recomputes the accuracy of every result, each one predicted
   WITHOUT itself (leave-one-out), and saves `calibration_state`.
5. New tests use the founder's own site correction if they calibrated that site, else the global one once 5+
   results (200+ visitors each) exist, else none (research starting values, wide ranges).
6. https://crawler.studio/accuracy shows the headline number ("X% within ±2 points") and the month-by-month log.

## Admin
- See the log: Supabase -> SQL: `select * from calibration_runs order by created_at desc;`
- A result looks fake? Exclude it, then trigger a refit by re-saving any real result (or wait for the next one):
  `update calibration_runs set excluded = true where id = <id>;`
- Current correction: `select * from calibration_state;`

## Needs the NEW worker code
Old workers can't run calibrate jobs and won't take them (they use `claim_job`, which now only hands out
`analyze` and `run`). Calibrations wait in the queue until the new worker code is deployed on Railway.
