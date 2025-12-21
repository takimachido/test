(() => {
  const root = document.getElementById("pm-strip");
  if (!root) return;

  const fmtVol = (n) => {
    if (n >= 1000000) return "$" + (n / 1000000).toFixed(1) + "M";
    if (n >= 1000) return "$" + (n / 1000).toFixed(1) + "k";
    return "$" + n;
  };

  const drawChart = (points, color) => {
    if (!points || points.length < 2) return "";
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    const width = 640;
    const height = 320;
    
    let d = `M 0 ${height - ((points[0] - min) / range) * height}`;
    points.forEach((p, i) => {
      const x = (i / (points.length - 1)) * width;
      const y = height - ((p - min) / range) * height;
      d += ` L ${x} ${y}`;
    });

    return `
      <svg viewBox="0 0 640 320" preserveAspectRatio="none" style="width:100%; height:100%;">
        <defs>
          <linearGradient id="grad-${color.replace('#','')}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${color}" stop-opacity="0.1"/>
            <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <path d="${d} L 640 320 L 0 320 Z" fill="url(#grad-${color.replace('#','')})"></path>
        <path d="${d}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></path>
      </svg>
    `;
  };

  async function fetchMarkets() {
    try {
      const response = await fetch('https://api.kalshi.com/trade-api/v2/markets?limit=10&status=open&sort=volume');
      const data = await response.json();
      if (data && data.markets) {
        updateUI(data.markets);
      }
    } catch (e) {
      console.error(e);
    }
  }

  function updateUI(markets) {
    const heroMarkets = markets.slice(0, 3);
    const sideMarket = markets[3] || markets[0];

    const slidesContainer = document.getElementById("pmSlides");
    if (slidesContainer && heroMarkets.length) {
      slidesContainer.innerHTML = heroMarkets.map((m, i) => `
        <article class="pm-slide">
          <div class="pm-hero">
            <div class="pm-left">
              <div class="pm-header">
                <div class="pm-market-icon" style="background-image: url('${m.image_url || ''}'); background-size: cover;"></div>
                <div class="pm-market-title">${m.title}</div>
              </div>
              <div class="pm-outcomes">
                <div class="pm-row">
                  <div class="pm-row-label">Market Probability</div>
                  <div class="pm-row-right">
                    <div class="pm-row-pct">${m.yes_bid}%</div>
                    <div class="pm-yn">
                      <button class="pm-yn-btn btn-yes">YES</button>
                      <button class="pm-yn-btn btn-no">NO</button>
                    </div>
                  </div>
                </div>
              </div>
              <div class="pm-news">
                <div class="pm-news-label">Volume</div>
                <div class="pm-news-text">${fmtVol(m.volume)} traded in this contract.</div>
              </div>
            </div>
            <div class="pm-right">
              <div class="pm-chart">${drawChart([10, 20, 15, 30, 25, 40, 35, 50], i === 0 ? "#22d3ee" : "#a78bfa")}</div>
            </div>
          </div>
        </article>
      `).join('');
    }

    const sideTitle = document.querySelector(".pm-side-title");
    if (sideTitle && sideMarket) {
      sideTitle.innerText = sideMarket.title;
      document.querySelector(".pm-vol-val").innerText = fmtVol(sideMarket.volume);
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
