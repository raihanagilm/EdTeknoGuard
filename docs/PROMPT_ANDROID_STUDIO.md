`# 🚀 MASTER PROMPT & ARSITEKTUR ANDROID STUDIO — TEKNOGUARD & MYTEKNO

Dokumen ini adalah **Master Prompt & Panduan Arsitektur Komprehensif** untuk membangun 2 aplikasi Android Native berbasis Kotlin di **Android Studio**:
1. **TeknoGuard** (Aplikasi NOC & Teknisi Lapangan) $\rightarrow$ Menghasilkan `TeknoGuard.apk`
2. **MyTekno** (Aplikasi Portal Mandiri Pelanggan/Warga, sebelumnya TeknoCust) $\rightarrow$ Menghasilkan `MyTekno.apk`

---

## 🎯 1. TUJUAN SISTEM & PRINSIP UTAMA

* **Satu Codebase (Dual Flavors):** Satu proyek Android Studio tunggal yang mengelola dua varian aplikasi berbeda melalui Gradle Product Flavors (`guard` dan `mytekno`).
* **Notifikasi Pop-up Mengambang Ala WhatsApp (Heads-Up Banner):**
  Aplikasi memiliki kapabilitas memunculkan notifikasi native dengan suara khusus dan banner mengambang di atas layar (*heads-up notification*) saat ada gangguan redaman kritis (TeknoGuard) atau update tiket/tagihan (MyTekno), **bahkan ketika aplikasi sedang ditutup atau layar HP terkunci**.
* **Integrasi Web-to-Native (JavaScript Bridge):**
  Halaman web React di dalam WebView dapat memicu notifikasi native perangkat secara langsung melalui `window.AndroidBridge.showNativeNotification(...)`.
* **Arsitektur Murni Ala WhatsApp & Telegram: Google Firebase Cloud Messaging (FCM):**
  Aplikasi menggunakan **Firebase Cloud Messaging (FCM)** 100% pasif seperti WhatsApp dan Telegram:
  - **Sama Sekali Tanpa Notifikasi Persisten Latar Belakang:** Service latar belakang lokal lama (`EdTeknoBackgroundService`) telah dihentikan total dan dibuang dari manifes. Tidak ada lagi notifikasi "pemantauan di latar belakang" di status bar pengguna saat HP mati maupun saat HP hidup!
  - **Super Hemat Baterai (Zero Battery Drain):** HP tidak membuka koneksi polling berkala, HP tetap dalam kondisi *deep sleep*.
  - **Instant Push:** Push notifikasi ditembakkan langsung dari server Google ke HP saat ada insiden redaman kritis atau tiket kendala.
* **Smart Swipe-to-Refresh & Smooth In-App Scroll:**
  WebView dilengkapi bridge pendeteksi posisi scroll internal web (`AndroidBridge.setScrollAtTop` & `setOnChildScrollUpCallback`). Pengguna dapat bebas scroll ke bawah lalu scroll kembali ke atas tanpa terganggu atau ter-refresh secara tidak sengaja. Refresh hanya aktif jika gestur ditarik saat konten benar-benar berada di puncak paling atas.
* **Splash Screen Elegan (Logo Besar + Nama Aplikasi):**
  Saat aplikasi dibuka pertama kali, antarmuka tidak kosong melainkan menampilkan Splash Screen animasi halus:
  - **Khusus TeknoGuard:** Berlatar belakang **putih bersih (`#FFFFFF`)** dengan teks gelap (`#0F172A`) dan spinner biru agar selaras dengan tema terang dashboard NOC.
  - **Khusus MyTekno:** Berlatar belakang **biru primer (`#2563EB`)** dengan teks putih dan spinner putih.
  Dilengkapi logo router optik (`@drawable/app_splash_logo`), nama aplikasi dinamis, subtitle layanan, dan spinner pemuatan halus hingga konten WebView selesai dimuat (*fade out* mulus).
