import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import CbuLogo from '../../assets/CBU_Logo.png';
import facebook from '../../assets/facebook.png';
import telegram from '../../assets/telegram.png';
import linkedin from '../../assets/linkedin.png';
import twitter from '../../assets/twitter.png';
import instagram from "../../assets/instagram.png";
import youtube from "../../assets/youtube.png";

// ─────────────────────────────────────────────────────────────────────────────
// Config & Auth
// ─────────────────────────────────────────────────────────────────────────────

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const authHeader = () => `Bearer ${localStorage.getItem('session_id') ?? ''}`;

let isLoggingOut = false;
const doLogout = async () => {
  if (isLoggingOut) return;
  isLoggingOut = true;
  try {
    const sid = localStorage.getItem('session_id');
    if (sid) {
      await fetch(`${API_BASE_URL}/api/logout`, {
        method: 'POST',
        headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
      }).catch(() => {});
    }
  } finally {
    localStorage.removeItem('session_id');
    isLoggingOut = false;
    window.location.href = '/login';
  }
};

const apiFetch = async (url: string, options: RequestInit = {}) => {
  const res = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> ?? {}),
    },
  });
  if (res.status === 401 || res.status === 403) {
    localStorage.removeItem('session_id');
    sessionStorage.setItem('session_expired', '1');
    window.location.replace('/login');
    return new Promise<Response>(() => {});
  }
  return res;
};

// ─────────────────────────────────────────────────────────────────────────────
// Nav pages
// ─────────────────────────────────────────────────────────────────────────────

const NAV_PAGES = [
  { key: 'calculations', icon: 'calculate',       path: '/calculations' },
  { key: 'uploads',      icon: 'upload_file',     path: '/uploads'      },
  { key: 'repo',         icon: 'account_balance', path: '/repo'         },
  { key: 'depo',         icon: 'savings',         path: '/depo'         },
  { key: 'data',         icon: 'database',        path: '/data'         },
  { key: 'holidays',     icon: 'calendar_month',  path: '/holidays'     },
];

// ─────────────────────────────────────────────────────────────────────────────
// i18n
// ─────────────────────────────────────────────────────────────────────────────

