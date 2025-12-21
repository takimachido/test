(() => {
  const root = document.getElementById("pm-strip");
  if (!root) return;

  const API_PM_BACKEND = "https://prediction-backend-r0vj.onrender.com";

  const fmtVol = (n) => {
    if (!n) return "$0";
    if (n >= 1000000) return "$" + (n / 1000000).toFixed(0) + "M";
    if (n >= 1000) return "$" + (n / 1000).toFixed(0) + "k";
    return "$" + Math.floor(n).toLocaleString();
  };

  const drawChart = () => {
    const width = 600;
    const height = 250;
    
    const generatePath = (color, highlight) => {
      let points = [];
      let start = highlight ? 40 : Math.random() * 30 + 10;
      for(let i=0; i<15; i++) {
        start += (Math.random() - 0.5) * 15;
        points.push(Math.max(5, Math.min(95, start)));
      }
      
      let d = `M 0 ${height - (points[0]/100)*height}`;
      points.forEach((p, i) => {
        const x = (i / (points.length - 1)) * width;
        const y = height - (p / 100) * height;
        d += ` L ${x} ${y}`;
      });

      let fill = 'none';
      if (highlight) {
         fill = `url(#grad-${color.replace('#','')})`;
      }

      return { d, color, fill };
    };

    const line1 = generatePath('#00d293', true);
    const line2 = generatePath('#3b82f6', false);
    const line3 = generatePath('#9ca3af', false);

    return `
      <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" style="width:100%; height:100%;">
        <defs>
          <linearGradient id="grad-00d293" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#00d293" stop-opacity="0.2"/>
            <stop offset="100%" stop-color="#00d293" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <line x1="0" y1="${height*0.25}" x2="${width}" y2="${height*0.25}" stroke="#f0f0f0" stroke-width="1" stroke-dasharray="4"/>
        <line x1="0" y1="${height*0.5}" x2="${width}" y2="${height*0.5}" stroke="#f0f0f0" stroke-width="1" stroke-dasharray="4"/>
        <line x1="0" y1="${height*0.75}" x2="${width}" y2="${height*0.75}" stroke="#f0f0f0" stroke-width="1" stroke-dasharray="4"/>
        <path d="${line1.d} L ${width} ${height} L 0 ${height} Z" fill="${line1.fill}"></path>
        <path d="${line3.d}" fill="none" stroke="${line3.color}" stroke-width="2"></path>
        <path d="${line2.d}" fill="none" stroke="${line2.color}" stroke-width="2"></path>
        <path d="${line1.d}" fill="none" stroke="${line1.color}" stroke-width="3"></path>
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
      console.error(e);
      const sideTitle = document.getElementById("sideTitle");
      if (sideTitle) sideTitle.innerText = "Unable to load data";
    }
  }

  function updateUI(markets) {
    // AGORA PEGAMOS 6 MERCADOS
    const heroMarkets = markets.slice(0, 6);
    const sideMarket = markets[6] || markets[0]; // O lateral agora é o 7º ou o 1º
    
    const slidesContainer = document.getElementById("pmSlides");

    if (slidesContainer) {
      // 1. Renderiza os Slides
      slidesContainer.innerHTML = heroMarkets.map((m) => {
        const mainProb = Math.round(m.last_price || 50);
        const altProb1 = Math.round(Math.random() * (100 - mainProb) * 0.6);
        const altProb2 = Math.round(Math.random() * (100 - mainProb - altProb1) * 0.5);

        return `
        <article class="pm-slide">
          <div class="pm-card pm-card--hero">
            <div class="pm-hero-container">
              <div class="k-left-col">
                <div class="k-header">
                  <div class="k-main-icon" style="background-image: url('${m.image_url || ''}');">
                     ${!m.image_url ? '📊' : ''}
                  </div>
                  <div class="k-title">${m.title}</div>
                </div>

                <div class="k-outcomes-list">
                  <div class="k-outcome-row">
                    <div class="k-outcome-info">
                      <div class="k-mini-icon" style="background-image: url('${m.image_url || ''}');"></div>
                      <span class="k-outcome-name">Main Outcome</span>
                    </div>
                    <div class="k-outcome-right">
                      <span class="k-pct" style="color: #00d293;">${mainProb}%</span>
                      <div class="k-yn-group">
                        <button class="k-btn yes">Yes</button>
                        <button class="k-btn no">No</button>
                      </div>
                    </div>
                  </div>
                  
                  <div class="k-outcome-row" style="opacity: 0.7;">
                    <div class="k-outcome-info">
                      <div class="k-mini-icon"></div>
                      <span class="k-outcome-name">Alternative A</span>
                    </div>
                    <div class="k-outcome-right">
                      <span class="k-pct" style="color: #3b82f6;">${altProb1}%</span>
                      <div class="k-yn-group">
                        <button class="k-btn yes">Yes</button>
                        <button class="k-btn no">No</button>
                      </div>
                    </div>
                  </div>
                   <div class="k-outcome-row" style="opacity: 0.5; border-bottom: none;">
                    <div class="k-outcome-info">
                      <div class="k-mini-icon"></div>
                      <span class="k-outcome-name">Alternative B</span>
                    </div>
                    <div class="k-outcome-right">
                      <span class="k-pct">${altProb2}%</span>
                      <div class="k-yn-group">
                        <button class="k-btn yes">Yes</button>
                        <button class="k-btn no">No</button>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="k-news-section">
                  <div class="k-news-meta">
                    <span style="font-weight:700; color:#000;">News ·</span>
                    <span>Vol: ${fmtVol(m.volume)} active in this market block.</span>
                  </div>
                </div>
              </div>

              <div class="k-right-col">
                <div class="k-chart-legend">
                  <div class="k-legend-item"><div class="k-dot green"></div> Main ${mainProb}%</div>
                  <div class="k-legend-item"><div class="k-dot blue"></div> Alt A ${altProb1}%</div>
                  <div class="k-legend-item"><div class="k-dot gray"></div> Alt B ${altProb2}%</div>
                </div>
                <div class="k-chart-container">
                  ${drawChart()}
                </div>
              </div>
            </div>
          </div>
        </article>
      `}).join('');

      // 2. Renderiza os Dots (Bolinhas) fora dos slides
      // Procura se já existe, se não cria e anexa após o slider
      const carouselContainer = document.querySelector('.pm-carousel');
      let dotsContainer = document.querySelector('.pm-dots-container');
      
      if (!dotsContainer && carouselContainer) {
        dotsContainer = document.createElement('div');
        dotsContainer.className = 'pm-dots-container';
        carouselContainer.appendChild(dotsContainer);
      }

      if (dotsContainer) {
        dotsContainer.innerHTML = heroMarkets.map((_, i) => 
          `<button class="pm-dot ${i === 0 ? 'is-active' : ''}" data-index="${i}"></button>`
        ).join('');
      }
    }

    const sideWidget = document.getElementById("pmSideWidget");
    if (sideWidget) {
      sideWidget.innerHTML = `
        <div class="k-side-header">${sideMarket.title}</div>
        
        <div style="margin: 20px 0;">
          <div class="k-side-row">
            <span class="k-side-label">Current Odds</span>
             <div class="k-outcome-right">
                <span class="k-pct" style="color: #00d293;">${Math.round(sideMarket.last_price || 50)}%</span>
                <div class="k-yn-group">
                  <button class="k-btn yes">Y</button>
                  <button class="k-btn no">N</button>
                </div>
            </div>
          </div>
        </div>

        <div class="k-side-actions">
          <div class="k-vol-label" style="font-size:14px; font-weight:600; margin-bottom:5px;">Volume: ${fmtVol(sideMarket.volume)}</div>
          <button class="btn-dflow">⚡ Bet On-Chain</button>
          <button class="btn-kalshi-link" onclick="window.open('https://kalshi.com/markets/${sideMarket.ticker}?ref=flashscreener')">
            Kalshi ↗
          </button>
        </div>
      `;
    }

    // --- LÓGICA DE NAVEGAÇÃO ---
    const slides = document.getElementById("pmSlides");
    const dots = document.querySelectorAll(".pm-dot");
    const totalSlides = heroMarkets.length;
    let currentSlide = 0;

    const goToSlide = (index) => {
      if (index < 0) index = totalSlides - 1;
      if (index >= totalSlides) index = 0;
      currentSlide = index;
      
      // Move o Slide
      slides.style.transform = `translateX(-${currentSlide * 100}%)`;
      
      // Atualiza os Dots
      dots.forEach((dot, idx) => {
        if (idx === currentSlide) dot.classList.add('is-active');
        else dot.classList.remove('is-active');
      });
    };

    // Adiciona clique nas bolinhas
    dots.forEach(dot => {
      dot.onclick = () => {
        const idx = parseInt(dot.getAttribute('data-index'));
        goToSlide(idx);
      };
    });

    // Auto-play opcional (se quiser, descomente abaixo)
    // setInterval(() => goToSlide(currentSlide + 1), 6000);
  }

  fetchMarkets();
})();
