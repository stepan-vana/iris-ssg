function updateCodeTheme() {
    const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const themeLink = document.getElementById('hljs-light-theme');
    if (themeLink) {
        if (isDarkMode) {
            themeLink.href = "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css";
        } else {
            themeLink.href = "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css";
        }
    }
}
updateCodeTheme();
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', updateCodeTheme);

let ALLOWED_DOCS = [];
let searchIndex = [];

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function slugify(text) {
    return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-");
}

function moveIndicator(el) {
    const wrapper = document.querySelector(".toc-wrapper");
    const ind = document.getElementById("tocIndicator");
    if (!wrapper || !ind || !el) return;
    const wRect = wrapper.getBoundingClientRect();
    const eRect = el.getBoundingClientRect();
    ind.style.top = (eRect.top - wRect.top) + "px";
    ind.style.height = eRect.height + "px";
}

function sanitizeHTML(htmlString) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    const allowedTags = [
        'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
        'P', 'A', 'UL', 'OL', 'LI',
        'PRE', 'CODE', 'BLOCKQUOTE',
        'STRONG', 'EM', 'B', 'S', 'DEL',
        'DIV', 'SPAN', 'IMG',
        'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD',
        'HR', 'BR',
        'BUTTON', 'I'
    ];
    const allowedAttrs = ['id', 'class', 'href', 'src', 'alt', 'title', 'data-md', 'data-action', 'target', 'style'];
    doc.body.querySelectorAll('*').forEach(el => {
        if (!allowedTags.includes(el.tagName)) {
            el.remove();
            return;
        }
        Array.from(el.attributes).forEach(attr => {
            if (!allowedAttrs.includes(attr.name)) {
                el.removeAttribute(attr.name);
                return;
            }
            if ((attr.name === 'href' || attr.name === 'src') && attr.value.trim().toLowerCase().startsWith('javascript:')) {
                el.removeAttribute(attr.name);
            }
        });
    });
    return doc.body;
}

function buildTOC(container) {
    const headers = container.querySelectorAll("h2");
    const toc = document.getElementById("toc");
    const sidebarLeft = document.querySelector(".sidebar-left");
    const ind = document.getElementById("tocIndicator");

    if (!toc) return;
    toc.innerHTML = "";

    if (ind) { ind.style.top = "0px"; ind.style.height = "0px"; }

    if (sidebarLeft) {
        sidebarLeft.style.display = headers.length === 0 ? "none" : "";
    }

    if (headers.length === 0) return;

    headers.forEach((h, i) => {
        const id = slugify(h.innerText);
        h.id = id;
        const a = document.createElement("a");
        a.href = "#" + id;
        a.textContent = h.innerText;
        if (h.tagName === "H2") a.classList.add("h2");
        if (i === 0) a.classList.add("active");
        a.addEventListener("click", (e) => {
            e.preventDefault();
            toc.querySelectorAll("a").forEach(l => l.classList.remove("active"));
            a.classList.add("active");
            moveIndicator(a);
            const target = document.getElementById(id);
            if (target) target.scrollIntoView({ behavior: "smooth" });
        });
        toc.appendChild(a);
    });
    setTimeout(() => {
        const first = toc.querySelector("a");
        if (first) moveIndicator(first);
    }, 0);
}

let observer = null;
function setupScrollObserver() {
    if (observer) observer.disconnect();
    const toc = document.getElementById("toc");
    const contentHeaders = document.querySelectorAll(".content h2");
    if (!contentHeaders.length || !toc) return;
    observer = new IntersectionObserver((entries) => {
        let topEntry = null;
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                if (!topEntry || entry.boundingClientRect.top < topEntry.boundingClientRect.top) {
                    topEntry = entry;
                }
            }
        });
        if (topEntry) {
            const id = topEntry.target.id;
            const activeLink = toc.querySelector(`a[href="#${id}"]`);
            if (activeLink) {
                toc.querySelectorAll("a").forEach(l => l.classList.remove("active"));
                activeLink.classList.add("active");
                moveIndicator(activeLink);
            }
        }
    }, {
        rootMargin: "-10% 0px -80% 0px",
        threshold: 0
    });
    contentHeaders.forEach(h => observer.observe(h));
}

