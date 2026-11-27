window.LP = window.LP || {};

(function (LP) {
  const GEMINI_MODELS = [
    'gemini-flash-latest',
    'gemini-3-flash-preview',
    'gemini-2.5-flash',
  ];

  async function requestGemini(model, apiKey, promptText) {
    const systemInstruction = `Ты — точный нутрициолог-помощник. Пользователь пишет, что он съел, в свободной форме на русском языке.
Разбей ввод на отдельные блюда/продукты и оцени примерную калорийность каждого в ккал (целое число).
Верни ТОЛЬКО валидный JSON-массив объектов формата:
[{"name": "Краткое название с порцией", "calories": 250}]
Никакого лишнего текста, без markdown-оберток.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: `${systemInstruction}\n\nСъедено: ${promptText}` }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
      }),
    });
  }

  async function parseFoodWithGemini(promptText) {
    const apiKey = LP.config.getGeminiApiKey();
    if (!apiKey) {
      throw new Error('NO_GEMINI_KEY');
    }

    const trimmed = (promptText || '').trim();
    if (!trimmed) {
      throw new Error('EMPTY_INPUT');
    }

    let res = null;
    let lastErrBody = '';

    for (const model of GEMINI_MODELS) {
      res = await requestGemini(model, apiKey, trimmed);
      if (res.ok) break;
      lastErrBody = await res.text().catch(() => '');
      if (res.status !== 404) {
        throw new Error(`Gemini API (${res.status}): ${lastErrBody.slice(0, 140)}`);
      }
    }

    if (!res || !res.ok) {
      throw new Error(`Gemini API (${res?.status || 404}): ${lastErrBody.slice(0, 140)}`);
    }

    const data = await res.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';

    let parsed;
    try {
      const cleaned = rawText.replace(/```json|```/gi, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error('Не удалось разобрать ответ нейросети');
    }

    if (!Array.isArray(parsed)) {
      throw new Error('Неожиданный формат ответа Gemini');
    }

    return parsed
      .map((item) => ({
        name: String(item.name || 'Блюдо').trim(),
        calories: Math.max(0, Math.round(Number(item.calories) || 0)),
      }))
      .filter((item) => item.name && item.calories > 0);
  }

  LP.geminiService = { parseFoodWithGemini };
})(window.LP);
