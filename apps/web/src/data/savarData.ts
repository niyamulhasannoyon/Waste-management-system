export type ZoneType = "municipality" | "union";

export type ZoneLiveStatus =
  | "সংগ্রহ চলছে"
  | "সম্পন্ন"
  | "নির্ধারিত সময়ে"
  | "অতিরিক্ত চাপ";

export interface ServiceZone {
  id: string;
  code: string;
  name: string;
  shortName: string;
  type: ZoneType;
  neighborhoods: string[];
  schedule: string;
  frequency: string;
  vehicle: string;
  supervisor: string;
  liveStatus: ZoneLiveStatus;
  completionPercent: number;
  coordinates: { lat: string; lng: string; landmark: string };
  active: boolean;
}

export type RequestKind = "report" | "pickup";
export type RequestStatus = "পেন্ডিং" | "কালেক্টর পথে আছেন" | "সংগ্রহ সম্পন্ন";
export type PriorityLevel = "সাধারণ" | "জরুরি" | "অতি জরুরি";

export interface WasteRequest {
  id: string;
  kind: RequestKind;
  areaTag: string;
  zoneId: string;
  addressOrLandmark: string;
  wasteType: string;
  timeSlot?: string;
  quantity?: string;
  reporterPhone?: string;
  gpsLabel?: string;
  photoPreview?: string;
  photoName?: string;
  notes?: string;
  status: RequestStatus;
  priority: PriorityLevel;
  createdAtLabel: string;
  assignedCollectorId?: string;
  assignedCollectorName?: string;
}

export interface Collector {
  id: string;
  name: string;
  role: string;
  vehicle: string;
  assignedZone: string;
  phone: string;
  status: "সক্রিয়" | "মাঠে কর্মরত" | "বিরতিতে";
  activeTasks: number;
  completedToday: number;
}

export interface Hotspot {
  id: string;
  title: string;
  wardLabel: string;
  areaTag: string;
  severity: "অতি জরুরি" | "জরুরি" | "পর্যবেক্ষণে";
  estimatedLoad: string;
  lastCleared: string;
  dispatchedTeam?: string;
  clearedToday: boolean;
}

export interface RecyclingBatch {
  id: string;
  hubName: string;
  category: "জৈব ও কম্পোস্ট" | "প্লাস্টিক ও পিইটি" | "কাগজ ও কার্ডবোর্ড" | "ধাতু ও কাচ";
  weightKg: number;
  sourceZone: string;
  loggedAt: string;
}

const BANGLA_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

export function toBanglaDigits(value: number | string): string {
  return String(value).replace(/\d/g, (digit) => BANGLA_DIGITS[Number(digit)] ?? digit);
}

export const REPORT_WASTE_TYPES = [
  "রাস্তার পাশে ময়লার স্তূপ",
  "ড্রেন ও নালা বন্ধ",
  "বাজার ও দোকান বর্জ্য",
  "নির্মাণসামগ্রী ও মাটি",
  "মেডিকেল বা ঝুঁকিপূর্ণ",
] as const;

export const PICKUP_WASTE_CATEGORIES = [
  {
    value: "রান্নাঘরের ময়লা",
    hint: "সবজি, খাবার ও পচনশীল জৈব বর্জ্য",
  },
  {
    value: "প্লাস্টিক ও কাগজ",
    hint: "বোতল, প্যাকেট, কার্টন ও শুকনো বর্জ্য",
  },
  {
    value: "মিক্সড",
    hint: "সাধারণ গৃহস্থালি মিশ্র বর্জ্য",
  },
] as const;

export const PICKUP_TIME_SLOTS = [
  "সকাল ৭:০০ – ৯:০০",
  "সকাল ৯:৩০ – ১১:৩০",
  "বিকাল ৪:০০ – ৬:০০",
] as const;

