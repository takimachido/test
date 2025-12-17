const API_BASE = "https://flashscreener-backend.onrender.com";
const RANKING_ENDPOINT = `${API_BASE}/ranking`;
const BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const RECENT_SEARCH_KEY = "fs_recent_tokens_v1";

let TOKENS = [];
let VERIFIED_MINTS = null;
let SOL_PRICE_USD = null;
let FLASH_PRICE_USD = null;

const fmtUSD = (n) => {
  if (n === null || n === undefined || isNaN(n)) return "--";
  return (
    "$" +
    Number(n).toLocaleString("en-US", {
      maximumFractionDigits: 2
    })
  );
};

const fmtCompactUSD = (n) => {
  if (n === null || n === undefined || isNaN(n)) return "--";
  const abs = Math.abs(Number(n));
  if (abs >= 1000000000) return "$" + (abs / 1000000000).toFixed(1) + "B";
  if (abs >= 1000000) return "$" + (abs / 1000000).toFixed(1) + "M";
  if (abs >= 1000) return "$" + (abs / 1000).toFixed(1) + "k";
  return "$" + abs.toFixed(2);
};

const fmtPrice = (n) => {
  if (n === null || n === undefined || isNaN(n)) return "--";
  const value = Number(n);
  if (value >= 1) {
    return (
      "$" +
      value.toLocaleString("en-US", {
        maximumFractionDigits: 4
      })
    );
  }
  return (
    "$" +
    value.toLocaleString("en-US", {
      minimumFractionDigits: 6,
      maximumFractionDigits: 6
    })
  );
};

const fmtPercent = (n) => {
  if (n === null || n === undefined || isNaN(n)) return "--";
  const v = Number(n);
  const rounded = Math.round(v * 100) / 100;
  return (v > 0 ? "+" : "") + String(rounded) + "%";
};

const fmtPoolAge = (createdAt) => {
  if (!createdAt) return "--";
  const ts = Date.parse(createdAt);
  if (Number.isNaN(ts)) return "--";
  const diffMs = Date.now() - ts;
  if (diffMs <= 0) return "0m";
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days >= 1) return `${days}d`;
  if (hours >= 1) return `${hours}h`;
  return `${Math.max(1, minutes)}m`;
};

const normalizeDexSlug = (dexRaw) => {
  if (!dexRaw) return null;
  const s = String(dexRaw).toLowerCase();
  if (s.includes("raydium")) return "raydium";
  if (s.includes("meteora")) return "meteora";
  if (s.includes("orca")) return "orca";
  if (s.includes("jupiter")) return "jupiter";
  if (s.includes("pump")) return "pumpfun";
  return s;
};

const normalizeToken = (raw, index) => {
  const dexSlug = normalizeDexSlug(
    raw.dex ||
      raw.dex_id ||
      raw.dex_type ||
      raw.dex_name ||
      raw.exchange ||
      null
  );
  return {
    rank: raw.rank ?? index + 1,
    mint: raw.mint ?? raw.address ?? null,
    name: raw.name ?? raw.token_name ?? "Unknown",
    symbol: raw.symbol ?? raw.token_symbol ?? "",
    logoUrl: raw.logo_url ?? raw.image ?? null,
    marketcapUsd: raw.marketcap_usd ?? raw.fdv_usd ?? null,
    priceUsd: raw.price_usd ?? raw.base_price_usd ?? null,
    liquidityUsd: raw.liquidity_usd ?? raw.reserve_usd ?? null,
    volume5mUsd: raw.volume_5m_usd ?? raw.volume_usd_5m ?? null,
    volume1hUsd: raw.volume_1h_usd ?? raw.volume_usd_1h ?? null,
    volume6hUsd: raw.volume_6h_usd ?? raw.volume_usd_6h ?? null,
    volume24hUsd: raw.volume_24h_usd ?? raw.volume_usd_24h ?? null,
    priceChange5m: raw.price_change_5m ?? null,
    priceChange1h: raw.price_change_1h ?? null,
    priceChange6h: raw.price_change_6h ?? null,
    priceChange24h: raw.price_change_24h ?? null,
    dex: dexSlug,
    createdAt: raw.created_at || raw.createdAt || null
  };
};

const volumeChangeClass = (n) => {
  if (n === null || n === undefined || isNaN(n)) return "vol-change-neutral";
  return Number(n) >= 0 ? "vol-change-up" : "vol-change-down";
};

