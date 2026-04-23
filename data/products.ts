import { ARCHIVE_CATEGORIES, getArchiveImageSrc } from "@/lib/archive-data";

export type GiftTier = "standard" | "premium" | "luxury";

export interface Product {
  slug: string;
  sku: string;
  name: string;
  shortDescription: string;
  contents: string[];
  price?: string;
  category?: string;
  giftTier: GiftTier; // تصنيف الهدية: قياسية، مميزة، فاخرة
  images: string[];
  /** صورة كتالوج للطباعة (HD) — رابط مباشر للصورة */
  catalogImage?: string;
  availableQuantity?: number; // الكمية المتوفرة
  archived?: boolean; // يُضبط عبر التحديث (PUT)؛ زر الحذف في الداشبورد يزيل الصف من القاعدة
  hidden?: boolean; // إخفاء عن الموقع الرسمي (يبقى في الداشبورد)
  createdAt?: string; // من قاعدة البيانات (اختياري)
  updatedAt?: string; // من قاعدة البيانات (اختياري)
}

/** slug آمن من اسم فئة الأرشيف */
function slugFromArchiveCategory(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const ARCHIVE_DESCRIPTIONS: Record<string, string> = {
  "درع جلد بني صغير":
    "درع تكريمي بحجم عملي بتغليف جلدي بني، مناسب للمكاتب والتكريمات اليومية.",
  "درع جلد اخضر صحن":
    "درع بشكل صحن أنيق مع تفاصيل جلدية خضراء، يجمع الأصالة بلمسة عصرية.",
  "درع ورقة وريشة":
    "تصميم فني يجمع ورقة وريشة بحرفية دقيقة، مثالي للديكور والإهداء الثقافي.",
  "صدوق مصب قهوة وفناجين":
    "صندوق فاخر لمضب القهوة والفناجين، يناسب الضيافة العربية والهدايا الرسمية.",
  "شنطا يدوية":
    "شنطة يدوية أنيقة من مجموعتنا، عملية وأنيقة للاستخدام اليومي والهدايا.",
  "صندوق بروكار شنطا مصدفة":
    "صندوق بروكار مزين بالصدف بتصميم شنطة، قطعة فاخرة للتقديم والإهداء.",
  "صندوق بروكار كبير":
    "صندوق بروكار بحجم كبير، مناسب للمجموعات والهدايا المؤسسية الفاخرة.",
  "صندوق دفتر وقلم":
    "طقم دفتر وقلم في صندوق أنيق، مثالي للمكاتب والتخرج والمناسبات المهنية.",
  "صندوق دلة":
    "صندوق مخصص لدلة القهوة التراثية، يعكس الهوية والضيافة العربية الأصيلة.",
  "صندوق شاشة":
    "صندوق تقديم أنيق يناسب الشاشات والقطع التقنية، تصميم عصري للهدايا الرسمية.",
  "صندوق مستطيل خشب ثقيل":
    "صندوق خشبي ثقيل بجودة عالية، يدوم طويلاً ويليق بالهدايا القيّمة.",
  "صندوق مبخرة نحاسية":
    "صندوق لمبخرة نحاسية بتفاصيل تراثية، للمنزل أو المكتب المميز.",
  "صندوق تمر فاخر 3":
    "تنسيق فاخر للتمر بثلاثة مستويات، هدية راقية لرمضان والمناسبات.",
  "صندوق تمر وسجادة صلاة 2":
    "مجموعة تجمع التمر الفاخر مع سجادة صلاة في تغليف واحد أنيق.",
  "فولدر جديد":
    "فولدر وثائق بتصميم حديث، عملي للمؤتمرات والمكاتب والهدايا الترويجية.",
  "فولدر شكلة":
    "فولدر بشكل مميز، يجمع الأناقة والوظيفية في قطعة واحدة.",
  "لوحة الجامع الاموي":
    "لوحة فنية لمعلم الجامع الأموي، تعبير عن التراث الدمشقي الأصيل.",
  "لوحة قلعة حلب":
    "لوحة تذكارية لقلعة حلب، رمز حضاري لعشاق التاريخ والمعالم.",
  "مبخرة عامودية":
    "مبخرة عامودية أنيقة من التراث العربي، قطعة ديكور وروائح زكية.",
  "مبخرة سكي لاين":
    "مبخرة بتصميم أفق مدني عصري يلتقي بروح التراث.",
};

function defaultArchiveDescription(name: string): string {
  return `قطعة من أرشيف صور المعرض: ${name}. للمعاينة؛ السعر والتوفر حسب الاستفسار.`;
}

function buildArchiveCatalogProducts(): Product[] {
  return ARCHIVE_CATEGORIES.map((cat, idx) => {
    const slug = `archive-${slugFromArchiveCategory(cat.name)}`;
    const sku = `G${String(9 + idx).padStart(2, "0")}`;
    const images = cat.images.map((filename) => getArchiveImageSrc(cat.name, filename));
    const shortDescription =
      ARCHIVE_DESCRIPTIONS[cat.name] ?? defaultArchiveDescription(cat.name);
    const isLuxury =
      cat.name.includes("فاخر") ||
      cat.name.includes("بروكار") ||
      cat.name.includes("مصدف");
    return {
      slug,
      sku,
      name: cat.name,
      shortDescription,
      contents: [cat.name, "معاينة من أرشيف الصور", "السعر والتوفر حسب الطلب"],
      category: "أرشيف الصور",
      giftTier: isLuxury ? ("luxury" as const) : ("premium" as const),
      images,
      availableQuantity: 10 + (idx % 6),
    };
  });
}

/** منتجات تعتمد صور مجلد public/archive-images (أرشيف التصوير) */
export function isArchiveCatalogProduct(product: Product): boolean {
  return (product.images ?? []).some(
    (src) => typeof src === "string" && src.includes("/archive-images/")
  );
}

export const products: Product[] = [
  {
    slug: "damascus-inlaid-sword",
    sku: "G01",
    name: "سيف دمشقي مُصدَّف",
    shortDescription:
      "هدية تراثية فاخرة تعكس الأصالة والقيمة التاريخية، سيف دمشقي مُطعَّم بالصدف ومصنوع بحرفية عالية، مثالي للإهداء في المناسبات الرسمية والتكريمات الخاصة. قطعة راقية تعبّر عن القوة والهيبة والذوق الرفيع.",
    contents: [
      "سيف دمشقي مُصدَّف",
      "غِمد أنيق",
      "صندوق / تغليف فاخر",
      "بطاقة إهداء مخصصة",
    ],
    price: "2,500 ر.س",
    category: "تراثي",
    giftTier: "luxury",
    images: ["/images/السيف الدمشقي.jpg"],
    availableQuantity: 5,
  },
  {
    slug: "syrian-landmarks-shield",
    sku: "G02",
    name: "درع معالم سوريا",
    shortDescription:
      "درع فاخر منقوش عليه أبرز المعالم السورية التاريخية والأثرية، مصنوع من مواد عالية الجودة بتصميم أنيق يعكس عراقة الحضارة السورية. هدية مثالية للتكريمات والمناسبات الوطنية.",
    contents: [
      "درع معالم سوريا",
      "قاعدة خشبية فاخرة",
      "صندوق تغليف أنيق",
      "بطاقة تعريفية",
    ],
    price: "1,800 ر.س",
    category: "تراثي",
    giftTier: "premium",
    images: ["/images/درع معالم سوريا.jpg"],
    availableQuantity: 8,
  },
  {
    slug: "damascus-rose-incense-burner",
    sku: "G03",
    name: "مبخرة وردة دمشقية",
    shortDescription:
      "مبخرة أنيقة على شكل وردة دمشقية، مصنوعة بحرفية عالية من النحاس المطلي، تعكس التراث الدمشقي الأصيل. قطعة ديكورية فاخرة تضيف لمسة من الأناقة والعراقة لأي مكان.",
    contents: [
      "مبخرة وردة دمشقية",
      "قاعدة نحاسية",
      "صندوق هدية فاخر",
      "بطاقة تعريفية",
    ],
    price: "950 ر.س",
    category: "تراثي",
    giftTier: "standard",
    images: ["/images/مبخرة وردة دمشقية.jpg"],
    availableQuantity: 12,
  },
  {
    slug: "revolution-flag-sculpture",
    sku: "G04",
    name: "مجسم علم الثورة",
    shortDescription:
      "مجسم فني أنيق لعلم الثورة السورية، مصنوع بدقة عالية من مواد فاخرة، يعبر عن القيم الوطنية والانتماء. هدية راقية تصلح للمكاتب والمنازل والمناسبات الخاصة.",
    contents: [
      "مجسم علم الثورة",
      "قاعدة فاخرة",
      "صندوق تغليف أنيق",
      "بطاقة تعريفية",
    ],
    price: "1,200 ر.س",
    category: "تراثي",
    giftTier: "premium",
    images: ["/images/مجسم علم الثورة.jpg"],
    availableQuantity: 6,
  },
  {
    slug: "umayyad-mosque-monument",
    sku: "G05",
    name: "معلم الجامع الأموي",
    shortDescription:
      "مجسم فني دقيق لمعلم الجامع الأموي الشهير في دمشق، أحد أبرز المعالم الإسلامية والتاريخية. مصنوع بحرفية عالية من مواد فاخرة، يضفي لمسة من الأصالة والعراقة.",
    contents: [
      "مجسم الجامع الأموي",
      "قاعدة خشبية فاخرة",
      "صندوق تغليف أنيق",
      "بطاقة تعريفية بالمعلم",
    ],
    price: "1,500 ر.س",
    category: "تراثي",
    giftTier: "premium",
    images: ["/images/معلم الجامع الاموي.jpg"],
    availableQuantity: 10,
  },
  {
    slug: "homs-clock-monument",
    sku: "G06",
    name: "معلم ساعة حمص",
    shortDescription:
      "مجسم فني أنيق لساعة حمص الشهيرة، أحد أبرز المعالم التاريخية في المدينة. مصنوع بدقة عالية من مواد فاخرة، يعكس التراث الحمصي الأصيل. هدية مثالية لعشاق التراث والتاريخ.",
    contents: [
      "مجسم ساعة حمص",
      "قاعدة فاخرة",
      "صندوق تغليف أنيق",
      "بطاقة تعريفية",
    ],
    price: "1,300 ر.س",
    category: "تراثي",
    giftTier: "premium",
    images: ["/images/معلم ساعة حمص.jpg"],
    availableQuantity: 7,
  },
  {
    slug: "flags-of-nations",
    sku: "G07",
    name: "أعلام الدول",
    shortDescription:
      "مجموعة فاخرة من أعلام الدول مصنوعة بدقة عالية من مواد عالية الجودة. مثالية للديكور والمكاتب والمؤسسات الدولية. تصميم أنيق يعكس التنوع الثقافي والانفتاح على العالم.",
    contents: [
      "مجموعة أعلام الدول",
      "قاعدة أو حامل فاخر",
      "صندوق تغليف أنيق",
      "بطاقة تعريفية",
    ],
    price: "2,200 ر.س",
    category: "تراثي",
    giftTier: "luxury",
    images: ["/images/اعلام الدول.jpg"],
    availableQuantity: 3,
  },
  {
    slug: "vip-package",
    sku: "G08",
    name: "بكج VIP",
    shortDescription:
      "باقة VIP فاخرة تجمع بين أفضل الهدايا التراثية والأنيقة في مجموعة واحدة. مثالية للهدايا الرسمية والتكريمات الخاصة. كل قطعة مختارة بعناية لتعكس الذوق الرفيع والأصالة.",
    contents: [
      "مجموعة منتقاة من الهدايا الفاخرة",
      "صندوق هدية فاخر",
      "بطاقة إهداء مخصصة",
      "شهادة أصالة",
    ],
    price: "5,000 ر.س",
    category: "فاخر",
    giftTier: "luxury",
    images: ["/images/بكج vip.jpg"],
    availableQuantity: 2,
  },
  {
    slug: "catalog-luxury-gift-boxes",
    sku: "G29",
    name: "صناديق هدايا وتغليف فاخرة",
    shortDescription:
      "مجموعة صور لصناديق هدايا وتغليف راقٍ: خشب، جلد، ألوان زيتونية وأسود، مع بطانات مخملية وفواصل داخلية، وطقم مبخرة بإطار ذهبي — مناسبة للهدايا الرسمية والتجارية والمناسبات الخاصة.",
    contents: [
      "صناديق خشبية ومبطنة بعدة أشكال",
      "صناديق جلدية بتفاصيل ذهبية",
      "تنسيقات لعطور وهدايا تنفيذية",
    ],
    price: "حسب الطلب",
    category: "تغليف وهدايا",
    giftTier: "luxury",
    images: [
      "/images/catalog-batch/batch-01.png",
      "/images/catalog-batch/batch-02.png",
      "/images/catalog-batch/batch-05.png",
      "/images/catalog-batch/batch-12.png",
      "/images/catalog-batch/batch-15.png",
      "/images/catalog-batch/batch-20.png",
      "/images/catalog-batch/batch-25.png",
    ],
    availableQuantity: 5,
  },
  {
    slug: "catalog-box-olive-eagle-black-inlay",
    sku: "G45",
    name: "صندوق زيتوني — غطاء أسود ونسر ذهبي",
    shortDescription:
      "صندوق مربع بلون زيتوني هادئ، غطاء بلوحة سوداء منقوشة ونسر وثلاث نجوم ذهبية — مناسب لساعة أو مجوهرات أو هدية رسمية.",
    contents: ["صندوق تغليف فاخر", "تفاصيل ذهبية على الغطاء", "تصوير احترافي للمعاينة"],
    price: "حسب الطلب",
    category: "تغليف وهدايا",
    giftTier: "luxury",
    images: ["/images/catalog-batch/batch-24.png"],
    availableQuantity: 5,
  },
  {
    slug: "catalog-box-brown-stitched-suede",
    sku: "G46",
    name: "صندوق هدايا بني بخياطة ديكور",
    shortDescription:
      "صندوق مربع بلون بني شوكولاتي بنسيج مخملي أو سويدي، بخياطة فاتحة على الغطاء ومربع مركزي — مظهر أنيق للهدايا الشخصية.",
    contents: ["صندوق بغطاء متناسق", "خياطة زخرفية", "قاعدة بلون تان خفيف"],
    price: "حسب الطلب",
    category: "تغليف وهدايا",
    giftTier: "luxury",
    images: ["/images/catalog-batch/batch-03.png"],
    availableQuantity: 5,
  },
  {
    slug: "catalog-wood-box-gold-geometry",
    sku: "G47",
    name: "صندوق خشب داكن بزخرفة ذهبية هندسية",
    shortDescription:
      "صندوق خشبي بقشرة داكنة صقيل، غطاء بلوحة معدنية ذهبية بنمط هندسي تقليدي ومساحة مركزية للنقش — فخامة وهوية شرقية.",
    contents: ["هيكل خشب صلب", "لوحة غطاء ذهبية", "مناسب للإهداء الرسمي"],
    price: "حسب الطلب",
    category: "تغليف وهدايا",
    giftTier: "luxury",
    images: ["/images/catalog-batch/batch-06.png"],
    availableQuantity: 4,
  },
  {
    slug: "catalog-wood-box-gold-eagle-plaque",
    sku: "G48",
    name: "صندوق خشب بلوحة ذهبية ونسر",
    shortDescription:
      "صندوق خشبي داكن بلوحة ذهبية كبيرة منقوشة، نسر بجناحين مفتوحين وشعار وطني صغير — قطعة تذكارية أو هدية بروتوكول.",
    contents: ["صندوق خشب فاخر", "لوحة معدنية مزخرفة", "تفاصيل رسمية على الغطاء"],
    price: "حسب الطلب",
    category: "تغليف وهدايا",
    giftTier: "luxury",
    images: ["/images/catalog-batch/batch-23.png"],
    availableQuantity: 3,
  },
  {
    slug: "catalog-flag-trophy-display-case",
    sku: "G49",
    name: "مجسم علم في صندوق عرض مخملي",
    shortDescription:
      "صندوق عرض أسود/رمادي ببطانة مخملية، يحتوي مجسم علم على عمود ذهبي وقاعدة فنية — مناسب للتكريم والعرض المكتبي.",
    contents: ["صندوق عرض بأبواب جانبية", "مجسم علم معدني", "قاعدة خشبية ولوحة تذكارية"],
    price: "حسب الطلب",
    category: "تكريمات",
    giftTier: "luxury",
    images: ["/images/catalog-batch/batch-04.png"],
    availableQuantity: 3,
  },
  {
    slug: "catalog-perfume-quartet-black-box",
    sku: "G50",
    name: "طقم عطور — أربع زجاجات في صندوق أسود",
    shortDescription:
      "صندوق أسود بنسيج سافيانو وبطانة بيج، يضم أربع زجاجات مستطيلة بأغطية كروية (أسود مطفي وعنبر شفاف) — إهداء فاخر بلا شعارات ظاهرة.",
    contents: ["صندوق تغليف صلب", "أربع زجاجات عطر أو زيت", "تنسيق صف واحد"],
    price: "حسب الطلب",
    category: "تغليف وهدايا",
    giftTier: "luxury",
    images: ["/images/catalog-batch/batch-08.png"],
    availableQuantity: 4,
  },
  {
    slug: "catalog-executive-green-gift-set",
    sku: "G51",
    name: "طقم تنفيذي — صندوق أخضر بزوايا ذهبية",
    shortDescription:
      "صندوق جلدي أخضر غامق بزوايا معدنية ذهبية، فتحات مخصصة لشارة نسر، حلقة مفاتيح، وقلم — هدية مؤسسية أنيقة.",
    contents: ["صندوق بفواصل داخلية", "إكسسوارات معدنية", "قلم بحفر أو طباعة حسب الطلب"],
    price: "حسب الطلب",
    category: "تغليف وهدايا",
    giftTier: "luxury",
    images: ["/images/catalog-batch/batch-07.png"],
    availableQuantity: 4,
  },
  {
    slug: "catalog-green-leather-eagle-case",
    sku: "G52",
    name: "علبة جلدية خضراء — نسر ونجوم ذهبية",
    shortDescription:
      "علبة أفقية جلدية أو جلد صناعي بلون زيتوني، نسر ذهبي في المنتصف وثلاث نجوم، وزوايا ذهبية مزخرفة — تغليف رجالي فاخر.",
    contents: ["غلاف صلب", "شعار نسر بارز", "زوايا حماية معدنية"],
    price: "حسب الطلب",
    category: "تغليف وهدايا",
    giftTier: "luxury",
    images: ["/images/catalog-batch/batch-10.png"],
    availableQuantity: 5,
  },
  {
    slug: "catalog-wood-box-arabic-nacre-inlay",
    sku: "G53",
    name: "صندوق خشب بخط عربي لؤلؤي",
    shortDescription:
      "صندوق خشب بني داكن بخط عربي منمق مطعّم بلؤلؤ أو صدف يتلألأ — قطعة حرفية للإهداء والديكور.",
    contents: ["غطاء منحوت بزخرفة عربية", "خشب مصقول", "لمسة تراثية راقية"],
    price: "حسب الطلب",
    category: "تراثي",
    giftTier: "luxury",
    images: ["/images/catalog-batch/batch-11.png"],
    availableQuantity: 4,
  },
  {
    slug: "catalog-award-plaque-gold-mosaic",
    sku: "G54",
    name: "درع تذكاري — برواز ذهبي وفسيفساء",
    shortDescription:
      "درع على قاعدة خشبية بلوحة نقش ذهبية وشعار رسمي، وجزء علوي برواز ذهبي وفسيفساء ملوّنة — مناسب للتكريم والمناسبات الرسمية.",
    contents: ["قاعدة خشبية", "لوحة نقش", "تاج علوي مزخرف"],
    price: "حسب الطلب",
    category: "تكريمات",
    giftTier: "luxury",
    images: ["/images/catalog-batch/batch-09.png"],
    availableQuantity: 2,
  },
  {
    slug: "catalog-wood-box-round-arabic-calligraphy",
    sku: "G55",
    name: "صندوق خشب — خط عربي دائري لامع",
    shortDescription:
      "صندوق خشب بني متوسط اللون بخط عربي دائري مطعّم بلون فاتح لامع (صدف أو فضة)، تصميم هادئ للزواج والمناسبات العائلية.",
    contents: ["غطاء بدائرة خط عربي", "خشب ببريق معتدل", "إهداء رمزي"],
    price: "حسب الطلب",
    category: "تراثي",
    giftTier: "luxury",
    images: ["/images/catalog-batch/batch-16.png"],
    availableQuantity: 4,
  },
  {
    slug: "catalog-black-saffiano-gift-box",
    sku: "G56",
    name: "صندوق أسود بنسيج سافيانو",
    shortDescription:
      "صندوق مستطيل أسود بنسيج متقاطع أنيق (سافيانو)، غطاء متناسق مع القاعدة — تغليف عصري للهدايا والمنتجات الفاخرة.",
    contents: ["صندوق صلب بغطاء محكم", "لمسة جلدية راقية", "خلفية تصوير بيضاء نظيفة"],
    price: "حسب الطلب",
    category: "تغليف وهدايا",
    giftTier: "premium",
    images: ["/images/catalog-batch/batch-13.png"],
    availableQuantity: 6,
  },
  {
    slug: "catalog-green-folders-portfolios",
    sku: "G32",
    name: "فولدرات وملفات جلدية خضراء",
    shortDescription:
      "فولدرات وملفات بلون زيتوني أنيق، بنسيج متقاطع وجيوب داخلية وحامل قلم — مثالية للمكاتب والمنيو والوثائق الرسمية.",
    contents: ["فولدر ثنائي أو متعدد الجيوب", "نسيج متين بخياطة متناسقة", "خيارات مسطحة أو مفتوحة للعرض"],
    price: "حسب الطلب",
    category: "مكتبي",
    giftTier: "premium",
    images: [
      "/images/catalog-batch/batch-14.png",
      "/images/catalog-batch/batch-17.png",
      "/images/catalog-batch/batch-18.png",
      "/images/catalog-batch/batch-19.png",
      "/images/catalog-batch/batch-21.png",
      "/images/catalog-batch/batch-22.png",
    ],
    availableQuantity: 8,
  },
  {
    slug: "catalog-oriental-soap-gift-sets",
    sku: "G33",
    name: "مجموعات صابون طبيعي عطري",
    shortDescription:
      "هدايا صابون طبيعي بعطور شرقية: علب السبيكة القديمة وسبائك الشرق، بألوان ورقية وربط خيش — ياسمين شامي، رمان، عود وعنبر، لافندر، بابونج، وردة دمشقية وغيرها.",
    contents: ["علبة هدايا بعدة روائح", "صابون ملفوف يدوياً بخيش", "تصميم شرقي فاخر"],
    price: "حسب الطلب",
    category: "عناية وهدايا",
    giftTier: "standard",
    images: [
      "/images/catalog-batch/batch-26.png",
      "/images/catalog-batch/batch-27.png",
      "/images/catalog-batch/batch-29.png",
    ],
    availableQuantity: 12,
  },
  {
    slug: "catalog-aleppo-laurel-soap",
    sku: "G34",
    name: "صابون غار حلبي — عنبر السلطان",
    shortDescription:
      "صابون غار طبيعي من حلب باسم «عنبر السلطان»، بزيت زيتون وزيت غار ومكوّنات طبيعية، بتغليف كرتوني وزخرفة جانبية تقليدية — مناسب كهدية أو استخدام يومي.",
    contents: ["صابون غار طبيعي", "تغليف كرتوني مزخرف", "من إنتاج حلب"],
    price: "حسب الطلب",
    category: "عناية وهدايا",
    giftTier: "standard",
    images: [
      "/images/catalog-batch/batch-28.png",
      "/images/catalog-batch/batch-30.png",
      "/images/catalog-batch/batch-31.png",
    ],
    availableQuantity: 15,
  },
  ...buildArchiveCatalogProducts(),
];

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((product) => product.slug === slug);
}