function enhanceCodeBlocks(container) {
    container.querySelectorAll("pre").forEach((pre) => {
        if (pre.dataset.done) return;
        pre.dataset.done = "1";
        const code = pre.querySelector("code");
        if (!code) return;
        const lang = (code.className || "").replace("language-", "").trim() || "code";
        const rawCode = code.textContent;
        const header = document.createElement("div");
        header.className = "code-header";
        const left = document.createElement("div");
        left.textContent = lang;
        const btn = document.createElement("button");
        btn.className = "copy-btn";
        const btnImg = document.createElement("img");
        btnImg.src = "assets/icons/copy.svg";
        btnImg.alt = "copy";
        btn.appendChild(btnImg);
        btn.addEventListener("click", () => {
            navigator.clipboard.writeText(rawCode);
            btnImg.src = "assets/icons/check.svg";
            btnImg.alt = "copied";
            setTimeout(() => {
                btnImg.src = "assets/icons/copy.svg";
                btnImg.alt = "copy";
            }, 1500);
        });
        header.appendChild(left);
        header.appendChild(btn);
        const body = document.createElement("code");
        body.className = "code-body";
        let highlighted;
        if (lang !== "code" && hljs.getLanguage(lang)) {
            highlighted = hljs.highlight(rawCode, { language: lang }).value;
        } else {
            highlighted = hljs.highlightAuto(rawCode).value;
        }
        body.innerHTML = highlighted;
        pre.innerHTML = "";
        pre.appendChild(header);
        pre.appendChild(body);
    });
}

