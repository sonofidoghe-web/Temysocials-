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
const menuButton = document.querySelector(".menu-button");
const mobileMenu = document.getElementById("mobileMenu");
const closeMenu = document.getElementById("closeMenu");

if (menuButton && mobileMenu) {
  menuButton.addEventListener("click", () => {
    mobileMenu.style.display = "block";
    document.body.style.overflow = "hidden";
  });
}

if (closeMenu && mobileMenu) {
  closeMenu.addEventListener("click", () => {
    mobileMenu.style.display = "none";
    document.body.style.overflow = "";
  });
}
