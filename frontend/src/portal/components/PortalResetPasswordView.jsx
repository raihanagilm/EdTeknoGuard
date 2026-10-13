import React from 'react';
import { AlertCircle, ArrowLeft } from 'lucide-react';

/* ░░░ Komponen Maskot Animasi Si Router Pusing (pusing.html) ░░░ */
function RouterPusingMascot({ className = "w-32 h-24" }) {
  return (
    <div className={`${className} flex items-center justify-center pointer-events-none drop-shadow-md`}>
      <svg
        className="w-full h-full overflow-visible"
        viewBox="0 0 240 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g className="pusing-rig-torso">
          {/* Kaki Kiri & Kanan */}
          <g className="pusing-rig-leg-l">
            <path d="M85 118V154H101V118" fill="#20C5D2" />
            <path d="M85 118V154H101V118" stroke="#0F172A" strokeWidth="4" strokeLinejoin="round" />
          </g>
          <g className="pusing-rig-leg-r">
            <path d="M139 118V154H155V118" fill="#20C5D2" />
            <path d="M139 118V154H155V118" stroke="#0F172A" strokeWidth="4" strokeLinejoin="round" />
          </g>

          {/* Antena Kiri & Kanan */}
          <g className="pusing-rig-antenna-l">
            <path
              d="M78 53.9999L68 17.9999C67 13.9999 73 12.9999 76 15.9999L88 51.9999L78 53.9999Z"
              fill="#2563EB"
              stroke="#0F172A"
              strokeWidth="5"
              strokeLinejoin="round"
            />
          </g>
          <g className="pusing-rig-antenna-r">
            <path
              d="M162 53.9999L172 17.9999C173 13.9999 167 12.9999 164 15.9999L152 51.9999L162 53.9999Z"
              fill="#2563EB"
              stroke="#0F172A"
              strokeWidth="5"
              strokeLinejoin="round"
            />
          </g>

          {/* Bodi Router */}
          <g className="pusing-rig-body">
            <path
              d="M58 54C72 50 168 50 182 54C196 58 206 102 200 120C196 128 178 132 120 132C62 132 44 128 40 120C34 102 44 58 58 54Z"
              fill="#20C5D2"
              stroke="#0F172A"
              strokeWidth="5.5"
              strokeLinejoin="round"
            />
            <path d="M44 114C70 118 170 118 196 114" stroke="#0F172A" strokeWidth="3.5" strokeLinecap="round" />
            <path
              d="M120 125.5C121.933 125.5 123.5 123.933 123.5 122C123.5 120.067 121.933 118.5 120 118.5C118.067 118.5 116.5 120.067 116.5 122C116.5 123.933 118.067 125.5 120 125.5Z"
              stroke="#0F172A"
              strokeWidth="1.8"
            />
            <path d="M120 119V122" stroke="#0F172A" strokeWidth="1.8" strokeLinecap="round" />
          </g>

          {/* Lampu Indikator LED Kuning Berdenyut */}
          <g className="pusing-rig-leds">
            <path
              className="pusing-led-1"
              d="M64 124.5C65.3807 124.5 66.5 123.381 66.5 122C66.5 120.619 65.3807 119.5 64 119.5C62.6193 119.5 61.5 120.619 61.5 122C61.5 123.381 62.6193 124.5 64 124.5Z"
              fill="#0F172A"
            />
            <path
              className="pusing-led-2"
              d="M72 124.5C73.3807 124.5 74.5 123.381 74.5 122C74.5 120.619 73.3807 119.5 72 119.5C70.6193 119.5 69.5 120.619 69.5 122C69.5 123.381 70.6193 124.5 72 124.5Z"
              fill="#0F172A"
            />
            <path
              className="pusing-led-3"
              d="M80 124.5C81.3807 124.5 82.5 123.381 82.5 122C82.5 120.619 81.3807 119.5 80 119.5C78.6193 119.5 77.5 120.619 77.5 122C77.5 123.381 78.6193 124.5 80 124.5Z"
              fill="#0F172A"
            />
          </g>

          {/* Mata Pusing Berputar Spiral */}
          <g className="pusing-rig-eyes">
            <path
              d="M86 84C86 85.5913 86.6321 87.1174 87.7574 88.2426C88.8826 89.3679 90.4087 90 92 90C93.5913 90 95.1174 89.3679 96.2426 88.2426C97.3679 87.1174 98 85.5913 98 84C98 82.4087 97.3679 80.8826 96.2426 79.7574C95.1174 78.6321 93.5913 78 92 78C90.4087 78 88.8826 78.6321 87.7574 79.7574C86.6321 80.8826 86 82.4087 86 84ZM89 84C89 84.7956 89.3161 85.5587 89.8787 86.1213C90.4413 86.6839 91.2044 87 92 87C92.7956 87 93.5587 86.6839 94.1213 86.1213C94.6839 85.5587 95 84.7956 95 84C95 83.2044 94.6839 82.4413 94.1213 81.8787C93.5587 81.3161 92.7956 81 92 81C91.2044 81 90.4413 81.3161 89.8787 81.8787C89.3161 82.4413 89 83.2044 89 84Z"
              stroke="#0F172A"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path
              d="M142 84C142 85.5913 142.632 87.1174 143.757 88.2426C144.883 89.3679 146.409 90 148 90C149.591 90 151.117 89.3679 152.243 88.2426C153.368 87.1174 154 85.5913 154 84C154 82.4087 153.368 80.8826 152.243 79.7574C151.117 78.6321 149.591 78 148 78C146.409 78 144.883 78.6321 143.757 79.7574C142.632 80.8826 142 82.4087 142 84ZM145 84C145 84.7956 145.316 85.5587 145.879 86.1213C146.441 86.6839 147.204 87 148 87C148.796 87 149.559 86.6839 150.121 86.1213C150.684 85.5587 151 84.7956 151 84C151 83.2044 150.684 82.4413 150.121 81.8787C149.559 81.3161 148.796 81 148 81C147.204 81 146.441 81.3161 145.879 81.8787C145.316 82.4413 145 83.2044 145 84Z"
              stroke="#0F172A"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </g>

          {/* Mulut Pusing Bergelombang */}
          <g className="pusing-rig-mouth">
            <path
              d="M110 98C113.333 95.3333 116.667 95.3333 120 98C123.333 100.667 126.667 100.667 130 98"
              stroke="#0F172A"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
          </g>

          {/* Tangan Kiri Menempel Kepala */}
          <g className="pusing-rig-arm-l">
            <path
              d="M39 103C16.81 89.9516 22.1448 63.7323 51.2985 62.0229"
              stroke="#0F172A"
              strokeWidth="4.5"
              strokeLinecap="round"
            />
            <path
              d="M49.2601 56.6381C52.2569 58.0522 53.54 61.628 52.1259 64.6248C50.7118 67.6217 47.136 68.9047 44.1392 67.4906C41.1424 66.0765 39.8593 62.5008 41.2734 59.5039C42.6875 56.5071 46.2633 55.224 49.2601 56.6381Z"
              fill="#20C5D2"
              stroke="#0F172A"
              strokeWidth="3.5"
            />
          </g>

          {/* Tangan Kanan Menempel Kepala */}
          <g className="pusing-rig-arm-r">
            <path
              d="M201.761 102.567C223.951 89.5185 218.616 63.2992 189.463 61.5898"
              stroke="#0F172A"
              strokeWidth="4.5"
              strokeLinecap="round"
            />
            <path
              d="M191.501 56.205C188.504 57.6191 187.221 61.1949 188.635 64.1917C190.049 67.1886 193.625 68.4716 196.622 67.0575C199.619 65.6434 200.902 62.0677 199.488 59.0708C198.073 56.074 194.498 54.7909 191.501 56.205Z"
              fill="#20C5D2"
              stroke="#0F172A"
              strokeWidth="3.5"
            />
          </g>

          {/* Bintang-Bintang Pusing Berputar Melayang di Atas Kepala */}
          <g className="pusing-rig-prop">
            <path
              d="M103.833 41.9131L106.778 48.0512L112.667 49.0742L107.759 53.1663L109.722 59.3044L103.833 55.2123L97.9444 59.3044L99.9074 53.1663L95 49.0742L100.889 48.0512L103.833 41.9131Z"
              fill="#F59E0B"
            />
            <path
              d="M121.5 50.6086L124.444 56.7467L130.333 57.7698L125.426 61.8618L127.389 67.9999L121.5 63.9079L115.611 67.9999L117.574 61.8618L112.667 57.7698L118.556 56.7467L121.5 50.6086Z"
              fill="#F59E0B"
            />
            <path
              d="M139.167 41.9131L142.111 48.0512L148 49.0742L143.093 53.1663L145.056 59.3044L139.167 55.2123L133.278 59.3044L135.241 53.1663L130.333 49.0742L136.222 48.0512L139.167 41.9131Z"
              fill="#F59E0B"
            />
            <path
              d="M107.146 26.6954L109.722 32.0663L114.875 32.9614L110.581 36.542L112.299 41.9128L107.146 38.3323L101.993 41.9128L103.711 36.542L99.4167 32.9614L104.569 32.0663L107.146 26.6954Z"
              fill="#F59E0B"
            />
            <path
              d="M135.854 26.6954L138.431 32.0663L143.583 32.9614L139.289 36.542L141.007 41.9128L135.854 38.3323L130.701 41.9128L132.419 36.542L128.125 32.9614L133.278 32.0663L135.854 26.6954Z"
              fill="#F59E0B"
            />
            <path
              d="M121.5 18L123.708 23.3708L128.125 24.266L124.444 27.8465L125.917 33.2174L121.5 29.6368L117.083 33.2174L118.556 27.8465L114.875 24.266L119.292 23.3708L121.5 18Z"
              fill="#F59E0B"
            />
          </g>
        </g>
      </svg>
    </div>
  );
}

