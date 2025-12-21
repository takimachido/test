(() => {
  const root = document.getElementById("pm-strip");
  if (!root) return;

  const API_PM_BACKEND = "https://prediction-backend-r0vj.onrender.com";

  const fmtVol = (n) => {
    const v = Number(n);
    if (!Number.isFinite(v) || v <= 0) return "$0";
    const abs = Math.abs(v);
    const f = (x) => String(x).replace(/\.0$/, "");
    if (abs >= 1e9) return "$" + f((v / 1e9).toFixed(1)) + "B";
    if (abs >= 1e6) return "$" + f((v / 1e6).toFixed(1)) + "M";
    if (abs >= 1e3) return "$" + f((v / 1e3).toFixed(1)) + "k";
    return "$" + Math.floor(v).toLocaleString();
  };

  const pct = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    const p = n <= 1 ? n * 100 : n;
    const r = Math.round(p);
    return Math.max(0, Math.min(100, r));
  };

  const iconStyle = (url) =>
    url
      ? `background-image:url('${url}');background-size:cover;background-position:center;`
      : `background-color:#f7f7f7;display:flex;align-items:center;justify-content:center;`;

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

  let sideTimer = null;
  let sideState = { list: [], idx: 0 };

  const CRYPTO_RE =
    /\b(CRYPTO|CRYPTOCURRENCY|BITCOIN|BTC|ETHEREUM|ETH|SOLANA|\bSOL\b|DOGE|XRP|BNB|AVAX|ADA|USDT|USDC|STABLECOIN|DEFI|BLOCKCHAIN|NFT|ALTCOIN|MEME|COINBASE|BINANCE)\b/i;

  const isCryptoEvent = (evt) => {
    const s = `${evt?.title || ""} ${evt?.ticker || ""}`;
    return CRYPTO_RE.test(s);
  };

  async function fetchMarkets() {
    try {
      const response = await fetch(`${API_PM_BACKEND}/kalshi-markets`);
      const data = await response.json();
      if (data && Array.isArray(data.markets) && data.markets.length > 0) {
        updateUI(data.markets);
      }
    } catch (e) {
      const sideTitle = document.getElementById("sideTitle");
      if (sideTitle) sideTitle.innerText = "Markets Unavailable";
    }
  }

  function renderSideSlide(evt) {
    const sideIcon = document.getElementById("sideIcon");
    const sideTitle = document.getElementById("sideTitle");
    const sideRows = document.getElementById("sideRows");
    const sideVol = document.getElementById("sideVol");
    const sideKalshiBtn = document.getElementById("sideKalshiBtn");

    if (!sideIcon || !sideTitle || !sideRows || !sideVol || !sideKalshiBtn) return;

    const outcomes = Array.isArray(evt?.outcomes) ? evt.outcomes : [];
    const top = outcomes[0] || null;

    const evtImg = evt?.image_url || null;
    sideIcon.style.cssText = iconStyle(evtImg);
    sideIcon.textContent = evtImg ? "" : "📈";

    sideTitle.textContent = evt?.title || "";

    sideVol.textContent = fmtVol(evt?.volume);

    const rowsHtml = outcomes.slice(0, 2).map((o, idx) => {
      const p = pct(o?.price);
      const color = idx === 0 ? "#00d293" : "#3b82f6";
      const oImg = o?.image_url || evtImg;
      const mini = iconStyle(oImg);
      const pTxt = p === null ? "--" : `${p}%`;
      const name = o?.name || "";
      return `
        <div class="k-outcome-row" style="padding:10px 0;">
          <div class="k-outcome-info">
            <div class="k-mini-icon" style="${mini}"></div>
            <span class="k-outcome-name">${name}</span>
          </div>
          <div class="k-outcome-right">
            <span class="k-pct" style="color:${color};">${pTxt}</span>
            <div class="k-yn-group">
              <button class="k-btn yes">Yes</button>
              <button class="k-btn no">No</button>
            </div>
          </div>
        </div>
      `;
    }).join("");

    sideRows.innerHTML = rowsHtml || `<div style="color:#777;font-size:13px;">--</div>`;

    const targetTicker = top?.ticker || "";
    const url = targetTicker ? `https://kalshi.com/markets/${encodeURIComponent(targetTicker)}?ref=flashscreener` : "https://kalshi.com/market-data";
    sideKalshiBtn.onclick = () => window.open(url, "_blank");
  }

  function setupSideCarousel(cryptoEvents) {
    const sideWidget = document.getElementById("pmSideWidget");
    const sideRows = document.getElementById("sideRows");
    if (!sideWidget || !sideRows) return;

    const oldNav = sideWidget.querySelector(".pm-side-nav");
    if (oldNav) oldNav.remove();

    const nav = document.createElement("div");
    nav.className = "pm-side-nav";
    nav.style.cssText = "display:flex;align-items:center;justify-content:center;gap:10px;margin-top:10px;";

    const prev = document.createElement("button");
    prev.type = "button";
    prev.innerHTML = "←";
    prev.style.cssText = "width:28px;height:28px;border-radius:999px;border:1px solid #eee;background:#fff;cursor:pointer;";

    const next = document.createElement("button");
    next.type = "button";
    next.innerHTML = "→";
    next.style.cssText = "width:28px;height:28px;border-radius:999px;border:1px solid #eee;background:#fff;cursor:pointer;";

    const dotsWrap = document.createElement("div");
    dotsWrap.style.cssText = "display:flex;align-items:center;gap:8px;";

    const dots = cryptoEvents.map((_, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.dataset.index = String(i);
      b.style.cssText = `width:9px;height:9px;border-radius:50%;border:none;cursor:pointer;background:${i === 0 ? "#111" : "#e5e7eb"};`;
      return b;
    });

    dots.forEach((d) => dotsWrap.appendChild(d));

    nav.appendChild(prev);
    nav.appendChild(dotsWrap);
    nav.appendChild(next);

    sideWidget.appendChild(nav);

    const go = (i) => {
      const total = cryptoEvents.length;
      if (total === 0) return;
      if (i < 0) i = total - 1;
      if (i >= total) i = 0;
      sideState.idx = i;
      dots.forEach((b, idx) => (b.style.background = idx === i ? "#111" : "#e5e7eb"));
      renderSideSlide(cryptoEvents[i]);
    };

    prev.onclick = () => go(sideState.idx - 1);
    next.onclick = () => go(sideState.idx + 1);
    dots.forEach((b) => (b.onclick = () => go(parseInt(b.dataset.index || "0"))));

    if (sideTimer) clearInterval(sideTimer);
    sideTimer = setInterval(() => go(sideState.idx + 1), 6500);

    go(0);
  }

  function updateUI(events) {
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
                        <span>Total Vol: ${fmtVol(evt.volume)}</span>
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

    const cryptoTop = events.filter(isCryptoEvent).sort((a, b) => (Number(b.volume) || 0) - (Number(a.volume) || 0)).slice(0, 3);

    sideState.list = cryptoTop;
    sideState.idx = 0;

    if (cryptoTop.length) {
      setupSideCarousel(cryptoTop);
    } else {
      const sideTitle = document.getElementById("sideTitle");
      if (sideTitle) sideTitle.textContent = "No crypto markets";
    }
  }

  fetchMarkets();
})();
