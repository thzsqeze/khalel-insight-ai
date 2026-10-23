import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
export function createTrackingCode(){return randomBytes(24).toString('base64url');}
export function hashTrackingCode(value:string){return createHash('sha256').update(value.trim()).digest('hex');}
const safeCapitalized=new Set('Нестабильный Изменения Больше Доступ Обратная Оформление Освещение Места Не Нет В На У По Для Из При Мы Я Это Есть Прошу Просим Нужно Нужны Требуется Требуются Хотелось Можно Очень После Перед Во Со С О Об А Но И Как Если Когда Вообще Каждый Каждую Кафедра Университет Учебный Учебная Обновление Дополнительные Дополнительная Проверка Расписание Практические Практических Занятия Занятий Аудитория Аудитории Библиотека Библиотеки Студенты Студентам Преподаватели Преподавателям Система Сайт Портал Интернет Связь Оборудование Вопрос Проблема Предлагаю Предлагаем Недостаточно Часто Иногда Сегодня Жатақханада Сабақ Кітапханада Университетте Кесте Оқу Студенттерге Оқытушыларға Біз Мен Бұл Жаңа Қосымша Техникалық Электронды Ақпарат Интернетке Қажет Жарық Желдету'.split(' '));
export function redactForAI(original:string):{text:string;sensitiveData:boolean;safe:boolean}{
 let text=original;let sensitiveData=false;
 const redact=(pattern:RegExp)=>{text=text.replace(pattern,()=>{sensitiveData=true;return '[REDACTED]';});};
 redact(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi);
 redact(/(?:\+?\d[\d\s().-]{8,}\d)/g);
 redact(/(?:https?:\/\/|www\.)\S+/gi);
 redact(/@[\p{L}\d_]{2,}/gu);
 redact(/\b\d{6,}\b/g);
 redact(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g);
 redact(/[А-ЯЁӘҒҚҢӨҰҮҺІ][а-яёәғқңөұүһі]+(?:\s+[А-ЯЁӘҒҚҢӨҰҮҺІ][а-яёәғқңөұүһі]+)+/g);
 const capitals=text.match(/[A-ZА-ЯЁӘҒҚҢӨҰҮҺІ][a-zа-яёәғқңөұүһі]{2,}/g)??[];
 const uncertain=capitals.some(word=>!safeCapitalized.has(word));
 const identityContext=/(?:меня зовут|моя фамилия|мое имя|моё имя|аты.?жөні|есімім|фамилия|имя\s*[:=]|преподаватель\s+[а-яёәғқңөұүһі]+|студент\s+[а-яёәғқңөұүһі]+)/i.test(original);
 return {text:uncertain||identityContext?'':text,sensitiveData:sensitiveData||uncertain||identityContext,safe:!uncertain&&!identityContext};
}
export function hasContactDetails(text:string){return /@|https?:\/\/|www\.|(?:\+?\d[\d\s().-]{8,}\d)/i.test(text);}

export function isSafePublicTitle(title:string){const checked=redactForAI(title);return checked.safe&&!checked.sensitiveData&&!hasContactDetails(title);}