export const SERVICE_ZONES: ServiceZone[] = [
  {
    id: "ward-1",
    code: "ওয়ার্ড ০১",
    name: "সাভার পৌরসভা ওয়ার্ড ০১",
    shortName: "জামসিং ও মজিদপুর",
    type: "municipality",
    neighborhoods: ["জামসিং", "উত্তর জামসিং", "মজিদপুর"],
    schedule: "সকাল ৬:৩০ – ৮:৩০",
    frequency: "প্রতিদিন",
    vehicle: "ঢাকা মেট্রো-শ ১১-০৪১২",
    supervisor: "মো. আজিজুর রহমান",
    liveStatus: "সম্পন্ন",
    completionPercent: 100,
    coordinates: { lat: "23.8614° N", lng: "90.2642° E", landmark: "জামসিং বাজার মোড়" },
    active: true,
  },
  {
    id: "ward-2",
    code: "ওয়ার্ড ০২",
    name: "সাভার পৌরসভা ওয়ার্ড ০২",
    shortName: "রেডিও কলোনি",
    type: "municipality",
    neighborhoods: ["রেডিও কলোনি", "ভাটপাড়া", "নামা বাজার"],
    schedule: "সকাল ৭:০০ – ৯:০০",
    frequency: "প্রতিদিন",
    vehicle: "ঢাকা মেট্রো-শ ১১-০৪১৫",
    supervisor: "মো. সেলিম মিয়া",
    liveStatus: "সম্পন্ন",
    completionPercent: 94,
    coordinates: { lat: "23.8548° N", lng: "90.2589° E", landmark: "রেডিও কলোনি গেট" },
    active: true,
  },
  {
    id: "ward-3",
    code: "ওয়ার্ড ০৩",
    name: "সাভার পৌরসভা ওয়ার্ড ০৩",
    shortName: "থানা রোড ও বাজার রোড",
    type: "municipality",
    neighborhoods: ["থানা রোড", "বাজার রোড", "ছায়াবীথি"],
    schedule: "সকাল ৬:০০ – ৮:০০ ও বিকাল ৪:৩০",
    frequency: "দিনে ২ বার",
    vehicle: "ঢাকা মেট্রো-শ ১১-০৪১৮",
    supervisor: "মো. রফিকুল ইসলাম",
    liveStatus: "সংগ্রহ চলছে",
    completionPercent: 72,
    coordinates: { lat: "23.8492° N", lng: "90.2546° E", landmark: "থানা রোড ও কাঁচাবাজার" },
    active: true,
  },
  {
    id: "ward-4",
    code: "ওয়ার্ড ০৪",
    name: "সাভার পৌরসভা ওয়ার্ড ০৪",
    shortName: "ব্যাংক কলোনি",
    type: "municipality",
    neighborhoods: ["ব্যাংক কলোনি", "ডগরমোড়া", "দক্ষিণপাড়া"],
    schedule: "সকাল ৭:৩০ – ৯:৩০",
    frequency: "প্রতিদিন",
    vehicle: "ঢাকা মেট্রো-শ ১১-০৪২১",
    supervisor: "আবদুল মান্নান",
    liveStatus: "সংগ্রহ চলছে",
    completionPercent: 68,
    coordinates: { lat: "23.8458° N", lng: "90.2571° E", landmark: "ব্যাংক কলোনি জামে মসজিদ মোড়" },
    active: true,
  },
  {
    id: "ward-5",
    code: "ওয়ার্ড ০৫",
    name: "সাভার পৌরসভা ওয়ার্ড ০৫",
    shortName: "ব্যাংক টাউন ও পাকিজা এলাকা",
    type: "municipality",
    neighborhoods: ["ব্যাংক টাউন", "পাকিজা এলাকা", "তালবাগ"],
    schedule: "সকাল ৮:০০ – ১০:০০",
    frequency: "প্রতিদিন",
    vehicle: "ঢাকা মেট্রো-শ ১১-০৪২৪",
    supervisor: "মো. কামাল হোসেন",
    liveStatus: "সংগ্রহ চলছে",
    completionPercent: 78,
    coordinates: { lat: "23.8412° N", lng: "90.2535° E", landmark: "ব্যাংক টাউন ১ নম্বর গেট ও পাকিজা" },
    active: true,
  },
  {
    id: "ward-6",
    code: "ওয়ার্ড ০৬",
    name: "সাভার পৌরসভা ওয়ার্ড ০৬",
    shortName: "গেন্ডা ও আনন্দপুর",
    type: "municipality",
    neighborhoods: ["গেন্ডা", "আনন্দপুর", "কাতলাপুর"],
    schedule: "সকাল ৮:৩০ – ১০:৩০",
    frequency: "প্রতিদিন",
    vehicle: "ঢাকা মেট্রো-শ ১১-০৪২৭",
    supervisor: "হাবিবুর রহমান",
    liveStatus: "সম্পন্ন",
    completionPercent: 96,
    coordinates: { lat: "23.8375° N", lng: "90.2568° E", landmark: "গেন্ডা বাসস্ট্যান্ড" },
    active: true,
  },
  {
    id: "ward-7",
    code: "ওয়ার্ড ০৭",
    name: "সাভার পৌরসভা ওয়ার্ড ০৭",
    shortName: "উলাইল ও কর্ণপাড়া",
    type: "municipality",
    neighborhoods: ["উলাইল", "কর্ণপাড়া", "ইমান্দিপুর"],
    schedule: "সকাল ৭:০০ – ৯:৩০",
    frequency: "প্রতিদিন",
    vehicle: "ঢাকা মেট্রো-শ ১১-০৪৩০",
    supervisor: "নজরুল ইসলাম",
    liveStatus: "নির্ধারিত সময়ে",
    completionPercent: 52,
    coordinates: { lat: "23.8304° N", lng: "90.2591° E", landmark: "উলাইল বাসস্ট্যান্ড" },
    active: true,
  },
  {
    id: "ward-8",
    code: "ওয়ার্ড ০৮",
    name: "সাভার পৌরসভা ওয়ার্ড ০৮",
    shortName: "রাজাশন ও আড়াপাড়া",
    type: "municipality",
    neighborhoods: ["রাজাশন", "কমলাপুর", "আড়াপাড়া"],
    schedule: "সকাল ৯:০০ – ১১:০০",
    frequency: "প্রতিদিন",
    vehicle: "ঢাকা মেট্রো-শ ১১-০৪৩৩",
    supervisor: "মো. সোহেল মিয়া",
    liveStatus: "অতিরিক্ত চাপ",
    completionPercent: 45,
    coordinates: { lat: "23.8436° N", lng: "90.2688° E", landmark: "রাজাশন বটতলা" },
    active: true,
  },
  {
    id: "ward-9",
    code: "ওয়ার্ড ০৯",
    name: "সাভার পৌরসভা ওয়ার্ড ০৯",
    shortName: "ভাগলপুর ও বক্তারপুর",
    type: "municipality",
    neighborhoods: ["ভাগলপুর", "বক্তারপুর", "দেওগাঁও"],
    schedule: "বিকাল ৩:০০ – ৫:০০",
    frequency: "প্রতিদিন",
    vehicle: "ঢাকা মেট্রো-শ ১১-০৪৩৬",
    supervisor: "জাকির হোসেন",
    liveStatus: "নির্ধারিত সময়ে",
    completionPercent: 40,
    coordinates: { lat: "23.8290° N", lng: "90.2485° E", landmark: "ভাগলপুর মোড়" },
    active: true,
  },
  {
    id: "union-tetuljhora",
    code: "ইউনিয়ন ০১",
    name: "তেঁতুলঝোড়া ইউনিয়ন",
    shortName: "হেমায়েতপুর ও যাদুরচর",
    type: "union",
    neighborhoods: ["হেমায়েতপুর", "যাদুরচর", "শ্যামপুর"],
    schedule: "সকাল ৭:৩০ – ১০:৩০",
    frequency: "প্রতিদিন",
    vehicle: "ঢাকা মেট্রো-শ ১১-০৪৪০",
    supervisor: "জাহাঙ্গীর আলম",
    liveStatus: "অতিরিক্ত চাপ",
    completionPercent: 58,
    coordinates: { lat: "23.7962° N", lng: "90.2695° E", landmark: "হেমায়েতপুর বাসস্ট্যান্ড" },
    active: true,
  },
  {
    id: "union-ashulia",
    code: "ইউনিয়ন ০২",
    name: "আশুলিয়া ইউনিয়ন",
    shortName: "আশুলিয়া বাজার ও জিরাবো",
    type: "union",
    neighborhoods: ["আশুলিয়া বাজার", "জিরাবো", "ঘোষবাগ"],
    schedule: "সকাল ৮:০০ – ১১:০০",
    frequency: "শনি, সোম, বুধ",
    vehicle: "ভ্যান-ইউপি-০২",
    supervisor: "তারেক মাহমুদ",
    liveStatus: "সংগ্রহ চলছে",
    completionPercent: 64,
    coordinates: { lat: "23.8968° N", lng: "90.3264° E", landmark: "আশুলিয়া বাজার ঘাট" },
    active: true,
  },
  {
    id: "union-birulia",
    code: "ইউনিয়ন ০৩",
    name: "বিরুলিয়া ইউনিয়ন",
    shortName: "বিরুলিয়া ও আকরাইন",
    type: "union",
    neighborhoods: ["বিরুলিয়া বাজার", "আকরাইন", "খাগান"],
    schedule: "সকাল ৯:০০ – ১২:০০",
    frequency: "রবি, মঙ্গল, বৃহস্পতি",
    vehicle: "ভ্যান-ইউপি-০৫",
    supervisor: "মো. ফরিদ উদ্দিন",
    liveStatus: "সম্পন্ন",
    completionPercent: 92,
    coordinates: { lat: "23.8618° N", lng: "90.3125° E", landmark: "বিরুলিয়া ব্রিজ সংলগ্ন বাজার" },
    active: true,
  },
  {
    id: "union-aminbazar",
    code: "ইউনিয়ন ০৪",
    name: "আমিনবাজার ইউনিয়ন",
    shortName: "আমিনবাজার ও বড়দেশী",
    type: "union",
    neighborhoods: ["আমিনবাজার", "বড়দেশী", "সালেহপুর"],
    schedule: "সকাল ৬:৩০ – ৯:০০",
    frequency: "প্রতিদিন",
    vehicle: "ঢাকা মেট্রো-শ ১১-০৪৪৪",
    supervisor: "শাহাদাত হোসেন",
    liveStatus: "সম্পন্ন",
    completionPercent: 90,
    coordinates: { lat: "23.7841° N", lng: "90.3248° E", landmark: "আমিনবাজার ট্রাক স্ট্যান্ড" },
    active: true,
  },
  {
    id: "union-savar-sadar",
    code: "ইউনিয়ন ০৫",
    name: "সাভার (সদর) ইউনিয়ন",
    shortName: "বাইপাইল ও ডেন্ডাবর",
    type: "union",
    neighborhoods: ["বাইপাইল", "ডেন্ডাবর", "পলাশবাড়ি"],
    schedule: "সকাল ৮:০০ – ১১:০০",
    frequency: "প্রতিদিন",
    vehicle: "ঢাকা মেট্রো-শ ১১-০৪৪৮",
    supervisor: "ইব্রাহিম খলিল",
    liveStatus: "সংগ্রহ চলছে",
    completionPercent: 71,
    coordinates: { lat: "23.9242° N", lng: "90.2681° E", landmark: "বাইপাইল মোড়" },
    active: true,
  },
  {
    id: "union-pathalia",
    code: "ইউনিয়ন ০৬",
    name: "পাথালিয়া ইউনিয়ন",
    shortName: "নয়ারহাট ও পাথালিয়া",
    type: "union",
    neighborhoods: ["নয়ারহাট", "পাথালিয়া", "পানধোয়া"],
    schedule: "দুপুর ২:০০ – ৫:০০",
    frequency: "শনি, সোম, বুধ",
    vehicle: "ভ্যান-ইউপি-০৯",
    supervisor: "লুৎফর রহমান",
    liveStatus: "নির্ধারিত সময়ে",
    completionPercent: 35,
    coordinates: { lat: "23.9145° N", lng: "90.2338° E", landmark: "নয়ারহাট বাজার" },
    active: true,
  },
];

