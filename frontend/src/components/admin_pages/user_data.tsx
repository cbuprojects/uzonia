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
// Nav pages (must match CalculationsPage)
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
    back: 'Back',
    // page
    pageTitle: 'User Management',
    pageDesc:  'Manage all system users — add, edit, change passwords, and remove accounts',
    // stats
    totalUsers: 'Total Users', activeUsers: 'Active Users',
    adminUsers: 'Admins',     inactiveUsers: 'Inactive',
    // table
    colUsername: 'USERNAME', colName: 'FULL NAME', colDepartment: 'DEPARTMENT',
    colLanguage: 'LANGUAGE', colStatus: 'STATUS',  colRole: 'ROLE',
    colCreatedAt: 'CREATED AT', colActions: 'ACTIONS',
    // filters
    filterLabel: 'Filters:', phUsername: 'Username…', phFirstName: 'First name…',
    phLastName: 'Last name…', phDepartment: 'Department…',
    clearAll: 'Clear all', addNewUser: '+ Add New User',
    allLanguages: 'All Languages', allStatuses: 'All Statuses', allRoles: 'All Roles',
    active: 'Active', inactive: 'Inactive', admin: 'Admin', user: 'User',
    results: (n: number) => `${n} result${n !== 1 ? 's' : ''}`,
    loading: 'Loading users…', failedLoad: 'Failed to load users.',
    noMatch: 'No users match your filters.', noData: 'No users found.',
    clearFiltersBtn: 'Clear filters',
    showing: (from: number, to: number, total: number) => `Showing ${from} to ${to} of ${total} entries`,
    previous: 'Previous', next: 'Next',
    // modals
    editUserTitle: 'Edit User', addUserTitle: 'Add New User',
    deleteUserTitle: 'Delete User',
    deleteConfirm: 'Are you sure you want to delete this user?',
    deleteWarning: '⚠️ This action cannot be undone.',
    changePasswordTitle: 'Change Password',
    passwordLabel: 'New Password', confirmPasswordLabel: 'Confirm Password',
    passwordRequirements: 'Password must be at least 8 characters, include uppercase, lowercase, number, and special character.',
    passwordMismatch: 'Passwords do not match.', passwordWeak: 'Password does not meet requirements.',
    firstNameLabel: 'First Name', lastNameLabel: 'Last Name',
    usernameLabel: 'Username', departmentLabel: 'Department',
    languageLabel: 'Language', isActiveLabel: 'Active', isAdminLabel: 'Admin',
    cancel: 'Cancel', save: 'Save Changes', saving: 'Saving…',
    addUser: 'Add User', adding: 'Adding…',
    delete: 'Delete', deleting: 'Deleting…',
    changePassword: 'Change Password', changing: 'Changing…',
    savedSuccess: 'User updated successfully!', addedSuccess: 'User added successfully!',
    deletedSuccess: 'User deleted successfully!', passwordChangedSuccess: 'Password changed successfully!',
    saveFailed: 'Failed to save changes.', addFailed: 'Failed to add user.',
    deleteFailed: 'Failed to delete user.', passwordChangeFailed: 'Failed to change password.',
    noChanges: 'No changes detected.',
    passwordPlaceholder: 'Enter new password…', confirmPasswordPlaceholder: 'Confirm new password…',
    passwordStrengthWeak: 'Weak', passwordStrengthFair: 'Fair',
    passwordStrengthGood: 'Good', passwordStrengthStrong: 'Strong',
    // user dropdown
    usersBtn: 'Users', sessionsBtn: 'Sessions', actionsBtn: 'Actions',
    signOut: 'Sign Out', department: 'Department',
    // language modal
    langConfirmTitle: 'Change Language',
    langConfirmMsg: (lang: string) => `Are you sure you want to switch the interface language to ${lang}?`,
    confirm: 'Yes, change', langCancel: 'Cancel',
    // footer
    officialDesc: 'UZONIA - Interbank Operations, Calculations, and Data Processing Platform',
    aboutCbu: 'About CBU', executiveB: 'The Executive Board',
    legislation: 'Legislation', publications: 'Publications', dataStats: 'Data & Stats',
    services: 'Services', exchangeR: 'Exchange Rates', policyR: 'Policy Rate',
    paymentS: 'Payment Systems', licensing: 'Licensing', pressCenter: 'Press Centre',
    contact: 'Contact', addressS: 'Islam Karimov St. 6', modules: 'Modules',
    copyright: '© 2026 Central Bank of the Republic of Uzbekistan. All rights reserved.',
    privacyPolicy: 'Privacy Policy', termsOfUse: 'Terms of Use',
    sessionExpired: 'Session expired. Please log in again.',
  },
  ru: {
    bankName:     'Центральный Банк Узбекистана',
    deptSubtitle: 'Департамент Монетарных Операций',
    calculations: 'Расчёты', uploads: 'Загрузки', repo: 'Репо',
    depo: 'Депо', data: 'Данные', holidays: 'Праздники',
    back: 'Назад',
    pageTitle: 'Управление пользователями',
    pageDesc:  'Управление всеми пользователями системы — добавление, редактирование, смена пароля и удаление',
    totalUsers: 'Всего', activeUsers: 'Активных',
    adminUsers: 'Администраторов', inactiveUsers: 'Неактивных',
    colUsername: 'ЛОГИН', colName: 'ФИО', colDepartment: 'ОТДЕЛ',
    colLanguage: 'ЯЗЫК', colStatus: 'СТАТУС', colRole: 'РОЛЬ',
    colCreatedAt: 'СОЗДАН', colActions: 'ДЕЙСТВИЯ',
    filterLabel: 'Фильтры:', phUsername: 'Логин…', phFirstName: 'Имя…',
    phLastName: 'Фамилия…', phDepartment: 'Отдел…',
    clearAll: 'Очистить всё', addNewUser: '+ Добавить пользователя',
    allLanguages: 'Все языки', allStatuses: 'Все статусы', allRoles: 'Все роли',
    active: 'Активен', inactive: 'Неактивен', admin: 'Администратор', user: 'Пользователь',
    results: (n: number) => `${n} запис${n === 1 ? 'ь' : n < 5 ? 'и' : 'ей'}`,
    loading: 'Загрузка пользователей…', failedLoad: 'Ошибка загрузки.',
    noMatch: 'Пользователи не найдены.', noData: 'Нет пользователей.',
    clearFiltersBtn: 'Сбросить фильтры',
    showing: (from: number, to: number, total: number) => `Показано ${from}–${to} из ${total}`,
    previous: 'Назад', next: 'Вперёд',
    editUserTitle: 'Редактировать пользователя', addUserTitle: 'Добавить пользователя',
    deleteUserTitle: 'Удалить пользователя',
    deleteConfirm: 'Вы уверены, что хотите удалить этого пользователя?',
    deleteWarning: '⚠️ Это действие нельзя отменить.',
    changePasswordTitle: 'Изменить пароль',
    passwordLabel: 'Новый пароль', confirmPasswordLabel: 'Подтверждение пароля',
    passwordRequirements: 'Пароль: не менее 8 символов, заглавные, строчные, цифра и спецсимвол.',
    passwordMismatch: 'Пароли не совпадают.', passwordWeak: 'Пароль не соответствует требованиям.',
    firstNameLabel: 'Имя', lastNameLabel: 'Фамилия',
    usernameLabel: 'Логин', departmentLabel: 'Отдел',
    languageLabel: 'Язык', isActiveLabel: 'Активен', isAdminLabel: 'Администратор',
    cancel: 'Отмена', save: 'Сохранить', saving: 'Сохранение…',
    addUser: 'Добавить', adding: 'Добавление…',
    delete: 'Удалить', deleting: 'Удаление…',
    changePassword: 'Изменить пароль', changing: 'Изменение…',
    savedSuccess: 'Пользователь обновлён!', addedSuccess: 'Пользователь добавлен!',
    deletedSuccess: 'Пользователь удалён!', passwordChangedSuccess: 'Пароль изменён!',
    saveFailed: 'Ошибка сохранения.', addFailed: 'Ошибка добавления.',
    deleteFailed: 'Ошибка удаления.', passwordChangeFailed: 'Ошибка смены пароля.',
    noChanges: 'Изменений нет.',
    passwordPlaceholder: 'Введите новый пароль…', confirmPasswordPlaceholder: 'Подтвердите пароль…',
    passwordStrengthWeak: 'Слабый', passwordStrengthFair: 'Средний',
    passwordStrengthGood: 'Хороший', passwordStrengthStrong: 'Сильный',
    usersBtn: 'Пользователи', sessionsBtn: 'Сессии', actionsBtn: 'Действия',
    signOut: 'Выйти', department: 'Отдел',
    langConfirmTitle: 'Изменить язык',
    langConfirmMsg: (lang: string) => `Вы уверены, что хотите изменить язык интерфейса на ${lang}?`,
    confirm: 'Да, изменить', langCancel: 'Отмена',
    officialDesc: 'UZONIA – Платформа межбанковских операций, расчётов и обработки данных',
    aboutCbu: 'О ЦБУ', executiveB: 'Правление',
    legislation: 'Законодательство', publications: 'Публикации', dataStats: 'Данные & Статистика',
    services: 'Услуги', exchangeR: 'Курсы валют', policyR: 'Ключевая ставка',
    paymentS: 'Платёжные системы', licensing: 'Лицензирование', pressCenter: 'Пресс-центр',
    contact: 'Контакты', addressS: 'Улица Ислама Каримова, 6', modules: 'Модули',
    copyright: '© 2026 Центральный Банк Республики Узбекистан. Все права защищены.',
    privacyPolicy: 'Политика конфиденциальности', termsOfUse: 'Условия использования',
    sessionExpired: 'Сессия истекла. Пожалуйста, войдите снова.',
  },
  uz_c: {
    bankName:     'Ўзбекистон Марказий Банки',
    deptSubtitle: 'Монетар Операциялар Департаменти',
    calculations: 'Ҳисоб-китоб', uploads: 'Юклашлар', repo: 'Репо',
    depo: 'Депо', data: 'Маълумотлар', holidays: 'Байрамлар',
    back: 'Орқага',
    pageTitle: 'Фойдаланувчиларни бошқариш',
    pageDesc:  'Тизим фойдаланувчиларини бошқариш — қўшиш, таҳрирлаш, пароль алмаштириш ва ўчириш',
    totalUsers: 'Жами', activeUsers: 'Фаоллар',
    adminUsers: 'Администраторлар', inactiveUsers: 'Нофаоллар',
    colUsername: 'ЛОГИН', colName: 'ФИО', colDepartment: 'БЎЛИМ',
    colLanguage: 'ТИЛ', colStatus: 'ҲОЛАТ', colRole: 'РОЛ',
    colCreatedAt: 'ЯРАТИЛГАН', colActions: 'АМАЛЛАР',
    filterLabel: 'Фильтрлар:', phUsername: 'Логин…', phFirstName: 'Исм…',
    phLastName: 'Фамилия…', phDepartment: 'Бўлим…',
    clearAll: 'Барчасини тозалаш', addNewUser: '+ Фойдаланувчи қўшиш',
    allLanguages: 'Барча тиллар', allStatuses: 'Барча ҳолатлар', allRoles: 'Барча роллар',
    active: 'Фаол', inactive: 'Нофаол', admin: 'Администратор', user: 'Фойдаланувчи',
    results: (n: number) => `${n} та натижа`,
    loading: 'Фойдаланувчилар юкланмоқда…', failedLoad: 'Юклашда хато.',
    noMatch: 'Топилмади.', noData: 'Фойдаланувчилар йўқ.',
    clearFiltersBtn: 'Фильтрларни тозалаш',
    showing: (from: number, to: number, total: number) => `${total} тадан ${from}–${to} кўрсатилмоқда`,
    previous: 'Олдинги', next: 'Кейинги',
    editUserTitle: 'Фойдаланувчини таҳрирлаш', addUserTitle: 'Фойдаланувчи қўшиш',
    deleteUserTitle: 'Фойдаланувчини ўчириш',
    deleteConfirm: 'Ушбу фойдаланувчини ўчиришга ишончингиз комилми?',
    deleteWarning: '⚠️ Бу амални қайтариб бўлмайди.',
    changePasswordTitle: 'Паролни алмаштириш',
    passwordLabel: 'Янги парол', confirmPasswordLabel: 'Паролни тасдиқлаш',
    passwordRequirements: 'Парол камида 8 та белги, катта, кичик ҳарф, рақам ва махсус белги бўлиши керак.',
    passwordMismatch: 'Паролlar мос эмас.', passwordWeak: 'Парол талабларга жавоб бермайди.',
    firstNameLabel: 'Исм', lastNameLabel: 'Фамилия',
    usernameLabel: 'Логин', departmentLabel: 'Бўлим',
    languageLabel: 'Тил', isActiveLabel: 'Фаол', isAdminLabel: 'Администратор',
    cancel: 'Бекор қилиш', save: 'Сақлаш', saving: 'Сақланмоқда…',
    addUser: 'Қўшиш', adding: 'Қўшилмоқда…',
    delete: 'Ўчириш', deleting: 'Ўчирилмоқда…',
    changePassword: 'Паролни алмаштириш', changing: 'Алмаштирилмоқда…',
    savedSuccess: 'Фойдаланувчи янгиланди!', addedSuccess: 'Фойдаланувчи қўшилди!',
    deletedSuccess: 'Фойдаланувчи ўчирилди!', passwordChangedSuccess: 'Парол алмаштирилди!',
    saveFailed: 'Сақлашда хато.', addFailed: 'Қўшишда хато.',
    deleteFailed: 'Ўчиришда хато.', passwordChangeFailed: 'Парол алмаштиришда хато.',
    noChanges: 'Ўзгаришлар йўқ.',
    passwordPlaceholder: 'Янги паролни киритинг…', confirmPasswordPlaceholder: 'Паролни тасдиқланг…',
    passwordStrengthWeak: 'Заиф', passwordStrengthFair: 'Ўртача',
    passwordStrengthGood: 'Яхши', passwordStrengthStrong: 'Кучли',
    usersBtn: 'Фойдаланувчилар', sessionsBtn: 'Сессиялар', actionsBtn: 'Ҳаракатлар',
    signOut: 'Чиқиш', department: 'Бўлим',
    langConfirmTitle: 'Тилни ўзгартириш',
    langConfirmMsg: (lang: string) => `Интерфейс тилини ${lang} тилига ўзгартиришга ишончингиз комилми?`,
    confirm: 'Ҳа, ўзгартириш', langCancel: 'Бекор қилиш',
    officialDesc: 'UZONIA – Банклараро операциялар, ҳисоб-китоблар ва маълумотларни қайта ишлаш платформаси',
    aboutCbu: 'МБ Ҳақида', executiveB: 'Бошқарув кенгаши',
    legislation: 'Қонунчилик', publications: 'Публикациялар', dataStats: 'Маълумотлар & Статистика',
    services: 'Хизматлар', exchangeR: 'Валюта курслари', policyR: 'Асосий ставка',
    paymentS: 'Тўлов тизимлари', licensing: 'Лицензиялаш', pressCenter: 'Ахборот хизмати',
    contact: 'Боғланиш', addressS: 'Ислом Каримов Кўчаси, 6', modules: 'Модуллар',
    copyright: '© 2026 Ўзбекистон Республикаси Марказий Банки. Барча ҳуқуқлар ҳимояланган.',
    privacyPolicy: 'Махфийлик сиёсати', termsOfUse: 'Фойдаланиш шартлари',
    sessionExpired: 'Сессия муддати тугади. Илтимос, қайта киринг.',
  },
  uz_l: {
    bankName:     "O'zbekiston Markaziy Banki",
    deptSubtitle: 'Monetar Operatsiyalar Departamenti',
    calculations: 'Hisob-kitob', uploads: 'Yuklamalar', repo: 'Repo',
    depo: 'Depo', data: "Ma'lumotlar", holidays: 'Bayramlar',
    back: 'Orqaga',
    pageTitle: "Foydalanuvchilarni boshqarish",
    pageDesc:  "Tizim foydalanuvchilarini boshqarish — qo'shish, tahrirlash, parol almashtirish va o'chirish",
    totalUsers: 'Jami', activeUsers: 'Faollar',
    adminUsers: 'Administratorlar', inactiveUsers: 'Nofaollar',
    colUsername: 'LOGIN', colName: 'FIO', colDepartment: "BO'LIM",
    colLanguage: 'TIL', colStatus: 'HOLAT', colRole: 'ROL',
    colCreatedAt: 'YARATILGAN', colActions: 'AMALLAR',
    filterLabel: 'Filtrlar:', phUsername: 'Login…', phFirstName: 'Ism…',
    phLastName: 'Familiya…', phDepartment: "Bo'lim…",
    clearAll: 'Barchasini tozalash', addNewUser: "+ Foydalanuvchi qo'shish",
    allLanguages: 'Barcha tillar', allStatuses: 'Barcha holatlar', allRoles: 'Barcha rollar',
    active: 'Faol', inactive: 'Nofaol', admin: 'Administrator', user: 'Foydalanuvchi',
    results: (n: number) => `${n} ta natija`,
    loading: 'Foydalanuvchilar yuklanmoqda…', failedLoad: 'Yuklashda xato.',
    noMatch: 'Topilmadi.', noData: "Foydalanuvchilar yo'q.",
    clearFiltersBtn: 'Filtrlarni tozalash',
    showing: (from: number, to: number, total: number) => `${total} tadan ${from}–${to} ko'rsatilmoqda`,
    previous: 'Oldingi', next: 'Keyingi',
    editUserTitle: 'Foydalanuvchini tahrirlash', addUserTitle: "Foydalanuvchi qo'shish",
    deleteUserTitle: "Foydalanuvchini o'chirish",
    deleteConfirm: "Ushbu foydalanuvchini o'chirishga ishonchingiz komilmi?",
    deleteWarning: "⚠️ Bu amalni qaytarib bo'lmaydi.",
    changePasswordTitle: 'Parolni almashtirish',
    passwordLabel: 'Yangi parol', confirmPasswordLabel: 'Parolni tasdiqlash',
    passwordRequirements: "Parol kamida 8 ta belgi, katta, kichik harf, raqam va maxsus belgi bo'lishi kerak.",
    passwordMismatch: 'Parollar mos emas.', passwordWeak: 'Parol talablarga javob bermaydi.',
    firstNameLabel: 'Ism', lastNameLabel: 'Familiya',
    usernameLabel: 'Login', departmentLabel: "Bo'lim",
    languageLabel: 'Til', isActiveLabel: 'Faol', isAdminLabel: 'Administrator',
    cancel: 'Bekor qilish', save: 'Saqlash', saving: 'Saqlanmoqda…',
    addUser: "Qo'shish", adding: "Qo'shilmoqda…",
    delete: "O'chirish", deleting: "O'chirilmoqda…",
    changePassword: 'Parolni almashtirish', changing: 'Almashtirilmoqda…',
    savedSuccess: 'Foydalanuvchi yangilandi!', addedSuccess: "Foydalanuvchi qo'shildi!",
    deletedSuccess: "Foydalanuvchi o'chirildi!", passwordChangedSuccess: 'Parol almashtirildi!',
    saveFailed: 'Saqlashda xato.', addFailed: "Qo'shishda xato.",
    deleteFailed: "O'chirishda xato.", passwordChangeFailed: 'Parol almashtirishda xato.',
    noChanges: "O'zgarishlar yo'q.",
    passwordPlaceholder: 'Yangi parolni kiriting…', confirmPasswordPlaceholder: 'Parolni tasdiqlang…',
    passwordStrengthWeak: 'Zaif', passwordStrengthFair: "O'rtacha",
    passwordStrengthGood: 'Yaxshi', passwordStrengthStrong: 'Kuchli',
    usersBtn: 'Foydalanuvchilar', sessionsBtn: 'Sessiyalar', actionsBtn: 'Harakatlar',
    signOut: 'Chiqish', department: "Bo'lim",
    langConfirmTitle: "Tilni o'zgartirish",
    langConfirmMsg: (lang: string) => `Interfeys tilini ${lang} tiliga o'zgartirishga ishonchingiz komilmi?`,
    confirm: "Ha, o'zgartirish", langCancel: 'Bekor qilish',
    officialDesc: 'UZONIA – Banklararo operatsiyalar, hisob-kitoblar va ma\'lumotlarni qayta ishlash platformasi',
    aboutCbu: 'MBU Haqida', executiveB: 'Boshqaruv kengashi',
    legislation: 'Qonunchilik', publications: 'Publikatsiyalar', dataStats: "Ma'lumotlar & Statistika",
    services: 'Xizmatlar', exchangeR: 'Valyuta kurslari', policyR: 'Asosiy stavka',
    paymentS: "To'lov tizimlari", licensing: 'Litsenziyalash', pressCenter: 'Axborot xizmati',
    contact: "Bog'lanish", addressS: "Islom Karimov Ko'chasi, 6", modules: 'Modullar',
    copyright: "© 2026 O'zbekiston Respublikasi Markaziy Banki. Barcha huquqlar himoyalangan.",
    privacyPolicy: 'Maxfiylik siyosati', termsOfUse: 'Foydalanish shartlari',
    sessionExpired: 'Sessiya muddati tugadi. Iltimos, qayta kiring.',
  },
};

