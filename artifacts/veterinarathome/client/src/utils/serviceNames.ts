/**
 * Client-side translation map for service names AND descriptions that
 * come from the DB in Russian. Falls back to the Russian original.
 */
interface SvcTranslation {
  name: Record<string, string>;
  desc: Record<string, string>;
}

const SERVICE_MAP: Record<string, SvcTranslation> = {
  'Первичный осмотр': {
    name: { en: 'Primary Examination',   tr: 'Birinci Muayene',         ar: 'الفحص الأولي' },
    desc: {
      en: 'Full pet examination at your home, diagnosis',
      tr: 'Evcil hayvanın tam muayenesi ve tanı, evinizde',
      ar: 'فحص شامل لحيوانك في المنزل وتشخيص الحالة',
    },
  },
  'Вакцинация': {
    name: { en: 'Vaccination',            tr: 'Aşılama',                 ar: 'التطعيم' },
    desc: {
      en: 'Preventive vaccinations with vet passport entry',
      tr: 'Önleyici aşılar ve veteriner pasaportu kaydı',
      ar: 'تطعيمات وقائية مع تسجيل في جواز الحيوان',
    },
  },
  'Скорая ветпомощь': {
    name: { en: 'Emergency Vet Care',     tr: 'Acil Veteriner',          ar: 'رعاية بيطرية طارئة' },
    desc: {
      en: 'Emergency call-out any time of day or night',
      tr: 'Günün her saati acil veteriner çağrısı',
      ar: 'مكالمة طارئة في أي وقت من الليل أو النهار',
    },
  },
  'Забор анализов': {
    name: { en: 'Lab Tests',              tr: 'Tahlil Alma',             ar: 'أخذ عينات' },
    desc: {
      en: 'Blood, urine and other tests taken at home',
      tr: 'Kan, idrar ve diğer tahliller evde alınır',
      ar: 'فحوصات دم وبول وعينات أخرى في المنزل',
    },
  },
  'Капельница на дому': {
    name: { en: 'IV Drip at Home',        tr: 'Evde Serum',              ar: 'تنقيط وريدي منزلي' },
    desc: {
      en: 'IV medication, rehydration and supportive therapy at home',
      tr: 'Evde IV ilaç, rehidrasyon ve destekleyici tedavi',
      ar: 'حقن وريدية وإماهة وعلاج داعم في المنزل',
    },
  },
  'Передержка': {
    name: { en: 'Pet Boarding',           tr: 'Evcil Hayvan Bakımı',     ar: 'إيداع الحيوانات' },
    desc: {
      en: 'Temporary pet care under vet supervision while you\'re away',
      tr: 'Siz yokken veteriner gözetiminde geçici hayvan bakımı',
      ar: 'رعاية مؤقتة للحيوان تحت إشراف طبيبي أثناء غيابك',
    },
  },
  'Выгул животного': {
    name: { en: 'Dog Walking',            tr: 'Köpek Gezisi',            ar: 'تمشية الحيوان' },
    desc: {
      en: 'Professional dog walking — safe, caring and with a report',
      tr: 'Profesyonel köpek gezisi — güvenli, özenli ve raporlu',
      ar: 'تمشية احترافية لكلبك — آمنة وبعناية مع تقرير',
    },
  },
  'Кастрация': {
    name: { en: 'Neutering',              tr: 'Kısırlaştırma (Erkek)',    ar: 'إخصاء' },
    desc: {
      en: 'Male neutering at home or mobile surgical unit — safe, stress-free',
      tr: 'Erkek kısırlaştırma evde veya mobil ameliyathanede — güvenli, stressiz',
      ar: 'إخصاء الذكور في المنزل أو بوحدة جراحية متنقلة — آمن وبلا توتر',
    },
  },
  'Стерилизация': {
    name: { en: 'Spaying',               tr: 'Kısırlaştırma (Dişi)',     ar: 'تعقيم' },
    desc: {
      en: 'Female spaying with full post-op vet support',
      tr: 'Dişi kısırlaştırma ve tam ameliyat sonrası veteriner desteği',
      ar: 'تعقيم الإناث مع دعم طبي كامل بعد العملية',
    },
  },
  'Обработка от паразитов': {
    name: { en: 'Parasite Treatment',    tr: 'Parazit Tedavisi',         ar: 'علاج الطفيليات' },
    desc: {
      en: 'Protection against fleas, ticks and worms',
      tr: 'Pire, kene ve solucan koruması',
      ar: 'الحماية من البراغيث والقراد والديدان',
    },
  },
  'Уход и груминг': {
    name: { en: 'Grooming',              tr: 'Bakım & Tıraş',            ar: 'العناية والتهذيب' },
    desc: {
      en: 'Nail trimming, ear cleaning, wound treatment',
      tr: 'Tırnak kesimi, kulak temizliği, yara bakımı',
      ar: 'قص الأظافر وتنظيف الأذنين ومعالجة الجروح',
    },
  },
  'Хирургическая помощь': {
    name: { en: 'Surgical Care',         tr: 'Cerrahi Yardım',           ar: 'الرعاية الجراحية' },
    desc: {
      en: 'Minor surgical procedures performed at home',
      tr: 'Evde gerçekleştirilen küçük cerrahi işlemler',
      ar: 'إجراءات جراحية بسيطة تُنفَّذ في المنزل',
    },
  },
  'Консультация': {
    name: { en: 'Consultation',          tr: 'Danışmanlık',              ar: 'استشارة' },
    desc: {
      en: 'Answers to your questions and care recommendations',
      tr: 'Sorularınıza yanıtlar ve bakım önerileri',
      ar: 'إجابات على أسئلتك وتوصيات للعناية',
    },
  },
};

/** Returns a translated service name, or the Russian original. */
export function getSvcName(ruName: string, lang: string): string {
  if (lang === 'ru') return ruName;
  return SERVICE_MAP[ruName]?.name[lang] ?? ruName;
}

/** Returns a translated service description, or the Russian original. */
export function getSvcDesc(ruDesc: string, ruName: string, lang: string): string {
  if (lang === 'ru') return ruDesc;
  return SERVICE_MAP[ruName]?.desc[lang] ?? ruDesc;
}

/** All Russian service names (used for ServiceIcon lookup in footer). */
export const ALL_SERVICE_NAMES_RU = Object.keys(SERVICE_MAP);
