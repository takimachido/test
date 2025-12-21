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

  // Função para desenhar linhas baseadas nos dados reais (agora suporta multilinhas)
  const drawChart = (outcomeCount) => {
    const width = 600;
    const height = 250;
    
    // Gera dados aleatórios mas coerentes para cada linha
    const createPath = (color, index) => {
      // Simula um gráfico histórico
      let points = [];
      // O primeiro começa alto, os outros mais baixo
      let start = index === 0 ? 55 : (30 - index * 10);
      
      for(let i=0; i<15; i++) {
        start += (Math.random() - 0.5) * 10;
        points.push(Math.max(2, Math.min(98, start)));
      }

      let d = `M 0 ${height - (points[0]/100)*height}`;
      points.forEach((p, i) => {
        const x = (i / (points.length - 1)) * width;
        const y = height - (p / 100) * height;
        d += ` L ${x} ${y}`;
      });
      
      return { d, color };
    };

    const colors = ['#00d293', '#3b82f6', '#9ca3af']; // Verde, Azul, Cinza
    let pathsHtml = '';

    // Cria uma linha para cada candidato que existe (até 3)
    for(let i = 0; i < outcomeCount; i++) {
        const path = createPath(colors[i] || '#999', i);
        // A primeira linha tem preenchimento (area chart), as outras só linha
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
      <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" style="width:100%; height:100%;">
        <line x1="0" y1="${height*0.25}" x2="${width}" y2="${height*0.25}" stroke="#f0f0f0" stroke-width="1" stroke-dasharray="4"/>
        <line x1="0" y1="${height*0.5}" x2="${width}" y2="${height*0.5}" stroke="#f0f0f0" stroke-width="1" stroke-dasharray="4"/>
        <line x1="0" y1="${height*0.75}" x2="${width}" y2="${height*0.75}" stroke="#f0f0f0" stroke-width="1" stroke-dasharray="4"/>
        ${pathsHtml}
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

  function updateUI(events) {
    const heroEvents = events.slice(0, 6);
    const sideEvent = events[6] || events[0];
    
    const slidesContainer = document.getElementById("pmSlides");
    const carousel = document.querySelector('.pm-carousel');

    // 1. RENDERIZA OS SLIDES
    if (slidesContainer) {
      slidesContainer.innerHTML = heroEvents.map((evt) => {
        // Pega a imagem (ou fallback)
        const imgUrl = evt.image_url; 
        const imgStyle = imgUrl 
          ? `background-image: url('${imgUrl}'); background-size: cover;` 
          : `background-color: #f7f7f7; display: flex; align-items: center; justify-content: center;`;
        const imgContent = !imgUrl ? '📊' : '';

        // GERA AS LINHAS DE RESULTADOS (LOOP DINÂMICO)
        // Aqui está o segredo: mapeamos os `outcomes` reais que o backend agrupou
        const outcomesHtml = evt.outcomes.map((outcome, idx) => {
            // Cores: 1º Verde, 2º Azul, 3º Cinza
            const color = idx === 0 ? '#00d293' : (idx === 1 ? '#3b82f6' : '#9ca3af');
            const pct = Math.round(outcome.price || 1);
            const opacity = idx === 0 ? '1' : '0.8';
            
            return `
             <div class="k-outcome-row" style="opacity:${opacity}; border-bottom: 1px solid #f7f7f7;">
                <div class="k-outcome-info">
                  <div class="k-mini-icon" style="${idx === 0 ? imgStyle : 'background:#eee'}"></div>
                  <span class="k-outcome-name">${outcome.name}</span>
                </div>
                <div class="k-outcome-right">
                  <span class="k-pct" style="color: ${color};">${pct}%</span>
                  <div class="k-yn-group">
                    <button class="k-btn yes">Yes</button>
                    <button class="k-btn no">No</button>
                  </div>
                </div>
              </div>
            `;
        }).join('');

        // Gera a legenda do gráfico baseada nos mesmos dados
        const legendHtml = evt.outcomes.map((outcome, idx) => {
            const colorClass = idx === 0 ? 'green' : (idx === 1 ? 'blue' : 'gray');
            return `<div class="k-legend-item"><div class="k-dot ${colorClass}"></div> ${outcome.name} ${Math.round(outcome.price)}%</div>`;
        }).join('');

        return `
        <article class="pm-slide">
          <div class="pm-card pm-card--hero">
            <div class="pm-hero-container">
              
              <div class="k-left-col">
                <div class="k-header">
                  <div class="k-main-icon" style="${imgStyle}">${imgContent}</div>
                  <div class="k-title">${evt.title}</div>
                </div>

                <div class="k-outcomes-list">
                  ${outcomesHtml} </div>

                <div class="k-news-section">
                  <div class="k-news-meta">
                    <span style="font-weight:700; color:#000;">Market Data ·</span>
                    <span>Total Vol: ${fmtVol(evt.volume)}</span>
                  </div>
                </div>
              </div>

              <div class="k-right-col">
                <div class="k-chart-legend">
                  ${legendHtml}
                </div>
                <div class="k-chart-container">
                  ${drawChart(evt.outcomes.length)} </div>
              </div>
            </div>
          </div>
        </article>
      `}).join('');
    }

    // 2. CONTROLES (SETAS E BOLINHAS)
    if (carousel) {
      const oldNav = carousel.querySelector('.pm-dots-container');
      if(oldNav) oldNav.remove();

      const controls = document.createElement('div');
      controls.className = 'pm-dots-container';

      const prev = document.createElement('button');
      prev.className = 'pm-nav-arrow pm-prev';
      prev.innerHTML = '←';

      const next = document.createElement('button');
      next.className = 'pm-nav-arrow pm-next';
      next.innerHTML = '→';

      const dotsHTML = heroEvents.map((_, i) => 
        `<button class="pm-dot ${i === 0 ? 'is-active' : ''}" data-index="${i}"></button>`
      ).join('');

      controls.appendChild(prev);
      controls.insertAdjacentHTML('beforeend', dotsHTML);
      controls.appendChild(next);
      carousel.appendChild(controls);

      const slides = document.getElementById("pmSlides");
      const dots = controls.querySelectorAll(".pm-dot");
      const total = heroEvents.length;
      let curr = 0;

      const go = (i) => {
        if (i < 0) i = total - 1;
        if (i >= total) i = 0;
        curr = i;
        slides.style.transform = `translateX(-${curr * 100}%)`;
        dots.forEach((d, idx) => d.classList.toggle('is-active', idx === curr));
      };

      prev.onclick = () => go(curr - 1);
      next.onclick = () => go(curr + 1);
      dots.forEach(d => d.onclick = () => go(parseInt(d.dataset.index)));
    }

    // 3. WIDGET LATERAL
    const sideWidget = document.getElementById("pmSideWidget");
    if (sideWidget) {
      const mainOutcome = sideEvent.outcomes[0]; // Pega o favorito
      const imgUrl = sideEvent.image_url;
      const imgStyle = imgUrl 
          ? `background-image: url('${imgUrl}'); background-size: cover;` 
          : `background-color: #f7f7f7; display: flex; align-items: center; justify-content: center;`;
      const imgContent = !imgUrl ? '📈' : '';

      sideWidget.innerHTML = `
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:15px;">
           <div class="pm-side-icon" id="sideIcon" style="${imgStyle} width:40px; height:40px; border-radius:8px;">${imgContent}</div>
           <div class="k-side-header" style="font-size:16px;">${sideEvent.title}</div>
        </div>
        
        <div style="margin: 20px 0;">
          <div class="k-side-row">
            <span class="k-side-label">${mainOutcome.name}</span>
             <div class="k-outcome-right">
                <span class="k-pct" style="color: #00d293;">${Math.round(mainOutcome.price)}%</span>
                <div class="k-yn-group"><button class="k-btn yes">Y</button><button class="k-btn no">N</button></div>
            </div>
          </div>
        </div>

        <div class="k-side-actions">
          <div class="k-vol-label" style="font-size:14px; font-weight:600; margin-bottom:5px;">Vol: ${fmtVol(sideEvent.volume)}</div>
          <button class="btn-dflow">⚡ Bet On-Chain</button>
          <button class="btn-kalshi-link" onclick="window.open('https://kalshi.com/markets/${mainOutcome.ticker}?ref=flashscreener')">Kalshi ↗</button>
        </div>
      `;
    }
  }

  fetchMarkets();
})();
