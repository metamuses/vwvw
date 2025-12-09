export function initItemPage() {
  let activeNarrative = localStorage.getItem("activeNarrative") || "historical";

  function loadItem() {
    let activeItem = window.location.hash.substring(1);

    fetch("data/data.json")
      .then((r) => r.json())
      .then((data) => {
        // get narrative data and item data
        const narrative = data.narratives[activeNarrative];
        let item = data.items[activeItem];

        // if no hash or wrong item, go to first in narrative
        if (!item) {
          activeItem = narrative.items[0];
          item = data.items[activeItem];
          window.location.hash = activeItem;
        }

        // update title and description
        const title = document.getElementById("item-title");
        const desc = document.getElementById("item-description");
        title.textContent = item.title;
        desc.textContent = item.description;

        // update image
        const img = document.getElementById("item-image");
        if (item.image && item.image.trim() !== "") {
          img.src = item.image;
          img.alt = item.title;
        } else {
          // fallback placeholder if no image found
          img.src = "https://placehold.co/400x400/png";
          img.alt = "placeholder image";
        }

        // populate navigation buttons
        const currentIndex = narrative.items.indexOf(activeItem);
        const prevItem = narrative.items[currentIndex - 1];
        const nextItem = narrative.items[currentIndex + 1];
        const backBtn = document.getElementById("back-button");
        const forwardBtn = document.getElementById("forward-button");

        // set button labels and enable/disable accordingly
        if (prevItem) {
          backBtn.textContent = "← " + data.items[prevItem].title;
          backBtn.disabled = false;
        } else {
          backBtn.textContent = "←";
          backBtn.disabled = true;
        }

        if (nextItem) {
          forwardBtn.textContent = data.items[nextItem].title + " →";
          forwardBtn.disabled = false;
        } else {
          forwardBtn.textContent = "→";
          forwardBtn.disabled = true;
        }

        // add click events
        backBtn.onclick = () => {
          if (prevItem) window.location.hash = prevItem;
        };
        forwardBtn.onclick = () => {
          if (nextItem) window.location.hash = nextItem;
        };

        // metadata population
        const metadata = item.metadata || {};
        const metadataTable = document.getElementById("metadata-table");

        ["category", "author", "year", "dimensions", "source"].forEach(
          (key) => {
            const row = metadataTable.querySelector(`tr[data-key="${key}"]`);
            if (!row) return;
            const value = metadata[key];
            if (value) {
              row.querySelector("td").textContent = value;
              row.style.display = ""; // show row
            } else {
              row.style.display = "none"; // hide if missing
            }
          }
        );

        // handle other narrative links
        const rowOtherNarrative = metadataTable.querySelector(`tr[data-key="other-narrative"]`);
        if (rowOtherNarrative) {
          const allNarratives = metadata.narratives || [];
          const otherNarratives = allNarratives.filter(
            (n) => n !== activeNarrative
          );
          const td = rowOtherNarrative.querySelector("td");
          td.innerHTML = "";

          if (otherNarratives.length === 0) {
            rowOtherNarrative.style.display = "none";
          } else {
            otherNarratives.forEach((narr, i) => {
              const link = document.createElement("a");
              link.href = "#";
              link.textContent = narr.replace(/-/g, " ");
              link.classList.add("text-decoration-none");

              link.addEventListener("click", (e) => {
                e.preventDefault();
                localStorage.setItem("activeNarrative", narr);
                activeNarrative = narr;
                loadItem();
              });

              td.appendChild(link);
              if (i < otherNarratives.length - 1) {
                td.appendChild(document.createTextNode(", "));
              }
            });

            rowOtherNarrative.style.display = "";
          }
        }

        // multi-axis text logic
        const btnAdult = document.getElementById("btn-adult");
        const btnKid = document.getElementById("btn-kid");
        const btnIncreaseCompetence = document.getElementById("btn-increase-difficulty");
        const btnDecreaseCompetence = document.getElementById("btn-decrease-difficulty");
        const textTitle = document.getElementById("text-title");
        const textContent = document.getElementById("text-content");

        // itemTexts taken from item
        const itemTexts = item.texts || {};

        // Load last settings or defaults
        let tone = localStorage.getItem("activeTone") || "kid"; // kid/adult
        let competence = localStorage.getItem("activeCompetence") || "amateur"; // amateur/expert
        let length = localStorage.getItem("activeLength") || "short"; // short/long

        function updateTextDisplay() {
          const key = `${tone}-${competence}-${length}`;
          const value = itemTexts[key] || "No text available for this version.";

          textTitle.textContent = `${
            tone.charAt(0).toUpperCase() + tone.slice(1)
          } Text`;
          textContent.innerHTML = `${value} <a href="#" id="btn-toggle-length" class="text-primary text-decoration-none ms-1">${
            length === "short" ? "Read More" : "Read Less"
          }</a>`;

          // Highlight correct buttons
          if (tone === "adult") {
            btnAdult.classList.add("btn-primary");
            btnAdult.classList.remove("btn-outline-primary");
            btnKid.classList.add("btn-outline-secondary");
            btnKid.classList.remove("btn-secondary");
          } else {
            btnKid.classList.add("btn-secondary");
            btnKid.classList.remove("btn-outline-secondary");
            btnAdult.classList.add("btn-outline-primary");
            btnAdult.classList.remove("btn-primary");
          }

          btnIncreaseCompetence.style.display =
            competence === "amateur" ? "block" : "none";
          btnDecreaseCompetence.style.display =
            competence === "expert" ? "block" : "none";

          // Bind inline link
          const btnToggleLength = document.getElementById("btn-toggle-length");
          if (btnToggleLength) {
            const clone = btnToggleLength.cloneNode(true);
            btnToggleLength.parentNode.replaceChild(clone, btnToggleLength);

            clone.addEventListener("click", (e) => {
              e.preventDefault();
              length = length === "short" ? "long" : "short";
              updateTextDisplay();
            });
          }

          // Save state
          localStorage.setItem("activeTone", tone);
          localStorage.setItem("activeCompetence", competence);
          localStorage.setItem("activeLength", length);
        }

        btnAdult.onclick = () => {
          tone = "adult";
          updateTextDisplay();
        };
        btnKid.onclick = () => {
          tone = "kid";
          updateTextDisplay();
        };
        btnIncreaseCompetence.onclick = () => {
          competence = "expert";
          updateTextDisplay();
        };
        btnDecreaseCompetence.onclick = () => {
          competence = "amateur";
          updateTextDisplay();
        };

        updateTextDisplay();

        // media shelf
        const mediaShelf = document.getElementById("related-media-shelf");
        mediaShelf.innerHTML = "";

        if (item.media && item.media.length > 0) {
          item.media.forEach((media) => {
            const wrapper = document.createElement("div");
            wrapper.className = "shelf-card-wrapper";

            const card = document.createElement("a");
            card.href = media.link;
            card.target = "_blank";
            card.className = "card text-decoration-none text-dark";

            let mediaElement = "";
            if (media.type === "image") {
              mediaElement = `<img src="${media.source}" alt="${media.caption}">`;
            } else if (media.type === "video") {
              mediaElement = `<iframe src="${media.source}" title="${media.caption}" allowfullscreen></iframe>`;
            }

            card.innerHTML = `
              <div class="media-content">${mediaElement}</div>
              <div class="card-body">
                <h6 class="card-title mb-1">${media.caption}</h6>
              </div>
            `;

            wrapper.appendChild(card);
            mediaShelf.appendChild(wrapper);
          });
        }

        // Scroll arrows
        document
          .querySelector(".shelf-arrow.left")
          .addEventListener("click", () => {
            mediaShelf.scrollBy({ left: -250, behavior: "smooth" });
          });
        document
          .querySelector(".shelf-arrow.right")
          .addEventListener("click", () => {
            mediaShelf.scrollBy({ left: 250, behavior: "smooth" });
          });
      })

      .catch((err) => {
        console.error("Error loading item:", err);
        document.getElementById("item-title").textContent =
          "Error loading item";
        document.getElementById("item-description").textContent = "";
      });
  }

  // Load item on first render
  loadItem();

  // Reload item when hash changes (back/forward buttons)
  window.addEventListener("hashchange", loadItem);
}
