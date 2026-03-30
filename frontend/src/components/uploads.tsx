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
  status:      'progress' | 'success' | 'finished' | 'failed';
  file_date:   string;
  created_at:  string | null;
  finished_at: string | null;
}

interface HolidayItem {
  holiday_date: string;
  description:  string;
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

/** Returns YYYY-MM-DD in local time (avoids UTC offset issues) */
const toLocalISODate = (d: Date): string => {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

// ─── Status badge config ──────────────────────────────────────────────────────

const STATUS_CFG = {
  finished: { bg: '#d1fae5', color: '#065f46', icon: 'check_circle',    label: 'Finished',     spin: false },
  success:  { bg: '#d1fae5', color: '#065f46', icon: 'check_circle',    label: 'Finished',     spin: false },
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

// ─── Mini Calendar Picker ─────────────────────────────────────────────────────

interface MiniCalendarProps {
  value: string;           // YYYY-MM-DD
  onChange: (v: string) => void;
  holidaySet: Set<string>; // YYYY-MM-DD strings
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_LABELS  = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

const MiniCalendar: React.FC<MiniCalendarProps> = ({ value, onChange, holidaySet }) => {
  const today = new Date();
  const todayStr = toLocalISODate(today);

  const [viewYear,  setViewYear]  = useState(() => value ? parseInt(value.slice(0,4)) : today.getFullYear());
  const [viewMonth, setViewMonth] = useState(() => value ? parseInt(value.slice(5,7)) - 1 : today.getMonth());

  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y-1); } else setViewMonth(m => m-1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y+1); } else setViewMonth(m => m+1); };

