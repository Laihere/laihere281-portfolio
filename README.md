# Portfolio

Data analytics portfolio and CV site, built with [Eleventy](https://www.11ty.dev/) and deployed to GitHub Pages.

```bash
npm install
npm start          # local preview at http://localhost:8080 (drafts included)
npm run build      # production build into _site/ (drafts excluded)
```

## Adding a project

1. Copy `src/projects/example-case-study/` to `src/projects/<your-slug>/`. The folder name becomes the URL (`/projects/<your-slug>/`).
2. Edit the front matter in `index.md`: `title`, `summary`, `date`, `question`, `sources`, `tools`, `links`.
3. Write **Method**, **Key findings** and **Limitations** in the Markdown body.
4. Put chart data as CSV files in the same folder and add charts with the `chart` shortcode (below), or drop in images exported from a notebook (`![alt](chart.svg)`).
5. Remove `draft: true` when it's ready to publish. Projects are listed newest first by `date`.

### Chart shortcode

```njk
{% chart "data.csv", {
  type: "line",
  x: "Year",
  y: ["Brunei-Muara", "Tutong"],
  title: "Write the finding as the title",
  subtitle: "Units, base year",
  source: "DEPS, Table X"
} %}
```

| Option | Meaning |
|---|---|
| `type` | `"line"` (default) or `"bar"` (horizontal, uses the first value column) |
| `x` | label column (default: first column) |
| `y` | value column(s) (default: all other columns) |
| `title`, `subtitle`, `source` | text shown around the chart |
| `prefix`, `suffix` | units, e.g. `prefix: "B$"`, `suffix: "%"` |
| `zero` | line charts: `false` lets the y-axis start above 0 (e.g. for index values) |
| `sort` | bar charts: `"asc"` or `"desc"` |

Each chart gets a hover tooltip and a "View data table" toggle, so the numbers can still be read without JavaScript. Series colours follow a fixed order that is safe for colour-vision deficiency. Keep line charts to **4 series or fewer**; beyond that, split them into separate charts.

## Editing the rest of the site

- **Name, intro, email, LinkedIn/GitHub URLs, support link:** `src/_data/site.json`. Empty URLs are hidden.
- **Experience, education, skills, tools:** `src/_data/cv.json`
- **Professional, academic and personal project cards:** `src/_data/work.json`. Each card takes `title`, `summary`, `tags`, and optionally `draft` (true hides it from the live site, like case studies), `context`, `status` (e.g. "In progress"), `updated` (YYYY-MM-DD, shown as "Last updated"), `credit` and `url` (the card becomes a link only when `url` is set). Full case studies under `src/projects/` appear under Personal projects.
- **CV PDF:** replace `src/assets/cv/Muhd-Lai-Razi-CV.pdf` and set `cv` in `site.json` to `/assets/cv/Muhd-Lai-Razi-CV.pdf`. While `cv` is empty, the download links are hidden.
- **Styles:** `src/assets/css/style.css`

## Deploying

1. Push this folder to a GitHub repository on the `main` branch.
2. In the repo, go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**.
3. Each push to `main` rebuilds the site. The base path is detected automatically: `<user>.github.io` repos serve from `/`, any other repo name from `/<repo>/`.
