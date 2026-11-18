(() => {
  const sb = window.skadiSb;
  const statusEl = document.querySelector("[data-admin-status]");
  const emailEl = document.querySelector("[data-admin-email]");
  if (!sb) return;

  const setStatus = (msg, isError = false) => {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.classList.toggle("is-error", isError);
  };

  const ensureAdmin = async (user) => {
    const { data, error } = await sb.from("skadi_admins").select("user_id").eq("user_id", user.id).maybeSingle();
    if (error) throw error;
    if (!data) {
      await sb.auth.signOut();
      throw new Error("Esta conta não tem permissão de admin Skadi.");
    }
  };

  const renderImageFields = (sectionId, images) => {
    const wrap = document.querySelector(`[data-images="${sectionId}"]`);
    if (!wrap) return;
    const slots = [0, 1, 2].map((i) => images.find((img) => img.sort_order === i) || { id: null, url: "", alt: "", sort_order: i });

    wrap.innerHTML = slots
      .map(
        (img, i) => `
      <div class="admin-image-card" data-image-slot="${sectionId}-${i}">
        <p class="admin-image-label">Imagem ${i + 1}</p>
        <div class="admin-image-preview">
          ${img.url ? `<img src="${img.url}" alt="" />` : "<span>Sem imagem</span>"}
        </div>
        <input type="hidden" name="image_id_${i}" value="${img.id || ""}" />
        <input type="hidden" name="image_url_${i}" value="${img.url || ""}" />
        <div class="field">
          <label>Alt</label>
          <input type="text" name="image_alt_${i}" value="${(img.alt || "").replace(/"/g, "&quot;")}" />
        </div>
        <div class="field">
          <label>Upload</label>
          <input type="file" name="image_file_${i}" accept="image/*" />
        </div>
      </div>`
      )
      .join("");
  };

  const loadSection = async (sectionId) => {
    const [{ data: section, error: sErr }, { data: images, error: iErr }] = await Promise.all([
      sb.from("skadi_site_sections").select("*").eq("id", sectionId).single(),
      sb.from("skadi_site_images").select("*").eq("section_id", sectionId).order("sort_order"),
    ]);
    if (sErr) throw sErr;
    if (iErr) throw iErr;

    const form = document.querySelector(`[data-section-form="${sectionId}"]`);
    if (!form) return;
    form.title.value = section.title || "";
    form.body.value = section.body || "";
    if (form.note) form.note.value = section.note || "";
    const meta = section.meta || {};
    if (form.project_name) form.project_name.value = meta.project_name || "";
    if (form.project_type) form.project_type.value = meta.project_type || "";
    if (form.project_status) form.project_status.value = meta.project_status || "";
    renderImageFields(sectionId, images || []);
  };

  const uploadIfNeeded = async (sectionId, index, fileInput, currentUrl) => {
    const file = fileInput?.files?.[0];
    if (!file) return { url: currentUrl, storage_path: null };

    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${sectionId}/${index}-${Date.now()}.${ext}`;
    const { error: upErr } = await sb.storage.from("skadi-media").upload(path, file, {
      upsert: true,
      contentType: file.type || "image/jpeg",
    });
    if (upErr) throw upErr;

    const { data } = sb.storage.from("skadi-media").getPublicUrl(path);
    return { url: data.publicUrl, storage_path: path };
  };

  const saveSection = async (sectionId, form) => {
    const payload = {
      title: form.title.value.trim(),
      body: form.body.value.trim(),
      note: form.note ? form.note.value.trim() : "",
      meta:
        sectionId === "projetos"
          ? {
              project_name: form.project_name.value.trim(),
              project_type: form.project_type.value.trim(),
              project_status: form.project_status.value.trim(),
            }
          : {},
      updated_at: new Date().toISOString(),
    };

    const { error: secErr } = await sb.from("skadi_site_sections").update(payload).eq("id", sectionId);
    if (secErr) throw secErr;

    for (let i = 0; i < 3; i += 1) {
      const id = form[`image_id_${i}`].value || null;
      const currentUrl = form[`image_url_${i}`].value || "";
      const alt = form[`image_alt_${i}`].value.trim();
      const fileInput = form[`image_file_${i}`];
      const uploaded = await uploadIfNeeded(sectionId, i, fileInput, currentUrl);
      const row = {
        section_id: sectionId,
        sort_order: i,
        url: uploaded.url,
        alt,
        storage_path: uploaded.storage_path,
        updated_at: new Date().toISOString(),
      };

      if (!row.url) continue;

      if (id) {
        const { error } = await sb.from("skadi_site_images").update(row).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await sb.from("skadi_site_images").insert(row);
        if (error) throw error;
      }
    }
  };

  const boot = async () => {
    const { data: sessionData } = await sb.auth.getSession();
    if (!sessionData.session) {
      window.location.href = "login.html";
      return;
    }

    try {
      await ensureAdmin(sessionData.session.user);
    } catch (err) {
      setStatus(err.message || "Sem permissão.", true);
      window.setTimeout(() => {
        window.location.href = "login.html";
      }, 1200);
      return;
    }

    if (emailEl) emailEl.textContent = sessionData.session.user.email || "";

    document.querySelector("[data-logout]")?.addEventListener("click", async () => {
      await sb.auth.signOut();
      window.location.href = "login.html";
    });

    await Promise.all([loadSection("projetos"), loadSection("quem_somos")]);

    document.querySelectorAll("[data-section-form]").forEach((form) => {
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const sectionId = form.getAttribute("data-section-form");
        setStatus("Salvando…");
        try {
          await saveSection(sectionId, form);
          await loadSection(sectionId);
          setStatus("Salvo com sucesso.");
        } catch (err) {
          setStatus(err.message || "Falha ao salvar.", true);
        }
      });
    });
  };

  boot();
})();
