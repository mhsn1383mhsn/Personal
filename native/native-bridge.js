/* پل اندروید (Capacitor) — در مرورگر عادی هیچ کاری نمی‌کند.
   سه چیز را در WebView اندروید درست می‌کند:
   ۱) دکمهٔ «دریافت بکاپ» (دانلود blob در WebView کار نمی‌کند) → فایل می‌سازد و Share می‌کند
   ۲) چاپ گزارش (window.open/print در WebView کار نمی‌کند) → پنجرهٔ چاپ / ذخیره PDF اندروید
   ۳) رنگ نوار وضعیت مطابق تم تیره/روشن */
(function () {
  'use strict';
  var C = window.Capacitor;
  if (!C || typeof C.isNativePlatform !== 'function' || !C.isNativePlatform()) return;

  var P = {};
  ['Filesystem', 'Share', 'StatusBar', 'PersonnelPrint'].forEach(function (n) {
    try { P[n] = C.registerPlugin(n); } catch (e) {}
  });

  function safe(fn) { try { var r = fn(); if (r && r.catch) r.catch(function () {}); } catch (e) {} }
  function toast(m) { try { showToast(m); } catch (e) {} }

  /* ---------- نوار وضعیت ---------- */
  function syncStatusBar() {
    if (!P.StatusBar) return;
    var light = false;
    try { light = currentTheme() === 'light'; } catch (e) {}
    safe(function () { return P.StatusBar.setOverlaysWebView({ overlay: false }); });
    safe(function () { return P.StatusBar.setStyle({ style: light ? 'LIGHT' : 'DARK' }); });
    safe(function () { return P.StatusBar.setBackgroundColor({ color: light ? '#F3F7FB' : '#050A10' }); });
  }
  if (typeof window.applyTheme === 'function') {
    var origTheme = window.applyTheme;
    window.applyTheme = function () { var r = origTheme.apply(this, arguments); syncStatusBar(); return r; };
  }
  syncStatusBar();

  /* ---------- بکاپ ---------- */
  window.exportBackup = async function () {
    try {
      var t = todayJalali();
      var name = 'backup-personnel-' + t.jy + '-' + pad2(t.jm) + '-' + pad2(t.jd) + '.json';
      var payload = { app: 'مدیریت پرسنل', version: 1, exportedAt: Date.now(), exportedDate: fullFa(t), state: STATE };
      var w = await P.Filesystem.writeFile({
        path: name, data: JSON.stringify(payload, null, 2), directory: 'CACHE', encoding: 'utf8'
      });
      await P.Share.share({ title: name, dialogTitle: 'ذخیره / ارسال فایل بکاپ', files: [w.uri] });
      toast('فایل بکاپ آماده شد ✓');
    } catch (err) {
      if (err && /cancel/i.test(String(err.message || err))) return;
      console.error(err);
      toast('خطا در تهیه فایل بکاپ');
    }
  };

  /* ---------- چاپ ---------- */
  function nativePrint(html) {
    if (!P.PersonnelPrint) { toast('چاپ در این دستگاه در دسترس نیست'); return; }
    html = html.replace('</head>', '<link rel="stylesheet" href="fonts/fonts.css"></head>');
    P.PersonnelPrint.print({ html: html, jobName: 'Personnel-Report' })
      .catch(function () { toast('خطا در باز کردن پنجرهٔ چاپ'); });
  }
  if (typeof window.printReport === 'function') {
    var origPrint = window.printReport;
    window.printReport = function () {
      var html = '';
      var fakeWin = {
        document: { write: function (h) { html += h; }, close: function () {} },
        focus: function () {},
        print: function () { nativePrint(html); }
      };
      var realOpen = window.open;
      window.open = function () { return fakeWin; };
      try { return origPrint.apply(this, arguments); }
      finally { window.open = realOpen; }
    };
  }
})();
