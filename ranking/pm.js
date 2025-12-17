(() => {
  const root = document.getElementById("pm-strip");
  if (!root) return;

  const chartSVG = (stroke) => `
    <svg viewBox="0 0 640 320" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="pmGridFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgba(11,15,26,.10)"/>
          <stop offset="100%" stop-color="rgba(11,15,26,.04)"/>
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="640" height="320" fill="url(#pmGridFade)"></rect>
      <g stroke="rgba(11,15,26,.10)" stroke-width="1">
        <line x1="0" y1="64" x2="640" y2="64"></line>
        <line x1="0" y1="128" x2="640" y2="128"></line>
        <line x1="0" y1="192" x2="640" y2="192"></line>
        <line x1="0" y1="256" x2="640" y2="256"></line>
      </g>
      <path d="M0,80 L40,92 L80,70 L120,88 L160,96 L200,122 L240,110 L280,146 L320,132 L360,170 L400,158 L440,210 L480,198 L520,236 L560,224 L600,260 L640,288"
            fill="none" stroke="${stroke}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M0,312 L640,312" stroke="rgba(11,15,26,.18)" stroke-width="2"></path>
    </svg>
  `;

  root.innerHTML = `
    <div class="pm-grid">
      <div class="pm-card pm-card--hero">
        <div class="pm-carousel">
          <div class="pm-slides" id="pmSlides">
            <article class="pm-slide" data-url="https://kalshi.com/">
              <div class="pm-hero">
                <div class="pm-left">
                  <div class="pm-header">
                    <div class="pm-market-icon"></div>
                    <div>
                      <div class="pm-market-title">House passes bill to extend ACA premium tax credits?</div>
                    </div>
                  </div>

                  <div class="pm-outcomes">
                    <div class="pm-row">
                      <div class="pm-row-label">Before Feb 2026</div>
                      <div class="pm-row-right">
                        <div class="pm-row-pct">83%</div>
                        <div class="pm-yn">
                          <button class="pm-yn-btn" type="button">Yes</button>
                          <button class="pm-yn-btn" type="button">No</button>
                        </div>
                      </div>
                    </div>

                    <div class="pm-row">
                      <div class="pm-row-label">Before 2027</div>
                      <div class="pm-row-right">
                        <div class="pm-row-pct">84%</div>
                        <div class="pm-yn">
                          <button class="pm-yn-btn" type="button">Yes</button>
                          <button class="pm-yn-btn" type="button">No</button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="pm-news">
                    <div class="pm-news-label">News</div>
                    <div class="pm-news-text">Four moderate House Republicans joined Democrats to force a vote on extending Affordable Care…</div>
                  </div>
                </div>

                <div class="pm-right">
                  <div class="pm-right-top">
                    <div class="pm-legend">
                      <div class="pm-legend-item"><span class="pm-legend-dot" style="background:#24b26b"></span> Before 2027 <span class="pm-legend-pct">84%</span></div>
                      <div class="pm-legend-item"><span class="pm-legend-dot" style="background:#3b6cff"></span> Before Feb 2026 <span class="pm-legend-pct">83%</span></div>
                      <div class="pm-legend-item"><span class="pm-legend-dot" style="background:#0b0f1a"></span> Before 2026 <span class="pm-legend-pct">1%</span></div>
                    </div>
                    <div class="pm-brand">Kalshi</div>
                  </div>
                  <div class="pm-chart">${chartSVG("rgba(11,15,26,.90)")}</div>
                </div>
              </div>
            </article>

            <article class="pm-slide" data-url="https://kalshi.com/">
              <div class="pm-hero">
                <div class="pm-left">
                  <div class="pm-header">
                    <div class="pm-market-icon"></div>
                    <div>
                      <div class="pm-market-title">Will the Fed cut rates by the next meeting?</div>
                    </div>
                  </div>

                  <div class="pm-outcomes">
                    <div class="pm-row">
                      <div class="pm-row-label">Cut by 25 bps</div>
                      <div class="pm-row-right">
                        <div class="pm-row-pct">41%</div>
                        <div class="pm-yn">
                          <button class="pm-yn-btn" type="button">Yes</button>
                          <button class="pm-yn-btn" type="button">No</button>
                        </div>
                      </div>
                    </div>

                    <div class="pm-row">
                      <div class="pm-row-label">No change</div>
                      <div class="pm-row-right">
                        <div class="pm-row-pct">56%</div>
                        <div class="pm-yn">
                          <button class="pm-yn-btn" type="button">Yes</button>
                          <button class="pm-yn-btn" type="button">No</button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="pm-news">
                    <div class="pm-news-label">News</div>
                    <div class="pm-news-text">Traders are repricing expectations after the latest inflation print and updated guidance…</div>
                  </div>
                </div>

                <div class="pm-right">
                  <div class="pm-right-top">
                    <div class="pm-legend">
                      <div class="pm-legend-item"><span class="pm-legend-dot" style="background:#24b26b"></span> Cut <span class="pm-legend-pct">41%</span></div>
                      <div class="pm-legend-item"><span class="pm-legend-dot" style="background:#0b0f1a"></span> No cut <span class="pm-legend-pct">59%</span></div>
                    </div>
                    <div class="pm-brand">Kalshi</div>
                  </div>
                  <div class="pm-chart">${chartSVG("rgba(11,15,26,.90)")}</div>
                </div>
              </div>
            </article>
          </div>

          <div class="pm-dots" id="pmDots">
            <button class="pm-dot is-active" type="button" data-i="0" aria-label="Market 1"></button>
            <button class="pm-dot" type="button" data-i="1" aria-label="Market 2"></button>
          </div>
        </div>
      </div>

      <div class="pm-card pm-card--side">
        <div class="pm-side-head">
          <div class="pm-side-icon"></div>
          <div class="pm-side-title">How high will Bitcoin get this year?</div>
        </div>

        <div class="pm-side-rows">
          <div class="pm-side-row">
            <div class="pm-side-label">$150,000 or above</div>
            <div class="pm-side-right">
              <div class="pm-side-pct">1%</div>
              <div class="pm-yn">
                <button class="pm-yn-btn" type="button">Yes</button>
                <button class="pm-yn-btn" type="button">No</button>
              </div>
            </div>
          </div>

          <div class="pm-side-row">
            <div class="pm-side-label">$130,000 or above</div>
            <div class="pm-side-right">
              <div class="pm-side-pct">2%</div>
              <div class="pm-yn">
                <button class="pm-yn-btn" type="button">Yes</button>
                <button class="pm-yn-btn" type="button">No</button>
              </div>
            </div>
          </div>
        </div>

        <div class="pm-side-meta">
          <div class="pm-side-meta-left">
            <span>$30,353,237</span>
            <span>·</span>
            <span>Annually</span>
          </div>
          <button class="pm-open-official" type="button" data-url="https://kalshi.com/">Open on Kalshi</button>
        </div>
      </div>
    </div>
  `;

  const slides = root.querySelector("#pmSlides");
  const dotsWrap = root.querySelector("#pmDots");
  if (!slides || !dotsWrap) return;

  const dots = Array.prototype.slice.call(dotsWrap.querySelectorAll(".pm-dot"));
  let idx = 0;

  const setIndex = (n) => {
    idx = Math.max(0, Math.min(dots.length - 1, n));
    slides.style.transform = `translateX(${-100 * idx}%)`;
    dots.forEach((d, i) => (i === idx ? d.classList.add("is-active") : d.classList.remove("is-active")));
  };

  dots.forEach((d) => {
    d.addEventListener("click", () => {
      const n = Number(d.getAttribute("data-i"));
      if (!Number.isFinite(n)) return;
      setIndex(n);
    });
  });

  const openBtn = root.querySelector(".pm-open-official");
  if (openBtn) {
    openBtn.addEventListener("click", () => {
      const url = openBtn.getAttribute("data-url");
      if (!url) return;
      window.open(url, "_blank", "noopener,noreferrer");
    });
  }

  root.querySelectorAll(".pm-yn-btn").forEach((b) => {
    b.addEventListener("click", (e) => e.stopPropagation());
  });

  setIndex(0);
})();
