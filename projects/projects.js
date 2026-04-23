import { fetchJSON, renderProjects } from "../global.js";

const projectsContainer = document.querySelector(".projects");
const projectsTitle = document.querySelector(".projects-title");

try {
  const projects = await fetchJSON("../lib/projects.json");

  if (projectsTitle) {
    projectsTitle.textContent = `${projects.length} Projects`;
  }

  renderProjects(projects, projectsContainer, "h2");
} catch (error) {
  console.error(error);

  if (projectsContainer) {
    projectsContainer.textContent = "Projects could not be loaded.";
  }
}
