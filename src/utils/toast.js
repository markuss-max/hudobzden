window.LP = window.LP || {};

(function (LP) {
  function showToast(message, type = 'info', durationMs = 3600) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const iconMap = {
      info: '✨',
      success: '💚',
      warn: '🌟',
      error: '🍓',
      reaction: '💌',
    };

    const iconSpan = document.createElement('span');
    iconSpan.textContent = iconMap[type] || '✨';
    iconSpan.style.fontSize = '18px';

    const textSpan = document.createElement('span');
    textSpan.textContent = message;

    toast.append(iconSpan, textSpan);
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-6px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 260);
    }, durationMs);
  }

  LP.toast = { showToast };
})(window.LP);
