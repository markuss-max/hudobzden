window.LP = window.LP || {};

(function (LP) {
  function renderAuthView(container, state, onAuthenticated) {
    const sbConfig = LP.config.getSupabaseConfig();
    const needsPairing = Boolean(state?.needsPairing && state?.sessionUser);

    if (needsPairing) {
      renderPairingScreen(container, state, onAuthenticated);
      return;
    }

    let authMode = 'login';

    const render = () => {
      container.innerHTML = `
        <div class="animate-in" style="display:flex; flex-direction:column; gap:14px;">
          <div style="text-align:center; padding: 8px 0 4px;">
            <div style="font-size:46px; line-height:1.1;">🐰💖🐻</div>
            <h1 style="font-size:26px; font-weight:900; margin-top:8px;">Лапка &amp; Пончик</h1>
            <p class="page-subtitle" style="margin-top:4px;">Уютный парный трекер калорий и веса</p>
          </div>

          ${
            sbConfig.isConfigured
              ? `
            <div class="card">
              <div class="segmented" style="grid-template-columns: 1fr 1fr;">
                <button class="seg-btn ${authMode === 'login' ? 'active' : ''}" data-auth-tab="login" type="button">Вход</button>
                <button class="seg-btn ${authMode === 'signup' ? 'active' : ''}" data-auth-tab="signup" type="button">Регистрация</button>
              </div>

              <form id="auth-form" style="display:flex; flex-direction:column; gap:10px;">
                ${
                  authMode === 'signup'
                    ? `
                  <div class="field">
                    <label class="field-label">Твоё имя</label>
                    <input class="input" name="name" type="text" placeholder="Например, Алина" required />
                  </div>`
                    : ''
                }
                <div class="field">
                  <label class="field-label">Email</label>
                  <input class="input" name="email" type="email" placeholder="you@example.com" required />
                </div>
                <div class="field">
                  <label class="field-label">Пароль</label>
                  <input class="input" name="password" type="password" placeholder="Минимум 6 символов" minlength="6" required />
                </div>
                <button class="btn btn-primary btn-block" type="submit" id="auth-submit-btn">
                  ${authMode === 'login' ? 'Войти в домик ✨' : 'Создать аккаунт 🌸'}
                </button>
              </form>
            </div>
            `
              : ''
          }

          <div class="card">
            <div class="card-header" style="margin-bottom:8px;">
              <span class="card-title">☁️ Подключение Supabase (Realtime)</span>
              ${sbConfig.isConfigured ? '<span class="badge badge-mint">Подключено</span>' : '<span class="badge badge-lavender">Шаг 1</span>'}
            </div>
            <p class="page-subtitle" style="margin-bottom:10px;">
              Вставьте URL и Anon Key из вашего бесплатного проекта Supabase, чтобы войти и синхронизироваться с партнёром.
            </p>
            <form id="sb-config-form" style="display:flex; flex-direction:column; gap:8px;">
              <input class="input" name="url" type="url" placeholder="https://xyz.supabase.co" value="${LP.calories.escapeHtml(sbConfig.url)}" required />
              <input class="input" name="anonKey" type="text" placeholder="Supabase anon public key" value="${LP.calories.escapeHtml(sbConfig.anonKey)}" required />
              <button class="btn btn-soft btn-block" type="submit">Сохранить ключи</button>
            </form>
          </div>
        </div>
      `;

      container.querySelectorAll('[data-auth-tab]').forEach((btn) => {
        btn.addEventListener('click', () => {
          authMode = btn.dataset.authTab;
          render();
        });
      });

      const authForm = container.querySelector('#auth-form');
      if (authForm) {
        authForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          const fd = new FormData(authForm);
          const email = fd.get('email');
          const password = fd.get('password');
          const name = fd.get('name');
          const btn = container.querySelector('#auth-submit-btn');
          btn.disabled = true;
          try {
            if (authMode === 'login') {
              await LP.supabaseService.signIn(email, password);
              LP.toast.showToast('С возвращением! 🌸', 'success');
            } else {
              await LP.supabaseService.signUp(email, password, name);
              LP.toast.showToast('Аккаунт создан! Если включено подтверждение email — проверьте почту 💌', 'success');
            }
            await onAuthenticated();
          } catch (err) {
            LP.toast.showToast(err.message || 'Ошибка авторизации', 'error');
          } finally {
            btn.disabled = false;
          }
        });
      }

      container.querySelector('#sb-config-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        LP.config.saveSupabaseConfig(fd.get('url'), fd.get('anonKey'));
        LP.toast.showToast('Настройки Supabase сохранены!', 'success');
        await onAuthenticated();
      });
    };

    render();
  }

  function renderPairingScreen(container, state, onAuthenticated) {
    container.innerHTML = `
      <div class="animate-in" style="display:flex; flex-direction:column; gap:14px;">
        <div style="text-align:center;">
          <div style="font-size:44px;">🔗💞</div>
          <h1 style="font-size:22px; font-weight:900; margin-top:6px;">Связка пары</h1>
          <p class="page-subtitle">Создайте уютную комнату или введите 6-значный код от партнёра</p>
        </div>

        <div class="card">
          <div class="card-title" style="margin-bottom:8px;">🏠 Создать новую комнату</div>
          <p class="page-subtitle" style="margin-bottom:12px;">Вы получите короткий код-приглашение, который нужно отправить второй половинке.</p>
          <button class="btn btn-primary btn-block" id="create-room-btn" type="button">Создать комнату пары ✨</button>
        </div>

        <div class="card">
          <div class="card-title" style="margin-bottom:8px;">🎟️ У меня есть код</div>
          <form id="join-room-form" style="display:flex; flex-direction:column; gap:10px;">
            <input class="input" name="code" type="text" maxlength="6" placeholder="Например, LOVE26" style="text-transform:uppercase; text-align:center; letter-spacing:4px; font-weight:900;" required />
            <button class="btn btn-mint btn-block" type="submit">Подключиться к партнёру 💚</button>
          </form>
        </div>

        <button class="btn btn-soft btn-sm" id="logout-btn" type="button">Выйти из аккаунта</button>
      </div>
    `;

    container.querySelector('#create-room-btn').addEventListener('click', async () => {
      try {
        const couple = await LP.supabaseService.createCoupleRoom(state.sessionUser.id);
        LP.toast.showToast(`Комната создана! Код: ${couple.invite_code}`, 'success', 6000);
        await onAuthenticated();
      } catch (err) {
        LP.toast.showToast(err.message || 'Не удалось создать комнату', 'error');
      }
    });

    container.querySelector('#join-room-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const code = new FormData(e.target).get('code');
      try {
        await LP.supabaseService.joinCoupleRoom(state.sessionUser.id, code);
        LP.toast.showToast('Вы теперь в одной комнате! 💞', 'success');
        await onAuthenticated();
      } catch (err) {
        LP.toast.showToast(err.message || 'Код не найден', 'error');
      }
    });

    container.querySelector('#logout-btn').addEventListener('click', async () => {
      await LP.supabaseService.signOut();
      await onAuthenticated();
    });
  }

  LP.views = LP.views || {};
  LP.views.renderAuthView = renderAuthView;
})(window.LP);