* **Status Bar Header Konsisten & Rapi:**
  - **Khusus TeknoGuard (NOC & Teknisi):** Bagian status bar atas aplikasi Android dibuat berwarna **putih (`#FFFFFF`)** dengan ikon gelap (`windowLightStatusBar = true`) sehingga menyatu sempurna dan bersih dengan header putih antarmuka dashboard NOC tanpa garis biru kontras di bagian atas layar.
  - **Khusus MyTekno (Portal Pelanggan):** Status bar atas berwarna biru primer (`#2563EB`) dengan ikon terang (`windowLightStatusBar = false`) serasi dengan nuansa portal warga.
* **Kebijakan Push Notifikasi Anti-Spam (MyTekno & TeknoGuard):**
  - **Notifikasi Latar Belakang Senyap:** Notifikasi "Pemantauan aktif di latar belakang" dibungkam total dengan `NotificationManager.IMPORTANCE_MIN` pada channel `tekno_silent_bg_v4_channel`, tanpa suara, tanpa getar, dan berstatus `.setSilent(true)` (`VISIBILITY_SECRET`) sehingga tidak pernah mengotori atau menyalakan notifikasi status bar pengguna.
  - **Logo Resmi Router TeknoIndo (`setLargeIcon`):** Notifikasi TeknoGuard menyematkan logo resmi router/fiber optic `@drawable/app_splash_logo` di sisi kanan kartu notifikasi agar memiliki identitas visual resmi TeknoIndo dan tidak berupa bulatan kosong.
  - **Deep Linking Akurat (Navigasi Langsung Saat Diklik):**
    Saat notifikasi diklik, Intent membawa `target_tab`, `target_filter`, `target_kantor`, dan `target_status`. Aplikasi secara otomatis:
    1. Memindahkan kantor aktif ke kantor tempat insiden terjadi.
    2. Membuka tab modul yang dituju (`pelanggan`, `tiket`, atau `riwayat`).
    3. Menerapkan filter status (`LOS`, `CRITICAL`, `MENUNGGU`) dan kata kunci pencarian pelanggan secara otomatis via `window.navigateToTab(...)`.
  - **TeknoGuard (NOC & Teknisi Lapangan):**
    - **Pesan Super Ringkas (Zero-Clutter Status Bar):** Isi notifikasi wajib ringkas, padat, dan to the point tanpa kalimat panjang. Contoh: `[REDAMAN] Kantor: CABANG` dengan isi `2 LOS, 1 Kritis. Segera cek fisik.`
    - **Perilaku Re-Push (Anti-Lupa):** Notifikasi gangguan kritis (LOS, redaman <= -27.0 dBm, tiket status MENUNGGU, atau scheduler PAUSED) **WAJIB dipush berulang di tiap siklus interval pemindaian** selama kondisi belum diselesaikan teknisi. Jika teknisi men-swipe/dismiss notifikasi, notifikasi akan tetap dimunculkan kembali pada siklus scan berikutnya sebagai pengingat darurat.
    - Notifikasi multi-kantor diperbarui secara bersih (*in-place update*) menggunakan hash ID stabil format `${batchType}_${kantor}` (contoh: `batch_los_karanggede`) sehingga status redaman terbaru langsung memperbarui notifikasi sebelumnya tanpa duplikasi atau rentetan spam baru.
  - **MyTekno (Pelanggan) Non-Pembayaran:** Notifikasi status tiket kendala (`MENUNGGU`, `DICEK_ADMIN`, `DIPROSES`, `SELESAI`) dan notifikasi sinyal LOS/pulih menggunakan bahasa santun, ramah, dan menenangkan. Disimpan secara persisten di `SharedPreferences` dan **cukup muncul tepat 1 kali saja** saat terjadi perubahan status baru, bebas spam berulang.
  - **MyTekno (Pelanggan) Pembayaran Tagihan:**
    - Dikirimkan pengingat **1 hari sebelum jatuh tempo (H-1)** sebanyak 1 kali dalam bulan berjalan.
    - Pada **hari jatuh tempo dan setelahnya jika belum lunas**: push notifikasi dikirimkan harian tepat pada **pukul 10:00 WIB** (1 kali per hari) untuk mengingatkan pelanggan tanpa mengganggu di jam-jam lainnya.

