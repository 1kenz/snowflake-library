# 📚 Kişisel Kütüphane Uygulaması — Proje Planı⁠​‍⁠⁠⁠⁠‌‍‌‌‍‌‍⁠⁠‍‌‍‍‍‌​‍⁠​‍​⁠​⁠⁠⁠⁠​⁠‌​‌​​‍‍⁠‌⁠‌⁠‌‌‍​​​⁠‍‌​‍​‍​⁠‍​‌‌‍

> Web + mobil, aile için çok kullanıcılı kitap koleksiyonu yönetim uygulaması.
> Tarih: 12 Haziran 2026
>
> ✅ **DURUM: v1.0 tamamlandı** (12 Haziran 2026) — Aşama 1-5 hayata geçirildi (v3 "Karanlık Panel" tasarımı + açık/koyu/sistem teması). Kurulum ve kullanım için `README.md`'ye bakın. Capacitor mağaza paketi isteğe bağlı adım olarak README'de tarif edildi.

---

## 1. Genel Bakış

Aile bireylerinin her birinin kendi kitap koleksiyonunu yönetebildiği, kitaplara not ve özet ekleyebildiği, kapak resimleriyle görsel bir kütüphane deneyimi sunan uygulama. Web'de çalışır; aynı kod tabanından PWA + Capacitor ile telefon uygulamasına (iOS/Android) dönüşür.

**Üyelik modeli (aile):**
- Her aile bireyinin kendi hesabı, kendi kitaplığı, notları ve okuma hedefi vardır
- **Aile görünümü**: tüm üyelerin kitaplarını tek listede görme ("evde bu kitap var mı?" sorusuna cevap)
- Aile içi ödünç: "bu kitap şu an kardeşimde" takibi
- Bir **yönetici** (ebeveyn) hesabı: üye ekleme/çıkarma, çocuk hesapları için içerik görünürlüğü

## 2. Özellikler

### 2.0 Üyelik ve Aile Sistemi
- **Kayıt/giriş** — e-posta + şifre (JWT oturum); "beni hatırla"
- **Roller** — yönetici (ebeveyn) ve üye; yönetici üye ekler/çıkarır, şifre sıfırlar
- **Profil** — ad, avatar, okuma hedefi; çocuk profili işaretlenebilir
- **Kişisel kitaplık** — herkes varsayılan olarak kendi kitaplarını görür/yönetir
- **Aile kitaplığı görünümü** — tüm üyelerin kitapları tek ekranda, "kimde" bilgisiyle
- **Aile içi ödünç** — kitabı aileden birine ödünç verme, kimde olduğunu görme
- **Gizlilik** — istenirse kitap/not "sadece bana özel" işaretlenebilir

### 2.1 Kitap Yönetimi (Temel)
- **Kitap ekleme/düzenleme/silme** — başlık, yazar, yayınevi, yayın yılı, ISBN, sayfa sayısı, dil, tür/kategori
- **ISBN ile otomatik ekleme** — Open Library / Google Books API'den ISBN girerek kitap bilgilerini ve kapağı otomatik çekme
- **📷 Kamera ile barkod tarama** — telefon kamerasıyla kitabın arka kapağındaki barkodu (ISBN) tarama:
  1. Kamera açılır, barkod otomatik algılanır (ZXing)
  2. İnternetten kitap bilgileri çekilir (yazar, konu/açıklama, kapak, yayınevi, yıl...)
  3. Bulunan bilgiler **onay modalında** gösterilir
  4. Kullanıcı seçer: **Kabul et** (alanlara otomatik doldurulur) / **Yeniden ara** (farklı kaynaktan veya düzeltilmiş ISBN ile tekrar sorgular) / **Vazgeç** (modal kapanır, hiçbir şey eklenmez)
- **📷 Kamera ile kapak tarama** — barkod yoksa veya okunamıyorsa, kitabın ön kapağının fotoğrafıyla tanıma:
  1. Kapak fotoğrafı çekilir
  2. OCR ile kapaktaki metin okunur (Tesseract.js — Türkçe destekli), başlık/yazar adayları çıkarılır
  3. Bu metinle Google Books / Open Library'de arama yapılır
  4. Eşleşen kitap(lar) aynı **onay modalında** gösterilir; birden fazla sonuç varsa liste halinde, kullanıcı doğru olanı seçer
  5. Aynı seçenekler geçerli: **Kabul et** / **Yeniden ara** (yeni fotoğraf veya elle düzeltilmiş arama metniyle) / **Vazgeç**
