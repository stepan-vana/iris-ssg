{[date]Last updated June 13, 2026}
# Developer Guide
{[author]{pp::stepan-vana}Štěpán Váňa}
{[read_time]14 min read}
{[copy_raw_file]Copy Markdown}
{[view_as_md]View as Markdown}

This guide is the authoritative reference for extending, customizing, and maintaining a documentation site built with Iris SSG. It describes the actual runtime behavior of the application as implemented in `assets/script.js`, `assets/styles.css`, and `index.html`.

## Project Structure

```txt
iris-ssg/
├── assets/
│   ├── icons/              # Local SVG icons: copy.svg, check.svg, list.svg
│   ├── logo/               # Branding: iris_ssg.svg, github.svg
│   ├── docs.json           # Allowlist of permitted Markdown paths
│   ├── script.js           # Full application runtime
│   ├── search-index.json   # Pre-generated full-text search index
│   └── styles.css          # All styles and CSS custom properties
├── docs/                   # Markdown content files
└── index.html              # Application shell and sidebar navigation
```

The `docs/` directory contains all content. Each `.md` file is one page. The application does not use a build step — everything runs in the browser at runtime.

## Initialization

On load, `initApp()` runs the following sequence:

1. Fetches `assets/docs.json` and populates the `ALLOWED_DOCS` array.
2. Calls `initSearchIndex()`, which loads `assets/search-index.json` into the global `searchIndex` array.
3. Calls `loadMD("docs/home.md")` to render the default page.

To change the default page, update the path passed to `loadMD` at the bottom of `initApp()` in `script.js`.

## Adding Pages

### 1. Create the Markdown file

Add a `.md` file to the `docs/` directory.

### 2. Register the path in `docs.json`

```json
[
    "docs/contributing.md",
    "docs/developer_guide.md",
    "docs/getting_started.md",
    "docs/home.md",
    "docs/licence.md",
    "docs/your_new_page.md"
]
```

{[warning] If a new page is not registered in `docs.json`, `loadMD` will refuse to load it — it returns `false` and logs an error to the console. This is the most common cause of a "page won't load" report.}

This is the security allowlist. Any path not present in `ALLOWED_DOCS` is blocked from loading — `loadMD` returns `false` immediately and logs a console error.

### 3. Add a sidebar link in `index.html`

```html
<a href="#" data-md="docs/your_new_page.md">Your Page</a>
```

Any element with a `data-md` attribute anywhere in the document will trigger `loadMD` on click. The sidebar closes automatically on mobile after navigation.

### 4. Update `search-index.json`

Add an entry so the page is discoverable via search:

```json
{
  "path": "docs/your_new_page.md",
  "anchor": "",
  "title": "Your Page Title",
  "subtitle": "",
  "content": "Full plain-text content for search matching..."
}
```

