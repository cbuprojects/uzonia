import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import CbuLogo from '../../assets/CBU_Logo.png';
import facebook from '../../assets/facebook.png';
import telegram from '../../assets/telegram.png';
import linkedin from '../../assets/linkedin.png';
import twitter from '../../assets/twitter.png';
import instagram from "../../assets/instagram.png";
import youtube from "../../assets/youtube.png";

// ─── Config ───────────────────────────────────────────────────────────────────

const API_BASE_URL = 'http://localhost:8000';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) { const e = await res.json(); throw new Error(e.detail || 'Failed to fetch'); }
  return res.json();
};

// ─── Nav ─────────────────────────────────────────────────────────────────────

const NAV_PAGES = [
  { label: 'Calculations', icon: 'calculate',       path: '/' },
  { label: 'Uploads',      icon: 'upload_file',     path: '/uploads'      },
  { label: 'Repo',         icon: 'account_balance', path: '/repo'         },
  { label: 'Depo',         icon: 'savings',         path: '/depo'         },
  { label: 'Data',         icon: 'database',        path: '/data'         },
  { label: 'Holidays',     icon: 'calendar_month',  path: '/holidays'     },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface RepoRow {
  id:                     number;
  file_id:                string;
  number_of_application: string;
  date_in:                string;
  date_out:               string;
  dealer_from:            string;
  dealer_to:              string;
  days:                   number;
  rate:                   number;
  money_in:               number;
  money_out:              number;
  created_at:             string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatDate = (s: string): string => {
  if (!s) return '';
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`;
};

const formatDateTime = (s: string | null): string => {
  if (!s) return '—';
  const d = new Date(s);
  if (isNaN(d.getTime())) return '—';
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${String(d.getDate()).padStart(2,'0')}-${months[d.getMonth()]}-${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
};

const fmtRate   = (n: number): string => typeof n === 'number' ? `${n.toFixed(2)}%` : '—';
const fmtMoney  = (n: number): string => typeof n === 'number' ? n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';
const fmtDays   = (n: number): string => typeof n === 'number' ? n.toFixed(2) : '—';

// ─── SmartDateInput ───────────────────────────────────────────────────────────

interface SmartDateInputProps { value: string; onChange: (v: string) => void; placeholder?: string; flex?: string; }

const SmartDateInput: React.FC<SmartDateInputProps> = ({ value, onChange, placeholder, flex }) => {
  const hiddenRef = useRef<HTMLInputElement>(null);
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const pass = ['Backspace','Delete','Tab','Escape','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'];
    if (pass.includes(e.key)) return;
    if (!/^\d$/.test(e.key)) e.preventDefault();
  };
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g,'').slice(0,8);
    let f = '';
    for (let i = 0; i < digits.length; i++) { if (i===2||i===4) f+='-'; f+=digits[i]; }
    onChange(f);
  };
  const handleHidden = (e: React.ChangeEvent<HTMLInputElement>) => {
    const iso = e.target.value;
    if (!iso) { onChange(''); return; }
    const [y,m,d] = iso.split('-');
    onChange(`${d}-${m}-${y}`);
  };
  const isoValue = useMemo(() => {
    const p = value.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    return p ? `${p[3]}-${p[2]}-${p[1]}` : '';
  }, [value]);

  return (
    <div style={{ position: 'relative', flex: flex || '1 1 120px', minWidth: '100px' }}>
      <span className="material-symbols-outlined" style={{ position: 'absolute', left: '7px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '13px', pointerEvents: 'none', zIndex: 3 }}>event</span>
      <input type="text" value={value} onChange={handleChange} onKeyDown={handleKeyDown}
        placeholder={placeholder || 'DD-MM-YYYY'} maxLength={10}
        style={{ width: '100%', padding: '8px 26px 8px 24px', fontSize: '11px', background: '#f8fafc', color: '#0f172a', border: '1px solid #e2e8f0', borderRadius: '8px', outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace', letterSpacing: '0.2px' }}
      />
      <span className="material-symbols-outlined" onClick={() => hiddenRef.current?.showPicker?.()} style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '13px', cursor: 'pointer', zIndex: 4, lineHeight: 1 }}>calendar_today</span>
      <input ref={hiddenRef} type="date" value={isoValue} onChange={handleHidden} tabIndex={-1}
        style={{ position: 'absolute', right: '6px', top: '50%', width: '16px', height: '16px', opacity: 0, zIndex: 2, pointerEvents: 'none', border: 'none', padding: 0 }} />
    </div>
  );
};

// ─── ColSearch ────────────────────────────────────────────────────────────────

const ColSearch = ({ value, onChange, placeholder, icon, flex }: {
  value: string; onChange: (v: string) => void; placeholder: string; icon: string; flex?: string;
}) => (
  <div style={{ position: 'relative', flex: flex || '1 1 90px', minWidth: '80px' }}>
    <span className="material-symbols-outlined" style={{ position: 'absolute', left: '7px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '13px', pointerEvents: 'none' }}>{icon}</span>
    <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ width: '100%', padding: '8px 8px 8px 24px', fontSize: '11px', background: '#f8fafc', color: '#0f172a', border: '1px solid #e2e8f0', borderRadius: '8px', outline: 'none', boxSizing: 'border-box' }}
    />
  </div>
);

// ─── Component ────────────────────────────────────────────────────────────────

const RepoDataPage = () => {
  const navigate    = useNavigate();
  const currentPath = '/repo';

  const { data, error, isLoading, mutate } = useSWR(
    `${API_BASE_URL}/api/get_all_repo_data`, fetcher, { revalidateOnFocus: false }
  );

  // ── Per-column filter state ───────────────────────────────────────────────
  const [fFileId,   setFFileId]   = useState('');
  const [fAppNo,    setFAppNo]    = useState('');
  const [fDateIn,   setFDateIn]   = useState('');
  const [fDateOut,  setFDateOut]  = useState('');
  const [fDealer,   setFDealer]   = useState(''); // searches both dealer_from and dealer_to
  const [fDays,     setFDays]     = useState('');
  const [fRate,     setFRate]     = useState('');
  const [fMoneyIn,  setFMoneyIn]  = useState('');
  const [fMoneyOut, setFMoneyOut] = useState('');
  const [fCreated,  setFCreated]  = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // ── Delete modal ─────────────────────────────────────────────────────────
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [targetRow,  setTargetRow]  = useState<RepoRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [toast, setToast] = useState<{ text: string; type: 'success'|'error' }|null>(null);
  const showToast = (text: string, type: 'success'|'error') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  };

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

  // ── Data ──────────────────────────────────────────────────────────────────
  const rows: RepoRow[] = useMemo(() => Array.isArray(data?.Data) ? data.Data : [], [data]);

  const filteredData = useMemo(() => {
    let f = [...rows];
    if (fFileId.trim())   f = f.filter(r => r.file_id.toLowerCase().includes(fFileId.trim().toLowerCase()));
    if (fAppNo.trim())    f = f.filter(r => r.number_of_application.toLowerCase().includes(fAppNo.trim().toLowerCase()));
    if (fDateIn.trim())   f = f.filter(r => formatDate(r.date_in).includes(fDateIn.trim()));
    if (fDateOut.trim())  f = f.filter(r => formatDate(r.date_out).includes(fDateOut.trim()));
    if (fDealer.trim())   f = f.filter(r =>
      r.dealer_from.toLowerCase().includes(fDealer.trim().toLowerCase()) ||
      r.dealer_to.toLowerCase().includes(fDealer.trim().toLowerCase())
    );
    if (fDays.trim())     f = f.filter(r => fmtDays(r.days).includes(fDays.trim()));
    if (fRate.trim())     f = f.filter(r => fmtRate(r.rate).includes(fRate.trim()));
    if (fMoneyIn.trim())  f = f.filter(r => fmtMoney(r.money_in).includes(fMoneyIn.trim()));
    if (fMoneyOut.trim()) f = f.filter(r => fmtMoney(r.money_out).includes(fMoneyOut.trim()));
    if (fCreated.trim())  f = f.filter(r => formatDateTime(r.created_at).toLowerCase().includes(fCreated.trim().toLowerCase()));
    return f;
  }, [rows, fFileId, fAppNo, fDateIn, fDateOut, fDealer, fDays, fRate, fMoneyIn, fMoneyOut, fCreated]);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (!rows.length) return { total: 0, uniqueFiles: 0, totalMoneyIn: '—', totalMoneyOut: '—', avgRate: '—', avgDays: '—' };
    const uniqueFiles  = new Set(rows.map(r => r.file_id)).size;
    const totalIn      = rows.reduce((a, b) => a + b.money_in, 0);
    const totalOut     = rows.reduce((a, b) => a + b.money_out, 0);
    const avgRate      = rows.reduce((a, b) => a + b.rate, 0) / rows.length;
    const avgDays      = rows.reduce((a, b) => a + b.days, 0) / rows.length;
    return {
      total:       rows.length,
      uniqueFiles,
      totalMoneyIn:  fmtMoney(totalIn),
      totalMoneyOut: fmtMoney(totalOut),
      avgRate:     fmtRate(avgRate),
      avgDays:     fmtDays(avgDays),
    };
  }, [rows]);

  const hasActiveFilters = fFileId || fAppNo || fDateIn || fDateOut || fDealer || fDays || fRate || fMoneyIn || fMoneyOut || fCreated;
  const totalPages    = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = useMemo(
    () => filteredData.slice((currentPage-1)*itemsPerPage, currentPage*itemsPerPage),
    [filteredData, currentPage]
  );
  useEffect(() => { setCurrentPage(1); }, [fFileId, fAppNo, fDateIn, fDateOut, fDealer, fDays, fRate, fMoneyIn, fMoneyOut, fCreated]);

  const handleClearFilters = useCallback(() => {
    setFFileId(''); setFAppNo(''); setFDateIn(''); setFDateOut(''); setFDealer('');
    setFDays(''); setFRate(''); setFMoneyIn(''); setFMoneyOut(''); setFCreated('');
  }, []);

  // ── Delete handler — deletes ALL rows with the same file_id ───────────────
  const openDeleteModal = (r: RepoRow) => { setTargetRow(r); setIsDeleteModalOpen(true); };

  const handleDelete = async () => {
    if (!targetRow) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/delete_repo_data?file_id=${encodeURIComponent(targetRow.file_id)}`, { method: 'DELETE' });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail); }
      setIsDeleteModalOpen(false); setTargetRow(null); mutate();
      showToast(`All records for file "${targetRow.file_id}" deleted!`, 'success');
    } catch(err: any) { showToast(err.message || 'Failed to delete.', 'error'); }
    finally { setIsDeleting(false); }
  };

  // Count how many rows share the same file_id as targetRow
  const sameFileCount = useMemo(
    () => targetRow ? rows.filter(r => r.file_id === targetRow.file_id).length : 0,
    [targetRow, rows]
  );

  // ── Styles ────────────────────────────────────────────────────────────────
  const labelStyle: React.CSSProperties = {
    display: 'block', marginBottom: '5px', fontWeight: '500', color: '#374151', fontSize: '13px',
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
  return (
    <div style={{ minHeight: '100vh', width: '100%', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc', fontFamily: '"Inter","Segoe UI",system-ui,-apple-system,sans-serif' }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 2000, background: toast.type==='success'?'#065f46':'#991b1b', color: 'white', padding: '13px 18px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', fontSize: '14px', fontWeight: '500', animation: 'slideIn 0.3s ease' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '19px' }}>{toast.type==='success'?'check_circle':'error'}</span>
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
          {[{ icon: 'arrow_back', label: 'Back', onClick: () => window.history.back() }, { icon: 'account_circle', label: 'Login', onClick: () => {} }].map(b => (
            <button key={b.label} onClick={b.onClick} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.65)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', cursor: 'pointer', padding: '7px 12px', borderRadius: '8px', transition: 'all 0.15s' }}
              onMouseEnter={e=>{e.currentTarget.style.color='white'; e.currentTarget.style.background='rgba(255,255,255,0.08)';}}
              onMouseLeave={e=>{e.currentTarget.style.color='rgba(255,255,255,0.65)'; e.currentTarget.style.background='transparent';}}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>{b.icon}</span>{b.label}
            </button>
          ))}
        </div>
      </header>

      {/* ═══ MAIN ═══ */}
      <main style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', padding: '22px 24px', background: '#f8fafc', boxSizing: 'border-box', alignItems: 'center' }}>
        <div style={{ width: '100%', maxWidth: '1600px' }}>

          {/* ── Stats cards ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: '12px', marginBottom: '16px' }}>
            {[
              { label: 'Total Records',    value: String(stats.total),       color: '#0a3b5c', bg: '#e2e8f0', icon: 'database'           },
              { label: 'Unique Files',     value: String(stats.uniqueFiles), color: '#065f46', bg: '#d1fae5', icon: 'folder_open'        },
              { label: 'Avg. Rate',        value: stats.avgRate,             color: '#7e22ce', bg: '#f3e8ff', icon: 'percent'            },
              { label: 'Avg. Days',        value: stats.avgDays,             color: '#92400e', bg: '#fef3c7', icon: 'today'              },
              { label: 'Total Money In',   value: stats.totalMoneyIn,        color: '#065f46', bg: '#d1fae5', icon: 'arrow_downward'     },
              { label: 'Total Money Out',  value: stats.totalMoneyOut,       color: '#991b1b', bg: '#fee2e2', icon: 'arrow_upward'       },
            ].map(s => (
              <div key={s.label} style={{ background: 'white', padding: '13px 14px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '34px', height: '34px', background: s.bg, borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '17px', color: s.color }}>{s.icon}</span>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '2px', lineHeight: 1.2 }}>{s.label}</div>
                  <div style={{ fontSize: s.label === 'Total Records' || s.label === 'Unique Files' ? '20px' : '12px', fontWeight: '700', color: s.color, lineHeight: 1.1, fontFamily: 'monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Filter bar ── */}
          <div style={{ background: 'white', padding: '11px 14px', borderRadius: '12px', marginBottom: '14px', boxShadow: '0 2px 8px rgba(0,40,70,0.05)', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
              <ColSearch value={fFileId}   onChange={setFFileId}   placeholder="File ID"     icon="folder"        flex="120px" />
              <ColSearch value={fAppNo}    onChange={setFAppNo}    placeholder="App No."     icon="tag"           flex="120px" />
              <SmartDateInput value={fDateIn}  onChange={setFDateIn}  placeholder="Date In"  flex="130px" />
              <SmartDateInput value={fDateOut} onChange={setFDateOut} placeholder="Date Out" flex="130px" />
              <ColSearch value={fDealer}   onChange={setFDealer}   placeholder="Dealer"      icon="business"      flex="120px" />
              <ColSearch value={fDays}     onChange={setFDays}     placeholder="Days"        icon="today"         flex="100px"  />
              <ColSearch value={fRate}     onChange={setFRate}     placeholder="Rate"        icon="percent"       flex="100px"  />
              <ColSearch value={fMoneyIn}  onChange={setFMoneyIn}  placeholder="Money In"   icon="arrow_downward" flex="120px" />
              <ColSearch value={fMoneyOut} onChange={setFMoneyOut} placeholder="Money Out"  icon="arrow_upward"  flex="140px" />
              <ColSearch value={fCreated}  onChange={setFCreated}  placeholder="Created"    icon="schedule"      flex="130px" />
              {hasActiveFilters && (
                <button onClick={handleClearFilters} style={{ padding: '7px 10px', fontSize: '12px', fontWeight: '500', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>close</span>Clear
                </button>
              )}
            </div>

            {hasActiveFilters && (
              <div style={{ marginTop: '7px', fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap', padding: '4px 8px', background: '#f1f5f9', borderRadius: '7px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '12px', color: '#0a3b5c' }}>filter_alt</span>
                {fFileId   && <span style={{ background: 'white', padding: '1px 5px', borderRadius: '4px' }}>FileID:<strong>{fFileId}</strong></span>}
                {fAppNo    && <span style={{ background: 'white', padding: '1px 5px', borderRadius: '4px' }}>App:<strong>{fAppNo}</strong></span>}
                {fDateIn   && <span style={{ background: 'white', padding: '1px 5px', borderRadius: '4px', fontFamily: 'monospace' }}>DateIn:<strong>{fDateIn}</strong></span>}
                {fDateOut  && <span style={{ background: 'white', padding: '1px 5px', borderRadius: '4px', fontFamily: 'monospace' }}>DateOut:<strong>{fDateOut}</strong></span>}
                {fDealer   && <span style={{ background: 'white', padding: '1px 5px', borderRadius: '4px' }}>Dealer:<strong>{fDealer}</strong></span>}
                {fDays     && <span style={{ background: 'white', padding: '1px 5px', borderRadius: '4px', fontFamily: 'monospace' }}>Days:<strong>{fDays}</strong></span>}
                {fRate     && <span style={{ background: 'white', padding: '1px 5px', borderRadius: '4px', fontFamily: 'monospace' }}>Rate:<strong>{fRate}</strong></span>}
                {fMoneyIn  && <span style={{ background: 'white', padding: '1px 5px', borderRadius: '4px', fontFamily: 'monospace' }}>In:<strong>{fMoneyIn}</strong></span>}
                {fMoneyOut && <span style={{ background: 'white', padding: '1px 5px', borderRadius: '4px', fontFamily: 'monospace' }}>Out:<strong>{fMoneyOut}</strong></span>}
                {fCreated  && <span style={{ background: 'white', padding: '1px 5px', borderRadius: '4px' }}>Created:<strong>{fCreated}</strong></span>}
                <span style={{ marginLeft: 'auto' }}>{filteredData.length} result{filteredData.length!==1?'s':''}</span>
              </div>
            )}
          </div>

          {/* ── Table ── */}
          <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,40,70,0.06)', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
            {isLoading ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '36px', marginBottom: '12px', display: 'block', color: '#0a3b5c', animation: 'spin 2s linear infinite' }}>refresh</span>
                Loading Repo data…
              </div>
            ) : error ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#ef4444' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '36px', marginBottom: '12px', display: 'block' }}>error</span>
                Failed to load data.
              </div>
            ) : paginatedData.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '44px', marginBottom: '12px', display: 'block', color: '#94a3b8' }}>account_balance</span>
                {hasActiveFilters ? 'No records match your filters.' : 'No Repo records found.'}
                {hasActiveFilters && <button onClick={handleClearFilters} style={{ display: 'block', margin: '12px auto 0', padding: '7px 16px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#475569', cursor: 'pointer', fontSize: '12px' }}>Clear filters</button>}
              </div>
            ) : (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'linear-gradient(90deg, #0a3b5c 0%, #1a4b70 100%)', borderBottom: '2px solid #e9b741' }}>
                        {[
                          { label: '#',          w: '40px'  },
                          { label: 'FILE ID',    w: '120px' },
                          { label: 'APP NO.',    w: '130px' },
                          { label: 'DATE IN',    w: '100px' },
                          { label: 'DATE OUT',   w: '100px' },
                          { label: 'DEALER FROM',w: '130px' },
                          { label: 'DEALER TO',  w: '130px' },
                          { label: 'DAYS',       w: '50px'  },
                          { label: 'RATE',       w: '80px'  },
                          { label: 'MONEY IN',   w: '140px' },
                          { label: 'MONEY OUT',  w: '140px' },
                          { label: 'CREATED AT', w: '140px' },
                          { label: 'DELETE',     w: '80px'  },
                        ].map(col => (
                          <th key={col.label} style={{ padding: '11px 12px', textAlign: 'center', width: col.w, fontWeight: '600', color: 'rgba(255,255,255,0.9)', fontSize: '10.5px', letterSpacing: '0.7px', whiteSpace: 'nowrap' }}>{col.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedData.map((item: RepoRow, index: number) => {
                        const idx = (currentPage-1)*itemsPerPage + index + 1;
                        const isEven = index % 2 === 0;
                        return (
                          <tr key={item.id}
                            style={{ borderBottom: '1px solid #f1f5f9', background: isEven ? 'white' : '#fafbfc', transition: 'background 0.1s' }}
                            onMouseEnter={e=>{e.currentTarget.style.background='#f0f7ff';}}
                            onMouseLeave={e=>{e.currentTarget.style.background=isEven?'white':'#fafbfc';}}
                          >
                            {/* # */}
                            <td style={{ padding: '10px 12px', color: '#cbd5e1', fontSize: '12px', fontWeight: '600', textAlign: 'center' }}>{idx}</td>

                            {/* FILE ID */}
                            <td style={{ padding: '10px 12px' }}>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#eef2ff', border: '1px solid #e0e7ff', borderRadius: '6px', padding: '3px 8px', maxWidth: '160px' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '11px', color: '#4f46e5', flexShrink: 0 }}>folder</span>
                                <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#3730a3', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.file_id}>{item.file_id}</span>
                              </div>
                            </td>

                            {/* APP NO. */}
                            <td style={{ padding: '10px 12px' }}>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '3px 8px' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '11px', color: '#15803d', flexShrink: 0 }}>tag</span>
                                <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#166534', fontWeight: '600', whiteSpace: 'nowrap' }}>{item.number_of_application}</span>
                              </div>
                            </td>

                            {/* DATE IN */}
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontFamily: 'monospace', fontSize: '12px', fontWeight: '700', color: '#0369a1', background: '#e0f2fe', padding: '3px 7px', borderRadius: '6px', border: '1px solid #bae6fd', whiteSpace: 'nowrap' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>login</span>
                                {formatDate(item.date_in)}
                              </span>
                            </td>

                            {/* DATE OUT */}
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontFamily: 'monospace', fontSize: '12px', fontWeight: '700', color: '#c2410c', background: '#fff7ed', padding: '3px 7px', borderRadius: '6px', border: '1px solid #fed7aa', whiteSpace: 'nowrap' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>logout</span>
                                {formatDate(item.date_out)}
                              </span>
                            </td>

                            {/* DEALER FROM */}
                            <td style={{ padding: '10px 12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <div style={{ width: '22px', height: '22px', background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)', borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                  <span className="material-symbols-outlined" style={{ fontSize: '12px', color: '#1d4ed8' }}>business</span>
                                </div>
                                <span style={{ fontSize: '12px', color: '#1e3a5f', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100px' }} title={item.dealer_from}>{item.dealer_from}</span>
                              </div>
                            </td>

                            {/* DEALER TO */}
                            <td style={{ padding: '10px 12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <div style={{ width: '22px', height: '22px', background: 'linear-gradient(135deg, #f3e8ff, #e9d5ff)', borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                  <span className="material-symbols-outlined" style={{ fontSize: '12px', color: '#7e22ce' }}>business</span>
                                </div>
                                <span style={{ fontSize: '12px', color: '#4c1d95', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100px' }} title={item.dealer_to}>{item.dealer_to}</span>
                              </div>
                            </td>

                            {/* DAYS */}
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontFamily: 'monospace', fontSize: '12px', fontWeight: '700', background: '#f0f9ff', color: '#0369a1', padding: '2px 7px', borderRadius: '6px', border: '1px solid #bae6fd', whiteSpace: 'nowrap' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>today</span>
                                {fmtDays(item.days)}
                              </span>
                            </td>

                            {/* RATE */}
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              <span style={{ display: 'inline-block', fontFamily: 'monospace', fontSize: '12px', fontWeight: '700', background: '#fdf4ff', color: '#6d28d9', padding: '2px 7px', borderRadius: '6px', border: '1px solid #e9d5ff22', whiteSpace: 'nowrap' }}>
                                {fmtRate(item.rate)}
                              </span>
                            </td>

                            {/* MONEY IN */}
                            <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                  <span className="material-symbols-outlined" style={{ fontSize: '11px', color: '#15803d' }}>arrow_downward</span>
                                  <span style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: '700', color: '#166534', whiteSpace: 'nowrap' }}>{fmtMoney(item.money_in)}</span>
                                </div>
                                <span style={{ fontSize: '9px', color: '#86efac', letterSpacing: '0.5px', fontWeight: '500' }}></span>
                              </div>
                            </td>

                            {/* MONEY OUT */}
                            <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                  <span className="material-symbols-outlined" style={{ fontSize: '11px', color: '#dc2626' }}>arrow_upward</span>
                                  <span style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: '700', color: '#991b1b', whiteSpace: 'nowrap' }}>{fmtMoney(item.money_out)}</span>
                                </div>
                                <span style={{ fontSize: '9px', color: '#fca5a5', letterSpacing: '0.5px', fontWeight: '500' }}></span>
                              </div>
                            </td>

                            {/* CREATED AT */}
                            <td style={{ padding: '10px 12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '11px', color: '#0a3b5c', flexShrink: 0 }}>schedule</span>
                                <span style={{ fontSize: '11px', color: item.created_at?'#374151':'#cbd5e1', fontFamily: item.created_at?'monospace':'inherit', fontWeight: item.created_at?'500':'400', whiteSpace: 'nowrap' }}>
                                  {formatDateTime(item.created_at)}
                                </span>
                              </div>
                            </td>

                            {/* DELETE (deletes all rows with same file_id) */}
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              <button onClick={() => openDeleteModal(item)}
                                style={{ padding: '4px 9px', fontSize: '11px', fontWeight: '500', background: '#fff5f5', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px', transition: 'all 0.13s', whiteSpace: 'nowrap' }}
                                onMouseEnter={e=>{e.currentTarget.style.background='#dc2626'; e.currentTarget.style.color='white'; e.currentTarget.style.borderColor='#dc2626';}}
                                onMouseLeave={e=>{e.currentTarget.style.background='#fff5f5'; e.currentTarget.style.color='#dc2626'; e.currentTarget.style.borderColor='#fecaca';}}>
                                <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>delete</span>
                                Delete
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {filteredData.length > itemsPerPage && (
                  <div style={{ padding: '12px 18px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Showing {(currentPage-1)*itemsPerPage+1}–{Math.min(currentPage*itemsPerPage, filteredData.length)} of {filteredData.length}</div>
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      <button onClick={()=>setCurrentPage(p=>p-1)} disabled={currentPage===1} style={{ padding: '5px 10px', fontSize: '12px', fontWeight: '500', background: currentPage===1?'#f1f5f9':'white', color: currentPage===1?'#94a3b8':'#0a3b5c', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: currentPage===1?'not-allowed':'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>chevron_left</span>Prev
                      </button>
                      {Array.from({length:totalPages},(_,i)=>i+1).map(page => {
                        const show = page===1||page===totalPages||(page>=currentPage-2&&page<=currentPage+2);
                        const ell  = page===currentPage-3||page===currentPage+3;
                        if (show) return <button key={page} onClick={()=>setCurrentPage(page)} style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '500', background: currentPage===page?'#0a3b5c':'white', color: currentPage===page?'white':'#0f172a', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer' }}>{page}</button>;
                        if (ell) return <span key={`e${page}`} style={{ width: '28px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>…</span>;
                        return null;
                      })}
                      <button onClick={()=>setCurrentPage(p=>p+1)} disabled={currentPage===totalPages} style={{ padding: '5px 10px', fontSize: '12px', fontWeight: '500', background: currentPage===totalPages?'#f1f5f9':'white', color: currentPage===totalPages?'#94a3b8':'#0a3b5c', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: currentPage===totalPages?'not-allowed':'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}>
                        Next<span className="material-symbols-outlined" style={{ fontSize: '13px' }}>chevron_right</span>
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
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
                  style={{ width: '32px', height: '32px', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s', background: 'rgba(255,255,255,0.07)' }}
                  onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.16)';}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.07)';}}>
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
                      <button onClick={item.onClick} style={{ marginBottom: '14px', background: 'none', border: 'none', padding: 0, display: 'flex', alignItems: 'center', gap: '7px', fontSize: '14px', color: item.active ? '#e9b741' : '#8097a8', fontWeight: item.active ? '600' : '400', cursor: 'pointer', transition: 'color 0.15s' }}
                        onMouseEnter={e=>{e.currentTarget.style.color='white';}}
                        onMouseLeave={e=>{e.currentTarget.style.color=item.active?'#e9b741':'#8097a8';}}>
                        <span className="material-symbols-outlined" style={{ fontSize: '14px', flexShrink: 0 }}>{item.icon}</span>
                        {item.label}
                      </button>
                    ) : (
                      <a href={item.href} target={item.external?'_blank':undefined} rel="noopener noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px', color: '#8097a8', textDecoration: 'none', transition: 'color 0.15s' }}
                        onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.color='white';}}
                        onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.color='#8097a8';}}>
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
                  onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.color='white';}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.color='#4a5c6a';}}>
                  {l.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* ═══ DELETE MODAL ═══ */}
      {isDeleteModalOpen && targetRow && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setIsDeleteModalOpen(false)}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '28px', width: '480px', maxWidth: '95vw', boxShadow: '0 24px 64px rgba(0,0,0,0.3)', border: '1px solid #e2e8f0' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#0a3b5c', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#dc2626' }}>warning</span>
                Delete Repo Records
              </h2>
              <button onClick={() => setIsDeleteModalOpen(false)} style={{ border: 'none', background: '#f1f5f9', cursor: 'pointer', color: '#64748b', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>×</button>
            </div>

            {/* Warning banner */}
            <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '10px', padding: '12px 14px', marginBottom: '14px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#b45309', flexShrink: 0, marginTop: '1px' }}>info</span>
              <div style={{ fontSize: '12px', color: '#92400e', lineHeight: 1.6 }}>
                <strong>Batch delete:</strong> All <strong>{sameFileCount}</strong> record{sameFileCount !== 1 ? 's' : ''} sharing file ID <code style={{ background: '#fef9c3', padding: '1px 4px', borderRadius: '3px', fontFamily: 'monospace' }}>{targetRow.file_id}</code> will be permanently deleted.
              </div>
            </div>

            <div style={{ marginBottom: '20px', padding: '14px 16px', background: '#fef2f2', borderRadius: '10px', border: '1px solid #fee2e2' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                <span className="material-symbols-outlined" style={{ color: '#dc2626', fontSize: '15px' }}>info</span>
                <strong style={{ color: '#0f172a', fontSize: '13px' }}>Selected record details:</strong>
              </div>
              <div style={{ paddingLeft: '20px', fontSize: '12px', color: '#4b5563', display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: '6px', columnGap: '12px', lineHeight: 1.8 }}>
                <div>File ID: <strong style={{ fontFamily: 'monospace', color: '#dc2626' }}>{targetRow.file_id}</strong></div>
                <div>App No.: <strong style={{ fontFamily: 'monospace' }}>{targetRow.number_of_application}</strong></div>
                <div>Date In: <strong style={{ fontFamily: 'monospace' }}>{formatDate(targetRow.date_in)}</strong></div>
                <div>Date Out: <strong style={{ fontFamily: 'monospace' }}>{formatDate(targetRow.date_out)}</strong></div>
                <div>Dealer From: <strong>{targetRow.dealer_from}</strong></div>
                <div>Dealer To: <strong>{targetRow.dealer_to}</strong></div>
                <div>Days: <strong style={{ fontFamily: 'monospace' }}>{fmtDays(targetRow.days)}</strong></div>
                <div>Rate: <strong style={{ fontFamily: 'monospace' }}>{fmtRate(targetRow.rate)}</strong></div>
                <div>Money In: <strong style={{ fontFamily: 'monospace' }}>{fmtMoney(targetRow.money_in)}</strong></div>
                <div>Money Out: <strong style={{ fontFamily: 'monospace' }}>{fmtMoney(targetRow.money_out)}</strong></div>
              </div>
              <p style={{ margin: '10px 0 0 20px', fontSize: '11px', color: '#dc2626' }}>⚠️ This action cannot be undone.</p>
            </div>

            <div style={{ display: 'flex', gap: '9px', justifyContent: 'flex-end' }}>
              <button onClick={() => setIsDeleteModalOpen(false)} style={{ padding: '9px 18px', fontSize: '13px', fontWeight: '500', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '9px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleDelete} disabled={isDeleting} style={{ padding: '9px 18px', fontSize: '13px', fontWeight: '600', background: isDeleting?'#94a3b8':'#dc2626', color: 'white', border: 'none', borderRadius: '9px', cursor: isDeleting?'not-allowed':'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '15px', animation: isDeleting?'spin 1.5s linear infinite':'none' }}>{isDeleting?'hourglass_empty':'delete_forever'}</span>
                {isDeleting ? 'Deleting…' : `Delete All ${sameFileCount} Record${sameFileCount !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

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
        nav::-webkit-scrollbar{height:0;}
      `}</style>
    </div>
  );
};

export default RepoDataPage;