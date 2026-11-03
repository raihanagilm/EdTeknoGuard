"""
Pengujian modul Tagihan & Pembayaran Portal Pelanggan TeknoCust.

Yang diuji adalah logika bisnis nyata di PaymentService: penautan identitas
(slug PoP + id numerik), pembedaan keadaan Virtual Account, perapian tagihan,
dan mesin keputusan "sudah bayar". Hanya batas HTTP ke Network Bill yang
diganti stub; seluruh aturan SOP di api-v1.md diuji apa adanya.

Bentuk jawaban stub disalin dari jawaban nyata server Network Bill
(pop.teknoindo.net) agar tidak melenceng dari data produksi.
"""
import unittest
from unittest.mock import patch

from starlette.testclient import TestClient

from app.main import app
from app.portal.modules.payment import service as payment_service
from app.portal.modules.payment.service import PaymentService


def pelanggan(kantor, id_pelanggan):
    """Objek pelanggan minimal: hanya dua kolom yang dipakai untuk identitas."""
    return type("PelangganStub", (), {"kantor": kantor, "id_pelanggan": str(id_pelanggan)})()


def ok(data):
    return {"ok": True, "status": 200, "data": data, "message": None, "retry_after": None}


def gagal(status, message="galat", retry_after=None):
    return {"ok": False, "status": status, "data": None, "message": message, "retry_after": retry_after}


# Satu tagihan belum lunas yang sudah lewat jatuh tempo, bentuk sesuai API.
INVOICE_UNPAID = {
    "id": 501, "number": "INV-2026-10-0012", "type": "langganan",
    "billing_period": "2026-10", "issue_date": "2026-10-01", "due_date": "2026-10-30",
    "subtotal": 150000, "discount": 0, "total": 150000,
    "status": "unpaid", "overdue": True,
    # API mengirim package_speed sebagai ANGKA, bukan "20 Mbps".
    "items": [{"package_name": "Home 20", "package_speed": 20, "price": 150000,
               "quantity": 1, "subtotal": 150000}],
    "payment": None,
}

INVOICE_UNPAID_BERIKUT = {
    "id": 502, "number": "INV-2026-11-0012", "type": "langganan",
    "billing_period": "2026-11", "issue_date": "2026-11-01", "due_date": "2026-11-30",
    "subtotal": 175000, "discount": 0, "total": 175000,
    "status": "unpaid", "overdue": False, "items": [], "payment": None,
}

INVOICE_PAID_TUNAI = {
    "id": 400, "number": "INV-2026-09-0012", "type": "langganan",
    "billing_period": "2026-09", "issue_date": "2026-09-01", "due_date": "2026-09-30",
    "subtotal": 150000, "discount": 0, "total": 150000,
    "status": "paid", "overdue": False, "items": [],
    "payment": {"date": "2026-09-28", "amount": 150000, "method": "tunai"},
}

VA_PAYABLE = {
    "next_bill": {"invoice_id": 501, "number": "INV-2026-10-0012", "total": 150000},
    "channels": [
        {"channel": "802", "bank": "Mandiri Virtual Account",
         "va_number": "3718 4972 0000 0012", "admin_fee": 4000, "amount_to_pay": 154000},
        # Kode kanal di luar tabel yang dikenal portal WAJIB tetap dirender.
        {"channel": "999", "bank": "Bank Baru Virtual Account",
         "va_number": "9999497200000012", "admin_fee": 0, "amount_to_pay": 150000},
    ],
}


class TestPaymentIdentity(unittest.TestCase):
    """Identitas pelanggan di Network Bill = slug PoP (kolom kantor) + id numerik."""

    def test_identitas_numerik_tertaut(self):
        self.assertEqual(
            PaymentService.resolve_identity(pelanggan("banyumas", "337")),
            ("banyumas", "337"),
        )

    def test_kode_pelanggan_ditolak_sebagai_id(self):
        """
        Kode seperti BMS-0001 DILARANG dipakai sebagai id: di PoP banyumas
        pelanggan dengan code BMS-0001 ber-id 337, sehingga angka dari kode
        akan menunjuk ke pelanggan yang salah.
        """
        for kode in ("BMS-0001", "PLG-0012", "CUST-SLA-003", ""):
            self.assertIsNone(PaymentService.resolve_identity(pelanggan("banyumas", kode)))

    def test_kantor_kosong_berarti_belum_tertaut(self):
        self.assertIsNone(PaymentService.resolve_identity(pelanggan("", "337")))

    def test_pelanggan_none(self):
        self.assertIsNone(PaymentService.resolve_identity(None))