const TRANSLATIONS = {
  en: {
    bankName:     'The Central Bank of Uzbekistan',
    deptSubtitle: 'Department of Monetary Operations',
    // nav
    calculations: 'Calculations', uploads: 'Uploads', repo: 'Repo',
    depo: 'Depo', data: 'Data', holidays: 'Holidays',
    // stats
    totalRecords: 'Total Records',
    uniqueFiles:  'Unique Files',
    avgRate:      'Average Rate',
    avgDays:      'Average Days',
    totalMoney:   'Total Money',
    // table headers
    colIndex:      '#',
    colFileId:     'FILE ID',
    colAppNo:      'APP NO.',
    colDateIn:     'DATE IN',
    colDateOut:    'DATE OUT',
    colDealerFrom: 'DEALER FROM',
    colDealerTo:   'DEALER TO',
    colDays:       'DAYS',
    colRate:       'RATE',
    colMoney:      'MONEY',
    colCreatedAt:  'CREATED AT',
    colActions:    'ACTIONS',
    // filters
    phFileId:    'File ID…',
    phAppNo:     'App No.…',
    phDateIn:    'Date in…',
    phDateOut:   'Date out…',
    phDealer:    'Dealer…',
    phDays:      'Days…',
    phRate:      'Rate…',
    phMoney:     'Money…',
    phCreatedAt: 'Created…',
    clearAll:    'Clear all',
    results:     (n: number) => `${n} result${n !== 1 ? 's' : ''}`,
    filterLabel: 'Filters:',
    // table states
    loading:      'Loading Depo data…',
    failedLoad:   'Failed to load data.',
    noMatch:      'No records match your filters.',
    noData:       'No Depo records found.',
    clearFilters: 'Clear filters',
    showing:      (from: number, to: number, total: number) => `Showing ${from}–${to} of ${total}`,
    previous:     'Prev',
    next:         'Next',
    // actions
    delete: 'Delete',
    // delete modal
    cancel:          'Cancel',
    deleteTitle:     'Delete Depo Records',
    deleteConfirm:   'Are you sure you want to delete these records?',
    deleteBatchInfo: (count: number, fileId: string) =>
      `All ${count} record${count !== 1 ? 's' : ''} sharing file ID "${fileId}" will be permanently deleted.`,
    deleteIrrev:  '⚠️ This action cannot be undone.',
    deleting:     'Deleting…',
    deleteBtn:    (count: number) => `Delete All ${count} Record${count !== 1 ? 's' : ''}`,
    deleteSuccess:(fileId: string) => `All records for file "${fileId}" deleted successfully!`,
    deleteFailed: 'Failed to delete records.',
    // user dropdown
    usersBtn:   'Users',
    sessionsBtn:'Sessions',
    actionsBtn: 'Actions',
    signOut:    'Sign Out',
    department: 'Department',
    // lang modal
    langConfirmTitle: 'Change Language',
    langConfirmMsg:   (lang: string) => `Are you sure you want to switch the interface language to ${lang}?`,
    confirm:          'Yes, change',
    // footer
    officialDesc:  'UZONIA - Interbank Operations, Calculations, and Data Processing Platform',
    aboutCbu:      'About CBU',
    executiveB:    'The Executive Board',
    legislation:   'Legislation',
    publications:  'Publications',
    dataStats:     'Data & Stats',
    services:      'Services',
    exchangeR:     'Exchange Rates',
    policyR:       'Policy Rate',
    paymentS:      'Payment Systems',
    licensing:     'Licensing',
    pressCenter:   'Press Centre',
    contact:       'Contact',
    addressS:      'Islam Karimov St. 6',
    modules:       'Modules',
    copyright:     '© 2026 Central Bank of the Republic of Uzbekistan. All rights reserved.',
    privacyPolicy: 'Privacy Policy',
    termsOfUse:    'Terms of Use',
    sessionExpired:'Session expired. Please log in again.',
  },
  ru: {
    bankName:     'Центральный Банк Республики Узбекистан',
    deptSubtitle: 'Департамент Монетарных Операций',
    calculations: 'Расчёты', uploads: 'Загрузки', repo: 'Репо',
    depo: 'Депо', data: 'Данные', holidays: 'Праздники',
    totalRecords: 'Всего записей',
    uniqueFiles:  'Уникальных файлов',
    avgRate:      'Средняя ставка',
    avgDays:      'Средних дней',
    totalMoney:   'Общая сумма',
    colIndex:      '#',
    colFileId:     'ФАЙЛ ID',
    colAppNo:      'НОМЕР ЗАЯВКИ',
    colDateIn:     'ДАТА ВХ.',
    colDateOut:    'ДАТА ВЫХ.',
    colDealerFrom: 'ДИЛЕР ОТ',
    colDealerTo:   'ДИЛЕР К',
    colDays:       'ДНЕЙ',
    colRate:       'СТАВКА',
    colMoney:      'СУММА',
    colCreatedAt:  'СОЗДАН',
    colActions:    'ДЕЙСТВИЯ',
    phFileId:    'Файл ID…',
    phAppNo:     'Номер заявки…',
    phDateIn:    'Дата вх…',
    phDateOut:   'Дата вых…',
    phDealer:    'Дилер…',
    phDays:      'Дней…',
    phRate:      'Ставка…',
    phMoney:     'Сумма…',
    phCreatedAt: 'Создан…',
    clearAll:    'Очистить',
    results:     (n: number) => `${n} запис${n === 1 ? 'ь' : n < 5 ? 'и' : 'ей'}`,
    filterLabel: 'Фильтры:',
    loading:      'Загрузка данных Депо…',
    failedLoad:   'Ошибка загрузки данных.',
    noMatch:      'Записи не найдены.',
    noData:       'Записи Депо отсутствуют.',
    clearFilters: 'Сбросить фильтры',
    showing:      (from: number, to: number, total: number) => `Показано ${from}–${to} из ${total}`,
    previous:     'Назад',
    next:         'Вперёд',
    delete:       'Удалить',
    cancel:       'Отмена',
    deleteTitle:     'Удалить записи Депо',
    deleteConfirm:   'Вы уверены, что хотите удалить эти записи?',
    deleteBatchInfo: (count: number, fileId: string) =>
      `Все ${count} запис${count === 1 ? 'ь' : count < 5 ? 'и' : 'ей'} с ID файла "${fileId}" будут удалены безвозвратно.`,
    deleteIrrev:  '⚠️ Это действие нельзя отменить.',
    deleting:     'Удаление…',
    deleteBtn:    (count: number) => `Удалить все ${count} запис${count === 1 ? 'ь' : count < 5 ? 'и' : 'ей'}`,
    deleteSuccess:(fileId: string) => `Все записи для файла "${fileId}" успешно удалены!`,
    deleteFailed: 'Ошибка удаления записей.',
    usersBtn:    'Пользователи',
    sessionsBtn: 'Сессии',
    actionsBtn:  'Действия',
    signOut:     'Выйти',
    department:  'Отдел',
    langConfirmTitle: 'Изменить язык',
    langConfirmMsg:   (lang: string) => `Изменить язык интерфейса на ${lang}?`,
    confirm:          'Да, изменить',
    officialDesc:  'UZONIA – Платформа межбанковских операций, расчётов и обработки данных',
    aboutCbu:      'О ЦБУ',
    executiveB:    'Правление',
    legislation:   'Законодательство',
    publications:  'Публикации',
    dataStats:     'Данные & Статистика',
    services:      'Услуги',
    exchangeR:     'Курсы валют',
    policyR:       'Ключевая ставка',
    paymentS:      'Платёжные системы',
    licensing:     'Лицензирование',
    pressCenter:   'Пресс-центр',
    contact:       'Контакты',
    addressS:      'Улица Ислама Каримова, 6',
    modules:       'Модули',
    copyright:     '© 2026 Центральный Банк Республики Узбекистан. Все права защищены.',
    privacyPolicy: 'Политика конфиденциальности',
    termsOfUse:    'Условия использования',
    sessionExpired:'Сессия истекла. Пожалуйста, войдите снова.',
  },
  uz_c: {
    bankName:     'Ўзбекистон Республикаси Марказий Банки',
    deptSubtitle: 'Монетар Операциялар Департаменти',
    calculations: 'Ҳисоб-китоб', uploads: 'Юклашлар', repo: 'Репо',
    depo: 'Депо', data: 'Маълумотлар', holidays: 'Байрамлар',
    totalRecords: 'Жами ёзувлар',
    uniqueFiles:  'Уникал файллар',
    avgRate:      'Ўртача ставка',
    avgDays:      'Ўртача кун',
    totalMoney:   'Жами сумма',
    colIndex:      '#',
    colFileId:     'ФАЙЛ ID',
    colAppNo:      'АРИЗА РАҚАМИ',
    colDateIn:     'КИРИШ САНАСИ',
    colDateOut:    'ЧИҚИШ САНАСИ',
    colDealerFrom: 'ДИЛЕРДАН',
    colDealerTo:   'ДИЛЕРГА',
    colDays:       'КУН',
    colRate:       'СТАВКА',
    colMoney:      'СУММА',
    colCreatedAt:  'ЯРАТИЛГАН',
    colActions:    'АМАЛЛАР',
    phFileId:    'Файл ID…',
    phAppNo:     'Ариза рақами…',
    phDateIn:    'Кириш санаси…',
    phDateOut:   'Чиқиш санаси…',
    phDealer:    'Дилер…',
    phDays:      'Кун…',
    phRate:      'Ставка…',
    phMoney:     'Сумма…',
    phCreatedAt: 'Яратилган…',
    clearAll:    'Тозалаш',
    results:     (n: number) => `${n} та натижа`,
    filterLabel: 'Фильтрлар:',
    loading:      'Депо маълумотлари олинмоқда…',
    failedLoad:   'Маълумотларни юклашда хато.',
    noMatch:      'Ёзувлар топилмади.',
    noData:       'Депо ёзувлари йўқ.',
    clearFilters: 'Фильтрларни тозалаш',
    showing:      (from: number, to: number, total: number) => `${total} тадан ${from}–${to} кўрсатилмоқда`,
    previous:     'Олдинги',
    next:         'Кейинги',
    delete:       'Ўчириш',
    cancel:       'Бекор қилиш',
    deleteTitle:     'Депо Ёзувларини Ўчириш',
    deleteConfirm:   'Ушбу ёзувларни ўчиришга ишончингиз комилми?',
    deleteBatchInfo: (count: number, fileId: string) =>
      `"${fileId}" файл ID га эга барча ${count} та ёзув ўчирилади.`,
    deleteIrrev:  '⚠️ Бу амални қайтариб бўлмайди.',
    deleting:     'Ўчирилмоқда…',
    deleteBtn:    (count: number) => `Барча ${count} та ёзувни ўчириш`,
    deleteSuccess:(fileId: string) => `"${fileId}" файл учун барча ёзувлар ўчирилди!`,
    deleteFailed: 'Ёзувларни ўчиришда хато.',
    usersBtn:    'Фойдаланувчилар',
    sessionsBtn: 'Сессиялар',
    actionsBtn:  'Ҳаракатлар',
    signOut:     'Чиқиш',
    department:  'Бўлим',
    langConfirmTitle: 'Тилни ўзгартириш',
    langConfirmMsg:   (lang: string) => `Интерфейс тилини ${lang} тилига ўзгартирасизми?`,
    confirm:          'Ҳа, ўзгартириш',
    officialDesc:  'UZONIA – Банклараро операциялар, ҳисоб-китоблар ва маълумотларни қайта ишлаш платформаси',
    aboutCbu:      'МБ Ҳақида',
    executiveB:    'Бошқарув кенгаши',
    legislation:   'Қонунчилик',
    publications:  'Публикациялар',
    dataStats:     'Маълумотлар & Статистика',
    services:      'Хизматлар',
    exchangeR:     'Валюта курслари',
    policyR:       'Асосий ставка',
    paymentS:      'Тўлов тизимлари',
    licensing:     'Лицензиялаш',
    pressCenter:   'Ахборот хизмати',
    contact:       'Боғланиш',
    addressS:      'Ислом Каримов Кўчаси, 6',
    modules:       'Модуллар',
    copyright:     '© 2026 Ўзбекистон Республикаси Марказий Банки. Барча ҳуқуқлар ҳимояланган.',
    privacyPolicy: 'Махфийлик сиёсати',
    termsOfUse:    'Фойдаланиш шартлари',
    sessionExpired:'Сессия муддати тугади. Илтимос, қайта киринг.',
  },
  uz_l: {
    bankName:     "O'zbekiston Respublikasi Markaziy Banki",
    deptSubtitle: 'Monetar Operatsiyalar Departamenti',
    calculations: 'Hisob-kitob', uploads: 'Yuklamalar', repo: 'Repo',
    depo: 'Depo', data: "Ma'lumotlar", holidays: 'Bayramlar',
    totalRecords: 'Jami yozuvlar',
    uniqueFiles:  'Unikal fayllar',
    avgRate:      "O'rtacha stavka",
    avgDays:      "O'rtacha kun",
    totalMoney:   'Jami summa',
    colIndex:      '#',
    colFileId:     'FAYL ID',
    colAppNo:      'ARIZA RAQAMI',
    colDateIn:     'KIRISH SANASI',
    colDateOut:    'CHIQISH SANASI',
    colDealerFrom: 'DILERDAN',
    colDealerTo:   'DILERGA',
    colDays:       'KUN',
    colRate:       'STAVKA',
    colMoney:      'SUMMA',
    colCreatedAt:  'YARATILGAN',
    colActions:    'AMALLAR',
    phFileId:    'Fayl ID…',
    phAppNo:     'Ariza raqami…',
    phDateIn:    'Kirish sanasi…',
    phDateOut:   'Chiqish sanasi…',
    phDealer:    'Diler…',
    phDays:      'Kun…',
    phRate:      'Stavka…',
    phMoney:     'Summa…',
    phCreatedAt: 'Yaratilgan…',
    clearAll:    'Tozalash',
    results:     (n: number) => `${n} ta natija`,
    filterLabel: 'Filtrlar:',
    loading:      "Depo ma'lumotlari olinmoqda…",
    failedLoad:   "Ma'lumotlarni yuklashda xato.",
    noMatch:      'Yozuvlar topilmadi.',
    noData:       "Depo yozuvlari yo'q.",
    clearFilters: 'Filtrlarni tozalash',
    showing:      (from: number, to: number, total: number) => `${total} tadan ${from}–${to} ko'rsatilmoqda`,
    previous:     'Oldingi',
    next:         'Keyingi',
    delete:       "O'chirish",
    cancel:       'Bekor qilish',
    deleteTitle:     "Depo Yozuvlarini O'chirish",
    deleteConfirm:   "Ushbu yozuvlarni o'chirishga ishonchingiz komilmi?",
    deleteBatchInfo: (count: number, fileId: string) =>
      `"${fileId}" fayl ID ga ega barcha ${count} ta yozuv o'chiriladi.`,
    deleteIrrev:  "⚠️ Bu amalni qaytarib bo'lmaydi.",
    deleting:     "O'chirilmoqda…",
    deleteBtn:    (count: number) => `Barcha ${count} ta yozuvni o'chirish`,
    deleteSuccess:(fileId: string) => `"${fileId}" fayl uchun barcha yozuvlar o'chirildi!`,
    deleteFailed: "Yozuvlarni o'chirishda xato.",
    usersBtn:    'Foydalanuvchilar',
    sessionsBtn: 'Sessiyalar',
    actionsBtn:  'Harakatlar',
    signOut:     'Chiqish',
    department:  "Bo'lim",
    langConfirmTitle: "Tilni o'zgartirish",
    langConfirmMsg:   (lang: string) => `Interfeys tilini ${lang} tiliga o'zgartirasizmi?`,
    confirm:          "Ha, o'zgartirish",
    officialDesc:  "UZONIA – Banklararo operatsiyalar, hisob-kitoblar va ma'lumotlarni qayta ishlash platformasi",
    aboutCbu:      'MBU Haqida',
    executiveB:    'Boshqaruv kengashi',
    legislation:   'Qonunchilik',
    publications:  'Publikatsiyalar',
    dataStats:     "Ma'lumotlar & Statistika",
    services:      'Xizmatlar',
    exchangeR:     'Valyuta kurslari',
    policyR:       'Asosiy stavka',
    paymentS:      "To'lov tizimlari",
    licensing:     'Litsenziyalash',
    pressCenter:   'Axborot xizmati',
    contact:       "Bog'lanish",
    addressS:      "Islom Karimov Ko'chasi, 6",
    modules:       'Modullar',
    copyright:     "© 2026 O'zbekiston Respublikasi Markaziy Banki. Barcha huquqlar himoyalangan.",
    privacyPolicy: 'Maxfiylik siyosati',
    termsOfUse:    'Foydalanish shartlari',
    sessionExpired:"Sessiya muddati tugadi. Iltimos, qayta kiring.",
  },
};

