import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import CbuLogo   from '../../assets/CBU_Logo.png';
import facebook  from '../../assets/facebook.png';
import telegram  from '../../assets/telegram.png';
import linkedin  from '../../assets/linkedin.png';
import twitter   from '../../assets/twitter.png';
import instagram from '../../assets/instagram.png';
import youtube   from '../../assets/youtube.png';

// ─────────────────────────────────────────────────────────────────────────────
// Config & Auth
// ─────────────────────────────────────────────────────────────────────────────

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const authHeader   = () => `Bearer ${localStorage.getItem('session_id') ?? ''}`;

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
  { key: 'calculations', icon: 'calculate',          path: '/calculations' },
  { key: 'uploads',      icon: 'upload_file',        path: '/uploads'      },
  { key: 'repo',         icon: 'account_balance',    path: '/repo'         },
  { key: 'depo',         icon: 'savings',            path: '/depo'         },
  { key: 'data',         icon: 'database',           path: '/data'         },
  { key: 'holidays',     icon: 'calendar_month',     path: '/holidays'     },
  { key: 'banks',        icon: 'currency_exchange',  path: '/banks'        },
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
    depo: 'Depo', data: 'Data', holidays: 'Holidays', banks: 'Banks',
    // stats
    totalHolidays:   'Total Holidays',
    upcoming:        'Upcoming',
    pastHolidays:    'Past Holidays',
    recentCreated:   'Created (30 days)',
    recentUpdated:   'Updated (30 days)',
    // table headers
    colIndex:       '#',
    colDate:        'DATE',
    colDay:         'DAY',
    colDescription: 'DESCRIPTION',
    colUsername:    'USERNAME',
    colName:        'NAME',
    colDepartment:  'DEPARTMENT',
    colStatus:      'STATUS',
    colCreatedAt:   'CREATED AT',
    colUpdatedAt:   'UPDATED AT',
    colActions:     'ACTIONS',
    // filters
    filterLabel:    'Filters:',
    phDate:         'Holiday date…',
    phDescription:  'Search description…',
    phUsername:     'Username…',
    phName:         'Search name…',
    phDepartment:   'Department…',
    phCreatedAt:    'Created date…',
    phUpdatedAt:    'Updated date…',
    allFilter:      'All',
    upcomingFilter: '⬆ Upcoming',
    pastFilter:     '⬇ Past',
    clearAll:       'Clear all',
    results:        (n: number) => `${n} result${n !== 1 ? 's' : ''}`,
    // table states
    loading:       'Loading holidays…',
    failedLoad:    'Failed to load holidays.',
    noMatch:       'No holidays match your filters.',
    noData:        'No holidays found. Click "Add Holiday" to get started.',
    clearFilters:  'Clear filters',
    showing:       (from: number, to: number, total: number) => `Showing ${from}–${to} of ${total}`,
    previous:      'Prev',
    next:          'Next',
    // badges
    upcomingBadge: 'Upcoming',
    pastBadge:     'Past',
    // actions
    edit:          'Edit',
    delete:        'Delete',
    addHoliday:    'Add Holiday',
    // add modal
    addTitle:        'Add New Holiday',
    holidayDate:     'Holiday Date',
    description:     'Description',
    descPlaceholder: 'e.g. Independence Day of Uzbekistan',
    cancel:          'Cancel',
    adding:          'Adding…',
    addBtn:          'Add Holiday',
    addSuccess:      'Holiday added successfully!',
    addFailed:       'Failed to add holiday.',
    dateRequired:    'Date and description are required.',
    // edit modal
    editTitle:     'Edit Holiday',
    dayOfWeek:     'Day of Week',
    createdAt:     'Created At',
    lastUpdated:   'Last Updated',
    saving:        'Saving…',
    saveChanges:   'Save Changes',
    editSuccess:   'Holiday updated successfully!',
    editFailed:    'Failed to update holiday.',
    descRequired:  'Description is required.',
    // delete modal
    deleteTitle:      'Delete Holiday',
    deleteConfirm:    'Are you sure you want to delete this holiday?',
    deleteDate:       'Date',
    deleteDay:        'Day',
    deleteDesc:       'Description',
    deleteCreated:    'Created',
    deleteIrrev:      '⚠️ This action cannot be undone.',
    deleting:         'Deleting…',
    deleteBtn:        'Delete Holiday',
    deleteSuccess:    'Holiday deleted successfully!',
    deleteFailed:     'Failed to delete holiday.',
    // user dropdown
    usersBtn:    'Users',
    sessionsBtn: 'Sessions',
    actionsBtn:  'Actions',
    signOut:     'Sign Out',
    department:  'Department',
    // lang modal
    langConfirmTitle: 'Change Language',
    langConfirmMsg:   (lang: string) => `Are you sure you want to switch the interface language to ${lang}?`,
    confirm:          'Yes, change',
    // user info card
    loggedInAs:  'Logged in as',
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
    // session
    sessionExpired: 'Session expired. Please log in again.',
  },
  ru: {
    bankName:     'Центральный Банк Республики Узбекистан',
    deptSubtitle: 'Департамент Mонетарных Oпераций',
    calculations: 'Расчёты', uploads: 'Загрузки', repo: 'Репо',
    depo: 'Депо', data: 'Данные', holidays: 'Праздники', banks: 'Банки',
    totalHolidays:   'Всего праздников',
    upcoming:        'Предстоящие',
    pastHolidays:    'Прошедшие',
    recentCreated:   'Добавлено (30 дней)',
    recentUpdated:   'Обновлено (30 дней)',
    colIndex:       '#',
    colDate:        'ДАТА',
    colDay:         'ДЕНЬ',
    colDescription: 'ОПИСАНИЕ',
    colUsername:    'ИМЯ ПОЛЬЗОВАТЕЛЯ',
    colName:        'ИМЯ',
    colDepartment:  'ОТДЕЛ',
    colStatus:      'СТАТУС',
    colCreatedAt:   'СОЗДАН',
    colUpdatedAt:   'ОБНОВЛЁН',
    colActions:     'ДЕЙСТВИЯ',
    filterLabel:    'Фильтры:',
    phDate:         'Дата праздника…',
    phDescription:  'Поиск по описанию…',
    phUsername:     'Имя пользователя…',
    phName:         'Поиск по имени…',
    phDepartment:   'Отдел…',
    phCreatedAt:    'Дата создания…',
    phUpdatedAt:    'Дата обновления…',
    allFilter:      'Все',
    upcomingFilter: '⬆ Предстоящие',
    pastFilter:     '⬇ Прошедшие',
    clearAll:       'Очистить',
    results:        (n: number) => `${n} запис${n === 1 ? 'ь' : n < 5 ? 'и' : 'ей'}`,
    loading:       'Загрузка праздников…',
    failedLoad:    'Ошибка загрузки.',
    noMatch:       'Праздники не найдены.',
    noData:        'Нет праздников. Нажмите «Добавить праздник».',
    clearFilters:  'Сбросить фильтры',
    showing:       (from: number, to: number, total: number) => `Показано ${from}–${to} из ${total}`,
    previous:      'Назад',
    next:          'Вперёд',
    upcomingBadge: 'Предстоящий',
    pastBadge:     'Прошедший',
    edit:          'Изменить',
    delete:        'Удалить',
    addHoliday:    'Добавить праздник',
    addTitle:        'Добавить праздник',
    holidayDate:     'Дата праздника',
    description:     'Описание',
    descPlaceholder: 'напр. День независимости Узбекистана',
    cancel:          'Отмена',
    adding:          'Добавление…',
    addBtn:          'Добавить',
    addSuccess:      'Праздник успешно добавлен!',
    addFailed:       'Ошибка добавления.',
    dateRequired:    'Дата и описание обязательны.',
    editTitle:     'Редактировать праздник',
    dayOfWeek:     'День недели',
    createdAt:     'Создан',
    lastUpdated:   'Обновлён',
    saving:        'Сохранение…',
    saveChanges:   'Сохранить изменения',
    editSuccess:   'Праздник успешно обновлён!',
    editFailed:    'Ошибка обновления.',
    descRequired:  'Описание обязательно.',
    deleteTitle:      'Удалить праздник',
    deleteConfirm:    'Вы уверены, что хотите удалить этот праздник?',
    deleteDate:       'Дата',
    deleteDay:        'День',
    deleteDesc:       'Описание',
    deleteCreated:    'Создан',
    deleteIrrev:      '⚠️ Это действие нельзя отменить.',
    deleting:         'Удаление…',
    deleteBtn:        'Удалить праздник',
    deleteSuccess:    'Праздник успешно удалён!',
    deleteFailed:     'Ошибка удаления.',
    usersBtn:    'Пользователи',
    sessionsBtn: 'Сессии',
    actionsBtn:  'Действия',
    signOut:     'Выйти',
    department:  'Отдел',
    langConfirmTitle: 'Изменить язык',
    langConfirmMsg:   (lang: string) => `Вы уверены, что хотите изменить язык интерфейса на ${lang}?`,
    confirm:          'Да, изменить',
    loggedInAs:  'Вы вошли как',
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
    sessionExpired: 'Сессия истекла. Пожалуйста, войдите снова.',
  },
  uz_c: {
    bankName:     'Ўзбекистон Республикаси Марказий Банки',
    deptSubtitle: 'Монетар Oперациялар Департаменти',
    calculations: 'Ҳисоб-китоб', uploads: 'Юклашлар', repo: 'Репо',
    depo: 'Депо', data: 'Маълумотлар', holidays: 'Байрамлар', banks: 'Банклар',
    totalHolidays:   'Жами байрамлар',
    upcoming:        'Яқинлашаётган',
    pastHolidays:    'Ўтган байрамлар',
    recentCreated:   'Қўшилган (30 кун)',
    recentUpdated:   'Янгиланган (30 кун)',
    colIndex:       '#',
    colDate:        'САНА',
    colDay:         'КУН',
    colDescription: 'ТАВСИФ',
    colUsername:    'ФОЙДАЛАНУВЧИ',
    colName:        'ИСМ',
    colDepartment:  'БЎЛИМ',
    colStatus:      'ҲОЛАТ',
    colCreatedAt:   'ЯРАТИЛГАН',
    colUpdatedAt:   'ЯНГИЛАНГАН',
    colActions:     'АМАЛЛАР',
    filterLabel:    'Фильтрлар:',
    phDate:         'Байрам санаси…',
    phDescription:  'Тавсиф бўйича қидириш…',
    phUsername:     'Фойдаланувчи…',
    phName:         'Ном бўйича қидириш…',
    phDepartment:   'Бўлим…',
    phCreatedAt:    'Яратилган сана…',
    phUpdatedAt:    'Янгиланган сана…',
    allFilter:      'Барча',
    upcomingFilter: '⬆ Яқинлашаётган',
    pastFilter:     '⬇ Ўтган',
    clearAll:       'Тозалаш',
    results:        (n: number) => `${n} та натижа`,
    loading:       'Байрамлар олинмоқда…',
    failedLoad:    'Юклашда хато.',
    noMatch:       'Байрамлар топилмади.',
    noData:        'Байрамлар йўқ. «Байрам қўшиш»ни босинг.',
    clearFilters:  'Фильтрларни тозалаш',
    showing:       (from: number, to: number, total: number) => `${total} тадан ${from}–${to} кўрсатилмоқда`,
    previous:      'Олдинги',
    next:          'Кейинги',
    upcomingBadge: 'Яқинлашаётган',
    pastBadge:     'Ўтган',
    edit:          'Таҳрирлаш',
    delete:        'Ўчириш',
    addHoliday:    'Байрам қўшиш',
    addTitle:        'Янги байрам қўшиш',
    holidayDate:     'Байрам санаси',
    description:     'Тавсиф',
    descPlaceholder: 'мас. Ўзбекистон мустақиллик куни',
    cancel:          'Бекор қилиш',
    adding:          'Қўшилмоқда…',
    addBtn:          'Байрам қўшиш',
    addSuccess:      'Байрам муваффақиятли қўшилди!',
    addFailed:       'Байрам қўшишда хато.',
    dateRequired:    'Сана ва тавсиф талаб қилинади.',
    editTitle:     'Байрамни таҳрирлаш',
    dayOfWeek:     'Ҳафта куни',
    createdAt:     'Яратилган',
    lastUpdated:   'Янгиланган',
    saving:        'Сақланмоқда…',
    saveChanges:   'Ўзгаришларни сақлаш',
    editSuccess:   'Байрам муваффақиятли янгиланди!',
    editFailed:    'Янгилашда хато.',
    descRequired:  'Тавсиф талаб қилинади.',
    deleteTitle:      'Байрамни ўчириш',
    deleteConfirm:    'Ушбу байрамни ўчиришга ишончингиз комилми?',
    deleteDate:       'Сана',
    deleteDay:        'Кун',
    deleteDesc:       'Тавсиф',
    deleteCreated:    'Яратилган',
    deleteIrrev:      '⚠️ Бу амални қайтариб бўлмайди.',
    deleting:         'Ўчирилмоқда…',
    deleteBtn:        'Байрамни ўчириш',
    deleteSuccess:    'Байрам муваффақиятли ўчирилди!',
    deleteFailed:     'Ўчиришда хато.',
    usersBtn:    'Фойдаланувчилар',
    sessionsBtn: 'Сессиялар',
    actionsBtn:  'Ҳаракатлар',
    signOut:     'Чиқиш',
    department:  'Бўлим',
    langConfirmTitle: 'Тилни ўзгартириш',
    langConfirmMsg:   (lang: string) => `Интерфейс тилини ${lang} тилига ўзгартиришга ишончингиз комилми?`,
    confirm:          'Ҳа, ўзгартириш',
    loggedInAs:  'Кирдингиз',
    officialDesc:  'UZONIA – Банклараро операциялар, ҳисоб-китоблар ва маълумотларни қайта ишлаш платформаси',
    aboutCbu:      'МБ Ҳақида',
    executiveB:    'Бошқарув кенгаши',
    legislation:   'Қонунчилик',
    publications:  'Публикациялар',
    dataStats:     'Mаълумотлар & Статистика',
    services:      'Хизматлар',
    exchangeR:     'Валюта курслари',
    policyR:       'Асосий ставка',
    paymentS:      'Тўлов тизимлари',
    licensing:     'Лицензиялаш',
    pressCenter:   'Ахборот хизмати',
    contact:       'Боғланиш',
    addressS:      'Ислом Каримов Kўчаси, 6',
    modules:       'Модуллар',
    copyright:     '© 2026 Ўзбекистон Республикаси Марказий Банки. Барча ҳуқуқлар ҳимояланган.',
    privacyPolicy: 'Махфийлик сиёсати',
    termsOfUse:    'Фойдаланиш шартлари',
    sessionExpired: 'Сессия муддати тугади. Илтимос, қайта киринг.',
  },
  uz_l: {
    bankName:     "O'zbekiston Respublikasi Markaziy Banki",
    deptSubtitle: 'Monetar Operatsiyalar Departamenti',
    calculations: "Hisob-kitob", uploads: 'Yuklamalar', repo: 'Repo',
    depo: 'Depo', data: "Ma'lumotlar", holidays: 'Bayramlar', banks: 'Banklar',
    totalHolidays:   'Jami bayramlar',
    upcoming:        "Yaqinlashayotgan",
    pastHolidays:    "O'tgan bayramlar",
    recentCreated:   "Qo'shilgan (30 kun)",
    recentUpdated:   'Yangilangan (30 kun)',
    colIndex:       '#',
    colDate:        'SANA',
    colDay:         'KUN',
    colDescription: 'TAVSIF',
    colUsername:    'FOYDALANUVCHI',
    colName:        'ISM',
    colDepartment:  "BO'LIM",
    colStatus:      'HOLAT',
    colCreatedAt:   'YARATILGAN',
    colUpdatedAt:   'YANGILANGAN',
    colActions:     'AMALLAR',
    filterLabel:    'Filtrlar:',
    phDate:         'Bayram sanasi…',
    phDescription:  'Tavsif bo\'yicha qidirish…',
    phUsername:     'Foydalanuvchi…',
    phName:         "Nom bo'yicha qidirish…",
    phDepartment:   "Bo'lim…",
    phCreatedAt:    'Yaratilgan sana…',
    phUpdatedAt:    'Yangilangan sana…',
    allFilter:      'Barchasi',
    upcomingFilter: "⬆ Yaqinlashayotgan",
    pastFilter:     "⬇ O'tgan",
    clearAll:       'Tozalash',
    results:        (n: number) => `${n} ta natija`,
    loading:       'Bayramlar olinmoqda…',
    failedLoad:    'Yuklashda xato.',
    noMatch:       'Bayramlar topilmadi.',
    noData:        "Bayramlar yo'q. «Bayram qo'shish»ni bosing.",
    clearFilters:  "Filtrlarni tozalash",
    showing:       (from: number, to: number, total: number) => `${total} tadan ${from}–${to} ko'rsatilmoqda`,
    previous:      'Oldingi',
    next:          'Keyingi',
    upcomingBadge: "Yaqinlashayotgan",
    pastBadge:     "O'tgan",
    edit:          'Tahrirlash',
    delete:        "O'chirish",
    addHoliday:    "Bayram qo'shish",
    addTitle:        "Yangi bayram qo'shish",
    holidayDate:     'Bayram sanasi',
    description:     'Tavsif',
    descPlaceholder: "mas. O'zbekiston mustaqillik kuni",
    cancel:          'Bekor qilish',
    adding:          "Qo'shilmoqda…",
    addBtn:          "Bayram qo'shish",
    addSuccess:      "Bayram muvaffaqiyatli qo'shildi!",
    addFailed:       "Bayram qo'shishda xato.",
    dateRequired:    "Sana va tavsif talab qilinadi.",
    editTitle:     'Bayramni tahrirlash',
    dayOfWeek:     'Hafta kuni',
    createdAt:     'Yaratilgan',
    lastUpdated:   'Yangilangan',
    saving:        'Saqlanmoqda…',
    saveChanges:   "O'zgarishlarni saqlash",
    editSuccess:   'Bayram muvaffaqiyatli yangilandi!',
    editFailed:    'Yangilashda xato.',
    descRequired:  'Tavsif talab qilinadi.',
    deleteTitle:      "Bayramni o'chirish",
    deleteConfirm:    "Ushbu bayramni o'chirishga ishonchingiz komilmi?",
    deleteDate:       'Sana',
    deleteDay:        'Kun',
    deleteDesc:       'Tavsif',
    deleteCreated:    'Yaratilgan',
    deleteIrrev:      "⚠️ Bu amalni qaytarib bo'lmaydi.",
    deleting:         "O'chirilmoqda…",
    deleteBtn:        "Bayramni o'chirish",
    deleteSuccess:    "Bayram muvaffaqiyatli o'chirildi!",
    deleteFailed:     "O'chirishda xato.",
    usersBtn:    'Foydalanuvchilar',
    sessionsBtn: 'Sessiyalar',
    actionsBtn:  'Harakatlar',
    signOut:     'Chiqish',
    department:  "Bo'lim",
    langConfirmTitle: "Tilni o'zgartirish",
    langConfirmMsg:   (lang: string) => `Interfeys tilini ${lang} tiliga o'zgartirishga ishonchingiz komilmi?`,
    confirm:          "Ha, o'zgartirish",
    loggedInAs:  'Kirdingiz',
    officialDesc:  "UZONIA – Banklararo operatsiyalar, hisob-kitoblar va ma'lumotlarni qayta ishlash platformasi",
    aboutCbu:      "MBU Haqida",
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
    sessionExpired: 'Sessiya muddati tugadi. Iltimos, qayta kiring.',
  },
};

