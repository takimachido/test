(() => {
  const root = document.getElementById("pm-strip");
  if (!root) return;

  // SUA URL DO RENDER AQUI
  const API_PM_BACKEND = "https://prediction-backend-r0vj.onrender.com";

  // Formatador de Moeda (Estilo Kalshi: sem casas decimais para valores altos)
  const fmtVol = (n) => {
    if (!n) return "$0";
    if (n >= 1000000) return "$" + (n / 1000000).toFixed(0) + "M";
    if (n >= 1000) return "$" + (n / 1000).toFixed(0) + "k";
    return "$" + Math.floor(n).toLocaleString();
  };

  // Função para desenhar o gráfico estilo Kalshi (Multi-linhas)
  const drawChart = () => {
    const width = 600;
    const height = 250;
    
    // Gera dados fictícios para 3 linhas (Verde, Azul, Cinza)
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

    const line1 = generatePath('#00d293', true); // Verde (Principal)
    const line2 = generatePath('#3b82f6', false); // Azul
    const line3 = generatePath('#9ca3af', false); // Cinza

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
      console.error("Erro:", e);
      const sideTitle = document.getElementById("sideTitle");
      if (sideTitle) sideTitle.innerText = "Unable to load data";
    }
  }

  function updateUI(markets) {
    const heroMarkets = markets.slice(0, 3);
    const sideMarket = markets[3] || markets[0];
    const slidesContainer = document.getElementById("pmSlides");

    if (slidesContainer) {
      slidesContainer.innerHTML = heroMarkets.map((m) => {
        const mainProb = Math.round(m.last_price || 50);
        // Simulando outros resultados para o visual ficar igual ao da Kalshi
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
                  <div class="k-news-header">
                    <span class="k-news-label">News</span> · 
                    <span class="k-news-text">Vol: ${fmtVol(m.volume)} active in this market block.</span>
                  </div>
                  <div class="k-news-meta">
                    <span>${fmtVol(m.volume * 1.2)} total pool</span>
                    <span>⊕</span>
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
            
            <div class="k-footer-nav">
              <div class="k-nav-item">
                <div class="k-nav-arrow">←</div>
                <span>Previous market...</span>
              </div>
              <div class="k-nav-item">
                <span>Next market...</span>
                <div class="k-nav-arrow">→</div>
              </div>
            </div>

          </div>
        </article>
      `}).join('');
    }

    /* --- ATUALIZAÇÃO DO WIDGET LATERAL --- */
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
          <div class="k-vol-label">Volume: ${fmtVol(sideMarket.volume)}</div>
          <button class="btn-dflow">⚡ Bet On-Chain</button>
          <button class="btn-kalshi-link" onclick="window.open('https://kalshi.com/markets/${sideMarket.ticker}?ref=flashscreener')">
            Kalshi ↗
          </button>
        </div>
      `;
    }
  }

  // Navegação dos dots
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