type LangKey = keyof typeof TRANSLATIONS;
const LANG_LABELS: Record<LangKey, string> = { en: 'EN', ru: 'RU', uz_c: 'УЗ', uz_l: "O'Z" };
const LANG_NAMES:  Record<LangKey, string> = { en: 'English', ru: 'Русский', uz_c: 'Ўзбекча', uz_l: "O'zbekcha" };

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface DepoRow {
  file_id:               string;
  number_of_application: string;
  date_in:               string;
  date_out:              string;
  dealer_from:           string;
  dealer_to:             string;
  rate:                  number;
  days:                  number;
  money:                 number;
  created_at:            string | null;
}

interface CurrentUser {
  user_id:    string;
  username:   string;
  first_name: string;
  last_name:  string;
  department: string;
  language:   string;
  is_active:  boolean;
  is_admin:   boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const formatDate = (s: string): string => {
  if (!s) return '—';
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

const fmtRate  = (n: number): string => typeof n === 'number' && !isNaN(n) ? `${n.toFixed(2)}%` : '—';
const fmtMoney = (n: number): string => typeof n === 'number' && !isNaN(n) ? n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';
const fmtDays  = (n: number): string => typeof n === 'number' && !isNaN(n) ? n.toFixed(2) : '—';

// ─────────────────────────────────────────────────────────────────────────────
// SmartDateInput
// ─────────────────────────────────────────────────────────────────────────────

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
    <div style={{ position:'relative', flex: flex||'1 1 120px', minWidth:'100px' }}>
      <span className="material-symbols-outlined" style={{ position:'absolute', left:'7px', top:'50%', transform:'translateY(-50%)', color:'#94a3b8', fontSize:'13px', pointerEvents:'none', zIndex:3 }}>event</span>
      <input type="text" value={value} onChange={handleChange} onKeyDown={handleKeyDown}
        placeholder={placeholder||'DD-MM-YYYY'} maxLength={10}
        style={{ width:'100%', padding:'7px 26px 7px 24px', fontSize:'11px', background:'#f8fafc', color:'#0f172a', border:'1px solid #e2e8f0', borderRadius:'8px', outline:'none', boxSizing:'border-box', fontFamily:'monospace', letterSpacing:'0.2px' }}
      />
      <span className="material-symbols-outlined" onClick={() => hiddenRef.current?.showPicker?.()} style={{ position:'absolute', right:'6px', top:'50%', transform:'translateY(-50%)', color:'#64748b', fontSize:'13px', cursor:'pointer', zIndex:4, lineHeight:1 }}>calendar_today</span>
      <input ref={hiddenRef} type="date" value={isoValue} onChange={handleHidden} tabIndex={-1}
        style={{ position:'absolute', right:'6px', top:'50%', width:'16px', height:'16px', opacity:0, zIndex:2, pointerEvents:'none', border:'none', padding:0 }} />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ColFilter
// ─────────────────────────────────────────────────────────────────────────────

const ColFilter = ({ value, onChange, placeholder, icon, flex, numeric }: {
  value: string; onChange: (v: string) => void; placeholder: string; icon: string; flex?: string; numeric?: boolean;
}) => {
  const handleKeyDown = numeric
    ? (e: React.KeyboardEvent<HTMLInputElement>) => {
        const pass = ['Backspace','Delete','Tab','Escape','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'];
        if (pass.includes(e.key)) return;
        if (!/[\d.%]/.test(e.key)) e.preventDefault();
      }
    : undefined;

  return (
    <div style={{ position:'relative', flex: flex||'1 1 90px', minWidth:'80px' }}>
      <span className="material-symbols-outlined" style={{ position:'absolute', left:'7px', top:'50%', transform:'translateY(-50%)', color:'#94a3b8', fontSize:'13px', pointerEvents:'none', zIndex:1 }}>{icon}</span>
      <input
        type="text"
        inputMode={numeric ? 'decimal' : 'text'}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        style={{ width:'100%', padding:'7px 7px 7px 24px', fontSize:'11px', background:'#f8fafc', color:'#0f172a', border:'1px solid #e2e8f0', borderRadius:'8px', outline:'none', boxSizing:'border-box', fontFamily: numeric ? 'monospace' : 'inherit' }}
      />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

const DepoDataPage: React.FC = () => {
  const navigate    = useNavigate();
  const currentPath = '/depo';

  // ── Responsive ───────────────────────────────────────────────────────────
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ── State ─────────────────────────────────────────────────────────────────
  const [user, setUser]           = useState<CurrentUser | null>(null);
  const [rows, setRows]           = useState<DepoRow[]>([]);
  const [lang, setLang]           = useState<LangKey>('en');
  const [pendingLang, setPendingLang] = useState<LangKey | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const t = TRANSLATIONS[lang] ?? TRANSLATIONS.en;

  // ── User dropdown ─────────────────────────────────────────────────────────
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setDropdownOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // ── Fonts ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    [
      'https://fonts.googleapis.com/icon?family=Material+Symbols+Outlined',
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    ].forEach(href => {
      if (!document.querySelector(`link[href="${href}"]`)) {
        const l = document.createElement('link'); l.href = href; l.rel = 'stylesheet';
        document.head.appendChild(l);
      }
    });
  }, []);

  // ── Core fetch ────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch('/api/get_all_depo_data');
      if (!res) return;
      if (!res.ok) {
        if (res.status === 404) { setRows([]); setLoadError(null); return; }
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      setRows(Array.isArray(data.Data) ? data.Data : []);
      setUser(data.user ?? null);
      setLoadError(null);
      const langMap: Record<string, LangKey> = { en:'en', ru:'ru', uz_c:'uz_c', uz_l:'uz_l' };
      const mapped = langMap[data.user?.language];
      if (mapped) setLang(mapped);
    } catch {
      setLoadError(t.failedLoad);
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Mount: check session_expired then fetch ────────────────────────────────
  useEffect(() => {
    const expired = sessionStorage.getItem('session_expired');
    if (expired) {
      showToast(t.sessionExpired, 'info');
      sessionStorage.removeItem('session_expired');
    }
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Periodic session check (every 60 s) ───────────────────────────────────
  useEffect(() => {
    if (!user) return;
    let active = true;
    const interval = setInterval(async () => {
      if (!active) return;
      try {
        const res = await fetch(`${API_BASE_URL}/api/get_all_depo_data`, {
          headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
        });
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem('session_id');
          sessionStorage.setItem('session_expired', '1');
          window.location.href = '/login';
        }
      } catch {}
    }, 60_000);
    return () => { active = false; clearInterval(interval); };
  }, [user]);

  // ── Language change ───────────────────────────────────────────────────────
  const applyLanguageChange = useCallback(async (newLang: LangKey) => {
    setPendingLang(null);
    try {
      const res = await apiFetch(`/api/update_language?language=${newLang}`, { method:'PUT' });
      if (!res || !res.ok) return;
      const data = await res.json();
      setLang(newLang);
      setUser(data.user);
    } catch {}
  }, []);

  const getInitials = (u: CurrentUser | null) => {
    if (!u) return '?';
    return ((u.first_name?.[0]??'')+(u.last_name?.[0]??'')).toUpperCase() || u.username?.[0]?.toUpperCase() || '?';
  };

  // ── Toast ─────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState<{ text: string; type: 'success'|'error'|'info' }|null>(null);
  const showToast = (text: string, type: 'success'|'error'|'info' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Filters ───────────────────────────────────────────────────────────────
  const [fFileId,  setFFileId]  = useState('');
  const [fAppNo,   setFAppNo]   = useState('');
  const [fDateIn,  setFDateIn]  = useState('');
  const [fDateOut, setFDateOut] = useState('');
  const [fDealer,  setFDealer]  = useState('');
  const [fDays,    setFDays]    = useState('');
  const [fRate,    setFRate]    = useState('');
  const [fMoney,   setFMoney]   = useState('');
  const [fCreated, setFCreated] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const filteredData = useMemo(() => {
    let f = [...rows];
    const ci = (s: string) => s?.toLowerCase() ?? '';
    if (fFileId.trim())  f = f.filter(r => ci(r.file_id).includes(ci(fFileId.trim())));
    if (fAppNo.trim())   f = f.filter(r => ci(r.number_of_application).includes(ci(fAppNo.trim())));
    if (fDateIn.trim())  f = f.filter(r => formatDate(r.date_in).includes(fDateIn.trim()));
    if (fDateOut.trim()) f = f.filter(r => formatDate(r.date_out).includes(fDateOut.trim()));
    if (fDealer.trim())  f = f.filter(r =>
      ci(r.dealer_from).includes(ci(fDealer.trim())) ||
      ci(r.dealer_to).includes(ci(fDealer.trim()))
    );
    if (fDays.trim())    f = f.filter(r => fmtDays(r.days).includes(fDays.trim()));
    if (fRate.trim())    f = f.filter(r => fmtRate(r.rate).includes(fRate.trim()));
    if (fMoney.trim())   f = f.filter(r => fmtMoney(r.money).includes(fMoney.trim()));
    if (fCreated.trim()) f = f.filter(r => formatDateTime(r.created_at).toLowerCase().includes(ci(fCreated.trim())));
    return f;
  }, [rows, fFileId, fAppNo, fDateIn, fDateOut, fDealer, fDays, fRate, fMoney, fCreated]);

  const stats = useMemo(() => {
    if (!rows.length) return { total:0, uniqueFiles:0, totalMoney:'—', avgRate:'—', avgDays:'—' };
    const uniqueFiles = new Set(rows.map(r => r.file_id)).size;
    const totalMoney  = rows.reduce((a,b) => a+b.money, 0);
    const avgRate     = rows.reduce((a,b) => a+b.rate,  0) / rows.length;
    const avgDays     = rows.reduce((a,b) => a+b.days,  0) / rows.length;
    return { total: rows.length, uniqueFiles, totalMoney: fmtMoney(totalMoney), avgRate: fmtRate(avgRate), avgDays: fmtDays(avgDays) };
  }, [rows]);

  const hasActiveFilters = fFileId||fAppNo||fDateIn||fDateOut||fDealer||fDays||fRate||fMoney||fCreated;
  const totalPages    = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = useMemo(
    () => filteredData.slice((currentPage-1)*itemsPerPage, currentPage*itemsPerPage),
    [filteredData, currentPage]
  );
  useEffect(() => { setCurrentPage(1); }, [fFileId,fAppNo,fDateIn,fDateOut,fDealer,fDays,fRate,fMoney,fCreated]);

  const clearFilters = useCallback(() => {
    setFFileId(''); setFAppNo(''); setFDateIn(''); setFDateOut(''); setFDealer('');
    setFDays(''); setFRate(''); setFMoney(''); setFCreated('');
  }, []);

  // ── Delete modal ─────────────────────────────────────────────────────────
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [targetRow,  setTargetRow]  = useState<DepoRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const openDeleteModal = (r: DepoRow) => { setTargetRow(r); setIsDeleteModalOpen(true); };

  const handleDelete = async () => {
    if (!targetRow) return;
    setIsDeleting(true);
    try {
      const res = await apiFetch(`/api/delete_depo_data?file_id=${encodeURIComponent(targetRow.file_id)}`, { method:'DELETE' });
      if (!res || !res.ok) { const e = await res!.json(); throw new Error(e.detail); }
      setIsDeleteModalOpen(false); setTargetRow(null);
      await fetchData();
      showToast(t.deleteSuccess(targetRow.file_id), 'success');
    } catch (err: any) { showToast(err.message || t.deleteFailed, 'error'); }
    finally { setIsDeleting(false); }
  };

  const sameFileCount = useMemo(
    () => targetRow ? rows.filter(r => r.file_id === targetRow.file_id).length : 0,
    [targetRow, rows]
  );

  // ── NavBtn ────────────────────────────────────────────────────────────────
  const NavBtn = ({ page }: { page: typeof NAV_PAGES[0] }) => {
    const active = page.path === currentPath;
    const label  = t[page.key as keyof typeof t] as string || page.key;
    return (
      <button onClick={() => navigate(page.path)} style={{
        display:'flex', alignItems:'center', gap:'6px', padding:'6px 8px',
        background: active ? 'rgba(255,255,255,0.18)' : 'transparent',
        border: active ? '1px solid rgba(255,255,255,0.35)' : '1px solid transparent',
        borderBottom: active ? '2px solid #e9b741' : '2px solid transparent',
        borderRadius:'8px', color: active ? 'white' : 'rgba(255,255,255,0.65)',
        fontSize:'14px', fontWeight: active ? '600' : '400',
        cursor:'pointer', whiteSpace:'nowrap', transition:'all 0.15s', outline:'none', flexShrink:0,
      }}
        onMouseEnter={e => { if(!active){ e.currentTarget.style.background='rgba(255,255,255,0.10)'; e.currentTarget.style.color='white'; }}}
        onMouseLeave={e => { if(!active){ e.currentTarget.style.background='transparent'; e.currentTarget.style.color='rgba(255,255,255,0.65)'; }}}
      >
        <span className="material-symbols-outlined" style={{ fontSize:'14px' }}>{page.icon}</span>
        {!isMobile && label}
      </button>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:'100vh', width:'100%', display:'flex', flexDirection:'column', backgroundColor:'#f8fafc', fontFamily:'"Inter","Segoe UI",system-ui,-apple-system,sans-serif' }}>

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position:'fixed', top:'24px', right:'24px', zIndex:2000,
          background: toast.type==='success' ? '#065f46' : toast.type==='info' ? '#1e40af' : '#991b1b',
          color:'white', padding:'13px 18px', borderRadius:'12px',
          display:'flex', alignItems:'center', gap:'10px',
          boxShadow:'0 8px 24px rgba(0,0,0,0.2)', fontSize:'14px', fontWeight:'500',
          animation:'slideIn 0.3s ease', maxWidth:'400px',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize:'19px', flexShrink:0 }}>
            {toast.type==='success' ? 'check_circle' : toast.type==='info' ? 'info' : 'error'}
          </span>
          {toast.text}
        </div>
      )}

