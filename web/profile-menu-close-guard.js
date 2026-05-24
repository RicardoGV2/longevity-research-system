(() => {
  let userOpenedMenu = false;

  function closeProfileMenu() {
    const popover = document.getElementById("profilePopover");
    const button = document.getElementById("profileMenuButton");
    const backdrop = document.getElementById("profileMenuBackdrop");
    if (popover) popover.hidden = true;
    if (button) button.setAttribute("aria-expanded", "false");
    if (backdrop) backdrop.hidden = true;
  }

  document.addEventListener("click", (event) => {
    if (event.target.closest?.("#profileMenuButton")) userOpenedMenu = true;
  }, true);

  function closeAfterReloadOnly() {
    if (!userOpenedMenu) closeProfileMenu();
  }

  closeAfterReloadOnly();
  document.addEventListener("DOMContentLoaded", () => {
    [0, 100, 350, 900, 1600, 2600].forEach((delay) => {
      window.setTimeout(closeAfterReloadOnly, delay);
    });
  });
})();
