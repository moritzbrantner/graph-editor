#!/usr/bin/env bash
set -euo pipefail

node <<'NODE'
const fs = require("node:fs");
const report = JSON.parse(fs.readFileSync("coverage/coverage-summary.json", "utf8"));
const metrics = ["lines", "branches", "functions", "statements"];
const rows = metrics.map((metric) => {
  const item = report.total[metric];
  return { metric, covered: item.covered, total: item.total, pct: item.pct };
});

console.log("Coverage summary");
for (const row of rows) {
  console.log(`${row.metric}: ${row.covered}/${row.total} (${row.pct}%)`);
}

const summaryPath = process.env.GITHUB_STEP_SUMMARY;
if (summaryPath) {
  const markdown = [
    "### Test coverage",
    "",
    "| Metric | Covered | Total | Coverage |",
    "| --- | ---: | ---: | ---: |",
    ...rows.map((row) => `| ${row.metric} | ${row.covered} | ${row.total} | ${row.pct}% |`),
    "",
  ].join("\n");
  fs.appendFileSync(summaryPath, markdown);
}
NODE
