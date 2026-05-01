import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";
import { fetchJSON, renderProjects } from "../global.js";

const projectsContainer = document.querySelector(".projects");
const projectsTitle = document.querySelector(".projects-title");
const searchInput = document.querySelector(".searchBar");
const arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
const colors = d3.scaleOrdinal(d3.schemeTableau10);
let query = "";
let selectedYear = null;
let currentYearData = [];

function getYearData(projects) {
  let rolledData = d3.rollups(
    projects,
    (v) => v.length,
    (d) => d.year,
  );

  return rolledData.map(([year, count]) => {
    return { value: count, label: year };
  });
}

function updateSelection(projects) {
  let searchFilteredProjects = filterProjects(projects);
  let visibleProjects =
    selectedYear === null
      ? searchFilteredProjects
      : searchFilteredProjects.filter((project) => project.year === selectedYear);
  let visibleProjectSet = new Set(visibleProjects);

  d3.select("#projects-plot")
    .selectAll("path")
    .attr("class", (d) => (d.data.label === selectedYear ? "selected" : null));

  d3.select(".legend")
    .selectAll("li")
    .attr("class", (d) => (d.label === selectedYear ? "legend-item selected" : "legend-item"));

  if (projectsTitle) {
    projectsTitle.textContent = `${visibleProjects.length} Projects`;
  }

  projectsContainer?.querySelectorAll("article").forEach((article, idx) => {
    article.hidden = !visibleProjectSet.has(projects[idx]);
  });
}

function renderPieChart(data, projects) {
  currentYearData = data;

  let sliceGenerator = d3.pie().value((d) => d.value);
  let arcData = sliceGenerator(data);
  let svg = d3.select("#projects-plot");
  let legend = d3.select(".legend");

  svg
    .selectAll("path")
    .data(arcData, (d) => d.data.label)
    .join("path")
    .attr("d", (d) => arcGenerator(d))
    .attr("fill", (_, idx) => colors(idx))
    .attr("class", (d) => (d.data.label === selectedYear ? "selected" : null))
    .on("click", (_, d) => {
      selectedYear = selectedYear === d.data.label ? null : d.data.label;
      updateSelection(projects);
    });

  legend
    .selectAll("li")
    .data(data, (d) => d.label)
    .join("li")
    .attr("style", (_, idx) => `--color:${colors(idx)}`)
    .attr("class", (d) => (d.label === selectedYear ? "legend-item selected" : "legend-item"))
    .on("click", (_, d) => {
      selectedYear = selectedYear === d.label ? null : d.label;
      updateSelection(projects);
    })
    .html((d) => `<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`);
}

function filterProjects(projects) {
  return projects.filter((project) => {
    let values = Object.values(project).join("\n").toLowerCase();
    return values.includes(query.toLowerCase());
  });
}

function renderFilteredProjects(projects) {
  let searchFilteredProjects = filterProjects(projects);
  let data = getYearData(searchFilteredProjects);

  renderPieChart(data, projects);
  updateSelection(projects);
}

try {
  const projects = await fetchJSON("../lib/projects.json");

  renderProjects(projects, projectsContainer, "h2");

  searchInput?.addEventListener("input", (event) => {
    query = event.target.value;
    renderFilteredProjects(projects);
  });

  renderFilteredProjects(projects);
} catch (error) {
  console.error(error);

  if (projectsContainer) {
    projectsContainer.textContent = "Projects could not be loaded.";
  }
}
