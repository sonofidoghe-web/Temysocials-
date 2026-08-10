document.addEventListener("DOMContentLoaded", () => {

  const menuButton =
    document.querySelector(".menu-button");

  const themeButton =
    document.querySelector(".theme-button");


  /*
    MENU BUTTON

    The menu page can be created later.
    The button already responds.
  */
  menuButton.addEventListener("click", () => {
    window.location.href = "menu.html";
  });


  /*
    THEME BUTTON

    This is currently prepared for the
    theme functionality we can build later.
  */
  themeButton.addEventListener("click", () => {
    document.body.classList.toggle("dark-preview");
  });

});
/* =====================================================
   FAQ ACCORDION
===================================================== */

document.querySelectorAll(".faq-question").forEach(function (button) {

  button.addEventListener("click", function () {

    const currentItem = button.closest(".faq-item");

    document.querySelectorAll(".faq-item").forEach(function (item) {

      if (item !== currentItem) {
        item.classList.remove("active");
      }

    });

    currentItem.classList.toggle("active");

  });

});
