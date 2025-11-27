export function switchTheme(themeName) {
  // find the old link tag if it exists
  const oldLink = document.getElementById("theme-css");

  // create new link element for the selected theme
  const newLink = document.createElement("link");
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
    const items = document.querySelectorAll("#theme-menu .dropdown-item");
    items.forEach(function (item) {
      if (item.dataset.theme === themeName) {
        item.style.fontWeight = "bold";
      } else {
        item.style.fontWeight = "normal";
      }
    });
  };

  // insert new css link after the common CSS
  const commonCss = document.querySelector('link[href*="basics.css"]');
  if (commonCss && commonCss.parentNode) {
    commonCss.parentNode.insertBefore(newLink, commonCss.nextSibling);
  }
}

export function initTheme() {
  const defaultTheme = "70s-punk";
  const activeTheme = localStorage.getItem("activeTheme");

  // add click listeners for dropdown items
  const themeMenuItems = document.querySelectorAll("#theme-menu .dropdown-item");
  themeMenuItems.forEach(function (item) {
    item.addEventListener("click", function (e) {
      e.preventDefault();
      switchTheme(item.dataset.theme);
    });
  });

  switchTheme(activeTheme || defaultTheme);
}