export const INITIAL_COLLECTORS: Collector[] = [
  {
    id: "col-1",
    name: "মো. রফিকুল ইসলাম",
    role: "টিম লিডার • রিকশা-ভ্যান টিম ক-১",
    vehicle: "ভ্যান-পৌর-০৩",
    assignedZone: "থানা রোড ও বাজার রোড (ওয়ার্ড ৩)",
    phone: "০১৭১২-৪৪৮৯১০",
    status: "মাঠে কর্মরত",
    activeTasks: 3,
    completedToday: 9,
  },
  {
    id: "col-2",
    name: "মো. কামাল হোসেন",
    role: "কম্প্যাক্টর অপারেটর",
    vehicle: "ঢাকা মেট্রো-শ ১১-০৪২৪",
    assignedZone: "ব্যাংক টাউন ও পাকিজা এলাকা (ওয়ার্ড ৫)",
    phone: "০১৮১৯-৬৫৩২৪১",
    status: "মাঠে কর্মরত",
    activeTasks: 2,
    completedToday: 11,
  },
  {
    id: "col-3",
    name: "আবদুল মান্নান",
    role: "পরিচ্ছন্নতা কালেক্টর",
    vehicle: "ভ্যান-পৌর-০৭",
    assignedZone: "ব্যাংক কলোনি ও ডগরমোড়া (ওয়ার্ড ৪)",
    phone: "০১৭৫৪-৮১২৩০৯",
    status: "সক্রিয়",
    activeTasks: 2,
    completedToday: 7,
  },
  {
    id: "col-4",
    name: "মো. সোহেল মিয়া",
    role: "পরিচ্ছন্নতা কালেক্টর",
    vehicle: "ভ্যান-পৌর-১২",
    assignedZone: "রাজাশন ও আড়াপাড়া (ওয়ার্ড ৮)",
    phone: "০১৯১১-৯০৪৫২২",
    status: "মাঠে কর্মরত",
    activeTasks: 4,
    completedToday: 6,
  },
  {
    id: "col-5",
    name: "জাহাঙ্গীর আলম",
    role: "ডাম্প ট্রাক ড্রাইভার",
    vehicle: "ঢাকা মেট্রো-শ ১১-০৪৪০",
    assignedZone: "হেমায়েতপুর (তেঁতুলঝোড়া)",
    phone: "০১৭১৮-৩৩২৭৬০",
    status: "মাঠে কর্মরত",
    activeTasks: 3,
    completedToday: 8,
  },
  {
    id: "col-6",
    name: "মো. সাইফুল ইসলাম",
    role: "র‍্যাপিড রেসপন্স টিম",
    vehicle: "মিনি পিকআপ-জরুরি-০১",
    assignedZone: "সাভার পৌরসভা ওয়ার্ড ১–৯ (জরুরি)",
    phone: "০১৭৯৯-২০১৪৮৭",
    status: "সক্রিয়",
    activeTasks: 1,
    completedToday: 5,
  },
];

