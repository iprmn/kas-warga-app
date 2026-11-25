/* Strict Database API Client — NO localStorage, NO IndexedDB cache, NO hardcoded seed data.
 * All reads & writes go directly to the relational database backend:
 *   - Local: Node.js + MySQL (server.mjs -> kas_warga)
 *   - Production: Cloudflare Workers + Cloudflare D1 (worker.js)
 */
(() => {
  "use strict";

  async function apiJson(url, options = {}) {
    const res = await fetch(url, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
      },
      ...options,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `HTTP ${res.status}`);
    }
    return data;
  }

  window.kasDb = {
    async bootstrap() {
      return apiJson("/api/bootstrap", { method: "GET" });
    },

    async upsertWarga(w) {
      return apiJson("/api/warga", { method: "POST", body: JSON.stringify(w) });
    },

    async deleteWarga(id) {
      return apiJson(`/api/warga/${encodeURIComponent(id)}`, { method: "DELETE" });
    },

    async upsertDue(d) {
      return apiJson("/api/dues", { method: "POST", body: JSON.stringify(d) });
    },

    async recordTransaction(tx) {
      return apiJson("/api/transactions", { method: "POST", body: JSON.stringify(tx) });
    },

    async deleteTransaction(id) {
      return apiJson(`/api/transactions/${encodeURIComponent(id)}`, { method: "DELETE" });
    },

    async saveSettings(settings) {
      return apiJson("/api/settings", { method: "PUT", body: JSON.stringify(settings) });
    },
  };
})();
