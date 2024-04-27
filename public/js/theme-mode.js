function switchTheme() {
  const currentStyle = currentTheme();
  const iconElement = document.getElementById("github-icon");

  if (currentStyle === "light") {
    setTheme("dark");
    if (iconElement) {
      iconElement.setAttribute("class", "octicon");
      iconElement.setAttribute("color", "#f0f6fc");
    }
  } else {
    setTheme("light");
    if (iconElement) {
      iconElement.removeAttribute("color");
      iconElement.removeAttribute("class");
    }
  }
}

function setTheme(style) {
  document.querySelectorAll(".isInitialToggle").forEach((elem) => {
    elem.classList.remove("isInitialToggle");
  });
  document.documentElement.setAttribute("data-color-mode", style);
  const iframe = document.querySelector(".utterances-frame");
  if (iframe) {
    const message = {
      type: "set-theme",
      theme: style == "dark" ? "dark-blue" : "github-light",
    };
    iframe.contentWindow.postMessage(message, "https://utteranc.es");
  }
  localStorage.setItem("data-color-mode", style);
}

function currentTheme() {
  const localStyle = localStorage.getItem("data-color-mode");
  const systemStyle =
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  return localStyle || systemStyle;
}

(() => {
  setTheme(currentTheme());
})();