### 📋 Matriks Baku Push Notifikasi (TeknoGuard vs MyTekno)

| Aplikasi Target | Peristiwa / Pemicu | Suara & Channel | Format Judul & Format Pesan Ringkas | Perilaku Re-Push & Frekuensi |
| :--- | :--- | :--- | :--- | :--- |
| **TeknoGuard (NOC)** | Sinyal Terputus (LOS) & Redaman Kritis | `tekno_alarm` (`tekno_emergency_v3_channel`) | Judul: `[REDAMAN] Kantor: {KANTOR}`<br>Isi: `{los} LOS, {critical} Kritis. Segera cek fisik.` | Wajib dipush berulang setiap interval scan berkala selama masih ada LOS/Kritis. |
| **TeknoGuard (NOC)** | Tiket Belum Disentuh | `tekno_alarm` (`tekno_emergency_v3_channel`) | Judul: `[TIKET] Kantor: {KANTOR}`<br>Isi: `{count} tiket MENUNGGU belum diproses.` | Wajib dipush berulang setiap interval scan berkala jika ada tiket MENUNGGU. |
| **TeknoGuard (NOC)** | Tiket Baru Masuk | `tekno_alarm` (`tekno_emergency_v3_channel`) | Judul: `[TIKET BARU] Kantor: {KANTOR}`<br>Isi: `[{id_tiket}] {nama}: {kategori}` | Tepat 1 kali seketika saat tiket dibuat warga dari MyTekno. |
| **TeknoGuard (NOC)** | Pemantauan Terjeda | `tekno_alarm` (`tekno_emergency_v3_channel`) | Judul: `[SCHEDULER] Kantor: {KANTOR}`<br>Isi: `Status {status}. Segera aktifkan.` | Wajib dipush berkala sebagai pengingat darurat agar segera di-resume. |
| **MyTekno (Warga)** | Tiket Terkirim | `default` (`tekno_customer_channel`) | Judul: `Laporan Kendala Diterima`<br>Isi: `Laporan kendala internet Anda telah kami terima dan segera diverifikasi oleh tim teknisi.` | Tepat 1 kali saat tiket dibuat. |
| **MyTekno (Warga)** | Update Tiket | `default` (`tekno_customer_channel`) | Judul: `Status Tiket #{id_tiket}`<br>Isi: `{status_label}. {catatan}` | Tepat 1 kali per perubahan status (`DICEK_ADMIN`, `DIPROSES`, `SELESAI`). |
| **MyTekno (Warga)** | Gangguan LOS | `default` (`tekno_customer_channel`) | Judul: `Pemberitahuan Gangguan Jaringan`<br>Isi: `Mohon maaf, koneksi internet Anda saat ini terdeteksi mengalami gangguan (LOS). Tim teknisi kami sedang segera menangani kendala ini.` | Tepat 1 kali saat status koneksi berubah ke LOS. |
| **MyTekno (Warga)** | Sinyal Pulih | `default` (`tekno_customer_channel`) | Judul: `Koneksi Internet Telah Pulih`<br>Isi: `Koneksi internet Anda telah kembali normal dan aktif. Terima kasih atas kesabaran Anda!` | Tepat 1 kali saat pulih ke NORMAL. |
| **MyTekno (Warga)** | Tagihan H-1 | `default` (`tekno_customer_channel`) | Judul: `Pengingat Tagihan Internet`<br>Isi: `Tagihan internet bulanan Anda akan jatuh tempo besok. Silakan lakukan pembayaran agar koneksi tetap lancar.` | Tepat 1 kali per bulan. |
| **MyTekno (Warga)** | Tagihan Belum Lunas | `default` (`tekno_customer_channel`) | Judul: `Pengingat Tagihan Internet`<br>Isi: `Tagihan internet bulanan Anda telah jatuh tempo. Mohon lakukan pembayaran agar layanan tetap aktif dan lancar.` | 1 kali per hari, tepat pukul 10:00 WIB. |

