window.LP = window.LP || {};

(function (LP) {
  let weightChartInstance = null;

  async function renderProgressView(container, state, { onRefresh }) {
    const { escapeHtml, forecastGoalDate, getTodayKey } = LP.calories;
    const { profile, partner, weightLogs, waterCups, heatmapHistory } = state;
    const myWeights = weightLogs.filter((w) => w.user_id === profile.id);
    const partnerWeights = partner ? weightLogs.filter((w) => w.user_id === partner.id) : [];

    const myForecast = forecastGoalDate(myWeights, profile.target_weight);
    const partnerForecast =
      partner && !partner.privacy_mode
        ? forecastGoalDate(partnerWeights, partner.target_weight)
        : null;

    container.innerHTML = `
      <div class="animate-in" style="display:flex; flex-direction:column; gap:14px;">
        <div class="page-header">
          <div>
            <h1 class="page-title">Прогресс 📈</h1>
            <div class="page-subtitle">Вес, календарь дисциплины и водичка</div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <span class="card-title">💧 Трекер воды</span>
            <span class="badge badge-lavender">${waterCups} / 8 стаканов (${waterCups * 250} мл)</span>
          </div>
          <div class="water-grid">
            ${Array.from({ length: 8 }, (_, idx) => {
              const cupNum = idx + 1;
              const filled = cupNum <= waterCups;
              return `
                <button class="water-cup ${filled ? 'filled' : ''}" data-water-cup="${cupNum}" type="button" title="${cupNum * 250} мл">
                  ${filled ? '💧' : '🫧'}
                </button>
              `;
            }).join('')}
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <span class="card-title">⚖️ Трекер веса</span>
            <span class="page-subtitle">Цель: ${profile.target_weight || '—'} кг</span>
          </div>

          <form id="weight-log-form" class="row" style="margin-bottom:12px;">
            <input class="input" name="weight" type="number" step="0.1" min="30" max="250" placeholder="Вес сегодня (кг)" value="${profile.current_weight || ''}" required />
            <button class="btn btn-mint" type="submit" style="white-space:nowrap;">Записать</button>
          </form>

          <div style="position:relative; height:210px; width:100%;">
            <canvas id="weight-chart"></canvas>
          </div>

          <div style="margin-top:12px; display:flex; flex-direction:column; gap:6px;">
            <div class="badge badge-mint" style="align-self:flex-start;">
              ${profile.avatar || '🐰'} ${escapeHtml(profile.display_name)}: ${myForecast ? myForecast.text : 'Добавьте 2 замера веса для прогноза 🌱'}
            </div>
            ${
              partner && partnerForecast
                ? `<div class="badge badge-lavender" style="align-self:flex-start;">
                     ${partner.avatar || '🐻'} ${escapeHtml(partner.display_name)}: ${partnerForecast.text}
                   </div>`
                : ''
            }
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <span class="card-title">🗓️ Календарь месяца</span>
            <div class="row" style="gap:6px; font-size:11px; font-weight:800; color:var(--text-muted);">
              <span>🟢 норма</span>
              <span>🟡 чуть+</span>
              <span>🔴 срыв</span>
            </div>
          </div>
          ${renderMonthHeatmap(heatmapHistory || {}, getTodayKey)}
        </div>
      </div>
    `;

    container.querySelectorAll('[data-water-cup]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const clicked = Number(btn.dataset.waterCup);
        const next = clicked === waterCups ? clicked - 1 : clicked;
        await LP.dataService.setWaterCups(next, state);
        await onRefresh();
      });
    });

    container.querySelector('#weight-log-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const w = Number(new FormData(e.target).get('weight'));
      await LP.dataService.logWeight(w, state);
      LP.toast.showToast(`Вес ${w} кг сохранён! ⚖️`, 'success');
      await onRefresh();
    });

    renderWeightChart(container, profile, partner, myWeights, partnerWeights);
  }

  function renderWeightChart(container, profile, partner, myWeights, partnerWeights) {
    const canvas = container.querySelector('#weight-chart');
    if (!canvas || typeof window.Chart !== 'function') return;

    try {
      if (weightChartInstance) {
        weightChartInstance.destroy();
      }

      const allDates = Array.from(
        new Set([
          ...myWeights.map((w) => w.log_date),
          ...(partner && !partner.privacy_mode ? partnerWeights.map((w) => w.log_date) : []),
        ])
      ).sort();

      const labels = allDates.map((d) => {
        const [, m, day] = d.split('-');
        return `${day}.${m}`;
      });

      const myMap = Object.fromEntries(myWeights.map((w) => [w.log_date, w.weight_kg]));
      const datasets = [
        {
          label: `${profile.display_name} (кг)`,
          data: allDates.map((d) => myMap[d] ?? null),
          borderColor: '#7ED9A4',
          backgroundColor: 'rgba(126, 217, 164, 0.2)',
          tension: 0.35,
          spanGaps: true,
          borderWidth: 3,
          pointRadius: 4,
        },
      ];

      if (partner && !partner.privacy_mode && partnerWeights.length > 0) {
        const pMap = Object.fromEntries(partnerWeights.map((w) => [w.log_date, w.weight_kg]));
        datasets.push({
          label: `${partner.display_name} (кг)`,
          data: allDates.map((d) => pMap[d] ?? null),
          borderColor: '#B39DDB',
          backgroundColor: 'rgba(179, 157, 219, 0.2)',
          tension: 0.35,
          spanGaps: true,
          borderWidth: 3,
          pointRadius: 4,
        });
      }

      weightChartInstance = new window.Chart(canvas, {
        type: 'line',
        data: { labels, datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: {
                font: { family: 'Nunito', weight: '700', size: 12 },
                usePointStyle: true,
              },
            },
          },
          scales: {
            x: { grid: { display: false } },
            y: { grid: { color: 'rgba(51, 46, 60, 0.06)' } },
          },
        },
      });
    } catch {
      // Offline fallback
    }
  }

  function renderMonthHeatmap(history, getTodayKey) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const todayKey = getTodayKey(now);

    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startOffset = (firstDay.getDay() + 6) % 7;

    const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    const cells = [];

    for (let i = 0; i < startOffset; i += 1) {
      cells.push('<div class="heatmap-cell empty"></div>');
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const status = history[key];
      const cls = status ? `status-${status}` : '';
      const todayCls = key === todayKey ? 'today' : '';
      cells.push(`<div class="heatmap-cell ${cls} ${todayCls}">${day}</div>`);
    }

    return `
      <div class="heatmap-grid">
        ${weekdays.map((w) => `<div class="heatmap-weekday">${w}</div>`).join('')}
        ${cells.join('')}
      </div>
    `;
  }

  LP.views = LP.views || {};
  LP.views.renderProgressView = renderProgressView;
})(window.LP);
