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

// on page load logic
document.addEventListener("DOMContentLoaded", function () {
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

    // === DETAILS TEXT LOGIC: Adult / Kid buttons ===
    const btnAdult = document.getElementById("btn-adult");
    const btnKid = document.getElementById("btn-kid");
    const textTitle = document.getElementById("text-title");
    const textContent = document.getElementById("text-content");

    // Check localStorage for last selection
    let lastSelection = localStorage.getItem("textType") || "adult";

    // Function to update text (to be put in JSON!)
    function setText(type) {
      if (type === "adult") {
        textTitle.textContent = "Adult Text";
        textContent.textContent = "This is the adult version of the text. Click Kid to switch.";
      } else if (type === "kid") {
        textTitle.textContent = "Kid Text";
        textContent.textContent = "This is the kid-friendly version of the text. Click Adult to switch.";
      }
      // save selection
      localStorage.setItem("textType", type);
    }

    //Initialize with last selection
    setText(lastSelection);

    //Add click events
    btnAdult?.addEventListener("click", () => setText("adult"));
    btnKid?.addEventListener("click", () => setText("kid"));
  }
});