---

## 🏗️ 2. SPESIFIKASI PROYEK & ENVIRONMENT

| Komponen | Spesifikasi / Konfigurasi |
| :--- | :--- |
| **Bahasa Pemrograman** | Kotlin (1.9+) |
| **Android Gradle Plugin (AGP)** | 8.3+ |
| **Gradle Wrapper** | 8.4+ |
| **JDK Versi** | JDK 17 (LTS) |
| **Compile SDK / Target SDK** | Android 15 (API level 35) |
| **Minimum SDK** | Android 7.0 (API level 24 - Nougat) |
| **Arsitektur UI** | Hybrid Native WebView + Native Background Engine + Native WebChromeClient |
| **Target Build Output** | `TeknoGuard.apk` (Flavor `guard`) & `MyTekno.apk` (Flavor `mytekno`) |

---

## ⚙️ 3. KONFIGURASI GRADLE (`app/build.gradle.kts`)

```kotlin
import com.android.build.gradle.internal.api.BaseVariantOutputImpl

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.edtekno.app"
    compileSdk = 35

    defaultConfig {
        minSdk = 24
        targetSdk = 35
        versionCode = 2
        versionName = "1.2.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    flavorDimensions += "role"

    productFlavors {
        // 1. Varian TeknoGuard (Untuk NOC & Teknisi Lapangan)
        create("guard") {
            dimension = "role"
            applicationId = "com.edtekno.guard"
            resValue("string", "app_name", "TeknoGuard")
            // URL Produksi Resmi HTTPS portal.teknoindo.net
            buildConfigField("String", "BASE_URL", "\"https://portal.teknoindo.net/login\"")
            buildConfigField("String", "ROLE_TYPE", "\"KARYAWAN\"")
        }

        // 2. Varian MyTekno (Untuk Pelanggan / Warga Desa)
        create("mytekno") {
            dimension = "role"
            applicationId = "com.edtekno.mytekno"
            resValue("string", "app_name", "MyTekno")
            // URL Produksi Resmi HTTPS portal.teknoindo.net
            buildConfigField("String", "BASE_URL", "\"https://portal.teknoindo.net/portal\"")
            buildConfigField("String", "ROLE_TYPE", "\"PELANGGAN\"")
        }
    }

    // Penamaan File APK Otomatis: TeknoGuard.apk & MyTekno.apk
    applicationVariants.all {
        val variant = this
        variant.outputs.all {
            val output = this as BaseVariantOutputImpl
            val apkName = if (variant.flavorName == "guard") "TeknoGuard.apk" else "MyTekno.apk"
            output.outputFileName = apkName
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
        debug {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_1_8
        targetCompatibility = JavaVersion.VERSION_1_8
    }

    kotlinOptions {
        jvmTarget = "1.8"
    }

    buildFeatures {
        viewBinding = true
        buildConfig = true
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("com.google.android.material:material:1.12.0")
    implementation("androidx.constraintlayout:constraintlayout:2.1.4")
    implementation("androidx.swiperefreshlayout:swiperefreshlayout:1.1.0")
    implementation("androidx.activity:activity-ktx:1.9.0")

    // Jaringan Latar Belakang & Coroutines
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")

    // Firebase Cloud Messaging (FCM) Resmi
    implementation(platform("com.google.firebase:firebase-bom:33.7.0"))
    implementation("com.google.firebase:firebase-messaging-ktx")
}
```

---

## 🔔 4. MEKANISME NOTIFIKASI NATIVE ALA WHATSAPP

Agar notifikasi dapat muncul seperti pesan WhatsApp (Heads-Up Banner melayang di atas layar, menyalakan layar, dan bersuara lantang):

