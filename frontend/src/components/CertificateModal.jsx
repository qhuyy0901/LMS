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
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-955/80 p-4 backdrop-blur-sm">
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
      <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl transition-all animate-fade-in-up">
        {/* Header Actions */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 px-6 py-4 print:hidden">
          <h3 className="text-xs font-semibold tracking-wider uppercase text-slate-850 dark:text-slate-200">Chứng chỉ hoàn thành</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-full bg-purple-600 px-4.5 py-2 text-xs font-medium text-white hover:bg-purple-750 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              In / Tải về
            </button>
            {resolvedPdfUrl && (
              <a
                href={resolvedPdfUrl}
                download
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-450 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" strokeWidth={1.5} />
                <span>Tải PDF</span>
              </a>
            )}
            <button
              onClick={onClose}
              className="rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2 text-slate-555 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] text-xs font-medium cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>

        {/* Certificate Display Area */}
        <div id="certificate-print-area" className="relative bg-[#FCFBF9] p-8 md:p-12 text-center select-none text-slate-900">
          {/* Certificate Frame/Border */}
          <div className="relative border-[8px] border-double border-amber-800/80 p-8 md:p-12 bg-amber-50/5 overflow-hidden">
            {/* Watermark/Background ornament */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
              <Trophy className="w-[300px] h-[300px] text-amber-950" strokeWidth={1} />
            </div>

            {/* Content */}
            <header className="mb-6 flex flex-col items-center">
              <div className="mb-2.5 h-0.5 w-16 bg-amber-800" />
              <p className="text-[9px] font-mono tracking-[0.25em] text-amber-800 uppercase">Skillio E-Learning Platform</p>
              <h2 className="mt-4 font-serif text-3xl font-semibold tracking-wide text-slate-900 md:text-4xl">
                CHỨNG CHỈ HOÀN THÀNH
              </h2>
              <div className="mt-2 h-0.5 w-40 bg-amber-800/30" />
            </header>

            <main className="my-8">
              <p className="font-serif italic text-xs text-slate-500">Hệ thống đào tạo trực tuyến Skillio trân trọng chứng nhận:</p>
              <h3 className="my-5 font-serif text-2xl font-semibold text-amber-900 md:text-3xl tracking-wide uppercase">
                {certificate.studentName || 'Học viên'}
              </h3>
              <p className="font-serif italic text-xs text-slate-500">Đã hoàn thành xuất sắc khóa học:</p>
              <h4 className="my-4 text-base font-semibold text-slate-900 md:text-lg max-w-xl mx-auto leading-relaxed">
                {certificate.courseTitle}
              </h4>
              <p className="text-[10px] text-slate-555 mt-8 font-medium font-mono">
                Cấp ngày: <span className="font-semibold text-slate-700">{issuedDate ? dateFmt.format(new Date(issuedDate)) : 'Chưa cấp'}</span>
              </p>
            </main>

            <footer className="mt-12 flex flex-col justify-between gap-6 border-t border-slate-200/50 pt-6 text-[9.5px] text-slate-400 font-medium md:flex-row md:items-end">
              <div className="text-left space-y-1 font-mono">
                <p>Mã chứng chỉ: <span className="font-semibold text-slate-600 uppercase">{certNo}</span></p>
                <p>Mã xác thực: <span className="font-semibold text-slate-500">{verifyCode || 'N/A'}</span></p>
              </div>
              <div className="text-right space-y-1.5 flex flex-col items-end print:hidden font-mono">
                <p className="text-amber-800 font-semibold uppercase tracking-widest text-[8.5px]">Hệ thống Skillio</p>
                <div className="w-20 h-px bg-slate-200"></div>
                <p className="text-slate-400 text-[8px]">Ban điều hành đào tạo</p>
              </div>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}
