console.log("IT’S ALIVE!");

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

export async function fetchJSON(url) {
  let response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch JSON from ${url}: ${response.status}`);
  }

  return await response.json();
}

export async function fetchGitHubData(username) {
  return await fetchJSON(`https://api.github.com/users/${username}`);
}

export function renderProjects(projects, containerElement, headingLevel = "h2") {
  if (!containerElement) {
    return;
  }

  let validHeadingLevels = ["h1", "h2", "h3", "h4", "h5", "h6"];
  let heading = validHeadingLevels.includes(headingLevel) ? headingLevel : "h2";

  containerElement.innerHTML = "";

  if (!Array.isArray(projects) || projects.length === 0) {
    let message = document.createElement("p");
    message.textContent = "No projects available.";
    containerElement.appendChild(message);
    return;
  }

  for (let project of projects) {
    let article = document.createElement("article");

    article.innerHTML = `
      <${heading}>${project.title ?? "Untitled project"}</${heading}>
      <img src="${project.image ?? ""}" alt="${project.title ?? "Project image"}">
      <p>${project.description ?? ""}</p>
    `;

    containerElement.appendChild(article);
  }
}

const pages = [
  { url: "", title: "Home" },
  { url: "projects/", title: "Projects" },
  { url: "contact/", title: "Contact" },
  { url: "https://github.com/ishaantibdewal", title: "GitHub" },
  { url: "portfolio.html", title: "Resume" }
];

const BASE_PATH =
  location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? "/"
    : "/dsc106_portfolio/";

let nav = document.createElement("nav");
document.body.prepend(nav);

for (let p of pages) {
  let url = p.url;
  url = !url.startsWith("http") ? BASE_PATH + url : url;

  let link = document.createElement("a");
  link.href = url;
  link.textContent = p.title;

  let currentPath = location.pathname.replace("index.html", "");
  let linkPath = link.pathname.replace("index.html", "");

  if (link.host === location.host && linkPath === currentPath) {
    link.classList.add("current");
  }

  if (link.host !== location.host) {
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  }

  nav.append(link);
}

document.body.insertAdjacentHTML(
  "afterbegin",
  `
    <label class="color-scheme">
      Theme:
      <select>
        <option value="light dark">Automatic</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>
  `
);

let select = document.querySelector(".color-scheme select");
let defaultColorScheme = "light";

function setColorScheme(colorScheme) {
  document.documentElement.style.setProperty("color-scheme", colorScheme);
  select.value = colorScheme;
}

select.addEventListener("input", function (event) {
  let colorScheme = event.target.value;
  setColorScheme(colorScheme);
  localStorage.colorScheme = colorScheme;
});

if ("colorScheme" in localStorage) {
  setColorScheme(localStorage.colorScheme);
} else {
  setColorScheme(defaultColorScheme);
}

let form = document.querySelector("form");

form?.addEventListener("submit", function (event) {
  event.preventDefault();

  let data = new FormData(form);
  let url = form.action + "?";
  let params = [];

  for (let [name, value] of data) {
    params.push(`${name}=${encodeURIComponent(value)}`);
  }

  url += params.join("&");
  location.href = url;
});
