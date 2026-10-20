#!/usr/bin/env bash
# Prueba de pantalla del menú de pedidos contra las funciones SQL reales de la calculadora.
# Necesita: Postgres (PGHOST, PGPORT, PGUSER), Playwright (PLAYWRIGHT, CHROMIUM) y el repo de la calculadora
# al lado (CALCULADORA=../calculadora-costos por defecto).
set -euo pipefail
cd "$(dirname "$0")/../.."
CALC="${CALCULADORA:-../calculadora-costos}"
DB=menu_prueba
export PGOPTIONS="-c client_min_messages=warning"
psql -q -d postgres -c "drop database if exists $DB" -c "create database $DB"
for f in "$CALC/tests/db/supabase-stub.sql" "$CALC/supabase/schema.sql" "$CALC/supabase/caja.sql" "$CALC/supabase/menu.sql" tests/e2e/datos-prueba.sql; do
  psql -q -X -o /dev/null -v ON_ERROR_STOP=1 -d $DB -f "$f"
done
node tests/e2e/servidor-prueba.cjs 8770 $DB >/dev/null 2>&1 &
SERVIDOR=$!
trap 'kill $SERVIDOR 2>/dev/null' EXIT
for i in $(seq 1 30); do curl -s -o /dev/null http://localhost:8770/pedir.html && break; sleep 0.3; done
MENU_DB=$DB node tests/e2e/pedir.e2e.cjs
