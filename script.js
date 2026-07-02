const year = document.getElementById("year");
if (year) year.textContent = new Date().getFullYear();

const themeToggle = document.getElementById("themeToggle");
const savedTheme = localStorage.getItem("pixel_portfolio_theme") || "dark";
document.documentElement.setAttribute("data-theme", savedTheme);
updateThemeButton();

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme") || "dark";
    const next = current === "light" ? "dark" : "light";
    runDayNightDialTransition(current, next);
  });
}

function runDayNightDialTransition(current, next) {
  if (document.querySelector(".theme-portal")) return;

  const portal = document.createElement("div");
  portal.className = "theme-portal";
  portal.style.setProperty("--portal-next", next === "light" ? "rgba(248, 237, 207, .98)" : "rgba(18, 21, 32, .98)");
  portal.style.setProperty("--portal-accent", next === "light" ? "#b76b18" : "#ffe4a8");
  portal.innerHTML = `
    <div class="portal-disc"></div>
    <div class="portal-hand"></div>
    <div class="portal-cap"></div>
    <div class="portal-label">${current.toUpperCase()} → ${next.toUpperCase()}</div>
  `;

  document.body.appendChild(portal);

  window.setTimeout(() => {
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("pixel_portfolio_theme", next);
    updateThemeButton();
  }, 1700);

  window.setTimeout(() => {
    portal.remove();
  }, 3500);
}

function updateThemeButton() {
  if (!themeToggle) return;
  const theme = document.documentElement.getAttribute("data-theme") || "dark";
  const label = themeToggle.querySelector(".theme-label");
  if (label) label.textContent = theme === "light" ? "Dark" : "Light";
  else themeToggle.textContent = theme === "light" ? "Dark" : "Light";
  themeToggle.setAttribute("aria-label", `Switch to ${theme === "light" ? "dark" : "light"} mode`);
}

const rows = 7;
const board = document.getElementById("nameBoard");
let panels = [];
let currentPattern = [];
let currentCols = 0;
let boardTimers = [];
let messageIndex = 0;
let currentPhase = "name";

const font = {
  A:["01110","10001","10001","11111","10001","10001","10001"],
  B:["11110","10001","10001","11110","10001","10001","11110"],
  C:["01111","10000","10000","10000","10000","10000","01111"],
  D:["11110","10001","10001","10001","10001","10001","11110"],
  E:["11111","10000","10000","11110","10000","10000","11111"],
  F:["11111","10000","10000","11110","10000","10000","10000"],
  G:["01110","10001","10000","10111","10001","10001","01110"],
  H:["10001","10001","10001","11111","10001","10001","10001"],
  I:["11111","00100","00100","00100","00100","00100","11111"],
  J:["00111","00010","00010","00010","10010","10010","01100"],
  K:["10001","10010","10100","11000","10100","10010","10001"],
  L:["10000","10000","10000","10000","10000","10000","11111"],
  M:["10001","11011","10101","10101","10001","10001","10001"],
  N:["10001","11001","10101","10011","10001","10001","10001"],
  O:["01110","10001","10001","10001","10001","10001","01110"],
  P:["11110","10001","10001","11110","10000","10000","10000"],
  Q:["01110","10001","10001","10001","10101","10010","01101"],
  R:["11110","10001","10001","11110","10100","10010","10001"],
  S:["01111","10000","10000","01110","00001","00001","11110"],
  T:["11111","00100","00100","00100","00100","00100","00100"],
  U:["10001","10001","10001","10001","10001","10001","01110"],
  V:["10001","10001","10001","10001","01010","01010","00100"],
  W:["10001","10001","10001","10101","10101","10101","01010"],
  X:["10001","01010","00100","00100","00100","01010","10001"],
  Y:["10001","01010","00100","00100","00100","00100","00100"],
  Z:["11111","00001","00010","00100","01000","10000","11111"],
  "0":["01110","10001","10011","10101","11001","10001","01110"],
  "1":["00100","01100","00100","00100","00100","00100","01110"],
  "2":["01110","10001","00001","00010","00100","01000","11111"],
  "3":["11110","00001","00001","01110","00001","00001","11110"],
  "4":["10010","10010","10010","11111","00010","00010","00010"],
  "5":["11111","10000","10000","11110","00001","00001","11110"],
  "6":["01110","10000","10000","11110","10001","10001","01110"],
  "7":["11111","00001","00010","00100","01000","01000","01000"],
  "8":["01110","10001","10001","01110","10001","10001","01110"],
  "9":["01110","10001","10001","01111","00001","00001","01110"],
  "!":["00100","00100","00100","00100","00100","00000","00100"],
  ".":["00000","00000","00000","00000","00000","00110","00110"],
  ":":["00000","00110","00110","00000","00110","00110","00000"],
  "#":["01010","11111","01010","11111","01010","00000","00000"],
  "*": ["00100","10101","01110","11111","01110","10101","00100"],
  "+": ["00000","00100","00100","11111","00100","00100","00000"],
  ">":["10000","01000","00100","00010","00100","01000","10000"],
  "<":["00001","00010","00100","01000","00100","00010","00001"],
  "↘":["00000","00000","10001","01001","00101","00011","11111"],
  "↙":["00000","00000","10001","10010","10100","11000","11111"],
  "↗":["11111","00011","00101","01001","10001","00000","00000"],
  "↖":["11111","11000","10100","10010","10001","00000","00000"],
  " ":["0000","0000","0000","0000","0000","0000","0000"]
};

