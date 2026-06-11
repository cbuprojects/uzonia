import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import CbuLogo   from '../assets/CBU_Logo.png';
import facebook  from '../assets/facebook.png';
import telegram  from '../assets/telegram.png';
import linkedin  from '../assets/linkedin.png';
import twitter   from '../assets/twitter.png';
import instagram from '../assets/instagram.png';
import youtube   from '../assets/youtube.png';

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// ─────────────────────────────────────────────────────────────────────────────
// Auth helpers
// ─────────────────────────────────────────────────────────────────────────────
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
  { key: 'bank_names',   icon: 'calendar_month',  path: '/bank_names'   },
];

// ─────────────────────────────────────────────────────────────────────────────
// i18n
// ─────────────────────────────────────────────────────────────────────────────
const TRANSLATIONS = {
  en: {
    bankName:    'The Central Bank of Uzbekistan',
    deptSubtitle: 'Department of Monetary Operations',
    // nav
    calculations: 'Calculations', uploads: 'Uploads', repo: 'Repo',
    depo: 'Depo', data: 'Data', holidays: 'Holidays',
    back: 'Back',
    // page
    pageTitle:    'UZONIA Calculation',
    pageDesc:     'Upload the three source files, set the CB parameters, and run the overnight UZONIA calculation.',
    newCalc:      'New Calculation',
    // sections
    sourceFiles:  'Source Files',
    cbParams:     'CB Parameters',
    uploaded:     'uploaded',
    // file labels
    repoNLabel:   'Repo N File',  repoNDesc: 'Bilateral REPO transactions (overnight)',
    repoMLabel:   'Repo M File',  repoMDesc: 'Market-maker REPO transactions',
    depositLabel: 'Deposit File', depositDesc: 'Interbank overnight deposit data',
    clickOrDrop:  'Click or drag & drop',
    dropHere:     'Drop here',
    onlyExcel:    'Only Excel files (.xlsx / .xls) are allowed.',
    // params
    cbDate:       'CB Date', cbDateHint: 'Defaults to today',
    cbRate:       'CB Rate (%)', cbRateHint: 'Central Bank base rate',
    cbDeposit:    'CB Deposit (UZS)', cbDepositHint: 'Total CB overnight deposit',
    cbDepositPh:  'e.g. 500 000 000 000',
    // buttons
    runCalc:      'Run UZONIA Calculation',
    calculating:  'Calculating…',
    // progress
    progLabel:    'Running UZONIA calculation…',
    progDetail:   'Processing repo data, validating gaps, computing weighted averages…',
    // errors
    fillFiles:    'Please upload all three Excel files.',
    fillDate:     'Please select a date.',
    fillRate:     'Please enter a valid CB Rate.',
    fillDeposit:  'Please enter a valid CB Deposit.',
    calcFailed:   'Calculation Failed',
    // hints
    missingFiles: (list: string) => `Upload ${list} to continue`,
    fillParams:   'Fill in all CB parameters to continue',
    // results
    calcComplete: 'Calculation Complete',
    fileId:       'File ID',
    date:         'Date',
    savedToDb:    'Saved to database',
    savedDesc:    'Results are stored and available in the Data module.',
    calcRates:    'Calculated Rates',
    uzonia:       'UZONIA (Overnight)',
    day7:         '7-Day UZONIA',
    day30:        '30-Day UZONIA',
    day90:        '90-Day UZONIA',
    day180:       '180-Day UZONIA',
    uzoniaIndex:  'UZONIA Index',
    // calc way
    way1: 'Way 1 — Repo N+M (≥ 500B, ≥ 5 deals)',
    way2: 'Way 2 — Repo + Deposit (≥ 500B)',
    way3: 'Way 3 — With CB Deposit supplement',
    // how-it-works
    howTitle: 'How does the calculation work?',
    w1label: 'Way 1', w1cond: 'Total Repo volume ≥ 500B UZS and ≥ 5 transactions',
    w1desc:  'Uses only Repo N + M data. Bottom 10% trimmed, weighted average computed.',
    w2label: 'Way 2', w2cond: 'Repo + Deposit combined ≥ 500B UZS',
    w2desc:  'Combines Repo and Deposit data. Same trimming and weighting methodology.',
    w3label: 'Way 3', w3cond: 'Total volume falls below threshold',
    w3desc:  'CB deposit supplement added to reach volume. CB Rate used as the reference.',
    // user
    usersBtn: 'Users', sessionsBtn: 'Sessions', actionsBtn: 'Actions',
    signOut:  'Sign Out', department: 'Department',
    // language modal
    langConfirmTitle: 'Change Language',
    langConfirmMsg: (lang: string) => `Are you sure you want to switch the interface language to ${lang}?`,
    confirm: 'Yes, change', cancel: 'Cancel',
    // footer
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
    privacyPolicy: 'Privacy Policy', termsOfUse: 'Terms of Use',
    // toast
    success: 'Calculation completed successfully!',
    sessionExpired: 'Session expired. Please log in again.',
  },
  ru: {
    bankName:    'Центральный Банк Республики Узбекистан',
    deptSubtitle: 'Департамент Mонетарных Oпераций',
    calculations: 'Расчёты', uploads: 'Загрузки', repo: 'Репо',
    depo: 'Депо', data: 'Данные', holidays: 'Праздники',
    back: 'Назад',
    pageTitle:    'Расчёт UZONIA',
    pageDesc:     'Загрузите три исходных файла, задайте параметры ЦБ и запустите расчёт UZONIA overnight.',
    newCalc:      'Новый расчёт',
    sourceFiles:  'Исходные файлы',
    cbParams:     'Параметры ЦБ',
    uploaded:     'загружено',
    repoNLabel:   'Файл Repo N',  repoNDesc: 'Двусторонние сделки РЕПО (overnight)',
    repoMLabel:   'Файл Repo M',  repoMDesc: 'Сделки РЕПО маркет-мейкеров',
    depositLabel: 'Файл депозитов', depositDesc: 'Межбанковские overnight депозиты',
    clickOrDrop:  'Нажмите или перетащите',
    dropHere:     'Перетащите сюда',
    onlyExcel:    'Разрешены только файлы Excel (.xlsx / .xls).',
    cbDate:       'Дата ЦБ', cbDateHint: 'По умолчанию — сегодня',
    cbRate:       'Ставка ЦБ (%)', cbRateHint: 'Базовая ставка Центрального Банка',
    cbDeposit:    'Депозит ЦБ (UZS)', cbDepositHint: 'Общий overnight-депозит ЦБ',
    cbDepositPh:  'напр. 500 000 000 000',
    runCalc:      'Запустить расчёт UZONIA',
    calculating:  'Расчёт…',
    progLabel:    'Выполняется расчёт UZONIA…',
    progDetail:   'Обработка данных репо, проверка пробелов, вычисление взвешенных средних…',
    fillFiles:    'Пожалуйста, загрузите все три файла Excel.',
    fillDate:     'Пожалуйста, выберите дату.',
    fillRate:     'Пожалуйста, введите корректную ставку ЦБ.',
    fillDeposit:  'Пожалуйста, введите корректный депозит ЦБ.',
    calcFailed:   'Ошибка расчёта',
    missingFiles: (list: string) => `Загрузите ${list} для продолжения`,
    fillParams:   'Заполните все параметры ЦБ для продолжения',
    calcComplete: 'Расчёт завершён',
    fileId:       'ID файла',
    date:         'Дата',
    savedToDb:    'Сохранено в базе данных',
    savedDesc:    'Результаты сохранены и доступны в модуле Данные.',
    calcRates:    'Рассчитанные ставки',
    uzonia:       'UZONIA (Overnight)',
    day7:         '7-дневная UZONIA',
    day30:        '30-дневная UZONIA',
    day90:        '90-дневная UZONIA',
    day180:       '180-дневная UZONIA',
    uzoniaIndex:  'Индекс UZONIA',
    way1: 'Способ 1 — Repo N+M (≥ 500B, ≥ 5 сделок)',
    way2: 'Способ 2 — Репо + Депозит (≥ 500B)',
    way3: 'Способ 3 — С дополнением депозита ЦБ',
    howTitle: 'Как работает расчёт?',
    w1label: 'Способ 1', w1cond: 'Объём репо ≥ 500 млрд UZS и ≥ 5 сделок',
    w1desc:  'Используются только данные Repo N + M. Нижние 10% обрезаются, вычисляется взвешенное среднее.',
    w2label: 'Способ 2', w2cond: 'Совокупный объём Репо + Депозит ≥ 500 млрд UZS',
    w2desc:  'Объединяются данные Репо и Депозитов. Та же методология обрезки и взвешивания.',
    w3label: 'Способ 3', w3cond: 'Общий объём ниже порогового значения',
    w3desc:  'Добавляется дополнение депозита ЦБ для достижения объёма. Ставка ЦБ используется как ориентир.',
    usersBtn: 'Пользователи', sessionsBtn: 'Сессии', actionsBtn: 'Действия',
    signOut: 'Выйти', department: 'Отдел',
    langConfirmTitle: 'Изменить язык',
    langConfirmMsg: (lang: string) => `Вы уверены, что хотите изменить язык интерфейса на ${lang}?`,
    confirm: 'Да, изменить', cancel: 'Отмена',
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
    exchangeR: 'Курсы валют',
    contact: 'Контакты',
    addressS: 'Улица Ислама Каримова, 6',
    modules: 'Модули',
    copyright: '© 2026 Центральный Банк Республики Узбекистан. Все права защищены.',
    privacyPolicy: 'Политика конфиденциальности', termsOfUse: 'Условия использования',
    success: 'Расчёт успешно выполнен!',
    sessionExpired: 'Сессия истекла. Пожалуйста, войдите снова.',
  },
  uz_c: {
    bankName:    'Ўзбекистон Республикаси Марказий Банки',
    deptSubtitle: 'Монетар Oперациялар Департаменти',
    calculations: 'Ҳисоб-китоб', uploads: 'Юклашлар', repo: 'Репо',
    depo: 'Депо', data: 'Маълумотлар', holidays: 'Байрамлар',
    back: 'Орқага',
    pageTitle:    'UZONIA Ҳисоблаш',
    pageDesc:     'Учта манба фaylini yuklang, МБ параметрларini kiriting va UZONIA overnight hisob-kitobini ishga tushiring.',
    newCalc:      'Янги ҳисоблаш',
    sourceFiles:  'Манба Файллар',
    cbParams:     'МБ Параметрлари',
    uploaded:     'юкланди',
    repoNLabel:   'Repo N Файл',    repoNDesc: 'Икки томонлама РЕПО битимлари (overnight)',
    repoMLabel:   'Repo M Файл',    repoMDesc: 'Бозор ясовчи РЕПО битимлари',
    depositLabel: 'Депозит Файл',  depositDesc: 'Банклараро overnight депозитлар',
    clickOrDrop:  'Bosing yoki sudrab olib keling',
    dropHere:     'Бу ерга ташланг',
    onlyExcel:    'Фақат Excel файллари (.xlsx / .xls) рухсат этилади.',
    cbDate:       'МБ Санаси', cbDateHint: 'Стандарт — бугун',
    cbRate:       'МБ Ставкаси (%)', cbRateHint: 'Марказий Банк базис ставкаси',
    cbDeposit:    'МБ Депозити (UZS)', cbDepositHint: 'Жами overnight МБ депозити',
    cbDepositPh:  'мас. 500 000 000 000',
    runCalc:      'UZONIA Ҳисоблашни Ишга Туширинг',
    calculating:  'Ҳисобланмоқда…',
    progLabel:    'UZONIA ҳисоб-китоби бажарилмоқда…',
    progDetail:   'Репо маълумотлари ишланмоқда, бўшлиқлар текширилмоқда, оғирликланган ўртачалар ҳисобланмоқда…',
    fillFiles:    'Илтимос, учала Excel файлини юкланг.',
    fillDate:     'Илтимос, сана танланг.',
    fillRate:     'Илтимос, тўғри МБ ставкасини киритинг.',
    fillDeposit:  'Илтимос, тўғри МБ депозитини киритинг.',
    calcFailed:   'Ҳисоблаш Хатоси',
    missingFiles: (list: string) => `Давом этиш учун ${list}ни юкланг`,
    fillParams:   'Давом этиш учун барча МБ параметрларини тўлдиринг',
    calcComplete: 'Ҳисоблаш Тугади',
    fileId:       'Файл ID',
    date:         'Сана',
    savedToDb:    'Маълумотлар базасига сақланди',
    savedDesc:    'Натижалар сақланди ва Маълумотлар модулида мавжуд.',
    calcRates:    'Ҳисобланган Ставкалар',
    uzonia:       'UZONIA (Overnight)',
    day7:         '7 Кунлик UZONIA',
    day30:        '30 Кунлик UZONIA',
    day90:        '90 Кунлик UZONIA',
    day180:       '180 Кунлик UZONIA',
    uzoniaIndex:  'UZONIA Индекси',
    way1: '1-Усул — Repo N+M (≥ 500Б, ≥ 5 битим)',
    way2: '2-Усул — Репо + Депозит (≥ 500Б)',
    way3: '3-Усул — МБ Депозит қўшимчаси билан',
    howTitle: 'Ҳисоблаш қандай ишлайди?',
    w1label: '1-Усул', w1cond: 'Жами репо ≥ 500 млрд UZS ва ≥ 5 битим',
    w1desc:  'Фақат Repo N + M маълумотлари ишлатилади. Қуйи 10% кесилади, оғирликланган ўртача ҳисобланади.',
    w2label: '2-Усул', w2cond: 'Репо + Депозит бирлашган ≥ 500 млрд UZS',
    w2desc:  'Репо ва Депозит маълумотлари бирлаштирилади. Бир хил кесиш ва оғирлаш методологияси.',
    w3label: '3-Усул', w3cond: 'Жами ҳажм чегарадан паст',
    w3desc:  'Ҳажмга эришиш учун МБ депозит қўшимчаси қўшилади. МБ ставкаси ориентир сифатида ишлатилади.',
    usersBtn: 'Фойдаланувчилар', sessionsBtn: 'Сессиялар', actionsBtn: 'Ҳаракатлар',
    signOut: 'Чиқиш', department: 'Бўлим',
    langConfirmTitle: 'Тилни ўзгартириш',
    langConfirmMsg: (lang: string) => `Интерфейс тилини ${lang} тилига ўзгартиришга ишончингиз комилми?`,
    confirm: 'Ҳа, ўзгартириш', cancel: 'Бекор қилиш',
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
    privacyPolicy: 'Махфийлик сиёсати', termsOfUse: 'Фойдаланиш шартлари',
    success: 'Ҳисоблаш муваффақиятли тугади!',
    sessionExpired: 'Сессия муддати тугади. Илтимос, қайта киринг.',
  },
  uz_l: {
    bankName:    "O'zbekiston Respublikasi Markaziy Banki",
    deptSubtitle: 'Monetar Operatsiyalar Departamenti',
    calculations: "Hisob-kitob", uploads: 'Yuklamalar', repo: 'Repo',
    depo: 'Depo', data: "Ma'lumotlar", holidays: 'Bayramlar',
    back: 'Orqaga',
    pageTitle:    'UZONIA Hisoblash',
    pageDesc:     "Uchta manba faylini yuklang, MB parametrlarini kiriting va UZONIA overnight hisob-kitobini ishga tushiring.",
    newCalc:      'Yangi hisoblash',
    sourceFiles:  'Manba Fayllar',
    cbParams:     'MB Parametrlari',
    uploaded:     'yuklandi',
    repoNLabel:   'Repo N Fayl',   repoNDesc: 'Ikki tomonlama REPO bitishuvi (overnight)',
    repoMLabel:   'Repo M Fayl',   repoMDesc: 'Bozor yasovchi REPO bitishuvi',
    depositLabel: 'Depozit Fayl', depositDesc: "Banklararo overnight depozitlar",
    clickOrDrop:  "Bosing yoki sudrab keling",
    dropHere:     'Bu yerga tashlang',
    onlyExcel:    "Faqat Excel fayllar (.xlsx / .xls) ruxsat etiladi.",
    cbDate:       'MB Sanasi', cbDateHint: "Standart — bugun",
    cbRate:       "MB Stavkasi (%)", cbRateHint: 'Markaziy Bank bazis stavkasi',
    cbDeposit:    'MB Depoziti (UZS)', cbDepositHint: "Jami overnight MB depoziti",
    cbDepositPh:  'mas. 500 000 000 000',
    runCalc:      "UZONIA Hisoblashni Ishga Tushiring",
    calculating:  'Hisoblanmoqda…',
    progLabel:    'UZONIA hisob-kitobi bajarilmoqda…',
    progDetail:   "Repo ma'lumotlari ishlanmoqda, bo'shliqlar tekshirilmoqda, og'irliklangan o'rtachalar hisoblanmoqda…",
    fillFiles:    'Iltimos, uchala Excel faylini yuklang.',
    fillDate:     'Iltimos, sana tanlang.',
    fillRate:     "Iltimos, to'g'ri MB stavkasini kiriting.",
    fillDeposit:  "Iltimos, to'g'ri MB depozitini kiriting.",
    calcFailed:   'Hisoblash Xatosi',
    missingFiles: (list: string) => `Davom etish uchun ${list}ni yuklang`,
    fillParams:   "Davom etish uchun barcha MB parametrlarini to'ldiring",
    calcComplete: 'Hisoblash Tugadi',
    fileId:       'Fayl ID',
    date:         'Sana',
    savedToDb:    "Ma'lumotlar bazasiga saqlandi",
    savedDesc:    "Natijalar saqlandi va Ma'lumotlar modulida mavjud.",
    calcRates:    'Hisoblangan Stavkalar',
    uzonia:       'UZONIA (Overnight)',
    day7:         '7 Kunlik UZONIA',
    day30:        '30 Kunlik UZONIA',
    day90:        '90 Kunlik UZONIA',
    day180:       '180 Kunlik UZONIA',
    uzoniaIndex:  'UZONIA Indeksi',
    way1: "1-Usul — Repo N+M (≥ 500B, ≥ 5 bitim)",
    way2: '2-Usul — Repo + Depozit (≥ 500B)',
    way3: "3-Usul — MB Depozit qo'shimchasi bilan",
    howTitle: 'Hisoblash qanday ishlaydi?',
    w1label: '1-Usul', w1cond: "Jami repo ≥ 500 mlrd UZS va ≥ 5 bitim",
    w1desc:  "Faqat Repo N + M ma'lumotlari ishlatiladi. Quyi 10% kesil, og'irliklangan o'rtacha hisoblanadi.",
    w2label: '2-Usul', w2cond: 'Repo + Depozit birlashgan ≥ 500 mlrd UZS',
    w2desc:  "Repo va Depozit ma'lumotlari birlashtiriladi. Bir xil kesish va og'irlash metodologiyasi.",
    w3label: '3-Usul', w3cond: 'Jami hajm chegaradan past',
    w3desc:  "Hajmga erishish uchun MB depozit qo'shimchasi qo'shiladi. MB stavkasi oriyentir sifatida ishlatiladi.",
    usersBtn: 'Foydalanuvchilar', sessionsBtn: 'Sessiyalar', actionsBtn: 'Harakatlar',
    signOut: 'Chiqish', department: "Bo'lim",
    langConfirmTitle: "Tilni o'zgartirish",
    langConfirmMsg: (lang: string) => `Interfeys tilini ${lang} tiliga o'zgartirishga ishonchingiz komilmi?`,
    confirm: "Ha, o'zgartirish", cancel: 'Bekor qilish',
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
    privacyPolicy: 'Maxfiylik siyosati', termsOfUse: 'Foydalanish shartlari',
    success: 'Hisoblash muvaffaqiyatli tugadi!',
    sessionExpired: 'Sessiya muddati tugadi. Iltimos, qayta kiring.',
  },
};

