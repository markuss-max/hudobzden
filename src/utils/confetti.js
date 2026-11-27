window.LP = window.LP || {};

(function (LP) {
  async function launchCozyConfetti() {
    try {
      if (typeof window.confetti === 'function') {
        window.confetti({
          particleCount: 75,
          spread: 72,
          origin: { y: 0.65 },
          colors: ['#7ED9A4', '#B39DDB', '#FFD54F', '#FF8A80'],
        });
      }
    } catch {
      // Offline or blocked CDN: fail silently
    }
  }

  LP.confetti = { launchCozyConfetti };
})(window.LP);
