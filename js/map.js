export async function initializeMuseumMap() {
  try {
    // load JSON data
    const response = await fetch("data/data.json");
    const data = await response.json();
    const items = data.items;

    // dimensioni reali immagine
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
        // DESKTOP → mostra tutta l’immagine
        map.fitBounds(mapBounds, { padding: [0, 0] });
        map.setMaxBounds(mapBounds);
      } else {
        // MOBILE → mostra il centro dentro al quadrato
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

    // 1) When map is ready
    map.whenReady(() => {
      requestAnimationFrame(() => {
        forceProperLayout();
        // extra nudge, equivalent to what happens on viewport resize
        setTimeout(() => {
          map.invalidateSize(true);
        }, 200);
      });
    });

    // 2) When overlay image loads (covers slow image / cache edge cases)
    image.once("load", () => {
      requestAnimationFrame(() => {
        forceProperLayout();
      });
    });

    // 3) As a last fallback, after full window load
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
          sticky: true,
          direction: "auto",
          className: "item-custom-tooltip",
          offset: [0, -10],
          opacity: 1
        });

      marker.itemId = itemId;

      // Mobile: gestisce tap singolo e doppio tap
      let lastTap = 0;
      const isMobile = window.innerWidth <= 768;

      marker.on('click', () => {
        if (!isMobile) {
          window.location.href = `item.html#${itemId}`;
          return;
        }
        const now = Date.now();
        if (now - lastTap < 300) {
          // doppio tap → redirect
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

    // --- 3. on card hover the path lights up ---
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
