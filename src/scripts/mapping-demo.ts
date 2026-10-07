function initialize() {
  document.querySelectorAll<HTMLElement>('[data-mapping-demo]').forEach((root) => {
    if (root.dataset.ready) return;
    root.dataset.ready = 'true';
    let step = 'act';
    let transport = 'http';
    const show = () => {
      root.querySelectorAll<HTMLElement>('[data-panel-step]').forEach((panel) => {
        panel.hidden =
          panel.dataset.panelStep !== step ||
          !['any', transport].includes(panel.dataset.panelTransport!);
      });
      root.querySelectorAll<HTMLButtonElement>('[data-step]').forEach((button) => {
        if (button.dataset.step === step) button.setAttribute('aria-current', 'step');
        else button.removeAttribute('aria-current');
      });
      root.querySelectorAll<HTMLButtonElement>('[data-transport]').forEach((button) => {
        button.setAttribute('aria-pressed', String(button.dataset.transport === transport));
      });
    };
    root.addEventListener('click', (event) => {
      const button = (event.target as Element).closest<HTMLButtonElement>('button');
      if (button?.dataset.step) step = button.dataset.step;
      else if (button?.dataset.transport) transport = button.dataset.transport;
      else return;
      show();
    });
    root.querySelectorAll<HTMLElement>('[data-enhance]').forEach((element) => {
      element.hidden = false;
    });
    show();
  });
}
initialize();
document.addEventListener('astro:page-load', initialize);
