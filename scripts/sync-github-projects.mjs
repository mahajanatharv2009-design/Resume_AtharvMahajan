// GitHub Project Sync Script for Atharv Mahajan's Pixel Portfolio
// This script checks selected GitHub profiles, reads repo READMEs,
// and writes approved projects into generated-projects.js.

const owners = unique(
  String(process.env.GITHUB_OWNERS || process.env.GITHUB_OWNER || "Atharvamaj,mahajanatharv2009-design")
    .split(/[\s,]+/)
    .map(owner => owner.trim())
    .filter(Boolean)
);

const token = process.env.GITHUB_TOKEN || "";

const headers = {
  "Accept": "application/vnd.github+json",
  "User-Agent": "atharv-portfolio-project-sync"
};

if (token) headers.Authorization = `Bearer ${token}`;

const builtInTitles = new Set([
  "proxmox server from old laptops",
  "j a r v i s voice assistant",
  "auto typer",
  "event tech support toolkit",
  "solvexchange website",
  "record room"
].map(normalize));

const current = await readCurrentProjects();

const seenTitles = new Set([
  ...builtInTitles,
  ...current.map(project => normalize(project.title || project.repo))
]);

const seenUrls = new Set(
  current.map(project => normalize(project.url)).filter(Boolean)
);

const projects = [...current];

for (const owner of owners) {
  const repos = await getJson(
    `https://api.github.com/users/${owner}/repos?per_page=100&sort=updated&type=owner`
  );

  for (const repo of repos) {
    if (repo.fork || repo.archived || repo.private) continue;

    const readme = await getReadme(owner, repo.name);
    if (!readme) continue;

    if (shouldSkipRepo(readme)) continue;

    const info = parseReadme(readme, repo.name);
    if (!info.description) continue;

    const titleKey = normalize(info.title || repo.name);
    const urlKey = normalize(repo.html_url);

    if (!titleKey || seenTitles.has(titleKey) || seenUrls.has(urlKey)) continue;

    seenTitles.add(titleKey);
    seenUrls.add(urlKey);

    // Atharv Mahajan: only use a website/demo link if it is set in the GitHub repo Website field.
    // Do not guess GitHub Pages links because not every repo is a website.
    const website = cleanUrl(repo.homepage);

    projects.push({
      title: info.title,
      description: info.description,
      repo: repo.name,
      owner,
      url: repo.html_url,
      homepage: website,
      website,
      updatedAt: repo.updated_at
    });
  }
}

projects.sort((a, b) =>
  String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""))
);

await writeProjects(projects);

async function getJson(url) {
  const res = await fetch(url, { headers });

  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}: ${url}`);
  }

  return res.json();
}

async function getReadme(owner, repo) {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, {
    headers: {
      ...headers,
      "Accept": "application/vnd.github.raw"
    }
  });

  if (!res.ok) return "";

  return res.text();
}

function parseReadme(text, fallbackTitle) {
  const lines = text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  let title = fallbackTitle
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, char => char.toUpperCase());

  const heading = lines.find(line => /^#\s+/.test(line));

  if (heading) {
    title = stripMarkdown(heading.replace(/^#\s+/, ""));
  }

  const descriptionLine = lines.find(line => {
    if (/^#/.test(line)) return false;
    if (/^[-*+]\s+/.test(line)) return false;
    if (/^```/.test(line)) return false;
    if (/^!\[/.test(line)) return false;

    const plain = stripMarkdown(line);

    return plain.length >= 20 && plain.length <= 180;
  });

  return {
    title: title.slice(0, 80),
    description: descriptionLine
      ? stripMarkdown(descriptionLine).slice(0, 180)
      : ""
  };
}

function shouldSkipRepo(text) {
  const plain = normalize(stripMarkdown(text));

  const exactSkipPhrases = [
    "this is for the portfolio",
    "this repo is for the portfolio",
    "this repository is for the portfolio",
    "for the portfolio",
    "portfolio ignore",
    "ignore portfolio",
    "skip portfolio",
    "portfolio skip",
    "do not add to portfolio",
    "dont add to portfolio",
    "don t add to portfolio",
    "do not include in portfolio",
    "dont include in portfolio",
    "don t include in portfolio",
    "exclude from portfolio",
    "hide from portfolio",
    "omit from portfolio",
    "not for portfolio",
    "not for the portfolio",
    "keep off portfolio",
    "leave off portfolio",
    "portfolio exclude",
    "portfolio hide",
    "portfolio omit"
  ].map(normalize);

  if (exactSkipPhrases.some(phrase => plain.includes(phrase))) return true;

  const words = new Set(plain.split(/\s+/).filter(Boolean));
  const hasPortfolio = words.has("portfolio");

  if (!hasPortfolio) return false;

  const ignoreWords = [
    "ignore",
    "skip",
    "exclude",
    "hide",
    "omit",
    "private",
    "draft",
    "internal"
  ];

  if (ignoreWords.some(word => words.has(word))) return true;

  if (
    plain.includes("do not add") ||
    plain.includes("dont add") ||
    plain.includes("don t add")
  ) {
    return true;
  }

  if (
    plain.includes("do not include") ||
    plain.includes("dont include") ||
    plain.includes("don t include")
  ) {
    return true;
  }

  if (plain.includes("not add") || plain.includes("not include")) {
    return true;
  }

  return false;
}

function cleanUrl(value) {
  const url = String(value || "").trim();

  if (!url) return "";
  if (!/^https?:\/\//i.test(url)) return "";

  return url;
}

function stripMarkdown(value) {
  return String(value)
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`>#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function unique(values) {
  return [
    ...new Set(
      values
        .map(value => String(value).trim())
        .filter(Boolean)
    )
  ];
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

async function readCurrentProjects() {
  try {
    const { readFile } = await import("node:fs/promises");

    const text = await readFile("generated-projects.js", "utf8");
    const match = text.match(/window\.GITHUB_PROJECTS\s*=\s*(\[[\s\S]*?\]);/);

    return match ? JSON.parse(match[1]) : [];
  } catch {
    return [];
  }
}

async function writeProjects(projects) {
  const { writeFile } = await import("node:fs/promises");

  const body = `window.GITHUB_PROJECTS = ${JSON.stringify(projects, null, 2)};\n`;

  await writeFile("generated-projects.js", body);
}
