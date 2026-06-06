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
    calculations: 'Calculations', uploads: 'Uploads', repo: 'Repo',
    depo: 'Depo', data: 'Data', holidays: 'Holidays',
    // stats
    totalRecords:  'Total Records',
    firstDate:     'First Date',
    latestDate:    'Latest Date',
    avgUzonia:     'Average Uzonia',
    minUzonia:     'Minimum Uzonia',
    maxUzonia:     'Maximum Uzonia',
    // table headers
    colIndex:      '#',
    colDate:       'DATE',
    colDays:       'DAYS',
    colFileId:     'FILE ID',
    colRate:       'RATE',
    colUzonia:     'UZONIA',
    col7Day:       '7-DAY',
    col30Day:      '30-DAY',
    col90Day:      '90-DAY',
    col180Day:     '180-DAY',
    colIndex2:     'INDEX',
    colUsername:   'USERNAME',
    colFirstName:  'FIRST NAME',
    colLastName:   'LAST NAME',
    colCreatedAt:  'CREATED AT',
    colActions:    'ACTIONS',
    // filters
    phDate:        'Date…',
    phDays:        'Days…',
    phFileId:      'File ID…',
    phRate:        'Rate…',
    phUzonia:      'Uzonia…',
    ph7Day:        '7-Day…',
    ph30Day:       '30-Day…',
    ph90Day:       '90-Day…',
    ph180Day:      '180-Day…',
    phIndex:       'Index…',
    phUsername:    'Username…',
    phFirstName:   'First name…',
    phLastName:    'Last name…',
    phCreatedAt:   'Created…',
    clearAll:      'Clear all',
    results:       (n: number) => `${n} result${n !== 1 ? 's' : ''}`,
    filterLabel:   'Filters:',
    // table states
    loading:       'Loading Uzonia data…',
    failedLoad:    'Failed to load data.',
    noMatch:       'No records match your filters.',
    noData:        'No Uzonia records found.',
    clearFilters:  'Clear filters',
    showing:       (from: number, to: number, total: number) => `Showing ${from}–${to} of ${total}`,
    previous:      'Prev',
    next:          'Next',
    // actions
    edit:          'Edit',
    delete:        'Delete',
    addRecord:     'Add Record',
    // add modal
    addTitle:      'Add Uzonia Record',
    uzoniaDate:    'Uzonia Date',
    days:          'Days',
    fileId:        'File ID',
    rate:          'Rate',
    uzoniaLabel:   'Uzonia (Overnight)',
    day7:          '7-Day Uzonia',
    day30:         '30-Day Uzonia',
    day90:         '90-Day Uzonia',
    day180:        '180-Day Uzonia',
    indexLabel:    'Index',
    cancel:        'Cancel',
    adding:        'Adding…',
    addBtn:        'Add Record',
    addSuccess:    'Uzonia record added successfully!',
    addFailed:     'Failed to add record.',
    allRequired:   'All fields are required.',
    // edit modal
    editTitle:      'Edit Uzonia Record',
    readOnlyDate:   'Uzonia Date (read-only)',
    readOnlyFileId: 'File ID (read-only)',
    createdAtLabel: 'Created At',
    saving:         'Saving…',
    saveChanges:    'Save Changes',
    editSuccess:    'Uzonia record updated successfully!',
    editFailed:     'Failed to update record.',
    rateRequired:   'All rate fields are required.',
    // delete modal
    deleteTitle:    'Delete Uzonia Record',
    deleteConfirm:  'Are you sure you want to delete this record?',
    deleteIrrev:    '⚠️ This action cannot be undone.',
    deleting:       'Deleting…',
    deleteBtn:      'Delete Record',
    deleteSuccess:  'Uzonia record deleted successfully!',
    deleteFailed:   'Failed to delete record.',
    // user dropdown
    usersBtn:    'Users',
    sessionsBtn: 'Sessions',
    actionsBtn:  'Actions',
    signOut:     'Sign Out',
    department:  'Department',
    // lang modal
    langConfirmTitle: 'Change Language',
    langConfirmMsg:   (lang: string) => `Switch the interface language to ${lang}?`,
    confirm:          'Yes, change',
    // footer
    officialDesc:  'UZONIA – Interbank Operations, Calculations, and Data Processing Platform',
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
    sessionExpired: 'Session expired. Please log in again.',
  },
  ru: {
    bankName:     'Центральный Банк Республики Узбекистан',
    deptSubtitle: 'Департамент Монетарных Операций',
    calculations: 'Расчёты', uploads: 'Загрузки', repo: 'Репо',
    depo: 'Депо', data: 'Данные', holidays: 'Праздники',
    totalRecords:  'Всего записей',
    firstDate:     'Первая дата',
    latestDate:    'Последняя дата',
    avgUzonia:     'Средняя УЗОНИЯ',
    minUzonia:     'Мин. УЗОНИЯ',
    maxUzonia:     'Макс. УЗОНИЯ',
    colIndex:      '#',
    colDate:       'ДАТА',
    colDays:       'ДНЕЙ',
    colFileId:     'ФАЙЛ ID',
    colRate:       'СТАВКА',
    colUzonia:     'УЗОНИЯ',
    col7Day:       '7 ДНЕЙ',
    col30Day:      '30 ДНЕЙ',
    col90Day:      '90 ДНЕЙ',
    col180Day:     '180 ДНЕЙ',
    colIndex2:     'ИНДЕКС',
    colUsername:   'ПОЛЬЗОВАТЕЛЬ',
    colFirstName:  'ИМЯ',
    colLastName:   'ФАМИЛИЯ',
    colCreatedAt:  'СОЗДАН',
    colActions:    'ДЕЙСТВИЯ',
    phDate:        'Дата…',
    phDays:        'Дней…',
    phFileId:      'Файл ID…',
    phRate:        'Ставка…',
    phUzonia:      'Узония…',
    ph7Day:        '7 дней…',
    ph30Day:       '30 дней…',
    ph90Day:       '90 дней…',
    ph180Day:      '180 дней…',
    phIndex:       'Индекс…',
    phUsername:    'Пользователь…',
    phFirstName:   'Имя…',
    phLastName:    'Фамилия…',
    phCreatedAt:   'Создан…',
    clearAll:      'Очистить',
    results:       (n: number) => `${n} запис${n === 1 ? 'ь' : n < 5 ? 'и' : 'ей'}`,
    filterLabel:   'Фильтры:',
    loading:       'Загрузка данных УЗОНИЯ…',
    failedLoad:    'Ошибка загрузки данных.',
    noMatch:       'Записи не найдены.',
    noData:        'Записи УЗОНИЯ отсутствуют.',
    clearFilters:  'Сбросить фильтры',
    showing:       (from: number, to: number, total: number) => `Показано ${from}–${to} из ${total}`,
    previous:      'Назад',
    next:          'Вперёд',
    edit:          'Изменить',
    delete:        'Удалить',
    addRecord:     'Добавить запись',
    addTitle:      'Добавить запись УЗОНИЯ',
    uzoniaDate:    'Дата УЗОНИЯ',
    days:          'Дней',
    fileId:        'Файл ID',
    rate:          'Ставка',
    uzoniaLabel:   'Узония (овернайт)',
    day7:          '7-дневная Узония',
    day30:         '30-дневная Узония',
    day90:         '90-дневная Узония',
    day180:        '180-дневная Узония',
    indexLabel:    'Индекс',
    cancel:        'Отмена',
    adding:        'Добавление…',
    addBtn:        'Добавить',
    addSuccess:    'Запись УЗОНИЯ успешно добавлена!',
    addFailed:     'Ошибка добавления записи.',
    allRequired:   'Все поля обязательны.',
    editTitle:      'Редактировать запись УЗОНИЯ',
    readOnlyDate:   'Дата (только чтение)',
    readOnlyFileId: 'Файл ID (только чтение)',
    createdAtLabel: 'Создан',
    saving:         'Сохранение…',
    saveChanges:    'Сохранить изменения',
    editSuccess:    'Запись УЗОНИЯ успешно обновлена!',
    editFailed:     'Ошибка обновления записи.',
    rateRequired:   'Все поля ставок обязательны.',
    deleteTitle:    'Удалить запись УЗОНИЯ',
    deleteConfirm:  'Вы уверены, что хотите удалить эту запись?',
    deleteIrrev:    '⚠️ Это действие нельзя отменить.',
    deleting:       'Удаление…',
    deleteBtn:      'Удалить запись',
    deleteSuccess:  'Запись УЗОНИЯ успешно удалена!',
    deleteFailed:   'Ошибка удаления записи.',
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
    sessionExpired: 'Сессия истекла. Пожалуйста, войдите снова.',
  },
  uz_c: {
    bankName:     'Ўзбекистон Республикаси Марказий Банки',
    deptSubtitle: 'Монетар Операциялар Департаменти',
    calculations: 'Ҳисоб-китоб', uploads: 'Юклашлар', repo: 'Репо',
    depo: 'Депо', data: 'Маълумотлар', holidays: 'Байрамлар',
    totalRecords:  'Жами ёзувлар',
    firstDate:     'Биринчи сана',
    latestDate:    'Сўнгги сана',
    avgUzonia:     'Ўртача УЗОНИЯ',
    minUzonia:     'Мин. УЗОНИЯ',
    maxUzonia:     'Макс. УЗОНИЯ',
    colIndex:      '#',
    colDate:       'САНА',
    colDays:       'КУН',
    colFileId:     'ФАЙЛ ID',
    colRate:       'СТАВКА',
    colUzonia:     'УЗОНИЯ',
    col7Day:       '7 КУН',
    col30Day:      '30 КУН',
    col90Day:      '90 КУН',
    col180Day:     '180 КУН',
    colIndex2:     'ИНДЕКС',
    colUsername:   'ФОЙДАЛАНУВЧИ',
    colFirstName:  'ИСМ',
    colLastName:   'ФАМИЛИЯ',
    colCreatedAt:  'ЯРАТИЛГАН',
    colActions:    'АМАЛЛАР',
    phDate:        'Сана…',
    phDays:        'Кун…',
    phFileId:      'Файл ID…',
    phRate:        'Ставка…',
    phUzonia:      'Узония…',
    ph7Day:        '7 кун…',
    ph30Day:       '30 кун…',
    ph90Day:       '90 кун…',
    ph180Day:      '180 кун…',
    phIndex:       'Индекс…',
    phUsername:    'Фойдаланувчи…',
    phFirstName:   'Исм…',
    phLastName:    'Фамилия…',
    phCreatedAt:   'Яратилган…',
    clearAll:      'Тозалаш',
    results:       (n: number) => `${n} та натижа`,
    filterLabel:   'Фильтрлар:',
    loading:       'УЗОНИЯ маълумотлари олинмоқда…',
    failedLoad:    'Маълумотларни юклашда хато.',
    noMatch:       'Ёзувлар топилмади.',
    noData:        'УЗОНИЯ ёзувлари йўқ.',
    clearFilters:  'Фильтрларни тозалаш',
    showing:       (from: number, to: number, total: number) => `${total} тадан ${from}–${to} кўрсатилмоқда`,
    previous:      'Олдинги',
    next:          'Кейинги',
    edit:          'Таҳрирлаш',
    delete:        'Ўчириш',
    addRecord:     'Ёзув қўшиш',
    addTitle:      'УЗОНИЯ Ёзуви Қўшиш',
    uzoniaDate:    'УЗОНИЯ санаси',
    days:          'Кун',
    fileId:        'Файл ID',
    rate:          'Ставка',
    uzoniaLabel:   'Узония (Овернайт)',
    day7:          '7 кунлик Узония',
    day30:         '30 кунлик Узония',
    day90:         '90 кунлик Узония',
    day180:        '180 кунлик Узония',
    indexLabel:    'Индекс',
    cancel:        'Бекор қилиш',
    adding:        'Қўшилмоқда…',
    addBtn:        'Ёзув қўшиш',
    addSuccess:    'УЗОНИЯ ёзуви муваффақиятли қўшилди!',
    addFailed:     'Ёзув қўшишда хато.',
    allRequired:   'Барча майдонлар тўлдирилиши шарт.',
    editTitle:      'УЗОНИЯ Ёзувини Таҳрирлаш',
    readOnlyDate:   'Сана (фақат ўқиш)',
    readOnlyFileId: 'Файл ID (фақат ўқиш)',
    createdAtLabel: 'Яратилган',
    saving:         'Сақланмоқда…',
    saveChanges:    'Ўзгаришларни сақлаш',
    editSuccess:    'УЗОНИЯ ёзуви муваффақиятли янгиланди!',
    editFailed:     'Янгилашда хато.',
    rateRequired:   'Барча ставка майдонлари тўлдирилиши шарт.',
    deleteTitle:    'УЗОНИЯ Ёзувини Ўчириш',
    deleteConfirm:  'Ушбу ёзувни ўчиришга ишончингиз комилми?',
    deleteIrrev:    '⚠️ Бу амални қайтариб бўлмайди.',
    deleting:       'Ўчирилмоқда…',
    deleteBtn:      'Ёзувни ўчириш',
    deleteSuccess:  'УЗОНИЯ ёзуви муваффақиятли ўчирилди!',
    deleteFailed:   'Ўчиришда хато.',
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
    sessionExpired: 'Сессия муддати тугади. Илтимос, қайта киринг.',
  },
  uz_l: {
    bankName:     "O'zbekiston Respublikasi Markaziy Banki",
    deptSubtitle: 'Monetar Operatsiyalar Departamenti',
    calculations: 'Hisob-kitob', uploads: 'Yuklamalar', repo: 'Repo',
    depo: 'Depo', data: "Ma'lumotlar", holidays: 'Bayramlar',
    totalRecords:  'Jami yozuvlar',
    firstDate:     'Birinchi sana',
    latestDate:    "So'nggi sana",
    avgUzonia:     "O'rtacha UZONIA",
    minUzonia:     'Min. UZONIA',
    maxUzonia:     'Maks. UZONIA',
    colIndex:      '#',
    colDate:       'SANA',
    colDays:       'KUN',
    colFileId:     'FAYL ID',
    colRate:       'STAVKA',
    colUzonia:     'UZONIA',
    col7Day:       '7 KUN',
    col30Day:      '30 KUN',
    col90Day:      '90 KUN',
    col180Day:     '180 KUN',
    colIndex2:     'INDEKS',
    colUsername:   'FOYDALANUVCHI',
    colFirstName:  'ISM',
    colLastName:   'FAMILIYA',
    colCreatedAt:  'YARATILGAN',
    colActions:    'AMALLAR',
    phDate:        'Sana…',
    phDays:        'Kun…',
    phFileId:      'Fayl ID…',
    phRate:        'Stavka…',
    phUzonia:      'Uzonia…',
    ph7Day:        '7 kun…',
    ph30Day:       '30 kun…',
    ph90Day:       '90 kun…',
    ph180Day:      '180 kun…',
    phIndex:       'Indeks…',
    phUsername:    'Foydalanuvchi…',
    phFirstName:   'Ism…',
    phLastName:    'Familiya…',
    phCreatedAt:   'Yaratilgan…',
    clearAll:      'Tozalash',
    results:       (n: number) => `${n} ta natija`,
    filterLabel:   'Filtrlar:',
    loading:       "UZONIA ma'lumotlari olinmoqda…",
    failedLoad:    "Ma'lumotlarni yuklashda xato.",
    noMatch:       'Yozuvlar topilmadi.',
    noData:        'UZONIA yozuvlari yo\'q.',
    clearFilters:  'Filtrlarni tozalash',
    showing:       (from: number, to: number, total: number) => `${total} tadan ${from}–${to} ko'rsatilmoqda`,
    previous:      'Oldingi',
    next:          'Keyingi',
    edit:          'Tahrirlash',
    delete:        "O'chirish",
    addRecord:     "Yozuv qo'shish",
    addTitle:      "UZONIA Yozuvi Qo'shish",
    uzoniaDate:    'UZONIA sanasi',
    days:          'Kun',
    fileId:        'Fayl ID',
    rate:          'Stavka',
    uzoniaLabel:   'Uzonia (Overnight)',
    day7:          '7 kunlik Uzonia',
    day30:         '30 kunlik Uzonia',
    day90:         '90 kunlik Uzonia',
    day180:        '180 kunlik Uzonia',
    indexLabel:    'Indeks',
    cancel:        'Bekor qilish',
    adding:        "Qo'shilmoqda…",
    addBtn:        "Yozuv qo'shish",
    addSuccess:    "UZONIA yozuvi muvaffaqiyatli qo'shildi!",
    addFailed:     "Yozuv qo'shishda xato.",
    allRequired:   "Barcha maydonlar to'ldirilishi shart.",
    editTitle:      'UZONIA Yozuvini Tahrirlash',
    readOnlyDate:   'Sana (faqat o\'qish)',
    readOnlyFileId: 'Fayl ID (faqat o\'qish)',
    createdAtLabel: 'Yaratilgan',
    saving:         'Saqlanmoqda…',
    saveChanges:    "O'zgarishlarni saqlash",
    editSuccess:    'UZONIA yozuvi muvaffaqiyatli yangilandi!',
    editFailed:     'Yangilashda xato.',
    rateRequired:   "Barcha stavka maydonlari to'ldirilishi shart.",
    deleteTitle:    "UZONIA Yozuvini O'chirish",
    deleteConfirm:  "Ushbu yozuvni o'chirishga ishonchingiz komilmi?",
    deleteIrrev:    "⚠️ Bu amalni qaytarib bo'lmaydi.",
    deleting:       "O'chirilmoqda…",
    deleteBtn:      "Yozuvni o'chirish",
    deleteSuccess:  "UZONIA yozuvi muvaffaqiyatli o'chirildi!",
    deleteFailed:   "O'chirishda xato.",
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
    sessionExpired: 'Sessiya muddati tugadi. Iltimos, qayta kiring.',
  },
};

