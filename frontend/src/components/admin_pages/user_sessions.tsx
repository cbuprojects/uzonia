import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import CbuLogo from '../../assets/CBU_Logo.png';
import facebook from '../../assets/facebook.png';
import telegram from '../../assets/telegram.png';
import linkedin from '../../assets/linkedin.png';
import twitter from '../../assets/twitter.png';
import instagram from "../../assets/instagram.png";
import youtube from "../../assets/youtube.png";

// ─── Config ───────────────────────────────────────────────────────────────────

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const authHeader = () => `Bearer ${localStorage.getItem('session_id') ?? ''}`;

let isLoggingOut = false;

const doLogout = async () => {
  if (isLoggingOut) return;
  isLoggingOut = true;
  try {
    const sessionId = localStorage.getItem('session_id');
    if (sessionId) {
      await fetch(`${API_BASE_URL}/api/logout`, {
        method: 'POST',
        headers: { 'Authorization': authHeader(), 'Content-Type': 'application/json' },
      }).catch(err => console.error('Logout API call failed:', err));
    }
  } catch (error) {
    console.error('Logout error:', error);
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
      ...options.headers,
    },
  });
  if (res.status === 401 || res.status === 403) {
    localStorage.removeItem('session_id');
    sessionStorage.setItem("session_expired", "1");
    window.location.replace('/login');
    return new Promise<Response>(() => {});
  }
  return res;
};

// ─── i18n ─────────────────────────────────────────────────────────────────────

