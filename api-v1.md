# API v1 Network Bill

API baca untuk aplikasi luar (portal pelanggan, aplikasi teknisi). Network Bill
adalah sumber data utama untuk identitas pelanggan, paket, koneksi, dan tagihan.
Aplikasi luar menyalin data ke database-nya sendiri, lalu menambah kolom atau
tabel miliknya (riwayat modem, redaman, dan seterusnya). Network Bill tidak
perlu tahu soal tambahan itu.

**Seluruh API hanya membaca.** Tidak ada endpoint tulis. Ralat data pelanggan,
IP/MAC sesudah ganti modem, dan isolir tetap dikerjakan di aplikasi Network Bill.

## Akses

- Base URL: `https://pop.teknoindo.net/api/v1`
- Header wajib:
  ```
  Authorization: Bearer <token>
  Accept: application/json
  ```
- Token dibuat Super Admin di panel **Klien API**, satu token per aplikasi.
  Token hanya ditampilkan sekali. Kalau hilang, minta token baru; token lama
  langsung berhenti berlaku.
- Tiap klien punya daftar PoP yang boleh dibaca dan daftar akses:

| Akses | Isi |
|---|---|
| `customers:read` | Pelanggan, paket (tanpa harga), wilayah |
| `network:read` | Infrastruktur (ODC/ODP/tiang), status online/isolir router |
| `billing:read` | Harga paket, tagihan, pembayaran, nomor VA |

- Akses dan daftar PoP melekat ke klien, bukan ke token. Menambah akses
  (misalnya `billing:read` untuk fitur pembayaran) atau PoP di panel langsung
  berlaku untuk token yang sudah ada; tidak perlu token baru.

- Batas: 120 request per menit per klien.

### Kode jawaban

| Kode | Arti |
|---|---|
| 200 | Berhasil |
| 401 | Token salah, klien nonaktif, atau IP di luar daftar yang diizinkan |
| 403 | Token sah, tapi klien tidak punya akses yang diminta (pesannya menyebut aksesnya) |
| 404 | PoP tidak ada / tidak diizinkan / tidak aktif, data tidak ditemukan, atau modulnya mati di PoP itu |
| 422 | Parameter tidak valid |
| 429 | Melewati batas request |

Isi error selalu `{"message": "..."}`.

### Waktu

Semua waktu dikirim dalam ISO 8601 dengan zona, mis. `2026-10-26T10:00:00+07:00`.
Parameter waktu (`updated_since`, `since`) boleh dikirim dalam zona apa pun,
termasuk UTC (`...Z`). Tanggal tanpa jam berbentuk `YYYY-MM-DD`.

## PoP

Network Bill melayani beberapa PoP, masing-masing dengan database sendiri.
**Identitas pelanggan = slug PoP + `id` pelanggan.** Jangan pakai kode
pelanggan sebagai kunci: kode bisa berulang antar-PoP dan bisa berganti
(mis. `PLG-0012` jadi `BMS-0012`).

### `GET /pops`

PoP yang boleh dibaca klien ini, beserta modul yang menyala. Endpoint wilayah,
infrastruktur, dan status router menjawab 404 di PoP tanpa modulnya.

```json
{"data": [{"slug": "slawi", "name": "PoP Slawi", "modules": ["expense", "infrastructure", "router", "area"]}]}
```

### `GET /pops/{pop}`

Satu PoP, bentuk sama.

## Pelanggan

### `GET /pops/{pop}/customers`

Akses `customers:read`. Parameter:

| Parameter | Isi |
|---|---|
| `updated_since` | Hanya pelanggan yang berubah sejak waktu ini (inklusif) |
| `status` | Saring status, dipisah koma: `aktif,isolir,nonaktif` |
| `area` | id wilayah, atau `none` untuk tanpa wilayah |
| `per_page` | 1-500, default 100 |
| `cursor` | Dari `meta.next_cursor` halaman sebelumnya |

Urutannya `data_changed_at` lalu `id`. **Semua status ikut dikirim**, termasuk
`nonaktif`. Jangan saring `status` saat sinkron: perubahan aktif ke nonaktif
harus sampai ke aplikasi Anda.

