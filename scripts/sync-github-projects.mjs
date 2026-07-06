const fs = await import("node:fs/promises");

const instructionFile = "portfolio-bot-instructions.json";
const instructions = await readInstructions(instructionFile);

if (instructions.enabled === false) {
  console.log(`${instructionFile} has enabled:false. GitHub project sync stopped.`);
  process.exit(0);
}

const owners = unique(
  (Array.isArray(instructions.owners) && instructions.owners.length
    ? instructions.owners
    : String(process.env.GITHUB_OWNERS || process.env.GITHUB_OWNER || "Atharvamaj,mahajanatharv2009-design")
        .split(/[\s,]+/)
  )
    .map(owner => String(owner).trim())
    .filter(Boolean)
);

const token = process.env.GITHUB_TOKEN || "";

const headers = {
  "Accept": "application/vnd.github+json",
  "User-Agent": "portfolio-project-sync"
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
const projects = [...current];

const seenTitles = new Set([
  ...builtInTitles,
  ...current.map(project => normalize(project.title || project.repo))
]);

const seenUrls = new Set(
  current.map(project => normalize(project.url)).filter(Boolean)
);

const seenRepoFullNames = new Set(
  current
    .map(project => fullName(project.owner, project.repo))
    .map(normalize)
    .filter(Boolean)
);

const aliasMap = normalizeObjectKeys(instructions.repoAliases || {});
const titleOverrides = normalizeObjectKeys(instructions.titleOverrides || {});
const descriptionOverrides = normalizeObjectKeys(instructions.descriptionOverrides || {});
const categoryOverrides = normalizeObjectKeys(instructions.categoryOverrides || {});
const websiteOverrides = normalizeObjectKeys(instructions.websiteOverrides || {});
const pinOverrides = normalizeObjectKeys(instructions.pinOverrides || {});
const includeOnlyRepos = new Set((instructions.includeOnlyRepos || []).map(normalize));
const excludeRepos = new Set((instructions.excludeRepos || []).map(normalize));
const duplicateRules = {
  matchByRepoUrl: true,
  matchByRepoFullName: true,
  matchByTitle: true,
  matchByAliases: true,
  ...(instructions.duplicateRules || {})
};

for (const owner of owners) {
  const repos = await getJson(
    `https://api.github.com/users/${owner}/repos?per_page=100&sort=updated&type=owner`
  );

  for (const repo of repos) {
    const repoFullName = `${owner}/${repo.name}`;
    const repoKey = normalize(repoFullName);
    const shortRepoKey = normalize(repo.name);

    if (repo.fork || repo.archived || repo.private) continue;
    if (excludeRepos.has(repoKey) || excludeRepos.has(shortRepoKey)) continue;
    if (includeOnlyRepos.size && !includeOnlyRepos.has(repoKey) && !includeOnlyRepos.has(shortRepoKey)) continue;

    const readme = await getReadme(owner, repo.name);
    if (!readme) continue;

    const info = parseReadme(readme, repo.name);
    if (info.ignore) continue;

    const overrideTitle = titleOverrides[repoKey] || titleOverrides[shortRepoKey];
    const overrideDescription = descriptionOverrides[repoKey] || descriptionOverrides[shortRepoKey];
    const overrideCategory = categoryOverrides[repoKey] || categoryOverrides[shortRepoKey];
    const overrideWebsite = websiteOverrides[repoKey] || websiteOverrides[shortRepoKey];
    const overridePin = pinOverrides[repoKey] || pinOverrides[shortRepoKey];

    if (overrideTitle) info.title = overrideTitle;
    if (overrideDescription) info.description = overrideDescription;
    if (overrideCategory) info.category = cleanCategory(overrideCategory);
    if (overrideWebsite) info.website = cleanUrl(overrideWebsite);
    if (overridePin) info.pin = cleanPin(overridePin);

    if (!info.description) continue;

    const titleKey = normalize(info.title || repo.name);
    const urlKey = normalize(repo.html_url);
    const aliasKey = normalize(aliasMap[repoKey] || aliasMap[shortRepoKey] || "");

    if (!titleKey) continue;

    const existingIndex = projects.findIndex(project => {
      const projectFullName = normalize(fullName(project.owner, project.repo));
      const projectTitle = normalize(project.title || project.repo);
      const projectUrl = normalize(project.url);

      return (
        (duplicateRules.matchByRepoUrl && projectUrl && projectUrl === urlKey) ||
        (duplicateRules.matchByRepoFullName && projectFullName && projectFullName === repoKey) ||
        (duplicateRules.matchByTitle && projectTitle && projectTitle === titleKey) ||
        (duplicateRules.matchByAliases && aliasKey && projectTitle === aliasKey)
      );
    });

    const alreadySeen =
      (duplicateRules.matchByRepoUrl && seenUrls.has(urlKey)) ||
      (duplicateRules.matchByRepoFullName && seenRepoFullNames.has(repoKey)) ||
      (duplicateRules.matchByTitle && seenTitles.has(titleKey)) ||
      (duplicateRules.matchByAliases && aliasKey && seenTitles.has(aliasKey));

    if (existingIndex < 0 && alreadySeen) {
      console.log(`Skipping duplicate repo: ${repoFullName}`);
      continue;
    }

    seenTitles.add(titleKey);
    if (aliasKey) seenTitles.add(aliasKey);
    seenUrls.add(urlKey);
    seenRepoFullNames.add(repoKey);

    const website =
      cleanUrl(info.website) ||
      cleanUrl(repo.homepage) ||
      await getPagesWebsite(owner, repo.name, repo.has_pages);

    const projectData = {
      title: info.title,
      description: info.description,
      category: info.category || instructions.defaultCategory || "GitHub",
      pin: info.pin || null,
      repo: repo.name,
      owner,
      url: repo.html_url,
      homepage: website,
      website,
      updatedAt: repo.updated_at
    };

    if (existingIndex >= 0) {
      projects[existingIndex] = {
        ...projects[existingIndex],
        ...projectData
      };
    } else {
      const pin = cleanPin(projectData.pin);
      const pinnedIndex = pin
        ? projects.findIndex(project => cleanPin(project.pin) === pin)
        : -1;

      if (pinnedIndex >= 0) {
        projects[pinnedIndex] = projectData;
      } else {
        projects.push(projectData);
      }
    }
  }
}

projects.sort((a, b) => {
  const pinA = cleanPin(a.pin) || 999;
  const pinB = cleanPin(b.pin) || 999;

  if (pinA !== pinB) return pinA - pinB;

  return String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
});

await writeProjects(projects);

async function readInstructions(path) {
  try {
    const text = await fs.readFile(path, "utf8");
    return JSON.parse(text);
  } catch {
    return {};
  }
}

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

  const commands = parseBotCommands(text);

  let title = fallbackTitle
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, char => char.toUpperCase());

  const heading = lines.find(line => /^#\s+/.test(line));

  if (heading) {
    title = stripMarkdown(heading.replace(/^#\s+/, ""));
  }

  if (commands.title) {
    title = commands.title;
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
    description: commands.description
      ? commands.description.slice(0, 180)
      : descriptionLine
        ? stripMarkdown(descriptionLine).slice(0, 180)
        : "",
    category: commands.category || "GitHub",
    website: commands.website || "",
    pin: commands.pin,
    ignore: commands.ignore === true
  };
}

function parseBotCommands(text) {
  const commands = {
    title: "",
    description: "",
    category: "",
    website: "",
    pin: null,
    ignore: false
  };

  const commandLines = getBotCommandLines(text);

  for (const line of commandLines) {
    const parsed = parseCommandLine(line);
    if (!parsed) continue;

    const value = parsed.value.trim();

    if (parsed.key === "ignore") {
      commands.ignore = value ? !/^(no|false|0|off)$/i.test(value) : true;
    } else if (parsed.key === "title" && value) {
      commands.title = stripMarkdown(value).slice(0, 80);
    } else if (parsed.key === "description" && value) {
      commands.description = stripMarkdown(value).slice(0, 180);
    } else if (parsed.key === "category" && value) {
      commands.category = cleanCategory(value);
    } else if (parsed.key === "website" && value) {
      commands.website = cleanUrl(value);
    } else if (parsed.key === "pin") {
      commands.pin = cleanPin(value);
    }
  }

  return commands;
}

function getBotCommandLines(text) {
  const lines = String(text || "").split(/\r?\n/);
  const sections = [];
  let collecting = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const isHeading = /^#+\s+/.test(line);
    const headingText = normalize(line.replace(/^#+\s*/, ""));

    if (isHeading) {
      collecting = isBotHeading(headingText);
      continue;
    }

    if (collecting && line) {
      sections.push(line);
    }
  }

  return sections;
}

function isBotHeading(value) {
  return [
    "bot",
    "for bot",
    "for the bot",
    "github bot",
    "portfolio bot",
    "bot commands",
    "bot instructions",
    "git bot instruction",
    "git bot instructions",
    "github instructions",
    "portfolio instructions"
  ].some(item => normalize(item) === value);
}

function parseCommandLine(line) {
  const clean = String(line || "").replace(/^[-*+]\s*/, "").trim();
  const parts = clean.split(":");
  const rawKey = parts.shift()?.trim() || "";
  const value = parts.join(":").trim();
  const key = getCommandKey(rawKey);

  if (!key) return null;

  return { key, value };
}

function getCommandKey(value) {
  const key = normalize(value);

  const aliases = {
    title: [
      "project name",
      "project title",
      "project",
      "name",
      "title",
      "repo name",
      "repository name",
      "project nmae",
      "project naem",
      "project titel",
      "porject name",
      "projec name",
      "prject name",
      "projct name",
      "project nam",
      "projectname"
    ],
    description: [
      "explain",
      "explanation",
      "description",
      "desc",
      "summary",
      "about",
      "one liner",
      "one line",
      "explian",
      "expalin",
      "explan",
      "explenation",
      "explination",
      "descrption",
      "discription",
      "descripton",
      "sumary",
      "summery"
    ],
    category: [
      "category",
      "catigory",
      "categroy",
      "catagory",
      "catgry",
      "cat",
      "section",
      "type",
      "group",
      "catagory name",
      "category name",
      "catigory name"
    ],
    website: [
      "website",
      "web site",
      "site",
      "live site",
      "live",
      "demo",
      "visit",
      "visit website",
      "url",
      "link",
      "homepage",
      "home page",
      "webiste",
      "wesbite",
      "webstie",
      "websit",
      "web",
      "live link",
      "demo link"
    ],
    pin: [
      "pin",
      "pinned",
      "pind",
      "pinn",
      "pin spot",
      "spot",
      "position",
      "place",
      "rank"
    ],
    ignore: [
      "ignore",
      "ignor",
      "ig nore",
      "ignroe",
      "ingore",
      "igoner",
      "igore",
      "ignore repo",
      "skip",
      "skipp",
      "hide",
      "exclude",
      "exlude",
      "excluse",
      "omit",
      "remove"
    ]
  };

  for (const [command, values] of Object.entries(aliases)) {
    if (values.map(normalize).includes(key)) return command;
  }

  return "";
}

async function getPagesWebsite(owner, repo, hasPages) {
  if (!hasPages) return "";

  try {
    const pages = await getJson(`https://api.github.com/repos/${owner}/${repo}/pages`);
    return cleanUrl(pages.html_url);
  } catch {
    return "";
  }
}

function cleanUrl(value) {
  const url = String(value || "").trim();

  if (!url) return "";
  if (!/^https?:\/\//i.test(url)) return "";

  return url;
}

function cleanCategory(value) {
  return stripMarkdown(value)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 32) || "GitHub";
}

function cleanPin(value) {
  const pin = Number(String(value || "").match(/[1-4]/)?.[0] || 0);
  return pin >= 1 && pin <= 4 ? pin : null;
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

function normalizeObjectKeys(object) {
  return Object.fromEntries(
    Object.entries(object).map(([key, value]) => [normalize(key), value])
  );
}

function fullName(owner, repo) {
  if (!owner || !repo) return "";
  return `${owner}/${repo}`;
}

async function readCurrentProjects() {
  try {
    const text = await fs.readFile("generated-projects.js", "utf8");
    const match = text.match(/window\.GITHUB_PROJECTS\s*=\s*(\[[\s\S]*?\]);/);

    return match ? JSON.parse(match[1]) : [];
  } catch {
    return [];
  }
}

async function writeProjects(projects) {
  const body = `window.GITHUB_PROJECTS = ${JSON.stringify(projects, null, 2)};\n`;

  await fs.writeFile("generated-projects.js", body);
}
