{[date]Last updated June 11, 2026}
# Getting Started
{[author]{pp::stepan-vana}Štěpán Váňa}
{[read_time]7 min read}
{[copy_raw_file]Copy Markdown}
{[view_as_md]View as Markdown}

Iris SSG is a lightweight static site generator built for documentation. This page walks you through cloning the repository and getting your first documentation site running locally.

## Prerequisites

No build tools or package managers are required. Iris SSG runs entirely in the browser — all you need is a static file server to avoid CORS issues when loading Markdown files via `fetch`.

A simple option is the [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension for VS Code, or Python's built-in HTTP server:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080` in your browser.

## Installation

Clone the official repository and navigate into the project directory:

```bash
git clone https://github.com/stepan-vana/iris-ssg.git
cd iris-ssg
```

That's it. No `npm install`, no build step, no configuration files to touch.

## Directory Structure

```txt
iris-ssg/
├── assets/
│   ├── icons/              # Local SVG icons (copy, check, list)
│   ├── logo/               # Branding assets (iris_ssg.svg, github.svg)
│   ├── docs.json           # Allowlist of permitted Markdown paths
│   ├── script.js           # Application runtime
│   ├── search-index.json   # Full-text search index
│   └── styles.css          # Styles and CSS custom properties
├── docs/                   # Your Markdown content files
└── index.html              # Application shell and sidebar navigation
```

Your documentation files go into `docs/` as standard Markdown files. The `assets/` directory contains the runtime, styles, and icons — all freely modifiable.

## Your First Page

Create a new Markdown file in `docs/`:

```bash
touch docs/my_page.md
```

Add a title and some content:

```md
# My Page

Hello, world!
```

Register the page in `index.html` by adding a sidebar link:

```html
<a href="#" data-md="docs/my_page.md">My Page</a>
```

Add the path to `assets/docs.json` so the page is permitted to load and included in search:

```json
[
    "docs/home.md",
    "docs/my_page.md"
]
```

Open `index.html` via your local server and click the link in the sidebar — your page loads instantly, no rebuild required.

## Page Metadata

Iris SSG supports optional metadata tags at the top of any Markdown file. They render a date label, author block, read time, and action buttons above the page title:

```txt
{[date]June 11, 2026}
# Page Title
{[author]{pp::github-username}Your Name}
{[read_time]5 min read}
{[copy_raw_file]Copy Markdown}
{[view_as_md]View as Markdown}
```

The author tag fetches a GitHub avatar from `github.com/<username>.png` automatically. For the full meta syntax reference, see the Developer Guide.

## Next Steps

With your site running locally, a few common next steps:

- Replace `assets/logo/iris_ssg.svg` with your own logo
- Update the GitHub link in `index.html` to point to your repository
- Adjust the color scheme by editing the CSS variables at the top of `assets/styles.css`
- Add entries to `assets/search-index.json` to make new pages fully searchable

For a complete reference of all available options, refer to the Developer Guide.