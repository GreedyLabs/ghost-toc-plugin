# ghost-toc-plugin

A tiny (~3 KB), dependency-free **floating table of contents** you can drop into any
site via CDN — no build step, no theme editing. Built for the GreedyLabs Ghost blog,
but works on any HTML page.

**Live demo & visual configurator:** https://ghost-toc-plugin.greedylabs.kr

- Auto-generates a TOC from the headings in your article
- Floats beside your content and **follows as you scroll**
- Highlights the section you're currently reading
- Hides automatically on narrow screens (configurable)
- Korean/Unicode heading slugs, dark-mode aware
- Configure everything with `data-*` attributes
- **Fully namespaced** under `greedylabs-ghost-toc` (classes + CSS vars) so it never
  clashes with your theme's styles

## Quick start

Add this once. For **Ghost**: Settings → Code injection → **Site Footer**.

```html
<link rel="stylesheet" href="https://ghost-toc-plugin.greedylabs.kr/toc.css">
<script src="https://ghost-toc-plugin.greedylabs.kr/toc.min.js"
        data-content=".gh-content"
        data-headings="h2,h3"
        data-position="right"
        data-title="목차"></script>
```

> Served from our own GitHub Pages domain (built and minified in CI), behind
> Pages' CDN — no third-party dependency. It always serves the latest release.
>
> Prefer a pinned, immutable version? jsDelivr mirrors the repo:
> `https://cdn.jsdelivr.net/gh/GreedyLabs/ghost-toc-plugin@v1.0.5/toc.min.js`
> (`@1` tracks the latest `v1.x.x`).

### Other platforms (Notion, etc.)

Not Ghost-specific. Anywhere you can inject a `<script>` — including Notion-based
hosts that allow custom code (oopy, super.so, …) — point `data-content` at the
article container. For Notion that's `.notion-page-content`, and headings nest
deeper, so include `h4`:

```html
<script src="https://ghost-toc-plugin.greedylabs.kr/toc.min.js"
        data-content=".notion-page-content"
        data-headings="h2,h3,h4"></script>
```

## Options

All set as `data-*` attributes on the `<script>` tag.

| Attribute | Default | Description |
|---|---|---|
| `data-content` | `.gh-content, article, main, .post-content, .entry-content` | CSS selector for the article body |
| `data-headings` | `h2,h3` | Which headings to list (e.g. `h2,h3,h4`) |
| `data-position` | `right` | `right` or `left` |
| `data-title` | `목차` | Title above the list (empty string hides it) |
| `data-accent` | auto | Active-item color. **Defaults to your Ghost theme accent** (`--ghost-accent-color`), then `#1a73e8`. Set only to override. |
| `data-min-width` | `1200` | Hide the TOC below this viewport width (px) |
| `data-min-headings` | `2` | Don't render if fewer headings than this |
| `data-top` | `100` | Distance from top of viewport (px) |
| `data-width` | `240` | Panel width (px) |
| `data-gap` | `28` | Gap between content and panel (px) |

## Styling

Override the CSS variables on `.greedylabs-ghost-toc` (or globally) — no need to fork
the CSS:

```css
.greedylabs-ghost-toc {
    --greedylabs-ghost-toc-accent: #e8590c;          /* active link */
    --greedylabs-ghost-toc-muted:  rgba(0,0,0,.5);   /* inactive text */
    --greedylabs-ghost-toc-border: rgba(0,0,0,.1);   /* the rail */
}
```

**Theme accent is automatic.** On a Ghost site the active color already follows your
publication's accent color (`--ghost-accent-color`) with no setup. Only set
`data-accent` (or `--greedylabs-ghost-toc-accent`) if you want a different color.

## Markup it generates

```html
<aside class="greedylabs-ghost-toc greedylabs-ghost-toc--right">
  <nav class="greedylabs-ghost-toc__inner">
    <p class="greedylabs-ghost-toc__title">목차</p>
    <ul class="greedylabs-ghost-toc__list">
      <li class="greedylabs-ghost-toc__item greedylabs-ghost-toc__item--h2">
        <a class="greedylabs-ghost-toc__link" href="#...">…</a>
      </li>
      …
    </ul>
  </nav>
</aside>
```

The active link gets `greedylabs-ghost-toc__link--active`.

## Notes

- Place the `<script>` without `defer`/`async` (the footer is fine) so it can read
  its own `data-*` options.
- On screens narrower than `data-min-width`, or when there isn't room beside the
  content, the panel hides itself.

## License

MIT © GreedyLabs
