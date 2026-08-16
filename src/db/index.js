const path = require('node:path');
const fs = require('node:fs');
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(path.join(DATA_DIR, 'carcode.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS brands (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    name_ar TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS modules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    name_ar TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS diagnostic_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL,
    title TEXT NOT NULL,
    title_ar TEXT NOT NULL,
    description_ar TEXT NOT NULL,
    severity TEXT NOT NULL,
    module_id INTEGER NOT NULL,
    brand_id INTEGER,
    model TEXT,
    year_from INTEGER,
    year_to INTEGER,
    FOREIGN KEY (module_id) REFERENCES modules(id),
    FOREIGN KEY (brand_id) REFERENCES brands(id)
  );

  CREATE TABLE IF NOT EXISTS search_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    query TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

function seed() {
  const brandCount = db.prepare('SELECT COUNT(*) AS c FROM brands').get().c;
  if (brandCount > 0) return;

  const brands = [
    ['Kia', 'كيا'],
    ['Hyundai', 'هيونداي'],
    ['Toyota', 'تويوتا'],
    ['Honda', 'هوندا'],
    ['Nissan', 'نيسان'],
    ['Ford', 'فورد'],
    ['Chevrolet', 'شيفروليه'],
    ['Mazda', 'مازدا'],
  ];
  const insertBrand = db.prepare('INSERT INTO brands (name, name_ar) VALUES (?, ?)');
  const brandIds = {};
  for (const [name, nameAr] of brands) {
    const info = insertBrand.run(name, nameAr);
    brandIds[name] = info.lastInsertRowid;
  }

  const modules = [
    ['ECM', 'Engine Control Module', 'وحدة التحكم بالمحرك'],
    ['TCM', 'Transmission Control Module', 'وحدة التحكم بناقل الحركة'],
    ['ABS', 'Anti-lock Braking System', 'نظام الفرامل المانعة للانغلاق'],
    ['SRS', 'Supplemental Restraint System (Airbag)', 'نظام الوسائد الهوائية'],
    ['BCM', 'Body Control Module', 'وحدة التحكم بالهيكل'],
    ['NET', 'Network / Communication (CAN Bus)', 'شبكة الاتصال بين الوحدات'],
  ];
  const insertModule = db.prepare('INSERT INTO modules (code, name, name_ar) VALUES (?, ?, ?)');
  const moduleIds = {};
  for (const [code, name, nameAr] of modules) {
    const info = insertModule.run(code, name, nameAr);
    moduleIds[code] = info.lastInsertRowid;
  }

  // Generic SAE-standard OBD-II diagnostic trouble codes (public-domain, industry-wide).
  const codes = [
    ['P0100', 'Mass or Volume Air Flow Circuit Malfunction', 'عطل في دائرة حساس تدفق الهواء (MAF)', 'خلل في إشارة حساس كتلة/حجم الهواء الداخل للمحرك، قد يسبب ضعف أداء أو استهلاك وقود مرتفع.', 'medium', 'ECM'],
    ['P0110', 'Intake Air Temperature Circuit Malfunction', 'عطل في دائرة حساس حرارة الهواء الداخل', 'قراءة غير منطقية من حساس حرارة الهواء الداخل يؤثر على خلطة الوقود.', 'low', 'ECM'],
    ['P0115', 'Engine Coolant Temperature Circuit Malfunction', 'عطل في دائرة حساس حرارة سائل التبريد', 'إشارة غير سليمة من حساس حرارة الماء، يؤثر على استراتيجية التحكم بالمحرك.', 'medium', 'ECM'],
    ['P0120', 'Throttle Position Sensor Circuit Malfunction', 'عطل في دائرة حساس وضعية الخانق', 'خلل في قراءة حساس دواسة/خانق التسارع.', 'medium', 'ECM'],
    ['P0128', 'Coolant Thermostat Below Regulating Temperature', 'الثرموستات لا يصل لدرجة الحرارة المطلوبة', 'المحرك يستغرق وقتاً أطول من المعتاد للوصول لحرارة التشغيل.', 'low', 'ECM'],
    ['P0130', 'O2 Sensor Circuit Malfunction (Bank 1 Sensor 1)', 'عطل في دائرة حساس الأكسجين', 'خلل في حساس الأكسجين الأمامي يؤثر على ضبط خلطة الوقود والانبعاثات.', 'medium', 'ECM'],
    ['P0171', 'System Too Lean (Bank 1)', 'الخلطة فقيرة جداً (البنك 1)', 'نسبة الهواء إلى الوقود أعلى من الطبيعي، قد يكون السبب تسرب هواء أو حساس ضعيف.', 'medium', 'ECM'],
    ['P0172', 'System Too Rich (Bank 1)', 'الخلطة غنية جداً (البنك 1)', 'نسبة الوقود إلى الهواء أعلى من الطبيعي، يزيد الاستهلاك والانبعاثات.', 'medium', 'ECM'],
    ['P0217', 'Engine Overtemperature Condition', 'ارتفاع درجة حرارة المحرك', 'المحرك تجاوز درجة الحرارة الآمنة، يستوجب الفحص الفوري لتفادي تلف داخلي.', 'high', 'ECM'],
    ['P0230', 'Fuel Pump Primary Circuit Malfunction', 'عطل في الدائرة الأساسية لمضخة الوقود', 'خلل كهربائي في دائرة تغذية مضخة الوقود.', 'high', 'ECM'],
    ['P0300', 'Random/Multiple Cylinder Misfire Detected', 'اختلال احتراق عشوائي في عدة أسطوانات', 'تم رصد قفلة احتراق في أكثر من أسطوانة، يستدعي فحص شمعات ووصلات الإشعال.', 'high', 'ECM'],
    ['P0301', 'Cylinder 1 Misfire Detected', 'اختلال احتراق في الأسطوانة رقم 1', 'قفلة احتراق محددة في الأسطوانة الأولى.', 'high', 'ECM'],
    ['P0325', 'Knock Sensor Circuit Malfunction', 'عطل في دائرة حساس الطرق (الدقة)', 'خلل في حساس الطرق يمنع تعديل توقيت الإشعال بشكل صحيح.', 'medium', 'ECM'],
    ['P0335', 'Crankshaft Position Sensor Circuit Malfunction', 'عطل في دائرة حساس وضعية عمود المرفق', 'قد يسبب صعوبة أو تعذر تشغيل المحرك.', 'high', 'ECM'],
    ['P0340', 'Camshaft Position Sensor Circuit Malfunction', 'عطل في دائرة حساس وضعية عمود الكامة', 'يؤثر على توقيت الحقن والإشعال.', 'medium', 'ECM'],
    ['P0420', 'Catalyst System Efficiency Below Threshold', 'كفاءة المحول الحفاز أقل من الحد المطلوب', 'أداء المحول الحفاز ضعيف، يؤثر على مستوى الانبعاثات.', 'medium', 'ECM'],
    ['P0440', 'Evaporative Emission Control System Malfunction', 'عطل في نظام تبخر الوقود (EVAP)', 'تسرب أو خلل في نظام التحكم بأبخرة الوقود.', 'low', 'ECM'],
    ['P0442', 'EVAP System Small Leak Detected', 'تسرب بسيط في نظام EVAP', 'غالباً بسبب غطاء خزان وقود غير محكم الإغلاق.', 'low', 'ECM'],
    ['P0500', 'Vehicle Speed Sensor Malfunction', 'عطل في حساس سرعة السيارة', 'قد يؤثر على أداء ناقل الحركة ونظام الفرامل المانعة للانغلاق.', 'medium', 'ECM'],
    ['P0505', 'Idle Control System Malfunction', 'عطل في نظام التحكم بالسرعة الخاملة', 'تذبذب أو ثبات غير طبيعي في دورة المحرك عند التوقف.', 'low', 'ECM'],
    ['P0562', 'System Voltage Low', 'انخفاض فولتية النظام', 'فولتية النظام الكهربائي أقل من الحد الطبيعي، افحص البطارية والمولد.', 'high', 'ECM'],
    ['P0700', 'Transmission Control System Malfunction', 'عطل عام في نظام التحكم بناقل الحركة', 'وحدة التحكم بالمحرك رصدت عطلاً عاماً في ناقل الحركة.', 'high', 'TCM'],
    ['P0715', 'Input/Turbine Speed Sensor Circuit Malfunction', 'عطل في دائرة حساس سرعة التوربين', 'خلل في قراءة سرعة دوران عمود الإدخال في ناقل الحركة.', 'medium', 'TCM'],
    ['P0720', 'Output Speed Sensor Circuit Malfunction', 'عطل في دائرة حساس سرعة الإخراج', 'يؤثر على دقة التبديل بين السرعات.', 'medium', 'TCM'],
    ['P0730', 'Incorrect Gear Ratio', 'نسبة تروس غير صحيحة', 'ناقل الحركة لا يطابق نسبة السرعة المطلوبة.', 'high', 'TCM'],
    ['P0750', 'Shift Solenoid A Malfunction', 'عطل في ملف تبديل السرعات A', 'خلل في أحد ملفات التحكم الهيدروليكي لناقل الحركة.', 'medium', 'TCM'],
    ['C0035', 'Left Front Wheel Speed Sensor Circuit', 'عطل في حساس سرعة العجلة الأمامية اليسرى', 'قد يعطل عمل نظام ABS والتحكم بالثبات.', 'high', 'ABS'],
    ['C0040', 'Right Front Wheel Speed Sensor Circuit', 'عطل في حساس سرعة العجلة الأمامية اليمنى', 'قد يعطل عمل نظام ABS والتحكم بالثبات.', 'high', 'ABS'],
    ['C0051', 'Wheel Speed Sensor Circuit Rear Left', 'عطل في حساس سرعة العجلة الخلفية اليسرى', 'يؤثر على دقة عمل نظام الفرامل المانعة للانغلاق.', 'high', 'ABS'],
    ['C0110', 'Pump Motor Circuit Malfunction', 'عطل في دائرة موتور مضخة نظام ABS', 'قد يمنع تفعيل نظام منع انغلاق الفرامل عند الحاجة.', 'high', 'ABS'],
    ['C0161', 'Electronic Brake Force Distribution Malfunction', 'عطل في نظام توزيع قوة الفرملة الإلكتروني', 'يؤثر على توازن الفرملة بين المحاور.', 'high', 'ABS'],
    ['B0001', 'Driver Frontal Stage 1 Deployment Control', 'عطل في تفعيل الوسادة الهوائية الأمامية للسائق', 'خلل في دائرة التفعيل المرحلي للوسادة الهوائية.', 'high', 'SRS'],
    ['B0012', 'Passenger Frontal Deployment Control', 'عطل في تفعيل الوسادة الهوائية الأمامية للراكب', 'خلل في دائرة التفعيل للوسادة الهوائية الجانب الأيمن.', 'high', 'SRS'],
    ['B0053', 'Driver Side Seat Belt Pretensioner', 'عطل في شادّ حزام أمان السائق', 'خلل في دائرة شدّ الحزام عند الاصطدام.', 'high', 'SRS'],
    ['B0081', 'Driver Side Impact Sensor', 'عطل في حساس الصدمة الجانبية للسائق', 'يؤثر على استجابة نظام الوسائد الهوائية الجانبية.', 'high', 'SRS'],
    ['B1318', 'Battery Voltage Low', 'فولتية البطارية منخفضة', 'رصدت وحدة التحكم بالهيكل انخفاضاً في فولتية البطارية.', 'medium', 'BCM'],
    ['B1342', 'ECU is Defective', 'عطل داخلي في وحدة التحكم', 'خلل داخلي في وحدة التحكم بالهيكل يستدعي الفحص أو الاستبدال.', 'high', 'BCM'],
    ['B2477', 'Anti-theft System', 'عطل في نظام مانع السرقة', 'خلل في دائرة أو إشارة نظام مانع السرقة.', 'medium', 'BCM'],
    ['U0100', 'Lost Communication With ECM/PCM', 'فقدان الاتصال مع وحدة التحكم بالمحرك', 'انقطاع في شبكة CAN بين الوحدة الرئيسية ووحدة تحكم المحرك.', 'high', 'NET'],
    ['U0101', 'Lost Communication With TCM', 'فقدان الاتصال مع وحدة ناقل الحركة', 'انقطاع في شبكة CAN مع وحدة التحكم بناقل الحركة.', 'high', 'NET'],
    ['U0121', 'Lost Communication With ABS Module', 'فقدان الاتصال مع وحدة ABS', 'انقطاع في شبكة CAN مع وحدة الفرامل المانعة للانغلاق.', 'high', 'NET'],
    ['U0140', 'Lost Communication With Body Control Module', 'فقدان الاتصال مع وحدة التحكم بالهيكل', 'انقطاع في شبكة CAN مع وحدة BCM.', 'medium', 'NET'],
  ];

  const insertCode = db.prepare(`
    INSERT INTO diagnostic_codes (code, title, title_ar, description_ar, severity, module_id, brand_id, model, year_from, year_to)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const sampleBrandCycle = Object.keys(brandIds);
  let i = 0;
  for (const [code, title, titleAr, descAr, severity, moduleCode] of codes) {
    const brandName = sampleBrandCycle[i % sampleBrandCycle.length];
    insertCode.run(
      code,
      title,
      titleAr,
      descAr,
      severity,
      moduleIds[moduleCode],
      brandIds[brandName],
      null,
      2010,
      2026
    );
    i++;
  }
}

seed();

module.exports = db;
