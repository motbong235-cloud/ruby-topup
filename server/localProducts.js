/**
 * Local products (not Khmer TopUp).
 * deliveryType: "stock" | "live_chat"
 * requireUsername: true  → customer must enter username
 *                  false → no username field
 *
 * Safety net: set env USERNAME_REQUIRED_IDS=robux-login,roblox-plus on Render
 * to force the username field for those product ids regardless of saved settings.
 */
import { getSettings, stockCount } from "./store.js";

export const DEFAULT_LOCAL_PRODUCTS = [];  // empty — admin adds via panel; no hard-coded Roblox/MLBB box

function normDelivery(dt) {
  if (dt === "live_chat") return "live_chat";
  if (dt === "topup") return "topup";
  // gift_code legacy → stock
  return "stock";
}

function forcedUsernameIds() {
  return String(process.env.USERNAME_REQUIRED_IDS || "")
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
}

export function localCatalog() {
  const s = getSettings();
  // If settings.localProducts was ever saved (array), respect it even when empty
  // so Admin "delete all" actually hides products. Only use DEFAULT when unset.
  const overrides = Array.isArray(s.localProducts) ? s.localProducts : null;
  const list = overrides !== null ? overrides : DEFAULT_LOCAL_PRODUCTS;
  const forced = forcedUsernameIds();
  return list
    .filter((g) => g && g.open !== false)
    .map((g) => {
      const dt = normDelivery(g.deliveryType || "stock");
      const requireUsername = !!g.requireUsername || forced.includes(String(g.id).toLowerCase());
      return {
        id: String(g.id),
        name: String(g.name || g.id),
        nameKm: String(g.nameKm || g.name || g.id),
        region: String(g.region || ""),
        blurbKm: String(g.blurbKm || ""),
        blurbEn: String(g.blurbEn || ""),
        famous: !!g.famous,
        hot: !!g.hot,
        open: g.open !== false,
        hue: Number(g.hue) || 210,
        mark: String(g.mark || "GC"),
        image: String(g.image || ""),
        deliveryType: dt,
        requireUsername,
        hasZone: false,
        servers: [],
        numericId: false,
        idHintKm: String(
          g.idHintKm ||
            (requireUsername ? "បញ្ចូល Username របស់អ្នក" : "មិនចាំបាច់ username"),
        ),
        idHintEn: String(
          g.idHintEn ||
            (requireUsername ? "Enter your username" : "No username required"),
        ),
        packs: (Array.isArray(g.packs) ? g.packs : [])
          .map((p) => {
            const id = String(p.id);
            const left = dt === "stock" ? stockCount(id) : 999;
            return {
              id,
              name: String(p.name || p.id),
              nameKm: String(p.nameKm || p.name || p.id),
              price: Number(p.price),
              cost: Number(p.cost ?? p.price),
              category: String(p.category || "Gift Card"),
              bonus: p.bonus ? String(p.bonus) : "",
              image: String(p.image || ""),
              stock: dt === "stock" ? left : null,
              inStock: dt === "live_chat" ? true : left > 0,
            };
          })
          .filter((p) => p.id && Number.isFinite(p.price) && p.price > 0),
      };
    })
    .filter((g) => g.packs.length);
}

export function findLocalPack(gameId, packId) {
  const game = localCatalog().find((g) => g.id === String(gameId));
  if (!game) return null;
  const pack = game.packs.find((p) => p.id === String(packId));
  return pack ? { game, pack } : null;
}

export function isGiftCodeProduct(game) {
  if (!game) return false;
  const dt = game.deliveryType;
  return dt === "stock" || dt === "live_chat" || dt === "gift_code" || String(game.id || "").startsWith("roblox");
}
