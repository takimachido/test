(() => {
  const root = document.getElementById("pm-strip");
  if (!root) return;

  const API_PM_BACKEND = "https://prediction-backend-r0vj.onrender.com";

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

  const pct = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    const p = n <= 1 ? n * 100 : n;
    const r = Math.round(p);
    return Math.max(0, Math.min(100, r));
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
      : `background-color:#f3f4f6;display:flex;align-items:center;justify-content:center;`;

  const drawChart = (outcomeCount) => {
    const width = 600;
    const height = 250;

    const createPath = (color, index) => {
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

      return { d, color };
    };

    const colors = ["#00d293", "#3b82f6", "#9ca3af"];
    let pathsHtml = "";

    for (let i = 0; i < outcomeCount; i++) {
      const path = createPath(colors[i] || "#999", i);
      if (i === 0) {
        pathsHtml += `
          <defs>
            <linearGradient id="grad-main" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="${path.color}" stop-opacity="0.2"/>
              <stop offset="100%" stop-color="${path.color}" stop-opacity="0"/>
            </linearGradient>
          </defs>
          <path d="${path.d} L ${width} ${height} L 0 ${height} Z" fill="url(#grad-main)"></path>
          <path d="${path.d}" fill="none" stroke="${path.color}" stroke-width="3"></path>
        `;
      } else {
        pathsHtml += `<path d="${path.d}" fill="none" stroke="${path.color}" stroke-width="2"></path>`;
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
    const s = `${evt?.title || ""} ${evt?.ticker || ""}`;
    return CRYPTO_RE.test(s);
  };

  const getYesNoFromEvent = (evt) => {
    const outcomes = Array.isArray(evt?.outcomes) ? evt.outcomes : [];
    const norm = outcomes.map((o) => ({ ...o, _n: String(o?.name || "").trim().toUpperCase() }));
    const yes = norm.find((o) => o._n === "YES") || null;
    const no = norm.find((o) => o._n === "NO") || null;

    if (yes && no) {
      const y = pct(yes.price);
      const n = pct(no.price);
      if (y !== null && n !== null) return { yesPct: y, noPct: n, marketTicker: yes.ticker || no.ticker || "" };
      if (y !== null) return { yesPct: y, noPct: Math.max(0, 100 - y), marketTicker: yes.ticker || "" };
      if (n !== null) return { yesPct: Math.max(0, 100 - n), noPct: n, marketTicker: no.ticker || "" };
    }

    const top = norm[0] || null;
    const second = norm[1] || null;
    const pTop = pct(top?.price);
    const pSecond = pct(second?.price);

    if (pTop !== null && pSecond !== null && pTop + pSecond <= 110) {
      return { yesPct: pTop, noPct: pSecond, marketTicker: top?.ticker || second?.ticker || "" };
    }

    if (pTop !== null) {
      return { yesPct: pTop, noPct: Math.max(0, 100 - pTop), marketTicker: top?.ticker || "" };
    }

    return { yesPct: null, noPct: null, marketTicker: top?.ticker || "" };
  };

  async function fetchMarkets() {
    try {
      const response = await fetch(`${API_PM_BACKEND}/kalshi-markets`);
      const data = await response.json();
      if (data && Array.isArray(data.markets) && data.markets.length > 0) {
        updateUI(data.markets);
      } else {
        setSideEmpty();
      }
    } catch (e) {
      setSideEmpty();
    }
  }

  function setSideEmpty() {
    const sideSlides = document.getElementById("pmSideSlides");
    const sideDots = document.getElementById("pmSideDots");
    if (sideSlides) sideSlides.innerHTML = "";
    if (sideDots) sideDots.innerHTML = "";
  }

  function updateHero(events) {
    const heroEvents = events.slice(0, 6);
    const slidesContainer = document.getElementById("pmSlides");
    const carousel = document.querySelector(".pm-carousel");

    if (slidesContainer) {
      slidesContainer.innerHTML = heroEvents
        .map((evt) => {
          const imgUrl = evt.image_url;
          const imgStyle = iconStyle(imgUrl);
          const imgContent = !imgUrl ? "📊" : "";
          const outcomes = Array.isArray(evt.outcomes) ? evt.outcomes : [];

          const outcomesHtml = outcomes
            .map((outcome, idx) => {
              const color = idx === 0 ? "#00d293" : idx === 1 ? "#3b82f6" : "#9ca3af";
              const p = pct(outcome?.price);
              const pctTxt = p === null ? "--" : `${p}%`;
              const opacity = idx === 0 ? "1" : "0.8";
              const miniUrl = outcome?.image_url || imgUrl;
              const miniStyle = iconStyle(miniUrl);

              return `
                <div class="k-outcome-row" style="opacity:${opacity};border-bottom:1px solid #f7f7f7;">
                  <div class="k-outcome-info">
                    <div class="k-mini-icon" style="${miniStyle}"></div>
                    <span class="k-outcome-name">${outcome?.name || ""}</span>
                  </div>
                  <div class="k-outcome-right">
                    <span class="k-pct" style="color:${color};">${pctTxt}</span>
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
            .map((outcome, idx) => {
              const colorClass = idx === 0 ? "green" : idx === 1 ? "blue" : "gray";
              const p = pct(outcome?.price);
              const pctTxt = p === null ? "--" : `${p}%`;
              return `<div class="k-legend-item"><div class="k-dot ${colorClass}"></div> ${outcome?.name || ""} ${pctTxt}</div>`;
            })
            .join("");

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
                        <span style="font-weight:700;color:#000;">Market Data ·</span>
                        <span>Total Vol: ${fmtVolAbbrev(evt.volume)}</span>
                      </div>
                    </div>
                  </div>

                  <div class="k-right-col">
                    <div class="k-chart-legend">${legendHtml}</div>
                    <div class="k-chart-container">${drawChart(outcomes.length)}</div>
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
  }

  let sideTimer = null;
  let sideIdx = 0;

  function updateSide(events) {
    const sideSlides = document.getElementById("pmSideSlides");
    const sideDots = document.getElementById("pmSideDots");
    if (!sideSlides || !sideDots) return;

    const list = events
      .filter(isCryptoEvent)
      .sort((a, b) => (Number(b.volume) || 0) - (Number(a.volume) || 0))
      .slice(0, 3);

    if (!list.length) {
      sideSlides.innerHTML = "";
      sideDots.innerHTML = "";
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

    sideSlides.onclick = (e) => {
      const t = e.target;
      const btn = t.closest(".pm-side-btn, .pm-side-plus");
      if (!btn) return;
      const slide = t.closest(".pm-side-slide");
      const url = slide?.dataset?.url;
      if (url) window.open(url, "_blank");
    };

    if (sideTimer) clearInterval(sideTimer);
    sideTimer = setInterval(() => go(sideIdx + 1), 6500);

    go(0);
  }

  function updateUI(events) {
    updateHero(events);
    updateSide(events);
  }

  fetchMarkets();
})();
