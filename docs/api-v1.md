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

`overdue` = belum bayar dan jatuh tempo sudah lewat. Definisi ini yang dipakai
Network Bill untuk isolir.

### `GET /pops/{pop}/customers/{id}/virtual-account`

Nomor VA statis pelanggan dan nominal yang akan diminta bank.

```json
{"data": {
  "va_number": "8881234000000001", "bank": "Mandiri Virtual Account", "admin_fee": 4500,
  "next_bill": {"invoice_id": 501, "number": "INV-2026-10-0012", "total": 150000, "amount_to_pay": 154500}
}}
```

- 404 bila pembayaran VA belum aktif di PoP itu, atau nomor VA pelanggan belum
  diterbitkan (operator menerbitkannya dari aplikasi Network Bill).
- `next_bill: null` berarti tidak ada tagihan yang bisa dibayar lewat VA.
- Satu pembayaran VA melunasi satu tagihan, yang tertua lebih dulu.

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
5. **Tagihan dan VA** dibaca live saat dibutuhkan.

Skrip yang membaca modem lewat IP/MAC wajib memakai data hasil sinkron terbaru:
sesudah ganti modem, IP/MAC diralat di Network Bill dan baru sampai ke aplikasi
Anda pada sinkron berikutnya.