export const INITIAL_REQUESTS: WasteRequest[] = [
  {
    id: "CS-1084",
    kind: "report",
    areaTag: "থানা রোড",
    zoneId: "ward-3",
    addressOrLandmark: "থানা রোড কাঁচাবাজার মোড়ের পশ্চিম পাশে",
    wasteType: "বাজার ও দোকান বর্জ্য",
    reporterPhone: "০১৭১৫-৮৮৩২১১",
    gpsLabel: "23.8492° N, 90.2546° E",
    notes: "সকালের বাজার শেষে সবজির খোসা ও পলিথিন রাস্তায় জমে আছে।",
    status: "পেন্ডিং",
    priority: "অতি জরুরি",
    createdAtLabel: "১২ মিনিট আগে",
  },
  {
    id: "CS-1083",
    kind: "pickup",
    areaTag: "ব্যাংক কলোনি",
    zoneId: "ward-4",
    addressOrLandmark: "বাসা ১৮, রোড ৪, ব্যাংক কলোনি",
    wasteType: "রান্নাঘরের ময়লা",
    timeSlot: "সকাল ৯:৩০ – ১১:৩০",
    quantity: "২টি মাঝারি ব্যাগ",
    reporterPhone: "০১৮১৭-৪০২৯১৫",
    status: "কালেক্টর পথে আছেন",
    priority: "সাধারণ",
    createdAtLabel: "২৮ মিনিট আগে",
    assignedCollectorId: "col-3",
    assignedCollectorName: "আবদুল মান্নান",
  },
  {
    id: "CS-1082",
    kind: "report",
    areaTag: "রাজাশন",
    zoneId: "ward-8",
    addressOrLandmark: "রাজাশন বটতলা ও প্রাইমারি স্কুল সংলগ্ন সড়ক",
    wasteType: "রাস্তার পাশে ময়লার স্তূপ",
    reporterPhone: "০১৭২২-১৯৪০০৮",
    gpsLabel: "23.8436° N, 90.2688° E",
    notes: "দুই দিন ধরে খোলা ডাস্টবিনের বাইরে ময়লা ছড়িয়ে পড়ছে।",
    status: "পেন্ডিং",
    priority: "জরুরি",
    createdAtLabel: "৪৫ মিনিট আগে",
  },
  {
    id: "CS-1081",
    kind: "pickup",
    areaTag: "ব্যাংক টাউন",
    zoneId: "ward-5",
    addressOrLandmark: "প্লট ২৯, ব্লক বি, ব্যাংক টাউন",
    wasteType: "প্লাস্টিক ও কাগজ",
    timeSlot: "সকাল ৯:৩০ – ১১:৩০",
    quantity: "১টি বড় বস্তা (আলাদা করা)",
    reporterPhone: "০১৯১২-৫৫৬৭৮১",
    status: "সংগ্রহ সম্পন্ন",
    priority: "সাধারণ",
    createdAtLabel: "১ ঘণ্টা আগে",
    assignedCollectorId: "col-2",
    assignedCollectorName: "মো. কামাল হোসেন",
  },
  {
    id: "CS-1080",
    kind: "report",
    areaTag: "পাকিজা এলাকা",
    zoneId: "ward-5",
    addressOrLandmark: "পাকিজা ২নং গেটের সামনে ড্রেনের মুখ",
    wasteType: "ড্রেন ও নালা বন্ধ",
    reporterPhone: "০১৭৬৬-৭১২৯০৪",
    gpsLabel: "23.8409° N, 90.2528° E",
    notes: "প্লাস্টিকের বোতল জমে ড্রেনের পানি আটকে গেছে।",
    status: "কালেক্টর পথে আছেন",
    priority: "জরুরি",
    createdAtLabel: "১ ঘণ্টা ৩০ মি. আগে",
    assignedCollectorId: "col-2",
    assignedCollectorName: "মো. কামাল হোসেন",
  },
  {
    id: "CS-1079",
    kind: "pickup",
    areaTag: "রেডিও কলোনি",
    zoneId: "ward-2",
    addressOrLandmark: "কোয়ার্টার সি-৭, রেডিও কলোনি",
    wasteType: "মিক্সড",
    timeSlot: "সকাল ৭:০০ – ৯:০০",
    quantity: "১টি বালতি",
    reporterPhone: "০১৫৫২-৩৮৯০৪৪",
    status: "সংগ্রহ সম্পন্ন",
    priority: "সাধারণ",
    createdAtLabel: "২ ঘণ্টা আগে",
    assignedCollectorId: "col-1",
    assignedCollectorName: "মো. রফিকুল ইসলাম",
  },
  {
    id: "CS-1078",
    kind: "report",
    areaTag: "হেমায়েতপুর",
    zoneId: "union-tetuljhora",
    addressOrLandmark: "হেমায়েতপুর বাসস্ট্যান্ড ফুটওভার ব্রিজের নিচে",
    wasteType: "রাস্তার পাশে ময়লার স্তূপ",
    reporterPhone: "০১৭৩১-৯০৫২৩৬",
    gpsLabel: "23.7962° N, 90.2695° E",
    notes: "যাত্রীদের ফেলা আবর্জনায় হাঁটার পথ সরু হয়ে গেছে।",
    status: "পেন্ডিং",
    priority: "অতি জরুরি",
    createdAtLabel: "২ ঘণ্টা ১৫ মি. আগে",
  },
  {
    id: "CS-1077",
    kind: "pickup",
    areaTag: "জামসিং",
    zoneId: "ward-1",
    addressOrLandmark: "হোল্ডিং ৪২, উত্তর জামসিং",
    wasteType: "রান্নাঘরের ময়লা",
    timeSlot: "সকাল ৭:০০ – ৯:০০",
    quantity: "২টি পাত্র",
    status: "সংগ্রহ সম্পন্ন",
    priority: "সাধারণ",
    createdAtLabel: "৩ ঘণ্টা আগে",
    assignedCollectorId: "col-6",
    assignedCollectorName: "মো. সাইফুল ইসলাম",
  },
];

