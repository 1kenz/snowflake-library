/* Sunucu hata mesajlarının EN/DE çevirisi — istemci x-lang başlığı gönderir */
type L = { en: string; de: string };

const EXACT: Record<string, L> = {
  "Giriş gerekli": { en: "Sign-in required", de: "Anmeldung erforderlich" },
  "Kullanıcı bulunamadı": { en: "User not found", de: "Benutzer nicht gefunden" },
  "Oturum geçersiz veya süresi dolmuş": { en: "Session invalid or expired", de: "Sitzung ungültig oder abgelaufen" },
  "Bu işlem için yönetici yetkisi gerekli": { en: "Admin permission required", de: "Admin-Berechtigung erforderlich" },
  "Kurulum zaten yapılmış": { en: "Setup already completed", de: "Einrichtung bereits abgeschlossen" },
  "Ad, e-posta ve en az 6 karakterli şifre gerekli": { en: "Name, email and a password of at least 6 characters are required", de: "Name, E-Mail und ein Passwort mit mindestens 6 Zeichen sind erforderlich" },
  "E-posta veya şifre hatalı": { en: "Incorrect email or password", de: "E-Mail oder Passwort falsch" },
  "Şifre en az 6 karakter olmalı": { en: "Password must be at least 6 characters", de: "Das Passwort muss mindestens 6 Zeichen lang sein" },
  "Bu e-posta zaten kayıtlı": { en: "This email is already registered", de: "Diese E-Mail ist bereits registriert" },
  "Üye bulunamadı": { en: "Member not found", de: "Mitglied nicht gefunden" },
  "Yönetici hesabı pasifleştirilemez": { en: "The admin account cannot be deactivated", de: "Das Admin-Konto kann nicht deaktiviert werden" },
  "Kendi hesabınızı silemezsiniz": { en: "You cannot delete your own account", de: "Sie können Ihr eigenes Konto nicht löschen" },
  "Yönetici hesabı silinemez": { en: "The admin account cannot be deleted", de: "Das Admin-Konto kann nicht gelöscht werden" },
  "Başlık gerekli": { en: "Title is required", de: "Titel ist erforderlich" },
  "Kitap bulunamadı": { en: "Book not found", de: "Buch nicht gefunden" },
  "Bu kitap özel": { en: "This book is private", de: "Dieses Buch ist privat" },
  "Sadece kitabın sahibi düzenleyebilir": { en: "Only the book's owner can edit it", de: "Nur der Besitzer des Buches kann es bearbeiten" },
  "Sadece kitabın sahibi silebilir": { en: "Only the book's owner can delete it", de: "Nur der Besitzer des Buches kann es löschen" },
  "Dosya gerekli": { en: "File is required", de: "Datei ist erforderlich" },
  "Geçerli URL gerekli": { en: "A valid URL is required", de: "Eine gültige URL ist erforderlich" },
  "Kitap ve içerik gerekli": { en: "Book and content are required", de: "Buch und Inhalt sind erforderlich" },
  "Not bulunamadı": { en: "Note not found", de: "Notiz nicht gefunden" },
  "Sadece notun sahibi düzenleyebilir": { en: "Only the note's owner can edit it", de: "Nur der Besitzer der Notiz kann sie bearbeiten" },
  "Yetki yok": { en: "Not authorized", de: "Keine Berechtigung" },
  "Sadece kendi kitabınızı ödünç verebilirsiniz": { en: "You can only lend your own books", de: "Sie können nur Ihre eigenen Bücher verleihen" },
  "Bu kitap zaten ödünçte": { en: "This book is already on loan", de: "Dieses Buch ist bereits verliehen" },
  "Kime verildiği belirtilmeli": { en: "Specify who it is lent to", de: "Geben Sie an, an wen es verliehen wird" },
  "Kayıt bulunamadı": { en: "Record not found", de: "Eintrag nicht gefunden" },
  "Geçersiz ISBN": { en: "Invalid ISBN", de: "Ungültige ISBN" },
  "Bu ISBN ile kitap bulunamadı": { en: "No book found for this ISBN", de: "Kein Buch mit dieser ISBN gefunden" },
  "Arama metni gerekli": { en: "Search text is required", de: "Suchtext ist erforderlich" },
  "Kitap başlığı gerekli": { en: "Book title is required", de: "Buchtitel ist erforderlich" },
  "AI özelliği için Ayarlar'dan en az bir API anahtarı (Claude, OpenAI veya Gemini) girilmeli": { en: "Add at least one API key (Claude, OpenAI or Gemini) in Settings to use AI", de: "Fügen Sie in den Einstellungen mindestens einen API-Schlüssel (Claude, OpenAI oder Gemini) hinzu" },
  "Bu özellik için Ayarlar'dan bir AI anahtarı girilmeli": { en: "Add an AI API key in Settings to use this feature", de: "Fügen Sie in den Einstellungen einen KI-API-Schlüssel hinzu" },
  "Görüntü gerekli": { en: "Image is required", de: "Bild ist erforderlich" },
  "Geçersiz görüntü formatı (jpeg/png/webp data URL bekleniyor)": { en: "Invalid image format (jpeg/png/webp data URL expected)", de: "Ungültiges Bildformat (jpeg/png/webp Data-URL erwartet)" },
  "Görüntü çok büyük": { en: "Image is too large", de: "Bild ist zu groß" },
  "Geçersiz yedek dosyası": { en: "Invalid backup file", de: "Ungültige Sicherungsdatei" },
  "Profil bulunamadı": { en: "Profile not found", de: "Profil nicht gefunden" },
  "Oturum doğrulanamadı": { en: "Session could not be verified", de: "Sitzung konnte nicht überprüft werden" },
  "Hesap pasifleştirilmiş": { en: "Account deactivated", de: "Konto deaktiviert" },
  "Hesabınız yönetici onayı bekliyor": { en: "Your account is awaiting admin approval", de: "Ihr Konto wartet auf die Genehmigung durch einen Admin" },
  "Kayıt talebiniz reddedildi": { en: "Your registration request was rejected", de: "Ihre Registrierungsanfrage wurde abgelehnt" },
  "Geçersiz rol": { en: "Invalid role", de: "Ungültige Rolle" },
  "Son yönetici hesabı değiştirilemez": { en: "The last admin account cannot be changed", de: "Das letzte Admin-Konto kann nicht geändert werden" },
};

