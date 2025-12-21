(() => {
  const root = document.getElementById("pm-strip");
  if (!root) return;

  const API_PM_BACKEND = "https://prediction-backend-r0vj.onrender.com";

  const pick = (obj, keys) => {
    for (const k of keys) {
      const v = obj && obj[k];
      if (v !== undefined && v !== null && v !== "") return v;
    }
    return null;
  };

  const num = (v) => {
    const n = typeof v === "string" ? Number(v) : v;
    return Number.isFinite(n) ? n : null;
  };

  const toPct = (v) => {
    const n = num(v);
    if (n === null) return null;
    const pct = n <= 1 ? n * 100 : n;
    return Math.max(0, Math.min(100, Math.round(pct)));
  };

  const getEventImage = (evt) =>
    pick(evt, ["image_url", "imageUrl", "featured_image_url", "featuredImageUrl"]);

  const getOutcomeImage = (o) => pick(o, ["image_url", "imageUrl"]);

  const getOutcomeColor = (o) => pick(o, ["color_code", "colorCode"]);

  const getVolumeUsd = (evt) => {
    const v = pick(evt, [
      "volume_usd",
      "volumeUsd",
      "dollar_volume",
      "dollarVolume",
      "notional_value_dollars",
      "notionalValueDollars"
    ]);
    return num(v);
  };

  const getVolumeContracts = (evt) => {
    const v = pick(evt, ["volume", "volume_24h", "volume24h"]);
    return num(v);
  };

  const fmtUsd = (n) => {
    if (!n) return "$0";
    const abs = Math.abs(n);
    const f = (x) => String(x).replace(/\.0$/, "");
    if (abs >= 1e9) return "$" + f((n / 1e9).toFixed(1)) + "B";
    if (abs >= 1e6) return "$" + f((n / 1e6).toFixed(1)) + "M";
    if (abs >= 1e3) return "$" + f((n / 1e3).toFixed(1)) + "k";
    return "$" + Math.floor(n).toLocaleString();
  };

  const fmtVol = (evt) => {
    const usd = getVolumeUsd(evt);
    if (usd !== null) return fmtUsd(usd);
    const c = getVolumeContracts(evt);
    if (c !== null) return Math.floor(c).toLocaleString();
    return "--";
  };

  const normOutcomes = (evt) => {
    const raw = Array.isArray(evt && evt.outcomes) ? evt.outcomes : [];
    const mapped = raw
      .map((o) => {
        const pct =
          toPct(pick(o, ["pct", "prob", "probability", "price"])) ??
          toPct(pick(o, ["last_price", "lastPrice", "price_cents", "priceCents"])) ??
          toPct(pick(o, ["price_dollars", "priceDollars", "last_price_dollars", "lastPriceDollars"]));
        return {
          name: pick(o, ["name", "title"]) || "",
          ticker: pick(o, ["ticker", "market_ticker", "marketTicker"]) || "",
          pct,
          imageUrl: getOutcomeImage(o),
          color: getOutcomeColor(o)
        };
      })
      .filter((o) => o.name);

    mapped.sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1));
    return mapped;
  };

  const drawChart = (pcts) => {
    const width = 600;
    const height = 250;
    const safe = (v) => (v === null || v === undefined ? 0 : v);

    const mkPath = (pct) => {
      const pts = Array.from({ length: 18 }, () => safe(pct));
      let d = `M 0 ${height - (pts[0] / 100) * height}`;
      pts.forEach((p, i) => {
        const x = (i / (pts.length - 1)) * width;
        const y = height - (p / 100) * height;
        d += ` L ${x} ${y}`;
      });
      return d;
    };

    const colors = ["#00d293", "#3b82f6", "#9ca3af"];
    let paths = "";

    pcts.slice(0, 3).forEach((pct, i) => {
      const d = mkPath(pct ?? 0);
      const c = colors[i] || "#999";
      if (i === 0) {
        paths += `
          <defs>
            <linearGradient id="grad-main" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="${c}" stop-opacity="0.2"/>
              <stop offset="100%" stop-color="${c}" stop-opacity="0"/>
            </linearGradient>
          </defs>
          <path d="${d} L ${width} ${height} L 0 ${height} Z" fill="url(#grad-main)"></path>
          <path d="${d}" fill="none" stroke="${c}" stroke-width="3"></path>
        `;
      } else {
        paths += `<path d="${d}" fill="none" stroke="${c}" stroke-width="2"></path>`;
      }
    });

    return `
      <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" style="width:100%; height:100%;">
        <line x1="0" y1="${height * 0.25}" x2="${width}" y2="${height * 0.25}" stroke="#f0f0f0" stroke-width="1" stroke-dasharray="4"/>
        <line x1="0" y1="${height * 0.5}" x2="${width}" y2="${height * 0.5}" stroke="#f0f0f0" stroke-width="1" stroke-dasharray="4"/>
        <line x1="0" y1="${height * 0.75}" x2="${width}" y2="${height * 0.75}" stroke="#f0f0f0" stroke-width="1" stroke-dasharray="4"/>
        ${paths}
      </svg>
    `;
  };

  const cardImgStyle = (url) =>
    url
      ? `background-image: url('${url}'); background-size: cover; background-position: center;`
      : `background-color: #f7f7f7; display:flex; align-items:center; justify-content:center;`;

  async function fetchMarkets() {
    try {
      const response = await fetch(`${API_PM_BACKEND}/kalshi-markets`);
      const data = await response.json();
      const markets = data && data.markets;
      if (Array.isArray(markets) && markets.length) updateUI(markets);
    } catch (e) {
      const sideTitle = document.getElementById("sideTitle");
      if (sideTitle) sideTitle.innerText = "Markets Unavailable";
    }
  }

  function updateUI(eventsRaw) {
    const events = eventsRaw.map((evt) => {
      const imgUrl = getEventImage(evt);
      const outcomes = normOutcomes(evt);
      return { ...evt, _imgUrl: imgUrl, _outcomes: outcomes };
    });

    const heroEvents = events.slice(0, 6);
    const sideEvent = events[6] || events[0];

    const slidesContainer = document.getElementById("pmSlides");
    const carousel = document.querySelector(".pm-carousel");

    if (slidesContainer) {
      slidesContainer.innerHTML = heroEvents
        .map((evt) => {
          const imgUrl = evt._imgUrl;
          const imgStyle = cardImgStyle(imgUrl);
          const imgContent = !imgUrl ? "📊" : "";
          const outcomes = evt._outcomes || [];
          const outcomesHtml = outcomes
            .slice(0, 3)
            .map((o, idx) => {
              const color = o.color || (idx === 0 ? "#00d293" : idx === 1 ? "#3b82f6" : "#9ca3af");
              const pct = o.pct === null ? "--" : `${o.pct}%`;
              const iconUrl = o.imageUrl || imgUrl;
              const miniStyle = cardImgStyle(iconUrl);
              const opacity = idx === 0 ? "1" : "0.8";
              return `
                <div class="k-outcome-row" style="opacity:${opacity}; border-bottom: 1px solid #f7f7f7;">
                  <div class="k-outcome-info">
                    <div class="k-mini-icon" style="${miniStyle}"></div>
                    <span class="k-outcome-name">${o.name}</span>
                  </div>
                  <div class="k-outcome-right">
                    <span class="k-pct" style="color: ${color};">${pct}</span>
                    <div class="k-yn-group">
                      <button class="k-btn yes">Yes</button>
                      <button class="k-btn no">No</button>
                    </div>
                  </div>
                </div>
              `;
            })
            .join("");

          const legendHtml = outcomes
            .slice(0, 3)
            .map((o, idx) => {
              const cls = idx === 0 ? "green" : idx === 1 ? "blue" : "gray";
              const pct = o.pct === null ? "--" : `${o.pct}%`;
              return `<div class="k-legend-item"><div class="k-dot ${cls}"></div> ${o.name} ${pct}</div>`;
            })
            .join("");

          const pcts = outcomes.slice(0, 3).map((o) => o.pct ?? 0);

          return `
            <article class="pm-slide">
              <div class="pm-card pm-card--hero">
                <div class="pm-hero-container">
                  <div class="k-left-col">
                    <div class="k-header">
                      <div class="k-main-icon" style="${imgStyle}">${imgContent}</div>
                      <div class="k-title">${evt.title || ""}</div>
                    </div>

                    <div class="k-outcomes-list">${outcomesHtml}</div>

                    <div class="k-news-section">
                      <div class="k-news-meta">
                        <span style="font-weight:700; color:#000;">Market Data ·</span>
                        <span>Total Vol: ${fmtVol(evt)}</span>
                      </div>
                    </div>
                  </div>

                  <div class="k-right-col">
                    <div class="k-chart-legend">${legendHtml}</div>
                    <div class="k-chart-container">${drawChart(pcts)}</div>
                  </div>
                </div>
              </div>
            </article>
          `;
        })
        .join("");
    }

    if (carousel) {
      const oldNav = carousel.querySelector(".pm-dots-container");
      if (oldNav) oldNav.remove();

      const controls = document.createElement("div");
      controls.className = "pm-dots-container";

      const prev = document.createElement("button");
      prev.className = "pm-nav-arrow pm-prev";
      prev.innerHTML = "←";

      const next = document.createElement("button");
      next.className = "pm-nav-arrow pm-next";
      next.innerHTML = "→";

      const dotsHTML = heroEvents
        .map((_, i) => `<button class="pm-dot ${i === 0 ? "is-active" : ""}" data-index="${i}"></button>`)
        .join("");

      controls.appendChild(prev);
      controls.insertAdjacentHTML("beforeend", dotsHTML);
      controls.appendChild(next);
      carousel.appendChild(controls);

      const slides = document.getElementById("pmSlides");
      const dots = controls.querySelectorAll(".pm-dot");
      const total = heroEvents.length;
      let curr = 0;

      const go = (i) => {
        if (!slides) return;
        if (i < 0) i = total - 1;
        if (i >= total) i = 0;
        curr = i;
        slides.style.transform = `translateX(-${curr * 100}%)`;
        dots.forEach((d, idx) => d.classList.toggle("is-active", idx === curr));
      };

      prev.onclick = () => go(curr - 1);
      next.onclick = () => go(curr + 1);
      dots.forEach((d) => (d.onclick = () => go(parseInt(d.dataset.index))));
    }

    const sideWidget = document.getElementById("pmSideWidget");
    if (sideWidget && sideEvent) {
      const outcomes = sideEvent._outcomes || [];
      const mainOutcome = outcomes[0] || { name: "", ticker: "", pct: null };
      const imgUrl = sideEvent._imgUrl;
      const iconUrl = mainOutcome.imageUrl || imgUrl;
      const imgStyle = cardImgStyle(iconUrl);
      const imgContent = !iconUrl ? "📈" : "";
      const pct = mainOutcome.pct === null ? "--" : `${mainOutcome.pct}%`;

      const kalshiUrl =
        pick(mainOutcome, ["kalshi_url", "kalshiUrl"]) ||
        `https://kalshi.com/market-data`;

      sideWidget.innerHTML = `
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:15px;">
          <div class="pm-side-icon" id="sideIcon" style="${imgStyle} width:40px; height:40px; border-radius:8px;">${imgContent}</div>
          <div class="k-side-header" style="font-size:16px;">${sideEvent.title || ""}</div>
        </div>

        <div style="margin: 20px 0;">
          <div class="k-side-row">
            <span class="k-side-label">${mainOutcome.name || ""}</span>
            <div class="k-outcome-right">
              <span class="k-pct" style="color: #00d293;">${pct}</span>
              <div class="k-yn-group"><button class="k-btn yes">Y</button><button class="k-btn no">N</button></div>
            </div>
          </div>
        </div>

        <div class="k-side-actions">
          <div class="k-vol-label" style="font-size:14px; font-weight:600; margin-bottom:5px;">Vol: ${fmtVol(sideEvent)}</div>
          <button class="btn-dflow">⚡ Bet On-Chain</button>
          <button class="btn-kalshi-link" onclick="window.open(${JSON.stringify(kalshiUrl)}, '_blank')">Kalshi ↗</button>
        </div>
      `;
    }
  }

  fetchMarkets();
})();
