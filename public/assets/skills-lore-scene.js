"use strict";
(() => {
  const canvas = document.querySelector('[data-lore-canvas]');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  canvas.setAttribute('aria-hidden', 'true');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width: 760px)');
  const TAU = Math.PI * 2;
  const themes = ['responsive-web', 'javascript-runtime', 'processor-logic', 'dslr-photography', 'image-editing', 'quadrotor-stem', 'team-network', 'planning-communication'];
  let width = 0, height = 0, dpr = 1, count = 0;
  let scenes = [], sceneGroups = [], current, origin, destination, seeds;
  let active = 0, frame = 0, lastTime = 0, clock = 0, morphStart = -Infinity;
  let paused = false, visible = true, destroyed = false;
  let pointerX = 0, pointerY = 0, tiltX = 0, tiltY = 0;
  let orbit = -.32, targetOrbit = -.32, momentum = 0, drag = null;
  const cleanup = [];
  const originalTouchAction = canvas.style.touchAction;
  const originalCursor = canvas.style.cursor;
  canvas.style.touchAction = 'pan-y';

  function random(seed) {
    let state = seed >>> 0;
    return () => {
      state += 0x6D2B79F5;
      let n = state;
      n = Math.imul(n ^ n >>> 15, n | 1);
      n ^= n + Math.imul(n ^ n >>> 7, n | 61);
      return ((n ^ n >>> 14) >>> 0) / 4294967296;
    };
  }

  // Surface samples retain the form of each object as it turns in three dimensions.
  function box(x, y, z, sx, sy, sz, weight = 1, angle = 0) {
    const c = Math.cos(angle), s = Math.sin(angle);
    return { weight, sample(r) {
      const edge = r() < .16;
      let a = (r() - .5) * sx, b = (r() - .5) * sy, d = (r() - .5) * sz;
      const axis = Math.floor(r() * 3);
      if (axis === 0) a = (r() < .5 ? -.5 : .5) * sx;
      else if (axis === 1) b = (r() < .5 ? -.5 : .5) * sy;
      else d = (r() < .5 ? -.5 : .5) * sz;
      if (edge) {
        if (axis !== 1) b = (r() < .5 ? -.5 : .5) * sy;
        else a = (r() < .5 ? -.5 : .5) * sx;
      }
      return [x + a * c - b * s, y + a * s + b * c, z + d, edge ? 1 : .54 + r() * .34];
    }};
  }

  function cylinder(x, y, z, radius, length, weight = 1, axis = 'z', inner = 0) {
    return { weight, sample(r) {
      const a = r() * TAU;
      const cap = r() < .22;
      const rr = cap ? Math.sqrt(inner * inner + r() * (radius * radius - inner * inner)) : (r() < .12 && inner ? inner : radius);
      const u = Math.cos(a) * rr, v = Math.sin(a) * rr;
      const d = cap ? (r() < .5 ? -.5 : .5) * length : (r() - .5) * length;
      const point = axis === 'x' ? [d, u, v] : axis === 'y' ? [u, d, v] : [u, v, d];
      return [x + point[0], y + point[1], z + point[2], cap ? .65 : .9];
    }};
  }

  function torus(x, y, z, radius, tube, weight = 1, axis = 'z', stretch = 1) {
    return { weight, sample(r) {
      const a = r() * TAU, b = r() * TAU;
      const rr = radius + Math.cos(b) * tube;
      const u = Math.cos(a) * rr, v = Math.sin(a) * rr * stretch, d = Math.sin(b) * tube;
      const point = axis === 'x' ? [d, u, v] : axis === 'y' ? [u, d, v] : [u, v, d];
      return [x + point[0], y + point[1], z + point[2], .65 + r() * .35];
    }};
  }

  function sphere(x, y, z, sx, sy, sz, weight = 1) {
    return { weight, sample(r) {
      const a = r() * TAU, b = Math.acos(r() * 2 - 1);
      return [x + Math.cos(a) * Math.sin(b) * sx, y + Math.cos(b) * sy, z + Math.sin(a) * Math.sin(b) * sz, .55 + r() * .4];
    }};
  }

  function beam(a, b, radius, weight = 1) {
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
    const length = Math.hypot(dx, dy, dz);
    const nx = dx / length, ny = dy / length, nz = dz / length;
    const up = Math.abs(ny) > .9 ? [1, 0, 0] : [0, 1, 0];
    const ux = ny * up[2] - nz * up[1], uy = nz * up[0] - nx * up[2], uz = nx * up[1] - ny * up[0];
    const ul = Math.hypot(ux, uy, uz);
    const vx = ny * uz / ul - nz * uy / ul, vy = nz * ux / ul - nx * uz / ul, vz = nx * uy / ul - ny * ux / ul;
    return { weight, sample(r) {
      const t = r(), angle = r() * TAU;
      const u = Math.cos(angle) * radius / ul, v = Math.sin(angle) * radius;
      return [a[0] + dx * t + ux * u + vx * v, a[1] + dy * t + uy * u + vy * v, a[2] + dz * t + uz * u + vz * v, .8];
    }};
  }

  function frameParts(x, y, z, w, h, depth = .12, weight = 1) {
    return [box(x, y - h / 2, z, w, .055, depth, weight), box(x, y + h / 2, z, w, .055, depth, weight), box(x - w / 2, y, z, .055, h, depth, weight), box(x + w / 2, y, z, .055, h, depth, weight)];
  }

  function moving(part, group) { part.group = group; return part; }

  function geometry(index) {
    let parts = [];
    if (index === 0) {
      // Layered browser windows: a broad translucent page and its floating components.
      parts = [box(-.12, .08, -.28, 2.65, 1.65, .11, 1.3), ...frameParts(-.12, .08, -.19, 2.65, 1.65), box(-.12, -.57, -.12, 2.56, .12, .08, 1), moving(box(-.65, .03, .01, .83, .78, .13, 1.8), 1), moving(box(.55, -.18, .06, 1.03, .14, .11, .6), 1), moving(box(.42, .12, .06, .77, .08, .1, .4), 1), moving(box(.53, .33, .06, 1, .08, .1, .4), 1), moving(box(1.03, .41, .42, .66, 1.15, .15, 1.1), 2), ...frameParts(1.03, .41, .51, .66, 1.15, .08, .4).map(part => moving(part, 2)), moving(box(1.03, .3, .52, .46, .6, .025, .4), 2), moving(cylinder(1.03, .85, .53, .035, .02, .15), 2), box(-.84, -.79, -.53, 1.3, .13, .18, .5)];
      for (let i = 0; i < 3; i++) parts.push(sphere(-1.22 + i * .13, -.57, -.05, .035, .035, .035, .1));
    } else if (index === 1) {
      // A pair of spatial braces enclosing a small runtime core.
      parts = [box(0, 0, -.17, .88, 1.02, .64, 1.7), ...frameParts(0, 0, .19, .78, .91, .08, .45), moving(torus(0, -.14, .24, .23, .025, .6), 3)];
      for (const side of [-1, 1]) {
        const x = side * .98;
        parts.push(beam([x + side * .31, -.9, .04], [x, -.75, .04], .055, .5), beam([x, -.75, .04], [x, -.27, .04], .055, .7), beam([x, -.27, .04], [x - side * .23, 0, .04], .055, .5), beam([x - side * .23, 0, .04], [x, .27, .04], .055, .5), beam([x, .27, .04], [x, .75, .04], .055, .7), beam([x, .75, .04], [x + side * .31, .9, .04], .055, .5));
      }
      for (let i = 0; i < 4; i++) parts.push(moving(box(-.32 + i * .21, .2, .29, .08, .37 + i * .08, .09, .5), 4));
    } else if (index === 2) {
      // Processor, raised circuit tracks, and the layered substrate beneath it.
      parts = [box(0, .23, -.17, 2.6, 1.73, .14, 2.5), box(0, .04, .12, .91, .85, .44, 2.2), ...frameParts(0, .04, .36, .7, .66, .04, .5), box(-.92, -.28, .02, .38, .62, .23, .5), box(.93, .68, .01, .44, .3, .24, .5)];
      for (let i = 0; i < 8; i++) {
        const d = -.33 + i * .095;
        parts.push(...[box(d, -.52, .07, .035, .3, .09, .23), box(d, .58, .07, .035, .28, .09, .23), box(-.59, .04 + d, .07, .28, .035, .09, .23), box(.59, .04 + d, .07, .28, .035, .09, .23)].map(part => moving(part, 5)));
      }
      for (let i = 0; i < 5; i++) parts.push(moving(beam([-.92 + i * .45, .73, -.04], [-1.14 + i * .44, 1.05, -.04], .018, .2), 5));
    } else if (index === 3) {
      // Camera body, grip, viewfinder, and nested optical barrels.
      parts = [box(0, .08, -.18, 2.27, 1.38, .72, 2.2), box(-.88, .07, .05, .45, 1.28, .84, 1.1), box(-.1, -.76, -.18, .89, .35, .5, .65), box(.67, -.68, -.14, .6, .19, .53, .45), cylinder(.2, .15, .53, .57, .85, 2.3), moving(cylinder(.2, .15, 1.01, .62, .15, 1.4, 'z', .48), 6), moving(torus(.2, .15, 1.1, .46, .04, 1.2), 6), moving(cylinder(.2, .15, 1.11, .37, .025, .55), 6), cylinder(-.82, -.7, .05, .13, .11, .2, 'y')];
      for (let i = 0; i < 5; i++) parts.push(moving(torus(.2, .15, .31 + i * .13, .575, .014, .16), 6));
    } else if (index === 4) {
      // A landscape lifted from a photographic frame, with a separate rear contact sheet.
      parts = [...frameParts(0, .02, .18, 2.72, 1.83, .12, 1.3), box(0, .03, -.05, 2.67, 1.77, .06, .8), ...frameParts(-.2, -.14, -.5, 2.62, 1.75, .1, .5).map(part => moving(part, 7)), sphere(.76, -.5, .2, .19, .19, .05, .6)];
      for (const x of [-1, 1]) for (const y of [-1, 1]) {
        parts.push(box(x * 1.04, y * .67, .62, .3, .045, .045, .35), box(x * 1.18, y * .54, .62, .045, .3, .045, .35), box(x * 1.18, y * .67, .62, .08, .08, .08, .2));
      }
      const peaks = [[-1.25, .67, .22], [-.43, -.39, .5], [.27, .67, .22], [-.22, .67, .31], [.58, -.13, .6], [1.25, .67, .22]];
      for (let i = 0; i < 2; i++) {
        const a = peaks[i * 3], b = peaks[i * 3 + 1], c = peaks[i * 3 + 2];
        parts.push({ weight: 2, sample(r) {
          let u = r(), v = r();
          if (u + v > 1) { u = 1 - u; v = 1 - v; }
          return [a[0] + (b[0] - a[0]) * u + (c[0] - a[0]) * v, a[1] + (b[1] - a[1]) * u + (c[1] - a[1]) * v, a[2] + (b[2] - a[2]) * u + (c[2] - a[2]) * v, .7];
        }});
      }
    } else if (index === 5) {
      // A true quadrotor: crossed arms, four rotor discs, central body, and camera.
      parts = [box(0, 0, 0, .8, .3, 1.04, 1.6), box(0, -.2, -.1, .51, .22, .55, .7), sphere(0, .33, .35, .17, .17, .2, .45), cylinder(0, .34, .54, .105, .1, .3)];
      let rotor = 8;
      for (const x of [-1, 1]) for (const z of [-1, 1]) {
        parts.push(beam([x * .24, 0, z * .32], [x * 1.1, -.05, z * .86], .075, .8), cylinder(x * 1.1, -.13, z * .86, .14, .24, .4, 'y'), torus(x * 1.1, -.28, z * .86, .48, .009, .4, 'y'), moving(box(x * 1.1, -.29, z * .86, .93, .025, .1, 1.1), rotor), moving(box(x * 1.1, -.29, z * .86, .1, .025, .93, 1.1), rotor), beam([x * .4, .09, z * .27], [x * .49, .63, z * .43], .027, .3));
        rotor++;
      }
    } else if (index === 6) {
      // Three figures connected across a shared working plane.
      parts = [torus(0, .83, 0, 1.12, .035, 1, 'y', .75), box(0, .9, 0, 2.42, .07, 1.63, .5)];
      for (const [x, z, size] of [[0, -.4, 1], [-.94, .27, .77], [.94, .27, .77]]) {
        parts.push(sphere(x, -.72 * size, z, .22 * size, .24 * size, .22 * size, 1), sphere(x, -.03, z, .36 * size, .43 * size, .24 * size, 1.8), beam([x - .23 * size, .3, z], [x - .25 * size, .83, z + .05], .09 * size, .6), beam([x + .23 * size, .3, z], [x + .25 * size, .83, z + .05], .09 * size, .6));
      }
      parts.push(moving(beam([-.75, .19, .35], [0, .19, -.18], .035, 1), 12), moving(beam([0, .19, -.18], [.75, .19, .35], .035, 1), 12), moving(torus(0, .83, 0, 1.12, .025, .7, 'y', .75), 12));
    } else {
      // Calendar, a working clock, and a message form one planning instrument.
      parts = [box(-.53, .02, -.2, 1.67, 1.85, .13, .9), ...frameParts(-.53, .02, -.1, 1.67, 1.85, .08, .5), box(-.53, -.59, -.04, 1.6, .12, .08, .5), torus(.89, -.21, .2, .65, .045, 1.7), cylinder(.89, -.21, .12, .64, .13, .5), moving(beam([.89, -.21, .34], [.89, -.72, .34], .024, .8), 13), moving(beam([.89, -.21, .37], [1.21, -.21, .37], .03, .7), 14), sphere(.89, -.21, .4, .055, .055, .055, .2), ...frameParts(.74, .77, .35, 1.1, .47, .08, .35), beam([.54, 1.01, .35], [.37, 1.2, .35], .035, .35)];
      for (let i = 0; i < 3; i++) parts.push(torus(-1.03 + i * .5, -.89, -.08, .09, .023, .2, 'x'));
      for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) parts.push(moving(box(-1.03 + col * .5, -.24 + row * .39, -.015, .25, .13, .045, .22), row === 1 && col === 1 ? 16 : 0));
      for (let i = 0; i < 12; i++) {
        const a = i / 12 * TAU;
        parts.push(beam([.89 + Math.sin(a) * .53, -.21 + Math.cos(a) * .53, .3], [.89 + Math.sin(a) * .59, -.21 + Math.cos(a) * .59, .3], .013, .14));
      }
      for (let i = 0; i < 3; i++) parts.push(moving(sphere(.43 + i * .3, .77, .42, .045, .045, .045, .25), 15));
    }
    return parts;
  }

  function makeScene(index, total) {
    const r = random(7429 + index * 631);
    const parts = geometry(index);
    const sum = parts.reduce((n, part) => n + part.weight, 0);
    const points = new Float32Array(total * 4);
    const groups = new Uint8Array(total);
    for (let i = 0; i < total; i++) {
      let choice = r() * sum, part = parts[0];
      for (const candidate of parts) {
        choice -= candidate.weight;
        if (choice <= 0) { part = candidate; break; }
      }
      const p = part.sample(r), j = i * 4;
      // Tiny surface grain gives the object its holographic scan texture.
      const grain = i % 23 === 0 ? .08 : .012;
      points[j] = p[0] + (r() - .5) * grain;
      points[j + 1] = p[1] + (r() - .5) * grain;
      points[j + 2] = p[2] + (r() - .5) * grain;
      points[j + 3] = p[3];
      groups[i] = part.group || 0;
    }
    sceneGroups[index] = groups;
    return points;
  }

  function motionAllowed() {
    return !paused && !reduced.matches && !document.hidden && visible && !document.body.classList.contains('motion-paused') && !document.body.classList.contains('is-booting');
  }

  function populate(total) {
    count = total;
    scenes = Array.from({ length: 8 }, (_, index) => makeScene(index, total));
    current = new Float32Array(scenes[active]);
    origin = new Float32Array(current);
    destination = scenes[active];
    const r = random(83476);
    seeds = new Float32Array(total * 2);
    for (let i = 0; i < seeds.length; i++) seeds[i] = r();
    morphStart = -Infinity;
    canvas.dataset.activePoints = String(total);
  }

  function morphTo(points) {
    origin.set(current);
    destination = points;
    morphStart = performance.now();
    if (!motionAllowed()) { current.set(destination); morphStart = -Infinity; }
    sync();
  }

  function render(now) {
    if (!width || !height || !current) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const moving = motionAllowed();
    const delta = lastTime ? Math.min((now - lastTime) / 1000, .05) : 0;
    lastTime = now;
    if (moving) {
      clock += delta;
      if (drag?.mode !== 'horizontal') targetOrbit += (.105 + momentum) * delta;
      momentum *= Math.exp(-delta * 3.4);
      orbit += (targetOrbit - orbit) * (1 - Math.exp(-delta * 13));
      if (Math.abs(orbit) > TAU * 10) {
        const turns = Math.trunc(orbit / TAU) * TAU;
        orbit -= turns;
        targetOrbit -= turns;
      }
    }
    if (moving) {
      tiltX += (pointerY - tiltX) * .055;
      tiltY += (pointerX - tiltY) * .055;
    }
    const yaw = orbit + tiltY * .065;
    const pitch = -.18 + Math.sin(clock * .09) * .07 + tiltX * .11;
    const roll = -.13;
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cx = Math.cos(pitch), sx = Math.sin(pitch), cz = Math.cos(roll), sz = Math.sin(roll);
    const small = mobile.matches;
    const ringSize = small ? Math.min(width * .74, 470) : Math.min(innerWidth * .46, 630);
    const scale = ringSize * .29;
    const centerX = width * (small ? .5 : .394), centerY = small ? Math.min(220, height * .512) : height * .445;
    const elapsed = Math.max(0, (now - morphStart) / 900);
    const transitioning = elapsed < 1;
    const colors = ['rgba(177,188,205,.25)', 'rgba(204,214,225,.43)', 'rgba(233,239,246,.65)', 'rgba(255,255,255,.88)'];
    const buckets = [[], [], [], []];
    const groupMap = sceneGroups[active];
    const detailBlend = transitioning ? Math.min(1, elapsed * 1.4) : 1;
    const layerLift = Math.sin(clock * .8) * .055 * detailBlend;
    const focus = Math.sin(clock * .9) * .07 * detailBlend;

    for (let i = 0; i < count; i++) {
      const j = i * 4;
      if (transitioning) {
        const p = Math.min(1, Math.max(0, (elapsed - seeds[i * 2] * .12) / .88));
        const t = p * p * (3 - 2 * p);
        const scatter = Math.sin(Math.PI * p) * (.16 + seeds[i * 2 + 1] * .5);
        current[j] = origin[j] + (destination[j] - origin[j]) * t + scatter * (active % 2 ? -1 : 1);
        current[j + 1] = origin[j + 1] + (destination[j + 1] - origin[j + 1]) * t - scatter * .42;
        current[j + 2] = origin[j + 2] + (destination[j + 2] - origin[j + 2]) * t + scatter * (seeds[i * 2] - .5) * 2;
        current[j + 3] = origin[j + 3] + (destination[j + 3] - origin[j + 3]) * t;
      } else if (morphStart !== -Infinity) {
        current[j] = destination[j]; current[j + 1] = destination[j + 1]; current[j + 2] = destination[j + 2]; current[j + 3] = destination[j + 3];
      }
      let x = current[j], y = current[j + 1], z = current[j + 2], glow = 0;
      const group = groupMap[i];
      if (group === 1) { z += layerLift; y += Math.sin(clock * .6) * .025 * detailBlend; }
      else if (group === 2) { y -= layerLift * .7; z -= layerLift * .5; }
      else if (group === 3) { glow = (.18 + Math.sin(clock * 2.8) * .18) * detailBlend; }
      else if (group === 4) { y = .5 + (y - .5) * (1 + Math.sin(clock * 2.4 + x * 9) * .18 * detailBlend); }
      else if (group === 5) { glow = Math.pow(Math.max(0, Math.sin(clock * 2.5 - (Math.abs(x) + Math.abs(y)) * 5)), 7) * .65 * detailBlend; }
      else if (group === 6) { z += focus; }
      else if (group === 7) { x += Math.sin(clock * .55) * .07 * detailBlend; z += Math.sin(clock * .7) * .04 * detailBlend; }
      else if (group >= 8 && group <= 11) {
        const rotor = group - 8, px = rotor < 2 ? -1.1 : 1.1, pz = rotor % 2 ? .86 : -.86;
        const a = clock * 14 * (rotor % 2 ? -1 : 1) * detailBlend, c = Math.cos(a), s = Math.sin(a);
        const dx = x - px, dz = z - pz;
        x = px + dx * c + dz * s; z = pz - dx * s + dz * c;
      } else if (group === 12) { glow = Math.pow(Math.max(0, Math.cos(clock * 2 - x * 4 - z * 2)), 5) * .7 * detailBlend; }
      else if (group === 13 || group === 14) {
        const a = clock * (group === 13 ? .32 : .065) * detailBlend, c = Math.cos(a), s = Math.sin(a);
        const dx = x - .89, dy = y + .21;
        x = .89 + dx * c - dy * s; y = -.21 + dx * s + dy * c;
      } else if (group === 15) { const pulse = Math.sin(clock * 3.5 - x * 5); y -= Math.max(0, pulse) * .045 * detailBlend; glow = Math.max(0, pulse) * .3 * detailBlend; }
      else if (group === 16) { z += (.04 + Math.sin(clock * 1.1) * .025) * detailBlend; }
      const x1 = x * cy + z * sy, z1 = -x * sy + z * cy;
      const y1 = y * cx - z1 * sx, z2 = y * sx + z1 * cx;
      const perspective = 4.8 / (4.8 - z2);
      const px = centerX + (x1 * cz - y1 * sz) * scale * perspective;
      const py = centerY + (x1 * sz + y1 * cz) * scale * perspective;
      if (px < -3 || py < -3 || px > width + 3 || py > height + 3) continue;
      const light = current[j + 3] * .7 + (z2 + 1.3) * .12 + glow;
      const bucket = Math.max(0, Math.min(3, Math.floor(light * 3.5)));
      const size = (small ? .82 : .82 + seeds[i * 2] * .44) * Math.min(1.35, perspective);
      buckets[bucket].push(px, py, size);
    }
    if (!transitioning) morphStart = -Infinity;
    for (let b = 0; b < buckets.length; b++) {
      ctx.fillStyle = colors[b];
      const points = buckets[b];
      for (let i = 0; i < points.length; i += 3) ctx.fillRect(points[i], points[i + 1], points[i + 2], points[i + 2]);
    }
    canvas.dataset.scene = String(active);
    canvas.dataset.theme = themes[active];
  }

  function tick(now) {
    frame = 0;
    if (destroyed) return;
    render(now);
    if (motionAllowed()) frame = requestAnimationFrame(tick);
  }

  function sync() {
    if (destroyed) return;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    lastTime = 0;
    if (!motionAllowed()) {
      finishDrag(true);
      targetOrbit = orbit;
      momentum = 0;
    }
    canvas.style.cursor = motionAllowed() ? (drag?.mode === 'horizontal' ? 'grabbing' : 'grab') : 'default';
    if (!motionAllowed() && destination && morphStart !== -Infinity) {
      current.set(destination);
      morphStart = -Infinity;
    }
    render(performance.now());
    if (motionAllowed()) frame = requestAnimationFrame(tick);
  }

  function resize() {
    if (destroyed) return;
    const rect = canvas.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const desired = mobile.matches ? 6500 : 18000;
    if (desired !== count) populate(desired);
    sync();
  }

  function listen(target, name, listener, options) {
    target.addEventListener(name, listener, options);
    cleanup.push(() => target.removeEventListener(name, listener, options));
  }

  window.SkillLoreScene = {
    select(index) {
      const next = ((Math.trunc(Number(index) || 0) % 8) + 8) % 8;
      if (destroyed || !current || next === active) return;
      active = next;
      canvas.dataset.scene = String(active);
      canvas.dataset.theme = themes[active];
      morphTo(scenes[next]);
    },
    pause(value) { paused = Boolean(value); sync(); },
    destroy() {
      destroyed = true;
      if (frame) cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      visibilityObserver?.disconnect();
      classObserver.disconnect();
      cleanup.forEach(remove => remove());
      finishDrag(true);
      canvas.style.touchAction = originalTouchAction;
      canvas.style.cursor = originalCursor;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      scenes = []; sceneGroups = []; current = origin = destination = seeds = null;
    }
  };

  function finishDrag(cancelled = false) {
    if (!drag) return;
    const pointer = drag.id;
    drag = null;
    canvas.dataset.dragging = 'false';
    if (cancelled) momentum = 0;
    if (canvas.hasPointerCapture?.(pointer)) canvas.releasePointerCapture(pointer);
    canvas.style.cursor = motionAllowed() ? 'grab' : 'default';
  }

  listen(canvas, 'pointerdown', event => {
    if (!motionAllowed() || drag || !event.isPrimary || event.button !== 0) return;
    drag = { id: event.pointerId, mode: event.pointerType === 'touch' ? 'pending' : 'horizontal', startX: event.clientX, startY: event.clientY, x: event.clientX, time: performance.now() };
    momentum = 0;
    if (drag.mode === 'horizontal') {
      canvas.setPointerCapture(event.pointerId);
      canvas.dataset.dragging = 'true';
      canvas.style.cursor = 'grabbing';
      event.preventDefault();
    }
  });
  listen(canvas, 'pointermove', event => {
    if (!drag || event.pointerId !== drag.id || !motionAllowed()) return;
    if (drag.mode === 'pending') {
      const dx = Math.abs(event.clientX - drag.startX), dy = Math.abs(event.clientY - drag.startY);
      // A vertical gesture stays with the page; only a clear horizontal drag rotates.
      if (dy > 7 && dy > dx) { finishDrag(true); return; }
      if (dx < 7 || dx < dy * 1.15) return;
      drag.mode = 'horizontal';
      canvas.setPointerCapture(event.pointerId);
      canvas.dataset.dragging = 'true';
      canvas.style.cursor = 'grabbing';
    }
    const now = performance.now();
    const radians = (event.clientX - drag.x) / Math.max(width, 1) * TAU * 1.25;
    const elapsed = Math.max((now - drag.time) / 1000, .016);
    targetOrbit += radians;
    momentum = Math.max(-3.5, Math.min(3.5, radians / elapsed));
    drag.x = event.clientX;
    drag.time = now;
  }, { passive: true });
  listen(canvas, 'pointerup', event => { if (drag?.id === event.pointerId) finishDrag(); });
  listen(canvas, 'pointercancel', event => { if (drag?.id === event.pointerId) finishDrag(true); });
  listen(canvas, 'lostpointercapture', event => { if (drag?.id === event.pointerId) finishDrag(true); });

  listen(window, 'pointermove', event => {
    if (!motionAllowed() || event.pointerType === 'touch') return;
    const rect = canvas.getBoundingClientRect();
    pointerX = Math.max(-1, Math.min(1, (event.clientX - rect.left) / (width || 1) * 2 - 1));
    pointerY = Math.max(-1, Math.min(1, (event.clientY - rect.top) / (height || 1) * 2 - 1));
  }, { passive: true });
  listen(document, 'pointerleave', () => { pointerX = pointerY = 0; });
  listen(document, 'visibilitychange', sync);
  listen(document, 'portfolio:motion', sync);
  listen(reduced, 'change', sync);
  listen(mobile, 'change', resize);
  const classObserver = new MutationObserver(sync);
  classObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  const resizeObserver = 'ResizeObserver' in window ? new ResizeObserver(resize) : null;
  resizeObserver?.observe(canvas);
  if (!resizeObserver) listen(window, 'resize', resize);
  const visibilityObserver = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    sync();
  }) : null;
  visibilityObserver?.observe(canvas);
  resize();
  canvas.dataset.pointSource = 'skill';
})();
