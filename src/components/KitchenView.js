window.LP = window.LP || {};

(function (LP) {
  function renderKitchenView(container, state, { onRefresh }) {
    const { escapeHtml } = LP.calories;
    const { sharedDishes } = state;

    container.innerHTML = `
      <div class="animate-in" style="display:flex; flex-direction:column; gap:14px;">
        <div class="page-header">
          <div>
            <h1 class="page-title">Общая кухня 🍲</h1>
            <div class="page-subtitle">Готовите или заказываете на двоих — делите порции в тап</div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <span class="card-title">👩‍🍳 Новое общее блюдо</span>
          </div>
          <form id="shared-dish-form" style="display:flex; flex-direction:column; gap:10px;">
            <input class="input" name="name" type="text" placeholder="Например: Кастрюля борща или Пицца" required />
            <div class="grid-2" style="grid-template-columns: 1fr 0.7fr 1fr;">
              <input class="input" name="totalAmount" type="number" step="0.1" min="1" placeholder="Кол-во" required />
              <select class="select" name="unit">
                <option value="г">г</option>
                <option value="кус.">кус.</option>
              </select>
              <input class="input" name="totalCalories" type="number" min="1" placeholder="Всего ккал" required />
            </div>
            <button class="btn btn-primary btn-block" type="submit">Поставить на стол 🍽️</button>
          </form>
        </div>

        <div style="display:flex; flex-direction:column; gap:10px;">
          ${
            sharedDishes.length === 0
              ? `<div class="card" style="text-align:center; padding:24px 16px;">
                   <div style="font-size:32px;">🥘</div>
                   <div class="card-title" style="justify-content:center; margin-top:6px;">На столе пока пусто</div>
                   <p class="page-subtitle" style="margin-top:4px;">Добавьте суп, запеканку или пиццу, чтобы удобно брать свои порции.</p>
                 </div>`
              : sharedDishes
                  .map((dish) => {
                    const pctLeft = Math.max(
                      0,
                      Math.min(100, Math.round((dish.remaining_amount / dish.total_amount) * 100))
                    );
                    return `
                      <div class="card dish-card" data-open-dish="${dish.id}">
                        <div class="row-between">
                          <div>
                            <div class="card-title">${escapeHtml(dish.name)}</div>
                            <div class="page-subtitle" style="margin-top:2px;">
                              Осталось: <strong>${dish.remaining_amount} ${escapeHtml(dish.unit)}</strong> · ${dish.remaining_calories} ккал
                            </div>
                          </div>
                          <button class="icon-btn" data-del-dish="${dish.id}" title="Убрать блюдо" type="button">🗑️</button>
                        </div>
                        <div class="dish-progress-bar">
                          <div class="dish-progress-fill" style="width:${pctLeft}%;"></div>
                        </div>
                        <div class="row-between" style="font-size:12px; color:var(--text-muted); font-weight:700;">
                          <span>Всего было: ${dish.total_amount} ${escapeHtml(dish.unit)} (${dish.total_calories} ккал)</span>
                          <span style="color:var(--lavender-dark);">Взять порцию →</span>
                        </div>
                      </div>
                    `;
                  })
                  .join('')
          }
        </div>
      </div>
    `;

    container.querySelector('#shared-dish-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      await LP.dataService.addSharedDish(
        {
          name: fd.get('name').trim(),
          unit: fd.get('unit'),
          totalAmount: Number(fd.get('totalAmount')),
          totalCalories: Number(fd.get('totalCalories')),
        },
        state
      );
      LP.toast.showToast('Блюдо добавлено на общую кухню! 🍲', 'success');
      await onRefresh();
    });

    container.querySelectorAll('[data-del-dish]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await LP.dataService.deleteSharedDish(btn.dataset.delDish);
        LP.toast.showToast('Блюдо убрано', 'info');
        await onRefresh();
      });
    });

    container.querySelectorAll('[data-open-dish]').forEach((card) => {
      card.addEventListener('click', () => {
        const dish = sharedDishes.find((d) => d.id === card.dataset.openDish);
        if (dish) openPortionModal(dish, state, onRefresh);
      });
    });
  }

  function openPortionModal(dish, state, onRefresh) {
    const { escapeHtml } = LP.calories;
    const modalRoot = document.getElementById('modal-root');
    if (!modalRoot) return;

    const isGrams = dish.unit === 'г';
    const quarter = Number((dish.remaining_amount / 4).toFixed(1));
    const half = Number((dish.remaining_amount / 2).toFixed(1));

    const presets = isGrams
      ? [
          { label: '1/4', amount: quarter },
          { label: '1/2', amount: half },
          { label: '100г', amount: Math.min(100, dish.remaining_amount) },
          { label: '200г', amount: Math.min(200, dish.remaining_amount) },
        ]
      : [
          { label: '1/4', amount: quarter },
          { label: '1/2', amount: half },
          { label: '1 кус.', amount: Math.min(1, dish.remaining_amount) },
          { label: '2 кус.', amount: Math.min(2, dish.remaining_amount) },
        ];

    let selectedAmount = presets[2].amount || half;

    const closeModal = () => {
      modalRoot.classList.add('hidden');
      modalRoot.innerHTML = '';
    };

    const renderModal = () => {
      const kcalPreview = Math.round((selectedAmount / dish.total_amount) * dish.total_calories);

      modalRoot.classList.remove('hidden');
      modalRoot.innerHTML = `
        <div class="modal-sheet">
          <div class="row-between" style="margin-bottom:8px;">
            <h3 style="font-size:18px; font-weight:900;">${escapeHtml(dish.name)}</h3>
            <button class="icon-btn" id="close-portion-modal" type="button">✕</button>
          </div>
          <p class="page-subtitle">
            Осталось: ${dish.remaining_amount} ${escapeHtml(dish.unit)} (${dish.remaining_calories} ккал)
          </p>

          <div class="portion-pills">
            ${presets
              .map(
                (p) => `
              <button class="btn btn-sm ${Number(selectedAmount) === p.amount ? 'btn-primary' : 'btn-soft'}" data-preset="${p.amount}" type="button">
                ${p.label}
              </button>
            `
              )
              .join('')}
          </div>

          <div class="field" style="margin-top:8px;">
            <label class="field-label">Своя порция (${escapeHtml(dish.unit)})</label>
            <input class="input" id="custom-portion-input" type="number" step="0.1" min="0.1" max="${dish.remaining_amount}" value="${selectedAmount}" />
          </div>

          <div class="row-between" style="margin:14px 0;">
            <span class="page-subtitle">Запишется в дневник:</span>
            <span class="badge badge-mint" id="kcal-preview-badge" style="font-size:14px;">+${kcalPreview} ккал</span>
          </div>

          <button class="btn btn-mint btn-block" id="confirm-portion-btn" type="button">
            Съесть и записать 😋
          </button>
        </div>
      `;

      modalRoot.querySelector('#close-portion-modal').addEventListener('click', closeModal);
      modalRoot.onclick = (e) => {
        if (e.target === modalRoot) closeModal();
      };

      modalRoot.querySelectorAll('[data-preset]').forEach((btn) => {
        btn.addEventListener('click', () => {
          selectedAmount = Number(btn.dataset.preset);
          renderModal();
        });
      });

      const customInput = modalRoot.querySelector('#custom-portion-input');
      customInput.addEventListener('input', () => {
        selectedAmount = Math.max(0, Math.min(dish.remaining_amount, Number(customInput.value) || 0));
        const nextKcal = Math.round((selectedAmount / dish.total_amount) * dish.total_calories);
        modalRoot.querySelector('#kcal-preview-badge').textContent = `+${nextKcal} ккал`;
      });

      modalRoot.querySelector('#confirm-portion-btn').addEventListener('click', async () => {
        if (selectedAmount <= 0) return;
        const result = await LP.dataService.takeSharedPortion(dish, selectedAmount, state);
        closeModal();
        if (result) {
          LP.toast.showToast(`Записано +${result.kcal} ккал (${result.dishName}) 😋`, 'success');
          await onRefresh();
        }
      });
    };

    renderModal();
  }

  LP.views = LP.views || {};
  LP.views.renderKitchenView = renderKitchenView;
})(window.LP);
