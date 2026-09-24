export function showToast(message: string) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.dataset.testid = 'toast';
  toast.textContent = message;
  document.body.append(toast);

  requestAnimationFrame(() => toast.classList.add('toast--show'));
  setTimeout(() => {
    toast.classList.remove('toast--show');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  }, 3000);
}