function getInitials(name) {
    const clean = name.trim();
    if (!clean) return "?";
    return clean
        .split(/\s+/)
        .map(w => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
}

function getAvatarColor(seed) {
    const colors = ["#bdbdbd"];
    let hash = 0;
    for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
}

function buildAvatarCircle(avatarUrl, displayName, username) {
    const label = displayName || username;
    if (avatarUrl) {
        const img = document.createElement("img");
        img.className = "author-avatar";
        img.src = avatarUrl;
        img.alt = label;
        img.title = label;
        return img;
    }
    const span = document.createElement("span");
    span.className = "author-avatar author-avatar--initials";
    span.title = label;
    span.style.background = getAvatarColor(username || label);
    span.textContent = getInitials(label !== username ? label : username);
    return span;
}

function parseAuthorBlock(ppPart, namePart) {
    const inner = ppPart + namePart;
    const authors = [];
    const firstPP = inner.indexOf("{pp::");
    if (firstPP > 0) {
        const before = inner.slice(0, firstPP);
        before.split(",").map(s => s.trim()).filter(Boolean).forEach(name => {
            authors.push({ username: null, displayName: name });
        });
    }
    const pairRegex = /\{pp::([^}]+)\}([^{]*)/g;
    let match;
    while ((match = pairRegex.exec(inner)) !== null) {
        const username = match[1].trim();
        const rawName = match[2].replace(/^[\s,]+|[\s,]+$/g, "");
        authors.push({ username, displayName: rawName || null });
    }
    const metaAuthorDiv = document.createElement("div");
    metaAuthorDiv.className = "meta-author";
    const avatarsDiv = document.createElement("div");
    avatarsDiv.className = "avatars";
    authors.forEach(a => {
        const avatarUrl = (a.username && a.username.toLowerCase() !== 'none')
            ? `https://github.com/${a.username}.png`
            : null;
        avatarsDiv.appendChild(buildAvatarCircle(avatarUrl, a.displayName, a.username || a.displayName));
    });
    const namesSpan = document.createElement("span");
    namesSpan.textContent = authors.map(a => a.displayName || a.username).filter(Boolean).join(", ");
    metaAuthorDiv.appendChild(avatarsDiv);
    metaAuthorDiv.appendChild(namesSpan);
    return metaAuthorDiv.outerHTML;
}

function parseMetaSyntax(html, rawMarkdown) {
    html = html.replace(/\{?\[date\]([^}<]+)\}?/g, (_, val) => {
        const div = document.createElement("div");
        div.className = "meta-date";
        div.textContent = val.trim();
        return div.outerHTML;
    });
    html = html.replace(/\{?\[read_time\]([^}<]+)\}?/g, (_, val) => {
        const div = document.createElement("div");
        div.className = "meta-read-time";
        div.innerHTML = `<i class="ti ti-clock" aria-hidden="true"></i>${val.trim()}`;
        return div.outerHTML;
    });
    html = html.replace(/\{?\[copy_raw_file\]([^}<]+)\}?/g, (_, val) => {
        const btn = document.createElement("button");
        btn.className = "meta-action-btn";
        btn.setAttribute("data-action", "copy-md");
        btn.innerHTML = `<i class="ti ti-copy" aria-hidden="true"></i>${val.trim()}`;
        return btn.outerHTML;
    });
    html = html.replace(/\{?\[view_as_md\]([^}<]+)\}?/g, (_, val) => {
        const btn = document.createElement("button");
        btn.className = "meta-action-btn";
        btn.setAttribute("data-action", "view-md");
        btn.innerHTML = `<i class="ti ti-markdown" aria-hidden="true"></i>${val.trim()}`;
        return btn.outerHTML;
    });
    const calloutIcons = {
        note: "ti-info-circle",
        tip: "ti-bulb",
        warning: "ti-alert-triangle",
        danger: "ti-flame"
    };
    html = html.replace(/\{?\[(note|tip|warning|danger)\]([^}]+)\}?/g, (_, type, val) => {
        const div = document.createElement("div");
        div.className = `callout callout-${type}`;
        const icon = document.createElement("i");
        icon.className = `ti ${calloutIcons[type]} callout-icon`;
        const text = document.createElement("div");
        text.innerHTML = val.trim();
        div.appendChild(icon);
        div.appendChild(text);
        return div.outerHTML;
    });
    const results = [];
    let i = 0;
    while (i < html.length) {
        const start = html.indexOf("{[author]", i);
        if (start === -1) break;
        let depth = 0;
        let end = -1;
        for (let j = start; j < html.length; j++) {
            if (html[j] === "{") depth++;
            else if (html[j] === "}") {
                depth--;
                if (depth === 0) { end = j; break; }
            }
        }
        if (end === -1) break;
        const fullMatch = html.slice(start, end + 1);
        const inner = fullMatch.slice(1, -1);
        const afterTag = inner.slice("[author]".length);
        let ppPart = "";
        let namePart = afterTag;
        const ppMatch = afterTag.match(/^(\{pp::[^}]+\})+/);
        if (ppMatch) {
            ppPart = ppMatch[0];
            namePart = afterTag.slice(ppPart.length);
        }
        results.push({ fullMatch, ppPart, namePart, start, end });
        i = end + 1;
    }
    for (let k = results.length - 1; k >= 0; k--) {
        const { start, end, ppPart, namePart } = results[k];
        const replacement = parseAuthorBlock(ppPart, namePart);
        html = html.slice(0, start) + replacement + html.slice(end + 1);
    }
    return html;
}

