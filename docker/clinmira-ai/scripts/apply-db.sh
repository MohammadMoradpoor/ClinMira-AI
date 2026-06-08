#!/bin/sh

set -eu

MIGRATIONS_DIR="${CLINMIRA_MIGRATIONS_DIR:-/clinmira/migrations}"
SEEDS_DIR="${CLINMIRA_SEEDS_DIR:-/clinmira/seeds}"

fail() {
  printf '%s\n' "ERROR: $*" >&2
  exit 1
}

require_env() {
  name="$1"
  eval "value=\${$name:-}"
  [ -n "$value" ] || fail "$name is required"
}

require_env PGHOST
require_env PGPORT
require_env PGDATABASE
require_env PGUSER
require_env PGPASSWORD

[ "${CLINMIRA_REQUIRE_DB:-}" = "true" ] || fail "DB guard is not enabled"
[ "$PGDATABASE" = "${CLINMIRA_EXPECTED_DATABASE:-clinmira_ai_docker_dev}" ] || fail "refusing unexpected database: $PGDATABASE"
[ "$PGUSER" = "${CLINMIRA_EXPECTED_USER:-clinmira_ai_docker_user}" ] || fail "refusing unexpected database user: $PGUSER"

printf '%s\n%s\n%s\n' "$PGHOST" "$PGDATABASE" "$PGUSER" | grep -Eiq '(prod|production|staging)' \
  && fail "refusing a database target that looks like production or staging"

[ -d "$MIGRATIONS_DIR" ] || fail "missing migrations directory: $MIGRATIONS_DIR"
[ -d "$SEEDS_DIR" ] || fail "missing seeds directory: $SEEDS_DIR"

psql_base() {
  psql -v ON_ERROR_STOP=1 -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" "$@"
}

printf '%s\n' "Waiting for PostgreSQL at $PGHOST:$PGPORT/$PGDATABASE ..."
until pg_isready -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" >/dev/null 2>&1; do
  sleep 1
done

current_user="$(psql_base -At -c 'select current_user')"
current_database="$(psql_base -At -c 'select current_database()')"

[ "$current_user" = "$PGUSER" ] || fail "connected as unexpected user: $current_user"
[ "$current_database" = "$PGDATABASE" ] || fail "connected to unexpected database: $current_database"

schema_migrations_exists="$(psql_base -At -c "select case when to_regclass('public.schema_migrations') is null then 'no' else 'yes' end")"
latest_migration_present="no"
if [ "$schema_migrations_exists" = "yes" ]; then
  latest_migration_present="$(psql_base -At -c "select case when exists (select 1 from schema_migrations where version = '0005' and success = true) then 'yes' else 'no' end")"
fi

if [ "$latest_migration_present" = "yes" ]; then
  printf '%s\n' "Migrations 0001 through 0005 already appear applied; skipping migration SQL."
else
  printf '%s\n' "Applying ClinMira migrations 0001 through 0005..."
  psql_base -f "$MIGRATIONS_DIR/0001_core_identity_and_audit.sql"
  psql_base -f "$MIGRATIONS_DIR/0002_case_versioning_and_fact_ledger.sql"
  psql_base -f "$MIGRATIONS_DIR/0003_event_log_outbox_idempotency.sql"
  psql_base -f "$MIGRATIONS_DIR/0004_mock_simulation_session_engine.sql"
  psql_base -f "$MIGRATIONS_DIR/0005_deterministic_safety_engine.sql"
fi

printf '%s\n' "Applying synthetic development seeds..."
psql_base -f "$SEEDS_DIR/0001_dev_synthetic_identity_seed.sql"
psql_base -f "$SEEDS_DIR/0002_dev_synthetic_case_fact_seed.sql"
psql_base -f "$SEEDS_DIR/0005_deterministic_safety_rules_seed.sql"

printf '%s\n' "Validating database foundation..."
psql_base -At -c "select version from schema_migrations order by version"
psql_base -At -c "select count(*) from institutions"
psql_base -At -c "select count(*) from fact_ledger"
psql_base -At -c "select count(*) from safety_rules"

printf '%s\n' "ClinMira database setup complete."

