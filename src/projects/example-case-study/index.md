---
# ── Copy this folder to start a new case study (see README.md). ──
draft: true                     # remove when ready to publish
title: Example case study (template)
summary: One or two sentences on what you looked at and the headline result. This shows on the homepage card.
date: 2026-10-14                # sets ordering on the homepage (newest first)
question: How has <indicator> in Brunei changed since 2015, and which categories drove the change?
sources:
  - publisher: Department of Economic Planning and Statistics (DEPS)
    dataset: Name of the table or publication
    year: 2026
    url: https://deps.mofe.gov.bn/
    accessed: 2026-10-14
    note: "Optional: licence terms or how the data was transformed."
tools: [Python, pandas, Matplotlib]
links:
  - label: Notebook
    url: https://github.com/your-username/your-repo/blob/main/analysis.ipynb
  - label: Code
    url: https://github.com/your-username/your-repo
---

> **Template:** every number on this page is illustrative placeholder data, not real DEPS figures.

## Method

Describe the pipeline in a few short steps: where the data came from, how it was cleaned (units, missing years, reclassifications), and the analysis itself. Mention any judgement calls a reader should know about.

1. Downloaded the table from the DEPS website.
2. Reshaped from wide to long; harmonised category names across years.
3. Calculated year-on-year change and each category's share of the total.

## Key findings

**State the finding as a sentence: the chart is the evidence.** Series A grew steadily while Series B was flat until 2020.

{% chart "trend.csv", {
  type: "line",
  x: "Year",
  y: ["Series A", "Series B"],
  zero: false,
  title: "Series A pulled away from Series B after 2020",
  subtitle: "Index, 2015 = 100 (illustrative)",
  source: "DEPS, illustrative placeholder data"
} %}

**Second finding.** Category C accounts for the largest share.

{% chart "breakdown.csv", {
  type: "bar",
  sort: "desc",
  title: "Category C is the largest contributor",
  subtitle: "Share of total, % (illustrative)",
  suffix: "%",
  source: "DEPS, illustrative placeholder data"
} %}

A chart exported from a notebook works too. Put the image in this folder and reference it:
`![Alt text describing the chart](my-chart.svg)`

## Limitations & next steps

What the data can't tell you, and what you'd look at next.