async function loadMD(file) {
    if (!ALLOWED_DOCS.includes(file)) {
        console.error("Blocked:", file);
        return false;
    }
    try {
        const res = await fetch(file);
        if (!res.ok) throw new Error();
        const text = await res.text();
        let html = marked.parse(text);
        const preContents = [];
        html = html.replace(/<pre[\s\S]*?<\/pre>/g, (match) => {
            preContents.push(match);
            return `__PRE_PLACEHOLDER_${preContents.length - 1}__`;
        });
        html = parseMetaSyntax(html, text);
        html = html.replace(/__PRE_PLACEHOLDER_(\d+)__/g, (_, i) => preContents[i]);
        const contentContainer = document.getElementById("content");
        contentContainer.innerHTML = "";

        window.scrollTo({ top: 0, behavior: "instant" });

        const sanitizedBody = sanitizeHTML(html);
        while (sanitizedBody.firstChild) {
            contentContainer.appendChild(sanitizedBody.firstChild);
        }

        if (typeof renderMathInElement === "function") {
            renderMathInElement(contentContainer, {
                delimiters: [
                    {left: '$$', right: '$$', display: true},
                    {left: '$', right: '$', display: false},
                    {left: '\\(', right: '\\)', display: false},
                    {left: '\\[', right: '\\]', display: true}
                ],
                throwOnError: false
            });
        }

        buildTOC(contentContainer);
        enhanceCodeBlocks(contentContainer);
        contentContainer.querySelectorAll('table').forEach(table => {
            if (table.parentNode.classList.contains('table-wrapper')) return;
            const wrapper = document.createElement('div');
            wrapper.className = 'table-wrapper';
            table.parentNode.insertBefore(wrapper, table);
            wrapper.appendChild(table);
        });

        contentContainer.querySelectorAll('.meta-action-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.getAttribute('data-action');
                if (action === 'copy-md') {
                    navigator.clipboard.writeText(text).then(() => {
                        const orig = btn.innerHTML;
                        btn.innerHTML = `<i class="ti ti-check" aria-hidden="true"></i>Copied!`;
                        setTimeout(() => { btn.innerHTML = orig; }, 1500);
                    });
                } else if (action === 'view-md') {
                    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    window.open(url, '_blank');
                    setTimeout(() => URL.revokeObjectURL(url), 10000);
                }
            });
        });

        const readTime = contentContainer.querySelector('.meta-read-time');
        const actionBtns = Array.from(contentContainer.querySelectorAll('.meta-action-btn'));
        if (readTime || actionBtns.length > 0) {
            const row = document.createElement('div');
            row.className = 'meta-actions-row';
            const anchor = readTime || actionBtns[0];
            anchor.parentNode.insertBefore(row, anchor);
            if (readTime) row.appendChild(readTime);
            actionBtns.forEach(btn => row.appendChild(btn));
        }

        setTimeout(setupScrollObserver, 50);
        return true;
    } catch (err) {
        console.error(err);
        return false;
    }
}

document.getElementById("hamburgerBtn").addEventListener("click", () => {
    const isOpen = document.getElementById("sidebar").classList.toggle("open");
    document.body.classList.toggle("sidebar-open", isOpen);
});

async function initSearchIndex() {
    try {
        const res = await fetch('assets/search-index.json');
        if (!res.ok) throw new Error("Failed to fetch search-index.json");
        searchIndex = await res.json();
    } catch (e) {
        console.error("Initialization of search index failed:", e);
    }
}

const searchInput = document.getElementById("docsSearchInput");
const resultsDropdown = document.getElementById("searchResultsDropdown");