const loadVerifiedMints = async () => {
  if (VERIFIED_MINTS) return VERIFIED_MINTS;
  try {
    const res = await fetch(`${API_BASE}/api/registry`);
    if (!res.ok) {
      VERIFIED_MINTS = new Set();
      return VERIFIED_MINTS;
    }
    const js = await res.json();
    const set = new Set();
    (js.data || []).forEach((e) => {
      if (!e.mint) return;
      set.add(String(e.mint).trim());
    });
    VERIFIED_MINTS = set;
    return set;
  } catch {
    VERIFIED_MINTS = new Set();
    return VERIFIED_MINTS;
  }
};

const renderTable = (list, verifiedSet) => {
  const tbody = document.querySelector(".table-body");
  if (!tbody) return;
  const vset = verifiedSet || new Set();
  tbody.innerHTML = "";
  list.forEach((t, idx) => {
    const isVerified = t.mint && vset.has(t.mint);
    const verifiedHtml = isVerified
      ? `<span class="badge-verified" title="Verified by FlashScreener"></span>`
      : "";
    const row = document.createElement("div");
    row.className = "token-row";
    row.dataset.mint = t.mint || "";
    row.innerHTML = `
      <div class="col col-rank">#${t.rank ?? idx + 1}</div>
      <div class="col col-token">
        <div class="token-avatar"${
          t.logoUrl
            ? ` style="background-image:url('${t.logoUrl}');background-size:cover;background-position:center"`
            : ""
        }></div>
        <div class="token-text">
          <div class="token-name">${t.name}${verifiedHtml}</div>
          <div class="token-ticker">${t.symbol ? "$" + t.symbol : ""}</div>
        </div>
      </div>
      <div class="col col-mcap">
        <div class="mcap-value">${fmtCompactUSD(t.marketcapUsd)}</div>
        <div class="mcap-change ${volumeChangeClass(
          t.priceChange24h
        )}">${fmtPercent(t.priceChange24h)}</div>
      </div>
      <div class="col col-vol">
        <div class="vol-value">${fmtCompactUSD(t.volume24hUsd)}</div>
      </div>
      <div class="col col-vol">
        <div class="vol-value">${fmtCompactUSD(t.volume6hUsd)}</div>
      </div>
      <div class="col col-vol">
        <div class="vol-value">${fmtCompactUSD(t.volume1hUsd)}</div>
      </div>
      <div class="col col-vol">
        <div class="vol-value">${fmtCompactUSD(t.volume5mUsd)}</div>
      </div>
      <div class="col col-price">${fmtPrice(t.priceUsd)}</div>
      <div class="col col-liq">
        <span class="liq-value">${fmtCompactUSD(t.liquidityUsd)}</span>
        ${
          t.dex
            ? `<img class="dex-icon" src="img/${t.dex}.png" alt="${t.dex}">`
            : ""
        }
      </div>
      <div class="col col-age">${fmtPoolAge(t.createdAt)}</div>
    `;
    row.addEventListener("click", () => {
      if (!t.mint) return;
      const url = `https://www.flashscreener.com/solana/?ca=${encodeURIComponent(
        t.mint
      )}`;
      window.location.href = url;
    });
    tbody.appendChild(row);
  });
};

