---
name: data-analysis
description: Analyze a dataset end-to-end — read the source, run statistics (via the code_exec tool for sandboxed computation), generate visualizations, write a report. Used for "analyze data in X" or "what's the trend in Y".
trigger:
  - "analyze data"
  - "data analysis"
  - "run statistics on"
  - "what's the trend"
tools_required: ["filesystem"]
category: analysis
estimated_time: "15-45 minutes"
always_loaded: false
preferred_model_role: office
---

# Data Analysis

## Purpose

Analyze a dataset end-to-end: read the source (CSV, JSON, Parquet), run statistics (via the `code_exec` tool in the sandbox), generate visualizations (text-based charts or HTML/SVG), and write a structured report. Used for "analyze data in X" or "what's the trend in Y". The skill is **autonomous for well-defined analyses** (clear question, structured data) and **HALTS for exploratory analyses** (no clear question, dirty data) — those need a human-composed plan.

The skill uses the `code_exec` tool for all statistical computation — the data + code run in a sandboxed subprocess with no network access (F1-fixed). The skill uses the `filesystem` MCP to read the source data and write the report.

## Prerequisites

- A data source (`args.source` is a file path or a URL)
- A question (`args.question` is what the user wants to know; e.g. "what's the conversion rate by channel?")
- The data is accessible (the filesystem MCP can read it; or the user has provided a public URL)
- The user has the right to analyze the data (no PII violations; the skill halts if PII is detected)

## Steps

### Step 1: Inspect the data

The skill reads the data source and inspects its structure:

```
filesystem.read_file({ path: "<args.source>" })
```

The skill captures: the format (CSV, JSON, Parquet), the column names + types, the row count, the first 5 rows (for sanity check).

If the data is dirty (missing values, inconsistent types, outliers), the skill halts with a clear message: "Data needs cleaning; recommend invoking `data-cleaning` skill first."

### Step 2: Plan the analysis

The LLM composes an analysis plan based on the question:

- **Descriptive stats** — mean, median, mode, std dev, min, max for numeric columns; counts for categorical
- **Distribution** — histogram for numeric, frequency for categorical
- **Relationship** — correlation for numeric pairs, cross-tab for categorical pairs
- **Trend** — time series if there's a date column
- **Comparison** — group-by + aggregate if there's a categorical column
- **Outliers** — z-score or IQR for numeric columns

The plan is 3-7 analyses; the user reviews and adjusts.

### Step 3: Run the analysis (in the sandbox)

For each analysis, the skill uses the `code_exec` tool:

```typescript
const result = await executeToolCall({
  name: "code_exec",
  args: {
    code: `
      const fs = require('fs');
      const data = fs.readFileSync('<source-path>', 'utf8');
      // ... parse + analyze
      console.log(JSON.stringify(result, null, 2));
    `,
    language: "node",
  },
});
```

The skill uses Node.js + a minimal stats library (e.g. `simple-statistics` or hand-rolled mean/median/stddev). The code is **deterministic** (no randomness) so the results are reproducible.

For visualizations, the skill generates **text-based charts** (ASCII histograms, sparklines) or **HTML/SVG charts** (saved to a file, linked from the report). The text-based approach is preferred for the report (no external dependencies; the report is a single markdown file).

### Step 4: Synthesize the findings

The LLM composes a structured report:

```markdown
# Data Analysis: <Question>

**Source:** <args.source>
**Date:** <date>
**Rows analyzed:** <N>
**Methodology:** <the analyses from Step 2>

## Executive Summary
<1 paragraph: the answer in 3-5 sentences>

## Descriptive Statistics
<table of mean, median, std dev, min, max for each numeric column>

## Distributions
<histograms (text-based) for key columns>

## Relationships
<correlations, cross-tabs, or scatter plots>

## Trends
<time series if applicable; sparklines + commentary>

## Outliers
<list of outliers with their z-score / IQR>

## Key Findings
<numbered list, each with a confidence level>

## Recommendations
<numbered list: what the user should do>

## Methodology Notes
<any caveats: missing data, data quality, sample size, etc.>

## Reproducibility
<the exact code that ran the analysis; how to re-run it>
```

The report is 2-3 pages (~1000 words). If it's longer, the LLM is being verbose; the skill retries with a stricter prompt.

### Step 5: Save the report

The skill saves the report to `docs/analysis/<question-slug>-<date>.md` for git-tracked archival. The doc is committed in the same commit as the analysis runs.

### Step 6: Save the visualizations (if any)

For text-based charts, they're inline in the markdown. For HTML/SVG charts, the skill saves them to `docs/analysis/figures/<question-slug>-<date>/<chart-name>.svg` and links them from the report.

### Step 7: Optionally save the cleaned data

If the skill cleaned the data (e.g. dropped rows with missing values, normalized columns), the cleaned version is saved to `data/cleaned/<source-slug>-<date>.csv` (or the appropriate format).

### Step 8: Notify the user

Send the user a chat message:

```
[DATA ANALYSIS] <Question>
- Report: docs/analysis/<slug>.md
- Source: <args.source>
- Rows: <N>
- Key findings: <top 3 bullets>
- Recommendations: <top 3 bullets>
- Duration: <ms>
```

## Output

The skill returns a structured result:

```json
{
  "type": "skill:result",
  "output": {
    "question": "...",
    "source": "...",
    "report_path": "...",
    "row_count": 1234,
    "key_findings": [...],
    "recommendations": [...],
    "cleaned_data_path": "..." | null,
    "duration_ms": 12345
  }
}
```

The dashboard renders the report card; the chat shows the summary.

## Error Handling

- **Data is dirty (missing values, inconsistent types)** — halt; the user invokes `data-cleaning` first
- **Data is too large (>100MB)** — the skill refuses; the user pre-aggregates the data
- **The data contains PII (SSN, credit card, email)** — halt; the user anonymizes the data first
- **The question is too broad ("tell me about the data")** — halt; the user provides a specific question
- **The code_exec tool times out (60s)** — the skill breaks the analysis into smaller pieces
- **The visualizations are too complex** — the skill falls back to text-based charts
- **The sandbox runs out of memory** — the skill samples the data (e.g. 10% sample) and notes the sampling

## Quality Checks

Before declaring the analysis complete:

- [ ] Data inspected (format, columns, row count, sanity check)
- [ ] Analysis plan reviewed by the user
- [ ] All analyses run in the sandbox (no network, no data leak)
- [ ] Statistics verified (e.g. mean matches `simple-statistics`)
- [ ] Report is 2-3 pages (~1000 words)
- [ ] Report has all 9 sections (Exec Summary, Descriptive Stats, Distributions, Relationships, Trends, Outliers, Findings, Recommendations, Methodology Notes)
- [ ] Reproducibility section includes the exact code
- [ ] Local doc saved
- [ ] User notified

An analysis that doesn't pass all 9 is a degraded analysis. The skill returns `skill:result` with `degraded: true` and a `note` field; the user reviews the report before acting on the recommendations.
