(() => {
  const chartSVG = (color) => `
    <svg viewBox="0 0 640 320" preserveAspectRatio="none" style="width:100%; height:100%;">
      <defs>
        <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${color}" stop-opacity="0.1"/>
          <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <path d="M0,80 L40,92 L80,70 L120,88 L160,96 L200,122 L240,110 L280,146 L320,132 L360,170 L400,158 L440,210 L480,198 L520,236 L560,224 L600,260 L640,288"
            fill="url(#fade)" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></path>
    </svg>
  `;

  const c1 = document.getElementById("chart-slide-1");
  const c2 = document.getElementById("chart-slide-2");
  if (c1) c1.innerHTML = chartSVG("#22d3ee");
  if (c2) c2.innerHTML = chartSVG("#a78bfa");

  const slides = document.getElementById("pmSlides");
  const dots = document.querySelectorAll(".pm-dot");
  
  if (slides && dots.length) {
    dots.forEach(dot => {
      dot.addEventListener("click", () => {
        const i = Number(dot.dataset.i);
        slides.style.transform = `translateX(-${i * 100}%)`;
        dots.forEach((d, idx) => d.classList.toggle("is-active", idx === i));
      });
    });
  }

  const kBtn = document.querySelector(".btn-kalshi-link");
  if (kBtn) {
    kBtn.addEventListener("click", () => {
      window.open(kBtn.dataset.url, "_blank");
    });
  }
})();
