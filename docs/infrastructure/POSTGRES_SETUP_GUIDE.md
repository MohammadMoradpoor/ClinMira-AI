# PostgreSQL Setup Guide

## Purpose

This guide creates a disposable local PostgreSQL database for Step 16 DB-backed replay and safety evidence.

It creates:

```text
database: clinmira_test
role: clinmira_test_user
environment variable: CLINMIRA_TEST_DATABASE_URL
```

Do not use production, staging, pilot, shared QA, real patient data, or institution-owned data.

## 1. Install PostgreSQL On Linux

Ubuntu/Debian:

```bash
sudo apt-get update
sudo apt-get install -y postgresql postgresql-contrib
```

Start and verify PostgreSQL:

```bash
sudo systemctl start postgresql
sudo systemctl status postgresql --no-pager
psql --version
```

Expected major version for Step 16 local validation:

```text
PostgreSQL 16.x
```

The Step 16A audit observed `psql (PostgreSQL) 16.14`.

## 2. Choose A Local Password

Choose a local-only password and do not commit it.

Example shell variable for this setup session:

```bash
export CLINMIRA_TEST_DB_PASSWORD='<choose-a-local-test-password>'
```

Do not place this value in `.env`, shell history shared with others, documentation commits, screenshots, or issue trackers.

## 3. Create The Test Role

Run:

```bash
sudo -u postgres psql -v ON_ERROR_STOP=1
```

Inside `psql`, create the role:

```sql
CREATE ROLE clinmira_test_user
  WITH LOGIN
  PASSWORD '<choose-a-local-test-password>';
```

Exit:

```sql
\q
```

If the role already exists and this is a disposable local machine, reset its password:

```bash
sudo -u postgres psql -v ON_ERROR_STOP=1 -c "ALTER ROLE clinmira_test_user WITH LOGIN PASSWORD '<choose-a-local-test-password>';"
```

## 4. Create The Test Database

Create the database owned by the test role:

```bash
sudo -u postgres createdb --owner=clinmira_test_user clinmira_test
```

Optional hardening for local clarity:

```bash
sudo -u postgres psql -v ON_ERROR_STOP=1 -d clinmira_test -c "ALTER DATABASE clinmira_test SET timezone TO 'UTC';"
```

## 5. Grant Permissions

The database owner should already have the required privileges. Verify and grant schema privileges explicitly:

```bash
sudo -u postgres psql -v ON_ERROR_STOP=1 -d clinmira_test -c "GRANT CONNECT ON DATABASE clinmira_test TO clinmira_test_user;"
sudo -u postgres psql -v ON_ERROR_STOP=1 -d clinmira_test -c "GRANT CREATE, USAGE ON SCHEMA public TO clinmira_test_user;"
```

If extension creation fails later, preinstall `pgcrypto` as the PostgreSQL admin:

```bash
sudo -u postgres psql -v ON_ERROR_STOP=1 -d clinmira_test -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"
```

`0001_core_identity_and_audit.sql` also creates `pgcrypto`; preinstalling it is allowed only to satisfy local database permissions.

## 6. Define `CLINMIRA_TEST_DATABASE_URL`

Set the URL in the current shell:

```bash
export CLINMIRA_TEST_DATABASE_URL="postgresql://clinmira_test_user:${CLINMIRA_TEST_DB_PASSWORD}@127.0.0.1:5432/clinmira_test"
```

For NestJS API runtime only, map the API database URL to the same disposable test database:

```bash
export CLINMIRA_DATABASE_URL="$CLINMIRA_TEST_DATABASE_URL"
```

Do not create an env file.

## 7. Verify Connection

Run:

```bash
psql "$CLINMIRA_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -c "SELECT current_database() AS database, current_user AS user, version();"
```

Expected:

- `database` is `clinmira_test`.
- `user` is `clinmira_test_user`.
- PostgreSQL major version is `16`.

Verify `pgcrypto` availability:

```bash
psql "$CLINMIRA_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"
psql "$CLINMIRA_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -c "SELECT gen_random_uuid() AS generated_uuid;"
```

Expected: one generated UUID.

## 8. Apply Migrations

From the repository root:

