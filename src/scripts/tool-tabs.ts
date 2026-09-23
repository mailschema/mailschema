const group = document.querySelector<HTMLElement>('[data-tool-tabs]')!;
const tabs = [...group.querySelectorAll<HTMLAnchorElement>('a')];
const panels = tabs.map((tab) => document.getElementById(tab.hash.slice(1))!);

function select(index: number, updateHash = false) {
  tabs.forEach((tab, position) => {
    tab.setAttribute('aria-selected', String(position === index));
    tab.tabIndex = position === index ? 0 : -1;
    panels[position].hidden = position !== index;
  });
  if (updateHash) history.replaceState(null, '', tabs[index].hash);
}

group.setAttribute('role', 'tablist');
tabs.forEach((tab, index) => {
  tab.setAttribute('role', 'tab');
  tab.setAttribute('aria-controls', panels[index].id);
  panels[index].setAttribute('role', 'tabpanel');
  panels[index].setAttribute('aria-labelledby', tab.id);
  panels[index].tabIndex = 0;
  tab.addEventListener('click', (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
    event.preventDefault();
    select(index, true);
  });
  tab.addEventListener('keydown', (event) => {
    const next =
      event.key === 'ArrowRight'
        ? (index + 1) % tabs.length
        : event.key === 'ArrowLeft'
          ? (index + tabs.length - 1) % tabs.length
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? tabs.length - 1
              : -1;
    if (next >= 0) {
      event.preventDefault();
      select(next, true);
      tabs[next].focus();
    } else if (event.key === ' ') {
      event.preventDefault();
      select(index, true);
    }
  });
});
function fromHash() {
  const index = tabs.findIndex((tab) => tab.hash === location.hash);
  if (index >= 0) select(index);
}
select(
  Math.max(
    0,
    tabs.findIndex((tab) => tab.hash === location.hash),
  ),
);
window.addEventListener('hashchange', fromHash);
