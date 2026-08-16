(function () {
  const token = localStorage.getItem('cc_token');
  if (!token) {
    window.location.href = '/login.html?next=/dashboard.html';
    return;
  }

  const authHeaders = { Authorization: `Bearer ${token}` };
  const severityLabel = { high: 'خطورة عالية', medium: 'خطورة متوسطة', low: 'خطورة منخفضة' };

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  async function init() {
    try {
      const res = await fetch('/api/auth/me', { headers: authHeaders });
      if (!res.ok) throw new Error('unauthorized');
      const data = await res.json();
      document.getElementById('userGreeting').textContent = `مرحباً، ${data.user.name}`;
    } catch {
      localStorage.removeItem('cc_token');
      window.location.href = '/login.html?next=/dashboard.html';
      return;
    }

    await loadMeta();
    setupTabs();
    setupForms();
    loadHistory();

    const params = new URLSearchParams(window.location.search);
    if ([...params.keys()].length > 0) {
      if (params.get('vin')) {
        document.getElementById('vinInput').value = params.get('vin');
      }
      if (params.get('marke') || params.get('model') || params.get('year') || params.get('mkb')) {
        activateTab('details');
        if (params.get('marke')) document.getElementById('brandSelect').value = params.get('marke');
        if (params.get('model')) document.getElementById('modelInput').value = params.get('model');
        if (params.get('year')) document.getElementById('yearInput').value = params.get('year');
        if (params.get('mkb')) document.getElementById('moduleSelect').value = params.get('mkb');
      }
      runSearch(Object.fromEntries(params.entries()));
    }
  }

  async function loadMeta() {
    const brandSelect = document.getElementById('brandSelect');
    const moduleSelect = document.getElementById('moduleSelect');
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
  }

  function activateTab(name) {
    document.querySelectorAll('.search-tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === name));
    document.getElementById('vinForm').classList.toggle('hidden', name !== 'vin');
    document.getElementById('detailsForm').classList.toggle('hidden', name !== 'details');
    document.getElementById('codeForm').classList.toggle('hidden', name !== 'code');
  }

  function setupTabs() {
    document.querySelectorAll('.search-tab').forEach((tab) => {
      tab.addEventListener('click', () => activateTab(tab.dataset.tab));
    });
  }

  function setupForms() {
    document.getElementById('vinForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const vin = document.getElementById('vinInput').value.trim();
      if (vin.length !== 17) {
        alert('رقم الهيكل (VIN) يجب أن يتكون من 17 رمزاً');
        return;
      }
      runSearch({ vin });
    });

    document.getElementById('detailsForm').addEventListener('submit', (e) => {
      e.preventDefault();
      runSearch({
        marke: document.getElementById('brandSelect').value,
        model: document.getElementById('modelInput').value.trim(),
        year: document.getElementById('yearInput').value.trim(),
        mkb: document.getElementById('moduleSelect').value,
      });
    });

    document.getElementById('codeForm').addEventListener('submit', (e) => {
      e.preventDefault();
      runSearch({ q: document.getElementById('qInput').value.trim() });
    });

    document.getElementById('logoutBtn').addEventListener('click', async () => {
      await fetch('/api/auth/logout', { method: 'POST' });
      localStorage.removeItem('cc_token');
      window.location.href = '/';
    });
  }

  async function runSearch(params) {
    const container = document.getElementById('resultsContainer');
    const countEl = document.getElementById('resultsCount');
    countEl.textContent = 'جارٍ البحث...';

    const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null));
    const qs = new URLSearchParams(clean).toString();

    try {
      const res = await fetch(`/api/search?${qs}`, { headers: authHeaders });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'حدث خطأ أثناء البحث');

      countEl.textContent = `تم العثور على ${data.count} نتيجة`;

      if (data.count === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="icon">🚫</div>
            <div>لا توجد نتائج مطابقة. جرّب تعديل معايير البحث.</div>
          </div>`;
        return;
      }

      container.innerHTML = `<div class="code-list">${data.results.map(renderCodeItem).join('')}</div>`;
      loadHistory();
    } catch (err) {
      countEl.textContent = '';
      container.innerHTML = `
        <div class="empty-state">
          <div class="icon">⚠️</div>
          <div>${escapeHtml(err.message)}</div>
        </div>`;
    }
  }

  function renderCodeItem(item) {
    const sev = item.severity || 'low';
    return `
      <div class="code-item">
        <div class="code-badge">${escapeHtml(item.code)}</div>
        <div class="code-body">
          <h4>${escapeHtml(item.title_ar)}</h4>
          <p>${escapeHtml(item.description_ar)}</p>
          <div class="code-tags">
            <span class="tag">${escapeHtml(item.module_name_ar)}</span>
            ${item.brand_ar ? `<span class="tag">${escapeHtml(item.brand_ar)}</span>` : ''}
            <span class="tag sev-${sev}">${severityLabel[sev] || sev}</span>
          </div>
        </div>
      </div>`;
  }

  async function loadHistory() {
    const container = document.getElementById('historyContainer');
    try {
      const res = await fetch('/api/search/history', { headers: authHeaders });
      const data = await res.json();
      if (!data.history || data.history.length === 0) {
        container.innerHTML = `<div class="empty-state"><div>لا يوجد سجل بحث حتى الآن.</div></div>`;
        return;
      }
      container.innerHTML = `<div class="code-list">${data.history
        .map((h) => {
          const q = JSON.parse(h.query || '{}');
          const parts = Object.entries(q)
            .filter(([, v]) => v)
            .map(([k, v]) => `${k}: ${v}`)
            .join(' • ');
          return `
            <div class="code-item" style="grid-template-columns: 1fr auto;">
              <div class="code-body"><p style="margin:0;">${escapeHtml(parts || 'بحث عام')}</p></div>
              <div class="tag">${escapeHtml(new Date(h.created_at).toLocaleString('ar'))}</div>
            </div>`;
        })
        .join('')}</div>`;
    } catch {
      container.innerHTML = `<div class="empty-state"><div>تعذر تحميل سجل البحث.</div></div>`;
    }
  }

  init();
})();