export const INITIAL_HOTSPOTS: Hotspot[] = [
  {
    id: "hs-1",
    title: "থানা রোড কাঁচাবাজার মোড়",
    wardLabel: "পৌরসভা ওয়ার্ড ০৩",
    areaTag: "থানা রোড",
    severity: "অতি জরুরি",
    estimatedLoad: "প্রায় ৬৫০ কেজি",
    lastCleared: "গতকাল রাত ১০:১৫",
    clearedToday: false,
  },
  {
    id: "hs-2",
    title: "রাজাশন বটতলা ও স্কুল সড়ক",
    wardLabel: "পৌরসভা ওয়ার্ড ০৮",
    areaTag: "রাজাশন",
    severity: "জরুরি",
    estimatedLoad: "প্রায় ৪২০ কেজি",
    lastCleared: "গতকাল বিকাল ৫:০০",
    clearedToday: false,
  },
  {
    id: "hs-3",
    title: "হেমায়েতপুর বাসস্ট্যান্ড লেন",
    wardLabel: "তেঁতুলঝোড়া ইউনিয়ন",
    areaTag: "হেমায়েতপুর",
    severity: "অতি জরুরি",
    estimatedLoad: "প্রায় ৭৮০ কেজি",
    lastCleared: "গতকাল রাত ৯:০০",
    clearedToday: false,
  },
  {
    id: "hs-4",
    title: "পাকিজা ২নং গেট ড্রেন সংযোগ",
    wardLabel: "পৌরসভা ওয়ার্ড ০৫",
    areaTag: "পাকিজা এলাকা",
    severity: "পর্যবেক্ষণে",
    estimatedLoad: "প্রায় ১৯০ কেজি",
    lastCleared: "আজ সকাল ৮:১০",
    dispatchedTeam: "মো. কামাল হোসেন (শ ১১-০৪২৪)",
    clearedToday: false,
  },
];

