# ❄️ SnowFlakeShelf — Aile Kitaplığı

Aile için çok kullanıcılı kişisel kütüphane uygulaması. Web + PWA (telefona kurulabilir).
Canlı ortam: **Vercel** (barındırma) + **Supabase** (veritabanı, kimlik doğrulama, dosya depolama).

## Özellikler

- 🔐 **Google ile giriş** — Supabase Auth üzerinden; şifre yönetimi yok
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
| Veritabanı | Supabase Postgres |
| Kimlik | Supabase Auth (Google OAuth) |
| Dosya depolama | Supabase Storage (`covers` bucket — kitap kapakları) |
| Barkod | @zxing/browser |
| OCR | Tesseract.js (tur+eng) |
| AI | Claude / OpenAI / Gemini (yedekli; birincil seçilebilir; anahtarlar admin panelinden girilir) |
| Kitap verisi | Google Books + Open Library |

## Canlıya alma (Vercel + Supabase)

### 1) Supabase projesi

1. [supabase.com](https://supabase.com) üzerinde yeni bir proje oluşturun.
2. `supabase/migrations/0001_init.sql` dosyasındaki SQL'i **SQL Editor**'de çalıştırın (şema, tetikleyiciler, RLS, `covers` storage bucket'ı bunu oluşturur).
3. **Project Settings → API** altından `Project URL`, `anon public` ve `service_role` anahtarlarını not edin.
4. **Project Settings → Database → Connection string → Transaction pooler** altından bağlantı dizesini alın (Vercel serverless için bu havuzlu bağlantı önerilir).

### 2) Google OAuth

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → yeni proje (veya mevcut) → **OAuth consent screen**'i yapılandırın (External, gerekli alanlar).
2. **Credentials → Create Credentials → OAuth client ID → Web application**.
3. **Authorized redirect URIs** kısmına şunu ekleyin:
   `https://<SUPABASE-PROJECT-REF>.supabase.co/auth/v1/callback`
4. **Authorized JavaScript origins** kısmına canlı alan adınızı ekleyin (ör. `https://snowflake-library-dnz.vercel.app`) ve yerel geliştirme için `http://localhost:5173`.
5. Oluşan **Client ID** ve **Client Secret**'i Supabase panelinde **Authentication → Sign In / Providers → Google**'a girip etkinleştirin.

### 3) Ortam değişkenleri

`.env.example` dosyasını referans alın. Vercel projesinde **Settings → Environment Variables** altına şunları girin:

- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL` (Transaction pooler bağlantı dizesi)
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

### 4) Vercel

Proje GitHub'a bağlanıp Vercel'e import edildiğinde `vercel.json` build/deploy ayarlarını otomatik uygular. Build komutu client'ı derler, `api/index.ts` tüm `/api/*` isteklerini karşılayan tek bir serverless fonksiyon olarak yayınlanır.

### 5) İlk yönetici

`admin@example.com` adresiyle Google ile ilk giriş yapıldığında bu hesap otomatik olarak **yönetici** ve **onaylı** olur (bkz. `handle_new_user` tetikleyicisi). Diğer tüm hesaplar normal üye olarak başlar.

### 6) Yeni kayıtlarda onay zorunluluğu

Admin panelindeki **"Yeni Kayıtlarda Onay"** butonu açıldığında, Google ile ilk kez giriş yapan yeni kullanıcılar bir yönetici onaylayana kadar "onay bekleniyor" ekranında kalır ve kitaplığa erişemez. Buton kapalıyken yeni kayıtlar doğrudan üye olarak kitaplığa erişebilir.

## Yerel geliştirme

Gereksinim: **Node.js 22.5+**, bir Supabase projesi (yukarıdaki adımlarla kurulmuş).

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
