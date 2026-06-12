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

// ─── i18n ─────────────────────────────────────────────────────────────────────

const TRANSLATIONS = {
  en: {
    bankName: 'The Central Bank of Uzbekistan',
    deptSubtitle: 'Department of Monetary Operations',
    totalUploads: 'Total Uploads',
    add_new_upload: 'Add New Upload',
    finished: 'Finished',
    inProgress: 'In Progress',
    failed: 'Failed',
    colIndex: '#',
    colFileId: 'FILE ID',
    colFileName: 'FILE NAME',
    colStatus: 'STATUS',
    colFileDate: 'FILE DATE',
    colUsername: 'USERNAME',
    colFullName: 'FULL NAME',
    colDepartment: 'DEPARTMENT',
    colCreatedAt: 'CREATED AT',
    colFinishedAt: 'FINISHED AT',
    colActions: 'ACTIONS',
    filterLabel: 'Filters:',
    phFileId: 'File ID…',
    phFileName: 'File name…',
    phStatus: 'Status…',
    phFileDate: 'File date…',
    phUsername: 'Username…',
    phFullName: 'Full name…',
    phDepartment: 'Department…',
    phCreatedAt: 'Created…',
    phFinishedAt: 'Finished…',
    clearAll: 'Clear all',
    allStatuses: 'All Statuses',
    finishedStatus: 'Finished',
    progressStatus: 'In Progress',
    failedStatus: 'Failed',
    results: (n: number) => `${n} result${n !== 1 ? 's' : ''}`,
    loading: 'Loading upload history...',
    failedLoad: 'Failed to load uploads.',
    noMatch: 'No uploads match your filters.',
    noData: 'No uploads found.',
    clearFiltersBtn: 'Clear filters',
    showing: (from: number, to: number, total: number) => `Showing ${from} to ${to} of ${total} entries`,
    previous: 'Previous',
    next: 'Next',
    download: 'Download',
    delete: 'Delete',
    processing: 'Processing…',
    deleteTitle: 'Delete Upload Record',
    deleteConfirm: 'Are you sure you want to delete this upload record?',
    deleteWarning: '⚠️ The file folder on disk will also be permanently removed.',
    deleteIrreversible: '⚠️ This action cannot be undone.',
    cancel: 'Cancel',
    deleting: 'Deleting…',
    deletedSuccess: 'Upload deleted successfully!',
    deleteFailed: 'Failed to delete upload.',
    addNewTitle: 'New Uzonia Upload',
    selectDate: 'Select till_date',
    selectedDate: 'Selected date',
    infoNote: 'Weekends (Sat/Sun) and public holidays are not selectable. The upload will generate a PNG chart and an Excel report, both downloadable as a ZIP archive.',
    createUpload: 'Create Upload',
    creating: 'Creating…',
    uploadSuccess: 'Upload created successfully!',
    uploadFailed: 'Failed to create upload.',
    downloadPromptTitle: 'Upload Created Successfully!',
    downloadPromptDesc: 'Your Uzonia upload has been processed. The archive contains the PNG chart and Excel report for',
    archiveContents: 'Archive contents',
    close: 'Close',
    downloadZip: 'Download ZIP Archive',
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
    banks: 'Banks',
    sessionExpired: 'Session expired. Please log in again.',
  },
  ru: {
    bankName: 'Центральный Банк Республики Узбекистан',
    deptSubtitle: 'Департамент Mонетарных Oпераций',
    totalUploads: 'Всего загрузок',
    add_new_upload: 'Добавить новую загрузку',
    finished: 'Завершено',
    inProgress: 'В процессе',
    failed: 'Ошибка',
    colIndex: '#',
    colFileId: 'ID ФАЙЛА',
    colFileName: 'ИМЯ ФАЙЛА',
    colStatus: 'СТАТУС',
    colFileDate: 'ДАТА ФАЙЛА',
    colUsername: 'ЛОГИН',
    colFullName: 'ФИО',
    colDepartment: 'ОТДЕЛ',
    colCreatedAt: 'СОЗДАН',
    colFinishedAt: 'ЗАВЕРШЁН',
    colActions: 'ДЕЙСТВИЯ',
    filterLabel: 'Фильтры:',
    phFileId: 'ID файла…',
    phFileName: 'Имя файла…',
    phStatus: 'Статус…',
    phFileDate: 'Дата файла…',
    phUsername: 'Логин…',
    phFullName: 'ФИО…',
    phDepartment: 'Отдел…',
    phCreatedAt: 'Создан…',
    phFinishedAt: 'Завершён…',
    clearAll: 'Очистить всё',
    allStatuses: 'Все статусы',
    finishedStatus: 'Завершено',
    progressStatus: 'В процессе',
    failedStatus: 'Ошибка',
    results: (n: number) => `${n} запис${n === 1 ? 'ь' : n < 5 ? 'и' : 'ей'}`,
    loading: 'Загрузка истории...',
    failedLoad: 'Ошибка загрузки.',
    noMatch: 'Загрузки не найдены.',
    noData: 'Нет загрузок.',
    clearFiltersBtn: 'Сбросить фильтры',
    showing: (from: number, to: number, total: number) => `Показано ${from}–${to} из ${total}`,
    previous: 'Назад',
    next: 'Вперёд',
    download: 'Скачать',
    delete: 'Удалить',
    processing: 'Обработка…',
    deleteTitle: 'Удалить запись',
    deleteConfirm: 'Вы уверены, что хотите удалить эту запись?',
    deleteWarning: '⚠️ Папка с файлами на диске также будет удалена.',
    deleteIrreversible: '⚠️ Это действие нельзя отменить.',
    cancel: 'Отмена',
    deleting: 'Удаление…',
    deletedSuccess: 'Запись удалена!',
    deleteFailed: 'Ошибка удаления.',
    addNewTitle: 'Новая загрузка Uzonia',
    selectDate: 'Выберите дату',
    selectedDate: 'Выбранная дата',
    infoNote: 'Выходные и праздничные дни недоступны для выбора. Загрузка создаст PNG-график и Excel-отчёт в ZIP-архиве.',
    createUpload: 'Создать загрузку',
    creating: 'Создание…',
    uploadSuccess: 'Загрузка создана!',
    uploadFailed: 'Ошибка создания.',
    downloadPromptTitle: 'Загрузка успешно создана!',
    downloadPromptDesc: 'Ваша загрузка обработана. Архив содержит PNG-график и Excel-отчёт для',
    archiveContents: 'Содержимое архива',
    close: 'Закрыть',
    downloadZip: 'Скачать ZIP-архив',
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
    banks: 'Банки',
    sessionExpired: 'Сессия истекла. Пожалуйста, войдите снова.',
  },
  uz_c: {
    bankName: 'Ўзбекистон Республикаси Марказий Банки',
    deptSubtitle: 'Монетар Oперациялар Департаменти',
    totalUploads: 'Жами юклашлар',
    add_new_upload: 'Янги файл юклаш',
    finished: 'Тугалланган',
    inProgress: 'Жараёнда',
    failed: 'Хатолик',
    colIndex: '#',
    colFileId: 'ФАЙЛ ID',
    colFileName: 'ФАЙЛ НОМИ',
    colStatus: 'ҲОЛАТ',
    colFileDate: 'ФАЙЛ САНАСИ',
    colUsername: 'ЛОГИН',
    colFullName: 'ФИО',
    colDepartment: 'БЎЛИМ',
    colCreatedAt: 'ЯРАТИЛГАН',
    colFinishedAt: 'ТУГАЛЛАНГАН',
    colActions: 'АМАЛЛАР',
    filterLabel: 'Фильтрлар:',
    phFileId: 'Файл ID…',
    phFileName: 'Файл номи…',
    phStatus: 'Ҳолат…',
    phFileDate: 'Файл санаси…',
    phUsername: 'Логин…',
    phFullName: 'ФИО…',
    phDepartment: 'Бўлим…',
    phCreatedAt: 'Яратилган…',
    phFinishedAt: 'Тугалланган…',
    clearAll: 'Барчасини тозалаш',
    allStatuses: 'Барча ҳолатлар',
    finishedStatus: 'Тугалланган',
    progressStatus: 'Жараёнда',
    failedStatus: 'Хатолик',
    results: (n: number) => `${n} та натижа`,
    loading: 'Юклашлар олинмоқда...',
    failedLoad: 'Юклашда хато.',
    noMatch: 'Топилмади.',
    noData: 'Юклашлар йўқ.',
    clearFiltersBtn: 'Фильтрларни тозалаш',
    showing: (from: number, to: number, total: number) => `${total} тадан ${from}–${to} кўрсатилмоқда`,
    previous: 'Олдинги',
    next: 'Кейинги',
    download: 'Юклаб олиш',
    delete: 'Ўчириш',
    processing: 'Жараёнда…',
    deleteTitle: 'Ёзувни ўчириш',
    deleteConfirm: 'Ушбу ёзувни ўчиришга ишончингиз комилми?',
    deleteWarning: '⚠️ Дискдаги папка ҳам бутунлай ўчирилади.',
    deleteIrreversible: '⚠️ Бу амални қайтариб бўлмайди.',
    cancel: 'Бекор қилиш',
    deleting: 'Ўчирилмоқда…',
    deletedSuccess: 'Ёзув ўчирилди!',
    deleteFailed: 'Ўчиришда хато.',
    addNewTitle: 'Янги Uzonia юклаш',
    selectDate: 'Санани танланг',
    selectedDate: 'Танланган сана',
    infoNote: 'Ҳафта охири (шанба/якшанба) ва байрам кунлари танланмайди. Юклаш PNG график ва Excel ҳисоботини ZIP архивда яратади.',
    createUpload: 'Юклашни яратиш',
    creating: 'Яратилмоқда…',
    uploadSuccess: 'Юклаш муваффақиятли яратилди!',
    uploadFailed: 'Юклашни яратишда хато.',
    downloadPromptTitle: 'Юклаш муваффақиятли яратилди!',
    downloadPromptDesc: 'Uzonia юклашингиз қайта ишланди. Архив PNG график ва Excel ҳисоботини ўз ичига олади',
    archiveContents: 'Архив таркиби',
    close: 'Ёпиш',
    downloadZip: 'ZIP архивни юклаб олиш',
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
    banks: 'Банклар',
    sessionExpired: 'Сессия муддати тугади. Илтимос, қайта киринг.',
  },
  uz_l: {
    bankName: "O'zbekiston Respublikasi Markaziy Banki",
    deptSubtitle: 'Monetar Operatsiyalar Departamenti',
    totalUploads: 'Jami yuklamalar',
    add_new_upload: 'Yangi fayl yuklash',
    finished: 'Tugallangan',
    inProgress: 'Jarayonda',
    failed: 'Xatolik',
    colIndex: '#',
    colFileId: 'FAYL ID',
    colFileName: 'FAYL NOMI',
    colStatus: 'HOLAT',
    colFileDate: 'FAYL SANASI',
    colUsername: 'LOGIN',
    colFullName: 'FIO',
    colDepartment: "BO'LIM",
    colCreatedAt: 'YARATILGAN',
    colFinishedAt: 'TUGALLANGAN',
    colActions: 'AMALLAR',
    filterLabel: 'Filtrlar:',
    phFileId: 'Fayl ID…',
    phFileName: 'Fayl nomi…',
    phStatus: 'Holat…',
    phFileDate: 'Fayl sanasi…',
    phUsername: 'Login…',
    phFullName: 'FIO…',
    phDepartment: "Bo'lim…",
    phCreatedAt: 'Yaratilgan…',
    phFinishedAt: 'Tugallangan…',
    clearAll: 'Barchasini tozalash',
    allStatuses: 'Barcha holatlar',
    finishedStatus: 'Tugallangan',
    progressStatus: 'Jarayonda',
    failedStatus: 'Xatolik',
    results: (n: number) => `${n} ta natija`,
    loading: 'Yuklamalar olinmoqda...',
    failedLoad: 'Yuklashda xato.',
    noMatch: 'Topilmadi.',
    noData: "Yuklamalar yo'q.",
    clearFiltersBtn: 'Filtrlarni tozalash',
    showing: (from: number, to: number, total: number) => `${total} tadan ${from}–${to} ko'rsatilmoqda`,
    previous: 'Oldingi',
    next: 'Keyingi',
    download: 'Yuklab olish',
    delete: "O'chirish",
    processing: 'Jarayonda…',
    deleteTitle: "Yozuvni o'chirish",
    deleteConfirm: "Ushbu yozuvni o'chirishga ishonchingiz komilmi?",
    deleteWarning: "⚠️ Diskdagi papka ham butunlay o'chiriladi.",
    deleteIrreversible: "⚠️ Bu amalni qaytarib bo'lmaydi.",
    cancel: 'Bekor qilish',
    deleting: "O'chirilmoqda…",
    deletedSuccess: "Yozuv o'chirildi!",
    deleteFailed: "O'chirishda xato.",
    addNewTitle: "Yangi Uzonia yuklash",
    selectDate: 'Sanani tanlang',
    selectedDate: 'Tanlangan sana',
    infoNote: 'Hafta oxiri (shanba/yakshanba) va bayram kunlari tanlanmaydi. Yuklash PNG grafik va Excel hisobotini ZIP arxivda yaratadi.',
    createUpload: "Yuklashni yaratish",
    creating: 'Yaratilmoqda…',
    uploadSuccess: "Yuklash muvaffaqiyatli yaratildi!",
    uploadFailed: "Yuklashni yaratishda xato.",
    downloadPromptTitle: "Yuklash muvaffaqiyatli yaratildi!",
    downloadPromptDesc: "Uzonia yuklamangiz qayta ishlandi. Arxiv PNG grafik va Excel hisobotini o'z ichiga oladi",
    archiveContents: 'Arxiv tarkibi',
    close: 'Yopish',
    downloadZip: 'ZIP arxivni yuklab olish',
    usersBtn: 'Foydalanuvchilar',
    sessionsBtn: 'Sessiyalar',
    actionsBtn: 'Harakatlar',
    signOut: 'Chiqish',
    department: "Bo'lim",
    langConfirmTitle: "Tilni o'zgartirish",
    langConfirmMsg: (lang: string) => `Interfeys tilini ${lang} tiliga o'zgartirishga ishonchingiz komilmi?`,
    confirm: "Ha, o'zgartirish",
    officialDesc: "UZONIA – Banklararo operatsiyalar, hisob-kitoblar va ma'lumotlarni qayta ishlash platformasi",
    aboutCbu: "MBU Haqida",
    executiveB: 'Boshqaruv kengashi',
    legislation: 'Qonunchilik',
    publications: 'Publikatsiyalar',
    dataStats: "Ma'lumotlar & Statistika",
    services: 'Xizmatlar',
    exchangeR: 'Valyuta kurslari',
    policyR: 'Asosiy stavka',
    paymentS: "To'lov tizimlari",
    licensing: 'Litsenziyalash',
    pressCenter: 'Axborot xizmati',
    contact: "Bog'lanish",
    addressS: "Islom Karimov Ko'chasi, 6",
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
    banks: 'Banklar',
    sessionExpired: 'Sessiya muddati tugadi. Iltimos, qayta kiring.',
  },
};