const nameText = "ATHARV MAHAJAN";
const messages = [
  "LETS GO ↙↙",
  "BUILD MODE ##",
  "SHIP IT >>>",
  "DEBUG TIME",
  "POWER UP **",
  "MAKE STUFF ++",
  "LEVEL UP",
  "NEXT: PROJECTS"
];

function buildPattern(value) {
  const pattern = Array.from({ length: rows }, () => "");
  const clean = value.toUpperCase();

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    const nextChar = clean[i + 1];
    const letter = font[char] || font[" "];

    for (let r = 0; r < rows; r++) {
      if (char === " ") {
        pattern[r] += letter[r];
      } else {
        pattern[r] += letter[r];
        if (i !== clean.length - 1 && nextChar !== " ") pattern[r] += "0";
      }
    }
  }
  let lastActiveCol = 0;
  for (let c = 0; c < pattern[0].length; c++) {
    if (pattern.some(row => row[c] === "1")) lastActiveCol = c;
  }
  return pattern.map(row => row.slice(0, lastActiveCol + 1));
}

if (board) {
  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function getBoardPadding() {
    if (window.innerWidth <= 420) return 8;
    if (window.innerWidth <= 640) return 10;
    if (window.innerWidth <= 900) return 14;
    return 20;
  }

  function getGap() {
    if (window.innerWidth <= 420) return 1;
    if (window.innerWidth <= 760) return 2;
    return 3;
  }

  function applyGridSize() {
    if (!currentCols) return;
    const wrap = board.parentElement;
    const topbar = document.querySelector(".topbar");
    const kicker = document.querySelector(".board-kicker");
    const gap = getGap();
    const pad = getBoardPadding();

    const wrapWidth = Math.max(260, wrap.clientWidth || window.innerWidth);
    const availableWidth = wrapWidth - (pad * 2) - (gap * (currentCols - 1));
    const widthBasedPanel = availableWidth / currentCols;

    const reservedHeight = (topbar?.offsetHeight || 74) + (kicker?.offsetHeight || 18) + 90;
    const availableHeight = Math.max(150, window.innerHeight - reservedHeight - (pad * 2) - (gap * (rows - 1)));
    const heightBasedPanel = availableHeight / rows / 1.58;

    const minPanel = window.innerWidth <= 420 ? 3 : window.innerWidth <= 760 ? 4.5 : 6;
    const maxPanel = window.innerWidth >= 1500 ? 16 : window.innerWidth >= 1100 ? 14 : 12;
    const w = Math.floor(clamp(Math.min(widthBasedPanel, heightBasedPanel), minPanel, maxPanel));
    const h = Math.max(7, Math.round(w * 1.58));

    board.style.setProperty("--flip-w", `${w}px`);
    board.style.setProperty("--flip-h", `${h}px`);
    board.style.setProperty("--flip-gap", `${gap}px`);
    board.style.setProperty("--flip-pad", `${pad}px`);
    board.style.gridTemplateColumns = `repeat(${currentCols}, ${w}px)`;
    board.style.gridTemplateRows = `repeat(${rows}, ${h}px)`;
  }

  function renderBoard(pattern, phase) {
    currentPattern = pattern;
    currentCols = pattern[0].length;
    currentPhase = phase;
    panels = [];
    board.innerHTML = "";
    board.classList.remove("completed", "name-phase", "message-phase");
    board.classList.add(`${phase}-phase`);

    applyGridSize();

    for (let r = 0; r < rows; r++) {
      panels[r] = [];
      for (let c = 0; c < currentCols; c++) {
        const panel = document.createElement("div");
        panel.className = "flip-panel";
        board.appendChild(panel);
        panels[r][c] = panel;
      }
    }
  }

  function setBoardTimer(fn, delay) {
    const timer = setTimeout(fn, delay);
    boardTimers.push(timer);
    return timer;
  }

  function clearBoardTimers() {
    boardTimers.forEach(clearTimeout);
    boardTimers = [];
  }

  function allCells() {
    const cells = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < currentCols; c++) cells.push({ r, c });
    return cells;
  }

  function activeCells() {
    const cells = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < currentCols; c++) {
        if (currentPattern[r][c] === "1") cells.push({ r, c });
      }
    }
    return cells;
  }

  function shuffle(cells) {
    return [...cells].sort(() => Math.random() - 0.5);
  }

  function orderCells(patternType, activeOnly = true) {
    let cells = activeOnly ? activeCells() : allCells();
    const centerR = (rows - 1) / 2;
    const centerC = (currentCols - 1) / 2;

    switch (patternType % 8) {
      case 0: return shuffle(cells);
      case 1: return cells.sort((a, b) => a.c - b.c || a.r - b.r);
      case 2: return cells.sort((a, b) => b.c - a.c || a.r - b.r);
      case 3: return cells.sort((a, b) => (a.r + a.c) - (b.r + b.c));
      case 4: return cells.sort((a, b) => (b.r + b.c) - (a.r + a.c));
      case 5: return cells.sort((a, b) => (Math.abs(a.r - centerR) + Math.abs(a.c - centerC)) - (Math.abs(b.r - centerR) + Math.abs(b.c - centerC)));
      case 6: return cells.sort((a, b) => (Math.abs(b.r - centerR) + Math.abs(b.c - centerC)) - (Math.abs(a.r - centerR) + Math.abs(a.c - centerC)));
      case 7: return cells.sort((a, b) => a.r - b.r || a.c - b.c);
      default: return cells;
    }
  }

  function resetBoard() {
    board.classList.remove("completed");
    panels.flat().forEach(panel => panel.classList.remove("on", "glitch", "scan", "message-on"));
  }

  function matrixLoad(patternType, done) {
    resetBoard();
    const cells = orderCells(patternType, false);

    cells.forEach((cell, i) => {
      setBoardTimer(() => {
        const panel = panels[cell.r]?.[cell.c];
        if (!panel) return;
        panel.classList.add(i % 2 ? "scan" : "glitch");
        setBoardTimer(() => panel.classList.remove("scan", "glitch"), 260);
      }, i * (patternType % 3 === 0 ? 13 : 18));
    });

    const duration = Math.min(2450, cells.length * (patternType % 3 === 0 ? 13 : 18) + 360);
    setBoardTimer(done, duration);
  }

  function revealCurrentPattern(patternType, done) {
    const cells = orderCells(patternType, true);
    cells.forEach((cell, i) => {
      setBoardTimer(() => {
        const panel = panels[cell.r]?.[cell.c];
        if (!panel) return;
        panel.classList.add("on");
        if (currentPhase === "message") panel.classList.add("message-on");
      }, i * (currentPhase === "message" ? 36 : 27));
    });
    const duration = cells.length * (currentPhase === "message" ? 36 : 27) + 840;
    setBoardTimer(() => {
      board.classList.add("completed");
      if (done) done();
    }, duration);
  }

  function showPhrase(text, phase, patternType, holdTime, done) {
    clearBoardTimers();
    const pattern = buildPattern(text);
    renderBoard(pattern, phase);
    matrixLoad(patternType, () => revealCurrentPattern(patternType, () => {
      setBoardTimer(done, holdTime);
    }));
  }

  function playBoardSequence() {
    const index = messageIndex % messages.length;
    const message = messages[index];

    showPhrase(nameText, "name", index, 3400, () => {
      showPhrase(message, "message", index + 3, 4300, () => {
        messageIndex = (messageIndex + 1) % messages.length;
        playBoardSequence();
      });
    });
  }

  board.addEventListener("click", () => {
    if (currentPhase === "message" && board.classList.contains("completed")) {
      document.getElementById("intro")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      messageIndex = (messageIndex + 1) % messages.length;
      playBoardSequence();
    }
  });

  board.addEventListener("dblclick", () => {
    messageIndex = 0;
    playBoardSequence();
  });

  window.addEventListener("resize", applyGridSize);
  window.addEventListener("orientationchange", () => setTimeout(applyGridSize, 120));

  setTimeout(playBoardSequence, 350);
}

