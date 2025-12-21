(() => {
  const root = document.getElementById("pm-strip");
  if (!root) return;

  const API_PM_BACKEND = "https://prediction-backend-r0vj.onrender.com";

  const fmtVol = (n) => {
    if (!n) return "$0";
    if (n >= 1000000) return "$" + (n / 1000000).toFixed(1) + "M";
    if (n >= 1000) return "$" + (n / 1000).toFixed(1) + "k";
    return "$" + Math.floor(n);
  };

  const drawChart = (color) => {
    const points = Array.from({length: 12}, () => Math.floor(Math.random() * 40) + 30);
    const width = 640;
    const height = 320;
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    
    let d = `M 0 ${height - ((points[0] - min) / range) * height}`;
    points.forEach((p, i) => {
      const x = (i / (points.length - 1)) * width;
      const y = height - ((p - min) / range) * height;
      d += ` L ${x} ${y}`;
    });

    return `
      <svg viewBox="0 0 640 320" preserveAspectRatio="none" style="width:100%; height:100%;">
        <path d="${d} L 640 320 L 0 320 Z" fill="${color}" fill-opacity="0.05"></path>
        <path d="${d}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></path>
      </svg>
    `;
  };

  async function fetchMarkets() {
    try {
      const response = await fetch(`${API_PM_BACKEND}/kalshi-markets`);
      const data = await response.json();
      
      if (data && data.markets && data.markets.length > 0) {
        updateUI(data.markets);
      }
    } catch (e) {
      const sideTitle = document.getElementById("sideTitle");
      if (sideTitle) sideTitle.innerText = "Error loading markets";
      console.error(e);
    }
  }

  function updateUI(markets) {
    const heroMarkets = markets.slice(0, 3);
    const sideMarket = markets[3] || markets[0];

    const slidesContainer = document.getElementById("pmSlides");
    if (slidesContainer) {
      slidesContainer.innerHTML = heroMarkets.map((m, i) => `
        <article class="pm-slide">
          <div class="pm-hero">
            <div class="pm-left">
              <div class="pm-header">
                <div class="pm-market-icon" style="background-image: url('${m.image_url || ''}'); background-size: cover; background-position: center; background-color: #f0f2f5;">
                  ${!m.image_url ? '<span style="display:flex;align-items:center;justify-content:center;height:100%;">📊</span>' : ''}
                </div>
                <div class="pm-market-title">${m.title}</div>
              </div>
              <div class="pm-outcomes">
                <div class="pm-row">
                  <div class="pm-row-label">Market Probability</div>
                  <div class="pm-row-right">
                    <div class="pm-row-pct">${Math.round(m.last_price || 50)}%</div>
                    <div class="pm-yn">
                      <button class="pm-yn-btn btn-yes">YES</button>
                      <button class="pm-yn-btn btn-no">NO</button>
                    </div>
                  </div>
                </div>
              </div>
              <div class="pm-news">
                <div class="pm-news-label">Liquidity / Vol</div>
                <div class="pm-news-text">${fmtVol(m.volume)} traded in this event.</div>
              </div>
            </div>
            <div class="pm-right">
              <div class="pm-chart">${drawChart(i === 0 ? "#22d3ee" : "#4d0fff")}</div>
            </div>
          </div>
        </article>
      `).join('');
    }

    const sideTitle = document.getElementById("sideTitle");
    const sideVol = document.getElementById("sideVol");
    const sideRows = document.getElementById("sideRows");

    if (sideTitle) sideTitle.innerText = sideMarket.title;
    if (sideVol) sideVol.innerText = fmtVol(sideMarket.volume);
    if (sideRows) {
      sideRows.innerHTML = `
        <div class="pm-side-row pm-row">
          <div class="pm-side-label pm-row-label">Chances</div>
          <div class="pm-side-right pm-row-right">
            <div class="pm-side-pct pm-row-pct">${Math.round(sideMarket.last_price || 50)}%</div>
            <div class="pm-yn">
              <button class="pm-yn-btn btn-yes">Y</button>
              <button class="pm-yn-btn btn-no">N</button>
            </div>
          </div>
        </div>
      `;
    }

    const kBtn = document.getElementById("sideKalshiBtn");
    if (kBtn) {
      kBtn.onclick = () => window.open(`https://kalshi.com/markets/${sideMarket.ticker}?ref=flashscreener`, "_blank");
    }
  }

  const dots = document.querySelectorAll(".pm-dot");
  const slides = document.getElementById("pmSlides");
  if (slides && dots.length) {
    dots.forEach(dot => {
      dot.addEventListener("click", () => {
        const i = Number(dot.dataset.i);
        slides.style.transform = `translateX(-${i * 100}%)`;
        dots.forEach((d, idx) => d.classList.toggle("is-active", idx === i));
      });
    });
  }

  fetchMarkets();
})();
