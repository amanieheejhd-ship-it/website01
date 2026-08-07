'use client';

import { useEffect, useRef } from 'react';

const GOLD = { r: 200, g: 161, b: 90 } as const; // @fardeen/config gold.DEFAULT: #c8a15a
const LINK_DISTANCE = 130;
const POINTER_DISTANCE = 180;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

interface Pulse {
  x: number;
  y: number;
  radius: number;
  alpha: number;
}

export function ParticleField(): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) return;

    const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const fineQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
    let reduced = reducedQuery.matches;
    let interactive = fineQuery.matches && window.innerWidth >= 768 && !reduced;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let particles: Particle[] = [];
    let pulses: Pulse[] = [];
    let pointerX = -1000;
    let pointerY = -1000;
    let pointerVisible = false;
    let frame = 0;
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;

    const particleCount = () => {
      if (window.innerWidth < 768 || !fineQuery.matches) return 18;
      return Math.max(40, Math.min(110, Math.round((width * height) / 14000)));
    };

    const seed = () => {
      const count = particleCount();
      const random = (value: number) => {
        const hashed = Math.sin(value * 12.9898) * 43758.5453;
        return hashed - Math.floor(hashed);
      };
      particles = Array.from({ length: count }, (_, index) => ({
        x: random(index + 1) * width,
        y: random(index + 101) * height,
        vx: (random(index + 211) - 0.5) * 0.075,
        vy: (random(index + 307) - 0.5) * 0.075,
        radius: 0.8 + random(index + 401) * 0.9,
      }));
    };

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      interactive = fineQuery.matches && width >= 768 && !reduced;
      seed();
      canvas.dataset.particleMode = reduced ? 'static' : interactive ? 'interactive' : 'ambient';
      canvas.dataset.particleCount = String(particles.length);
    };

    const line = (a: Particle, b: Particle, alpha: number) => {
      context.strokeStyle = `rgba(${GOLD.r},${GOLD.g},${GOLD.b},${alpha})`;
      context.lineWidth = 0.65;
      context.beginPath();
      context.moveTo(a.x, a.y);
      context.lineTo(b.x, b.y);
      context.stroke();
    };

    const draw = (advance: boolean) => {
      context.clearRect(0, 0, width, height);
      if (interactive && pointerVisible) {
        const glow = context.createRadialGradient(pointerX, pointerY, 0, pointerX, pointerY, 210);
        glow.addColorStop(0, `rgba(${GOLD.r},${GOLD.g},${GOLD.b},0.045)`);
        glow.addColorStop(1, `rgba(${GOLD.r},${GOLD.g},${GOLD.b},0)`);
        context.fillStyle = glow;
        context.fillRect(pointerX - 210, pointerY - 210, 420, 420);
      }

      for (let i = 0; i < particles.length; i += 1) {
        const particle = particles[i];
        if (advance) {
          if (interactive && pointerVisible) {
            const dx = pointerX - particle.x;
            const dy = pointerY - particle.y;
            const distance = Math.hypot(dx, dy);
            if (distance > 1 && distance < POINTER_DISTANCE) {
              const strength = Math.min(0.006, (1 - distance / POINTER_DISTANCE) * 0.004);
              particle.vx += (dx / distance) * strength;
              particle.vy += (dy / distance) * strength;
            }
          }
          particle.vx *= 0.995;
          particle.vy *= 0.995;
          const speed = Math.hypot(particle.vx, particle.vy);
          if (speed > 0.18) { particle.vx *= 0.18 / speed; particle.vy *= 0.18 / speed; }
          particle.x = (particle.x + particle.vx + width) % width;
          particle.y = (particle.y + particle.vy + height) % height;
        }

        for (let j = i + 1; j < particles.length; j += 1) {
          const other = particles[j];
          const distance = Math.hypot(particle.x - other.x, particle.y - other.y);
          if (distance < LINK_DISTANCE) line(particle, other, (1 - distance / LINK_DISTANCE) * 0.18);
        }

        if (interactive && pointerVisible) {
          const distance = Math.hypot(particle.x - pointerX, particle.y - pointerY);
          if (distance < POINTER_DISTANCE) {
            context.strokeStyle = `rgba(${GOLD.r},${GOLD.g},${GOLD.b},${(1 - distance / POINTER_DISTANCE) * 0.34})`;
            context.lineWidth = 0.8;
            context.beginPath();
            context.moveTo(pointerX, pointerY);
            context.lineTo(particle.x, particle.y);
            context.stroke();
          }
        }

        context.fillStyle = `rgba(${GOLD.r},${GOLD.g},${GOLD.b},0.46)`;
        context.beginPath();
        context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        context.fill();
      }

      pulses = pulses.filter((pulse) => pulse.alpha > 0.01);
      for (const pulse of pulses) {
        context.strokeStyle = `rgba(${GOLD.r},${GOLD.g},${GOLD.b},${pulse.alpha})`;
        context.lineWidth = 1;
        context.beginPath();
        context.arc(pulse.x, pulse.y, pulse.radius, 0, Math.PI * 2);
        context.stroke();
        if (advance) { pulse.radius += 1.4; pulse.alpha *= 0.94; }
      }
    };

    const animate = () => {
      if (!document.hidden) draw(true);
      frame = requestAnimationFrame(animate);
    };
    const start = () => {
      cancelAnimationFrame(frame);
      if (reduced) draw(false);
      else frame = requestAnimationFrame(animate);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!interactive) return;
      pointerX = event.clientX;
      pointerY = event.clientY;
      pointerVisible = true;
    };
    const onPointerLeave = () => { pointerVisible = false; };
    const onPointerDown = (event: PointerEvent) => {
      if (interactive) pulses.push({ x: event.clientX, y: event.clientY, radius: 4, alpha: 0.22 });
    };
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => { resize(); start(); }, 140);
    };
    const onMotionChange = () => { reduced = reducedQuery.matches; resize(); start(); };
    const onFineChange = () => { resize(); start(); };
    const onVisibility = () => {
      cancelAnimationFrame(frame);
      if (!document.hidden && !reduced) frame = requestAnimationFrame(animate);
    };

    resize();
    start();
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('blur', onPointerLeave);
    window.addEventListener('resize', onResize, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    reducedQuery.addEventListener('change', onMotionChange);
    fineQuery.addEventListener('change', onFineChange);

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(resizeTimer);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('blur', onPointerLeave);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
      reducedQuery.removeEventListener('change', onMotionChange);
      fineQuery.removeEventListener('change', onFineChange);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      data-particle-field
      className="pointer-events-none fixed inset-0 z-0 block h-screen w-screen"
    />
  );
}
