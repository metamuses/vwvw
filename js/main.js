// ------------------------------------------
// ====== FUNCTIONS =========================
// ------------------------------------------

// === SWITCH THEME FUNCTION ===
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
        // faux bold: adds a small shadow to thicken the font
        item.style.textShadow = "0.4px 0 0 currentColor";
      } else {
        item.style.fontWeight = "normal";
        item.style.textShadow = "none";
      }
    });
  };

  // insert new css link after the common CSS
  var commonCss = document.querySelector('link[href*="basics.css"]');
  if (commonCss && commonCss.parentNode) {
    commonCss.parentNode.insertBefore(newLink, commonCss.nextSibling);
  }
}

// === LEAFLET MAP FUNCTION  ===
async function initializeMuseumMap() {
  try {
    // load JSON data
    const response = await fetch("data/data.json");
    const data = await response.json();
    const items = data.items;

    // real image dimensions
    const imageWidth = 2718;
    const imageHeight = 1109;
    const mapBounds = [[0, 0], [imageHeight, imageWidth]];

    const map = L.map("map", {
      crs: L.CRS.Simple,
      minZoom: -2,
      maxZoom: 1,
      attributionControl: false,
      zoomControl: true,
      zoomSnap: 0.1,
      zoomDelta: 0.1,
      dragging: true
    });

    const image = L.imageOverlay("img/frontal_map_from_svg.png", mapBounds).addTo(map);

    function applyResponsiveFit() {
      const isMobile = window.innerWidth <= 768;

      if (!isMobile) {
        // DESKTOP: show full image
        map.fitBounds(mapBounds, { padding: [0, 0] });
        map.setMaxBounds(mapBounds);
      } else {
        // MOBILE: show the center inside the square
        const center = [imageHeight / 2, imageWidth / 2];
        map.setView(center, -1.2, { animate: false });
        map.setMaxBounds([
          [-200, -200],
          [imageHeight + 200, imageWidth + 200]
        ]);
      }
    }

    // single function that does what your manual resize is doing
    function forceProperLayout() {
      applyResponsiveFit();
      map.invalidateSize(true);
    }

    // when map is ready
    map.whenReady(() => {
      requestAnimationFrame(() => {
        forceProperLayout();
        // extra nudge, equivalent to what happens on viewport resize
        setTimeout(() => {
          map.invalidateSize(true);
        }, 200);
      });
    });

    // when overlay image loads (covers slow image / cache edge cases)
    image.once("load", () => {
      requestAnimationFrame(() => {
        forceProperLayout();
      });
    });

    // as a last fallback, after full window load
    window.addEventListener(
      "load",
      () => {
        setTimeout(() => {
          forceProperLayout();
        }, 300);
      },
      { once: true }
    );

    // debounce resize
    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        map.invalidateSize();
        applyResponsiveFit();
      }, 200);
    });

    const itemMarkers = [];

    // item marker on map
    const customIcon = L.divIcon({
      className: 'item-marker',
      iconSize: [12, 12],
      iconAnchor: [6, 6],
    });

    // add markers for all items
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
        // hover: use bindTooltip for card
        .bindTooltip(tooltipContent, {
          permanent: false,
          sticky: true,
          direction: "auto",
          className: "item-custom-tooltip",
          offset: [0, -10],
          opacity: 1
        });

      marker.itemId = itemId;

      // mobile: handle single and double tap
      let lastTap = 0;
      const isMobile = window.innerWidth <= 768;

      marker.on('click', () => {
        if (!isMobile) {
          window.location.href = `item.html#${itemId}`;
          return;
        }
        const now = Date.now();
        if (now - lastTap < 300) {
          // double tap: redirect
          window.location.href = `item.html#${itemId}`;
          lastTap = 0;
          return;
        }
        lastTap = now;
        // singolo tap → mostra tooltip
        marker.openTooltip();
      });

      itemMarkers.push(marker);
    });

    // on card hover the path lights up
    const narrativeCards = document.querySelectorAll('.path-card');

    function highlightMarkersForNarrative(narrativeId, addClass) {
      itemMarkers.forEach(marker => {
        const dom = marker.getElement && marker.getElement();
        if (!dom) return;
        if (
          marker.options &&
          Array.isArray(marker.options.narratives) &&
          marker.options.narratives.includes(narrativeId)
        ) {
          if (addClass) dom.classList.add('highlighted');
          else dom.classList.remove('highlighted');
        }
      });
    }

    narrativeCards.forEach(card => {
      const narrativeId = card.getAttribute('data-narrative-id');
      if (!narrativeId) return;

      card.addEventListener('mouseenter', () => {
        highlightMarkersForNarrative(narrativeId, true);
      });

      card.addEventListener('mouseleave', () => {
        highlightMarkersForNarrative(narrativeId, false);
      });
    });
  } catch (error) {
    console.error("Error loading map data or initializing map:", error);
  }
}

