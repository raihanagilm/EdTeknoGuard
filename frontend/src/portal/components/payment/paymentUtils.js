/**
 * Helper Utility Format Rupiah, Tanggal, & Virtual Account
 * Khusus domain modul pembayaran TeknoCust.
 */

export const rupiah = (n) =>
  n === null || n === undefined || n === '' ? '-' : `Rp ${Number(n).toLocaleString('id-ID')}`;

export const BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

/** "2026-10" -> "Oktober 2026" */
export const periodeTeks = (p) => {
  if (!p) return '';
  const [y, m] = String(p).split('-');
  const idx = Number(m) - 1;
  return BULAN[idx] ? `${BULAN[idx]} ${y}` : p;
};

/** "2026-10-30" -> "30 Okt 2026" */
export const tanggalTeks = (d) => {
  if (!d) return '-';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d;
  return `${dt.getDate()} ${BULAN[dt.getMonth()].slice(0, 3)} ${dt.getFullYear()}`;
};

/** Tampilan 4-4-4-4 agar mudah dibaca. Tombol salin tetap memakai 16 digit bersih. */
export const vaTampil = (va) => String(va || '').replace(/(\d{4})(?=\d)/g, '$1 ').trim();

export const jenisTagihanTeks = (type) => {
  const t = String(type || '').toLowerCase();
  if (t === 'langganan') return 'Iuran Langganan';
  if (t === 'pemasangan') return 'Biaya Pemasangan';
  return type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Tagihan';
};

/** Kanal bank default sesuai spesifikasi api-v1.md jika API PoP belum mengaktifkan VA */
export const getDefaultChannels = (customerId = '1', total = 125000) => {
  const cleanId = String(customerId || '1').padStart(4, '0');
  const fee = 4000;
  return [
    {
      channel: '802',
      bank: 'Mandiri',
      va_number: `371849720000${cleanId}`,
      admin_fee: fee,
      amount_to_pay: total + fee
    },
    {
      channel: '800',
      bank: 'BRI',
      va_number: `888849720000${cleanId}`,
      admin_fee: fee,
      amount_to_pay: total + fee
    },
    {
      channel: '702',
      bank: 'BCA',
      va_number: `123449720000${cleanId}`,
      admin_fee: fee,
      amount_to_pay: total + fee
    },
    {
      channel: '723',
      bank: 'BSI',
      va_number: `456749720000${cleanId}`,
      admin_fee: fee,
      amount_to_pay: total + fee
    }
  ];
};

