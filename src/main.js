(function (LP) {
  let currentTab = 'today';
  let currentState = null;
  let unsubscribeRealtime = null;
  let lastKnownDate = LP.calories.getTodayKey();

  const mainEl = document.getElementById('main-content');
  const navEl = document.getElementById('bottom-nav');

  window.addEventListener('error', (event) => {
    if (LP.toast) {
      LP.toast.showToast(`Ошибка: ${event.message}`, 'error', 6000);
    }
  });

  function bootstrap() {
    bindNavigation();
    startMidnightWatcher();
    loadAndRender();
  }

  function bindNavigation() {
    navEl.querySelectorAll('.nav-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        navigateTo(btn.dataset.tab);
      });
    });
  }

  function navigateTo(tab) {
    currentTab = tab;
    navEl.querySelectorAll('.nav-item').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    renderCurrentView();
  }

  async function loadAndRender() {
    try {
      currentState = await LP.dataService.loadState();
    } catch (err) {
      LP.toast.showToast(err.message || 'Ошибка загрузки данных', 'error');
      currentState = null;
    }

    if (!currentState || currentState.needsPairing) {
      cleanupRealtime();
      navEl.classList.add('hidden');
      mainEl.classList.add('auth-mode');
      LP.views.renderAuthView(mainEl, currentState, loadAndRender);
      return;
    }

    navEl.classList.remove('hidden');
    mainEl.classList.remove('auth-mode');

    if (currentState.couple?.id) {
      setupRealtime(currentState.couple.id, currentState.profile.id);
    } else {
      cleanupRealtime();
    }

    renderCurrentView();
  }

  function renderCurrentView() {
    if (!currentState) return;

    const actions = {
      onRefresh: loadAndRender,
      onNavigate: navigateTo,
      onAuthReset: async () => {
        cleanupRealtime();
        currentState = null;
        await loadAndRender();
      },
    };

    if (currentTab === 'today') {
      LP.views.renderTodayView(mainEl, currentState, actions);
    } else if (currentTab === 'kitchen') {
      LP.views.renderKitchenView(mainEl, currentState, actions);
    } else if (currentTab === 'progress') {
      LP.views.renderProgressView(mainEl, currentState, actions);
    } else if (currentTab === 'profile') {
      LP.views.renderProfileView(mainEl, currentState, actions);
    }
  }

  function setupRealtime(coupleId, userId) {
    cleanupRealtime();
    unsubscribeRealtime = LP.supabaseService.subscribeRealtime(
      coupleId,
      userId,
      () => {
        loadAndRender();
      },
      (reaction) => {
        LP.toast.showToast(reaction.message || 'Партнёр отправил реакцию 💌', 'reaction', 5000);
      }
    );
  }

  function cleanupRealtime() {
    if (typeof unsubscribeRealtime === 'function') {
      unsubscribeRealtime();
      unsubscribeRealtime = null;
    }
  }

  function startMidnightWatcher() {
    setInterval(() => {
      const nowKey = LP.calories.getTodayKey();
      if (nowKey !== lastKnownDate) {
        lastKnownDate = nowKey;
        LP.toast.showToast('Новый день начался! Прогресс обновлён 🌅', 'info', 4500);
        loadAndRender();
      }
    }, 30000);
  }

  bootstrap();
})(window.LP);