{[note] The index is loaded only once at startup and is not refreshed during the session. If you're testing search for a new page, make sure to hard-refresh the page first.}

## Markdown & Meta Syntax

Iris SSG parses standard Markdown via [marked](https://marked.js.org/). On top of that, `parseMetaSyntax()` processes a set of custom inline tags before the HTML is injected into the DOM.

**Important:** Meta tags are processed _after_ `<pre>` blocks are temporarily extracted and replaced with placeholders. This prevents the parser from interpreting syntax examples inside code blocks as real meta directives.

### Date

```txt
{[date]June 11, 2026}
```

Renders as:

```html
<div class="meta-date">June 11, 2026</div>
```

### Author

```txt
{[author]{pp::github-username}Display Name}
```

The `{pp::username}` prefix causes a GitHub avatar to be fetched from `https://github.com/<username>.png`. If the username is `none` or the image fails to load, the component falls back to initials rendered inside a coloured circle.

Multiple authors are supported by chaining pairs:

```txt
{[author]{pp::username-one}First Author{pp::username-two}Second Author}
```

Authors without a GitHub username can be specified by name alone:

```txt
{[author]Jane Doe}
```

All author entries resolve to a `.meta-author` element containing an `.avatars` container and a `<span>` with comma-separated display names.

### Read Time

```txt
{[read_time]10 min read}
```

Renders as:

```html
<div class="meta-read-time">
    <i class="ti ti-clock" aria-hidden="true"></i>
    10 min read
</div>
```

### Copy Markdown

```txt
{[copy_raw_file]Copy Markdown}
```

Renders a button that copies the raw source of the current `.md` file to the clipboard via `navigator.clipboard.writeText()`. On success, the button label switches to `Copied!` for 1.5 seconds, then reverts.

The raw file content is captured from the `fetch()` response inside `loadMD()` and closed over by the click handler — the button always copies the original Markdown, not the rendered HTML.

### View as Markdown

```txt
{[view_as_md]View as Markdown}
```

Renders a button that opens the raw Markdown in a new browser tab. The file is served as an object URL from a `Blob` with `type: 'text/plain;charset=utf-8'`. The URL is revoked after 10 seconds to free memory.

### Meta Actions Row

After the DOM is populated, `loadMD()` collects all `.meta-read-time` and `.meta-action-btn` elements and moves them into a shared wrapper:

```html
<div class="meta-actions-row">...</div>
```

This wrapper is inserted in place of the first meta element found, ensuring consistent positioning regardless of the order the tags appear in the Markdown source.

### Callout Boxes

Four block-level meta tags render styled callout boxes for highlighting information within page content:

```txt
{[note] This is useful information.}
{[tip] Use Ctrl+K for quick search.}
{[warning] Watch out for this breaking change here.}
{[danger] This will irreversibly delete data.}
```

Each renders as a `<div>` with a class corresponding to its type (`meta-note`, `meta-tip`, `meta-warning`, `meta-danger`), an icon, and the provided text as its content. Use these to draw attention to important caveats, shortcuts, breaking changes, or destructive operations directly within a page's content — not just in this guide.

## Table of Contents

`buildTOC()` queries all `h2` elements inside `#content` after each page load. For each heading:

- An `id` is assigned using `slugify()` (lowercase, spaces to hyphens, non-word characters removed).
- A corresponding `<a>` element is appended to `#toc`.
- The first entry receives the `active` class and sets the initial scroll indicator position.

If no `h2` headings are found, `.sidebar-left` is hidden.

Scroll synchronization is handled by `setupScrollObserver()`, which uses an `IntersectionObserver` with a root margin of `-10% 0px -80% 0px`. As headings enter the upper portion of the viewport, the active TOC link and indicator update accordingly.

To include `h3` headings in the TOC, extend the `querySelectorAll("h2")` selector in `buildTOC()` and add the appropriate class to the created anchor elements.

## Code Blocks

`enhanceCodeBlocks()` processes every `<pre>` element in the content container. Each block is reconstructed as:

```html
<pre>
  <div class="code-header">
    <div>language</div>
    <button class="copy-btn"><img src="assets/icons/copy.svg" /></button>
  </div>
  <code class="code-body"><!-- highlighted source --></code>
</pre>
```

The language is read from the `language-*` class set by `marked`. If the identifier is recognized by highlight.js, `hljs.highlight()` is used; otherwise `hljs.highlightAuto()` is used as a fallback. Blocks are only processed once — a `data-done="1"` attribute is set to prevent reprocessing.

The copy button captures `code.textContent` at enhancement time and writes it to the clipboard. After a successful copy, the icon switches from `copy.svg` to `check.svg` for 1.5 seconds.

## Syntax Highlighting Themes

The active highlight.js theme is controlled by `updateCodeTheme()`, which runs immediately on script load and again on each `change` event from `window.matchMedia('(prefers-color-scheme: dark)')`:

| Mode | Theme |
|------|-------|
| Light | `github.min.css` |
| Dark | `github-dark.min.css` |

Both stylesheets are loaded from the Cloudflare CDN. The active stylesheet is swapped by updating the `href` of the `<link id="hljs-light-theme">` element.

## LaTeX Rendering

If KaTeX's `renderMathInElement` function is available at the time `loadMD()` runs, it is called on the content container after the HTML is injected. The supported delimiters are:

| Delimiter | Mode |
|-----------|------|
| `$$...$$` | Display |
| `$...$` | Inline |
| `\[...\]` | Display |
| `\(...\)` | Inline |

`throwOnError` is set to `false`, so malformed expressions render as plain text rather than throwing.

## Tables

After page content is rendered, all `<table>` elements that are not already wrapped are enclosed in a `<div class="table-wrapper">`. This enables horizontal scrolling on narrow viewports without affecting the layout of the surrounding content.

## HTML Sanitization

All rendered HTML passes through `sanitizeHTML()` before being inserted into the DOM. The function uses a `DOMParser` to parse the HTML string and then enforces two allowlists:

**Allowed tags:** `h1`–`h6`, `p`, `a`, `ul`, `ol`, `li`, `pre`, `code`, `blockquote`, `strong`, `em`, `b`, `s`, `del`, `div`, `span`, `img`, `table`, `thead`, `tbody`, `tr`, `th`, `td`, `hr`, `br`, `button`, `i`

**Allowed attributes:** `id`, `class`, `href`, `src`, `alt`, `title`, `data-md`, `data-action`, `target`, `style`

Any element or attribute not in these allowlists is removed. Additionally, `href` and `src` values that begin with `javascript:` are stripped regardless of casing or leading whitespace.

{[danger] Do not weaken or bypass `sanitizeHTML()` to "make custom HTML work" in content files — doing so reintroduces an XSS vector and can irreversibly compromise any deployment that loads untrusted Markdown.}

## Search

### Index

`assets/search-index.json` is a flat array of entry objects. Each entry represents one searchable unit — typically one page, but the structure supports subsections via the `anchor` field:

```json
{
  "path": "docs/page.md",
  "anchor": "optional-heading-id",
  "title": "Page Title",
  "subtitle": "Optional Subsection",
  "content": "Full plain-text content for matching..."
}
```

The index is loaded once into the global `searchIndex` array on startup and is not refreshed during the session.

### Query Behavior

Search is triggered on every `input` event. Queries shorter than two characters are ignored. The query is lowercased and trimmed before matching.

Matching performs a case-insensitive substring scan across `title`, `subtitle`, and `content`. No tokenization, stemming, ranking, or fuzzy matching is applied. Results appear in index order.

### Result Rendering

For each match, a contextual snippet is extracted:

```js
const start = Math.max(0, idx - 30);
const end   = Math.min(doc.content.length, idx + 60);
```

This yields a ~90-character window centered on the first occurrence of the query term. If the query is found only in the title, the first 70 characters of `content` are used as the snippet.

Query terms are highlighted in both titles and snippets using `<mark>` elements. Before the highlight regex is constructed, the query is escaped with `escapeRegExp()` to prevent regex injection.

### Navigation

Clicking a result calls `loadMD(doc.path)`. If the entry has an `anchor`, the application waits 120 ms for the DOM to settle, then scrolls to the matching element and updates the active TOC link.

### Keyboard Shortcut

Press `Ctrl+K` (or `Cmd+K` on macOS) to focus the search input from anywhere on the page.

## Theming

All design tokens are defined as CSS custom properties in `assets/styles.css`. Dark mode overrides are scoped inside `@media (prefers-color-scheme: dark)`.

| Variable | Light | Dark | Purpose |
|---|---|---|---|
| `--bg` | `#ffffff` | `#000000` | Page and sidebar background |
| `--text` | `#111111` | `#ffffff` | Primary text |
| `--text-muted` | `#333333` | `#ffffff` | Secondary text |
| `--text-light` | `#999999` | `#777777` | Placeholders, inactive TOC links |
| `--border` | `#f0f0f0` | `#1f1f23` | Dividers and table borders |
| `--code-bg` | `#f5f5f5` | `#1b1b1b` | Code block background |
| `--btn-inverted-bg` | `#111111` | `#ffffff` | Primary button fill |
| `--btn-inverted-text` | `#ffffff` | `#000000` | Primary button label |
| `--icon-filter` | `brightness(0)` | `brightness(0) invert(1)` | CSS filter for SVG icons |

Update these variables at the top of `styles.css` to retheme the entire site. No JavaScript changes are required.

## Fonts

Two typefaces are loaded from Google Fonts and must be present in the `<head>` of `index.html`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@100..900&display=swap" rel="stylesheet" />
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet" />
```

**Geist** is used for all body text and UI elements. **JetBrains Mono** is used for code blocks and code header labels.

## Icons

UI icons are sourced from [Tabler Icons](https://tabler-icons.io/) via the webfont CDN. Any `ti-*` class can be used directly in `index.html` or inside Markdown content.

Local SVG icons for the copy button and hamburger menu live in `assets/icons/`. They are referenced by filename in `script.js` — replacing a file with one of the same name requires no code changes.

## Replacing Branding

The navbar logo is `assets/logo/iris_ssg.svg`. Replace it with your own SVG to update the branding site-wide.

In dark mode, the logo receives a `brightness(0) invert(1)` filter automatically. If your logo uses multiple colors, disable this behavior in `styles.css`:

```css
@media (prefers-color-scheme: dark) {
    .nav-logo img { filter: none; }
}
```

The "View on GitHub" button appears in both the navbar and the sidebar. Update the URL in the `onclick` handler in `index.html` to point to your repository, or remove the button entirely if it is not required.

## Mobile Navigation

On viewports up to 768 px wide, the sidebar is hidden by default and toggled by the hamburger button (`#hamburgerBtn`). Clicking the button adds the `open` class to `#sidebar` and the `sidebar-open` class to `<body>`. Both classes are removed automatically when a page link is followed.

Sidebar flyout menus (`.sidebar-flyout`) are hover-activated on desktop. On mobile they are toggled on click, provided the triggering link contains a `.sidebar-chevron` element.