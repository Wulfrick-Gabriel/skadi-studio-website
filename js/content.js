(() => {
  const sb = window.skadiSb;
  if (!sb) return;

  const setText = (selector, value) => {
    const el = document.querySelector(selector);
    if (el && typeof value === "string") el.textContent = value;
  };

  const renderImages = (containerSelector, images) => {
    const root = document.querySelector(containerSelector);
    if (!root || !Array.isArray(images) || images.length === 0) return;

    root.innerHTML = images
      .map(
        (img) => `
      <figure class="${root.classList.contains("project-gallery") ? "project-shot" : "about-photo"}">
        <img src="${img.url}" alt="${img.alt || ""}" loading="lazy" width="800" height="1100" />
      </figure>`
      )
      .join("");
  };

  const load = async () => {
    const [{ data: sections, error: secErr }, { data: images, error: imgErr }] = await Promise.all([
      sb.from("skadi_site_sections").select("*"),
      sb.from("skadi_site_images").select("*").order("sort_order", { ascending: true }),
    ]);

    if (secErr || imgErr) {
      console.warn("Conteúdo remoto indisponível; mantendo fallback local.", secErr || imgErr);
      return;
    }

    const byId = Object.fromEntries((sections || []).map((s) => [s.id, s]));
    const imgsBySection = (sectionId) =>
      (images || []).filter((i) => i.section_id === sectionId).sort((a, b) => a.sort_order - b.sort_order);

    const projetos = byId.projetos;
    if (projetos) {
      setText("[data-content='projetos.title']", projetos.title);
      setText("[data-content='projetos.body']", projetos.body);
      const meta = projetos.meta || {};
      setText("[data-content='projetos.meta.project_name']", meta.project_name || "");
      setText("[data-content='projetos.meta.project_type']", meta.project_type || "");
      setText("[data-content='projetos.meta.project_status']", meta.project_status || "");
      renderImages("[data-gallery='projetos']", imgsBySection("projetos"));
    }

    const quem = byId.quem_somos;
    if (quem) {
      setText("[data-content='quem_somos.title']", quem.title);
      setText("[data-content='quem_somos.body']", quem.body);
      setText("[data-content='quem_somos.note']", quem.note);
      renderImages("[data-gallery='quem_somos']", imgsBySection("quem_somos"));
    }
  };

  load();
})();