```bash
cd /home/mohammad/Projects/ClinMira-AI
psql "$CLINMIRA_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/database/migrations/0001_core_identity_and_audit.sql
psql "$CLINMIRA_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/database/migrations/0002_case_versioning_and_fact_ledger.sql
psql "$CLINMIRA_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/database/migrations/0003_event_log_outbox_idempotency.sql
psql "$CLINMIRA_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/database/migrations/0004_mock_simulation_session_engine.sql
psql "$CLINMIRA_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/database/migrations/0005_deterministic_safety_engine.sql
```

Verify migration registry:

```bash
psql "$CLINMIRA_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -c "SELECT version, name, success FROM schema_migrations ORDER BY version;"
```

Expected versions:

```text
0001
0002
0003
0004
0005
```

## 9. Apply Synthetic Seeds

Apply only development synthetic seeds:

```bash
psql "$CLINMIRA_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/database/seeds/0001_dev_synthetic_identity_seed.sql
psql "$CLINMIRA_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/database/seeds/0002_dev_synthetic_case_fact_seed.sql
psql "$CLINMIRA_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/database/seeds/0005_deterministic_safety_rules_seed.sql
```

Verify seed counts:

```bash
psql "$CLINMIRA_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -c "SELECT count(*) AS institutions FROM institutions;"
psql "$CLINMIRA_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -c "SELECT count(*) AS users FROM users;"
psql "$CLINMIRA_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -c "SELECT visibility, count(*) FROM fact_ledger GROUP BY visibility ORDER BY visibility;"
psql "$CLINMIRA_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -c "SELECT count(*) AS safety_rules FROM safety_rules WHERE enabled = true;"
```

Expected:

- At least one institution.
- At least one user.
- At least one `baseline_visible` fact.
- At least one `hidden_until_revealed` fact.
- Safety rules are present.

## 10. Known API Fixture Caveat

The current synthetic seed IDs are deterministic all-zero style UUIDs, for example:

```text
00000000-0000-0000-0000-000000000101
```

The current API controllers validate UUIDs with RFC4122-style version and variant nibbles. These seed IDs may not pass API header/body validation.

Implication:

- Schema apply and seed validation can pass.
- Direct API-route Step 16 evidence may still require an approved valid-UUID synthetic fixture setup or an approved seed/validator correction.
- Do not weaken UUID validation or mutate seeds in Step 16A.

## 11. Reset The Disposable Database

Use this only for the disposable local `clinmira_test` database.

Terminate connections:

```bash
sudo -u postgres psql -v ON_ERROR_STOP=1 -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'clinmira_test' AND pid <> pg_backend_pid();"
```

Drop and recreate the database:

```bash
sudo -u postgres dropdb --if-exists clinmira_test
sudo -u postgres createdb --owner=clinmira_test_user clinmira_test
sudo -u postgres psql -v ON_ERROR_STOP=1 -d clinmira_test -c "GRANT CREATE, USAGE ON SCHEMA public TO clinmira_test_user;"
```

Then rerun migration and seed commands.

## 12. Remove The Local Test Database And User

Use this only if you are done with the local disposable environment:

```bash
sudo -u postgres psql -v ON_ERROR_STOP=1 -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'clinmira_test' AND pid <> pg_backend_pid();"
sudo -u postgres dropdb --if-exists clinmira_test
sudo -u postgres dropuser --if-exists clinmira_test_user
unset CLINMIRA_TEST_DATABASE_URL
unset CLINMIRA_DATABASE_URL
unset CLINMIRA_TEST_DB_PASSWORD
```

## 13. Troubleshooting

If `psql` cannot connect:

- Confirm PostgreSQL is running with `sudo systemctl status postgresql --no-pager`.
- Confirm the database exists with `sudo -u postgres psql -l`.
- Confirm the role exists with `sudo -u postgres psql -c "\du"`.
- Confirm the URL uses `127.0.0.1`, port `5432`, database `clinmira_test`, and user `clinmira_test_user`.

If `CREATE EXTENSION pgcrypto` fails:

- Preinstall it as PostgreSQL admin in `clinmira_test`.
- Do not remove `CREATE EXTENSION IF NOT EXISTS pgcrypto` from migration `0001`.

If migrations fail:

- Stop immediately.
- Do not edit applied SQL manually.
- Reset the disposable database.
- Reapply migrations in strict numeric order.
- Record the failing migration and error in the Step 16 report.

If API route calls reject seeded IDs:

- Treat it as the known UUID fixture gap.
- Do not weaken validation inside Step 16A.
- Use a later approved Step 16 evidence task to add valid-UUID synthetic fixtures or correct seed strategy.
