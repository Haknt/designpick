const grid = document.getElementById("variantGrid");
const status = document.getElementById("status");
const selectBtn = document.getElementById("selectBtn");
const roundBadge = document.getElementById("roundBadge");
const descriptionEl = document.getElementById("description");

let sessionId = null;
let variants = [];
let keptIds = new Set();

async function init() {
  // Get session ID from URL params
  const params = new URLSearchParams(window.location.search);
  sessionId = params.get("session");

  if (!sessionId) {
    status.textContent = "No session ID provided";
    return;
  }

  await loadSession();
}

async function loadSession() {
  try {
    const res = await fetch(`/api/session/${sessionId}`);
    if (!res.ok) throw new Error("Session not found");

    const data = await res.json();
    variants = data.variants;
    roundBadge.textContent = `Round ${data.round}`;
    descriptionEl.textContent = data.description || "";
    keptIds.clear();
    renderVariants();
    updateStatus();
  } catch (err) {
    status.textContent = `Error: ${err.message}`;
  }
}

function renderVariants() {
  grid.innerHTML = "";

  for (const variant of variants) {
    const card = document.createElement("div");
    card.className = `variant-card${variant.eliminated ? " eliminated" : ""}${keptIds.has(variant.id) ? " kept" : ""}`;
    card.dataset.id = variant.id;

    card.innerHTML = `
      <div class="variant-header">
        <div class="variant-label">
          <span class="letter">${variant.label}</span>
          <span class="desc">${variant.description}</span>
        </div>
        <div class="variant-actions">
          <button class="keep-btn${keptIds.has(variant.id) ? " active" : ""}" title="Keep" onclick="toggleKeep('${variant.id}')">&#10003;</button>
          <button class="eliminate-btn" title="Eliminate" onclick="eliminate('${variant.id}')">&#10005;</button>
        </div>
      </div>
      <div class="variant-preview">
        <iframe srcdoc="${escapeAttr(variant.html)}" sandbox="allow-scripts"></iframe>
      </div>
    `;

    grid.appendChild(card);
  }
}

function escapeAttr(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function eliminate(variantId) {
  const res = await fetch("/api/eliminate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, variantId }),
  });

  if (res.ok) {
    const card = document.querySelector(`[data-id="${variantId}"]`);
    if (card) card.classList.add("eliminated");
    variants = variants.map((v) =>
      v.id === variantId ? { ...v, eliminated: true } : v
    );
    keptIds.delete(variantId);
    updateStatus();
  }
}

function toggleKeep(variantId) {
  if (keptIds.has(variantId)) {
    keptIds.delete(variantId);
  } else {
    keptIds.add(variantId);
  }

  const card = document.querySelector(`[data-id="${variantId}"]`);
  if (card) card.classList.toggle("kept", keptIds.has(variantId));

  const btn = card?.querySelector(".keep-btn");
  if (btn) btn.classList.toggle("active", keptIds.has(variantId));

  updateStatus();
}

function updateStatus() {
  const active = variants.filter((v) => !v.eliminated);
  const kept = keptIds.size;

  status.textContent = `${active.length} remaining${kept > 0 ? ` · ${kept} kept` : ""}`;

  // Enable select button when exactly 1 is kept or 1 remains
  selectBtn.disabled = !(kept === 1 || active.length === 1);
}

selectBtn.addEventListener("click", async () => {
  let winnerId;

  if (keptIds.size === 1) {
    winnerId = [...keptIds][0];
  } else {
    const active = variants.filter((v) => !v.eliminated);
    if (active.length === 1) winnerId = active[0].id;
  }

  if (!winnerId) return;

  const res = await fetch("/api/select", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, variantId: winnerId }),
  });

  if (res.ok) {
    const winner = variants.find((v) => v.id === winnerId);
    grid.innerHTML = `
      <div class="variant-card kept" style="grid-column: 1 / -1; max-width: 600px; margin: 0 auto;">
        <div class="variant-header">
          <div class="variant-label">
            <span class="letter">${winner.label}</span>
            <span class="desc">Winner — ${winner.description}</span>
          </div>
        </div>
        <div class="variant-preview">
          <iframe srcdoc="${escapeAttr(winner.html)}" sandbox="allow-scripts"></iframe>
        </div>
      </div>
    `;
    status.textContent = "Selection complete. You can close this tab.";
    selectBtn.disabled = true;
  }
});

init();
