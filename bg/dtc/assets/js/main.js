function getQueryParams() {
  return new URLSearchParams(window.location.search);
}

// Função para combinar os parâmetros do href original com os parâmetros da URL atual
function combineParams(originalHref, currentParams) {
  let [baseUrl, originalParamsString] = originalHref.split("?");
  let originalParams = new URLSearchParams(originalParamsString || "");

  // Adiciona os parâmetros atuais da URL aos parâmetros originais
  currentParams.forEach((value, key) => {
    // Verifica se o parâmetro já existe para evitar duplicação
    if (!originalParams.has(key)) {
      originalParams.append(key, value);
    }
  });

  // Monta a URL final
  let finalParamsString = originalParams.toString();
  return finalParamsString ? `${baseUrl}?${finalParamsString}` : baseUrl;
}

// Lê um cookie pelo nome (usado para recuperar o clickid do RedTrack)
function getCookie(name) {
  var v = ("; " + document.cookie).split("; " + name + "=");
  return v.length === 2 ? v.pop().split(";").shift() : "";
}

// Adiciona os parâmetros da URL aos links de checkout
document.addEventListener("DOMContentLoaded", function () {
  let buttons = document.querySelectorAll(".area-kits a");
  let currentParams = getQueryParams();

  // subid5 = clickid do RedTrack — parâmetro crítico para casar a venda com o
  // clique. Se a URL não trouxer (navegação interna, macro {clickid} não
  // substituída, etc.), recupera do cookie rtkclickid-store, que persiste
  // entre páginas. Assim subid5 sempre chega ao BuyGoods pela própria URL de
  // checkout, além do caminho via pixel/caller_url.
  let urlSub5 = currentParams.get("subid5");
  if (!urlSub5 || urlSub5.indexOf("{") !== -1) {
    let cid = getCookie("rtkclickid-store");
    if (cid && cid !== "undefined") currentParams.set("subid5", cid);
  }

  buttons.forEach(function (button) {
    let originalHref = button.getAttribute("href");
    button.setAttribute("href", combineParams(originalHref, currentParams));
  });
});

document.querySelectorAll(".accordion .item .header").forEach((header) => {
  header.addEventListener("click", function () {
    const item = this.parentNode;
    if (item.classList.contains("active")) {
      item.classList.remove("active");
    } else {
      document
        .querySelectorAll(".accordion .item")
        .forEach((i) => i.classList.remove("active"));
      item.classList.add("active");
    }
  });
});

// Header scroll effect
window.addEventListener("scroll", function () {
  const header = document.querySelector("header");
  if (window.scrollY > 50) {
    header.classList.add("scrolled");
  } else {
    header.classList.remove("scrolled");
  }
});

// Menu toggle
const menuBtn = document.getElementById("menu");
const mainNav = document.getElementById("mainNav");

if (menuBtn && mainNav) {
  menuBtn.addEventListener("click", function () {
    menuBtn.classList.toggle("active");
    mainNav.classList.toggle("active");
    document.body.style.overflow = mainNav.classList.contains("active")
      ? "hidden"
      : "";
  });

  // Close menu when clicking on links
  document.querySelectorAll("#mainNav a").forEach((link) => {
    link.addEventListener("click", function () {
      menuBtn.classList.remove("active");
      mainNav.classList.remove("active");
      document.body.style.overflow = "";
    });
  });
}

document.getElementById("year").textContent = new Date().getFullYear();
document.getElementById("copyYear").textContent = new Date().getFullYear();
