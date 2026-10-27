import "server-only";
import { createHash, randomBytes } from "node:crypto";
export function createTrackingCode() {
  return randomBytes(24).toString("base64url");
}
export function hashTrackingCode(value: string) {
  return createHash("sha256").update(value.trim()).digest("hex");
}
const safeCapitalized = new Set(
  "Нестабильный Изменения Больше Доступ Обратная Оформление Освещение Места Не Нет В На У По Для Из При Мы Я Это Есть Прошу Просим Нужно Нужны Требуется Требуются Хотелось Можно Очень После Перед Во Со С О Об А Но И Как Если Когда Вообще Каждый Каждую Кафедра Университет Учебный Учебная Обновление Дополнительные Дополнительная Проверка Расписание Практические Практических Занятия Занятий Аудитория Аудитории Библиотека Библиотеки Студенты Студентам Преподаватели Преподавателям Система Сайт Портал Интернет Инет Связь Оборудование Вопрос Проблема Предлагаю Предлагаем Недостаточно Часто Иногда Сегодня Жатақханада Сабақ Кітапханада Университетте Кесте Кері Оқу Студенттерге Оқытушыларға Біз Мен Бұл Жаңа Қосымша Техникалық Электронды Ақпарат Интернетке Қажет Жарық Желдету".split(
    " ",
  ),
);
const contactLabelWords = new Set(
  "мой моя мои мое моё наш наша наши телефон телефона телефоны номер номера почта email mail адрес контакты контакт связь менің біздің телефон телефоным нөмір нөмірім пошта поштам байланыс және".split(
    " ",
  ),
);
type RedactedText = {
  text: string;
  sensitiveData: boolean;
  safe: boolean;
};
function hasIdentityContext(text: string) {
  return /(?:меня зовут|моя фамилия|мое имя|моё имя|аты.?жөні|есімім|фамилия|имя\s*[:=]|преподаватель\s+[а-яёәғқңөұүһі]+|студент\s+[а-яёәғқңөұүһі]+)/i.test(
    text,
  );
}
function redactIdentifiers(original: string) {
  let text = original;
  let sensitiveData = false;
  const redact = (pattern: RegExp) => {
    text = text.replace(pattern, () => {
      sensitiveData = true;
      return "[REDACTED]";
    });
  };
  redact(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi);
  redact(/(?:\+?\d[\d\s().-]{8,}\d)/g);
  redact(/(?:https?:\/\/|www\.)\S+/gi);
  redact(/@[\p{L}\d_]{2,}/gu);
  redact(/\b\d{6,}\b/g);
  redact(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g);
  redact(/[А-ЯЁӘҒҚҢӨҰҮҺІ][а-яёәғқңөұүһі]+(?:\s+[А-ЯЁӘҒҚҢӨҰҮҺІ][а-яёәғқңөұүһі]+)+/g);
  return { text, sensitiveData };
}
export function redactForAI(original: string): RedactedText {
  const { text, sensitiveData } = redactIdentifiers(original);
  const capitals = text.match(/[A-ZА-ЯЁӘҒҚҢӨҰҮҺІ][a-zа-яёәғқңөұүһі]{2,}/g) ?? [];
  const uncertain = capitals.some((word) => !safeCapitalized.has(word));
  const identityContext = hasIdentityContext(original);
  return {
    text: uncertain || identityContext ? "" : text,
    sensitiveData: sensitiveData || uncertain || identityContext,
    safe: !uncertain && !identityContext,
  };
}

// Input may retain useful feedback after an uncertain name-like token is removed.
// Generated output and public titles must continue to use the strict checker above.
export function prepareAIInput(original: string): RedactedText {
  if (hasIdentityContext(original)) return { text: "", safe: false, sensitiveData: true };
  const identifiers = redactIdentifiers(original);
  let sensitiveData = identifiers.sensitiveData;
  const text = identifiers.text.replace(
    /\[REDACTED\]|[\p{L}\p{M}]+(?:[-’'][\p{L}\p{M}]+)*/gu,
    (word) => {
      if (word === "[REDACTED]" || !/\p{Lu}/u.test(word) || safeCapitalized.has(word)) return word;
      sensitiveData = true;
      return "[REDACTED]";
    },
  );
  const checked = redactForAI(text);
  const words = (checked.text.replaceAll("[REDACTED]", "").match(/\p{L}{2,}/gu) ?? []).filter(
    (word) => !contactLabelWords.has(word.toLowerCase()),
  );
  // Placeholders and contact labels do not count as a description of an issue.
  const useful = words.length >= 2 && words.some((word) => word.length >= 3);
  return {
    text: checked.safe && useful ? checked.text : "",
    safe: checked.safe && useful,
    sensitiveData: sensitiveData || checked.sensitiveData,
  };
}
export function hasContactDetails(text: string) {
  return /@|https?:\/\/|www\.|(?:\+?\d[\d\s().-]{8,}\d)/i.test(text);
}

export function isSafePublicTitle(title: string) {
  const checked = redactForAI(title);
  return checked.safe && !checked.sensitiveData && !hasContactDetails(title);
}
