[![GitHub Pages](https://img.shields.io/badge/Live_Demo-GitHub_Pages-2ea44f?style=for-the-badge&logo=github)](https://kinefi.github.io/mp3metaeditor)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg?style=for-the-badge)](LICENSE)

# MP3 Meta Veri Düzenleyici

MP3 dosyalarının ID3 etiketlerini düzenlemek için tarayıcıda çalışan, açık kaynaklı bir araç. Dosyanız cihazınızdan ayrılmadan etiketleri düzenleyip yeni MP3 dosyasını indirebilirsiniz.

## Özellikler

- MP3 dosyası seçme veya sürükleyip bırakma
- Başlık, sanatçı, albüm sanatçısı, albüm, yıl, ay, parça numarası, tür ve yorum etiketlerini görüntüleme ve düzenleme
- Albüm kapağını görüntüleme, değiştirme veya kaldırma
- Düzenlenen dosyayı yeni bir MP3 olarak indirme
- İndirme adını `Yıl - Ay - Albüm - Parça No - Başlık (Sanatçı).mp3` şablonunda oluşturma; yıl ve ay isteğe bağlıdır, boş alanlar ve gereksiz ayraçlar atlanır
- Dosyaları tarayıcıda işleme; dosya adı için geçersiz karakterleri temizleme

## Gizlilik ve güvenlik

- Uygulama MP3 dosyasını, etiketlerini veya kapak görselini toplamaz, saklamaz, yüklemez ya da başka bir yere göndermez.
- Dosya okuma, önizleme ve düzenleme işlemleri yerel tarayıcı sekmesinde yapılır. Uygulamada analitik veya telemetri kodu yoktur.
- Kütüphaneler proje içinde yerel dosyalar olarak tutulur; uygulama çalışırken üçüncü taraf CDN veya font sunucularına istek gönderilmez.
- İçerik Güvenlik Politikası, uygulamanın ağ bağlantısı kurmasını engeller.
- GitHub Pages gibi barındırma sağlayıcıları, site isteği için IP adresi ve bağlantı metaverisi gibi sunucu günlüklerini kendi politikalarına göre işleyebilir. Bu, uygulamanın MP3 veya etiket verisi toplamasından ayrıdır.

## Etiket uyumluluğu

Etiket okuma ID3v1 ve ID3v2 biçimlerini destekler. Kaydetme, düzenlenmiş alanlarla yeni bir ID3v2.3 etiket bloğu oluşturur ve MP3 ses verisini yeni dosyada korur. Mevcut ID3 etiket bloğu yenilendiği için bu sürümün desteklemediği ek çerçeveler korunmayabilir. Orijinal dosyanın üzerine yazılmaz.

## Yerel çalıştırma

ES modülleri nedeniyle sayfayı doğrudan `file://` üzerinden açmak yerine depo kökünde basit bir statik sunucu çalıştırın:

```sh
python3 -m http.server 8000
```

Ardından `http://localhost:8000` adresini açın. Sunucu yalnızca HTML, CSS ve JavaScript dosyalarını sunar; MP3 içeriği bu sunucuya gönderilmez.

## Açık kaynak

Bu proje Apache License 2.0 altında özgür yazılımdır. Kaynak kodu bu GitHub deposunda incelenebilir; kullanılan JavaScript kütüphanelerinin lisansları `vendor/` altındadır.