      {/* ── Language Confirm Modal ── */}
      {pendingLang && (
        <div style={{ position:'fixed', inset:0, background:'rgba(7,30,46,0.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:500, backdropFilter:'blur(4px)' }}
          onClick={() => setPendingLang(null)}>
          <div style={{ background:'white', borderRadius:'20px', padding:'32px 28px', maxWidth:'380px', width:'90%', boxShadow:'0 32px 64px rgba(0,0,0,0.25)', animation:'modalIn 0.2s ease' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ textAlign:'center', marginBottom:'20px' }}>
              <div style={{ width:'56px', height:'56px', background:'#e8f0fe', borderRadius:'16px', display:'inline-flex', alignItems:'center', justifyContent:'center', marginBottom:'14px' }}>
                <span className="material-symbols-outlined" style={{ fontSize:'28px', color:'#0a3b5c' }}>language</span>
              </div>
              <h3 style={{ margin:0, fontSize:'18px', fontWeight:'700', color:'#0a3b5c' }}>{t.langConfirmTitle}</h3>
              <p style={{ margin:'8px 0 0', fontSize:'14px', color:'#64748b', lineHeight:'1.5' }}>
                {t.langConfirmMsg(LANG_NAMES[pendingLang])}
              </p>
            </div>
            <div style={{ display:'flex', gap:'10px', marginTop:'8px' }}>
              <button onClick={() => setPendingLang(null)}
                style={{ flex:1, padding:'11px', background:'#f1f5f9', border:'none', borderRadius:'10px', fontSize:'14px', fontWeight:'600', color:'#64748b', cursor:'pointer', transition:'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background='#e2e8f0'}
                onMouseLeave={e => e.currentTarget.style.background='#f1f5f9'}
              >{t.cancel}</button>
              <button onClick={() => applyLanguageChange(pendingLang)}
                style={{ flex:1, padding:'11px', background:'linear-gradient(135deg,#0a3b5c,#1a5080)', border:'none', borderRadius:'10px', fontSize:'14px', fontWeight:'600', color:'white', cursor:'pointer', boxShadow:'0 4px 12px rgba(10,59,92,0.3)', transition:'all 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.transform='translateY(-1px)'}
                onMouseLeave={e => e.currentTarget.style.transform='translateY(0)'}
              >{t.confirm}</button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════ HEADER ════════════════════════════ */}
      <header style={{
        width:'100%',
        background:'linear-gradient(135deg, #0a3b5c 0%, #1a4b70 100%)',
        boxShadow:'0 4px 20px rgba(0,40,70,0.18)',
        borderBottom:'3px solid #e9b741',
        boxSizing:'border-box',
        position:'sticky', top:0, zIndex:100,
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:'12px', padding: isMobile ? '0 12px' : '0 20px', height:'60px', minWidth:0 }}>

          {/* Logo + title */}
          <div onClick={() => navigate('/')} style={{ display:'flex', alignItems:'center', gap:'10px', flexShrink:0, cursor:'pointer' }}>
            <div style={{ width:'44px', height:'44px', background:'white', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 12px rgba(0,0,0,0.12)', padding:'4px', flexShrink:0 }}>
              <img src={CbuLogo} alt="CBU Logo" style={{ width:'100%', height:'100%', objectFit:'contain' }} />
            </div>
            {!isMobile && (
              <div style={{ lineHeight:'1.4' }}>
                <div style={{ fontSize:'18px', fontWeight:'700', color:'white' }}>{t.bankName}</div>
                <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.6)' }}>{t.deptSubtitle}</div>
              </div>
            )}
          </div>

          {!isMobile && <div style={{ width:'1px', height:'28px', background:'rgba(255,255,255,0.15)', flexShrink:0 }} />}

          {/* Nav */}
          <div style={{ padding:'0 10px', overflowX:'auto' }}>
            <nav style={{ display:'flex', alignItems:'center', gap:'6px', height:'40px', minWidth:'max-content', flexWrap:'nowrap' }}>
              {NAV_PAGES.map(p => <NavBtn key={p.path} page={p} />)}
            </nav>
          </div>

          <div style={{ flex:1, minWidth:0 }} />

          {/* Right: lang + avatar */}
          <div style={{ display:'flex', alignItems:'center', gap:'15px', flexShrink:0 }}>
            {/* Language switcher */}
            <div style={{ display:'flex', gap:'4px', background:'rgba(255,255,255,0.08)', borderRadius:'8px', padding:'4px', border:'1px solid rgba(255,255,255,0.12)', flexShrink:0 }}>
              {(Object.entries(LANG_LABELS) as [LangKey, string][]).map(([key, label]) => (
                <button key={key}
                  onClick={() => key !== lang && setPendingLang(key)}
                  style={{
                    background: lang===key ? '#e9b741' : 'transparent',
                    color: lang===key ? '#0a2a40' : 'rgba(255,255,255,0.75)',
                    border:'none', borderRadius:'6px', padding:'4px 8px',
                    fontSize:'11px', fontWeight:'600',
                    cursor: lang===key ? 'default' : 'pointer', transition:'all 0.18s', minWidth:'26px',
                  }}
                  onMouseEnter={e => { if(lang!==key) e.currentTarget.style.background='rgba(255,255,255,0.15)'; }}
                  onMouseLeave={e => { if(lang!==key) e.currentTarget.style.background='transparent'; }}
                >{label}</button>
              ))}
            </div>

            {/* User avatar + dropdown */}
            <div ref={dropdownRef} style={{ position:'relative', flexShrink:0 }}>
              <button onClick={() => setDropdownOpen(o => !o)} style={{
                background:'rgba(255,255,255,0.1)', border:'2px solid rgba(233,183,65,0.5)',
                borderRadius:'50%', width:'44px', height:'44px',
                display:'flex', alignItems:'center', justifyContent:'center',
                cursor:'pointer', transition:'all 0.2s', color:'white', fontSize:'18px', fontWeight:'700',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor='#e9b741'; e.currentTarget.style.background='rgba(233,183,65,0.2)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(233,183,65,0.5)'; e.currentTarget.style.background='rgba(255,255,255,0.1)'; }}
              >
                {getInitials(user)}
              </button>

              {dropdownOpen && (
                <div style={{ position:'absolute', top:'calc(100% + 10px)', right:0, background:'white', borderRadius:'16px', minWidth:'260px', boxShadow:'0 20px 40px rgba(0,0,0,0.18)', overflow:'hidden', border:'1px solid #e2e8f0', zIndex:200, animation:'dropIn 0.18s ease' }}>
                  {/* User info */}
                  <div style={{ padding:'20px', borderBottom:'1px solid #f1f5f9', background:'linear-gradient(135deg,#f8fafc,#eef2f7)' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                      <div style={{ width:'48px', height:'48px', borderRadius:'50%', background:'linear-gradient(135deg,#065f46,#047857)', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:'18px', fontWeight:'700', flexShrink:0, border:'3px solid #e9b741' }}>
                        {getInitials(user)}
                      </div>
                      <div style={{ minWidth:0 }}>
                        <div style={{ fontWeight:'700', color:'#065f46', fontSize:'15px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {user ? `${user.first_name} ${user.last_name}` : '—'}
                        </div>
                        <div style={{ color:'#64748b', fontSize:'12px', marginTop:'2px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          @{user?.username ?? '—'}
                        </div>
                        <div style={{ display:'inline-flex', alignItems:'center', gap:'4px', marginTop:'6px', padding:'3px 10px', background:'#d1fae5', borderRadius:'20px', fontSize:'11px', color:'#065f46', fontWeight:'600' }}>
                          <span className="material-symbols-outlined" style={{ fontSize:'12px' }}>domain</span>
                          {user?.department ?? t.department}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Admin section */}
                  {user?.is_admin && (
                    <div style={{ padding:'8px 12px', borderBottom:'1px solid #f1f5f9' }}>
                      <div style={{ padding:'4px 8px', marginBottom:'4px', fontSize:'11px', fontWeight:'600', color:'#64748b', textTransform:'uppercase', letterSpacing:'0.5px' }}>
                        Administration
                      </div>
                      {[
                        { icon:'group',          label:t.usersBtn,    route:'/users_data',    color:'#3b82f6', bg:'#eff6ff' },
                        { icon:'manage_history', label:t.sessionsBtn, route:'/user_sessions', color:'#8b5cf6', bg:'#f5f3ff' },
                        { icon:'timeline',       label:t.actionsBtn,  route:'/user_actions',  color:'#f59e0b', bg:'#fffbeb' },
                      ].map(({ icon, label, route, color, bg }) => (
                        <button key={route}
                          onClick={() => { navigate(route); setDropdownOpen(false); }}
                          style={{ width:'100%', background:'none', border:'none', textAlign:'left', padding:'10px 12px', borderRadius:'10px', cursor:'pointer', display:'flex', alignItems:'center', gap:'12px', color:'#1f2937', fontSize:'13px', fontWeight:'500', transition:'all 0.2s', marginBottom:'2px' }}
                          onMouseEnter={e => { e.currentTarget.style.background=bg; const s=e.currentTarget.querySelector('.admin-icon') as HTMLElement; if(s) s.style.transform='scale(1.1)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background='none'; const s=e.currentTarget.querySelector('.admin-icon') as HTMLElement; if(s) s.style.transform='scale(1)'; }}
                        >
                          <span className="material-symbols-outlined admin-icon" style={{ fontSize:'20px', color, transition:'transform 0.2s' }}>{icon}</span>
                          <span style={{ flex:1 }}>{label}</span>
                          <span className="material-symbols-outlined" style={{ fontSize:'16px', color:'#cbd5e1' }}>chevron_right</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Sign out */}
                  <div style={{ padding:'8px 12px' }}>
                    <button onClick={() => doLogout()} style={{ width:'100%', background:'none', border:'none', textAlign:'left', padding:'10px 12px', borderRadius:'10px', cursor:'pointer', display:'flex', alignItems:'center', gap:'12px', color:'#dc2626', fontSize:'13px', fontWeight:'500', transition:'all 0.2s' }}
                      onMouseEnter={e => { e.currentTarget.style.background='#fef2f2'; }}
                      onMouseLeave={e => { e.currentTarget.style.background='none'; }}>
                      <span className="material-symbols-outlined" style={{ fontSize:'20px' }}>logout</span>
                      <span>{t.signOut}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ════════════════════════════ MAIN ════════════════════════════ */}
      <main style={{ flex:1, width:'100%', display:'flex', flexDirection:'column', alignItems:'center', padding: isMobile ? '20px 16px' : '28px 32px', background:'#f8fafc', boxSizing:'border-box' }}>
        <div style={{ width:'100%', maxWidth:'1600px', margin:'0 auto' }}>

          {/* ── Stats cards ── */}
          <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(5,1fr)', gap:'12px', marginBottom:'20px' }}>
            {[
              { label:t.totalRecords, value:String(stats.total),       color:'#065f46', bg:'#d1fae5', icon:'database'    },
              { label:t.uniqueFiles,  value:String(stats.uniqueFiles), color:'#065f46', bg:'#d1fae5', icon:'folder_open' },
              { label:t.avgRate,      value:stats.avgRate,             color:'#7e22ce', bg:'#f3e8ff', icon:'percent'     },
              { label:t.avgDays,      value:stats.avgDays,             color:'#92400e', bg:'#fef3c7', icon:'today'       },
              { label:t.totalMoney,   value:stats.totalMoney,          color:'#065f46', bg:'#d1fae5', icon:'payments'    },
            ].map(s => (
              <div key={s.label} style={{ background:'white', padding:'14px 16px', borderRadius:'14px', boxShadow:'0 2px 8px rgba(0,0,0,0.04)', border:'1px solid #e2e8f0', display:'flex', alignItems:'center', gap:'12px' }}>
                <div style={{ width:'38px', height:'38px', background:s.bg, borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <span className="material-symbols-outlined" style={{ fontSize:'19px', color:s.color }}>{s.icon}</span>
                </div>
                <div>
                  <div style={{ fontSize:'10px', color:'#64748b', marginBottom:'2px', lineHeight:1.2 }}>{s.label}</div>
                  <div style={{ fontSize: s.label===t.totalRecords||s.label===t.uniqueFiles ? '20px' : '12px', fontWeight:'700', color:s.color, lineHeight:1.1, fontFamily:'monospace', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{s.value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Filter bar ── */}
          <div style={{ background:'white', padding:'14px 18px', borderRadius:'14px', marginBottom:'16px', boxShadow:'0 2px 8px rgba(0,40,70,0.05)', border:'1px solid #e2e8f0' }}>
            <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', alignItems:'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize:'18px', color:'#065f46', flexShrink:0 }}>filter_alt</span>
              <span style={{ fontSize:'12px', fontWeight:'500', color:'#374151', flexShrink:0 }}>{t.filterLabel}</span>

              <ColFilter value={fFileId}  onChange={setFFileId}  placeholder={t.phFileId}    icon="folder"   flex="120px" />
              <ColFilter value={fAppNo}   onChange={setFAppNo}   placeholder={t.phAppNo}     icon="tag"      flex="120px" />
              <SmartDateInput value={fDateIn}  onChange={setFDateIn}  placeholder={t.phDateIn}  flex="130px" />
              <SmartDateInput value={fDateOut} onChange={setFDateOut} placeholder={t.phDateOut} flex="130px" />
              <ColFilter value={fDealer}  onChange={setFDealer}  placeholder={t.phDealer}    icon="business" flex="120px" />
              <ColFilter value={fDays}    onChange={setFDays}    placeholder={t.phDays}      icon="today"    flex="100px" numeric />
              <ColFilter value={fRate}    onChange={setFRate}    placeholder={t.phRate}      icon="percent"  flex="100px" numeric />
              <ColFilter value={fMoney}   onChange={setFMoney}   placeholder={t.phMoney}     icon="payments" flex="130px" numeric />
              <ColFilter value={fCreated} onChange={setFCreated} placeholder={t.phCreatedAt} icon="schedule" flex="130px" />

              {hasActiveFilters && (
                <button onClick={clearFilters} style={{ padding:'7px 10px', fontSize:'11px', fontWeight:'500', background:'#f1f5f9', color:'#475569', border:'1px solid #e2e8f0', borderRadius:'8px', cursor:'pointer', display:'flex', alignItems:'center', gap:'4px', flexShrink:0 }}>
                  <span className="material-symbols-outlined" style={{ fontSize:'13px' }}>close</span>
                  {t.clearAll}
                </button>
              )}
            </div>

            {hasActiveFilters && (
              <div style={{ marginTop:'10px', fontSize:'11px', color:'#64748b', display:'flex', alignItems:'center', gap:'8px', padding:'6px 10px', background:'#f1f5f9', borderRadius:'8px', flexWrap:'wrap' }}>
                <span className="material-symbols-outlined" style={{ fontSize:'12px', color:'#065f46' }}>info</span>
                {fFileId  && <span style={{ background:'white', padding:'1px 7px', borderRadius:'5px' }}>FileID: <strong>{fFileId}</strong></span>}
                {fAppNo   && <span style={{ background:'white', padding:'1px 7px', borderRadius:'5px' }}>App: <strong>{fAppNo}</strong></span>}
                {fDateIn  && <span style={{ background:'white', padding:'1px 7px', borderRadius:'5px', fontFamily:'monospace' }}>DateIn: <strong>{fDateIn}</strong></span>}
                {fDateOut && <span style={{ background:'white', padding:'1px 7px', borderRadius:'5px', fontFamily:'monospace' }}>DateOut: <strong>{fDateOut}</strong></span>}
                {fDealer  && <span style={{ background:'white', padding:'1px 7px', borderRadius:'5px' }}>Dealer: <strong>{fDealer}</strong></span>}
                {fDays    && <span style={{ background:'white', padding:'1px 7px', borderRadius:'5px', fontFamily:'monospace' }}>Days: <strong>{fDays}</strong></span>}
                {fRate    && <span style={{ background:'white', padding:'1px 7px', borderRadius:'5px', fontFamily:'monospace' }}>Rate: <strong>{fRate}</strong></span>}
                {fMoney   && <span style={{ background:'white', padding:'1px 7px', borderRadius:'5px', fontFamily:'monospace' }}>Money: <strong>{fMoney}</strong></span>}
                {fCreated && <span style={{ background:'white', padding:'1px 7px', borderRadius:'5px' }}>Created: <strong>{fCreated}</strong></span>}
                <span style={{ marginLeft:'auto' }}>{t.results(filteredData.length)}</span>
              </div>
            )}
          </div>

          {/* ── Table ── */}
          <div style={{ background:'white', borderRadius:'16px', boxShadow:'0 2px 10px rgba(0,40,70,0.06)', overflow:'hidden', border:'1px solid #e2e8f0' }}>
            {isLoading ? (
              <div style={{ padding:'60px', textAlign:'center', color:'#64748b' }}>
                <span className="material-symbols-outlined" style={{ fontSize:'40px', marginBottom:'16px', display:'block', color:'#065f46', animation:'spin 2s linear infinite' }}>refresh</span>
                {t.loading}
              </div>
            ) : loadError ? (
              <div style={{ padding:'60px', textAlign:'center', color:'#ef4444' }}>
                <span className="material-symbols-outlined" style={{ fontSize:'40px', marginBottom:'16px', display:'block' }}>error</span>
                {t.failedLoad}
              </div>
            ) : paginatedData.length === 0 ? (
              <div style={{ padding:'60px', textAlign:'center', color:'#64748b' }}>
                <span className="material-symbols-outlined" style={{ fontSize:'48px', marginBottom:'16px', display:'block', color:'#94a3b8' }}>savings</span>
                {hasActiveFilters ? t.noMatch : t.noData}
                {hasActiveFilters && (
                  <button onClick={clearFilters} style={{ display:'block', margin:'14px auto 0', padding:'8px 20px', background:'#f1f5f9', border:'1px solid #e2e8f0', borderRadius:'8px', color:'#475569', cursor:'pointer', fontSize:'13px' }}>
                    {t.clearFilters}
                  </button>
                )}
              </div>
            ) : (
              <>
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse' }}>
                    <thead>
                      <tr style={{ background:'#lf8fafc', borderBottom:'2px solid #0a3b5c' }}>
                        {[t.colIndex, t.colFileId, t.colAppNo, t.colDateIn, t.colDateOut, t.colDealerFrom, t.colDealerTo, t.colDays, t.colRate, t.colMoney, t.colCreatedAt, t.colActions].map(col => (
                          <th key={col} style={{ padding:'12px 14px', textAlign:'center', fontWeight:'600', color:'#0a3b5c', fontSize:'10.5px', letterSpacing:'0.7px', whiteSpace:'nowrap' }}>{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedData.map((item, index) => {
                        const idx    = (currentPage-1)*itemsPerPage + index + 1;
                        const isEven = index % 2 === 0;
                        return (
                          <tr key={`${item.file_id}-${index}`}
                            style={{ borderBottom:'1px solid #f1f5f9', background: isEven ? 'white' : '#fafbfc', transition:'background 0.1s' }}
                            onMouseEnter={e => { e.currentTarget.style.background='#f0fdf4'; }}
                            onMouseLeave={e => { e.currentTarget.style.background= isEven ? 'white' : '#fafbfc'; }}
                          >
                            {/* # */}
                            <td style={{ padding:'10px 14px', color:'#cbd5e1', fontSize:'12px', fontWeight:'600', textAlign:'center' }}>{idx}</td>

                            {/* FILE ID */}
                            <td style={{ padding:'10px 14px' }}>
                              <div style={{ display:'inline-flex', alignItems:'center', gap:'5px', background:'#eef2ff', border:'1px solid #e0e7ff', borderRadius:'6px', padding:'3px 8px', maxWidth:'160px' }}>
                                <span className="material-symbols-outlined" style={{ fontSize:'11px', color:'#4f46e5', flexShrink:0 }}>folder</span>
                                <span style={{ fontSize:'11px', fontFamily:'monospace', color:'#3730a3', fontWeight:'600', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={item.file_id}>{item.file_id}</span>
                              </div>
                            </td>

                            {/* APP NO. */}
                            <td style={{ padding:'10px 14px' }}>
                              <div style={{ display:'inline-flex', alignItems:'center', gap:'4px', background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:'6px', padding:'3px 8px' }}>
                                <span className="material-symbols-outlined" style={{ fontSize:'11px', color:'#15803d', flexShrink:0 }}>tag</span>
                                <span style={{ fontSize:'11px', fontFamily:'monospace', color:'#166534', fontWeight:'600', whiteSpace:'nowrap' }}>{item.number_of_application}</span>
                              </div>
                            </td>

                            {/* DATE IN */}
                            <td style={{ padding:'10px 14px', textAlign:'center' }}>
                              <span style={{ display:'inline-flex', alignItems:'center', gap:'3px', fontFamily:'monospace', fontSize:'12px', fontWeight:'700', color:'#0369a1', background:'#e0f2fe', padding:'3px 7px', borderRadius:'6px', border:'1px solid #bae6fd', whiteSpace:'nowrap' }}>
                                <span className="material-symbols-outlined" style={{ fontSize:'11px' }}>login</span>
                                {formatDate(item.date_in)}
                              </span>
                            </td>

                            {/* DATE OUT */}
                            <td style={{ padding:'10px 14px', textAlign:'center' }}>
                              <span style={{ display:'inline-flex', alignItems:'center', gap:'3px', fontFamily:'monospace', fontSize:'12px', fontWeight:'700', color:'#c2410c', background:'#fff7ed', padding:'3px 7px', borderRadius:'6px', border:'1px solid #fed7aa', whiteSpace:'nowrap' }}>
                                <span className="material-symbols-outlined" style={{ fontSize:'11px' }}>logout</span>
                                {formatDate(item.date_out)}
                              </span>
                            </td>

                            {/* DEALER FROM */}
                            <td style={{ padding:'10px 14px' }}>
                              <div style={{ display:'flex', alignItems:'center', gap:'4px' }}>
                                <div style={{ width:'22px', height:'22px', background:'linear-gradient(135deg,#dbeafe,#bfdbfe)', borderRadius:'5px', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                                  <span className="material-symbols-outlined" style={{ fontSize:'12px', color:'#1d4ed8' }}>business</span>
                                </div>
                                <span style={{ fontSize:'12px', color:'#1e3a5f', fontWeight:'500', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:'100px' }} title={item.dealer_from}>{item.dealer_from}</span>
                              </div>
                            </td>

                            {/* DEALER TO */}
                            <td style={{ padding:'10px 14px' }}>
                              <div style={{ display:'flex', alignItems:'center', gap:'4px' }}>
                                <div style={{ width:'22px', height:'22px', background:'linear-gradient(135deg,#f3e8ff,#e9d5ff)', borderRadius:'5px', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                                  <span className="material-symbols-outlined" style={{ fontSize:'12px', color:'#7e22ce' }}>business</span>
                                </div>
                                <span style={{ fontSize:'12px', color:'#4c1d95', fontWeight:'500', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:'100px' }} title={item.dealer_to}>{item.dealer_to}</span>
                              </div>
                            </td>

                            {/* DAYS */}
                            <td style={{ padding:'10px 14px', textAlign:'center' }}>
                              <span style={{ display:'inline-flex', alignItems:'center', gap:'3px', fontFamily:'monospace', fontSize:'12px', fontWeight:'700', background:'#f0f9ff', color:'#0369a1', padding:'2px 7px', borderRadius:'6px', border:'1px solid #bae6fd', whiteSpace:'nowrap' }}>
                                <span className="material-symbols-outlined" style={{ fontSize:'11px' }}>today</span>
                                {fmtDays(item.days)}
                              </span>
                            </td>

                            {/* RATE */}
                            <td style={{ padding:'10px 14px', textAlign:'center' }}>
                              <span style={{ display:'inline-block', fontFamily:'monospace', fontSize:'12px', fontWeight:'700', background:'#fdf4ff', color:'#6d28d9', padding:'2px 7px', borderRadius:'6px', border:'1px solid #e9d5ff22', whiteSpace:'nowrap' }}>
                                {fmtRate(item.rate)}
                              </span>
                            </td>

                            {/* MONEY */}
                            <td style={{ padding:'10px 14px', textAlign:'right' }}>
                              <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', gap:'4px' }}>
                                <span className="material-symbols-outlined" style={{ fontSize:'11px', color:'#065f46' }}>payments</span>
                                <span style={{ fontSize:'12px', fontFamily:'monospace', fontWeight:'700', color:'#166534', whiteSpace:'nowrap' }}>{fmtMoney(item.money)}</span>
                              </div>
                            </td>

                            {/* CREATED AT */}
                            <td style={{ padding:'10px 14px' }}>
                              <div style={{ display:'flex', alignItems:'center', gap:'4px' }}>
                                <span className="material-symbols-outlined" style={{ fontSize:'11px', color:'#065f46', flexShrink:0 }}>schedule</span>
                                <span style={{ fontSize:'10px', fontFamily: item.created_at ? 'monospace' : 'inherit', color: item.created_at ? '#374151' : '#cbd5e1', fontWeight: item.created_at ? '500' : '400', whiteSpace:'nowrap' }}>
                                  {formatDateTime(item.created_at)}
                                </span>
                              </div>
                            </td>

                            {/* DELETE */}
                            <td style={{ padding:'10px 14px', textAlign:'center' }}>
                              <button onClick={() => openDeleteModal(item)}
                                style={{ padding:'4px 10px', fontSize:'11px', fontWeight:'500', background:'#fff5f5', color:'#dc2626', border:'1px solid #fecaca', borderRadius:'6px', cursor:'pointer', display:'inline-flex', alignItems:'center', gap:'3px', transition:'all 0.13s', whiteSpace:'nowrap' }}
                                onMouseEnter={e => { e.currentTarget.style.background='#dc2626'; e.currentTarget.style.color='white'; e.currentTarget.style.borderColor='#dc2626'; }}
                                onMouseLeave={e => { e.currentTarget.style.background='#fff5f5'; e.currentTarget.style.color='#dc2626'; e.currentTarget.style.borderColor='#fecaca'; }}>
                                <span className="material-symbols-outlined" style={{ fontSize:'12px' }}>delete</span>
                                {t.delete}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {filteredData.length > itemsPerPage && (
                  <div style={{ padding:'14px 20px', borderTop:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#f8fafc', flexWrap:'wrap', gap:'10px' }}>
                    <div style={{ fontSize:'12px', color:'#64748b' }}>
                      {t.showing((currentPage-1)*itemsPerPage+1, Math.min(currentPage*itemsPerPage, filteredData.length), filteredData.length)}
                    </div>
                    <div style={{ display:'flex', gap:'5px', alignItems:'center' }}>
                      <button onClick={() => setCurrentPage(p => p-1)} disabled={currentPage===1}
                        style={{ padding:'6px 10px', fontSize:'12px', fontWeight:'500', background: currentPage===1 ? '#f1f5f9' : 'white', color: currentPage===1 ? '#94a3b8' : '#065f46', border:'1px solid #e2e8f0', borderRadius:'6px', cursor: currentPage===1 ? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', gap:'3px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize:'13px' }}>chevron_left</span>{t.previous}
                      </button>
                      {Array.from({ length:totalPages },(_,i)=>i+1).map(page => {
                        const show = page===1||page===totalPages||(page>=currentPage-2&&page<=currentPage+2);
                        const ell  = page===currentPage-3||page===currentPage+3;
                        if (show) return (
                          <button key={page} onClick={() => setCurrentPage(page)} style={{ width:'30px', height:'30px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:'600', background: currentPage===page ? '#065f46' : 'white', color: currentPage===page ? 'white' : '#0f172a', border:`1px solid ${currentPage===page?'#065f46':'#e2e8f0'}`, borderRadius:'6px', cursor:'pointer' }}>
                            {page}
                          </button>
                        );
                        if (ell) return <span key={`e${page}`} style={{ width:'28px', textAlign:'center', color:'#94a3b8', fontSize:'12px' }}>…</span>;
                        return null;
                      })}
                      <button onClick={() => setCurrentPage(p => p+1)} disabled={currentPage===totalPages}
                        style={{ padding:'6px 10px', fontSize:'12px', fontWeight:'500', background: currentPage===totalPages ? '#f1f5f9' : 'white', color: currentPage===totalPages ? '#94a3b8' : '#065f46', border:'1px solid #e2e8f0', borderRadius:'6px', cursor: currentPage===totalPages ? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', gap:'3px' }}>
                        {t.next}<span className="material-symbols-outlined" style={{ fontSize:'13px' }}>chevron_right</span>
                      </button>
                    </div>
                    <div style={{ fontSize:'12px', color:'#64748b' }}>Page {currentPage} of {totalPages}</div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* ════════════════════════════ FOOTER ════════════════════════════ */}
      <footer style={{ width:'100%', background:'#0a2a40', borderTop:'3px solid #e9b741', boxSizing:'border-box' }}>
        <div style={{ width:'100%', maxWidth:'1600px', margin:'0 auto', padding:'40px 32px 28px', display:'grid', gridTemplateColumns: isMobile ? '1fr' : '280px repeat(4,1fr)', gap:'40px', alignItems:'start' }}>

          {/* Brand */}
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'14px' }}>
              <img src={CbuLogo} alt="CBU" style={{ width:'40px', height:'40px', objectFit:'contain', background:'white', borderRadius:'8px', padding:'4px', flexShrink:0 }} />
              <div style={{ color:'white', fontSize:'17px', fontWeight:'600', lineHeight:'1.4' }}>{t.bankName}</div>
            </div>
            <p style={{ fontSize:'13px', lineHeight:'1.6', color:'#6b8499', marginBottom:'18px' }}>{t.officialDesc}</p>
            <div style={{ display:'flex', gap:'12px', flexWrap:'wrap' }}>
              {[
                { src:facebook,  alt:'Facebook',  href:'https://www.facebook.com/centralbankuzbekistan/', w:32 },
                { src:telegram,  alt:'Telegram',  href:'https://t.me/centralbankuzbekistan',              w:34 },
                { src:linkedin,  alt:'LinkedIn',  href:'https://www.linkedin.com/company/centralbankuzbekistan/', w:36 },
                { src:twitter,   alt:'Twitter',   href:'https://x.com/cbuzbekistan',                      w:44 },
                { src:instagram, alt:'Instagram', href:'https://www.instagram.com/centralbankuzbekistan/', w:30 },
                { src:youtube,   alt:'YouTube',   href:'https://www.youtube.com/centralbankofuzbekistan',  w:34 },
              ].map(s => (
                <a key={s.alt} href={s.href} target="_blank" rel="noopener noreferrer"
                  style={{ width:'32px', height:'32px', borderRadius:'7px', display:'flex', alignItems:'center', justifyContent:'center', transition:'background 0.2s', background:'rgba(255,255,255,0.07)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.16)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.07)'; }}>
                  <img src={s.src} alt={s.alt} style={{ width:`${s.w}px`, height:`${s.w}px`, objectFit:'contain' }} />
                </a>
              ))}
            </div>
          </div>

          {/* Modules */}
          <div>
            <div style={{ color:'white', fontSize:'16px', fontWeight:'600', marginBottom:'16px', paddingBottom:'10px', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>{t.modules}</div>
            <ul style={{ listStyle:'none', padding:0, margin:0 }}>
              {NAV_PAGES.map(p => (
                <li key={p.path} style={{ marginBottom:'14px' }}>
                  <button onClick={() => navigate(p.path)} style={{ background:'none', border:'none', padding:0, display:'flex', alignItems:'center', gap:'6px', fontSize:'14px', color: p.path===currentPath ? '#e9b741' : '#8097a8', fontWeight: p.path===currentPath ? '600' : '400', cursor:'pointer', transition:'color 0.15s', width:'100%' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color='white'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color= p.path===currentPath ? '#e9b741' : '#8097a8'; }}>
                    <span className="material-symbols-outlined" style={{ fontSize:'15px' }}>{p.icon}</span>
                    {t[p.key as keyof typeof t] as string || p.key}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* About CBU */}
          <div>
            <div style={{ color:'white', fontSize:'16px', fontWeight:'600', marginBottom:'16px', paddingBottom:'10px', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>{t.aboutCbu}</div>
            <ul style={{ listStyle:'none', padding:0, margin:0 }}>
              {[
                { label:t.aboutCbu,     href:'https://cbu.uz/en/about/',                   icon:'info'        },
                { label:t.executiveB,   href:'https://cbu.uz/en/about/management/',        icon:'groups'      },
                { label:t.legislation,  href:'https://cbu.uz/en/documents/',               icon:'gavel'       },
                { label:t.publications, href:'https://cbu.uz/en/statistics/publications/', icon:'description' },
                { label:t.dataStats,    href:'https://cbu.uz/en/statistics/',              icon:'bar_chart'   },
              ].map(item => (
                <li key={item.href} style={{ marginBottom:'10px' }}>
                  <a href={item.href} target="_blank" rel="noopener noreferrer" style={{ display:'flex', alignItems:'center', gap:'7px', fontSize:'14px', color:'#8097a8', textDecoration:'none', transition:'color 0.15s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color='white'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color='#8097a8'; }}>
                    <span className="material-symbols-outlined" style={{ fontSize:'15px' }}>{item.icon}</span>
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <div style={{ color:'white', fontSize:'16px', fontWeight:'600', marginBottom:'16px', paddingBottom:'10px', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>{t.services}</div>
            <ul style={{ listStyle:'none', padding:0, margin:0 }}>
              {[
                { label:t.exchangeR,  href:'https://cbu.uz/en/arkhiv-kursov-valyut/',                 icon:'currency_exchange' },
                { label:t.policyR,    href:'https://cbu.uz/en/monetary-policy/refinancing-rate/',     icon:'percent'           },
                { label:t.paymentS,   href:'https://cbu.uz/en/payment-systems/',                      icon:'payments'          },
                { label:t.licensing,  href:'https://cbu.uz/en/credit-organizations/licensing/',       icon:'verified'          },
                { label:t.pressCenter,href:'https://cbu.uz/en/press_center/',                         icon:'newspaper'         },
              ].map(item => (
                <li key={item.href} style={{ marginBottom:'10px' }}>
                  <a href={item.href} target="_blank" rel="noopener noreferrer" style={{ display:'flex', alignItems:'center', gap:'7px', fontSize:'14px', color:'#8097a8', textDecoration:'none', transition:'color 0.15s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color='white'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color='#8097a8'; }}>
                    <span className="material-symbols-outlined" style={{ fontSize:'15px' }}>{item.icon}</span>
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <div style={{ color:'white', fontSize:'16px', fontWeight:'700', marginBottom:'16px', paddingBottom:'10px', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>{t.contact}</div>
            <ul style={{ listStyle:'none', padding:0, margin:0 }}>
              {[
                { label:'+998 71 212-62-05', href:'tel:+998712126205',                           icon:'call'        },
                { label:'+998 71 200-00-44', href:'tel:+998712000044',                           icon:'call'        },
                { label:'+998 71 233-35-09', href:'fax:+998712333509',                           icon:'fax'         },
                { label:'info@cbu.uz',        href:'mailto:info@cbu.uz',                         icon:'mail'        },
                { label:t.addressS,           href:'https://maps.app.goo.gl/4qDXnjgQoTwfWCg28', icon:'location_on' },
              ].map(item => (
                <li key={item.href} style={{ marginBottom:'10px' }}>
                  <a href={item.href} style={{ display:'flex', alignItems:'center', gap:'7px', fontSize:'14px', color:'#8097a8', textDecoration:'none', transition:'color 0.15s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color='white'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color='#8097a8'; }}>
                    <span className="material-symbols-outlined" style={{ fontSize:'15px' }}>{item.icon}</span>
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ borderTop:'1px solid rgba(255,255,255,0.06)', padding:'14px 32px' }}>
          <div style={{ width:'100%', maxWidth:'1600px', margin:'0 auto', display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:'12px', color:'#4a5c6a', flexWrap:'wrap', gap:'8px' }}>
            <span>{t.copyright}</span>
            <div style={{ display:'flex', gap:'20px' }}>
              {[
                { label:t.privacyPolicy, href:'https://cbu.uz/en/mobile-privacy/'              },
                { label:t.termsOfUse,    href:'https://cbu.uz/en/services/request-information/' },
              ].map(l => (
                <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer"
                  style={{ color:'#4a5c6a', textDecoration:'none', transition:'color 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color='white'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color='#4a5c6a'; }}>
                  {l.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* ════════════════════════════ DELETE MODAL ════════════════════════════ */}
      {isDeleteModalOpen && targetRow && (
        <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.55)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}
          onClick={() => { if(!isDeleting) setIsDeleteModalOpen(false); }}>
          <div style={{ background:'white', borderRadius:'20px', padding:'30px', width:'480px', maxWidth:'95vw', boxShadow:'0 24px 64px rgba(0,0,0,0.3)', border:'1px solid #e2e8f0' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'22px' }}>
              <h2 style={{ margin:0, fontSize:'18px', fontWeight:'700', color:'#065f46', display:'flex', alignItems:'center', gap:'8px' }}>
                <span className="material-symbols-outlined" style={{ fontSize:'20px', color:'#dc2626' }}>warning</span>
                {t.deleteTitle}
              </h2>
              <button onClick={() => { if(!isDeleting) setIsDeleteModalOpen(false); }} style={{ border:'none', background:'#f1f5f9', cursor:'pointer', color:'#64748b', width:'32px', height:'32px', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px' }}>×</button>
            </div>

            <div style={{ marginBottom:'16px', padding:'14px 16px', background:'#fef3c7', borderRadius:'12px', border:'1px solid #fcd34d' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'8px' }}>
                <span className="material-symbols-outlined" style={{ color:'#b45309', fontSize:'14px' }}>info</span>
                <strong style={{ color:'#0f172a', fontSize:'13px' }}>{t.deleteConfirm}</strong>
              </div>
              <div style={{ paddingLeft:'20px', fontSize:'12px', color:'#4b5563', lineHeight:'2' }}>
                {t.deleteBatchInfo(sameFileCount, targetRow.file_id)}
              </div>
            </div>

            <div style={{ marginBottom:'22px', padding:'16px', background:'#fef2f2', borderRadius:'12px', border:'1px solid #fee2e2' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'12px' }}>
                <span className="material-symbols-outlined" style={{ color:'#dc2626', fontSize:'14px' }}>info</span>
                <strong style={{ color:'#0f172a', fontSize:'13px' }}>Selected record details:</strong>
              </div>
              <div style={{ paddingLeft:'20px', fontSize:'12px', color:'#4b5563', lineHeight:'2', display:'grid', gridTemplateColumns:'1fr 1fr', rowGap:'4px', columnGap:'12px', textAlign: 'left' }}>
                <div>File ID: <strong style={{ fontFamily:'monospace', color:'#dc2626' }}>{targetRow.file_id}</strong></div>
                <div>App No.: <strong style={{ fontFamily:'monospace' }}>{targetRow.number_of_application}</strong></div>
                <div>Date In: <strong style={{ fontFamily:'monospace' }}>{formatDate(targetRow.date_in)}</strong></div>
                <div>Date Out: <strong style={{ fontFamily:'monospace' }}>{formatDate(targetRow.date_out)}</strong></div>
                <div>Dealer From: <strong>{targetRow.dealer_from}</strong></div>
                <div>Dealer To: <strong>{targetRow.dealer_to}</strong></div>
                <div>Days: <strong style={{ fontFamily:'monospace' }}>{fmtDays(targetRow.days)}</strong></div>
                <div>Rate: <strong style={{ fontFamily:'monospace' }}>{fmtRate(targetRow.rate)}</strong></div>
                <div style={{ gridColumn:'1 / -1' }}>Money: <strong style={{ fontFamily:'monospace' }}>{fmtMoney(targetRow.money)}</strong></div>
              </div>
              <p style={{ margin:'10px 0 0 20px', fontSize:'11px', color:'#dc2626', fontWeight:'600' }}>{t.deleteIrrev}</p>
            </div>

            <div style={{ display:'flex', gap:'10px', justifyContent:'center' }}>
              <button onClick={() => { if(!isDeleting) setIsDeleteModalOpen(false); }}
                style={{ padding:'10px 20px', fontSize:'13px', fontWeight:'500', background:'#f1f5f9', color:'#475569', border:'1px solid #e2e8f0', borderRadius:'10px', cursor:'pointer' }}>
                {t.cancel}
              </button>
              <button onClick={handleDelete} disabled={isDeleting}
                style={{ padding:'10px 20px', fontSize:'13px', fontWeight:'600', background: isDeleting ? '#94a3b8' : '#dc2626', color:'white', border:'none', borderRadius:'10px', cursor: isDeleting ? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', gap:'6px' }}>
                <span className="material-symbols-outlined" style={{ fontSize:'15px', animation: isDeleting ? 'spin 1.5s linear infinite' : 'none' }}>
                  {isDeleting ? 'hourglass_empty' : 'delete_forever'}
                </span>
                {isDeleting ? t.deleting : t.deleteBtn(sameFileCount)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Global styles ── */}
      <style>{`
        *{margin:0;padding:0;box-sizing:border-box;}
        html,body{width:100%;overflow-x:hidden;}
        body{font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;}
        #root{width:100%;}
        .material-symbols-outlined{font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24;}
        @keyframes spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}
        @keyframes slideIn{from{opacity:0;transform:translateX(20px);}to{opacity:1;transform:translateX(0);}}
        @keyframes dropIn{from{opacity:0;transform:translateY(-8px) scale(0.97);}to{opacity:1;transform:translateY(0) scale(1);}}
        @keyframes modalIn{from{opacity:0;transform:scale(0.93);}to{opacity:1;transform:scale(1);}}
        input:focus,select:focus{border-color:#065f46!important;box-shadow:0 0 0 3px rgba(6,95,70,0.1);}
        nav::-webkit-scrollbar{height:0;}
        button:not(:disabled):hover{transform:translateY(-1px);}
        button:active:not(:disabled){transform:translateY(0);}
      `}</style>
    </div>
  );
};

export default DepoDataPage;