- **🧠 Akıllı kitap künyesi (AI zenginleştirme)** — barkod veya kapak taramasıyla kitap tanındıktan sonra onay modalında yalnızca temel bilgiler değil, detaylı bir künye sunulur:
  - **Tür** (roman, kişisel gelişim, tarih, bilim kurgu...) ve alt türler
  - **Özet** — kitabın konusunun spoilersız, birkaç paragraflık özeti ⭐
  - **Kimlere hitap ediyor** — hedef kitle (yaş aralığı, ilgi alanları, okuma seviyesi)
  - **Ana temalar** ve öne çıkan konular
  - **Benzer kitaplar** önerisi
  - Bilgi kaynağı iki katmanlı: önce Google Books/Open Library açıklaması çekilir; yetersizse veya zenginleştirme isteniyorsa **Claude API** ile kitap hakkında detaylı künye üretilir
  - Kullanıcı kabul ederse özet, tür ve diğer bilgiler ilgili alanlara (özet sekmesi, etiketler, açıklama) otomatik yazılır; istemezse modaldan çıkar veya yeniden üretilmesini ister
- **Kapak resmi** — API'den otomatik indirme veya manuel yükleme (sürükle-bırak)
- **Çoklu kategori/etiket** — bir kitap birden fazla etikete sahip olabilir (örn. "roman", "klasik", "favoriler")
- **Seri desteği** — seri adı ve seri içi sıra numarası

### 2.2 Okuma Takibi
- **Okuma durumu**: Okunacak / Okunuyor / Okundu / Yarım bırakıldı
- **Okuma ilerlemesi** — şu anki sayfa, yüzde göstergesi
- **Tarihler** — başlama ve bitirme tarihi, yeniden okuma kayıtları
- **Puanlama** — 5 yıldız (yarım yıldız destekli)
- **Okuma hedefi** — yıllık kitap hedefi ve ilerleme çubuğu

### 2.3 Notlar ve Özetler ⭐
- **Kitap özeti** — her kitaba zengin metin (Markdown) formatında özet
- **Notlar** — kitap başına çoklu not; her not için sayfa numarası, tarih, başlık
- **Alıntılar** — favori alıntılar, sayfa referansıyla; alıntıları ayrı bir sayfada toplu görüntüleme
- **Notlarda arama** — tüm notlar ve özetler içinde tam metin arama

### 2.4 Arama, Filtreleme, Sıralama
- Anlık arama (başlık, yazar, ISBN, notlar)
- Filtreler: durum, kategori, etiket, yazar, dil, puan, yıl
- Sıralama: eklenme tarihi, başlık, yazar, puan, yayın yılı
- Görünümler: **kapak ızgarası (grid)** ve **liste** görünümü

### 2.5 İstatistikler ve Panel (Dashboard)
- Toplam kitap / okunan / okunmakta olan sayıları
- Yıllık okuma grafiği (aylara göre okunan kitap/sayfa)
- Kategori dağılımı (pasta grafik), en çok okunan yazarlar
- Okuma hedefi ilerlemesi

### 2.6 Diğer
- **Ödünç takibi** — kitabı kime verdim, ne zaman (kişisel ödünç listesi)
- **İstek listesi (wishlist)** — almak istenen kitaplar
- **İçe/dışa aktarma** — JSON/CSV yedekleme ve geri yükleme (Goodreads CSV import desteği)
- **Karanlık/aydınlık tema**
- **Responsive tasarım** — telefon ve tablette de kullanılabilir

### 2.7 Mobil Uygulama
- **PWA** — telefonda "ana ekrana ekle" ile uygulama gibi çalışır, çevrimdışı temel görüntüleme (service worker önbelleği)
- **Capacitor** — aynı React kodu iOS/Android paketine dönüştürülür; App Store / Google Play'e çıkabilir
- Kamera (barkod/kapak tarama) mobilde yerel kamera API'siyle daha akıcı çalışır
- Push bildirim (opsiyonel): "ödünç verdiğin kitabın üstünden 1 ay geçti" hatırlatması

## 3. Teknoloji Seçimi

