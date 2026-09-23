document.querySelectorAll<HTMLElement>('[data-code-block]').forEach((block) => {
  const button = block.querySelector<HTMLButtonElement>('[data-copy-code]')!;
  const label = button.querySelector<HTMLElement>('[data-copy-label]')!;
  const code = block.querySelector('pre code')!;
  const status = block.querySelector<HTMLElement>('[role="status"]')!;
  let timer: ReturnType<typeof setTimeout>;
  button.hidden = false;
  button.addEventListener('click', async () => {
    clearTimeout(timer);
    try {
      await navigator.clipboard.writeText(code.textContent || '');
      label.textContent = 'Copied';
      status.textContent = 'Code copied to clipboard.';
    } catch {
      const range = document.createRange();
      range.selectNodeContents(code);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      label.textContent = 'Selected';
      status.textContent =
        'Automatic copying is unavailable. The code is selected; use your browser’s Copy command.';
    }
    timer = setTimeout(() => {
      label.textContent = 'Copy';
      status.textContent = '';
    }, 3000);
  });
});