class TestPaymentShaping(unittest.TestCase):

    def test_kecepatan_paket_angka_diberi_satuan(self):
        shaped = PaymentService.shape_invoice(INVOICE_UNPAID)
        self.assertEqual(shaped["items"][0]["package_speed"], "20 Mbps")

    def test_overdue_diambil_dari_api_bukan_dihitung(self):
        """
        issue_date bisa lebih baru dari due_date pada data historis, jadi telat
        tidak boleh dihitung dari tanggal. Nilai overdue API dipakai apa adanya.
        """
        aneh = dict(INVOICE_UNPAID, issue_date="2026-10-27", due_date="2025-06-15", overdue=False)
        self.assertFalse(PaymentService.shape_invoice(aneh)["overdue"])

    def test_metode_gateway_diberi_label_ramah_warga(self):
        gw = dict(INVOICE_PAID_TUNAI, payment={"date": "2026-10-27", "amount": 150000, "method": "gateway"})
        self.assertEqual(PaymentService.shape_invoice(gw)["payment"]["method_label"], "Virtual Account")

    def test_metode_tunai_dan_transfer(self):
        self.assertEqual(
            PaymentService.shape_invoice(INVOICE_PAID_TUNAI)["payment"]["method_label"],
            "Tunai ke Petugas",
        )
        tf = dict(INVOICE_PAID_TUNAI, payment={"date": "2026-10-01", "amount": 150000, "method": "transfer"})
        self.assertEqual(PaymentService.shape_invoice(tf)["payment"]["method_label"], "Transfer Bank")

    def test_nomor_va_bersih_16_digit(self):
        """Tampilan boleh dikelompokkan, tapi nilai yang dikirim harus digit saja."""
        shaped = PaymentService.shape_channel(VA_PAYABLE["channels"][0])
        self.assertEqual(shaped["va_number"], "3718497200000012")
        self.assertEqual(len(shaped["va_number"]), 16)

    def test_amount_to_pay_tidak_dihitung_ulang(self):
        """Nominal dari API diteruskan apa adanya, termasuk bila admin_fee 0."""
        shaped = PaymentService.shape_channel(VA_PAYABLE["channels"][1])
        self.assertEqual(shaped["amount_to_pay"], 150000)
        self.assertEqual(shaped["admin_fee"], 0)

    def test_kanal_tak_dikenal_tetap_dirender_dengan_label_bank(self):
        shaped = PaymentService.shape_channel(VA_PAYABLE["channels"][1])
        self.assertEqual(shaped["channel"], "999")
        self.assertEqual(shaped["bank"], "Bank Baru Virtual Account")
        self.assertEqual(shaped["bank_key"], "")  # tanpa logo, tetap tampil

    def test_kanal_dikenal_dipetakan_ke_kunci_logo(self):
        self.assertEqual(PaymentService.shape_channel(VA_PAYABLE["channels"][0])["bank_key"], "mandiri")