| Katman | Teknoloji | Neden |
|---|---|---|
| Frontend | **React + Vite + TypeScript** | Hızlı geliştirme, tip güvenliği |
| UI | **Tailwind CSS** | Hızlı, modern, tema desteği kolay |
| State | TanStack Query + Zustand | Sunucu/yerel state ayrımı |
| Backend | **Node.js + Express (TypeScript)** | Basit ve yeterli; JWT auth katmanı eklendi |
| Kimlik doğrulama | **JWT + bcrypt** | E-posta/şifre; aile ölçeği için sade ve güvenli |
| Veritabanı | **SQLite** (better-sqlite3 + Drizzle ORM) | Aile ölçeği için fazlasıyla yeterli; kurulumsuz, tek dosya, yedeklemesi kolay |
| Mobil | **PWA + Capacitor** | Aynı React kodu; mağaza uygulaması + ana ekrana eklenebilir web uygulaması |
| Resimler | Dosya sistemi (`/data/covers/`) | SQLite'a blob koymaktan daha sağlıklı |
| Kitap API | Open Library + Google Books | Ücretsiz ISBN sorgulama ve kapaklar |
| Barkod tarama | **@zxing/browser** (WebRTC kamera) | Tarayıcıda çalışır, uygulama kurulumu gerekmez; telefonda HTTPS üzerinden kamera erişimi |
| Kapak tanıma (OCR) | **Tesseract.js** (Türkçe dil paketi) | Kapaktaki başlık/yazarı okuyup metin aramasına çevirir; tamamen lokal, ücretsiz |
| AI zenginleştirme | **Claude API** (backend üzerinden) | Tür, özet, hedef kitle, temalar, benzer kitaplar üretimi; API anahtarı Ayarlar'dan girilir |
| Grafikler | Recharts | İstatistik sayfası için |