type LangKey = keyof typeof TRANSLATIONS;
const LANG_LABELS: Record<LangKey, string> = { en: 'EN', ru: 'RU', uz_c: 'УЗ', uz_l: "O'Z" };
const LANG_NAMES:  Record<LangKey, string> = { en: 'English', ru: 'Русский', uz_c: 'Ўзбекча', uz_l: "O'zbekcha" };
const LANG_OPTIONS = [
  { value: 'en',   label: 'English (EN)'    },
  { value: 'ru',   label: 'Русский (RU)'    },
  { value: 'uz_c', label: 'Ўзбекча (УЗ)'   },
  { value: 'uz_l', label: "O'zbekcha (O'Z)" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface UserRecord {
  user_id: string; username: string; first_name: string; last_name: string;
  department: string; language: string; is_active: boolean; is_admin: boolean;
  created_at: string;
}
interface CurrentUser {
  user_id: string; username: string; first_name: string; last_name: string;
  department: string; language: string; is_active: boolean; is_admin: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Password helpers
// ─────────────────────────────────────────────────────────────────────────────
const getPasswordStrength = (password: string) => {
  let score = 0;
  if (password.length >= 8)        score++;
  if (password.length >= 12)       score++;
  if (/[A-Z]/.test(password))      score++;
  if (/[a-z]/.test(password))      score++;
  if (/[0-9]/.test(password))      score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 2) return { score, label: 'weak',   color: '#ef4444' };
  if (score <= 3) return { score, label: 'fair',   color: '#f59e0b' };
  if (score <= 4) return { score, label: 'good',   color: '#3b82f6' };
  return            { score, label: 'strong', color: '#10b981' };
};
const isPasswordStrong = (password: string) =>
  password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) &&
  /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password);

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
const AdminUsersPage: React.FC = () => {
  const navigate    = useNavigate();
  const currentPath = '/users_data';

  // ── Responsive ────────────────────────────────────────────────────────────
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ── State ─────────────────────────────────────────────────────────────────
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [users,       setUsers]       = useState<UserRecord[]>([]);
  const [lang,        setLang]        = useState<LangKey>('en');
  const [pendingLang, setPendingLang] = useState<LangKey | null>(null);
  const [isLoading,   setIsLoading]   = useState(true);
  const [loadError,   setLoadError]   = useState<string | null>(null);
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

  // ── Filters ───────────────────────────────────────────────────────────────
  const [fUsername,   setFUsername]   = useState('');
  const [fFirstName,  setFFirstName]  = useState('');
  const [fLastName,   setFLastName]   = useState('');
  const [fDepartment, setFDepartment] = useState('');
  const [fLanguage,   setFLanguage]   = useState('');
  const [fStatus,     setFStatus]     = useState('');
  const [fRole,       setFRole]       = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // ── Modals ────────────────────────────────────────────────────────────────
  const [editModal,     setEditModal]     = useState<UserRecord | null>(null);
  const [deleteModal,   setDeleteModal]   = useState<UserRecord | null>(null);
  const [passwordModal, setPasswordModal] = useState<UserRecord | null>(null);
  const [addModal,      setAddModal]      = useState(false);

  const [editForm, setEditForm] = useState({
    username: '', first_name: '', last_name: '', department: '',
    language: 'en', is_active: true, is_admin: false,
  });
  const [addForm, setAddForm] = useState({
    username: '', first_name: '', last_name: '', department: '',
    language: 'en', password: '', confirmPassword: '', is_active: true, is_admin: false,
  });
  const [pwForm,  setPwForm]  = useState({ password: '', confirm: '' });
  const [pwShow,  setPwShow]  = useState({ password: false, confirm: false });
  const [apShow,  setApShow]  = useState({ password: false, confirm: false });

  const [isSaving,     setIsSaving]     = useState(false);
  const [isAdding,     setIsAdding]     = useState(false);
  const [isDeleting,   setIsDeleting]   = useState(false);
  const [isChangingPw, setIsChangingPw] = useState(false);

  // ── Toast ─────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const showToast = (text: string, type: 'success' | 'error' | 'info') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Font loading ──────────────────────────────────────────────────────────
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

  // ── Fetch data ────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const res = await apiFetch('/api/get_all_users');
      if (!res || !(res as Response).ok) throw new Error(`HTTP ${(res as Response)?.status ?? 'unknown'}`);
      const data = await (res as Response).json();
      setUsers(data.users ?? []);
      setCurrentUser(data.admin);
      const langMap: Record<string, LangKey> = { en: 'en', ru: 'ru', uz_c: 'uz_c', uz_l: 'uz_l' };
      if (data.admin?.language && langMap[data.admin.language]) setLang(langMap[data.admin.language]);
      setLoadError(null);
    } catch {
      setLoadError('failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Session check on mount ────────────────────────────────────────────────
  useEffect(() => {
    const expired = sessionStorage.getItem('session_expired');
    if (expired) {
      showToast(TRANSLATIONS[lang]?.sessionExpired ?? 'Session expired.', 'info');
      sessionStorage.removeItem('session_expired');
    }
  }, []);

  // ── Periodic session refresh ──────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser) return;
    const id = setInterval(() => fetchData(), 60_000);
    return () => clearInterval(id);
  }, [currentUser, fetchData]);

  // ── Language change ───────────────────────────────────────────────────────
  const applyLanguageChange = useCallback(async (newLang: LangKey) => {
    setPendingLang(null);
    try {
      const res = await apiFetch(`/api/update_language?language=${newLang}`, { method: 'PUT' });
      if (!res || !(res as Response).ok) return;
      const data = await (res as Response).json();
      setLang(newLang);
      setCurrentUser(data.user);
    } catch {}
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getInitials = (u: CurrentUser | null) => {
    if (!u) return '?';
    return ((u.first_name?.[0] ?? '') + (u.last_name?.[0] ?? '')).toUpperCase() || u.username?.[0]?.toUpperCase() || '?';
  };
  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('en-GB', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch { return dateStr; }
  };

  // ── Derived data ──────────────────────────────────────────────────────────
  const filteredUsers = useMemo(() => {
    let f = [...users];
    if (fUsername.trim())   f = f.filter(u => u.username.toLowerCase().includes(fUsername.trim().toLowerCase()));
    if (fFirstName.trim())  f = f.filter(u => u.first_name.toLowerCase().includes(fFirstName.trim().toLowerCase()));
    if (fLastName.trim())   f = f.filter(u => u.last_name.toLowerCase().includes(fLastName.trim().toLowerCase()));
    if (fDepartment.trim()) f = f.filter(u => u.department.toLowerCase().includes(fDepartment.trim().toLowerCase()));
    if (fLanguage)          f = f.filter(u => u.language === fLanguage);
    if (fStatus === 'active')   f = f.filter(u => u.is_active);
    if (fStatus === 'inactive') f = f.filter(u => !u.is_active);
    if (fRole === 'admin') f = f.filter(u => u.is_admin);
    if (fRole === 'user')  f = f.filter(u => !u.is_admin);
    return f;
  }, [users, fUsername, fFirstName, fLastName, fDepartment, fLanguage, fStatus, fRole]);

  const stats = useMemo(() => ({
    total:    users.length,
    active:   users.filter(u => u.is_active).length,
    admins:   users.filter(u => u.is_admin).length,
    inactive: users.filter(u => !u.is_active).length,
  }), [users]);

  const hasActiveFilters = fUsername || fFirstName || fLastName || fDepartment || fLanguage || fStatus || fRole;
  const totalPages     = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = useMemo(() =>
    filteredUsers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE),
    [filteredUsers, currentPage]
  );
  useEffect(() => { setCurrentPage(1); }, [fUsername, fFirstName, fLastName, fDepartment, fLanguage, fStatus, fRole]);

  const hasChanges = useMemo(() => {
    if (!editModal) return false;
    return (
      editForm.username   !== editModal.username   || editForm.first_name !== editModal.first_name ||
      editForm.last_name  !== editModal.last_name  || editForm.department !== editModal.department ||
      editForm.language   !== editModal.language   || editForm.is_active  !== editModal.is_active  ||
      editForm.is_admin   !== editModal.is_admin
    );
  }, [editForm, editModal]);

  // ── Modal openers ─────────────────────────────────────────────────────────
  const openEditModal = useCallback((u: UserRecord) => {
    setEditForm({ username: u.username, first_name: u.first_name, last_name: u.last_name,
      department: u.department, language: u.language, is_active: u.is_active, is_admin: u.is_admin });
    setEditModal(u);
  }, []);
  const openPasswordModal = useCallback((u: UserRecord) => {
    setPwForm({ password: '', confirm: '' });
    setPwShow({ password: false, confirm: false });
    setPasswordModal(u);
  }, []);
  const openAddModal = useCallback(() => {
    setAddForm({ username: '', first_name: '', last_name: '', department: '', language: 'en',
      password: '', confirmPassword: '', is_active: true, is_admin: false });
    setApShow({ password: false, confirm: false });
    setAddModal(true);
  }, []);

  // ── API actions ───────────────────────────────────────────────────────────
  const handleSaveEdit = async () => {
    if (!editModal || !hasChanges) return;
    setIsSaving(true);
    try {
      const body = { user_id: editModal.user_id, username: editForm.username,
        first_name: editForm.first_name, last_name: editForm.last_name,
        department: editForm.department, language: editForm.language,
        is_active: editForm.is_active, is_admin: editForm.is_admin };
      const res = await apiFetch('/api/edit_user_details', { method: 'PUT', body: JSON.stringify(body) });
      if (!res || !(res as Response).ok) { const e = await (res as Response).json(); throw new Error(e.detail); }
      setEditModal(null); await fetchData(); showToast(t.savedSuccess, 'success');
    } catch (err: any) {
      showToast(err.message || t.saveFailed, 'error');
    } finally { setIsSaving(false); }
  };

  const handleAddUser = async () => {
    if (!addForm.username || !addForm.first_name || !addForm.last_name || !addForm.department || !addForm.password) return;
    if (!isPasswordStrong(addForm.password)) { showToast(t.passwordWeak, 'error'); return; }
    if (addForm.password !== addForm.confirmPassword) { showToast(t.passwordMismatch, 'error'); return; }
    setIsAdding(true);
    try {
      const body = { username: addForm.username, first_name: addForm.first_name,
        last_name: addForm.last_name, department: addForm.department, language: addForm.language,
        password: addForm.password, is_active: addForm.is_active, is_admin: addForm.is_admin };
      const res = await apiFetch('/api/add_user', { method: 'POST', body: JSON.stringify(body) });
      if (!res || !(res as Response).ok) { const e = await (res as Response).json(); throw new Error(e.detail); }
      setAddModal(false); await fetchData(); showToast(t.addedSuccess, 'success');
    } catch (err: any) {
      showToast(err.message || t.addFailed, 'error');
    } finally { setIsAdding(false); }
  };

  const handleDeleteUser = async () => {
    if (!deleteModal) return;
    setIsDeleting(true);
    try {
      const body = { user_id: deleteModal.user_id, username: deleteModal.username };
      const res = await apiFetch('/api/delete_user', { method: 'DELETE', body: JSON.stringify(body) });
      if (!res || !(res as Response).ok) { const e = await (res as Response).json(); throw new Error(e.detail); }
      setDeleteModal(null); await fetchData(); showToast(t.deletedSuccess, 'success');
    } catch (err: any) {
      showToast(err.message || t.deleteFailed, 'error');
    } finally { setIsDeleting(false); }
  };

  const handleChangePassword = async () => {
    if (!passwordModal) return;
    if (!isPasswordStrong(pwForm.password)) { showToast(t.passwordWeak, 'error'); return; }
    if (pwForm.password !== pwForm.confirm) { showToast(t.passwordMismatch, 'error'); return; }
    setIsChangingPw(true);
    try {
      const body = { user_id: passwordModal.user_id, password: pwForm.password };
      const res = await apiFetch('/api/edit_user_password', { method: 'PUT', body: JSON.stringify(body) });
      if (!res || !(res as Response).ok) { const e = await (res as Response).json(); throw new Error(e.detail); }
      setPasswordModal(null); showToast(t.passwordChangedSuccess, 'success');
    } catch (err: any) {
      showToast(err.message || t.passwordChangeFailed, 'error');
    } finally { setIsChangingPw(false); }
  };

  const handleClearFilters = useCallback(() => {
    setFUsername(''); setFFirstName(''); setFLastName('');
    setFDepartment(''); setFLanguage(''); setFStatus(''); setFRole('');
  }, []);

  // ── Shared styles ─────────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', fontSize: '13px', background: '#f8fafc',
    color: '#0f172a', border: '1px solid #e2e8f0', borderRadius: '8px',
    outline: 'none', boxSizing: 'border-box',
  };
  const modalInputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', fontSize: '14px', background: '#f8fafc',
    color: '#0f172a', border: '1px solid #e2e8f0', borderRadius: '10px',
    outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
  };
  const labelStyle: React.CSSProperties = {
    fontSize: '12px', fontWeight: '600', color: '#374151',
    textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', display: 'block',
  };
  const toggleStyle = (on: boolean): React.CSSProperties => ({
    width: '44px', height: '24px', borderRadius: '12px',
    background: on ? '#0a3b5c' : '#cbd5e1', position: 'relative',
    cursor: 'pointer', border: 'none', transition: 'background 0.2s', flexShrink: 0,
  });

  // ── Sub-components ────────────────────────────────────────────────────────
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
        onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.10)'; e.currentTarget.style.color = 'white'; }}}
        onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.65)'; }}}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>{page.icon}</span>
        {label}
      </button>
    );
  };

  const PasswordStrengthBar = ({ password }: { password: string }) => {
    const strength = getPasswordStrength(password);
    const strengthLabels: Record<string, string> = {
      weak: t.passwordStrengthWeak, fair: t.passwordStrengthFair,
      good: t.passwordStrengthGood, strong: t.passwordStrengthStrong,
    };
    if (!password) return null;
    return (
      <div style={{ marginTop: '8px' }}>
        <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{
              flex: 1, height: '4px', borderRadius: '2px', transition: 'background 0.3s',
              background: i <= Math.ceil(strength.score / 1.5) ? strength.color : '#e2e8f0',
            }} />
          ))}
        </div>
        <div style={{ fontSize: '11px', color: strength.color, fontWeight: '600' }}>
          {strengthLabels[strength.label]}
        </div>
      </div>
    );
  };

  const LangBadge = ({ lang: l }: { lang: string }) => {
    const colors: Record<string, { bg: string; text: string }> = {
      en:   { bg: '#dbeafe', text: '#1e40af' }, ru:   { bg: '#fce7f3', text: '#9d174d' },
      uz_c: { bg: '#fef9c3', text: '#854d0e' }, uz_l: { bg: '#d1fae5', text: '#065f46' },
    };
    const c = colors[l] ?? { bg: '#f1f5f9', text: '#475569' };
    return (
      <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', background: c.bg, color: c.text, whiteSpace: 'nowrap' }}>
        {LANG_LABELS[l as LangKey] ?? l.toUpperCase()}
      </span>
    );
  };

  const UserFormFields = ({
    form, onChange, showPassword = false, passwordVal = '', confirmVal = '',
    onPasswordChange, onConfirmChange, showPw = false, showConfirm = false,
    onToggleShowPw, onToggleShowConfirm,
  }: any) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
      <div>
        <label style={labelStyle}>{t.firstNameLabel}</label>
        <input style={modalInputStyle} value={form.first_name}
          onChange={e => onChange({ ...form, first_name: e.target.value })} placeholder={t.firstNameLabel} />
      </div>
      <div>
        <label style={labelStyle}>{t.lastNameLabel}</label>
        <input style={modalInputStyle} value={form.last_name}
          onChange={e => onChange({ ...form, last_name: e.target.value })} placeholder={t.lastNameLabel} />
      </div>
      <div>
        <label style={labelStyle}>{t.usernameLabel}</label>
        <input style={modalInputStyle} value={form.username}
          onChange={e => onChange({ ...form, username: e.target.value })} placeholder={t.usernameLabel} />
      </div>
      <div>
        <label style={labelStyle}>{t.departmentLabel}</label>
        <input style={modalInputStyle} value={form.department}
          onChange={e => onChange({ ...form, department: e.target.value })} placeholder={t.departmentLabel} />
      </div>
      <div>
        <label style={labelStyle}>{t.languageLabel}</label>
        <select style={{ ...modalInputStyle, cursor: 'pointer' }} value={form.language}
          onChange={e => onChange({ ...form, language: e.target.value })}>
          {LANG_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button style={toggleStyle(form.is_active)} onClick={() => onChange({ ...form, is_active: !form.is_active })}>
            <div style={{ position: 'absolute', top: '2px', left: form.is_active ? '22px' : '2px', width: '20px', height: '20px', borderRadius: '50%', background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
          </button>
          <span style={{ fontSize: '13px', fontWeight: '500', color: '#374151' }}>{t.isActiveLabel}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button style={toggleStyle(form.is_admin)} onClick={() => onChange({ ...form, is_admin: !form.is_admin })}>
            <div style={{ position: 'absolute', top: '2px', left: form.is_admin ? '22px' : '2px', width: '20px', height: '20px', borderRadius: '50%', background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
          </button>
          <span style={{ fontSize: '13px', fontWeight: '500', color: '#374151' }}>{t.isAdminLabel}</span>
        </div>
      </div>
      {showPassword && (
        <>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>{t.passwordLabel}</label>
            <div style={{ position: 'relative' }}>
              <input type={showPw ? 'text' : 'password'} style={{ ...modalInputStyle, paddingRight: '40px' }}
                value={passwordVal} onChange={e => onPasswordChange(e.target.value)} placeholder={t.passwordPlaceholder} />
              <button type="button" onClick={onToggleShowPw} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{showPw ? 'visibility_off' : 'visibility'}</span>
              </button>
            </div>
            <PasswordStrengthBar password={passwordVal} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>{t.confirmPasswordLabel}</label>
            <div style={{ position: 'relative' }}>
              <input type={showConfirm ? 'text' : 'password'} style={{ ...modalInputStyle, paddingRight: '40px', borderColor: confirmVal && confirmVal !== passwordVal ? '#ef4444' : '#e2e8f0' }}
                value={confirmVal} onChange={e => onConfirmChange(e.target.value)} placeholder={t.confirmPasswordPlaceholder} />
              <button type="button" onClick={onToggleShowConfirm} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{showConfirm ? 'visibility_off' : 'visibility'}</span>
              </button>
            </div>
            {confirmVal && confirmVal !== passwordVal && (
              <div style={{ marginTop: '4px', fontSize: '12px', color: '#ef4444' }}>{t.passwordMismatch}</div>
            )}
          </div>
          <div style={{ gridColumn: '1 / -1', padding: '10px 14px', background: '#f8fafc', borderRadius: '8px', fontSize: '12px', color: '#64748b', border: '1px solid #e2e8f0' }}>
            {t.passwordRequirements}
          </div>
        </>
      )}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', width: '100%', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc', fontFamily: '"Inter","Segoe UI",system-ui,-apple-system,sans-serif' }}>

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: 'fixed', top: '24px', right: '24px', zIndex: 2000,
          background: toast.type === 'success' ? '#065f46' : toast.type === 'error' ? '#991b1b' : '#1e40af',
          color: 'white', padding: '13px 18px', borderRadius: '12px',
          display: 'flex', alignItems: 'center', gap: '10px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)', fontSize: '14px', fontWeight: '500',
          animation: 'slideIn 0.3s ease', maxWidth: '380px',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '19px', flexShrink: 0 }}>
            {toast.type === 'success' ? 'check_circle' : toast.type === 'info' ? 'info' : 'error'}
          </span>
          {toast.text}
        </div>
      )}

      {/* ── Language Confirmation Modal ── */}
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
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setPendingLang(null)} style={{ flex: 1, padding: '11px', background: '#f1f5f9', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', color: '#64748b', cursor: 'pointer' }}>
                {t.langCancel}
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
        width: '100%', background: 'linear-gradient(135deg, #0a3b5c 0%, #1a4b70 100%)',
        boxShadow: '0 4px 20px rgba(0,40,70,0.18)', borderBottom: '3px solid #e9b741',
        boxSizing: 'border-box', position: 'sticky', top: 0, zIndex: 100,
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

          {/* Divider */}
          {!isMobile && <div style={{ width: '1px', height: '28px', background: 'rgba(255,255,255,0.15)', flexShrink: 0 }} />}

          {/* Nav tabs */}
          <div style={{ padding: '0 10px', overflowX: 'auto' }}>
            <nav style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '40px', minWidth: 'max-content', flexWrap: 'nowrap' }}>
              {NAV_PAGES.map(p => <NavBtn key={p.path} page={p} />)}
            </nav>
          </div>

          {/* Spacer */}
          <div style={{ flex: 1, minWidth: 0 }} />

          {/* Language switcher + avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '8px', padding: '4px', border: '1px solid rgba(255,255,255,0.12)', flexShrink: 0 }}>
              {(Object.entries(LANG_LABELS) as [LangKey, string][]).map(([key, label]) => (
                <button key={key} onClick={() => key !== lang && setPendingLang(key)} style={{
                  background: lang === key ? '#e9b741' : 'transparent',
                  color: lang === key ? '#0a2a40' : 'rgba(255,255,255,0.75)',
                  border: 'none', borderRadius: '6px', padding: '4px 8px',
                  fontSize: '11px', fontWeight: '600', cursor: lang === key ? 'default' : 'pointer',
                  transition: 'all 0.18s', minWidth: '26px',
                }}
                  onMouseEnter={e => { if (lang !== key) e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
                  onMouseLeave={e => { if (lang !== key) e.currentTarget.style.background = 'transparent'; }}
                >{label}</button>
              ))}
            </div>

            {/* Avatar + dropdown */}
            <div ref={dropdownRef} style={{ position: 'relative', flexShrink: 0 }}>
              <button onClick={() => setDropdownOpen(o => !o)} style={{
                background: 'rgba(255,255,255,0.1)', border: '2px solid rgba(233,183,65,0.5)',
                borderRadius: '50%', width: '44px', height: '44px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'all 0.2s', color: 'white',
                fontSize: '18px', fontWeight: '700',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#e9b741'; e.currentTarget.style.background = 'rgba(233,183,65,0.2)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(233,183,65,0.5)'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
              >
                {getInitials(currentUser)}
              </button>

              {dropdownOpen && (
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
                          {currentUser?.department ?? '—'}
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
                        { icon: 'group',          label: t.usersBtn,    route: '/users_data',    color: '#3b82f6', bg: '#eff6ff'  },
                        { icon: 'manage_history', label: t.sessionsBtn, route: '/user_sessions', color: '#8b5cf6', bg: '#f5f3ff'  },
                        { icon: 'timeline',       label: t.actionsBtn,  route: '/user_actions',  color: '#f59e0b', bg: '#fffbeb'  },
                      ].map(({ icon, label, route, color, bg }) => (
                        <button key={route} onClick={() => { navigate(route); setDropdownOpen(false); }} style={{
                          width: '100%', background: route === currentPath ? bg : 'none',
                          border: route === currentPath ? `1px solid ${color}33` : 'none',
                          textAlign: 'left', padding: '10px 12px', borderRadius: '10px',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px',
                          color: route === currentPath ? color : '#1f2937',
                          fontSize: '13px', fontWeight: route === currentPath ? '600' : '500',
                          transition: 'all 0.2s', marginBottom: '2px',
                        }}
                          onMouseEnter={e => { e.currentTarget.style.background = bg; }}
                          onMouseLeave={e => { e.currentTarget.style.background = route === currentPath ? bg : 'none'; }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '20px', color, transition: 'transform 0.2s' }}>{icon}</span>
                          <span style={{ flex: 1 }}>{label}</span>
                          <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#cbd5e1' }}>chevron_right</span>
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
                      color: '#dc2626', fontSize: '13px', fontWeight: '500', transition: 'all 0.2s',
                    }}
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
      <main style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', padding: isMobile ? '20px 16px' : '28px 24px', background: '#f8fafc', boxSizing: 'border-box' }}>
        <div style={{ width: '100%', maxWidth: '1400px', margin: '0 auto' }}>

          {/* Page title row */}
          <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                <div style={{ width: '38px', height: '38px', background: 'linear-gradient(135deg,#0a3b5c,#1a6494)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'white' }}>group</span>
                </div>
                <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: '#0a3b5c' }}>{t.pageTitle}</h1>
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b', paddingLeft: '48px' }}>{t.pageDesc}</p>
            </div>
            <button onClick={() => window.history.back()} style={{
              padding: '8px 16px', fontSize: '13px', fontWeight: '500',
              background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0',
              borderRadius: '9px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0,
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>arrow_back</span>
              {t.back}
            </button>
          </div>

          {/* Stats + Add button */}
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', gap: '20px', marginBottom: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap: '16px', flex: 1 }}>
              {[
                { label: t.totalUsers,    value: stats.total,    color: '#0a3b5c', iconBg: '#e2e8f0', icon: 'group'                },
                { label: t.activeUsers,   value: stats.active,   color: '#065f46', iconBg: '#d1fae5', icon: 'check_circle'         },
                { label: t.adminUsers,    value: stats.admins,   color: '#1e40af', iconBg: '#dbeafe', icon: 'admin_panel_settings'  },
                { label: t.inactiveUsers, value: stats.inactive, color: '#92400e', iconBg: '#fef9ec', icon: 'block'                },
              ].map(s => (
                <div key={s.label} style={{ background: 'white', padding: '16px 18px', borderRadius: '14px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '42px', height: '42px', background: s.iconBg, borderRadius: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '20px', color: s.color }}>{s.icon}</span>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>{s.label}</div>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: s.color }}>{s.value}</div>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={openAddModal} style={{
              background: 'linear-gradient(135deg,#0a3b5c 0%,#1a5080 100%)', color: 'white',
              border: 'none', borderRadius: '12px', padding: '12px 22px',
              fontSize: '14px', fontWeight: '600', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '8px',
              boxShadow: '0 4px 16px rgba(10,59,92,0.35)', whiteSpace: 'nowrap',
              transition: 'all 0.2s', flexShrink: 0, borderBottom: '3px solid rgba(233,183,65,0.6)',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(10,59,92,0.45)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(10,59,92,0.35)'; }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>person_add</span>
              {t.addNewUser}
            </button>
          </div>

          {/* Filter bar */}
          <div style={{ background: 'white', padding: '18px 22px', borderRadius: '14px', marginBottom: '20px', boxShadow: '0 2px 10px rgba(0,40,70,0.06)', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '17px', color: '#0a3b5c', flexShrink: 0 }}>filter_alt</span>
              <span style={{ fontSize: '13px', fontWeight: '500', color: '#374151', flexShrink: 0 }}>{t.filterLabel}</span>
              {[
                { icon: 'person', val: fUsername,   set: setFUsername,   ph: t.phUsername,   flex: '1 1 110px' },
                { icon: 'badge',  val: fFirstName,  set: setFFirstName,  ph: t.phFirstName,  flex: '1 1 110px' },
                { icon: 'badge',  val: fLastName,   set: setFLastName,   ph: t.phLastName,   flex: '1 1 110px' },
                { icon: 'domain', val: fDepartment, set: setFDepartment, ph: t.phDepartment, flex: '1 1 120px' },
              ].map(({ icon, val, set, ph, flex }) => (
                <div key={ph} style={{ position: 'relative', flex, minWidth: '90px' }}>
                  <span className="material-symbols-outlined" style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '14px' }}>{icon}</span>
                  <input type="text" value={val} placeholder={ph} onChange={e => set(e.target.value)}
                    style={{ ...inputStyle, paddingLeft: '28px' }} />
                </div>
              ))}
              <select value={fLanguage} onChange={e => setFLanguage(e.target.value)}
                style={{ ...inputStyle, flex: '1 1 120px', minWidth: '110px', cursor: 'pointer' }}>
                <option value="">{t.allLanguages}</option>
                {LANG_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <select value={fStatus} onChange={e => setFStatus(e.target.value)}
                style={{ ...inputStyle, flex: '1 1 110px', minWidth: '100px', cursor: 'pointer' }}>
                <option value="">{t.allStatuses}</option>
                <option value="active">{t.active}</option>
                <option value="inactive">{t.inactive}</option>
              </select>
              <select value={fRole} onChange={e => setFRole(e.target.value)}
                style={{ ...inputStyle, flex: '1 1 100px', minWidth: '90px', cursor: 'pointer' }}>
                <option value="">{t.allRoles}</option>
                <option value="admin">{t.admin}</option>
                <option value="user">{t.user}</option>
              </select>
              {hasActiveFilters && (
                <button onClick={handleClearFilters} style={{ padding: '9px 14px', fontSize: '13px', fontWeight: '500', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>close</span>
                  {t.clearAll}
                </button>
              )}
            </div>
            {hasActiveFilters && (
              <div style={{ marginTop: '10px', fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 10px', background: '#f1f5f9', borderRadius: '8px', flexWrap: 'wrap' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#0a3b5c' }}>info</span>
                {t.results(filteredUsers.length)}
              </div>
            )}
          </div>

          {/* Table */}
          <div style={{ background: 'white', borderRadius: '14px', boxShadow: '0 2px 10px rgba(0,40,70,0.06)', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
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
            ) : paginatedUsers.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '48px', marginBottom: '16px', display: 'block', color: '#94a3b8' }}>group</span>
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
                          { label: '#',             align: 'left'   },
                          { label: t.colUsername,   align: 'left'   },
                          { label: t.colName,       align: 'left'   },
                          { label: t.colDepartment, align: 'left'   },
                          { label: t.colLanguage,   align: 'center' },
                          { label: t.colStatus,     align: 'center' },
                          { label: t.colRole,       align: 'center' },
                          { label: t.colCreatedAt,  align: 'left'   },
                          { label: t.colActions,    align: 'center' },
                        ].map(h => (
                          <th key={h.label} style={{ padding: '12px 14px', textAlign: h.align as any, fontWeight: '600', color: '#0a3b5c', fontSize: '11px', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                            {h.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedUsers.map((u: UserRecord, index: number) => {
                        const rowNum = (currentPage - 1) * ITEMS_PER_PAGE + index + 1;
                        return (
                          <tr key={u.user_id}
                            style={{ borderBottom: '1px solid #e2e8f0', background: index % 2 === 0 ? 'white' : '#fafbfc', transition: 'background 0.15s' }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#f0f9ff'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = index % 2 === 0 ? 'white' : '#fafbfc'; }}
                          >
                            <td style={{ padding: '12px 14px', color: '#94a3b8', fontSize: '12px', fontWeight: '500' }}>{rowNum}</td>
                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{
                                  width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                                  background: u.is_admin ? 'linear-gradient(135deg,#1e40af,#3b82f6)' : 'linear-gradient(135deg,#0a3b5c,#1a5080)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  color: 'white', fontSize: '11px', fontWeight: '700',
                                  border: u.is_admin ? '2px solid #93c5fd' : '2px solid #94a3b8',
                                }}>
                                  {(u.first_name[0] ?? '').toUpperCase() + (u.last_name[0] ?? '').toUpperCase()}
                                </div>
                                <span style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>{u.username}</span>
                              </div>
                            </td>
                            <td style={{ padding: '12px 14px', fontSize: '13px', color: '#0f172a', fontWeight: '500' }}>
                              {u.first_name} {u.last_name}
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                              <span style={{ fontSize: '13px', color: '#374151', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '13px', color: '#94a3b8' }}>domain</span>
                                {u.department}
                              </span>
                            </td>
                            <td style={{ padding: '12px 14px', textAlign: 'center' }}><LangBadge lang={u.language} /></td>
                            <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                              <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', background: u.is_active ? '#d1fae5' : '#fee2e2', color: u.is_active ? '#065f46' : '#991b1b', display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>{u.is_active ? 'check_circle' : 'cancel'}</span>
                                {u.is_active ? t.active : t.inactive}
                              </span>
                            </td>
                            <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                              <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', background: u.is_admin ? '#dbeafe' : '#f1f5f9', color: u.is_admin ? '#1e40af' : '#64748b', display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>{u.is_admin ? 'admin_panel_settings' : 'person'}</span>
                                {u.is_admin ? t.admin : t.user}
                              </span>
                            </td>
                            <td style={{ padding: '12px 14px', whiteSpace: 'nowrap', fontSize: '12px', color: '#64748b' }}>
                              {formatDate(u.created_at)}
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                                <button onClick={() => openEditModal(u)} title="Edit"
                                  style={{ padding: '6px 8px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#0369a1', transition: 'all 0.2s' }}
                                  onMouseEnter={e => { e.currentTarget.style.background = '#0369a1'; e.currentTarget.style.color = 'white'; }}
                                  onMouseLeave={e => { e.currentTarget.style.background = '#f0f9ff'; e.currentTarget.style.color = '#0369a1'; }}>
                                  <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>edit</span>
                                </button>
                                <button onClick={() => openPasswordModal(u)} title="Change password"
                                  style={{ padding: '6px 8px', background: '#fefce8', border: '1px solid #fde68a', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#854d0e', transition: 'all 0.2s' }}
                                  onMouseEnter={e => { e.currentTarget.style.background = '#854d0e'; e.currentTarget.style.color = 'white'; }}
                                  onMouseLeave={e => { e.currentTarget.style.background = '#fefce8'; e.currentTarget.style.color = '#854d0e'; }}>
                                  <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>lock_reset</span>
                                </button>
                                <button onClick={() => setDeleteModal(u)} title="Delete"
                                  style={{ padding: '6px 8px', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#be123c', transition: 'all 0.2s' }}
                                  onMouseEnter={e => { e.currentTarget.style.background = '#be123c'; e.currentTarget.style.color = 'white'; }}
                                  onMouseLeave={e => { e.currentTarget.style.background = '#fff1f2'; e.currentTarget.style.color = '#be123c'; }}>
                                  <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>delete</span>
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
                {filteredUsers.length > ITEMS_PER_PAGE && (
                  <div style={{ padding: '16px 22px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>
                      {t.showing((currentPage - 1) * ITEMS_PER_PAGE + 1, Math.min(currentPage * ITEMS_PER_PAGE, filteredUsers.length), filteredUsers.length)}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}
                        style={{ padding: '7px 14px', fontSize: '13px', fontWeight: '500', background: currentPage === 1 ? '#f1f5f9' : 'white', color: currentPage === 1 ? '#94a3b8' : '#0a3b5c', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>chevron_left</span>
                        {t.previous}
                      </button>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                          const show = page === 1 || page === totalPages || (page >= currentPage - 2 && page <= currentPage + 2);
                          const ellipsis = page === currentPage - 3 || page === currentPage + 3;
                          if (show) return (
                            <button key={page} onClick={() => setCurrentPage(page)} style={{ width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '500', background: currentPage === page ? '#0a3b5c' : 'white', color: currentPage === page ? 'white' : '#0f172a', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer' }}>
                              {page}
                            </button>
                          );
                          if (ellipsis) return <span key={`e${page}`} style={{ width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '13px' }}>…</span>;
                          return null;
                        })}
                      </div>
                      <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages}
                        style={{ padding: '7px 14px', fontSize: '13px', fontWeight: '500', background: currentPage === totalPages ? '#f1f5f9' : 'white', color: currentPage === totalPages ? '#94a3b8' : '#0a3b5c', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {t.next}
                        <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>chevron_right</span>
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
            <p style={{ fontSize: '13px', lineHeight: '1.6', color: '#6b8499', marginBottom: '18px' }}>{t.officialDesc}</p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {[
                { src: facebook,  alt: 'Facebook',  href: 'https://www.facebook.com/centralbankuzbekistan/', w: 32 },
                { src: telegram,  alt: 'Telegram',  href: 'https://t.me/centralbankuzbekistan',              w: 34 },
                { src: linkedin,  alt: 'LinkedIn',  href: 'https://www.linkedin.com/company/centralbankuzbekistan/', w: 36 },
                { src: twitter,   alt: 'Twitter',   href: 'https://x.com/cbuzbekistan',                      w: 44 },
                { src: instagram, alt: 'Instagram', href: 'https://www.instagram.com/centralbankuzbekistan', w: 30 },
                { src: youtube,   alt: 'YouTube',   href: 'https://www.youtube.com/centralbankofuzbekistan', w: 34 },
              ].map(s => (
                <a key={s.alt} href={s.href} target="_blank" rel="noopener noreferrer"
                  style={{ width: '32px', height: '32px', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.07)', transition: 'background 0.2s' }}
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
                <li key={p.path} style={{ marginBottom: '12px' }}>
                  <button onClick={() => navigate(p.path)} style={{ background: 'none', border: 'none', padding: '0', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: p.path === currentPath ? '#e9b741' : '#8097a8', fontWeight: p.path === currentPath ? '600' : '400', cursor: 'pointer', transition: 'color 0.15s', width: '100%' }}
                    onMouseEnter={e => { if (p.path !== currentPath) e.currentTarget.style.color = 'white'; }}
                    onMouseLeave={e => { if (p.path !== currentPath) e.currentTarget.style.color = '#8097a8'; }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>{p.icon}</span>
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
                <li key={item.href} style={{ marginBottom: '9px' }}>
                  <a href={item.href} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '14px', color: '#8097a8', textDecoration: 'none', transition: 'color 0.15s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'white'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#8097a8'; }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>{item.icon}</span>
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
                  <a href={item.href} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '14px', color: '#8097a8', textDecoration: 'none', transition: 'color 0.15s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'white'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#8097a8'; }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>{item.icon}</span>
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <div style={{ color: 'white', fontSize: '16px', fontWeight: '600', marginBottom: '16px', paddingBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>{t.contact}</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {[
                { label: '+998 71 212-62-05', href: 'tel:+998712126205',                          icon: 'call'        },
                { label: '+998 71 200-00-44', href: 'tel:+998712000044',                          icon: 'call'        },
                { label: '+998 71 233-35-09', href: 'fax:+998712333509',                          icon: 'fax'         },
                { label: 'info@cbu.uz',       href: 'mailto:info@cbu.uz',                         icon: 'mail'        },
                { label: t.addressS,          href: 'https://maps.app.goo.gl/4qDXnjgQoTwfWCg28', icon: 'location_on' },
              ].map(item => (
                <li key={item.href} style={{ marginBottom: '9px' }}>
                  <a href={item.href}
                    style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '14px', color: '#8097a8', textDecoration: 'none', transition: 'color 0.15s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'white'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#8097a8'; }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>{item.icon}</span>
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

      {/* ════════════════════════════ MODALS ════════════════════════════ */}

      {/* Edit User Modal */}
      {editModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(7,30,46,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)', padding: '16px' }}
          onClick={() => setEditModal(null)}>
          <div onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ background: 'white', borderRadius: '20px', padding: '32px', width: '580px', maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', border: '1px solid #e2e8f0', animation: 'modalIn 0.2s ease' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#0a3b5c', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '22px', color: '#0369a1' }}>edit</span>
                  {t.editUserTitle}
                </h2>
                <button onClick={() => setEditModal(null)} style={{ border: 'none', background: '#f1f5f9', cursor: 'pointer', color: '#64748b', width: '34px', height: '34px', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>×</button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: '#f0f9ff', borderRadius: '10px', marginBottom: '22px', border: '1px solid #bae6fd' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg,#0a3b5c,#1a5080)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '14px', fontWeight: '700', flexShrink: 0 }}>
                  {(editModal.first_name[0] ?? '').toUpperCase()}{(editModal.last_name[0] ?? '').toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: '600', color: '#0a3b5c', fontSize: '14px' }}>{editModal.first_name} {editModal.last_name}</div>
                  <div style={{ color: '#64748b', fontSize: '12px' }}>@{editModal.username}</div>
                </div>
              </div>
              {UserFormFields({ form: editForm, onChange: setEditForm })}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button onClick={() => setEditModal(null)} style={{ padding: '11px 22px', fontSize: '14px', fontWeight: '500', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '10px', cursor: 'pointer' }}>{t.cancel}</button>
                <button onClick={handleSaveEdit} disabled={!hasChanges || isSaving}
                  style={{ padding: '11px 22px', fontSize: '14px', fontWeight: '600', background: !hasChanges || isSaving ? '#94a3b8' : 'linear-gradient(135deg,#0a3b5c,#1a5080)', color: 'white', border: 'none', borderRadius: '10px', cursor: !hasChanges || isSaving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '17px', animation: isSaving ? 'spin 1.5s linear infinite' : 'none' }}>{isSaving ? 'hourglass_empty' : 'save'}</span>
                  {isSaving ? t.saving : t.save}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {addModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(7,30,46,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)', padding: '16px' }}
          onClick={() => setAddModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ background: 'white', borderRadius: '20px', padding: '32px', width: '580px', maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', border: '1px solid #e2e8f0', animation: 'modalIn 0.2s ease' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#0a3b5c', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '22px', color: '#065f46' }}>person_add</span>
                  {t.addUserTitle}
                </h2>
                <button onClick={() => setAddModal(false)} style={{ border: 'none', background: '#f1f5f9', cursor: 'pointer', color: '#64748b', width: '34px', height: '34px', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>×</button>
              </div>
              {UserFormFields({
                form: addForm, onChange: setAddForm, showPassword: true,
                passwordVal: addForm.password, confirmVal: addForm.confirmPassword,
                onPasswordChange: (v: string) => setAddForm(f => ({ ...f, password: v })),
                onConfirmChange:  (v: string) => setAddForm(f => ({ ...f, confirmPassword: v })),
                showPw: apShow.password, showConfirm: apShow.confirm,
                onToggleShowPw:      () => setApShow(s => ({ ...s, password: !s.password })),
                onToggleShowConfirm: () => setApShow(s => ({ ...s, confirm:  !s.confirm  })),
              })}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button onClick={() => setAddModal(false)} style={{ padding: '11px 22px', fontSize: '14px', fontWeight: '500', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '10px', cursor: 'pointer' }}>{t.cancel}</button>
                <button onClick={handleAddUser}
                  disabled={isAdding || !addForm.username || !addForm.first_name || !addForm.last_name || !addForm.department || !addForm.password || addForm.password !== addForm.confirmPassword}
                  style={{ padding: '11px 22px', fontSize: '14px', fontWeight: '600', background: isAdding || !addForm.username || !addForm.first_name || !addForm.last_name || !addForm.department || !addForm.password || addForm.password !== addForm.confirmPassword ? '#94a3b8' : 'linear-gradient(135deg,#065f46,#047857)', color: 'white', border: 'none', borderRadius: '10px', cursor: isAdding ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '17px', animation: isAdding ? 'spin 1.5s linear infinite' : 'none' }}>{isAdding ? 'hourglass_empty' : 'person_add'}</span>
                  {isAdding ? t.adding : t.addUser}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Password Modal */}
      {passwordModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(7,30,46,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)', padding: '16px' }}
          onClick={() => setPasswordModal(null)}>
          <div onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ background: 'white', borderRadius: '20px', padding: '32px', width: '460px', maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', border: '1px solid #e2e8f0', animation: 'modalIn 0.2s ease' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#0a3b5c', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '22px', color: '#854d0e' }}>lock_reset</span>
                  {t.changePasswordTitle}
                </h2>
                <button onClick={() => setPasswordModal(null)} style={{ border: 'none', background: '#f1f5f9', cursor: 'pointer', color: '#64748b', width: '34px', height: '34px', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>×</button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: '#fefce8', borderRadius: '10px', marginBottom: '22px', border: '1px solid #fde68a' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#854d0e' }}>person</span>
                <div>
                  <div style={{ fontWeight: '600', color: '#0a3b5c', fontSize: '14px' }}>{passwordModal.first_name} {passwordModal.last_name}</div>
                  <div style={{ color: '#64748b', fontSize: '12px' }}>@{passwordModal.username}</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>{t.passwordLabel}</label>
                  <div style={{ position: 'relative' }}>
                    <input type={pwShow.password ? 'text' : 'password'} style={{ ...modalInputStyle, paddingRight: '40px' }}
                      value={pwForm.password} onChange={e => setPwForm(f => ({ ...f, password: e.target.value }))} placeholder={t.passwordPlaceholder} />
                    <button type="button" onClick={() => setPwShow(s => ({ ...s, password: !s.password }))} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>{pwShow.password ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                  <PasswordStrengthBar password={pwForm.password} />
                </div>
                <div>
                  <label style={labelStyle}>{t.confirmPasswordLabel}</label>
                  <div style={{ position: 'relative' }}>
                    <input type={pwShow.confirm ? 'text' : 'password'} style={{ ...modalInputStyle, paddingRight: '40px', borderColor: pwForm.confirm && pwForm.confirm !== pwForm.password ? '#ef4444' : '#e2e8f0' }}
                      value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} placeholder={t.confirmPasswordPlaceholder} />
                    <button type="button" onClick={() => setPwShow(s => ({ ...s, confirm: !s.confirm }))} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>{pwShow.confirm ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                  {pwForm.confirm && pwForm.confirm !== pwForm.password && (
                    <div style={{ marginTop: '4px', fontSize: '12px', color: '#ef4444' }}>{t.passwordMismatch}</div>
                  )}
                </div>
                <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: '8px', fontSize: '12px', color: '#64748b', border: '1px solid #e2e8f0' }}>
                  {t.passwordRequirements}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button onClick={() => setPasswordModal(null)} style={{ padding: '11px 22px', fontSize: '14px', fontWeight: '500', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '10px', cursor: 'pointer' }}>{t.cancel}</button>
                <button onClick={handleChangePassword}
                  disabled={isChangingPw || !pwForm.password || pwForm.password !== pwForm.confirm || !isPasswordStrong(pwForm.password)}
                  style={{ padding: '11px 22px', fontSize: '14px', fontWeight: '600', background: isChangingPw || !pwForm.password || pwForm.password !== pwForm.confirm || !isPasswordStrong(pwForm.password) ? '#94a3b8' : 'linear-gradient(135deg,#854d0e,#92400e)', color: 'white', border: 'none', borderRadius: '10px', cursor: isChangingPw ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '17px', animation: isChangingPw ? 'spin 1.5s linear infinite' : 'none' }}>{isChangingPw ? 'hourglass_empty' : 'lock_reset'}</span>
                  {isChangingPw ? t.changing : t.changePassword}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {deleteModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(7,30,46,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)', padding: '16px' }}
          onClick={() => setDeleteModal(null)}>
          <div onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ background: 'white', borderRadius: '20px', padding: '32px', width: '480px', maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', border: '1px solid #e2e8f0', animation: 'modalIn 0.2s ease' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#0a3b5c', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '22px', color: '#dc2626' }}>warning</span>
                  {t.deleteUserTitle}
                </h2>
                <button onClick={() => setDeleteModal(null)} style={{ border: 'none', background: '#f1f5f9', cursor: 'pointer', color: '#64748b', width: '34px', height: '34px', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>×</button>
              </div>
              <div style={{ marginBottom: '24px', padding: '18px', background: '#fef2f2', borderRadius: '12px', border: '1px solid #fee2e2' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                  <span className="material-symbols-outlined" style={{ color: '#dc2626', fontSize: '18px' }}>info</span>
                  <strong style={{ color: '#0f172a', fontSize: '14px' }}>{t.deleteConfirm}</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingLeft: '4px', marginBottom: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg,#0a3b5c,#1a5080)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '13px', fontWeight: '700', border: '2px solid #94a3b8', flexShrink: 0 }}>
                    {(deleteModal.first_name[0] ?? '').toUpperCase()}{(deleteModal.last_name[0] ?? '').toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: '600', color: '#0a3b5c', fontSize: '14px' }}>{deleteModal.first_name} {deleteModal.last_name}</div>
                    <div style={{ color: '#64748b', fontSize: '12px' }}>@{deleteModal.username} · {deleteModal.department}</div>
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: '#dc2626', fontWeight: '600' }}>{t.deleteWarning}</p>
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button onClick={() => setDeleteModal(null)} style={{ padding: '11px 22px', fontSize: '14px', fontWeight: '500', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '10px', cursor: 'pointer' }}>{t.cancel}</button>
                <button onClick={handleDeleteUser} disabled={isDeleting}
                  style={{ padding: '11px 22px', fontSize: '14px', fontWeight: '600', background: isDeleting ? '#94a3b8' : '#dc2626', color: 'white', border: 'none', borderRadius: '10px', cursor: isDeleting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '17px', animation: isDeleting ? 'spin 1.5s linear infinite' : 'none' }}>{isDeleting ? 'hourglass_empty' : 'delete'}</span>
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
        @keyframes spin    { from { transform: rotate(0deg); }                         to { transform: rotate(360deg); } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(20px); }         to { opacity: 1; transform: translateX(0); } }
        @keyframes dropIn  { from { opacity: 0; transform: translateY(-8px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes modalIn { from { opacity: 0; transform: scale(0.93); }              to { opacity: 1; transform: scale(1); } }
        input:focus, select:focus { border-color: #0a3b5c !important; box-shadow: 0 0 0 3px rgba(10,59,92,0.1); }
        input[type="date"]::-webkit-calendar-picker-indicator { cursor: pointer; opacity: 0.7; }
        nav::-webkit-scrollbar { height: 0; }
        select option { background: white; color: #0f172a; }
      `}</style>
    </div>
  );
};

export default AdminUsersPage;