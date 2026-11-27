window.LP = window.LP || {};

(function (LP) {
  let activeInputTab = 'quick'; // 'quick' | 'fav' | 'manual' | 'ai'
  let activeFeedTab = 'mine'; // 'mine' | 'partner'
  let presetSearchQuery = '';
  let aiParsedItems = [];

  function renderTodayView(container, state, { onRefresh, onNavigate }) {
    const {
      escapeHtml,
      formatRussianDate,
      getCalorieStatus,
      getTodayKey,
      estimateMonthlyWeightChange,
    } = LP.calories;
    const { profile, partner, couple, todayFoodLogs, favorites } = state;
    const todayKey = getTodayKey();

    const myLogs = todayFoodLogs.filter((f) => f.user_id === profile.id);
    const partnerLogs = partner ? todayFoodLogs.filter((f) => f.user_id === partner.id) : [];

    const myEaten = myLogs.reduce((sum, item) => sum + Number(item.calories || 0), 0);
    const myStatus = getCalorieStatus(myEaten, profile.daily_limit);

    const partnerEaten = partnerLogs.reduce((sum, item) => sum + Number(item.calories || 0), 0);
    const partnerStatus = partner
      ? getCalorieStatus(partnerEaten, partner.daily_limit)
      : null;

    const forecast = estimateMonthlyWeightChange(profile);

    const radius = 56;
    const circumference = 2 * Math.PI * radius;
    const clampedRatio = Math.min(1, myStatus.ratio);
    const dashOffset = circumference * (1 - clampedRatio);

    const feedItems = activeFeedTab === 'mine' ? myLogs : partnerLogs;

    container.innerHTML = `
      <div class="animate-in" style="display:flex; flex-direction:column; gap:14px;">
        <div class="page-header">
          <div>
            <h1 class="page-title">Сегодня ${profile.avatar || '🐰'}</h1>
            <div class="page-subtitle">${formatRussianDate(todayKey)} · сброс в 00:00</div>
          </div>
          <span class="badge badge-mint">Код: ${escapeHtml(couple?.invite_code || '')}</span>
        </div>

        <div class="dashboard-grid">
          <div class="card user-ring-card">
            <div class="row" style="width:100%; justify-content:space-between;">
              <span style="font-size:13px; font-weight:800;">${escapeHtml(profile.display_name)}</span>
              <span class="badge badge-${myStatus.tone === 'coral' ? 'coral' : myStatus.tone === 'yellow' ? 'yellow' : 'mint'}">${myStatus.pct}%</span>
            </div>

            <div class="ring-wrap">
              <svg class="ring-svg" viewBox="0 0 140 140">
                <circle class="ring-bg" cx="70" cy="70" r="${radius}" />
                <circle
                  class="ring-progress"
                  cx="70"
                  cy="70"
                  r="${radius}"
                  style="stroke:${myStatus.color}; stroke-dasharray:${circumference}; stroke-dashoffset:${dashOffset};"
                />
              </svg>
              <div class="ring-center">
                ${
                  myStatus.overage > 0
                    ? `<div class="ring-remaining" style="color:var(--coral-dark); font-size:19px;">+${myStatus.overage}</div>
                       <div class="ring-sub" style="color:var(--coral-dark);">Перебор ккал</div>`
                    : `<div class="ring-remaining">${myStatus.remaining}</div>
                       <div class="ring-sub">осталось ккал</div>`
                }
              </div>
            </div>

            <div class="ring-stats-row">
              <span>Съедено: <strong>${myStatus.eaten}</strong></span>
              <span>Лимит: <strong>${myStatus.limit}</strong></span>
            </div>
          </div>

          <div class="card partner-card">
            ${
              partner
                ? `
              <div class="partner-top">
                <div class="avatar-pill">${partner.avatar || '🐻'}</div>
                <div>
                  <div class="partner-name">${escapeHtml(partner.display_name)}</div>
                  <div class="partner-status">${partnerStatus.statusText}</div>
                </div>
              </div>

              <div>
                <div class="battery-shell" title="Прогресс партнёра">
                  <div class="battery-body">
                    <div class="battery-fill" style="width:${Math.min(100, partnerStatus.pct)}%; background:${partnerStatus.color};"></div>
                  </div>
                  <div class="battery-cap"></div>
                </div>
                <div class="battery-pct" style="margin-top:6px;">
                  ${
                    partner.privacy_mode
                      ? `${partnerStatus.pct}% лимита (приватно 🔒)`
                      : `${partnerEaten} / ${partner.daily_limit} ккал (${partnerStatus.pct}%)`
                  }
                </div>
              </div>

              <div class="reaction-row">
                <button class="reaction-btn" data-react="cheer" type="button">🔥 Красавчик!</button>
                <button class="reaction-btn" data-react="nudge" type="button">🍩 Осторожнее!</button>
              </div>
              `
                : `
              <div style="text-align:center; padding: 12px 4px;">
                <div style="font-size:28px;">💌</div>
                <div class="partner-name" style="margin-top:6px;">Ждём партнёра</div>
                <p class="partner-status" style="margin-top:4px;">Отправьте код комнаты:</p>
                <div class="badge badge-lavender" style="margin-top:8px; font-size:14px; letter-spacing:2px;">
                  ${escapeHtml(couple?.invite_code || '—')}
                </div>
              </div>
              `
            }
          </div>
        </div>

        <!-- Target Weight Achievement Forecast -->
        <div class="card stash-card">
          <div class="row-between" style="align-items:flex-start;">
            <div style="flex:1;">
              <div class="card-title">🎯 Прогноз до цели</div>
              <div style="font-size:14px; font-weight:800; color:var(--text-main); margin-top:4px;">
                ${
                  forecast.goalEta
                    ? forecast.goalEta.text
                    : 'Укажите текущий и целевой вес в Профиле ✨'
                }
              </div>
              <div class="page-subtitle" style="margin-top:3px;">
                ${
                  forecast.monthlyKg > 0.1
                    ? `Темп: <strong>−${forecast.monthlyKg} кг/мес</strong> (дефицит ${forecast.dailyDeficit} ккал/день)`
                    : forecast.monthlyKg < -0.1
                      ? `Темп: <strong>+${Math.abs(forecast.monthlyKg)} кг/мес</strong> (профицит ${Math.abs(forecast.dailyDeficit)} ккал/день)`
                      : 'Текущий лимит держит вес стабильным 🌿'
                }
              </div>
            </div>
            ${
              myStatus.overage === 0
                ? `<button class="btn btn-mint btn-sm" id="close-day-btn" type="button" style="white-space:nowrap;">Я молодец 🎉</button>`
                : `<button class="btn btn-soft btn-sm" id="goto-calc-btn" type="button">Лимит</button>`
            }
          </div>
        </div>

        <!-- Add Food (Simplified: Quick List, Favorites, Manual) -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">🍽️ Добавить еду</span>
            <span class="page-subtitle">В 1–2 касания</span>
          </div>

          <div class="segmented" style="grid-template-columns: repeat(4, 1fr);">
            <button class="seg-btn ${activeInputTab === 'quick' ? 'active' : ''}" data-input-tab="quick" type="button">⚡ Быстро</button>
            <button class="seg-btn ${activeInputTab === 'fav' ? 'active' : ''}" data-input-tab="fav" type="button">❤️ Избр.</button>
            <button class="seg-btn ${activeInputTab === 'manual' ? 'active' : ''}" data-input-tab="manual" type="button">✏️ Ручной</button>
            <button class="seg-btn ${activeInputTab === 'ai' ? 'active' : ''}" data-input-tab="ai" type="button">✨ ИИ</button>
          </div>

          ${renderFoodInputBody(favorites, escapeHtml)}
        </div>

        <!-- Daily Feed -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">🥗 Лента за сегодня</span>
            <div class="row" style="gap:4px;">
              <button class="btn btn-sm ${activeFeedTab === 'mine' ? 'btn-lavender-soft' : 'btn-soft'}" data-feed-tab="mine" type="button">Моё (${myLogs.length})</button>
              ${
                partner
                  ? `<button class="btn btn-sm ${activeFeedTab === 'partner' ? 'btn-lavender-soft' : 'btn-soft'}" data-feed-tab="partner" type="button">${escapeHtml(partner.display_name)} (${partnerLogs.length})</button>`
                  : ''
              }
            </div>
          </div>

          <div class="log-list">
            ${
              feedItems.length === 0
                ? `<div class="page-subtitle" style="text-align:center; padding:14px 0;">Пока пусто — добавьте первый приём пищи 🌱</div>`
                : feedItems
                    .map((item) => {
                      const isMine = item.user_id === profile.id;
                      const isFav = favorites.some(
                        (f) => f.name.toLowerCase() === item.name.toLowerCase()
                      );
                      return `
                        <div class="log-item">
                          <div class="log-info">
                            <div class="log-title">${escapeHtml(item.name)}</div>
                            <div class="log-meta">${item.calories} ккал</div>
                          </div>
                          <div class="row" style="gap:6px;">
                            ${
                              isMine
                                ? `
                              <button class="icon-btn" data-fav-name="${escapeHtml(item.name)}" data-fav-kcal="${item.calories}" title="В избранное" type="button">
                                ${isFav ? '❤️' : '🤍'}
                              </button>
                              <button class="icon-btn" data-del-food="${item.id}" title="Удалить" type="button">🗑️</button>
                              `
                                : `
                              <button class="btn btn-sm btn-lavender-soft" data-copy-name="${escapeHtml(item.name)}" data-copy-kcal="${item.calories}" type="button">
                                + Себе
                              </button>
                              `
                            }
                          </div>
                        </div>
                      `;
                    })
                    .join('')
            }
          </div>
        </div>
      </div>
    `;

    bindTodayEvents(container, state, { onRefresh, onNavigate });
  }

  function renderFoodInputBody(favorites, escapeHtml) {
    if (activeInputTab === 'quick') {
      const q = presetSearchQuery.trim().toLowerCase();
      const presets = (LP.foodPresets || []).filter((p) =>
        !q ? true : p.name.toLowerCase().includes(q)
      );

      return `
        <div style="display:flex; flex-direction:column; gap:10px;">
          <div class="portion-pills" style="margin:0;">
            <button class="btn btn-sm btn-mint" data-quick-kcal="100" type="button">+100</button>
            <button class="btn btn-sm btn-mint" data-quick-kcal="200" type="button">+200</button>
            <button class="btn btn-sm btn-lavender-soft" data-quick-kcal="300" type="button">+300</button>
            <button class="btn btn-sm btn-lavender-soft" data-quick-kcal="500" type="button">+500</button>
          </div>

          <input class="input" id="preset-search-input" type="search" placeholder="Поиск блюда: кофе, овсянка, курица..." value="${escapeHtml(presetSearchQuery)}" />

          <div class="fav-strip" id="preset-strip">
            ${
              presets.length === 0
                ? `<div class="page-subtitle" style="padding:8px 4px;">Ничего не найдено — добавьте во вкладке «Вручную» ✏️</div>`
                : presets
                    .slice(0, 14)
                    .map(
                      (p) => `
                  <button class="fav-chip" data-quick-fav-name="${escapeHtml(p.name)}" data-quick-fav-kcal="${p.calories}" type="button">
                    <span class="fav-chip-name">${p.emoji} ${escapeHtml(p.name)}</span>
                    <span class="fav-chip-kcal">+${p.calories} ккал</span>
                  </button>
                `
                    )
                    .join('')
            }
          </div>
        </div>
      `;
    }

    if (activeInputTab === 'fav') {
      if (!favorites.length) {
        return `<div class="page-subtitle" style="text-align:center; padding:12px 0;">Нажмите 🤍 у любого блюда в ленте, чтобы добавить его в быстрые шаблоны!</div>`;
      }
      return `
        <div class="fav-strip">
          ${favorites
            .map(
              (fav) => `
            <button class="fav-chip" data-quick-fav-name="${escapeHtml(fav.name)}" data-quick-fav-kcal="${fav.calories}" type="button">
              <span class="fav-chip-name">${escapeHtml(fav.name)}</span>
              <span class="fav-chip-kcal">+${fav.calories} ккал</span>
            </button>
          `
            )
            .join('')}
        </div>
      `;
    }

    if (activeInputTab === 'ai') {
      return `
        <form id="ai-food-form" style="display:flex; flex-direction:column; gap:10px;">
          <textarea class="textarea" name="prompt" placeholder="Например: две жареные картошки, котлета и чай с 2 ложками сахара"></textarea>
          <button class="btn btn-primary btn-block" id="ai-parse-btn" type="submit">Распознать калории ✨</button>
        </form>
        ${
          aiParsedItems.length > 0
            ? `
          <div style="margin-top:12px; display:flex; flex-direction:column; gap:8px;">
            <div class="row-between">
              <span class="field-label">Найдено блюд: ${aiParsedItems.length}</span>
              <button class="btn btn-mint btn-sm" id="ai-add-all-btn" type="button">Добавить всё (+${aiParsedItems.reduce((s, i) => s + i.calories, 0)} ккал)</button>
            </div>
            ${aiParsedItems
              .map(
                (item, idx) => `
              <div class="log-item">
                <div class="log-info">
                  <div class="log-title">${escapeHtml(item.name)}</div>
                  <div class="log-meta">~${item.calories} ккал</div>
                </div>
                <button class="btn btn-sm btn-lavender-soft" data-ai-add-one="${idx}" type="button">+ Добавить</button>
              </div>
            `
              )
              .join('')}
          </div>
          `
            : ''
        }
      `;
    }

    return `
      <form id="manual-food-form" style="display:flex; flex-direction:column; gap:10px;">
        <div class="grid-2" style="grid-template-columns: 1.5fr 1fr;">
          <input class="input" name="name" type="text" placeholder="Название блюда" required />
          <input class="input" name="calories" type="number" min="1" max="5000" placeholder="Ккал" required />
        </div>
        <button class="btn btn-mint btn-block" type="submit">Добавить в дневник 🍽️</button>
      </form>
    `;
  }

  function bindTodayEvents(container, state, { onRefresh, onNavigate }) {
    container.querySelectorAll('[data-input-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeInputTab = btn.dataset.inputTab;
        renderTodayView(container, state, { onRefresh, onNavigate });
      });
    });

    container.querySelectorAll('[data-feed-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeFeedTab = btn.dataset.feedTab;
        renderTodayView(container, state, { onRefresh, onNavigate });
      });
    });

    container.querySelectorAll('[data-react]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const type = btn.dataset.react;
        const msg =
          type === 'cheer'
            ? `${state.profile.avatar} ${state.profile.display_name}: Красавчик! Так держать 🔥`
            : `${state.profile.avatar} ${state.profile.display_name}: Осторожнее с вкусняшками! 🍩`;

        try {
          await LP.dataService.sendReaction(type, msg, state);
          LP.toast.showToast(
            type === 'cheer' ? 'Поддержка отправлена! 🔥' : 'Дружеский пинок улетел! 🍩',
            'success'
          );
        } catch (err) {
          LP.toast.showToast(err.message || 'Не удалось отправить реакцию', 'error');
        }
      });
    });

    const closeBtn = container.querySelector('#close-day-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', async () => {
        await LP.confetti.launchCozyConfetti();
        LP.toast.showToast('Отличный день в норме! Так держать 🎉', 'success', 4000);
      });
    }

    const gotoCalcBtn = container.querySelector('#goto-calc-btn');
    if (gotoCalcBtn) {
      gotoCalcBtn.addEventListener('click', () => onNavigate('profile'));
    }

    // Quick +100/+200/+300/+500 kcal buttons
    container.querySelectorAll('[data-quick-kcal]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const kcal = Number(btn.dataset.quickKcal);
        await LP.dataService.addFoodItems([{ name: `Быстрый перекус`, calories: kcal }], state);
        LP.toast.showToast(`+${kcal} ккал добавлено ⚡`, 'success');
        await onRefresh();
      });
    });

    // Live search in presets
    const searchInput = container.querySelector('#preset-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        presetSearchQuery = searchInput.value;
        const strip = container.querySelector('#preset-strip');
        if (!strip) return;
        const q = presetSearchQuery.trim().toLowerCase();
        const filtered = (LP.foodPresets || []).filter((p) =>
          !q ? true : p.name.toLowerCase().includes(q)
        );
        strip.innerHTML =
          filtered.length === 0
            ? `<div class="page-subtitle" style="padding:8px 4px;">Ничего не найдено — добавьте во вкладке «Вручную» ✏️</div>`
            : filtered
                .slice(0, 14)
                .map(
                  (p) => `
              <button class="fav-chip" data-quick-fav-name="${LP.calories.escapeHtml(p.name)}" data-quick-fav-kcal="${p.calories}" type="button">
                <span class="fav-chip-name">${p.emoji} ${LP.calories.escapeHtml(p.name)}</span>
                <span class="fav-chip-kcal">+${p.calories} ккал</span>
              </button>
            `
                )
                .join('');

        strip.querySelectorAll('[data-quick-fav-name]').forEach((chip) => {
          chip.addEventListener('click', async () => {
            const name = chip.dataset.quickFavName;
            const calories = Number(chip.dataset.quickFavKcal);
            await LP.dataService.addFoodItems([{ name, calories }], state);
            LP.toast.showToast(`+${calories} ккал (${name})`, 'success');
            await onRefresh();
          });
        });
      });
    }

    container.querySelectorAll('[data-quick-fav-name]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const name = btn.dataset.quickFavName;
        const calories = Number(btn.dataset.quickFavKcal);
        await LP.dataService.addFoodItems([{ name, calories }], state);
        LP.toast.showToast(`+${calories} ккал (${name})`, 'success');
        await onRefresh();
      });
    });

    const manualForm = container.querySelector('#manual-food-form');
    if (manualForm) {
      manualForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(manualForm);
        await LP.dataService.addFoodItems(
          [{ name: fd.get('name').trim(), calories: Number(fd.get('calories')) }],
          state
        );
        LP.toast.showToast('Блюдо добавлено! ✨', 'success');
        await onRefresh();
      });
    }

    const aiForm = container.querySelector('#ai-food-form');
    if (aiForm) {
      aiForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const prompt = new FormData(aiForm).get('prompt');
        const btn = container.querySelector('#ai-parse-btn');
        btn.disabled = true;
        btn.textContent = 'Считаю калории... ✨';
        try {
          aiParsedItems = await LP.geminiService.parseFoodWithGemini(prompt);
          if (!aiParsedItems.length) {
            LP.toast.showToast('Не удалось распознать блюда, попробуйте уточнить', 'warn');
          }
          renderTodayView(container, state, { onRefresh, onNavigate });
        } catch (err) {
          if (err.message === 'NO_GEMINI_KEY') {
            LP.toast.showToast('Укажите Gemini API Key во вкладке «Профиль» 🔑', 'warn', 4500);
            onNavigate('profile');
          } else {
            LP.toast.showToast(err.message || 'Ошибка Gemini API', 'error');
          }
        } finally {
          btn.disabled = false;
        }
      });
    }

    const aiAddAll = container.querySelector('#ai-add-all-btn');
    if (aiAddAll) {
      aiAddAll.addEventListener('click', async () => {
        await LP.dataService.addFoodItems(aiParsedItems, state);
        aiParsedItems = [];
        LP.toast.showToast('Все блюда добавлены! 🍽️', 'success');
        await onRefresh();
      });
    }

    container.querySelectorAll('[data-ai-add-one]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const idx = Number(btn.dataset.aiAddOne);
        const item = aiParsedItems[idx];
        if (!item) return;
        await LP.dataService.addFoodItems([item], state);
        aiParsedItems.splice(idx, 1);
        LP.toast.showToast(`Добавлено: ${item.name}`, 'success');
        await onRefresh();
      });
    });

    container.querySelectorAll('[data-del-food]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await LP.dataService.deleteFoodItem(btn.dataset.delFood);
        LP.toast.showToast('Запись удалена', 'info');
        await onRefresh();
      });
    });

    container.querySelectorAll('[data-fav-name]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const added = await LP.dataService.toggleFavorite(
          btn.dataset.favName,
          Number(btn.dataset.favKcal),
          state
        );
        LP.toast.showToast(added ? 'Сохранено в избранное ❤️' : 'Удалено из избранного', 'info');
        await onRefresh();
      });
    });

    container.querySelectorAll('[data-copy-name]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const name = btn.dataset.copyName;
        const calories = Number(btn.dataset.copyKcal);
        await LP.dataService.addFoodItems([{ name, calories }], state);
        LP.toast.showToast(`Скопировано себе: ${name} (+${calories} ккал) 💕`, 'success');
        await onRefresh();
      });
    });
  }

  LP.views = LP.views || {};
  LP.views.renderTodayView = renderTodayView;
})(window.LP);
