(() => {
  const root = document.getElementById("pm-strip");
  if (!root) return;

  // ⚠️ IMPORTANTE: Cole aqui a URL nova que aparecer no seu painel do Render após o deploy do prediction_backend
  const API_PM_BACKEND = "https://prediction-backend-r0vj.onrender.com"; 

  const fmtVol = (n) => {
    if (!n) return "$0";
    if (n >= 1000000) return "$" + (n / 1000000).toFixed(1) + "M";
    if (n >= 1000) return "$" + (n / 1000).toFixed(1) + "k";
    return "$" + Math.floor(n);
  };

  const drawChart = (color) => {
    // Gera dados aleatórios para o visual do gráfico (placeholder visual)
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

  // --- SKELETON LOADER (Efeito de Carregamento) ---
  function renderSkeleton() {
    const slidesContainer = document.getElementById("pmSlides");
    const sideRows = document.getElementById("sideRows");
    const sideTitle = document.getElementById("sideTitle");
    const sideIcon = document.getElementById("sideIcon");
    const sideVol = document.getElementById("sideVol");

    // Skeleton Widget Principal
    if (slidesContainer) {
      slidesContainer.innerHTML = `
        <article class="pm-slide">
          <div class="pm-hero">
            <div class="pm-left">
              <div class="pm-header">
                <div class="pm-market-icon skeleton"></div>
                <div class="skeleton skeleton-text" style="width: 60%; height: 24px;"></div>
              </div>
              <div class="pm-outcomes">
                <div class="pm-row">
                  <div class="skeleton skeleton-text" style="width: 30%;"></div>
                  <div class="pm-row-right">
                    <div class="skeleton skeleton-btn"></div>
                    <div class="skeleton skeleton-btn"></div>
                  </div>
                </div>
              </div>
              <div class="pm-news">
                 <div class="skeleton skeleton-text" style="width: 100%;"></div>
                 <div class="skeleton skeleton-text" style="width: 80%;"></div>
              </div>
            </div>
            <div class="pm-right">
              <div class="pm-chart skeleton"></div>
            </div>
          </div>
        </article>
      `;
    }

    // Skeleton Widget Lateral
    if (sideTitle) {
      sideTitle.innerHTML = '<div class="skeleton skeleton-text" style="width: 140px;"></div>';
      if(sideIcon) sideIcon.classList.add('skeleton');
      if(sideVol) sideVol.innerHTML = '<span class="skeleton" style="display:inline-block; width: 50px;">&nbsp;</span>';
    }

    if (sideRows) {
      sideRows.innerHTML = `
        <div class="pm-side-row pm-row">
           <div class="skeleton skeleton-text" style="width: 60px;"></div>
           <div class="pm-side-right pm-row-right">
              <div class="skeleton skeleton-btn"></div>
              <div class="skeleton skeleton-btn"></div>
           </div>
        </div>
      `;
    }
  }

  async function fetchMarkets() {
    renderSkeleton(); // Mostra o esqueleto imediatamente

    try {
      const response = await fetch(`${API_PM_BACKEND}/kalshi-markets`);
      
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const data = await response.json();
      
      if (data && data.markets && data.markets.length > 0) {
        // Remove a classe skeleton do icone antes de atualizar
        const sideIcon = document.getElementById("sideIcon");
        if(sideIcon) sideIcon.classList.remove('skeleton');
        
        updateUI(data.markets);
      } else {
        throw new Error("Nenhum mercado encontrado na resposta.");
      }
    } catch (e) {
      console.error("Erro ao carregar Prediction Markets:", e);
      // Mantém o loading ou mostra erro discreto se preferir
      const sideTitle = document.getElementById("sideTitle");
      if (sideTitle && !sideTitle.querySelector('.skeleton')) {
         sideTitle.innerText = "Markets Offline";
      }
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
                  ${!m.image_url ? '<span style="display:flex;align-items:center;justify-content:center;height:100%;font-size:18px;">📊</span>' : ''}
                </div>
                <div class="pm-market-title">${m.title}</div>
              </div>
              <div class="pm-outcomes">
                <div class="pm-row">
                  <div class="pm-row-label">Probability</div>
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
    const sideIcon = document.getElementById("sideIcon");

    if (sideTitle) sideTitle.innerText = sideMarket.title;
    if (sideVol) sideVol.innerText = fmtVol(sideMarket.volume);
    
    if (sideIcon) {
        // Limpa classes antigas de skeleton
        sideIcon.className = "pm-side-icon"; 
        sideIcon.style.backgroundImage = `url('${sideMarket.image_url || ''}')`;
        sideIcon.style.backgroundSize = "cover";
        sideIcon.style.backgroundPosition = "center";
        if(!sideMarket.image_url) sideIcon.innerText = "📈";
        else sideIcon.innerText = "";
    }

    if (sideRows) {
      sideRows.innerHTML = `
        <div class="pm-side-row pm-row">
          <div class="pm-side-label pm-row-label">Current Odds</div>
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

  // Navegação do Carrossel (Dots)
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

  // Inicia
  fetchMarkets();
})();
