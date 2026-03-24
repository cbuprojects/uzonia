import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import CbuLogo   from '../assets/CBU_Logo.png';
import facebook  from '../assets/facebook.png';
import telegram  from '../assets/telegram.png';
import linkedin  from '../assets/linkedin.png';
import twitter   from '../assets/twitter.png';
import instagram from '../assets/instagram.png';
import youtube   from '../assets/youtube.png';

// ─── Config ───────────────────────────────────────────────────────────────────

const API_BASE_URL = 'http://localhost:8000';

// ─── Nav ──────────────────────────────────────────────────────────────────────

const NAV_PAGES = [
  { label: 'Calculations', icon: 'calculate',       path: '/' },
  { label: 'Uploads',      icon: 'upload_file',     path: '/uploads'      },
  { label: 'Repo',         icon: 'account_balance', path: '/repo'         },
  { label: 'Depo',         icon: 'savings',         path: '/depo'         },
  { label: 'Data',         icon: 'database',        path: '/data'         },
  { label: 'Holidays',     icon: 'calendar_month',  path: '/holidays'     },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const todayIso = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

const fmtRate  = (n: number): string => typeof n === 'number' ? `${n.toFixed(4)}%` : '—';
const fmtIndex = (n: number): string => typeof n === 'number' ? n.toFixed(4) : '—';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CalcResult {
  file_id:          string;
  calculation_way:  number;
  uzonia_date:      string;
  uzonia:           number;
  day_7_uzonia:     number;
  day_30_uzonia:    number;
  day_90_uzonia:    number;
  day_180_uzonia:   number;
  index:            number;
  output_file_path: string;
  filename:         string;
  media_type:       string;
}

// ─── Component ────────────────────────────────────────────────────────────────

const CalculationsPage: React.FC = () => {
  const navigate    = useNavigate();
  const currentPath = '/calculations';

  // ── Form state ────────────────────────────────────────────────────────────
  const [repoNFile,    setRepoNFile]    = useState<File | null>(null);
  const [repoMFile,    setRepoMFile]    = useState<File | null>(null);
  const [depositFile,  setDepositFile]  = useState<File | null>(null);
  const [cbDate,       setCbDate]       = useState<string>(todayIso());
  const [cbRate,       setCbRate]       = useState<string>('');
  const [cbDeposit,    setCbDeposit]    = useState<string>('');

  const repoNRef   = useRef<HTMLInputElement>(null);
  const repoMRef   = useRef<HTMLInputElement>(null);
  const depositRef = useRef<HTMLInputElement>(null);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [isLoading,  setIsLoading]  = useState(false);
  const [result,     setResult]     = useState<CalcResult | null>(null);
  const [error,      setError]      = useState<string | null>(null);
  const [toast,      setToast]      = useState<{ text: string; type: 'success'|'error'|'info' } | null>(null);
  const [dragOver,   setDragOver]   = useState<'n'|'m'|'d'|null>(null);
  const [progress,   setProgress]   = useState(0);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fonts ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const a = document.createElement('link');
    a.href = 'https://fonts.googleapis.com/icon?family=Material+Symbols+Outlined'; a.rel = 'stylesheet';
    document.head.appendChild(a);
    const b = document.createElement('link');
    b.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'; b.rel = 'stylesheet';
    document.head.appendChild(b);
    return () => { try{document.head.removeChild(a);}catch{} try{document.head.removeChild(b);}catch{} };
  }, []);

  const showToast = (text: string, type: 'success'|'error'|'info') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ── File helpers ──────────────────────────────────────────────────────────
  const validateExcel = (file: File): boolean => {
    const ok = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    if (!ok) showToast('Only Excel files (.xlsx / .xls) are allowed.', 'error');
    return ok;
  };

  const handleFileDrop = useCallback((e: React.DragEvent, slot: 'n'|'m'|'d') => {
    e.preventDefault(); setDragOver(null);
    const file = e.dataTransfer.files[0];
    if (!file || !validateExcel(file)) return;
    if (slot === 'n') setRepoNFile(file);
    if (slot === 'm') setRepoMFile(file);
    if (slot === 'd') setDepositFile(file);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>, slot: 'n'|'m'|'d') => {
    const file = e.target.files?.[0];
    if (!file || !validateExcel(file)) return;
    if (slot === 'n') setRepoNFile(file);
    if (slot === 'm') setRepoMFile(file);
    if (slot === 'd') setDepositFile(file);
  };

  // ── Numeric input guard ───────────────────────────────────────────────────
  const numericKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const pass = ['Backspace','Delete','Tab','Escape','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'];
    if (pass.includes(e.key)) return;
    if (!/[\d.]/.test(e.key)) e.preventDefault();
  };

  // ── Progress animation while loading ─────────────────────────────────────
  const startProgress = () => {
    setProgress(0);
    progressRef.current = setInterval(() => {
      setProgress(p => p >= 90 ? 90 : p + Math.random() * 4);
    }, 300);
  };
  const stopProgress = (success: boolean) => {
    if (progressRef.current) clearInterval(progressRef.current);
    setProgress(success ? 100 : 0);
    setTimeout(() => setProgress(0), 1200);
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!repoNFile || !repoMFile || !depositFile) {
      showToast('Please upload all three Excel files.', 'error'); return;
    }
    if (!cbDate) {
      showToast('Please select a date.', 'error'); return;
    }
    if (!cbRate || isNaN(parseFloat(cbRate))) {
      showToast('Please enter a valid CB Rate.', 'error'); return;
    }
    if (!cbDeposit || isNaN(parseFloat(cbDeposit))) {
      showToast('Please enter a valid CB Deposit.', 'error'); return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);
    startProgress();

    try {
      // Format date to DD.MM.YYYY for the API
      const [y,m,d] = cbDate.split('-');
      const formattedDate = `${y}-${m}-${d}`;

      const formData = new FormData();
      formData.append('repo_n_file',  repoNFile);
      formData.append('repo_m_file',  repoMFile);
      formData.append('deposit_file', depositFile);
      formData.append('cb_date',  formattedDate);
      formData.append('cb_rate',  cbRate);
      formData.append('cb_deposit', cbDeposit);

      const params = new URLSearchParams({
        cb_date:    formattedDate,
        cb_rate:    cbRate,
        cb_deposit: cbDeposit,
      });

      const res = await fetch(
        `${API_BASE_URL}/api/add_new_uzonia_calculation?`,
        { method: 'POST', body: formData }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Calculation failed.');
      }

      const data: CalcResult = await res.json();
      stopProgress(true);
      setResult(data);
      showToast('Calculation completed successfully!', 'success');
    } catch (err: any) {
      stopProgress(false);
      setError(err.message || 'An unexpected error occurred.');
      showToast(err.message || 'Calculation failed.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Download ──────────────────────────────────────────────────────────────
  const handleDownload = async () => {
    if (!result) return;
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/download_uzonia_file?file_id=${result.file_id}`
      );
      if (!res.ok) throw new Error('Download failed.');
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Download started!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Download failed.', 'error');
    }
  };

  // ── Reset ─────────────────────────────────────────────────────────────────
  const handleReset = () => {
    setRepoNFile(null); setRepoMFile(null); setDepositFile(null);
    setCbDate(todayIso()); setCbRate(''); setCbDeposit('');
    setResult(null); setError(null);
    if (repoNRef.current)   repoNRef.current.value   = '';
    if (repoMRef.current)   repoMRef.current.value   = '';
    if (depositRef.current) depositRef.current.value = '';
  };

  // ── Styles ────────────────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 13px', fontSize: '14px',
    background: '#f8fafc', color: '#0f172a', border: '1px solid #e2e8f0',
    borderRadius: '10px', outline: 'none', boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', marginBottom: '6px', fontWeight: '600',
    color: '#1e3a52', fontSize: '13px', letterSpacing: '0.2px',
  };

  const calcWayLabel = (way: number) => {
    if (way === 1) return { label: 'Way 1 — Repo N+M (≥ 500B, ≥ 5 deals)', color: '#065f46', bg: '#d1fae5' };
    if (way === 2) return { label: 'Way 2 — Repo + Deposit (≥ 500B)',       color: '#1e40af', bg: '#dbeafe' };
    return              { label: 'Way 3 — With CB Deposit supplement',       color: '#92400e', bg: '#fef3c7' };
  };

  // ── Nav pill ──────────────────────────────────────────────────────────────
  const NavBtn = ({ page }: { page: typeof NAV_PAGES[0] }) => {
    const active = page.path === currentPath;
    return (
      <button onClick={() => navigate(page.path)} style={{
        display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 14px',
        background: active ? 'rgba(255,255,255,0.18)' : 'transparent',
        border: active ? '1px solid rgba(255,255,255,0.35)' : '1px solid transparent',
        borderBottom: active ? '2px solid #e9b741' : '2px solid transparent',
        borderRadius: '8px', color: active ? 'white' : 'rgba(255,255,255,0.65)',
        fontSize: '14px', fontWeight: active ? '600' : '400',
        cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s', outline: 'none',
      }}
      onMouseEnter={e => { if(!active){e.currentTarget.style.background='rgba(255,255,255,0.10)'; e.currentTarget.style.color='white';} }}
      onMouseLeave={e => { if(!active){e.currentTarget.style.background='transparent'; e.currentTarget.style.color='rgba(255,255,255,0.65)';} }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>{page.icon}</span>
        {page.label}
      </button>
    );
  };

  // ── Drop zone ─────────────────────────────────────────────────────────────
  const DropZone = ({
    slot, file, label, description, icon,
  }: {
    slot: 'n'|'m'|'d'; file: File|null; label: string; description: string; icon: string;
  }) => {
    const ref = slot==='n' ? repoNRef : slot==='m' ? repoMRef : depositRef;
    const isOver = dragOver === slot;
    return (
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(slot); }}
        onDragLeave={() => setDragOver(null)}
        onDrop={e => handleFileDrop(e, slot)}
        onClick={() => ref.current?.click()}
        style={{
          flex: '1 1 0', minWidth: '200px',
          border: `2px dashed ${file ? '#10b981' : isOver ? '#0a3b5c' : '#cbd5e1'}`,
          borderRadius: '14px',
          background: file ? '#f0fdf4' : isOver ? '#eff6ff' : '#f8fafc',
          padding: '22px 16px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
          cursor: 'pointer', transition: 'all 0.2s',
          textAlign: 'center',
          boxShadow: file ? '0 2px 12px rgba(16,185,129,0.1)' : isOver ? '0 2px 12px rgba(10,59,92,0.1)' : 'none',
        }}
      >
        <div style={{
          width: '44px', height: '44px', borderRadius: '12px',
          background: file ? '#d1fae5' : isOver ? '#dbeafe' : '#e2e8f0',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s',
        }}>
          <span className="material-symbols-outlined" style={{
            fontSize: '22px',
            color: file ? '#065f46' : isOver ? '#1e40af' : '#64748b',
          }}>
            {file ? 'check_circle' : icon}
          </span>
        </div>

        <div>
          <div style={{ fontWeight: '600', fontSize: '13px', color: file ? '#065f46' : '#1e3a52', marginBottom: '3px' }}>
            {label}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.4 }}>
            {description}
          </div>
        </div>

        {file ? (
          <div style={{
            background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: '8px',
            padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '5px',
            maxWidth: '100%',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '13px', color: '#065f46', flexShrink: 0 }}>description</span>
            <span style={{ fontSize: '11px', color: '#065f46', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
              {file.name}
            </span>
            <button
              onClick={e => {
                e.stopPropagation();
                if (slot==='n') { setRepoNFile(null); if(repoNRef.current) repoNRef.current.value=''; }
                if (slot==='m') { setRepoMFile(null); if(repoMRef.current) repoMRef.current.value=''; }
                if (slot==='d') { setDepositFile(null); if(depositRef.current) depositRef.current.value=''; }
              }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#065f46', display: 'flex', alignItems: 'center', padding: '0 2px', marginLeft: '2px', flexShrink: 0 }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
            </button>
          </div>
        ) : (
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>
            {isOver ? 'Drop here' : 'Click or drag & drop'}
          </span>
        )}

        <input
          ref={ref}
          type="file"
          accept=".xlsx,.xls"
          style={{ display: 'none' }}
          onChange={e => handleFileInput(e, slot)}
        />
      </div>
    );
  };

  // ── Result card ───────────────────────────────────────────────────────────
  const ResultCard = ({ label, value, icon, color, bg }: {
    label: string; value: string; icon: string; color: string; bg: string;
  }) => (
    <div style={{
      background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px',
      padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    }}>
      <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span className="material-symbols-outlined" style={{ fontSize: '18px', color }}>{icon}</span>
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '2px', letterSpacing: '0.3px' }}>{label}</div>
        <div style={{ fontSize: '14px', fontWeight: '700', color, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{value}</div>
      </div>
    </div>
  );

  // ── Footer columns ────────────────────────────────────────────────────────
  const footerColumns = [
    {
      heading: 'Modules',
      items: NAV_PAGES.map(p => ({ label: p.label, icon: p.icon, onClick: () => navigate(p.path), active: p.path === currentPath, external: false, href: '' })),
    },
    {
      heading: 'About CBU',
      items: [
        { label: 'About the Bank',     href: 'https://cbu.uz/en/about/',                   icon: 'info',        external: true },
        { label: 'Board of Directors', href: 'https://cbu.uz/en/about/management/',        icon: 'groups',      external: true },
        { label: 'Legislation',        href: 'https://cbu.uz/en/documents/',               icon: 'gavel',       external: true },
        { label: 'Publications',       href: 'https://cbu.uz/en/statistics/publications/', icon: 'description', external: true },
        { label: 'Open Data / Stats',  href: 'https://cbu.uz/en/statistics/',              icon: 'bar_chart',   external: true },
      ],
    },
    {
      heading: 'Services',
      items: [
        { label: 'Exchange Rates',  href: 'https://cbu.uz/en/arkhiv-kursov-valyut/',                 icon: 'currency_exchange', external: true },
        { label: 'Key Rate',        href: 'https://cbu.uz/en/monetary-policy/refinancing-rate/',     icon: 'percent',           external: true },
        { label: 'Payment Systems', href: 'https://cbu.uz/en/payment-systems/',                      icon: 'payments',          external: true },
        { label: 'Licensing',       href: 'https://cbu.uz/en/credit-organizations/licensing/',       icon: 'verified',          external: true },
        { label: 'Press Centre',    href: 'https://cbu.uz/en/press_center/',                         icon: 'newspaper',         external: true },
      ],
    },
    {
      heading: 'Contact',
      items: [
        { label: '+998 71 212-62-05',   href: 'tel:+998712126205',                             icon: 'call',        external: false },
        { label: '+998 71 200-00-44',   href: 'tel:+998712000044',                             icon: 'call',        external: false },
        { label: '+998 71 233-35-09',   href: 'fax:+998712333509',                             icon: 'fax',         external: false },
        { label: 'info@cbu.uz',         href: 'mailto:info@cbu.uz',                            icon: 'mail',        external: false },
        { label: 'Islam Karimov St. 6', href: 'https://maps.app.goo.gl/4qDXnjgQoTwfWCg28',   icon: 'location_on', external: true  },
      ],
    },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────
  const allFilesUploaded = repoNFile && repoMFile && depositFile;
  const formReady = allFilesUploaded && cbDate && cbRate && cbDeposit;

  return (
    <div style={{ minHeight: '100vh', width: '100%', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc', fontFamily: '"Inter","Segoe UI",system-ui,-apple-system,sans-serif' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '24px', right: '24px', zIndex: 2000,
          background: toast.type==='success' ? '#065f46' : toast.type==='error' ? '#991b1b' : '#1e40af',
          color: 'white', padding: '13px 18px', borderRadius: '12px',
          display: 'flex', alignItems: 'center', gap: '10px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)', fontSize: '14px', fontWeight: '500',
          animation: 'slideIn 0.3s ease', maxWidth: '380px',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '19px', flexShrink: 0 }}>
            {toast.type==='success' ? 'check_circle' : toast.type==='info' ? 'info' : 'error'}
          </span>
          {toast.text}
        </div>
      )}

      {/* ═══ HEADER ═══ */}
      <header style={{ width: '100%', background: 'linear-gradient(135deg, #0a3b5c 0%, #1a4b70 100%)', padding: '0 24px', boxShadow: '0 4px 20px rgba(0,40,70,0.18)', borderBottom: '3px solid #e9b741', boxSizing: 'border-box', minHeight: '64px', display: 'flex', alignItems: 'center' }}>
        <div onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0, cursor: 'pointer', marginRight: '28px' }}>
          <div style={{ width: '44px', height: '44px', background: 'white', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.12)', padding: '5px', flexShrink: 0 }}>
            <img src={CbuLogo} alt="CBU Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: 'white', lineHeight: '1.6' }}>The Central Bank of Uzbekistan</div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', lineHeight: '1.3' }}>Monetary Department</div>
          </div>
        </div>
        <div style={{ width: '1px', height: '32px', background: 'rgba(255,255,255,0.15)', marginRight: '16px', flexShrink: 0 }} />
        <nav style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, overflowX: 'auto' }}>
          {NAV_PAGES.map(p => <NavBtn key={p.path} page={p} />)}
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginLeft: '16px', flexShrink: 0 }}>
          {[
            { icon: 'arrow_back', label: 'Back', onClick: () => window.history.back() },
            { icon: 'account_circle', label: 'Login', onClick: () => {} },
          ].map(b => (
            <button key={b.label} onClick={b.onClick} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.65)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', cursor: 'pointer', padding: '7px 12px', borderRadius: '8px', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.color='white'; e.currentTarget.style.background='rgba(255,255,255,0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.color='rgba(255,255,255,0.65)'; e.currentTarget.style.background='transparent'; }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>{b.icon}</span>{b.label}
            </button>
          ))}
        </div>
      </header>

      {/* ═══ MAIN ═══ */}
      <main style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', padding: '28px 24px', background: '#f8fafc', boxSizing: 'border-box' }}>
        <div style={{ width: '100%', maxWidth: '1100px', margin: '0 auto' }}>

          {/* ── Page title ── */}
          <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                <div style={{ width: '38px', height: '38px', background: 'linear-gradient(135deg, #0a3b5c, #1a6494)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'white' }}>calculate</span>
                </div>
                <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: '#0a3b5c' }}>UZONIA Calculation</h1>
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b', paddingLeft: '48px' }}>
                Upload the three source files, set the CB parameters, and run the overnight UZONIA calculation.
              </p>
            </div>

            {result && (
              <button onClick={handleReset} style={{ padding: '8px 16px', fontSize: '13px', fontWeight: '500', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '9px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>refresh</span>New Calculation
              </button>
            )}
          </div>

          {/* ── Progress bar ── */}
          {isLoading && (
            <div style={{ marginBottom: '20px', background: 'white', borderRadius: '12px', padding: '16px 20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#0a3b5c', animation: 'spin 2s linear infinite' }}>autorenew</span>
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#0a3b5c' }}>Running UZONIA calculation…</span>
                <span style={{ marginLeft: 'auto', fontSize: '12px', fontFamily: 'monospace', color: '#64748b' }}>{Math.round(progress)}%</span>
              </div>
              <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '99px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #0a3b5c, #1a6494, #e9b741)', borderRadius: '99px', transition: 'width 0.4s ease' }} />
              </div>
              <div style={{ marginTop: '8px', fontSize: '11px', color: '#94a3b8' }}>
                Processing repo data, validating gaps, computing weighted averages…
              </div>
            </div>
          )}

          {/* ── Error banner ── */}
          {error && !isLoading && (
            <div style={{ marginBottom: '20px', background: '#fff5f5', border: '1px solid #fecaca', borderRadius: '12px', padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#dc2626', flexShrink: 0, marginTop: '1px' }}>error</span>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#991b1b', marginBottom: '2px' }}>Calculation Failed</div>
                <div style={{ fontSize: '13px', color: '#7f1d1d' }}>{error}</div>
              </div>
              <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: '2px', flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
              </button>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: result ? '1fr 1fr' : '1fr', gap: '20px', alignItems: 'start' }}>

            {/* ── LEFT: Input form ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* File uploads */}
              <div style={{ background: 'white', borderRadius: '14px', padding: '22px', boxShadow: '0 2px 10px rgba(0,40,70,0.06)', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#0a3b5c' }}>upload_file</span>
                  <span style={{ fontSize: '15px', fontWeight: '600', color: '#0a3b5c' }}>Source Files</span>
                  <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#94a3b8', background: '#f1f5f9', padding: '2px 8px', borderRadius: '20px' }}>
                    {[repoNFile, repoMFile, depositFile].filter(Boolean).length} / 3 uploaded
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <DropZone
                    slot="n" file={repoNFile}
                    label="Repo N File"
                    description="Bilateral REPO transactions (overnight)"
                    icon="table_chart"
                  />
                  <DropZone
                    slot="m" file={repoMFile}
                    label="Repo M File"
                    description="Market-maker REPO transactions"
                    icon="show_chart"
                  />
                  <DropZone
                    slot="d" file={depositFile}
                    label="Deposit File"
                    description="Interbank overnight deposit data"
                    icon="savings"
                  />
                </div>

                {/* Upload checklist */}
                <div style={{ marginTop: '14px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {[
                    { label: 'Repo N', done: !!repoNFile },
                    { label: 'Repo M', done: !!repoMFile },
                    { label: 'Deposit', done: !!depositFile },
                  ].map(item => (
                    <span key={item.label} style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '500',
                      background: item.done ? '#d1fae5' : '#f1f5f9',
                      color: item.done ? '#065f46' : '#94a3b8',
                      border: `1px solid ${item.done ? '#6ee7b7' : '#e2e8f0'}`,
                    }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>
                        {item.done ? 'check_circle' : 'radio_button_unchecked'}
                      </span>
                      {item.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* CB Parameters */}
              <div style={{ background: 'white', borderRadius: '14px', padding: '22px', boxShadow: '0 2px 10px rgba(0,40,70,0.06)', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#0a3b5c' }}>tune</span>
                  <span style={{ fontSize: '15px', fontWeight: '600', color: '#0a3b5c' }}>CB Parameters</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>

                  {/* Date */}
                  <div>
                    <label style={labelStyle}>
                      CB Date <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <span className="material-symbols-outlined" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '16px', pointerEvents: 'none', zIndex: 2 }}>event</span>
                      <input
                        type="date"
                        value={cbDate}
                        onChange={e => setCbDate(e.target.value)}
                        style={{ ...inputStyle, paddingLeft: '34px', fontFamily: 'monospace', colorScheme: 'light' }}
                      />
                    </div>
                    <div style={{ marginTop: '4px', fontSize: '11px', color: '#94a3b8' }}>Defaults to today</div>
                  </div>

                  {/* CB Rate */}
                  <div>
                    <label style={labelStyle}>
                      CB Rate (%) <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <span className="material-symbols-outlined" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '16px', pointerEvents: 'none', zIndex: 2 }}>percent</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={cbRate}
                        onChange={e => setCbRate(e.target.value)}
                        onKeyDown={numericKeyDown}
                        placeholder="e.g. 14.00"
                        style={{ ...inputStyle, paddingLeft: '34px', paddingRight: '32px', fontFamily: 'monospace' }}
                      />
                      <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: '#94a3b8', pointerEvents: 'none' }}>%</span>
                    </div>
                    <div style={{ marginTop: '4px', fontSize: '11px', color: '#94a3b8' }}>Central Bank base rate</div>
                  </div>

                  {/* CB Deposit */}
                  <div>
                    <label style={labelStyle}>
                      CB Deposit (UZS) <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <span className="material-symbols-outlined" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '16px', pointerEvents: 'none', zIndex: 2 }}>account_balance</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={cbDeposit}
                        onChange={e => setCbDeposit(e.target.value)}
                        onKeyDown={numericKeyDown}
                        placeholder="e.g. 500000000000"
                        style={{ ...inputStyle, paddingLeft: '34px', fontFamily: 'monospace' }}
                      />
                    </div>
                    <div style={{ marginTop: '4px', fontSize: '11px', color: '#94a3b8' }}>Total CB overnight deposit</div>
                  </div>
                </div>
              </div>

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={isLoading || !formReady}
                style={{
                  width: '100%', padding: '14px 20px',
                  fontSize: '15px', fontWeight: '700',
                  background: isLoading
                    ? '#94a3b8'
                    : !formReady
                    ? '#cbd5e1'
                    : 'linear-gradient(135deg, #0a3b5c 0%, #1a6494 100%)',
                  color: 'white', border: 'none', borderRadius: '12px',
                  cursor: isLoading || !formReady ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  boxShadow: formReady && !isLoading ? '0 4px 16px rgba(10,59,92,0.35)' : 'none',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { if (formReady && !isLoading) e.currentTarget.style.transform='translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px', animation: isLoading ? 'spin 1.5s linear infinite' : 'none' }}>
                  {isLoading ? 'autorenew' : 'calculate'}
                </span>
                {isLoading ? 'Calculating…' : 'Run UZONIA Calculation'}
              </button>

              {!formReady && !isLoading && (
                <div style={{ textAlign: 'center', fontSize: '12px', color: '#94a3b8', marginTop: '-8px' }}>
                  {!allFilesUploaded
                    ? `Upload ${[!repoNFile && 'Repo N', !repoMFile && 'Repo M', !depositFile && 'Deposit'].filter(Boolean).join(', ')} to continue`
                    : 'Fill in all CB parameters to continue'
                  }
                </div>
              )}
            </div>

            {/* ── RIGHT: Results ── */}
            {result && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {/* Result header */}
                <div style={{ background: 'linear-gradient(135deg, #0a3b5c 0%, #1a6494 100%)', borderRadius: '14px', padding: '20px 22px', color: 'white', boxShadow: '0 4px 20px rgba(10,59,92,0.3)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '22px', color: '#e9b741' }}>check_circle</span>
                    <span style={{ fontSize: '16px', fontWeight: '700' }}>Calculation Complete</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
                    <div>
                      <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '11px', marginBottom: '2px' }}>File ID</div>
                      <div style={{ fontFamily: 'monospace', fontWeight: '600', fontSize: '12px', color: '#e9b741' }}>{result.file_id}</div>
                    </div>
                    <div>
                      <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '11px', marginBottom: '2px' }}>Date</div>
                      <div style={{ fontFamily: 'monospace', fontWeight: '600' }}>
                        {(() => { const p = result.uzonia_date?.split('T')[0]?.split('-'); return p ? `${p[2]}/${p[1]}/${p[0]}` : result.uzonia_date; })()}
                      </div>
                    </div>
                  </div>

                  {/* Calculation way badge */}
                  {(() => {
                    const way = calcWayLabel(result.calculation_way);
                    return (
                      <div style={{ marginTop: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px', background: way.bg, padding: '5px 12px', borderRadius: '20px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '13px', color: way.color }}>info</span>
                        <span style={{ fontSize: '11px', fontWeight: '600', color: way.color }}>{way.label}</span>
                      </div>
                    );
                  })()}
                </div>

                {/* Rate cards */}
                <div style={{ background: 'white', borderRadius: '14px', padding: '18px', boxShadow: '0 2px 10px rgba(0,40,70,0.06)', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '17px', color: '#0a3b5c' }}>show_chart</span>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#0a3b5c' }}>Calculated Rates</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <ResultCard label="UZONIA (Overnight)"   value={fmtRate(result.uzonia)}         icon="bolt"         color="#1d4ed8" bg="#dbeafe" />
                    <ResultCard label="7-Day UZONIA"         value={fmtRate(result.day_7_uzonia)}   icon="date_range"   color="#15803d" bg="#d1fae5" />
                    <ResultCard label="30-Day UZONIA"        value={fmtRate(result.day_30_uzonia)}  icon="calendar_month" color="#a16207" bg="#fef3c7" />
                    <ResultCard label="90-Day UZONIA"        value={fmtRate(result.day_90_uzonia)}  icon="event_note"   color="#7e22ce" bg="#f3e8ff" />
                    <ResultCard label="180-Day UZONIA"       value={fmtRate(result.day_180_uzonia)} icon="event"        color="#c2410c" bg="#ffedd5" />
                    <ResultCard label="UZONIA Index"         value={fmtIndex(result.index)}         icon="functions"    color="#0a3b5c" bg="#e0f2fe" />
                  </div>
                </div>

                {/* Download */}
                <div style={{ background: 'white', borderRadius: '14px', padding: '18px', boxShadow: '0 2px 10px rgba(0,40,70,0.06)', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '17px', color: '#0a3b5c' }}>folder_zip</span>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#0a3b5c' }}>Output Files</span>
                  </div>

                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <div style={{ width: '40px', height: '40px', background: '#fff7ed', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#c2410c' }}>folder_zip</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {result.filename}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                        Contains PNG image + Excel report
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleDownload}
                    style={{
                      width: '100%', padding: '11px 16px',
                      fontSize: '14px', fontWeight: '600',
                      background: 'linear-gradient(135deg, #e9b741, #d4a017)',
                      color: '#0a3b5c', border: 'none', borderRadius: '10px',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                      boxShadow: '0 3px 12px rgba(233,183,65,0.4)', transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 5px 18px rgba(233,183,65,0.55)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 3px 12px rgba(233,183,65,0.4)'; }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>download</span>
                    Download Results (.zip)
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── How it works — only when no result yet ── */}
          {!result && !isLoading && (
            <div style={{ marginTop: '24px', background: 'white', borderRadius: '14px', padding: '20px 22px', boxShadow: '0 2px 10px rgba(0,40,70,0.06)', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '17px', color: '#0a3b5c' }}>help_outline</span>
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#0a3b5c' }}>How does the calculation work?</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                {[
                  {
                    way: 'Way 1', icon: 'looks_one', color: '#065f46', bg: '#d1fae5',
                    condition: 'Total Repo volume ≥ 500B UZS and ≥ 5 transactions',
                    desc: 'Uses only Repo N + M data. Bottom 10% trimmed, weighted average computed.',
                  },
                  {
                    way: 'Way 2', icon: 'looks_two', color: '#1e40af', bg: '#dbeafe',
                    condition: 'Repo + Deposit combined ≥ 500B UZS',
                    desc: 'Combines Repo and Deposit data. Same trimming and weighting methodology.',
                  },
                  {
                    way: 'Way 3', icon: 'looks_3', color: '#92400e', bg: '#fef3c7',
                    condition: 'Total volume falls below threshold',
                    desc: 'CB deposit supplement added to reach volume. CB Rate used as the reference.',
                  },
                ].map(item => (
                  <div key={item.way} style={{ background: item.bg, border: `1px solid ${item.color}22`, borderRadius: '10px', padding: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '8px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px', color: item.color }}>{item.icon}</span>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: item.color }}>{item.way}</span>
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: item.color, marginBottom: '5px', lineHeight: 1.4 }}>{item.condition}</div>
                    <div style={{ fontSize: '11px', color: '#374151', lineHeight: 1.5 }}>{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </main>

      {/* ═══ FOOTER ═══ */}
      <footer style={{ width: '100%', background: '#0a2a40', borderTop: '3px solid #e9b741', boxSizing: 'border-box' }}>
        <div style={{ width: '100%', maxWidth: '1600px', margin: '0 auto', padding: '40px 32px 28px', display: 'grid', gridTemplateColumns: '280px repeat(4, 1fr)', gap: '48px', alignItems: 'start' }}>

          {/* Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <img src={CbuLogo} alt="CBU" style={{ width: '40px', height: '40px', objectFit: 'contain', background: 'white', borderRadius: '9px', padding: '4px', flexShrink: 0 }} />
              <div style={{ color: 'white', fontSize: '14px', fontWeight: '700', lineHeight: '1.6' }}>The Central Bank of Uzbekistan</div>
            </div>
            <p style={{ fontSize: '14px', lineHeight: '1.6', color: '#6b8499', marginBottom: '18px' }}>
              Official Monetary Department system — Uzonia Calculations &amp; Interbank Operations.
            </p>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '18px', flexWrap: 'wrap' }}>
              {[
                { src: facebook,  alt: 'Facebook',  href: 'https://www.facebook.com/centralbankuzbekistan/', w: 28 },
                { src: telegram,  alt: 'Telegram',  href: 'https://t.me/centralbankuzbekistan',              w: 30 },
                { src: linkedin,  alt: 'LinkedIn',  href: 'https://www.linkedin.com/company/centralbankuzbekistan/?originalSubdomain=uz', w: 32 },
                { src: twitter,   alt: 'Twitter',   href: 'https://x.com/cbuzbekistan',                      w: 40 },
                { src: instagram, alt: 'Instagram', href: 'https://www.instagram.com/centralbankuzbekistan', w: 26 },
                { src: youtube,   alt: 'YouTube',   href: 'https://www.youtube.com/centralbankofuzbekistan', w: 30 },
              ].map(s => (
                <a key={s.alt} href={s.href} target="_blank" rel="noopener noreferrer"
                  style={{ width: '32px', height: '32px', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.07)', transition: 'background 0.2s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.16)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)'; }}>
                  <img src={s.src} alt={s.alt} style={{ width: `${s.w}px`, height: `${s.w}px`, objectFit: 'contain' }} />
                </a>
              ))}
            </div>
          </div>

          {/* 4 link columns */}
          {footerColumns.map(col => (
            <div key={col.heading}>
              <div style={{ color: 'white', fontSize: '14px', fontWeight: '600', marginBottom: '16px', paddingBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {col.heading}
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {col.items.map((item: any, i: number) => (
                  <li key={i} style={{ marginBottom: '9px', marginLeft: '55px' }}>
                    {item.onClick ? (
                      <button onClick={item.onClick} style={{ background: 'none', border: 'none', padding: 0, display: 'flex', alignItems: 'center', gap: '7px', fontSize: '14px', color: item.active ? '#e9b741' : '#8097a8', fontWeight: item.active ? '600' : '400', cursor: 'pointer', transition: 'color 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.color = 'white'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = item.active ? '#e9b741' : '#8097a8'; }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '14px', flexShrink: 0 }}>{item.icon}</span>
                        {item.label}
                      </button>
                    ) : (
                      <a href={item.href} target={item.external ? '_blank' : undefined} rel="noopener noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px', color: '#8097a8', textDecoration: 'none', transition: 'color 0.15s' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'white'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#8097a8'; }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '14px', flexShrink: 0 }}>{item.icon}</span>
                        {item.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '14px 32px' }}>
          <div style={{ width: '100%', maxWidth: '1600px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#4a5c6a', flexWrap: 'wrap', gap: '8px' }}>
            <span>© 2026 Central Bank of the Republic of Uzbekistan. All rights reserved.</span>
            <div style={{ display: 'flex', gap: '20px' }}>
              {[
                { label: 'Privacy Policy', href: 'https://cbu.uz/en/mobile-privacy/'              },
                { label: 'Terms of Use',   href: 'https://cbu.uz/en/services/request-information/' },
                { label: 'Accessibility',  href: 'https://cbu.uz/en/'                              },
              ].map(l => (
                <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer"
                  style={{ color: '#4a5c6a', textDecoration: 'none', transition: 'color 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'white'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#4a5c6a'; }}>
                  {l.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>

      <style>{`
        *{margin:0;padding:0;box-sizing:border-box;}
        html,body{width:100%;overflow-x:hidden;}
        body{font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;}
        #root{width:100%;}
        .material-symbols-outlined{font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24;}
        @keyframes spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}
        @keyframes slideIn{from{opacity:0;transform:translateX(20px);}to{opacity:1;transform:translateX(0);}}
        button:hover:not(:disabled){transform:translateY(-1px);}
        button:active:not(:disabled){transform:translateY(0);}
        input:focus{border-color:#0a3b5c!important;box-shadow:0 0 0 3px rgba(10,59,92,0.1);}
        input[type="date"]::-webkit-calendar-picker-indicator{cursor:pointer;opacity:0.7;filter:invert(28%) sepia(49%) saturate(700%) hue-rotate(180deg);}
        input[type="date"]::-webkit-calendar-picker-indicator:hover{opacity:1;}
        nav::-webkit-scrollbar{height:0;}
      `}</style>
    </div>
  );
};

export default CalculationsPage;