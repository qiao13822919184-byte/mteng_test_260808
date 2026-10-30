(() => {
  const group = document.querySelector('.ymx-product-nav');
  const toggle = document.querySelector('.ymx-drop-toggle');
  if (!group || !toggle) return;
  const setOpen = (open) => { group.dataset.open = String(open); toggle.setAttribute('aria-expanded', String(open)); if(open) delete group.dataset.forceClosed; else group.dataset.forceClosed = 'true'; };
  toggle.addEventListener('click', () => setOpen(group.dataset.open !== 'true'));
  group.addEventListener('pointerenter', () => { delete group.dataset.forceClosed; setOpen(true); });
  group.addEventListener('pointerleave', () => { if(!group.contains(document.activeElement)) setOpen(false); });
  group.addEventListener('focusin', () => setOpen(true));
  group.addEventListener('focusout', (event) => { if (!group.contains(event.relatedTarget)) setOpen(false); });
  document.addEventListener('click', (event) => { if (!group.contains(event.target)) setOpen(false); });
  group.addEventListener('keydown', (event) => { if(event.key === 'Escape'){setOpen(false);group.dataset.forceClosed='true';toggle.focus();group.dataset.forceClosed='true';} });
})();

const mobileToggle=document.getElementById('nav-toggle'); const mobilePanel=document.getElementById('mobile-nav'); mobileToggle?.addEventListener('click',()=>{const open=mobilePanel.classList.toggle('hidden')===false; mobileToggle.setAttribute('aria-expanded',String(open));});
