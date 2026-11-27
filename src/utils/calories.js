window.LP = window.LP || {};

(function (LP) {
  function getTodayKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function isWeekend(dateKey = getTodayKey()) {
    const [y, m, d] = dateKey.split('-').map(Number);
    const day = new Date(y, m - 1, d).getDay();
    return day === 0 || day === 6;
  }

  function formatRussianDate(dateKey) {
    const [y, m, d] = dateKey.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  }

  function getCalorieStatus(eaten, limit) {
    const safeLimit = Math.max(1, Number(limit) || 1800);
    const safeEaten = Math.max(0, Number(eaten) || 0);
    const ratio = safeEaten / safeLimit;
    const pct = Math.round(ratio * 100);
    const remaining = safeLimit - safeEaten;
    const overage = Math.max(0, safeEaten - safeLimit);

    let tone = 'mint';
    let color = '#7ED9A4';
    let statusText = 'В норме ✨';

    if (safeEaten === 0) {
      statusText = 'Утро доброе 🐣';
    } else if (ratio > 1) {
      tone = 'coral';
      color = '#FF8A80';
      statusText = 'Перебор 😅';
    } else if (ratio >= 0.85) {
      tone = 'yellow';
      color = '#FFD54F';
      statusText = 'Почти лимит 💛';
    }

    return {
      eaten: safeEaten,
      limit: safeLimit,
      ratio,
      pct,
      remaining,
      overage,
      tone,
      color,
      statusText,
    };
  }

  function calculateMifflinStJeor({
    sex = 'female',
    age = 25,
    heightCm = 168,
    weightKg = 62,
    targetWeightKg = 57,
    activity = 'light',
  }) {
    const s = sex === 'male' ? 5 : -161;
    const bmr = Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + s);
    const mult = LP.config.ACTIVITY_LEVELS.find((a) => a.id === activity)?.factor || 1.375;
    const tdee = Math.round(bmr * mult);

    let recommended = tdee;
    let goalLabel = 'Поддержание веса';
    if (targetWeightKg < weightKg - 0.3) {
      recommended = Math.max(sex === 'male' ? 1400 : 1200, Math.round(tdee - 400));
      goalLabel = 'Комфортный дефицит (-400 ккал)';
    } else if (targetWeightKg > weightKg + 0.3) {
      recommended = Math.round(tdee + 300);
      goalLabel = 'Мягкий профицит (+300 ккал)';
    }

    return { bmr, tdee, recommended, goalLabel };
  }

  function forecastGoalDate(weightLogs, targetWeightKg) {
    if (!Array.isArray(weightLogs) || weightLogs.length < 2 || !targetWeightKg) {
      return null;
    }

    const sorted = [...weightLogs]
      .filter((w) => Number(w.weight_kg) > 0)
      .sort((a, b) => a.log_date.localeCompare(b.log_date));

    if (sorted.length < 2) return null;

    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const currentWeight = Number(last.weight_kg);
    const target = Number(targetWeightKg);

    if (Math.abs(currentWeight - target) < 0.2) {
      return { reached: true, text: 'Цель уже достигнута! 🎉' };
    }

    const msPerDay = 86400000;
    const daysElapsed = Math.max(
      1,
      (new Date(last.log_date) - new Date(first.log_date)) / msPerDay
    );
    const ratePerDay = (currentWeight - Number(first.weight_kg)) / daysElapsed;

    const needLoss = target < currentWeight;
    if ((needLoss && ratePerDay >= -0.005) || (!needLoss && ratePerDay <= 0.005)) {
      return {
        reached: false,
        text: 'Добавьте пару замеров, чтобы уточнить прогноз 🌱',
      };
    }

    const daysRemaining = Math.ceil(Math.abs((target - currentWeight) / ratePerDay));
    if (daysRemaining > 730) {
      return { reached: false, text: 'Плавный темп (> 2 лет) 🐢' };
    }

    const eta = new Date(new Date(last.log_date).getTime() + daysRemaining * msPerDay);
    const formatted = eta.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    return {
      reached: false,
      daysRemaining,
      text: `Цель ~ ${formatted} (около ${daysRemaining} дн.) ✨`,
    };
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  /**
   * Estimates monthly weight change and exact days/date to reach target_weight
   * based on daily calorie deficit (1 kg ≈ 7700 kcal).
   */
  function estimateMonthlyWeightChange(profile, overrideLimit = null) {
    const calc = calculateMifflinStJeor({
      sex: profile.sex || 'female',
      age: profile.age || 25,
      heightCm: profile.height_cm || 168,
      weightKg: profile.current_weight || 62,
      targetWeightKg: profile.target_weight || 57,
      activity: profile.activity || 'light',
    });

    const limit = Number(overrideLimit ?? profile.daily_limit) || calc.recommended;
    const dailyDeficit = calc.tdee - limit; // positive = losing weight
    const monthlyKg = (dailyDeficit * 30) / 7700;
    const currentW = Number(profile.current_weight) || 0;
    const targetW = Number(profile.target_weight) || 0;
    const projected30d = currentW ? Number((currentW - monthlyKg).toFixed(1)) : null;

    let goalEta = null;
    if (currentW && targetW) {
      const kgToGoal = Number((currentW - targetW).toFixed(1));
      if (Math.abs(kgToGoal) <= 0.2) {
        goalEta = { status: 'reached', text: `Цель ${targetW} кг уже достигнута! 🎉` };
      } else {
        const needLoss = kgToGoal > 0;
        const rightDirection = (needLoss && dailyDeficit > 25) || (!needLoss && dailyDeficit < -25);
        if (!rightDirection) {
          goalEta = {
            status: 'stalled',
            kgLeft: Math.abs(kgToGoal),
            text: needLoss
              ? `До цели ${targetW} кг (−${Math.abs(kgToGoal)} кг): нужен дефицит ккал в Профиле`
              : `До цели ${targetW} кг (+${Math.abs(kgToGoal)} кг): нужен профицит ккал в Профиле`,
          };
        } else {
          const daysToGoal = Math.ceil((Math.abs(kgToGoal) * 7700) / Math.abs(dailyDeficit));
          const etaDate = new Date(Date.now() + daysToGoal * 86400000);
          const dateFormatted = etaDate.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: etaDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
          });
          goalEta = {
            status: 'on_track',
            kgLeft: Math.abs(kgToGoal),
            daysToGoal,
            dateFormatted,
            targetW,
            text: `До цели ${targetW} кг (−${Math.abs(kgToGoal)} кг): ~${daysToGoal} дн. · к ${dateFormatted}`,
          };
        }
      }
    }

    return {
      tdee: calc.tdee,
      limit,
      dailyDeficit,
      monthlyKg: Number(monthlyKg.toFixed(1)),
      projected30d,
      goalEta,
    };
  }

  LP.calories = {
    getTodayKey,
    isWeekend,
    formatRussianDate,
    getCalorieStatus,
    calculateMifflinStJeor,
    forecastGoalDate,
    estimateMonthlyWeightChange,
    escapeHtml,
  };
})(window.LP);
