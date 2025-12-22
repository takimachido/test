(() => {
  const root = document.getElementById("pm-strip");
  if (!root) return;

  const pickBackend = () => {
    const attr =
      root.getAttribute("data-pm-backend") ||
      (root.dataset ? root.dataset.pmBackend : "") ||
      "";
    const win = typeof window !== "undefined" ? window.PM_BACKEND : "";
    const env = String(win || attr || "").trim();
    if (env) return env.replace(/\/+$/, "");
    if (String(location.hostname || "").endsWith("github.io")) return "https://prediction-backend-r0vj.onrender.com";
    return "";
  };

  const BACKEND_BASE = pickBackend();
  const join = (b, p) => (b ? b + p : p);

  const fmtVolAbbrev = (n) => {
    const v = Number(n);
    if (!Number.isFinite(v) || v <= 0) return "$0";
    const abs = Math.abs(v);
    const f = (x) => String(x).replace(/\.0$/, "");
    if (abs >= 1e9) return "$" + f((v / 1e9).toFixed(1)) + "B";
    if (abs >= 1e6) return "$" + f((v / 1e6).toFixed(1)) + "M";
    if (abs >= 1e3) return "$" + f((v / 1e3).toFixed(1)) + "k";
    return "$" + Math.floor(v).toLocaleString();
  };

  const fmtVolFull = (n) => {
    const v = Number(n);
    if (!Number.isFinite(v) || v <= 0) return "--";
    return "$" + Math.floor(v).toLocaleString("en-US");
  };

  const toNum = (v) => {
    const n = typeof v === "string" ? Number(v) : v;
    return Number.isFinite(n) ? n : null;
  };

  const clampPct = (n) => {
    if (n === null) return null;
    const x = Math.round(n);
    return Math.max(0, Math.min(100, x));
  };

  const centsFromMaybe = (v) => {
    const n = toNum(v);
    if (n === null) return null;
    if (n <= 1) return clampPct(n * 100);
    return clampPct(n);
  };

  const priceCentsFromMarket = (m) => {
    const yb = centsFromMaybe(m?.yesBid ?? m?.yes_bid);
    const ya = centsFromMaybe(m?.yesAsk ?? m?.yes_ask);
    if (yb !== null && ya !== null) return clampPct((yb + ya) / 2);
    if (yb !== null) return yb;
    if (ya !== null) return ya;

    const nb = centsFromMaybe(m?.noBid ?? m?.no_bid);
    const na = centsFromMaybe(m?.noAsk ?? m?.no_ask);
    if (nb !== null && na !== null) return clampPct(100 - (nb + na) / 2);
    if (nb !== null) return clampPct(100 - nb);
    if (na !== null) return clampPct(100 - na);

    return null;
  };

  const payoutFromPct = (p) => {
    const n = Number(p);
    if (!Number.isFinite(n) || n <= 0) return null;
    const x = Math.round(10000 / n);
    if (!Number.isFinite(x) || x <= 0) return null;
    return x;
  };

  const iconStyle = (url) =>
    url
      ? `background-image:url('${url}');background-size:cover;background-position:center;`
      : `background:#f3f4f6;`;

  const drawChart = (outcomeCount) => {
    const width = 600;
    const height = 250;

    const createPath = (index) => {
      let points = [];
      let start = index === 0 ? 55 : 30 - index * 10;

      for (let i = 0; i < 15; i++) {
        start += (Math.random() - 0.5) * 10;
        points.push(Math.max(2, Math.min(98, start)));
      }

      let d = `M 0 ${height - (points[0] / 100) * height}`;
      points.forEach((p, i) => {
        const x = (i / (points.length - 1)) * width;
        const y = height - (p / 100) * height;
        d += ` L ${x} ${y}`;
      });

      return d;
    };

    const colors = ["#00d293", "#3b82f6", "#9ca3af"];
    let pathsHtml = "";

    for (let i = 0; i < Math.max(1, outcomeCount); i++) {
      const d = createPath(i);
      const color = colors[i] || "#999";
      if (i === 0) {
        pathsHtml += `
          <defs>
            <linearGradient id="grad-main" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="${color}" stop-opacity="0.2"/>
              <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
            </linearGradient>
          </defs>
          <path d="${d} L ${width} ${height} L 0 ${height} Z" fill="url(#grad-main)"></path>
          <path d="${d}" fill="none" stroke="${color}" stroke-width="3"></path>
        `;
      } else {
        pathsHtml += `<path d="${d}" fill="none" stroke="${color}" stroke-width="2"></path>`;
      }
    }

    return `
      <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" style="width:100%;height:100%;">
        <line x1="0" y1="${height * 0.25}" x2="${width}" y2="${height * 0.25}" stroke="#f0f0f0" stroke-width="1" stroke-dasharray="4"/>
        <line x1="0" y1="${height * 0.5}" x2="${width}" y2="${height * 0.5}" stroke="#f0f0f0" stroke-width="1" stroke-dasharray="4"/>
        <line x1="0" y1="${height * 0.75}" x2="${width}" y2="${height * 0.75}" stroke="#f0f0f0" stroke-width="1" stroke-dasharray="4"/>
        ${pathsHtml}
      </svg>
    `;
  };

  const CRYPTO_RE =
    /\b(CRYPTO|CRYPTOCURRENCY|BITCOIN|BTC|ETHEREUM|ETH|SOLANA|\bSOL\b|DOGE|XRP|BNB|AVAX|ADA|USDT|USDC|STABLECOIN|DEFI|BLOCKCHAIN|NFT|ALTCOIN|MEME|COINBASE|BINANCE)\b/i;

  const isCryptoEvent = (evt) => {
    const s = `${evt?.title || ""} ${evt?.ticker || ""} ${(evt?.subtitle || "")}`;
    return CRYPTO_RE.test(s);
  };

  const normalizeEvent = (evt) => {
    const img = evt?.image_url ?? evt?.imageUrl ?? evt?.image ?? null;

    if (Array.isArray(evt?.outcomes)) {
      const outs = evt.outcomes
        .map((o) => {
          const name = (o?.name && String(o.name).trim()) || "Yes";
          const price = clampPct(centsFromMaybe(o?.price));
          return {
            name,
            price,
            volume: toNum(o?.volume) ?? 0,
            ticker: o?.ticker || "",
            image_url: o?.image_url || null
          };
        })
        .filter((o) => o.ticker || o.name);

      outs.sort((a, b) => (b.price ?? -1) - (a.price ?? -1));

      return {
        ticker: evt?.ticker || "",
        title: evt?.title || "",
        subtitle: evt?.subtitle || "",
        volume: toNum(evt?.volume) ?? 0,
        volume24h: toNum(evt?.volume24h) ?? 0,
        image_url: img,
        outcomes: outs.slice(0, 3)
      };
    }

    const markets = Array.isArray(evt?.markets) ? evt.markets : [];
    const outcomes = markets
      .map((m) => {
        const name =
          (m?.subtitle && String(m.subtitle).trim()) ||
          (m?.yesSubTitle && String(m.yesSubTitle).trim()) ||
          (m?.title && String(m.title).trim()) ||
          "Yes";
        const price = priceCentsFromMarket(m);
        return {
          name,
          price,
          volume: toNum(m?.volume) ?? 0,
          ticker: m?.ticker || "",
          image_url: null
        };
      })
      .filter((o) => o.ticker || o.name);

    outcomes.sort((a, b) => (b.price ?? -1) - (a.price ?? -1));

    return {
      ticker: evt?.ticker || "",
      title: evt?.title || "",
      subtitle: evt?.subtitle || "",
      volume: toNum(evt?.volume) ?? 0,
      volume24h: toNum(evt?.volume24h) ?? 0,
      image_url: img,
      outcomes: outcomes.slice(0, 3)
    };
  };

  const fetchJson = async (url) => {
    const r = await fetch(url, { headers: { Accept: "application/json" } });
    if (!r.ok) throw new Error(String(r.status));
    return r.json();
  };

  const fetchBundle = async () => {
    const url = join(BACKEND_BASE, "/kalshi-markets");
    const data = await fetchJson(url);
    const marketsRaw = Array.isArray(data?.markets) ? data.markets : [];
    const cryptoRaw = Array.isArray(data?.crypto) ? data.crypto : [];
    const markets = marketsRaw.map(normalizeEvent).filter((e) => e.title && e.outcomes.length);
    const crypto = cryptoRaw.map(normalizeEvent).filter((e) => e.title && e.outcomes.length);
    return { markets, crypto };
  };

  function ensureSideMarkup() {
    const sideWidget = document.getElementById("pmSideWidget");
    if (!sideWidget) return null;

    let slides = document.getElementById("pmSideSlides");
    let dots = document.getElementById("pmSideDots");

    if (!slides || !dots) {
      sideWidget.innerHTML = `
        <div class="pm-side-carousel" id="pmSideCarousel">
          <div class="pm-side-slides" id="pmSideSlides"></div>
          <div class="pm-side-dots" id="pmSideDots"></div>
        </div>
      `;
      slides = document.getElementById("pmSideSlides");
      dots = document.getElementById("pmSideDots");
    }

    return { slides, dots };
  }

  const getYesNoFromEvent = (evt) => {
    const outcomes = Array.isArray(evt?.outcomes) ? evt.outcomes : [];
    const top = outcomes[0] || null;
    const p = top?.price ?? null;
    if (p === null) return { yesPct: null, noPct: null, marketTicker: top?.ticker || "" };
    return { yesPct: p, noPct: Math.max(0, 100 - p), marketTicker: top?.ticker || "" };
  };

  function setSideEmpty(msg) {
    const ensured = ensureSideMarkup();
    if (!ensured) return;
    ensured.slides.innerHTML = `<div class="pm-side-empty-state">${msg || "Markets unavailable"}</div>`;
    ensured.dots.innerHTML = "";
  }

  function setHeroEmpty(msg) {
    const slidesContainer = document.getElementById("pmSlides");
    const carousel = document.querySelector(".pm-carousel");
    if (!slidesContainer) return;

    slidesContainer.style.transform = `translateX(0%)`;
    slidesContainer.innerHTML = `
      <article class="pm-slide">
        <div class="pm-hero-container" style="grid-template-columns:1fr;">
          <div class="pm-side-empty-state">${msg || "Markets unavailable"}</div>
        </div>
      </article>
    `;

    if (!carousel) return;
    const oldNav = carousel.querySelector(".pm-dots-container");
    if (oldNav) oldNav.remove();
  }

  function updateHero(events) {
    const heroEvents = (Array.isArray(events) ? events : []).slice(0, 6);
    const slidesContainer = document.getElementById("pmSlides");
    const carousel = document.querySelector(".pm-carousel");

    if (!slidesContainer) return;

    if (!heroEvents.length) {
      setHeroEmpty("Markets unavailable");
      return;
    }

    slidesContainer.innerHTML = heroEvents
      .map((evt) => {
        const imgUrl = evt.image_url;
        const outcomes = Array.isArray(evt.outcomes) ? evt.outcomes : [];

        const outcomesHtml = outcomes
          .map((outcome, idx) => {
            const color = idx === 0 ? "#00d293" : idx === 1 ? "#3b82f6" : "#9ca3af";
            const p = outcome?.price;
            const pctTxt = p === null ? "--" : `${p}%`;
            const miniUrl = outcome?.image_url || imgUrl;

            return `
              <div class="k-outcome-row ${idx === 0 ? "k-outcome--top" : ""}">
                <div class="k-outcome-info">
                  <div class="k-mini-icon" style="${iconStyle(miniUrl)}"></div>
                  <span class="k-outcome-name">${outcome?.name || ""}</span>
                </div>
                <div class="k-outcome-right">
                  <span class="k-pct" style="color:${color};">${pctTxt}</span>
                  <div class="k-yn-group">
                    <button class="k-btn yes" type="button" data-url="https://kalshi.com/markets/${encodeURIComponent(outcome?.ticker || "")}?ref=flashscreener">Yes</button>
                    <button class="k-btn no" type="button" data-url="https://kalshi.com/markets/${encodeURIComponent(outcome?.ticker || "")}?ref=flashscreener">No</button>
                  </div>
                </div>
              </div>
            `;
          })
          .join("");

        const legendHtml = outcomes
          .map((outcome, idx) => {
            const colorClass = idx === 0 ? "green" : idx === 1 ? "blue" : "gray";
            const p = outcome?.price;
            const pctTxt = p === null ? "--" : `${p}%`;
            return `<div class="k-legend-item"><div class="k-dot ${colorClass}"></div> ${outcome?.name || ""} ${pctTxt}</div>`;
          })
          .join("");

        return `
          <article class="pm-slide">
            <div class="pm-hero-container">
              <div class="k-left-col">
                <div class="k-header">
                  <div class="k-main-icon" style="${iconStyle(imgUrl)}"></div>
                  <div class="k-title">${evt.title || ""}</div>
                </div>

                <div class="k-outcomes-list">${outcomesHtml}</div>

                <div class="k-news-section">
                  <div class="k-news-meta">
                    <span class="k-news-label">Market Data ·</span>
                    <span>Total Vol: ${fmtVolAbbrev(evt.volume)}</span>
                  </div>
                </div>
              </div>

              <div class="k-right-col">
                <div class="k-chart-legend">${legendHtml}</div>
                <div class="k-chart-container">${drawChart(outcomes.length)}</div>
              </div>
            </div>
          </article>
        `;
      })
      .join("");

    if (!carousel) return;

    const oldNav = carousel.querySelector(".pm-dots-container");
    if (oldNav) oldNav.remove();

    const controls = document.createElement("div");
    controls.className = "pm-dots-container";

    const prev = document.createElement("button");
    prev.className = "pm-nav-arrow pm-prev";
    prev.type = "button";
    prev.innerHTML = "←";

    const next = document.createElement("button");
    next.className = "pm-nav-arrow pm-next";
    next.type = "button";
    next.innerHTML = "→";

    const dotsHTML = heroEvents
      .map((_, i) => `<button class="pm-dot ${i === 0 ? "is-active" : ""}" data-index="${i}" type="button"></button>`)
      .join("");

    controls.appendChild(prev);
    controls.insertAdjacentHTML("beforeend", dotsHTML);
    controls.appendChild(next);
    carousel.appendChild(controls);

    const dots = controls.querySelectorAll(".pm-dot");
    const total = heroEvents.length;
    let curr = 0;

    const go = (i) => {
      if (i < 0) i = total - 1;
      if (i >= total) i = 0;
      curr = i;
      slidesContainer.style.transform = `translateX(-${curr * 100}%)`;
      dots.forEach((d, idx) => d.classList.toggle("is-active", idx === curr));
    };

    prev.onclick = () => go(curr - 1);
    next.onclick = () => go(curr + 1);
    dots.forEach((d) => (d.onclick = () => go(parseInt(d.dataset.index || "0"))));

    carousel.onclick = (e) => {
      const btn = e.target.closest(".k-btn");
      if (!btn) return;
      const url = btn.dataset.url;
      if (url) window.open(url, "_blank");
    };

    go(0);
  }

  let sideTimer = null;
  let sideIdx = 0;

  function updateSide(cryptoEvents) {
    const ensured = ensureSideMarkup();
    if (!ensured) return;
    const sideSlides = ensured.slides;
    const sideDots = ensured.dots;

    const list = (Array.isArray(cryptoEvents) ? cryptoEvents : []).slice(0, 3);
    if (!list.length) {
      setSideEmpty("No crypto markets available");
      return;
    }

    sideSlides.innerHTML = list
      .map((evt) => {
        const imgUrl = evt?.image_url || null;
        const top = getYesNoFromEvent(evt);
        const yesPct = top.yesPct;
        const noPct = top.noPct;
        const yesPay = payoutFromPct(yesPct);
        const noPay = payoutFromPct(noPct);
        const marketTicker = top.marketTicker || "";
        const url = marketTicker ? `https://kalshi.com/markets/${encodeURIComponent(marketTicker)}?ref=flashscreener` : "https://kalshi.com/market-data";

        const yesPayTxt = yesPay ? "$" + yesPay.toLocaleString("en-US") : "--";
        const noPayTxt = noPay ? "$" + noPay.toLocaleString("en-US") : "--";
        const yesPctTxt = yesPct === null ? "--" : `${yesPct}%`;

        return `
          <article class="pm-side-slide" data-url="${url}">
            <div class="pm-side-top">
              <div class="pm-side-icon" style="${iconStyle(imgUrl)}">${imgUrl ? "" : "₿"}</div>
              <div class="pm-side-question">${evt?.title || ""}</div>
              <div class="pm-side-pct">${yesPctTxt}</div>
            </div>

            <div class="pm-side-ctas">
              <button class="pm-side-btn yes" type="button">Yes</button>
              <button class="pm-side-btn no" type="button">No</button>
            </div>

            <div class="pm-side-payout">
              <div class="pm-side-payline">
                <span class="pm-side-paybase">$100</span>
                <span class="pm-side-payarrow">→</span>
                <span class="pm-side-paywin">${yesPayTxt}</span>
              </div>
              <div class="pm-side-payline">
                <span class="pm-side-paybase">$100</span>
                <span class="pm-side-payarrow">→</span>
                <span class="pm-side-paywin">${noPayTxt}</span>
              </div>
            </div>

            <div class="pm-side-bottom">
              <div class="pm-side-vol">${fmtVolFull(evt?.volume)}</div>
              <button class="pm-side-plus" type="button" aria-label="Open market">+</button>
            </div>
          </article>
        `;
      })
      .join("");

    sideDots.innerHTML = list
      .map((_, i) => `<button class="pm-side-dot ${i === 0 ? "is-active" : ""}" data-index="${i}" type="button"></button>`)
      .join("");

    const go = (i) => {
      const total = list.length;
      if (i < 0) i = total - 1;
      if (i >= total) i = 0;
      sideIdx = i;
      sideSlides.style.transform = `translateX(-${sideIdx * 100}%)`;
      [...sideDots.querySelectorAll(".pm-side-dot")].forEach((d, idx) => d.classList.toggle("is-active", idx === sideIdx));
    };

    sideDots.querySelectorAll(".pm-side-dot").forEach((d) => {
      d.onclick = () => go(parseInt(d.dataset.index || "0"));
    });

    const open = (e) => {
      const slide = e.target.closest(".pm-side-slide");
      const url = slide?.dataset?.url;
      if (url) window.open(url, "_blank");
    };

    sideSlides.querySelectorAll(".pm-side-btn, .pm-side-plus").forEach((b) => (b.onclick = open));

    if (sideTimer) clearInterval(sideTimer);
    sideTimer = setInterval(() => go(sideIdx + 1), 6500);

    go(0);
  }

  async function init() {
    try {
      const { markets, crypto } = await fetchBundle();
      updateHero(markets);
      const side = (crypto && crypto.length ? crypto : markets.filter(isCryptoEvent)).slice(0, 3);
      updateSide(side);
    } catch (e) {
      setHeroEmpty("Markets unavailable");
      setSideEmpty("Markets unavailable");
    }
  }

  init();
})();
