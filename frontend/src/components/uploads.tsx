import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import CbuLogo   from '../assets/CBU_Logo.png';
import facebook  from '../assets/facebook.png';
import telegram  from '../assets/telegram.png';
import linkedin  from '../assets/linkedin.png';
import twitter   from '../assets/twitter.png';
import instagram from '../assets/instagram.png';
import youtube   from '../assets/youtube.png';

// ─── Config ───────────────────────────────────────────────────────────────────

const API_BASE_URL = 'http://localhost:8000';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) { const e = await res.json(); throw new Error(e.detail || 'Failed to fetch'); }
  return res.json();
};

// ─── Nav — "Uploads" is active ───────────────────────────────────────────────

const NAV_PAGES = [
  { label: 'Calculations', icon: 'calculate',       path: '/' },
  { label: 'Uploads',      icon: 'upload_file',     path: '/uploads'      },
  { label: 'Repo',         icon: 'account_balance', path: '/repo'         },
  { label: 'Depo',         icon: 'savings',         path: '/depo'         },
  { label: 'Data',         icon: 'database',        path: '/data'         },
  { label: 'Holidays',     icon: 'calendar_month',  path: '/holidays'     },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface UzoniaUpload {
  file_id:     string;
  file_path:   string;
  status:      'progress' | 'finished' | 'failed';
  file_date:   string;
  created_at:  string | null;
  finished_at: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatDate = (s: string | null): string => {
  if (!s) return '—';
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`;
};

const formatDateTime = (s: string | null): string => {
  if (!s) return '—';
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${String(d.getDate()).padStart(2,'0')}-${months[d.getMonth()]}-${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
};

const shortenPath = (p: string): string => {
  const parts = p.replace(/\\/g,'/').split('/');
  return parts[parts.length - 1] || p;
};

// ─── Status badge config ──────────────────────────────────────────────────────

const STATUS_CFG = {
  finished: { bg: '#d1fae5', color: '#065f46', icon: 'check_circle',    label: 'Finished',     spin: false },
  progress: { bg: '#dbeafe', color: '#1e40af', icon: 'hourglass_empty', label: 'In Progress',  spin: true  },
  failed:   { bg: '#fee2e2', color: '#991b1b', icon: 'error',           label: 'Failed',       spin: false },
} as const;

// ─── Compact column search input ──────────────────────────────────────────────

const ColSearch = ({ value, onChange, placeholder, icon, flex }: {
  value: string; onChange: (v: string) => void;
  placeholder: string; icon: string; flex?: string;
}) => (
  <div style={{ position: 'relative', flex: flex || '1 1 110px', minWidth: '90px' }}>
    <span className="material-symbols-outlined" style={{
      position: 'absolute', left: '7px', top: '50%', transform: 'translateY(-50%)',
      color: '#94a3b8', fontSize: '13px', pointerEvents: 'none',
    }}>{icon}</span>
    <input
      type="text" value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%', padding: '8px 8px 8px 24px', fontSize: '11px',
        background: '#f8fafc', color: '#0f172a', border: '1px solid #e2e8f0',
        borderRadius: '8px', outline: 'none', boxSizing: 'border-box',
      }}
    />
  </div>
);

// ─── Component ────────────────────────────────────────────────────────────────

const UzoniaUploadsPage = () => {
  const navigate    = useNavigate();
  const currentPath = '/uploads';

  // Auto-refresh while any upload is in progress
  const { data, error, isLoading, mutate } = useSWR(
    `${API_BASE_URL}/api/get_all_uzonia_uploads`,
    fetcher,
    {
      revalidateOnFocus: true,
      refreshInterval: (d) => {
        const hasProgress = d?.Data && Array.isArray(d.Data) &&
          d.Data.some((r: UzoniaUpload) => r.status === 'progress');
        return hasProgress ? 5000 : 0;
      },
    }
  );

  // ── Per-column filter state ───────────────────────────────────────────────
  const [fFileId,     setFFileId]     = useState('');
  const [fFilePath,   setFFilePath]   = useState('');
  const [fStatus,     setFStatus]     = useState('');
  const [fFileDate,   setFFileDate]   = useState('');
  const [fCreatedAt,  setFCreatedAt]  = useState('');
  const [fFinishedAt, setFFinishedAt] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // ── Delete modal ──────────────────────────────────────────────────────────
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [targetUpload,      setTargetUpload]      = useState<UzoniaUpload|null>(null);
  const [isDeleting,        setIsDeleting]        = useState(false);

  // ── Toast ─────────────────────────────────────────────────────────────────
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
  const uploads: UzoniaUpload[] = useMemo(
    () => Array.isArray(data?.Data) ? data.Data : [],
    [data]
  );

  const hasProgressItems = useMemo(() => uploads.some(u => u.status === 'progress'), [uploads]);

  const filteredData = useMemo(() => {
    let f = [...uploads];
    if (fFileId.trim())     f = f.filter(r => r.file_id.toLowerCase().includes(fFileId.trim().toLowerCase()));
    if (fFilePath.trim())   f = f.filter(r => shortenPath(r.file_path).toLowerCase().includes(fFilePath.trim().toLowerCase()));
    if (fStatus.trim())     f = f.filter(r => r.status.toLowerCase().includes(fStatus.trim().toLowerCase()));
    if (fFileDate.trim())   f = f.filter(r => String(r.file_date).includes(fFileDate.trim()));
    if (fCreatedAt.trim())  f = f.filter(r => formatDateTime(r.created_at).toLowerCase().includes(fCreatedAt.trim().toLowerCase()));
    if (fFinishedAt.trim()) f = f.filter(r => formatDateTime(r.finished_at).toLowerCase().includes(fFinishedAt.trim().toLowerCase()));
    return f;
  }, [uploads, fFileId, fFilePath, fStatus, fFileDate, fCreatedAt, fFinishedAt]);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:    uploads.length,
    finished: uploads.filter(u => u.status === 'finished').length,
    progress: uploads.filter(u => u.status === 'progress').length,
    failed:   uploads.filter(u => u.status === 'failed').length,
  }), [uploads]);

  const hasActiveFilters = fFileId || fFilePath || fStatus || fFileDate || fCreatedAt || fFinishedAt;
  const totalPages    = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = useMemo(
    () => filteredData.slice((currentPage-1)*itemsPerPage, currentPage*itemsPerPage),
    [filteredData, currentPage]
  );
  useEffect(() => { setCurrentPage(1); }, [fFileId, fFilePath, fStatus, fFileDate, fCreatedAt, fFinishedAt]);

  const handleClearFilters = useCallback(() => {
    setFFileId(''); setFFilePath(''); setFStatus(''); setFFileDate(''); setFCreatedAt(''); setFFinishedAt('');
  }, []);

  // ── Download ──────────────────────────────────────────────────────────────
  const handleDownload = (upload: UzoniaUpload) => {
    const url = `${API_BASE_URL}/api/download_uzonia_data_file?file_id=${encodeURIComponent(upload.file_id)}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = `${upload.file_id}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const openDeleteModal  = (u: UzoniaUpload) => { setTargetUpload(u); setIsDeleteModalOpen(true); };

  const handleDelete = async () => {
    if (!targetUpload) return;
    setIsDeleting(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/delete_single_uzonia_upload?file_id=${encodeURIComponent(targetUpload.file_id)}`,
        { method: 'DELETE' }
      );
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail); }
      setIsDeleteModalOpen(false); setTargetUpload(null); mutate();
      showToast('Upload record deleted successfully!', 'success');
    } catch(err: any) { showToast(err.message || 'Failed to delete.', 'error'); }
    finally { setIsDeleting(false); }
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

  // ── Footer columns — exact copy from HolidaysPage ─────────────────────────
  const footerColumns = [
    {
      heading: 'Modules',
      items: NAV_PAGES.map(p => ({
        label: p.label, icon: p.icon, onClick: () => navigate(p.path),
        active: p.path === currentPath, external: false, href: '',
      })),
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
        { label: '+998 71 212-62-05',   href: 'tel:+998712126205',                           icon: 'call',        external: false },
        { label: '+998 71 200-00-44',   href: 'tel:+998712000044',                           icon: 'call',        external: false },
        { label: '+998 71 233-35-09',   href: 'fax:+998712333509',                           icon: 'fax',         external: false },
        { label: 'info@cbu.uz',         href: 'mailto:info@cbu.uz',                          icon: 'mail',        external: false },
        { label: 'Islam Karimov St. 6', href: 'https://maps.app.goo.gl/4qDXnjgQoTwfWCg28', icon: 'location_on', external: true  },
      ],
    },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh', width: '100%', margin: 0, padding: 0,
      display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc',
      fontFamily: '"Inter","Segoe UI",system-ui,-apple-system,sans-serif',
    }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '24px', right: '24px', zIndex: 2000,
          background: toast.type==='success' ? '#065f46' : '#991b1b',
          color: 'white', padding: '13px 18px', borderRadius: '12px',
          display: 'flex', alignItems: 'center', gap: '10px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)', fontSize: '14px', fontWeight: '500',
          animation: 'slideIn 0.3s ease',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '19px' }}>
            {toast.type==='success' ? 'check_circle' : 'error'}
          </span>
          {toast.text}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* HEADER — exact HolidaysPage structure                       */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <header style={{
        width: '100%',
        background: 'linear-gradient(135deg, #0a3b5c 0%, #1a4b70 100%)',
        padding: '0 24px',
        boxShadow: '0 4px 20px rgba(0,40,70,0.18)',
        borderBottom: '3px solid #e9b741',
        boxSizing: 'border-box',
        minHeight: '64px',
        display: 'flex', alignItems: 'center',
      }}>
        {/* Logo + title */}
        <div onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0, cursor: 'pointer', marginRight: '28px' }}>
          <div style={{ width: '44px', height: '44px', background: 'white', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.12)', padding: '5px', flexShrink: 0 }}>
            <img src={CbuLogo} alt="CBU Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: 'white', lineHeight: '1.6' }}>The Central Bank of Uzbekistan</div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', lineHeight: '1.3' }}>Monetary Department</div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: '1px', height: '32px', background: 'rgba(255,255,255,0.15)', marginRight: '16px', flexShrink: 0 }} />

        {/* Nav tabs */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, overflowX: 'auto' }}>
          {NAV_PAGES.map(p => <NavBtn key={p.path} page={p} />)}
        </nav>

        {/* Utility */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginLeft: '16px', flexShrink: 0 }}>
          {[
            { icon: 'arrow_back',     label: 'Back',  onClick: () => window.history.back() },
            { icon: 'account_circle', label: 'Login', onClick: () => {}                    },
          ].map(b => (
            <button key={b.label} onClick={b.onClick} style={{
              background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.65)',
              display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px',
              cursor: 'pointer', padding: '7px 12px', borderRadius: '8px', transition: 'all 0.15s',
            }}
            onMouseEnter={e=>{e.currentTarget.style.color='white'; e.currentTarget.style.background='rgba(255,255,255,0.08)';}}
            onMouseLeave={e=>{e.currentTarget.style.color='rgba(255,255,255,0.65)'; e.currentTarget.style.background='transparent';}}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>{b.icon}</span>
              {b.label}
            </button>
          ))}
        </div>
      </header>

      {/* ═══ MAIN ═══ */}
      <main style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', padding: '22px 24px', background: '#f8fafc', boxSizing: 'border-box' }}>
        <div style={{ width: '100%', maxWidth: '1600px' }}>

          {/* ── Stats — 4 cards ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '16px' }}>
            {[
              { label: 'Total Uploads', value: stats.total,    color: '#0a3b5c', bg: '#e2e8f0', icon: 'upload_file'    },
              { label: 'Finished',      value: stats.finished, color: '#065f46', bg: '#d1fae5', icon: 'check_circle'   },
              { label: 'In Progress',   value: stats.progress, color: '#1e40af', bg: '#dbeafe', icon: 'hourglass_empty'},
              { label: 'Failed',        value: stats.failed,   color: '#991b1b', bg: '#fee2e2', icon: 'error'          },
            ].map(s => (
              <div key={s.label} style={{
                background: 'white', padding: '13px 15px', borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0',
                display: 'flex', alignItems: 'center', gap: '11px',
              }}>
                <div style={{ width: '36px', height: '36px', background: s.bg, borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: s.color }}>{s.icon}</span>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '2px' }}>{s.label}</div>
                  <div style={{ fontSize: '22px', fontWeight: '700', color: s.color, lineHeight: 1 }}>{s.value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Filter bar — all 5 column filters in one row ── */}
          <div style={{ background: 'white', padding: '11px 14px', borderRadius: '12px', marginBottom: '14px', boxShadow: '0 2px 8px rgba(0,40,70,0.05)', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>

              <ColSearch value={fFileId}     onChange={setFFileId}     placeholder="File ID…"      icon="search"     flex="2 1 150px" />
              <ColSearch value={fFilePath}   onChange={setFFilePath}   placeholder="File name…"    icon="folder"     flex="2 1 130px" />
              <ColSearch value={fStatus}     onChange={setFStatus}     placeholder="Status…"       icon="tune"       flex="1 1 90px"  />
              <ColSearch value={fFileDate}   onChange={setFFileDate}   placeholder="File date…"    icon="event"      flex="1 1 100px" />
              <ColSearch value={fCreatedAt}  onChange={setFCreatedAt}  placeholder="Created at…"   icon="add_circle" flex="1 1 100px" />
              <ColSearch value={fFinishedAt} onChange={setFFinishedAt} placeholder="Finished at…"  icon="schedule"   flex="1 1 110px" />

              {hasActiveFilters && (
                <button onClick={handleClearFilters} style={{
                  padding: '7px 10px', fontSize: '12px', fontWeight: '500',
                  background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0',
                  borderRadius: '8px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0,
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>close</span>Clear
                </button>
              )}
            </div>

            {hasActiveFilters && (
              <div style={{ marginTop: '7px', fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap', padding: '4px 8px', background: '#f1f5f9', borderRadius: '7px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '12px', color: '#0a3b5c' }}>filter_alt</span>
                {fFileId     && <span style={{ background: 'white', padding: '1px 5px', borderRadius: '4px' }}>ID:<strong>{fFileId}</strong></span>}
                {fFilePath   && <span style={{ background: 'white', padding: '1px 5px', borderRadius: '4px' }}>File:<strong>{fFilePath}</strong></span>}
                {fStatus     && <span style={{ background: 'white', padding: '1px 5px', borderRadius: '4px' }}>Status:<strong>{fStatus}</strong></span>}
                {fFileDate   && <span style={{ background: 'white', padding: '1px 5px', borderRadius: '4px' }}>Date:<strong>{fFileDate}</strong></span>}
                {fCreatedAt  && <span style={{ background: 'white', padding: '1px 5px', borderRadius: '4px' }}>Created:<strong>{fCreatedAt}</strong></span>}
                {fFinishedAt && <span style={{ background: 'white', padding: '1px 5px', borderRadius: '4px' }}>Finished:<strong>{fFinishedAt}</strong></span>}
                <span style={{ marginLeft: 'auto' }}>{filteredData.length} result{filteredData.length!==1?'s':''}</span>
              </div>
            )}
          </div>

          {/* ── Table ── */}
          <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,40,70,0.06)', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
            {isLoading ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '36px', marginBottom: '12px', display: 'block', color: '#0a3b5c', animation: 'spin 2s linear infinite' }}>refresh</span>
                Loading upload history…
              </div>
            ) : (error || uploads.length === 0) && !hasActiveFilters ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '44px', marginBottom: '12px', display: 'block', color: '#94a3b8' }}>cloud_off</span>
                No upload data available.
              </div>
            ) : paginatedData.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '44px', marginBottom: '12px', display: 'block', color: '#94a3b8' }}>cloud_off</span>
                {hasActiveFilters ? 'No uploads match your filters.' : 'No upload records found.'}
                {hasActiveFilters && <button onClick={handleClearFilters} style={{ display: 'block', margin: '12px auto 0', padding: '7px 16px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#475569', cursor: 'pointer', fontSize: '12px' }}>Clear filters</button>}
              </div>
            ) : (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #0a3b5c' }}>
                        {[
                          { label: '#',           w: '46px'  },
                          { label: 'FILE ID',     w: 'auto'  },
                          { label: 'FILE NAME',   w: '185px' },
                          { label: 'STATUS',      w: '115px' },
                          { label: 'FILE DATE',   w: '100px' },
                          { label: 'CREATED AT',  w: '148px' },
                          { label: 'FINISHED AT', w: '148px' },
                          { label: 'ACTIONS',     w: '180px' },
                        ].map(col => (
                          <th key={col.label} style={{
                            padding: '11px 14px', textAlign: 'left', width: col.w,
                            fontWeight: '600', color: '#0a3b5c', fontSize: '11px',
                            letterSpacing: '0.6px', whiteSpace: 'nowrap',
                          }}>{col.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedData.map((item: UzoniaUpload, index: number) => {
                        const idx     = (currentPage-1)*itemsPerPage + index + 1;
                        const badge   = STATUS_CFG[item.status] ?? STATUS_CFG.failed;
                        const canDown = item.status === 'finished';
                        const filename = shortenPath(item.file_path);

                        return (
                          <tr key={item.file_id}
                            style={{ borderBottom: '1px solid #f1f5f9', background: index%2===0?'white':'#fafbfc', transition: 'background 0.1s' }}
                            onMouseEnter={e=>{e.currentTarget.style.background='#f0f7ff';}}
                            onMouseLeave={e=>{e.currentTarget.style.background=index%2===0?'white':'#fafbfc';}}
                          >
                            {/* # */}
                            <td style={{ padding: '10px 14px', color: '#cbd5e1', fontSize: '12px', fontWeight: '600' }}>{idx}</td>

                            {/* File ID */}
                            <td style={{ padding: '10px 14px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: '700', color: '#0a3b5c', background: '#eef2ff', padding: '3px 8px', borderRadius: '6px', border: '1px solid #e0e7ff', whiteSpace: 'nowrap', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}
                                  title={item.file_id}
                                >
                                  {item.file_id}
                                </span>
                                {item.status === 'progress' && (
                                  <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#1e40af', animation: 'spin 2s linear infinite', flexShrink: 0 }}>sync</span>
                                )}
                              </div>
                            </td>

                            {/* File name */}
                            <td style={{ padding: '10px 14px', maxWidth: '200px' }}>
                              {item.status === 'progress' ? (
                                <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>Processing…</span>
                              ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <div style={{ width: '24px', height: '24px', background: canDown ? '#dcfce7' : '#fee2e2', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '13px', color: canDown ? '#16a34a' : '#dc2626' }}>
                                      {canDown ? 'folder_zip' : 'folder_off'}
                                    </span>
                                  </div>
                                  <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#374151', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', maxWidth: '160px' }}
                                    title={filename}>
                                    {filename}
                                  </span>
                                </div>
                              )}
                            </td>

                            {/* Status */}
                            <td style={{ padding: '10px 14px' }}>
                              <span style={{
                                padding: '3px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: '600',
                                background: badge.bg, color: badge.color,
                                display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap',
                              }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '12px', animation: badge.spin ? 'spin 2s linear infinite' : 'none' }}>{badge.icon}</span>
                                {badge.label}
                              </span>
                            </td>

                            {/* File date */}
                            <td style={{ padding: '10px 14px' }}>
                              <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: '600', color: '#475569' }}>
                                {item.file_date || '—'}
                              </span>
                            </td>

                            {/* Created at */}
                            <td style={{ padding: '10px 14px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '11px', color: '#0a3b5c', flexShrink: 0 }}>schedule</span>
                                <span style={{ fontSize: '11px', fontFamily: item.created_at ? 'monospace' : 'inherit', color: item.created_at ? '#374151' : '#cbd5e1', fontWeight: item.created_at ? '500' : '400', whiteSpace: 'nowrap' }}>
                                  {formatDateTime(item.created_at)}
                                </span>
                              </div>
                            </td>

                            {/* Finished at */}
                            <td style={{ padding: '10px 14px' }}>
                              <span style={{ fontSize: '11px', fontFamily: item.finished_at ? 'monospace' : 'inherit', color: item.finished_at ? '#374151' : '#94a3b8', fontWeight: item.finished_at ? '500' : '400', whiteSpace: 'nowrap' }}>
                                {item.status === 'progress' ? '⏳ Processing…' : formatDateTime(item.finished_at)}
                              </span>
                            </td>

                            {/* Actions */}
                            <td style={{ padding: '10px 14px' }}>
                              <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>

                                {/* Download */}
                                <button
                                  onClick={() => canDown && handleDownload(item)}
                                  disabled={!canDown}
                                  title={canDown ? 'Download .zip file' : 'Available when finished'}
                                  style={{
                                    padding: '4px 10px', fontSize: '11px', fontWeight: '500',
                                    background: canDown ? '#f0fdf4' : '#f1f5f9',
                                    color: canDown ? '#16a34a' : '#94a3b8',
                                    border: `1px solid ${canDown ? '#bbf7d0' : '#e2e8f0'}`,
                                    borderRadius: '6px', cursor: canDown ? 'pointer' : 'not-allowed',
                                    display: 'inline-flex', alignItems: 'center', gap: '3px',
                                    opacity: canDown ? 1 : 0.55, transition: 'all 0.13s', whiteSpace: 'nowrap',
                                  }}
                                  onMouseEnter={e => { if(canDown){e.currentTarget.style.background='#16a34a'; e.currentTarget.style.color='white'; e.currentTarget.style.borderColor='#16a34a';} }}
                                  onMouseLeave={e => { if(canDown){e.currentTarget.style.background='#f0fdf4'; e.currentTarget.style.color='#16a34a'; e.currentTarget.style.borderColor='#bbf7d0';} }}
                                >
                                  <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>download</span>
                                  Download
                                </button>

                                {/* Delete */}
                                <button
                                  onClick={() => item.status !== 'progress' && openDeleteModal(item)}
                                  disabled={item.status === 'progress'}
                                  title={item.status === 'progress' ? 'Cannot delete while processing' : 'Delete record'}
                                  style={{
                                    padding: '4px 10px', fontSize: '11px', fontWeight: '500',
                                    background: item.status === 'progress' ? '#f1f5f9' : '#fff5f5',
                                    color: item.status === 'progress' ? '#94a3b8' : '#dc2626',
                                    border: `1px solid ${item.status === 'progress' ? '#e2e8f0' : '#fecaca'}`,
                                    borderRadius: '6px', cursor: item.status === 'progress' ? 'not-allowed' : 'pointer',
                                    display: 'inline-flex', alignItems: 'center', gap: '3px',
                                    opacity: item.status === 'progress' ? 0.55 : 1, transition: 'all 0.13s', whiteSpace: 'nowrap',
                                  }}
                                  onMouseEnter={e => { if(item.status!=='progress'){e.currentTarget.style.background='#dc2626'; e.currentTarget.style.color='white'; e.currentTarget.style.borderColor='#dc2626';} }}
                                  onMouseLeave={e => { if(item.status!=='progress'){e.currentTarget.style.background='#fff5f5'; e.currentTarget.style.color='#dc2626'; e.currentTarget.style.borderColor='#fecaca';} }}
                                >
                                  <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>
                                    {item.status === 'progress' ? 'hourglass_empty' : 'delete'}
                                  </span>
                                  {item.status === 'progress' ? 'Processing' : 'Delete'}
                                </button>

                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {filteredData.length > itemsPerPage && (
                  <div style={{ padding: '12px 18px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      Showing {(currentPage-1)*itemsPerPage+1}–{Math.min(currentPage*itemsPerPage, filteredData.length)} of {filteredData.length}
                    </div>
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      <button onClick={()=>setCurrentPage(p=>p-1)} disabled={currentPage===1} style={{ padding: '5px 10px', fontSize: '12px', fontWeight: '500', background: currentPage===1?'#f1f5f9':'white', color: currentPage===1?'#94a3b8':'#0a3b5c', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: currentPage===1?'not-allowed':'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>chevron_left</span>Prev
                      </button>
                      {Array.from({length:totalPages},(_,i)=>i+1).map(page => {
                        const show = page===1||page===totalPages||(page>=currentPage-2&&page<=currentPage+2);
                        const ell  = page===currentPage-3||page===currentPage+3;
                        if (show) return <button key={page} onClick={()=>setCurrentPage(page)} style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '500', background: currentPage===page?'#0a3b5c':'white', color: currentPage===page?'white':'#0f172a', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer' }}>{page}</button>;
                        if (ell)  return <span key={`e${page}`} style={{ width: '28px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>…</span>;
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

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* FOOTER — exact HolidaysPage structure                       */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <footer style={{ width: '100%', background: '#0a2a40', borderTop: '3px solid #e9b741', boxSizing: 'border-box' }}>
        <div style={{
          width: '100%', maxWidth: '1600px', margin: '0 auto',
          padding: '40px 32px 28px',
          display: 'grid',
          gridTemplateColumns: '280px repeat(4, 1fr)',
          gap: '48px',
          alignItems: 'start',
        }}>
          {/* ── Brand ── */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <img src={CbuLogo} alt="CBU" style={{ width: '40px', height: '40px', objectFit: 'contain', background: 'white', borderRadius: '9px', padding: '4px', flexShrink: 0 }} />
              <div>
                <div style={{ color: 'white', fontSize: '14px', fontWeight: '700', lineHeight: '1.6' }}>The Central Bank of Uzbekistan</div>
              </div>
            </div>
            <p style={{ fontSize: '14px', lineHeight: '1.6', color: '#6b8499', marginBottom: '18px' }}>
              Official Monetary Department system — Uzonia Calculations &amp; Interbank Operations.
            </p>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '18px', flexWrap: 'wrap' }}>
              {[
                { src: facebook,  alt: 'Facebook',  href: 'https://www.facebook.com/centralbankuzbekistan/', width: 28, height: 28 },
                { src: telegram,  alt: 'Telegram',  href: 'https://t.me/centralbankuzbekistan', width: 30, height: 30 },
                { src: linkedin,  alt: 'LinkedIn',  href: 'https://www.linkedin.com/company/centralbankuzbekistan/?originalSubdomain=uz', width: 32, height: 32 },
                { src: twitter,   alt: 'Twitter',   href: 'https://x.com/cbuzbekistan', width: 40, height: 40 },
                { src: instagram, alt: 'Instagram', href: 'https://www.instagram.com/centralbankuzbekistan', width: 26, height: 26 },
                { src: youtube,   alt: 'YouTube',   href: 'https://www.youtube.com/centralbankofuzbekistan', width: 30, height: 30 },
              ].map(s => (
                <a
                  key={s.alt}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    width: '32px',   // container stays consistent
                    height: '32px',
                    borderRadius: '7px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.16)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)'; }}
                >
                  <img
                    src={s.src}
                    alt={s.alt}
                    style={{ width: `${s.width}px`, height: `${s.height}px`, objectFit: 'contain' }}
                  />
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
                      <button onClick={item.onClick} style={{
                        background: 'none', border: 'none', padding: 0,
                        display: 'flex', alignItems: 'center', gap: '7px',
                        fontSize: '14px', marginBottom: '14px',
                        color: item.active ? '#e9b741' : '#8097a8',
                        fontWeight: item.active ? '600' : '400',
                        cursor: 'pointer', transition: 'color 0.15s', textAlign: 'center',
                      }}
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
      {isDeleteModalOpen && targetUpload && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setIsDeleteModalOpen(false)}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '30px', width: '480px', maxWidth: '95vw', boxShadow: '0 24px 64px rgba(0,0,0,0.3)', border: '1px solid #e2e8f0' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
              <h2 style={{ margin: 0, fontSize: '19px', fontWeight: '600', color: '#0a3b5c', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '21px', color: '#dc2626' }}>warning</span>
                Delete Upload Record
              </h2>
              <button onClick={() => setIsDeleteModalOpen(false)} style={{ border: 'none', background: '#f1f5f9', cursor: 'pointer', color: '#64748b', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>×</button>
            </div>

            <div style={{ marginBottom: '22px', padding: '14px 16px', background: '#fef2f2', borderRadius: '10px', border: '1px solid #fee2e2' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                <span className="material-symbols-outlined" style={{ color: '#dc2626', fontSize: '15px' }}>info</span>
                <strong style={{ color: '#0f172a', fontSize: '13px' }}>Are you sure you want to delete this upload record?</strong>
              </div>
              <div style={{ paddingLeft: '20px', fontSize: '12px', color: '#4b5563', lineHeight: '2.1' }}>
                <div>File ID: <strong style={{ fontFamily: 'monospace', color: '#dc2626' }}>{targetUpload.file_id}</strong></div>
                <div>File name: <strong style={{ fontFamily: 'monospace' }}>{shortenPath(targetUpload.file_path)}</strong></div>
                <div>Status: <strong>{STATUS_CFG[targetUpload.status]?.label ?? targetUpload.status}</strong></div>
                <div>File date: <strong style={{ fontFamily: 'monospace' }}>{targetUpload.file_date || '—'}</strong></div>
                {targetUpload.finished_at && (
                  <div>Finished: <strong style={{ fontFamily: 'monospace' }}>{formatDateTime(targetUpload.finished_at)}</strong></div>
                )}
              </div>
              <p style={{ margin: '8px 0 0 20px', fontSize: '11px', color: '#b45309' }}>
                ⚠️ Only the database record is deleted — the file on disk is not removed.
              </p>
              <p style={{ margin: '4px 0 0 20px', fontSize: '11px', color: '#dc2626' }}>
                ⚠️ This action cannot be undone.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '9px', justifyContent: 'flex-end' }}>
              <button onClick={() => setIsDeleteModalOpen(false)} style={{ padding: '9px 18px', fontSize: '13px', fontWeight: '500', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '9px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleDelete} disabled={isDeleting} style={{ padding: '9px 18px', fontSize: '13px', fontWeight: '600', background: isDeleting?'#94a3b8':'#dc2626', color: 'white', border: 'none', borderRadius: '9px', cursor: isDeleting?'not-allowed':'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '15px', animation: isDeleting?'spin 1.5s linear infinite':'none' }}>{isDeleting?'hourglass_empty':'delete_forever'}</span>
                {isDeleting ? 'Deleting…' : 'Delete Record'}
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

export default UzoniaUploadsPage;