class TestBillingPageStates(unittest.TestCase):
    """Keadaan halaman Tagihan harus dapat dibedakan satu per satu oleh frontend."""

    def setUp(self):
        # Cache dedupe dibersihkan agar tiap kasus membaca stub-nya sendiri.
        payment_service._cache.clear()

    def _page(self, inv_res, va_res, pel=None):
        with patch.object(payment_service.NetworkBillService, "fetch_invoices", return_value=inv_res), \
             patch.object(payment_service.NetworkBillService, "fetch_virtual_account", return_value=va_res):
            return PaymentService.build_billing_page(pel or pelanggan("slawi", "2"))

    def test_belum_tertaut(self):
        page = self._page(ok([]), ok(VA_PAYABLE), pel=pelanggan("slawi", "PLG-0002"))
        self.assertEqual(page["va_state"], "not_linked")
        self.assertEqual(page["channels"], [])

    def test_va_nonaktif_di_pop_itu_404(self):
        """404 = pembayaran VA belum aktif. Tagihan tetap tampil, tanpa kartu bayar."""
        page = self._page(ok([INVOICE_UNPAID]), gagal(404, "Pembayaran VA belum aktif di PoP ini."))
        self.assertEqual(page["va_state"], "inactive")
        self.assertIsNone(page["next_bill"])
        self.assertEqual(page["unpaid_count"], 1)
        self.assertEqual(page["channels"], [])

    def test_nomor_va_belum_diterbitkan_channels_kosong(self):
        """channels [] harus berbeda dari 404, karena tindakan warganya berbeda."""
        page = self._page(ok([INVOICE_UNPAID]), ok({"next_bill": None, "channels": []}))
        self.assertEqual(page["va_state"], "not_issued")
        self.assertIsNone(page["next_bill"])

    def test_404_dan_channels_kosong_tidak_tertukar(self):
        a = self._page(ok([]), gagal(404))
        payment_service._cache.clear()
        b = self._page(ok([]), ok({"next_bill": None, "channels": []}))
        self.assertNotEqual(a["va_state"], b["va_state"])

    def test_tanpa_tagihan(self):
        page = self._page(ok([]), ok({"next_bill": None, "channels": VA_PAYABLE["channels"]}))
        self.assertEqual(page["va_state"], "no_bill")

    def test_kartu_bayar_siap_dan_tagihan_lain_jadi_keterangan(self):
        page = self._page(ok([INVOICE_UNPAID, INVOICE_UNPAID_BERIKUT]), ok(VA_PAYABLE))
        self.assertEqual(page["va_state"], "payable")
        self.assertEqual(page["next_bill"]["invoice_id"], 501)
        self.assertTrue(page["next_bill"]["overdue"])
        self.assertEqual(page["unpaid_count"], 2)
        self.assertEqual(page["unpaid_total"], 325000)
        # Satu bayar satu tagihan: sisanya hanya keterangan, bukan pilihan.
        self.assertEqual([i["id"] for i in page["other_unpaid"]], [502])
        self.assertEqual(len(page["channels"]), 2)

    def test_tanpa_kartu_bayar_tagihan_tidak_tampil_dua_kali(self):
        """
        Saat VA mati, seluruh tagihan tampil sebagai daftar biasa; other_unpaid
        wajib kosong agar tidak terbentuk daftar ganda di layar.
        """
        page = self._page(ok([INVOICE_UNPAID, INVOICE_UNPAID_BERIKUT]), gagal(404))
        self.assertEqual(page["unpaid_count"], 2)
        self.assertEqual(page["other_unpaid"], [])

    def test_galat_pembacaan_tagihan(self):
        page = self._page(gagal(429, "Too Many Attempts.", retry_after=30), ok(VA_PAYABLE))
        self.assertFalse(page["ok"])
        self.assertEqual(page["va_state"], "error")
        self.assertEqual(page["status"], 429)
        self.assertEqual(page["retry_after"], 30)