export const INITIAL_RECYCLING_BATCHES: RecyclingBatch[] = [
  {
    id: "RC-204",
    hubName: "সাভার কম্পোস্ট প্ল্যান্ট (গেন্ডা)",
    category: "জৈব ও কম্পোস্ট",
    weightKg: 2900,
    sourceZone: "ওয়ার্ড ১–৬ ও বাজার রোড",
    loggedAt: "আজ, সকাল ১০:৩০",
  },
  {
    id: "RC-203",
    hubName: "ব্যাংক টাউন রিসাইক্লিং হাব",
    category: "প্লাস্টিক ও পিইটি",
    weightKg: 900,
    sourceZone: "ব্যাংক টাউন, পাকিজা ও রেডিও কলোনি",
    loggedAt: "আজ, সকাল ০৯:৪৫",
  },
  {
    id: "RC-202",
    hubName: "থানা রোড রিসোর্স কালেকশন পয়েন্ট",
    category: "কাগজ ও কার্ডবোর্ড",
    weightKg: 600,
    sourceZone: "থানা রোড ও ব্যাংক কলোনি",
    loggedAt: "আজ, সকাল ০৮:৫০",
  },
  {
    id: "RC-201",
    hubName: "আমিনবাজার রিসোর্স হাব",
    category: "ধাতু ও কাচ",
    weightKg: 400,
    sourceZone: "রাজাশন ও হেমায়েতপুর",
    loggedAt: "আজ, সকাল ০৮:১০",
  },
];