const PREFIX: [string, L][] = [
  ["Kapak indirilemedi: ", { en: "Cover download failed: ", de: "Cover-Download fehlgeschlagen: " }],
  ["Kullanıcı silinemedi: ", { en: "User could not be deleted: ", de: "Benutzer konnte nicht gelöscht werden: " }],
  ["Arama yapılamadı — ", { en: "Search failed — ", de: "Suche fehlgeschlagen — " }],
  ["Arama servisine ulaşılamadı: ", { en: "Search service unreachable: ", de: "Suchdienst nicht erreichbar: " }],
  ["AI künye üretilemedi — ", { en: "AI profile failed — ", de: "KI-Profil fehlgeschlagen — " }],
  ["Kapak tanınamadı — ", { en: "Cover not recognized — ", de: "Cover nicht erkannt — " }],
];

export function translateError(msg: string, lang: string): string {
  if (lang !== "en" && lang !== "de") return msg;
  const exact = EXACT[msg];
  if (exact) return exact[lang];
  for (const [prefix, tr] of PREFIX) {
    if (msg.startsWith(prefix)) return tr[lang] + msg.slice(prefix.length);
  }
  return msg;
}
// ref: 8f8922e3549cff05c38e681b7e8490c2⁠​‍⁠‍​⁠⁠‍​‍‌​‍​‍⁠‍​⁠‌‌‌​‍‌⁠​⁠⁠⁠⁠​​‌‌⁠​​⁠‍​⁠‍‌‍‍​​‌‍⁠‌⁠⁠‍‍​‌​‍‌​​⁠​​‍