const TRANSLATIONS = {
  en: {
    bankName: 'The Central Bank of Uzbekistan',
    deptSubtitle: 'Department of Monetary Operations • Session Management',
    pageTitle: 'Session Management',
    pageDesc: 'Monitor and manage all active user sessions — view details, edit status, and revoke access',
    back: 'Back',
    totalSessions: 'Total Sessions',
    activeSessions: 'Active Sessions',
    expiredSessions: 'Expired',
    loggedOutSessions: 'Logged Out',
    colUsername: 'USERNAME',
    colFullName: 'FULL NAME',
    colIpAddress: 'IP ADDRESS',
    colStatus: 'STATUS',
    colLastLogin: 'LAST LOGIN',
    colCreatedAt: 'CREATED AT',
    colExpireTime: 'EXPIRES AT',
    colActions: 'ACTIONS',
    filterLabel: 'Filters:',
    phUsername: 'Username…',
    phFirstName: 'First name…',
    phLastName: 'Last name…',
    phIpAddress: 'IP address…',
    clearAll: 'Clear all',
    allStatuses: 'All Statuses',
    active: 'Active',
    expired: 'Expired',
    loggedOut: 'Logged Out',
    results: (n: number) => `${n} result${n !== 1 ? 's' : ''}`,
    loading: 'Loading sessions...',
    failedLoad: 'Failed to load sessions.',
    noMatch: 'No sessions match your filters.',
    noData: 'No sessions found.',
    clearFiltersBtn: 'Clear filters',
    showing: (from: number, to: number, total: number) => `Showing ${from} to ${to} of ${total} entries`,
    previous: 'Previous',
    next: 'Next',
    editSessionTitle: 'Edit Session',
    deleteSessionTitle: 'Delete Session',
    deleteConfirm: 'Are you sure you want to delete this session?',
    deleteWarning: '⚠️ This action cannot be undone.',
    statusLabel: 'Status',
    expireTimeLabel: 'Expire Time',
    cancel: 'Cancel',
    save: 'Save Changes',
    saving: 'Saving…',
    delete: 'Delete',
    deleting: 'Deleting…',
    savedSuccess: 'Session updated successfully!',
    deletedSuccess: 'Session deleted successfully!',
    saveFailed: 'Failed to save changes.',
    deleteFailed: 'Failed to delete session.',
    usersBtn: 'Users',
    sessionsBtn: 'Sessions',
    actionsBtn: 'Actions',
    signOut: 'Sign Out',
    department: 'Department',
    langConfirmTitle: 'Change Language',
    langConfirmMsg: (lang: string) => `Are you sure you want to switch the interface language to ${lang}?`,
    confirm: 'Yes, change',
    officialDesc: 'UZONIA - Interbank Operations, Calculations, and Data Processing Platform',
    aboutCbu: 'About CBU',
    executiveB: 'The Executive Board',
    legislation: 'Legislation',
    publications: 'Publications',
    dataStats: 'Data & Stats',
    services: 'Services',
    exchangeR: 'Exchange Rates',
    policyR: 'Policy Rate',
    paymentS: 'Payment Systems',
    licensing: 'Licensing',
    pressCenter: 'Press Centre',
    contact: 'Contact',
    addressS: 'Islam Karimov St. 6',
    modules: 'Modules',
    copyright: '© 2026 Central Bank of the Republic of Uzbekistan. All rights reserved.',
    privacyPolicy: 'Privacy Policy',
    termsOfUse: 'Terms of Use',
    calculations: 'Calculations',
    uploads: 'Uploads',
    repo: 'Repo',
    depo: 'Depo',
    data: 'Data',
    holidays: 'Holidays',
    noChanges: 'No changes detected.',
  },
  ru: {
    bankName: 'Центральный Банк Узбекистана',
    deptSubtitle: 'Департамент Mонетарных Oпераций • Управление сессиями',
    pageTitle: 'Управление сессиями',
    pageDesc: 'Мониторинг и управление всеми активными сессиями — просмотр, изменение статуса и отзыв доступа',
    back: 'Назад',
    totalSessions: 'Всего сессий',
    activeSessions: 'Активных',
    expiredSessions: 'Истёкших',
    loggedOutSessions: 'Вышедших',
    colUsername: 'ЛОГИН',
    colFullName: 'ФИО',
    colIpAddress: 'IP-АДРЕС',
    colStatus: 'СТАТУС',
    colLastLogin: 'ПОСЛЕДНИЙ ВХОД',
    colCreatedAt: 'СОЗДАНА',
    colExpireTime: 'ИСТЕКАЕТ',
    colActions: 'ДЕЙСТВИЯ',
    filterLabel: 'Фильтры:',
    phUsername: 'Логин…',
    phFirstName: 'Имя…',
    phLastName: 'Фамилия…',
    phIpAddress: 'IP-адрес…',
    clearAll: 'Очистить всё',
    allStatuses: 'Все статусы',
    active: 'Активна',
    expired: 'Истекла',
    loggedOut: 'Выход выполнен',
    results: (n: number) => `${n} запис${n === 1 ? 'ь' : n < 5 ? 'и' : 'ей'}`,
    loading: 'Загрузка сессий...',
    failedLoad: 'Ошибка загрузки.',
    noMatch: 'Сессии не найдены.',
    noData: 'Нет сессий.',
    clearFiltersBtn: 'Сбросить фильтры',
    showing: (from: number, to: number, total: number) => `Показано ${from}–${to} из ${total}`,
    previous: 'Назад',
    next: 'Вперёд',
    editSessionTitle: 'Редактировать сессию',
    deleteSessionTitle: 'Удалить сессию',
    deleteConfirm: 'Вы уверены, что хотите удалить эту сессию?',
    deleteWarning: '⚠️ Это действие нельзя отменить.',
    statusLabel: 'Статус',
    expireTimeLabel: 'Время истечения',
    cancel: 'Отмена',
    save: 'Сохранить',
    saving: 'Сохранение…',
    delete: 'Удалить',
    deleting: 'Удаление…',
    savedSuccess: 'Сессия обновлена!',
    deletedSuccess: 'Сессия удалена!',
    saveFailed: 'Ошибка сохранения.',
    deleteFailed: 'Ошибка удаления.',
    usersBtn: 'Пользователи',
    sessionsBtn: 'Сессии',
    actionsBtn: 'Действия',
    signOut: 'Выйти',
    department: 'Отдел',
    langConfirmTitle: 'Изменить язык',
    langConfirmMsg: (lang: string) => `Вы уверены, что хотите изменить язык интерфейса на ${lang}?`,
    confirm: 'Да, изменить',
    officialDesc: 'UZONIA – Платформа межбанковских операций, расчётов и обработки данных',
    aboutCbu: 'О ЦБУ',
    executiveB: 'Правление',
    legislation: 'Законодательство',
    publications: 'Публикации',
    dataStats: 'Данные & Статистика',
    services: 'Услуги',
    exchangeR: 'Курсы валют',
    policyR: 'Ключевая ставка',
    paymentS: 'Платёжные системы',
    licensing: 'Лицензирование',
    pressCenter: 'Пресс-центр',
    contact: 'Контакты',
    addressS: 'Улица Ислама Каримова, 6',
    modules: 'Модули',
    copyright: '© 2026 Центральный Банк Республики Узбекистан. Все права защищены.',
    privacyPolicy: 'Политика конфиденциальности',
    termsOfUse: 'Условия использования',
    calculations: 'Расчёты',
    uploads: 'Загрузки',
    repo: 'Репо',
    depo: 'Депо',
    data: 'Данные',
    holidays: 'Праздники',
    noChanges: 'Изменений нет.',
  },
  uz_c: {
    bankName: 'Ўзбекистон Марказий Банки',
    deptSubtitle: 'Монетар Oперациялар Департаменти • Сессияларни бошқариш',
    pageTitle: 'Сессияларни бошқариш',
    pageDesc: 'Барча фойдаланувчи сессияларини кузатиш ва бошқариш — кўриш, ҳолатни ўзгартириш, кириш ҳуқуқини бекор қилиш',
    back: 'Орқага',
    totalSessions: 'Жами сессиялар',
    activeSessions: 'Фаол',
    expiredSessions: 'Муддати ўтган',
    loggedOutSessions: 'Чиқилган',
    colUsername: 'ЛОГИН',
    colFullName: 'ФИО',
    colIpAddress: 'IP-МАНЗИЛ',
    colStatus: 'ҲОЛАТ',
    colLastLogin: 'ОХИРГИ КИРИШ',
    colCreatedAt: 'ЯРАТИЛГАН',
    colExpireTime: 'МУДДАТ',
    colActions: 'АМАЛЛАР',
    filterLabel: 'Фильтрлар:',
    phUsername: 'Логин…',
    phFirstName: 'Исм…',
    phLastName: 'Фамилия…',
    phIpAddress: 'IP-манзил…',
    clearAll: 'Барчасини тозалаш',
    allStatuses: 'Барча ҳолатлар',
    active: 'Фаол',
    expired: 'Муддати ўтган',
    loggedOut: 'Чиқилган',
    results: (n: number) => `${n} та натижа`,
    loading: 'Сессиялар юкланмоқда...',
    failedLoad: 'Юклашда хато.',
    noMatch: 'Топилмади.',
    noData: 'Сессиялар йўқ.',
    clearFiltersBtn: 'Фильтрларни тозалаш',
    showing: (from: number, to: number, total: number) => `${total} тадан ${from}–${to} кўрсатилмоқда`,
    previous: 'Олдинги',
    next: 'Кейинги',
    editSessionTitle: 'Сессияни таҳрирлаш',
    deleteSessionTitle: 'Сессияни ўчириш',
    deleteConfirm: 'Ушбу сессияни ўчиришга ишончингиз комилми?',
    deleteWarning: '⚠️ Бу амални қайтариб бўлмайди.',
    statusLabel: 'Ҳолат',
    expireTimeLabel: 'Муддат вақти',
    cancel: 'Бекор қилиш',
    save: 'Сақлаш',
    saving: 'Сақланмоқда…',
    delete: 'Ўчириш',
    deleting: 'Ўчирилмоқда…',
    savedSuccess: 'Сессия янгиланди!',
    deletedSuccess: 'Сессия ўчирилди!',
    saveFailed: 'Сақлашда хато.',
    deleteFailed: 'Ўчиришда хато.',
    usersBtn: 'Фойдаланувчилар',
    sessionsBtn: 'Сессиялар',
    actionsBtn: 'Ҳаракатлар',
    signOut: 'Чиқиш',
    department: 'Бўлим',
    langConfirmTitle: 'Тилни ўзгартириш',
    langConfirmMsg: (lang: string) => `Интерфейс тилини ${lang} тилига ўзгартиришга ишончингиз комилми?`,
    confirm: 'Ҳа, ўзгартириш',
    officialDesc: 'UZONIA – Банклараро операциялар, ҳисоб-китоблар ва маълумотларни қайта ишлаш платформаси',
    aboutCbu: 'МБ Ҳақида',
    executiveB: 'Бошқарув кенгаши',
    legislation: 'Қонунчилик',
    publications: 'Публикациялар',
    dataStats: 'Mаълумотлар & Статистика',
    services: 'Хизматлар',
    exchangeR: 'Валюта курслари',
    policyR: 'Асосий ставка',
    paymentS: 'Тўлов тизимлари',
    licensing: 'Лицензиялаш',
    pressCenter: 'Ахборот хизмати',
    contact: 'Боғланиш',
    addressS: 'Ислом Каримов Kўчаси, 6',
    modules: 'Модуллар',
    copyright: '© 2026 Ўзбекистон Республикаси Марказий Банки. Барча ҳуқуқлар ҳимояланган.',
    privacyPolicy: 'Махфийлик сиёсати',
    termsOfUse: 'Фойдаланиш шартлари',
    calculations: 'Ҳисоб-китоб',
    uploads: 'Юклашлар',
    repo: 'Репо',
    depo: 'Депо',
    data: 'Маълумотлар',
    holidays: 'Байрамлар',
    noChanges: 'Ўзгаришлар йўқ.',
  },
  uz_l: {
    bankName: "O'zbekiston Markaziy Banki",
    deptSubtitle: 'Monetar Operatsiyalar Departamenti • Sessiyalarni boshqarish',
    pageTitle: "Sessiyalarni boshqarish",
    pageDesc: "Barcha foydalanuvchi sessiyalarini kuzatish va boshqarish — ko'rish, holatni o'zgartirish, kirishni bekor qilish",
    back: 'Orqaga',
    totalSessions: 'Jami sessiyalar',
    activeSessions: 'Faol',
    expiredSessions: "Muddati o'tgan",
    loggedOutSessions: 'Chiqilgan',
    colUsername: 'LOGIN',
    colFullName: 'FIO',
    colIpAddress: 'IP-MANZIL',
    colStatus: 'HOLAT',
    colLastLogin: 'OXIRGI KIRISH',
    colCreatedAt: 'YARATILGAN',
    colExpireTime: 'MUDDAT',
    colActions: 'AMALLAR',
    filterLabel: 'Filtrlar:',
    phUsername: 'Login…',
    phFirstName: 'Ism…',
    phLastName: 'Familiya…',
    phIpAddress: 'IP-manzil…',
    clearAll: 'Barchasini tozalash',
    allStatuses: 'Barcha holatlar',
    active: 'Faol',
    expired: "Muddati o'tgan",
    loggedOut: 'Chiqilgan',
    results: (n: number) => `${n} ta natija`,
    loading: 'Sessiyalar yuklanmoqda...',
    failedLoad: 'Yuklashda xato.',
    noMatch: 'Topilmadi.',
    noData: "Sessiyalar yo'q.",
    clearFiltersBtn: 'Filtrlarni tozalash',
    showing: (from: number, to: number, total: number) => `${total} tadan ${from}–${to} ko'rsatilmoqda`,
    previous: 'Oldingi',
    next: 'Keyingi',
    editSessionTitle: 'Sessiyani tahrirlash',
    deleteSessionTitle: "Sessiyani o'chirish",
    deleteConfirm: "Ushbu sessiyani o'chirishga ishonchingiz komilmi?",
    deleteWarning: "⚠️ Bu amalni qaytarib bo'lmaydi.",
    statusLabel: 'Holat',
    expireTimeLabel: 'Muddat vaqti',
    cancel: 'Bekor qilish',
    save: 'Saqlash',
    saving: 'Saqlanmoqda…',
    delete: "O'chirish",
    deleting: "O'chirilmoqda…",
    savedSuccess: 'Sessiya yangilandi!',
    deletedSuccess: "Sessiya o'chirildi!",
    saveFailed: 'Saqlashda xato.',
    deleteFailed: "O'chirishda xato.",
    usersBtn: 'Foydalanuvchilar',
    sessionsBtn: 'Sessiyalar',
    actionsBtn: 'Harakatlar',
    signOut: 'Chiqish',
    department: "Bo'lim",
    langConfirmTitle: "Tilni o'zgartirish",
    langConfirmMsg: (lang: string) => `Interfeys tilini ${lang} tiliga o'zgartirishga ishonchingiz komilmi?`,
    confirm: "Ha, o'zgartirish",
    officialDesc: 'UZONIA – Banklararo operatsiyalar, hisob-kitoblar va ma’lumotlarni qayta ishlash platformasi',
    aboutCbu: "MBU Haqida",
    executiveB: 'Boshqaruv kengashi',
    legislation: 'Qonunchilik',
    publications: 'Publikatsiyalar',
    dataStats: "Ma'lumotlar & Statistika",
    services: 'Xizmatlar',
    exchangeR: 'Valyuta kurslari',
    policyR: 'Asosiy stavka',
    paymentS: 'To‘lov tizimlari',
    licensing: 'Litsenziyalash',
    pressCenter: 'Axborot xizmati',
    contact: "Bog'lanish",
    addressS: 'Islom Karimov Ko‘chasi, 6',
    modules: 'Modullar',
    copyright: "© 2026 O'zbekiston Respublikasi Markaziy Banki. Barcha huquqlar himoyalangan.",
    privacyPolicy: 'Maxfiylik siyosati',
    termsOfUse: 'Foydalanish shartlari',
    calculations: "Hisob-kitob",
    uploads: 'Yuklamalar',
    repo: 'Repo',
    depo: 'Depo',
    data: "Ma'lumotlar",
    holidays: 'Bayramlar',
    noChanges: "O'zgarishlar yo'q.",
  },
};