type LangKey = keyof typeof TRANSLATIONS;
const LANG_LABELS: Record<LangKey, string> = { en: 'EN', ru: 'RU', uz_c: 'УЗ', uz_l: "O'Z" };
const LANG_NAMES:  Record<LangKey, string> = { en: 'English', ru: 'Русский', uz_c: 'Ўзбекча', uz_l: "O'zbekcha" };

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface UzoniaRow {
  unique_job_id:  string;
  file_id:        string;
  rate:           number;
  uzonia:         number;
  day_7_uzonia:   number;
  day_30_uzonia:  number;
  day_90_uzonia:  number;
  day_180_uzonia: number;
  index:          number;
  uzonia_date:    string;
  days:           number;
  created_at:     string | null;
  username?:      string | null;
  first_name?:    string | null;
  last_name?:     string | null;
}

interface AddForm {
  file_id: string; uzonia_date: string; days: string;
  rate: string; uzonia: string; day_7_uzonia: string; day_30_uzonia: string;
  day_90_uzonia: string; day_180_uzonia: string; index: string;
}

interface EditForm {
  rate: string; uzonia: string; day_7_uzonia: string; day_30_uzonia: string;
  day_90_uzonia: string; day_180_uzonia: string; index: string; days: string;
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

const fmtRate  = (n: number): string => (typeof n === 'number' && !isNaN(n)) ? `${n.toFixed(4)}%` : '—';
const fmtIndex = (n: number): string => (typeof n === 'number' && !isNaN(n)) ? n.toFixed(4) : '—';

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

const RateBadge = ({ value, bg, color }: { value: number; bg: string; color: string }) => (
  <span style={{ display: 'inline-block', fontFamily: 'monospace', fontSize: '12px', fontWeight: '700', background: bg, color, padding: '2px 7px', borderRadius: '6px', border: `1px solid ${color}22`, whiteSpace: 'nowrap' }}>
    {fmtRate(value)}
  </span>
);

const DaysBadge = ({ value }: { value: number }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontFamily: 'monospace', fontSize: '12px', fontWeight: '700', background: '#f0f9ff', color: '#0369a1', padding: '2px 7px', borderRadius: '6px', border: '1px solid #bae6fd', whiteSpace: 'nowrap' }}>
    <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>today</span>
    {typeof value === 'number' ? value : '—'}
  </span>
);

