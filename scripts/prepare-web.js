// app/ (فایل‌های اصلی وب‌اپ، دست‌نخورده) → www/ (نسخهٔ مخصوص اندروید)
//  1) کپی فایل‌ها
//  2) (اختیاری) فونت وزیرمتن را داخل برنامه می‌گذارد تا آفلاین هم درست نمایش داده شود
//  3) سرویس‌ورکر را در نسخهٔ اندروید غیرفعال می‌کند
//  4) پل بومی (بکاپ / چاپ / نوار وضعیت) را به index.html اضافه می‌کند
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const src = path.join(root, 'app');
const out = path.join(root, 'www');
const bundleFonts = (process.env.BUNDLE_FONTS || 'yes') !== 'no';

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const f of fs.readdirSync(src)) fs.copyFileSync(path.join(src, f), path.join(out, f));

const indexPath = path.join(out, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

function must(cond, msg) { if (!cond) { console.error('prepare-web: ' + msg); process.exit(1); } }

// ---- 1) فونت آفلاین ----
const googleImport = /@import\s+url\((['"]?)https:\/\/fonts\.googleapis\.com[^)]*\)\s*;?/g;
let fontsDone = false;
if (bundleFonts) {
  const fdir = path.join(root, 'node_modules', '@fontsource', 'vazirmatn', 'files');
  if (fs.existsSync(fdir)) {
    const ranges = {
      arabic: 'U+0600-06FF,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE80-FEFC',
      latin: 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD'
    };
    const outFonts = path.join(out, 'fonts');
    fs.mkdirSync(outFonts, { recursive: true });
    let css = '';
    for (const file of fs.readdirSync(fdir).sort()) {
      const m = file.match(/^vazirmatn-(arabic|latin)-(400|500|600|700|800|900)-normal\.woff2$/);
      if (!m) continue;
      fs.copyFileSync(path.join(fdir, file), path.join(outFonts, file));
      css += `@font-face{font-family:'Vazirmatn';font-style:normal;font-display:swap;font-weight:${m[2]};` +
             `src:url('${file}') format('woff2');unicode-range:${ranges[m[1]]};}\n`;
    }
    if (css) {
      fs.writeFileSync(path.join(outFonts, 'fonts.css'), css);
      html = html.replace(googleImport, '');
      must(html.includes('<link rel="manifest" href="manifest.json">'), 'manifest link not found');
      html = html.replace('<link rel="manifest" href="manifest.json">',
        '<link rel="manifest" href="manifest.json">\n<link rel="stylesheet" href="fonts/fonts.css">');
      fontsDone = true;
    }
  }
  console.log(fontsDone ? 'prepare-web: Vazirmatn font bundled (offline)' :
    'prepare-web: WARNING — fontsource not found, keeping online Google Fonts');
} else {
  console.log('prepare-web: BUNDLE_FONTS=no → keeping online Google Fonts');
}

// ---- 2) سرویس‌ورکر فقط در مرورگر ----
const swOld = "if ('serviceWorker' in navigator) {";
must(html.includes(swOld), 'service worker registration not found');
html = html.replace(swOld,
  "if ('serviceWorker' in navigator && !(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform())) {");

// ---- 3) پل بومی ----
const bridge = fs.readFileSync(path.join(root, 'native', 'native-bridge.js'), 'utf8');
fs.writeFileSync(path.join(out, 'native-bridge.js'), bridge);
const end = html.lastIndexOf('</body>');
must(end > -1, '</body> not found');
html = html.slice(0, end) + '<script src="native-bridge.js"></script>\n' + html.slice(end);

fs.writeFileSync(indexPath, html);
console.log('prepare-web: OK → www/');
