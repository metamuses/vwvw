// function to switch themes
function switchTheme(themeName) {
  // find the old link tag if it exists
  var oldLink = document.getElementById("theme-css");

  // create new link element for the selected theme
  var newLink = document.createElement("link");
  newLink.rel = "stylesheet";
  newLink.href = "css/themes/" + themeName + ".css";
  newLink.id = "theme-css";

  // when the new stylesheet is loaded, remove the old one
  newLink.onload = function () {
    if (oldLink && oldLink.parentNode) {
      oldLink.parentNode.removeChild(oldLink);
    }

    // save the selected theme to localStorage
    localStorage.setItem("activeTheme", themeName);
    console.log("Active theme: " + themeName);

    // set dropdown item bold if active
    var items = document.querySelectorAll("#theme-menu .dropdown-item");
    items.forEach(function (item) {
      if (item.dataset.theme === themeName) {
        item.style.fontWeight = "bold";
      } else {
        item.style.fontWeight = "normal";
      }
    });
  };

  // insert new css link after the common CSS
  var commonCss = document.querySelector('link[href*="basics.css"]');
  if (commonCss && commonCss.parentNode) {
    commonCss.parentNode.insertBefore(newLink, commonCss.nextSibling);
  }
}


// === leaflet map function  ===
async function initializeMuseumMap() {
  try {
      // load JSON data
      const response = await fetch("data/data.json");
      const data = await response.json();
      const items = data.items;
      
      // --- 1. static map configuration ---
      // arbitrary coordinates from [0, 0] to [100, 100]
      const mapBounds = [[0, 0], [100, 100]]; 
      
      // initialize map with L.CRS.Simple for non geografic coordinates
      const map = L.map('map', {
          crs: L.CRS.Simple,
          minZoom: -2,
          maxZoom: 2,
          center: [50, 50], // center of the map
          zoom: 0,
          attributionControl: false,
          maxBounds: mapBounds, // avoids excessive panning 
          maxBoundsViscosity: 1.0 
      });
      
      // adds map image (ImageOverlay)
      const imageUrl = 'img/map-example.jpg'; 
      L.imageOverlay(imageUrl, mapBounds).addTo(map);
      
      // adapts to image bounds
      map.fitBounds(mapBounds);

      const itemMarkers = [];
      
      // item marker on map
      const customIcon = L.divIcon({
          className: 'item-marker',
          iconSize: [12, 12],
          iconAnchor: [6, 6],
      });
      
      // --- 2. add marker for 21 items ---
      Object.entries(items).forEach(([itemId, item]) => {
          // skip items with no position or narrative
          if (!item.location || !item.metadata || !item.metadata.narratives) {
              return; 
          }
          
          const [lat, lon] = item.location;
          
          // content of card on hover with name and image
          const tooltipContent = `
              <div class="item-card-hover">
                  <p class="m-0 fw-bold">${item.title}</p>
                  <img src="${item.image || 'placeholder.jpg'}" alt="${item.title}" class="img-fluid">
              </div>
          `;
          
          // create marker
          const marker = L.marker([lat, lon], { 
              icon: customIcon,
              narratives: item.metadata.narratives
          })
          .addTo(map)
          // Hover: use bindTooltip for card
          .bindTooltip(tooltipContent, { 
              permanent: false, 
              direction: 'top', 
              className: 'item-custom-tooltip' //  tooltip style class
          })
          // Click to item page
          .on('click', () => {
              window.location.href = `item.html#${itemId}`;
          });
          
          // save marker and DOM element for CSS
          marker.itemId = itemId;
          marker.domElement = marker._icon;
          itemMarkers.push(marker);
      });

      // --- 3. on card hover the path lights up ---
      const narrativeCards = document.querySelectorAll('.path-card');
      
      narrativeCards.forEach(card => {
          const narrativeId = card.getAttribute('data-narrative-id');

          card.addEventListener('mouseenter', () => {
              itemMarkers.forEach(marker => {
                  // check if marker belongs to narrative
                  if (marker.options.narratives.includes(narrativeId)) {
                      marker.domElement.classList.add('highlighted');
                  }
              });
          });

          card.addEventListener('mouseleave', () => {
              itemMarkers.forEach(marker => {
                  marker.domElement.classList.remove('highlighted');
              });
          });
      });

  } catch (error) {
      console.error("Error loading map data or initializing map:", error);
  }
}