```json
{
  "data": [{
    "id": 12,
    "code": "PLG-0012",
    "name": "Budi Santoso",
    "whatsapp": "6281234567890",
    "address": "Jl. Mawar 1",
    "status": "aktif",
    "billing_mode": "prabayar",
    "due_date_day": 30,
    "activation_date": "2025-07-01",
    "area_id": 1,
    "notes": null,
    "data_changed_at": "2026-10-26T09:12:44+07:00",
    "packages": [{
      "id": 31, "package_id": 4, "installation_address": "Jl. Mawar 1",
      "start_date": "2025-07-01", "end_date": null, "is_active": true
    }],
    "connection": {
      "type": "dhcp", "ip_address": "10.10.0.2", "mac_address": "AA:BB:CC:DD:EE:FF",
      "pppoe_username": null, "odp_id": 7, "odp_port": 3,
      "latitude": -7.25, "longitude": 110.4, "notes": null
    }
  }],
  "links": {"first": null, "last": null, "prev": null, "next": "...?cursor=eyJ..."},
  "meta": {"path": "...", "per_page": 100, "next_cursor": "eyJ...", "prev_cursor": null}
}
```

- `packages` adalah **riwayat** masa langganan, bukan hanya yang aktif. Satu
  pelanggan bisa punya beberapa paket berjalan sekaligus (beberapa titik).
- `connection` bisa `null`. Status online/isolir router **tidak** ada di sini,
  lihat `/connections/status`.
- `package_id`, `area_id`, dan `odp_id` dirujuk ke `/packages`, `/areas`, dan
  `/infrastructures`.

### `GET /pops/{pop}/customers/{id}`

Satu pelanggan, bentuk sama dengan satu baris di atas.

### `GET /pops/{pop}/customers/deleted?since=`

Pelanggan yang dihapus sejak waktu tertentu.

```json
{"data": [{"id": 15, "code": "PLG-0015", "deleted_at": "2026-10-20T14:03:00+07:00"}]}
```

### `GET /customers/lookup?whatsapp=`

Cari pelanggan lewat nomor WhatsApp di **seluruh PoP** yang boleh dibaca klien
ini, untuk menautkan akun login portal. Nomor boleh ditulis `0812...`, `+62...`,
atau `62...`. Satu nomor bisa milik beberapa pelanggan, jadi jawabannya daftar.

```json
{"data": [{"pop": "slawi", "id": 12, "code": "PLG-0012", "name": "Budi Santoso", "status": "aktif"}]}
```

## Rujukan

Tabel kecil, dikirim utuh tanpa kursor. Ambil ulang seluruhnya tiap sinkron.

- `GET /pops/{pop}/packages` (`customers:read`): `id, name, download_mbps,
  upload_mbps, description, is_active`, plus `price` bila klien punya
  `billing:read`.
- `GET /pops/{pop}/areas` (`customers:read`, modul Wilayah): `id, name, code_prefix`.
- `GET /pops/{pop}/infrastructures` (`network:read`, modul Infrastruktur):
  `id, type (odc|odp|tiang|lainnya), name, model, parent_id, capacity, location,
  location_url, latitude, longitude, photo_url, notes`.

## Status koneksi

### `GET /pops/{pop}/connections/status`

Akses `network:read`, modul Integrasi Router. Ringkas, untuk dibaca sering.

```json
{"data": [{
  "customer_id": 12,
  "status": "isolir",
  "online": true,
  "online_changed_at": "2026-10-26T08:00:00+07:00",
  "online_read_at": "2026-10-26T10:02:00+07:00",
  "router_isolated": false,
  "router_isolated_at": null,
  "router_state_read_at": "2026-10-26T10:00:00+07:00"
}]}
```

- `status` adalah keputusan aplikasi (pelanggan harus diisolir atau tidak).
  `router_isolated` adalah keadaan entri isolir di router. Keduanya boleh
  berbeda sementara; isolir dikerjakan dari aplikasi Network Bill.
- `online: null` berarti **belum diketahui** (tidak tertaut router atau belum
  pernah dibaca), bukan offline.
- Network Bill membaca router tiap 2 menit (online) dan 10 menit (isolir).
  Membaca endpoint ini lebih sering dari itu tidak menghasilkan data lebih baru.

## Tagihan (`billing:read`)

