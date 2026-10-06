# مدیریت پرسنل — ساخت APK با GitHub Actions

این پروژه همان وب‌اپ `netlify-app-v3` است که با قالب بیلد پروژهٔ `pl-main` (Capacitor + GitHub Actions) به APK تبدیل می‌شود.
فایل‌های وب‌اپ **بدون تغییر** در پوشهٔ `app/` هستند؛ هر وقت `app/index.html` را عوض کردی و push کردی، APK جدید ساخته می‌شود.

## ساخت APK (بدون کامپیوتر)

۱. یک مخزن (repository) جدید در GitHub بساز.
۲. همهٔ محتویات این پوشه را آپلود کن. پوشهٔ مخفی `.github` حتماً باید آپلود شود
   (اگر دیده نشد: Add file ← Create new file ← نام `.github/workflows/build-apk.yml` و محتوای همان فایل را بچسبان).
۳. تب **Actions** ← **Build Personnel APK** ← **Run workflow**.
۴. بعد از ۵ تا ۱۰ دقیقه، پایین صفحهٔ اجرا، بخش **Artifacts** ← فایل APK را دانلود و روی گوشی نصب کن.

با هر push روی `main`/`master` هم خودکار نسخهٔ debug ساخته می‌شود (تغییر فایل‌های `.md` بیلد نمی‌گیرد).

## گزینه‌های Run workflow

| گزینه | توضیح |
|---|---|
| `build_type` | `debug` = نصب سریع و تست (پیش‌فرض) — `release` = APK امضاشده + فایل AAB (برای Google Play) |
| `bundle_fonts` | `yes`: فونت وزیرمتن داخل APK می‌رود و برنامه **آفلاین** هم درست نمایش می‌دهد (پیش‌فرض) |
| `orientation` | `portrait` (پیش‌فرض، مثل PWA) یا `auto` برای چرخش آزاد روی تبلت |
| `publish_release` | `yes`: فایل‌ها در بخش **Releases** مخزن هم قرار می‌گیرند (لینک دانلود ثابت) |

## ساخت نسخهٔ release (اختیاری)

یک بار keystore بساز (روی کامپیوتر با JDK):

```
keytool -genkeypair -v -keystore release.keystore -alias personnel -keyalg RSA -keysize 2048 -validity 36500
base64 -w0 release.keystore      # خروجی را کپی کن
```

در GitHub: Settings ← Secrets and variables ← Actions ← New repository secret، این ۴ مورد:

- `ANDROID_KEYSTORE_BASE64` ← خروجی دستور base64
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS` ← مثلاً `personnel`
- `ANDROID_KEY_PASSWORD`

بعد `build_type = release` را اجرا کن. **فایل `release.keystore` و رمزها را جای امن نگه دار؛ اگر گم شود نمی‌توانی آپدیت همان برنامه را منتشر کنی.**

## چه چیزهایی نسبت به pl-main تغییر کرد

- **Firebase، اعلان، آلارم و تقویم حذف شد** — این اپ فقط از `localStorage` استفاده می‌کند و به آن‌ها نیازی ندارد؛ بیلد سبک‌تر و کم‌خطاتر است.
- **بکاپ**: دکمهٔ «دریافت بکاپ» در WebView اندروید کار نمی‌کند (دانلود blob). با `native/native-bridge.js` فایل بکاپ ساخته و با منوی Share (ذخیره در فایل‌ها/درایو/تلگرام و…) ارسال می‌شود. بازیابی بکاپ (انتخاب فایل) بدون تغییر کار می‌کند.
- **چاپ گزارش**: `window.open + print` در WebView کار نمی‌کند؛ با یک پلاگین کوچک (`PersonnelPrintPlugin`) پنجرهٔ چاپ/ذخیره PDF خود اندروید باز می‌شود.
- **سرویس‌ورکر** در نسخهٔ اندروید غیرفعال است (فایل‌ها داخل APK هستند).
- **رنگ نوار وضعیت** با تم تیره/روشن برنامه هماهنگ می‌شود.
- **versionCode** برابر شمارهٔ بیلد گیت‌هاب و **versionName** از `package.json` خوانده می‌شود (برای عوض کردن نسخه، `version` را در `package.json` تغییر بده).
- کلید امضای debug ثابت است (`keystore/personnel-debug.keystore`)، پس نسخهٔ جدید روی قبلی بدون پاک شدن اطلاعات نصب می‌شود.

## نکته‌های مهم

- اطلاعات برنامه داخل حافظهٔ WebView (localStorage) است؛ با **حذف برنامه پاک می‌شود**. حتماً گاهی بکاپ بگیر.
- قفل فعال‌سازی (شناسه دستگاه + کد ۶ رقمی) همان‌طور که هست کار می‌کند. شناسه در نسخهٔ اندروید جدا از مرورگر ساخته می‌شود، پس برای APK کد جدید لازم است.
- تغییر نام یا `appId` (فعلاً `app.personnel.manager`) در `capacitor.config.json`؛ بعد از انتشار، `appId` را عوض نکن چون گوشی آن را برنامهٔ جدید می‌داند.
- این پروژه اینجا کامپایل نشد (SDK اندروید و اینترنت نبود). اسکریپت‌ها با یک الگوی ساختگی تست شدند، ولی اولین بیلد واقعی را باید GitHub انجام دهد. اگر مرحله‌ای خطا داد، متن خطای همان مرحله را بفرست.