Uygulama evdeki bir cihazda (veya ucuz bir VPS'te) çalışır; aile üyeleri telefon/bilgisayardan bağlanır. Telefonların dışarıdan erişimi için Tailscale (ücretsiz, kolay) veya küçük bir VPS + HTTPS önerilir. Docker paketi hazırlanacak.

## 4. Veri Modeli

```
users
├─ id, name, email, password_hash, avatar_path
├─ role (admin|member), is_child, is_active
└─ created_at

books
├─ id, user_id → users        (kitabın sahibi)
├─ is_private                  (sadece sahibi görür)
├─ title, author, publisher, publish_year, isbn
├─ page_count, language, description, series_name, series_index
├─ cover_path, status (to_read|reading|finished|abandoned)
├─ rating (0–10, yarım yıldız), current_page
├─ started_at, finished_at, created_at, updated_at
└─ is_wishlist

tags          → id, name, color
book_tags     → book_id, tag_id            (çoka-çok)
notes         → id, book_id, user_id, type (note|quote|summary),
                title, content (markdown), page_no, is_private, created_at
reading_logs  → id, book_id, user_id, started_at, finished_at
goals         → user_id, year, target_books
loans         → id, book_id, lent_to_user_id (aile içi) | lent_to_name (dışarıya),
                lent_at, returned_at
```

## 5. Sayfa Yapısı

0. **Giriş / Kayıt** — e-posta+şifre; ilk kurulumda yönetici hesabı oluşturma sihirbazı
1. **Panel** — istatistikler, şu an okunanlar, hedef ilerlemesi (kişisel)
2. **Kütüphanem** — grid/liste, arama + filtre çubuğu
2b. **Aile Kitaplığı** — tüm üyelerin kitapları, sahibi ve "kimde" bilgisiyle
3. **Kitap Detay** — kapak, bilgiler, ilerleme, sekmeler: Özet | Notlar | Alıntılar
4. **Kitap Ekle/Düzenle** — ISBN ile otomatik veya manuel form
5. **Alıntılar** — tüm kitaplardan toplu alıntı akışı
6. **İstek Listesi**, **Ödünç Verilenler**
7. **Ayarlar** — tema, hedef, içe/dışa aktarma, profil; yönetici için: üye yönetimi

## 6. Geliştirme Aşamaları

### Aşama 1 — Temel (MVP)
- [ ] Proje iskeleti (Vite + Express + SQLite + Drizzle)
- [ ] Üyelik: kayıt/giriş (JWT), ilk kurulum sihirbazı, yönetici/üye rolleri
- [ ] Kitap CRUD (ekleme, düzenleme, silme, listeleme) — kullanıcıya bağlı
- [ ] Kapak resmi yükleme
- [ ] Grid/liste görünümü, temel arama
- [ ] Okuma durumu ve puanlama

### Aşama 2 — Notlar ve Özetler
- [ ] Kitap detay sayfası (sekmeli yapı)
- [ ] Markdown editörlü özet
- [ ] Not ve alıntı CRUD (sayfa no ile)
- [ ] Notlarda tam metin arama

### Aşama 3 — Akıllı Özellikler
- [ ] ISBN ile otomatik kitap ekleme (Open Library/Google Books)
- [ ] Kamera ile barkod tarama + onay modalı (kabul / yeniden ara / vazgeç)
- [ ] Kamera ile kapak tarama (OCR → arama → çoklu sonuçtan seçim, aynı onay modalı)
- [ ] AI ile akıllı künye: tür, özet, hedef kitle, temalar, benzer kitaplar (Claude API + Ayarlar'da anahtar yönetimi)
- [ ] Gelişmiş filtreleme ve sıralama
- [ ] Etiket sistemi
- [ ] Okuma ilerlemesi takibi

### Aşama 4 — İstatistik ve Ekstralar
- [ ] Dashboard ve grafikler
- [ ] Okuma hedefi
- [ ] İstek listesi, ödünç takibi (aile içi + dışarıya)
- [ ] Aile kitaplığı görünümü, gizlilik (özel kitap/not)
- [ ] JSON/CSV içe-dışa aktarma, Goodreads import
- [ ] Karanlık tema, responsive iyileştirmeler

### Aşama 5 — Mobil
- [ ] PWA: manifest, service worker, çevrimdışı görüntüleme
- [ ] Capacitor kurulumu, iOS/Android derlemeleri
- [ ] Mobilde yerel kamera entegrasyonu (barkod/kapak tarama)
- [ ] (Opsiyonel) Push bildirimleri

### Aşama 6 — Cila
- [ ] Hata yönetimi, boş durum ekranları
- [ ] Performans (sanal liste, resim optimizasyonu)
- [ ] Testler (API + kritik akışlar)
- [ ] Docker paketi + kurulum dokümanı

## 7. Klasör Yapısı

```
snowflake-library/
├─ client/            # React frontend
│  ├─ src/pages/      # Panel, Kütüphane, Detay, Ayarlar...
│  ├─ src/components/ # BookCard, NoteEditor, StarRating...
│  └─ src/api/        # API istemcisi
├─ server/            # Express backend
│  ├─ src/routes/     # books, notes, tags, stats, import-export
│  ├─ src/db/         # Drizzle şema + migrasyonlar
│  └─ src/services/   # ISBN lookup, kapak indirme
├─ data/              # library.db + covers/  (yedeklenecek tek klasör)
└─ PLAN.md
```

## 8. Riskler ve Notlar

- **Kamera erişimi**: Tarayıcılar kamerayı yalnızca HTTPS (veya localhost) üzerinden açar. Telefondan kullanmak için lokal ağda self-signed sertifika veya Tailscale/ngrok gibi bir çözüm gerekir; planda buna yer verildi.
- **AI künye maliyeti/doğruluğu**: Claude API ücretlidir (kitap başına ~birkaç kuruş) ve az bilinen kitaplarda yanlış bilgi üretebilir → modal her zaman "kullanıcı onayı" ister, AI çıktısı düzenlenebilir olur; API anahtarı girilmemişse özellik zarifçe devre dışı kalır, sadece Google Books açıklaması gösterilir.
- **OCR doğruluğu**: Süslü fontlu veya görsel ağırlıklı kapaklarda OCR yanılabilir → çoklu sonuç listesi + elle düzeltilebilir arama metni bu durumu telafi eder. İstenirse ileride daha isabetli tanıma için bir görüntü-AI servisi (örn. Claude API) opsiyonel olarak eklenebilir.
- **Kapak API kalitesi**: Open Library'de bazı Türkçe kitapların kapağı yok → Google Books yedeği + manuel yükleme her zaman mevcut.
- **Yedekleme**: Tüm veri `data/` klasöründe — kopyalamak yeterli.
- **Sunucu erişimi**: Ailenin telefonlardan erişmesi için uygulamanın sürekli açık bir cihazda çalışması gerekir → Tailscale (ücretsiz VPN) en kolay yol; alternatif küçük bir VPS (~aylık birkaç dolar) + HTTPS.
- **App Store yayını**: Capacitor paketi mağazaya çıkarmak Apple Developer (99$/yıl) gerektirir; aile içi kullanım için PWA çoğu zaman yeterli, mağaza adımı isteğe bağlı.
- **Genişleme**: Aile dışına (çok haneli) büyütülmek istenirse SQLite → PostgreSQL geçişi yeterli; mimari buna engel değil.
<!-- ref: fd966f9a92c8cff3442b77580e488e16⁠​‍⁠⁠⁠⁠‌‍‌‌‍‌‍⁠⁠‍‌‍‍‍‌​‍⁠​‍​⁠​⁠⁠⁠⁠​⁠‌​‌​​‍‍⁠‌⁠‌⁠‌‌‍​​​⁠‍‌​‍​‍​⁠‍​‌‌‍ -->