// on page load logic
document.addEventListener("DOMContentLoaded", function () {
  // === MAP LOGIC ===
  // initialize map if  div 'map' exist (in index.html and narratives)
  if (document.getElementById('map')) {
    initializeMuseumMap();
  }
  // === THEME LOGIC ===
  var defaultTheme = "70s-punk";
  var activeTheme = localStorage.getItem("activeTheme");

  // add click listeners for dropdown items
  var themeMenuItems = document.querySelectorAll("#theme-menu .dropdown-item");
  themeMenuItems.forEach(function (item) {
    item.addEventListener("click", function (e) {
      e.preventDefault();
      switchTheme(item.dataset.theme);
    });
  });

  switchTheme(activeTheme || defaultTheme);

  // === NARRATIVE LOGIC ===
  // add click listeners for dropdown items
  var narrativeMenuItems = document.querySelectorAll("#narrative-menu .dropdown-item");
  narrativeMenuItems.forEach(function (item) {
    item.addEventListener("click", function (e) {
      var narrative = e.target.dataset.narrative;
      localStorage.setItem("activeNarrative", narrative);
      console.log("Narrative '" + narrative + "' selected.");
      window.location.href = "narrative.html";
    });
  });

  // execute code only in narrative.html
  if (window.location.pathname.endsWith("narrative.html")) {
    // read narrative from localStorage or default to "historical"
    var activeNarrative = localStorage.getItem("activeNarrative") || "historical";
    console.log("Active narrative: " + activeNarrative);

    // load json data
    fetch("data/data.json")
      .then(function (response) {
        return response.json();
      })
      .then(function (data) {
        // get narrative data
        var narrative = data.narratives[activeNarrative];

        // update title and description
        var title = document.getElementById("narrative-title");
        var description = document.getElementById("narrative-description");
        title.textContent = narrative.title;
        description.textContent = narrative.description;

        // populate items list
        var ul = document.getElementById("narrative-items");
        ul.innerHTML = "";

        narrative.items.forEach(function (itemKey) {
          var item = data.items[itemKey];
          if (item) {
            var li = document.createElement("li");
            var link = document.createElement("a");
            link.href = "/item.html#" + itemKey;
            link.textContent = item.title + ": " + item.description;
            li.appendChild(link);
            ul.appendChild(li);
          }
        });
      })
      .catch(function (error) {
        console.log("Error loading narrative. Resetting to 'historical' and reloading...");
        localStorage.setItem("activeNarrative", "historical");
        window.location.reload();
      });
  }

  // === ITEM LOGIC ===
  // execute code only in item.html
  if (window.location.pathname.endsWith("item.html")) {
    // read narrative from localStorage or default to "historical"
    var activeNarrative = localStorage.getItem("activeNarrative") || "historical";
    console.log("Active narrative: " + activeNarrative);

    // define a function to load item data
    function loadItem() {
      // get item name from the hash (#apple)
      var activeItem = window.location.hash.substring(1);
      // load json data
      fetch("data/data.json")
        .then(function (response) {
          return response.json();
        })
        .then(function (data) {
          // get narrative data and item data
          var narrative = data.narratives[activeNarrative];
          var item = data.items[activeItem];

          // if no hash or wrong item, go to first in narrative
          if (!item) {
            activeItem = narrative.items[0];
            item = data.items[activeItem];
            window.location.hash = activeItem;
          }

          // update title and description
          var title = document.getElementById("item-title");
          var desc = document.getElementById("item-description");
          title.textContent = item.title;
          desc.textContent = item.description;

          // populate navigation buttons
          var currentIndex = narrative.items.indexOf(activeItem);
          var prevItem = narrative.items[currentIndex - 1];
          var nextItem = narrative.items[currentIndex + 1];
          var backBtn = document.getElementById("back-button");
          var forwardBtn = document.getElementById("forward-button");

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
          backBtn.onclick = function () {
            if (prevItem) window.location.hash = prevItem;
          };
          forwardBtn.onclick = function () {
            if (nextItem) window.location.hash = nextItem;
          };

          // --- METADATA POPULATION ---
          const metadataTable = document.getElementById("metadata-table");
          const metadataRows = metadataTable.querySelectorAll("tbody tr");
          const metadata = item.metadata || {};

          // Iterate over standard metadata keys
          ["category", "author", "year", "dimensions", "source"].forEach(key => {
            const row = metadataTable.querySelector(`tr[data-key="${key}"]`);
            if (row) {
              const value = metadata[key];
              if (value) {
                row.querySelector("td").textContent = value;
                row.style.display = ""; // show row
              } else {
                row.style.display = "none"; // hide if missing
              }
            }
          });

          // Handle Other Narrative links
          const rowOtherNarrative = metadataTable.querySelector(`tr[data-key="other-narrative"]`);
          if (rowOtherNarrative) {
            const narratives = metadata.narratives || [];
            const otherNarratives = narratives.filter(n => n !== activeNarrative);

            if (otherNarratives.length) {
              const td = rowOtherNarrative.querySelector("td");
              td.innerHTML = ""; // clear previous content

              otherNarratives.forEach((narr, index) => {
                const link = document.createElement("a");
                link.href = "#"; // keep page, no full reload
                link.textContent = narr.replace(/-/g, " ");
                link.classList.add("text-decoration-none");

                link.addEventListener("click", (e) => {
                  e.preventDefault();
                  console.log("Switching to narrative:", narr);
                  localStorage.setItem("activeNarrative", narr);
                  activeNarrative = narr; // update current narrative in JS

                  // Regenerate the item page in the new narrative
                  loadItem(); // call your existing loadItem() function
                });

                td.appendChild(link);
                if (index < otherNarratives.length - 1) {
                  td.appendChild(document.createTextNode(", "));
                }
              });

              rowOtherNarrative.style.display = ""; // show row
            } else {
              rowOtherNarrative.style.display = "none";
            }
          }

          // === MULTI-AXIS TEXT LOGIC ===
          const btnAdult = document.getElementById("btn-adult");
          const btnKid = document.getElementById("btn-kid");
          const btnIncreaseCompetence = document.getElementById("btn-increase-difficulty"); // keeps old id
          const btnDecreaseCompetence = document.getElementById("btn-decrease-difficulty"); // keeps old id
          const textTitle = document.getElementById("text-title");
          const textContent = document.getElementById("text-content");

          // itemTexts taken from item
          const itemTexts = item.texts || {};

          // Load last settings or defaults
          let tone = localStorage.getItem("activeTone") || "kid";            // (kid/adult)
          let competence = localStorage.getItem("activeCompetence") || "amateur"; // (amateur/expert)
          let length = localStorage.getItem("activeLength") || "short";     // (short/long)

          function updateTextDisplay() {
            const key = `${tone}-${competence}-${length}`;
            const value = itemTexts[key] || "No text available for this version.";

            // Build inline Read More / Read Less link (recreated each render)
            const readMoreHtml = ` <a href="#" id="btn-toggle-length" class="text-primary text-decoration-none ms-1">${length === "short" ? "Read More" : "Read Less"}</a>`;

            // Set title and paragraph (use innerHTML because we need the inline link)
            textTitle.textContent = `${tone.charAt(0).toUpperCase() + tone.slice(1)} Text`;
            textContent.innerHTML = `${value}${readMoreHtml}`;

            // Highlight active audience/tone button (only Adult/Kid highlighted)
            if (tone === "adult") {
              btnAdult.classList.remove("btn-outline-primary");
              btnAdult.classList.add("btn-primary");
              btnKid.classList.remove("btn-secondary");
              btnKid.classList.add("btn-outline-secondary");
            } else {
              btnKid.classList.remove("btn-outline-secondary");
              btnKid.classList.add("btn-secondary");
              btnAdult.classList.remove("btn-primary");
              btnAdult.classList.add("btn-outline-primary");
            }

            // Show correct competence (difficulty) button
            btnIncreaseCompetence.style.display = competence === "amateur" ? "block" : "none";
            btnDecreaseCompetence.style.display = competence === "expert" ? "block" : "none";

            // Attach click handler to newly rendered inline toggle link
            const btnToggleLength = document.getElementById("btn-toggle-length");
            if (btnToggleLength) {
              // remove previous listeners by cloning (defensive) to avoid duplicates
              const newBtn = btnToggleLength.cloneNode(true);
              btnToggleLength.parentNode.replaceChild(newBtn, btnToggleLength);
              newBtn.addEventListener("click", (e) => {
                e.preventDefault();
                length = length === "short" ? "long" : "short";
                updateTextDisplay();
              });
            }

            // Save current state under the renamed keys
            localStorage.setItem("activeTone", tone);
            localStorage.setItem("activeCompetence", competence);
            localStorage.setItem("activeLength", length);
          }

          // Button handlers (use renamed vars)
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

          // Initialize display on load
          updateTextDisplay();

          // --- Media shelf logic ---
          const mediaShelf = document.getElementById("related-media-shelf");
          mediaShelf.innerHTML = ""; // clear old content

          if (item.media && item.media.length > 0) {
            item.media.forEach(media => {
              let mediaElement = "";

              if (media.type === "image") {
                mediaElement = `<img src="${media.source}" alt="${media.caption}">`;
              } else if (media.type === "video") {
                mediaElement = `<iframe src="${media.source}" title="${media.caption}" allowfullscreen></iframe>`;
              }

              const wrapper = document.createElement("div");
              wrapper.className = "shelf-card-wrapper";

              const card = document.createElement("a");
              card.href = media.link;
              card.target = "_blank";
              card.className = "card text-decoration-none text-dark";
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
          document.querySelector(".shelf-arrow.left").addEventListener("click", () => {
            mediaShelf.scrollBy({ left: -250, behavior: "smooth" });
          });
          document.querySelector(".shelf-arrow.right").addEventListener("click", () => {
            mediaShelf.scrollBy({ left: 250, behavior: "smooth" });
          });

        })

        .catch(function (error) {
          console.log("Error loading item:", error);
          document.getElementById("item-title").textContent = "Error loading item";
          document.getElementById("item-description").textContent = "";
        });
    }
    // load the item when ready
    loadItem();

    // reload the item when browser back/forward changes the fragment
    window.addEventListener("hashchange", loadItem);

  }
});