const filterButtons = document.querySelectorAll(".filter-btn");
function applyProjectFilter(selected = "all") {
  document.querySelectorAll(".project-card[data-category]").forEach(card => {
    const show = selected === "all" || card.dataset.category === selected;
    card.classList.toggle("is-hidden", !show);
  });
}
filterButtons.forEach(button => {
  button.addEventListener("click", () => {
    const selected = button.dataset.filter;
    filterButtons.forEach(btn => btn.classList.toggle("active", btn === button));
    applyProjectFilter(selected);
  });
});

const revealItems = document.querySelectorAll(".section-card, .project-card, .timeline article, .club-grid > div, .contact");
if ("IntersectionObserver" in window) {
  revealItems.forEach(item => item.classList.add("reveal-ready"));
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("reveal-in");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });
  revealItems.forEach(item => observer.observe(item));
}
(function enablePixelInteractions() {
  const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  if (prefersReduced) return;

  function makeSpark(x, y, index) {
    const spark = document.createElement("span");
    spark.className = "pixel-spark";
    const angle = (Math.PI * 2 * index) / 8;
    const distance = 18 + Math.random() * 22;
    spark.style.left = `${x}px`;
    spark.style.top = `${y}px`;
    spark.style.setProperty("--spark-x", `${Math.cos(angle) * distance}px`);
    spark.style.setProperty("--spark-y", `${Math.sin(angle) * distance}px`);
    document.body.appendChild(spark);
    window.setTimeout(() => spark.remove(), 760);
  }

  document.addEventListener("pointerdown", event => {
    const interactive = event.target.closest("a, button, input, textarea, select");
    if (interactive) return;
    for (let i = 0; i < 8; i++) makeSpark(event.clientX, event.clientY, i);
  });

  document.querySelectorAll(".project-card").forEach(card => {
    card.addEventListener("pointermove", event => {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      card.classList.add("is-tilting");
      card.style.setProperty("--tilt-x", `${(x - 0.5) * 5}deg`);
      card.style.setProperty("--tilt-y", `${(0.5 - y) * 5}deg`);
      card.style.setProperty("--spot-x", `${x * 100}%`);
      card.style.setProperty("--spot-y", `${y * 100}%`);
    });
    card.addEventListener("pointerleave", () => {
      card.classList.remove("is-tilting");
      card.style.removeProperty("--tilt-x");
      card.style.removeProperty("--tilt-y");
      card.style.removeProperty("--spot-x");
      card.style.removeProperty("--spot-y");
    });
  });
})();
(function enableSkyInteractivity() {
  const bg = document.querySelector(".site-bg");
  if (!bg) return;
  const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  if (prefersReduced) return;

  let raf = null;
  function updateParallax(clientX, clientY) {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const x = (clientX / window.innerWidth - 0.5);
      const y = (clientY / window.innerHeight - 0.5);
      bg.style.setProperty("--px-slow", `${x * 7}px`);
      bg.style.setProperty("--py-slow", `${y * 5}px`);
      bg.style.setProperty("--px-mid", `${x * 13}px`);
      bg.style.setProperty("--py-mid", `${y * 9}px`);
    });
  }

  document.addEventListener("pointermove", event => {
    updateParallax(event.clientX, event.clientY);
  }, { passive: true });

  function makeMarker(x, y) {
    const marker = document.createElement("span");
    marker.className = "sky-marker";
    marker.style.left = `${x}px`;
    marker.style.top = `${y}px`;
    document.body.appendChild(marker);
    window.setTimeout(() => marker.remove(), 1850);
  }

  document.addEventListener("pointerdown", event => {
    const blocked = event.target.closest("a, button, input, textarea, select, .project-card");
    if (blocked) return;
    document.body.classList.add("sky-awake");
    makeMarker(event.clientX, event.clientY);
    window.setTimeout(() => document.body.classList.remove("sky-awake"), 1400);
  }, { passive: true });
})();