### A. Konfigurasi Notification Channel (Android 8.0+)
Di `EdTeknoBackgroundService.kt`:
1. **Channel Emergency TeknoGuard (`tekno_emergency_v3_channel`)**:
   - `importance = NotificationManager.IMPORTANCE_HIGH`
   - `AudioAttributes.USAGE_NOTIFICATION_RINGTONE` (stream ringtone bersuara lantang, bukan jam weker/alarm).
   - Suara kustom: `R.raw.tekno_alarm`.
   - Getaran panjang: `longArrayOf(0, 500, 200, 500, 200, 800)`.
2. **Channel MyTekno (`tekno_customer_channel`)**:
   - `importance = NotificationManager.IMPORTANCE_HIGH`
   - Suara notifikasi standar sistem Android (`RingtoneManager.TYPE_NOTIFICATION`).
3. **Channel Silent Service (`tekno_silent_background_channel`)**:
   - `importance = NotificationManager.IMPORTANCE_NONE` / `IMPORTANCE_MIN` (senyap total, disembunyikan dari status bar & lockscreen agar tidak menampilkan tulisan *"Pemantauan aktif di latar belakang"*).

### B. Properti Notifikasi Heads-Up Banner & Anti-Duplikasi Notifikasi
Agar notifikasi dari kantor yang sama (misal 20 menit dari Banyumas) **terbaharui langsung di tempat (Now)** dan **tidak menumpuk berulang kali**:
- Gunakan **Notification ID deterministik berbasis jenis dan kantor** (bukan `System.currentTimeMillis()`):
  ```kotlin
  // Untuk notifikasi batch (misal batch_los_karanggede / batch_critical_karanggede):
  val stableNotifId = if (id.startsWith("batch_")) {
      val kantorField = item.optString("kantor", "")
      val batchType = if (id.contains("los")) "batch_los" else if (id.contains("critical")) "batch_critical" else if (id.contains("invalid")) "batch_invalid" else "batch_warning"
      "${batchType}_${kantorField.lowercase()}".hashCode()
  } else if (id.startsWith("log_")) {
      val itemPelanggan = item.optString("id_pelanggan", id)
      "cust_signal_$itemPelanggan".hashCode()
  } else {
      id.hashCode()
  }
  manager.notify(stableNotifId, builder.build())
  ```
- **Sertakan Logo Resmi TeknoIndo (`setLargeIcon`):**
  ```kotlin
  val logoBitmap = BitmapFactory.decodeResource(resources, R.drawable.app_splash_logo)
  if (logoBitmap != null) {
      builder.setLargeIcon(logoBitmap)
  }
  ```
- **Kirimkan Metadata Lengkap untuk Deep Linking:**
  ```kotlin
  val clickIntent = Intent(this, MainActivity::class.java).apply {
      flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
      putExtra("target_tab", targetTab)
      putExtra("target_filter", targetFilter)
      putExtra("target_kantor", targetOffice)
      putExtra("target_status", targetStatus)
  }
  ```
- Saat scan berikutnya menghasilkan status pembaruan kantor Karanggede, notifikasi baru otomatis me-replace notifikasi lama dengan waktu *Now* tanpa membuat tumpukan notifikasi berulang.

### C. Penyesuaian Ikon Aplikasi Agar Proporsional (Anti-Terpotong / Terlalu Besar)
Untuk mencegah logo foreground melebar atau terpotong pada launcher Android modern (Adaptive Icon `v26+`), gunakan wrapper `<inset>` dengan padding aman `20% - 22%`:
Di `app/src/guard/res/mipmap-anydpi-v26/ic_launcher.xml` dan `ic_launcher_round.xml`:
```xml
<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background" />
    <foreground>
        <inset
            android:drawable="@drawable/ic_launcher_foreground"
            android:inset="22%" />
    </foreground>
</adaptive-icon>
```
*(Hal serupa berlaku untuk varian `mytekno` dengan `android:inset="20%"` agar logo maskot/monitorn berada pas di tengah bulatan ikon aplikasi tanpa menempel ke pinggir).*

