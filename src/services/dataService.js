window.LP = window.LP || {};

(function (LP) {
  LP.dataService = {
    async loadState() {
      if (!LP.config.getSupabaseConfig().isConfigured) {
        return null;
      }
      return LP.supabaseService.fetchAppState();
    },

    async addFoodItems(items, ctx) {
      await LP.supabaseService.addFoodItems(items, {
        userId: ctx.profile.id,
        coupleId: ctx.couple.id,
      });
    },

    async deleteFoodItem(id) {
      await LP.supabaseService.deleteFoodItem(id);
    },

    async toggleFavorite(name, calories, ctx) {
      return LP.supabaseService.toggleFavorite(name, calories, ctx.profile.id);
    },

    async sendReaction(type, message, ctx) {
      if (!ctx.partner) return;
      await LP.supabaseService.sendReaction({
        fromUserId: ctx.profile.id,
        toUserId: ctx.partner.id,
        coupleId: ctx.couple.id,
        type,
        message,
      });
    },

    async addSharedDish(payload, ctx) {
      await LP.supabaseService.addSharedDish({
        ...payload,
        userId: ctx.profile.id,
        coupleId: ctx.couple.id,
      });
    },

    async takeSharedPortion(dish, amount, ctx) {
      return LP.supabaseService.takeSharedPortion(dish, amount, {
        userId: ctx.profile.id,
        coupleId: ctx.couple.id,
      });
    },

    async deleteSharedDish(dishId) {
      await LP.supabaseService.deleteSharedDish(dishId);
    },

    async logWeight(weightKg, ctx) {
      await LP.supabaseService.logWeight(weightKg, {
        userId: ctx.profile.id,
        coupleId: ctx.couple.id,
      });
    },

    async setWaterCups(cups, ctx) {
      await LP.supabaseService.setWaterCups(cups, ctx.profile.id);
    },

    async updateProfile(patch, ctx) {
      await LP.supabaseService.updateProfile(ctx.profile.id, patch);
    },

    async updateCouple(patch, ctx) {
      await LP.supabaseService.updateCouple(ctx.couple.id, patch);
    },
  };
})(window.LP);