type LangKey = keyof typeof TRANSLATIONS;
const LANG_LABELS: Record<LangKey, string> = { en: 'EN', ru: 'RU', uz_c: 'УЗ', uz_l: "O'Z" };
const LANG_NAMES:  Record<LangKey, string> = { en: 'English', ru: 'Русский', uz_c: 'Ўзбекча', uz_l: "O'zbekcha" };

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const fmtRate  = (n: number) => (typeof n==='number' && !isNaN(n)) ? `${n.toFixed(4)}%` : '—';
const fmtIndex = (n: number) => (typeof n==='number' && !isNaN(n)) ? n.toFixed(4) : '—';
const fmtDate  = (s: string) => {
  const p = String(s).split('T')[0].split('-');
  return p.length===3 ? `${p[2]}/${p[1]}/${p[0]}` : s;
};

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface CalcResult {
  file_id: string; calculation_way: number; uzonia_date: string;
  uzonia: number; day_7_uzonia: number; day_30_uzonia: number;
  day_90_uzonia: number; day_180_uzonia: number; index: number;
}
interface User {
  user_id: string; username: string; first_name: string; last_name: string;
  department: string; language: string; is_active: boolean; is_admin: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
const CalculationsPage: React.FC = () => {
  const navigate    = useNavigate();
  const currentPath = '/calculations';

  // ── User & lang ───────────────────────────────────────────────────────────
  const [user, setUser] = useState<User | null>(null);
  const [lang, setLang] = useState<LangKey>('en');
  const [pendingLang, setPendingLang] = useState<LangKey | null>(null);
  const t = TRANSLATIONS[lang] ?? TRANSLATIONS.en;

  // ── Responsive ────────────────────────────────────────────────────────────
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // ── User dropdown ─────────────────────────────────────────────────────────
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── Form ──────────────────────────────────────────────────────────────────
  const [repoNFile,   setRepoNFile]   = useState<File | null>(null);
  const [repoMFile,   setRepoMFile]   = useState<File | null>(null);
  const [depositFile, setDepositFile] = useState<File | null>(null);
  const [cbDate,      setCbDate]      = useState(todayIso());
  const [cbRate,      setCbRate]      = useState('');
  const [cbDeposit,   setCbDeposit]   = useState('');
  const repoNRef   = useRef<HTMLInputElement>(null);
  const repoMRef   = useRef<HTMLInputElement>(null);
  const depositRef = useRef<HTMLInputElement>(null);

  // ── UI ────────────────────────────────────────────────────────────────────
  const [isLoading, setIsLoading] = useState(false);
  const [result,    setResult]    = useState<CalcResult | null>(null);
  const [error,     setError]     = useState<string | null>(null);
  const [toast,     setToast]     = useState<{ text: string; type: 'success'|'error'|'info' } | null>(null);
  const [dragOver,  setDragOver]  = useState<'n'|'m'|'d'|null>(null);
  const [progress,  setProgress]  = useState(0);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fonts ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    [
      'https://fonts.googleapis.com/icon?family=Material+Symbols+Outlined',
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    ].forEach(href => {
      if (!document.querySelector(`link[href="${href}"]`)) {
        const l = document.createElement('link'); l.href=href; l.rel='stylesheet';
        document.head.appendChild(l);
      }
    });
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); if (progressRef.current) clearInterval(progressRef.current); };
  }, []);

  // ── Close dropdown on outside click ──────────────────────────────────────
  useEffect(() => {
    const h = (e: MouseEvent) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // ── Fetch user on mount ───────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    const expired = sessionStorage.getItem('session_expired');
    if (expired) {
      setToast({ text: TRANSLATIONS[lang]?.sessionExpired ?? 'Session expired.', type: 'info' });
      sessionStorage.removeItem('session_expired');
      setTimeout(() => setToast(null), 5000);
    }

    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/get_calculation_page`, {
          headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
        });
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem('session_id');
          sessionStorage.setItem('session_expired', '1');
          window.location.replace('/login');
          return;
        }
        if (!res.ok || !mounted) return;
        const data = await res.json();
        setUser(data.user);
        const langMap: Record<string, LangKey> = { en:'en', ru:'ru', uz_c:'uz_c', uz_l:'uz_l' };
        const mappedLang = langMap[data.user.language];
        if (mappedLang) setLang(mappedLang);
      } catch {
        if (localStorage.getItem('session_id')) {
          localStorage.removeItem('session_id');
          window.location.replace('/login');
        }
      }
    })();

    return () => { mounted = false; };
  }, []);

  // ── Periodic session check (every 60s) ───────────────────────────────────
  useEffect(() => {
    if (!user) return;
    let active = true;
    const interval = setInterval(async () => {
      if (!active) return;
      try {
        const res = await fetch(`${API_BASE_URL}/api/get_calculation_page`, {
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

  // ── Language change (with confirmation) ───────────────────────────────────
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

  // ── Toast helper ──────────────────────────────────────────────────────────
  const showToast = (text: string, type: 'success'|'error'|'info') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Progress bar ──────────────────────────────────────────────────────────
  const startProgress = () => {
    setProgress(0);
    progressRef.current = setInterval(() => setProgress(p => p >= 90 ? 90 : p + Math.random() * 4), 300);
  };
  const stopProgress = (ok: boolean) => {
    if (progressRef.current) clearInterval(progressRef.current);
    setProgress(ok ? 100 : 0);
    setTimeout(() => setProgress(0), 1200);
  };

  // ── File helpers ──────────────────────────────────────────────────────────
  const validateExcel = (file: File) => {
    const ok = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    if (!ok) showToast(t.onlyExcel, 'error');
    return ok;
  };
  const handleFileDrop = useCallback((e: React.DragEvent, slot: 'n'|'m'|'d') => {
    e.preventDefault(); setDragOver(null);
    const file = e.dataTransfer.files[0];
    if (!file || !validateExcel(file)) return;
    if (slot==='n') setRepoNFile(file); if (slot==='m') setRepoMFile(file); if (slot==='d') setDepositFile(file);
  }, [t]);
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>, slot: 'n'|'m'|'d') => {
    const file = e.target.files?.[0];
    if (!file || !validateExcel(file)) return;
    if (slot==='n') setRepoNFile(file); if (slot==='m') setRepoMFile(file); if (slot==='d') setDepositFile(file);
  };
  const numericKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const pass = ['Backspace','Delete','Tab','Escape','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'];
    if (!pass.includes(e.key) && !/[\d.]/.test(e.key)) e.preventDefault();
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!repoNFile||!repoMFile||!depositFile) { showToast(t.fillFiles,'error'); return; }
    if (!cbDate)                               { showToast(t.fillDate,'error');  return; }
    if (!cbRate||isNaN(parseFloat(cbRate)))   { showToast(t.fillRate,'error');  return; }
    if (!cbDeposit||isNaN(parseFloat(cbDeposit.replace(/\s/g,'')))) { showToast(t.fillDeposit,'error'); return; }

    setIsLoading(true); setError(null); setResult(null); startProgress();
    try {
      const fd = new FormData();
      fd.append('repo_n_file', repoNFile); fd.append('repo_m_file', repoMFile);
      fd.append('deposit_file', depositFile); fd.append('cb_date', cbDate);
      fd.append('cb_rate', cbRate); fd.append('cb_deposit', cbDeposit.replace(/\s/g,''));

      const res = await fetch(`${API_BASE_URL}/api/add_new_uzonia_calculation`, {
        method: 'POST', headers: { Authorization: authHeader() }, body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(err.detail || 'Calculation failed.');
      }
      if (res.status===401||res.status===403) {
        localStorage.removeItem('session_id'); sessionStorage.setItem('session_expired','1');
        window.location.replace('/login'); return;
      }

      const data: CalcResult = await res.json();
      stopProgress(true); setResult(data); showToast(t.success, 'success');
    } catch (err: any) {
      stopProgress(false); setError(err.message || 'An unexpected error occurred.');
      showToast(err.message || 'Calculation failed.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Reset ─────────────────────────────────────────────────────────────────
  const handleReset = () => {
    setRepoNFile(null); setRepoMFile(null); setDepositFile(null);
    setCbDate(todayIso()); setCbRate(''); setCbDeposit('');
    setResult(null); setError(null); setProgress(0);
    [repoNRef, repoMRef, depositRef].forEach(r => { if (r.current) r.current.value=''; });
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const allFiles  = repoNFile && repoMFile && depositFile;
  const formReady = allFiles && cbDate && cbRate && cbDeposit;

  const calcWayMeta = (way: number) => {
    if (way===1) return { label: t.way1, color:'#065f46', bg:'#d1fae5' };
    if (way===2) return { label: t.way2, color:'#1e40af', bg:'#dbeafe' };
    return           { label: t.way3, color:'#92400e', bg:'#fef3c7' };
  };

  const getInitials = (u: User|null) => {
    if (!u) return '?';
    return ((u.first_name?.[0]??'')+(u.last_name?.[0]??'')).toUpperCase() || u.username?.[0]?.toUpperCase() || '?';
  };

  // ── Nav button ────────────────────────────────────────────────────────────
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
        {label}
      </button>
    );
  };

  // ── Drop zone ─────────────────────────────────────────────────────────────
  const DropZone = ({ slot, file, label, description, icon }: {
    slot:'n'|'m'|'d'; file:File|null; label:string; description:string; icon:string;
  }) => {
    const ref    = slot==='n' ? repoNRef : slot==='m' ? repoMRef : depositRef;
    const isOver = dragOver === slot;
    return (
      <div
        onDragOver={e=>{ if(!isLoading){e.preventDefault(); setDragOver(slot); }}}
        onDragLeave={()=>setDragOver(null)}
        onDrop={e=>{ if(!isLoading) handleFileDrop(e, slot); }}
        onClick={()=>{ if(!isLoading) ref.current?.click(); }}
        style={{
          flex:'1 1 0', minWidth:'180px',
          border:`2px dashed ${file?'#10b981':isOver?'#0a3b5c':'#cbd5e1'}`,
          borderRadius:'14px',
          background: file?'#f0fdf4':isOver?'#eff6ff':'#f8fafc',
          padding:'20px 14px', display:'flex', flexDirection:'column', alignItems:'center', gap:'10px',
          cursor: isLoading?'not-allowed':'pointer', opacity: isLoading?0.6:1,
          transition:'all 0.2s', textAlign:'center',
          boxShadow: file?'0 2px 12px rgba(16,185,129,0.1)':isOver?'0 2px 12px rgba(10,59,92,0.1)':'none',
        }}
      >
        <div style={{ width:'42px', height:'42px', borderRadius:'12px', background: file?'#d1fae5':isOver?'#dbeafe':'#e2e8f0', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.2s' }}>
          <span className="material-symbols-outlined" style={{ fontSize:'20px', color: file?'#065f46':isOver?'#1e40af':'#64748b' }}>
            {file?'check_circle':icon}
          </span>
        </div>
        <div>
          <div style={{ fontWeight:'600', fontSize:'13px', color: file?'#065f46':'#1e3a52', marginBottom:'3px' }}>{label}</div>
          <div style={{ fontSize:'11px', color:'#64748b', lineHeight:1.4 }}>{description}</div>
        </div>
        {file ? (
          <div style={{ background:'#d1fae5', border:'1px solid #6ee7b7', borderRadius:'8px', padding:'5px 10px', display:'flex', alignItems:'center', gap:'5px', maxWidth:'100%' }}>
            <span className="material-symbols-outlined" style={{ fontSize:'13px', color:'#065f46', flexShrink:0 }}>description</span>
            <span style={{ fontSize:'11px', color:'#065f46', fontWeight:'600', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontFamily:'monospace' }}>{file.name}</span>
            <button onClick={e=>{ e.stopPropagation(); if(isLoading)return; if(slot==='n'){setRepoNFile(null);if(repoNRef.current)repoNRef.current.value='';} if(slot==='m'){setRepoMFile(null);if(repoMRef.current)repoMRef.current.value='';} if(slot==='d'){setDepositFile(null);if(depositRef.current)depositRef.current.value='';} }}
              style={{ background:'none', border:'none', cursor: isLoading?'not-allowed':'pointer', color:'#065f46', display:'flex', alignItems:'center', padding:'0 2px', marginLeft:'2px', flexShrink:0 }}>
              <span className="material-symbols-outlined" style={{ fontSize:'14px' }}>close</span>
            </button>
          </div>
        ) : (
          <span style={{ fontSize:'11px', color:'#94a3b8' }}>{isOver ? t.dropHere : t.clickOrDrop}</span>
        )}
        <input ref={ref} type="file" accept=".xlsx,.xls" style={{ display:'none' }} onChange={e=>handleFileInput(e,slot)} disabled={isLoading} />
      </div>
    );
  };

  // ── Result card ───────────────────────────────────────────────────────────
  const ResultCard = ({ label, value, icon, color, bg }: { label:string; value:string; icon:string; color:string; bg:string; }) => (
    <div style={{ background:'white', border:'1px solid #e2e8f0', borderRadius:'12px', padding:'14px 16px', display:'flex', alignItems:'center', gap:'12px', boxShadow:'0 2px 8px rgba(0,0,0,0.04)' }}>
      <div style={{ width:'38px', height:'38px', borderRadius:'10px', background:bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <span className="material-symbols-outlined" style={{ fontSize:'18px', color }}>{icon}</span>
      </div>
      <div style={{ minWidth:0 }}>
        <div style={{ fontSize:'10px', color:'#64748b', marginBottom:'2px', letterSpacing:'0.3px' }}>{label}</div>
        <div style={{ fontSize:'15px', fontWeight:'700', color, fontFamily:'monospace', whiteSpace:'nowrap' }}>{value}</div>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:'100vh', width:'100%', margin:0, padding:0, display:'flex', flexDirection:'column', backgroundColor:'#f8fafc', fontFamily:'"Inter","Segoe UI",system-ui,-apple-system,sans-serif' }}>

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position:'fixed', top:'24px', right:'24px', zIndex:2000,
          background: toast.type==='success'?'#065f46':toast.type==='error'?'#991b1b':'#1e40af',
          color:'white', padding:'13px 18px', borderRadius:'12px',
          display:'flex', alignItems:'center', gap:'10px',
          boxShadow:'0 8px 24px rgba(0,0,0,0.2)', fontSize:'14px', fontWeight:'500',
          animation:'slideIn 0.3s ease', maxWidth:'380px',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize:'19px', flexShrink:0 }}>
            {toast.type==='success'?'check_circle':toast.type==='info'?'info':'error'}
          </span>
          {toast.text}
        </div>
      )}

      {/* ── Language Confirmation Modal ── */}
      {pendingLang && (
        <div
          style={{
            position:'fixed', inset:0, background:'rgba(7,30,46,0.55)',
            display:'flex', alignItems:'center', justifyContent:'center',
            zIndex:500, backdropFilter:'blur(4px)',
          }}
          onClick={() => setPendingLang(null)}
        >
          <div
            style={{
              background:'white', borderRadius:'20px', padding:'32px 28px',
              maxWidth:'380px', width:'90%',
              boxShadow:'0 32px 64px rgba(0,0,0,0.25)',
              animation:'modalIn 0.2s ease',
            }}
            onClick={e => e.stopPropagation()}
          >
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
              <button
                onClick={() => setPendingLang(null)}
                style={{ flex:1, padding:'11px', background:'#f1f5f9', border:'none', borderRadius:'10px', fontSize:'14px', fontWeight:'600', color:'#64748b', cursor:'pointer', transition:'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background='#e2e8f0'}
                onMouseLeave={e => e.currentTarget.style.background='#f1f5f9'}
              >
                {t.cancel}
              </button>
              <button
                onClick={() => applyLanguageChange(pendingLang)}
                style={{ flex:1, padding:'11px', background:'linear-gradient(135deg,#0a3b5c,#1a5080)', border:'none', borderRadius:'10px', fontSize:'14px', fontWeight:'600', color:'white', cursor:'pointer', boxShadow:'0 4px 12px rgba(10,59,92,0.3)', transition:'all 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.transform='translateY(-1px)'}
                onMouseLeave={e => e.currentTarget.style.transform='translateY(0)'}
              >
                {t.confirm}
              </button>
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
        {/* ── Top row: logo + right controls ── */}
        <div style={{
          display:'flex', alignItems:'center', gap:'12px',
          padding: isMobile ? '0 12px' : '0 20px',
          height:'60px',
          minWidth:0,
        }}>
          {/* Logo + title */}
          <div
            onClick={()=>navigate('/')}
            style={{ display:'flex', alignItems:'center', gap:'10px', flexShrink:0, cursor:'pointer' }}
          >
            <div style={{ width:'44px', height:'44px', background:'white', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 12px rgba(0,0,0,0.12)', padding:'4px', flexShrink:0 }}>
              <img src={CbuLogo} alt="CBU Logo" style={{ width:'100%', height:'100%', objectFit:'contain' }} />
            </div>
            {!isMobile && (
              <div style={{ lineHeight:'1.4', border:'0 0 0 1px solid rgba(255,255,255,0.15)', }}>
                <div style={{ fontSize:'18px', fontWeight:'700', color:'white' }}>{t.bankName}</div>
                <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.6)' }}>{t.deptSubtitle}</div>
              </div>
            )}
          </div>


          {/* Divider between logo and nav */}
            {!isMobile && <div style={{ width:'1px', height:'28px', background:'rgba(255,255,255,0.15)', flexShrink:0 }} />}

            {/* Nav tabs */}
            <div style={{ padding: '0 10px', overflowX:'auto' }}>
              <nav style={{
                display:'flex', alignItems:'center', gap:'6px',
                height:'40px',
                minWidth:'max-content',
                flexWrap: 'nowrap',
              }}>
                {NAV_PAGES.map(p => <NavBtn key={p.path} page={p} />)}
              </nav>
            </div>

            {/* Spacer pushes right side controls to the right */}
            <div style={{ flex:1, minWidth:0 }} />

            {/* NO DIVIDER HERE ANYMORE - directly to language switcher */}

            {/* RIGHT SIDE: lang + avatar */}
            <div style={{ display:'flex', alignItems:'center', gap:'4px', flexShrink:0 }}>
              {/* Language switcher and avatar as above */}
            </div>

          {/* ── RIGHT SIDE: lang + avatar (admin buttons moved to dropdown) ── */}
            <div style={{ display:'flex', alignItems:'center', gap:'15px', flexShrink:0 }}>
              {/* Language switcher */}
              <div style={{ display:'flex', gap:'4px', background:'rgba(255,255,255,0.08)', borderRadius:'8px', padding:'4px', border:'1px solid rgba(255,255,255,0.12)', flexShrink:0 }}>
                {(Object.entries(LANG_LABELS) as [LangKey, string][]).map(([key, label]) => (
                  <button key={key}
                    onClick={() => key !== lang && setPendingLang(key)}
                    style={{
                      background: lang===key ? '#e9b741' : 'transparent',
                      color: lang===key ? '#0a2a40' : 'rgba(255,255,255,0.75)',
                      border:'none', borderRadius:'6px',
                      padding:'4px 8px',
                      fontSize:'11px', fontWeight:'600',
                      cursor: lang===key ? 'default' : 'pointer', transition:'all 0.18s',
                      minWidth:'26px',
                    }}
                    onMouseEnter={e=>{ if(lang!==key) e.currentTarget.style.background='rgba(255,255,255,0.15)'; }}
                    onMouseLeave={e=>{ if(lang!==key) e.currentTarget.style.background='transparent'; }}
                  >{label}</button>
                ))}
              </div>

              {/* User avatar + dropdown with admin buttons inside */}
              <div ref={dropdownRef} style={{ position:'relative', flexShrink:0 }}>
                <button onClick={()=>setDropdownOpen(o=>!o)} style={{
                  background:'rgba(255,255,255,0.1)', border:'2px solid rgba(233,183,65,0.5)',
                  borderRadius:'50%', width:'44px', height:'44px',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  cursor:'pointer', transition:'all 0.2s',
                  color:'white', fontSize:'18px', fontWeight:'700',
                }}
                onMouseEnter={e=>{ e.currentTarget.style.borderColor='#e9b741'; e.currentTarget.style.background='rgba(233,183,65,0.2)'; }}
                onMouseLeave={e=>{ e.currentTarget.style.borderColor='rgba(233,183,65,0.5)'; e.currentTarget.style.background='rgba(255,255,255,0.1)'; }}
                >
                  {getInitials(user)}
                </button>

                {/* Dropdown */}
                {dropdownOpen && (
                  <div style={{
                    position:'absolute', top:'calc(100% + 10px)', right:0,
                    background:'white', borderRadius:'16px', minWidth:'260px',
                    boxShadow:'0 20px 40px rgba(0,0,0,0.18)', overflow:'hidden',
                    border:'1px solid #e2e8f0', zIndex:200, animation:'dropIn 0.18s ease',
                  }}>
                    {/* User info */}
                    <div style={{ padding:'20px', borderBottom:'1px solid #f1f5f9', background:'linear-gradient(135deg,#f8fafc,#eef2f7)' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                        <div style={{ width:'48px', height:'48px', borderRadius:'50%', background:'linear-gradient(135deg,#0a3b5c,#1a5080)', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:'18px', fontWeight:'700', flexShrink:0, border:'3px solid #e9b741' }}>
                          {getInitials(user)}
                        </div>
                        <div style={{ minWidth:0 }}>
                          <div style={{ fontWeight:'700', color:'#0a3b5c', fontSize:'15px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {user ? `${user.first_name} ${user.last_name}` : '—'}
                          </div>
                          <div style={{ color:'#64748b', fontSize:'12px', marginTop:'2px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            @{user?.username ?? '—'}
                          </div>
                          <div style={{ display:'inline-flex', alignItems:'center', gap:'4px', marginTop:'6px', padding:'3px 10px', background:'#e8f0fe', borderRadius:'20px', fontSize:'11px', color:'#0a3b5c', fontWeight:'600' }}>
                            <span className="material-symbols-outlined" style={{ fontSize:'12px' }}>domain</span>
                            {user?.department ?? '—'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Admin Section - only visible for admin users */}
                    {user?.is_admin && (
                      <div style={{ padding:'8px 12px', borderBottom:'1px solid #f1f5f9' }}>
                        <div style={{ padding:'4px 8px', marginBottom:'4px', fontSize:'11px', fontWeight:'600', color:'#64748b', textTransform:'uppercase', letterSpacing:'0.5px' }}>
                          Administration
                        </div>
                        {[
                          { icon:'group', label: t.usersBtn, route:'/users_data', color:'#3b82f6', bg:'#eff6ff' },
                          { icon:'manage_history', label: t.sessionsBtn, route:'/user_sessions', color:'#8b5cf6', bg:'#f5f3ff' },
                          { icon:'timeline', label: t.actionsBtn, route:'/user_actions', color:'#f59e0b', bg:'#fffbeb' },
                        ].map(({ icon, label, route, color, bg }) => (
                          <button
                            key={route}
                            onClick={()=>{ navigate(route); setDropdownOpen(false); }}
                            style={{
                              width:'100%',
                              background:'none',
                              border:'none',
                              textAlign:'left',
                              padding:'10px 12px',
                              borderRadius:'10px',
                              cursor:'pointer',
                              display:'flex',
                              alignItems:'center',
                              gap:'12px',
                              color:'#1f2937',
                              fontSize:'13px',
                              fontWeight:'500',
                              transition:'all 0.2s',
                              marginBottom:'2px',
                            }}
                            onMouseEnter={e=>{
                              e.currentTarget.style.background=bg;
                              const iconSpan = e.currentTarget.querySelector('.admin-icon') as HTMLElement;
                              if(iconSpan) iconSpan.style.transform = 'scale(1.1)';
                            }}
                            onMouseLeave={e=>{
                              e.currentTarget.style.background='none';
                              const iconSpan = e.currentTarget.querySelector('.admin-icon') as HTMLElement;
                              if(iconSpan) iconSpan.style.transform = 'scale(1)';
                            }}
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
                      <button
                        onClick={()=>doLogout()}
                        style={{
                          width:'100%',
                          background:'none',
                          border:'none',
                          textAlign:'left',
                          padding:'10px 12px',
                          borderRadius:'10px',
                          cursor:'pointer',
                          display:'flex',
                          alignItems:'center',
                          gap:'12px',
                          color:'#dc2626',
                          fontSize:'13px',
                          fontWeight:'500',
                          transition:'all 0.2s'
                        }}
                        onMouseEnter={e=>{ e.currentTarget.style.background='#fef2f2'; }}
                        onMouseLeave={e=>{ e.currentTarget.style.background='none'; }}
                      >
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
      <main style={{ flex:1, width:'100%', display:'flex', flexDirection:'column', padding: isMobile?'20px 16px':'28px 24px', background:'#f8fafc', boxSizing:'border-box' }}>
        <div style={{ width:'100%', maxWidth:'1100px', margin:'0 auto' }}>

          {/* Page title row */}
          <div style={{ marginBottom:'24px', display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:'12px' }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'4px' }}>
                <div style={{ width:'38px', height:'38px', background:'linear-gradient(135deg,#0a3b5c,#1a6494)', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize:'20px', color:'white' }}>calculate</span>
                </div>
                <h1 style={{ margin:0, fontSize:'22px', fontWeight:'700', color:'#0a3b5c' }}>{t.pageTitle}</h1>
              </div>
              <p style={{ margin:0, fontSize:'13px', color:'#64748b', paddingLeft:'48px' }}>{t.pageDesc}</p>
            </div>
            {result && (
              <button onClick={handleReset} style={{ padding:'8px 16px', fontSize:'13px', fontWeight:'500', background:'#f1f5f9', color:'#475569', border:'1px solid #e2e8f0', borderRadius:'9px', cursor:'pointer', display:'flex', alignItems:'center', gap:'5px', flexShrink:0 }}>
                <span className="material-symbols-outlined" style={{ fontSize:'15px' }}>refresh</span>{t.newCalc}
              </button>
            )}
          </div>

          {/* Progress bar */}
          {isLoading && (
            <div style={{ marginBottom:'20px', background:'white', borderRadius:'12px', padding:'16px 20px', border:'1px solid #e2e8f0', boxShadow:'0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'10px' }}>
                <span className="material-symbols-outlined" style={{ fontSize:'18px', color:'#0a3b5c', animation:'spin 2s linear infinite' }}>autorenew</span>
                <span style={{ fontSize:'13px', fontWeight:'600', color:'#0a3b5c' }}>{t.progLabel}</span>
                <span style={{ marginLeft:'auto', fontSize:'12px', fontFamily:'monospace', color:'#64748b' }}>{Math.round(progress)}%</span>
              </div>
              <div style={{ height:'6px', background:'#e2e8f0', borderRadius:'99px', overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${progress}%`, background:'linear-gradient(90deg,#0a3b5c,#1a6494,#e9b741)', borderRadius:'99px', transition:'width 0.4s ease' }} />
              </div>
              <div style={{ marginTop:'8px', fontSize:'11px', color:'#94a3b8' }}>{t.progDetail}</div>
            </div>
          )}

          {/* Error banner */}
          {error && !isLoading && (
            <div style={{ marginBottom:'20px', background:'#fff5f5', border:'1px solid #fecaca', borderRadius:'12px', padding:'14px 18px', display:'flex', alignItems:'flex-start', gap:'10px' }}>
              <span className="material-symbols-outlined" style={{ fontSize:'20px', color:'#dc2626', flexShrink:0, marginTop:'1px' }}>error</span>
              <div>
                <div style={{ fontSize:'14px', fontWeight:'600', color:'#991b1b', marginBottom:'2px' }}>{t.calcFailed}</div>
                <div style={{ fontSize:'13px', color:'#7f1d1d' }}>{error}</div>
              </div>
              <button onClick={()=>setError(null)} style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', color:'#dc2626', padding:'2px', flexShrink:0 }}>
                <span className="material-symbols-outlined" style={{ fontSize:'18px' }}>close</span>
              </button>
            </div>
          )}

          <div style={{ display:'grid', gridTemplateColumns: result&&!isMobile ? '1fr 1fr' : '1fr', gap:'20px', alignItems:'start' }}>

            {/* ── LEFT: Form ── */}
            <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>

              {/* Source files card */}
              <div style={{ background:'white', borderRadius:'14px', padding:'22px', boxShadow:'0 2px 10px rgba(0,40,70,0.06)', border:'1px solid #e2e8f0' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'16px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize:'18px', color:'#0a3b5c' }}>upload_file</span>
                  <span style={{ fontSize:'15px', fontWeight:'600', color:'#0a3b5c' }}>{t.sourceFiles}</span>
                  <span style={{ marginLeft:'auto', fontSize:'11px', color:'#94a3b8', background:'#f1f5f9', padding:'2px 8px', borderRadius:'20px' }}>
                    {[repoNFile,repoMFile,depositFile].filter(Boolean).length} / 3 {t.uploaded}
                  </span>
                </div>
                <div style={{ display:'flex', gap:'12px', flexWrap:'wrap' }}>
                  <DropZone slot="n" file={repoNFile}   label={t.repoNLabel}   description={t.repoNDesc}   icon="table_chart" />
                  <DropZone slot="m" file={repoMFile}   label={t.repoMLabel}   description={t.repoMDesc}   icon="show_chart"  />
                  <DropZone slot="d" file={depositFile} label={t.depositLabel} description={t.depositDesc} icon="savings"     />
                </div>
                <div style={{ marginTop:'14px', display:'flex', gap:'8px', flexWrap:'wrap' }}>
                  {[{label:'Repo N',done:!!repoNFile},{label:'Repo M',done:!!repoMFile},{label:'Deposit',done:!!depositFile}].map(item=>(
                    <span key={item.label} style={{ display:'inline-flex', alignItems:'center', gap:'4px', padding:'3px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:'500', background:item.done?'#d1fae5':'#f1f5f9', color:item.done?'#065f46':'#94a3b8', border:`1px solid ${item.done?'#6ee7b7':'#e2e8f0'}` }}>
                      <span className="material-symbols-outlined" style={{ fontSize:'11px' }}>{item.done?'check_circle':'radio_button_unchecked'}</span>
                      {item.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* CB Parameters card */}
              <div style={{ background:'white', borderRadius:'14px', padding:'22px', boxShadow:'0 2px 10px rgba(0,40,70,0.06)', border:'1px solid #e2e8f0' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'18px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize:'18px', color:'#0a3b5c' }}>tune</span>
                  <span style={{ fontSize:'15px', fontWeight:'600', color:'#0a3b5c' }}>{t.cbParams}</span>
                </div>
                <div style={{ display:'grid', gridTemplateColumns: isMobile?'1fr':'1fr 1fr 1fr', gap:'14px' }}>
                  {/* Date */}
                  <div>
                    <label style={{ display:'block', marginBottom:'6px', fontWeight:'600', color:'#1e3a52', fontSize:'13px' }}>{t.cbDate} <span style={{ color:'#dc2626' }}>*</span></label>
                    <div style={{ position:'relative' }}>
                      <span className="material-symbols-outlined" style={{ position:'absolute', left:'10px', top:'50%', transform:'translateY(-50%)', color:'#94a3b8', fontSize:'16px', pointerEvents:'none', zIndex:2 }}>event</span>
                      <input type="date" value={cbDate} onChange={e=>setCbDate(e.target.value)} disabled={isLoading}
                        style={{ width:'100%', padding:'10px 13px 10px 34px', fontSize:'14px', background:'#f8fafc', color:'#0f172a', border:'1px solid #e2e8f0', borderRadius:'10px', outline:'none', boxSizing:'border-box', fontFamily:'monospace', colorScheme:'light', opacity:isLoading?0.6:1 }} />
                    </div>
                    <div style={{ marginTop:'4px', fontSize:'11px', color:'#94a3b8' }}>{t.cbDateHint}</div>
                  </div>
                  {/* Rate */}
                  <div>
                    <label style={{ display:'block', marginBottom:'6px', fontWeight:'600', color:'#1e3a52', fontSize:'13px' }}>{t.cbRate} <span style={{ color:'#dc2626' }}>*</span></label>
                    <div style={{ position:'relative' }}>
                      <span className="material-symbols-outlined" style={{ position:'absolute', left:'10px', top:'50%', transform:'translateY(-50%)', color:'#94a3b8', fontSize:'16px', pointerEvents:'none', zIndex:2 }}>percent</span>
                      <input type="text" inputMode="decimal" value={cbRate} onChange={e=>setCbRate(e.target.value)} onKeyDown={numericKeyDown} placeholder="e.g. 14.00" disabled={isLoading}
                        style={{ width:'100%', padding:'10px 32px 10px 34px', fontSize:'14px', background:'#f8fafc', color:'#0f172a', border:'1px solid #e2e8f0', borderRadius:'10px', outline:'none', boxSizing:'border-box', fontFamily:'monospace', opacity:isLoading?0.6:1 }} />
                      <span style={{ position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)', fontSize:'12px', color:'#94a3b8', pointerEvents:'none' }}>%</span>
                    </div>
                    <div style={{ marginTop:'4px', fontSize:'11px', color:'#94a3b8' }}>{t.cbRateHint}</div>
                  </div>
                  {/* Deposit */}
                  <div>
                    <label style={{ display:'block', marginBottom:'6px', fontWeight:'600', color:'#1e3a52', fontSize:'13px' }}>{t.cbDeposit} <span style={{ color:'#dc2626' }}>*</span></label>
                    <div style={{ position:'relative' }}>
                      <span className="material-symbols-outlined" style={{ position:'absolute', left:'10px', top:'50%', transform:'translateY(-50%)', color:'#94a3b8', fontSize:'16px', pointerEvents:'none', zIndex:2 }}>account_balance</span>
                      <input type="text" inputMode="decimal" value={cbDeposit}
                        onChange={e=>{ const n=e.target.value.replace(/\D/g,''); setCbDeposit(n.replace(/\B(?=(\d{3})+(?!\d))/g,' ')); }}
                        onKeyDown={numericKeyDown} placeholder={t.cbDepositPh} disabled={isLoading}
                        style={{ width:'100%', padding:'10px 13px 10px 34px', fontSize:'14px', background:'#f8fafc', color:'#0f172a', border:'1px solid #e2e8f0', borderRadius:'10px', outline:'none', boxSizing:'border-box', fontFamily:'monospace', opacity:isLoading?0.6:1 }} />
                    </div>
                    <div style={{ marginTop:'4px', fontSize:'11px', color:'#94a3b8' }}>{t.cbDepositHint}</div>
                  </div>
                </div>
              </div>

              {/* Submit */}
              <button onClick={handleSubmit} disabled={isLoading||!formReady} style={{
                width:'100%', padding:'14px 20px', fontSize:'15px', fontWeight:'700',
                background: isLoading?'#94a3b8':!formReady?'#cbd5e1':'linear-gradient(135deg,#0a3b5c 0%,#1a6494 100%)',
                color:'white', border:'none', borderRadius:'12px',
                cursor: isLoading||!formReady?'not-allowed':'pointer',
                display:'flex', alignItems:'center', justifyContent:'center', gap:'8px',
                boxShadow: formReady&&!isLoading?'0 4px 16px rgba(10,59,92,0.35)':'none', transition:'all 0.2s',
              }}
              onMouseEnter={e=>{ if(formReady&&!isLoading) e.currentTarget.style.transform='translateY(-1px)'; }}
              onMouseLeave={e=>{ e.currentTarget.style.transform='translateY(0)'; }}
              >
                <span className="material-symbols-outlined" style={{ fontSize:'18px', animation:isLoading?'spin 1.5s linear infinite':'none' }}>
                  {isLoading?'autorenew':'calculate'}
                </span>
                {isLoading ? t.calculating : t.runCalc}
              </button>

              {!formReady && !isLoading && (
                <div style={{ textAlign:'center', fontSize:'12px', color:'#94a3b8', marginTop:'-8px' }}>
                  {!allFiles
                    ? t.missingFiles([!repoNFile&&'Repo N',!repoMFile&&'Repo M',!depositFile&&'Deposit'].filter(Boolean).join(', '))
                    : t.fillParams
                  }
                </div>
              )}
            </div>

            {/* ── RIGHT: Results ── */}
            {result && (
              <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
                {/* Header card */}
                <div style={{ background:'linear-gradient(135deg,#0a3b5c 0%,#1a6494 100%)', borderRadius:'14px', padding:'20px 22px', color:'white', boxShadow:'0 4px 20px rgba(10,59,92,0.3)' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'12px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize:'22px', color:'#e9b741' }}>check_circle</span>
                    <span style={{ fontSize:'16px', fontWeight:'700' }}>{t.calcComplete}</span>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', fontSize:'13px' }}>
                    <div>
                      <div style={{ color:'rgba(255,255,255,0.55)', fontSize:'11px', marginBottom:'2px' }}>{t.fileId}</div>
                      <div style={{ fontFamily:'monospace', fontWeight:'600', fontSize:'12px', color:'#e9b741' }}>{result.file_id}</div>
                    </div>
                    <div>
                      <div style={{ color:'rgba(255,255,255,0.55)', fontSize:'11px', marginBottom:'2px' }}>{t.date}</div>
                      <div style={{ fontFamily:'monospace', fontWeight:'600' }}>{fmtDate(result.uzonia_date)}</div>
                    </div>
                  </div>
                  {(() => { const m=calcWayMeta(result.calculation_way); return (
                    <div style={{ marginTop:'12px', display:'inline-flex', alignItems:'center', gap:'6px', background:m.bg, padding:'5px 12px', borderRadius:'20px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize:'13px', color:m.color }}>info</span>
                      <span style={{ fontSize:'11px', fontWeight:'600', color:m.color }}>{m.label}</span>
                    </div>
                  );})()}
                </div>

                {/* Rate cards */}
                <div style={{ background:'white', borderRadius:'14px', padding:'18px', boxShadow:'0 2px 10px rgba(0,40,70,0.06)', border:'1px solid #e2e8f0' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'14px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize:'17px', color:'#0a3b5c' }}>show_chart</span>
                    <span style={{ fontSize:'14px', fontWeight:'600', color:'#0a3b5c' }}>{t.calcRates}</span>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                    <ResultCard label={t.uzonia}      value={fmtRate(result.uzonia)}         icon="bolt"           color="#1d4ed8" bg="#dbeafe" />
                    <ResultCard label={t.day7}        value={fmtRate(result.day_7_uzonia)}   icon="date_range"     color="#15803d" bg="#d1fae5" />
                    <ResultCard label={t.day30}       value={fmtRate(result.day_30_uzonia)}  icon="calendar_month" color="#a16207" bg="#fef3c7" />
                    <ResultCard label={t.day90}       value={fmtRate(result.day_90_uzonia)}  icon="event_note"     color="#7e22ce" bg="#f3e8ff" />
                    <ResultCard label={t.day180}      value={fmtRate(result.day_180_uzonia)} icon="event"          color="#c2410c" bg="#ffedd5" />
                    <ResultCard label={t.uzoniaIndex} value={fmtIndex(result.index)}         icon="functions"      color="#0a3b5c" bg="#e0f2fe" />
                  </div>
                </div>

                {/* Saved confirmation */}
                <div style={{ background:'#f0fdf4', border:'1px solid #6ee7b7', borderRadius:'12px', padding:'14px 16px', display:'flex', alignItems:'center', gap:'10px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize:'18px', color:'#065f46', flexShrink:0 }}>storage</span>
                  <div>
                    <div style={{ fontSize:'13px', fontWeight:'600', color:'#065f46' }}>{t.savedToDb}</div>
                    <div style={{ fontSize:'11px', color:'#047857', marginTop:'2px' }}>{t.savedDesc}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* How it works */}
          {!result && !isLoading && (
            <div style={{ marginTop:'24px', background:'white', borderRadius:'14px', padding:'20px 22px', boxShadow:'0 2px 10px rgba(0,40,70,0.06)', border:'1px solid #e2e8f0' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'16px' }}>
                <span className="material-symbols-outlined" style={{ fontSize:'17px', color:'#0a3b5c' }}>help_outline</span>
                <span style={{ fontSize:'14px', fontWeight:'600', color:'#0a3b5c' }}>{t.howTitle}</span>
              </div>
              <div style={{ display:'grid', gridTemplateColumns: isMobile?'1fr':'repeat(3,1fr)', gap:'14px' }}>
                {[
                  { label:t.w1label, cond:t.w1cond, desc:t.w1desc, color:'#065f46', bg:'#d1fae5', icon:'looks_one'  },
                  { label:t.w2label, cond:t.w2cond, desc:t.w2desc, color:'#1e40af', bg:'#dbeafe', icon:'looks_two'  },
                  { label:t.w3label, cond:t.w3cond, desc:t.w3desc, color:'#92400e', bg:'#fef3c7', icon:'looks_3'    },
                ].map(item=>(
                  <div key={item.label} style={{ background:item.bg, border:`1px solid ${item.color}22`, borderRadius:'10px', padding:'14px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'7px', marginBottom:'8px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize:'18px', color:item.color }}>{item.icon}</span>
                      <span style={{ fontSize:'13px', fontWeight:'700', color:item.color }}>{item.label}</span>
                    </div>
                    <div style={{ fontSize:'11px', fontWeight:'600', color:item.color, marginBottom:'5px', lineHeight:1.4 }}>{item.cond}</div>
                    <div style={{ fontSize:'11px', color:'#374151', lineHeight:1.5 }}>{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ════════════════════════════ FOOTER ════════════════════════════ */}
      <footer style={{ width:'100%', background:'#0a2a40', borderTop:'3px solid #e9b741', boxSizing:'border-box' }}>
        <div style={{ width:'100%', maxWidth:'1600px', margin:'0 auto', padding:'40px 32px 28px', display:'grid', gridTemplateColumns: isMobile?'1fr':'280px repeat(4,1fr)', gap:'40px', alignItems:'start' }}>

          {/* Brand */}
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'14px' }}>
              <img src={CbuLogo} alt="CBU" style={{ width:'40px', height:'40px', objectFit:'contain', background:'white', borderRadius:'8px', padding:'4px', flexShrink:0 }} />
              <div style={{ color:'white', fontSize:'17px', fontWeight:'600', lineHeight:'1.4' }}>{t.bankName}</div>
            </div>
            <p style={{ fontSize:'13px', lineHeight:'1.6', color:'#6b8499', marginBottom:'18px' }}>
              {t.officialDesc}
            </p>
            <div style={{ display:'flex', gap:'12px', flexWrap:'wrap' }}>
              {[
                { src:facebook,  alt:'Facebook',  href:'https://www.facebook.com/centralbankuzbekistan/', w:32 },
                { src:telegram,  alt:'Telegram',  href:'https://t.me/centralbankuzbekistan',              w:34 },
                { src:linkedin,  alt:'LinkedIn',  href:'https://www.linkedin.com/company/centralbankuzbekistan/', w:36 },
                { src:twitter,   alt:'Twitter',   href:'https://x.com/cbuzbekistan',                      w:44 },
                { src:instagram, alt:'Instagram', href:'https://www.instagram.com/centralbankuzbekistan', w:30 },
                { src:youtube,   alt:'YouTube',   href:'https://www.youtube.com/centralbankofuzbekistan', w:34 },
              ].map(s=>(
                <a key={s.alt} href={s.href} target="_blank" rel="noopener noreferrer"
                  style={{ width:'32px', height:'32px', borderRadius:'7px', display:'flex', alignItems:'center', justifyContent:'center', transition:'background 0.2s' }}
                  onMouseEnter={e=>{ (e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.16)'; }}
                  onMouseLeave={e=>{ (e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.07)'; }}
                >
                  <img src={s.src} alt={s.alt} style={{ width:`${s.w}px`, height:`${s.w}px`, objectFit:'contain' }} />
                </a>
              ))}
            </div>
          </div>

          {/* Nav modules */}
          <div>
            <div style={{ color:'white', fontSize:'16px', fontWeight:'600', marginBottom:'16px', paddingBottom:'10px', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>{t.modules}</div>            <ul style={{ listStyle:'none', padding:0, margin:0 }}>
              {NAV_PAGES.map(p=>(
                <li key={p.path} style={{ marginBottom:'14px' }}>
                  <button
                    onClick={() => navigate(p.path)}
                    style={{
                      background:'none',
                      border:'none',
                      padding:'0',
                      display:'flex',
                      alignItems:'center',
                      gap:'5px',
                      fontSize:'14px',
                      color: p.path===currentPath ? '#e9b741' : '#8097a8',
                      fontWeight: p.path===currentPath ? '600' : '400',
                      cursor:'pointer',
                      transition:'color 0.15s',
                      width:'100%',
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize:'15px' }}
                    >
                      {p.icon}
                    </span>
                    {t[p.key as keyof typeof t] as string || p.key}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* About CBU */}
          <div>
            <div style={{ color:'white', fontSize:'16px', fontWeight:'600', marginBottom:'16px', paddingBottom:'10px', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>{t.aboutCbu}</div>            <ul style={{ listStyle:'none', padding:0, margin:0 }}>
              {[
                { label: t.aboutCbu,           href:'https://cbu.uz/en/about/',                   icon:'info'        },
                { label: t.executiveB,         href:'https://cbu.uz/en/about/management/',        icon:'groups'      },
                { label: t.legislation,        href:'https://cbu.uz/en/documents/',               icon:'gavel'       },
                { label: t.publications,       href:'https://cbu.uz/en/statistics/publications/', icon:'description' },
                { label: t.dataStats,          href:'https://cbu.uz/en/statistics/',              icon:'bar_chart'   },
              ].map(item=>(
                <li key={item.href} style={{ marginBottom:'9px' }}>
                  <a href={item.href} target="_blank" rel="noopener noreferrer"
                    style={{ display:'flex', alignItems:'center', gap:'7px', fontSize:'14px', color:'#8097a8', textDecoration:'none', transition:'color 0.15s' }}
                    onMouseEnter={e=>{ (e.currentTarget as HTMLElement).style.color='white'; }}
                    onMouseLeave={e=>{ (e.currentTarget as HTMLElement).style.color='#8097a8'; }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize:'15px' }}>{item.icon}</span>
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <div style={{ color:'white', fontSize:'16px', fontWeight:'600', marginBottom:'16px', paddingBottom:'10px', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>{t.services}</div>            <ul style={{ listStyle:'none', padding:0, margin:0 }}>
              {[
                { label: t.exchangeR,       href:'https://cbu.uz/en/arkhiv-kursov-valyut/',              icon:'currency_exchange' },
                { label: t.policyR,         href:'https://cbu.uz/en/monetary-policy/refinancing-rate/',  icon:'percent'           },
                { label: t.paymentS,        href:'https://cbu.uz/en/payment-systems/',                   icon:'payments'          },
                { label: t.licensing,       href:'https://cbu.uz/en/credit-organizations/licensing/',    icon:'verified'          },
                { label: t.pressCenter,     href:'https://cbu.uz/en/press_center/',                      icon:'newspaper'         },
              ].map(item=>(
                <li key={item.href} style={{ marginBottom:'9px' }}>
                  <a href={item.href} target="_blank" rel="noopener noreferrer"
                    style={{ display:'flex', alignItems:'center', gap:'7px', fontSize:'14px', color:'#8097a8', textDecoration:'none', transition:'color 0.15s' }}
                    onMouseEnter={e=>{ (e.currentTarget as HTMLElement).style.color='white'; }}
                    onMouseLeave={e=>{ (e.currentTarget as HTMLElement).style.color='#8097a8'; }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize:'15px' }}>{item.icon}</span>
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <div style={{ color:'white', fontSize:'16px', fontWeight:'700', marginBottom:'16px', paddingBottom:'10px', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>{t.contact}</div>            <ul style={{ listStyle:'none', padding:0, margin:0 }}>
              {[
                { label: '+998 71 212-62-05',    href:'tel:+998712126205',                           icon:'call'        },
                { label: '+998 71 200-00-44',    href:'tel:+998712000044',                           icon:'call'        },
                { label: '+998 71 233-35-09',    href:'fax:+998712333509',                           icon:'fax'         },
                { label: 'info@cbu.uz',          href:'mailto:info@cbu.uz',                          icon:'mail'        },
                { label: t.addressS,             href:'https://maps.app.goo.gl/4qDXnjgQoTwfWCg28',   icon:'location_on' },
              ].map(item=>(
                <li key={item.href} style={{ marginBottom:'9px' }}>
                  <a href={item.href} style={{ display:'flex', alignItems:'center', gap:'7px', fontSize:'14px', color:'#8097a8', textDecoration:'none', transition:'color 0.15s' }}
                    onMouseEnter={e=>{ (e.currentTarget as HTMLElement).style.color='white'; }}
                    onMouseLeave={e=>{ (e.currentTarget as HTMLElement).style.color='#8097a8'; }}
                  >
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
                { label:t.privacyPolicy, href:'https://cbu.uz/en/mobile-privacy/' },
                { label:t.termsOfUse,    href:'https://cbu.uz/en/services/request-information/' },
              ].map(l=>(
                <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer"
                  style={{ color:'#4a5c6a', textDecoration:'none', transition:'color 0.15s' }}
                  onMouseEnter={e=>{ (e.currentTarget as HTMLElement).style.color='white'; }}
                  onMouseLeave={e=>{ (e.currentTarget as HTMLElement).style.color='#4a5c6a'; }}
                >{l.label}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>

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
        input:focus{border-color:#0a3b5c!important;box-shadow:0 0 0 3px rgba(10,59,92,0.1);}
        input[type="date"]::-webkit-calendar-picker-indicator{cursor:pointer;opacity:0.7;filter:invert(28%) sepia(49%) saturate(700%) hue-rotate(180deg);}
        nav::-webkit-scrollbar{height:0;}
        /* Responsive admin button labels */
        @media (max-width: 1200px) {
          .admin-btn-label { display: none; }
        }
        @media (max-width: 1100px) {
          .back-label { display: none; }
        }
      `}</style>
    </div>
  );
};

export default CalculationsPage;