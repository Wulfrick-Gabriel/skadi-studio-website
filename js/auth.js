(() => {
  const sb = window.skadiSb;
  const form = document.querySelector("[data-login-form]");
  const status = document.querySelector("[data-login-status]");
  const signupBtn = document.querySelector("[data-signup]");
  if (!sb || !form || !status) return;

  const setStatus = (msg, isError = false) => {
    status.textContent = msg;
    status.classList.toggle("is-error", isError);
  };

  const redirectIfSession = async () => {
    const { data } = await sb.auth.getSession();
    if (data.session) window.location.href = "admin.html";
  };

  redirectIfSession();

  const credentials = () => {
    const data = new FormData(form);
    return {
      email: String(data.get("email") || "").trim(),
      password: String(data.get("password") || ""),
    };
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const { email, password } = credentials();
    setStatus("Entrando…");
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
      setStatus(error.message, true);
      return;
    }
    window.location.href = "admin.html";
  });

  signupBtn?.addEventListener("click", async () => {
    const { email, password } = credentials();
    if (!email || password.length < 6) {
      setStatus("Informe e-mail e senha com pelo menos 6 caracteres.", true);
      return;
    }
    setStatus("Criando conta…");
    const { data, error } = await sb.auth.signUp({ email, password });
    if (error) {
      setStatus(error.message, true);
      return;
    }
    if (data.session) {
      setStatus("Conta criada. Redirecionando…");
      window.location.href = "admin.html";
      return;
    }
    setStatus("Conta criada. Se o e-mail de confirmação estiver ativo, confirme e depois faça login.");
  });
})();