### C. Jembatan JavaScript Native Bridge & Anti-Accidental Refresh (`AndroidBridge`)
Di `MainActivity.kt`:
```kotlin
private var isWebAtTop: Boolean = true

private fun setupSwipeRefresh() {
    binding.swipeRefreshLayout.setColorSchemeResources(R.color.primary, R.color.accent)
    binding.swipeRefreshLayout.setOnRefreshListener {
        binding.webView.reload()
    }
    // Mencegah SwipeRefreshLayout mencegat scroll konten ke bawah / balik ke atas
    binding.swipeRefreshLayout.setOnChildScrollUpCallback { _, _ ->
        !isWebAtTop || binding.webView.canScrollVertically(-1)
    }
}

// Di dalam setupWebView():
webView.webViewClient = object : WebViewClient() {
    override fun onPageFinished(view: WebView?, url: String?) {
        binding.swipeRefreshLayout.isRefreshing = false
        isWebAtTop = true
        binding.swipeRefreshLayout.isEnabled = true
        CookieManager.getInstance().flush()
        handleNotificationIntent(intent)
    }
    // ...
}

// Di dalam WebAppInterface:
inner class WebAppInterface(private val activity: Activity, private val webView: WebView) {
    @JavascriptInterface
    fun showNativeNotification(title: String, message: String, isEmergency: Boolean) {
        val channelId = if (isEmergency) {
            EdTeknoBackgroundService.CHANNEL_EMERGENCY_ID
        } else {
            EdTeknoBackgroundService.CHANNEL_CUSTOMER_ID
        }
        val builder = NotificationCompat.Builder(activity as Context, channelId)
            .setContentTitle(title)
            .setContentText(message)
            .setStyle(NotificationCompat.BigTextStyle().bigText(message))
            .setSmallIcon(R.mipmap.ic_launcher)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)

        // Khusus MyTekno: Avatar Maskot Dinamis (terkejut untuk LOS, berhasil untuk selesai/pulih, teknisi untuk ditangani teknisi, admin untuk ditangani admin, customer untuk menunggu)
        if (!isEmergency) {
            try {
                val textCombined = "$title $message".lowercase()
                val mascotResId = when {
                    textCombined.contains("selesai") || textCombined.contains("normal") || textCombined.contains("pulih") || textCombined.contains("kembali lancar") || textCombined.contains("aktif kembali") || textCombined.contains("berhasil") -> R.drawable.mascot_berhasil
                    textCombined.contains("teknisi") || textCombined.contains("lapangan") || textCombined.contains("diproses") -> R.drawable.mascot_teknisi
                    textCombined.contains("admin") || textCombined.contains("verifikasi") || textCombined.contains("dicek") || textCombined.contains("cs") || textCombined.contains("layanan") -> R.drawable.mascot_admin
                    textCombined.contains("kabel") || textCombined.contains("dropcore") || textCombined.contains("patchcord") -> R.drawable.mascot_atur_kabel
                    textCombined.contains("los") || textCombined.contains("gangguan") || textCombined.contains("terputus") || textCombined.contains("kritis") -> R.drawable.mascot_terkejut
                    textCombined.contains("menunggu") || textCombined.contains("laporan terkirim") -> R.drawable.mascot_customer
                    else -> R.drawable.mascot_customer
                }
                val mascotBitmap = android.graphics.BitmapFactory.decodeResource(activity.resources, mascotResId)
                if (mascotBitmap != null) {
                    builder.setLargeIcon(mascotBitmap)
                }
            } catch (e: Exception) {
                // Ignore decoding error
            }
        }

        val notification = builder.build()
        val manager = activity.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.notify(System.currentTimeMillis().toInt(), notification)
    }

    @JavascriptInterface
    fun setScrollAtTop(atTop: Boolean) {
        activity.runOnUiThread {
            isWebAtTop = atTop
            binding.swipeRefreshLayout.isEnabled = atTop
        }
    }
}
```

