import type { GameState } from "../game/state";
import type { GameController } from "../game";
import { ITEMS } from "../game/inventory";

export function openVendorModal(state: GameState, controller: GameController, rerender: () => void): void {
  const overlay = document.createElement("div");
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1400;
  `;

  const modal = document.createElement("div");
  modal.style.cssText = `
    background: #111;
    border: 2px solid #444;
    padding: 16px;
    width: min(720px, 95vw);
    color: #e0e0e0;
    font-family: monospace;
  `;

  const title = document.createElement("h3");
  title.textContent = "Vendor";
  title.style.marginTop = "0";
  modal.appendChild(title);

  const moneyRow = document.createElement("div");
  moneyRow.textContent = `Credits: ${state.party.inventory.money ?? 0}`;
  moneyRow.style.marginBottom = "8px";
  modal.appendChild(moneyRow);

  const items = Object.values(ITEMS).filter((item) => {
    if (item.type === "equipment" && item.equipment?.bossOnly) return false;
    if (item.equipment?.depthTier && item.equipment.depthTier > state.location.depth + 1) return false;
    return item.price !== undefined && item.price > 0;
  });

  const list = document.createElement("div");
  list.style.display = "grid";
  list.style.gridTemplateColumns = "repeat(auto-fit, minmax(260px, 1fr))";
  list.style.gap = "10px";

  items.forEach((item) => {
    const card = document.createElement("div");
    card.style.cssText = `
      background: #191919;
      border: 1px solid #333;
      padding: 10px;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    `;
    const name = document.createElement("div");
    name.textContent = item.name;
    name.style.fontWeight = "bold";
    card.appendChild(name);

    const desc = document.createElement("div");
    desc.textContent = item.description;
    desc.style.fontSize = "12px";
    desc.style.color = "#b0b0b0";
    card.appendChild(desc);

    const price = item.price ?? 0;
    const priceRow = document.createElement("div");
    priceRow.textContent = `Price: ${price}`;
    card.appendChild(priceRow);

    const levelReq = item.equipment?.requiredLevel;
    if (levelReq) {
      const reqRow = document.createElement("div");
      reqRow.textContent = `Requires level ${levelReq}`;
      reqRow.style.fontSize = "12px";
      reqRow.style.color = "#8ab6ff";
      card.appendChild(reqRow);
    }

    const buyBtn = document.createElement("button");
    buyBtn.textContent = "Buy";
    buyBtn.disabled = (state.party.inventory.money ?? 0) < price;
    buyBtn.addEventListener("click", () => {
      if ((state.party.inventory.money ?? 0) < price) return;
      state.party.inventory.money -= price;
      // Add to inventory
      if (controller.getState().party.inventory.maxSlots > controller.getState().party.inventory.items.length || item.stackable) {
        controller.getState().party.inventory = controller.getState().party.inventory; // ensure reference
        if (controller.getState().party.inventory.items.find((i) => i.item.id === item.id && item.stackable)) {
          const found = controller.getState().party.inventory.items.find((i) => i.item.id === item.id);
          if (found) found.quantity += 1;
        } else {
          controller.getState().party.inventory.items.push({ item, quantity: 1 });
        }
        moneyRow.textContent = `Credits: ${state.party.inventory.money ?? 0}`;
      }
      rerender();
    });
    card.appendChild(buyBtn);
    list.appendChild(card);
  });

  modal.appendChild(list);

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "Close";
  closeBtn.style.marginTop = "10px";
  closeBtn.addEventListener("click", () => overlay.remove());
  modal.appendChild(closeBtn);

  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}
