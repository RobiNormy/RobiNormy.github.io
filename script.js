(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const header = document.querySelector('.site-header');
  const links = [...document.querySelectorAll('.nav-links a')];
  const sections = [...document.querySelectorAll('main > section[id]')];
  const runningAnimations = new Set();
  document.querySelector('#year').textContent = new Date().getFullYear();

  // Content stays visible without JavaScript or animation support.
  function animate(element, frames, options) {
    if (reducedMotion.matches || !element.animate) return;
    const animation = element.animate(frames, options);
    runningAnimations.add(animation);
    const cleanup = () => runningAnimations.delete(animation);
    animation.onfinish = cleanup;
    animation.oncancel = cleanup;
  }

  function reveal(element, delay = 0) {
    animate(element, [
      { opacity: 0, transform: 'translateY(24px)' },
      { opacity: 1, transform: 'translateY(0)' }
    ], { duration: 700, delay, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' });
  }

  document.querySelectorAll('.hero-copy > *').forEach((element, index) => reveal(element, index * 75));
  reveal(document.querySelector('.hero-art'), 180);

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const element = entry.target;
        reveal(element, Number(element.dataset.revealDelay || 0));
        if (element.matches('.budget-project')) {
          element.querySelectorAll('.budget-bars i').forEach((bar, index) => {
            animate(bar, [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], {
              duration: 900, delay: 180 + index * 70, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards'
            });
          });
        }
        observer.unobserve(element);
      }
    }, { threshold: 0.08 });
    document.querySelectorAll('.section-heading, .featured-project, .project-row, .about-grid > div, .stack-item, .contact').forEach(element => observer.observe(element));
    document.querySelectorAll('.stack-item').forEach((element, index) => { element.dataset.revealDelay = index * 90; });
  }

  const progress = document.createElement('div');
  progress.className = 'reading-progress';
  progress.setAttribute('aria-hidden', 'true');
  header.append(progress);

  const backToTop = document.createElement('button');
  backToTop.type = 'button';
  backToTop.className = 'back-to-top';
  backToTop.innerHTML = '<span aria-hidden="true">↑</span>';
  backToTop.setAttribute('aria-label', 'Back to top');
  backToTop.hidden = true;
  document.body.append(backToTop);
  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
    document.querySelector('.wordmark').focus({ preventScroll: true });
  });

  // One scheduled update per frame, with section measurements cached on resize.
  let sectionPositions = [];
  let scrollRange = 1;
  let scrollFrame = 0;
  function measure() {
    sectionPositions = sections.map(section => ({ id: section.id, top: section.offsetTop }));
    scrollRange = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    scheduleScroll();
  }
  function updateScroll() {
    scrollFrame = 0;
    const y = window.scrollY;
    progress.style.transform = `scaleX(${Math.min(1, Math.max(0, y / scrollRange))})`;
    header.classList.toggle('is-scrolled', y > 30);
    backToTop.hidden = y < window.innerHeight * 0.7;
    const current = sectionPositions.filter(section => section.top <= y + window.innerHeight * 0.35).at(-1);
    for (const link of links) {
      if (link.hash === `#${current?.id}`) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
  }
  function scheduleScroll() {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScroll);
  }
  window.addEventListener('scroll', scheduleScroll, { passive: true });
  window.addEventListener('resize', measure, { passive: true });
  window.addEventListener('load', measure);
  if ('ResizeObserver' in window) new ResizeObserver(measure).observe(document.body);
  document.fonts?.ready.then(measure);
  measure();

  // Pointer effects are restricted to devices with a precise, hovering pointer.
  const surfaces = [...document.querySelectorAll('.hero-art, .featured-project')];
  const resets = [];
  for (const surface of surfaces) {
    let frame = 0;
    let bounds;
    let pointer;
    const reset = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      bounds = null;
      surface.classList.remove('pointer-active');
      for (const name of ['--pointer-x', '--pointer-y', '--tilt-x', '--tilt-y']) surface.style.removeProperty(name);
    };
    resets.push(reset);
    surface.addEventListener('pointermove', event => {
      if (reducedMotion.matches || !finePointer.matches || event.pointerType === 'touch') return;
      pointer = { x: event.clientX, y: event.clientY };
      bounds ||= surface.getBoundingClientRect();
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const x = Math.max(0, Math.min(1, (pointer.x - bounds.left) / bounds.width));
        const y = Math.max(0, Math.min(1, (pointer.y - bounds.top) / bounds.height));
        surface.style.setProperty('--pointer-x', `${x * 100}%`);
        surface.style.setProperty('--pointer-y', `${y * 100}%`);
        surface.style.setProperty('--tilt-x', `${(0.5 - y) * 5}deg`);
        surface.style.setProperty('--tilt-y', `${(x - 0.5) * 5}deg`);
        surface.classList.add('pointer-active');
      });
    });
    surface.addEventListener('pointerleave', reset);
    surface.addEventListener('pointercancel', reset);
  }
  window.addEventListener('scroll', () => resets.forEach(reset => reset()), { passive: true });
  finePointer.addEventListener('change', () => resets.forEach(reset => reset()));
  reducedMotion.addEventListener('change', () => {
    resets.forEach(reset => reset());
    if (reducedMotion.matches) {
      for (const animation of runningAnimations) animation.cancel();
      runningAnimations.clear();
    }
  });
})();