  // Build calendar grid: weeks × 7 days, Mon-first
  const cells = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    // Mon=0 … Sun=6
    let dow = firstDay.getDay(); // 0=Sun
    dow = dow === 0 ? 6 : dow - 1; // convert to Mon-first
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const grid: (number | null)[] = Array(dow).fill(null);
    for (let d = 1; d <= daysInMonth; d++) grid.push(d);
    while (grid.length % 7 !== 0) grid.push(null);
    return grid;
  }, [viewYear, viewMonth]);

  const isDisabled = (day: number): boolean => {
    const d = new Date(viewYear, viewMonth, day);
    const dow = d.getDay(); // 0=Sun,6=Sat
    if (dow === 0 || dow === 6) return true;
    const iso = toLocalISODate(d);
    if (holidaySet.has(iso)) return true;
    return false;
  };

  const isSelected = (day: number) => {
    const iso = `${viewYear}-${String(viewMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    return iso === value;
  };

  const isToday = (day: number) => {
    const iso = `${viewYear}-${String(viewMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    return iso === todayStr;
  };

  const isHoliday = (day: number): boolean => {
    const iso = `${viewYear}-${String(viewMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    return holidaySet.has(iso);
  };

  const handleClick = (day: number) => {
    if (isDisabled(day)) return;
    const iso = `${viewYear}-${String(viewMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    onChange(iso);
  };

  return (
    <div style={{ userSelect: 'none' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <button onClick={prevMonth} style={{ background: '#f1f5f9', border: 'none', borderRadius: '7px', width: '28px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0a3b5c' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>chevron_left</span>
        </button>
        <span style={{ fontWeight: '700', fontSize: '14px', color: '#0a3b5c' }}>
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>
        <button onClick={nextMonth} style={{ background: '#f1f5f9', border: 'none', borderRadius: '7px', width: '28px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0a3b5c' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>chevron_right</span>
        </button>
      </div>

      {/* Day labels */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '2px', marginBottom: '4px' }}>
        {DAY_LABELS.map(l => (
          <div key={l} style={{ textAlign: 'center', fontSize: '10px', fontWeight: '600', color: l === 'Sat' || l === 'Sun' ? '#ef4444' : '#64748b', padding: '3px 0' }}>{l}</div>
        ))}
      </div>

      {/* Cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '2px' }}>
        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />;
          const disabled  = isDisabled(day);
          const selected  = isSelected(day);
          const todayCell = isToday(day);
          const holiday   = isHoliday(day);
          const weekend   = (() => { const d = new Date(viewYear, viewMonth, day); return d.getDay()===0||d.getDay()===6; })();

          let bg    = 'transparent';
          let color = '#1e293b';
          let border = '1px solid transparent';
          let cursor = 'pointer';
          let opacity = '1';

          if (selected) { bg = '#0a3b5c'; color = 'white'; border = '1px solid #0a3b5c'; }
          else if (todayCell && !disabled) { border = '2px solid #e9b741'; color = '#0a3b5c'; bg = '#fffbeb'; }
          else if (disabled) { color = '#cbd5e1'; cursor = 'not-allowed'; opacity = '0.5'; }
          if ((weekend || holiday) && !selected) { color = disabled ? '#fca5a5' : '#ef4444'; }

          return (
            <div key={day}
              onClick={() => handleClick(day)}
              title={holiday ? 'Holiday — not selectable' : weekend ? 'Weekend — not selectable' : undefined}
              style={{
                textAlign: 'center', padding: '6px 2px', fontSize: '12px', fontWeight: selected ? '700' : '500',
                borderRadius: '7px', background: bg, color, border, cursor, opacity,
                transition: 'all 0.1s', position: 'relative',
              }}
              onMouseEnter={e => { if (!disabled && !selected) (e.currentTarget as HTMLElement).style.background = '#e2e8f0'; }}
              onMouseLeave={e => { if (!disabled && !selected) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              {day}
              {holiday && !weekend && (
                <span style={{ position: 'absolute', bottom: '1px', left: '50%', transform: 'translateX(-50%)', width: '4px', height: '4px', borderRadius: '50%', background: '#ef4444', display: 'block' }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '12px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #f1f5f9', flexWrap: 'wrap' }}>
        {[
          { color: '#ef4444', label: 'Weekend / Holiday' },
          { color: '#e9b741', label: "Today", border: '2px solid #e9b741', bg: '#fffbeb' },
          { color: 'white',   label: 'Selected', bg: '#0a3b5c' },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', color: '#64748b' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: l.bg || 'transparent', border: l.border || `2px solid ${l.color}`, flexShrink: 0 }} />
            {l.label}
          </div>
        ))}
      </div>
    </div>
  );
};

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
  const itemsPerPage = 10; // ← changed from 15 to 10

  // ── Delete modal ──────────────────────────────────────────────────────────
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [targetUpload,      setTargetUpload]      = useState<UzoniaUpload|null>(null);
  const [isDeleting,        setIsDeleting]        = useState(false);

  // ── Add New Upload modal ──────────────────────────────────────────────────
  const [isAddModalOpen,  setIsAddModalOpen]  = useState(false);
  const [isSubmitting,    setIsSubmitting]    = useState(false);

  /** compute today's date string, skip weekends */
  const getDefaultDate = (holidays: Set<string>): string => {
    const d = new Date();
    while (true) {
      const dow = d.getDay();
      const iso = toLocalISODate(d);
      if (dow !== 0 && dow !== 6 && !holidays.has(iso)) return iso;
      d.setDate(d.getDate() - 1);
    }
  };

  const [selectedDate, setSelectedDate] = useState<string>('');

  // ── Post-upload download prompt ───────────────────────────────────────────
  const [downloadPrompt, setDownloadPrompt] = useState<{ fileId: string; fileDate: string } | null>(null);

  // ── Toast ─────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState<{ text: string; type: 'success'|'error'|'info' }|null>(null);
  const showToast = (text: string, type: 'success'|'error'|'info' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
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

  const holidays: HolidayItem[] = useMemo(
    () => Array.isArray(data?.Holidays) ? data.Holidays : [],
    [data]
  );

  const holidaySet: Set<string> = useMemo(() => {
    const s = new Set<string>();
    holidays.forEach(h => {
      // holiday_date may be "YYYY-MM-DD" or a Date string — normalise
      const raw = String(h.holiday_date);
      const d   = new Date(raw);
      if (!isNaN(d.getTime())) s.add(toLocalISODate(d));
      else if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) s.add(raw);
    });
    return s;
  }, [holidays]);

  // Set default date once holidays are loaded
  useEffect(() => {
    if (!selectedDate && (holidaySet.size > 0 || data)) {
      setSelectedDate(getDefaultDate(holidaySet));
    }
  }, [holidaySet, data]);

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
    finished: uploads.filter(u => u.status === 'finished' || u.status === 'success').length,
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
  const handleDownload = (fileId: string) => {
    const url = `${API_BASE_URL}/api/download_uzonia_data_file?file_id=${encodeURIComponent(fileId)}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileId}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const openDeleteModal = (u: UzoniaUpload) => { setTargetUpload(u); setIsDeleteModalOpen(true); };

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

  // ── Add New Upload ────────────────────────────────────────────────────────
  const openAddModal = () => {
    setSelectedDate(getDefaultDate(holidaySet));
    setIsAddModalOpen(true);
  };

  const handleAddUpload = async () => {
    if (!selectedDate) { showToast('Please select a valid date.', 'error'); return; }

    // Double-check client-side
    const d   = new Date(selectedDate + 'T00:00:00');
    const dow = d.getDay();
    if (dow === 0 || dow === 6) { showToast('Cannot select a weekend date.', 'error'); return; }
    if (holidaySet.has(selectedDate)) { showToast('Cannot select a holiday date.', 'error'); return; }

    setIsSubmitting(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/add_new_uzonia_upload?till_date=${encodeURIComponent(selectedDate)}`,
        { method: 'POST' }
      );
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || 'Upload failed'); }
      const result = await res.json();

      setIsAddModalOpen(false);
      await mutate(); // refresh table

      // Show download prompt
      setDownloadPrompt({ fileId: result.file_id, fileDate: selectedDate });
      showToast(`Upload created successfully! File ID: ${result.file_id}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to create upload.', 'error');
    } finally {
      setIsSubmitting(false);
    }
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
          background: toast.type==='success' ? '#065f46' : toast.type==='info' ? '#1e40af' : '#991b1b',
          color: 'white', padding: '13px 18px', borderRadius: '12px',
          display: 'flex', alignItems: 'center', gap: '10px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)', fontSize: '14px', fontWeight: '500',
          animation: 'slideIn 0.3s ease', maxWidth: '420px',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '19px', flexShrink: 0 }}>
            {toast.type==='success' ? 'check_circle' : toast.type==='info' ? 'info' : 'error'}
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
      <main style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', padding: '22px 24px', background: '#f8fafc', boxSizing: 'border-box', alignItems: 'center' }}>
        <div style={{ width: '100%', maxWidth: '1600px' }}>

          {/* ── Top bar: Stats + Add button ── */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
            {/* Stats — 4 cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', flex: 1 }}>
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

            {/* ── + Add New Upload button ── */}
            <button
              onClick={openAddModal}
              style={{
                height: '68px',
                padding: '0 22px',
                background: 'linear-gradient(135deg, #0a3b5c 0%, #1a5c8a 100%)',
                color: 'white',
                border: '2px solid rgba(233,183,65,0.5)',
                borderRadius: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                fontWeight: '600',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                boxShadow: '0 4px 14px rgba(10,59,92,0.25)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'linear-gradient(135deg, #e9b741 0%, #d4a030 100%)';
                e.currentTarget.style.color = '#0a3b5c';
                e.currentTarget.style.borderColor = '#e9b741';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(233,183,65,0.4)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'linear-gradient(135deg, #0a3b5c 0%, #1a5c8a 100%)';
                e.currentTarget.style.color = 'white';
                e.currentTarget.style.borderColor = 'rgba(233,183,65,0.5)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 14px rgba(10,59,92,0.25)';
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>add_circle</span>
              Add New Upload
            </button>
          </div>

          {/* ── Filter bar ── */}
          <div style={{ background: 'white', padding: '11px 14px', borderRadius: '12px', marginBottom: '14px', boxShadow: '0 2px 8px rgba(0,40,70,0.05)', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
              <ColSearch value={fFileId}     onChange={setFFileId}     placeholder="File ID…"      icon="search"     flex="2 1 100px" />
              <ColSearch value={fFilePath}   onChange={setFFilePath}   placeholder="File name…"    icon="folder"     flex="2 1 100px" />
              <ColSearch value={fStatus}     onChange={setFStatus}     placeholder="Status…"       icon="tune"       flex="1 1 180px"  />
              <ColSearch value={fFileDate}   onChange={setFFileDate}   placeholder="File date…"    icon="event"      flex="1 1 180px" />
              <ColSearch value={fCreatedAt}  onChange={setFCreatedAt}  placeholder="Created at…"   icon="add_circle" flex="1 1 180px" />
              <ColSearch value={fFinishedAt} onChange={setFFinishedAt} placeholder="Finished at…"  icon="schedule"   flex="1 1 180px" />
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
                          { label: '#',           w: '40px'  },
                          { label: 'FILE ID',     w: '150px'  },
                          { label: 'FILE NAME',   w: '150px' },
                          { label: 'STATUS',      w: '150px' },
                          { label: 'FILE DATE',   w: '150px' },
                          { label: 'CREATED AT',  w: '160px' },
                          { label: 'FINISHED AT', w: '160px' },
                          { label: 'ACTIONS',     w: '180px' },
                        ].map(col => (
                          <th key={col.label} style={{
                            padding: '11px 14px', textAlign: 'center', width: col.w,
                            fontWeight: '600', color: '#0a3b5c', fontSize: '11px',
                            letterSpacing: '0.6px', whiteSpace: 'nowrap',
                          }}>{col.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedData.map((item: UzoniaUpload, index: number) => {
                        const idx      = (currentPage-1)*itemsPerPage + index + 1;
                        const badgeKey = (item.status === 'success' ? 'finished' : item.status) as keyof typeof STATUS_CFG;
                        const badge    = STATUS_CFG[badgeKey] ?? STATUS_CFG.failed;
                        const canDown  = item.status === 'finished' || item.status === 'success';
                        const filename = shortenPath(item.file_path);

                        return (
                          <tr key={item.file_id}
                            style={{ borderBottom: '1px solid #f1f5f9', background: index%2===0?'white':'#fafbfc', transition: 'background 0.1s' }}
                            onMouseEnter={e=>{e.currentTarget.style.background='#f0f7ff';}}
                            onMouseLeave={e=>{e.currentTarget.style.background=index%2===0?'white':'#fafbfc';}}
                          >
                            {/* # */}
                            <td style={{ padding: '10px 14px', color: '#cbd5e1', fontSize: '12px', fontWeight: '600', textAlign: 'center' }}>{idx}</td>

                            {/* File ID */}
                            <td style={{ padding: '10px 14px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: '700', color: '#0a3b5c', background: '#eef2ff', padding: '3px 8px', borderRadius: '6px', border: '1px solid #e0e7ff', whiteSpace: 'nowrap', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}
                                  title={item.file_id}>
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
                            <td style={{ padding: '10px 14px', textAlign: 'center' }}>
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
                            <td style={{ padding: '10px 14px', textAlign: 'center' }}>
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
                                  onClick={() => canDown && handleDownload(item.file_id)}
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

                {/* ── Pagination ── */}
                {filteredData.length > itemsPerPage && (
                  <div style={{ padding: '12px 18px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      Showing {(currentPage-1)*itemsPerPage+1}–{Math.min(currentPage*itemsPerPage, filteredData.length)} of {filteredData.length} uploads
                    </div>
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      {/* First */}
                      <button onClick={()=>setCurrentPage(1)} disabled={currentPage===1} title="First page"
                        style={{ padding: '5px 8px', fontSize: '12px', fontWeight: '500', background: currentPage===1?'#f1f5f9':'white', color: currentPage===1?'#94a3b8':'#0a3b5c', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: currentPage===1?'not-allowed':'pointer', display: 'flex', alignItems: 'center' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>first_page</span>
                      </button>
                      {/* Prev */}
                      <button onClick={()=>setCurrentPage(p=>p-1)} disabled={currentPage===1}
                        style={{ padding: '5px 10px', fontSize: '12px', fontWeight: '500', background: currentPage===1?'#f1f5f9':'white', color: currentPage===1?'#94a3b8':'#0a3b5c', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: currentPage===1?'not-allowed':'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>chevron_left</span>Prev
                      </button>
                      {/* Page numbers */}
                      {Array.from({length:totalPages},(_,i)=>i+1).map(page => {
                        const show = page===1||page===totalPages||(page>=currentPage-2&&page<=currentPage+2);
                        const ell  = page===currentPage-3||page===currentPage+3;
                        if (show) return (
                          <button key={page} onClick={()=>setCurrentPage(page)} style={{ width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '600', background: currentPage===page?'#0a3b5c':'white', color: currentPage===page?'white':'#0f172a', border: `1px solid ${currentPage===page?'#0a3b5c':'#e2e8f0'}`, borderRadius: '6px', cursor: 'pointer', transition: 'all 0.12s' }}
                            onMouseEnter={e=>{ if(currentPage!==page){e.currentTarget.style.background='#f0f7ff'; e.currentTarget.style.borderColor='#0a3b5c';} }}
                            onMouseLeave={e=>{ if(currentPage!==page){e.currentTarget.style.background='white'; e.currentTarget.style.borderColor='#e2e8f0';} }}
                          >{page}</button>
                        );
                        if (ell) return <span key={`e${page}`} style={{ width: '28px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>…</span>;
                        return null;
                      })}
                      {/* Next */}
                      <button onClick={()=>setCurrentPage(p=>p+1)} disabled={currentPage===totalPages}
                        style={{ padding: '5px 10px', fontSize: '12px', fontWeight: '500', background: currentPage===totalPages?'#f1f5f9':'white', color: currentPage===totalPages?'#94a3b8':'#0a3b5c', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: currentPage===totalPages?'not-allowed':'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}>
                        Next<span className="material-symbols-outlined" style={{ fontSize: '13px' }}>chevron_right</span>
                      </button>
                      {/* Last */}
                      <button onClick={()=>setCurrentPage(totalPages)} disabled={currentPage===totalPages} title="Last page"
                        style={{ padding: '5px 8px', fontSize: '12px', fontWeight: '500', background: currentPage===totalPages?'#f1f5f9':'white', color: currentPage===totalPages?'#94a3b8':'#0a3b5c', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: currentPage===totalPages?'not-allowed':'pointer', display: 'flex', alignItems: 'center' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>last_page</span>
                      </button>
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      Page {currentPage} of {totalPages}
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
        <div style={{
          width: '100%', maxWidth: '1600px', margin: '0 auto',
          padding: '40px 32px 28px',
          display: 'grid',
          gridTemplateColumns: '280px repeat(4, 1fr)',
          gap: '48px',
          alignItems: 'start',
        }}>
          {/* Brand */}
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
                <a key={s.alt} href={s.href} target="_blank" rel="noopener noreferrer"
                  style={{ width: '32px', height: '32px', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.16)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)'; }}
                >
                  <img src={s.src} alt={s.alt} style={{ width: `${s.width}px`, height: `${s.height}px`, objectFit: 'contain' }} />
                </a>
              ))}
            </div>
          </div>

          {footerColumns.map(col => (
            <div key={col.heading}>
              <div style={{ color: 'white', fontSize: '14px', fontWeight: '600', marginBottom: '16px', paddingBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {col.heading}
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {col.items.map((item: any, i: number) => (
                  <li key={i} style={{ marginBottom: '9px', marginLeft: '55px' }}>
                    {item.onClick ? (
                      <button onClick={item.onClick} style={{ background: 'none', border: 'none', padding: 0, display: 'flex', alignItems: 'center', gap: '7px', fontSize: '14px', marginBottom: '14px', color: item.active ? '#e9b741' : '#8097a8', fontWeight: item.active ? '600' : '400', cursor: 'pointer', transition: 'color 0.15s', textAlign: 'center' }}
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

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ADD NEW UPLOAD MODAL                                        */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {isAddModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => { if (!isSubmitting) setIsAddModalOpen(false); }}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '28px', width: '420px', maxWidth: '95vw', boxShadow: '0 24px 64px rgba(0,0,0,0.3)', border: '1px solid #e2e8f0' }}
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0a3b5c', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#e9b741' }}>add_circle</span>
                New Uzonia Upload
              </h2>
              <button onClick={() => { if (!isSubmitting) setIsAddModalOpen(false); }} style={{ border: 'none', background: '#f1f5f9', cursor: 'pointer', color: '#64748b', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>×</button>
            </div>

            {/* Selected date pill */}
            <div style={{ marginBottom: '14px', padding: '10px 14px', background: selectedDate ? '#eff6ff' : '#f8fafc', borderRadius: '10px', border: `1px solid ${selectedDate ? '#bfdbfe' : '#e2e8f0'}`, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#0a3b5c', flexShrink: 0 }}>event</span>
              <div>
                <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '1px' }}>Selected date (till_date)</div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: selectedDate ? '#0a3b5c' : '#94a3b8', fontFamily: 'monospace' }}>
                  {selectedDate || 'No date selected'}
                </div>
              </div>
              {selectedDate && (
                <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#16a34a', marginLeft: 'auto' }}>check_circle</span>
              )}
            </div>

            {/* Calendar */}
            <div style={{ padding: '14px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
              <MiniCalendar
                value={selectedDate}
                onChange={setSelectedDate}
                holidaySet={holidaySet}
              />
            </div>

            {/* Info note */}
            <div style={{ padding: '10px 12px', background: '#fffbeb', borderRadius: '8px', border: '1px solid #fde68a', fontSize: '11px', color: '#92400e', display: 'flex', gap: '7px', alignItems: 'flex-start', marginBottom: '18px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px', flexShrink: 0, marginTop: '1px' }}>info</span>
              <span>Weekends (Sat/Sun) and public holidays are not selectable. The upload will generate a <strong>.png</strong> chart and an <strong>.xlsx</strong> report, both downloadable as a <strong>.zip</strong> archive.</span>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '9px', justifyContent: 'flex-end' }}>
              <button onClick={() => { if (!isSubmitting) setIsAddModalOpen(false); }} style={{ padding: '9px 18px', fontSize: '13px', fontWeight: '500', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '9px', cursor: 'pointer' }}>
                Cancel
              </button>
              <button
                onClick={handleAddUpload}
                disabled={isSubmitting || !selectedDate}
                style={{
                  padding: '9px 20px', fontSize: '13px', fontWeight: '600',
                  background: isSubmitting || !selectedDate ? '#94a3b8' : 'linear-gradient(135deg, #0a3b5c, #1a5c8a)',
                  color: 'white', border: 'none', borderRadius: '9px',
                  cursor: isSubmitting || !selectedDate ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: '6px',
                  boxShadow: isSubmitting || !selectedDate ? 'none' : '0 4px 12px rgba(10,59,92,0.3)',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { if (!isSubmitting && selectedDate) { e.currentTarget.style.background = '#0a3b5c'; } }}
                onMouseLeave={e => { if (!isSubmitting && selectedDate) { e.currentTarget.style.background = 'linear-gradient(135deg, #0a3b5c, #1a5c8a)'; } }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '15px', animation: isSubmitting ? 'spin 1.5s linear infinite' : 'none' }}>
                  {isSubmitting ? 'hourglass_empty' : 'upload_file'}
                </span>
                {isSubmitting ? 'Creating…' : 'Create Upload'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* POST-UPLOAD DOWNLOAD PROMPT                                 */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {downloadPrompt && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}
          onClick={() => setDownloadPrompt(null)}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '30px', width: '460px', maxWidth: '95vw', boxShadow: '0 24px 64px rgba(0,0,0,0.3)', border: '1px solid #e2e8f0', textAlign: 'center' }}
            onClick={e => e.stopPropagation()}>

            {/* Success icon */}
            <div style={{ width: '64px', height: '64px', background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '32px', color: '#065f46' }}>check_circle</span>
            </div>

            <h2 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: '700', color: '#0a3b5c' }}>Upload Created Successfully!</h2>
            <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#64748b', lineHeight: '1.6' }}>
              Your Uzonia upload has been processed. The archive contains the <strong>PNG chart</strong> and <strong>Excel report</strong> for <span style={{ fontFamily: 'monospace', color: '#0a3b5c', fontWeight: '700' }}>{downloadPrompt.fileDate}</span>.
            </p>

            {/* File info card */}
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '14px 16px', border: '1px solid #e2e8f0', marginBottom: '20px', textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <div style={{ width: '36px', height: '36px', background: '#dbeafe', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#1e40af' }}>folder_zip</span>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Archive contents</div>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#0a3b5c', fontFamily: 'monospace' }}>{downloadPrompt.fileId}.zip</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[
                  { icon: 'image', label: `${downloadPrompt.fileId}.png`, color: '#7c3aed', bg: '#ede9fe' },
                  { icon: 'table_chart', label: `${downloadPrompt.fileId}.xlsx`, color: '#16a34a', bg: '#dcfce7' },
                ].map(f => (
                  <div key={f.icon} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px', background: f.bg, borderRadius: '8px', padding: '7px 10px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '14px', color: f.color, flexShrink: 0 }}>{f.icon}</span>
                    <span style={{ fontSize: '10px', fontFamily: 'monospace', color: f.color, fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setDownloadPrompt(null)}
                style={{ flex: 1, padding: '10px', fontSize: '13px', fontWeight: '500', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '10px', cursor: 'pointer' }}
              >
                Close
              </button>
              <button
                onClick={() => { handleDownload(downloadPrompt.fileId); setDownloadPrompt(null); }}
                style={{ flex: 2, padding: '10px 18px', fontSize: '13px', fontWeight: '700', background: 'linear-gradient(135deg, #065f46, #16a34a)', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', boxShadow: '0 4px 12px rgba(22,163,74,0.35)', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(22,163,74,0.45)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(22,163,74,0.35)'; }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>download</span>
                Download ZIP Archive
              </button>
            </div>
          </div>
        </div>
      )}

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
              <div style={{ paddingLeft: '20px', fontSize: '12px', color: '#4b5563', lineHeight: '2.1', textAlign: 'left' }}>
                <div>File ID: <strong style={{ fontFamily: 'monospace', color: '#dc2626' }}>{targetUpload.file_id}</strong></div>
                <div>File name: <strong style={{ fontFamily: 'monospace' }}>{shortenPath(targetUpload.file_path)}</strong></div>
                <div>Status: <strong>{STATUS_CFG[(targetUpload.status === 'success' ? 'finished' : targetUpload.status) as keyof typeof STATUS_CFG]?.label ?? targetUpload.status}</strong></div>
                <div>File date: <strong style={{ fontFamily: 'monospace' }}>{targetUpload.file_date || '—'}</strong></div>
                {targetUpload.finished_at && (
                  <div>Finished: <strong style={{ fontFamily: 'monospace' }}>{formatDateTime(targetUpload.finished_at)}</strong></div>
                )}
              </div>
              <p style={{ margin: '8px 0 0 20px', fontSize: '11px', color: '#b45309' }}>
                ⚠️ The file folder on disk will also be permanently removed.
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