const LANG_LABELS = { en: 'EN', ru: 'RU', uz_c: 'УЗ', uz_l: 'ЎЗ' };
const LANG_NAMES  = { en: 'English', ru: 'Русский', uz_c: 'Ўзбекча', uz_l: "O'zbekcha" };

type LangKey = keyof typeof TRANSLATIONS;

const STATUS_OPTIONS = ['active', 'expired', 'logged_out'] as const;
type SessionStatus = typeof STATUS_OPTIONS[number];

// Navigation pages configuration
const NAV_PAGES = [
  { key: 'calculations', icon: 'calculate',       path: '/calculations' },
  { key: 'uploads',      icon: 'upload_file',     path: '/uploads'      },
  { key: 'repo',         icon: 'account_balance', path: '/repo'         },
  { key: 'depo',         icon: 'savings',         path: '/depo'         },
  { key: 'data',         icon: 'database',        path: '/data'         },
  { key: 'holidays',     icon: 'calendar_month',  path: '/holidays'     },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface SessionRecord {
  session_id: string;
  username: string;
  first_name: string;
  last_name: string;
  ip_address: string;
  status: SessionStatus;
  last_login: string;
  created_at: string;
  expire_time: string;
}

interface CurrentUser {
  user_id: string;
  username: string;
  first_name: string;
  last_name: string;
  department: string;
  language: string;
  is_active: boolean;
  is_admin: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

const AdminSessionsPage = () => {
  const navigate = useNavigate();
  const currentPath = '/user_sessions';

  // ── Responsive ───────────────────────────────────────────────────────────
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isTablet, setIsTablet] = useState(window.innerWidth <= 1024);

  useEffect(() => {
    const onResize = () => {
      setIsMobile(window.innerWidth <= 768);
      setIsTablet(window.innerWidth <= 1024);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ── State ─────────────────────────────────────────────────────────────────
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [sessions, setSessions]       = useState<SessionRecord[]>([]);
  const [lang, setLang]               = useState<LangKey>('en');
  const [pendingLang, setPendingLang] = useState<LangKey | null>(null);
  const [isLoading, setIsLoading]     = useState(true);
  const [error, setError]             = useState<string | null>(null);

  const t = TRANSLATIONS[lang] ?? TRANSLATIONS.en;

  // ── User dropdown ─────────────────────────────────────────────────────────
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Fetch data ────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const res = await apiFetch('/api/get_all_users_sessions');
      if (!res || !(res as Response).ok) throw new Error(`HTTP ${(res as Response)?.status ?? 'unknown'}`);
      const data = await (res as Response).json();
      setSessions(data.data ?? []);
      setCurrentUser(data.admin);
      if (data.admin?.language && TRANSLATIONS[data.admin.language as LangKey]) {
        setLang(data.admin.language as LangKey);
      }
      setError(null);
    } catch {
      setError(t.failedLoad);
    } finally {
      setIsLoading(false);
    }
  }, [t.failedLoad]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const id = setInterval(() => fetchData(), 60000);
    return () => clearInterval(id);
  }, [fetchData]);

  // ── Language change ───────────────────────────────────────────────────────
  const applyLanguageChange = useCallback(async (newLang: LangKey) => {
    setPendingLang(null);
    try {
      const res = await apiFetch(`/api/update_language?language=${newLang}`, { method: 'PUT' });
      if (!res || !(res as Response).ok) return;
      const data = await (res as Response).json();
      setLang(newLang);
      setCurrentUser(data.user);
    } catch (err) {
      console.error('Failed to update language:', err);
    }
  }, []);

  const getInitials = (u: CurrentUser | null) => {
    if (!u) return '??';
    const f = u.first_name?.[0] ?? '';
    const l = u.last_name?.[0] ?? '';
    return (f + l).toUpperCase() || u.username?.[0]?.toUpperCase() || '?';
  };

  // ── Filters ───────────────────────────────────────────────────────────────
  const [fUsername,   setFUsername]   = useState('');
  const [fFirstName,  setFFirstName]  = useState('');
  const [fLastName,   setFLastName]   = useState('');
  const [fIpAddress,  setFIpAddress]  = useState('');
  const [fStatus,     setFStatus]     = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // ── Modals ────────────────────────────────────────────────────────────────
  const [editModal,   setEditModal]   = useState<SessionRecord | null>(null);
  const [deleteModal, setDeleteModal] = useState<SessionRecord | null>(null);

  // Edit form state
  const [editForm, setEditForm] = useState<{ status: SessionStatus; expire_time: string }>({
    status: 'active',
    expire_time: '',
  });

  // Loading states
  const [isSaving,   setIsSaving]   = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Toast ─────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const showToast = (text: string, type: 'success' | 'error') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Font loading ──────────────────────────────────────────────────────────
  useEffect(() => {
    const links = [
      'https://fonts.googleapis.com/icon?family=Material+Symbols+Outlined',
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    ];
    links.forEach(href => {
      if (!document.querySelector(`link[href="${href}"]`)) {
        const l = document.createElement('link');
        l.href = href; l.rel = 'stylesheet';
        document.head.appendChild(l);
      }
    });
  }, []);

  // ── Open edit modal ───────────────────────────────────────────────────────
  const openEditModal = useCallback((s: SessionRecord) => {
    let expireLocal = '';
    if (s.expire_time) {
      try {
        const d = new Date(s.expire_time);
        expireLocal = d.toISOString().slice(0, 16);
      } catch {
        expireLocal = '';
      }
    }
    setEditForm({ status: s.status, expire_time: expireLocal });
    setEditModal(s);
  }, []);

  // ── Detect edit changes ───────────────────────────────────────────────────
  const hasChanges = useMemo(() => {
    if (!editModal) return false;
    let originalExpire = '';
    if (editModal.expire_time) {
      try {
        originalExpire = new Date(editModal.expire_time).toISOString().slice(0, 16);
      } catch { originalExpire = ''; }
    }
    return editForm.status !== editModal.status || editForm.expire_time !== originalExpire;
  }, [editForm, editModal]);

  // ── Save edit ─────────────────────────────────────────────────────────────
  const handleSaveEdit = async () => {
    if (!editModal || !hasChanges) return;
    setIsSaving(true);
    try {
      const body = {
        session_id:  editModal.session_id,
        status:      editForm.status,
        expire_time: editForm.expire_time ? new Date(editForm.expire_time).toISOString() : null,
      };
      const res = await apiFetch('/api/edit_session_details', { method: 'PUT', body: JSON.stringify(body) });
      if (!res || !(res as Response).ok) { const e = await (res as Response).json(); throw new Error(e.detail); }
      setEditModal(null);
      await fetchData();
      showToast(t.savedSuccess, 'success');
    } catch (err: any) {
      showToast(err.message || t.saveFailed, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Delete session ────────────────────────────────────────────────────────
  const handleDeleteSession = async () => {
    if (!deleteModal) return;
    setIsDeleting(true);
    try {
      const body = { session_id: deleteModal.session_id };
      const res = await apiFetch('/api/delete_session', { method: 'DELETE', body: JSON.stringify(body) });
      if (!res || !(res as Response).ok) { const e = await (res as Response).json(); throw new Error(e.detail); }
      setDeleteModal(null);
      await fetchData();
      showToast(t.deletedSuccess, 'success');
    } catch (err: any) {
      showToast(err.message || t.deleteFailed, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Derived data ──────────────────────────────────────────────────────────
  const filteredSessions = useMemo(() => {
    let f = [...sessions];
    if (fUsername.trim())  f = f.filter(s => s.username.toLowerCase().includes(fUsername.trim().toLowerCase()));
    if (fFirstName.trim()) f = f.filter(s => s.first_name.toLowerCase().includes(fFirstName.trim().toLowerCase()));
    if (fLastName.trim())  f = f.filter(s => s.last_name.toLowerCase().includes(fLastName.trim().toLowerCase()));
    if (fIpAddress.trim()) f = f.filter(s => s.ip_address?.toLowerCase().includes(fIpAddress.trim().toLowerCase()));
    if (fStatus)           f = f.filter(s => s.status === fStatus);
    return f;
  }, [sessions, fUsername, fFirstName, fLastName, fIpAddress, fStatus]);

  const stats = useMemo(() => ({
    total:     sessions.length,
    active:    sessions.filter(s => s.status === 'active').length,
    expired:   sessions.filter(s => s.status === 'expired').length,
    loggedOut: sessions.filter(s => s.status === 'logged_out').length,
  }), [sessions]);

  const hasActiveFilters = fUsername || fFirstName || fLastName || fIpAddress || fStatus;
  const totalPages = Math.ceil(filteredSessions.length / itemsPerPage);
  const paginatedSessions = useMemo(() =>
    filteredSessions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage),
    [filteredSessions, currentPage]
  );

  useEffect(() => { setCurrentPage(1); }, [fUsername, fFirstName, fLastName, fIpAddress, fStatus]);

  const handleClearFilters = useCallback(() => {
    setFUsername(''); setFFirstName(''); setFLastName(''); setFIpAddress(''); setFStatus('');
  }, []);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleString('en-GB', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch { return dateStr; }
  };

  // ── Status badge ──────────────────────────────────────────────────────────
  const StatusBadge = ({ status }: { status: SessionStatus }) => {
    const cfg: Record<SessionStatus, { bg: string; color: string; icon: string; label: string }> = {
      active:     { bg: '#d1fae5', color: '#065f46', icon: 'check_circle',    label: t.active     },
      expired:    { bg: '#fef9c3', color: '#854d0e', icon: 'schedule',        label: t.expired    },
      logged_out: { bg: '#f1f5f9', color: '#64748b', icon: 'logout',          label: t.loggedOut  },
    };
    const c = cfg[status] ?? cfg.expired;
    return (
      <span style={{
        padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600',
        background: c.bg, color: c.color,
        display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap',
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>{c.icon}</span>
        {c.label}
      </span>
    );
  };

  // ── Navigation button component ───────────────────────────────────────────
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
      onMouseEnter={e=>{ if(!active){e.currentTarget.style.background='rgba(255,255,255,0.10)'; e.currentTarget.style.color='white'; }}}
      onMouseLeave={e=>{ if(!active){e.currentTarget.style.background='transparent';              e.currentTarget.style.color='rgba(255,255,255,0.65)'; }}}
      >
        <span className="material-symbols-outlined" style={{ fontSize:'14px' }}>{page.icon}</span>
        {!isMobile && label}
      </button>
    );
  };

  // ── Shared styles ─────────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', fontSize: '13px',
    background: '#f8fafc', color: '#0f172a', border: '1px solid #e2e8f0',
    borderRadius: '8px', outline: 'none', boxSizing: 'border-box',
  };
  const modalInputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', fontSize: '14px',
    background: '#f8fafc', color: '#0f172a', border: '1px solid #e2e8f0',
    borderRadius: '10px', outline: 'none', boxSizing: 'border-box',
    fontFamily: 'inherit',
  };
  const labelStyle: React.CSSProperties = {
    fontSize: '12px', fontWeight: '600', color: '#374151',
    textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', display: 'block',
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh', width: '100%', margin: 0, padding: 0,
      display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc',
      fontFamily: '"Inter", "Segoe UI", system-ui, -apple-system, sans-serif',
    }}>

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: 'fixed', top: '24px', right: '24px', zIndex: 2000,
          background: toast.type === 'success' ? '#065f46' : '#991b1b',
          color: 'white', padding: '14px 20px', borderRadius: '12px',
          display: 'flex', alignItems: 'center', gap: '10px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)', fontSize: '14px', fontWeight: '500',
          animation: 'slideIn 0.3s ease',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
            {toast.type === 'success' ? 'check_circle' : 'error'}
          </span>
          {toast.text}
        </div>
      )}

      {/* ── Language Confirm Modal ── */}
      {pendingLang && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(7,30,46,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 500, backdropFilter: 'blur(4px)',
        }} onClick={() => setPendingLang(null)}>
          <div style={{
            background: 'white', borderRadius: '20px', padding: '32px 28px',
            maxWidth: '380px', width: '90%',
            boxShadow: '0 32px 64px rgba(0,0,0,0.25)', animation: 'modalIn 0.2s ease',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ width: '56px', height: '56px', background: '#e8f0fe', borderRadius: '16px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '28px', color: '#0a3b5c' }}>language</span>
              </div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0a3b5c' }}>{t.langConfirmTitle}</h3>
              <p style={{ margin: '8px 0 0', fontSize: '14px', color: '#64748b', lineHeight: '1.5' }}>
                {t.langConfirmMsg(LANG_NAMES[pendingLang])}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setPendingLang(null)} style={{ flex: 1, padding: '11px', background: '#f1f5f9', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', color: '#64748b', cursor: 'pointer' }}>
                {t.cancel}
              </button>
              <button onClick={() => applyLanguageChange(pendingLang)} style={{ flex: 1, padding: '11px', background: 'linear-gradient(135deg,#0a3b5c,#1a5080)', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', color: 'white', cursor: 'pointer' }}>
                {t.confirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════ HEADER ════════════════════════════ */}
      <header style={{
        width: '100%',
        background: 'linear-gradient(135deg, #0a3b5c 0%, #1a4b70 100%)',
        boxShadow: '0 4px 20px rgba(0,40,70,0.18)',
        borderBottom: '3px solid #e9b741',
        boxSizing: 'border-box',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: isMobile ? '0 12px' : '0 20px',
          height: '60px',
          minWidth: 0,
        }}>
          {/* Logo + title */}
          <div onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0, cursor: 'pointer' }}>
            <div style={{ width: '44px', height: '44px', background: 'white', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.12)', padding: '4px', flexShrink: 0 }}>
              <img src={CbuLogo} alt="CBU Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            {!isMobile && (
              <div style={{ lineHeight: '1.4' }}>
                <div style={{ fontSize: '18px', fontWeight: '700', color: 'white' }}>{t.bankName}</div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>{t.deptSubtitle}</div>
              </div>
            )}
          </div>

          {/* Divider */}
          {!isMobile && <div style={{ width: '1px', height: '28px', background: 'rgba(255,255,255,0.15)', flexShrink: 0 }} />}

          {/* Nav tabs */}
          <div style={{ padding: '0 10px', overflowX: 'auto' }}>
            <nav style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              height: '40px',
              minWidth: 'max-content',
              flexWrap: 'nowrap',
            }}>
              {NAV_PAGES.map(p => <NavBtn key={p.path} page={p} />)}
            </nav>
          </div>

          {/* Spacer */}
          <div style={{ flex: 1, minWidth: 0 }} />

          {/* RIGHT SIDE: lang + avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexShrink: 0 }}>
            {/* Language switcher */}
            <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '8px', padding: '4px', border: '1px solid rgba(255,255,255,0.12)', flexShrink: 0 }}>
              {(Object.entries(LANG_LABELS) as [LangKey, string][]).map(([key, label]) => (
                <button key={key}
                  onClick={() => key !== lang && setPendingLang(key)}
                  style={{
                    background: lang === key ? '#e9b741' : 'transparent',
                    color: lang === key ? '#0a2a40' : 'rgba(255,255,255,0.75)',
                    border: 'none', borderRadius: '6px',
                    padding: '4px 8px',
                    fontSize: '11px', fontWeight: '600',
                    cursor: lang === key ? 'default' : 'pointer', transition: 'all 0.18s',
                    minWidth: '26px',
                  }}
                  onMouseEnter={e=>{ if(lang!==key) e.currentTarget.style.background='rgba(255,255,255,0.15)'; }}
                  onMouseLeave={e=>{ if(lang!==key) e.currentTarget.style.background='transparent'; }}
                >{label}</button>
              ))}
            </div>

            {/* User avatar + dropdown with admin buttons */}
            <div ref={userDropdownRef} style={{ position: 'relative', flexShrink: 0 }}>
              <button onClick={() => setUserDropdownOpen(o => !o)} style={{
                background: 'rgba(255,255,255,0.1)', border: '2px solid rgba(233,183,65,0.5)',
                borderRadius: '50%', width: '44px', height: '44px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'all 0.2s',
                color: 'white', fontSize: '18px', fontWeight: '700',
              }}
              onMouseEnter={e=>{ e.currentTarget.style.borderColor='#e9b741'; e.currentTarget.style.background='rgba(233,183,65,0.2)'; }}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor='rgba(233,183,65,0.5)'; e.currentTarget.style.background='rgba(255,255,255,0.1)'; }}
              >
                {getInitials(currentUser)}
              </button>

              {/* Dropdown */}
              {userDropdownOpen && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                  background: 'white', borderRadius: '16px', minWidth: '260px',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.18)', overflow: 'hidden',
                  border: '1px solid #e2e8f0', zIndex: 200, animation: 'dropIn 0.18s ease',
                }}>
                  <div style={{ padding: '20px', borderBottom: '1px solid #f1f5f9', background: 'linear-gradient(135deg,#f8fafc,#eef2f7)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '48px', height: '48px', borderRadius: '50%',
                        background: 'linear-gradient(135deg,#0a3b5c,#1a5080)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontSize: '18px', fontWeight: '700', flexShrink: 0,
                        border: '3px solid #e9b741',
                      }}>
                        {getInitials(currentUser)}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: '700', color: '#0a3b5c', fontSize: '15px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : '—'}
                        </div>
                        <div style={{ color: '#64748b', fontSize: '12px', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          @{currentUser?.username ?? '—'}
                        </div>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '6px', padding: '3px 10px', background: '#e8f0fe', borderRadius: '20px', fontSize: '11px', color: '#0a3b5c', fontWeight: '600' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>domain</span>
                          {currentUser?.department ?? t.department}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Admin Section */}
                  {currentUser?.is_admin && (
                    <div style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ padding: '4px 8px', marginBottom: '4px', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Administration
                      </div>
                      {[
                        { icon: 'group', label: t.usersBtn, route: '/users_data', color: '#3b82f6', bg: '#eff6ff' },
                        { icon: 'manage_history', label: t.sessionsBtn, route: '/user_sessions', color: '#8b5cf6', bg: '#f5f3ff' },
                        { icon: 'timeline', label: t.actionsBtn, route: '/user_actions', color: '#f59e0b', bg: '#fffbeb' },
                      ].map(({ icon, label, route, color, bg }) => (
                        <button key={route} onClick={()=>{ navigate(route); setUserDropdownOpen(false); }} style={{
                          width:'100%', background:'none', border:'none', textAlign:'left',
                          padding:'10px 12px', borderRadius:'10px', cursor:'pointer',
                          display:'flex', alignItems:'center', gap:'12px',
                          color:'#1f2937', fontSize:'13px', fontWeight:'500',
                          transition:'all 0.2s', marginBottom:'2px',
                        }}
                        onMouseEnter={e=>{ e.currentTarget.style.background=bg; const iconSpan = e.currentTarget.querySelector('.admin-icon') as HTMLElement; if(iconSpan) iconSpan.style.transform = 'scale(1.1)'; }}
                        onMouseLeave={e=>{ e.currentTarget.style.background='none'; const iconSpan = e.currentTarget.querySelector('.admin-icon') as HTMLElement; if(iconSpan) iconSpan.style.transform = 'scale(1)'; }}>
                          <span className="material-symbols-outlined admin-icon" style={{ fontSize:'20px', color, transition:'transform 0.2s' }}>{icon}</span>
                          <span style={{ flex:1 }}>{label}</span>
                          <span className="material-symbols-outlined" style={{ fontSize:'16px', color:'#cbd5e1' }}>chevron_right</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Sign out */}
                  <div style={{ padding: '8px 12px' }}>
                    <button onClick={() => doLogout()} style={{
                      width: '100%', background: 'none', border: 'none', textAlign: 'left',
                      padding: '10px 12px', borderRadius: '10px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '12px',
                      color: '#dc2626', fontSize: '13px', fontWeight: '500',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={e=>{ e.currentTarget.style.background='#fef2f2'; }}
                    onMouseLeave={e=>{ e.currentTarget.style.background='none'; }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>logout</span>
                      <span>{t.signOut}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── Hero Bar ── */}
      <div style={{
        background: 'linear-gradient(135deg, #f1f5f9 0%, #e4eaf1 100%)',
        padding: isMobile ? '14px 16px' : '16px 32px',
        borderBottom: '1px solid #dde3e9', width: '100%', boxSizing: 'border-box',
      }}>
        <div style={{
          width: '100%', maxWidth: '1600px', margin: '0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '12px' : '0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '28px', color: '#0a3b5c' }}>manage_history</span>
            <div>
              <h3 style={{ margin: 0, fontSize: isMobile ? '15px' : '16px', fontWeight: '500', color: '#0a3b5c' }}>{t.pageTitle}</h3>
              <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#4a5c6a' }}>{t.pageDesc}</p>
            </div>
          </div>
          <button onClick={() => window.history.back()} style={{
            background: 'rgba(10,59,92,0.08)', border: '1px solid rgba(10,59,92,0.15)',
            color: '#0a3b5c', borderRadius: '10px', padding: '8px 16px',
            display: 'flex', alignItems: 'center', gap: '6px',
            fontSize: '13px', fontWeight: '500', cursor: 'pointer',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_back</span>
            {t.back}
          </button>
        </div>
      </div>

      {/* ── Main ── */}
      <main style={{
        flex: 1, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: isMobile ? '20px 16px' : '32px', background: '#f8fafc', boxSizing: 'border-box',
      }}>
        <div style={{ width: '100%', maxWidth: '1600px', margin: '0 auto' }}>

          {/* ── Stats ── */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
            {[
              { label: t.totalSessions,    value: stats.total,     color: '#0a3b5c', iconBg: '#e2e8f0', icon: 'manage_history' },
              { label: t.activeSessions,   value: stats.active,    color: '#065f46', iconBg: '#d1fae5', icon: 'check_circle'   },
              { label: t.expiredSessions,  value: stats.expired,   color: '#854d0e', iconBg: '#fef9c3', icon: 'schedule'       },
              { label: t.loggedOutSessions,value: stats.loggedOut, color: '#475569', iconBg: '#f1f5f9', icon: 'logout'         },
            ].map(s => (
              <div key={s.label} style={{
                background: 'white', padding: '18px 20px', borderRadius: '16px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0',
                display: 'flex', alignItems: 'center', gap: '14px',
              }}>
                <div style={{ width: '44px', height: '44px', background: s.iconBg, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '22px', color: s.color }}>{s.icon}</span>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '2px' }}>{s.label}</div>
                  <div style={{ fontSize: '26px', fontWeight: '700', color: s.color }}>{s.value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Filter bar ── */}
          <div style={{
            background: 'white', padding: '20px 24px', borderRadius: '20px',
            marginBottom: '24px', boxShadow: '0 8px 30px rgba(0,40,70,0.08)', border: '1px solid #e2e8f0',
          }}>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#0a3b5c', flexShrink: 0 }}>filter_alt</span>
              <span style={{ fontSize: '13px', fontWeight: '500', color: '#374151', flexShrink: 0 }}>{t.filterLabel}</span>

              {[
                { icon: 'person',     val: fUsername,  set: setFUsername,  ph: t.phUsername,  flex: '1 1 120px' },
                { icon: 'badge',      val: fFirstName, set: setFFirstName, ph: t.phFirstName, flex: '1 1 120px' },
                { icon: 'badge',      val: fLastName,  set: setFLastName,  ph: t.phLastName,  flex: '1 1 120px' },
                { icon: 'router',     val: fIpAddress, set: setFIpAddress, ph: t.phIpAddress, flex: '1 1 130px' },
              ].map(({ icon, val, set, ph, flex }) => (
                <div key={ph} style={{ position: 'relative', flex, minWidth: '100px' }}>
                  <span className="material-symbols-outlined" style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '15px' }}>{icon}</span>
                  <input type="text" value={val} placeholder={ph}
                    onChange={e => set(e.target.value)}
                    style={{ ...inputStyle, paddingLeft: '30px' }} />
                </div>
              ))}

              {/* Status select */}
              <select value={fStatus} onChange={e => setFStatus(e.target.value)}
                style={{ ...inputStyle, flex: '1 1 140px', minWidth: '130px', cursor: 'pointer' }}>
                <option value="">{t.allStatuses}</option>
                <option value="active">{t.active}</option>
                <option value="expired">{t.expired}</option>
                <option value="logged_out">{t.loggedOut}</option>
              </select>

              {hasActiveFilters && (
                <button onClick={handleClearFilters} style={{
                  padding: '9px 14px', fontSize: '13px', fontWeight: '500',
                  background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0',
                  borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0,
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
                  {t.clearAll}
                </button>
              )}
            </div>

            {hasActiveFilters && (
              <div style={{ marginTop: '10px', fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', background: '#f1f5f9', borderRadius: '8px', flexWrap: 'wrap' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#0a3b5c' }}>info</span>
                {t.results(filteredSessions.length)}
              </div>
            )}
          </div>

          {/* ── Table ── */}
          <div style={{ background: 'white', borderRadius: '20px', boxShadow: '0 8px 30px rgba(0,40,70,0.08)', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
            {isLoading ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '40px', marginBottom: '16px', display: 'block', color: '#0a3b5c', animation: 'spin 2s linear infinite' }}>refresh</span>
                {t.loading}
              </div>
            ) : error ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#ef4444' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '40px', marginBottom: '16px', display: 'block' }}>error</span>
                {t.failedLoad}
              </div>
            ) : paginatedSessions.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '48px', marginBottom: '16px', display: 'block', color: '#94a3b8' }}>manage_history</span>
                {hasActiveFilters ? t.noMatch : t.noData}
                {hasActiveFilters && (
                  <button onClick={handleClearFilters} style={{ display: 'block', margin: '16px auto 0', padding: '8px 20px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#475569', cursor: 'pointer', fontSize: '13px' }}>
                    {t.clearFiltersBtn}
                  </button>
                )}
              </div>
            ) : (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #0a3b5c' }}>
                        {[
                          { label: '#',              align: 'left'   },
                          { label: t.colUsername,    align: 'left'   },
                          { label: t.colFullName,    align: 'left'   },
                          { label: t.colIpAddress,   align: 'left'   },
                          { label: t.colStatus,      align: 'center' },
                          { label: t.colLastLogin,   align: 'left'   },
                          { label: t.colCreatedAt,   align: 'left'   },
                          { label: t.colExpireTime,  align: 'left'   },
                          { label: t.colActions,     align: 'center' },
                        ].map(h => (
                          <th key={h.label} style={{
                            padding: '14px 14px', textAlign: h.align as any,
                            fontWeight: '500', color: '#0a3b5c', fontSize: '11px',
                            letterSpacing: '0.5px', whiteSpace: 'nowrap',
                          }}>{h.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedSessions.map((s: SessionRecord, index: number) => {
                        const actualIndex = (currentPage - 1) * itemsPerPage + index + 1;
                        return (
                          <tr key={s.session_id}
                            style={{ borderBottom: '1px solid #e2e8f0', background: index % 2 === 0 ? 'white' : '#fafbfc', transition: 'background 0.15s' }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#f0f9ff'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = index % 2 === 0 ? 'white' : '#fafbfc'; }}>
                            <td style={{ padding: '12px 14px', color: '#94a3b8', fontSize: '12px', fontWeight: '500' }}>{actualIndex}</td>
                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{
                                  width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
                                  background: 'linear-gradient(135deg,#0a3b5c,#1a5080)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  color: 'white', fontSize: '12px', fontWeight: '700',
                                  border: '2px solid #94a3b8',
                                }}>
                                  {(s.first_name?.[0] ?? '').toUpperCase()}{(s.last_name?.[0] ?? '').toUpperCase()}
                                </div>
                                <span style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>
                                  {s.username}
                                </span>
                              </div>
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ fontSize: '13px', color: '#0f172a', fontWeight: '500' }}>
                                {s.first_name} {s.last_name}
                              </div>
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                              <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#374151', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#94a3b8' }}>router</span>
                                {s.ip_address || '—'}
                              </span>
                            </td>
                            <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                              <StatusBadge status={s.status} />
                            </td>
                            <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                              <span style={{ fontSize: '12px', color: '#64748b' }}>{formatDate(s.last_login)}</span>
                            </td>
                            <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                              <span style={{ fontSize: '12px', color: '#64748b' }}>{formatDate(s.created_at)}</span>
                            </td>
                            <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                              <span style={{ fontSize: '12px', color: s.status === 'expired' ? '#854d0e' : '#64748b' }}>
                                {formatDate(s.expire_time)}
                              </span>
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                                <button onClick={() => openEditModal(s)} title="Edit session"
                                  style={{ padding: '6px 10px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#0369a1', transition: 'all 0.2s' }}
                                  onMouseEnter={e => { e.currentTarget.style.background = '#0369a1'; e.currentTarget.style.color = 'white'; }}
                                  onMouseLeave={e => { e.currentTarget.style.background = '#f0f9ff'; e.currentTarget.style.color = '#0369a1'; }}>
                                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit</span>
                                </button>
                                <button onClick={() => setDeleteModal(s)} title="Delete session"
                                  style={{ padding: '6px 10px', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#be123c', transition: 'all 0.2s' }}
                                  onMouseEnter={e => { e.currentTarget.style.background = '#be123c'; e.currentTarget.style.color = 'white'; }}
                                  onMouseLeave={e => { e.currentTarget.style.background = '#fff1f2'; e.currentTarget.style.color = '#be123c'; }}>
                                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
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
                {filteredSessions.length > itemsPerPage && (
                  <div style={{ padding: '20px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>
                      {t.showing((currentPage - 1) * itemsPerPage + 1, Math.min(currentPage * itemsPerPage, filteredSessions.length), filteredSessions.length)}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}
                        style={{ padding: '8px 16px', fontSize: '13px', fontWeight: '500', background: currentPage === 1 ? '#f1f5f9' : 'white', color: currentPage === 1 ? '#94a3b8' : '#0a3b5c', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>chevron_left</span>
                        {t.previous}
                      </button>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                          const show = page === 1 || page === totalPages || (page >= currentPage - 2 && page <= currentPage + 2);
                          const ellipsis = page === currentPage - 3 || page === currentPage + 3;
                          if (show) return (
                            <button key={page} onClick={() => setCurrentPage(page)} style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '500', background: currentPage === page ? '#0a3b5c' : 'white', color: currentPage === page ? 'white' : '#0f172a', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer' }}>
                              {page}
                            </button>
                          );
                          if (ellipsis) return <span key={`e${page}`} style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '13px' }}>…</span>;
                          return null;
                        })}
                      </div>
                      <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages}
                        style={{ padding: '8px 16px', fontSize: '13px', fontWeight: '500', background: currentPage === totalPages ? '#f1f5f9' : 'white', color: currentPage === totalPages ? '#94a3b8' : '#0a3b5c', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {t.next}
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>chevron_right</span>
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* ════════════════════════════ FOOTER ════════════════════════════ */}
      <footer style={{ width: '100%', background: '#0a2a40', borderTop: '3px solid #e9b741', boxSizing: 'border-box' }}>
        <div style={{ width: '100%', maxWidth: '1600px', margin: '0 auto', padding: '40px 32px 28px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '280px repeat(4,1fr)', gap: '40px', alignItems: 'start' }}>

          {/* Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <img src={CbuLogo} alt="CBU" style={{ width: '40px', height: '40px', objectFit: 'contain', background: 'white', borderRadius: '8px', padding: '4px', flexShrink: 0 }} />
              <div style={{ color: 'white', fontSize: '17px', fontWeight: '600', lineHeight: '1.4' }}>{t.bankName}</div>
            </div>
            <p style={{ fontSize: '13px', lineHeight: '1.6', color: '#6b8499', marginBottom: '18px' }}>
              {t.officialDesc}
            </p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {[
                { src: facebook,  alt: 'Facebook',  href: 'https://www.facebook.com/centralbankuzbekistan/', w: 32 },
                { src: telegram,  alt: 'Telegram',  href: 'https://t.me/centralbankuzbekistan',              w: 34 },
                { src: linkedin,  alt: 'LinkedIn',  href: 'https://www.linkedin.com/company/centralbankuzbekistan/', w: 36 },
                { src: twitter,   alt: 'Twitter',   href: 'https://x.com/cbuzbekistan',                      w: 44 },
                { src: instagram, alt: 'Instagram', href: 'https://www.instagram.com/centralbankuzbekistan/', w: 30 },
                { src: youtube,   alt: 'YouTube',   href: 'https://www.youtube.com/centralbankofuzbekistan', w: 34 },
              ].map(s => (
                <a key={s.alt} href={s.href} target="_blank" rel="noopener noreferrer"
                  style={{ width: '32px', height: '32px', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.16)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)'; }}
                >
                  <img src={s.src} alt={s.alt} style={{ width: `${s.w}px`, height: `${s.w}px`, objectFit: 'contain' }} />
                </a>
              ))}
            </div>
          </div>

          {/* Nav modules */}
          <div>
            <div style={{ color: 'white', fontSize: '16px', fontWeight: '600', marginBottom: '16px', paddingBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>{t.modules}</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {NAV_PAGES.map(p => (
                <li key={p.path} style={{ marginBottom: '14px' }}>
                  <button
                    onClick={() => navigate(p.path)}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '14px',
                      color: p.path === currentPath ? '#e9b741' : '#8097a8',
                      fontWeight: p.path === currentPath ? '600' : '400',
                      cursor: 'pointer',
                      transition: 'color 0.15s',
                      width: '100%',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>{p.icon}</span>
                    {t[p.key as keyof typeof t] as string || p.key}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* About CBU */}
          <div>
            <div style={{ color: 'white', fontSize: '16px', fontWeight: '600', marginBottom: '16px', paddingBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>{t.aboutCbu}</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {[
                { label: t.aboutCbu,           href: 'https://cbu.uz/en/about/',                   icon: 'info'        },
                { label: t.executiveB,         href: 'https://cbu.uz/en/about/management/',        icon: 'groups'      },
                { label: t.legislation,        href: 'https://cbu.uz/en/documents/',               icon: 'gavel'       },
                { label: t.publications,       href: 'https://cbu.uz/en/statistics/publications/', icon: 'description' },
                { label: t.dataStats,          href: 'https://cbu.uz/en/statistics/',              icon: 'bar_chart'   },
              ].map(item => (
                <li key={item.href} style={{ marginBottom: '9px' }}>
                  <a href={item.href} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '14px', color: '#8097a8', textDecoration: 'none', transition: 'color 0.15s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'white'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#8097a8'; }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>{item.icon}</span>
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <div style={{ color: 'white', fontSize: '16px', fontWeight: '600', marginBottom: '16px', paddingBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>{t.services}</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {[
                { label: t.exchangeR,       href: 'https://cbu.uz/en/arkhiv-kursov-valyut/',              icon: 'currency_exchange' },
                { label: t.policyR,         href: 'https://cbu.uz/en/monetary-policy/refinancing-rate/',  icon: 'percent'           },
                { label: t.paymentS,        href: 'https://cbu.uz/en/payment-systems/',                   icon: 'payments'          },
                { label: t.licensing,       href: 'https://cbu.uz/en/credit-organizations/licensing/',    icon: 'verified'          },
                { label: t.pressCenter,     href: 'https://cbu.uz/en/press_center/',                      icon: 'newspaper'         },
              ].map(item => (
                <li key={item.href} style={{ marginBottom: '9px' }}>
                  <a href={item.href} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '14px', color: '#8097a8', textDecoration: 'none', transition: 'color 0.15s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'white'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#8097a8'; }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>{item.icon}</span>
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <div style={{ color: 'white', fontSize: '16px', fontWeight: '700', marginBottom: '16px', paddingBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>{t.contact}</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {[
                { label: '+998 71 212-62-05',    href: 'tel:+998712126205',                           icon: 'call'        },
                { label: '+998 71 200-00-44',    href: 'tel:+998712000044',                           icon: 'call'        },
                { label: '+998 71 233-35-09',    href: 'fax:+998712333509',                           icon: 'fax'         },
                { label: 'info@cbu.uz',          href: 'mailto:info@cbu.uz',                          icon: 'mail'        },
                { label: t.addressS,             href: 'https://maps.app.goo.gl/4qDXnjgQoTwfWCg28',   icon: 'location_on' },
              ].map(item => (
                <li key={item.href} style={{ marginBottom: '9px' }}>
                  <a href={item.href} style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '14px', color: '#8097a8', textDecoration: 'none', transition: 'color 0.15s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'white'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#8097a8'; }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>{item.icon}</span>
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '14px 32px' }}>
          <div style={{ width: '100%', maxWidth: '1600px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#4a5c6a', flexWrap: 'wrap', gap: '8px' }}>
            <span>{t.copyright}</span>
            <div style={{ display: 'flex', gap: '20px' }}>
              {[
                { label: t.privacyPolicy, href: 'https://cbu.uz/en/mobile-privacy/' },
                { label: t.termsOfUse,    href: 'https://cbu.uz/en/services/request-information/' },
              ].map(l => (
                <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer"
                  style={{ color: '#4a5c6a', textDecoration: 'none', transition: 'color 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'white'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#4a5c6a'; }}
                >{l.label}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* ── Edit Session Modal ── */}
      {editModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(7,30,46,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, backdropFilter: 'blur(4px)', padding: '16px',
        }} onClick={() => setEditModal(null)}>
          <div onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{
              background: 'white', borderRadius: '20px', padding: '32px',
              width: '480px', maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              border: '1px solid #e2e8f0', animation: 'modalIn 0.2s ease',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#0a3b5c', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#0369a1' }}>edit</span>
                  {t.editSessionTitle}
                </h2>
                <button onClick={() => setEditModal(null)} style={{ border: 'none', background: '#f1f5f9', cursor: 'pointer', color: '#64748b', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>×</button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: '#f0f9ff', borderRadius: '10px', marginBottom: '24px', border: '1px solid #bae6fd' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg,#0a3b5c,#1a5080)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '14px', fontWeight: '700', flexShrink: 0 }}>
                  {(editModal.first_name?.[0] ?? '').toUpperCase()}{(editModal.last_name?.[0] ?? '').toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: '600', color: '#0a3b5c', fontSize: '14px' }}>{editModal.first_name} {editModal.last_name}</div>
                  <div style={{ color: '#64748b', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                    <span>@{editModal.username}</span>
                    {editModal.ip_address && (
                      <>
                        <span style={{ color: '#cbd5e1' }}>•</span>
                        <span style={{ fontFamily: 'monospace' }}>{editModal.ip_address}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div>
                  <label style={labelStyle}>{t.statusLabel}</label>
                  <select
                    value={editForm.status}
                    onChange={e => setEditForm(f => ({ ...f, status: e.target.value as SessionStatus }))}
                    style={{ ...modalInputStyle, cursor: 'pointer' }}
                  >
                    <option value="active">{t.active}</option>
                    <option value="expired">{t.expired}</option>
                    <option value="logged_out">{t.loggedOut}</option>
                  </select>
                  <div style={{ marginTop: '8px' }}>
                    <StatusBadge status={editForm.status} />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>{t.expireTimeLabel}</label>
                  <input
                    type="datetime-local"
                    value={editForm.expire_time}
                    onChange={e => setEditForm(f => ({ ...f, expire_time: e.target.value }))}
                    style={{ ...modalInputStyle }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button onClick={() => setEditModal(null)} style={{ padding: '11px 22px', fontSize: '14px', fontWeight: '500', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '10px', cursor: 'pointer' }}>
                  {t.cancel}
                </button>
                <button onClick={handleSaveEdit} disabled={!hasChanges || isSaving}
                  style={{
                    padding: '11px 22px', fontSize: '14px', fontWeight: '600',
                    background: !hasChanges || isSaving ? '#94a3b8' : 'linear-gradient(135deg,#0a3b5c,#1a5080)',
                    color: 'white', border: 'none', borderRadius: '10px',
                    cursor: !hasChanges || isSaving ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: '8px',
                    boxShadow: hasChanges && !isSaving ? '0 4px 12px rgba(10,59,92,0.3)' : 'none',
                    transition: 'all 0.2s',
                  }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', animation: isSaving ? 'spin 1.5s linear infinite' : 'none' }}>
                    {isSaving ? 'hourglass_empty' : 'save'}
                  </span>
                  {isSaving ? t.saving : t.save}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Session Modal ── */}
      {deleteModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(7,30,46,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, backdropFilter: 'blur(4px)', padding: '16px',
        }} onClick={() => setDeleteModal(null)}>
          <div onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{
              background: 'white', borderRadius: '20px', padding: '32px',
              width: '480px', maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              border: '1px solid #e2e8f0', animation: 'modalIn 0.2s ease',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#0a3b5c', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#dc2626' }}>warning</span>
                  {t.deleteSessionTitle}
                </h2>
                <button onClick={() => setDeleteModal(null)} style={{ border: 'none', background: '#f1f5f9', cursor: 'pointer', color: '#64748b', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>×</button>
              </div>

              <div style={{ marginBottom: '28px', padding: '20px', background: '#fef2f2', borderRadius: '12px', border: '1px solid #fee2e2' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                  <span className="material-symbols-outlined" style={{ color: '#dc2626' }}>info</span>
                  <strong style={{ color: '#0f172a', fontSize: '14px' }}>{t.deleteConfirm}</strong>
                </div>
                <div style={{ paddingLeft: '24px', fontSize: '13px', color: '#4b5563', lineHeight: '2.2' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg,#0a3b5c,#1a5080)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '14px', fontWeight: '700', border: '2px solid #94a3b8', flexShrink: 0 }}>
                      {(deleteModal.first_name?.[0] ?? '').toUpperCase()}{(deleteModal.last_name?.[0] ?? '').toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: '600', color: '#0a3b5c' }}>{deleteModal.first_name} {deleteModal.last_name}</div>
                      <div style={{ color: '#64748b', fontSize: '12px' }}>@{deleteModal.username}</div>
                    </div>
                  </div>
                  {deleteModal.ip_address && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#94a3b8' }}>router</span>
                      IP: <strong style={{ fontFamily: 'monospace' }}>{deleteModal.ip_address}</strong>
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#94a3b8' }}>circle</span>
                    Status: <StatusBadge status={deleteModal.status} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#94a3b8' }}>schedule</span>
                    Created: <strong>{formatDate(deleteModal.created_at)}</strong>
                  </div>
                </div>
                <p style={{ margin: '12px 0 0 24px', fontSize: '12px', color: '#dc2626', fontWeight: '600' }}>{t.deleteWarning}</p>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button onClick={() => setDeleteModal(null)} style={{ padding: '11px 22px', fontSize: '14px', fontWeight: '500', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '10px', cursor: 'pointer' }}>
                  {t.cancel}
                </button>
                <button onClick={handleDeleteSession} disabled={isDeleting}
                  style={{
                    padding: '11px 22px', fontSize: '14px', fontWeight: '600',
                    background: isDeleting ? '#94a3b8' : '#dc2626',
                    color: 'white', border: 'none', borderRadius: '10px',
                    cursor: isDeleting ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: '8px',
                  }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', animation: isDeleting ? 'spin 1.5s linear infinite' : 'none' }}>
                    {isDeleting ? 'hourglass_empty' : 'delete'}
                  </span>
                  {isDeleting ? t.deleting : t.delete}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Global styles ── */}
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { width: 100%; overflow-x: hidden; }
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
        #root { width: 100%; }
        .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }
        @keyframes spin    { from { transform: rotate(0deg); }                   to { transform: rotate(360deg); } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(20px); }  to { opacity: 1; transform: translateX(0); } }
        @keyframes dropIn  { from { opacity: 0; transform: translateY(-8px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes modalIn { from { opacity: 0; transform: scale(0.93); }       to { opacity: 1; transform: scale(1); } }
        button:hover:not(:disabled) { transform: translateY(-1px); }
        button:active:not(:disabled) { transform: translateY(0); }
        input:focus, select:focus { border-color: #0a3b5c !important; box-shadow: 0 0 0 3px rgba(10, 59, 92, 0.1); }
        select option { background: white; color: #0f172a; }
        input[type="datetime-local"]::-webkit-calendar-picker-indicator { cursor: pointer; opacity: 0.6; }
        input[type="datetime-local"]::-webkit-calendar-picker-indicator:hover { opacity: 1; }
        nav::-webkit-scrollbar { height: 0; }
      `}</style>
    </div>
  );
};

export default AdminSessionsPage;