// ------------------------------------------
// ====== ON PAGE LOAD LOGIC ================
// ------------------------------------------

document.addEventListener("DOMContentLoaded", function () {
  // === SMART STICKY HEADER LOGIC ===
  const header = document.querySelector("header");
  const navbarCollapse = document.getElementById("navbarNavDropdown");
  const toggler = document.querySelector(".navbar-toggler");
  const dropdownToggles = document.querySelectorAll(".navbar .dropdown-toggle");

  // track last scroll position and if a menu click is happening
  let lastScrollY = window.scrollY;
  let isToggling = false;

  // function for temporary pausing scroll logic to prevent menu closing glitches
  function activateToggleGuard() {
    isToggling = true;
    setTimeout(() => {
      isToggling = false;
    }, 500); // 500ms allows time for the dropdown animation to finish
  }

  // if hamburger exist, activate function for temporary pausing
  if (toggler) {
    toggler.addEventListener("click", activateToggleGuard);
  }
  // when dropdown clicked, activate function for temporary pausing
  dropdownToggles.forEach(toggle => {
    toggle.addEventListener("click", activateToggleGuard);
  });

  // scroll listener
  window.addEventListener("scroll", () => {
    // stop if a menu button is clicked
    if (isToggling) return;

    // get current scroll position and how much we moved
    const currentScrollY = window.scrollY;
    const scrollDifference = Math.abs(currentScrollY - lastScrollY);

    // === close logic (if actually open) ===
    if (navbarCollapse.classList.contains("show")) {
      // Only close if scrolling DOWN significantly (>15px)
      if (currentScrollY > lastScrollY && scrollDifference > 15) {
        const bsCollapse = bootstrap.Collapse.getInstance(navbarCollapse);
        if (bsCollapse) bsCollapse.hide();
      }
    }

    // close Desktop Dropdowns
    const openDropdowns = document.querySelectorAll('.dropdown-menu.show');
    openDropdowns.forEach(menu => {
      const toggle = menu.parentElement.querySelector('.dropdown-toggle');
      // Only close desktop dropdowns, if mobile menu allow scroll
      if (toggle && scrollDifference > 10 && !navbarCollapse.classList.contains("show")) {
        const bsDropdown = bootstrap.Dropdown.getInstance(toggle);
        if (bsDropdown) bsDropdown.hide();
      }
    });

    // === shrink logic ===
    // if more then >100 px down, shrink
    if (currentScrollY > 100) {
      header.classList.add("header-scrolled");
    }
    // Only expand if we are really close to top (< 50px)
    else if (currentScrollY < 50) {
      header.classList.remove("header-scrolled");
    }
    // If between 50px and 100px, stay in current state

    // === hide/show logic ===
    // check if menu is animating or fully open
    const isAnimating = navbarCollapse.classList.contains("collapsing");
    const isOpen = navbarCollapse.classList.contains("show");

    // only hide/show header if menu is fully closed and not moving
    if (!isOpen && !isAnimating) {
      if (currentScrollY > lastScrollY && currentScrollY > 200 && scrollDifference > 5) {
        // scrolling down: hide header
        header.classList.add("header-hidden");
      } else if (currentScrollY < lastScrollY || currentScrollY < 50) {
        // scrolling up or at top: show header
        header.classList.remove("header-hidden");
      }
    }

    // update last scroll position
    lastScrollY = currentScrollY;
  });

  // === MAP LOGIC ===
  // initialize map if div 'map' exist (in index.html and narratives)
  if (document.getElementById('map')) {
    initializeMuseumMap();
  }

  // === THEME LOGIC ===
  const defaultTheme = "70s-punk";
  let activeTheme = localStorage.getItem("activeTheme");

  // add click listeners for dropdown items
  let themeMenuItems = document.querySelectorAll("#theme-menu .dropdown-item");
  themeMenuItems.forEach(function (item) {
    item.addEventListener("click", function (e) {
      e.preventDefault();
      switchTheme(item.dataset.theme);
    });
  });

  // apply the active theme or default
  switchTheme(activeTheme || defaultTheme);

  // === NARRATIVE LOGIC ===
  // add click listeners for dropdown items
  let narrativeMenuItems = document.querySelectorAll("#narrative-menu .dropdown-item");
  narrativeMenuItems.forEach(function (item) {
    item.addEventListener("click", function (e) {
      let narrative = e.target.dataset.narrative;
      localStorage.setItem("activeNarrative", narrative);
      console.log("Narrative '" + narrative + "' selected.");
      window.location.href = "narrative.html";
    });
  });

  // add click listeners for narrative cards
  let narrativeCards = document.querySelectorAll(".path-card");
  narrativeCards.forEach(function (card) {
    card.addEventListener("click", function (e) {
      e.preventDefault(); // avoid default # link behavior
      let narrative = card.dataset.narrativeId;
      localStorage.setItem("activeNarrative", narrative);
      console.log("Narrative from card:", narrative);
      window.location.href = "narrative.html";
    });
  });

  // execute code only in narrative.html
  if (window.location.pathname.endsWith("narrative.html")) {
    // read narrative from localStorage or default to "historical"
    let activeNarrative = localStorage.getItem("activeNarrative") || "historical";
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

        // populate items card
        // load items inside narrative page
        const itemsContainer = document.getElementById("narrative-items");
        itemsContainer.innerHTML = ""; // clear old items

        narrative.items.forEach(itemKey => {
        const item = data.items[itemKey];
        if (!item) return;

        // column wrapper (bootstrap grid)
        const col = document.createElement("div");
        col.className = "col-6 col-md-6 col-lg-4";

        //wrapper (matching your media-shelf pattern)
        const wrapper = document.createElement("div");
        wrapper.className = "path-card-wrapper h-100"; // you can style this if you want

        // create card
        const card = document.createElement("a");
        card.href = "item.html#" + itemKey;
        card.className = "card card-dynamic h-100 border-0 shadow-sm text-decoration-none text-dark";

        // image
        const img = document.createElement("img");
        img.src = item.image || "https://placehold.co/400x400/png";
        img.alt = item.title || "Placeholder image";
        img.className = "card-img-top";

        // card body
        const body = document.createElement("div");
        body.className = "card-body";

        const title = document.createElement("h5");
        title.className = "card-title fw-bold";
        title.textContent = item.title;

        // append items
        body.appendChild(title);
        card.appendChild(img);
        card.appendChild(body);

        wrapper.appendChild(card);
        col.appendChild(wrapper);
        itemsContainer.appendChild(col);
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

          // update title
          // We select ALL elements with the class .item-title-target
          var titles = document.querySelectorAll(".item-title-target");

          // Loop through them and update the text for both Mobile and Desktop versions
          titles.forEach(function(element) {
             element.textContent = item.title;
          });

          // update image
          var img = document.getElementById("item-image");
          if (item.image && item.image.trim() !== "") {
            img.src = item.image; // from JSON: e.g. "img/items/apple.jpg"
            img.alt = item.title || "Item image";
          } else {
            // fallback placeholder if no image found
            img.src = "https://placehold.co/400x400/png";
            img.alt = "Placeholder image";
          }

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

          // === METADATA POPULATION ===
          const metadata = item.metadata || {};
          const metadataTableBody = document.getElementById("metadata-table-body");

          // set global RDF attributes on the tbody
          metadataTableBody.setAttribute("xmlns:dcterms", "http://purl.org/dc/terms/");
          metadataTableBody.setAttribute("about", `https://metamuses.github.io/vwvw/item.html#${activeItem}`);

          // clear previous metadata content
          metadataTableBody.innerHTML = "";

          // iterate over the metadata object and create table rows
          Object.entries(metadata).forEach(([key, value]) => {
            // if this is the "narratives" key, we only want the ones that aren't active
            let displayValue = value;
            if (key === "narratives") {
              displayValue = value.filter((n) => n !== activeNarrative);
            }

            // assign data-key attribute with metadata key (e.g. title) to the table row
            const tr = document.createElement("tr");
            tr.setAttribute("data-key", key);

            // create table header, using custom label for narratives and capitalization for others
            const th = document.createElement("th");
            th.style.width = "35%";

            if (key === "narratives") {
              th.textContent = "Other collections";
            } else {
              th.textContent = key.charAt(0).toUpperCase() + key.slice(1);
            }

            // create table data cell
            const td = document.createElement("td");
            td.style.width = "65%";

            // for other narratives, create links to switch narrative
            if (key === "narratives") {
              displayValue.forEach((narrKey, index) => {
                const link = document.createElement("a");
                link.href = "#";
                link.classList.add("text-decoration-none");

                link.textContent = data.narratives[narrKey].title;
                link.addEventListener("click", (e) => {
                  e.preventDefault();
                  localStorage.setItem("activeNarrative", narrKey);
                  activeNarrative = narrKey;
                  console.log("Active narrative: " + activeNarrative);
                  loadItem();
                });

                td.appendChild(link);

                if (index < displayValue.length - 1) {
                  td.appendChild(document.createTextNode(", "));
                }
              });
            } else {
              // for all other metadata fields, create a span with RDF property
              const span = document.createElement("span");

              // map specific keys to dcterms properties
              const propertyMap = {
                title: "dcterms:title",
                creator: "dcterms:creator",
                date: "dcterms:date",
                source: "dcterms:source",
              };

              // assign property attribute if applicable
              if (propertyMap[key]) {
                span.setAttribute("property", propertyMap[key]);
              }

              // set text content and append to td, handling arrays
              span.textContent = Array.isArray(value) ? value.join(", ") : value;
              td.appendChild(span);
            }

            // append th and td to the row, then to the table body
            tr.appendChild(th);
            tr.appendChild(td);
            metadataTableBody.appendChild(tr);
          });

          // === MULTI-AXIS TEXT LOGIC ===
          const btnAdult = document.getElementById("btn-adult");
          const btnKid = document.getElementById("btn-kid");
          const btnIncreaseCompetence = document.getElementById("btn-increase-difficulty"); // keeps old id
          const btnDecreaseCompetence = document.getElementById("btn-decrease-difficulty"); // keeps old id
          const textTitle = document.getElementById("text-title");
          const textContent = document.getElementById("text-content");

          // itemTexts taken from item
          const itemTexts = item.texts || {};

          // load last settings or defaults
          let tone = localStorage.getItem("activeTone") || "kid"; // (kid/adult)
          let competence = localStorage.getItem("activeCompetence") || "amateur"; // (amateur/expert)
          let length = localStorage.getItem("activeLength") || "short"; // (short/long)

          function updateTextDisplay() {
            const key = `${tone}-${competence}-${length}`;
            const value = itemTexts[key] || "No text available for this version.";

            // build inline Read More / Read Less link (recreated each render)
            const readMoreHtml = ` <a href="#" id="btn-toggle-length" class="text-primary text-decoration-none ms-1">${length === "short" ? "Read More" : "Read Less"}</a>`;

            // set title and paragraph (use innerHTML because we need the inline link)
            textTitle.textContent = `${tone.charAt(0).toUpperCase() + tone.slice(1)} Text`;
            textContent.innerHTML = `${value}${readMoreHtml}`;

            // highlight active audience/tone button (only Adult/Kid highlighted)
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

            // show correct competence (difficulty) button
            btnIncreaseCompetence.style.display = competence === "amateur" ? "block" : "none";
            btnDecreaseCompetence.style.display = competence === "expert" ? "block" : "none";

            // attach click handler to newly rendered inline toggle link
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

            // save current state under the renamed keys
            localStorage.setItem("activeTone", tone);
            localStorage.setItem("activeCompetence", competence);
            localStorage.setItem("activeLength", length);
          }

          // button handlers (use renamed vars)
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

          // initialize display on load
          updateTextDisplay();

          // === MEDIA SHELF LOGIC ===
          const mediaShelf = document.getElementById("related-media-shelf");
          mediaShelf.innerHTML = ""; // clear old content

          if (item.media && item.media.length > 0) {
            item.media.forEach((media) => {
              let mediaElement = "";

              if (media.type === "image") {
                mediaElement = `<img src="${media.source}" alt="${media.caption}">`;
              } else if (media.type === "video") {
                mediaElement = `<iframe src="${media.source}" title="${media.caption}" allowfullscreen></iframe>`;
              } else if (media.type === "article") {
                // API call to Microlink to generate a screenshot of the external site
                const previewUrl = `https://api.microlink.io/?url=${encodeURIComponent(media.link)}&screenshot=true&meta=false&embed=screenshot.url`;
                mediaElement = `<img src="${previewUrl}" alt="Preview of ${media.caption}">`;
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

          // scroll arrows
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
