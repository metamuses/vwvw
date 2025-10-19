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
    localStorage.setItem("selectedTheme", themeName);
    console.log("Theme '" + themeName + "' applied.");

    // update dropdown item checkmark
    var items = document.querySelectorAll("#theme-menu .dropdown-item");
    items.forEach(function (item) {
      // remove old checkmark
      var text = item.textContent.replace(/^✓\s*/, "");
      if (item.dataset.theme === themeName) {
        item.textContent = "✓ " + text;
      } else {
        item.textContent = text;
      }
    });
  };

  // insert new css link after the common CSS
  var commonCss = document.querySelector('link[href*="basics.css"]');
  commonCss.parentNode.insertBefore(newLink, commonCss.nextSibling);
}

// on page load, apply the saved theme or the default one
document.addEventListener("DOMContentLoaded", function () {
  var defaultTheme = "70s-punk";
  var savedTheme = localStorage.getItem("selectedTheme");

  // add click listeners for dropdown items
  var items = document.querySelectorAll("#theme-menu .dropdown-item");
  items.forEach(function (item) {
    item.addEventListener("click", function (e) {
      e.preventDefault();
      switchTheme(item.dataset.theme);
    });
  });

  switchTheme(savedTheme || defaultTheme);
});