Dibaca **live** tiap kali pelanggan membuka halamannya. Jangan disalin lalu
ditampilkan dari salinan: pelanggan yang baru membayar di kasir akan tetap
melihat "belum bayar".

### `GET /pops/{pop}/customers/{id}/invoices`

Parameter `status` (`unpaid,paid,cancelled`) dan `limit` (1-120, default 24).
Urut periode terbaru dulu.

```json
{"data": [{
  "id": 501, "number": "INV-2026-10-0012", "type": "langganan",
  "billing_period": "2026-10", "issue_date": "2026-10-01", "due_date": "2026-10-30",
  "subtotal": 150000, "discount": 0, "total": 150000,
  "status": "unpaid", "overdue": false,
  "items": [{"package_name": "Home 20", "package_speed": "20 Mbps", "price": 150000, "quantity": 1, "subtotal": 150000}],
  "payment": null
}]}
```

| Field | Isinya |
|---|---|
| `id` | Id tagihan di PoP ini. Tidak unik lintas PoP -- pasangkan dengan slug PoP |
| `number` | Nomor tagihan yang tercetak di kwitansi dan dipakai petugas saat ditanya pelanggan. Bulannya ikut periode tagihan, bukan tanggal input |
| `type` | `langganan` (tagihan bulanan) atau `pemasangan` (biaya pasang, sekali bayar) |
| `billing_period` | Bulan layanan yang ditagih, `YYYY-MM`. **Bukan** bulan jatuh temponya |
| `issue_date` | Tanggal tagihan diterbitkan. Untuk data lampau yang baru diinput, ini tanggal inputnya |
| `due_date` | Batas bayar. Pascabayar jatuh di bulan sesudah periode, prabayar di bulan periodenya |
| `subtotal` | Jumlah harga paket sebelum diskon |
| `discount` | Potongan atas tagihan ini. Boleh sebesar `subtotal` (kompensasi penuh) |
| `total` | `subtotal - discount`. Ini yang harus dibayar |
| `status` | `unpaid`, `paid`, atau `cancelled`. Tidak ada status "sebagian" |
| `overdue` | Belum bayar dan `due_date` sudah lewat. Definisi yang sama dipakai Network Bill untuk mengisolir koneksi |
| `items[]` | Rincian paket yang ditagih. Harga di-snapshot saat tagihan terbit, jadi tagihan lampau tidak berubah ketika harga paket dinaikkan |
| `payment` | `null` selama belum lunas; lihat di bawah |

Satu tagihan bisa punya lebih dari satu `item`: pelanggan multi-titik ditagih
semua langganannya dalam satu tagihan.

`payment` terisi bila tagihan sudah lunas:

```json
{"date": "2026-10-27", "amount": 150000, "method": "gateway"}
```

| `method` | Arti |
|---|---|
| `tunai` | Dibayar tunai ke kasir atau petugas |
| `transfer` | Transfer ke rekening perusahaan, dicatat petugas |
| `gateway` | Dibayar lewat Virtual Account, dicatat otomatis |

`date` tanggal uang diterima -- untuk data lampau bisa jauh sebelum
`issue_date`. `amount` uang yang benar-benar masuk, **tanpa** biaya admin VA.

### `GET /pops/{pop}/customers/{id}/payments`

Riwayat pembayaran, urut **tanggal bayar** terbaru dulu. Parameter `limit`
(1-120, default 24).

Datanya baris yang sama dengan `payment` di `/invoices`, tapi sumbunya
berbeda: di sana urutannya periode tagihan, jadi pelunasan data lampau yang
baru diinput mendarat di tengah daftar. Untuk halaman "Riwayat Pembayaran",
pakai endpoint ini.

```json
{"data": [{
  "id": 88, "date": "2026-10-02",
  "amount": 100000, "method": "tunai", "method_label": "Tunai",
  "bank_account": null,
  "credit_used": 50000, "credit_added": 0,
  "invoice": {"id": 501, "number": "INV-2026-09-0012", "type": "langganan",
              "billing_period": "2026-09", "total": 150000}
}]}
```