type LangKey = keyof typeof TRANSLATIONS;
const LANG_LABELS: Record<LangKey, string> = { en: 'EN', ru: 'RU', uz_c: 'УЗ', uz_l: "O'Z" };
const LANG_NAMES: Record<LangKey, string>  = { en: 'English', ru: 'Русский', uz_c: 'Ўзбекча', uz_l: "O'zbekcha" };

// ─── Nav pages ────────────────────────────────────────────────────────────────

const NAV_PAGES = [
  { key: 'calculations', icon: 'calculate',          path: '/calculations' },
  { key: 'uploads',      icon: 'upload_file',        path: '/uploads'      },
  { key: 'repo',         icon: 'account_balance',    path: '/repo'         },
  { key: 'depo',         icon: 'savings',            path: '/depo'         },
  { key: 'data',         icon: 'database',           path: '/data'         },
  { key: 'holidays',     icon: 'calendar_month',     path: '/holidays'     },
  { key: 'banks',        icon: 'currency_exchange',  path: '/banks'        },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface UzoniaUpload {
  unique_job_id: string;
  file_id: string;
  file_path: string;
  status: 'progress' | 'success' | 'finished' | 'failed';
  file_date: string;
  created_at: string | null;
  finished_at: string | null;
  username: string;
  first_name: string;
  last_name: string;
  department: string;
}

interface HolidayItem {
  holiday_date: string;
  description: string;
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatDate = (s: string | null): string => {
  if (!s) return '—';
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
};

const formatDateTime = (s: string | null): string => {
  if (!s) return '—';
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${String(d.getDate()).padStart(2, '0')}-${months[d.getMonth()]}-${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const shortenPath = (p: string): string => {
  if (!p) return '—';
  const parts = p.replace(/\\/g, '/').split('/');
  return parts[parts.length - 1] || p;
};

const getFullName = (first: string, last: string): string => {
  if (!first && !last) return '—';
  return `${first || ''} ${last || ''}`.trim();
};

const toLocalISODate = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// ─── Status badge config ──────────────────────────────────────────────────────

const STATUS_CFG = {
  finished: { bg: '#d1fae5', color: '#065f46', icon: 'check_circle', label: 'Finished', spin: false },
  success:  { bg: '#d1fae5', color: '#065f46', icon: 'check_circle', label: 'Finished', spin: false },
  progress: { bg: '#dbeafe', color: '#1e40af', icon: 'hourglass_empty', label: 'In Progress', spin: true },
  failed:   { bg: '#fee2e2', color: '#991b1b', icon: 'error', label: 'Failed', spin: false },
} as const;

// ─── Mini Calendar Picker ─────────────────────────────────────────────────────

interface MiniCalendarProps {
  value: string;
  onChange: (v: string) => void;
  holidaySet: Set<string>;
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_LABELS  = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const MiniCalendar: React.FC<MiniCalendarProps> = ({ value, onChange, holidaySet }) => {
  const today    = new Date();
  const todayStr = toLocalISODate(today);

  const [viewYear,  setViewYear]  = useState(() => value ? parseInt(value.slice(0, 4)) : today.getFullYear());
  const [viewMonth, setViewMonth] = useState(() => value ? parseInt(value.slice(5, 7)) - 1 : today.getMonth());

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const cells = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    let dow = firstDay.getDay();
    dow = dow === 0 ? 6 : dow - 1;
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const grid: (number | null)[] = Array(dow).fill(null);
    for (let d = 1; d <= daysInMonth; d++) grid.push(d);
    while (grid.length % 7 !== 0) grid.push(null);
    return grid;
  }, [viewYear, viewMonth]);

  const isoOf = (day: number) =>
    `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const isDisabled = (day: number): boolean => {
    const d   = new Date(viewYear, viewMonth, day);
    const dow = d.getDay();
    return dow === 0 || dow === 6 || holidaySet.has(isoOf(day));
  };

  const isSelected  = (day: number) => isoOf(day) === value;
  const isToday     = (day: number) => isoOf(day) === todayStr;
  const isHoliday   = (day: number) => holidaySet.has(isoOf(day));
  const isWeekend   = (day: number) => { const d = new Date(viewYear, viewMonth, day); return d.getDay() === 0 || d.getDay() === 6; };

  const handleClick = (day: number) => {
    if (!isDisabled(day)) onChange(isoOf(day));
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
          const disabled = isDisabled(day);
          const selected = isSelected(day);
          const todayCell = isToday(day);
          const holiday = isHoliday(day);
          const weekend = isWeekend(day);

          let bg = 'transparent', color = '#1e293b', border = '1px solid transparent', cursor = 'pointer', opacity = '1';
          if (selected)                      { bg = '#0a3b5c'; color = 'white'; border = '1px solid #0a3b5c'; }
          else if (todayCell && !disabled)   { border = '2px solid #e9b741'; color = '#0a3b5c'; bg = '#fffbeb'; }
          else if (disabled)                 { color = '#cbd5e1'; cursor = 'not-allowed'; opacity = '0.5'; }
          if ((weekend || holiday) && !selected) { color = disabled ? '#fca5a5' : '#ef4444'; }

          return (
            <div key={day}
              onClick={() => handleClick(day)}
              title={holiday ? 'Holiday — not selectable' : weekend ? 'Weekend — not selectable' : undefined}
              style={{ textAlign: 'center', padding: '6px 2px', fontSize: '12px', fontWeight: selected ? '700' : '500', borderRadius: '7px', background: bg, color, border, cursor, opacity, transition: 'all 0.1s', position: 'relative' }}
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
          { color: '#e9b741', label: 'Today', border: '2px solid #e9b741', bg: '#fffbeb' },
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

const UzoniaUploadsPage: React.FC = () => {
  const navigate    = useNavigate();
  const currentPath = '/uploads';

  // ── Responsive ───────────────────────────────────────────────────────────
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ── State ─────────────────────────────────────────────────────────────────
  const [currentUser,   setCurrentUser]   = useState<CurrentUser | null>(null);
  const [uploads,       setUploads]       = useState<UzoniaUpload[]>([]);
  const [holidays,      setHolidays]      = useState<HolidayItem[]>([]);
  const [lang,          setLang]          = useState<LangKey>('en');
  const [pendingLang,   setPendingLang]   = useState<LangKey | null>(null);
  const [isLoading,     setIsLoading]     = useState(true);
  const [error,         setError]         = useState<string | null>(null);

  const t = TRANSLATIONS[lang] ?? TRANSLATIONS.en;

  // ── User dropdown ─────────────────────────────────────────────────────────
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node))
        setUserDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
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

  // ── Core data fetch (no dependency on `t`) ────────────────────────────────
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch('/api/get_all_uzonia_uploads');
      if (!res) return; // redirected to /login
      if (!res.ok) {
        if (res.status === 404) {
          setUploads([]);
          setHolidays([]);
          setError(null);
        } else {
          throw new Error(`HTTP ${res.status}`);
        }
        return;
      }
      const data = await res.json();
      setCurrentUser(data.user ?? null);
      setUploads(data.Data ?? []);
      setHolidays(data.Holidays ?? []);
      setError(null);

      // ── Sync language from user preference ──
      const langMap: Record<string, LangKey> = { en: 'en', ru: 'ru', uz_c: 'uz_c', uz_l: 'uz_l' };
      const mappedLang = langMap[data.user?.language];
      if (mappedLang) setLang(mappedLang);
    } catch (err) {
      setError(TRANSLATIONS[lang]?.failedLoad ?? 'Failed to load uploads.');
      setUploads([]);
      setHolidays([]);
    } finally {
      setIsLoading(false);
    }
  }, []); // intentionally empty — called once on mount

  // ── Mount: check session_expired flag, then fetch ─────────────────────────
  useEffect(() => {
    const expired = sessionStorage.getItem('session_expired');
    if (expired) {
      setToast({ text: TRANSLATIONS[lang]?.sessionExpired ?? 'Session expired.', type: 'info' });
      sessionStorage.removeItem('session_expired');
      setTimeout(() => setToast(null), 5000);
    }
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Periodic session check (every 60s) — mirrors calculations.tsx ─────────
  useEffect(() => {
    if (!currentUser) return;
    let active = true;
    const interval = setInterval(async () => {
      if (!active) return;
      try {
        const res = await fetch(`${API_BASE_URL}/api/get_all_uzonia_uploads`, {
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
  }, [currentUser]);

  // ── Auto-refresh while any upload is in-progress ──────────────────────────
  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const hasProgress = uploads.some(u => u.status === 'progress');
    if (refreshRef.current) { clearInterval(refreshRef.current); refreshRef.current = null; }
    if (hasProgress) {
      refreshRef.current = setInterval(fetchData, 5_000);
    }
    return () => { if (refreshRef.current) { clearInterval(refreshRef.current); refreshRef.current = null; } };
  }, [uploads, fetchData]);

  // ── Language change (with confirmation) ───────────────────────────────────
  const applyLanguageChange = useCallback(async (newLang: LangKey) => {
    setPendingLang(null);
    try {
      const res = await apiFetch(`/api/update_language?language=${newLang}`, { method: 'PUT' });
      if (!res || !res.ok) return;
      const data = await res.json();
      setLang(newLang);
      setCurrentUser(data.user);
    } catch {}
  }, []);

  const getInitials = (u: CurrentUser | null) => {
    if (!u) return '?';
    return ((u.first_name?.[0] ?? '') + (u.last_name?.[0] ?? '')).toUpperCase() || u.username?.[0]?.toUpperCase() || '?';
  };

  // ── Filter state ──────────────────────────────────────────────────────────
  const [fFileId,     setFFileId]     = useState('');
  const [fFileName,   setFFileName]   = useState('');
  const [fStatus,     setFStatus]     = useState('');
  const [fFileDate,   setFFileDate]   = useState('');
  const [fUsername,   setFUsername]   = useState('');
  const [fFullName,   setFFullName]   = useState('');
  const [fDepartment, setFDepartment] = useState('');
  const [fCreatedAt,  setFCreatedAt]  = useState('');
  const [fFinishedAt, setFFinishedAt] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // ── Modal / action state ──────────────────────────────────────────────────
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [targetUpload,      setTargetUpload]      = useState<UzoniaUpload | null>(null);
  const [isDeleting,        setIsDeleting]        = useState(false);
  const [isAddModalOpen,    setIsAddModalOpen]    = useState(false);
  const [isSubmitting,      setIsSubmitting]      = useState(false);
  const [selectedDate,      setSelectedDate]      = useState<string>('');
  const [downloadPrompt,    setDownloadPrompt]    = useState<{ fileId: string; fileDate: string } | null>(null);

  // ── Toast ─────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Holiday set ───────────────────────────────────────────────────────────
  const holidaySet = useMemo<Set<string>>(() => {
    const s = new Set<string>();
    holidays.forEach(h => {
      const raw = String(h.holiday_date);
      const d   = new Date(raw);
      if (!isNaN(d.getTime())) s.add(toLocalISODate(d));
      else if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) s.add(raw);
    });
    return s;
  }, [holidays]);

  const getDefaultDate = (hSet: Set<string>): string => {
    const d = new Date();
    while (true) {
      const dow = d.getDay();
      const iso = toLocalISODate(d);
      if (dow !== 0 && dow !== 6 && !hSet.has(iso)) return iso;
      d.setDate(d.getDate() - 1);
    }
  };

  // Set default selected date once holidays are available
  useEffect(() => {
    if (!selectedDate && (holidaySet.size > 0 || uploads.length > 0)) {
      setSelectedDate(getDefaultDate(holidaySet));
    }
  }, [holidaySet, uploads]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Filtered + paginated data ─────────────────────────────────────────────
  const filteredData = useMemo(() => {
    let f = [...uploads];
    const ci = (s: string) => s.toLowerCase();
    if (fFileId.trim())     f = f.filter(r => ci(r.file_id).includes(ci(fFileId.trim())));
    if (fFileName.trim())   f = f.filter(r => ci(shortenPath(r.file_path)).includes(ci(fFileName.trim())));
    if (fStatus.trim())     f = f.filter(r => ci(r.status).includes(ci(fStatus.trim())));
    if (fFileDate.trim())   f = f.filter(r => String(r.file_date).includes(fFileDate.trim()));
    if (fUsername.trim())   f = f.filter(r => ci(r.username).includes(ci(fUsername.trim())));
    if (fFullName.trim())   f = f.filter(r => ci(getFullName(r.first_name, r.last_name)).includes(ci(fFullName.trim())));
    if (fDepartment.trim()) f = f.filter(r => ci(r.department).includes(ci(fDepartment.trim())));
    if (fCreatedAt.trim())  f = f.filter(r => ci(formatDateTime(r.created_at)).includes(ci(fCreatedAt.trim())));
    if (fFinishedAt.trim()) f = f.filter(r => ci(formatDateTime(r.finished_at)).includes(ci(fFinishedAt.trim())));
    return f;
  }, [uploads, fFileId, fFileName, fStatus, fFileDate, fUsername, fFullName, fDepartment, fCreatedAt, fFinishedAt]);

  const stats = useMemo(() => ({
    total:    uploads.length,
    finished: uploads.filter(u => u.status === 'finished' || u.status === 'success').length,
    progress: uploads.filter(u => u.status === 'progress').length,
    failed:   uploads.filter(u => u.status === 'failed').length,
  }), [uploads]);

  const hasActiveFilters = fFileId || fFileName || fStatus || fFileDate || fUsername || fFullName || fDepartment || fCreatedAt || fFinishedAt;
  const totalPages    = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = useMemo(() =>
    filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage),
    [filteredData, currentPage]
  );

  useEffect(() => { setCurrentPage(1); }, [fFileId, fFileName, fStatus, fFileDate, fUsername, fFullName, fDepartment, fCreatedAt, fFinishedAt]);

  const handleClearFilters = useCallback(() => {
    setFFileId(''); setFFileName(''); setFStatus(''); setFFileDate('');
    setFUsername(''); setFFullName(''); setFDepartment(''); setFCreatedAt(''); setFFinishedAt('');
  }, []);

  // Add this to your CalculationsPage component
    const handleDownload = async (fileId: string) => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/download_uzonia_data_file?file_id=${fileId}`, {
          method: 'GET',
          headers: {
            'Authorization': authHeader(),
          },
        });

        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('session_id');
          sessionStorage.setItem('session_expired', '1');
          window.location.replace('/login');
          return;
        }

        if (!response.ok) {
          throw new Error('Download failed');
        }

        // Get the blob from response
        const blob = await response.blob();

        // Create download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fileId}.zip`; // or get filename from Content-Disposition header
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        showToast('Download started successfully', 'success');
      } catch (error) {
        console.error('Download error:', error);
        showToast('Failed to download file', 'error');
      }
    };

  // ── Delete ────────────────────────────────────────────────────────────────
  const openDeleteModal = (u: UzoniaUpload) => { setTargetUpload(u); setIsDeleteModalOpen(true); };

  const handleDelete = async () => {
    if (!targetUpload) return;
    setIsDeleting(true);
    try {
      const res = await apiFetch(`/api/delete_single_uzonia_upload?file_id=${encodeURIComponent(targetUpload.file_id)}`, { method: 'DELETE' });
      if (!res || !res.ok) {
        const e = await res!.json();
        throw new Error(e.detail);
      }
      setIsDeleteModalOpen(false);
      setTargetUpload(null);
      await fetchData();
      showToast(t.deletedSuccess, 'success');
    } catch (err: any) {
      showToast(err.message || t.deleteFailed, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Add New Upload ────────────────────────────────────────────────────────
  const openAddModal = () => {
    setSelectedDate(getDefaultDate(holidaySet));
    setIsAddModalOpen(true);
  };

  const handleAddUpload = async () => {
    if (!selectedDate) { showToast('Please select a valid date.', 'error'); return; }
    const d   = new Date(selectedDate + 'T00:00:00');
    const dow = d.getDay();
    if (dow === 0 || dow === 6)          { showToast('Cannot select a weekend date.', 'error'); return; }
    if (holidaySet.has(selectedDate))    { showToast('Cannot select a holiday date.', 'error'); return; }

    setIsSubmitting(true);
    try {
      const res = await apiFetch(`/api/add_new_uzonia_upload?till_date=${encodeURIComponent(selectedDate)}`, { method: 'POST' });
      if (!res || !res.ok) {
        const e = await res!.json();
        throw new Error(e.detail || 'Upload failed');
      }
      const result = await res.json();
      setIsAddModalOpen(false);
      await fetchData();
      setDownloadPrompt({ fileId: result.file_id, fileDate: selectedDate });
      showToast(t.uploadSuccess, 'success');
    } catch (err: any) {
      showToast(err.message || t.uploadFailed, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Nav button ────────────────────────────────────────────────────────────
  const NavBtn = ({ page }: { page: typeof NAV_PAGES[0] }) => {
    const active = page.path === currentPath;
    const label  = t[page.key as keyof typeof t] as string || page.key;
    return (
      <button onClick={() => navigate(page.path)} style={{
        display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 8px',
        background: active ? 'rgba(255,255,255,0.18)' : 'transparent',
        border: active ? '1px solid rgba(255,255,255,0.35)' : '1px solid transparent',
        borderBottom: active ? '2px solid #e9b741' : '2px solid transparent',
        borderRadius: '8px', color: active ? 'white' : 'rgba(255,255,255,0.65)',
        fontSize: '14px', fontWeight: active ? '600' : '400',
        cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s', outline: 'none', flexShrink: 0,
      }}
        onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.10)'; e.currentTarget.style.color = 'white'; } }}
        onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.65)'; } }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>{page.icon}</span>
        {label}
      </button>
    );
  };

  // ── Shared input styles ───────────────────────────────────────────────────
  const filterInputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 8px 8px 28px', fontSize: '11px',
    background: '#f8fafc', color: '#0f172a', border: '1px solid #e2e8f0',
    borderRadius: '8px', outline: 'none', boxSizing: 'border-box',
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
          background: toast.type === 'success' ? '#065f46' : toast.type === 'info' ? '#1e40af' : '#991b1b',
          color: 'white', padding: '13px 18px', borderRadius: '12px',
          display: 'flex', alignItems: 'center', gap: '10px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)', fontSize: '14px', fontWeight: '500',
          animation: 'slideIn 0.3s ease', maxWidth: '420px',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '19px', flexShrink: 0 }}>
            {toast.type === 'success' ? 'check_circle' : toast.type === 'info' ? 'info' : 'error'}
          </span>
          {toast.text}
        </div>
      )}

      {/* ── Language Confirmation Modal ── */}
      {pendingLang && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(7,30,46,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500, backdropFilter: 'blur(4px)' }}
          onClick={() => setPendingLang(null)}
        >
          <div
            style={{ background: 'white', borderRadius: '20px', padding: '32px 28px', maxWidth: '380px', width: '90%', boxShadow: '0 32px 64px rgba(0,0,0,0.25)', animation: 'modalIn 0.2s ease' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ width: '56px', height: '56px', background: '#e8f0fe', borderRadius: '16px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '28px', color: '#0a3b5c' }}>language</span>
              </div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0a3b5c' }}>{t.langConfirmTitle}</h3>
              <p style={{ margin: '8px 0 0', fontSize: '14px', color: '#64748b', lineHeight: '1.5' }}>
                {t.langConfirmMsg(LANG_NAMES[pendingLang])}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <button
                onClick={() => setPendingLang(null)}
                style={{ flex: 1, padding: '11px', background: '#f1f5f9', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', color: '#64748b', cursor: 'pointer', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
                onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}
              >{t.cancel}</button>
              <button
                onClick={() => applyLanguageChange(pendingLang)}
                style={{ flex: 1, padding: '11px', background: 'linear-gradient(135deg,#0a3b5c,#1a5080)', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', color: 'white', cursor: 'pointer', boxShadow: '0 4px 12px rgba(10,59,92,0.3)', transition: 'all 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              >{t.confirm}</button>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: isMobile ? '0 12px' : '0 20px', height: '60px', minWidth: 0 }}>

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

          {!isMobile && <div style={{ width: '1px', height: '28px', background: 'rgba(255,255,255,0.15)', flexShrink: 0 }} />}

          {/* Nav tabs */}
          <div style={{ padding: '0 10px', overflowX: 'auto' }}>
            <nav style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '40px', minWidth: 'max-content', flexWrap: 'nowrap' }}>
              {NAV_PAGES.map(p => <NavBtn key={p.path} page={p} />)}
            </nav>
          </div>

          <div style={{ flex: 1, minWidth: 0 }} />

          {/* Right: lang switcher + avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexShrink: 0 }}>
            {/* Language switcher */}
            <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '8px', padding: '4px', border: '1px solid rgba(255,255,255,0.12)', flexShrink: 0 }}>
              {(Object.entries(LANG_LABELS) as [LangKey, string][]).map(([key, label]) => (
                <button key={key}
                  onClick={() => key !== lang && setPendingLang(key)}
                  style={{
                    background: lang === key ? '#e9b741' : 'transparent',
                    color: lang === key ? '#0a2a40' : 'rgba(255,255,255,0.75)',
                    border: 'none', borderRadius: '6px', padding: '4px 8px',
                    fontSize: '11px', fontWeight: '600',
                    cursor: lang === key ? 'default' : 'pointer', transition: 'all 0.18s', minWidth: '26px',
                  }}
                  onMouseEnter={e => { if (lang !== key) e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
                  onMouseLeave={e => { if (lang !== key) e.currentTarget.style.background = 'transparent'; }}
                >{label}</button>
              ))}
            </div>

            {/* User avatar + dropdown */}
            <div ref={userDropdownRef} style={{ position: 'relative', flexShrink: 0 }}>
              <button onClick={() => setUserDropdownOpen(o => !o)} style={{
                background: 'rgba(255,255,255,0.1)', border: '2px solid rgba(233,183,65,0.5)',
                borderRadius: '50%', width: '44px', height: '44px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'all 0.2s', color: 'white', fontSize: '18px', fontWeight: '700',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#e9b741'; e.currentTarget.style.background = 'rgba(233,183,65,0.2)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(233,183,65,0.5)'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
              >
                {getInitials(currentUser)}
              </button>

              {userDropdownOpen && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                  background: 'white', borderRadius: '16px', minWidth: '260px',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.18)', overflow: 'hidden',
                  border: '1px solid #e2e8f0', zIndex: 200, animation: 'dropIn 0.18s ease',
                }}>
                  {/* User info */}
                  <div style={{ padding: '20px', borderBottom: '1px solid #f1f5f9', background: 'linear-gradient(135deg,#f8fafc,#eef2f7)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg,#0a3b5c,#1a5080)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '18px', fontWeight: '700', flexShrink: 0, border: '3px solid #e9b741' }}>
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

                  {/* Admin section */}
                  {currentUser?.is_admin && (
                    <div style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ padding: '4px 8px', marginBottom: '4px', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Administration
                      </div>
                      {[
                        { icon: 'group',          label: t.usersBtn,    route: '/users_data',    color: '#3b82f6', bg: '#eff6ff' },
                        { icon: 'manage_history', label: t.sessionsBtn, route: '/user_sessions', color: '#8b5cf6', bg: '#f5f3ff' },
                        { icon: 'timeline',       label: t.actionsBtn,  route: '/user_actions',  color: '#f59e0b', bg: '#fffbeb' },
                      ].map(({ icon, label, route, color, bg }) => (
                        <button key={route}
                          onClick={() => { navigate(route); setUserDropdownOpen(false); }}
                          style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left', padding: '10px 12px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', color: '#1f2937', fontSize: '13px', fontWeight: '500', transition: 'all 0.2s', marginBottom: '2px' }}
                          onMouseEnter={e => { e.currentTarget.style.background = bg; const s = e.currentTarget.querySelector('.admin-icon') as HTMLElement; if (s) s.style.transform = 'scale(1.1)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'none'; const s = e.currentTarget.querySelector('.admin-icon') as HTMLElement; if (s) s.style.transform = 'scale(1)'; }}
                        >
                          <span className="material-symbols-outlined admin-icon" style={{ fontSize: '20px', color, transition: 'transform 0.2s' }}>{icon}</span>
                          <span style={{ flex: 1 }}>{label}</span>
                          <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#cbd5e1' }}>chevron_right</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Sign out */}
                  <div style={{ padding: '8px 12px' }}>
                    <button onClick={() => doLogout()} style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left', padding: '10px 12px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', color: '#dc2626', fontSize: '13px', fontWeight: '500', transition: 'all 0.2s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                    >
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

      {/* ════════════════════════════ MAIN ════════════════════════════ */}
      <main style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: isMobile ? '20px 16px' : '32px', background: '#f8fafc', boxSizing: 'border-box' }}>
        <div style={{ width: '100%', maxWidth: '1600px', margin: '0 auto' }}>

          {/* Stats row + Add button */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '12px', flex: 1 }}>
              {[
                { label: t.totalUploads, value: stats.total,    color: '#0a3b5c', bg: '#e2e8f0', icon: 'upload_file'    },
                { label: t.finished,     value: stats.finished, color: '#065f46', bg: '#d1fae5', icon: 'check_circle'   },
                { label: t.inProgress,   value: stats.progress, color: '#1e40af', bg: '#dbeafe', icon: 'hourglass_empty' },
                { label: t.failed,       value: stats.failed,   color: '#991b1b', bg: '#fee2e2', icon: 'error'           },
              ].map(s => (
                <div key={s.label} style={{ background: 'white', padding: '14px 16px', borderRadius: '14px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', background: s.bg, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '20px', color: s.color }}>{s.icon}</span>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>{s.label}</div>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: s.color, lineHeight: 1 }}>{s.value}</div>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={openAddModal} style={{
              height: '68px', padding: '0 22px',
              background: 'linear-gradient(135deg, #0a3b5c 0%, #1a5c8a 100%)',
              color: 'white', border: '2px solid rgba(233,183,65,0.5)', borderRadius: '12px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
              fontSize: '14px', fontWeight: '600', whiteSpace: 'nowrap', flexShrink: 0,
              boxShadow: '0 4px 14px rgba(10,59,92,0.25)', transition: 'all 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg, #e9b741 0%, #d4a030 100%)'; e.currentTarget.style.color = '#0a3b5c'; e.currentTarget.style.borderColor = '#e9b741'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(233,183,65,0.4)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg, #0a3b5c 0%, #1a5c8a 100%)'; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = 'rgba(233,183,65,0.5)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(10,59,92,0.25)'; }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>add_circle</span>
              {t.add_new_upload}
            </button>
          </div>

          {/* Filter bar */}
          <div style={{ background: 'white', padding: '16px 20px', borderRadius: '16px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,40,70,0.05)', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#0a3b5c', flexShrink: 0 }}>filter_alt</span>
              <span style={{ fontSize: '12px', fontWeight: '500', color: '#374151', flexShrink: 0 }}>{t.filterLabel}</span>
              {[
                { val: fFileId,     set: setFFileId,     ph: t.phFileId,     icon: 'fingerprint'    },
                { val: fFileName,   set: setFFileName,   ph: t.phFileName,   icon: 'description'    },
                { val: fStatus,     set: setFStatus,     ph: t.phStatus,     icon: 'tune'           },
                { val: fFileDate,   set: setFFileDate,   ph: t.phFileDate,   icon: 'event'          },
                { val: fUsername,   set: setFUsername,   ph: t.phUsername,   icon: 'person'         },
                { val: fFullName,   set: setFFullName,   ph: t.phFullName,   icon: 'badge'          },
                { val: fDepartment, set: setFDepartment, ph: t.phDepartment, icon: 'domain'         },
                { val: fCreatedAt,  set: setFCreatedAt,  ph: t.phCreatedAt,  icon: 'calendar_month' },
                { val: fFinishedAt, set: setFFinishedAt, ph: t.phFinishedAt, icon: 'calendar_month' },
              ].map(f => (
                <div key={f.ph} style={{ position: 'relative', flex: '1 1 120px', minWidth: '100px' }}>
                  <span className="material-symbols-outlined" style={{ position: 'absolute', left: '7px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '13px' }}>{f.icon}</span>
                  <input type="text" value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph} style={filterInputStyle} />
                </div>
              ))}
              {hasActiveFilters && (
                <button onClick={handleClearFilters} style={{ padding: '8px 12px', fontSize: '12px', fontWeight: '500', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
                  {t.clearAll}
                </button>
              )}
            </div>
            {hasActiveFilters && (
              <div style={{ marginTop: '10px', fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', background: '#f1f5f9', borderRadius: '8px', flexWrap: 'wrap' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '12px', color: '#0a3b5c' }}>info</span>
                {t.results(filteredData.length)}
              </div>
            )}
          </div>

          {/* Table */}
          <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 2px 10px rgba(0,40,70,0.06)', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
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
            ) : paginatedData.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '48px', marginBottom: '16px', display: 'block', color: '#94a3b8' }}>cloud_off</span>
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
                        {[t.colIndex, t.colFileId, t.colFileName, t.colStatus, t.colFileDate, t.colUsername, t.colFullName, t.colDepartment, t.colCreatedAt, t.colFinishedAt, t.colActions].map(col => (
                          <th key={col} style={{ padding: '12px 12px', textAlign: 'center', fontWeight: '600', color: '#0a3b5c', fontSize: '11px', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedData.map((item: UzoniaUpload, index: number) => {
                        const idx       = (currentPage - 1) * itemsPerPage + index + 1;
                        const badgeKey  = (item.status === 'success' ? 'finished' : item.status) as keyof typeof STATUS_CFG;
                        const badge     = STATUS_CFG[badgeKey] ?? STATUS_CFG.failed;
                        const canDown   = item.status === 'finished' || item.status === 'success';
                        const filename  = shortenPath(item.file_path);
                        const fullName  = getFullName(item.first_name, item.last_name);

                        return (
                          <tr key={item.file_id}
                            style={{ borderBottom: '1px solid #f1f5f9', background: index % 2 === 0 ? 'white' : '#fafbfc', transition: 'background 0.1s' }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#f0f7ff'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = index % 2 === 0 ? 'white' : '#fafbfc'; }}
                          >
                            <td style={{ padding: '10px 12px', color: '#cbd5e1', fontSize: '12px', fontWeight: '600', textAlign: 'center' }}>{idx}</td>
                            <td style={{ padding: '10px 12px' }}>
                              <span style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: '700', color: '#0a3b5c', background: '#eef2ff', padding: '3px 8px', borderRadius: '6px', border: '1px solid #e0e7ff', whiteSpace: 'nowrap', display: 'inline-block', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.file_id}>
                                {item.file_id}
                              </span>
                              {item.status === 'progress' && (
                                <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#1e40af', animation: 'spin 2s linear infinite', marginLeft: '6px', verticalAlign: 'middle' }}>sync</span>
                              )}
                            </td>
                            <td style={{ padding: '10px 12px', maxWidth: '160px' }}>
                              {item.status === 'progress' ? (
                                <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>{t.processing}</span>
                              ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <div style={{ width: '24px', height: '24px', background: canDown ? '#dcfce7' : '#fee2e2', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '13px', color: canDown ? '#16a34a' : '#dc2626' }}>{canDown ? 'folder_zip' : 'folder_off'}</span>
                                  </div>
                                  <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#374151', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', maxWidth: '130px' }} title={filename}>{filename}</span>
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              <span style={{ padding: '3px 9px', borderRadius: '20px', fontSize: '10px', fontWeight: '600', background: badge.bg, color: badge.color, display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '11px', animation: badge.spin ? 'spin 2s linear infinite' : 'none' }}>{badge.icon}</span>
                                {badge.label}
                              </span>
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              <span style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: '600', color: '#475569' }}>{item.file_date || '—'}</span>
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              <span style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: '500', color: '#0a3b5c' }}>@{item.username || '—'}</span>
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              <span style={{ fontSize: '11px', color: '#0f172a', fontWeight: '500', whiteSpace: 'nowrap' }}>{fullName}</span>
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              {item.department && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '2px 8px', background: '#e8f0fe', borderRadius: '20px', fontSize: '10px', color: '#0a3b5c', fontWeight: '600', whiteSpace: 'nowrap' }}>
                                  <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>domain</span>
                                  {item.department}
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '11px', color: '#0a3b5c', flexShrink: 0 }}>schedule</span>
                                <span style={{ fontSize: '10px', fontFamily: item.created_at ? 'monospace' : 'inherit', color: item.created_at ? '#374151' : '#cbd5e1', fontWeight: item.created_at ? '500' : '400', whiteSpace: 'nowrap' }}>
                                  {formatDateTime(item.created_at)}
                                </span>
                              </div>
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              <span style={{ fontSize: '10px', fontFamily: item.finished_at ? 'monospace' : 'inherit', color: item.finished_at ? '#374151' : '#94a3b8', fontWeight: item.finished_at ? '500' : '400', whiteSpace: 'nowrap' }}>
                                {item.status === 'progress' ? '⏳ Processing…' : formatDateTime(item.finished_at)}
                              </span>
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'center' }}>
                                <button
                                  onClick={() => canDown && handleDownload(item.file_id)}
                                  disabled={!canDown}
                                  title={canDown ? t.download : t.processing}
                                  style={{ padding: '4px 10px', fontSize: '10px', fontWeight: '500', background: canDown ? '#f0fdf4' : '#f1f5f9', color: canDown ? '#16a34a' : '#94a3b8', border: `1px solid ${canDown ? '#bbf7d0' : '#e2e8f0'}`, borderRadius: '6px', cursor: canDown ? 'pointer' : 'not-allowed', display: 'inline-flex', alignItems: 'center', gap: '4px', transition: 'all 0.13s', whiteSpace: 'nowrap' }}
                                  onMouseEnter={e => { if (canDown) { e.currentTarget.style.background = '#16a34a'; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = '#16a34a'; } }}
                                  onMouseLeave={e => { if (canDown) { e.currentTarget.style.background = '#f0fdf4'; e.currentTarget.style.color = '#16a34a'; e.currentTarget.style.borderColor = '#bbf7d0'; } }}
                                >
                                  <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>download</span>
                                  {t.download}
                                </button>
                                <button
                                  onClick={() => item.status !== 'progress' && openDeleteModal(item)}
                                  disabled={item.status === 'progress'}
                                  title={item.status === 'progress' ? 'Cannot delete while processing' : t.delete}
                                  style={{ padding: '4px 10px', fontSize: '10px', fontWeight: '500', background: item.status === 'progress' ? '#f1f5f9' : '#fff5f5', color: item.status === 'progress' ? '#94a3b8' : '#dc2626', border: `1px solid ${item.status === 'progress' ? '#e2e8f0' : '#fecaca'}`, borderRadius: '6px', cursor: item.status === 'progress' ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', transition: 'all 0.13s', whiteSpace: 'nowrap' }}
                                  onMouseEnter={e => { if (item.status !== 'progress') { e.currentTarget.style.background = '#dc2626'; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = '#dc2626'; } }}
                                  onMouseLeave={e => { if (item.status !== 'progress') { e.currentTarget.style.background = '#fff5f5'; e.currentTarget.style.color = '#dc2626'; e.currentTarget.style.borderColor = '#fecaca'; } }}
                                >
                                  <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>{item.status === 'progress' ? 'hourglass_empty' : 'delete'}</span>
                                  {item.status === 'progress' ? t.processing : t.delete}
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
                  <div style={{ padding: '14px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      {t.showing((currentPage - 1) * itemsPerPage + 1, Math.min(currentPage * itemsPerPage, filteredData.length), filteredData.length)}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}
                        style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '500', background: currentPage === 1 ? '#f1f5f9' : 'white', color: currentPage === 1 ? '#94a3b8' : '#0a3b5c', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>chevron_left</span>
                        {t.previous}
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                        const show = page === 1 || page === totalPages || (page >= currentPage - 2 && page <= currentPage + 2);
                        const ellipsis = page === currentPage - 3 || page === currentPage + 3;
                        if (show) return (
                          <button key={page} onClick={() => setCurrentPage(page)} style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '600', background: currentPage === page ? '#0a3b5c' : 'white', color: currentPage === page ? 'white' : '#0f172a', border: `1px solid ${currentPage === page ? '#0a3b5c' : '#e2e8f0'}`, borderRadius: '6px', cursor: 'pointer' }}>
                            {page}
                          </button>
                        );
                        if (ellipsis) return <span key={`e${page}`} style={{ width: '28px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>…</span>;
                        return null;
                      })}
                      <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages}
                        style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '500', background: currentPage === totalPages ? '#f1f5f9' : 'white', color: currentPage === totalPages ? '#94a3b8' : '#0a3b5c', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {t.next}
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>chevron_right</span>
                      </button>
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Page {currentPage} of {totalPages}</div>
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
            <p style={{ fontSize: '13px', lineHeight: '1.6', color: '#6b8499', marginBottom: '18px' }}>{t.officialDesc}</p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {[
                { src: facebook,  alt: 'Facebook',  href: 'https://www.facebook.com/centralbankuzbekistan/', w: 32 },
                { src: telegram,  alt: 'Telegram',  href: 'https://t.me/centralbankuzbekistan',              w: 34 },
                { src: linkedin,  alt: 'LinkedIn',  href: 'https://www.linkedin.com/company/centralbankuzbekistan/', w: 36 },
                { src: twitter,   alt: 'Twitter',   href: 'https://x.com/cbuzbekistan',                      w: 44 },
                { src: instagram, alt: 'Instagram', href: 'https://www.instagram.com/centralbankuzbekistan/', w: 30 },
                { src: youtube,   alt: 'YouTube',   href: 'https://www.youtube.com/centralbankofuzbekistan',  w: 34 },
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

          {/* Modules */}
          <div>
            <div style={{ color: 'white', fontSize: '16px', fontWeight: '600', marginBottom: '16px', paddingBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>{t.modules}</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {NAV_PAGES.map(p => (
                <li key={p.path} style={{ marginBottom: '14px' }}>
                  <button onClick={() => navigate(p.path)} style={{ background: 'none', border: 'none', padding: '0', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '14px', color: p.path === currentPath ? '#e9b741' : '#8097a8', fontWeight: p.path === currentPath ? '600' : '400', cursor: 'pointer', transition: 'color 0.15s', width: '100%' }}>
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
                { label: t.aboutCbu,    href: 'https://cbu.uz/en/about/',                   icon: 'info'        },
                { label: t.executiveB,  href: 'https://cbu.uz/en/about/management/',        icon: 'groups'      },
                { label: t.legislation, href: 'https://cbu.uz/en/documents/',               icon: 'gavel'       },
                { label: t.publications,href: 'https://cbu.uz/en/statistics/publications/', icon: 'description' },
                { label: t.dataStats,   href: 'https://cbu.uz/en/statistics/',              icon: 'bar_chart'   },
              ].map(item => (
                <li key={item.href} style={{ marginBottom: '9px' }}>
                  <a href={item.href} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '14px', color: '#8097a8', textDecoration: 'none', transition: 'color 0.15s' }}
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
                { label: t.exchangeR,   href: 'https://cbu.uz/en/arkhiv-kursov-valyut/',             icon: 'currency_exchange' },
                { label: t.policyR,     href: 'https://cbu.uz/en/monetary-policy/refinancing-rate/', icon: 'percent'           },
                { label: t.paymentS,    href: 'https://cbu.uz/en/payment-systems/',                  icon: 'payments'          },
                { label: t.licensing,   href: 'https://cbu.uz/en/credit-organizations/licensing/',   icon: 'verified'          },
                { label: t.pressCenter, href: 'https://cbu.uz/en/press_center/',                     icon: 'newspaper'         },
              ].map(item => (
                <li key={item.href} style={{ marginBottom: '9px' }}>
                  <a href={item.href} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '14px', color: '#8097a8', textDecoration: 'none', transition: 'color 0.15s' }}
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
                { label: '+998 71 212-62-05', href: 'tel:+998712126205',                          icon: 'call'        },
                { label: '+998 71 200-00-44', href: 'tel:+998712000044',                          icon: 'call'        },
                { label: '+998 71 233-35-09', href: 'fax:+998712333509',                          icon: 'fax'         },
                { label: 'info@cbu.uz',       href: 'mailto:info@cbu.uz',                         icon: 'mail'        },
                { label: t.addressS,          href: 'https://maps.app.goo.gl/4qDXnjgQoTwfWCg28', icon: 'location_on' },
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

      {/* ── Add New Upload Modal ── */}
      {isAddModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => { if (!isSubmitting) setIsAddModalOpen(false); }}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '28px', width: '440px', maxWidth: '95vw', boxShadow: '0 24px 64px rgba(0,0,0,0.3)', border: '1px solid #e2e8f0' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0a3b5c', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#e9b741' }}>add_circle</span>
                {t.addNewTitle}
              </h2>
              <button onClick={() => { if (!isSubmitting) setIsAddModalOpen(false); }} style={{ border: 'none', background: '#f1f5f9', cursor: 'pointer', color: '#64748b', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>×</button>
            </div>

            <div style={{ marginBottom: '14px', padding: '10px 14px', background: selectedDate ? '#eff6ff' : '#f8fafc', borderRadius: '10px', border: `1px solid ${selectedDate ? '#bfdbfe' : '#e2e8f0'}`, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#0a3b5c', flexShrink: 0 }}>event</span>
              <div>
                <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '1px' }}>{t.selectDate} (till_date)</div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: selectedDate ? '#0a3b5c' : '#94a3b8', fontFamily: 'monospace' }}>
                  {selectedDate || 'No date selected'}
                </div>
              </div>
              {selectedDate && <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#16a34a', marginLeft: 'auto' }}>check_circle</span>}
            </div>

            <div style={{ padding: '14px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
              <MiniCalendar value={selectedDate} onChange={setSelectedDate} holidaySet={holidaySet} />
            </div>

            <div style={{ padding: '10px 12px', background: '#fffbeb', borderRadius: '8px', border: '1px solid #fde68a', fontSize: '11px', color: '#92400e', display: 'flex', gap: '7px', alignItems: 'flex-start', marginBottom: '18px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px', flexShrink: 0, marginTop: '1px' }}>info</span>
              <span>{t.infoNote}</span>
            </div>

            <div style={{ display: 'flex', gap: '9px', justifyContent: 'flex-end' }}>
              <button onClick={() => { if (!isSubmitting) setIsAddModalOpen(false); }} style={{ padding: '9px 18px', fontSize: '13px', fontWeight: '500', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '9px', cursor: 'pointer' }}>
                {t.cancel}
              </button>
              <button onClick={handleAddUpload} disabled={isSubmitting || !selectedDate}
                style={{ padding: '9px 20px', fontSize: '13px', fontWeight: '600', background: isSubmitting || !selectedDate ? '#94a3b8' : 'linear-gradient(135deg, #0a3b5c, #1a5c8a)', color: 'white', border: 'none', borderRadius: '9px', cursor: isSubmitting || !selectedDate ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: isSubmitting || !selectedDate ? 'none' : '0 4px 12px rgba(10,59,92,0.3)', transition: 'all 0.15s' }}
                onMouseEnter={e => { if (!isSubmitting && selectedDate) e.currentTarget.style.background = '#0a3b5c'; }}
                onMouseLeave={e => { if (!isSubmitting && selectedDate) e.currentTarget.style.background = 'linear-gradient(135deg, #0a3b5c, #1a5c8a)'; }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '15px', animation: isSubmitting ? 'spin 1.5s linear infinite' : 'none' }}>
                  {isSubmitting ? 'hourglass_empty' : 'upload_file'}
                </span>
                {isSubmitting ? t.creating : t.createUpload}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Post-Upload Download Prompt ── */}
      {downloadPrompt && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}
          onClick={() => setDownloadPrompt(null)}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '28px', width: '460px', maxWidth: '95vw', boxShadow: '0 24px 64px rgba(0,0,0,0.3)', border: '1px solid #e2e8f0', textAlign: 'center' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ width: '60px', height: '60px', background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '30px', color: '#065f46' }}>check_circle</span>
            </div>
            <h2 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: '700', color: '#0a3b5c' }}>{t.downloadPromptTitle}</h2>
            <p style={{ margin: '0 0 18px', fontSize: '12px', color: '#64748b', lineHeight: '1.5' }}>
              {t.downloadPromptDesc} <span style={{ fontFamily: 'monospace', color: '#0a3b5c', fontWeight: '700' }}>{downloadPrompt.fileDate}</span>.
            </p>
            <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '12px 14px', border: '1px solid #e2e8f0', marginBottom: '18px', textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <div style={{ width: '32px', height: '32px', background: '#dbeafe', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#1e40af' }}>folder_zip</span>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>{t.archiveContents}</div>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#0a3b5c', fontFamily: 'monospace' }}>{downloadPrompt.fileId}.zip</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '5px', background: '#ede9fe', borderRadius: '6px', padding: '5px 8px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '12px', color: '#7c3aed' }}>image</span>
                  <span style={{ fontSize: '9px', fontFamily: 'monospace', color: '#7c3aed', fontWeight: '600' }}>{downloadPrompt.fileId}.png</span>
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '5px', background: '#dcfce7', borderRadius: '6px', padding: '5px 8px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '12px', color: '#16a34a' }}>table_chart</span>
                  <span style={{ fontSize: '9px', fontFamily: 'monospace', color: '#16a34a', fontWeight: '600' }}>{downloadPrompt.fileId}.xlsx</span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setDownloadPrompt(null)} style={{ flex: 1, padding: '9px', fontSize: '12px', fontWeight: '500', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '9px', cursor: 'pointer' }}>
                {t.close}
              </button>
              <button onClick={() => { handleDownload(downloadPrompt.fileId); setDownloadPrompt(null); }} style={{ flex: 2, padding: '9px 16px', fontSize: '12px', fontWeight: '700', background: 'linear-gradient(135deg, #065f46, #16a34a)', color: 'white', border: 'none', borderRadius: '9px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>download</span>
                {t.downloadZip}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Modal ── */}
      {isDeleteModalOpen && targetUpload && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setIsDeleteModalOpen(false)}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '28px', width: '480px', maxWidth: '95vw', boxShadow: '0 24px 64px rgba(0,0,0,0.3)', border: '1px solid #e2e8f0' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#0a3b5c', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#dc2626' }}>warning</span>
                {t.deleteTitle}
              </h2>
              <button onClick={() => setIsDeleteModalOpen(false)} style={{ border: 'none', background: '#f1f5f9', cursor: 'pointer', color: '#64748b', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>×</button>
            </div>
            <div style={{ marginBottom: '20px', padding: '14px 16px', background: '#fef2f2', borderRadius: '10px', border: '1px solid #fee2e2' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                <span className="material-symbols-outlined" style={{ color: '#dc2626', fontSize: '14px' }}>info</span>
                <strong style={{ color: '#0f172a', fontSize: '12px' }}>{t.deleteConfirm}</strong>
              </div>
              <div style={{ paddingLeft: '20px', fontSize: '11px', color: '#4b5563', lineHeight: '2', textAlign: 'left' }}>
                <div>File ID: <strong style={{ fontFamily: 'monospace', color: '#dc2626' }}>{targetUpload.file_id}</strong></div>
                <div>File name: <strong style={{ fontFamily: 'monospace' }}>{shortenPath(targetUpload.file_path)}</strong></div>
                <div>Status: <strong>{STATUS_CFG[(targetUpload.status === 'success' ? 'finished' : targetUpload.status) as keyof typeof STATUS_CFG]?.label ?? targetUpload.status}</strong></div>
                <div>File date: <strong style={{ fontFamily: 'monospace' }}>{targetUpload.file_date || '—'}</strong></div>
                <div>Created by: <strong>@{targetUpload.username}</strong> ({getFullName(targetUpload.first_name, targetUpload.last_name)})</div>
                {targetUpload.finished_at && <div>Finished: <strong style={{ fontFamily: 'monospace' }}>{formatDateTime(targetUpload.finished_at)}</strong></div>}
              </div>
              <p style={{ margin: '8px 0 0 20px', fontSize: '10px', color: '#b45309' }}>{t.deleteWarning}</p>
              <p style={{ margin: '4px 0 0 20px', fontSize: '10px', color: '#dc2626' }}>{t.deleteIrreversible}</p>
            </div>
            <div style={{ display: 'flex', gap: '9px', justifyContent: 'center' }}>
              <button onClick={() => setIsDeleteModalOpen(false)} style={{ padding: '9px 18px', fontSize: '12px', fontWeight: '500', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '9px', cursor: 'pointer' }}>{t.cancel}</button>
              <button onClick={handleDelete} disabled={isDeleting}
                style={{ padding: '9px 18px', fontSize: '12px', fontWeight: '600', background: isDeleting ? '#94a3b8' : '#dc2626', color: 'white', border: 'none', borderRadius: '9px', cursor: isDeleting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '14px', animation: isDeleting ? 'spin 1.5s linear infinite' : 'none' }}>
                  {isDeleting ? 'hourglass_empty' : 'delete_forever'}
                </span>
                {isDeleting ? t.deleting : t.delete}
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
        @keyframes dropIn{from{opacity:0;transform:translateY(-8px) scale(0.97);}to{opacity:1;transform:translateY(0) scale(1);}}
        @keyframes modalIn{from{opacity:0;transform:scale(0.93);}to{opacity:1;transform:scale(1);}}
        input:focus,select:focus{border-color:#0a3b5c!important;box-shadow:0 0 0 3px rgba(10,59,92,0.1);}
        nav::-webkit-scrollbar{height:0;}
      `}</style>
    </div>
  );
};

export default UzoniaUploadsPage;