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
    ['BMW', 'بي إم دبليو'],
    ['Mercedes-Benz', 'مرسيدس بنز'],
    ['Audi', 'أودي'],
    ['Volkswagen', 'فولكس فاجن'],
    ['Lexus', 'لكزس'],
    ['Infiniti', 'إنفينيتي'],
    ['Acura', 'أكيورا'],
    ['Genesis', 'جينيسيس'],
    ['Subaru', 'سوبارو'],
    ['Mitsubishi', 'ميتسوبيشي'],
    ['Suzuki', 'سوزوكي'],
    ['Jeep', 'جيب'],
    ['Ram', 'رام'],
    ['Dodge', 'دودج'],
    ['Chrysler', 'كرايسلر'],
    ['GMC', 'جي إم سي'],
    ['Cadillac', 'كاديلاك'],
    ['Buick', 'بيوك'],
    ['Lincoln', 'لينكولن'],
    ['Volvo', 'فولفو'],
    ['Land Rover', 'لاند روفر'],
    ['Jaguar', 'جاكوار'],
    ['Porsche', 'بورشه'],
    ['MINI', 'ميني'],
    ['Peugeot', 'بيجو'],
    ['Renault', 'رينو'],
    ['Skoda', 'سكودا'],
    ['Opel', 'أوبل'],
    ['Tesla', 'تسلا'],
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

    // --- Additional generic P-codes (fuel & air metering, P01xx) ---
    ['P0101', 'Mass Air Flow Circuit Range/Performance', 'أداء غير طبيعي في دائرة حساس تدفق الهواء', 'قراءة حساس الهواء خارج النطاق المتوقع مقارنة بظروف التشغيل.', 'medium', 'ECM'],
    ['P0102', 'Mass Air Flow Circuit Low Input', 'إشارة منخفضة من حساس تدفق الهواء', 'قراءة حساس MAF أقل من الحد الأدنى الطبيعي.', 'medium', 'ECM'],
    ['P0103', 'Mass Air Flow Circuit High Input', 'إشارة مرتفعة من حساس تدفق الهواء', 'قراءة حساس MAF أعلى من الحد الأعلى الطبيعي.', 'medium', 'ECM'],
    ['P0106', 'Manifold Absolute Pressure Circuit Range/Performance', 'أداء غير طبيعي في حساس ضغط المنيفولد', 'قراءة حساس MAP لا تطابق ظروف التشغيل الحالية.', 'medium', 'ECM'],
    ['P0107', 'Manifold Absolute Pressure Circuit Low Input', 'إشارة منخفضة من حساس ضغط المنيفولد', 'قراءة حساس MAP أقل من الطبيعي.', 'medium', 'ECM'],
    ['P0108', 'Manifold Absolute Pressure Circuit High Input', 'إشارة مرتفعة من حساس ضغط المنيفولد', 'قراءة حساس MAP أعلى من الطبيعي.', 'medium', 'ECM'],
    ['P0113', 'Intake Air Temperature Circuit High Input', 'إشارة مرتفعة من حساس حرارة الهواء الداخل', 'قراءة غير منطقية مرتفعة من حساس IAT.', 'low', 'ECM'],
    ['P0117', 'Engine Coolant Temperature Circuit Low Input', 'إشارة منخفضة من حساس حرارة سائل التبريد', 'قراءة حساس ECT أقل من الطبيعي.', 'medium', 'ECM'],
    ['P0118', 'Engine Coolant Temperature Circuit High Input', 'إشارة مرتفعة من حساس حرارة سائل التبريد', 'قراءة حساس ECT أعلى من الطبيعي.', 'medium', 'ECM'],
    ['P0121', 'Throttle Position Sensor Circuit Range/Performance', 'أداء غير طبيعي في حساس وضعية الخانق', 'قراءة حساس TPS لا تطابق وضعية دواسة الوقود الفعلية.', 'medium', 'ECM'],
    ['P0122', 'Throttle Position Sensor Circuit Low Input', 'إشارة منخفضة من حساس وضعية الخانق', 'قراءة حساس TPS أقل من الطبيعي.', 'medium', 'ECM'],
    ['P0123', 'Throttle Position Sensor Circuit High Input', 'إشارة مرتفعة من حساس وضعية الخانق', 'قراءة حساس TPS أعلى من الطبيعي.', 'medium', 'ECM'],
    ['P0125', 'Insufficient Coolant Temperature for Closed Loop', 'حرارة المحرك غير كافية للتشغيل بالحلقة المغلقة', 'المحرك يستغرق وقتاً أطول من الطبيعي للوصول لحرارة تفعيل ضبط الوقود.', 'low', 'ECM'],
    ['P0131', 'O2 Sensor Circuit Low Voltage (Bank 1 Sensor 1)', 'جهد منخفض من حساس الأكسجين', 'قراءة فولتية منخفضة غير طبيعية من حساس الأكسجين الأمامي.', 'medium', 'ECM'],
    ['P0132', 'O2 Sensor Circuit High Voltage (Bank 1 Sensor 1)', 'جهد مرتفع من حساس الأكسجين', 'قراءة فولتية مرتفعة غير طبيعية من حساس الأكسجين الأمامي.', 'medium', 'ECM'],
    ['P0133', 'O2 Sensor Slow Response (Bank 1 Sensor 1)', 'استجابة بطيئة لحساس الأكسجين', 'حساس الأكسجين يستجيب ببطء للتغيرات في نسبة الوقود والهواء.', 'low', 'ECM'],
    ['P0134', 'O2 Sensor No Activity Detected (Bank 1 Sensor 1)', 'لا يوجد نشاط لحساس الأكسجين', 'حساس الأكسجين لا يعطي أي إشارة تذبذب.', 'medium', 'ECM'],
    ['P0135', 'O2 Sensor Heater Circuit Malfunction (Bank 1 Sensor 1)', 'عطل في دائرة سخان حساس الأكسجين', 'خلل في عنصر تسخين حساس الأكسجين الأمامي.', 'low', 'ECM'],
    ['P0141', 'O2 Sensor Heater Circuit Malfunction (Bank 1 Sensor 2)', 'عطل في دائرة سخان حساس الأكسجين الخلفي', 'خلل في عنصر تسخين حساس الأكسجين الخلفي (بعد المحول الحفاز).', 'low', 'ECM'],
    ['P0174', 'System Too Lean (Bank 2)', 'الخلطة فقيرة جداً (البنك 2)', 'نسبة الهواء إلى الوقود أعلى من الطبيعي في البنك الثاني من المحرك.', 'medium', 'ECM'],
    ['P0175', 'System Too Rich (Bank 2)', 'الخلطة غنية جداً (البنك 2)', 'نسبة الوقود إلى الهواء أعلى من الطبيعي في البنك الثاني من المحرك.', 'medium', 'ECM'],
    ['P0182', 'Fuel Temperature Sensor Circuit Low Input', 'إشارة منخفضة من حساس حرارة الوقود', 'قراءة حساس حرارة الوقود أقل من الطبيعي.', 'low', 'ECM'],
    ['P0183', 'Fuel Temperature Sensor Circuit High Input', 'إشارة مرتفعة من حساس حرارة الوقود', 'قراءة حساس حرارة الوقود أعلى من الطبيعي.', 'low', 'ECM'],
    ['P0201', 'Injector Circuit Malfunction - Cylinder 1', 'عطل في دائرة حاقن الوقود - الأسطوانة 1', 'خلل كهربائي في دائرة حاقن الوقود الخاص بالأسطوانة الأولى.', 'medium', 'ECM'],
    ['P0202', 'Injector Circuit Malfunction - Cylinder 2', 'عطل في دائرة حاقن الوقود - الأسطوانة 2', 'خلل كهربائي في دائرة حاقن الوقود الخاص بالأسطوانة الثانية.', 'medium', 'ECM'],
    ['P0203', 'Injector Circuit Malfunction - Cylinder 3', 'عطل في دائرة حاقن الوقود - الأسطوانة 3', 'خلل كهربائي في دائرة حاقن الوقود الخاص بالأسطوانة الثالثة.', 'medium', 'ECM'],
    ['P0204', 'Injector Circuit Malfunction - Cylinder 4', 'عطل في دائرة حاقن الوقود - الأسطوانة 4', 'خلل كهربائي في دائرة حاقن الوقود الخاص بالأسطوانة الرابعة.', 'medium', 'ECM'],
    ['P0219', 'Engine Overspeed Condition', 'تجاوز المحرك للسرعة القصوى المسموحة', 'دورة المحرك تجاوزت الحد الآمن، قد يسبب ضرراً ميكانيكياً.', 'high', 'ECM'],
    ['P0231', 'Fuel Pump Secondary Circuit Low', 'إشارة منخفضة في الدائرة الثانوية لمضخة الوقود', 'خلل في دائرة التحكم الثانوية لمضخة الوقود.', 'medium', 'ECM'],
    ['P0261', 'Cylinder 1 Injector Circuit Low', 'إشارة منخفضة في حاقن الأسطوانة 1', 'دائرة حاقن الأسطوانة الأولى تعطي إشارة أقل من الطبيعي.', 'medium', 'ECM'],
    ['P0302', 'Cylinder 2 Misfire Detected', 'اختلال احتراق في الأسطوانة رقم 2', 'قفلة احتراق محددة في الأسطوانة الثانية.', 'high', 'ECM'],
    ['P0303', 'Cylinder 3 Misfire Detected', 'اختلال احتراق في الأسطوانة رقم 3', 'قفلة احتراق محددة في الأسطوانة الثالثة.', 'high', 'ECM'],
    ['P0304', 'Cylinder 4 Misfire Detected', 'اختلال احتراق في الأسطوانة رقم 4', 'قفلة احتراق محددة في الأسطوانة الرابعة.', 'high', 'ECM'],
    ['P0305', 'Cylinder 5 Misfire Detected', 'اختلال احتراق في الأسطوانة رقم 5', 'قفلة احتراق محددة في الأسطوانة الخامسة.', 'high', 'ECM'],
    ['P0306', 'Cylinder 6 Misfire Detected', 'اختلال احتراق في الأسطوانة رقم 6', 'قفلة احتراق محددة في الأسطوانة السادسة.', 'high', 'ECM'],
    ['P0327', 'Knock Sensor Circuit Low Input', 'إشارة منخفضة من حساس الطرق', 'قراءة حساس الطرق أقل من الطبيعي.', 'medium', 'ECM'],
    ['P0328', 'Knock Sensor Circuit High Input', 'إشارة مرتفعة من حساس الطرق', 'قراءة حساس الطرق أعلى من الطبيعي.', 'medium', 'ECM'],
    ['P0336', 'Crankshaft Position Sensor Circuit Range/Performance', 'أداء غير طبيعي في حساس وضعية عمود المرفق', 'إشارة حساس عمود المرفق غير منتظمة.', 'high', 'ECM'],
    ['P0341', 'Camshaft Position Sensor Circuit Range/Performance', 'أداء غير طبيعي في حساس وضعية عمود الكامة', 'إشارة حساس عمود الكامة غير منتظمة.', 'medium', 'ECM'],
    ['P0351', 'Ignition Coil A Primary/Secondary Circuit Malfunction', 'عطل في دائرة كويل الإشعال A', 'خلل في دائرة كويل الإشعال الخاص بالأسطوانة الأولى.', 'medium', 'ECM'],
    ['P0352', 'Ignition Coil B Primary/Secondary Circuit Malfunction', 'عطل في دائرة كويل الإشعال B', 'خلل في دائرة كويل الإشعال الخاص بالأسطوانة الثانية.', 'medium', 'ECM'],
    ['P0401', 'EGR Flow Insufficient Detected', 'تدفق غير كافٍ في نظام إعادة تدوير العادم', 'كمية الغازات المعاد تدويرها أقل من المطلوب.', 'medium', 'ECM'],
    ['P0402', 'EGR Flow Excessive Detected', 'تدفق زائد في نظام إعادة تدوير العادم', 'كمية الغازات المعاد تدويرها أعلى من المطلوب.', 'medium', 'ECM'],
    ['P0403', 'EGR Circuit Malfunction', 'عطل في دائرة نظام إعادة تدوير العادم', 'خلل كهربائي في صمام أو دائرة نظام EGR.', 'medium', 'ECM'],
    ['P0410', 'Secondary Air Injection System Malfunction', 'عطل في نظام حقن الهواء الثانوي', 'خلل في نظام حقن الهواء الثانوي المستخدم لتقليل الانبعاثات عند بدء التشغيل.', 'low', 'ECM'],
    ['P0430', 'Catalyst System Efficiency Below Threshold (Bank 2)', 'كفاءة المحول الحفاز أقل من الحد المطلوب (البنك 2)', 'أداء المحول الحفاز في البنك الثاني ضعيف.', 'medium', 'ECM'],
    ['P0441', 'EVAP System Incorrect Purge Flow', 'تدفق تطهير غير صحيح في نظام EVAP', 'كمية تدفق البخار المُطهَّر لا تطابق المطلوب.', 'low', 'ECM'],
    ['P0446', 'EVAP Vent Control Circuit Malfunction', 'عطل في دائرة صمام تهوية نظام EVAP', 'خلل في صمام التهوية الخاص بنظام تبخر الوقود.', 'low', 'ECM'],
    ['P0455', 'EVAP System Large Leak Detected', 'تسرب كبير في نظام EVAP', 'تسرب واضح في نظام تبخر الوقود، غالباً غطاء الخزان مفقود أو تالف.', 'medium', 'ECM'],
    ['P0456', 'EVAP System Small Leak Detected', 'تسرب صغير جداً في نظام EVAP', 'تسرب دقيق يصعب اكتشافه في نظام تبخر الوقود.', 'low', 'ECM'],
    ['P0460', 'Fuel Level Sensor Circuit Malfunction', 'عطل في دائرة حساس مستوى الوقود', 'قراءة غير منطقية من حساس مستوى خزان الوقود.', 'low', 'ECM'],
    ['P0480', 'Cooling Fan Relay 1 Circuit Malfunction', 'عطل في دائرة مرحل مروحة التبريد', 'خلل كهربائي في مرحل تشغيل مروحة تبريد الرادياتير.', 'medium', 'ECM'],
    ['P0501', 'Vehicle Speed Sensor Range/Performance', 'أداء غير طبيعي في حساس سرعة السيارة', 'قراءة حساس السرعة لا تطابق ظروف القيادة الفعلية.', 'medium', 'ECM'],
    ['P0506', 'Idle Control System RPM Lower Than Expected', 'سرعة الخمول أقل من المتوقع', 'دورة المحرك عند التوقف أقل من الطبيعي.', 'low', 'ECM'],
    ['P0507', 'Idle Control System RPM Higher Than Expected', 'سرعة الخمول أعلى من المتوقع', 'دورة المحرك عند التوقف أعلى من الطبيعي.', 'low', 'ECM'],
    ['P0510', 'Closed Throttle Position Switch Malfunction', 'عطل في مفتاح وضعية الخانق المغلق', 'خلل في مفتاح استشعار إغلاق الخانق بالكامل.', 'low', 'ECM'],
    ['P0560', 'System Voltage Malfunction', 'عطل عام في فولتية النظام', 'قراءة فولتية النظام الكهربائي غير طبيعية.', 'high', 'ECM'],
    ['P0563', 'System Voltage High', 'ارتفاع فولتية النظام', 'فولتية النظام الكهربائي أعلى من الحد الطبيعي، افحص المولد ومنظم الفولتية.', 'high', 'ECM'],
    ['P0601', 'Internal Control Module Memory Checksum Error', 'خطأ في ذاكرة وحدة التحكم الداخلية', 'خلل في التحقق من سلامة برمجة وحدة التحكم بالمحرك.', 'high', 'ECM'],
    ['P0602', 'Control Module Programming Error', 'خطأ في برمجة وحدة التحكم', 'برمجة وحدة التحكم غير مكتملة أو غير صحيحة.', 'high', 'ECM'],
    ['P0603', 'Internal Control Module Keep Alive Memory Error', 'خطأ في ذاكرة الإبقاء الدائم لوحدة التحكم', 'خلل في الذاكرة التي تحفظ الإعدادات عند إيقاف المحرك.', 'medium', 'ECM'],
    ['P0606', 'ECM/PCM Processor Fault', 'عطل في معالج وحدة التحكم بالمحرك', 'خلل داخلي في المعالج الرئيسي لوحدة التحكم.', 'high', 'ECM'],
    ['P0630', 'VIN Not Programmed or Mismatched - ECM/PCM', 'رقم الهيكل غير مبرمج أو غير مطابق', 'رقم الهيكل المخزن في وحدة التحكم غير مطابق أو غير مبرمج.', 'low', 'ECM'],
    ['P0705', 'Transmission Range Sensor Circuit Malfunction', 'عطل في دائرة حساس وضعية ناقل الحركة', 'خلل في حساس تحديد وضعية عتلة ناقل الحركة (P/R/N/D).', 'medium', 'TCM'],
    ['P0710', 'Transmission Fluid Temperature Sensor Circuit Malfunction', 'عطل في دائرة حساس حرارة زيت ناقل الحركة', 'قراءة غير منطقية من حساس حرارة زيت ناقل الحركة.', 'medium', 'TCM'],
    ['P0725', 'Engine Speed Input Circuit Malfunction', 'عطل في دائرة إدخال سرعة المحرك لناقل الحركة', 'خلل في إشارة سرعة المحرك الواصلة لوحدة التحكم بناقل الحركة.', 'medium', 'TCM'],
    ['P0731', 'Gear 1 Incorrect Ratio', 'نسبة تروس غير صحيحة - السرعة الأولى', 'ناقل الحركة لا يحقق نسبة السرعة الأولى الصحيحة.', 'high', 'TCM'],
    ['P0732', 'Gear 2 Incorrect Ratio', 'نسبة تروس غير صحيحة - السرعة الثانية', 'ناقل الحركة لا يحقق نسبة السرعة الثانية الصحيحة.', 'high', 'TCM'],
    ['P0740', 'Torque Converter Clutch Circuit Malfunction', 'عطل في دائرة قابض المحول العزمي', 'خلل في دائرة التحكم بقابض تحويل العزم.', 'medium', 'TCM'],
    ['P0743', 'Torque Converter Clutch Circuit Electrical', 'عطل كهربائي في دائرة قابض المحول العزمي', 'خلل كهربائي مباشر في دائرة قابض تحويل العزم.', 'medium', 'TCM'],
    ['P0755', 'Shift Solenoid B Malfunction', 'عطل في ملف تبديل السرعات B', 'خلل في ملف التحكم الهيدروليكي الثاني لناقل الحركة.', 'medium', 'TCM'],
    ['P0760', 'Shift Solenoid C Malfunction', 'عطل في ملف تبديل السرعات C', 'خلل في ملف التحكم الهيدروليكي الثالث لناقل الحركة.', 'medium', 'TCM'],

    // --- Additional chassis (ABS/Stability) codes ---
    ['C0044', 'Right Rear Wheel Speed Sensor Circuit', 'عطل في حساس سرعة العجلة الخلفية اليمنى', 'يؤثر على دقة عمل نظام الفرامل المانعة للانغلاق.', 'high', 'ABS'],
    ['C0060', 'Left Front ABS Solenoid Circuit', 'عطل في دائرة صمام ABS الأمامي الأيسر', 'خلل في صمام التحكم الهيدروليكي لعجلة أمامية يسرى.', 'high', 'ABS'],
    ['C0065', 'Right Front ABS Solenoid Circuit', 'عطل في دائرة صمام ABS الأمامي الأيمن', 'خلل في صمام التحكم الهيدروليكي لعجلة أمامية يمنى.', 'high', 'ABS'],
    ['C0121', 'Valve Relay Circuit Malfunction', 'عطل في دائرة مرحل صمامات ABS', 'خلل في مرحل التحكم بصمامات نظام ABS الهيدروليكية.', 'medium', 'ABS'],
    ['C0196', 'Lateral Acceleration Sensor Circuit', 'عطل في حساس التسارع الجانبي', 'خلل في حساس التسارع الجانبي المستخدم لنظام التحكم بالثبات.', 'medium', 'ABS'],
    ['C0200', 'Yaw Rate Sensor Circuit Malfunction', 'عطل في حساس معدل الانعطاف', 'خلل في الحساس المسؤول عن قياس دوران السيارة حول محورها الرأسي.', 'medium', 'ABS'],

    // --- Additional airbag/restraint codes ---
    ['B0035', 'Driver Side Deployment Control', 'عطل في تفعيل الوسادة الهوائية الجانبية للسائق', 'خلل في دائرة تفعيل الوسادة الجانبية بمقعد السائق.', 'high', 'SRS'],
    ['B0045', 'Passenger Side Deployment Control', 'عطل في تفعيل الوسادة الهوائية الجانبية للراكب', 'خلل في دائرة تفعيل الوسادة الجانبية بمقعد الراكب.', 'high', 'SRS'],
    ['B0054', 'Passenger Side Seat Belt Pretensioner', 'عطل في شادّ حزام أمان الراكب', 'خلل في دائرة شدّ الحزام عند الاصطدام لمقعد الراكب.', 'high', 'SRS'],
    ['B0082', 'Passenger Side Impact Sensor', 'عطل في حساس الصدمة الجانبية للراكب', 'يؤثر على استجابة نظام الوسائد الهوائية الجانبية للراكب.', 'high', 'SRS'],
    ['B0092', 'Rollover Sensor Circuit', 'عطل في حساس الانقلاب', 'خلل في الحساس المسؤول عن اكتشاف انقلاب المركبة.', 'high', 'SRS'],
    ['B0100', 'SRS Warning Lamp Circuit Malfunction', 'عطل في دائرة لمبة تحذير الوسائد الهوائية', 'خلل في دائرة إضاءة تحذير نظام SRS بلوحة القيادة.', 'low', 'SRS'],

    // --- Additional body control codes ---
    ['B1500', 'Vehicle Speed Sensor / Signal Circuit', 'عطل في دائرة إشارة سرعة السيارة بوحدة الهيكل', 'خلل في وصول إشارة السرعة لوحدة التحكم بالهيكل.', 'low', 'BCM'],
    ['B1600', 'Instrument Panel Cluster Communication', 'عطل في اتصال لوحة العدادات', 'خلل في اتصال لوحة العدادات مع باقي وحدات التحكم.', 'medium', 'BCM'],
    ['B2799', 'Power Door Lock Circuit', 'عطل في دائرة قفل الأبواب الكهربائي', 'خلل في دائرة التحكم بقفل الأبواب الكهربائي.', 'low', 'BCM'],

    // --- Additional network/communication codes ---
    ['U0155', 'Lost Communication With Instrument Panel Cluster', 'فقدان الاتصال مع لوحة العدادات', 'انقطاع في شبكة CAN مع وحدة لوحة العدادات.', 'medium', 'NET'],
    ['U0164', 'Lost Communication With HVAC Control Module', 'فقدان الاتصال مع وحدة تحكم المكيف', 'انقطاع في شبكة CAN مع وحدة التحكم بالتكييف.', 'low', 'NET'],
    ['U0184', 'Lost Communication With Radio', 'فقدان الاتصال مع نظام الصوت/الملتيميديا', 'انقطاع في شبكة CAN مع وحدة نظام الترفيه.', 'low', 'NET'],
    ['U0300', 'Internal Control Module Software Incompatibility', 'عدم توافق برمجي بين وحدات التحكم', 'إصدار البرمجيات في إحدى الوحدات غير متوافق مع باقي الشبكة.', 'medium', 'NET'],
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
