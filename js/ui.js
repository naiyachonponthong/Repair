/* =====================================================================
   ui.js — helper กลาง: esc / toast / busy / modal / format
   ===================================================================== */
window.SP = window.SP || {};

SP.$  = function (s, root) { return (root || document).querySelector(s); };
SP.$$ = function (s, root) { return Array.prototype.slice.call((root || document).querySelectorAll(s)); };

SP.esc = function (v) {
  if (v === null || v === undefined) return '';
  return String(v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
};

SP.show = function (sel, on) {
  var el = typeof sel === 'string' ? SP.$(sel) : sel;
  if (el) el.classList.toggle('hide', !on);
};

/* ---------- toast ---------- */
SP.toast = function (msg, type, ms) {
  var wrap = SP.$('#rrToast');
  if (!wrap) return alert(msg);
  var el = document.createElement('div');
  el.className = 'rr-toast ' + (type || '');
  el.innerHTML = SP.esc(msg);
  wrap.appendChild(el);
  setTimeout(function () {
    el.style.transition = 'opacity .2s'; el.style.opacity = '0';
    setTimeout(function () { el.remove(); }, 220);
  }, ms || (type === 'err' ? 5000 : 3000));
};
SP.err = function (msg) { SP.toast(msg, 'err'); };

/* ---------- busy ---------- */
SP._busy = 0;
SP.busy = function (on) {
  SP._busy = Math.max(0, SP._busy + (on ? 1 : -1));
  var el = SP.$('#rrBusy');
  if (el) el.classList.toggle('on', SP._busy > 0);
};

/* ---------- shared modal ---------- */
SP.ui = SP.ui || {};
SP.ui._m = null;

/**
 * SP.ui.open({ title, body, size:'lg'|'xl'|'', okText, onOk, hideFoot })
 * onOk คืน false เพื่อไม่ให้ปิด modal
 */
SP.ui.open = function (opt) {
  opt = opt || {};
  SP.$('#rrModalTitle').innerHTML = SP.esc(opt.title || '');
  SP.$('#rrModalBody').innerHTML  = opt.body || '';
  SP.$('#rrModalDialog').className = 'modal-dialog modal-dialog-centered' + (opt.size ? ' modal-' + opt.size : '');

  var foot = SP.$('#rrModalFoot');
  foot.innerHTML = '';
  if (opt.hideFoot) {
    foot.classList.add('hide');
  } else {
    foot.classList.remove('hide');
    var cancel = document.createElement('button');
    cancel.className = 'btn btn-outline-secondary';
    cancel.textContent = opt.cancelText || 'ยกเลิก';
    cancel.setAttribute('data-bs-dismiss', 'modal');
    var ok = document.createElement('button');
    ok.className = 'btn btn-primary';
    ok.textContent = opt.okText || 'บันทึก';
    ok.onclick = function () {
      Promise.resolve(opt.onOk ? opt.onOk() : true).then(function (r) {
        if (r !== false) SP.ui.close();
      }).catch(function (e) { SP.err(e.message || e); });
    };
    foot.appendChild(cancel); foot.appendChild(ok);
  }

  SP.ui._m = SP.ui._m || new bootstrap.Modal(SP.$('#rrModal'));
  SP.ui._m.show();
  if (opt.onShow) setTimeout(opt.onShow, 120);
};
SP.ui.close = function () { if (SP.ui._m) SP.ui._m.hide(); };

SP.ui.confirm = function (msg, onYes, opt) {
  opt = opt || {};
  SP.ui.open({
    title: opt.title || 'ยืนยัน',
    body: '<div class="py-1">' + SP.esc(msg) + '</div>',
    okText: opt.okText || 'ยืนยัน',
    onOk: onYes
  });
};

/* ---------- format ---------- */
SP.fmt = {
  date: function (iso) {
    if (!iso) return '-';
    var d = new Date(iso);
    if (isNaN(d)) return String(iso);
    return d.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' });
  },
  datetime: function (iso) {
    if (!iso) return '-';
    var d = new Date(iso);
    if (isNaN(d)) return String(iso);
    return d.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' }) +
           ' ' + d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  },
  num: function (n) { return Number(n || 0).toLocaleString('th-TH'); }
};

SP.empty = function (text, icon) {
  return '<div class="empty"><span class="ico"><i class="bi bi-' + (icon || 'inbox') + '"></i></span>' +
         SP.esc(text || 'ยังไม่มีข้อมูล') + '</div>';
};
