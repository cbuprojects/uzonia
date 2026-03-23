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

// ─── Nav ─────────────────────────────────────────────────────────────────────

const NAV_PAGES = [
  { label: 'Calculations', icon: 'calculate',       path: '/calculations' },
  { label: 'Uploads',      icon: 'upload_file',     path: '/uploads'      },
  { label: 'Repo',         icon: 'account_balance', path: '/repo'         },
  { label: 'Depo',         icon: 'savings',         path: '/depo'         },
  { label: 'Data',         icon: 'database',        path: '/data'         },
  { label: 'Holidays',     icon: 'calendar_month',  path: '/holidays'     },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface UzoniaRow {
  file_id:        string;
  rate:           number;
  uzonia:         number;
  day_7_uzonia:   number;
  day_30_uzonia:  number;
  day_90_uzonia:  number;
  day_180_uzonia: number;
  index:          number;
  uzonia_date:    string;
  created_at:     string | null;
}

interface AddForm {
  file_id: string; rate: string; uzonia: string; day_7_uzonia: string; day_30_uzonia: string;
  day_90_uzonia: string; day_180_uzonia: string; index: string; uzonia_date: string;
}
interface EditForm {
  rate: string; uzonia: string; day_7_uzonia: string; day_30_uzonia: string;
  day_90_uzonia: string; day_180_uzonia: string; index: string;
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

const fmtRate  = (n: number): string => typeof n === 'number' ? `${n.toFixed(4)}%` : '—';
const fmtIndex = (n: number): string => typeof n === 'number' ? n.toFixed(4) : '—';

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

// ─── Numeric-only search input ────────────────────────────────────────────────
// Allows digits, one decimal point, and a trailing % for display matching

const NumSearch = ({ value, onChange, placeholder, icon, flex }: {
  value: string; onChange: (v: string) => void; placeholder: string; icon: string; flex?: string;
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const pass = ['Backspace','Delete','Tab','Escape','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'];
    if (pass.includes(e.key)) return;
    if (!/[\d.%]/.test(e.key)) e.preventDefault();
  };
  return (
    <div style={{ position: 'relative', flex: flex || '1 1 90px', minWidth: '80px' }}>
      <span className="material-symbols-outlined" style={{ position: 'absolute', left: '7px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '13px', pointerEvents: 'none' }}>{icon}</span>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        style={{ width: '100%', padding: '8px 8px 8px 24px', fontSize: '11px', background: '#f8fafc', color: '#0f172a', border: '1px solid #e2e8f0', borderRadius: '8px', outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace' }}
      />
    </div>
  );
};

// ─── Compact text search input ────────────────────────────────────────────────

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

// ─── Rate badge ───────────────────────────────────────────────────────────────

const RateBadge = ({ value, bg, color }: { value: number; bg: string; color: string }) => (
  <span style={{ display: 'inline-block', fontFamily: 'monospace', fontSize: '12px', fontWeight: '700', background: bg, color, padding: '2px 7px', borderRadius: '6px', border: `1px solid ${color}22`, whiteSpace: 'nowrap' }}>
    {fmtRate(value)}
  </span>
);

// ─── Constants ────────────────────────────────────────────────────────────────

const EMPTY_ADD: AddForm = { file_id: '', rate: '', uzonia: '', day_7_uzonia: '', day_30_uzonia: '', day_90_uzonia: '', day_180_uzonia: '', index: '', uzonia_date: '' };
const EMPTY_EDIT: EditForm = { rate: '', uzonia: '', day_7_uzonia: '', day_30_uzonia: '', day_90_uzonia: '', day_180_uzonia: '', index: '' };

// ─── Component ────────────────────────────────────────────────────────────────

const UzoniaDataPage = () => {
  const navigate    = useNavigate();
  const currentPath = '/data';

  const { data, error, isLoading, mutate } = useSWR(
    `${API_BASE_URL}/api/get_all_uzonia_data`, fetcher, { revalidateOnFocus: false }
  );

  // ── Per-column filter state ───────────────────────────────────────────────
  const [fDate,    setFDate]    = useState('');
  const [fFileId,  setFFileId]  = useState('');
  const [fRate,    setFRate]    = useState('');
  const [fUzonia,  setFUzonia]  = useState('');
  const [fDay7,    setFDay7]    = useState('');
  const [fDay30,   setFDay30]   = useState('');
  const [fDay90,   setFDay90]   = useState('');
  const [fDay180,  setFDay180]  = useState('');
  const [fIndex,   setFIndex]   = useState('');
  const [fCreated, setFCreated] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // ── Modal state ───────────────────────────────────────────────────────────
  const [isAddModalOpen,    setIsAddModalOpen]    = useState(false);
  const [isEditModalOpen,   setIsEditModalOpen]   = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [targetRow,  setTargetRow]  = useState<UzoniaRow|null>(null);
  const [isSaving,   setIsSaving]   = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [addForm,  setAddForm]  = useState<AddForm>({ ...EMPTY_ADD });
  const [editForm, setEditForm] = useState<EditForm>({ ...EMPTY_EDIT });

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
  const rows: UzoniaRow[] = useMemo(() => Array.isArray(data?.Data) ? data.Data : [], [data]);

  const filteredData = useMemo(() => {
    let f = [...rows];
    if (fDate.trim())    f = f.filter(r => formatDate(r.uzonia_date).includes(fDate.trim()));
    if (fFileId.trim())  f = f.filter(r => r.file_id.toLowerCase().includes(fFileId.trim().toLowerCase()));
    if (fRate.trim())    f = f.filter(r => fmtRate(r.rate).includes(fRate.trim()));
    if (fUzonia.trim())  f = f.filter(r => fmtRate(r.uzonia).includes(fUzonia.trim()));
    if (fDay7.trim())    f = f.filter(r => fmtRate(r.day_7_uzonia).includes(fDay7.trim()));
    if (fDay30.trim())   f = f.filter(r => fmtRate(r.day_30_uzonia).includes(fDay30.trim()));
    if (fDay90.trim())   f = f.filter(r => fmtRate(r.day_90_uzonia).includes(fDay90.trim()));
    if (fDay180.trim())  f = f.filter(r => fmtRate(r.day_180_uzonia).includes(fDay180.trim()));
    if (fIndex.trim())   f = f.filter(r => fmtIndex(r.index).includes(fIndex.trim()));
    if (fCreated.trim()) f = f.filter(r => formatDateTime(r.created_at).toLowerCase().includes(fCreated.trim().toLowerCase()));
    return f;
  }, [rows, fDate, fFileId, fRate, fUzonia, fDay7, fDay30, fDay90, fDay180, fIndex, fCreated]);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (!rows.length) return { total: 0, firstDate: '—', latestDate: '—', avgUzonia: '—', minUzonia: '—', maxUzonia: '—' };
    const rates  = rows.map(r => r.uzonia);
    const avg    = rates.reduce((a, b) => a + b, 0) / rates.length;
    const sorted = [...rows].sort((a, b) => new Date(a.uzonia_date).getTime() - new Date(b.uzonia_date).getTime());
    return {
      total:      rows.length,
      firstDate:  formatDate(sorted[0].uzonia_date),
      latestDate: formatDate(sorted[sorted.length - 1].uzonia_date),
      avgUzonia:  fmtRate(avg),
      minUzonia:  fmtRate(Math.min(...rates)),
      maxUzonia:  fmtRate(Math.max(...rates)),
    };
  }, [rows]);

  const hasActiveFilters = fDate || fFileId || fRate || fUzonia || fDay7 || fDay30 || fDay90 || fDay180 || fIndex || fCreated;
  const totalPages    = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = useMemo(
    () => filteredData.slice((currentPage-1)*itemsPerPage, currentPage*itemsPerPage),
    [filteredData, currentPage]
  );
  useEffect(() => { setCurrentPage(1); }, [fDate, fFileId, fRate, fUzonia, fDay7, fDay30, fDay90, fDay180, fIndex, fCreated]);

  const handleClearFilters = useCallback(() => {
    setFDate(''); setFFileId(''); setFRate(''); setFUzonia(''); setFDay7('');
    setFDay30(''); setFDay90(''); setFDay180(''); setFIndex(''); setFCreated('');
  }, []);

  // ── CRUD handlers ─────────────────────────────────────────────────────────
  const openAddModal    = () => { setAddForm({ ...EMPTY_ADD }); setIsAddModalOpen(true); };
  const openEditModal   = (r: UzoniaRow) => {
    setTargetRow(r);
    setEditForm({ rate: String(r.rate), uzonia: String(r.uzonia), day_7_uzonia: String(r.day_7_uzonia), day_30_uzonia: String(r.day_30_uzonia), day_90_uzonia: String(r.day_90_uzonia), day_180_uzonia: String(r.day_180_uzonia), index: String(r.index) });
    setIsEditModalOpen(true);
  };
  const openDeleteModal = (r: UzoniaRow) => { setTargetRow(r); setIsDeleteModalOpen(true); };

  const handleAdd = async () => {
    const { file_id, rate, uzonia, day_7_uzonia, day_30_uzonia, day_90_uzonia, day_180_uzonia, index, uzonia_date } = addForm;
    if (!file_id.trim()||!rate||!uzonia||!day_7_uzonia||!day_30_uzonia||!day_90_uzonia||!day_180_uzonia||!index||!uzonia_date) { showToast('All fields are required.', 'error'); return; }
    setIsSaving(true);
    try {
      const p = new URLSearchParams({ file_id, rate, uzonia, day_7_uzonia, day_30_uzonia, day_90_uzonia, day_180_uzonia, index, uzonia_date });
      const res = await fetch(`${API_BASE_URL}/api/add_new_uzonia?${p}`, { method: 'POST' });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail); }
      setIsAddModalOpen(false); setAddForm({ ...EMPTY_ADD }); mutate();
      showToast('Uzonia record added!', 'success');
    } catch(err: any) { showToast(err.message || 'Failed to add.', 'error'); }
    finally { setIsSaving(false); }
  };

  const handleEdit = async () => {
    if (!targetRow) return;
    const { rate, uzonia, day_7_uzonia, day_30_uzonia, day_90_uzonia, day_180_uzonia, index } = editForm;
    if (!rate||!uzonia||!day_7_uzonia||!day_30_uzonia||!day_90_uzonia||!day_180_uzonia||!index) { showToast('All rate fields are required.', 'error'); return; }
    setIsSaving(true);
    try {
      const p = new URLSearchParams({ rate, uzonia, day_7_uzonia, day_30_uzonia, day_90_uzonia, day_180_uzonia, index, uzonia_date: targetRow.uzonia_date });
      const res = await fetch(`${API_BASE_URL}/api/edit_uzonia_data?${p}`, { method: 'PUT' });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail); }
      setIsEditModalOpen(false); setTargetRow(null); mutate();
      showToast('Uzonia record updated!', 'success');
    } catch(err: any) { showToast(err.message || 'Failed to update.', 'error'); }
    finally { setIsSaving(false); }
  };

  const handleDelete = async () => {
    if (!targetRow) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/delete_single_uzonia?uzonia_date=${targetRow.uzonia_date}`, { method: 'DELETE' });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail); }
      setIsDeleteModalOpen(false); setTargetRow(null); mutate();
      showToast('Uzonia record deleted!', 'success');
    } catch(err: any) { showToast(err.message || 'Failed to delete.', 'error'); }
    finally { setIsDeleting(false); }
  };

  // ── Styles ────────────────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', fontSize: '13px',
    background: '#f8fafc', color: '#0f172a', border: '1px solid #e2e8f0',
    borderRadius: '9px', outline: 'none', boxSizing: 'border-box',
  };
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

  // ── Rate field for modals ─────────────────────────────────────────────────
  const RateField = ({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) => (
    <div>
      <label style={labelStyle}>{label} <span style={{ color: '#dc2626' }}>*</span></label>
      <div style={{ position: 'relative' }}>
        <input type="number" step="0.0001" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder || '0.0000'}
          style={{ ...inputStyle, fontFamily: 'monospace', paddingRight: '28px' }} />
        <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: '#94a3b8', pointerEvents: 'none' }}>%</span>
      </div>
    </div>
  );

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
      <main style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', padding: '22px 24px', background: '#f8fafc', boxSizing: 'border-box' }}>
        <div style={{ width: '100%', maxWidth: '1600px' }}>

          {/* ── Stats cards ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: '12px', marginBottom: '16px' }}>
            {[
              { label: 'Total Records',  value: String(stats.total),   color: '#0a3b5c', bg: '#e2e8f0', icon: 'database'     },
              { label: 'First Date',     value: stats.firstDate,        color: '#065f46', bg: '#d1fae5', icon: 'first_page'   },
              { label: 'Latest Date',    value: stats.latestDate,       color: '#1e40af', bg: '#dbeafe', icon: 'event'        },
              { label: 'Average Uzonia', value: stats.avgUzonia,        color: '#92400e', bg: '#fef3c7', icon: 'show_chart'   },
              { label: 'Minimum Uzonia', value: stats.minUzonia,        color: '#065f46', bg: '#d1fae5', icon: 'trending_down'},
              { label: 'Maximum Uzonia', value: stats.maxUzonia,        color: '#991b1b', bg: '#fee2e2', icon: 'trending_up'  },
            ].map(s => (
              <div key={s.label} style={{ background: 'white', padding: '13px 14px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '34px', height: '34px', background: s.bg, borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '17px', color: s.color }}>{s.icon}</span>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '2px', lineHeight: 1.2 }}>{s.label}</div>
                  <div style={{ fontSize: s.label === 'Total Records' ? '22px' : '13px', fontWeight: '700', color: s.color, lineHeight: 1.1, fontFamily: 'monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Filter bar ── */}
          <div style={{ background: 'white', padding: '11px 14px', borderRadius: '12px', marginBottom: '14px', boxShadow: '0 2px 8px rgba(0,40,70,0.05)', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>

              {/* DATE */}
              <SmartDateInput value={fDate} onChange={setFDate} placeholder="Date" flex="140px" />

              {/* FILE ID */}
              <ColSearch value={fFileId} onChange={setFFileId} placeholder="File ID" icon="search" flex="110px" />

              {/* RATE — numeric only */}
              <NumSearch value={fRate} onChange={setFRate} placeholder="Rate" icon="percent" flex="100px" />

              {/* UZONIA — numeric only */}
              <NumSearch value={fUzonia} onChange={setFUzonia} placeholder="Uzonia" icon="percent" flex="100px" />

              {/* 7-DAY — numeric only */}
              <NumSearch value={fDay7} onChange={setFDay7} placeholder="7-Day" icon="date_range" flex="100px" />

              {/* 30-DAY — numeric only */}
              <NumSearch value={fDay30} onChange={setFDay30} placeholder="30-Day" icon="date_range" flex="100px" />

              {/* 90-DAY — numeric only */}
              <NumSearch value={fDay90} onChange={setFDay90} placeholder="90-Day" icon="date_range" flex="100px" />

              {/* 180-DAY — numeric only */}
              <NumSearch value={fDay180} onChange={setFDay180} placeholder="180-Day" icon="date_range" flex="100px" />

              {/* INDEX — numeric only */}
              <NumSearch value={fIndex} onChange={setFIndex} placeholder="Index" icon="functions" flex="100px" />

              {/* CREATED AT */}
              <ColSearch value={fCreated} onChange={setFCreated} placeholder="Created" icon="schedule" flex="140px" />

              {/* Clear */}
              {hasActiveFilters && (
                <button onClick={handleClearFilters} style={{ padding: '7px 10px', fontSize: '12px', fontWeight: '500', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>close</span>Clear
                </button>
              )}

              {/* Add Record */}
              <button onClick={openAddModal} style={{ marginLeft: 'auto', flexShrink: 0, padding: '8px 14px', fontSize: '13px', fontWeight: '600', background: '#10b981', color: 'white', border: 'none', borderRadius: '9px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', boxShadow: '0 3px 10px rgba(16,185,129,0.3)', transition: 'all 0.15s' }}
                onMouseEnter={e=>{e.currentTarget.style.background='#059669'; e.currentTarget.style.transform='translateY(-1px)';}}
                onMouseLeave={e=>{e.currentTarget.style.background='#10b981'; e.currentTarget.style.transform='translateY(0)';}}>
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>add_circle</span>
                Add
              </button>
            </div>

            {hasActiveFilters && (
              <div style={{ marginTop: '7px', fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap', padding: '4px 8px', background: '#f1f5f9', borderRadius: '7px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '12px', color: '#0a3b5c' }}>filter_alt</span>
                {fDate    && <span style={{ background: 'white', padding: '1px 5px', borderRadius: '4px', fontFamily: 'monospace' }}>Date:<strong>{fDate}</strong></span>}
                {fFileId  && <span style={{ background: 'white', padding: '1px 5px', borderRadius: '4px' }}>FileID:<strong>{fFileId}</strong></span>}
                {fRate    && <span style={{ background: 'white', padding: '1px 5px', borderRadius: '4px', fontFamily: 'monospace' }}>Rate:<strong>{fRate}</strong></span>}
                {fUzonia  && <span style={{ background: 'white', padding: '1px 5px', borderRadius: '4px', fontFamily: 'monospace' }}>Uzonia:<strong>{fUzonia}</strong></span>}
                {fDay7    && <span style={{ background: 'white', padding: '1px 5px', borderRadius: '4px', fontFamily: 'monospace' }}>7d:<strong>{fDay7}</strong></span>}
                {fDay30   && <span style={{ background: 'white', padding: '1px 5px', borderRadius: '4px', fontFamily: 'monospace' }}>30d:<strong>{fDay30}</strong></span>}
                {fDay90   && <span style={{ background: 'white', padding: '1px 5px', borderRadius: '4px', fontFamily: 'monospace' }}>90d:<strong>{fDay90}</strong></span>}
                {fDay180  && <span style={{ background: 'white', padding: '1px 5px', borderRadius: '4px', fontFamily: 'monospace' }}>180d:<strong>{fDay180}</strong></span>}
                {fIndex   && <span style={{ background: 'white', padding: '1px 5px', borderRadius: '4px', fontFamily: 'monospace' }}>Index:<strong>{fIndex}</strong></span>}
                {fCreated && <span style={{ background: 'white', padding: '1px 5px', borderRadius: '4px' }}>Created:<strong>{fCreated}</strong></span>}
                <span style={{ marginLeft: 'auto' }}>{filteredData.length} result{filteredData.length!==1?'s':''}</span>
              </div>
            )}
          </div>

          {/* ── Table ── */}
          <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,40,70,0.06)', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
            {isLoading ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '36px', marginBottom: '12px', display: 'block', color: '#0a3b5c', animation: 'spin 2s linear infinite' }}>refresh</span>
                Loading Uzonia data…
              </div>
            ) : error ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#ef4444' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '36px', marginBottom: '12px', display: 'block' }}>error</span>
                Failed to load data.
              </div>
            ) : paginatedData.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '44px', marginBottom: '12px', display: 'block', color: '#94a3b8' }}>bar_chart</span>
                {hasActiveFilters ? 'No records match your filters.' : 'No Uzonia records found.'}
                {hasActiveFilters && <button onClick={handleClearFilters} style={{ display: 'block', margin: '12px auto 0', padding: '7px 16px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#475569', cursor: 'pointer', fontSize: '12px' }}>Clear filters</button>}
              </div>
            ) : (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #0a3b5c' }}>
                        {[
                          { label: '#',          w: '1px'  },
                          { label: 'DATE',       w: '10px' },
                          { label: 'FILE ID',    w: '80px' },
                          { label: 'RATE',       w: '80px' },
                          { label: 'UZONIA',     w: '80px' },
                          { label: '7-DAY',      w: '80px' },
                          { label: '30-DAY',     w: '80px' },
                          { label: '90-DAY',     w: '80px' },
                          { label: '180-DAY',    w: '80px' },
                          { label: 'INDEX',      w: '80px' },
                          { label: 'CREATED AT', w: '120px' },
                          { label: 'ACTIONS',    w: '100px' },
                        ].map(col => (
                          <th key={col.label} style={{ padding: '10px 11px', textAlign: 'center', width: col.w, fontWeight: '600', color: '#0a3b5c', fontSize: '11px', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{col.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedData.map((item: UzoniaRow, index: number) => {
                        const idx = (currentPage-1)*itemsPerPage + index + 1;
                        return (
                          <tr key={item.uzonia_date}
                            style={{ borderBottom: '1px solid #f1f5f9', background: index%2===0?'white':'#fafbfc', transition: 'background 0.1s' }}
                            onMouseEnter={e=>{e.currentTarget.style.background='#f0f7ff';}}
                            onMouseLeave={e=>{e.currentTarget.style.background=index%2===0?'white':'#fafbfc';}}
                          >
                            <td style={{ padding: '9px 11px', color: '#cbd5e1', fontSize: '12px', fontWeight: '600' }}>{idx}</td>
                            <td style={{ padding: '9px 11px' }}>
                              <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: '700', color: '#0a3b5c', background: '#eef2ff', padding: '3px 7px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '3px', border: '1px solid #e0e7ff', whiteSpace: 'nowrap' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>event</span>
                                {formatDate(item.uzonia_date)}
                              </span>
                            </td>
                            <td style={{ padding: '9px 11px', maxWidth: '126px' }}>
                              <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#64748b', background: '#f8fafc', padding: '2px 5px', borderRadius: '4px', border: '1px solid #e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }} title={item.file_id}>{item.file_id}</span>
                            </td>
                            <td style={{ padding: '9px 11px' }}><RateBadge value={item.rate}            bg="#fdf4ff" color="#6d28d9" /></td>
                            <td style={{ padding: '9px 11px' }}><RateBadge value={item.uzonia}         bg="#eff6ff" color="#1d4ed8" /></td>
                            <td style={{ padding: '9px 11px' }}><RateBadge value={item.day_7_uzonia}   bg="#f0fdf4" color="#15803d" /></td>
                            <td style={{ padding: '9px 11px' }}><RateBadge value={item.day_30_uzonia}  bg="#fefce8" color="#a16207" /></td>
                            <td style={{ padding: '9px 11px' }}><RateBadge value={item.day_90_uzonia}  bg="#fdf4ff" color="#7e22ce" /></td>
                            <td style={{ padding: '9px 11px' }}><RateBadge value={item.day_180_uzonia} bg="#fff7ed" color="#c2410c" /></td>
                            <td style={{ padding: '9px 11px' }}>
                              <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: '600', color: '#374151', whiteSpace: 'nowrap' }}>{fmtIndex(item.index)}</span>
                            </td>
                            <td style={{ padding: '9px 11px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '11px', color: '#0a3b5c', flexShrink: 0 }}>schedule</span>
                                <span style={{ fontSize: '11px', color: item.created_at?'#374151':'#cbd5e1', fontFamily: item.created_at?'monospace':'inherit', fontWeight: item.created_at?'500':'400', whiteSpace: 'nowrap' }}>
                                  {formatDateTime(item.created_at)}
                                </span>
                              </div>
                            </td>
                            <td style={{ padding: '9px 11px' }}>
                              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                <button onClick={() => openEditModal(item)} style={{ padding: '4px 8px', fontSize: '11px', fontWeight: '500', background: '#f1f5f9', color: '#0a3b5c', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px', transition: 'all 0.13s', whiteSpace: 'nowrap' }}
                                  onMouseEnter={e=>{e.currentTarget.style.background='#0a3b5c'; e.currentTarget.style.color='white'; e.currentTarget.style.borderColor='#0a3b5c';}}
                                  onMouseLeave={e=>{e.currentTarget.style.background='#f1f5f9'; e.currentTarget.style.color='#0a3b5c'; e.currentTarget.style.borderColor='#cbd5e1';}}>
                                  <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>edit</span>Edit
                                </button>
                                <button onClick={() => openDeleteModal(item)} style={{ padding: '4px 8px', fontSize: '11px', fontWeight: '500', background: '#fff5f5', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px', transition: 'all 0.13s', whiteSpace: 'nowrap' }}
                                  onMouseEnter={e=>{e.currentTarget.style.background='#dc2626'; e.currentTarget.style.color='white'; e.currentTarget.style.borderColor='#dc2626';}}
                                  onMouseLeave={e=>{e.currentTarget.style.background='#fff5f5'; e.currentTarget.style.color='#dc2626'; e.currentTarget.style.borderColor='#fecaca';}}>
                                  <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>delete</span>Delete
                                </button>
                              </div>
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
                  style={{ width: '32px', height: '32px', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
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

      {/* ═══ ADD MODAL ═══ */}
      {isAddModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setIsAddModalOpen(false)}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '28px', width: '560px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.3)', border: '1px solid #e2e8f0' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#0a3b5c', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#10b981' }}>add_circle</span>
                Add Uzonia Record
              </h2>
              <button onClick={() => setIsAddModalOpen(false)} style={{ border: 'none', background: '#f1f5f9', cursor: 'pointer', color: '#64748b', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '13px', marginBottom: '20px' }}>
              <div>
                <label style={labelStyle}>Uzonia Date <span style={{ color: '#dc2626' }}>*</span></label>
                <div style={{ position: 'relative' }}>
                  <span className="material-symbols-outlined" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '16px', pointerEvents: 'none', zIndex: 2 }}>event</span>
                  <input type="date" value={addForm.uzonia_date} onChange={e => setAddForm(f => ({ ...f, uzonia_date: e.target.value }))}
                    style={{ ...inputStyle, paddingLeft: '32px', fontFamily: 'monospace', colorScheme: 'light' }} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>File ID <span style={{ color: '#dc2626' }}>*</span></label>
                <input type="text" value={addForm.file_id} onChange={e => setAddForm(f => ({ ...f, file_id: e.target.value }))}
                  placeholder="e.g. uzonia_2026_03_21" style={{ ...inputStyle, fontFamily: 'monospace' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <RateField label="Rate"                 value={addForm.rate}           onChange={v => setAddForm(f => ({ ...f, rate: v }))}           placeholder="13.5000" />
                <RateField label="Uzonia (Overnight)"  value={addForm.uzonia}         onChange={v => setAddForm(f => ({ ...f, uzonia: v }))}         placeholder="12.4800" />
                <RateField label="7-Day Uzonia"        value={addForm.day_7_uzonia}   onChange={v => setAddForm(f => ({ ...f, day_7_uzonia: v }))}   placeholder="12.6100" />
                <RateField label="30-Day Uzonia"       value={addForm.day_30_uzonia}  onChange={v => setAddForm(f => ({ ...f, day_30_uzonia: v }))}  placeholder="12.8500" />
                <RateField label="90-Day Uzonia"       value={addForm.day_90_uzonia}  onChange={v => setAddForm(f => ({ ...f, day_90_uzonia: v }))}  placeholder="13.1200" />
                <RateField label="180-Day Uzonia"      value={addForm.day_180_uzonia} onChange={v => setAddForm(f => ({ ...f, day_180_uzonia: v }))} placeholder="13.4500" />
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Index <span style={{ color: '#dc2626' }}>*</span></label>
                  <input type="number" step="0.0001" value={addForm.index} onChange={e => setAddForm(f => ({ ...f, index: e.target.value }))}
                    placeholder="1.0000" style={{ ...inputStyle, fontFamily: 'monospace' }} />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '9px', justifyContent: 'flex-end' }}>
              <button onClick={() => setIsAddModalOpen(false)} style={{ padding: '9px 18px', fontSize: '13px', fontWeight: '500', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '9px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleAdd} disabled={isSaving} style={{ padding: '9px 18px', fontSize: '13px', fontWeight: '600', background: isSaving?'#94a3b8':'#10b981', color: 'white', border: 'none', borderRadius: '9px', cursor: isSaving?'not-allowed':'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '15px', animation: isSaving?'spin 1.5s linear infinite':'none' }}>{isSaving?'hourglass_empty':'check'}</span>
                {isSaving ? 'Adding…' : 'Add Record'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ EDIT MODAL ═══ */}
      {isEditModalOpen && targetRow && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setIsEditModalOpen(false)}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '28px', width: '560px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.3)', border: '1px solid #e2e8f0' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#0a3b5c', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>edit</span>
                Edit Uzonia Record
              </h2>
              <button onClick={() => setIsEditModalOpen(false)} style={{ border: 'none', background: '#f1f5f9', cursor: 'pointer', color: '#64748b', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '13px', marginBottom: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ ...labelStyle, color: '#94a3b8' }}>Uzonia Date (read-only)</label>
                  <input type="text" value={formatDate(targetRow.uzonia_date)} disabled style={{ ...inputStyle, background: '#f1f5f9', color: '#64748b', fontFamily: 'monospace' }} />
                </div>
                <div>
                  <label style={{ ...labelStyle, color: '#94a3b8' }}>File ID (read-only)</label>
                  <input type="text" value={targetRow.file_id} disabled style={{ ...inputStyle, background: '#f1f5f9', color: '#64748b', fontFamily: 'monospace', fontSize: '12px' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <RateField label="Rate"                 value={editForm.rate}           onChange={v => setEditForm(f => ({ ...f, rate: v }))}           placeholder="13.5000" />
                <RateField label="Uzonia (Overnight)"  value={editForm.uzonia}         onChange={v => setEditForm(f => ({ ...f, uzonia: v }))}         placeholder="12.4800" />
                <RateField label="7-Day Uzonia"        value={editForm.day_7_uzonia}   onChange={v => setEditForm(f => ({ ...f, day_7_uzonia: v }))}   placeholder="12.6100" />
                <RateField label="30-Day Uzonia"       value={editForm.day_30_uzonia}  onChange={v => setEditForm(f => ({ ...f, day_30_uzonia: v }))}  placeholder="12.8500" />
                <RateField label="90-Day Uzonia"       value={editForm.day_90_uzonia}  onChange={v => setEditForm(f => ({ ...f, day_90_uzonia: v }))}  placeholder="13.1200" />
                <RateField label="180-Day Uzonia"      value={editForm.day_180_uzonia} onChange={v => setEditForm(f => ({ ...f, day_180_uzonia: v }))} placeholder="13.4500" />
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Index <span style={{ color: '#dc2626' }}>*</span></label>
                  <input type="number" step="0.0001" value={editForm.index} onChange={e => setEditForm(f => ({ ...f, index: e.target.value }))}
                    placeholder="1.0000" style={{ ...inputStyle, fontFamily: 'monospace' }} />
                </div>
              </div>
              <div>
                <label style={{ ...labelStyle, color: '#94a3b8' }}>Created At</label>
                <input type="text" value={formatDateTime(targetRow.created_at)} disabled style={{ ...inputStyle, background: '#f8fafc', color: '#94a3b8', fontSize: '12px', fontFamily: 'monospace' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '9px', justifyContent: 'flex-end' }}>
              <button onClick={() => setIsEditModalOpen(false)} style={{ padding: '9px 18px', fontSize: '13px', fontWeight: '500', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '9px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleEdit} disabled={isSaving} style={{ padding: '9px 18px', fontSize: '13px', fontWeight: '600', background: isSaving?'#94a3b8':'#0a3b5c', color: 'white', border: 'none', borderRadius: '9px', cursor: isSaving?'not-allowed':'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '15px', animation: isSaving?'spin 1.5s linear infinite':'none' }}>{isSaving?'hourglass_empty':'save'}</span>
                {isSaving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ DELETE MODAL ═══ */}
      {isDeleteModalOpen && targetRow && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setIsDeleteModalOpen(false)}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '28px', width: '460px', maxWidth: '95vw', boxShadow: '0 24px 64px rgba(0,0,0,0.3)', border: '1px solid #e2e8f0' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#0a3b5c', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#dc2626' }}>warning</span>
                Delete Uzonia Record
              </h2>
              <button onClick={() => setIsDeleteModalOpen(false)} style={{ border: 'none', background: '#f1f5f9', cursor: 'pointer', color: '#64748b', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>×</button>
            </div>
            <div style={{ marginBottom: '20px', padding: '14px 16px', background: '#fef2f2', borderRadius: '10px', border: '1px solid #fee2e2' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                <span className="material-symbols-outlined" style={{ color: '#dc2626', fontSize: '15px' }}>info</span>
                <strong style={{ color: '#0f172a', fontSize: '13px' }}>Are you sure you want to delete this record?</strong>
              </div>
              <div style={{ paddingLeft: '20px', fontSize: '12px', color: '#4b5563', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: '2.2' }}>
                <div>Date: <strong style={{ fontFamily: 'monospace', color: '#dc2626' }}>{formatDate(targetRow.uzonia_date)}</strong></div>
                <div>File ID: <strong style={{ fontFamily: 'monospace' }}>{targetRow.file_id}</strong></div>
                <div>Rate: <strong style={{ fontFamily: 'monospace' }}>{fmtRate(targetRow.rate)}</strong></div>
                <div>Uzonia: <strong style={{ fontFamily: 'monospace' }}>{fmtRate(targetRow.uzonia)}</strong></div>
                <div>Index: <strong style={{ fontFamily: 'monospace' }}>{fmtIndex(targetRow.index)}</strong></div>
                <div>Created: <strong style={{ fontFamily: 'monospace' }}>{formatDateTime(targetRow.created_at)}</strong></div>
              </div>
              <p style={{ margin: '8px 0 0 20px', fontSize: '11px', color: '#dc2626' }}>⚠️ This action cannot be undone.</p>
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
        input[type="date"]::-webkit-calendar-picker-indicator{cursor:pointer;opacity:0.7;filter:invert(28%) sepia(49%) saturate(700%) hue-rotate(180deg);}
        input[type="date"]::-webkit-calendar-picker-indicator:hover{opacity:1;}
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button{opacity:0.4;}
        nav::-webkit-scrollbar{height:0;}
      `}</style>
    </div>
  );
};

export default UzoniaDataPage;