if (searchInput && resultsDropdown) {
    searchInput.addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase().trim();
        if (query.length < 2) {
            resultsDropdown.innerHTML = "";
            resultsDropdown.classList.remove("open");
            return;
        }

        const matchedResults = searchIndex.filter(doc =>
            doc.title.toLowerCase().includes(query) ||
            (doc.subtitle && doc.subtitle.toLowerCase().includes(query)) ||
            doc.content.toLowerCase().includes(query)
        );

        resultsDropdown.innerHTML = "";
        if (matchedResults.length === 0) {
            const noResults = document.createElement("div");
            noResults.className = "search-no-results";
            noResults.textContent = "No results found";
            resultsDropdown.appendChild(noResults);
            resultsDropdown.classList.add("open");
            return;
        }

        matchedResults.forEach(doc => {
            const idx = doc.content.toLowerCase().indexOf(query);
            let snippet = "";
            if (idx !== -1) {
                const start = Math.max(0, idx - 30);
                const end = Math.min(doc.content.length, idx + 60);
                snippet = "..." + doc.content.slice(start, end) + "...";
            } else {
                snippet = doc.content.slice(0, 70) + "...";
            }

            const a = document.createElement("a");
            a.className = "search-result-item";
            a.href = "#";
            a.setAttribute("data-md", doc.path);
            if (doc.anchor) {
                a.setAttribute("data-anchor", doc.anchor);
            }

            const escapedQuery = escapeRegExp(query);
            const regex = new RegExp(`(${escapedQuery})`, 'gi');
            
            const titleContainer = document.createElement("strong");
            const fullTitleText = doc.subtitle ? `${doc.title} » ${doc.subtitle}` : doc.title;
            const titleParts = fullTitleText.split(regex);
            
            titleParts.forEach(part => {
                if (part.toLowerCase() === query) {
                    const mark = document.createElement("mark");
                    mark.textContent = part;
                    titleContainer.appendChild(mark);
                } else {
                    titleContainer.appendChild(document.createTextNode(part));
                }
            });

            const snippetContainer = document.createElement("span");
            const snippetParts = snippet.split(regex);
            snippetParts.forEach(part => {
                if (part.toLowerCase() === query) {
                    const mark = document.createElement("mark");
                    mark.textContent = part;
                    snippetContainer.appendChild(mark);
                } else {
                    snippetContainer.appendChild(document.createTextNode(part));
                }
            });

            a.appendChild(titleContainer);
            a.appendChild(snippetContainer);
            resultsDropdown.appendChild(a);
        });
        resultsDropdown.classList.add("open");
    });

    resultsDropdown.addEventListener("click", async (evt) => {
        const item = evt.target.closest(".search-result-item");
        if (!item) return;
        evt.preventDefault();
        
        const targetMd = item.getAttribute("data-md");
        const targetAnchor = item.getAttribute("data-anchor");
        
        const success = await loadMD(targetMd);
        
        if (success && targetAnchor) {
            setTimeout(() => {
                const targetEl = document.getElementById(targetAnchor);
                if (targetEl) {
                    targetEl.scrollIntoView({ behavior: "smooth" });
                    
                    const toc = document.getElementById("toc");
                    if (toc) {
                        const activeLink = toc.querySelector(`a[href="#${targetAnchor}"]`);
                        if (activeLink) {
                            toc.querySelectorAll("a").forEach(l => l.classList.remove("active"));
                            activeLink.classList.add("active");
                            moveIndicator(activeLink);
                        }
                    }
                }
            }, 120);
        }
        
        resultsDropdown.classList.remove("open");
        searchInput.value = "";
    });

    document.addEventListener("click", (e) => {
        if (!searchInput.contains(e.target) && !resultsDropdown.contains(e.target)) {
            resultsDropdown.classList.remove("open");
        }
    });
}

document.addEventListener("DOMContentLoaded", function () {
    var mq = window.matchMedia("(max-width: 768px)");
    document.querySelectorAll(".sidebar-item").forEach(function (item) {
        var flyout = item.querySelector(".sidebar-flyout");
        var link   = item.querySelector(":scope > a");
        var leaveTimer = null;
        function openFlyout() {
            if (mq.matches) return;
            clearTimeout(leaveTimer);
            item.classList.add("hovered");
        }
        function closeFlyout() {
            if (mq.matches) return;
            leaveTimer = setTimeout(function () {
                item.classList.remove("hovered");
            }, 120);
        }
        if (flyout && link) {
            link.addEventListener("mouseenter", openFlyout);
            link.addEventListener("mouseleave", closeFlyout);
            flyout.addEventListener("mouseenter", openFlyout);
            flyout.addEventListener("mouseleave", closeFlyout);
        }
        if (link && link.querySelector(".sidebar-chevron")) {
            link.addEventListener("click", function (e) {
                if (mq.matches) {
                    e.preventDefault();
                    item.classList.toggle("open");
                }
            });
        }
    });
});

document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const input = document.getElementById("docsSearchInput");
        if (input) input.focus();
    }
});

document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-md]");
    if (!el) return;
    e.preventDefault();
    const sidebar = document.getElementById("sidebar");
    if (sidebar) sidebar.classList.remove("open");
    document.body.classList.remove("sidebar-open");
    const targetFile = el.getAttribute("data-md");
    loadMD(targetFile);
});

async function initApp() {
    try {
        const response = await fetch('assets/docs.json');
        if (!response.ok) throw new Error('Failed to load allowed docs list');
        ALLOWED_DOCS = await response.json();
        
        await initSearchIndex();
        loadMD("docs/home.md");
    } catch (error) {
        console.error("Initialization failed:", error);
    }
}

const searchShortcutEl = document.getElementById("searchShortcut");
if (searchShortcutEl) {
    const isMac = navigator.platform.toUpperCase().includes('MAC');
    searchShortcutEl.textContent = isMac ? "⌘+K" : "Ctrl+K";
}

initApp();