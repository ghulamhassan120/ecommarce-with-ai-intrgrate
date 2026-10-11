
const promptInput = document.getElementById("prompt");
const charCount = document.getElementById("charCount");
const generateBtn = document.getElementById("generateBtn");
const generateText = document.getElementById("generateText");
const message = document.getElementById("message");

const emptyState = document.getElementById("emptyState");
const websitePreview = document.getElementById("websitePreview");
const codeOutput = document.getElementById("codeOutput");
const resultActions = document.getElementById("resultActions");
const previewSubtitle = document.getElementById("previewSubtitle");

const previewTab = document.getElementById("previewTab");
const codeTab = document.getElementById("codeTab");
const copyBtn = document.getElementById("copyBtn");
const downloadBtn = document.getElementById("downloadBtn");

const projectsList = document.getElementById("projectsList");
const refreshBtn = document.getElementById("refreshBtn");

let currentHTML = "";
let currentProjectId = null;
let activeTab = "preview";

promptInput.addEventListener("input", () => {
  charCount.textContent = `${promptInput.value.length} / 4000`;
});


document.querySelectorAll(".example-btn").forEach((button) => {
  button.addEventListener("click", () => {
    promptInput.value = button.dataset.prompt || "";
    charCount.textContent = `${promptInput.value.length} / 4000`;
    promptInput.focus();
  });
});

function showMessage(text, type = "success") {
  message.textContent = text;
  message.className = `message show ${type}`;
}

function hideMessage() {
  message.textContent = "";
  message.className = "message";
}

function setLoading(loading) {
  generateBtn.disabled = loading;
  generateText.textContent = loading
    ? "Generating your website..."
    : "Generate Website";
}

function displayHTML(html, title = "Generated Website") {
  currentHTML = html;

  emptyState.hidden = true;
  resultActions.hidden = false;

  websitePreview.hidden = true;
  codeOutput.hidden = true;

  websitePreview.srcdoc = html;
  codeOutput.querySelector("code").textContent = html;

  previewSubtitle.textContent = title;

  showTab(activeTab);
}

function showTab(tab) {
  activeTab = tab;

  previewTab.classList.toggle("active", tab === "preview");
  codeTab.classList.toggle("active", tab === "code");

  websitePreview.hidden = tab !== "preview" || !currentHTML;
  codeOutput.hidden = tab !== "code" || !currentHTML;

  previewTab.setAttribute("aria-pressed", String(tab === "preview"));
  codeTab.setAttribute("aria-pressed", String(tab === "code"));
}

previewTab.addEventListener("click", () => showTab("preview"));
codeTab.addEventListener("click", () => showTab("code"));

generateBtn.addEventListener("click", async () => {
  const prompt = promptInput.value.trim();

  if (prompt.length < 10) {
    showMessage("Please enter at least 10 characters in your prompt.", "error");
    promptInput.focus();
    return;
  }

  hideMessage();
  setLoading(true);

  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ prompt })
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Website generation failed.");
    }

    currentProjectId = result.project.id;

    displayHTML(result.html, result.project.title);

    showMessage(
      "Website generated and saved successfully!",
      "success"
    );

    await loadProjects();
  } catch (error) {
    showMessage(error.message || "Something went wrong.", "error");
  } finally {
    setLoading(false);
  }
});

copyBtn.addEventListener("click", async () => {
  if (!currentHTML) return;

  try {
    await navigator.clipboard.writeText(currentHTML);
    copyBtn.textContent = "Copied!";

    setTimeout(() => {
      copyBtn.textContent = "Copy HTML";
    }, 1500);
  } catch {
    showMessage(
      "Copy failed. Please select and copy the HTML from the code tab.",
      "error"
    );
  }
});

downloadBtn.addEventListener("click", () => {
  if (!currentHTML) return;

  const blob = new Blob([currentHTML], {
    type: "text/html;charset=utf-8"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "generated-website.html";

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
});

function createProjectCard(project) {
  const card = document.createElement("article");
  card.className = "project-card";

  const icon = document.createElement("div");
  icon.className = "project-icon";
  icon.textContent = "✦";

  const title = document.createElement("h3");
  title.textContent = project.title || "Untitled Website";

  const prompt = document.createElement("p");
  prompt.textContent = project.prompt || "";

  const button = document.createElement("button");
  button.className = "secondary-btn";
  button.textContent = "Open Project";

  button.addEventListener("click", async () => {
    button.disabled = true;
    button.textContent = "Loading...";

    try {
      const response = await fetch(
        `/api/projects/${encodeURIComponent(project.id)}`
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Could not open project.");
      }

      currentProjectId = result.project.id;
      displayHTML(result.project.html_code, result.project.title);

      showMessage("Saved project loaded.", "success");

      document.querySelector(".workspace").scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    } catch (error) {
      showMessage(error.message, "error");
    } finally {
      button.disabled = false;
      button.textContent = "Open Project";
    }
  });

  card.append(icon, title, prompt, button);

  return card;
}

async function loadProjects() {
  projectsList.replaceChildren();

  const placeholder = document.createElement("div");
  placeholder.className = "projects-placeholder";
  placeholder.textContent = "Loading projects...";

  projectsList.appendChild(placeholder);

  try {
    const response = await fetch("/api/projects");
    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Failed to load projects.");
    }

    projectsList.replaceChildren();

    if (!result.projects.length) {
      placeholder.textContent = "No projects yet. Generate your first website!";
      projectsList.appendChild(placeholder);
      return;
    }

    result.projects.forEach((project) => {
      projectsList.appendChild(createProjectCard(project));
    });
  } catch {
    projectsList.replaceChildren();

    placeholder.textContent =
      "Could not load projects. Check your server and Supabase settings.";

    projectsList.appendChild(placeholder);
  }
}

refreshBtn.addEventListener("click", loadProjects);

loadProjects();