export const RECYCLING_GUIDE_CATEGORIES = [
  {
    id: "organic",
    title: "রান্নাঘরের জৈব বর্জ্য",
    binLabel: "সবুজ পাত্র",
    items: ["সবজি ও ফলের খোসা", "চায়ের পাতা ও কফি গুঁড়ো", "খাবারের উচ্ছিষ্ট", "শুকনো পাতা ও ফুল"],
    avoid: "পলিথিন ব্যাগ বা ডায়াপার মিশাবেন না",
    destination: "গেন্ডা পৌর কম্পোস্ট প্ল্যান্টে জৈব সার তৈরি হয়",
    ratePerKg: 4,
  },
  {
    id: "plastic",
    title: "প্লাস্টিক ও পিইটি বোতল",
    binLabel: "নীল পাত্র",
    items: ["পানির ও কোমল পানীয়ের বোতল", "শ্যাম্পু ও তেলের কৌটা", "পরিষ্কার প্লাস্টিক প্যাকেট", "ভাঙা বালতি বা প্লাস্টিক চেয়ার"],
    avoid: "তেল-ময়লা ভেজা ওয়ান-টাইম ফুড বক্স ধুয়ে দিন",
    destination: "ব্যাংক টাউন হাব হয়ে রিসাইকেল ফ্লেক্স কারখানায় যায়",
    ratePerKg: 22,
  },
  {
    id: "paper",
    title: "কাগজ ও কার্ডবোর্ড",
    binLabel: "হলুদ বা বাদামি ব্যাগ",
    items: ["পুরনো খবরের কাগজ ও খাতা", "পার্সেল ও ওষুধের কার্টন", "কাগজের ঠোঙা ও ম্যাগাজিন", "অফিস ডকুমেন্ট পেপার"],
    avoid: "ভেজা, তেলমাখা বা টিস্যু পেপার আলাদা রাখুন",
    destination: "থানা রোড কালেকশন পয়েন্ট থেকে কাগজ মিলে পাঠানো হয়",
    ratePerKg: 14,
  },
  {
    id: "metal",
    title: "ধাতু, কাচ ও ই-বর্জ্য",
    binLabel: "ধূসর বা আলাদা বাক্স",
    items: ["অ্যালুমিনিয়াম ক্যান", "অক্ষত কাচের বোতল ও জার", "পুরনো তার, চার্জার ও সার্কিট", "নষ্ট বাল্ব ও ছোট ইলেকট্রনিক্স"],
    avoid: "ভাঙা কাচ কাগজে মুড়িয়ে আলাদা লেবেল দিয়ে দিন",
    destination: "আমিনবাজার রিসোর্স হাবে নিরাপদ রিকভারি ও রিফাইনিং হয়",
    ratePerKg: 45,
  },
] as const;
