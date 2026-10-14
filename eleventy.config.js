import { readFileSync } from "node:fs";
import path from "node:path";
import { HtmlBasePlugin } from "@11ty/eleventy";

// GitHub Pages serves project sites from /<repo>/; user sites (<name>.github.io) from /.
// GITHUB_REPOSITORY is set automatically inside GitHub Actions.
function pathPrefix() {
  if (process.env.PATH_PREFIX) return process.env.PATH_PREFIX;
  const repo = (process.env.GITHUB_REPOSITORY || "").split("/")[1];
  if (!repo || repo.endsWith(".github.io")) return "/";
  return `/${repo}/`;
}

// Minimal CSV parser: handles quoted fields, escaped quotes and CRLF.
function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((v) => v !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((v) => v !== "")) rows.push(row);
  const [header, ...body] = rows;
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), (r[i] ?? "").trim()])));
}

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export default function (eleventyConfig) {
  eleventyConfig.addPlugin(HtmlBasePlugin);

  // Drafts (draft: true) show in `npm start` but are left out of production builds.
  eleventyConfig.addPreprocessor("drafts", "*", (data) => {
    const isBuild = process.env.ELEVENTY_RUN_MODE === "build";
    if (data.draft && isBuild && !process.env.INCLUDE_DRAFTS) return false;
  });

  eleventyConfig.addGlobalData("year", () => new Date().getFullYear());

  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("src/projects/**/*.{png,jpg,jpeg,webp,svg,gif}");

  eleventyConfig.addCollection("projects", (api) =>
    api.getFilteredByGlob("src/projects/**/*.md").sort((a, b) => b.date - a.date)
  );

  eleventyConfig.addFilter("readableDate", (d, opts = { year: "numeric", month: "long" }) =>
    new Date(d).toLocaleDateString("en-GB", { timeZone: "UTC", ...opts })
  );

  // {% chart "file.csv", { type: "line", x: "Year", y: ["A", "B"], title: "...", ... } %}
  // Reads a CSV next to the project's index.md, renders a data table at build time
  // (works without JS) and embeds the data for assets/js/charts.js to draw.
  eleventyConfig.addShortcode("chart", function (file, opts = {}) {
    const csvPath = path.join(path.dirname(this.page.inputPath), file);
    const rows = parseCsv(readFileSync(csvPath, "utf8"));
    const columns = Object.keys(rows[0] || {});
    const x = opts.x || columns[0];
    const y = [].concat(opts.y || columns.filter((c) => c !== x));
    const config = {
      type: opts.type || "line",
      x,
      series: y,
      rows: rows.map((r) => [r[x], ...y.map((k) => (r[k] === "" ? null : Number(r[k])))]),
      prefix: opts.prefix || "",
      suffix: opts.suffix || "",
      zero: opts.zero !== false,
      sort: opts.sort || null,
    };
    const fmt = (v) => (v == null ? "–" : `${config.prefix}${v.toLocaleString("en-GB")}${config.suffix}`);
    const table = `<table><thead><tr>${[x, ...y].map((h) => `<th scope="col">${escapeHtml(h)}</th>`).join("")}</tr></thead><tbody>${config.rows
      .map(([label, ...vals]) => `<tr><th scope="row">${escapeHtml(label)}</th>${vals.map((v) => `<td>${fmt(v)}</td>`).join("")}</tr>`)
      .join("")}</tbody></table>`;
    const title = opts.title ? `<p class="chart-title">${escapeHtml(opts.title)}</p>` : "";
    const subtitle = opts.subtitle ? `<p class="chart-subtitle">${escapeHtml(opts.subtitle)}</p>` : "";
    const source = opts.source ? `<figcaption>Source: ${escapeHtml(opts.source)}</figcaption>` : "";
    return `<figure class="chart" aria-label="${escapeHtml(opts.title || "Chart")}">${title}${subtitle}<div class="chart-canvas"></div><script type="application/json">${JSON.stringify(config).replace(/</g, "\\u003c")}</script><details class="chart-table"><summary>View data table</summary><div class="table-scroll">${table}</div></details>${source}</figure>`;
  });

  return {
    dir: { input: "src", output: "_site", includes: "_includes", data: "_data" },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    pathPrefix: pathPrefix(),
  };
}
