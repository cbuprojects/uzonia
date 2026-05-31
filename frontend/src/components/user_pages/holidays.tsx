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

const API_BASE_URL = 'http://localhost:8000';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) { const e = await res.json(); throw new Error(e.detail || 'Failed to fetch'); }
  return res.json();
};

const NAV_PAGES = [
  { label: 'Calculations', icon: 'calculate',       path: '/' },
  { label: 'Uploads',      icon: 'upload_file',     path: '/uploads'      },
  { label: 'Repo',         icon: 'account_balance', path: '/repo'         },
  { label: 'Depo',         icon: 'savings',         path: '/depo'         },
  { label: 'Data',         icon: 'database',        path: '/data'         },
  { label: 'Holidays',     icon: 'calendar_month',  path: '/holidays'     },
];

interface Holiday {
  holiday_date: string;
  description:  string;
  created_at:   string | null;
  updated_at:   string | null;
}

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

const getDayName = (s: string): string => {
  if (!s) return '';
  const d = new Date(s);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { weekday: 'long' });
};

const isUpcoming = (s: string): boolean => {
  const d = new Date(s), today = new Date();
  today.setHours(0,0,0,0);
  return d >= today;
};

const isRecent = (s: string | null): boolean => {
  if (!s) return false;
  const d = new Date(s);
  if (isNaN(d.getTime())) return false;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  return d >= cutoff;
};

// ─── SmartDateInput ───────────────────────────────────────────────────────────
// FIX: the calendar icon was invisible inside modals because the native <input type="date">
// was covering it. We now use a completely transparent overlay technique: the hidden date
// input sits at 0 opacity but covers only the calendar icon area via pointer-events.
interface SmartDateInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  flex?: string;
}

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
    <div style={{ position: 'relative', flex: flex || '1 1 140px', minWidth: '120px' }}>
      {/* Left calendar icon — decorative */}
      <span className="material-symbols-outlined" style={{
        position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)',
        color: '#94a3b8', fontSize: '15px', pointerEvents: 'none', zIndex: 3,
      }}>event</span>

      {/* Visible text input */}
      <input
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || 'DD-MM-YYYY'}
        maxLength={10}
        style={{
          width: '100%',
          // Right padding makes room for the calendar_today icon
          padding: '9px 32px 9px 28px',
          fontSize: '12px',
          background: '#f8fafc',
          color: '#0f172a',
          border: '1px solid #e2e8f0',
          borderRadius: '9px',
          outline: 'none',
          boxSizing: 'border-box',
          fontFamily: 'monospace',
          letterSpacing: '0.3px',
        }}
      />

      {/* Right calendar_today icon — visible, clickable */}
      <span
        className="material-symbols-outlined"
        onClick={() => hiddenRef.current?.showPicker?.()}
        style={{
          position: 'absolute',
          right: '8px',
          top: '50%',
          transform: 'translateY(-50%)',
          color: '#64748b',
          fontSize: '16px',
          cursor: 'pointer',
          zIndex: 4,
          userSelect: 'none',
          // Slight background so it's always visible regardless of container bg
          background: 'transparent',
          lineHeight: 1,
        }}
      >calendar_today</span>

      {/* Hidden native date picker — zero size, zero opacity, sits behind the icon */}
      <input
        ref={hiddenRef}
        type="date"
        value={isoValue}
        onChange={handleHidden}
        tabIndex={-1}
        style={{
          position: 'absolute',
          right: '8px',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '20px',
          height: '20px',
          opacity: 0,
          zIndex: 2,
          pointerEvents: 'none',  // icon handles the click; showPicker() opens it
          border: 'none',
          padding: 0,
        }}
      />
    </div>
  );
};

