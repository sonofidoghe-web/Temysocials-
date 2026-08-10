/* =====================================================
   GLOBAL THEME SYSTEM
===================================================== */

(function () {

  const savedTheme = localStorage.getItem("temmy-theme");

  if (savedTheme === "dark") {
    document.documentElement.classList.add("dark-theme");
  }

  document.addEventListener("DOMContentLoaded", function () {

    const themeButtons = document.querySelectorAll(
      ".theme-button"
    );

    themeButtons.forEach(function (button) {

      button.addEventListener("click", function () {

        const html = document.documentElement;

        html.classList.toggle("dark-theme");

        if (html.classList.contains("dark-theme")) {
          localStorage.setItem("temmy-theme", "dark");
        } else {
          localStorage.setItem("temmy-theme", "light");
        }

      });

    });

  });

})();
