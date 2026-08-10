document.addEventListener("DOMContentLoaded", function () {

  const themeButtons = document.querySelectorAll(
    ".theme-button, .mobile-theme-button"
  );

  const savedTheme = localStorage.getItem("temy-theme");

  if (savedTheme === "dark") {
    document.documentElement.classList.add("dark-theme");
    document.body.classList.add("dark-theme");
  }

  themeButtons.forEach(function (button) {

    button.addEventListener("click", function () {

      const isDark =
        document.documentElement.classList.toggle("dark-theme");

      document.body.classList.toggle("dark-theme", isDark);

      localStorage.setItem(
        "temy-theme",
        isDark ? "dark" : "light"
      );

    });

  });

});