export function PortalResetPasswordView({ onBackToLogin }) {
  return (
    <div className="h-[100dvh] w-full bg-slate-200 flex items-center justify-center p-0 sm:p-4 text-slate-900 font-sans overflow-hidden">
      <div className="w-full sm:max-w-[430px] h-[100dvh] sm:h-[92dvh] bg-white sm:rounded-3xl sm:shadow-2xl sm:border sm:border-slate-200/80 flex flex-col overflow-hidden relative">

        {/* ░░░ PANEL ATAS: gradient biru diperbesar + Maskot Si Router Pusing ░░░ */}
        <div className="relative bg-gradient-to-br from-sky-500 via-blue-600 to-blue-800 h-[210px] sm:h-[230px] overflow-hidden shrink-0">
          {/* Ornamen dekoratif */}
          <div className="absolute -top-14 -right-14 w-48 h-48 bg-white/10 rounded-full pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-52 h-52 bg-cyan-300/10 rounded-full pointer-events-none" />

          {/* Header Brand Atas: Logo Frame 36 + TeknoCust + Subtitle */}
          <div className="relative z-10 pt-4 px-5">
            <div className="flex items-center gap-3">
              <img
                src="/frame-36.png"
                alt="TeknoIndonet Logo"
                className="w-11 h-11 sm:w-12 sm:h-12 object-contain drop-shadow-md shrink-0"
              />
              <div className="min-w-0">
                <div className="text-white text-xl sm:text-2xl font-black tracking-tight leading-none drop-shadow-xs">
                  Tekno<span className="text-cyan-200 font-extrabold">Cust</span>
                </div>
                <div className="text-blue-100/90 text-[11px] sm:text-xs mt-1 font-medium leading-tight">
                  Layanan Mandiri Khusus Pelanggan TeknoIndonet
                </div>
              </div>
            </div>
          </div>

          {/* MASKOT Si Router Pusing di tengah panel biru */}
          <div className="absolute inset-0 flex items-center justify-center pt-14 pb-2 pointer-events-none">
            <RouterPusingMascot className="w-32 h-24 sm:w-36 sm:h-28" />
          </div>
        </div>

        {/* ░░░ PANEL BAWAH: card putih overlap + panduan reset kata sandi ░░░ */}
        <div className="relative -mt-5 bg-white rounded-t-[1.75rem] shadow-2xl flex-1 flex flex-col justify-between overflow-y-auto z-10">
          <div className="px-5 pt-4 pb-4 sm:px-6 sm:pt-5 sm:pb-5 flex flex-col justify-between min-h-full">
            <div>
              {/* Header Title: Lupa Password */}
              <div className="text-center mb-3 sm:mb-4">
                <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  Lupa Password
                </h1>
                <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                  Bantuan pemulihan kata sandi akun pelanggan TeknoCust
                </p>
              </div>

              {/* Box Informasi Resmi Pemulihan Sandi */}
              <div className="p-4 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-3 leading-relaxed bg-white shadow-xs">
                <div className="font-bold text-slate-800 flex items-center gap-2 text-xs">
                  <AlertCircle className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Dikelola Langsung Oleh Admin NOC</span>
                </div>
                <p className="text-slate-600 text-xs leading-relaxed">
                  Untuk menjaga keamanan akun Anda dan mencegah akses tidak sah, pengaturan ulang kata sandi ditangani langsung oleh <strong>Tim Admin NOC TeknoIndonet</strong>.
                </p>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/90 space-y-2 text-xs text-slate-600">
                  <div className="font-semibold text-slate-800">Langkah Mudah Pemulihan Sandi:</div>
                  <ul className="list-disc list-inside space-y-1 text-slate-600 leading-relaxed">
                    <li>Hubungi Admin atau Teknisi TeknoIndonet wilayah Anda.</li>
                    <li>Sebutkan <strong>Nama Terdaftar</strong>, <strong>No. WA</strong>, atau <strong>IP Router</strong> Anda.</li>
                    <li>Admin akan mengatur ulang kata sandi Anda kembali ke default (<strong className="font-mono text-blue-700 font-bold">123456</strong>).</li>
                  </ul>
                </div>
              </div>

              {/* Tombol Kembali ke Halaman Masuk */}
              <button
                type="button"
                onClick={onBackToLogin}
                className="w-full mt-4 py-2.5 sm:py-3 px-4 rounded-lg bg-gradient-to-r from-sky-500 via-blue-600 to-blue-700 hover:from-sky-600 hover:to-blue-800 text-white font-bold text-xs sm:text-sm shadow-sm transition active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
              >
                <ArrowLeft className="w-4 h-4 shrink-0" />
                <span>Kembali ke Halaman Masuk</span>
              </button>
            </div>

            {/* Footer copyright */}
            <div className="pt-3 pb-1 text-center text-[10px] text-slate-400 font-mono shrink-0">
              &copy; 2026 TeknoCust &bull; Layanan Mandiri Pelanggan TeknoIndonet
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