document.addEventListener("contextmenu", event => event.preventDefault());
document.addEventListener("selectstart", event => {
  if (!event.target.closest("input, textarea, select, [contenteditable='true']")) event.preventDefault();
});
document.addEventListener("keydown", event => {
  const key = event.key.toLowerCase();
  if (event.key === "F12" || (event.ctrlKey && event.shiftKey && ["i", "j", "c"].includes(key)) || (event.ctrlKey && key === "u")) {
    event.preventDefault();
    event.stopPropagation();
  }
});

(function enableRecordRoom() {
  const tracks = Array.isArray(window.RECORD_TRACKS) ? window.RECORD_TRACKS : [];
  const root = document.querySelector(".record-room");
  if (!root || !tracks.length) return;

  const player = new Audio();
  player.volume = 0.78;
  let selected = null;
  let activeEl = null;
  let filter = "all";

  const trackCount = document.getElementById("rrTrackCount");
  const albumOneCount = document.getElementById("rrAlbumOneCount");
  const albumTwoCount = document.getElementById("rrAlbumTwoCount");
  const myBin = document.getElementById("rrMyBin");
  const otherBin = document.getElementById("rrOtherBin");
  const wall = document.getElementById("rrWall");
  const record = document.getElementById("rrRecord");
  const arm = document.getElementById("rrArm");
  const label = document.getElementById("rrLabel");
  const nowTitle = document.getElementById("rrNowTitle");
  const nowMeta = document.getElementById("rrNowMeta");
  const bar = document.getElementById("rrBar");
  const queue = document.getElementById("rrQueue");
  const search = document.getElementById("rrSearch");
  const mainBinWrap = document.getElementById("rrMainBinWrap");
  const nameBinWrap = document.getElementById("rrNameBinWrap");
  const emptyMy = document.getElementById("rrEmptyMy");
  const emptyOther = document.getElementById("rrEmptyOther");
  const els = [];
  const countLabel = count => `${count} ${count === 1 ? "track" : "tracks"}`;

  if (trackCount) trackCount.textContent = tracks.length;
  if (albumOneCount) albumOneCount.textContent = countLabel(tracks.filter(t => t.section === "my").length);
  if (albumTwoCount) albumTwoCount.textContent = countLabel(tracks.filter(t => t.section === "other").length);

  function makeSleeve(t) {
    const el = document.createElement("button");
    el.className = "rr-sleeve";
    el.type = "button";
    el.dataset.section = t.section;
    el.dataset.search = `${t.title} ${t.artist} ${t.album}`.toLowerCase();
    el.innerHTML = `<div class="rr-cover" style="background-image:url('${t.cover}')"><div class="rr-tip"><b>${t.title}</b><span>${t.artist} · ${t.length}</span></div></div><span class="rr-sleeve-title">${t.title}</span><span class="rr-sleeve-meta"><span>${t.section === "my" ? "Album 1" : "Album 2"}</span><span>${t.length}</span></span>`;
    el.addEventListener("click", () => selectTrack(t, el, true));
    const pre = new Audio(t.audio);
    pre.preload = "auto";
    els.push(el);
    return el;
  }

  function makeWall(t) {
    const el = document.createElement("button");
    el.className = "rr-mini";
    el.type = "button";
    el.style.backgroundImage = `url('${t.cover}')`;
    el.setAttribute("aria-label", t.title);
    el.addEventListener("click", () => {
      const match = els.find(x => x.dataset.search.includes(t.title.toLowerCase()));
      selectTrack(t, match, true);
    });
    return el;
  }

  tracks.forEach((t, i) => {
    const sleeve = makeSleeve(t);
    (t.section === "my" ? myBin : otherBin).appendChild(sleeve);
    if (i < 8) wall.appendChild(makeWall(t));
  });

  function setActive(el) {
    root.querySelectorAll(".rr-sleeve").forEach(x => x.classList.remove("active"));
    if (el) {
      el.classList.add("active");
      activeEl = el;
    }
  }

  function showTrack(t) {
    label.textContent = t.title;
    label.style.backgroundImage = `url('${t.cover}')`;
    nowTitle.textContent = t.title;
    nowMeta.textContent = `${t.artist} · ${t.album} · ${t.length}`;
    const start = Math.max(0, tracks.findIndex(x => x.title === t.title));
    const next = tracks.concat(tracks).slice(start + 1, start + 5);
    queue.innerHTML = next.map(x => `<button class="rr-queue-item" type="button" data-title="${x.title}"><img src="${x.cover}" alt=""><span><b>${x.title}</b><span>${x.section === "my" ? "Album 1" : "Album 2"}</span></span></button>`).join("");
    queue.querySelectorAll("button").forEach(btn => btn.addEventListener("click", () => {
      const nextTrack = tracks.find(x => x.title === btn.dataset.title);
      const match = els.find(x => x.dataset.search.includes(nextTrack.title.toLowerCase()));
      selectTrack(nextTrack, match, true);
    }));
  }

  function selectTrack(t, el, autoplay) {
    selected = t;
    setActive(el);
    player.src = t.audio;
    player.currentTime = 0;
    showTrack(t);
    record.classList.add("spin");
    arm.classList.add("playing");
    if (autoplay) player.play().catch(() => {});
  }

  function stopAll() {
    player.pause();
    record.classList.remove("spin");
    arm.classList.remove("playing");
  }

  function playSelected() {
    if (!selected) {
      const first = tracks[0];
      const match = els.find(x => x.dataset.search.includes(first.title.toLowerCase()));
      selectTrack(first, match, true);
      return;
    }
    player.play().catch(() => {});
    record.classList.add("spin");
    arm.classList.add("playing");
  }

  function shufflePlay() {
    const visible = els.filter(el => el.style.display !== "none");
    const pool = visible.length ? visible : els;
    const el = pool[Math.floor(Math.random() * pool.length)];
    const t = tracks.find(x => el.dataset.search.includes(x.title.toLowerCase()));
    selectTrack(t, el, true);
  }

  function applyFilters() {
    const q = search.value.trim().toLowerCase();
    let myVisible = 0;
    let otherVisible = 0;
    els.forEach(el => {
      const sectionOk = filter === "all" || el.dataset.section === filter;
      const searchOk = !q || el.dataset.search.includes(q);
      const show = sectionOk && searchOk;
      el.style.display = show ? "block" : "none";
      if (show && el.dataset.section === "my") myVisible++;
      if (show && el.dataset.section === "other") otherVisible++;
    });
    mainBinWrap.style.display = filter === "other" ? "none" : "block";
    nameBinWrap.style.display = filter === "my" ? "none" : "block";
    emptyMy.style.display = myVisible ? "none" : "block";
    emptyOther.style.display = otherVisible ? "none" : "block";
  }

  document.getElementById("rrPlayBtn")?.addEventListener("click", playSelected);
  document.getElementById("rrStopBtn")?.addEventListener("click", stopAll);
  document.getElementById("rrShuffleBtn")?.addEventListener("click", shufflePlay);
  search?.addEventListener("input", applyFilters);

  root.querySelectorAll(".rr-tab").forEach(btn => btn.addEventListener("click", () => {
    root.querySelectorAll(".rr-tab").forEach(x => x.classList.remove("active"));
    btn.classList.add("active");
    filter = btn.dataset.filter;
    applyFilters();
  }));

  player.addEventListener("timeupdate", () => {
    const pct = player.duration ? Math.min(100, player.currentTime / player.duration * 100) : 0;
    bar.style.width = `${pct}%`;
  });

  player.addEventListener("ended", () => {
    record.classList.remove("spin");
    arm.classList.remove("playing");
  });

  applyFilters();
})();