class TestAfterPaymentCheck(unittest.TestCase):

    def setUp(self):
        payment_service._cache.clear()

    def _check(self, va_res, known_id, paid_res=None, conn_res=None):
        with patch.object(payment_service.NetworkBillService, "fetch_virtual_account", return_value=va_res), \
             patch.object(payment_service.NetworkBillService, "fetch_invoices",
                          return_value=paid_res or ok([INVOICE_PAID_TUNAI])), \
             patch.object(payment_service.NetworkBillService, "fetch_connection_status",
                          return_value=conn_res or gagal(404)):
            return PaymentService.check_after_payment(pelanggan("slawi", "2"), known_id)

    def test_belum_berubah_berarti_belum_lunas(self):
        res = self._check(ok(VA_PAYABLE), 501)
        self.assertTrue(res["ok"])
        self.assertFalse(res["settled"])
        self.assertEqual(res["next_invoice_id"], 501)

    def test_next_bill_berganti_berarti_lunas(self):
        berganti = {"next_bill": {"invoice_id": 502, "number": "INV-2026-11-0012", "total": 175000},
                    "channels": VA_PAYABLE["channels"]}
        res = self._check(ok(berganti), 501)
        self.assertTrue(res["settled"])
        self.assertEqual(res["next_invoice_id"], 502)

    def test_next_bill_null_berarti_lunas_semua(self):
        res = self._check(ok({"next_bill": None, "channels": VA_PAYABLE["channels"]}), 501)
        self.assertTrue(res["settled"])
        self.assertIsNone(res["next_bill"])

    def test_router_masih_isolir_tidak_menjanjikan_internet_nyala(self):
        conn = ok([{"customer_id": 2, "status": "aktif", "online": None,
                    "router_isolated": True, "router_isolated_at": "2026-10-20T10:00:00+07:00"}])
        res = self._check(ok({"next_bill": None, "channels": VA_PAYABLE["channels"]}), 501, conn_res=conn)
        self.assertTrue(res["settled"])
        self.assertTrue(res["router_isolated"])

    def test_modul_router_mati_status_isolir_tidak_diketahui(self):
        res = self._check(ok({"next_bill": None, "channels": VA_PAYABLE["channels"]}), 501, conn_res=gagal(404))
        self.assertIsNone(res["router_isolated"])

    def test_429_diteruskan_dengan_retry_after(self):
        res = self._check(gagal(429, "Too Many Attempts.", retry_after=15), 501)
        self.assertFalse(res["ok"])
        self.assertFalse(res["settled"])
        self.assertEqual(res["retry_after"], 15)

    def test_belum_tertaut_tidak_memanggil_api(self):
        res = PaymentService.check_after_payment(pelanggan("slawi", "PLG-0002"), 501)
        self.assertFalse(res["ok"])
        self.assertFalse(res["settled"])


class TestPaymentCache(unittest.TestCase):
    """
    Batas 120 request per menit berlaku untuk SELURUH portal, jadi pembacaan
    serentak harus di-dedupe. Tetapi kegagalan sementara tidak boleh ikut
    tersimpan, agar pelanggan tidak terkunci pada galat selama beberapa detik.
    """

    def setUp(self):
        payment_service._cache.clear()

    def test_pembacaan_berulang_di_dedupe(self):
        with patch.object(payment_service.NetworkBillService, "fetch_invoices",
                          return_value=ok([INVOICE_UNPAID])) as m:
            for _ in range(5):
                PaymentService.read_invoices("slawi", "2", status="unpaid")
            self.assertEqual(m.call_count, 1)

    def test_galat_429_tidak_di_cache(self):
        with patch.object(payment_service.NetworkBillService, "fetch_virtual_account",
                          return_value=gagal(429, "Too Many Attempts.")) as m:
            PaymentService.read_virtual_account("slawi", "2")
            PaymentService.read_virtual_account("slawi", "2")
            self.assertEqual(m.call_count, 2)

    def test_404_di_cache_karena_keadaan_tetap(self):
        with patch.object(payment_service.NetworkBillService, "fetch_virtual_account",
                          return_value=gagal(404, "Pembayaran VA belum aktif di PoP ini.")) as m:
            PaymentService.read_virtual_account("tengaran", "1")
            PaymentService.read_virtual_account("tengaran", "1")
            self.assertEqual(m.call_count, 1)


class TestPaymentRoutesProtected(unittest.TestCase):
    """Endpoint tagihan wajib menolak akses tanpa sesi pelanggan."""

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_endpoint_pembayaran_butuh_login(self):
        self.client.cookies.clear()
        for ep in ("/portal/api/pembayaran",
                   "/portal/api/pembayaran/riwayat",
                   "/portal/api/pembayaran/periksa?invoice_id=501"):
            r = self.client.get(ep)
            self.assertEqual(r.status_code, 401, f"{ep} harus 401 tanpa sesi pelanggan")
            self.assertFalse(r.json().get("authenticated", True))


if __name__ == "__main__":
    unittest.main()
