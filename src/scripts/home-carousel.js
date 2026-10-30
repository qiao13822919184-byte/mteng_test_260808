/* Native, static-content carousel: no remote requests, library, clones or video SDK. */
(() => {
  document.querySelectorAll('[data-ymx-carousel]').forEach((region) => {
    if (region.dataset.carouselReady) return;
    const track = region.querySelector('.ymx-product-track');
    const slides = Array.from(track?.children || []);
    if (!track || slides.length < 2) return;
    region.dataset.carouselReady = 'true';
    const controls = region.querySelector('.ymx-carousel-controls');
    const position = region.querySelector('.ymx-carousel-position');
    const announcement = region.querySelector('[data-carousel-announcement]');
    const pauseButton = region.querySelector('[data-carousel-pause]');
    const zh = region.dataset.language === 'zh';
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let userPaused = false;
    let hovering = false;
    let focused = false;
    let inView = false;
    let pointerActive = false;
    let timer;
    let scrollFrame;
    let current = 0;

    const maxScroll = () => Math.max(0, track.scrollWidth - track.clientWidth);
    const slideOffset = (i) => Math.min(maxScroll(), slides[i].offsetLeft - slides[0].offsetLeft);
    const nearest = () => {
      const x = track.scrollLeft;
      let best = 0;
      let distance = Infinity;
      slides.forEach((_, i) => {
        const d = Math.abs(slideOffset(i) - x);
        if (d < distance - .5) { best = i; distance = d; }
      });
      return best;
    };
    const updatePosition = (speak = false) => {
      current = nearest();
      const bounds = track.getBoundingClientRect();
      const visible = slides.map((slide, i) => ({r:slide.getBoundingClientRect(),i}))
        .filter(({r}) => r.right > bounds.left + 3 && r.left < bounds.right - 3);
      const start = visible.length ? visible[0].i + 1 : current + 1;
      const end = visible.length ? visible[visible.length - 1].i + 1 : current + 1;
      const message = zh ? `第 ${start}–${end} 款 / 共 ${slides.length} 款` : `Products ${start}–${end} of ${slides.length}`;
      position.textContent = message;
      if (speak) announcement.textContent = message;
    };
    const mayPlay = () => !userPaused && !hovering && !focused && !pointerActive && inView && !document.hidden && !motion.matches && maxScroll() > 1;
    const schedule = () => {
      window.clearTimeout(timer);
      if (mayPlay()) timer = window.setTimeout(() => move(1, false), 4800);
    };
    const setPauseLabel = () => {
      pauseButton.disabled = motion.matches;
      pauseButton.setAttribute('aria-pressed', String(userPaused || motion.matches));
      pauseButton.textContent = motion.matches ? (zh ? '自动播放已关' : 'Autoplay off') : userPaused ? (zh ? '播放' : 'Play') : (zh ? '暂停' : 'Pause');
      pauseButton.setAttribute('aria-label', motion.matches ? (zh ? '按系统减少动态效果设置关闭自动轮播' : 'Autoplay disabled by your reduced-motion setting') : userPaused ? (zh ? '启用自动轮播；移开鼠标或焦点后继续' : 'Enable autoplay; continues when pointer and focus leave') : (zh ? '暂停自动轮播' : 'Pause autoplay'));
    };
    function go(index, manual) {
      const to = Math.max(0, Math.min(slides.length - 1, index));
      track.scrollTo({ left:slideOffset(to), behavior:motion.matches ? 'auto' : 'smooth' });
      if (manual) {
        const name = slides[to].querySelector('h3')?.textContent.trim();
        announcement.textContent = name || '';
      }
      schedule();
    }
    function move(direction, manual = true) {
      const index = nearest();
      if (direction > 0 && track.scrollLeft >= maxScroll() - 3) go(0, manual);
      else if (direction < 0 && track.scrollLeft <= 3) go(slides.length - 1, manual);
      else go(index + direction, manual);
    }
    region.querySelector('[data-carousel-prev]').addEventListener('click', () => move(-1));
    region.querySelector('[data-carousel-next]').addEventListener('click', () => move(1));
    pauseButton.addEventListener('click', () => { userPaused = !userPaused; setPauseLabel(); schedule(); });
    track.addEventListener('keydown', (event) => {
      if (event.target !== track) return;
      if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
      event.preventDefault();
      if (event.key === 'Home') go(0, true);
      else if (event.key === 'End') go(slides.length - 1, true);
      else move(event.key === 'ArrowRight' ? 1 : -1);
    });
    region.addEventListener('pointerenter', (event) => { if (event.pointerType === 'mouse') { hovering = true; schedule(); } });
    region.addEventListener('pointerleave', (event) => { if (event.pointerType === 'mouse') { hovering = false; schedule(); } });
    region.addEventListener('focusin', () => { focused = true; schedule(); });
    region.addEventListener('focusout', () => {
      window.setTimeout(() => { focused = region.contains(document.activeElement); schedule(); }, 0);
    });
    track.addEventListener('pointerdown', (event) => {
      pointerActive = true;
      if (event.pointerType !== 'mouse') { userPaused = true; setPauseLabel(); }
      schedule();
    }, {passive:true});
    window.addEventListener('pointerup', () => { if (pointerActive) { pointerActive = false; schedule(); } }, {passive:true});
    window.addEventListener('pointercancel', () => { if (pointerActive) { pointerActive = false; schedule(); } }, {passive:true});
    track.addEventListener('scroll', () => {
      window.cancelAnimationFrame(scrollFrame);
      scrollFrame = window.requestAnimationFrame(() => updatePosition());
    }, {passive:true});
    document.addEventListener('visibilitychange', schedule);
    motion.addEventListener('change', () => { setPauseLabel(); schedule(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        inView = entries[0].isIntersecting && entries[0].intersectionRatio >= .25;
        schedule();
      }, {threshold:[0,.25]}).observe(track);
    } // Old browsers without visibility observation remain manual.
    if ('ResizeObserver' in window) new ResizeObserver(() => { updatePosition(); schedule(); }).observe(track);
    else window.addEventListener('resize', () => { updatePosition(); schedule(); }, {passive:true});
    controls.hidden = false;
    setPauseLabel();
    updatePosition();
    schedule();
  });
})();
