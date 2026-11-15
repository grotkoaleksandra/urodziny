// Halftone: turns any photo into ink dots (same idea as Karol on cotoaleksandra).
// Reusable for the template business: any host photo → on-brand card art.
window.Halftone = (() => {
  // Draw `src` (img/canvas) into `canvas` as a halftone, object-fit: cover.
  function render(canvas, src, { cell = 5, ink = "#2a2926", contrast = 1.25, angle = 45 } = {}) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = canvas.clientWidth, H = canvas.clientHeight;
    if (!W || !H) return;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // sample the source on a grid big enough to cover the rotated screen
    const diag = Math.ceil(Math.hypot(W, H));
    const cols = Math.ceil(diag / cell), rows = cols;
    const s = document.createElement("canvas");
    s.width = cols; s.height = rows;
    const sx = s.getContext("2d", { willReadFrequently: true });
    sx.fillStyle = "#fff"; sx.fillRect(0, 0, cols, rows);
    // cover-fit the source into the W×H window, then place that inside the diag square
    const sw = src.naturalWidth || src.width, sh = src.naturalHeight || src.height;
    const scale = Math.max(W / sw, H / sh);
    const dw = sw * scale, dh = sh * scale;
    const k = cols / diag;
    sx.save();
    sx.translate(cols / 2, rows / 2);
    sx.rotate((-angle * Math.PI) / 180);
    sx.drawImage(src, (-dw / 2) * k, (-dh / 2) * k, dw * k, dh * k);
    sx.restore();
    const px = sx.getImageData(0, 0, cols, rows).data;

    ctx.fillStyle = ink;
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate((angle * Math.PI) / 180);
    ctx.translate(-diag / 2, -diag / 2);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = (y * cols + x) * 4;
        const lum = (px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114) / 255;
        let d = Math.min(1, Math.max(0, (1 - lum - 0.5) * contrast + 0.5));
        if (d < 0.06) continue;
        const r = (cell / 2) * Math.sqrt(d) * 1.12;
        ctx.beginPath();
        ctx.arc(x * cell + cell / 2, y * cell + cell / 2, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // Stand-in until Ola's photo exists: a figure slipping away with an armful
  // of swords, glancing back (the Seven of Swords pose), drawn in greys.
  function standIn() {
    const c = document.createElement("canvas");
    c.width = 360; c.height = 480;
    const g = c.getContext("2d");
    const bg = g.createRadialGradient(170, 170, 40, 180, 240, 330);
    bg.addColorStop(0, "#ffffff"); bg.addColorStop(1, "#e6e6e6");
    g.fillStyle = bg; g.fillRect(0, 0, 360, 480);
    // ground
    const gr = g.createLinearGradient(0, 380, 0, 480);
    gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(0,0,0,.45)");
    g.fillStyle = gr; g.fillRect(0, 370, 360, 110);

    const sword = (x, y, len, ang, w = 6, tone = "#3a3a3a") => {
      g.save(); g.translate(x, y); g.rotate(ang);
      g.fillStyle = tone;
      g.beginPath(); g.moveTo(-w / 2, 0); g.lineTo(w / 2, 0); g.lineTo(w / 2, -len); g.lineTo(0, -len - 14); g.lineTo(-w / 2, -len); g.closePath(); g.fill();
      g.fillStyle = "#111";
      g.fillRect(-18, -4, 36, 8);            // guard
      g.fillRect(-3, 0, 6, 28);              // grip
      g.beginPath(); g.arc(0, 32, 6, 0, 7); g.fill(); // pommel
      g.restore();
    };
    // two swords left behind, planted in the ground
    sword(300, 400, 150, 0.06, 6, "#555");
    sword(328, 408, 130, -0.04, 6, "#666");

    // body
    const body = g.createLinearGradient(110, 140, 220, 360);
    body.addColorStop(0, "#1e1e1e"); body.addColorStop(1, "#6a6a6a");
    g.fillStyle = body;
    g.beginPath(); // coat
    g.moveTo(140, 150); g.quadraticCurveTo(205, 150, 210, 230); g.lineTo(225, 330); g.quadraticCurveTo(170, 345, 120, 325);
    g.lineTo(125, 230); g.quadraticCurveTo(110, 170, 140, 150); g.fill();
    // legs, tiptoeing to the right
    g.strokeStyle = "#2a2a2a"; g.lineCap = "round"; g.lineWidth = 22;
    g.beginPath(); g.moveTo(155, 320); g.lineTo(125, 395); g.lineTo(108, 412); g.stroke();
    g.beginPath(); g.moveTo(190, 320); g.lineTo(232, 388); g.lineTo(258, 392); g.stroke();
    // head, turned back over the shoulder
    const hd = g.createRadialGradient(150, 100, 6, 158, 112, 40);
    hd.addColorStop(0, "#9a9a9a"); hd.addColorStop(1, "#262626");
    g.fillStyle = hd; g.beginPath(); g.ellipse(160, 112, 33, 38, -0.2, 0, 7); g.fill();
    g.fillStyle = "#151515"; g.beginPath(); g.ellipse(170, 96, 36, 26, 0.3, Math.PI, 2 * Math.PI); g.fill(); // hair
    // armful of five swords, carried diagonally
    for (let i = 0; i < 5; i++) sword(110 + i * 9, 250 - i * 4, 170, 1.05 + i * 0.05, 6, i % 2 ? "#4a4a4a" : "#2e2e2e");
    // arm wrapped around them
    g.strokeStyle = "#1c1c1c"; g.lineWidth = 20;
    g.beginPath(); g.moveTo(195, 175); g.quadraticCurveTo(215, 235, 165, 250); g.stroke();
    return c;
  }

  return { render, standIn };
})();
