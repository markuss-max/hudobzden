window.LP = window.LP || {};

(function (LP) {
  function renderProfileView(container, state, { onRefresh, onAuthReset }) {
    const { ACTIVITY_LEVELS, AVATARS } = LP.config;
    const { calculateMifflinStJeor, estimateMonthlyWeightChange, escapeHtml } = LP.calories;
    const { profile, couple } = state;

    const calc = calculateMifflinStJeor({
      sex: profile.sex || 'female',
      age: profile.age || 25,
      heightCm: profile.height_cm || 168,
      weightKg: profile.current_weight || 62,
      targetWeightKg: profile.target_weight || 57,
      activity: profile.activity || 'light',
    });

    const monthlyForecast = estimateMonthlyWeightChange(profile);

    container.innerHTML = `
      <div class="animate-in" style="display:flex; flex-direction:column; gap:14px;">
        <div class="page-header">
          <div>
            <h1 class="page-title">Профиль ${profile.avatar || '🐰'}</h1>
            <div class="page-subtitle">Калькулятор нормы, приватность и настройки пары</div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <span class="card-title">🧸 Маскот и приватность</span>
          </div>

          <form id="profile-basic-form" style="display:flex; flex-direction:column; gap:12px;">
            <div class="field">
              <label class="field-label">Имя</label>
              <input class="input" name="display_name" type="text" value="${escapeHtml(profile.display_name)}" required />
            </div>

            <div class="field">
              <label class="field-label">Выберите аватар</label>
              <div class="avatar-grid">
                ${AVATARS.map(
                  (av) => `
                  <button class="avatar-option ${profile.avatar === av ? 'selected' : ''}" data-avatar="${av}" type="button">${av}</button>
                `
                ).join('')}
              </div>
            </div>

            <label class="row-between" style="background:var(--bg-soft); padding:12px; border-radius:14px; cursor:pointer;">
              <div>
                <div style="font-weight:800; font-size:14px;">🔒 Режим приватности</div>
                <div class="page-subtitle">Партнёр видит только % шкалы, без точного веса и ккал</div>
              </div>
              <input type="checkbox" name="privacy_mode" ${profile.privacy_mode ? 'checked' : ''} style="width:20px; height:20px; accent-color:var(--lavender);" />
            </label>

            <button class="btn btn-primary btn-block" type="submit">Сохранить профиль ✨</button>
          </form>
        </div>

        <div class="card">
          <div class="card-header">
            <span class="card-title">🧮 Калькулятор нормы (Миффлин — Сан-Жеор)</span>
          </div>

          <form id="calc-form" style="display:flex; flex-direction:column; gap:10px;">
            <div class="grid-2">
              <div class="field">
                <label class="field-label">Пол</label>
                <select class="select" name="sex">
                  <option value="female" ${profile.sex !== 'male' ? 'selected' : ''}>Девушка</option>
                  <option value="male" ${profile.sex === 'male' ? 'selected' : ''}>Парень</option>
                </select>
              </div>
              <div class="field">
                <label class="field-label">Возраст</label>
                <input class="input" name="age" type="number" min="14" max="99" value="${profile.age || 25}" required />
              </div>
            </div>

            <div class="grid-2" style="grid-template-columns: repeat(3, 1fr);">
              <div class="field">
                <label class="field-label">Рост (см)</label>
                <input class="input" name="height_cm" type="number" min="120" max="230" value="${profile.height_cm || 168}" required />
              </div>
              <div class="field">
                <label class="field-label">Вес (кг)</label>
                <input class="input" name="current_weight" type="number" step="0.1" value="${profile.current_weight || 62}" required />
              </div>
              <div class="field">
                <label class="field-label">Цель (кг)</label>
                <input class="input" name="target_weight" type="number" step="0.1" value="${profile.target_weight || 57}" required />
              </div>
            </div>

            <div class="field">
              <label class="field-label">Активность</label>
              <select class="select" name="activity">
                ${ACTIVITY_LEVELS.map(
                  (a) => `<option value="${a.id}" ${(profile.activity || 'light') === a.id ? 'selected' : ''}>${a.label}</option>`
                ).join('')}
              </select>
            </div>

            <div style="background:var(--mint-soft); padding:12px; border-radius:14px;">
              <div class="row-between">
                <span style="font-size:13px; font-weight:800; color:var(--mint-dark);">Рекомендация (${calc.goalLabel}):</span>
                <strong style="font-size:16px; color:var(--mint-dark);">${calc.recommended} ккал</strong>
              </div>
              <div class="page-subtitle" style="margin-top:2px;">
                Базовый обмен: ${calc.bmr} · Поддержание: ${calc.tdee} ккал
              </div>
              <div class="page-subtitle" style="margin-top:4px; color:var(--mint-dark); font-weight:800;" id="calc-forecast-line">
                🎯 ${monthlyForecast.goalEta ? monthlyForecast.goalEta.text : ''} (${monthlyForecast.monthlyKg > 0 ? `−${monthlyForecast.monthlyKg}` : `+${Math.abs(monthlyForecast.monthlyKg)}`} кг/мес)
              </div>
            </div>

            <div class="field">
              <label class="field-label">Дневной лимит (можно подкрутить вручную)</label>
              <input class="input" id="daily-limit-input" name="daily_limit" type="number" min="1000" max="5000" value="${profile.daily_limit || calc.recommended}" required />
            </div>

            <div class="row">
              <button class="btn btn-soft btn-block" id="apply-calc-btn" type="button">Подставить расчёт</button>
              <button class="btn btn-mint btn-block" type="submit">Применить лимит 💚</button>
            </div>
          </form>
        </div>

        <div class="card">
          <div class="row-between" style="margin-bottom:10px;">
            <span class="card-title">🔗 Комната пары</span>
            <span class="badge badge-lavender">${escapeHtml(couple?.invite_code || '—')}</span>
          </div>
          <button class="btn btn-coral-soft btn-block" id="signout-btn" type="button">Выйти из аккаунта</button>
        </div>
      </div>
    `;

    let selectedAvatar = profile.avatar || '🐰';

    container.querySelectorAll('[data-avatar]').forEach((btn) => {
      btn.addEventListener('click', () => {
        selectedAvatar = btn.dataset.avatar;
        container.querySelectorAll('[data-avatar]').forEach((b) => b.classList.remove('selected'));
        btn.classList.add('selected');
      });
    });

    container.querySelector('#profile-basic-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      await LP.dataService.updateProfile(
        {
          display_name: fd.get('display_name').trim(),
          avatar: selectedAvatar,
          privacy_mode: fd.get('privacy_mode') === 'on',
        },
        state
      );
      LP.toast.showToast('Профиль обновлён! 🧸', 'success');
      await onRefresh();
    });

    const calcForm = container.querySelector('#calc-form');
    const updateLiveForecast = () => {
      const fd = new FormData(calcForm);
      const preview = estimateMonthlyWeightChange(
        {
          sex: fd.get('sex'),
          age: Number(fd.get('age')),
          height_cm: Number(fd.get('height_cm')),
          current_weight: Number(fd.get('current_weight')),
          target_weight: Number(fd.get('target_weight')),
          activity: fd.get('activity'),
        },
        Number(fd.get('daily_limit'))
      );
      const line = container.querySelector('#calc-forecast-line');
      if (line) {
        const pace = preview.monthlyKg > 0 ? `−${preview.monthlyKg}` : `+${Math.abs(preview.monthlyKg)}`;
        line.textContent = `🎯 ${preview.goalEta ? preview.goalEta.text : ''} (${pace} кг/мес)`;
      }
    };

    container.querySelector('#daily-limit-input').addEventListener('input', updateLiveForecast);
    container.querySelector('#apply-calc-btn').addEventListener('click', () => {
      const fd = new FormData(calcForm);
      const next = calculateMifflinStJeor({
        sex: fd.get('sex'),
        age: Number(fd.get('age')),
        heightCm: Number(fd.get('height_cm')),
        weightKg: Number(fd.get('current_weight')),
        targetWeightKg: Number(fd.get('target_weight')),
        activity: fd.get('activity'),
      });
      container.querySelector('#daily-limit-input').value = next.recommended;
      updateLiveForecast();
      LP.toast.showToast(`Рассчитано: ${next.recommended} ккал/день ✨`, 'info');
    });

    calcForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(calcForm);
      await LP.dataService.updateProfile(
        {
          sex: fd.get('sex'),
          age: Number(fd.get('age')),
          height_cm: Number(fd.get('height_cm')),
          current_weight: Number(fd.get('current_weight')),
          target_weight: Number(fd.get('target_weight')),
          activity: fd.get('activity'),
          daily_limit: Number(fd.get('daily_limit')),
        },
        state
      );
      LP.toast.showToast('Дневной лимит сохранён! 💚', 'success');
      await onRefresh();
    });

    const signoutBtn = container.querySelector('#signout-btn');
    if (signoutBtn) {
      signoutBtn.addEventListener('click', async () => {
        await LP.supabaseService.signOut();
        await onAuthReset();
      });
    }
  }

  LP.views = LP.views || {};
  LP.views.renderProfileView = renderProfileView;
})(window.LP);
