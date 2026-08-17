/* =====================================================================
   auth.js — login / restore session / logout
   ===================================================================== */
window.SP = window.SP || {};
SP.auth = {};

SP.auth.info = { app_name: 'ระบบแจ้งซ่อม', org_name: '', logo_url: '' };

SP.auth.loadInfo = function () {
  return SP.api('app.info', {}, { silent: true }).then(function (d) {
    SP.auth.info = d || SP.auth.info;
    var i = SP.auth.info;
    SP.$('#loginTitle').textContent = i.app_name || 'ระบบแจ้งซ่อม';
    SP.$('#loginOrg').textContent   = i.org_name || 'เข้าสู่ระบบเพื่อใช้งาน';
    SP.$('#loginVer').textContent   = 'v' + SP.cfg.VERSION + (i.app_version ? ' / api ' + i.app_version : '');
    SP.$('#sbName').textContent     = i.app_name || 'ระบบแจ้งซ่อม';
    SP.$('#sbOrg').textContent      = i.org_name || '';
    SP.$('#tbOrg').textContent      = i.org_name || '';
    document.title                  = i.app_name || 'ระบบแจ้งซ่อม';
    if (i.logo_url) {
      SP.$('#loginLogo').src = i.logo_url; SP.$('#loginLogo').style.display = '';
      SP.$('#sbLogo').src    = i.logo_url; SP.$('#sbLogo').style.visibility = '';
    }
  }).catch(function (e) {
    SP.$('#loginErr').textContent = e.message || e;
    SP.show('#loginErr', true);
  });
};

SP.auth.showLogin = function () {
  SP.show('#viewApp', false);
  SP.show('#viewLogin', true);
  document.body.classList.remove('nav-open');
  setTimeout(function () { SP.$('#inUser').focus(); }, 80);
};

SP.auth.showApp = function () {
  SP.show('#viewLogin', false);
  SP.show('#viewApp', true);
  var u = SP.user || {};
  SP.$('#tbName').textContent   = u.name || u.username || '-';
  SP.$('#tbRole').textContent   = u.role || '-';
  SP.$('#tbAvatar').textContent = (u.name || u.username || '?').trim().charAt(0);

  // ผูกบัญชี LINE ที่ค้างจาก liff.html (ถ้ามี)
  var pend = sessionStorage.getItem('rr_line_pending');
  if (pend) {
    sessionStorage.removeItem('rr_line_pending');
    SP.api('line.bind', JSON.parse(pend), { silent: true })
      .then(function () { SP.toast('ผูกบัญชีกับ LINE แล้ว'); })
      .catch(function () { /* ผูกไม่สำเร็จไม่ควรขวางการใช้งาน */ });
  }

  SP.buildNav();
  SP.route();
};

SP.auth.login = function () {
  var u = SP.$('#inUser').value.trim();
  var p = SP.$('#inPass').value;
  SP.show('#loginErr', false);
  if (!u || !p) { SP.$('#loginErr').textContent = 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน'; return SP.show('#loginErr', true); }

  SP.api('auth.login', { username: u, password: p })
    .then(function (d) {
      SP.token.set(d.token);
      SP.user = d.user;
      localStorage.setItem(SP.cfg.USER_KEY, JSON.stringify(d.user));
      SP.$('#inPass').value = '';
      SP.toast('ยินดีต้อนรับ ' + (d.user.name || d.user.username));
      SP.auth.showApp();
    })
    .catch(function (e) {
      if (e.message === 'SESSION') return;
      SP.$('#loginErr').textContent = e.message || e;
      SP.show('#loginErr', true);
    });
};

SP.auth.logout = function () {
  SP.ui.confirm('ต้องการออกจากระบบใช่หรือไม่', function () {
    return SP.api('auth.logout', {}, { silent: true })
      .catch(function () { /* ออกได้แม้ server ไม่ตอบ */ })
      .then(function () {
        SP.token.clear(); SP.user = null;
        SP.auth.showLogin();
      });
  }, { okText: 'ออกจากระบบ' });
};

/** กู้เซสชันตอนเปิดหน้าใหม่ */
SP.auth.restore = function () {
  if (!SP.token.get()) return Promise.resolve(false);
  return SP.api('auth.me', {}, { silent: true })
    .then(function (d) { SP.user = d.user; return true; })
    .catch(function () { SP.token.clear(); return false; });
};
