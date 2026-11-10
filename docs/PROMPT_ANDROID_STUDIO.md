# 🚀 MASTER PROMPT & ARSITEKTUR ANDROID STUDIO — TEKNOGUARD & MYTEKNO

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
* **Zero Complex Firebase Dependency:**
  Menggunakan engine **Foreground Service + WakeLock + OkHttp Coroutine Background Polling Engine** lokal yang tangguh, hemat baterai, dan tidak bergantung pada lisensi Google Play Services berbayar / Firebase Cloud Messaging yang rumit di jaringan intranet ISP.
* **Smart Swipe-to-Refresh & Smooth In-App Scroll:**
  WebView dilengkapi bridge pendeteksi posisi scroll internal web (`AndroidBridge.setScrollAtTop` & `setOnChildScrollUpCallback`). Pengguna dapat bebas scroll ke bawah lalu scroll kembali ke atas tanpa terganggu atau ter-refresh secara tidak sengaja. Refresh hanya aktif jika gestur ditarik saat konten benar-benar berada di puncak paling atas.

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
   - `importance = NotificationManager.IMPORTANCE_MIN` (senyap tanpa mengganggu pengguna, khusus menjaga service tetap hidup).

### B. Properti Notifikasi Heads-Up Banner (Pop-up di Atas Layar)
```kotlin
val builder = NotificationCompat.Builder(this, channelId)
    .setContentTitle("🚨 PERINGATAN REDAMAN OPTIK DROP")
    .setContentText(message)
    .setStyle(NotificationCompat.BigTextStyle().bigText(message))
    .setSmallIcon(R.mipmap.ic_launcher)
    .setContentIntent(pendingIntent)
    .setAutoCancel(true)
    .setPriority(NotificationCompat.PRIORITY_MAX) // WAJIB PRIORITY_MAX
    .setDefaults(NotificationCompat.DEFAULT_ALL)
    .setFullScreenIntent(pendingIntent, true)      // Pemicu Heads-up Banner Pop-up
    .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
    .setCategory(NotificationCompat.CATEGORY_MESSAGE)
```

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
// 1. Polling Notifikasi NOC & Teknisi
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

// 2. Polling Tiket Pelanggan Warga (MyTekno)
private fun pollCustTicketStatus() {
    val url = "https://portal.teknoindo.net/portal/api/kendala"
    val cookieString = CookieManager.getInstance().getCookie("https://portal.teknoindo.net")

    val requestBuilder = Request.Builder().url(url)
    if (!cookieString.isNullOrEmpty()) {
        requestBuilder.addHeader("Cookie", cookieString) // Injeksi sesi login pelanggan
    }
    val request = requestBuilder.build()
    // ...
}
```

---

## 🛠️ 5. PANDUAN STEP-BY-STEP BUILD DI ANDROID STUDIO

### Langkah 1: Buka Project
1. Jalankan **Android Studio**.
2. Klik **File > Open**, lalu arahkan ke folder:
   `D:\databaru\Magang\EdTeknoGuard-Android`
3. Tunggu proses **Gradle Sync** selesai mengunduh dependensi (status: *BUILD SUCCESSFUL*).

### Langkah 2: Menyesuaikan Domain Server Backend
Berkas `app/build.gradle.kts` sudah dikonfigurasi secara default ke domain resmi HTTPS:
* **TeknoGuard (NOC)**: `"https://portal.teknoindo.net/login"`
* **MyTekno (Pelanggan)**: `"https://portal.teknoindo.net/portal"`

*(Jika suatu saat Anda ingin menguji di server development lokal, cukup sesuaikan nilai `BASE_URL` tersebut lalu klik **Sync Now** di sudut kanan atas Android Studio).*

### Langkah 3: Memilih Build Variant (Dual Flavors)
1. Di pojok kiri bawah Android Studio, buka tab **Build Variants**.
2. Pada kolom **Active Build Variant**:
   - Pilih `guardDebug` atau `guardRelease` $\rightarrow$ Untuk mengompilasi **TeknoGuard**.
   - Pilih `myteknoDebug` atau `myteknoRelease` $\rightarrow$ Untuk mengompilasi **MyTekno**.

### Langkah 4: Generate File APK
1. Pada menu bar atas, klik **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
2. Tunggu proses kompilasi selesai. Notifikasi pop-up akan muncul: *"Build APK(s): APK(s) generated successfully."*
3. Klik tautan biru **locate** pada pop-up tersebut, atau temukan file APK di:
   - **TeknoGuard**: `app/build/outputs/apk/guard/debug/TeknoGuard.apk`
   - **MyTekno**: `app/build/outputs/apk/mytekno/debug/MyTekno.apk`

---

## 📱 6. PANDUAN PENGATURAN HP AGAR NOTIFIKASI TIDAK MATI

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

