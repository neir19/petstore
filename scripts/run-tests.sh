#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_root"

mvn clean test

generated_report="target/karate-reports"
versioned_report="reports/karate-reports"

if [[ ! -f "$generated_report/karate-summary.html" ]]; then
  echo "Karate HTML summary was not generated: $generated_report/karate-summary.html" >&2
  exit 1
fi

mkdir -p "$versioned_report"
cp -R "$generated_report/." "$versioned_report/"

printf 'Karate report copied to %s/karate-summary.html\n' "$versioned_report"