function getRecentSearches() {
  try {
    const raw = localStorage.getItem(RECENT_SEARCH_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr;
  } catch {
    return [];
  }
}

function saveRecentSearch(meta) {
  if (!meta || !meta.mint) return;
  const current = getRecentSearches().filter((t) => t.mint !== meta.mint);
  current.unshift({
    mint: meta.mint,
    symbol: meta.symbol || "",
    logo: meta.logo || ""
  });
  const sliced = current.slice(0, 5);
  try {
    localStorage.setItem(RECENT_SEARCH_KEY, JSON.stringify(sliced));
  } catch {}
}

function renderRecentSearches(container) {
  if (!container) return;
  const items = getRecentSearches();
  if (!items.length) {
    container.innerHTML = "";
    container.style.display = "none";
    return;
  }
  const html = items
    .map(
      (item) =>
        `<button class="search-history-item" data-mint="${item.mint}">
          <span class="search-history-logo">
            ${
              item.logo
                ? `<img src="${item.logo}" alt="${item.symbol || ""}">`
                : `<span class="search-history-placeholder"></span>`
            }
          </span>
          <span class="search-history-symbol">${item.symbol || "TOKEN"}</span>
        </button>`
    )
    .join("");
  container.innerHTML = html;
  container.style.display = "flex";
}

async function markSearchItemVerified(mint, itemEl) {
  if (!mint || !itemEl) return;
  try {
    const url = `${API_BASE}/api/registry/${encodeURIComponent(mint)}`;
    const res = await fetch(url);
    if (!res.ok) return;
    const js = await res.json();
    const entry = js && js.data ? js.data : null;
    if (!entry || !entry.verified_at) return;
    const badge = itemEl.querySelector(".search-badge");
    if (badge) {
      badge.classList.remove("fs-hidden");
      badge.title = `Verified by FlashScreener on ${entry.verified_at}`;
    }
  } catch {}
}

function setupSearch() {
  const searchWrapper = document.querySelector(".search-wrapper");
  const searchInput = document.querySelector(".search-input");
  let searchTimeout = null;
  if (!searchWrapper || !searchInput) return;

  let dropdown = document.getElementById("search-results");
  if (!dropdown) {
    dropdown = document.createElement("div");
    dropdown.id = "search-results";
    searchWrapper.appendChild(dropdown);
  }

  let historyContainer = document.getElementById("search-history");
  let liveContainer = document.getElementById("search-live-results");

  if (!historyContainer) {
    historyContainer = document.createElement("div");
    historyContainer.id = "search-history";
    dropdown.appendChild(historyContainer);
  }

  if (!liveContainer) {
    liveContainer = document.createElement("div");
    liveContainer.id = "search-live-results";
    dropdown.appendChild(liveContainer);
  }

  function goToCA(ca) {
    const clean = ca.trim();
    if (!BASE58_RE.test(clean)) return;
    window.location.href = `https://www.flashscreener.com/solana/?ca=${clean}`;
  }

  function renderSearchResults(tokens) {
    liveContainer.innerHTML = "";
    if (!tokens || !tokens.length) {
      liveContainer.innerHTML =
        '<div class="search-item-info" style="padding:10px;color:#aaa">No results</div>';
      return;
    }
    tokens.forEach((item) => {
      const id = item.id;
      const ca = id.replace("solana_", "");
      const att = item.attributes || {};
      const img = att.image_url;
      const name = att.name || "Unknown";
      const symbol = att.symbol || "---";
      const mint = att.address || ca;
      const el = document.createElement("div");
      el.classList.add("search-item");
      el.innerHTML = `
        <img src="${img}" onerror="this.src='https://via.placeholder.com/26'"/>
        <div class="search-item-info">
          <div class="search-item-header">
            <div class="search-item-name">${name}</div>
            <img
              src="img/badge.png"
              alt="Verified by FlashScreener"
              class="search-badge fs-hidden"
            />
          </div>
          <div class="search-item-symbol">${symbol}</div>
        </div>`;
      el.onclick = () => {
        saveRecentSearch({
          mint,
          symbol,
          logo: img
        });
        goToCA(ca);
      };
      liveContainer.appendChild(el);
      markSearchItemVerified(mint, el);
    });
  }

  async function autoSearch(q) {
    try {
      const url = `${API_BASE}/api/search?q=${encodeURIComponent(q)}`;
      const r = await fetch(url);
      const js = await r.json();
      historyContainer.style.display = "none";
      renderSearchResults(js.data || []);
      dropdown.style.display = "block";
    } catch {}
  }

  async function autoSearchAndGo(q) {
    try {
      const url = `${API_BASE}/api/search?q=${encodeURIComponent(q)}`;
      const r = await fetch(url);
      const js = await r.json();
      if (!js.data || js.data.length === 0) {
        alert("Token not found.");
        return;
      }
      const first = js.data[0];
      const id = first.id;
      const ca = id.replace("solana_", "");
      const att = first.attributes || {};
      const mint = att.address || ca;
      const symbol = att.symbol || "";
      const img = att.image_url || "";
      saveRecentSearch({
        mint,
        symbol,
        logo: img
      });
      goToCA(ca);
    } catch {
      alert("Error searching token.");
    }
  }

  searchInput.addEventListener("focus", () => {
    if (!searchInput.value.trim()) {
      renderRecentSearches(historyContainer);
      const hasItems = getRecentSearches().length > 0;
      dropdown.style.display = hasItems ? "block" : "none";
      liveContainer.innerHTML = "";
    }
  });

  searchInput.addEventListener("input", () => {
    const q = searchInput.value.trim();
    if (!q) {
      clearTimeout(searchTimeout);
      liveContainer.innerHTML = "";
      renderRecentSearches(historyContainer);
      const hasItems = getRecentSearches().length > 0;
      dropdown.style.display = hasItems ? "block" : "none";
      return;
    }
    historyContainer.style.display = "none";
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => autoSearch(q), 250);
  });

  searchInput.addEventListener("keyup", (e) => {
    if (e.key === "Enter") {
      const q = searchInput.value.trim();
      if (!q) return;
      if (BASE58_RE.test(q)) {
        goToCA(q);
        return;
      }
      autoSearchAndGo(q);
    }
  });

  historyContainer.addEventListener("click", (e) => {
    const btn = e.target.closest(".search-history-item");
    if (!btn) return;
    const mint = btn.getAttribute("data-mint");
    if (!mint) return;
    goToCA(mint);
  });

  document.addEventListener("click", (e) => {
    const dropdownEl = document.getElementById("search-results");
    if (!dropdownEl) return;
    if (!dropdownEl.contains(e.target) && e.target !== searchInput) {
      dropdownEl.style.display = "none";
    }
  });
}

