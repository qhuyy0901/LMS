import { Award, Download, Trophy } from 'lucide-react';
import { getFileUrl } from '../utils/fileUtils';

const dateFmt = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

export default function CertificateModal({ certificate, onClose }) {
  if (!certificate) return null;

  const issuedDate = certificate.ngayCap || certificate.issuedAt;
  const certNo = certificate.soChungChi || certificate.certificateNo;
  const verifyCode = certificate.maXacThuc || certificate.verifyCode;
  const pdfUrl = certificate.pdfUrl;
  const resolvedPdfUrl = pdfUrl ? getFileUrl(pdfUrl) : null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/70 p-4 backdrop-blur-sm">
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #certificate-print-area, #certificate-print-area * {
            visibility: visible !important;
          }
          #certificate-print-area {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            margin: 0 !important;
            padding: 2rem !important;
            background: white !important;
            z-index: 99999 !important;
          }
        }
      `}</style>
      <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl transition-all animate-fade-in-up">
        {/* Header Actions */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4 print:hidden">
          <h3 className="text-sm font-bold text-slate-950">Chứng chỉ hoàn thành</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white hover:bg-purple-700 shadow transition duration-200"
            >
              In / Tải về
            </button>
            {resolvedPdfUrl && (
              <a
                href={resolvedPdfUrl}
                download
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 shadow transition duration-200"
              >
                <Download className="h-3.5 w-3.5" />
                Tải PDF
              </a>
            )}
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition text-xs font-semibold"
            >
              Đóng
            </button>
          </div>
        </div>

        {/* Certificate Display Area */}
        <div id="certificate-print-area" className="relative bg-white p-8 md:p-12 text-center select-none">
          {/* Certificate Frame/Border */}
          <div className="relative border-[12px] border-double border-amber-800 p-8 md:p-12 bg-amber-50/5 overflow-hidden">
            {/* Watermark/Background ornament */}
            <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
              <Trophy className="w-[300px] h-[300px] text-amber-800" />
            </div>

            {/* Content */}
            <header className="mb-6 flex flex-col items-center">
              <div className="mb-2 h-1 w-20 bg-amber-800" />
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-800">Skillio E-Learning Platform</p>
              <h2 className="mt-4 font-serif text-3xl font-bold tracking-wide text-slate-900 md:text-4xl">
                CHỨNG CHỈ HOÀN THÀNH
              </h2>
              <div className="mt-2 h-0.5 w-40 bg-amber-800/40" />
            </header>

            <main className="my-8">
              <p className="font-serif italic text-sm text-slate-500">Hệ thống đào tạo trực tuyến Skillio trân trọng chứng nhận:</p>
              <h3 className="my-5 font-serif text-2xl font-black text-amber-900 md:text-3xl tracking-wide uppercase">
                {certificate.studentName || 'Học viên'}
              </h3>
              <p className="font-serif italic text-sm text-slate-500">Đã hoàn thành xuất sắc khóa học:</p>
              <h4 className="my-4 text-base font-bold text-slate-900 md:text-lg max-w-xl mx-auto leading-relaxed">
                {certificate.courseTitle}
              </h4>
              <p className="text-xs text-slate-500 mt-8 font-medium">
                Cấp ngày: <span className="font-semibold text-slate-700">{issuedDate ? dateFmt.format(new Date(issuedDate)) : 'Chưa cấp'}</span>
              </p>
            </main>

            <footer className="mt-12 flex flex-col justify-between gap-6 border-t border-slate-100 pt-6 text-[10px] text-slate-400 font-medium md:flex-row md:items-end">
              <div className="text-left space-y-1">
                <p>Mã chứng chỉ: <span className="font-semibold text-slate-600 uppercase">{certNo}</span></p>
                <p>Mã xác thực: <span className="font-semibold text-slate-500">{verifyCode || 'N/A'}</span></p>
              </div>
              <div className="text-right space-y-2 flex flex-col items-end print:hidden">
                <p className="text-amber-800 font-bold uppercase tracking-widest text-[9px]">Hệ thống Skillio</p>
                <div className="w-24 h-1 border-t border-slate-200"></div>
                <p className="text-slate-400 text-[8px]">Ban điều hành đào tạo</p>
              </div>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}