(function renderGithubProjects() {
  const holder = document.getElementById("projectGrid");
  if (!holder) return;
  const projects = Array.isArray(window.GITHUB_PROJECTS) ? window.GITHUB_PROJECTS : [];
  if (!projects.length) return;

  const existing = new Set(
    Array.from(holder.querySelectorAll(".project-card h3"))
      .map(el => normalizeProjectName(el.textContent))
  );

  const clean = projects.filter(project => {
    const key = normalizeProjectName(project.title || project.repo || "");
    return key && !existing.has(key);
  });

  if (!clean.length) return;
  holder.insertAdjacentHTML("beforeend", clean.map(project => {
    const title = escapeHtml(project.title || project.repo || "GitHub Project");
    const desc = escapeHtml(project.description || "Updated from GitHub README.");
    const repo = escapeHtml(project.repo || "GitHub Repo");
    const url = escapeHtml(project.url || "#");
    return `<article class="project-card github-card" data-category="GitHub">
      <div class="project-tag">GitHub</div>
      <h3>${title}</h3>
      <p>${desc}</p>
      <p class="links"><a href="${url}" target="_blank" rel="noopener">View Repo: ${repo}</a></p>
    </article>`;
  }).join(""));

  const active = document.querySelector(".filter-btn.active")?.dataset.filter || "all";
  applyProjectFilter(active);
})();

function normalizeProjectName(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  }[char]));
}
