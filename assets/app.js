(() => {
  'use strict';

  const SCHOOL_LOGO_URL = 'https://i.postimg.cc/k4TFzHPQ/Screenshot-2026-06-16-150410.png';

  const root = document.getElementById('app-root');
  const state = {
    token: sessionStorage.getItem('officialDocToken') || '',
    user: null,
    actionDocs: [],
    inboxDocs: [],
    allDocs: [],
    tab: 'action',
    currentDoc: null,
    originalPdfBase64: '',
    currentPdf: null,
    currentPageNumber: 1,
    currentScale: 1.3,
    selectedStamp: null,
    stampInteractionMode: 'move',
    allUsers: [],
  };

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function pixelTextMarkup(text) {
    return [...String(text || '')]
      .map((character, index) => `<span class="pixel-letter" style="--pixel-index:${index}">${character === ' ' ? '&nbsp;' : escapeHtml(character)}</span>`)
      .join('');
  }

  function operationBadge(operationMode) {
    if (operationMode === 'รักษาการ') {
      return '<span class="operation-badge operation-acting">รักษาการ</span>';
    }
    if (operationMode === 'ผู้อำนวยการดำเนินงาน') {
      return '<span class="operation-badge operation-director">ผู้อำนวยการดำเนินงาน</span>';
    }
    return '';
  }

  function gasCall(functionName, ...args) {
    return new Promise((resolve, reject) => {
      if (!window.google || !google.script || !google.script.run) {
        reject(new Error('หน้านี้ต้องเปิดผ่านลิงก์ Google Apps Script Web App'));
        return;
      }
      const runner = google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler((error) => reject(new Error(error && error.message ? error.message : String(error))));
      runner[functionName](...args);
    });
  }

  function loading(title, text = '') {
    Swal.fire({ title, text, allowOutsideClick: false, didOpen: () => Swal.showLoading() });
  }

  function showError(error) {
    const message = error && error.message ? error.message : String(error || 'เกิดข้อผิดพลาด');
    Swal.fire('เกิดข้อผิดพลาด', message, 'error');
    if (/เซสชันหมดอายุ|เข้าสู่ระบบใหม่/i.test(message)) clearSession();
  }

  function clearSession() {
    state.token = '';
    state.user = null;
    sessionStorage.removeItem('officialDocToken');
    renderLogin();
  }

  function renderLogin() {
    root.innerHTML = `
      <div class="min-h-screen flex items-center justify-center p-5 bg-gradient-to-br from-red-50 via-amber-50 to-yellow-100">
        <div class="card w-full max-w-md p-8">
          <div class="text-center mb-7">
            <div class="login-logo-wrap"><img class="brand-logo login" src="${SCHOOL_LOGO_URL}" alt="โลโก้โรงเรียน"></div>
            <h1 class="text-2xl font-bold text-red-800 mt-4">${escapeHtml(window.APP_BOOTSTRAP?.name || 'ระบบสารบรรณ')}</h1>
            <p class="text-amber-900/80 mt-1">เข้าสู่ระบบด้วยผู้ใช้ที่กำหนดใน Google Sheet</p>
          </div>
          <form id="login-form" class="space-y-4">
            <div><label class="font-semibold text-sm text-slate-700">ชื่อผู้ใช้</label><input id="login-username" class="input mt-1" autocomplete="username" required></div>
            <div><label class="font-semibold text-sm text-slate-700">รหัสผ่าน</label><input id="login-password" type="password" class="input mt-1" autocomplete="current-password" required></div>
            <button class="btn btn-primary w-full py-3" type="submit">เข้าสู่ระบบ</button>
          </form>
          <p class="text-xs text-slate-400 text-center mt-6">เวอร์ชัน ${escapeHtml(window.APP_BOOTSTRAP?.version || '')}</p>
        </div>
      </div>`;
    document.getElementById('login-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      loading('กำลังตรวจสอบ...');
      try {
        const result = await gasCall('login', document.getElementById('login-username').value, document.getElementById('login-password').value);
        if (!result.success) {
          Swal.fire('เข้าสู่ระบบไม่สำเร็จ', result.message || 'ข้อมูลไม่ถูกต้อง', 'error');
          return;
        }
        state.token = result.token;
        state.user = result.user;
        sessionStorage.setItem('officialDocToken', state.token);
        state.tab = state.user.role === 'ครู' ? 'inbox' : 'action';
        await loadDashboard();
        Swal.close();
      } catch (error) { showError(error); }
    });
  }

  async function bootstrap() {
    if (!state.token) {
      renderLogin();
      return;
    }
    loading('กำลังเปิดระบบ...');
    try {
      const result = await gasCall('getSessionInfo', state.token);
      state.user = result.user;
      state.tab = state.user.role === 'ครู' ? 'inbox' : 'action';
      await loadDashboard();
      Swal.close();
    } catch (error) {
      clearSession();
      Swal.close();
    }
  }

  async function loadDashboard() {
    const result = await gasCall('getDashboardDocuments', state.token);
    state.actionDocs = result.actionDocs || [];
    state.inboxDocs = result.inboxDocs || [];
    state.allDocs = result.allDocs || [];
    state.user = result.user || state.user;
    renderDashboard();
  }

  function renderDashboard() {
    const isTeacher = state.user.role === 'ครู';
    root.innerHTML = `
      <div class="app-shell">
        <header class="topbar">
          <div class="max-w-7xl mx-auto px-4 py-3 flex justify-between gap-4 items-center">
            <div class="brand-mark"><img class="brand-logo" src="${SCHOOL_LOGO_URL}" alt="โลโก้โรงเรียน"><div><div class="brand-title-main text-lg">ทะเบียนหนังสือโรงเรียนวัดแม่กะ</div><div class="brand-title-sub pixel-build" aria-label="Watmaeka school">${pixelTextMarkup('Watmaeka school')}</div></div></div>
            <div class="flex items-center gap-3">
              <div class="text-right hidden sm:block"><div class="font-semibold">${escapeHtml(state.user.name)}</div><div class="text-xs text-amber-100">${escapeHtml(state.user.role)}</div></div>
              <button id="download-center-btn" class="btn bg-white/15 text-white">⬇ ดาวน์โหลด</button>
              <button id="logout-btn" class="btn bg-red-950/40 text-white">ออกจากระบบ</button>
            </div>
          </div>
        </header>
        <main class="max-w-7xl mx-auto px-4 py-6">
          <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div class="flex flex-wrap gap-2">
              ${!isTeacher ? '<button id="upload-btn" class="btn btn-success">＋ นำเข้าหนังสือใหม่</button>' : ''}
              <button id="refresh-btn" class="btn btn-muted">↻ รีเฟรช</button>
            </div>
            <div class="flex gap-2 items-center">
              <input id="search-input" class="input w-64 max-w-full" placeholder="ค้นหาเลขรับ เรื่อง หรือผู้ส่ง">
              <select id="doc-filter" class="input w-auto">
                <option value="all">ทั้งหมด</option>
                <option value="unread">ยังไม่รับทราบ</option>
                <option value="read">รับทราบแล้ว</option>
                <option value="incomplete">รับทราบยังไม่ครบ</option>
                <option value="complete">รับทราบครบ</option>
              </select>
            </div>
          </div>
          <div class="flex gap-2 mb-4 overflow-auto pb-1">
            ${!isTeacher ? `<button class="tab-button ${state.tab === 'action' ? 'active' : ''}" data-tab="action">งานรอดำเนินการ (${state.actionDocs.length})</button>` : ''}
            <button class="tab-button ${state.tab === 'inbox' ? 'active' : ''}" data-tab="inbox">จดหมายเข้า (${state.inboxDocs.length})</button>
            ${!isTeacher ? `<button class="tab-button ${state.tab === 'all' ? 'active' : ''}" data-tab="all">จดหมายทั้งหมด (${state.allDocs.length})</button>` : ''}
          </div>
          <div class="card table-wrap"><table class="data-table"><thead><tr><th>เลขรับ</th><th>จาก</th><th>เรื่อง</th><th>สถานะ</th><th>การจัดการ</th></tr></thead><tbody id="document-tbody"></tbody></table></div>
        </main>
      </div>`;

    document.getElementById('logout-btn').onclick = async () => {
      try { await gasCall('logout', state.token); } catch (_) {}
      clearSession();
    };
    document.getElementById('refresh-btn').onclick = async () => {
      loading('กำลังรีเฟรช...');
      try { await loadDashboard(); Swal.close(); } catch (error) { showError(error); }
    };
    document.getElementById('download-center-btn').onclick = openDownloadCenter;
    const uploadBtn = document.getElementById('upload-btn');
    if (uploadBtn) uploadBtn.onclick = openUploadModal;
    document.querySelectorAll('[data-tab]').forEach((button) => {
      button.onclick = () => { state.tab = button.dataset.tab; renderDashboard(); };
    });
    document.getElementById('search-input').addEventListener('input', renderDocumentRows);
    document.getElementById('doc-filter').addEventListener('change', renderDocumentRows);
    renderDocumentRows();
  }

  function currentDocuments() {
    if (state.tab === 'action') return state.actionDocs;
    if (state.tab === 'inbox') return state.inboxDocs;
    return state.allDocs;
  }

  function renderDocumentRows() {
    const tbody = document.getElementById('document-tbody');
    if (!tbody) return;
    const query = (document.getElementById('search-input')?.value || '').trim().toLowerCase();
    const filter = document.getElementById('doc-filter')?.value || 'all';
    let docs = currentDocuments().filter((doc) => {
      const text = `${doc.recvNo} ${doc.subject} ${doc.fromSender} ${doc.status} ${doc.operationMode || ''}`.toLowerCase();
      if (query && !text.includes(query)) return false;
      const ownRecipient = (doc.recipients || []).find((item) => item.userId === state.user.userId);
      if (filter === 'unread') return ownRecipient ? !ownRecipient.acknowledgedAt : doc.ackCount < doc.recipientCount;
      if (filter === 'read') return ownRecipient ? !!ownRecipient.acknowledgedAt : false;
      if (filter === 'incomplete') return doc.recipientCount > 0 && doc.ackCount < doc.recipientCount;
      if (filter === 'complete') return doc.recipientCount > 0 && doc.ackCount === doc.recipientCount;
      return true;
    });
    if (!docs.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center text-slate-500 py-8">ไม่มีเอกสารในรายการนี้</td></tr>';
      return;
    }
    tbody.innerHTML = docs.map((doc) => {
      const isAckComplete = Number(doc.recipientCount || 0) > 0 && Number(doc.ackCount || 0) >= Number(doc.recipientCount || 0);
      const showAckCompletionColor = state.tab === 'inbox' || state.tab === 'all';
      const ackStatusClass = showAckCompletionColor
        ? (isAckComplete ? 'text-green-600 font-bold' : 'text-red-600 font-bold')
        : 'text-slate-600';
      const recipientText = doc.recipientCount
        ? `<button class="text-xs ${ackStatusClass} underline ack-status-btn" data-doc-id="${escapeHtml(doc.docId)}">รับทราบ ${doc.ackCount}/${doc.recipientCount}</button>`
        : '';
      const ownRecipient = (doc.recipients || []).find((item) => item.userId === state.user.userId);
      const ackButton = state.tab === 'inbox' && ownRecipient && !ownRecipient.acknowledgedAt
        ? `<button class="btn btn-success text-xs acknowledge-btn" data-doc-id="${escapeHtml(doc.docId)}">รับทราบ</button>` : '';
      const actionButton = state.tab === 'action'
        ? `<button class="btn btn-primary text-xs action-doc-btn" data-doc-id="${escapeHtml(doc.docId)}">ประทับตรา / จัดการ</button>`
        : `<button class="btn btn-muted text-xs view-doc-btn" data-doc-id="${escapeHtml(doc.docId)}">ดูเอกสาร</button>`;
      return `<tr>
        <td class="font-bold text-slate-700 whitespace-nowrap">${escapeHtml(doc.recvNo)}</td>
        <td class="whitespace-nowrap">${escapeHtml(doc.fromSender)}</td>
        <td><div class="font-semibold">${escapeHtml(doc.subject)}</div><div class="text-xs text-slate-400 mt-1">${escapeHtml(doc.docId)}</div></td>
        <td><div class="flex flex-wrap gap-2 items-center"><span class="badge">${escapeHtml(doc.status)}</span>${operationBadge(doc.operationMode)}</div><div class="mt-2">${recipientText}</div></td>
        <td><div class="flex flex-col gap-2">${actionButton}${ackButton}<button class="btn btn-purple text-xs attachment-btn" data-doc-id="${escapeHtml(doc.docId)}">ไฟล์แนบ (${(doc.attachments || []).length})</button></div></td>
      </tr>`;
    }).join('');

    tbody.querySelectorAll('.action-doc-btn').forEach((button) => button.onclick = () => openWorkspace(button.dataset.docId, true));
    tbody.querySelectorAll('.view-doc-btn').forEach((button) => button.onclick = () => openWorkspace(button.dataset.docId, false));
    tbody.querySelectorAll('.acknowledge-btn').forEach((button) => button.onclick = () => acknowledge(button.dataset.docId));
    tbody.querySelectorAll('.ack-status-btn').forEach((button) => button.onclick = () => showAckStatus(button.dataset.docId));
    tbody.querySelectorAll('.attachment-btn').forEach((button) => button.onclick = () => openAttachments(button.dataset.docId));
  }

  function findDoc(docId) {
    return [...state.actionDocs, ...state.inboxDocs, ...state.allDocs].find((doc) => doc.docId === docId);
  }

  function openUploadModal() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-backdrop';
    overlay.innerHTML = `<div class="modal-panel max-w-md">
      <div class="flex justify-between items-center mb-4"><h2 class="text-xl font-bold">นำเข้าหนังสือรับเรื่องใหม่</h2><button class="text-2xl close-modal">×</button></div>
      <form id="upload-form" class="space-y-4">
        <input type="hidden" name="sessionToken" value="${escapeHtml(state.token)}">
        <div><label class="font-semibold text-sm">ไฟล์ PDF ไม่เกิน 15 MB</label><input class="input mt-1" type="file" name="pdfFile" accept="application/pdf" required></div>
        <div><label class="font-semibold text-sm">จาก</label><input class="input mt-1" name="fromSender" value="สพป.ชม.2" required></div>
        <div><label class="font-semibold text-sm">เรื่อง</label><input class="input mt-1" name="subject" required></div>
        <fieldset class="operation-picker">
          <legend>การดำเนินงาน</legend>
          <label class="operation-option operation-normal"><input type="radio" name="operationMode" value="normal" checked><span><b>1. ปกติ</b><small>ธุรการ → รองผู้อำนวยการ → ผู้อำนวยการ</small></span></label>
          <label class="operation-option operation-acting-option"><input type="radio" name="operationMode" value="acting"><span><b>2. รองรักษาการ</b><small>รองผู้อำนวยการรักษาการแทนผู้อำนวยการ</small></span></label>
          <label class="operation-option operation-director-option"><input type="radio" name="operationMode" value="director"><span><b>3. รองผู้อำนวยการไม่อยู่</b><small>ส่งตรงให้ผู้อำนวยการดำเนินงาน</small></span></label>
        </fieldset>
        <div class="flex justify-end gap-2"><button type="button" class="btn btn-muted close-modal">ยกเลิก</button><button class="btn btn-primary" type="submit">อัปโหลด</button></div>
      </form></div>`;
    document.body.appendChild(overlay);
    overlay.querySelectorAll('.close-modal').forEach((button) => button.onclick = () => overlay.remove());
    overlay.querySelector('#upload-form').onsubmit = async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const selectedMode = form.querySelector('input[name="operationMode"]:checked')?.value || 'normal';
      if (selectedMode !== 'normal') {
        const detail = selectedMode === 'acting'
          ? 'หนังสือจะส่งให้รองผู้อำนวยการในฐานะผู้รักษาการ และเมื่อรองฯ บันทึกแล้วจะกลับไปคิวธุรการโดยไม่ผ่านบัญชีผู้อำนวยการ'
          : 'หนังสือจะข้ามคิวรองผู้อำนวยการและส่งตรงไปยังผู้อำนวยการ';
        const confirmation = await Swal.fire({
          icon: 'warning',
          title: 'ยืนยันรูปแบบการดำเนินงาน',
          text: detail,
          showCancelButton: true,
          confirmButtonText: 'ยืนยัน',
          cancelButtonText: 'กลับไปตรวจสอบ',
          confirmButtonColor: '#b91c1c',
        });
        if (!confirmation.isConfirmed) return;
      }
      loading('กำลังอัปโหลด...', 'บันทึกไฟล์ลง Google Drive');
      try {
        const result = await gasCall('uploadNewDocument', form);
        overlay.remove();
        await loadDashboard();
        Swal.fire('สำเร็จ', `อัปโหลดเรียบร้อย เลขรับ ${result.recvNo}`, 'success');
      } catch (error) { showError(error); }
    };
  }

  async function acknowledge(docId) {
    loading('กำลังบันทึกรับทราบ...');
    try {
      await gasCall('acknowledgeDocument', state.token, docId);
      await loadDashboard();
      Swal.fire('สำเร็จ', 'บันทึกรับทราบเรียบร้อยแล้ว', 'success');
    } catch (error) { showError(error); }
  }

  function showAckStatus(docId) {
    const doc = findDoc(docId);
    const html = (doc.recipients || []).map((item) => `<div class="flex justify-between border-b py-2"><span>${item.acknowledgedAt ? '✅' : '❌'} ${escapeHtml(item.name)}</span><span class="text-xs text-slate-500">${item.acknowledgedAt ? 'รับทราบแล้ว' : 'ยังไม่รับทราบ'}</span></div>`).join('') || '<p>ยังไม่มีผู้รับ</p>';
    Swal.fire({ title: 'สถานะการรับทราบ', html: `<div class="text-left max-h-80 overflow-auto">${html}</div>`, confirmButtonText: 'ปิด' });
  }

  function openAttachments(docId) {
    const doc = findDoc(docId);
    const overlay = document.createElement('div');
    overlay.className = 'modal-backdrop';
    const list = (doc.attachments || []).map((item) => `<button class="download-attachment w-full text-left border rounded-lg p-3 hover:bg-slate-50" data-id="${escapeHtml(item.attachmentId)}"><div class="font-semibold">${escapeHtml(item.filename)}</div><div class="text-xs text-slate-500">โดย ${escapeHtml(item.uploadedBy)}</div></button>`).join('') || '<p class="text-slate-500 text-center py-5">ยังไม่มีไฟล์แนบ</p>';
    overlay.innerHTML = `<div class="modal-panel max-w-lg"><div class="flex justify-between items-center mb-4"><h2 class="text-xl font-bold">ไฟล์แนบ</h2><button class="text-2xl close-modal">×</button></div><div class="space-y-2">${list}</div><hr class="my-5"><form id="attachment-form" class="space-y-3"><input type="hidden" name="sessionToken" value="${escapeHtml(state.token)}"><input type="hidden" name="docId" value="${escapeHtml(docId)}"><input class="input" name="attachmentFile" type="file" required><button class="btn btn-success w-full" type="submit">แนบไฟล์ตอบกลับ</button></form></div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('.close-modal').onclick = () => overlay.remove();
    overlay.querySelectorAll('.download-attachment').forEach((button) => button.onclick = async () => {
      loading('กำลังเตรียมไฟล์...');
      try {
        const result = await gasCall('getAttachmentFile', state.token, button.dataset.id);
        downloadBase64(result.file.base64, result.file.name, result.file.mimeType);
        Swal.close();
      } catch (error) { showError(error); }
    });
    overlay.querySelector('#attachment-form').onsubmit = async (event) => {
      event.preventDefault();
      loading('กำลังอัปโหลดไฟล์แนบ...');
      try {
        await gasCall('uploadAttachment', event.currentTarget);
        overlay.remove();
        await loadDashboard();
        Swal.fire('สำเร็จ', 'แนบไฟล์เรียบร้อยแล้ว', 'success');
      } catch (error) { showError(error); }
    };
  }

  async function openWorkspace(docId, actionMode) {
    const doc = findDoc(docId);
    loading('กำลังโหลด PDF...');
    try {
      const result = await gasCall('getDocumentFile', state.token, docId, true);
      state.currentDoc = { ...doc, ...result.document };
      state.originalPdfBase64 = result.file.base64;
      renderWorkspace(actionMode);
      await loadPdf(state.originalPdfBase64);
      if (state.user.role === 'ธุรการ' && state.currentDoc.status === 'รอธุรการจ่ายเรื่องให้ผู้รับ' && actionMode) {
        await loadDispatchUsers();
      }
      Swal.close();
    } catch (error) { showError(error); }
  }

  function renderWorkspace(actionMode) {
    const doc = state.currentDoc;
    const canStamp = actionMode && ['ธุรการ', 'รองผู้อำนวยการ', 'ผู้อำนวยการ'].includes(state.user.role) && !(state.user.role === 'ธุรการ' && doc.status === 'รอธุรการจ่ายเรื่องให้ผู้รับ');
    const showDispatch = actionMode && state.user.role === 'ธุรการ' && doc.status === 'รอธุรการจ่ายเรื่องให้ผู้รับ';
    const workspace = document.createElement('div');
    workspace.id = 'workspace-view';
    workspace.className = 'workspace';
    workspace.innerHTML = `
      <div class="workspace-toolbar">
        <div class="flex items-center gap-3"><button id="workspace-close" class="btn btn-muted">← กลับ</button><div><div class="font-bold">${escapeHtml(doc.recvNo)} — ${escapeHtml(doc.subject)}</div><div class="text-xs text-slate-400">${escapeHtml(doc.status)}</div></div></div>
        <div class="flex items-center gap-2 flex-wrap">
          <button id="zoom-out" class="btn btn-muted">−</button><span id="zoom-label" class="text-sm min-w-14 text-center">130%</span><button id="zoom-in" class="btn btn-muted">＋</button>
          ${canStamp ? '<button id="save-stamp" class="btn btn-primary">บันทึกและส่งต่อ</button>' : ''}
          <button id="download-current" class="btn btn-success">ดาวน์โหลด PDF</button>
        </div>
      </div>
      <div id="pdf-scroll-area" class="pdf-scroll-area">
        <div class="pdf-stage-wrap"><div id="pdf-container" class="pdf-container"><canvas id="pdf-render-canvas"></canvas>${canStamp ? stampMarkup(state.user.role, doc.recvNo) : ''}</div></div>
        ${showDispatch ? dispatchMarkup() : ''}
      </div>`;
    document.body.appendChild(workspace);
    document.getElementById('workspace-close').onclick = closeWorkspace;
    document.getElementById('download-current').onclick = () => downloadBase64(state.originalPdfBase64, `${doc.recvNo.replace('/', '-')}-${doc.subject}.pdf`, 'application/pdf');
    document.getElementById('zoom-in').onclick = async () => { state.currentScale = Math.min(2.2, state.currentScale + .15); await renderPdfPage(); };
    document.getElementById('zoom-out').onclick = async () => { state.currentScale = Math.max(.7, state.currentScale - .15); await renderPdfPage(); };
    const saveButton = document.getElementById('save-stamp');
    if (saveButton) saveButton.onclick = saveAndStamp;
    if (canStamp) initializeStamps();
    if (showDispatch) initializeDispatch();
  }

  function stampMarkup(role, recvNo) {
    const signature = state.user.signatureDataUrl || '';
    if (role === 'รองผู้อำนวยการ') {
      const actingTitle = state.currentDoc?.operationMode === 'รักษาการ'
        ? '<div style="font-size:9px;font-weight:700">รักษาการแทนผู้อำนวยการโรงเรียนวัดแม่กะ</div>'
        : '';
      return stampWrapper('stamp-deputy', 235, `
        <div style="width:235px;padding:5px;color:#1254c0;font-size:11px;line-height:1.45">
          <div style="font-weight:700;font-size:12px;margin-bottom:4px">เรียน ผู้อำนวยการโรงเรียนวัดแม่กะ</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:4px"><span>เพื่อโปรด</span><label><input type="checkbox" data-meta="ทราบ"> ทราบ</label><label><input type="checkbox" data-meta="พิจารณา"> พิจารณา</label></div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:4px"><label><input type="checkbox" data-meta="เห็นควรมอบ"> เห็นควรมอบ</label><label><input type="checkbox" data-meta="ยุติเรื่อง"> ยุติเรื่อง</label></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px;margin:0 8px 4px"><label><input type="radio" name="deputy-dept" value="วิชาการ"> วิชาการ</label><label><input type="radio" name="deputy-dept" value="บุคคล"> บุคคล</label><label><input type="radio" name="deputy-dept" value="งบประมาณ"> งบประมาณ</label><label><input type="radio" name="deputy-dept" value="ทั่วไป"> ทั่วไป</label></div>
          <textarea class="stamp-textarea" rows="3" placeholder="บันทึกความเห็นเพิ่มเติม"></textarea>
          <div style="text-align:center;margin-top:5px">${signature ? `<img src="${signature}" style="height:32px;max-width:145px;object-fit:contain;margin:auto">` : ''}<div>(${escapeHtml(state.user.name)})</div><div style="font-size:9px">รองผู้อำนวยการโรงเรียนวัดแม่กะ</div>${actingTitle}</div>
        </div>`);
    }
    if (role === 'ผู้อำนวยการ') {
      return stampWrapper('stamp-director', 220, `
        <div style="width:220px;padding:5px;color:#1254c0;font-size:11px;line-height:1.45">
          <div style="display:flex;justify-content:space-around;font-weight:700"><label><input type="checkbox" data-meta="ทราบ"> ทราบ</label><label><input type="checkbox" data-meta="ยุติเรื่อง"> ยุติเรื่อง</label></div>
          <div style="text-align:center;font-weight:700;margin:5px 0"><label><input type="checkbox" data-meta="ดำเนินการตามเสนอ"> ดำเนินการตามเสนอ</label></div>
          <div style="font-weight:700">ข้อสั่งการ</div><textarea class="stamp-textarea" rows="4"></textarea>
          <div style="text-align:center;margin-top:5px">${signature ? `<img src="${signature}" style="height:34px;max-width:145px;object-fit:contain;margin:auto">` : ''}<div>(${escapeHtml(state.user.name)})</div><div style="font-size:9px">ผู้อำนวยการโรงเรียนวัดแม่กะ</div></div>
        </div>`);
    }
    return stampWrapper('stamp-clerk-1', 180, `
      <div style="width:180px;padding:5px;color:#1254c0;font-size:12px;line-height:1.55"><div style="text-align:center;font-weight:700;font-size:14px">โรงเรียนวัดแม่กะ</div><div>เลขรับที่: <b>${escapeHtml(recvNo)}</b></div><div>วันที่: <b>${new Date().toLocaleDateString('th-TH')}</b></div></div>`) +
      stampWrapper('stamp-clerk-2', 245, `
      <div style="width:245px;padding:5px;color:#1254c0;font-size:11px;line-height:1.5"><div>เรียน <b>ผู้อำนวยการโรงเรียนวัดแม่กะ</b></div><textarea class="stamp-textarea" rows="4" placeholder="บันทึกเสนอ"></textarea><div style="text-align:center">${signature ? `<img src="${signature}" style="height:30px;max-width:145px;object-fit:contain;margin:auto">` : ''}<div>(${escapeHtml(state.user.name)})</div></div></div>`);
  }

  function stampWrapper(id, width, content) {
    const top = id.includes('2') ? 170 : id.includes('deputy') ? 250 : id.includes('director') ? 360 : 35;
    return `<div id="${id}" class="draggable-stamp stamp-mode-move" style="left:35px;top:${top}px;width:${width}px" data-base-width="${width}" data-scale="1" data-interaction-mode="move"><div class="stamp-content">${content}</div><span class="stamp-scale-label">100%</span><span class="stamp-mode-label">โหมด: ย้าย</span><span class="stamp-resize-handle" title="ลากเพื่อย่อ/ขยาย"></span></div>`;
  }

  function initializeStamps() {
    const stamps = document.querySelectorAll('.draggable-stamp');
    stamps.forEach((stamp) => {
      const content = stamp.querySelector('.stamp-content');
      const baseWidth = Number(stamp.dataset.baseWidth || stamp.offsetWidth);
      stamp.dataset.interactionMode = stamp.dataset.interactionMode || 'move';
      refreshStampBounds(stamp);
      setStampScale(stamp, Number(stamp.dataset.scale || 1));

      // The signature image can finish decoding after the stamp is displayed.
      // Recalculate the real unscaled height so the selection frame stays
      // attached to the text and signature on phones, tablets, and desktops.
      const images = [...content.querySelectorAll('img')];
      images.forEach((image) => {
        const update = () => {
          refreshStampBounds(stamp);
          setStampScale(stamp, Number(stamp.dataset.scale || 1));
        };
        if (image.complete) {
          if (image.decode) image.decode().catch(() => {}).finally(update);
          else update();
        } else {
          image.addEventListener('load', update, { once: true });
          image.addEventListener('error', update, { once: true });
        }
      });

      if (window.ResizeObserver) {
        const observer = new ResizeObserver(() => {
          refreshStampBounds(stamp);
          setStampScale(stamp, Number(stamp.dataset.scale || 1));
        });
        observer.observe(content);
        stamp._stampResizeObserver = observer;
      }

      let tapStart = null;
      stamp.addEventListener('pointerdown', (event) => {
        selectStamp(stamp);
        if (event.target.closest('input, textarea, label, .stamp-resize-handle')) return;
        tapStart = { x: event.clientX, y: event.clientY };
      });
      stamp.addEventListener('pointerup', (event) => {
        if (!tapStart || event.target.closest('input, textarea, label, .stamp-resize-handle')) {
          tapStart = null;
          return;
        }
        const distance = Math.hypot(event.clientX - tapStart.x, event.clientY - tapStart.y);
        tapStart = null;
        if (distance < 9) openStampToolMenu(stamp);
      });
      stamp.addEventListener('pointercancel', () => { tapStart = null; });
      initResizeHandle(stamp);
    });

    interact('.draggable-stamp').draggable({
      ignoreFrom: '.stamp-resize-handle, input, textarea, label',
      listeners: {
        move(event) {
          const target = event.target;
          selectStamp(target);
          const mode = target.dataset.interactionMode || 'move';
          if (mode === 'resize') {
            const currentScale = Number(target.dataset.scale || 1);
            const baseWidth = Number(target.dataset.baseWidth || 200);
            const delta = (event.dx + event.dy) / 2;
            const nextScale = Math.min(2, Math.max(.5, currentScale + delta / baseWidth));
            setStampScale(target, nextScale);
            return;
          }
          const x = (parseFloat(target.dataset.x) || 0) + event.dx;
          const y = (parseFloat(target.dataset.y) || 0) + event.dy;
          target.dataset.x = x;
          target.dataset.y = y;
          applyStampTransform(target);
        }
      },
      modifiers: [interact.modifiers.restrictRect({ restriction: '#pdf-container', endOnly: true })]
    });
    if (stamps[0]) selectStamp(stamps[0]);
    document.getElementById('pdf-container').addEventListener('pointerdown', (event) => {
      if (!event.target.closest('.draggable-stamp')) selectStamp(null);
    });
  }

  function selectStamp(stamp) {
    document.querySelectorAll('.draggable-stamp').forEach((item) => item.classList.toggle('selected', item === stamp));
    state.selectedStamp = stamp;
  }

  function setStampInteractionMode(stamp, mode) {
    const normalizedMode = mode === 'resize' ? 'resize' : 'move';
    stamp.dataset.interactionMode = normalizedMode;
    stamp.classList.toggle('stamp-mode-move', normalizedMode === 'move');
    stamp.classList.toggle('stamp-mode-resize', normalizedMode === 'resize');
    const label = stamp.querySelector('.stamp-mode-label');
    if (label) label.textContent = normalizedMode === 'resize' ? 'โหมด: ย่อ/ขยาย' : 'โหมด: ย้าย';
    state.stampInteractionMode = normalizedMode;
    selectStamp(stamp);
  }

  function openStampToolMenu(stamp) {
    selectStamp(stamp);
    const oldMenu = document.getElementById('stamp-tool-menu');
    if (oldMenu) oldMenu.remove();
    const overlay = document.createElement('div');
    overlay.id = 'stamp-tool-menu';
    overlay.className = 'stamp-tool-backdrop';
    overlay.innerHTML = `
      <div class="stamp-tool-sheet" role="dialog" aria-modal="true" aria-label="เครื่องมือตราประทับ">
        <div class="stamp-tool-title">เลือกวิธีปรับตราประทับ</div>
        <div class="stamp-tool-help">หลังเลือกแล้ว ให้แตะค้างและลากบนตราประทับ</div>
        <button type="button" class="stamp-tool-option" data-mode="move">
          <span class="stamp-tool-number">1</span>
          <span><b>ย้าย</b><small>ลากตราไปยังตำแหน่งที่ต้องการ</small></span>
        </button>
        <button type="button" class="stamp-tool-option" data-mode="resize">
          <span class="stamp-tool-number">2</span>
          <span><b>ย่อ / ขยาย</b><small>ลากไปทางขวาเพื่อขยาย ลากซ้ายเพื่อย่อ</small></span>
        </button>
        <div class="stamp-quick-resize">
          <button type="button" data-scale-step="-0.1">− ย่อ</button>
          <span>${Math.round(Number(stamp.dataset.scale || 1) * 100)}%</span>
          <button type="button" data-scale-step="0.1">＋ ขยาย</button>
        </div>
        <button type="button" class="stamp-tool-cancel">ปิด</button>
      </div>`;
    document.body.appendChild(overlay);
    const close = () => overlay.remove();
    overlay.addEventListener('pointerdown', (event) => {
      if (event.target === overlay) close();
    });
    overlay.querySelectorAll('[data-mode]').forEach((button) => {
      button.addEventListener('click', () => {
        setStampInteractionMode(stamp, button.dataset.mode);
        close();
        Swal.fire({
          toast: true,
          position: 'bottom',
          timer: 1800,
          showConfirmButton: false,
          icon: 'info',
          title: button.dataset.mode === 'resize' ? 'โหมดย่อ/ขยาย: ลากบนตราเพื่อปรับขนาด' : 'โหมดย้าย: ลากตราไปยังตำแหน่งใหม่'
        });
      });
    });
    overlay.querySelectorAll('[data-scale-step]').forEach((button) => {
      button.addEventListener('click', () => {
        setStampInteractionMode(stamp, 'resize');
        const step = Number(button.dataset.scaleStep || 0);
        setStampScale(stamp, Math.min(2, Math.max(.5, Number(stamp.dataset.scale || 1) + step)));
        const percent = overlay.querySelector('.stamp-quick-resize span');
        if (percent) percent.textContent = `${Math.round(Number(stamp.dataset.scale || 1) * 100)}%`;
      });
    });
    overlay.querySelector('.stamp-tool-cancel').addEventListener('click', close);
  }

  function initResizeHandle(stamp) {
    const handle = stamp.querySelector('.stamp-resize-handle');
    handle.addEventListener('pointerdown', (event) => {
      event.preventDefault(); event.stopPropagation(); selectStamp(stamp);
      const startX = event.clientX;
      const startScale = Number(stamp.dataset.scale || 1);
      const onMove = (moveEvent) => {
        const delta = moveEvent.clientX - startX;
        const baseWidth = Number(stamp.dataset.baseWidth || 200);
        const scale = Math.min(2, Math.max(.5, startScale + delta / baseWidth));
        setStampScale(stamp, scale);
      };
      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    });
  }

  function refreshStampBounds(stamp) {
    const content = stamp.querySelector('.stamp-content');
    if (!content) return;
    const baseWidth = Number(stamp.dataset.baseWidth || content.scrollWidth || 200);
    // scrollHeight is measured before CSS transform, so it represents the
    // true content size and prevents the frame from drifting away.
    const baseHeight = Math.max(1, content.scrollHeight, content.offsetHeight);
    stamp.dataset.baseWidth = String(baseWidth);
    stamp.dataset.baseHeight = String(baseHeight);
  }

  function setStampScale(stamp, scale) {
    stamp.dataset.scale = String(scale);
    const baseWidth = Number(stamp.dataset.baseWidth || 200);
    const baseHeight = Number(stamp.dataset.baseHeight || stamp.querySelector('.stamp-content').scrollHeight || 100);
    stamp.style.width = `${baseWidth * scale}px`;
    stamp.style.height = `${baseHeight * scale}px`;
    stamp.querySelector('.stamp-content').style.transform = `scale(${scale})`;
    stamp.querySelector('.stamp-scale-label').textContent = `${Math.round(scale * 100)}%`;
    applyStampTransform(stamp);
  }

  function applyStampTransform(stamp) {
    const x = parseFloat(stamp.dataset.x) || 0;
    const y = parseFloat(stamp.dataset.y) || 0;
    stamp.style.transform = `translate(${x}px, ${y}px)`;
  }

  async function loadPdf(base64) {
    const bytes = base64ToUint8Array(base64);
    state.currentPdf = await pdfjsLib.getDocument({ data: bytes }).promise;
    state.currentPageNumber = 1;
    await renderPdfPage();
  }

  async function renderPdfPage() {
    const page = await state.currentPdf.getPage(state.currentPageNumber);
    const viewport = page.getViewport({ scale: state.currentScale });
    const canvas = document.getElementById('pdf-render-canvas');
    const context = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const container = document.getElementById('pdf-container');
    container.style.width = `${viewport.width}px`;
    container.style.height = `${viewport.height}px`;
    await page.render({ canvasContext: context, viewport }).promise;
    const label = document.getElementById('zoom-label');
    if (label) label.textContent = `${Math.round(state.currentScale * 100)}%`;
  }

  async function captureStampAtNativeResolution(stamp, captureScale) {
    const originalContent = stamp.querySelector('.stamp-content');
    const clone = originalContent.cloneNode(true);
    const baseWidth = Number(stamp.dataset.baseWidth || originalContent.scrollWidth || 200);

    clone.classList.add('stamp-capture-clone');
    clone.style.transform = 'none';
    clone.style.width = `${baseWidth}px`;
    clone.style.height = 'auto';
    clone.style.position = 'fixed';
    clone.style.left = '-12000px';
    clone.style.top = '0';
    clone.style.zIndex = '-1';
    clone.style.pointerEvents = 'none';
    clone.style.color = '#1254c0';
    clone.style.background = 'transparent';

    const originalInputs = [...originalContent.querySelectorAll('input')];
    const cloneInputs = [...clone.querySelectorAll('input')];
    cloneInputs.forEach((input, index) => {
      const source = originalInputs[index];
      if (!source) return;
      input.checked = source.checked;
      input.value = source.value;
    });

    const originalTextareas = [...originalContent.querySelectorAll('textarea')];
    const cloneTextareas = [...clone.querySelectorAll('textarea')];
    cloneTextareas.forEach((textarea, index) => {
      const source = originalTextareas[index];
      textarea.value = source ? source.value : '';
    });

    document.body.appendChild(clone);
    try {
      const cloneImages = [...clone.querySelectorAll('img')];
      await Promise.all(cloneImages.map((image) => {
        if (image.complete) return image.decode ? image.decode().catch(() => {}) : Promise.resolve();
        return new Promise((resolve) => {
          image.addEventListener('load', resolve, { once: true });
          image.addEventListener('error', resolve, { once: true });
        });
      }));

      // Replace textarea controls with static text before capture. This avoids
      // browser-specific textarea rasterization and keeps Thai text aligned.
      const liveTextareas = [...clone.querySelectorAll('textarea')];
      liveTextareas.forEach((textarea) => {
        const computed = getComputedStyle(textarea);
        const div = document.createElement('div');
        div.className = 'temp-text-div';
        div.textContent = textarea.value || '';
        div.style.width = `${textarea.offsetWidth}px`;
        div.style.minHeight = `${textarea.offsetHeight}px`;
        div.style.padding = computed.padding;
        div.style.margin = computed.margin;
        div.style.font = computed.font;
        div.style.fontFamily = computed.fontFamily;
        div.style.fontSize = computed.fontSize;
        div.style.fontWeight = computed.fontWeight;
        div.style.lineHeight = computed.lineHeight;
        div.style.letterSpacing = computed.letterSpacing;
        div.style.whiteSpace = 'pre-wrap';
        div.style.overflowWrap = 'anywhere';
        div.style.color = '#1254c0';
        textarea.replaceWith(div);
      });

      // Reflow once after replacing controls.
      void clone.offsetHeight;
      return await html2canvas(clone, {
        backgroundColor: null,
        scale: captureScale,
        useCORS: true,
        logging: false,
        removeContainer: true,
        imageTimeout: 15000,
        foreignObjectRendering: false,
        scrollX: 0,
        scrollY: 0,
      });
    } finally {
      clone.remove();
    }
  }

  async function saveAndStamp() {
    loading('กำลังประทับตราและส่งต่อ...');
    try {
      const pdfDoc = await PDFLib.PDFDocument.load(state.originalPdfBase64);
      const page = pdfDoc.getPages()[0];
      const container = document.getElementById('pdf-container');
      const containerRect = container.getBoundingClientRect();
      const scaleX = page.getWidth() / container.offsetWidth;
      const scaleY = page.getHeight() / container.offsetHeight;
      const stamps = [...document.querySelectorAll('.draggable-stamp')];
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      const stampCaptureScale = Math.min(8, Math.max(6, (window.devicePixelRatio || 1) * 3));

      for (const stamp of stamps) {
        const rect = stamp.getBoundingClientRect();
        const x = rect.left - containerRect.left;
        const y = rect.top - containerRect.top;

        // Capture an untransformed clone. Capturing the on-screen element
        // after CSS scaling softens Thai glyphs and can shift the frame.
        // The clone stays at its native layout size and is rasterized at
        // high resolution, then placed into the PDF at the user's chosen size.
        const capture = await captureStampAtNativeResolution(stamp, stampCaptureScale);
        const image = await pdfDoc.embedPng(capture.toDataURL('image/png'));
        page.drawImage(image, {
          x: x * scaleX,
          y: page.getHeight() - y * scaleY - rect.height * scaleY,
          width: rect.width * scaleX,
          height: rect.height * scaleY,
        });
      }
      const base64 = await pdfDoc.saveAsBase64();
      const stampMeta = collectStampMeta();
      await gasCall('saveStampedDocument', state.token, { docId: state.currentDoc.docId, base64, stampMeta });
      closeWorkspace();
      await loadDashboard();
      Swal.fire('สำเร็จ', 'ประทับตราและส่งต่อเรียบร้อยแล้ว เอกสารถูกนำออกจากคิวของคุณแล้ว', 'success');
    } catch (error) { showError(error); }
  }

  function collectStampMeta() {
    const meta = { role: state.user.role, operationMode: state.currentDoc?.operationMode || '', options: [], department: '', text: '', scales: [] };
    document.querySelectorAll('.draggable-stamp input[type="checkbox"]:checked').forEach((input) => meta.options.push(input.dataset.meta || input.value || 'checked'));
    const department = document.querySelector('.draggable-stamp input[type="radio"]:checked');
    if (department) meta.department = department.value;
    meta.text = [...document.querySelectorAll('.draggable-stamp textarea')].map((textarea) => textarea.value).filter(Boolean).join('\n');
    meta.scales = [...document.querySelectorAll('.draggable-stamp')].map((stamp) => ({ id: stamp.id, scale: Number(stamp.dataset.scale || 1) }));
    return meta;
  }

  function dispatchMarkup() {
    return `<div id="dispatch-panel" class="dispatch-panel"><h3 class="text-xl font-bold text-red-800 border-b pb-3">ดำเนินการขั้นสุดท้าย</h3><div class="flex flex-wrap gap-5 my-4"><label><input type="radio" name="dispatch-type" value="ยุติเรื่อง"> ยุติเรื่อง</label><label><input type="radio" name="dispatch-type" value="ทุกคน"> ส่งให้ทุกคน</label><label><input type="radio" name="dispatch-type" value="บางคน"> ส่งให้บางคน</label></div><div id="dispatch-users" class="hide border rounded-xl bg-amber-50 p-4"><div class="font-bold mb-3">เลือกผู้รับ</div><div id="dispatch-user-grid" class="user-grid"></div></div><div class="text-right mt-5"><button id="dispatch-submit" class="btn btn-success">บันทึกการส่งเรื่อง</button></div></div>`;
  }

  async function loadDispatchUsers() {
    state.allUsers = await gasCall('listActiveUsers', state.token);
    const grid = document.getElementById('dispatch-user-grid');
    grid.innerHTML = state.allUsers.map((user) => `<label class="bg-white border rounded-lg p-3 flex gap-2"><input type="checkbox" class="dispatch-user" value="${escapeHtml(user.userId)}"><span><b>${escapeHtml(user.name)}</b><br><small>${escapeHtml(user.role)}${user.department ? ' • ' + escapeHtml(user.department) : ''}</small></span></label>`).join('');
  }

  function initializeDispatch() {
    document.querySelectorAll('input[name="dispatch-type"]').forEach((radio) => radio.onchange = () => {
      document.getElementById('dispatch-users').classList.toggle('hide', radio.value !== 'บางคน' || !radio.checked);
    });
    document.getElementById('dispatch-submit').onclick = async () => {
      const selected = document.querySelector('input[name="dispatch-type"]:checked');
      if (!selected) { Swal.fire('แจ้งเตือน', 'กรุณาเลือกรูปแบบการส่งเรื่อง', 'warning'); return; }
      const userIds = [...document.querySelectorAll('.dispatch-user:checked')].map((input) => input.value);
      loading('กำลังจ่ายเรื่อง...');
      try {
        await gasCall('dispatchDocument', state.token, { docId: state.currentDoc.docId, type: selected.value, userIds });
        closeWorkspace();
        await loadDashboard();
        Swal.fire('สำเร็จ', 'จ่ายเรื่องเรียบร้อยแล้ว เอกสารถูกนำออกจากคิวธุรการแล้ว', 'success');
      } catch (error) { showError(error); }
    };
  }

  function closeWorkspace() {
    const workspace = document.getElementById('workspace-view');
    if (workspace) workspace.remove();
    state.currentDoc = null;
    state.originalPdfBase64 = '';
    state.currentPdf = null;
  }

  function openDownloadCenter() {
    const docs = state.user.role === 'ครู' ? state.inboxDocs : state.allDocs.length ? state.allDocs : [...state.actionDocs, ...state.inboxDocs];
    const unique = [...new Map(docs.map((doc) => [doc.docId, doc])).values()];
    const overlay = document.createElement('div');
    overlay.className = 'modal-backdrop';
    overlay.innerHTML = `<div class="modal-panel max-w-3xl"><div class="flex justify-between items-center mb-4"><div><h2 class="text-xl font-bold">ดาวน์โหลดเอกสาร</h2><p class="text-sm text-slate-500">เลือกหนึ่งไฟล์เพื่อดาวน์โหลด PDF หรือเลือกหลายไฟล์เพื่อสร้าง ZIP</p></div><button class="text-2xl close-modal">×</button></div><div class="flex flex-wrap gap-2 mb-3"><button id="select-all-download" class="btn btn-muted">เลือกทั้งหมด</button><button id="clear-download" class="btn btn-muted">ยกเลิกทั้งหมด</button><input id="download-search" class="input flex-1 min-w-52" placeholder="ค้นหาเอกสาร"></div><div id="download-list" class="space-y-2 max-h-96 overflow-auto"></div><div id="download-progress" class="hide mt-4"><div class="flex justify-between text-sm"><span id="download-progress-text">กำลังเตรียมไฟล์</span><span id="download-progress-percent">0%</span></div><div class="progress-track mt-2"><div id="download-progress-bar" class="progress-bar"></div></div></div><div class="flex justify-end mt-4"><button id="download-selected" class="btn btn-success">ดาวน์โหลดไฟล์ที่เลือก</button></div></div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('.close-modal').onclick = () => overlay.remove();
    const renderList = () => {
      const query = overlay.querySelector('#download-search').value.trim().toLowerCase();
      overlay.querySelector('#download-list').innerHTML = unique.filter((doc) => `${doc.recvNo} ${doc.subject} ${doc.fromSender}`.toLowerCase().includes(query)).map((doc) => `<label class="download-row"><input type="checkbox" class="download-check mt-1" value="${escapeHtml(doc.docId)}"><span><b>${escapeHtml(doc.recvNo)} — ${escapeHtml(doc.subject)}</b><br><small class="text-slate-500">${escapeHtml(doc.fromSender)} • ${escapeHtml(doc.status)}</small></span><span class="badge">PDF</span></label>`).join('');
    };
    renderList();
    overlay.querySelector('#download-search').oninput = renderList;
    overlay.querySelector('#select-all-download').onclick = () => overlay.querySelectorAll('.download-check').forEach((input) => input.checked = true);
    overlay.querySelector('#clear-download').onclick = () => overlay.querySelectorAll('.download-check').forEach((input) => input.checked = false);
    overlay.querySelector('#download-selected').onclick = async () => {
      const ids = [...overlay.querySelectorAll('.download-check:checked')].map((input) => input.value);
      if (!ids.length) { Swal.fire('แจ้งเตือน', 'กรุณาเลือกเอกสารอย่างน้อย 1 ไฟล์', 'warning'); return; }
      const progress = overlay.querySelector('#download-progress');
      progress.classList.remove('hide');
      try {
        if (ids.length === 1) {
          updateDownloadProgress(overlay, 10, 'กำลังอ่าน PDF');
          const result = await gasCall('getDocumentFile', state.token, ids[0], false);
          downloadBase64(result.file.base64, result.file.name, result.file.mimeType);
          updateDownloadProgress(overlay, 100, 'ดาวน์โหลดสำเร็จ');
          return;
        }
        const zip = new JSZip();
        for (let index = 0; index < ids.length; index++) {
          const result = await gasCall('getDocumentFile', state.token, ids[index], false);
          const safeName = uniqueFileName(zip, result.file.name || `${result.document.recvNo}.pdf`);
          zip.file(safeName, result.file.base64, { base64: true });
          updateDownloadProgress(overlay, Math.round(((index + 1) / ids.length) * 75), `รับไฟล์ ${index + 1}/${ids.length}`);
        }
        const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } }, (meta) => updateDownloadProgress(overlay, 75 + Math.round(meta.percent * .25), 'กำลังสร้าง ZIP'));
        downloadBlob(blob, `เอกสารราชการ-${new Date().toISOString().slice(0, 10)}-${ids.length}-ไฟล์.zip`);
        updateDownloadProgress(overlay, 100, 'สร้าง ZIP สำเร็จ');
      } catch (error) { showError(error); }
    };
  }

  function updateDownloadProgress(overlay, percent, text) {
    overlay.querySelector('#download-progress-bar').style.width = `${percent}%`;
    overlay.querySelector('#download-progress-percent').textContent = `${percent}%`;
    overlay.querySelector('#download-progress-text').textContent = text;
  }

  function uniqueFileName(zip, name) {
    const safe = String(name || 'document.pdf').replace(/[\\/:*?"<>|]/g, '_');
    if (!zip.file(safe)) return safe;
    const dot = safe.lastIndexOf('.');
    const base = dot > 0 ? safe.slice(0, dot) : safe;
    const ext = dot > 0 ? safe.slice(dot) : '';
    let index = 2;
    while (zip.file(`${base}-${index}${ext}`)) index++;
    return `${base}-${index}${ext}`;
  }

  function base64ToUint8Array(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  function downloadBase64(base64, name, mimeType) {
    const bytes = base64ToUint8Array(base64);
    downloadBlob(new Blob([bytes], { type: mimeType || 'application/octet-stream' }), name);
  }

  function downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name || 'download';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  bootstrap();
})();
