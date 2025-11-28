// 1. Narrative selection UI (dropdown + cards)
export function initNarrativeSelectionUI() {
  // dropdown menu
  const narrativeMenuItems = document.querySelectorAll(
    "#narrative-menu .dropdown-item"
  );
  narrativeMenuItems.forEach((item) => {
    item.addEventListener("click", (e) => {
      const narrative = e.target.dataset.narrative;
      localStorage.setItem("activeNarrative", narrative);
      window.location.href = "narrative.html";
    });
  });

  // index.html narrative cards
  const narrativeCards = document.querySelectorAll(".path-card");
  narrativeCards.forEach((card) => {
    card.addEventListener("click", (e) => {
      e.preventDefault();
      const narrative = card.dataset.narrativeId;
      localStorage.setItem("activeNarrative", narrative);
      window.location.href = "narrative.html";
    });
  });
}

// 2. Narrative page (narrative.html)
export function initNarrativePage() {
  const activeNarrative =
    localStorage.getItem("activeNarrative") || "historical";

  fetch("data/data.json")
    .then((r) => r.json())
    .then((data) => {
      const narrative = data.narratives[activeNarrative];

      document.getElementById("narrative-title").textContent = narrative.title;
      document.getElementById("narrative-description").textContent =
        narrative.description;

      const itemsContainer = document.getElementById("narrative-items");
      itemsContainer.innerHTML = "";

      narrative.items.forEach((itemKey) => {
        const item = data.items[itemKey];
        if (!item) return;

        const col = document.createElement("div");
        col.className = "col-12 col-md-6 col-lg-4";

        const wrapper = document.createElement("div");
        wrapper.className = "path-card-wrapper h-100";

        const card = document.createElement("a");
        card.href = `item.html#${itemKey}`;
        card.className =
          "card h-100 border-0 shadow-sm text-decoration-none text-dark";

        const img = document.createElement("img");
        img.src = item.image || "https://placehold.co/400x400/png";
        img.className = "card-img-top";

        const body = document.createElement("div");
        body.className = "card-body";

        const title = document.createElement("h5");
        title.className = "card-title fw-bold";
        title.textContent = item.title;

        body.appendChild(title);
        card.appendChild(img);
        card.appendChild(body);
        wrapper.appendChild(card);
        col.appendChild(wrapper);
        itemsContainer.appendChild(col);
      });
    })
    .catch(() => {
      localStorage.setItem("activeNarrative", "historical");
      window.location.reload();
    });
}
