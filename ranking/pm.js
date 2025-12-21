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
    
    // Gera apenas UMA linha de gráfico (a do mercado real)
    const generatePath = (color) => {
      let points = [];
      let start = 40; 
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
      return { d, color, fill: `url(#grad-${color.replace('#','')})` };
    };

    const line1 = generatePath('#00d293');

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
      if (sideTitle) sideTitle.innerText = "Markets Unavailable";
    }
  }

  function updateUI(markets) {
    const heroMarkets = markets.slice(0, 6);
    const sideMarket = markets[6] || markets[0];
    const slidesContainer = document.getElementById("pmSlides");
    const carousel = document.querySelector('.pm-carousel');

    // 1. RENDERIZA OS SLIDES
    if (slidesContainer) {
      slidesContainer.innerHTML = heroMarkets.map((m) => {
        const mainProb = Math.round(m.last_price || 50);
        
        // LÓGICA DE DADOS REAIS:
        // Usa a imagem da API. Se não tiver, usa um ícone genérico.
        const imgUrl = m.image_url; 
        const imgStyle = imgUrl 
          ? `background-image: url('${imgUrl}'); background-size: cover;` 
          : `background-color: #f7f7f7; display: flex; align-items: center; justify-content: center;`;
        const imgContent = !imgUrl ? '📊' : '';

        // Usa o 'subtitle' para o nome do candidato (ex: "Donald Trump"). 
        // Se não tiver subtitle, usa "Yes" (padrão da Kalshi para mercados simples).
        const outcomeName = m.subtitle || "Yes";

        return `
        <article class="pm-slide">
          <div class="pm-card pm-card--hero">
            <div class="pm-hero-container">
              
              <div class="k-left-col">
                <div class="k-header">
                  <div class="k-main-icon" style="${imgStyle}">${imgContent}</div>
                  <div class="k-title">${m.title}</div>
                </div>

                <div class="k-outcomes-list" style="justify-content: center;">
                  <div class="k-outcome-row" style="border-bottom: none; padding: 15px 0;">
                    <div class="k-outcome-info">
                      <div class="k-mini-icon" style="${imgStyle}"></div>
                      <span class="k-outcome-name" style="font-size: 16px; font-weight: 600;">${outcomeName}</span>
                    </div>
                    
                    <div class="k-outcome-right">
                      <span class="k-pct" style="color: #00d293; font-size: 18px;">${mainProb}%</span>
                      <div class="k-yn-group">
                        <button class="k-btn yes">Yes</button>
                        <button class="k-btn no">No</button>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="k-news-section">
                  <div class="k-news-meta">
                    <span style="font-weight:700; color:#000;">Data ·</span>
                    <span>Vol: ${fmtVol(m.volume)} traded</span>
                  </div>
                </div>
              </div>

              <div class="k-right-col">
                <div class="k-chart-legend">
                  <div class="k-legend-item">
                    <div class="k-dot green"></div> 
                    ${outcomeName} (${mainProb}%)
                  </div>
                </div>
                <div class="k-chart-container">
                  ${drawChart()}
                </div>
              </div>

            </div>
          </div>
        </article>
      `}).join('');
    }

    // 2. CONFIGURA NAVEGAÇÃO (SETAS E DOTS)
    if (carousel) {
      // Limpa navegação antiga
      const oldNav = carousel.querySelector('.pm-dots-container');
      if(oldNav) oldNav.remove();

      const controlsContainer = document.createElement('div');
      controlsContainer.className = 'pm-dots-container';

      const prevBtn = document.createElement('button');
      prevBtn.className = 'pm-nav-arrow pm-prev';
      prevBtn.innerHTML = '←';

      const nextBtn = document.createElement('button');
      nextBtn.className = 'pm-nav-arrow pm-next';
      nextBtn.innerHTML = '→';

      const dotsHTML = heroMarkets.map((_, i) => 
        `<button class="pm-dot ${i === 0 ? 'is-active' : ''}" data-index="${i}"></button>`
      ).join('');

      controlsContainer.appendChild(prevBtn);
      controlsContainer.insertAdjacentHTML('beforeend', dotsHTML);
      controlsContainer.appendChild(nextBtn);

      carousel.appendChild(controlsContainer);
      
      const slides = document.getElementById("pmSlides");
      const dots = controlsContainer.querySelectorAll(".pm-dot");
      const totalSlides = heroMarkets.length;
      let currentSlide = 0;

      const goToSlide = (index) => {
        if (index < 0) index = totalSlides - 1;
        if (index >= totalSlides) index = 0;
        currentSlide = index;
        slides.style.transform = `translateX(-${currentSlide * 100}%)`;
        dots.forEach((dot, idx) => dot.classList.toggle('is-active', idx === currentSlide));
      };

      prevBtn.onclick = () => goToSlide(currentSlide - 1);
      nextBtn.onclick = () => goToSlide(currentSlide + 1);
      dots.forEach(dot => {
        dot.onclick = () => goToSlide(parseInt(dot.dataset.index));
      });
    }

    // 3. WIDGET LATERAL
    const sideWidget = document.getElementById("pmSideWidget");
    if (sideWidget) {
      const imgUrl = sideMarket.image_url;
      const imgStyle = imgUrl 
          ? `background-image: url('${imgUrl}'); background-size: cover;` 
          : `background-color: #f7f7f7; display: flex; align-items: center; justify-content: center;`;
      const imgContent = !imgUrl ? '📈' : '';

      sideWidget.innerHTML = `
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:15px;">
           <div class="pm-side-icon" id="sideIcon" style="${imgStyle} width:40px; height:40px; border-radius:8px;">${imgContent}</div>
           <div class="k-side-header" style="font-size:16px;">${sideMarket.title}</div>
        </div>
        
        <div style="margin: 20px 0;">
          <div class="k-side-row">
            <span class="k-side-label">${sideMarket.subtitle || "Current Odds"}</span>
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
          <button class="btn-kalshi-link" onclick="window.open('https://kalshi.com/markets/${sideMarket.ticker}?ref=flashscreener')">Kalshi ↗</button>
        </div>
      `;
    }
  }

  fetchMarkets();
})();