Di sisi frontend web React (`frontend/src/main.jsx`), status scroll dipancarkan otomatis dengan pengecekan kontainer aktif `.scroll-area`:
```javascript
if (typeof window !== 'undefined') {
  let lastReportedAtTop = true

  const getScrollTopPosition = () => {
    const winTop = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0
    if (winTop > 4) return winTop

    const scrollContainers = document.querySelectorAll('.scroll-area, [data-scroll-container], main[class*="overflow-y-auto"]')
    for (const container of scrollContainers) {
      if (container && container.offsetParent !== null) {
        if (container.scrollTop > 4) return container.scrollTop
      }
    }
    return 0
  }

  const checkScrollState = () => {
    if (!window.AndroidBridge || typeof window.AndroidBridge.setScrollAtTop !== 'function') return
    const currentScroll = getScrollTopPosition()
    const isAtTop = currentScroll <= 4

    if (isAtTop !== lastReportedAtTop) {
      lastReportedAtTop = isAtTop
      window.AndroidBridge.setScrollAtTop(isAtTop)
    }
  }

  window.addEventListener('scroll', checkScrollState, { passive: true, capture: true })
  window.addEventListener('touchmove', checkScrollState, { passive: true, capture: true })
  window.addEventListener('touchend', checkScrollState, { passive: true, capture: true })
  setInterval(checkScrollState, 250)
}
```

### D. Otentikasi Sesi Pengguna di Background Service (`EdTeknoBackgroundService.kt`)
Agar background service dapat mengenali **akun siapa yang sedang login** dan tidak ditolak dengan status HTTP `401 Unauthorized`:
```kotlin
// 1. Polling Notifikasi NOC & Teknisi (TeknoGuard)
private fun pollNotificationConfigAndTickets() {
    val url = "https://portal.teknoindo.net/api/notifications/poll"
    val cookieString = CookieManager.getInstance().getCookie("https://portal.teknoindo.net")

    val requestBuilder = Request.Builder().url(url)
    if (!cookieString.isNullOrEmpty()) {
        requestBuilder.addHeader("Cookie", cookieString) // Injeksi sesi login admin/teknisi
    }
    val request = requestBuilder.build()
    // ...
}

// 2. Polling Tiket & Sinyal Pelanggan Warga (MyTekno) - Anti Duplikasi (1 Kali Saja)
private fun pollCustTicketStatus() {
    // Membaca status tiket dan status koneksi LOS/pulih
    // Menggunakan SharedPreferences agar status yang sudah pernah ditampilkan tidak berulang
}

// 3. Polling Tagihan Pelanggan (MyTekno) - Jadwal H-1 & Harian Jam 10:00 WIB
private fun pollCustBillingStatus() {
    // Mengecek status_pembayaran dari /portal/api/dashboard
    // H-1: Kirim notifikasi pengingat 1 kali per bulan
    // Jatuh tempo & setelahnya jika belum lunas: Kirim push notif tiap hari tepat pukul 10:00 WIB
}
```

---

## 🛠️ 5. PANDUAN STEP-BY-STEP BUILD & DISTRIBUSI KE FIREBASE

### Langkah 1: Buka Project
1. Jalankan **Android Studio**.
2. Klik **File > Open**, lalu arahkan ke folder:
   `D:\databaru\Magang\EdTeknoGuard-Android`
3. Tunggu proses **Gradle Sync** selesai mengunduh dependensi (status: *BUILD SUCCESSFUL*).

### Langkah 2: Sistem Auto-Versioning Dinamis (Tanpa Perlu Edit Manual)
Proyek ini telah dikonfigurasi dengan **Auto-Versioning Otomatis** di `app/build.gradle.kts`:
* `versionCode`: Otomatis meningkat setiap menit berdasarkan epoch time (`((System.currentTimeMillis() - 1735689600000L) / 60000L).toInt()`), sehingga setiap build baru dijamin memiliki `versionCode` yang selalu lebih tinggi dan tidak pernah ditolak Firebase.
* `versionName`: Otomatis menghasilkan penamaan rilis real-time berformat tanggal dan jam: `1.3.<YYMMDD>.<HHmm>` (contoh: `1.3.261111.1330`).
* Tester di aplikasi App Tester HP akan selalu langsung melihat pembaruan versi baru setiap kali Anda menjalankan upload!