const HolidaysPage = () => {
  const navigate    = useNavigate();
  const currentPath = '/holidays';

  const { data, error, isLoading, mutate } = useSWR(
    `${API_BASE_URL}/api/get_all_holidays`, fetcher, { revalidateOnFocus: false }
  );

  const [searchDate,        setSearchDate]        = useState('');
  const [searchDescription, setSearchDescription] = useState('');
  const [searchCreatedAt,   setSearchCreatedAt]   = useState('');
  const [searchUpdatedAt,   setSearchUpdatedAt]   = useState('');
  const [filterUpcoming,    setFilterUpcoming]    = useState<'all'|'upcoming'|'past'>('all');
  const [currentPage,       setCurrentPage]       = useState(1);
  const itemsPerPage = 10;

  const [isAddModalOpen,    setIsAddModalOpen]    = useState(false);
  const [isEditModalOpen,   setIsEditModalOpen]   = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [targetHoliday,     setTargetHoliday]     = useState<Holiday|null>(null);
  const [isSaving,          setIsSaving]          = useState(false);
  const [isDeleting,        setIsDeleting]        = useState(false);

  const [addForm,  setAddForm]  = useState({ new_holiday: '', new_description: '' });
  const [editForm, setEditForm] = useState({ description: '' });

  const [toast, setToast] = useState<{ text: string; type: 'success'|'error' }|null>(null);
  const showToast = (text: string, type: 'success'|'error') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const a = document.createElement('link');
    a.href = 'https://fonts.googleapis.com/icon?family=Material+Symbols+Outlined'; a.rel = 'stylesheet';
    document.head.appendChild(a);
    const b = document.createElement('link');
    b.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'; b.rel = 'stylesheet';
    document.head.appendChild(b);
    return () => { try{document.head.removeChild(a);}catch{} try{document.head.removeChild(b);}catch{} };
  }, []);

  const holidays: Holiday[] = useMemo(() => Array.isArray(data?.Data) ? data.Data : [], [data]);

  const filteredData = useMemo(() => {
    let f = [...holidays];
    if (searchDate.trim())        f = f.filter(h => formatDate(h.holiday_date).includes(searchDate.trim()));
    if (searchDescription.trim()) f = f.filter(h => h.description.toLowerCase().includes(searchDescription.trim().toLowerCase()));
    if (searchCreatedAt.trim())   f = f.filter(h => formatDateTime(h.created_at).toLowerCase().includes(searchCreatedAt.trim().toLowerCase()));
    if (searchUpdatedAt.trim())   f = f.filter(h => formatDateTime(h.updated_at).toLowerCase().includes(searchUpdatedAt.trim().toLowerCase()));
    if (filterUpcoming === 'upcoming') f = f.filter(h => isUpcoming(h.holiday_date));
    if (filterUpcoming === 'past')     f = f.filter(h => !isUpcoming(h.holiday_date));
    return f;
  }, [holidays, searchDate, searchDescription, searchCreatedAt, searchUpdatedAt, filterUpcoming]);

  const stats = useMemo(() => {
    const up = holidays.filter(h => isUpcoming(h.holiday_date)).length;
    return {
      total:          holidays.length,
      upcoming:       up,
      past:           holidays.length - up,
      recentCreated:  holidays.filter(h => isRecent(h.created_at)).length,
      recentUpdated:  holidays.filter(h => isRecent(h.updated_at)).length,
    };
  }, [holidays]);

  const hasActiveFilters = searchDate || searchDescription || searchCreatedAt || searchUpdatedAt || filterUpcoming !== 'all';
  const totalPages    = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = useMemo(
    () => filteredData.slice((currentPage-1)*itemsPerPage, currentPage*itemsPerPage),
    [filteredData, currentPage]
  );
  useEffect(() => { setCurrentPage(1); }, [searchDate, searchDescription, searchCreatedAt, searchUpdatedAt, filterUpcoming]);

  const handleClearFilters = useCallback(() => {
    setSearchDate(''); setSearchDescription('');
    setSearchCreatedAt(''); setSearchUpdatedAt('');
    setFilterUpcoming('all');
  }, []);

  const openAddModal    = () => { setAddForm({ new_holiday: '', new_description: '' }); setIsAddModalOpen(true); };
  const openEditModal   = (h: Holiday) => { setTargetHoliday(h); setEditForm({ description: h.description }); setIsEditModalOpen(true); };
  const openDeleteModal = (h: Holiday) => { setTargetHoliday(h); setIsDeleteModalOpen(true); };

  const handleAddHoliday = async () => {
    const { new_holiday, new_description } = addForm;
    if (!new_holiday || !new_description.trim()) { showToast('Date and description are required.', 'error'); return; }
    setIsSaving(true);
    try {
      const p = new URLSearchParams({ new_holiday, new_description });
      const res = await fetch(`${API_BASE_URL}/api/add_new_holiday?${p}`, { method: 'POST' });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail); }
      setIsAddModalOpen(false); setAddForm({ new_holiday: '', new_description: '' }); mutate();
      showToast('Holiday added successfully!', 'success');
    } catch(err: any) { showToast(err.message || 'Failed to add holiday.', 'error'); }
    finally { setIsSaving(false); }
  };

  const handleEditHoliday = async () => {
    if (!targetHoliday) return;
    if (!editForm.description.trim()) { showToast('Description is required.', 'error'); return; }
    setIsSaving(true);
    try {
      const p = new URLSearchParams({ description: editForm.description, old_holiday_date: targetHoliday.holiday_date });
      const res = await fetch(`${API_BASE_URL}/api/edit_holiday?${p}`, { method: 'PUT' });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail); }
      setIsEditModalOpen(false); setTargetHoliday(null); mutate();
      showToast('Holiday updated successfully!', 'success');
    } catch(err: any) { showToast(err.message || 'Failed to update holiday.', 'error'); }
    finally { setIsSaving(false); }
  };

  const handleDeleteHoliday = async () => {
    if (!targetHoliday) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/delete_holiday?holiday_date=${targetHoliday.holiday_date}`, { method: 'DELETE' });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail); }
      setIsDeleteModalOpen(false); setTargetHoliday(null); mutate();
      showToast('Holiday deleted successfully!', 'success');
    } catch(err: any) { showToast(err.message || 'Failed to delete holiday.', 'error'); }
    finally { setIsDeleting(false); }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', fontSize: '13px',
    background: '#f8fafc', color: '#0f172a', border: '1px solid #e2e8f0',
    borderRadius: '9px', outline: 'none', boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', marginBottom: '5px', fontWeight: '500', color: '#374151', fontSize: '13px',
  };

  const NavBtn = ({ page }: { page: typeof NAV_PAGES[0] }) => {
    const active = page.path === currentPath;
    return (
      <button
        onClick={() => navigate(page.path)}
        style={{
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

  const TsCell = ({ value, icon, color }: { value: string|null; icon: string; color: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      <span className="material-symbols-outlined" style={{ fontSize: '11px', color, flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: '11px', color: value ? '#374151' : '#cbd5e1', fontFamily: value ? 'monospace' : 'inherit', fontWeight: value ? '500' : '400', whiteSpace: 'nowrap' }}>
        {formatDateTime(value)}
      </span>
    </div>
  );

  // ─── Footer column data ───────────────────────────────────────────────────
  const footerColumns = [
    {
      heading: 'Modules',
      items: NAV_PAGES.map(p => ({
        label: p.label,
        icon: p.icon,
        onClick: () => navigate(p.path),
        active: p.path === currentPath,
        external: false,
        href: '',
      })),
    },
    {
      heading: 'About CBU',
      items: [
        { label: 'About the Bank',     href: 'https://cbu.uz/en/about/',                     icon: 'info',          external: true },
        { label: 'Board of Directors', href: 'https://cbu.uz/en/about/management/',          icon: 'groups',        external: true },
        { label: 'Legislation',        href: 'https://cbu.uz/en/documents/',                 icon: 'gavel',         external: true },
        { label: 'Publications',       href: 'https://cbu.uz/en/statistics/publications/',   icon: 'description',   external: true },
        { label: 'Open Data / Stats',  href: 'https://cbu.uz/en/statistics/',                icon: 'bar_chart',     external: true },
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
        { label: '+998 71 212-62-05', href: 'tel:+998712126205',                                        icon: 'call',        external: false },
        { label: '+998 71 200-00-44', href: 'tel:+998712000044',                                        icon: 'call',        external: false },
        { label: '+998 71 233-35-09',  href: 'fax:+998712333509',                                       icon: 'fax',         external: false },
        { label: 'info@cbu.uz',       href: 'mailto:info@cbu.uz',                                       icon: 'mail',        external: false },
        { label: 'Islam Karimov St. 6', href: 'https://maps.app.goo.gl/4qDXnjgQoTwfWCg28',    icon: 'location_on', external: true },
      ],
    },
  ];

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
          background: toast.type === 'success' ? '#065f46' : '#991b1b',
          color: 'white', padding: '13px 18px', borderRadius: '12px',
          display: 'flex', alignItems: 'center', gap: '10px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)', fontSize: '14px', fontWeight: '500',
          animation: 'slideIn 0.3s ease',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '19px' }}>
            {toast.type === 'success' ? 'check_circle' : 'error'}
          </span>
          {toast.text}
        </div>
      )}

      {/* ═══ HEADER ═══ */}
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
        <div onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0, cursor: 'pointer', marginRight: '28px' }}>
          <div style={{ width: '44px', height: '44px', background: 'white', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.12)', padding: '5px', flexShrink: 0 }}>
            <img src={CbuLogo} alt="CBU Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: 'white', lineHeight: '1.6', }}>The Central Bank of Uzbekistan</div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', lineHeight: '1.3' }}>Monetary Department</div>
          </div>
        </div>
        <div style={{ width: '1px', height: '32px', background: 'rgba(255,255,255,0.15)', marginRight: '16px', flexShrink: 0 }} />
        <nav style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, overflowX: 'auto' }}>
          {NAV_PAGES.map(p => <NavBtn key={p.path} page={p} />)}
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginLeft: '16px', flexShrink: 0 }}>
          {[
            { icon: 'arrow_back',     label: 'Back',  onClick: () => window.history.back() },
            { icon: 'account_circle', label: 'Login', onClick: () => {} },
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
      <main style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', padding: '22px 24px', background: '#f8fafc', boxSizing: 'border-box', alignItems: 'center' }}>
        <div style={{ width: '100%', maxWidth: '1600px', margin: '0 auto' }}>

          {/* Stats — 5 cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '12px', marginBottom: '16px' }}>
            {[
              { label: 'Total Holidays',    value: stats.total,         color: '#0a3b5c', bg: '#e2e8f0', icon: 'calendar_month' },
              { label: 'Upcoming',          value: stats.upcoming,      color: '#065f46', bg: '#d1fae5', icon: 'event_upcoming'  },
              { label: 'Past Holidays',     value: stats.past,          color: '#1e40af', bg: '#dbeafe', icon: 'history'         },
              { label: 'Created (30 days)', value: stats.recentCreated, color: '#92400e', bg: '#fef3c7', icon: 'add_circle'      },
              { label: 'Updated (30 days)', value: stats.recentUpdated, color: '#6b21a8', bg: '#f3e8ff', icon: 'update'          },
            ].map(s => (
              <div key={s.label} style={{ background: 'white', padding: '13px 15px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '11px' }}>
                <div style={{ width: '36px', height: '36px', background: s.bg, borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: s.color }}>{s.icon}</span>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '2px', lineHeight: 1.2 }}>{s.label}</div>
                  <div style={{ fontSize: '22px', fontWeight: '700', color: s.color, lineHeight: 1 }}>{s.value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Filter bar — all 4 inputs + controls in ONE row */}
          <div style={{ background: 'white', padding: '12px 16px', borderRadius: '12px', marginBottom: '14px', boxShadow: '0 2px 8px rgba(0,40,70,0.05)', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap', alignItems: 'center' }}>
              <SmartDateInput value={searchDate} onChange={setSearchDate} placeholder="Holiday date" flex="1 1 130px" />
              <div style={{ position: 'relative', flex: '2 1 160px', minWidth: '130px' }}>
                <span className="material-symbols-outlined" style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '15px' }}>search</span>
                <input type="text" value={searchDescription} onChange={e => setSearchDescription(e.target.value)} placeholder="Search description…" style={{ ...inputStyle, paddingLeft: '28px', fontSize: '12px' }} />
              </div>
              <div style={{ position: 'relative', flex: '1 1 140px', minWidth: '120px' }}>
                <span className="material-symbols-outlined" style={{ position: 'absolute', left: '7px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '14px' }}>schedule</span>
                <input type="text" value={searchCreatedAt} onChange={e => setSearchCreatedAt(e.target.value)} placeholder="Created date…" style={{ ...inputStyle, paddingLeft: '26px', fontSize: '12px' }} />
              </div>
              <div style={{ position: 'relative', flex: '1 1 140px', minWidth: '120px' }}>
                <span className="material-symbols-outlined" style={{ position: 'absolute', left: '7px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '14px' }}>update</span>
                <input type="text" value={searchUpdatedAt} onChange={e => setSearchUpdatedAt(e.target.value)} placeholder="Updated date…" style={{ ...inputStyle, paddingLeft: '26px', fontSize: '12px' }} />
              </div>
              <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                {(['all','upcoming','past'] as const).map(opt => (
                  <button key={opt} onClick={() => setFilterUpcoming(opt)} style={{
                    padding: '8px 11px', fontSize: '12px', fontWeight: '500',
                    background: filterUpcoming===opt ? '#0a3b5c' : '#f1f5f9',
                    color: filterUpcoming===opt ? 'white' : '#475569',
                    border: filterUpcoming===opt ? '1px solid #0a3b5c' : '1px solid #e2e8f0',
                    borderRadius: '9px', cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
                  }}>
                    {opt==='all' ? 'All' : opt==='upcoming' ? '⬆ Upcoming' : '⬇ Past'}
                  </button>
                ))}
              </div>
              {hasActiveFilters && (
                <button onClick={handleClearFilters} style={{ padding: '8px 10px', fontSize: '12px', fontWeight: '500', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '9px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>close</span>Clear
                </button>
              )}
              <button onClick={openAddModal} style={{ marginLeft: 'auto', flexShrink: 0, padding: '8px 14px', fontSize: '13px', fontWeight: '600', background: '#10b981', color: 'white', border: 'none', borderRadius: '9px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', boxShadow: '0 3px 10px rgba(16,185,129,0.3)', transition: 'all 0.15s' }}
                onMouseEnter={e=>{e.currentTarget.style.background='#059669'; e.currentTarget.style.transform='translateY(-1px)';}}
                onMouseLeave={e=>{e.currentTarget.style.background='#10b981'; e.currentTarget.style.transform='translateY(0)';}}>
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>add_circle</span>
                Add Holiday
              </button>
            </div>
            {hasActiveFilters && (
              <div style={{ marginTop: '8px', fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap', padding: '5px 9px', background: '#f1f5f9', borderRadius: '7px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '12px', color: '#0a3b5c' }}>filter_alt</span>
                {searchDate        && <span style={{ background: 'white', padding: '1px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>Date: <strong>{searchDate}</strong></span>}
                {searchDescription && <span style={{ background: 'white', padding: '1px 6px', borderRadius: '4px' }}>Desc: <strong>{searchDescription}</strong></span>}
                {searchCreatedAt   && <span style={{ background: 'white', padding: '1px 6px', borderRadius: '4px' }}>Created: <strong>{searchCreatedAt}</strong></span>}
                {searchUpdatedAt   && <span style={{ background: 'white', padding: '1px 6px', borderRadius: '4px' }}>Updated: <strong>{searchUpdatedAt}</strong></span>}
                {filterUpcoming !== 'all' && <span style={{ background: 'white', padding: '1px 6px', borderRadius: '4px', textTransform: 'capitalize' }}><strong>{filterUpcoming}</strong></span>}
                <span style={{ marginLeft: 'auto' }}>{filteredData.length} result{filteredData.length!==1?'s':''}</span>
              </div>
            )}
          </div>

          {/* Table */}
          <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,40,70,0.06)', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
            {isLoading ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '36px', marginBottom: '12px', display: 'block', color: '#0a3b5c', animation: 'spin 2s linear infinite' }}>refresh</span>
                Loading holidays…
              </div>
            ) : error ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#ef4444' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '36px', marginBottom: '12px', display: 'block' }}>error</span>
                Failed to load data.
              </div>
            ) : paginatedData.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '44px', marginBottom: '12px', display: 'block', color: '#94a3b8' }}>event_busy</span>
                {hasActiveFilters ? 'No holidays match your filters.' : 'No holidays found. Click "Add Holiday" to get started.'}
                {hasActiveFilters && <button onClick={handleClearFilters} style={{ display: 'block', margin: '12px auto 0', padding: '7px 16px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#475569', cursor: 'pointer', fontSize: '12px' }}>Clear filters</button>}
              </div>
            ) : (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #0a3b5c' }}>
                        {[
                          { label: '#',           w: '50px'  },
                          { label: 'DATE',        w: '140px' },
                          { label: 'DAY',         w: '110px' },
                          { label: 'DESCRIPTION', w: 'auto'  },
                          { label: 'STATUS',      w: '160px' },
                          { label: 'CREATED AT',  w: '200px' },
                          { label: 'UPDATED AT',  w: '200px' },
                          { label: 'ACTIONS',     w: '160px' },
                        ].map(col => (
                          <th key={col.label} style={{ padding: '11px 14px', textAlign: 'center', width: col.w, fontWeight: '600', color: '#0a3b5c', fontSize: '12px', letterSpacing: '0.6px', whiteSpace: 'nowrap' }}>{col.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedData.map((item: Holiday, index: number) => {
                        const idx = (currentPage-1)*itemsPerPage + index + 1;
                        const up  = isUpcoming(item.holiday_date);
                        return (
                          <tr key={item.holiday_date}
                            style={{ borderBottom: '1px solid #f1f5f9', background: index%2===0?'white':'#fafbfc', transition: 'background 0.1s' }}
                            onMouseEnter={e=>{e.currentTarget.style.background='#f0f7ff';}}
                            onMouseLeave={e=>{e.currentTarget.style.background=index%2===0?'white':'#fafbfc';}}
                          >
                            <td style={{ padding: '10px 14px', color: '#cbd5e1', fontSize: '12px', fontWeight: '600' }}>{idx}</td>
                            <td style={{ padding: '10px 14px' }}>
                              <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: '700', color: '#0a3b5c', background: '#eef2ff', padding: '3px 8px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px', border: '1px solid #e0e7ff', whiteSpace: 'nowrap' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>event</span>
                                {formatDate(item.holiday_date)}
                              </span>
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              <span style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '500', background: '#f5f3ff', color: '#6d28d9', border: '1px solid #ede9fe', whiteSpace: 'nowrap' }}>{getDayName(item.holiday_date)}</span>
                            </td>
                            <td style={{ padding: '10px 14px', maxWidth: '280px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '13px', color: '#e9b741', flexShrink: 0 }}>celebration</span>
                                <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.description}</span>
                              </div>
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              {up ? (
                                <span style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', background: '#f0fdf4', color: '#15803d', display: 'inline-flex', alignItems: 'center', gap: '3px', border: '1px solid #bbf7d0', whiteSpace: 'nowrap' }}>
                                  <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>upcoming</span>Upcoming
                                </span>
                              ) : (
                                <span style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', background: '#f8fafc', color: '#94a3b8', display: 'inline-flex', alignItems: 'center', gap: '3px', border: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                                  <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>history</span>Past
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '10px 14px' }}><TsCell value={item.created_at} icon="schedule" color="#0a3b5c" /></td>
                            <td style={{ padding: '10px 14px' }}><TsCell value={item.updated_at} icon="update"   color="#065f46" /></td>
                            <td style={{ padding: '10px 14px' }}>
                              <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                                <button onClick={() => openEditModal(item)} style={{ padding: '4px 9px', fontSize: '11px', fontWeight: '500', background: '#f1f5f9', color: '#0a3b5c', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px', transition: 'all 0.13s', whiteSpace: 'nowrap' }}
                                  onMouseEnter={e=>{e.currentTarget.style.background='#0a3b5c'; e.currentTarget.style.color='white'; e.currentTarget.style.borderColor='#0a3b5c';}}
                                  onMouseLeave={e=>{e.currentTarget.style.background='#f1f5f9'; e.currentTarget.style.color='#0a3b5c'; e.currentTarget.style.borderColor='#cbd5e1';}}>
                                  <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>edit</span>Edit
                                </button>
                                <button onClick={() => openDeleteModal(item)} style={{ padding: '4px 9px', fontSize: '11px', fontWeight: '500', background: '#fff5f5', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px', transition: 'all 0.13s', whiteSpace: 'nowrap' }}
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

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* FOOTER — brand left, then 4 columns side-by-side, headings on top */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <footer style={{
        width: '100%',
        background: '#0a2a40',
        borderTop: '3px solid #e9b741',
        boxSizing: 'border-box',
      }}>
        <div style={{
          width: '100%', maxWidth: '1600px', margin: '0 auto',
          padding: '40px 32px 28px',
          display: 'grid',
          /* brand col wider, then 4 equal link columns */
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

          {/* ── 4 link columns — each with its heading then list ── */}
          {footerColumns.map(col => (
            <div key={col.heading}>
              {/* Column heading */}
              <div style={{
                color: 'white', fontSize: '14px', fontWeight: '600',
                letterSpacing: '0.8px',
                marginBottom: '16px',
                paddingBottom: '10px',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
              }}>
                {col.heading}
              </div>
              {/* Links */}
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {col.items.map((item: any, i: number) => (
                  <li key={i} style={{ marginBottom: '9px', marginLeft: '55px' }}>
                    {item.onClick ? (
                      /* Internal nav button */
                      <button onClick={item.onClick} style={{
                        background: 'none', border: 'none', padding: 0,
                        display: 'flex', alignItems: 'center', gap: '7px',
                        fontSize: '14px', marginBottom: '14px',
                        color: item.active ? '#e9b741' : '#8097a8',
                        fontWeight: item.active ? '600' : '400',
                        cursor: 'pointer', transition: 'color 0.15s', textAlign: 'center',
                      }}
                      onMouseEnter={e=>{e.currentTarget.style.color='white';}}
                      onMouseLeave={e=>{e.currentTarget.style.color=item.active?'#e9b741':'#8097a8';}}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '14px', flexShrink: 0 }}>{item.icon}</span>
                        {item.label}
                      </button>
                    ) : (
                      /* External / contact link */
                      <a href={item.href} target={item.external ? '_blank' : undefined} rel="noopener noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px', color: '#8097a8', textDecoration: 'none', transition: 'color 0.15s' }}
                        onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.color='white';}}
                        onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.color='#8097a8';}}
                      >
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
                { label: 'Privacy Policy', href: 'https://cbu.uz/en/mobile-privacy/' },
                { label: 'Terms of Use',   href: 'https://cbu.uz/en/services/request-information/'                },
                { label: 'Accessibility',  href: 'https://cbu.uz/en/'                },
              ].map(l => (
                <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer"
                  style={{ color: '#4a5c6a', textDecoration: 'none', transition: 'color 0.15s' }}
                  onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.color='white';}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.color='#4a5c6a';}}
                >{l.label}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* ═══ ADD MODAL — only date + description ═══ */}
      {isAddModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setIsAddModalOpen(false)}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '30px', width: '420px', maxWidth: '95vw', boxShadow: '0 24px 64px rgba(0,0,0,0.3)', border: '1px solid #e2e8f0' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
              <h2 style={{ margin: 0, fontSize: '19px', fontWeight: '600', color: '#0a3b5c', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '21px', color: '#10b981' }}>add_circle</span>
                Add New Holiday
              </h2>
              <button onClick={() => setIsAddModalOpen(false)} style={{ border: 'none', background: '#f1f5f9', cursor: 'pointer', color: '#64748b', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>×</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '22px' }}>
              {/* Date — uses a native date picker WITH a visible calendar icon overlay */}
              <div>
                <label style={labelStyle}>Holiday Date <span style={{ color: '#dc2626' }}>*</span></label>
                {/*
                  We wrap the native <input type="date"> in a relative div and place a
                  visible calendar icon on top. The input itself fills the full width so
                  its own (often invisible) icon is replaced by ours.
                */}
                <div style={{ position: 'relative' }}>
                  <span className="material-symbols-outlined" style={{
                    position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
                    color: '#94a3b8', fontSize: '16px', pointerEvents: 'none', zIndex: 2,
                  }}>event</span>
                  <input
                    type="date"
                    value={addForm.new_holiday}
                    onChange={e => setAddForm(f => ({ ...f, new_holiday: e.target.value }))}
                    style={{
                      ...inputStyle,
                      paddingLeft: '32px',
                      // paddingRight leaves space so the browser's native picker icon
                      // doesn't overlap our content — but we also style it away below
                      paddingRight: '36px',
                      fontFamily: 'monospace',
                      // Make the native calendar icon visible with a consistent color
                      colorScheme: 'light',
                    }}
                  />
                  {/* Custom calendar icon on the right — more prominent than the browser default */}
                  <span
                    className="material-symbols-outlined"
                    onClick={() => {
                      const el = document.querySelector('input[type="date"]') as HTMLInputElement;
                      el?.showPicker?.();
                    }}
                    style={{
                      position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                      color: '#0a3b5c', fontSize: '17px', cursor: 'pointer', zIndex: 3,
                      pointerEvents: 'none', // let the native input handle the click
                    }}
                  >calendar_month</span>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Description <span style={{ color: '#dc2626' }}>*</span></label>
                <input
                  type="text"
                  value={addForm.new_description}
                  onChange={e => setAddForm(f => ({ ...f, new_description: e.target.value }))}
                  placeholder="e.g. Independence Day of Uzbekistan"
                  style={inputStyle}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddHoliday(); }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '9px', justifyContent: 'flex-end' }}>
              <button onClick={() => setIsAddModalOpen(false)} style={{ padding: '9px 18px', fontSize: '13px', fontWeight: '500', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '9px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleAddHoliday} disabled={isSaving} style={{ padding: '9px 18px', fontSize: '13px', fontWeight: '600', background: isSaving?'#94a3b8':'#10b981', color: 'white', border: 'none', borderRadius: '9px', cursor: isSaving?'not-allowed':'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '15px', animation: isSaving?'spin 1.5s linear infinite':'none' }}>{isSaving?'hourglass_empty':'check'}</span>
                {isSaving ? 'Adding…' : 'Add Holiday'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ EDIT MODAL ═══ */}
      {isEditModalOpen && targetHoliday && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setIsEditModalOpen(false)}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '30px', width: '480px', maxWidth: '95vw', boxShadow: '0 24px 64px rgba(0,0,0,0.3)', border: '1px solid #e2e8f0' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
              <h2 style={{ margin: 0, fontSize: '19px', fontWeight: '600', color: '#0a3b5c', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '21px' }}>edit_calendar</span>Edit Holiday
              </h2>
              <button onClick={() => setIsEditModalOpen(false)} style={{ border: 'none', background: '#f1f5f9', cursor: 'pointer', color: '#64748b', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '13px', marginBottom: '22px' }}>
              <div>
                <label style={labelStyle}>Holiday Date</label>
                <input type="text" value={formatDate(targetHoliday.holiday_date)} disabled style={{ ...inputStyle, background: '#f1f5f9', color: '#64748b', fontFamily: 'monospace' }} />
              </div>
              <div>
                <label style={labelStyle}>Day of Week</label>
                <input type="text" value={getDayName(targetHoliday.holiday_date)} disabled style={{ ...inputStyle, background: '#f1f5f9', color: '#64748b' }} />
              </div>
              <div>
                <label style={labelStyle}>Description <span style={{ color: '#dc2626' }}>*</span></label>
                <input type="text" value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Independence Day of Uzbekistan" style={inputStyle} onKeyDown={e => { if (e.key === 'Enter') handleEditHoliday(); }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ ...labelStyle, color: '#94a3b8' }}>Created At</label>
                  <input type="text" value={formatDateTime(targetHoliday.created_at)} disabled style={{ ...inputStyle, background: '#f8fafc', color: '#94a3b8', fontSize: '12px', fontFamily: 'monospace' }} />
                </div>
                <div>
                  <label style={{ ...labelStyle, color: '#94a3b8' }}>Last Updated</label>
                  <input type="text" value={formatDateTime(targetHoliday.updated_at)} disabled style={{ ...inputStyle, background: '#f8fafc', color: '#94a3b8', fontSize: '12px', fontFamily: 'monospace' }} />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '9px', justifyContent: 'flex-end' }}>
              <button onClick={() => setIsEditModalOpen(false)} style={{ padding: '9px 18px', fontSize: '13px', fontWeight: '500', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '9px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleEditHoliday} disabled={isSaving} style={{ padding: '9px 18px', fontSize: '13px', fontWeight: '600', background: isSaving?'#94a3b8':'#0a3b5c', color: 'white', border: 'none', borderRadius: '9px', cursor: isSaving?'not-allowed':'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '15px', animation: isSaving?'spin 1.5s linear infinite':'none' }}>{isSaving?'hourglass_empty':'save'}</span>
                {isSaving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ DELETE MODAL ═══ */}
      {isDeleteModalOpen && targetHoliday && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setIsDeleteModalOpen(false)}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '30px', width: '450px', maxWidth: '95vw', boxShadow: '0 24px 64px rgba(0,0,0,0.3)', border: '1px solid #e2e8f0' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
              <h2 style={{ margin: 0, fontSize: '19px', fontWeight: '600', color: '#0a3b5c', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '21px', color: '#dc2626'}}>warning</span>Delete Holiday
              </h2>
              <button onClick={() => setIsDeleteModalOpen(false)} style={{ border: 'none', background: '#f1f5f9', cursor: 'pointer', color: '#64748b', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>×</button>
            </div>
            <div style={{ alignItems: 'flex-start', flexDirection: 'column', marginBottom: '22px', padding: '14px 16px', background: '#fef2f2', borderRadius: '10px', border: '1px solid #fee2e2'}}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                <span className="material-symbols-outlined" style={{ color: '#dc2626', fontSize: '15px' }}>info</span>
                <strong style={{ color: '#0f172a', fontSize: '13px' }}>Are you sure you want to delete this holiday?</strong>
              </div>
              <div style={{ paddingLeft: '20px', fontSize: '12px', color: '#4b5563', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: '2' }}>
                <div>Date: <strong style={{ fontFamily: 'monospace', color: '#dc2626' }}>{formatDate(targetHoliday.holiday_date)}</strong></div>
                <div>Day: <strong>{getDayName(targetHoliday.holiday_date)}</strong></div>
                <div>Description: <strong>{targetHoliday.description}</strong></div>
                <div>Created: <strong style={{ fontFamily: 'monospace' }}>{formatDateTime(targetHoliday.created_at)}</strong></div>
              </div>
              <p style={{ margin: '8px 0 0 20px', fontSize: '11px', color: '#dc2626' }}>⚠️ This action cannot be undone.</p>
            </div>
            <div style={{ display: 'flex', gap: '9px', justifyContent: 'flex-end' }}>
              <button onClick={() => setIsDeleteModalOpen(false)} style={{ padding: '9px 18px', fontSize: '13px', fontWeight: '500', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '9px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleDeleteHoliday} disabled={isDeleting} style={{ padding: '9px 18px', fontSize: '13px', fontWeight: '600', background: isDeleting?'#94a3b8':'#dc2626', color: 'white', border: 'none', borderRadius: '9px', cursor: isDeleting?'not-allowed':'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '15px', animation: isDeleting?'spin 1.5s linear infinite':'none' }}>{isDeleting?'hourglass_empty':'delete_forever'}</span>
                {isDeleting ? 'Deleting…' : 'Delete Holiday'}
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
        /* Make the native date picker icon visible and on-brand */
        input[type="date"]::-webkit-calendar-picker-indicator{
          cursor:pointer;
          opacity:0.7;
          filter: invert(28%) sepia(49%) saturate(700%) hue-rotate(180deg);
        }
        input[type="date"]::-webkit-calendar-picker-indicator:hover{opacity:1;}
        nav::-webkit-scrollbar{height:0;}
      `}</style>
    </div>
  );
};

export default HolidaysPage;