const setSolPill = (price) => {
  const pill = document.getElementById("sol-pill");
  if (!pill) return;
  if (price === null || price === undefined || isNaN(price)) {
    pill.textContent = "SOL --";
    return;
  }
  const n = Number(price);
  pill.textContent = "SOL $" + n.toFixed(2);
};

const setFlashPill = (price) => {
  const pill = document.getElementById("flash-pill");
  if (!pill) return;
  if (price === null || price === undefined || isNaN(price)) {
    pill.textContent = "FLASH --";
    return;
  }

  const n = Number(price);

  if (n >= 0.01) {
    pill.textContent = "FLASH $" + n.toFixed(4);
    return;
  }

  const s = n.toFixed(12);
  const parts = s.split(".");
  if (parts.length !== 2) {
    pill.textContent = "FLASH $" + n.toString();
    return;
  }

  let dec = parts[1].replace(/0+$/, "");
  if (!dec) {
    pill.textContent = "FLASH $" + n.toString();
    return;
  }

  const match = dec.match(/^0+/);
  if (!match) {
    pill.textContent = "FLASH $" + n.toString();
    return;
  }

  const zeros = match[0].length;
  let rest = dec.slice(zeros) || "0";
  rest = rest.slice(0, 2);

  pill.innerHTML = `FLASH $0.0<span class="flash-zeros-count">${zeros}</span>${rest}`;
};

const fetchRanking = async () => {
  try {
    const res = await fetch(RANKING_ENDPOINT);
    if (!res.ok) throw new Error("failed");
    const data = await res.json();
    let items = [];
    if (Array.isArray(data)) {
      SOL_PRICE_USD = null;
      FLASH_PRICE_USD = null;
      items = data;
    } else {
      SOL_PRICE_USD =
        typeof data.sol_price_usd === "number"
          ? data.sol_price_usd
          : Number(data.sol_price_usd);
      FLASH_PRICE_USD =
        typeof data.flash_price_usd === "number"
          ? data.flash_price_usd
          : Number(data.flash_price_usd);
      if (Number.isNaN(FLASH_PRICE_USD)) {
        FLASH_PRICE_USD = null;
      }
      items = Array.isArray(data.items) ? data.items : [];
    }
    setSolPill(SOL_PRICE_USD);
    setFlashPill(FLASH_PRICE_USD);
    TOKENS = items.map((item, index) => normalizeToken(item, index));
    return TOKENS;
  } catch {
    SOL_PRICE_USD = null;
    FLASH_PRICE_USD = null;
    setSolPill(SOL_PRICE_USD);
    setFlashPill(FLASH_PRICE_USD);
    TOKENS = [
      {
        rank: 1,
        mint: "So11111111111111111111111111111111111111112",
        name: "Sample Token",
        symbol: "SAMPLE",
        logoUrl: null,
        marketcapUsd: 69000000,
        priceUsd: 0.123456,
        liquidityUsd: 1000000,
        volume5mUsd: 500000,
        volume1hUsd: 2000000,
        volume6hUsd: 8000000,
        volume24hUsd: 20000000,
        priceChange5m: 1.23,
        priceChange1h: -0.5,
        priceChange6h: 3.4,
        priceChange24h: 10.2,
        dex: null,
        createdAt: null
      }
    ];
    return TOKENS;
  }
};

const init = async () => {
  const [verifiedSet, list] = await Promise.all([
    loadVerifiedMints(),
    fetchRanking()
  ]);
  renderTable(list, verifiedSet);
  setupSearch();

  const flashPill = document.getElementById("flash-pill");
  if (flashPill) {
    flashPill.addEventListener("click", () => {
      window.location.href =
        "https://www.flashscreener.com/solana/?ca=H9BkzwHKyBAnKmaxuLPKKRZGu8whbigdhhqQVkRapump";
    });
  }
};

document.addEventListener("DOMContentLoaded", init);
