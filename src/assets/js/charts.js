// Draws the charts embedded by the {% chart %} shortcode. No dependencies.
// Supports "line" (one or more series over x) and "bar" (horizontal, one series).
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const el = (tag, attrs = {}, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };
  const color = (i) => `var(--series-${(i % 8) + 1})`;

  // Round a range to "nice" tick steps (1, 2, 2.5, 5 × 10^n).
  function ticks(min, max, count = 5) {
    const span = max - min || Math.abs(max) || 1;
    const raw = span / count;
    const mag = 10 ** Math.floor(Math.log10(raw));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw);
    const lo = Math.floor(min / step) * step;
    const hi = Math.ceil(max / step) * step;
    const out = [];
    for (let v = lo; v <= hi + step / 2; v += step) out.push(+v.toFixed(10));
    return out;
  }

  const compact = new Intl.NumberFormat("en-GB", { notation: "compact", maximumFractionDigits: 1 });
  const full = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 });

  let measureCtx;
  function textWidth(s) {
    measureCtx ??= document.createElement("canvas").getContext("2d");
    measureCtx.font = `12px ${getComputedStyle(document.body).fontFamily}`;
    return measureCtx.measureText(s).width;
  }

  function tooltip(canvas) {
    const tip = document.createElement("div");
    tip.className = "tooltip";
    tip.hidden = true;
    canvas.appendChild(tip);
    return {
      show(html, x, y) {
        tip.innerHTML = html;
        tip.hidden = false;
        const w = tip.offsetWidth, cw = canvas.clientWidth;
        const left = x + 12 + w > cw ? x - 12 - w : x + 12;
        tip.style.left = `${Math.max(0, left)}px`;
        tip.style.top = `${Math.max(0, y - tip.offsetHeight / 2)}px`;
      },
      hide() { tip.hidden = true; },
    };
  }

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  function legend(figure, canvas, series, kind) {
    if (series.length < 2 || figure.querySelector(".legend")) return;
    const ul = document.createElement("ul");
    ul.className = "legend";
    ul.innerHTML = series
      .map((s, i) => `<li><span class="key ${kind}" style="background:${color(i)}"></span>${esc(s)}</li>`)
      .join("");
    figure.insertBefore(ul, canvas);
  }

  function lineChart(figure, canvas, c) {
    const fmt = (v) => (v == null ? "–" : c.prefix + full.format(v) + c.suffix);
    const W = canvas.clientWidth;
    const H = W < 480 ? 220 : 280;
    const values = c.rows.flatMap((r) => r.slice(1)).filter((v) => v != null);
    let lo = Math.min(...values), hi = Math.max(...values);
    if (c.zero) lo = Math.min(0, lo), hi = Math.max(0, hi);
    const yt = ticks(lo, hi);
    const yLabels = yt.map((v) => c.prefix + compact.format(v) + c.suffix);
    const directLabels = c.series.length <= 4 && W >= 480;
    const m = {
      top: 8,
      right: directLabels ? Math.max(...c.series.map(textWidth)) + 16 : 12,
      bottom: 26,
      left: Math.max(...yLabels.map(textWidth)) + 10,
    };
    const iw = W - m.left - m.right, ih = H - m.top - m.bottom;

    const xs = c.rows.map((r) => r[0]);
    const numericX = xs.every((v) => v !== "" && !isNaN(v));
    const xMin = numericX ? Math.min(...xs) : 0, xMax = numericX ? Math.max(...xs) : xs.length - 1;
    const X = (i) => m.left + (((numericX ? +xs[i] : i) - xMin) / (xMax - xMin || 1)) * iw;
    const Y = (v) => m.top + ih - ((v - yt[0]) / (yt.at(-1) - yt[0])) * ih;

    legend(figure, canvas, c.series, "");
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": figure.getAttribute("aria-label") || "" });

    yt.forEach((v, i) => {
      el("line", { x1: m.left, x2: W - m.right, y1: Y(v), y2: Y(v), stroke: v === 0 ? "var(--axis)" : "var(--grid)", "stroke-width": 1, "shape-rendering": "crispEdges" }, svg);
      el("text", { x: m.left - 8, y: Y(v), "text-anchor": "end", "dominant-baseline": "middle" }, svg).textContent = yLabels[i];
    });
    const every = Math.ceil(xs.length / Math.max(2, Math.floor(iw / 64)));
    const last = xs.length - 1;
    xs.forEach((x, i) => {
      if (i % every && i !== last) return;
      if (i !== last && X(last) - X(i) < 48) return; // keep the final label clear of its neighbour
      el("text", { x: X(i), y: H - 6, "text-anchor": "middle" }, svg).textContent = x;
    });

    const ends = [];
    c.series.forEach((name, s) => {
      let d = "", pen = false;
      c.rows.forEach((r, i) => {
        const v = r[s + 1];
        if (v == null) { pen = false; return; }
        d += `${pen ? "L" : "M"}${X(i)},${Y(v)}`;
        pen = true;
      });
      el("path", { d, fill: "none", stroke: color(s), "stroke-width": 2, "stroke-linejoin": "round", "stroke-linecap": "round" }, svg);
      const lastRow = c.rows.findLastIndex((r) => r[s + 1] != null);
      if (lastRow < 0) return;
      el("circle", { cx: X(lastRow), cy: Y(c.rows[lastRow][s + 1]), r: 4, fill: color(s), stroke: "var(--surface)", "stroke-width": 2 }, svg);
      ends.push({ name, x: X(lastRow), y: Y(c.rows[lastRow][s + 1]) });
    });

    // Direct end labels only when they don't collide; otherwise the legend carries identity.
    const sorted = [...ends].sort((a, b) => a.y - b.y);
    if (directLabels && sorted.every((e, i) => i === 0 || e.y - sorted[i - 1].y >= 14)) {
      ends.forEach((e) => {
        el("text", { x: e.x + 9, y: e.y, "dominant-baseline": "middle", class: "label" }, svg).textContent = e.name;
      });
    }

    // Hover: crosshair + tooltip with every series at the nearest x.
    const hover = el("g", { visibility: "hidden" }, svg);
    const cross = el("line", { y1: m.top, y2: m.top + ih, stroke: "var(--axis)", "stroke-width": 1 }, hover);
    const dots = c.series.map((_, s) => el("circle", { r: 4, fill: color(s), stroke: "var(--surface)", "stroke-width": 2 }, hover));
    const hit = el("rect", { x: m.left, y: 0, width: iw, height: H, fill: "transparent" }, svg);
    const tip = tooltip(canvas);
    const move = (ev) => {
      const r = svg.getBoundingClientRect();
      const px = ((ev.clientX - r.left) / r.width) * W;
      let i = 0;
      xs.forEach((_, j) => { if (Math.abs(X(j) - px) < Math.abs(X(i) - px)) i = j; });
      hover.setAttribute("visibility", "visible");
      cross.setAttribute("x1", X(i)); cross.setAttribute("x2", X(i));
      let topY = H;
      dots.forEach((d, s) => {
        const v = c.rows[i][s + 1];
        d.setAttribute("visibility", v == null ? "hidden" : "visible");
        if (v != null) { d.setAttribute("cx", X(i)); d.setAttribute("cy", Y(v)); topY = Math.min(topY, Y(v)); }
      });
      const html = `<strong>${esc(xs[i])}</strong>` + c.series
        .map((name, s) => `<div><span class="key" style="background:${color(s)}"></span>${esc(name)}<span class="v">${fmt(c.rows[i][s + 1])}</span></div>`)
        .join("");
      tip.show(html, (X(i) / W) * r.width, (topY / H) * r.height);
    };
    hit.addEventListener("pointermove", move);
    hit.addEventListener("pointerdown", move);
    hit.addEventListener("pointerleave", () => { hover.setAttribute("visibility", "hidden"); tip.hide(); });
    return svg;
  }

  function barChart(figure, canvas, c) {
    const fmt = (v) => (v == null ? "–" : c.prefix + full.format(v) + c.suffix);
    let rows = c.rows.map((r) => [r[0], r[1]]);
    if (c.sort === "desc") rows.sort((a, b) => (b[1] ?? -Infinity) - (a[1] ?? -Infinity));
    if (c.sort === "asc") rows.sort((a, b) => (a[1] ?? Infinity) - (b[1] ?? Infinity));
    const W = canvas.clientWidth, band = 34, thick = 20, rad = 4;
    const valueLabels = rows.map((r) => fmt(r[1]));
    const m = {
      top: 4, bottom: 4,
      left: Math.min(W * 0.4, Math.max(...rows.map((r) => textWidth(r[0])))) + 12,
      right: Math.max(...valueLabels.map(textWidth)) + 10,
    };
    const H = m.top + m.bottom + rows.length * band;
    const vals = rows.map((r) => r[1] ?? 0);
    const lo = Math.min(0, ...vals), hi = Math.max(0, ...vals);
    const iw = W - m.left - m.right;
    const Xv = (v) => m.left + ((v - lo) / (hi - lo || 1)) * iw;

    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": figure.getAttribute("aria-label") || "" });
    const tip = tooltip(canvas);
    rows.forEach(([label, v], i) => {
      const y = m.top + i * band + (band - thick) / 2;
      el("text", { x: m.left - 12, y: y + thick / 2, "text-anchor": "end", "dominant-baseline": "middle", class: "label" }, svg).textContent = label;
      const g = el("g", {}, svg);
      if (v != null) {
        const x0 = Xv(0), x1 = Xv(v), w = Math.abs(x1 - x0), r = Math.min(rad, w, thick / 2);
        // Rounded at the data end, square at the baseline.
        const d = v >= 0
          ? `M${x0},${y}H${x1 - r}A${r},${r} 0 0 1 ${x1},${y + r}V${y + thick - r}A${r},${r} 0 0 1 ${x1 - r},${y + thick}H${x0}Z`
          : `M${x0},${y}H${x1 + r}A${r},${r} 0 0 0 ${x1},${y + r}V${y + thick - r}A${r},${r} 0 0 0 ${x1 + r},${y + thick}H${x0}Z`;
        el("path", { d, fill: color(0) }, g);
        el("text", { x: v >= 0 ? x1 + 6 : x1 - 6, y: y + thick / 2, "text-anchor": v >= 0 ? "start" : "end", "dominant-baseline": "middle", class: "label" }, g).textContent = valueLabels[i];
      }
      const hit = el("rect", { x: 0, y: m.top + i * band, width: W, height: band, fill: "transparent" }, g);
      const show = () => {
        const r = svg.getBoundingClientRect();
        g.setAttribute("opacity", "0.8");
        tip.show(`<strong>${esc(label)}</strong><div>${esc(c.series[0])}<span class="v">${valueLabels[i]}</span></div>`,
          (Xv(v ?? 0) / W) * r.width, ((y + thick / 2) / H) * r.height);
      };
      hit.addEventListener("pointerenter", show);
      hit.addEventListener("pointerdown", show);
      hit.addEventListener("pointerleave", () => { g.removeAttribute("opacity"); tip.hide(); });
    });
    el("line", { x1: Xv(0), x2: Xv(0), y1: 0, y2: H, stroke: "var(--axis)", "stroke-width": 1, "shape-rendering": "crispEdges" }, svg);
    return svg;
  }

  function render(figure) {
    const canvas = figure.querySelector(".chart-canvas");
    const config = JSON.parse(figure.querySelector('script[type="application/json"]').textContent);
    if (!canvas.clientWidth || !config.rows.length) return;
    canvas.replaceChildren();
    const draw = config.type === "bar" ? barChart : lineChart;
    canvas.prepend(draw(figure, canvas, config));
  }

  function init() {
    const figures = document.querySelectorAll("figure.chart");
    const widths = new WeakMap();
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const w = Math.round(e.contentRect.width);
        if (widths.get(e.target) === w) continue;
        widths.set(e.target, w);
        render(e.target.closest("figure.chart"));
      }
    });
    figures.forEach((f) => {
      const canvas = f.querySelector(".chart-canvas");
      widths.set(canvas, Math.round(canvas.getBoundingClientRect().width));
      render(f);
      ro.observe(canvas);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
