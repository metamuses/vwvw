import { initTheme } from "./theme.js";
import { initializeMuseumMap } from "./map.js";
import { initNarrativeSelectionUI, initNarrativePage } from "./narrative.js";
import { initItemPage } from "./item.js";

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initNarrativeSelectionUI();

  const page = document.body.dataset.page;

  if (document.getElementById("map")) {
    initializeMuseumMap();
  };

  if (page === "narrative"){
    initNarrativePage();
  };

  if (page === "item") {
    initItemPage();
  };
});
