"use strict";
(() => {
  const canvas = document.querySelector('[data-lore-orbit]');
  const zone = canvas?.closest('.skills-console');
  const reticle = zone?.querySelector('.lore-reticle');
  const context = canvas?.getContext('2d', { alpha: true });
  if (!canvas || !zone || !reticle || !context) return;
  window.SkillLoreOrbit?.destroy?.();

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const TAU = Math.PI * 2;
  const names = ['browser', 'runtime', 'processor', 'shutter', 'framing', 'quadrotor', 'teamwork', 'clock'];
  const cleanup = [];
  let width = 0, height = 0, centerX = 0, centerY = 0, radius = 0, copyLimit = 0;
  let frame = 0, frames = 0, previous = 0, time = 0, burst = -Infinity;
  let visible = true, paused = false, destroyed = false, wasMoving = false;
  let index = Number(zone.dataset.skillIndex) || 0;
  index = ((Math.trunc(index) % 8) + 8) % 8;
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.pointerEvents = 'none';

  const point = (angle, distance = radius) => [centerX + Math.cos(angle) * distance, centerY + Math.sin(angle) * distance];
  const line = (points, color = 'rgba(222,228,236,.13)', weight = .7) => {
    context.strokeStyle = color;
    context.lineWidth = weight;
    context.beginPath();
    points.forEach(([x, y], i) => i ? context.lineTo(x, y) : context.moveTo(x, y));
    context.stroke();
  };
  function circle(x, y, size, color, weight = .7) {
    context.strokeStyle = color;
    context.lineWidth = weight;
    context.beginPath();
    context.arc(x, y, size, 0, TAU);
    context.stroke();
  }
  function dot(x, y, size, color) {
    context.fillStyle = color;
    context.beginPath();
    context.arc(x, y, size, 0, TAU);
    context.fill();
  }
  function arc(distance, angle, length, color, weight = 1) {
    context.strokeStyle = color;
    context.lineWidth = weight;
    context.beginPath();
    context.arc(centerX, centerY, distance, angle, angle + length);
    context.stroke();
  }
  function movingAllowed() {
    return !destroyed && !paused && !reduced.matches && visible && !document.hidden &&
      !document.body.classList.contains('motion-paused') && !document.body.classList.contains('is-booting');
  }

  function drawDust(moving) {
    const phase = moving || !reduced.matches ? time : 0;
    const total = width < 761 ? 40 : 64;
    for (let i = 0; i < total; i++) {
      const angle = i * 2.399963 + phase * (.035 + (i % 5) * .008) * (i % 2 ? -1 : 1);
      const distance = radius * (.87 + ((i * 37) % 17) / 100);
      const [x, y] = point(angle, distance);
      const alpha = .16 + (Math.sin(phase * .8 + i) + 1) * .1;
      dot(x, y, i % 9 === 0 ? 1.35 : .7, `rgba(238,242,248,${alpha})`);
      if (i % 9 === 0 && !reduced.matches) arc(distance, angle - .025, .02, 'rgba(236,241,248,.14)', .7);
    }
    const sweep = phase * (.13 + index * .008) - Math.PI / 2;
    arc(radius * .986, sweep, .19, 'rgba(236,241,248,.24)', 1.1);
    arc(radius * .935, -sweep - 1.1, .085, 'rgba(255,250,0,.42)', 1.2);
    if (!reduced.matches) {
      const [x, y] = point(-sweep - 1.015, radius * .935);
      dot(x, y, 1.25, 'rgba(255,250,0,.65)');
    }
  }

  function drawTheme() {
    const phase = reduced.matches ? 0 : time;
    const pulse = .5 + .5 * Math.sin(phase * 1.6);
    const white = 'rgba(224,231,239,.13)';
    const yellow = 'rgba(255,250,0,.28)';
    const r = radius;
    if (index === 0) {
      // Thin browser grid fragments grow and subside along the lower left rim.
      const x = centerX - r * .7, y = centerY + r * .43, cell = r * .1;
      for (let row = 0; row < 3; row++) for (let col = 0; col < 4; col++) {
        const alpha = .045 + Math.max(0, Math.sin(phase * 1.5 - row * .7 - col * .5)) * .1;
        context.strokeStyle = `rgba(226,233,242,${alpha})`;
        context.lineWidth = .65;
        context.strokeRect(x + col * cell, y + row * cell, cell * .7, cell * .7);
      }
      const cellIndex = Math.floor(phase * .8) % 4;
      line([[x + cellIndex * cell, y - 5], [x + cellIndex * cell + cell * .65, y - 5]], yellow, 1.2);
    } else if (index === 1) {
      // Runtime current travels as a short, angular trace around the rim.
      const head = phase * .38 + .3;
      const points = Array.from({ length: 12 }, (_, i) => point(head - i * .023, r * (.91 + (i % 3 === 1 ? .025 : 0))));
      line(points, 'rgba(255,250,0,.36)', .8);
      const [x, y] = points[0];
      dot(x, y, 1.6, 'rgba(255,250,0,.75)');
      arc(r * .9, head - .36, .08, white, .6);
    } else if (index === 2) {
      // Orthogonal tracks and a travelling signal suggest a circuit, rather than a ring.
      for (const side of [-1, 1]) {
        const x = centerX + side * r * .51, y = centerY + r * .45;
        const nodes = [[x, y], [x, y + r * .12], [x + side * r * .16, y + r * .12], [x + side * r * .16, y + r * .28]];
        line(nodes, white);
        nodes.slice(1).forEach(([a, b]) => circle(a, b, 1.6, white));
        const p = ((phase * .25 + (side > 0 ? .5 : 0)) % 1) * 3;
        const n = Math.floor(p), t = p - n, a = nodes[n], b = nodes[n + 1];
        dot(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, 1.4, yellow);
      }
    } else if (index === 3) {
      // Six aperture blades breathe quietly; the flash stays on the reticle edge.
      const aperture = r * (.36 + pulse * .018);
      for (let i = 0; i < 6; i++) {
        const a = i * TAU / 6 + phase * .025;
        line([point(a, aperture), point(a + .48, aperture * 1.17), point(a + .85, aperture * .92)], white, .55);
      }
      const flash = Math.pow(Math.max(0, Math.cos(phase * .72)), 24);
      arc(r * .96, -.95, .15, `rgba(255,250,0,${.1 + flash * .4})`, 1.2);
    } else if (index === 4) {
      // Four photographic frame corners shift inward together to find a crop.
      const halfX = r * (.58 + pulse * .025), halfY = r * .43, length = r * .11;
      for (const x of [-1, 1]) for (const y of [-1, 1]) {
        const px = centerX + x * halfX, py = centerY + y * halfY;
        line([[px - x * length, py], [px, py], [px, py - y * length]], white, .8);
      }
      const [x, y] = point(phase * .14 + 1.4, r * .86);
      dot(x, y, 1, yellow);
    } else if (index === 5) {
      // Four separate rotor orbits make the quadrotor accent unmistakable.
      for (let i = 0; i < 4; i++) {
        const a = Math.PI / 4 + i * Math.PI / 2;
        const [x, y] = point(a, r * .61);
        const size = r * .105;
        circle(x, y, size, white);
        const rotor = phase * (i % 2 ? -1.7 : 1.7) + a;
        dot(x + Math.cos(rotor) * size, y + Math.sin(rotor) * size, 1.1, i === 0 ? yellow : 'rgba(236,241,248,.28)');
      }
    } else if (index === 6) {
      // Three connected nodes share a pulse around the triangle.
      const nodes = Array.from({ length: 3 }, (_, i) => point(-Math.PI / 2 + i * TAU / 3 + phase * .025, r * .55));
      line([...nodes, nodes[0]], 'rgba(222,230,240,.09)', .6);
      nodes.forEach(([x, y], i) => {
        circle(x, y, 3 + Math.sin(phase * 1.7 - i * 2.1) * .6, white);
        dot(x, y, 1.2, i === Math.floor(phase * .55) % 3 ? yellow : 'rgba(236,241,248,.2)');
      });
    } else {
      // A restrained clock sweep passes twelve individual minute marks.
      const clockRadius = r * .77;
      for (let i = 0; i < 12; i++) line([point(i * TAU / 12, clockRadius), point(i * TAU / 12, clockRadius - (i % 3 ? 3 : 6))], white, .7);
      const hand = phase * .15 - Math.PI / 2;
      line([point(hand + Math.PI, r * .055), point(hand, clockRadius * .85)], 'rgba(224,232,242,.11)', .65);
      const [x, y] = point(hand, clockRadius);
      dot(x, y, 1.25, yellow);
    }
  }

  function drawBurst() {
    if (reduced.matches) return;
    const progress = (time - burst) / .72;
    if (progress < 0 || progress > 1) return;
    for (let i = 0; i < 15; i++) {
      const angle = i * 2.399963 + index * .37;
      const distance = radius * (.95 + Math.sin(progress * Math.PI / 2) * (.09 + (i % 3) * .014));
      const [x, y] = point(angle, distance);
      const alpha = (1 - progress) * (i % 4 === 0 ? .5 : .25);
      dot(x, y, i % 4 === 0 ? 1.1 : .7, i % 4 === 0 ? `rgba(255,250,0,${alpha})` : `rgba(238,242,248,${alpha})`);
    }
  }

  function render() {
    if (!width || !height || !radius || destroyed) return;
    const ratio = Math.min(devicePixelRatio || 1, 1.5);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);
    context.save();
    // Keep all decorative light out of the reading column and below mobile copy.
    context.beginPath();
    context.rect(0, 0, copyLimit, width < 761 ? Math.min(height, centerY + radius * 1.18) : height);
    context.clip();
    drawDust(movingAllowed());
    drawTheme();
    drawBurst();
    context.restore();
    canvas.dataset.frame = String(++frames);
    canvas.dataset.theme = names[index];
    canvas.dataset.skillIndex = String(index);
  }

  function tick(now) {
    frame = 0;
    if (!movingAllowed()) { sync(); return; }
    const delta = previous ? Math.min((now - previous) / 1000, .05) : 0;
    previous = now;
    time += delta;
    render();
    frame = requestAnimationFrame(tick);
  }
  function sync(force = false) {
    if (destroyed) return;
    const moving = movingAllowed();
    canvas.dataset.running = String(moving);
    if (!moving) {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      previous = 0;
      if (force || wasMoving) render();
    } else if (!frame) {
      previous = 0;
      frame = requestAnimationFrame(tick);
    }
    wasMoving = moving;
  }
  function resize() {
    if (destroyed) return;
    const area = canvas.getBoundingClientRect(), ring = reticle.getBoundingClientRect();
    width = area.width;
    height = area.height;
    centerX = ring.left + ring.width / 2 - area.left;
    centerY = ring.top + ring.height / 2 - area.top;
    radius = ring.width * .475;
    const grid = zone.querySelector('.skill-grid')?.getBoundingClientRect();
    copyLimit = width < 761 ? width : Math.min(width, grid ? grid.left - area.left - 12 : width * .67);
    const ratio = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    render();
    sync();
  }
  function select(event) {
    const next = Number(event.detail?.index);
    if (!Number.isFinite(next)) return;
    const normalized = ((Math.trunc(next) % 8) + 8) % 8;
    if (index === normalized) return;
    index = normalized;
    burst = movingAllowed() ? time : -Infinity;
    render();
    sync();
  }
  function listen(target, name, handler, options) {
    target.addEventListener(name, handler, options);
    cleanup.push(() => target.removeEventListener(name, handler, options));
  }
  const resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
  resizeObserver?.observe(canvas);
  resizeObserver?.observe(reticle);
  const visibilityObserver = typeof IntersectionObserver === 'function' ? new IntersectionObserver(entries => {
    visible = entries.some(entry => entry.isIntersecting);
    sync();
  }, { threshold: .01 }) : null;
  visibilityObserver?.observe(zone);
  const classObserver = new MutationObserver(() => sync());
  classObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  listen(window, 'resize', resize);
  listen(window, 'portfolio:skill', select);
  listen(document, 'portfolio:skill', select);
  listen(document, 'portfolio:motion', () => sync());
  listen(document, 'visibilitychange', () => sync());
  listen(reduced, 'change', () => { burst = -Infinity; sync(true); });

  window.SkillLoreOrbit = {
    pause(value = true) { paused = Boolean(value); sync(true); },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      resizeObserver?.disconnect();
      visibilityObserver?.disconnect();
      classObserver.disconnect();
      cleanup.forEach(remove => remove());
      context.clearRect(0, 0, canvas.width, canvas.height);
      canvas.dataset.running = 'false';
    }
  };
  resize();
})();