export function getProductBySku(sku: string): Product | undefined {
  return products.find((p) => p.sku === sku || p.sku.toUpperCase() === sku.toUpperCase());
}

export function getProductsByCategory(category: string): Product[] {
  return products.filter((product) => product.category === category);
}

export function getAllCategories(): string[] {
  const categories = products
    .map((product) => product.category)
    .filter((cat): cat is string => cat !== undefined);
  return Array.from(new Set(categories));
}

export function getAllGiftTiers(): GiftTier[] {
  return ["standard", "premium", "luxury"];
}

export function getGiftTierLabel(tier: GiftTier): string {
  const labels: Record<GiftTier, string> = {
    standard: "قياسية",
    premium: "مميزة",
    luxury: "فاخرة",
  };
  return labels[tier];
}

export function getProductsByGiftTier(tier: GiftTier): Product[] {
  return products.filter((product) => product.giftTier === tier);
}

// توليد SKU تلقائياً
export function generateNextSKU(): string {
  // استخراج جميع أرقام SKU الموجودة
  const skuNumbers = products
    .map((p) => {
      const match = p.sku.match(/G(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter((num) => num > 0);

  // العثور على أكبر رقم
  const maxNumber = skuNumbers.length > 0 ? Math.max(...skuNumbers) : 0;

  // توليد الرقم التالي
  const nextNumber = maxNumber + 1;

  // إرجاع SKU بالتنسيق G01, G02, G03...
  return `G${nextNumber.toString().padStart(2, "0")}`;
}

