# ❄️ SnowFlakeShelf — Aile Kitaplığı⁠​‍⁠​‍‌⁠‌‌⁠‍‍​‌⁠⁠‌‍​‌⁠​‌​‌​⁠‍‍​‍‌⁠‌⁠‍​​‍⁠⁠⁠⁠⁠‍‍​‌⁠‍⁠⁠​‍‍‍​‌⁠⁠​‌‌‍⁠‍​

Aile için çok kullanıcılı kişisel kütüphane uygulaması. Web + PWA (telefona kurulabilir).
Canlı ortam: **Vercel** (barındırma) + **Render Postgres** (veritabanı) + kendi Google OAuth akışımız (kimlik doğrulama).

## Özellikler

- 🔐 **Google ile giriş** — kendi OAuth akışımız üzerinden; şifre yönetimi yok
- 🛡️ **Yönetici onay akışı** — Admin panelinden açılan bir anahtarla, yeni kayıt olan kullanıcılar bir yönetici onaylayana kadar kitaplığa giremez
- 👨‍👩‍👧‍👦 **Aile üyeliği** — herkesin kendi hesabı ve kitaplığı; yönetici üye ekler/çıkarır/rol değiştirir; "sadece bana özel" kitap/not gizliliği
- 📖 **Kitap yönetimi** — ekleme/düzenleme/silme, kapak resmi (yükleme veya internetten otomatik), etiketler, seri takibi
- 📷 **Barkod tarama** — telefon kamerasıyla ISBN okutup kitabı otomatik bulma
- 🖼️ **Kapak tanıma** — kapak fotoğrafından OCR ile kitabı tanıma (Türkçe destekli)
- 🧠 **AI künye** — Claude API ile tür, spoilersız özet, hedef kitle, temalar ve benzer kitap önerileri (onay modalı: Kabul Et / Yeniden Ara / Vazgeç)
- ✍️ **Notlar, özetler, alıntılar** — sayfa numaralı; notlarda tam metin arama
- 🎯 **Okuma takibi** — durum, sayfa ilerlemesi, puanlama, yıllık hedef, aylık grafik
- 🤝 **Ödünç takibi** — aile içi veya dışarıya; "kitap kimde?" görünümü
- 🎁 **İstek listesi**, 📦 **JSON yedekleme** (dışa/içe aktarma)
- 🌗 **Açık / Koyu / Sistem teması**
- 🌐 **Çok dilli**: Türkçe, English, Deutsch (Ayarlar'dan seçilir; AI özetleri ve hata mesajları da seçilen dilde)
- 📱 **PWA** — telefonda "ana ekrana ekle" ile uygulama gibi çalışır

## Mimari

| Katman | Teknoloji |
|---|---|
| Frontend | React 18 + Vite + TypeScript |
| Backend | Express + TypeScript (Vercel Serverless Function olarak `api/index.ts` üzerinden çalışır) |
| Veritabanı | Render Postgres |
| Kimlik | Kendi Google OAuth akışımız + httpOnly çerezle oturum (JWT) |
| Dosya depolama | Kitap kapakları veritabanında (`covers` tablosu, bytea) — ayrı bir depolama servisi yok |
| Barkod | @zxing/browser |
| OCR | Tesseract.js (tur+eng) |
| AI | Claude / OpenAI / Gemini (yedekli; birincil seçilebilir; anahtarlar admin panelinden girilir) |
| Kitap verisi | Google Books + Open Library |

## Canlıya alma (Vercel + Render Postgres)

### 1) Render Postgres

1. [render.com](https://render.com) üzerinde yeni bir Postgres veritabanı oluşturun (ücretsiz katman 30 gün sonra siliniyor — kalıcı kullanım için ücretli bir plana geçin).
2. `db/schema.sql` dosyasındaki SQL'i veritabanına uygulayın (Render Dashboard'daki "Connect" → psql, veya herhangi bir Postgres istemcisiyle).
3. Dashboard'daki **External Database URL**'i not edin — bu, `DATABASE_URL` olacak.

### 2) Google OAuth

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → yeni proje (veya mevcut) → **OAuth consent screen**'i yapılandırın (External, gerekli alanlar).
2. **Credentials → Create Credentials → OAuth client ID → Web application**.
3. **Authorized redirect URIs** kısmına hem canlı hem yerel geliştirme adreslerini ekleyin:
   - `https://snowflake-library-dnz.vercel.app/api/auth/google/callback`
   - `http://localhost:5173/api/auth/google/callback` (yerel geliştirme için)
4. **Authorized JavaScript origins** kısmına aynı iki alan adını (protokol + host, path olmadan) ekleyin.
5. Oluşan **Client ID** ve **Client Secret**'i ortam değişkenlerine girin (aşağıya bakın).

### 3) Ortam değişkenleri

`.env.example` dosyasını referans alın. Vercel projesinde **Settings → Environment Variables** altına şunları girin:

- `DATABASE_URL` (Render External Database URL)
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `ADMIN_EMAIL` (zorunlu: yönetici olacak Google hesabının e-postası)
- (isteğe bağlı) `JWT_SECRET`, `PUBLIC_BASE_URL`

### 4) Vercel

Proje GitHub'a bağlanıp Vercel'e import edildiğinde `vercel.json` build/deploy ayarlarını otomatik uygular. Build komutu client'ı derler, `api/index.ts` tüm `/api/*` isteklerini karşılayan tek bir serverless fonksiyon olarak yayınlanır.

### 5) İlk yönetici

`ADMIN_EMAIL` ile eşleşen adresle Google ile ilk giriş yapıldığında bu hesap otomatik olarak **yönetici** ve **onaylı** olur. Diğer tüm hesaplar normal üye olarak başlar.

### 6) Yeni kayıtlarda onay zorunluluğu

Admin panelindeki **"Yeni Kayıtlarda Onay"** butonu açıldığında, Google ile ilk kez giriş yapan yeni kullanıcılar bir yönetici onaylayana kadar "onay bekleniyor" ekranında kalır ve kitaplığa erişemez. Buton kapalıyken yeni kayıtlar doğrudan üye olarak kitaplığa erişebilir.

## Yerel geliştirme

Gereksinim: **Node.js 22.5+**, bir Render Postgres veritabanı (yukarıdaki adımlarla kurulmuş).

```bash
cp .env.example .env   # değerleri doldurun
npm install             # tüm bağımlılıklar (server + client)
npm run dev              # geliştirme: http://localhost:5173
```

### Production (yerel tek-sunucu modu, Vercel dışı bir ortamda)

```bash
npm run build      # client'ı derler (client/dist)
npm start           # tek sunucu: http://localhost:3001 (API + arayüz)
```

## Telefondan erişim (yerel geliştirme)

- Aynı Wi-Fi'da: `npm run dev` host'u açıktır → telefonda `http://<bilgisayar-ip>:5173`
- **Kamera (barkod/kapak tarama) yalnızca HTTPS veya localhost'ta çalışır.** Canlı ortamda (Vercel) bu otomatik olarak sağlanır.

## AI Künye (isteğe bağlı)

Admin panelinde/Ayarlar → "AI Künye" bölümünde üç sağlayıcı desteklenir: **Claude (Anthropic)**, **OpenAI** ve **Gemini (Google)**. En az bir anahtar yeterlidir; hangisi girilirse o kullanılır. Birden fazla anahtar girilirse **yedekli** çalışır: birincil sağlayıcı hata verirse sıradaki otomatik denenir. "Birincil yap" ile sıralama değiştirilebilir.

Anahtar kaynakları: [console.anthropic.com](https://console.anthropic.com) · [platform.openai.com](https://platform.openai.com) · [aistudio.google.com](https://aistudio.google.com). Anahtar yoksa uygulama normal çalışır; tarama modalında yalnızca Google Books açıklaması gösterilir.

## Mağaza uygulaması (isteğe bağlı, Capacitor)

Aynı kod tabanı Capacitor ile iOS/Android paketine dönüştürülebilir:

```bash
cd client
npm i @capacitor/core @capacitor/cli
npx cap init SnowFlakeShelf com.dentry.snowflakeshelf --web-dir dist
npx cap add android   # ve/veya ios
npm run build && npx cap sync
```

Aile içi kullanım için PWA genellikle yeterlidir.
<!-- ref: 275e87d87113a27782ffe87bca87c5b8⁠​‍⁠​‍‌⁠‌‌⁠‍‍​‌⁠⁠‌‍​‌⁠​‌​‌​⁠‍‍​‍‌⁠‌⁠‍​​‍⁠⁠⁠⁠⁠‍‍​‌⁠‍⁠⁠​‍‍‍​‌⁠⁠​‌‌‍⁠‍​ -->
