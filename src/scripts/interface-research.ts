function initialiseResearch() {
  document.querySelectorAll<HTMLElement>('[data-interface-research]').forEach((root) => {
    if (root.dataset.ready) return;
    root.dataset.ready = 'true';
    const query = root.querySelector<HTMLInputElement>('[data-query]')!;
    const group = root.querySelector<HTMLSelectElement>('[data-group]')!;
    const disposition = root.querySelector<HTMLSelectElement>('[data-disposition]')!;
    const entries = [...root.querySelectorAll<HTMLDetailsElement>('[data-entry]')];
    const sections = [...root.querySelectorAll<HTMLElement>('[data-result-group]')];
    const index = entries.map((entry) => ({ entry, text: entry.textContent!.toLowerCase() }));
    const filter = () => {
      const terms = query.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
      let count = 0;
      index.forEach(({ entry, text }) => {
        entry.hidden =
          !terms.every((term) => text.includes(term)) ||
          Boolean(group.value && entry.dataset.group !== group.value) ||
          Boolean(disposition.value && entry.dataset.disposition !== disposition.value);
        if (!entry.hidden) count++;
      });
      sections.forEach((section) => {
        section.hidden = !section.querySelector('[data-entry]:not([hidden])');
      });
      root.querySelector('[data-count]')!.textContent = `${count} of ${entries.length} entries`;
      root.querySelector<HTMLElement>('[data-empty]')!.hidden = count > 0;
    };
    const reset = () => {
      query.value = '';
      group.value = '';
      disposition.value = '';
      filter();
    };
    const revealHash = () => {
      let id: string;
      try {
        id = decodeURIComponent(location.hash.slice(1));
      } catch {
        return;
      }
      const target = document.getElementById(id);
      if (!target || !root.contains(target)) return;
      reset();
      if (target instanceof HTMLDetailsElement) target.open = true;
      requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
    };
    query.addEventListener('input', filter);
    group.addEventListener('change', filter);
    disposition.addEventListener('change', filter);
    root.querySelector('[data-reset]')!.addEventListener('click', reset);
    root.querySelector<HTMLElement>('[data-controls]')!.hidden = false;
    window.addEventListener('hashchange', revealHash);
    document.addEventListener(
      'astro:before-swap',
      () => window.removeEventListener('hashchange', revealHash),
      { once: true },
    );
    filter();
    revealHash();
  });
}
initialiseResearch();
document.addEventListener('astro:page-load', initialiseResearch);
