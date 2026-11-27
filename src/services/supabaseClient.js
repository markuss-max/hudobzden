window.LP = window.LP || {};

(function (LP) {
  let supabaseInstance = null;
  let cachedConfigKey = '';

  function getClient() {
    const { url, anonKey, isConfigured } = LP.config.getSupabaseConfig();
    if (!isConfigured) return null;
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      throw new Error('Библиотека Supabase не загрузилась (проверьте интернет)');
    }

    const key = `${url}::${anonKey}`;
    if (supabaseInstance && cachedConfigKey === key) {
      return supabaseInstance;
    }

    supabaseInstance = window.supabase.createClient(url, anonKey);
    cachedConfigKey = key;
    return supabaseInstance;
  }

  function generateInviteCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i += 1) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  function getMonthStartKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  }

  function buildHeatmapFromLogs(logs, profile, partner) {
    const byDate = {};
    for (const row of logs) {
      if (!byDate[row.log_date]) byDate[row.log_date] = {};
      byDate[row.log_date][row.user_id] = (byDate[row.log_date][row.user_id] || 0) + row.calories;
    }

    const result = {};
    for (const [dateKey, userTotals] of Object.entries(byDate)) {
      const u1 = userTotals[profile.id] || 0;
      const u2 = partner ? userTotals[partner.id] || 0 : 0;
      const r1 = u1 / Math.max(1, profile.daily_limit);
      const r2 = partner ? u2 / Math.max(1, partner.daily_limit) : 0;
      const maxR = Math.max(r1, r2);
      if (maxR <= 1) result[dateKey] = 'green';
      else if (maxR <= 1.15) result[dateKey] = 'yellow';
      else result[dateKey] = 'red';
    }
    return result;
  }

  LP.supabaseService = {
    async getSession() {
      const sb = getClient();
      if (!sb) return null;
      const { data } = await sb.auth.getSession();
      return data?.session || null;
    },

    async signIn(email, password) {
      const sb = getClient();
      if (!sb) throw new Error('Supabase не настроен');
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    },

    async signUp(email, password, displayName) {
      const sb = getClient();
      if (!sb) throw new Error('Supabase не настроен');
      const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName || 'Малыш' } },
      });
      if (error) throw error;

      if (data.user) {
        await sb.from('profiles').upsert({
          id: data.user.id,
          display_name: displayName || email.split('@')[0],
          avatar: '🐰',
          daily_limit: 1800,
        });
      }
      return data;
    },

    async signOut() {
      const sb = getClient();
      if (!sb) return;
      await sb.auth.signOut();
    },

    async createCoupleRoom(userId) {
      const sb = getClient();
      const code = generateInviteCode();
      const { data: couple, error } = await sb
        .from('couples')
        .insert({
          invite_code: code,
          wishlist_title: 'Читмил-вечер и кино 🍿',
          wishlist_target_days: 7,
        })
        .select()
        .single();
      if (error) throw error;

      const { error: pErr } = await sb
        .from('profiles')
        .update({ couple_id: couple.id })
        .eq('id', userId);
      if (pErr) throw pErr;
      return couple;
    },

    async joinCoupleRoom(userId, inviteCode) {
      const sb = getClient();
      const cleanCode = inviteCode.trim().toUpperCase();
      const { data: couple, error } = await sb
        .from('couples')
        .select('*')
        .eq('invite_code', cleanCode)
        .single();
      if (error || !couple) throw new Error('Комната с таким кодом не найдена');

      const { error: pErr } = await sb
        .from('profiles')
        .update({ couple_id: couple.id })
        .eq('id', userId);
      if (pErr) throw pErr;
      return couple;
    },

    async fetchAppState() {
      const sb = getClient();
      if (!sb) return null;

      const { data: sessionData } = await sb.auth.getSession();
      const session = sessionData?.session;
      if (!session) return null;

      const userId = session.user.id;
      let { data: profile } = await sb.from('profiles').select('*').eq('id', userId).maybeSingle();

      if (!profile) {
        const { data: inserted } = await sb
          .from('profiles')
          .upsert({
            id: userId,
            display_name: session.user.user_metadata?.display_name || session.user.email.split('@')[0],
            avatar: '🐰',
            daily_limit: 1800,
          })
          .select()
          .single();
        profile = inserted;
      }

      if (!profile?.couple_id) {
        return {
          isDemo: false,
          needsPairing: true,
          sessionUser: session.user,
          profile,
        };
      }

      const coupleId = profile.couple_id;
      const today = LP.calories.getTodayKey();

      const [
        { data: couple },
        { data: members },
        { data: todayFoodLogs },
        { data: favorites },
        { data: sharedDishes },
        { data: weightLogs },
        { data: waterRow },
        { data: recentLogs },
      ] = await Promise.all([
        sb.from('couples').select('*').eq('id', coupleId).single(),
        sb.from('profiles').select('*').eq('couple_id', coupleId),
        sb.from('food_logs').select('*').eq('couple_id', coupleId).eq('log_date', today).order('created_at', { ascending: false }),
        sb.from('favorites').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        sb.from('shared_dishes').select('*').eq('couple_id', coupleId).order('created_at', { ascending: false }),
        sb.from('weight_logs').select('*').eq('couple_id', coupleId).order('log_date', { ascending: true }),
        sb.from('water_logs').select('*').eq('user_id', userId).eq('log_date', today).maybeSingle(),
        sb.from('food_logs').select('user_id, log_date, calories').eq('couple_id', coupleId).gte('log_date', getMonthStartKey()),
      ]);

      const partner = (members || []).find((m) => m.id !== userId) || null;
      const heatmapHistory = buildHeatmapFromLogs(recentLogs || [], profile, partner);

      return {
        isDemo: false,
        needsPairing: false,
        sessionUser: session.user,
        profile,
        partner,
        couple,
        todayFoodLogs: todayFoodLogs || [],
        favorites: favorites || [],
        sharedDishes: sharedDishes || [],
        weightLogs: weightLogs || [],
        waterCups: waterRow?.cups || 0,
        heatmapHistory,
      };
    },

    async addFoodItems(items, { userId, coupleId }) {
      const sb = getClient();
      const today = LP.calories.getTodayKey();
      const rows = items.map((item) => ({
        user_id: userId,
        couple_id: coupleId,
        log_date: today,
        name: item.name,
        calories: Math.round(Number(item.calories) || 0),
      }));
      const { error } = await sb.from('food_logs').insert(rows);
      if (error) throw error;
    },

    async deleteFoodItem(id) {
      const sb = getClient();
      const { error } = await sb.from('food_logs').delete().eq('id', id);
      if (error) throw error;
    },

    async toggleFavorite(name, calories, userId) {
      const sb = getClient();
      const { data: existing } = await sb
        .from('favorites')
        .select('id')
        .eq('user_id', userId)
        .ilike('name', name)
        .maybeSingle();

      if (existing) {
        await sb.from('favorites').delete().eq('id', existing.id);
        return false;
      }
      await sb.from('favorites').insert({
        user_id: userId,
        name,
        calories: Math.round(calories),
      });
      return true;
    },

    async sendReaction({ fromUserId, toUserId, coupleId, type, message }) {
      const sb = getClient();
      const { error } = await sb.from('reactions').insert({
        couple_id: coupleId,
        from_user_id: fromUserId,
        to_user_id: toUserId,
        type,
        message,
      });
      if (error) throw error;
    },

    async addSharedDish({ name, unit, totalAmount, totalCalories, userId, coupleId }) {
      const sb = getClient();
      const { error } = await sb.from('shared_dishes').insert({
        couple_id: coupleId,
        created_by: userId,
        name,
        unit,
        total_amount: Number(totalAmount),
        remaining_amount: Number(totalAmount),
        total_calories: Math.round(Number(totalCalories)),
        remaining_calories: Math.round(Number(totalCalories)),
      });
      if (error) throw error;
    },

    async takeSharedPortion(dish, amount, { userId, coupleId }) {
      const sb = getClient();
      const actualAmount = Math.min(Number(amount), dish.remaining_amount);
      const ratio = actualAmount / dish.total_amount;
      const kcal = Math.round(dish.total_calories * ratio);

      const newRemAmount = Math.max(0, Number((dish.remaining_amount - actualAmount).toFixed(1)));
      const newRemKcal = Math.max(0, dish.remaining_calories - kcal);

      await this.addFoodItems(
        [{ name: `${dish.name} (${actualAmount} ${dish.unit})`, calories: kcal }],
        { userId, coupleId }
      );

      if (newRemAmount <= 0.05) {
        await sb.from('shared_dishes').delete().eq('id', dish.id);
      } else {
        await sb
          .from('shared_dishes')
          .update({ remaining_amount: newRemAmount, remaining_calories: newRemKcal })
          .eq('id', dish.id);
      }
      return { kcal, dishName: dish.name };
    },

    async deleteSharedDish(dishId) {
      const sb = getClient();
      await sb.from('shared_dishes').delete().eq('id', dishId);
    },

    async logWeight(weightKg, { userId, coupleId }) {
      const sb = getClient();
      const today = LP.calories.getTodayKey();
      const { data: existing } = await sb
        .from('weight_logs')
        .select('id')
        .eq('user_id', userId)
        .eq('log_date', today)
        .maybeSingle();

      if (existing) {
        await sb.from('weight_logs').update({ weight_kg: Number(weightKg) }).eq('id', existing.id);
      } else {
        await sb.from('weight_logs').insert({
          user_id: userId,
          couple_id: coupleId,
          log_date: today,
          weight_kg: Number(weightKg),
        });
      }
      await sb.from('profiles').update({ current_weight: Number(weightKg) }).eq('id', userId);
    },

    async setWaterCups(cups, userId) {
      const sb = getClient();
      const today = LP.calories.getTodayKey();
      await sb.from('water_logs').upsert(
        { user_id: userId, log_date: today, cups },
        { onConflict: 'user_id,log_date' }
      );
    },

    async updateProfile(userId, patch) {
      const sb = getClient();
      const { error } = await sb.from('profiles').update(patch).eq('id', userId);
      if (error) throw error;
    },

    async updateCouple(coupleId, patch) {
      const sb = getClient();
      const { error } = await sb.from('couples').update(patch).eq('id', coupleId);
      if (error) throw error;
    },

    subscribeRealtime(coupleId, currentUserId, onDataChange, onReaction) {
      const sb = getClient();
      if (!sb || !coupleId) return () => {};

      const channel = sb
        .channel(`couple-${coupleId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'food_logs', filter: `couple_id=eq.${coupleId}` },
          onDataChange
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'shared_dishes', filter: `couple_id=eq.${coupleId}` },
          onDataChange
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'profiles', filter: `couple_id=eq.${coupleId}` },
          onDataChange
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'couples', filter: `id=eq.${coupleId}` },
          onDataChange
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'reactions', filter: `couple_id=eq.${coupleId}` },
          (payload) => {
            const row = payload.new;
            if (row && row.to_user_id === currentUserId) {
              onReaction(row);
            }
          }
        )
        .subscribe();

      return () => {
        sb.removeChannel(channel);
      };
    },
  };
})(window.LP);
