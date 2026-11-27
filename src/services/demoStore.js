window.LP = window.LP || {};

(function (LP) {
  function createInitialDemoState() {
    const today = LP.calories.getTodayKey();
    const d = (offset) => {
      const dt = new Date();
      dt.setDate(dt.getDate() + offset);
      return LP.calories.getTodayKey(dt);
    };

    return {
      userId: 'demo-user-1',
      partnerId: 'demo-user-2',
      couple: {
        id: 'demo-couple-1',
        invite_code: 'LOVE26',
        streak_days: 5,
        wishlist_title: 'Читмил-вечер и кино 🍿',
        wishlist_target_days: 7,
        last_streak_date: d(-1),
      },
      profiles: {
        'demo-user-1': {
          id: 'demo-user-1',
          display_name: 'Алина',
          avatar: '🐰',
          daily_limit: 1650,
          privacy_mode: false,
          weekend_stash: 320,
          sex: 'female',
          age: 24,
          height_cm: 166,
          current_weight: 60.4,
          target_weight: 56.0,
          activity: 'light',
        },
        'demo-user-2': {
          id: 'demo-user-2',
          display_name: 'Артём',
          avatar: '🐻',
          daily_limit: 2200,
          privacy_mode: false,
          weekend_stash: 410,
          sex: 'male',
          age: 26,
          height_cm: 181,
          current_weight: 81.2,
          target_weight: 76.0,
          activity: 'moderate',
        },
      },
      foodLogs: [
        { id: 'f1', user_id: 'demo-user-1', log_date: today, name: 'Овсянка с ягодами и мёдом', calories: 340, created_at: new Date().toISOString() },
        { id: 'f2', user_id: 'demo-user-1', log_date: today, name: 'Латте на миндальном', calories: 130, created_at: new Date().toISOString() },
        { id: 'f3', user_id: 'demo-user-2', log_date: today, name: 'Омлет из 3 яиц с тостом', calories: 490, created_at: new Date().toISOString() },
        { id: 'f4', user_id: 'demo-user-2', log_date: today, name: 'Куриная грудка с рисом', calories: 620, created_at: new Date().toISOString() },
      ],
      favorites: [
        { id: 'fav1', user_id: 'demo-user-1', name: 'Капучино без сахара', calories: 110 },
        { id: 'fav2', user_id: 'demo-user-1', name: 'Творог 5% с бананом', calories: 260 },
        { id: 'fav3', user_id: 'demo-user-1', name: 'Греческий салат', calories: 290 },
      ],
      sharedDishes: [
        {
          id: 'sd1',
          name: 'Домашний борщ с курицей',
          unit: 'г',
          total_amount: 1800,
          remaining_amount: 1250,
          total_calories: 990,
          remaining_calories: 688,
          created_by: 'demo-user-1',
        },
        {
          id: 'sd2',
          name: 'Пицца Маргарита',
          unit: 'кус.',
          total_amount: 8,
          remaining_amount: 5,
          total_calories: 1760,
          remaining_calories: 1100,
          created_by: 'demo-user-2',
        },
      ],
      weightLogs: [
        { id: 'w1', user_id: 'demo-user-1', log_date: d(-14), weight_kg: 61.8 },
        { id: 'w2', user_id: 'demo-user-1', log_date: d(-10), weight_kg: 61.4 },
        { id: 'w3', user_id: 'demo-user-1', log_date: d(-6), weight_kg: 60.9 },
        { id: 'w4', user_id: 'demo-user-1', log_date: d(-2), weight_kg: 60.6 },
        { id: 'w5', user_id: 'demo-user-1', log_date: today, weight_kg: 60.4 },
        { id: 'w6', user_id: 'demo-user-2', log_date: d(-14), weight_kg: 82.8 },
        { id: 'w7', user_id: 'demo-user-2', log_date: d(-7), weight_kg: 82.0 },
        { id: 'w8', user_id: 'demo-user-2', log_date: today, weight_kg: 81.2 },
      ],
      waterLogs: {
        [today]: 4,
      },
      heatmapHistory: {
        [d(-9)]: 'green',
        [d(-8)]: 'green',
        [d(-7)]: 'yellow',
        [d(-6)]: 'red',
        [d(-5)]: 'green',
        [d(-4)]: 'green',
        [d(-3)]: 'green',
        [d(-2)]: 'green',
        [d(-1)]: 'green',
      },
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(LP.config.STORAGE_KEYS.DEMO_STATE);
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore corrupt state
    }
    const init = createInitialDemoState();
    saveState(init);
    return init;
  }

  function saveState(state) {
    localStorage.setItem(LP.config.STORAGE_KEYS.DEMO_STATE, JSON.stringify(state));
  }

  function uid(prefix = 'id') {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  }

  LP.demoStore = {
    getAppState() {
      const s = loadState();
      const today = LP.calories.getTodayKey();
      const user = s.profiles[s.userId];
      const partner = s.profiles[s.partnerId] || null;

      return {
        isDemo: true,
        sessionUser: { id: s.userId, email: 'alina@demo.love' },
        profile: user,
        partner,
        couple: s.couple,
        todayFoodLogs: s.foodLogs.filter((f) => f.log_date === today),
        favorites: s.favorites.filter((f) => f.user_id === s.userId),
        sharedDishes: s.sharedDishes,
        weightLogs: s.weightLogs,
        waterCups: s.waterLogs[today] || 0,
        heatmapHistory: s.heatmapHistory,
      };
    },

    addFoodItems(items) {
      const s = loadState();
      const today = LP.calories.getTodayKey();
      const now = new Date().toISOString();
      for (const item of items) {
        s.foodLogs.unshift({
          id: uid('f'),
          user_id: s.userId,
          log_date: today,
          name: item.name,
          calories: Math.round(Number(item.calories) || 0),
          created_at: now,
        });
      }
      saveState(s);
    },

    deleteFoodItem(id) {
      const s = loadState();
      s.foodLogs = s.foodLogs.filter((f) => f.id !== id);
      saveState(s);
    },

    toggleFavorite(name, calories) {
      const s = loadState();
      const existing = s.favorites.find(
        (f) => f.user_id === s.userId && f.name.toLowerCase() === name.toLowerCase()
      );
      if (existing) {
        s.favorites = s.favorites.filter((f) => f.id !== existing.id);
        saveState(s);
        return false;
      }
      s.favorites.unshift({
        id: uid('fav'),
        user_id: s.userId,
        name,
        calories: Math.round(calories),
      });
      saveState(s);
      return true;
    },

    addSharedDish({ name, unit, totalAmount, totalCalories }) {
      const s = loadState();
      s.sharedDishes.unshift({
        id: uid('sd'),
        name,
        unit,
        total_amount: Number(totalAmount),
        remaining_amount: Number(totalAmount),
        total_calories: Math.round(Number(totalCalories)),
        remaining_calories: Math.round(Number(totalCalories)),
        created_by: s.userId,
      });
      saveState(s);
    },

    takeSharedPortion(dishId, amount) {
      const s = loadState();
      const dish = s.sharedDishes.find((d) => d.id === dishId);
      if (!dish || dish.remaining_amount <= 0) return null;

      const actualAmount = Math.min(Number(amount), dish.remaining_amount);
      const ratio = actualAmount / dish.total_amount;
      const kcal = Math.round(dish.total_calories * ratio);

      dish.remaining_amount = Math.max(0, Number((dish.remaining_amount - actualAmount).toFixed(1)));
      dish.remaining_calories = Math.max(0, dish.remaining_calories - kcal);

      const today = LP.calories.getTodayKey();
      s.foodLogs.unshift({
        id: uid('f'),
        user_id: s.userId,
        log_date: today,
        name: `${dish.name} (${actualAmount} ${dish.unit})`,
        calories: kcal,
        created_at: new Date().toISOString(),
      });

      if (dish.remaining_amount <= 0.05) {
        s.sharedDishes = s.sharedDishes.filter((d) => d.id !== dishId);
      }
      saveState(s);
      return { kcal, dishName: dish.name };
    },

    deleteSharedDish(dishId) {
      const s = loadState();
      s.sharedDishes = s.sharedDishes.filter((d) => d.id !== dishId);
      saveState(s);
    },

    logWeight(weightKg) {
      const s = loadState();
      const today = LP.calories.getTodayKey();
      const existing = s.weightLogs.find(
        (w) => w.user_id === s.userId && w.log_date === today
      );
      if (existing) {
        existing.weight_kg = Number(weightKg);
      } else {
        s.weightLogs.push({
          id: uid('w'),
          user_id: s.userId,
          log_date: today,
          weight_kg: Number(weightKg),
        });
      }
      s.profiles[s.userId].current_weight = Number(weightKg);
      saveState(s);
    },

    setWaterCups(cups) {
      const s = loadState();
      const today = LP.calories.getTodayKey();
      s.waterLogs[today] = cups;
      saveState(s);
    },

    updateProfile(patch) {
      const s = loadState();
      s.profiles[s.userId] = { ...s.profiles[s.userId], ...patch };
      saveState(s);
    },

    updateCouple(patch) {
      const s = loadState();
      s.couple = { ...s.couple, ...patch };
      saveState(s);
    },

    closeDayInNorm(savedCalories) {
      const s = loadState();
      const today = LP.calories.getTodayKey();
      const stashAdd = Math.min(200, Math.max(0, Math.round(savedCalories)));
      s.profiles[s.userId].weekend_stash = (s.profiles[s.userId].weekend_stash || 0) + stashAdd;
      if (s.couple.last_streak_date !== today) {
        s.couple.streak_days = (s.couple.streak_days || 0) + 1;
        s.couple.last_streak_date = today;
      }
      s.heatmapHistory[today] = 'green';
      saveState(s);
      return stashAdd;
    },

    spendStash(amount) {
      const s = loadState();
      const user = s.profiles[s.userId];
      const spend = Math.min(user.weekend_stash || 0, Math.round(amount));
      user.weekend_stash = (user.weekend_stash || 0) - spend;
      saveState(s);
      return spend;
    },

    resetDemo() {
      const fresh = createInitialDemoState();
      saveState(fresh);
    },
  };
})(window.LP);
