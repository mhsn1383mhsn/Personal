// بعد از `cap add android` اجرا می‌شود:
//  - امضای ثابت debug (برای اینکه نسخه‌های جدید روی قبلی نصب شوند)
//  - امضای release از روی سکرت‌های گیت‌هاب (اختیاری)
//  - versionCode / versionName
//  - پلاگین چاپ + ثبت آن در MainActivity
//  - باز شدن صفحه‌کلید بدون پوشاندن فیلدها، قفل جهت صفحه (اختیاری)
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const cfg = JSON.parse(fs.readFileSync(path.join(root, 'capacitor.config.json'), 'utf8'));
const pkg = cfg.appId;
const main = path.join(root, 'android', 'app', 'src', 'main');
const javaDir = path.join(main, 'java', ...pkg.split('.'));
fs.mkdirSync(javaDir, { recursive: true });

function must(cond, msg) { if (!cond) { console.error('patch-android: ' + msg); process.exit(1); } }

// ---- AndroidManifest ----
const manifestPath = path.join(main, 'AndroidManifest.xml');
let xml = fs.readFileSync(manifestPath, 'utf8');
must(/<activity\b/.test(xml), '<activity> not found in AndroidManifest.xml');
let extra = '';
if (!xml.includes('windowSoftInputMode')) extra += ' android:windowSoftInputMode="adjustResize"';
if ((process.env.ORIENTATION || 'portrait') === 'portrait' && !xml.includes('screenOrientation'))
  extra += ' android:screenOrientation="portrait"';
if (extra) xml = xml.replace(/<activity\b/, '<activity' + extra);
fs.writeFileSync(manifestPath, xml);

// ---- app/build.gradle ----
const gradlePath = path.join(root, 'android', 'app', 'build.gradle');
let g = fs.readFileSync(gradlePath, 'utf8');
must(/android\s*\{/.test(g) && /buildTypes\s*\{/.test(g), 'unexpected build.gradle layout');

if (!g.includes('personnel-debug.keystore')) {
  g = g.replace(/android\s*\{/, `android {
    signingConfigs {
        debug {
            storeFile file('../../keystore/personnel-debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            if (System.getenv('ANDROID_KEYSTORE_PATH')) {
                storeFile file(System.getenv('ANDROID_KEYSTORE_PATH'))
                storePassword System.getenv('ANDROID_KEYSTORE_PASSWORD')
                keyAlias System.getenv('ANDROID_KEY_ALIAS')
                keyPassword System.getenv('ANDROID_KEY_PASSWORD')
            }
        }
    }`);
  g = g.replace(/buildTypes\s*\{/, `buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }`);
  g += `
// فقط اگر keystore ریلیز داده شده باشد، نسخهٔ release امضا می‌شود
if (System.getenv('ANDROID_KEYSTORE_PATH')) {
    android.buildTypes.release.signingConfig = android.signingConfigs.release
}

tasks.withType(JavaCompile).configureEach {
    options.encoding = 'UTF-8'
}
`;
}

const vc = process.env.VERSION_CODE || '1';
const vn = process.env.VERSION_NAME || '1.0';
must(/versionCode\s+\d+/.test(g) && /versionName\s+"[^"]*"/.test(g), 'versionCode/versionName not found');
g = g.replace(/versionCode\s+\d+/, `versionCode ${vc}`).replace(/versionName\s+"[^"]*"/, `versionName "${vn}"`);
fs.writeFileSync(gradlePath, g);

// ---- Java: پلاگین چاپ + MainActivity ----
const plugin = fs.readFileSync(path.join(root, 'native', 'PersonnelPrintPlugin.java'), 'utf8').replace(/__PKG__/g, pkg);
fs.writeFileSync(path.join(javaDir, 'PersonnelPrintPlugin.java'), plugin);

fs.writeFileSync(path.join(javaDir, 'MainActivity.java'), `package ${pkg};

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(PersonnelPrintPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
`);

console.log(`patch-android: OK (versionCode=${vc}, versionName=${vn}, orientation=${process.env.ORIENTATION || 'portrait'})`);
