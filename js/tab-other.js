const CALENDAR_API_URL = "https://api.ennead.cc/mihoyo/genshin/calendar";
let bannersInitialized = false;
let bannersCache = null;
function activateOtherTab() {
  activateBannersPanel();
  loadEndgameResets();
  loadEvents();
  activateCodesPanel();
}
let endgameResetsInitialized = false;
function loadEndgameResets() {
  const panel = document.getElementById("endgameResetsBody");
  if (!panel || endgameResetsInitialized) return;
  endgameResetsInitialized = true;
  panel.innerHTML = `<div class="explanation">Loading reset info\u2026</div>`;
  fetch(CALENDAR_API_URL).then((res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }).then((data) => {
    const challenges = (Array.isArray(data.challenges) ? data.challenges : []).filter((c) => c.special_reward && c.special_reward.amount > 0).sort((a, b) => (a.end_time || 0) - (b.end_time || 0));
    if (!challenges.length) {
      panel.innerHTML = `<div class="explanation">No reset data available right now.</div>`;
      return;
    }
    const esc = (s) => String(s || "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
    const fmtDate = (unix) => unix ? new Date(unix * 1e3).toLocaleDateString(void 0, { month: "short", day: "numeric" }) : "?";
    panel.innerHTML = challenges.map((c) => `
                <div class="reset-row">
                    <div>
                        <div class="reset-row-name">${esc(c.name)}</div>
                        <div class="reset-row-date">Resets ${fmtDate(c.end_time)}</div>
                    </div>
                    <div class="reset-row-reward">+${c.special_reward.amount}</div>
                </div>
            `).join("");
  }).catch(() => {
    endgameResetsInitialized = false;
    panel.innerHTML = `<div class="explanation">Couldn't load reset info right now \u2014 the calendar source might be down. Try again in a bit.</div>`;
  });
}
let eventsInitialized = false;
function loadEvents() {
  const panel = document.getElementById("eventsPanel");
  if (!panel || eventsInitialized) return;
  eventsInitialized = true;
  panel.innerHTML = `<div class="explanation">Loading events\u2026</div>`;
  fetch(CALENDAR_API_URL).then((res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }).then((data) => {
    const events = (Array.isArray(data.events) ? data.events : []).filter((e) => e.start_time > 0 && e.end_time > 0).sort((a, b) => (a.end_time || 0) - (b.end_time || 0));
    if (!events.length) {
      panel.innerHTML = `<div class="explanation">No live events right now.</div>`;
      return;
    }
    const esc = (s) => String(s || "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
    const fmtDate = (unix) => unix ? new Date(unix * 1e3).toLocaleDateString(void 0, { month: "short", day: "numeric" }) : "?";
    panel.innerHTML = events.map((e) => `
                <div class="reset-row">
                    <div>
                        <div class="reset-row-name">${esc(e.name)}</div>
                        <div class="reset-row-date">Ends ${fmtDate(e.end_time)}</div>
                    </div>
                    ${e.special_reward && e.special_reward.id === 201 && e.special_reward.amount > 0 ? `<div class="reset-row-reward">+${e.special_reward.amount}</div>` : ""}
                </div>
            `).join("");
  }).catch(() => {
    eventsInitialized = false;
    panel.innerHTML = `<div class="explanation">Couldn't load events right now \u2014 the calendar source might be down. Try again in a bit.</div>`;
  });
}
function activateBannersPanel() {
  const panel = document.getElementById("bannersPanel");
  if (!panel) return;
  if (bannersCache) {
    renderBanners(bannersCache);
    return;
  }
  if (bannersInitialized) return;
  bannersInitialized = true;
  panel.innerHTML = `<div class="explanation">Loading current banners\u2026</div>`;
  fetch(CALENDAR_API_URL).then((res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }).then((data) => {
    const banners = Array.isArray(data.banners) ? data.banners : [];
    bannersCache = banners;
    renderBanners(banners);
  }).catch(() => {
    bannersInitialized = false;
    panel.innerHTML = `<div class="explanation">Couldn't load banners right now \u2014 the calendar source might be down. Try again in a bit.</div>`;
  });
}
function renderBanners(banners) {
  const panel = document.getElementById("bannersPanel");
  if (!panel) return;
  const active = banners.filter((b) => b.characters && b.characters.length || b.weapons && b.weapons.length);
  if (!active.length) {
    panel.innerHTML = `<div class="explanation">No active banners right now \u2014 check back later.</div>`;
    return;
  }
  const esc = (s) => String(s || "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
  const fmtDate = (unix) => unix ? new Date(unix * 1e3).toLocaleDateString(void 0, { month: "short", day: "numeric" }) : "?";
  panel.innerHTML = active.map((b) => {
    const units = [...b.characters || [], ...b.weapons || []];
    const unitHtml = units.map((u) => {
      const rarityClass = u.rarity === 5 ? "r5" : "r4";
      const icon = u.icon ? `<img src="${u.icon}" alt="" loading="lazy">` : `<div class="ac-icon-placeholder">?</div>`;
      return `
                <div class="banner-unit ${rarityClass}">
                    ${icon}
                    <div class="banner-unit-name">${esc(u.name)}</div>
                </div>
            `;
    }).join("");
    return `
            <div class="banner-card">
                <div class="banner-card-header">
                    <div class="banner-card-title">${esc(b.name)}${b.version ? ` <span style="color: var(--text-muted); font-weight:400;">v${esc(b.version)}</span>` : ""}</div>
                    <div class="banner-card-dates">${fmtDate(b.start_time)} \u2013 ${fmtDate(b.end_time)}</div>
                </div>
                <div class="banner-card-units">${unitHtml}</div>
            </div>
        `;
  }).join("");
}
const CODES_API_URL = "https://db.hashblen.com/codes";
const CODES_REDEEM_BASE = "https://genshin.hoyoverse.com/en/gift?code=";
let codesInitialized = false;
let codesCache = null;
function activateCodesPanel() {
  const panel = document.getElementById("codesPanel");
  if (!panel) return;
  if (codesCache) {
    renderCodes(codesCache);
    return;
  }
  if (codesInitialized) return;
  codesInitialized = true;
  panel.innerHTML = `<div class="explanation">Loading current codes\u2026</div>`;
  fetch(CODES_API_URL).then((res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }).then((data) => {
    const codes = Array.isArray(data.genshin) ? data.genshin : [];
    codesCache = codes;
    renderCodes(codes);
  }).catch(() => {
    codesInitialized = false;
    panel.innerHTML = `<div class="explanation">Couldn't load codes right now \u2014 the tracker might be down. Try again in a bit, or check <a href="https://genshin.hoyoverse.com/en/gift" target="_blank" rel="noopener">the official redeem page</a> directly.</div>`;
  });
}
function renderCodes(codes) {
  const panel = document.getElementById("codesPanel");
  if (!panel) return;
  if (!codes.length) {
    panel.innerHTML = `<div class="explanation">No active codes right now \u2014 check back later.</div>`;
    return;
  }
  const sorted = codes.slice().sort((a, b) => (b.added_at || 0) - (a.added_at || 0));
  const esc = (s) => String(s || "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
  panel.innerHTML = sorted.map((c, i) => `
        <div class="codes-row">
            <div>
                <span class="codes-code">${esc(c.code)}</span>
                ${c.description ? `<div class="explanation" style="margin-top:6px;">${esc(c.description)}</div>` : ""}
            </div>
            <div class="codes-actions">
                <a class="codes-claim-link" href="${CODES_REDEEM_BASE}${encodeURIComponent(c.code)}" target="_blank" rel="noopener">Claim</a>
                <button type="button" class="codes-copy-btn" data-code="${esc(c.code)}" data-idx="${i}">Copy</button>
            </div>
        </div>
    `).join("");
  panel.querySelectorAll(".codes-copy-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const code = btn.dataset.code;
      navigator.clipboard.writeText(code).then(() => {
        const original = btn.textContent;
        btn.textContent = "Copied!";
        btn.classList.add("copied");
        setTimeout(() => {
          btn.textContent = original;
          btn.classList.remove("copied");
        }, 1500);
      });
    });
  });
}
