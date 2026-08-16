(function () {
  const alertBox = document.getElementById('alertBox');
  const submitBtn = document.getElementById('submitBtn');
  const submitText = document.getElementById('submitText');
  const submitSpinner = document.getElementById('submitSpinner');

  function showError(msg) {
    alertBox.textContent = msg;
    alertBox.className = 'alert alert-error show';
  }

  function setLoading(loading) {
    submitBtn.disabled = loading;
    submitSpinner.style.display = loading ? 'inline-block' : 'none';
    submitText.textContent = loading ? 'جارٍ المعالجة...' : submitText.dataset.original;
  }

  function afterAuth(token) {
    localStorage.setItem('cc_token', token);
    const params = new URLSearchParams(window.location.search);
    const next = params.get('next') || '/dashboard.html';
    const pending = sessionStorage.getItem('cc_pending_search');
    if (pending) {
      sessionStorage.removeItem('cc_pending_search');
      window.location.href = `/dashboard.html?${pending}`;
      return;
    }
    window.location.href = next;
  }

  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    submitText.dataset.original = submitText.textContent;
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      alertBox.classList.remove('show');
      setLoading(true);
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: document.getElementById('email').value.trim(),
            password: document.getElementById('password').value,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'تعذر تسجيل الدخول');
        afterAuth(data.token);
      } catch (err) {
        showError(err.message);
        setLoading(false);
      }
    });
  }

  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    submitText.dataset.original = submitText.textContent;
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      alertBox.classList.remove('show');
      setLoading(true);
      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: document.getElementById('name').value.trim(),
            email: document.getElementById('email').value.trim(),
            password: document.getElementById('password').value,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'تعذر إنشاء الحساب');
        afterAuth(data.token);
      } catch (err) {
        showError(err.message);
        setLoading(false);
      }
    });
  }
})();
