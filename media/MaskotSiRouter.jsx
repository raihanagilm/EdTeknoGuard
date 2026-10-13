import React, { useId } from 'react';
import { MASCOTS_DATA } from './mascotsData';

/**
 * Daftar semua nama varian animasi yang tersedia:
 * 'admin-noc', 'ai-bot', 'analisis-redaman', 'atur-kabel', 'berhasil',
 * 'berpikir', 'bingung', 'bintang', 'bosan', 'gangguan', 'gembira',
 * 'jijik', 'juara', 'layanan-pelanggan', 'manager-it', 'marah',
 * 'memantau', 'menganalisis', 'mengantuk', 'menyapa', 'pelanggan',
 * 'percaya-diri', 'pusing', 'rekomendasi', 'sales-marketing', 'security',
 * 'sedih', 'siaga-24jam', 'surveyor', 'takut', 'teknisi', 'terkejut', 'tersipu'
 */
export const MASCOT_LIST = Object.keys(MASCOTS_DATA);

/**
 * Komponen MaskotSiRouter
 * 
 * @param {Object} props
 * @param {string} props.variant - Nama animasi (default: 'menyapa')
 * @param {number|string} props.width - Lebar SVG (default: 240)
 * @param {number|string} props.height - Tinggi SVG (default: 200)
 * @param {boolean} props.showShadow - Tampilkan efek bayangan bawah (default: true)
 * @param {string} props.className - Class CSS tambahan untuk container luar
 * @param {Object} props.style - Inline style tambahan
 */
export const MaskotSiRouter = ({
  variant = 'menyapa',
  width = 240,
  height = 200,
  showShadow = true,
  className = '',
  style = {},
  ...rest
}) => {
  const instanceId = useId().replace(/:/g, '');
  const data = MASCOTS_DATA[variant] || MASCOTS_DATA['menyapa'];

  if (!data) return null;

  // Prefix CSS kelas agar keyframes dan animasi scoped & tidak tabrakan antar instance
  const scopedScopeClass = `mascot-scope-${variant}-${instanceId}`;
  
  // Scoped CSS: kita masukkan ke dalam style tag yang hanya aktif di container ini
  // Ganti selector .mascot-svg dengan selector ukuran proporsional
  const scopedCss = `
    .${scopedScopeClass} {
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      position: relative;
    }
    .${scopedScopeClass} .mascot-svg {
      width: ${typeof width === 'number' ? `${width}px` : width};
      height: ${typeof height === 'number' ? `${height}px` : height};
      overflow: visible;
      display: block;
    }
    ${data.css}
  `;

  return (
    <div
      className={`mascot-router-wrapper ${scopedScopeClass} ${className}`}
      style={style}
      {...rest}
    >
      <style>{scopedCss}</style>
      <div
        dangerouslySetInnerHTML={{ __html: data.svg }}
        style={{ display: 'contents' }}
      />
      {showShadow && <div className="shadow" />}
    </div>
  );
};

export default MaskotSiRouter;