// Column-level filter input with icon
const ColFilter = ({
  value, onChange, placeholder, icon, flex, numeric,
}: {
  value: string; onChange: (v: string) => void; placeholder: string;
  icon: string; flex?: string; numeric?: boolean;
}) => {
  const handleKeyDown = numeric
    ? (e: React.KeyboardEvent<HTMLInputElement>) => {
        const pass = ['Backspace','Delete','Tab','Escape','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'];
        if (pass.includes(e.key)) return;
        if (!/[\d.%]/.test(e.key)) e.preventDefault();
      }
    : undefined;

  return (
    <div style={{ position: 'relative', flex: flex || '1 1 90px', minWidth: '76px' }}>
      <span className="material-symbols-outlined" style={{ position: 'absolute', left: '7px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '13px', pointerEvents: 'none', zIndex: 1 }}>{icon}</span>
      <input
        type="text"
        inputMode={numeric ? 'decimal' : 'text'}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        style={{ width: '100%', padding: '7px 7px 7px 24px', fontSize: '11px', background: '#f8fafc', color: '#0f172a', border: '1px solid #e2e8f0', borderRadius: '8px', outline: 'none', boxSizing: 'border-box', fontFamily: numeric ? 'monospace' : 'inherit' }}
      />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const EMPTY_ADD: AddForm = { file_id: '', uzonia_date: '', days: '', rate: '', uzonia: '', day_7_uzonia: '', day_30_uzonia: '', day_90_uzonia: '', day_180_uzonia: '', index: '' };
const EMPTY_EDIT: EditForm = { rate: '', uzonia: '', day_7_uzonia: '', day_30_uzonia: '', day_90_uzonia: '', day_180_uzonia: '', index: '', days: '' };

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

const UzoniaDataPage: React.FC = () => {
  const navigate    = useNavigate();
  const currentPath = '/data';

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ── State ─────────────────────────────────────────────────────────────────
  const [user,       setUser]       = useState<CurrentUser | null>(null);
  const [rows,       setRows]       = useState<UzoniaRow[]>([]);
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
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false);
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

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch('/api/get_all_uzonia_data');
      if (!res) return;
      if (!res.ok) {
        if (res.status === 404) { setRows([]); setLoadError(null); return; }
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      setRows(Array.isArray(data.Data) ? data.Data : []);
      setUser(data.user ?? null);
      setLoadError(null);
      const langMap: Record<string, LangKey> = { en: 'en', ru: 'ru', uz_c: 'uz_c', uz_l: 'uz_l' };
      const mapped = langMap[data.user?.language];
      if (mapped) setLang(mapped);
    } catch {
      setLoadError(t.failedLoad);
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const expired = sessionStorage.getItem('session_expired');
    if (expired) {
      showToast(t.sessionExpired, 'info');
      sessionStorage.removeItem('session_expired');
    }
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Periodic session check (every 60 s) ──────────────────────────────────
  useEffect(() => {
    if (!user) return;
    let active = true;
    const interval = setInterval(async () => {
      if (!active) return;
      try {
        const res = await fetch(`${API_BASE_URL}/api/get_all_uzonia_data`, {
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
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Filters ───────────────────────────────────────────────────────────────
  const [fDate,      setFDate]      = useState('');
  const [fDays,      setFDays]      = useState('');
  const [fFileId,    setFFileId]    = useState('');
  const [fRate,      setFRate]      = useState('');
  const [fUzonia,    setFUzonia]    = useState('');
  const [fDay7,      setFDay7]      = useState('');
  const [fDay30,     setFDay30]     = useState('');
  const [fDay90,     setFDay90]     = useState('');
  const [fDay180,    setFDay180]    = useState('');
  const [fIndex,     setFIndex]     = useState('');
  const [fUsername,  setFUsername]  = useState('');
  const [fFirstName, setFFirstName] = useState('');
  const [fLastName,  setFLastName]  = useState('');
  const [fCreated,   setFCreated]   = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const filteredData = useMemo(() => {
    let f = [...rows];
    const ci = (s: string) => s?.toLowerCase() ?? '';
    if (fDate.trim())      f = f.filter(r => formatDate(r.uzonia_date).includes(fDate.trim()));
    if (fDays.trim())      f = f.filter(r => String(r.days).includes(fDays.trim()));
    if (fFileId.trim())    f = f.filter(r => ci(r.file_id).includes(ci(fFileId.trim())));
    if (fRate.trim())      f = f.filter(r => fmtRate(r.rate).includes(fRate.trim()));
    if (fUzonia.trim())    f = f.filter(r => fmtRate(r.uzonia).includes(fUzonia.trim()));
    if (fDay7.trim())      f = f.filter(r => fmtRate(r.day_7_uzonia).includes(fDay7.trim()));
    if (fDay30.trim())     f = f.filter(r => fmtRate(r.day_30_uzonia).includes(fDay30.trim()));
    if (fDay90.trim())     f = f.filter(r => fmtRate(r.day_90_uzonia).includes(fDay90.trim()));
    if (fDay180.trim())    f = f.filter(r => fmtRate(r.day_180_uzonia).includes(fDay180.trim()));
    if (fIndex.trim())     f = f.filter(r => fmtIndex(r.index).includes(fIndex.trim()));
    if (fUsername.trim())  f = f.filter(r => ci(r.username ?? '').includes(ci(fUsername.trim())));
    if (fFirstName.trim()) f = f.filter(r => ci(r.first_name ?? '').includes(ci(fFirstName.trim())));
    if (fLastName.trim())  f = f.filter(r => ci(r.last_name ?? '').includes(ci(fLastName.trim())));
    if (fCreated.trim())   f = f.filter(r => ci(formatDateTime(r.created_at)).includes(ci(fCreated.trim())));
    return f;
  }, [rows, fDate, fDays, fFileId, fRate, fUzonia, fDay7, fDay30, fDay90, fDay180, fIndex, fUsername, fFirstName, fLastName, fCreated]);

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

  const hasActiveFilters = fDate || fDays || fFileId || fRate || fUzonia || fDay7 || fDay30 || fDay90 || fDay180 || fIndex || fUsername || fFirstName || fLastName || fCreated;
  const totalPages    = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = useMemo(
    () => filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage),
    [filteredData, currentPage]
  );
  useEffect(() => { setCurrentPage(1); }, [fDate, fDays, fFileId, fRate, fUzonia, fDay7, fDay30, fDay90, fDay180, fIndex, fUsername, fFirstName, fLastName, fCreated]);

  const clearFilters = useCallback(() => {
    setFDate(''); setFDays(''); setFFileId(''); setFRate(''); setFUzonia('');
    setFDay7(''); setFDay30(''); setFDay90(''); setFDay180(''); setFIndex('');
    setFUsername(''); setFFirstName(''); setFLastName(''); setFCreated('');
  }, []);

  // ── Modals ────────────────────────────────────────────────────────────────
  const [isAddModalOpen,    setIsAddModalOpen]    = useState(false);
  const [isEditModalOpen,   setIsEditModalOpen]   = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [targetRow,  setTargetRow]  = useState<UzoniaRow | null>(null);
  const [isSaving,   setIsSaving]   = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [addForm,    setAddForm]    = useState<AddForm>({ ...EMPTY_ADD });
  const [editForm,   setEditForm]   = useState<EditForm>({ ...EMPTY_EDIT });

  const openAddModal = () => { setAddForm({ ...EMPTY_ADD }); setIsAddModalOpen(true); };
  const openEditModal = (r: UzoniaRow) => {
    setTargetRow(r);
    setEditForm({
      rate: String(r.rate), uzonia: String(r.uzonia),
      day_7_uzonia: String(r.day_7_uzonia), day_30_uzonia: String(r.day_30_uzonia),
      day_90_uzonia: String(r.day_90_uzonia), day_180_uzonia: String(r.day_180_uzonia),
      index: String(r.index), days: String(r.days),
    });
    setIsEditModalOpen(true);
  };
  const openDeleteModal = (r: UzoniaRow) => { setTargetRow(r); setIsDeleteModalOpen(true); };

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const handleAdd = async () => {
    const { file_id, uzonia_date, days, rate, uzonia, day_7_uzonia, day_30_uzonia, day_90_uzonia, day_180_uzonia, index } = addForm;
    if (!file_id.trim() || !uzonia_date || !days || !rate || !uzonia || !day_7_uzonia || !day_30_uzonia || !day_90_uzonia || !day_180_uzonia || !index) {
      showToast(t.allRequired, 'error'); return;
    }
    setIsSaving(true);
    try {
      const body = { file_id, uzonia_date, days: Number(days), rate: Number(rate), uzonia: Number(uzonia), day_7_uzonia: Number(day_7_uzonia), day_30_uzonia: Number(day_30_uzonia), day_90_uzonia: Number(day_90_uzonia), day_180_uzonia: Number(day_180_uzonia), index: Number(index) };
      const res = await apiFetch('/api/add_new_uzonia', { method: 'POST', body: JSON.stringify(body) });
      if (!res || !res.ok) { const e = await res!.json(); throw new Error(e.detail); }
      setIsAddModalOpen(false); setAddForm({ ...EMPTY_ADD });
      await fetchData();
      showToast(t.addSuccess, 'success');
    } catch (err: any) { showToast(err.message || t.addFailed, 'error'); }
    finally { setIsSaving(false); }
  };

  const handleEdit = async () => {
    if (!targetRow) return;
    const { rate, uzonia, day_7_uzonia, day_30_uzonia, day_90_uzonia, day_180_uzonia, index, days } = editForm;
    if (!rate || !uzonia || !day_7_uzonia || !day_30_uzonia || !day_90_uzonia || !day_180_uzonia || !index || !days) {
      showToast(t.rateRequired, 'error'); return;
    }
    setIsSaving(true);
    try {
      const body = { uzonia_date: targetRow.uzonia_date, rate: Number(rate), uzonia: Number(uzonia), day_7_uzonia: Number(day_7_uzonia), day_30_uzonia: Number(day_30_uzonia), day_90_uzonia: Number(day_90_uzonia), day_180_uzonia: Number(day_180_uzonia), index: Number(index), days: Number(days) };
      const res = await apiFetch('/api/edit_uzonia_data', { method: 'PUT', body: JSON.stringify(body) });
      if (!res || !res.ok) { const e = await res!.json(); throw new Error(e.detail); }
      setIsEditModalOpen(false); setTargetRow(null);
      await fetchData();
      showToast(t.editSuccess, 'success');
    } catch (err: any) { showToast(err.message || t.editFailed, 'error'); }
    finally { setIsSaving(false); }
  };

  const handleDelete = async () => {
    if (!targetRow) return;
    setIsDeleting(true);
    try {
      const res = await apiFetch(`/api/delete_single_uzonia?uzonia_date=${targetRow.uzonia_date}`, { method: 'DELETE' });
      if (!res || !res.ok) { const e = await res!.json(); throw new Error(e.detail); }
      setIsDeleteModalOpen(false); setTargetRow(null);
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


  // ── NavBtn ────────────────────────────────────────────────────────────────
  const NavBtn = ({ page }: { page: typeof NAV_PAGES[0] }) => {
    const active = page.path === currentPath;
    const label  = t[page.key as keyof typeof t] as string || page.key;
    return (
      <button onClick={() => navigate(page.path)} style={{
        display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px',
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

  const allowFloat = (value: string) => {
      return value
        .replace(/[^0-9.]/g, "")      // remove non-numeric
        .replace(/(\..*)\./g, "$1"); // only one dot allowed
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
                style={{ flex: 1, padding: '11px', background: '#f1f5f9', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', color: '#64748b', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
                onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}
              >{t.cancel}</button>
              <button onClick={() => applyLanguageChange(pendingLang)}
                style={{ flex: 1, padding: '11px', background: 'linear-gradient(135deg,#0a3b5c,#1a5080)', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', color: 'white', cursor: 'pointer', boxShadow: '0 4px 12px rgba(10,59,92,0.3)' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              >{t.confirm}</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════ HEADER ═══════════════════════════ */}
      <header style={{
        width: '100%', background: 'linear-gradient(135deg, #0a3b5c 0%, #1a4b70 100%)',
        boxShadow: '0 4px 20px rgba(0,40,70,0.18)', borderBottom: '3px solid #e9b741',
        boxSizing: 'border-box', position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: isMobile ? '0 12px' : '0 20px', height: '60px', minWidth: 0 }}>
          {/* Logo */}
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
            <nav style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '40px', minWidth: 'max-content', flexWrap: 'nowrap' }}>
              {NAV_PAGES.map(p => <NavBtn key={p.path} page={p} />)}
            </nav>
          </div>
          <div style={{ flex: 1, minWidth: 0 }} />
          {/* Lang + Avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: '3px', background: 'rgba(255,255,255,0.08)', borderRadius: '8px', padding: '4px', border: '1px solid rgba(255,255,255,0.12)' }}>
              {(Object.entries(LANG_LABELS) as [LangKey, string][]).map(([key, label]) => (
                <button key={key} onClick={() => key !== lang && setPendingLang(key)}
                  style={{ background: lang === key ? '#e9b741' : 'transparent', color: lang === key ? '#0a2a40' : 'rgba(255,255,255,0.75)', border: 'none', borderRadius: '6px', padding: '4px 8px', fontSize: '11px', fontWeight: '600', cursor: lang === key ? 'default' : 'pointer', transition: 'all 0.18s', minWidth: '26px' }}
                  onMouseEnter={e => { if (lang !== key) e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
                  onMouseLeave={e => { if (lang !== key) e.currentTarget.style.background = 'transparent'; }}
                >{label}</button>
              ))}
            </div>

            {/* Avatar dropdown */}
            <div ref={dropdownRef} style={{ position: 'relative', flexShrink: 0 }}>
              <button onClick={() => setDropdownOpen(o => !o)} style={{
                background: 'rgba(255,255,255,0.1)', border: '2px solid rgba(233,183,65,0.5)',
                borderRadius: '50%', width: '44px', height: '44px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'white', fontSize: '18px', fontWeight: '700', transition: 'all 0.2s',
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
                        <div style={{ color: '#64748b', fontSize: '12px', marginTop: '2px' }}>@{user?.username ?? '—'}</div>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '6px', padding: '3px 10px', background: '#e8f0fe', borderRadius: '20px', fontSize: '11px', color: '#0a3b5c', fontWeight: '600' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>domain</span>
                          {user?.department ?? t.department}
                        </div>
                      </div>
                    </div>
                  </div>

                  {user?.is_admin && (
                    <div style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ padding: '4px 8px', marginBottom: '4px', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Administration</div>
                      {[
                        { icon: 'group',          label: t.usersBtn,    route: '/users_data',    color: '#3b82f6', bg: '#eff6ff' },
                        { icon: 'manage_history', label: t.sessionsBtn, route: '/user_sessions', color: '#8b5cf6', bg: '#f5f3ff' },
                        { icon: 'timeline',       label: t.actionsBtn,  route: '/user_actions',  color: '#f59e0b', bg: '#fffbeb' },
                      ].map(({ icon, label, route, color, bg }) => (
                        <button key={route} onClick={() => { navigate(route); setDropdownOpen(false); }}
                          style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left', padding: '10px 12px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', color: '#1f2937', fontSize: '13px', fontWeight: '500', transition: 'all 0.2s', marginBottom: '2px' }}
                          onMouseEnter={e => { e.currentTarget.style.background = bg; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '20px', color }}>{icon}</span>
                          <span style={{ flex: 1 }}>{label}</span>
                          <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#cbd5e1' }}>chevron_right</span>
                        </button>
                      ))}
                    </div>
                  )}

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

      {/* ═══════════════════════════ MAIN ═══════════════════════════ */}
      <main style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: isMobile ? '20px 14px' : '24px 28px', background: '#f8fafc', boxSizing: 'border-box' }}>
        <div style={{ width: '100%', maxWidth: '1700px', margin: '0 auto' }}>

          {/* ── Stats cards ── */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(6,1fr)', gap: '12px', marginBottom: '18px' }}>
            {[
              { label: t.totalRecords, value: String(stats.total),   color: '#0a3b5c', bg: '#e2e8f0', icon: 'database'      },
              { label: t.firstDate,    value: stats.firstDate,        color: '#065f46', bg: '#d1fae5', icon: 'first_page'    },
              { label: t.latestDate,   value: stats.latestDate,       color: '#1e40af', bg: '#dbeafe', icon: 'event'         },
              { label: t.avgUzonia,    value: stats.avgUzonia,        color: '#92400e', bg: '#fef3c7', icon: 'show_chart'    },
              { label: t.minUzonia,    value: stats.minUzonia,        color: '#065f46', bg: '#d1fae5', icon: 'trending_down' },
              { label: t.maxUzonia,    value: stats.maxUzonia,        color: '#991b1b', bg: '#fee2e2', icon: 'trending_up'   },
            ].map(s => (
              <div key={s.label} style={{ background: 'white', padding: '13px 14px', borderRadius: '13px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', background: s.bg, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: s.color }}>{s.icon}</span>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '2px', lineHeight: 1.2 }}>{s.label}</div>
                  <div style={{ fontSize: s.label === t.totalRecords ? '22px' : '12px', fontWeight: '700', color: s.color, lineHeight: 1.1, fontFamily: 'monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Filter bar ── */}
          <div style={{ background: 'white', padding: '12px 16px', borderRadius: '13px', marginBottom: '14px', boxShadow: '0 2px 8px rgba(0,40,70,0.05)', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '6px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '17px', color: '#0a3b5c', flexShrink: 0 }}>filter_alt</span>
              <span style={{ fontSize: '12px', fontWeight: '600', color: '#374151', flexShrink: 0 }}>{t.filterLabel}</span>

              <ColFilter value={fDate}      onChange={setFDate}      placeholder={t.phDate}      icon="event"       flex="130px" />
              <ColFilter value={fDays}      onChange={setFDays}      placeholder={t.phDays}      icon="today"       flex="76px"  numeric />
              <ColFilter value={fFileId}    onChange={setFFileId}    placeholder={t.phFileId}    icon="attach_file" flex="100px" />
              <ColFilter value={fRate}      onChange={setFRate}      placeholder={t.phRate}      icon="percent"     flex="90px"  numeric />
              <ColFilter value={fUzonia}    onChange={setFUzonia}    placeholder={t.phUzonia}    icon="percent"     flex="90px"  numeric />
              <ColFilter value={fDay7}      onChange={setFDay7}      placeholder={t.ph7Day}      icon="date_range"  flex="82px"  numeric />
              <ColFilter value={fDay30}     onChange={setFDay30}     placeholder={t.ph30Day}     icon="date_range"  flex="82px"  numeric />
              <ColFilter value={fDay90}     onChange={setFDay90}     placeholder={t.ph90Day}     icon="date_range"  flex="82px"  numeric />
              <ColFilter value={fDay180}    onChange={setFDay180}    placeholder={t.ph180Day}    icon="date_range"  flex="90px"  numeric />
              <ColFilter value={fIndex}     onChange={setFIndex}     placeholder={t.phIndex}     icon="functions"   flex="82px"  numeric />
              <ColFilter value={fUsername}  onChange={setFUsername}  placeholder={t.phUsername}  icon="badge"       flex="100px" />
              <ColFilter value={fFirstName} onChange={setFFirstName} placeholder={t.phFirstName} icon="person"      flex="90px"  />
              <ColFilter value={fLastName}  onChange={setFLastName}  placeholder={t.phLastName}  icon="person"      flex="90px"  />
              <ColFilter value={fCreated}   onChange={setFCreated}   placeholder={t.phCreatedAt} icon="schedule"    flex="110px" />

              {hasActiveFilters && (
                <button onClick={clearFilters} style={{ padding: '7px 10px', fontSize: '11px', fontWeight: '500', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>close</span>{t.clearAll}
                </button>
              )}

              <button onClick={openAddModal} style={{
                marginLeft: 'auto', flexShrink: 0, padding: '8px 16px', fontSize: '13px', fontWeight: '600',
                background: 'linear-gradient(135deg,#0a3b5c,#1a6494)', color: 'white',
                border: '2px solid rgba(233,183,65,0.4)', borderRadius: '10px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px',
                boxShadow: '0 3px 12px rgba(10,59,92,0.3)', transition: 'all 0.15s',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg,#e9b741,#d4a030)'; e.currentTarget.style.color = '#0a3b5c'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg,#0a3b5c,#1a6494)'; e.currentTarget.style.color = 'white'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>add_circle</span>
                {t.addRecord}
              </button>
            </div>

            {hasActiveFilters && (
              <div style={{ marginTop: '6px', fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', padding: '5px 8px', background: '#f1f5f9', borderRadius: '7px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '12px', color: '#0a3b5c' }}>info</span>
                {fDate      && <span style={{ background: 'white', padding: '1px 5px', borderRadius: '4px', fontFamily: 'monospace' }}>Date: <strong>{fDate}</strong></span>}
                {fDays      && <span style={{ background: 'white', padding: '1px 5px', borderRadius: '4px', fontFamily: 'monospace' }}>Days: <strong>{fDays}</strong></span>}
                {fFileId    && <span style={{ background: 'white', padding: '1px 5px', borderRadius: '4px' }}>FileID: <strong>{fFileId}</strong></span>}
                {fRate      && <span style={{ background: 'white', padding: '1px 5px', borderRadius: '4px', fontFamily: 'monospace' }}>Rate: <strong>{fRate}</strong></span>}
                {fUzonia    && <span style={{ background: 'white', padding: '1px 5px', borderRadius: '4px', fontFamily: 'monospace' }}>Uzonia: <strong>{fUzonia}</strong></span>}
                {fDay7      && <span style={{ background: 'white', padding: '1px 5px', borderRadius: '4px', fontFamily: 'monospace' }}>7d: <strong>{fDay7}</strong></span>}
                {fDay30     && <span style={{ background: 'white', padding: '1px 5px', borderRadius: '4px', fontFamily: 'monospace' }}>30d: <strong>{fDay30}</strong></span>}
                {fDay90     && <span style={{ background: 'white', padding: '1px 5px', borderRadius: '4px', fontFamily: 'monospace' }}>90d: <strong>{fDay90}</strong></span>}
                {fDay180    && <span style={{ background: 'white', padding: '1px 5px', borderRadius: '4px', fontFamily: 'monospace' }}>180d: <strong>{fDay180}</strong></span>}
                {fIndex     && <span style={{ background: 'white', padding: '1px 5px', borderRadius: '4px', fontFamily: 'monospace' }}>Index: <strong>{fIndex}</strong></span>}
                {fUsername  && <span style={{ background: 'white', padding: '1px 5px', borderRadius: '4px' }}>Username: <strong>{fUsername}</strong></span>}
                {fFirstName && <span style={{ background: 'white', padding: '1px 5px', borderRadius: '4px' }}>First: <strong>{fFirstName}</strong></span>}
                {fLastName  && <span style={{ background: 'white', padding: '1px 5px', borderRadius: '4px' }}>Last: <strong>{fLastName}</strong></span>}
                {fCreated   && <span style={{ background: 'white', padding: '1px 5px', borderRadius: '4px' }}>Created: <strong>{fCreated}</strong></span>}
                <span style={{ marginLeft: 'auto' }}>{t.results(filteredData.length)}</span>
              </div>
            )}
          </div>

          {/* ── Table ── */}
          <div style={{ background: 'white', borderRadius: '14px', boxShadow: '0 2px 10px rgba(0,40,70,0.06)', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
            {isLoading ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '40px', marginBottom: '14px', display: 'block', color: '#0a3b5c', animation: 'spin 2s linear infinite' }}>refresh</span>
                {t.loading}
              </div>
            ) : loadError ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#ef4444' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '40px', marginBottom: '14px', display: 'block' }}>error</span>
                {t.failedLoad}
              </div>
            ) : paginatedData.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '48px', marginBottom: '14px', display: 'block', color: '#94a3b8' }}>bar_chart</span>
                {hasActiveFilters ? t.noMatch : t.noData}
                {hasActiveFilters && (
                  <button onClick={clearFilters} style={{ display: 'block', margin: '12px auto 0', padding: '7px 18px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#475569', cursor: 'pointer', fontSize: '12px' }}>
                    {t.clearFilters}
                  </button>
                )}
              </div>
            ) : (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1500px' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #0a3b5c' }}>
                        {[
                          t.colIndex, t.colDate, t.colDays, t.colFileId,
                          t.colRate, t.colUzonia, t.col7Day, t.col30Day, t.col90Day, t.col180Day,
                          t.colIndex2, t.colUsername, t.colFirstName, t.colLastName,
                          t.colCreatedAt, t.colActions,
                        ].map(col => (
                          <th key={col} style={{ padding: '10px 11px', textAlign: 'center', fontWeight: '600', color: '#0a3b5c', fontSize: '11px', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedData.map((item, index) => {
                        const idx = (currentPage - 1) * itemsPerPage + index + 1;
                        return (
                          <tr key={item.uzonia_date}
                            style={{ borderBottom: '1px solid #f1f5f9', background: index % 2 === 0 ? 'white' : '#fafbfc', transition: 'background 0.1s' }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#f0f7ff'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = index % 2 === 0 ? 'white' : '#fafbfc'; }}
                          >
                            {/* # */}
                            <td style={{ padding: '9px 11px', color: '#cbd5e1', fontSize: '12px', fontWeight: '600', textAlign: 'center' }}>{idx}</td>

                            {/* Date */}
                            <td style={{ padding: '9px 11px', textAlign: 'center' }}>
                              <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: '700', color: '#0a3b5c', background: '#eef2ff', padding: '3px 7px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '3px', border: '1px solid #e0e7ff', whiteSpace: 'nowrap' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>event</span>
                                {formatDate(item.uzonia_date)}
                              </span>
                            </td>

                            {/* Days */}
                            <td style={{ padding: '9px 11px', textAlign: 'center' }}>
                              <DaysBadge value={item.days} />
                            </td>

                            {/* File ID */}
                            <td style={{ padding: '9px 11px', maxWidth: '120px' }}>
                              <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#64748b', background: '#f8fafc', padding: '2px 5px', borderRadius: '4px', border: '1px solid #e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }} title={item.file_id}>{item.file_id}</span>
                            </td>

                            {/* Rate */}
                            <td style={{ padding: '9px 11px', textAlign: 'center' }}><RateBadge value={item.rate}            bg="#fdf4ff" color="#6d28d9" /></td>
                            {/* Uzonia */}
                            <td style={{ padding: '9px 11px', textAlign: 'center' }}><RateBadge value={item.uzonia}         bg="#eff6ff" color="#1d4ed8" /></td>
                            {/* 7-day */}
                            <td style={{ padding: '9px 11px', textAlign: 'center' }}><RateBadge value={item.day_7_uzonia}   bg="#f0fdf4" color="#15803d" /></td>
                            {/* 30-day */}
                            <td style={{ padding: '9px 11px', textAlign: 'center' }}><RateBadge value={item.day_30_uzonia}  bg="#fefce8" color="#a16207" /></td>
                            {/* 90-day */}
                            <td style={{ padding: '9px 11px', textAlign: 'center' }}><RateBadge value={item.day_90_uzonia}  bg="#fdf4ff" color="#7e22ce" /></td>
                            {/* 180-day */}
                            <td style={{ padding: '9px 11px', textAlign: 'center' }}><RateBadge value={item.day_180_uzonia} bg="#fff7ed" color="#c2410c" /></td>

                            {/* Index */}
                            <td style={{ padding: '9px 11px', textAlign: 'center' }}>
                              <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: '600', color: '#374151', whiteSpace: 'nowrap' }}>{fmtIndex(item.index)}</span>
                            </td>

                            {/* Username */}
                            <td style={{ padding: '9px 11px', textAlign: 'center' }}>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '12px', color: '#0a3b5c' }}>badge</span>
                                <span style={{ fontSize: '12px', fontWeight: '500', color: item.username ? '#1e293b' : '#cbd5e1', whiteSpace: 'nowrap' }}>
                                  {item.username || '—'}
                                </span>
                              </div>
                            </td>

                            {/* First Name */}
                            <td style={{ padding: '9px 11px', textAlign: 'center' }}>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '12px', color: '#8b5cf6' }}>person</span>
                                <span style={{ fontSize: '12px', color: item.first_name ? '#1e293b' : '#cbd5e1', whiteSpace: 'nowrap' }}>
                                  {item.first_name || '—'}
                                </span>
                              </div>
                            </td>

                            {/* Last Name */}
                            <td style={{ padding: '9px 11px', textAlign: 'center' }}>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '12px', color: '#8b5cf6' }}>person</span>
                                <span style={{ fontSize: '12px', color: item.last_name ? '#1e293b' : '#cbd5e1', whiteSpace: 'nowrap' }}>
                                  {item.last_name || '—'}
                                </span>
                              </div>
                            </td>

                            {/* Created At */}
                            <td style={{ padding: '9px 11px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '11px', color: '#0a3b5c', flexShrink: 0 }}>schedule</span>
                                <span style={{ fontSize: '10px', fontFamily: item.created_at ? 'monospace' : 'inherit', color: item.created_at ? '#374151' : '#cbd5e1', fontWeight: item.created_at ? '500' : '400', whiteSpace: 'nowrap' }}>
                                  {formatDateTime(item.created_at)}
                                </span>
                              </div>
                            </td>

                            {/* Actions */}
                            <td style={{ padding: '9px 11px' }}>
                              <div style={{ display: 'flex', gap: '4px', alignItems: 'center', justifyContent: 'center' }}>
                                <button onClick={() => openEditModal(item)}
                                  style={{ padding: '4px 9px', fontSize: '11px', fontWeight: '500', background: '#f1f5f9', color: '#0a3b5c', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px', transition: 'all 0.13s', whiteSpace: 'nowrap' }}
                                  onMouseEnter={e => { e.currentTarget.style.background = '#0a3b5c'; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = '#0a3b5c'; }}
                                  onMouseLeave={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#0a3b5c'; e.currentTarget.style.borderColor = '#cbd5e1'; }}>
                                  <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>edit</span>{t.edit}
                                </button>
                                <button onClick={() => openDeleteModal(item)}
                                  style={{ padding: '4px 9px', fontSize: '11px', fontWeight: '500', background: '#fff5f5', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px', transition: 'all 0.13s', whiteSpace: 'nowrap' }}
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
                  <div style={{ padding: '12px 18px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      {t.showing((currentPage - 1) * itemsPerPage + 1, Math.min(currentPage * itemsPerPage, filteredData.length), filteredData.length)}
                    </div>
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}
                        style={{ padding: '5px 10px', fontSize: '12px', fontWeight: '500', background: currentPage === 1 ? '#f1f5f9' : 'white', color: currentPage === 1 ? '#94a3b8' : '#0a3b5c', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>chevron_left</span>{t.previous}
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                        const show = page === 1 || page === totalPages || (page >= currentPage - 2 && page <= currentPage + 2);
                        const ell  = page === currentPage - 3 || page === currentPage + 3;
                        if (show) return (
                          <button key={page} onClick={() => setCurrentPage(page)}
                            style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '600', background: currentPage === page ? '#0a3b5c' : 'white', color: currentPage === page ? 'white' : '#0f172a', border: `1px solid ${currentPage === page ? '#0a3b5c' : '#e2e8f0'}`, borderRadius: '6px', cursor: 'pointer' }}>
                            {page}
                          </button>
                        );
                        if (ell) return <span key={`e${page}`} style={{ width: '28px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>…</span>;
                        return null;
                      })}
                      <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages}
                        style={{ padding: '5px 10px', fontSize: '12px', fontWeight: '500', background: currentPage === totalPages ? '#f1f5f9' : 'white', color: currentPage === totalPages ? '#94a3b8' : '#0a3b5c', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}>
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

      {/* ═══════════════════════════ FOOTER ═══════════════════════════ */}
      <footer style={{ width: '100%', background: '#0a2a40', borderTop: '3px solid #e9b741', boxSizing: 'border-box' }}>
        <div style={{ width: '100%', maxWidth: '1700px', margin: '0 auto', padding: '40px 32px 28px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '280px repeat(4,1fr)', gap: '48px', alignItems: 'start' }}>
          {/* Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <img src={CbuLogo} alt="CBU" style={{ width: '40px', height: '40px', objectFit: 'contain', background: 'white', borderRadius: '9px', padding: '4px', flexShrink: 0 }} />
              <div style={{ color: 'white', fontSize: '16px', fontWeight: '700', lineHeight: '1.4' }}>{t.bankName}</div>
            </div>
            <p style={{ fontSize: '13px', lineHeight: '1.6', color: '#6b8499', marginBottom: '18px' }}>{t.officialDesc}</p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {[
                { src: facebook,  alt: 'Facebook',  href: 'https://www.facebook.com/centralbankuzbekistan/', w: 28 },
                { src: telegram,  alt: 'Telegram',  href: 'https://t.me/centralbankuzbekistan',              w: 30 },
                { src: linkedin,  alt: 'LinkedIn',  href: 'https://www.linkedin.com/company/centralbankuzbekistan/', w: 32 },
                { src: twitter,   alt: 'Twitter',   href: 'https://x.com/cbuzbekistan',                      w: 40 },
                { src: instagram, alt: 'Instagram', href: 'https://www.instagram.com/centralbankuzbekistan', w: 26 },
                { src: youtube,   alt: 'YouTube',   href: 'https://www.youtube.com/centralbankofuzbekistan', w: 30 },
              ].map(s => (
                <a key={s.alt} href={s.href} target="_blank" rel="noopener noreferrer"
                  style={{ width: '32px', height: '32px', borderRadius: '7px', background: 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.18)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)'; }}>
                  <img src={s.src} alt={s.alt} style={{ width: `${s.w}px`, height: `${s.w}px`, objectFit: 'contain' }} />
                </a>
              ))}
            </div>
          </div>

          {/* Modules */}
          <div>
            <div style={{ color: 'white', fontSize: '15px', fontWeight: '600', marginBottom: '16px', paddingBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>{t.modules}</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {NAV_PAGES.map(p => (
                <li key={p.path} style={{ marginBottom: '12px' }}>
                  <button onClick={() => navigate(p.path)} style={{ background: 'none', border: 'none', padding: 0, display: 'flex', alignItems: 'center', gap: '7px', fontSize: '14px', color: p.path === currentPath ? '#e9b741' : '#8097a8', fontWeight: p.path === currentPath ? '600' : '400', cursor: 'pointer', transition: 'color 0.15s' }}
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
            <div style={{ color: 'white', fontSize: '15px', fontWeight: '600', marginBottom: '16px', paddingBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>{t.aboutCbu}</div>
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
            <div style={{ color: 'white', fontSize: '15px', fontWeight: '600', marginBottom: '16px', paddingBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>{t.services}</div>
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
            <div style={{ color: 'white', fontSize: '15px', fontWeight: '700', marginBottom: '16px', paddingBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>{t.contact}</div>
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
          <div style={{ width: '100%', maxWidth: '1700px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#4a5c6a', flexWrap: 'wrap', gap: '8px' }}>
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

      {/* ═══════════════════════════ ADD MODAL ═══════════════════════════ */}
      {isAddModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => { if (!isSaving) setIsAddModalOpen(false); }}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '28px', width: '580px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.3)', border: '1px solid #e2e8f0' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0a3b5c', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#e9b741' }}>add_circle</span>
                {t.addTitle}
              </h2>
              <button onClick={() => { if (!isSaving) setIsAddModalOpen(false); }} style={{ border: 'none', background: '#f1f5f9', cursor: 'pointer', color: '#64748b', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>×</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '22px' }}>
              {/* Date + Days */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>{t.uzoniaDate} <span style={{ color: '#dc2626' }}>*</span></label>
                  <div style={{ position: 'relative' }}>
                    <span className="material-symbols-outlined" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '16px', pointerEvents: 'none', zIndex: 2 }}>event</span>
                    <input type="date" value={addForm.uzonia_date} onChange={e => setAddForm(f => ({ ...f, uzonia_date: e.target.value }))}
                      style={{ ...inputStyle, paddingLeft: '34px', fontFamily: 'monospace', colorScheme: 'light' }} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>{t.days} <span style={{ color: '#dc2626' }}>*</span></label>
                  <div style={{ position: 'relative' }}>
                    <span className="material-symbols-outlined" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '16px', pointerEvents: 'none', zIndex: 2 }}>today</span>
                    <input type="number" min="1" step="1" value={addForm.days} onChange={e => setAddForm(f => ({ ...f, days: e.target.value }))}
                      placeholder="1" style={{ ...inputStyle, paddingLeft: '34px', fontFamily: 'monospace' }} />
                  </div>
                </div>
              </div>

              {/* File ID */}
              <div>
                <label style={labelStyle}>{t.fileId} <span style={{ color: '#dc2626' }}>*</span></label>
                <div style={{ position: 'relative' }}>
                  <span className="material-symbols-outlined" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '16px', pointerEvents: 'none', zIndex: 2 }}>attach_file</span>
                  <input type="text" value={addForm.file_id} onChange={e => setAddForm(f => ({ ...f, file_id: e.target.value }))}
                    placeholder="e.g. uzonia_2026_05_31" style={{ ...inputStyle, paddingLeft: '34px', fontFamily: 'monospace' }} />
                </div>
              </div>

              {/* Rate fields 2-col grid - simple text inputs */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={labelStyle}>{t.rate} <span style={{ color: '#dc2626' }}>*</span></label>
                    <input type="text" value={addForm.rate} onChange={e => setAddForm(f => ({ ...f, rate: allowFloat(e.target.value) }))} placeholder="13.5000" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>{t.uzoniaLabel} <span style={{ color: '#dc2626' }}>*</span></label>
                    <input type="text" value={addForm.uzonia} onChange={e => setAddForm(f => ({ ...f, uzonia: allowFloat(e.target.value) }))} placeholder="12.4800" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>{t.day7} <span style={{ color: '#dc2626' }}>*</span></label>
                    <input type="text" value={addForm.day_7_uzonia} onChange={e => setAddForm(f => ({ ...f, day_7_uzonia: allowFloat(e.target.value) }))} placeholder="12.6100" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>{t.day30} <span style={{ color: '#dc2626' }}>*</span></label>
                    <input type="text" value={addForm.day_30_uzonia} onChange={e => setAddForm(f => ({ ...f, day_30_uzonia: allowFloat(e.target.value)  }))} placeholder="12.8500" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>{t.day90} <span style={{ color: '#dc2626' }}>*</span></label>
                    <input type="text" value={addForm.day_90_uzonia} onChange={e => setAddForm(f => ({ ...f, day_90_uzonia: allowFloat(e.target.value)  }))} placeholder="13.1200" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>{t.day180} <span style={{ color: '#dc2626' }}>*</span></label>
                    <input type="text" value={addForm.day_180_uzonia} onChange={e => setAddForm(f => ({ ...f, day_180_uzonia: allowFloat(e.target.value)  }))} placeholder="13.4500" style={inputStyle} />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>{t.indexLabel} <span style={{ color: '#dc2626' }}>*</span></label>
                    <input type="text" value={addForm.index} onChange={e => setAddForm(f => ({ ...f, index: allowFloat(e.target.value) }))} placeholder="1.0000" style={inputStyle} />
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

      {/* ═══════════════════════════ EDIT MODAL ═══════════════════════════ */}
        {isEditModalOpen && targetRow && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
            onClick={() => { if (!isSaving) setIsEditModalOpen(false); }}>
            <div style={{ background: 'white', borderRadius: '20px', padding: '28px', width: '580px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.3)', border: '1px solid #e2e8f0' }}
              onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0a3b5c', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#0a3b5c' }}>edit</span>
                  {t.editTitle}
                </h2>
                <button onClick={() => { if (!isSaving) setIsEditModalOpen(false); }} style={{ border: 'none', background: '#f1f5f9', cursor: 'pointer', color: '#64748b', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>×</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '22px' }}>
                  {/* Date + Days */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={labelStyle}>{t.uzoniaDate} <span style={{ color: '#dc2626' }}>*</span></label>
                      <div style={{ position: 'relative' }}>
                        <span className="material-symbols-outlined" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '16px', pointerEvents: 'none', zIndex: 2 }}>event</span>
                        <input type="date" value={addForm.uzonia_date} onChange={e => setAddForm(f => ({ ...f, uzonia_date: e.target.value }))}
                          style={{ ...inputStyle, paddingLeft: '34px', fontFamily: 'monospace', colorScheme: 'light' }} />
                      </div>
                    </div>
                    <div>
                      <label style={labelStyle}>{t.days} <span style={{ color: '#dc2626' }}>*</span></label>
                      <div style={{ position: 'relative' }}>
                        <span className="material-symbols-outlined" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '16px', pointerEvents: 'none', zIndex: 2 }}>today</span>
                        <input type="number" min="1" step="1" value={addForm.days} onChange={e => setAddForm(f => ({ ...f, days: allowFloat(e.target.value) }))}
                          placeholder="1" style={{ ...inputStyle, paddingLeft: '34px', fontFamily: 'monospace' }} />
                      </div>
                    </div>
                  </div>

                  {/* File ID */}
                  <div>
                    <label style={labelStyle}>{t.fileId} <span style={{ color: '#dc2626' }}>*</span></label>
                    <div style={{ position: 'relative' }}>
                      <span className="material-symbols-outlined" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '16px', pointerEvents: 'none', zIndex: 2 }}>attach_file</span>
                      <input type="text" value={addForm.file_id} onChange={e => setAddForm(f => ({ ...f, file_id: e.target.value }))}
                        placeholder="e.g. uzonia_2026_05_31" style={{ ...inputStyle, paddingLeft: '34px', fontFamily: 'monospace' }} />
                    </div>
                  </div>

                {/* Rate fields - simple text inputs with allowFloat */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={labelStyle}>{t.rate} <span style={{ color: '#dc2626' }}>*</span></label>
                    <input type="text" value={editForm.rate} onChange={e => setEditForm(f => ({ ...f, rate: allowFloat(e.target.value) }))} placeholder="13.5000" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>{t.uzoniaLabel} <span style={{ color: '#dc2626' }}>*</span></label>
                    <input type="text" value={editForm.uzonia} onChange={e => setEditForm(f => ({ ...f, uzonia: allowFloat(e.target.value) }))} placeholder="12.4800" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>{t.day7} <span style={{ color: '#dc2626' }}>*</span></label>
                    <input type="text" value={editForm.day_7_uzonia} onChange={e => setEditForm(f => ({ ...f, day_7_uzonia: allowFloat(e.target.value) }))} placeholder="12.6100" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>{t.day30} <span style={{ color: '#dc2626' }}>*</span></label>
                    <input type="text" value={editForm.day_30_uzonia} onChange={e => setEditForm(f => ({ ...f, day_30_uzonia: allowFloat(e.target.value) }))} placeholder="12.8500" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>{t.day90} <span style={{ color: '#dc2626' }}>*</span></label>
                    <input type="text" value={editForm.day_90_uzonia} onChange={e => setEditForm(f => ({ ...f, day_90_uzonia: allowFloat(e.target.value) }))} placeholder="13.1200" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>{t.day180} <span style={{ color: '#dc2626' }}>*</span></label>
                    <input type="text" value={editForm.day_180_uzonia} onChange={e => setEditForm(f => ({ ...f, day_180_uzonia: allowFloat(e.target.value) }))} placeholder="13.4500" style={inputStyle} />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>{t.indexLabel} <span style={{ color: '#dc2626' }}>*</span></label>
                    <input type="text" value={editForm.index} onChange={e => setEditForm(f => ({ ...f, index: allowFloat(e.target.value) }))} placeholder="1.0000" style={inputStyle} />
                  </div>
                </div>

                {/* Created at */}
                <div>
                  <label style={{ ...labelStyle, color: '#94a3b8' }}>{t.createdAtLabel}</label>
                  <input type="text" value={formatDateTime(targetRow.created_at)} disabled style={{ ...inputStyle, background: '#f8fafc', color: '#94a3b8', fontSize: '12px', fontFamily: 'monospace' }} />
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

      {/* ═══════════════════════════ DELETE MODAL ═══════════════════════════ */}
      {isDeleteModalOpen && targetRow && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => { if (!isDeleting) setIsDeleteModalOpen(false); }}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '28px', width: '480px', maxWidth: '95vw', boxShadow: '0 24px 64px rgba(0,0,0,0.3)', border: '1px solid #e2e8f0' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
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
              <div style={{ paddingLeft: '20px', fontSize: '12px', color: '#4b5563', lineHeight: '2.1', textAlign: 'left' }}>
                <div>Date: <strong style={{ fontFamily: 'monospace', color: '#dc2626' }}>{formatDate(targetRow.uzonia_date)}</strong></div>
                <div>Days: <strong style={{ fontFamily: 'monospace', color: '#0369a1' }}>{targetRow.days}</strong></div>
                <div>File ID: <strong style={{ fontFamily: 'monospace' }}>{targetRow.file_id}</strong></div>
                <div>Rate: <strong style={{ fontFamily: 'monospace' }}>{fmtRate(targetRow.rate)}</strong></div>
                <div>Uzonia: <strong style={{ fontFamily: 'monospace' }}>{fmtRate(targetRow.uzonia)}</strong></div>
                <div>Index: <strong style={{ fontFamily: 'monospace' }}>{fmtIndex(targetRow.index)}</strong></div>
                {targetRow.username && <div>User: <strong>{targetRow.username}</strong></div>}
                <div>Created: <strong style={{ fontFamily: 'monospace' }}>{formatDateTime(targetRow.created_at)}</strong></div>
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
        input[type="number"]::-webkit-inner-spin-button,input[type="number"]::-webkit-outer-spin-button{opacity:0.4;}
        nav::-webkit-scrollbar{height:0;}
        button:not(:disabled):hover{opacity:0.95;}
      `}</style>
    </div>
  );
};

export default UzoniaDataPage;