type LangKey = keyof typeof TRANSLATIONS;
const LANG_LABELS: Record<LangKey, string> = { en: 'EN', ru: 'RU', uz_c: 'УЗ', uz_l: "O'Z" };
const LANG_NAMES:  Record<LangKey, string> = { en: 'English', ru: 'Русский', uz_c: 'Ўзбекча', uz_l: "O'zbekcha" };

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Holiday {
  holiday_date: string;
  description:  string;
  created_at:   string | null;
  updated_at:   string | null;
  username?:    string | null;
  first_name?:  string | null;
  last_name?:   string | null;
  department?:  string | null;
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

const getDayName = (s: string): string => {
  if (!s) return '—';
  const d = new Date(s);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-GB', { weekday: 'long' });
};

const isUpcoming = (s: string): boolean => {
  const d = new Date(s);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
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

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

const HolidaysPage: React.FC = () => {
  const navigate    = useNavigate();
  const currentPath = '/holidays';

  // ── Responsive ───────────────────────────────────────────────────────────
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ── State ─────────────────────────────────────────────────────────────────
  const [user,       setUser]       = useState<CurrentUser | null>(null);
  const [holidays,   setHolidays]   = useState<Holiday[]>([]);
  const [lang,       setLang]       = useState<LangKey>('en');
  const [pendingLang,setPendingLang]= useState<LangKey | null>(null);
  const [isLoading,  setIsLoading]  = useState(true);
  const [loadError,  setLoadError]  = useState<string | null>(null);

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
      const res = await apiFetch('/api/get_all_holidays');
      if (!res) return; // redirected
      if (!res.ok) {
        if (res.status === 404) { setHolidays([]); setLoadError(null); return; }
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      setHolidays(Array.isArray(data.Data) ? data.Data : []);
      setUser(data.user ?? null);
      setLoadError(null);

      // Sync language from user preference
      const langMap: Record<string, LangKey> = { en:'en', ru:'ru', uz_c:'uz_c', uz_l:'uz_l' };
      const mapped = langMap[data.user?.language];
      if (mapped) setLang(mapped);
    } catch {
      setLoadError(TRANSLATIONS[lang]?.failedLoad ?? 'Failed to load.');
      setHolidays([]);
    } finally {
      setIsLoading(false);
    }
  }, []); // intentionally empty — called once on mount

  // ── Mount: check session_expired then fetch ────────────────────────────────
  useEffect(() => {
    const expired = sessionStorage.getItem('session_expired');
    if (expired) {
      showToast(TRANSLATIONS[lang]?.sessionExpired ?? 'Session expired.', 'info');
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
        const res = await fetch(`${API_BASE_URL}/api/get_all_holidays`, {
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
      const res = await apiFetch(`/api/update_language?language=${newLang}`, { method: 'PUT' });
      if (!res || !res.ok) return;
      const data = await res.json();
      setLang(newLang);
      setUser(data.user);
    } catch {}
  }, []);

  const getInitials = (u: CurrentUser | null) => {
    if (!u) return '?';
    return ((u.first_name?.[0] ?? '') + (u.last_name?.[0] ?? '')).toUpperCase() || u.username?.[0]?.toUpperCase() || '?';
  };

  // ── Toast ─────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState<{ text: string; type: 'success'|'error'|'info' } | null>(null);
  const showToast = (text: string, type: 'success'|'error'|'info' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Filters ───────────────────────────────────────────────────────────────
  const [fDate,        setFDate]        = useState('');
  const [fDescription, setFDescription] = useState('');
  const [fUsername,    setFUsername]    = useState('');
  const [fName,        setFName]        = useState('');
  const [fDepartment,  setFDepartment]  = useState('');
  const [fCreatedAt,   setFCreatedAt]   = useState('');
  const [fUpdatedAt,   setFUpdatedAt]   = useState('');
  const [fPeriod,      setFPeriod]      = useState<'all'|'upcoming'|'past'>('all');
  const [currentPage,  setCurrentPage]  = useState(1);
  const itemsPerPage = 10;

  const filteredData = useMemo(() => {
    let f = [...holidays];
    const ci = (s: string) => s?.toLowerCase() || '';

    if (fDate.trim())        f = f.filter(h => formatDate(h.holiday_date).includes(fDate.trim()));
    if (fDescription.trim()) f = f.filter(h => ci(h.description).includes(ci(fDescription.trim())));
    if (fUsername.trim())    f = f.filter(h => ci(h.username || '').includes(ci(fUsername.trim())));
    if (fName.trim()) {
      f = f.filter(h => {
        const fullName = `${h.last_name || ''} ${h.first_name || ''}`.trim();
        const nameForSearch = `${h.last_name || ''}, ${h.first_name || ''}`.trim();
        return ci(fullName).includes(ci(fName.trim())) || ci(nameForSearch).includes(ci(fName.trim()));
      });
    }
    if (fDepartment.trim())  f = f.filter(h => ci(h.department || '').includes(ci(fDepartment.trim())));
    if (fCreatedAt.trim())   f = f.filter(h => ci(formatDateTime(h.created_at)).includes(ci(fCreatedAt.trim())));
    if (fUpdatedAt.trim())   f = f.filter(h => ci(formatDateTime(h.updated_at)).includes(ci(fUpdatedAt.trim())));
    if (fPeriod === 'upcoming') f = f.filter(h => isUpcoming(h.holiday_date));
    if (fPeriod === 'past')     f = f.filter(h => !isUpcoming(h.holiday_date));
    return f;
  }, [holidays, fDate, fDescription, fUsername, fName, fDepartment, fCreatedAt, fUpdatedAt, fPeriod]);

  const stats = useMemo(() => ({
    total:         holidays.length,
    upcoming:      holidays.filter(h => isUpcoming(h.holiday_date)).length,
    past:          holidays.filter(h => !isUpcoming(h.holiday_date)).length,
    recentCreated: holidays.filter(h => isRecent(h.created_at)).length,
    recentUpdated: holidays.filter(h => isRecent(h.updated_at)).length,
  }), [holidays]);

  const hasActiveFilters = fDate || fDescription || fUsername || fName || fDepartment || fCreatedAt || fUpdatedAt || fPeriod !== 'all';
  const totalPages       = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData    = useMemo(
    () => filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage),
    [filteredData, currentPage]
  );
  useEffect(() => { setCurrentPage(1); }, [fDate, fDescription, fUsername, fName, fDepartment, fCreatedAt, fUpdatedAt, fPeriod]);

  const clearFilters = useCallback(() => {
    setFDate(''); setFDescription(''); setFUsername(''); setFName('');
    setFDepartment(''); setFCreatedAt(''); setFUpdatedAt(''); setFPeriod('all');
  }, []);

  // ── Modals ────────────────────────────────────────────────────────────────
  const [isAddModalOpen,    setIsAddModalOpen]    = useState(false);
  const [isEditModalOpen,   setIsEditModalOpen]   = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [targetHoliday,     setTargetHoliday]     = useState<Holiday | null>(null);
  const [isSaving,          setIsSaving]          = useState(false);
  const [isDeleting,        setIsDeleting]        = useState(false);

  const [addForm,  setAddForm]  = useState({ new_holiday: '', new_description: '' });
  const [editForm, setEditForm] = useState({ description: '' });

  const openAddModal    = () => { setAddForm({ new_holiday: '', new_description: '' }); setIsAddModalOpen(true); };
  const openEditModal   = (h: Holiday) => { setTargetHoliday(h); setEditForm({ description: h.description }); setIsEditModalOpen(true); };
  const openDeleteModal = (h: Holiday) => { setTargetHoliday(h); setIsDeleteModalOpen(true); };

  // ── CRUD handlers ─────────────────────────────────────────────────────────
  const handleAdd = async () => {
    if (!addForm.new_holiday || !addForm.new_description.trim()) {
      showToast(t.dateRequired, 'error'); return;
    }
    setIsSaving(true);
    try {
      const p = new URLSearchParams({ new_holiday: addForm.new_holiday, new_description: addForm.new_description });
      const res = await apiFetch(`/api/add_new_holiday?${p}`, { method: 'POST' });
      if (!res || !res.ok) { const e = await res!.json(); throw new Error(e.detail); }
      setIsAddModalOpen(false);
      await fetchData();
      showToast(t.addSuccess, 'success');
    } catch (err: any) { showToast(err.message || t.addFailed, 'error'); }
    finally { setIsSaving(false); }
  };

  const handleEdit = async () => {
    if (!targetHoliday) return;
    if (!editForm.description.trim()) { showToast(t.descRequired, 'error'); return; }
    setIsSaving(true);
    try {
      const p = new URLSearchParams({ description: editForm.description, old_holiday_date: targetHoliday.holiday_date });
      const res = await apiFetch(`/api/edit_holiday?${p}`, { method: 'PUT' });
      if (!res || !res.ok) { const e = await res!.json(); throw new Error(e.detail); }
      setIsEditModalOpen(false); setTargetHoliday(null);
      await fetchData();
      showToast(t.editSuccess, 'success');
    } catch (err: any) { showToast(err.message || t.editFailed, 'error'); }
    finally { setIsSaving(false); }
  };

  const handleDelete = async () => {
    if (!targetHoliday) return;
    setIsDeleting(true);
    try {
      const res = await apiFetch(`/api/delete_holiday?holiday_date=${targetHoliday.holiday_date}`, { method: 'DELETE' });
      if (!res || !res.ok) { const e = await res!.json(); throw new Error(e.detail); }
      setIsDeleteModalOpen(false); setTargetHoliday(null);
      await fetchData();
      showToast(t.deleteSuccess, 'success');
    } catch (err: any) { showToast(err.message || t.deleteFailed, 'error'); }
    finally { setIsDeleting(false); }
  };

  // ── Shared styles ─────────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', fontSize: '13px',
    background: '#f8fafc', color: '#0f172a', border: '1px solid #e2e8f0',
    borderRadius: '9px', outline: 'none', boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', marginBottom: '5px', fontWeight: '600', color: '#374151', fontSize: '13px',
  };
  const filterInputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 8px 8px 28px', fontSize: '11px',
    background: '#f8fafc', color: '#0f172a', border: '1px solid #e2e8f0',
    borderRadius: '8px', outline: 'none', boxSizing: 'border-box',
  };

  // ── NavBtn ────────────────────────────────────────────────────────────────
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
        {!isMobile && label}
      </button>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', width: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc', fontFamily: '"Inter","Segoe UI",system-ui,-apple-system,sans-serif' }}>

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: 'fixed', top: '24px', right: '24px', zIndex: 2000,
          background: toast.type === 'success' ? '#065f46' : toast.type === 'info' ? '#1e40af' : '#991b1b',
          color: 'white', padding: '13px 18px', borderRadius: '12px',
          display: 'flex', alignItems: 'center', gap: '10px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)', fontSize: '14px', fontWeight: '500',
          animation: 'slideIn 0.3s ease', maxWidth: '400px',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '19px', flexShrink: 0 }}>
            {toast.type === 'success' ? 'check_circle' : toast.type === 'info' ? 'info' : 'error'}
          </span>
          {toast.text}
        </div>
      )}

      {/* ── Language Confirm Modal ── */}
      {pendingLang && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(7,30,46,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500, backdropFilter: 'blur(4px)' }}
          onClick={() => setPendingLang(null)}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '32px 28px', maxWidth: '380px', width: '90%', boxShadow: '0 32px 64px rgba(0,0,0,0.25)', animation: 'modalIn 0.2s ease' }}
            onClick={e => e.stopPropagation()}>
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
              <button onClick={() => setPendingLang(null)}
                style={{ flex: 1, padding: '11px', background: '#f1f5f9', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', color: '#64748b', cursor: 'pointer', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
                onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}
              >{t.cancel}</button>
              <button onClick={() => applyLanguageChange(pendingLang)}
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

          {/* Nav */}
          <div style={{ padding: '0 10px', overflowX: 'auto' }}>
            <nav style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '40px', minWidth: 'max-content', flexWrap: 'nowrap' }}>
              {NAV_PAGES.map(p => <NavBtn key={p.path} page={p} />)}
            </nav>
          </div>

          <div style={{ flex: 1, minWidth: 0 }} />

          {/* Right: lang + avatar */}
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
            <div ref={dropdownRef} style={{ position: 'relative', flexShrink: 0 }}>
              <button onClick={() => setDropdownOpen(o => !o)} style={{
                background: 'rgba(255,255,255,0.1)', border: '2px solid rgba(233,183,65,0.5)',
                borderRadius: '50%', width: '44px', height: '44px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'all 0.2s', color: 'white', fontSize: '18px', fontWeight: '700',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#e9b741'; e.currentTarget.style.background = 'rgba(233,183,65,0.2)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(233,183,65,0.5)'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
              >
                {getInitials(user)}
              </button>

              {dropdownOpen && (
                <div style={{ position: 'absolute', top: 'calc(100% + 10px)', right: 0, background: 'white', borderRadius: '16px', minWidth: '260px', boxShadow: '0 20px 40px rgba(0,0,0,0.18)', overflow: 'hidden', border: '1px solid #e2e8f0', zIndex: 200, animation: 'dropIn 0.18s ease' }}>
                  {/* User info */}
                  <div style={{ padding: '20px', borderBottom: '1px solid #f1f5f9', background: 'linear-gradient(135deg,#f8fafc,#eef2f7)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg,#0a3b5c,#1a5080)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '18px', fontWeight: '700', flexShrink: 0, border: '3px solid #e9b741' }}>
                        {getInitials(user)}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: '700', color: '#0a3b5c', fontSize: '15px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {user ? `${user.first_name} ${user.last_name}` : '—'}
                        </div>
                        <div style={{ color: '#64748b', fontSize: '12px', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          @{user?.username ?? '—'}
                        </div>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '6px', padding: '3px 10px', background: '#e8f0fe', borderRadius: '20px', fontSize: '11px', color: '#0a3b5c', fontWeight: '600' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>domain</span>
                          {user?.department ?? t.department}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Admin section */}
                  {user?.is_admin && (
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
                          onClick={() => { navigate(route); setDropdownOpen(false); }}
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
                      onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}>
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
      <main style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: isMobile ? '20px 16px' : '28px 32px', background: '#f8fafc', boxSizing: 'border-box' }}>
        <div style={{ width: '100%', maxWidth: '1600px', margin: '0 auto' }}>

          {/* ── Stats row ── */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(5,1fr)', gap: '12px', marginBottom: '20px' }}>
            {[
              { label: t.totalHolidays,   value: stats.total,         color: '#0a3b5c', bg: '#e2e8f0', icon: 'calendar_month'  },
              { label: t.upcoming,        value: stats.upcoming,      color: '#065f46', bg: '#d1fae5', icon: 'event_upcoming'   },
              { label: t.pastHolidays,    value: stats.past,          color: '#1e40af', bg: '#dbeafe', icon: 'history'          },
              { label: t.recentCreated,   value: stats.recentCreated, color: '#92400e', bg: '#fef3c7', icon: 'add_circle'       },
              { label: t.recentUpdated,   value: stats.recentUpdated, color: '#6b21a8', bg: '#f3e8ff', icon: 'update'           },
            ].map(s => (
              <div key={s.label} style={{ background: 'white', padding: '14px 16px', borderRadius: '14px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '38px', height: '38px', background: s.bg, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '19px', color: s.color }}>{s.icon}</span>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '2px', lineHeight: 1.2 }}>{s.label}</div>
                  <div style={{ fontSize: '22px', fontWeight: '700', color: s.color, lineHeight: 1 }}>{s.value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Filter bar ── */}
          <div style={{ background: 'white', padding: '14px 18px', borderRadius: '14px', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,40,70,0.05)', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#0a3b5c', flexShrink: 0 }}>filter_alt</span>
              <span style={{ fontSize: '12px', fontWeight: '500', color: '#374151', flexShrink: 0 }}>{t.filterLabel}</span>

              {/* Date filter */}
              <div style={{ position: 'relative', flex: '1 1 100px', minWidth: '90px' }}>
                <span className="material-symbols-outlined" style={{ position: 'absolute', left: '7px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '13px' }}>event</span>
                <input type="text" value={fDate} onChange={e => setFDate(e.target.value)} placeholder={t.phDate} style={filterInputStyle} />
              </div>

              {/* Description filter */}
              <div style={{ position: 'relative', flex: '2 1 140px', minWidth: '110px' }}>
                <span className="material-symbols-outlined" style={{ position: 'absolute', left: '7px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '13px' }}>search</span>
                <input type="text" value={fDescription} onChange={e => setFDescription(e.target.value)} placeholder={t.phDescription} style={filterInputStyle} />
              </div>

              {/* Username filter */}
              <div style={{ position: 'relative', flex: '1 1 100px', minWidth: '90px' }}>
                <span className="material-symbols-outlined" style={{ position: 'absolute', left: '7px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '13px' }}>badge</span>
                <input type="text" value={fUsername} onChange={e => setFUsername(e.target.value)} placeholder={t.phUsername} style={filterInputStyle} />
              </div>

              {/* Name filter */}
              <div style={{ position: 'relative', flex: '2 1 140px', minWidth: '120px' }}>
                <span className="material-symbols-outlined" style={{ position: 'absolute', left: '7px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '13px' }}>person</span>
                <input type="text" value={fName} onChange={e => setFName(e.target.value)} placeholder={t.phName} style={filterInputStyle} />
              </div>

              {/* Department filter */}
              <div style={{ position: 'relative', flex: '1 1 100px', minWidth: '90px' }}>
                <span className="material-symbols-outlined" style={{ position: 'absolute', left: '7px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '13px' }}>domain</span>
                <input type="text" value={fDepartment} onChange={e => setFDepartment(e.target.value)} placeholder={t.phDepartment} style={filterInputStyle} />
              </div>

              {/* Created at filter */}
              <div style={{ position: 'relative', flex: '1 1 110px', minWidth: '90px' }}>
                <span className="material-symbols-outlined" style={{ position: 'absolute', left: '7px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '13px' }}>schedule</span>
                <input type="text" value={fCreatedAt} onChange={e => setFCreatedAt(e.target.value)} placeholder={t.phCreatedAt} style={filterInputStyle} />
              </div>

              {/* Updated at filter */}
              <div style={{ position: 'relative', flex: '1 1 110px', minWidth: '90px' }}>
                <span className="material-symbols-outlined" style={{ position: 'absolute', left: '7px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '13px' }}>update</span>
                <input type="text" value={fUpdatedAt} onChange={e => setFUpdatedAt(e.target.value)} placeholder={t.phUpdatedAt} style={filterInputStyle} />
              </div>

              {/* Period toggle */}
              <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                {(['all','upcoming','past'] as const).map(opt => (
                  <button key={opt} onClick={() => setFPeriod(opt)} style={{
                    padding: '7px 10px', fontSize: '11px', fontWeight: '500',
                    background: fPeriod === opt ? '#0a3b5c' : '#f1f5f9',
                    color: fPeriod === opt ? 'white' : '#475569',
                    border: fPeriod === opt ? '1px solid #0a3b5c' : '1px solid #e2e8f0',
                    borderRadius: '8px', cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
                  }}>
                    {opt === 'all' ? t.allFilter : opt === 'upcoming' ? t.upcomingFilter : t.pastFilter}
                  </button>
                ))}
              </div>

              {hasActiveFilters && (
                <button onClick={clearFilters} style={{ padding: '7px 10px', fontSize: '11px', fontWeight: '500', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>close</span>
                  {t.clearAll}
                </button>
              )}

              {/* Add button — pushed to far right */}
              <button onClick={openAddModal} style={{
                marginLeft: 'auto', flexShrink: 0, padding: '8px 16px', fontSize: '13px', fontWeight: '600',
                background: 'linear-gradient(135deg,#0a3b5c,#1a6494)', color: 'white', border: '2px solid rgba(233,183,65,0.4)',
                borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                boxShadow: '0 3px 12px rgba(10,59,92,0.3)', transition: 'all 0.15s',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg,#e9b741,#d4a030)'; e.currentTarget.style.color = '#0a3b5c'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg,#0a3b5c,#1a6494)'; e.currentTarget.style.color = 'white'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add_circle</span>
                {t.addHoliday}
              </button>
            </div>

            {hasActiveFilters && (
              <div style={{ marginTop: '10px', fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', background: '#f1f5f9', borderRadius: '8px', flexWrap: 'wrap' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '12px', color: '#0a3b5c' }}>info</span>
                {fDate        && <span style={{ background: 'white', padding: '1px 7px', borderRadius: '5px', fontFamily: 'monospace' }}>Date: <strong>{fDate}</strong></span>}
                {fDescription && <span style={{ background: 'white', padding: '1px 7px', borderRadius: '5px' }}>Desc: <strong>{fDescription}</strong></span>}
                {fUsername    && <span style={{ background: 'white', padding: '1px 7px', borderRadius: '5px' }}>Username: <strong>{fUsername}</strong></span>}
                {fName && <span style={{ background: 'white', padding: '1px 7px', borderRadius: '5px' }}>Name: <strong>{fName}</strong></span>}
                {fDepartment  && <span style={{ background: 'white', padding: '1px 7px', borderRadius: '5px' }}>Dept: <strong>{fDepartment}</strong></span>}
                {fCreatedAt   && <span style={{ background: 'white', padding: '1px 7px', borderRadius: '5px' }}>Created: <strong>{fCreatedAt}</strong></span>}
                {fUpdatedAt   && <span style={{ background: 'white', padding: '1px 7px', borderRadius: '5px' }}>Updated: <strong>{fUpdatedAt}</strong></span>}
                {fPeriod !== 'all' && <span style={{ background: 'white', padding: '1px 7px', borderRadius: '5px', textTransform: 'capitalize' }}><strong>{fPeriod}</strong></span>}
                <span style={{ marginLeft: 'auto' }}>{t.results(filteredData.length)}</span>
              </div>
            )}
          </div>

          {/* ── Table ── */}
          <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 2px 10px rgba(0,40,70,0.06)', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
            {isLoading ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '40px', marginBottom: '16px', display: 'block', color: '#0a3b5c', animation: 'spin 2s linear infinite' }}>refresh</span>
                {t.loading}
              </div>
            ) : loadError ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#ef4444' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '40px', marginBottom: '16px', display: 'block' }}>error</span>
                {t.failedLoad}
              </div>
            ) : paginatedData.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '48px', marginBottom: '16px', display: 'block', color: '#94a3b8' }}>event_busy</span>
                {hasActiveFilters ? t.noMatch : t.noData}
                {hasActiveFilters && (
                  <button onClick={clearFilters} style={{ display: 'block', margin: '14px auto 0', padding: '8px 20px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#475569', cursor: 'pointer', fontSize: '13px' }}>
                    {t.clearFilters}
                  </button>
                )}
              </div>
            ) : (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1200px' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #0a3b5c' }}>
                        {[t.colIndex, t.colDate, t.colDay, t.colDescription, t.colUsername, t.colName, t.colDepartment, t.colStatus, t.colCreatedAt, t.colUpdatedAt, t.colActions].map(col => (
                          <th key={col} style={{ padding: '12px 14px', textAlign: 'center', fontWeight: '600', color: '#0a3b5c', fontSize: '11px', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedData.map((item, index) => {
                        const idx = (currentPage - 1) * itemsPerPage + index + 1;
                        const up  = isUpcoming(item.holiday_date);
                        return (
                          <tr key={item.holiday_date}
                            style={{ borderBottom: '1px solid #f1f5f9', background: index % 2 === 0 ? 'white' : '#fafbfc', transition: 'background 0.1s' }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#f0f7ff'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = index % 2 === 0 ? 'white' : '#fafbfc'; }}
                          >
                            {/* # */}
                            <td style={{ padding: '10px 14px', color: '#cbd5e1', fontSize: '12px', fontWeight: '600', textAlign: 'center' }}>{idx}</td>

                            {/* Date */}
                            <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                              <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: '700', color: '#0a3b5c', background: '#eef2ff', padding: '3px 8px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px', border: '1px solid #e0e7ff', whiteSpace: 'nowrap' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>event</span>
                                {formatDate(item.holiday_date)}
                              </span>
                            </td>

                            {/* Day */}
                            <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                              <span style={{ padding: '2px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: '500', background: '#f5f3ff', color: '#6d28d9', border: '1px solid #ede9fe', whiteSpace: 'nowrap' }}>
                                {getDayName(item.holiday_date)}
                              </span>
                            </td>

                            {/* Description */}
                            <td style={{ padding: '10px 14px', maxWidth: '250px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '13px', color: '#e9b741', flexShrink: 0 }}>celebration</span>
                                <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.description}</span>
                              </div>
                            </td>

                            {/* Username */}
                            <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '12px', color: '#0a3b5c' }}>badge</span>
                                <span style={{ fontSize: '12px', fontWeight: '500', color: '#1e293b', whiteSpace: 'nowrap' }}>
                                  {item.username || '—'}
                                </span>
                              </div>
                            </td>

                            {/* Name */}
                            <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '12px', color: '#8b5cf6' }}>person</span>
                                <span style={{ fontSize: '12px', color: '#1e293b', whiteSpace: 'nowrap', fontWeight: '500' }}>
                                  {item.last_name && item.first_name
                                    ? `${item.last_name} ${item.first_name}`
                                    : item.last_name || item.first_name || '—'}
                                </span>
                              </div>
                            </td>

                            {/* Department */}
                            <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                              {item.department ? (
                                <span style={{ padding: '3px 8px', background: '#e8f0fe', borderRadius: '12px', fontSize: '11px', fontWeight: '500', color: '#0a3b5c', whiteSpace: 'nowrap' }}>
                                  {item.department}
                                </span>
                              ) : (
                                <span style={{ color: '#cbd5e1', fontSize: '11px' }}>—</span>
                              )}
                            </td>

                            {/* Status */}
                            <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                              {up ? (
                                <span style={{ padding: '3px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', background: '#f0fdf4', color: '#15803d', display: 'inline-flex', alignItems: 'center', gap: '3px', border: '1px solid #bbf7d0', whiteSpace: 'nowrap' }}>
                                  <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>upcoming</span>{t.upcomingBadge}
                                </span>
                              ) : (
                                <span style={{ padding: '3px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', background: '#f8fafc', color: '#94a3b8', display: 'inline-flex', alignItems: 'center', gap: '3px', border: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                                  <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>history</span>{t.pastBadge}
                                </span>
                              )}
                            </td>

                            {/* Created at */}
                            <td style={{ padding: '10px 14px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '11px', color: '#0a3b5c', flexShrink: 0 }}>schedule</span>
                                <span style={{ fontSize: '10px', fontFamily: item.created_at ? 'monospace' : 'inherit', color: item.created_at ? '#374151' : '#cbd5e1', fontWeight: item.created_at ? '500' : '400', whiteSpace: 'nowrap' }}>
                                  {formatDateTime(item.created_at)}
                                </span>
                              </div>
                            </td>

                            {/* Updated at */}
                            <td style={{ padding: '10px 14px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '11px', color: '#065f46', flexShrink: 0 }}>update</span>
                                <span style={{ fontSize: '10px', fontFamily: item.updated_at ? 'monospace' : 'inherit', color: item.updated_at ? '#374151' : '#cbd5e1', fontWeight: item.updated_at ? '500' : '400', whiteSpace: 'nowrap' }}>
                                  {formatDateTime(item.updated_at)}
                                </span>
                              </div>
                            </td>

                            {/* Actions */}
                            <td style={{ padding: '10px 14px' }}>
                              <div style={{ display: 'flex', gap: '5px', alignItems: 'center', justifyContent: 'center' }}>
                                <button onClick={() => openEditModal(item)}
                                  style={{ padding: '4px 10px', fontSize: '11px', fontWeight: '500', background: '#f1f5f9', color: '#0a3b5c', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px', transition: 'all 0.13s', whiteSpace: 'nowrap' }}
                                  onMouseEnter={e => { e.currentTarget.style.background = '#0a3b5c'; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = '#0a3b5c'; }}
                                  onMouseLeave={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#0a3b5c'; e.currentTarget.style.borderColor = '#cbd5e1'; }}>
                                  <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>edit</span>{t.edit}
                                </button>
                                <button onClick={() => openDeleteModal(item)}
                                  style={{ padding: '4px 10px', fontSize: '11px', fontWeight: '500', background: '#fff5f5', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px', transition: 'all 0.13s', whiteSpace: 'nowrap' }}
                                  onMouseEnter={e => { e.currentTarget.style.background = '#dc2626'; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = '#dc2626'; }}
                                  onMouseLeave={e => { e.currentTarget.style.background = '#fff5f5'; e.currentTarget.style.color = '#dc2626'; e.currentTarget.style.borderColor = '#fecaca'; }}>
                                  <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>delete</span>{t.delete}
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
                    <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                      <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}
                        style={{ padding: '6px 10px', fontSize: '12px', fontWeight: '500', background: currentPage === 1 ? '#f1f5f9' : 'white', color: currentPage === 1 ? '#94a3b8' : '#0a3b5c', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>chevron_left</span>{t.previous}
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                        const show = page === 1 || page === totalPages || (page >= currentPage - 2 && page <= currentPage + 2);
                        const ell  = page === currentPage - 3 || page === currentPage + 3;
                        if (show) return (
                          <button key={page} onClick={() => setCurrentPage(page)} style={{ width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '600', background: currentPage === page ? '#0a3b5c' : 'white', color: currentPage === page ? 'white' : '#0f172a', border: `1px solid ${currentPage === page ? '#0a3b5c' : '#e2e8f0'}`, borderRadius: '6px', cursor: 'pointer' }}>
                            {page}
                          </button>
                        );
                        if (ell) return <span key={`e${page}`} style={{ width: '28px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>…</span>;
                        return null;
                      })}
                      <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages}
                        style={{ padding: '6px 10px', fontSize: '12px', fontWeight: '500', background: currentPage === totalPages ? '#f1f5f9' : 'white', color: currentPage === totalPages ? '#94a3b8' : '#0a3b5c', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        {t.next}<span className="material-symbols-outlined" style={{ fontSize: '13px' }}>chevron_right</span>
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
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)'; }}>
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
                  <button onClick={() => navigate(p.path)} style={{ background: 'none', border: 'none', padding: 0, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: p.path === currentPath ? '#e9b741' : '#8097a8', fontWeight: p.path === currentPath ? '600' : '400', cursor: 'pointer', transition: 'color 0.15s', width: '100%' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'white'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = p.path === currentPath ? '#e9b741' : '#8097a8'; }}>
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
                { label: t.aboutCbu,     href: 'https://cbu.uz/en/about/',                   icon: 'info'        },
                { label: t.executiveB,   href: 'https://cbu.uz/en/about/management/',        icon: 'groups'      },
                { label: t.legislation,  href: 'https://cbu.uz/en/documents/',               icon: 'gavel'       },
                { label: t.publications, href: 'https://cbu.uz/en/statistics/publications/', icon: 'description' },
                { label: t.dataStats,    href: 'https://cbu.uz/en/statistics/',              icon: 'bar_chart'   },
              ].map(item => (
                <li key={item.href} style={{ marginBottom: '10px' }}>
                  <a href={item.href} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '14px', color: '#8097a8', textDecoration: 'none', transition: 'color 0.15s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'white'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#8097a8'; }}>
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
                <li key={item.href} style={{ marginBottom: '10px' }}>
                  <a href={item.href} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '14px', color: '#8097a8', textDecoration: 'none', transition: 'color 0.15s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'white'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#8097a8'; }}>
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
                <li key={item.href} style={{ marginBottom: '10px' }}>
                  <a href={item.href} style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '14px', color: '#8097a8', textDecoration: 'none', transition: 'color 0.15s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'white'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#8097a8'; }}>
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
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#4a5c6a'; }}>
                  {l.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* ══════════════════════ ADD MODAL ══════════════════════ */}
      {isAddModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => { if (!isSaving) setIsAddModalOpen(false); }}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '30px', width: '440px', maxWidth: '95vw', boxShadow: '0 24px 64px rgba(0,0,0,0.3)', border: '1px solid #e2e8f0' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0a3b5c', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#e9b741' }}>add_circle</span>
                {t.addTitle}
              </h2>
              <button onClick={() => { if (!isSaving) setIsAddModalOpen(false); }} style={{ border: 'none', background: '#f1f5f9', cursor: 'pointer', color: '#64748b', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>×</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '22px' }}>
              {/* Date picker */}
              <div>
                <label style={labelStyle}>{t.holidayDate} <span style={{ color: '#dc2626' }}>*</span></label>
                <div style={{ position: 'relative' }}>
                  <span className="material-symbols-outlined" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '16px', pointerEvents: 'none', zIndex: 2 }}>event</span>
                  <input
                    type="date"
                    value={addForm.new_holiday}
                    onChange={e => setAddForm(f => ({ ...f, new_holiday: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
                    style={{ ...inputStyle, paddingLeft: '34px', fontFamily: 'monospace', colorScheme: 'light' }}
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label style={labelStyle}>{t.description} <span style={{ color: '#dc2626' }}>*</span></label>
                <div style={{ position: 'relative' }}>
                  <span className="material-symbols-outlined" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '16px', pointerEvents: 'none', zIndex: 2 }}>celebration</span>
                  <input
                    type="text"
                    value={addForm.new_description}
                    onChange={e => setAddForm(f => ({ ...f, new_description: e.target.value }))}
                    placeholder={t.descPlaceholder}
                    onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
                    style={{ ...inputStyle, paddingLeft: '34px' }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => { if (!isSaving) setIsAddModalOpen(false); }}
                style={{ padding: '10px 20px', fontSize: '13px', fontWeight: '500', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '10px', cursor: 'pointer' }}>
                {t.cancel}
              </button>
              <button onClick={handleAdd} disabled={isSaving}
                style={{ padding: '10px 20px', fontSize: '13px', fontWeight: '600', background: isSaving ? '#94a3b8' : 'linear-gradient(135deg,#0a3b5c,#1a6494)', color: 'white', border: 'none', borderRadius: '10px', cursor: isSaving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: isSaving ? 'none' : '0 4px 12px rgba(10,59,92,0.3)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '15px', animation: isSaving ? 'spin 1.5s linear infinite' : 'none' }}>
                  {isSaving ? 'hourglass_empty' : 'check'}
                </span>
                {isSaving ? t.adding : t.addBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════ EDIT MODAL ══════════════════════ */}
      {isEditModalOpen && targetHoliday && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => { if (!isSaving) setIsEditModalOpen(false); }}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '30px', width: '480px', maxWidth: '95vw', boxShadow: '0 24px 64px rgba(0,0,0,0.3)', border: '1px solid #e2e8f0' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0a3b5c', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#0a3b5c' }}>edit_calendar</span>
                {t.editTitle}
              </h2>
              <button onClick={() => { if (!isSaving) setIsEditModalOpen(false); }} style={{ border: 'none', background: '#f1f5f9', cursor: 'pointer', color: '#64748b', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>×</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '13px', marginBottom: '22px' }}>
              {/* Read-only date */}
              <div>
                <label style={{ ...labelStyle, color: '#94a3b8' }}>{t.holidayDate}</label>
                <input type="text" value={formatDate(targetHoliday.holiday_date)} disabled style={{ ...inputStyle, background: '#f1f5f9', color: '#64748b', fontFamily: 'monospace' }} />
              </div>
              {/* Read-only day */}
              <div>
                <label style={{ ...labelStyle, color: '#94a3b8' }}>{t.dayOfWeek}</label>
                <input type="text" value={getDayName(targetHoliday.holiday_date)} disabled style={{ ...inputStyle, background: '#f1f5f9', color: '#64748b' }} />
              </div>
              {/* Editable description */}
              <div>
                <label style={labelStyle}>{t.description} <span style={{ color: '#dc2626' }}>*</span></label>
                <div style={{ position: 'relative' }}>
                  <span className="material-symbols-outlined" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '16px', pointerEvents: 'none', zIndex: 2 }}>celebration</span>
                  <input
                    type="text"
                    value={editForm.description}
                    onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                    placeholder={t.descPlaceholder}
                    onKeyDown={e => { if (e.key === 'Enter') handleEdit(); }}
                    style={{ ...inputStyle, paddingLeft: '34px' }}
                  />
                </div>
              </div>
              {/* Read-only timestamps */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ ...labelStyle, color: '#94a3b8' }}>{t.createdAt}</label>
                  <input type="text" value={formatDateTime(targetHoliday.created_at)} disabled style={{ ...inputStyle, background: '#f8fafc', color: '#94a3b8', fontSize: '11px', fontFamily: 'monospace' }} />
                </div>
                <div>
                  <label style={{ ...labelStyle, color: '#94a3b8' }}>{t.lastUpdated}</label>
                  <input type="text" value={formatDateTime(targetHoliday.updated_at)} disabled style={{ ...inputStyle, background: '#f8fafc', color: '#94a3b8', fontSize: '11px', fontFamily: 'monospace' }} />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => { if (!isSaving) setIsEditModalOpen(false); }}
                style={{ padding: '10px 20px', fontSize: '13px', fontWeight: '500', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '10px', cursor: 'pointer' }}>
                {t.cancel}
              </button>
              <button onClick={handleEdit} disabled={isSaving}
                style={{ padding: '10px 20px', fontSize: '13px', fontWeight: '600', background: isSaving ? '#94a3b8' : 'linear-gradient(135deg,#0a3b5c,#1a6494)', color: 'white', border: 'none', borderRadius: '10px', cursor: isSaving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: isSaving ? 'none' : '0 4px 12px rgba(10,59,92,0.3)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '15px', animation: isSaving ? 'spin 1.5s linear infinite' : 'none' }}>
                  {isSaving ? 'hourglass_empty' : 'save'}
                </span>
                {isSaving ? t.saving : t.saveChanges}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════ DELETE MODAL ══════════════════════ */}
      {isDeleteModalOpen && targetHoliday && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => { if (!isDeleting) setIsDeleteModalOpen(false); }}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '30px', width: '460px', maxWidth: '95vw', boxShadow: '0 24px 64px rgba(0,0,0,0.3)', border: '1px solid #e2e8f0' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0a3b5c', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#dc2626' }}>warning</span>
                {t.deleteTitle}
              </h2>
              <button onClick={() => { if (!isDeleting) setIsDeleteModalOpen(false); }} style={{ border: 'none', background: '#f1f5f9', cursor: 'pointer', color: '#64748b', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>×</button>
            </div>

            <div style={{ marginBottom: '22px', padding: '16px', background: '#fef2f2', borderRadius: '12px', border: '1px solid #fee2e2' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                <span className="material-symbols-outlined" style={{ color: '#dc2626', fontSize: '14px' }}>info</span>
                <strong style={{ color: '#0f172a', fontSize: '13px' }}>{t.deleteConfirm}</strong>
              </div>
              <div style={{ paddingLeft: '20px', fontSize: '12px', color: '#4b5563', lineHeight: '2', textAlign: 'left' }}>
                <div>{t.deleteDate}: <strong style={{ fontFamily: 'monospace', color: '#dc2626' }}>{formatDate(targetHoliday.holiday_date)}</strong></div>
                <div>{t.deleteDay}: <strong>{getDayName(targetHoliday.holiday_date)}</strong></div>
                <div>{t.deleteDesc}: <strong>{targetHoliday.description}</strong></div>
                <div>{t.deleteCreated}: <strong style={{ fontFamily: 'monospace' }}>{formatDateTime(targetHoliday.created_at)}</strong></div>
              </div>
              <p style={{ margin: '10px 0 0 20px', fontSize: '11px', color: '#dc2626', fontWeight: '600' }}>{t.deleteIrrev}</p>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button onClick={() => { if (!isDeleting) setIsDeleteModalOpen(false); }}
                style={{ padding: '10px 20px', fontSize: '13px', fontWeight: '500', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '10px', cursor: 'pointer' }}>
                {t.cancel}
              </button>
              <button onClick={handleDelete} disabled={isDeleting}
                style={{ padding: '10px 20px', fontSize: '13px', fontWeight: '600', background: isDeleting ? '#94a3b8' : '#dc2626', color: 'white', border: 'none', borderRadius: '10px', cursor: isDeleting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '15px', animation: isDeleting ? 'spin 1.5s linear infinite' : 'none' }}>
                  {isDeleting ? 'hourglass_empty' : 'delete_forever'}
                </span>
                {isDeleting ? t.deleting : t.deleteBtn}
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
        input:focus,select:focus{border-color:#0a3b5c!important;box-shadow:0 0 0 3px rgba(10,59,92,0.1);}
        input[type="date"]::-webkit-calendar-picker-indicator{cursor:pointer;opacity:0.7;filter:invert(28%) sepia(49%) saturate(700%) hue-rotate(180deg);}
        input[type="date"]::-webkit-calendar-picker-indicator:hover{opacity:1;}
        nav::-webkit-scrollbar{height:0;}
      `}</style>
    </div>
  );
};

export default HolidaysPage;