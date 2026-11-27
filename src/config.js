window.LP = window.LP || {};

(function (LP) {
  const STORAGE_KEYS = {
    SUPABASE_URL: 'lp_supabase_url',
    SUPABASE_ANON_KEY: 'lp_supabase_anon_key',
    GEMINI_API_KEY: 'lp_gemini_api_key',
    LAST_DAY_CELEBRATED: 'lp_last_celebrated_day',
  };

  const DEFAULT_SUPABASE_URL = '';
  const DEFAULT_SUPABASE_ANON_KEY = '';

  const AVATARS = [
    '🐻', '🐰', '🦊', '🐱', '🐶', '🐼',
    '🐨', '🦁', '🐸', '🐣', '🦄', '🍓',
  ];

  const ACTIVITY_LEVELS = [
    { id: 'sedentary', label: 'Сидячий (минимум спорта)', factor: 1.2 },
    { id: 'light', label: 'Лёгкая (1–3 тренировки)', factor: 1.375 },
    { id: 'moderate', label: 'Средняя (3–5 тренировок)', factor: 1.55 },
    { id: 'active', label: 'Высокая (6–7 тренировок)', factor: 1.725 },
  ];

  function normalizeSupabaseUrl(raw) {
    const trimmed = (raw || '').trim();
    if (!trimmed) return '';
    try {
      return new URL(trimmed).origin;
    } catch {
      return trimmed.replace(/\/+$/, '');
    }
  }

  function getSupabaseConfig() {
    const url = normalizeSupabaseUrl(localStorage.getItem(STORAGE_KEYS.SUPABASE_URL) || DEFAULT_SUPABASE_URL);
    const anonKey = (localStorage.getItem(STORAGE_KEYS.SUPABASE_ANON_KEY) || DEFAULT_SUPABASE_ANON_KEY).trim();
    return { url, anonKey, isConfigured: Boolean(url && anonKey) };
  }

  function saveSupabaseConfig(url, anonKey) {
    localStorage.setItem(STORAGE_KEYS.SUPABASE_URL, normalizeSupabaseUrl(url));
    localStorage.setItem(STORAGE_KEYS.SUPABASE_ANON_KEY, (anonKey || '').trim());
  }

  function getGeminiApiKey() {
    return (localStorage.getItem(STORAGE_KEYS.GEMINI_API_KEY) || '').trim();
  }

  function saveGeminiApiKey(key) {
    localStorage.setItem(STORAGE_KEYS.GEMINI_API_KEY, (key || '').trim());
  }

  LP.config = {
    STORAGE_KEYS,
    AVATARS,
    ACTIVITY_LEVELS,
    getSupabaseConfig,
    saveSupabaseConfig,
    getGeminiApiKey,
    saveGeminiApiKey,
  };
})(window.LP);
