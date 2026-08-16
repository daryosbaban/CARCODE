(function () {
  const token = localStorage.getItem('cc_token');

  // ---- Nav auth area ----
  async function renderNavAuth() {
    const area = document.getElementById('navAuthArea');
    if (!area || !token) return;
    try {
      const res = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('unauthorized');
      const data = await res.json();
      area.innerHTML = `
        <span class="nav-user">مرحباً، ${escapeHtml(data.user.name)}</span>
        <a href="/dashboard.html" class="btn btn-primary">لوحة التحكم</a>
      `;
    } catch {
      localStorage.removeItem('cc_token');
    }
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  renderNavAuth();

  // ---- Search tabs ----
  const tabs = document.querySelectorAll('.search-tab');
  const vinForm = document.getElementById('vinForm');
  const detailsForm = document.getElementById('detailsForm');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      const isVin = tab.dataset.tab === 'vin';
      vinForm.classList.toggle('hidden', !isVin);
      detailsForm.classList.toggle('hidden', isVin);
    });
  });

  // ---- Populate brand/module selects ----
  async function loadMeta() {
    const brandSelect = document.getElementById('brandSelect');
    const moduleSelect = document.getElementById('moduleSelect');
    if (!brandSelect) return;
    try {
      const res = await fetch('/api/search/meta');
      const data = await res.json();
      data.brands.forEach((b) => {
        const opt = document.createElement('option');
        opt.value = b.name;
        opt.textContent = b.name_ar;
        brandSelect.appendChild(opt);
      });
      data.modules.forEach((m) => {
        const opt = document.createElement('option');
        opt.value = m.code;
        opt.textContent = m.name_ar;
        moduleSelect.appendChild(opt);
      });
    } catch (e) {
      console.error('تعذر تحميل بيانات الماركات', e);
    }
  }
  loadMeta();

  function goToDashboard(params) {
    const qs = new URLSearchParams(params).toString();
    if (!token) {
      sessionStorage.setItem('cc_pending_search', qs);
      window.location.href = '/login.html?next=/dashboard.html';
      return;
    }
    window.location.href = `/dashboard.html?${qs}`;
  }

  if (vinForm) {
    vinForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const vin = document.getElementById('vinInput').value.trim();
      if (vin.length !== 17) {
        alert('رقم الهيكل (VIN) يجب أن يتكون من 17 رمزاً');
        return;
      }
      goToDashboard({ vin });
    });
  }

  if (detailsForm) {
    detailsForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const marke = document.getElementById('brandSelect').value;
      const model = document.getElementById('modelInput').value.trim();
      const year = document.getElementById('yearInput').value.trim();
      const mkb = document.getElementById('moduleSelect').value;
      goToDashboard({ marke, model, year, mkb });
    });
  }
})();