### Langkah 3: Menyesuaikan Domain Server Backend
Berkas `app/build.gradle.kts` sudah dikonfigurasi secara default ke domain resmi HTTPS:
* **TeknoGuard (NOC)**: `"https://portal.teknoindo.net/login"`
* **MyTekno (Pelanggan)**: `"https://portal.teknoindo.net/portal"`

*(Jika suatu saat Anda ingin menguji di server development lokal, cukup sesuaikan nilai `BASE_URL` tersebut lalu klik **Sync Now** di sudut kanan atas Android Studio).*

### Langkah 4: Memilih Build Variant (Dual Flavors)
1. Di pojok kiri bawah Android Studio, buka tab **Build Variants**.
2. Pada kolom **Active Build Variant**:
   - Pilih `guardDebug` atau `guardRelease` $\rightarrow$ Untuk mengompilasi **TeknoGuard**.
   - Pilih `myteknoDebug` atau `myteknoRelease` $\rightarrow$ Untuk mengompilasi **MyTekno**.

### Langkah 5: Generate File APK Lokal Secara Manual
1. Pada menu bar atas, klik **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
2. Tunggu proses kompilasi selesai. Notifikasi pop-up akan muncul: *"Build APK(s): APK(s) generated successfully."*
3. Klik tautan biru **locate** pada pop-up tersebut, atau temukan file APK di:
   - **TeknoGuard**: `app/build/outputs/apk/guard/debug/TeknoGuard.apk`
   - **MyTekno**: `app/build/outputs/apk/mytekno/debug/MyTekno.apk`

---

## 🚀 6. OTOMATISASI BUILD & DISTRIBUSI KE FIREBASE (MANDATORY INSTRUCTION)

> [!IMPORTANT]
> **Instruksi Wajib Agent / Developer:**
> Setiap kali prompt ini dijalankan untuk merilis atau memperbarui aplikasi ke Firebase App Distribution, sistem/agent **WAJIB mengeksekusi perintah build Gradle berikut secara otomatis**:
> ```powershell
> ./gradlew appDistributionUploadGuardDebug appDistributionUploadMyteknoDebug
> ```

---

### Menambahkan Catatan Rilis (Release Notes) Saat Upload
Catatan pembaruan dapat disisipkan langsung melalui argumen Gradle:
```powershell
./gradlew appDistributionUploadGuardDebug appDistributionUploadMyteknoDebug -PfirebaseAppDistributionReleaseNotes="Update perbaikan notifikasi, pembaruan ikon resmi TeknoIndo, dan navigasi multi-kantor"
```

---

## 📱 7. PANDUAN PENGATURAN HP AGAR NOTIFIKASI TIDAK MATI

Sistem operasi Android modern (MIUI/HyperOS, ColorOS, OneUI) memiliki fitur agresif *Battery Optimization* yang dapat mematikan service latar belakang. Agar notifikasi bekerja 100% andal seperti WhatsApp:

1. **Izin Notifikasi (Android 13+):**
   Saat pertama kali aplikasi dibuka, izinkan prompt *"Izinkan TeknoGuard/MyTekno mengirim notifikasi"*.
2. **Kunci Aplikasi di Recent Apps:**
   Buka recent apps, tekan dan tahan aplikasi TeknoGuard / MyTekno, lalu pilih ikon **Gembok (Lock)**.
3. **Mulai Otomatis (Autostart - Khusus Xiaomi/Oppo/Vivo):**
   Masuk ke *Pengaturan HP > Aplikasi > Kelola Aplikasi > TeknoGuard / MyTekno > Aktifkan "Mulai Otomatis" (Autostart)*.
4. **Penghemat Baterai (Battery Saver):**
   Ubah dari *Penghemat Baterai Direkomendasikan* menjadi **"Tidak Ada Pembatasan" (No Restrictions)**.

---
*Dokumen ini dirancang khusus untuk memandu developer atau AI Agent dalam memelihara dan mengompilasi aplikasi Android EdTeknoGuard & MyTekno secara mandiri.*

`