| Field | Isinya |
|---|---|
| `id` | Id pembayaran. Berguna sebagai kunci baris di portal |
| `date` | Tanggal uang diterima perusahaan |
| `amount` | Uang yang benar-benar masuk pada pembayaran ini, tanpa biaya admin VA |
| `method` | `tunai`, `transfer`, atau `gateway`; arti ketiganya di tabel atas |
| `method_label` | Label siap tampil (`Tunai`, `Transfer Bank`, `Virtual Account`) |
| `bank_account` | Keterangan bank. Terisi untuk `transfer` (rekening perusahaan) dan `gateway` (bank VA yang dipakai), `null` untuk `tunai` |
| `credit_used` | Saldo titipan yang dipotongkan ke tagihan ini. Dikirim positif |
| `credit_added` | Kelebihan bayar yang disimpan jadi saldo titipan |
| `invoice` | Tagihan yang dilunasi. Selalu tepat satu |

Satu baris = satu tagihan: invoice pelanggan wajib lunas sekali bayar, jadi
tidak ada pembayaran yang menutup dua tagihan atau menutup separuh tagihan.
`amount + credit_used` sama dengan `invoice.total` **pada saat dilunasi** --
lihat peringatan di [Angka](#angka) soal diskon yang turun sesudah itu.

Pembayaran yang dibatalkan petugas tidak muncul di sini: barisnya memang
dihapus, bukan ditandai. Tagihannya kembali `unpaid` di `/invoices`.

### `GET /pops/{pop}/customers/{id}/virtual-account`

Nomor VA statis pelanggan per kanal, dan nominal yang akan diminta bank.

```json
{"data": {
  "next_bill": {"invoice_id": 501, "number": "INV-2026-10-0012", "total": 150000},
  "channels": [{
    "channel": "802", "bank": "Mandiri Virtual Account",
    "va_number": "3718497200000012", "admin_fee": 4000, "amount_to_pay": 154000
  }]
}}
```

Angka di atas contoh.

| Field | Isi |
|---|---|
| `next_bill` | Tagihan yang akan dibayar lewat VA: belum lunas, nominal di atas 0, jatuh tempo paling awal. `null` bila tidak ada |
| `channels[].channel` | Kode kanal Faspay (`802` = Mandiri). Pakai sebagai kunci logo dan petunjuk cara bayar |
| `channels[].bank` | Nama kanal, siap tampil |
| `channels[].va_number` | Nomor VA, 16 digit, tetap untuk pelanggan itu |
| `channels[].admin_fee` | Biaya admin kanal itu. Diatur per PoP, boleh 0 |
| `channels[].amount_to_pay` | `next_bill.total` + `admin_fee`, nominal yang diminta bank. `null` bila `next_bill` null |

Kode kanal yang dipakai saat ini:

| `channel` | Bank |
|---|---|
| `802` | Mandiri |
| `800` | BRI |
| `702` | BCA |
| `723` | BSI |
| `402` | Permata |
| `708` | Danamon |
| `825` | CIMB Niaga |
| `818` | Sinarmas |
| `408` | Maybank |

BNI dan BTN tidak tersedia. Kode di luar tabel ini tetap mungkin muncul kelak;
tampilkan dengan label `bank`.

- **404** hanya bila pelanggan tidak ada atau pembayaran VA belum aktif di PoP
  itu.
- **`channels: []`** berarti nomor VA pelanggan belum diterbitkan. Daftar yang
  lebih pendek dari jumlah bank PoP berarti bank yang baru dibuka belum
  diterbitkan nomornya. Pelanggan
  baru mendapat nomor otomatis; pelanggan lama diterbitkan admin dari daftar
  Pelanggan. Pelanggan nonaktif tidak otomatis dapat nomor.
- **Satu baris per bank yang dibuka PoP**, sesuai urutan daftar. PoP bisa
  membuka banyak bank (Mandiri, BRI, BCA, BSI, dan seterusnya); tiap
  pelanggan memegang satu nomor per bank dengan akhiran yang sama. Pelanggan
  cukup membayar ke salah satunya, dari aplikasi bank yang sama. Portal
  wajib merender kanal berapa pun. Kode kanal yang belum dikenal portal tetap
  ditampilkan dengan label `bank`.
- PDF tagihan dan pesan WA dari Network Bill hanya mencetak sebagian bank.
  Portal adalah satu-satunya tempat pelanggan melihat semua banknya.
- **Nomor VA bisa berganti** bila PoP berpindah bank atau prefix (mis. dari
  sandbox ke production). Simpan sebagai salinan tampilan saja; baca ulang
  endpoint ini sebelum menampilkannya.

## Membangun fitur pembayaran di portal

Portal **tidak berada di jalur uang**. Pelanggan membayar ke bank, Faspay
meneruskannya ke Network Bill, dan Network Bill melunasi tagihannya. Portal
menampilkan nomor dan nominal, lalu membaca ulang hasilnya. Portal tidak
memanggil Faspay sama sekali.

### Alur

1. Portal membaca `/virtual-account`, lalu menampilkan nomor VA dan
   `amount_to_pay`.
2. Pelanggan memasukkan nomor VA di aplikasi bank atau ATM.
3. Bank bertanya ke Network Bill lewat Faspay. Layar bank menampilkan nama
   pelanggan dan nominal tagihan tertua + biaya admin.
4. Pelanggan membayar. Faspay mengirim notifikasi, Network Bill melunasi
   tagihan dan membuka status isolir pelanggan.
5. Portal membaca ulang `/invoices` atau `/virtual-account`. Tidak ada webhook
   dari Network Bill ke portal.

### Halaman yang perlu dibuat

**Tagihan.** Dari `GET /invoices?status=unpaid` dan `GET /virtual-account`.

- Daftar tagihan belum lunas. Tagihan dengan `overdue: true` ditandai telat.
- Kartu bayar untuk `next_bill`: nomor tagihan, total, lalu satu blok per
  kanal di `channels` berisi nama kanal, nomor VA yang bisa disalin, biaya
  admin, dan `amount_to_pay`.
- Tagihan belum lunas lainnya diberi keterangan: bisa dibayar sesudah tagihan
  di kartu bayar lunas.

**Cara bayar.** Satu panduan per kanal, dipilih lewat `channel`. Langkahnya
diambil dari panduan resmi Faspay atau bank; dokumen ini sengaja tidak
menuliskannya. Tiga hal wajib disebut:

- Bayar lewat menu Virtual Account atau Bayar di aplikasi bank yang sama
  dengan bank VA-nya, **bukan menu Transfer atau BI-FAST**. Sebagian aplikasi bank tetap mengenali nomor VA di
  menu transfer dan menampilkan nama pelanggan, lalu membiarkan pelanggan
  mengetik nominal sendiri. Pelunasan lewat jalur itu belum teruji.
- Bayar persis sebesar `amount_to_pay`. Nominalnya tertutup: Network Bill
  menolak nominal lain.
- Nama di layar bank adalah nama pelanggan. Kalau namanya bukan dia, jangan
  diteruskan. Bank hanya menerima huruf dan spasi, jadi angka dan tanda baca
  dibuang: "Toko Jaya, RT 03" tampil sebagai "Toko Jaya RT". Kalau portal
  menampilkan contoh nama di layar bank, bersihkan dengan aturan yang sama.

**Sesudah bayar.** Pelanggan yang kembali dari aplikasi bank menekan tombol
"Saya sudah bayar", lalu portal:

- Membaca ulang `/virtual-account` tiap 10 detik, paling lama 2 menit.
- Menganggap berhasil begitu `next_bill.invoice_id` berganti atau `next_bill`
  jadi `null`, lalu menampilkan tagihan yang barusan lunas dari `/invoices`.
- Sesudah 2 menit tanpa perubahan, menampilkan bahwa pembayaran sedang
  diproses dan bisa tercatat sampai 15 menit kemudian, dengan tombol untuk
  memeriksa lagi. Pembacaan otomatis berhenti di situ, tidak berlanjut di latar
  belakang.
- Ajakan menghubungi admin dengan bukti bayar baru ditampilkan bila sesudah
  15 menit tagihan tetap belum lunas.
- Berhenti saat mendapat 429 dan mencoba lagi sesudah header `Retry-After`.
  Batas 120 request per menit berlaku untuk **seluruh** portal, bukan per
  pelanggan.

Biasanya notifikasi Faspay masuk dalam hitungan detik. Sebagian kanal tidak
selalu mengirim notifikasi; untuk kanal itu Network Bill menanyakan statusnya
sendiri ke Faspay tiap 10 menit, jadi pelunasannya bisa tertunda sampai
sekitar 15 menit.

**Riwayat bayar.** Dari `GET /payments`, bukan dari `/invoices?status=paid`:
urutannya tanggal uang masuk, jadi pelunasan tunggakan lama tidak terselip di
tengah daftar.

### Keadaan dan tampilannya

| Jawaban | Arti | Yang ditampilkan |
|---|---|---|
| `/virtual-account` 404 | Pembayaran VA belum aktif di PoP itu | Tagihan dari `/invoices`, tanpa kartu bayar. Pembayaran lewat petugas |
| `channels: []` | Nomor VA belum diterbitkan | Tagihan, plus ajakan menghubungi admin untuk meminta nomor VA |
| `next_bill: null` | Tidak ada tagihan yang bisa dibayar | "Tidak ada tagihan". Tagihan bulanan dibuat operator, bukan otomatis, jadi di awal bulan bisa kosong beberapa hari |
| `next_bill` tagihan pemasangan | Biaya pasang ikut antre sebagai tagihan tertua | Sebut jenisnya dari `type` di `/invoices` |
| Pelanggan `nonaktif` | Langganan sudah berhenti | Tunggakan tetap bisa dilunasi lewat nomor VA yang sudah ada |
| `status: isolir` sesudah lunas | Lihat "Internet tidak langsung tersambung" di bawah | |

### Satu bayar, satu tagihan

Pelanggan dengan tagihan September Rp 150.000 dan Oktober Rp 175.000 yang
belum lunas, biaya admin Rp 4.000:

1. `next_bill` = September, `amount_to_pay` = 154.000. Pelanggan membayar
   154.000.
2. Sesudah lunas, `next_bill` pindah ke Oktober, `amount_to_pay` = 179.000.
   Pelanggan membayar lagi dengan nomor VA yang sama.

Tidak ada cicilan, dan pelanggan tidak bisa memilih tagihan mana yang dibayar.
Yang tertua selalu lebih dulu.

### Tolakan di bank

Pesan persisnya tergantung bank. Kode di kolom kanan tercatat di log Faspay
dan berguna saat admin menelusuri keluhan.

| Yang dialami pelanggan | Sebab | Kode SNAP |
|---|---|---|
| Nomor tidak dikenal | Nomor salah ketik | `4042412` |
| Tagihan sudah dibayar / tidak ada | Tidak ada tagihan belum lunas | `4042414` |
| Tagihan kedaluwarsa | Nomor lama; PoP sudah berganti bank atau prefix | `4042419` |
| Nominal tidak sesuai | Nominal yang dibayar beda dengan tagihan | `4042513` |

### Internet tidak langsung tersambung

Pelanggan isolir yang sudah tidak punya tagihan lewat jatuh tempo kembali ke
`status: aktif` (kecuali saklar Status Pelanggan Otomatis sedang dimatikan di
PoP itu), tapi entri isolir di router tetap dibuka petugas. Selama
`router_isolated` di `/connections/status` masih `true`, tampilkan bahwa
koneksi sedang menunggu dibuka. Jangan menjanjikan internet langsung menyala.

### Angka

- Nominal dikirim sebagai angka (`150000`). Format Rupiah dikerjakan portal.
- Tampilkan `amount_to_pay` apa adanya, jangan dihitung ulang di portal.
- `payment.amount` adalah total tagihan, **tanpa** biaya admin VA.
- Biaya admin bisa berbeda per kanal, dan boleh 0.
- **Pembayaran VA selalu melunasi persis sebesar tagihan.** Nominalnya tertutup
  dan nominal yang berbeda ditahan untuk diperiksa petugas, bukan dilunasi
  sebagian atau disimpan jadi saldo. Jadi untuk `method: gateway`,
  `credit_used` dan `credit_added` selalu 0. Saldo titipan hanya lahir dari
  pembayaran yang dicatat petugas, dan dari diskon kompensasi.
- **Jangan hitung `total - amount` sebagai sisa yang belum dibayar.** Keduanya
  memang sama saat tagihan dilunasi, tapi diskon kompensasi yang turun
  *sesudah* itu menurunkan `total` tanpa menyentuh `amount` -- selisihnya jadi
  saldo titipan pelanggan, dan hasil pengurangannya minus. Tagihan belum lunas
  dikenali dari `status`, bukan dari selisih angka. Berlaku untuk pembayaran VA
  juga: nominal VA selalu dibayar penuh, jadi yang bergeser adalah `total`-nya.

### Yang tidak ada di API

- Kwitansi PDF. Bila perlu, susun sendiri dari data `/invoices`.
- Status "sedang diproses". Antara pelanggan membayar dan notifikasi masuk,
  tagihan tetap `unpaid`.
- Webhook ke portal.
- Menerbitkan nomor VA. Itu dikerjakan admin di Network Bill.
- Cicilan, dan memilih tagihan yang dibayar.
- **Sisa** saldo titipan pelanggan. `/payments` menyebut saldo yang dipakai dan
  yang lahir per pembayaran, tapi tidak ada endpoint yang menjawab "saldo
  pelanggan ini sekarang berapa". Memotongkan saldo ke tagihan juga kerja
  petugas di Network Bill; portal melihat hasilnya sebagai tagihan `paid`.

### Akan datang: QRIS

QRIS sedang dirancang sebagai kanal berikutnya. Cara kerjanya berbeda dari VA:
QR dibuat per tagihan dan punya masa berlaku, jadi portal akan memintanya lewat
endpoint tersendiri, bukan sebagai baris di `channels`. Siapkan tempatnya di
halaman Tagihan, termasuk tombol menyimpan gambar QR: pelanggan yang membuka
portal di HP tidak bisa memindai layarnya sendiri. Bentuk endpoint menyusul;
jangan dibangun dulu.

### Daftar periksa sebelum rilis

- [ ] Kanal tampil berapa pun jumlahnya, termasuk kosong.
- [ ] 404 dan `channels: []` punya tampilan berbeda.
- [ ] Nomor VA tersalin sebagai 16 digit tanpa spasi, walau tampilannya
      dikelompokkan.
- [ ] `amount_to_pay` tampil persis seperti dari API.
- [ ] Panduan bayar tiap kanal mengarahkan ke menu Virtual Account atau Bayar,
      bukan menu Transfer.
- [ ] Pembacaan ulang berhenti sesudah 2 menit dan saat 429.
- [ ] Belum lunas sesudah 2 menit tampil sebagai "sedang diproses", bukan
      gagal; ajakan menghubungi admin baru muncul sesudah 15 menit.
- [ ] Nomor VA dan tagihan tidak pernah ditampilkan dari salinan lama.
- [ ] Pelanggan isolir yang baru membayar tidak dijanjikan internet langsung
      menyala.

## Pola sinkron yang disarankan

1. **Sinkron bertahap tiap 10-15 menit** per PoP:
   - Ambil `/customers?updated_since=<kursor>` sampai `next_cursor` habis.
     Timpa per `(pop, id)`.
   - Simpan kursor baru = `data_changed_at` **terbesar yang diterima**, bukan jam
     server Anda. Pelanggan yang berubah tepat di detik kursor dikirim ulang
     (inklusif); itu aman karena ditimpa per id.
   - Ambil `/customers/deleted?since=<kursor hapus>` dan hapus atau tandai baris
     Anda.
   - Ambil ulang `/packages`, `/areas`, `/infrastructures`.
2. **Sinkron penuh harian**: ambil semua pelanggan tanpa `updated_since`, lalu
   buang id yang tidak muncul. Ini jaring pengaman bila ada perubahan yang
   terlewat.
3. **Kolom dari Network Bill bersifat baca saja** di aplikasi Anda: ditimpa tiap
   sinkron. Kolom dan tabel tambahan milik Anda bebas diubah.
4. **Status router** (`/connections/status`) dibaca terpisah, boleh tiap 2-5
   menit.
5. **Tagihan dan VA** dibaca live saat dibutuhkan, termasuk sesudah pelanggan
   membayar.

Skrip yang membaca modem lewat IP/MAC wajib memakai data hasil sinkron terbaru:
sesudah ganti modem, IP/MAC diralat di Network Bill dan baru sampai ke aplikasi
Anda pada sinkron berikutnya.
