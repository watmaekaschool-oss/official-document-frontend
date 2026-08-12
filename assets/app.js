(() => {
  'use strict';
  window.OFFICIAL_DOC_APP_STARTED = true;

  const SCHOOL_LOGO_URL = 'https://i.postimg.cc/k4TFzHPQ/Screenshot-2026-06-16-150410.png';
  const FRONTEND_BUILD_VERSION = '3.9.5';
  const MEETING_DEFAULTS = Object.freeze({
    meetingTitle: 'รายงานการประชุมประจำสัปดาห์',
    location: 'ห้องประชุม อาคารอำนวยการ โรงเรียนวัดแม่กะ',
    chairman: 'นางสาวศิริยา อินทกาโมทย์',
    secretary: 'นายพิสิษฐ์ ตั้งสกุล',
  });

  const THEME_PRESETS = {
    formal: { name: 'ทางการ', description: 'แดงเข้มและทอง เหมาะกับงานราชการ', primary: '#b91c1c', secondary: '#f59e0b' },
    comfort: { name: 'สบายตา', description: 'เขียวหม่นและครีม ใช้งานนานไม่ล้าตา', primary: '#3f7d6b', secondary: '#e8c97a' },
    ocean: { name: 'สดใส', description: 'ฟ้าและเหลือง ให้ความรู้สึกกระฉับกระเฉง', primary: '#2563eb', secondary: '#fbbf24' },
    warm: { name: 'อบอุ่น', description: 'ส้มอิฐและทราย เป็นมิตรและอ่านง่าย', primary: '#c65d2e', secondary: '#f1c27d' },
    elegant: { name: 'เรียบหรู', description: 'กรมท่าและม่วงอ่อน สุภาพทันสมัย', primary: '#1e3a5f', secondary: '#a78bfa' },
    dark: { name: 'กลางคืน', description: 'เทาเข้มและม่วง ลดแสงจ้าในที่มืด', primary: '#1f2937', secondary: '#8b5cf6' },
  };

  const DEFAULT_DISPLAY_SETTINGS = {
    preset: 'formal',
    primary: THEME_PRESETS.formal.primary,
    secondary: THEME_PRESETS.formal.secondary,
    fontScale: 1,
    reducedMotion: false,
    highContrast: false,
    backgroundEnabled: false,
    backgroundUrl: '',
    backgroundOpacity: 0.12,
    pageSize: 25,
  };




  // 3.9.4 — cache PDF สำหรับเปิดเอกสารแบบด่วน
  const quickPdfCache = new Map();
  const quickPdfPrefetch = new Map();
  const QUICK_PDF_CACHE_LIMIT = 3;

  function rememberQuickPdf_(docId, result) {
    if (!docId || !result?.file?.base64) return result;
    quickPdfCache.delete(docId);
    quickPdfCache.set(docId, result);
    while (quickPdfCache.size > QUICK_PDF_CACHE_LIMIT) {
      const oldestKey = quickPdfCache.keys().next().value;
      quickPdfCache.delete(oldestKey);
    }
    return result;
  }

  async function prefetchDocumentFile_(docId) {
    if (!docId || quickPdfCache.has(docId)) return quickPdfCache.get(docId);
    if (quickPdfPrefetch.has(docId)) return quickPdfPrefetch.get(docId);

    const promise = gasCall('getDocumentFile', state.token, docId, false)
      .then((result) => rememberQuickPdf_(docId, result))
      .catch(() => null)
      .finally(() => quickPdfPrefetch.delete(docId));

    quickPdfPrefetch.set(docId, promise);
    return promise;
  }

  async function getDocumentFileQuick_(docId) {
    const cached = quickPdfCache.get(docId);
    if (cached?.file?.base64) {
      // PDF ถูกโหลดไว้ล่วงหน้าแล้ว จึง mark opened แยกเพื่อไม่โหลดไฟล์ซ้ำ
      try { await gasCall('markDocumentOpenedFast', state.token, docId); } catch (_) {}
      return cached;
    }

    const pending = quickPdfPrefetch.get(docId);
    if (pending) {
      const result = await pending;
      if (result?.file?.base64) {
        try { await gasCall('markDocumentOpenedFast', state.token, docId); } catch (_) {}
        return result;
      }
    }

    const result = await gasCall('getDocumentFile', state.token, docId, true);
    return rememberQuickPdf_(docId, result);
  }

  function base64PdfToBlobUrl_(base64) {
    const bytes = base64ToUint8Array(base64);
    const blob = new Blob([bytes], { type: 'application/pdf' });
    return URL.createObjectURL(blob);
  }

  function mascotArt(type) {
    const colors = {
      girl: ['#f9a8d4', '#7c3aed', '#fff7ed'],
      boy: ['#93c5fd', '#2563eb', '#fff7ed'],
      teacher: ['#c4b5fd', '#6d28d9', '#fff7ed'],
      bunny: ['#ffffff', '#f9a8d4', '#ffe4e6'],
      cat: ['#fde68a', '#f59e0b', '#fff7ed'],
      bear: ['#d6a46f', '#92400e', '#fef3c7'],
      chick: ['#fde047', '#f59e0b', '#fff7ed'],
      duck: ['#fde047', '#f97316', '#fff7ed'],
      panda: ['#f8fafc', '#111827', '#ffffff'],
      puppy: ['#fdba74', '#9a3412', '#fff7ed'],
      bird: ['#7dd3fc', '#0369a1', '#fef3c7'],
    };
    const c = colors[type] || colors.bunny;
    const eye = '<circle cx="42" cy="39" r="2.7" fill="#1f2937"/><circle cx="58" cy="39" r="2.7" fill="#1f2937"/><circle cx="43" cy="38" r=".8" fill="#fff"/><circle cx="59" cy="38" r=".8" fill="#fff"/>';
    const blush = '<ellipse cx="34" cy="47" rx="5" ry="2.5" fill="#fda4af" opacity=".55"/><ellipse cx="66" cy="47" rx="5" ry="2.5" fill="#fda4af" opacity=".55"/>';
    if (['girl', 'boy', 'teacher'].includes(type)) {
      const hair = type === 'girl'
        ? '<path d="M28 34c0-18 10-27 23-27 15 0 24 10 23 28-7-8-14-11-23-11-9 0-16 3-23 10z" fill="#6b3f2a"/><path d="M27 31c-4 9-2 21 4 28" fill="none" stroke="#6b3f2a" stroke-width="8" stroke-linecap="round"/>'
        : type === 'boy'
          ? '<path d="M28 31c1-17 11-24 24-24 11 0 20 6 23 18-8-5-13-7-20-7l4-7-11 7-5-8-3 9-12 12z" fill="#4b342b"/>'
          : '<path d="M28 32c0-17 10-25 23-25 14 0 23 9 23 26-6-7-13-10-23-10-9 0-16 3-23 9z" fill="#3f2d29"/><circle cx="34" cy="35" r="5" fill="none" stroke="#6d28d9" stroke-width="2"/><circle cx="58" cy="35" r="5" fill="none" stroke="#6d28d9" stroke-width="2"/><path d="M39 35h14" stroke="#6d28d9" stroke-width="2"/>';
      const accessory = type === 'girl' ? '<path d="M23 22l8-6 5 9-10 3z" fill="#f472b6"/>' : type === 'teacher' ? '<rect x="70" y="51" width="13" height="18" rx="2" fill="#fef3c7" stroke="#92400e"/><path d="M74 55h6M74 59h6M74 63h5" stroke="#92400e" stroke-width="1.3"/>' : '';
      return `<svg class="mascot-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <ellipse cx="50" cy="91" rx="25" ry="5" fill="#64748b" opacity=".18"/>
        <circle cx="50" cy="36" r="24" fill="${c[2]}" stroke="#fff" stroke-width="2"/>${hair}${eye}${blush}
        <path d="M45 49q5 5 10 0" fill="none" stroke="#b45309" stroke-width="2" stroke-linecap="round"/>
        <rect x="31" y="58" width="38" height="28" rx="13" fill="${c[0]}" stroke="#fff" stroke-width="2"/>
        <path d="M42 61l8 7 8-7" fill="none" stroke="${c[1]}" stroke-width="3" stroke-linecap="round"/>
        <circle cx="28" cy="70" r="7" fill="${c[2]}"/><circle cx="72" cy="70" r="7" fill="${c[2]}"/>
        <rect x="37" y="82" width="9" height="12" rx="4" fill="${c[1]}"/><rect x="54" y="82" width="9" height="12" rx="4" fill="${c[1]}"/>${accessory}
      </svg>`;
    }

    let ears = '';
    let extras = '';
    if (type === 'bunny') ears = '<ellipse cx="35" cy="18" rx="9" ry="19" fill="#fff" stroke="#f9a8d4" stroke-width="2"/><ellipse cx="65" cy="18" rx="9" ry="19" fill="#fff" stroke="#f9a8d4" stroke-width="2"/><ellipse cx="35" cy="18" rx="3" ry="12" fill="#fbcfe8"/><ellipse cx="65" cy="18" rx="3" ry="12" fill="#fbcfe8"/>';
    if (type === 'cat') ears = '<path d="M27 27L31 7l17 15z" fill="#fbbf24" stroke="#d97706" stroke-width="2"/><path d="M73 27L69 7 52 22z" fill="#fbbf24" stroke="#d97706" stroke-width="2"/>';
    if (type === 'bear' || type === 'panda') ears = `<circle cx="29" cy="23" r="10" fill="${c[1]}"/><circle cx="71" cy="23" r="10" fill="${c[1]}"/>`;
    if (type === 'puppy') ears = '<ellipse cx="25" cy="35" rx="11" ry="18" fill="#9a3412" transform="rotate(22 25 35)"/><ellipse cx="75" cy="35" rx="11" ry="18" fill="#9a3412" transform="rotate(-22 75 35)"/>';
    if (type === 'bird') extras = '<path d="M72 42l14 7-14 7z" fill="#f59e0b"/><path d="M29 61q-17 5-13 18 12-1 22-12" fill="#38bdf8"/>';
    if (type === 'chick') extras = '<path d="M71 43l13 6-13 6z" fill="#f97316"/><path d="M32 63q-13 3-11 13 10 0 17-8" fill="#facc15"/>';
    if (type === 'duck') extras = '<path d="M69 42h16q7 0 7 7t-7 7H69z" fill="#fb923c"/><path d="M31 62q-15 4-13 15 11 0 20-9" fill="#facc15"/><path d="M43 28q7-7 14 0" fill="none" stroke="#d97706" stroke-width="2" stroke-linecap="round"/>';
    if (type === 'panda') extras += '<ellipse cx="39" cy="39" rx="7" ry="9" fill="#111827" transform="rotate(20 39 39)"/><ellipse cx="61" cy="39" rx="7" ry="9" fill="#111827" transform="rotate(-20 61 39)"/>';
    if (type === 'cat') extras += '<path d="M31 48h-15M31 53H14M69 48h15M69 53h17" stroke="#92400e" stroke-width="1.7" stroke-linecap="round"/>';

    return `<svg class="mascot-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <ellipse cx="50" cy="91" rx="27" ry="5" fill="#64748b" opacity=".18"/>${ears}
      <ellipse cx="50" cy="70" rx="25" ry="22" fill="${c[0]}" stroke="#fff" stroke-width="2"/>
      <circle cx="50" cy="41" r="27" fill="${c[0]}" stroke="#fff" stroke-width="2"/>${extras}${eye}${blush}
      <ellipse cx="50" cy="49" rx="9" ry="7" fill="${c[2]}"/>
      <circle cx="50" cy="47" r="2.7" fill="${c[1]}"/>
      <path d="M45 52q5 5 10 0" fill="none" stroke="${c[1]}" stroke-width="2" stroke-linecap="round"/>
      <ellipse cx="31" cy="72" rx="8" ry="11" fill="${c[0]}"/><ellipse cx="69" cy="72" rx="8" ry="11" fill="${c[0]}"/>
    </svg>`;
  }

  const ADMIN_MASCOT_CATALOG = [
    { id: 'chibi-girl', name: 'เด็กหญิงจิบิ', icon: mascotArt('girl'), message: 'สู้ ๆ นะคะ ✨' },
    { id: 'chibi-boy', name: 'เด็กชายจิบิ', icon: mascotArt('boy'), message: 'วันนี้ทำได้แน่นอน!' },
    { id: 'chibi-teacher', name: 'คุณครูจิบิ', icon: mascotArt('teacher'), message: 'ตรวจเอกสารเรียบร้อยนะคะ' },
    { id: 'bunny', name: 'กระต่ายน้อย', icon: mascotArt('bunny'), message: 'ฮึบ ๆ ไปกันต่อ!' },
    { id: 'cat', name: 'แมวน้อย', icon: mascotArt('cat'), message: 'เหมียว~ งานใกล้เสร็จแล้ว' },
    { id: 'bear', name: 'หมีน้อย', icon: mascotArt('bear'), message: 'พักสายตาสักนิดนะ' },
    { id: 'chick', name: 'ลูกเจี๊ยบ', icon: mascotArt('chick'), message: 'ปิ๊บ ๆ มีงานใหม่ไหมนะ' },
    { id: 'panda', name: 'แพนด้าน้อย', icon: mascotArt('panda'), message: 'ใจเย็น ๆ แล้วค่อยทำ' },
    { id: 'puppy', name: 'สุนัขน้อย', icon: mascotArt('puppy'), message: 'พร้อมช่วยตรวจงานแล้ว!' },
    { id: 'bird', name: 'นกน้อย', icon: mascotArt('bird'), message: 'มีข่าวสารมาส่งค่ะ' },
  ];

  const DEFAULT_ADMIN_MASCOT_SETTINGS = {
    enabled: true,
    selected: ['chibi-girl', 'bunny', 'cat'],
    position: 'top',
    speed: 'normal',
  };

  const DEFAULT_WORKFLOW_MASCOT_SETTINGS = {
    enabled: true,
  };

  const ROLE_GUIDES = {
    'ธุรการ': {
      title: 'คู่มือการใช้งานสำหรับธุรการ',
      intro: 'ใช้สำหรับนำเข้าหนังสือ ส่งต่อผู้บริหาร จ่ายเรื่องให้ผู้รับ และดูแลบัญชีผู้ใช้งาน',
      steps: [
        ['นำเข้าหนังสือใหม่', 'กด “นำเข้าหนังสือใหม่” กรอกผู้ส่ง เรื่อง และเลือกรูปแบบการดำเนินงาน สามารถเพิ่มหนังสือหลายฉบับพร้อมกัน โดยแต่ละ PDF เป็นคนละหนังสือ หรือเลือกโหมดรวม PDF เป็นฉบับเดียวได้'],
        ['เปลี่ยนไฟล์หลังลงรับ', 'กด “เปลี่ยน PDF” ที่รายการเอกสาร ระบบจะเก็บไฟล์เดิมไว้ใน Drive และรีเซ็ตงานกลับเข้าคิวธุรการเพื่อประทับตราใหม่'],
        ['รวม PDF เพิ่มเติม', 'กด “ไฟล์แนบ” แล้วเลือก “รวม PDF เข้ากับเอกสารหลัก” สามารถเลือกหลายไฟล์ตามลำดับที่ต้องการต่อท้าย'],
        ['ตราเรียนผู้อำนวยการ', 'ในตราเสนอเรียนผู้อำนวยการ ระบบจะแสดงลายเซ็นธุรการเหนือชื่อเมื่อกำหนด signatureFileId ในชีต Users แล้ว'],
        ['ติดตามงานรอดำเนินการ', 'เปิดแท็บ “งานรอดำเนินการ” เพื่อตรวจว่าเอกสารอยู่ที่รองผู้อำนวยการ ผู้อำนวยการ หรือรอจ่ายเรื่อง'],
        ['จ่ายเรื่องให้ผู้รับ', 'เมื่อเอกสารกลับมาที่ธุรการ ให้เลือกครูหรือผู้รับที่เกี่ยวข้อง แล้วกดส่งเรื่อง'],
        ['สรุปการรับทราบสำหรับ LINE', 'กดปุ่ม LINE ข้างปุ่มรีเฟรช เลือกช่วงวันและติ๊กเอกสารได้หลายฉบับ ระบบจะสรุปจำนวนผู้รับและรายชื่อผู้ยังไม่รับทราบเป็นข้อความเดียวสำหรับส่งใน LINE'],
        ['จัดการผู้รับและดาวน์โหลด', 'กด “จัดการ” ข้างแท็บจดหมายทั้งหมด เพื่อเพิ่มหรือลบผู้รับด้วย Checkbox หรือดาวน์โหลด PDF รายวัน รายสัปดาห์ รายเดือน และช่วงวันที่'],
        ['ตั้งรหัสผ่านใหม่', 'ไปที่ ⚙ การตั้งค่า → จัดการผู้ใช้งาน แล้วเลือก “ตั้งรหัสใหม่” กรณีผู้ใช้ลืมรหัสเดิม'],
        ['ตรวจสอบสถานะ', 'ดูตัวเลขรับทราบในจดหมายเข้าและจดหมายทั้งหมด สีแดงหมายถึงยังไม่ครบ สีเขียวหมายถึงครบแล้ว'],
      ],
    },
    'รองผู้อำนวยการ': {
      title: 'คู่มือการใช้งานสำหรับรองผู้อำนวยการ',
      intro: 'ใช้สำหรับเปิดหนังสือที่รอดำเนินการ ประทับตรา ลงลายเซ็น และส่งต่อ',
      steps: [
        ['เปิดงานรอดำเนินการ', 'เลือกเอกสารจากแท็บ “งานรอดำเนินการ” แล้วกด “ประทับตรา / จัดการ”'],
        ['เลือกข้อความในตรา', 'เลือก ทราบ พิจารณา เห็นควรมอบ ยุติเรื่อง และเลือกฝ่ายที่เกี่ยวข้อง พร้อมพิมพ์ข้อสั่งการ หรือกด “ใช้งานผ่าน iPad” เพื่อเขียนด้วยปากกา'],
        ['กรณีรักษาการ', 'ตราจะแสดงตำแหน่งรองผู้อำนวยการโรงเรียนวัดแม่กะ และรักษาการแทนผู้อำนวยการโรงเรียนวัดแม่กะ'],
        ['จัดวางตรา', 'ระบบแสดงเอกสารครบทุกหน้า สามารถลากตราไปยังหน้าที่ต้องการ แล้วใช้เครื่องมือย่อ–ขยายก่อนบันทึก'],
        ['ส่งต่อ', 'ตรวจความถูกต้องของตราและลายเซ็น แล้วกดยืนยันเพื่อส่งเอกสารตามเส้นทางงาน'],
        ['แก้ไขผู้รับ', 'กด “จัดการ” ข้างจดหมายทั้งหมด เพื่อเพิ่มผู้รับที่ตกหล่นหรือลบผู้รับเดิม โดยผู้รับที่ยังเลือกจะคงสถานะเดิม'],
      ],
    },
    'ผู้อำนวยการ': {
      title: 'คู่มือการใช้งานสำหรับผู้อำนวยการ',
      intro: 'ใช้สำหรับพิจารณาหนังสือ ประทับตรา ลงลายเซ็น และส่งกลับธุรการ',
      steps: [
        ['เปิดเอกสาร', 'เลือกเอกสารในแท็บ “งานรอดำเนินการ” และเปิดหน้าเอกสาร'],
        ['ระบุคำสั่ง', 'เลือกตัวเลือกในตรา แล้วพิมพ์ข้อสั่งการ หรือกด “ใช้งานผ่าน iPad” เพื่อเขียนด้วย Apple Pencil'],
        ['ตรวจลายเซ็น', 'ตรวจว่าลายเซ็นและชื่อผู้ลงนามแสดงถูกต้องก่อนบันทึก'],
        ['จัดวางตรา', 'ระบบแสดงเอกสารครบทุกหน้า สามารถลากตราไปยังหน้าที่ต้องการ และย่อ–ขยายไม่ให้ทับเนื้อหาสำคัญ'],
        ['ส่งกลับธุรการ', 'กดยืนยันเพื่อส่งเอกสารกลับให้ธุรการดำเนินการจ่ายเรื่อง'],
        ['แก้ไขผู้รับ', 'กด “จัดการ” ข้างจดหมายทั้งหมด เพื่อเพิ่มผู้รับที่ตกหล่นหรือลบผู้รับเดิม โดยระบบบันทึกประวัติไว้ใน Audit Log'],
      ],
    },
    'ผู้ดูแลระบบสารบรรณ': {
      title: 'คู่มือสำหรับผู้ดูแลระบบสารบรรณ',
      intro: 'บทบาทพิเศษสำหรับดำเนินงานแทนธุรการ รองผู้อำนวยการ และผู้อำนวยการได้ทุกขั้นตอน โดยระบบยังบันทึก Audit Log ว่าดำเนินการแทนคิวใด',
      steps: [
        ['ทำงานทุกคิว', 'แท็บงานรอดำเนินการจะแสดงคิวธุรการ รองผู้อำนวยการ และผู้อำนวยการ สามารถเปิดและดำเนินงานต่อได้ตามสถานะปัจจุบัน'],
        ['วาระการประชุม', 'สร้าง แก้ไข ตรวจ ส่งต่อ และอัปโหลด PDF วาระการประชุมได้ตามคิวปัจจุบัน'],
        ['จัดการผู้รับ', 'เพิ่มหรือลบผู้รับเอกสารได้ โดยรักษาสถานะของผู้รับเดิมที่ยังคงเลือกไว้'],
        ['ปฏิทินเอกสาร', 'ใช้ปุ่ม “จัดเรียงตามปฏิทิน” เพื่อค้นหาเอกสารรายสัปดาห์ รายเดือน และรายปี'],
        ['แจ้งเตือน', 'ส่ง Web Push เตือนผู้รับรายคน และจัดการสรุป LINE OA รายวันร่วมกับธุรการได้'],
      ],
    },
    'ครู': {
      title: 'คู่มือการใช้งานสำหรับครู',
      intro: 'ใช้สำหรับเปิดอ่านหนังสือที่ได้รับ ดาวน์โหลดไฟล์ และยืนยันการรับทราบ',
      steps: [
        ['เปิดจดหมายเข้า', 'เลือกหนังสือจากแท็บ “จดหมายเข้า” แล้วกด “ดูเอกสาร”'],
        ['อ่านเอกสารและไฟล์แนบ', 'ตรวจรายละเอียดหนังสือและเปิดไฟล์แนบที่เกี่ยวข้อง'],
        ['กดรับทราบ', 'เมื่ออ่านเรียบร้อยแล้ว ให้กดปุ่ม “รับทราบ” ระบบจะนำลายเซ็นประจำบัญชีใส่ในกล่องทราบบน PDF อัตโนมัติ'],
        ['ดำเนินการเสร็จสิ้น', 'หลังรับทราบและดำเนินงานตามหนังสือแล้ว ให้เปิดแท็บ “รับทราบแล้ว” และกด “ดำเนินการเสร็จสิ้น” เอกสารจะย้ายไปหมวดเสร็จสิ้นเมื่อผู้รับทุกคนดำเนินการครบ'],
        ['ดาวน์โหลด', 'ใช้ปุ่มดาวน์โหลดเมื่อต้องการเก็บไฟล์ไว้ในเครื่อง'],
        ['ตรวจข้อมูลบัญชี', 'ไปที่ ⚙ การตั้งค่า → บัญชีของฉัน เพื่อดูชื่อ บทบาท ฝ่าย และสถานะลายเซ็น'],
      ],
    },
  };

  const root = document.getElementById('app-root');
  const state = {
    token: localStorage.getItem('officialDocToken') || sessionStorage.getItem('officialDocToken') || '',
    user: null,
    actionDocs: [],
    inboxDocs: [],
    acknowledgedDocs: [],
    completedDocs: [],
    allDocs: [],
    tab: 'action',
    currentDoc: null,
    currentPermissions: null,
    originalPdfBase64: '',
    currentPdf: null,
    currentPageNumber: 1,
    currentScale: 1.3,
    stampReferenceScale: 1.3,
    pdfPageViews: [],
    stampsInitialized: false,
    selectedStamp: null,
    stampInteractionMode: 'move',
    handwritingDataUrl: '',
    handwritingTarget: null,
    handwritingHistory: [],
    handwritingHasInk: false,
    allUsers: [],
    appSettings: null,
    adminUsers: [],
    displaySettings: null,
    mascotSettings: null,
    workflowMascotSettings: null,
    workflowMascotUntil: 0,
    workflowMascotTimer: null,
    activeModule: 'documents',
    meetingTab: 'action',
    meetingActionMeetings: [],
    meetingInboxMeetings: [],
    meetingAllMeetings: [],
    meetingSetupRequired: false,
    currentMeetingDetails: null,
    meetingEditorTab: 'notes',
    meetingUsers: [],
    pendingDocId: new URLSearchParams(window.location.search).get('doc') || '',
    deepLinkHandled: false,
    documentPage: 1,
    calendarFilter: null,
    calendarReturnTab: 'all',
  };

  applyDisplaySettings(loadDisplaySettings());

  function normalizedUserRole() {
    return String(state.user?.role || '')
      .normalize('NFC')
      .replace(/[\s\u200B-\u200D\uFEFF]+/g, '')
      .replace(/[.．·•_()（）\-]/g, '');
  }

  function isSystemDocumentAdmin() {
    const role = normalizedUserRole();
    return role.includes('ผู้ดูแลระบบสารบรรณ') || role === 'superadmin' || role === 'systemadmin';
  }

  function isClericalUser() {
    const role = normalizedUserRole();
    return role === 'ธุรการ' || role.includes('ธุรการ') || isSystemDocumentAdmin();
  }

  function canManageDocumentRecipients() {
    const role = guideRoleKey();
    return ['ธุรการ', 'รองผู้อำนวยการ', 'ผู้อำนวยการ', 'ผู้ดูแลระบบสารบรรณ'].includes(role);
  }


  function lineLogoMarkup() {
    return `<svg class="line-button-logo" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="2" y="2" width="44" height="44" rx="13" fill="#06c755"/><path d="M38.5 22.6c0-7.1-6.7-12.9-14.9-12.9S8.7 15.5 8.7 22.6c0 6.4 5.7 11.8 13.4 12.8.5.1 1.2.4 1.4.9.2.5.1 1.2.1 1.7l-.2 1.6c-.1.5-.4 2 1.8 1.1 2.2-.9 11.8-7 16.1-12 2.9-3.1 4.2-6.2 4.2-6.2h-7z" fill="#fff" opacity=".98" transform="translate(-5.8 0)"/><path d="M14.7 18.8h2.1v7h3.8v1.9h-5.9v-8.9zm7.1 0h2.1v8.9h-2.1v-8.9zm4 0h2l3.6 5.3v-5.3h2.1v8.9h-2l-3.6-5.3v5.3h-2.1v-8.9zm9.6 0h6v1.9h-3.9v1.5h3.7V24h-3.7v1.7h4.1v1.9h-6.2v-8.8z" fill="#06c755" transform="translate(-5.8 0)"/></svg>`;
  }

  function guideRoleKey() {
    const role = normalizedUserRole();
    if (role.includes('ผู้ดูแลระบบสารบรรณ') || role === 'superadmin' || role === 'systemadmin') {
      return 'ผู้ดูแลระบบสารบรรณ';
    }
    if (role.includes('รองผู้อำนวยการ') || role.includes('รองผู้อำนวย') || role.includes('รองผอ') || role.includes('รองฯ')) {
      return 'รองผู้อำนวยการ';
    }
    if (role.includes('ผู้อำนวยการ') || role.includes('ผู้อำนวย') || role === 'ผอ' || role.startsWith('ผอ')) {
      return 'ผู้อำนวยการ';
    }
    if (role.includes('ธุรการ')) return 'ธุรการ';
    return 'ครู';
  }

  function normalizeHexColor(value, fallback) {
    const text = String(value || '').trim();
    return /^#[0-9a-f]{6}$/i.test(text) ? text.toLowerCase() : fallback;
  }

  function mixHex(colorA, colorB, amount) {
    const a = normalizeHexColor(colorA, '#000000').slice(1);
    const b = normalizeHexColor(colorB, '#ffffff').slice(1);
    const ratio = Math.max(0, Math.min(1, Number(amount) || 0));
    const result = [0, 2, 4].map((index) => {
      const start = parseInt(a.slice(index, index + 2), 16);
      const end = parseInt(b.slice(index, index + 2), 16);
      return Math.round(start + (end - start) * ratio).toString(16).padStart(2, '0');
    }).join('');
    return `#${result}`;
  }

  function displayStorageKey(username) {
    const key = String(username || state.user?.username || 'guest').toLowerCase();
    return `officialDocDisplaySettings:${key}`;
  }

  function loadDisplaySettings(username) {
    let stored = null;
    try {
      stored = JSON.parse(localStorage.getItem(displayStorageKey(username)) || localStorage.getItem('officialDocDisplaySettings:last') || 'null');
    } catch (_) {}
    const merged = { ...DEFAULT_DISPLAY_SETTINGS, ...(stored || {}) };
    merged.primary = normalizeHexColor(merged.primary, DEFAULT_DISPLAY_SETTINGS.primary);
    merged.secondary = normalizeHexColor(merged.secondary, DEFAULT_DISPLAY_SETTINGS.secondary);
    merged.fontScale = [0.9, 1, 1.15].includes(Number(merged.fontScale)) ? Number(merged.fontScale) : 1;
    merged.reducedMotion = !!merged.reducedMotion;
    merged.highContrast = !!merged.highContrast;
    merged.backgroundEnabled = !!merged.backgroundEnabled;
    merged.backgroundUrl = String(merged.backgroundUrl || '').trim();
    merged.backgroundOpacity = Math.max(0, Math.min(0.45, Number(merged.backgroundOpacity ?? 0.12)));
    merged.pageSize = [15, 25, 50, 100].includes(Number(merged.pageSize)) ? Number(merged.pageSize) : 25;
    return merged;
  }

  function applyDisplaySettings(settings) {
    const next = { ...DEFAULT_DISPLAY_SETTINGS, ...(settings || {}) };
    next.primary = normalizeHexColor(next.primary, DEFAULT_DISPLAY_SETTINGS.primary);
    next.secondary = normalizeHexColor(next.secondary, DEFAULT_DISPLAY_SETTINGS.secondary);
    const rootStyle = document.documentElement.style;
    rootStyle.setProperty('--app-primary', next.primary);
    rootStyle.setProperty('--app-primary-dark', mixHex(next.primary, '#000000', .24));
    rootStyle.setProperty('--app-primary-soft', mixHex(next.primary, '#ffffff', .88));
    rootStyle.setProperty('--app-secondary', next.secondary);
    rootStyle.setProperty('--app-secondary-dark', mixHex(next.secondary, '#000000', .22));
    rootStyle.setProperty('--app-secondary-soft', mixHex(next.secondary, '#ffffff', .84));
    rootStyle.fontSize = `${16 * Number(next.fontScale || 1)}px`;
    document.documentElement.classList.toggle('reduced-motion', !!next.reducedMotion);
    document.documentElement.classList.toggle('high-contrast', !!next.highContrast);
    document.documentElement.classList.toggle('custom-app-background', !!next.backgroundEnabled && !!String(next.backgroundUrl || '').trim());
    rootStyle.setProperty('--app-background-image', next.backgroundEnabled && next.backgroundUrl ? `url("${String(next.backgroundUrl).replace(/"/g, '%22')}")` : 'none');
    rootStyle.setProperty('--app-background-opacity', String(Math.max(0, Math.min(0.45, Number(next.backgroundOpacity ?? 0.12)))));
    document.documentElement.dataset.themePreset = next.preset || 'custom';
    state.displaySettings = next;
  }

  function saveDisplaySettings(settings) {
    const next = { ...DEFAULT_DISPLAY_SETTINGS, ...(settings || {}) };
    localStorage.setItem(displayStorageKey(), JSON.stringify(next));
    localStorage.setItem('officialDocDisplaySettings:last', JSON.stringify(next));
    applyDisplaySettings(next);
  }


  function mascotStorageKey(username) {
    const key = String(username || state.user?.username || 'guest').toLowerCase();
    return `officialDocAdminMascots:${key}`;
  }

  function loadMascotSettings(username) {
    let stored = null;
    try {
      stored = JSON.parse(localStorage.getItem(mascotStorageKey(username)) || 'null');
    } catch (_) {}
    const next = { ...DEFAULT_ADMIN_MASCOT_SETTINGS, ...(stored || {}) };
    const validIds = new Set(ADMIN_MASCOT_CATALOG.map((item) => item.id));
    next.selected = Array.isArray(next.selected)
      ? next.selected.filter((id) => validIds.has(id)).slice(0, 10)
      : [...DEFAULT_ADMIN_MASCOT_SETTINGS.selected];
    if (!next.selected.length) next.selected = [...DEFAULT_ADMIN_MASCOT_SETTINGS.selected];
    next.position = ['top', 'page'].includes(next.position) ? next.position : 'top';
    next.speed = ['slow', 'normal', 'fast'].includes(next.speed) ? next.speed : 'normal';
    next.enabled = next.enabled !== false;
    return next;
  }

  function saveMascotSettings(settings) {
    const next = { ...DEFAULT_ADMIN_MASCOT_SETTINGS, ...(settings || {}) };
    next.selected = Array.isArray(next.selected) ? next.selected.slice(0, 10) : [];
    localStorage.setItem(mascotStorageKey(), JSON.stringify(next));
    state.mascotSettings = next;
    return next;
  }

  function workflowMascotStorageKey(username) {
    const key = String(username || state.user?.username || 'guest').toLowerCase();
    return `officialDocWorkflowMascot:${key}`;
  }

  function loadWorkflowMascotSettings(username) {
    let stored = null;
    try {
      stored = JSON.parse(localStorage.getItem(workflowMascotStorageKey(username)) || 'null');
    } catch (_) {}
    return {
      ...DEFAULT_WORKFLOW_MASCOT_SETTINGS,
      ...(stored || {}),
      enabled: stored?.enabled !== false,
    };
  }

  function saveWorkflowMascotSettings(settings) {
    const next = {
      ...DEFAULT_WORKFLOW_MASCOT_SETTINGS,
      ...(settings || {}),
      enabled: settings?.enabled !== false,
    };
    localStorage.setItem(workflowMascotStorageKey(), JSON.stringify(next));
    state.workflowMascotSettings = next;
    if (!next.enabled) {
      state.workflowMascotUntil = 0;
      if (state.workflowMascotTimer) {
        window.clearTimeout(state.workflowMascotTimer);
        state.workflowMascotTimer = null;
      }
    }
    return next;
  }

  function workflowMascotEnabled() {
    const settings = state.workflowMascotSettings || loadWorkflowMascotSettings();
    return settings.enabled !== false;
  }

  function mascotCharacterMarkup(item, index, speed) {
    const durationMap = { slow: 24, normal: 17, fast: 11 };
    const duration = durationMap[speed] || durationMap.normal;
    const delay = -(index * Math.max(1.8, duration / Math.max(3, ADMIN_MASCOT_CATALOG.length)));
    const pageTop = 18 + ((index * 13) % 66);
    const direction = index % 2 ? 'reverse' : 'normal';
    return `
      <button class="admin-mascot-character mascot-${escapeHtml(item.id)}"
        type="button"
        data-mascot-id="${escapeHtml(item.id)}"
        data-message="${escapeHtml(item.message)}"
        aria-label="${escapeHtml(item.name)}"
        title="แตะ ${escapeHtml(item.name)}"
        style="--mascot-index:${index};--mascot-duration:${duration}s;--mascot-delay:${delay}s;--mascot-page-top:${pageTop}%;--mascot-direction:${direction}">
        <span class="admin-mascot-body" aria-hidden="true">
          <span class="admin-mascot-icon">${item.icon}</span>
          <span class="admin-mascot-shadow"></span>
        </span>
      </button>`;
  }

  function mascotLayerMarkup() {
    if (!isClericalUser()) return '';
    const settings = state.mascotSettings || loadMascotSettings();
    if (!settings.enabled) return '';
    const selectedItems = settings.selected
      .map((id) => ADMIN_MASCOT_CATALOG.find((item) => item.id === id))
      .filter(Boolean)
      .slice(0, 10);
    if (!selectedItems.length) return '';
    const containerClass = settings.position === 'page'
      ? 'admin-mascot-layer mascot-position-page'
      : 'admin-mascot-runway mascot-position-top';
    return `
      <div id="admin-mascot-layer" class="${containerClass}" data-mascot-version="2.1.0" aria-label="มาสคอตสำหรับธุรการ">
        ${selectedItems.map((item, index) => mascotCharacterMarkup(item, index, settings.speed)).join('')}
      </div>`;
  }

  function createMascotBurst(character, message) {
    const rect = character.getBoundingClientRect();
    const burst = document.createElement('div');
    burst.className = 'mascot-click-burst';
    burst.style.left = `${rect.left + rect.width / 2}px`;
    burst.style.top = `${rect.top + rect.height / 2}px`;
    burst.innerHTML = `
      <span class="mascot-particle p1">♥</span>
      <span class="mascot-particle p2">★</span>
      <span class="mascot-particle p3">✦</span>
      <span class="mascot-particle p4">♥</span>
      <span class="mascot-speech">${escapeHtml(message || 'สวัสดีค่ะ')}</span>`;
    document.body.appendChild(burst);
    window.setTimeout(() => burst.remove(), 1500);
  }

  function bindAdminMascots() {
    if (!isClericalUser()) return;
    document.querySelectorAll('.admin-mascot-character').forEach((character) => {
      character.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const body = character.querySelector('.admin-mascot-body');
        const reactions = ['react-jump', 'react-spin', 'react-wiggle', 'react-pop'];
        const reaction = reactions[Math.floor(Math.random() * reactions.length)];
        body.classList.remove(...reactions);
        void body.offsetWidth;
        body.classList.add(reaction);
        createMascotBurst(character, character.dataset.message);
        window.setTimeout(() => body.classList.remove(reaction), 950);
      });
    });
  }


  function workflowMascotCounts() {
    if (isClericalUser()) return { pending: 0, unread: 0, action: 0 };
    const unread = (state.inboxDocs || []).filter((doc) => {
      const ownRecipient = (doc.recipients || []).find((item) => item.userId === state.user?.userId);
      return ownRecipient ? !ownRecipient.acknowledgedAt : false;
    }).length;
    const followup = (state.acknowledgedDocs || []).filter((doc) => {
      const ownRecipient = (doc.recipients || []).find((item) => item.userId === state.user?.userId);
      return ownRecipient ? !ownRecipient.completedAt : false;
    }).length;
    const action = (state.actionDocs || []).length;
    return { pending: unread + followup + action, unread, followup, action };
  }

  function workflowMascotMarkup() {
    if (isClericalUser() || !state.user || !workflowMascotEnabled()) return '';
    const counts = workflowMascotCounts();
    const celebrating = Number(state.workflowMascotUntil || 0) > Date.now();

    if (celebrating) {
      return `<aside id="workflow-mascot-host" class="workflow-mascot-host workflow-mascot-progress" aria-live="polite">
        <div class="workflow-mascot-card">
          <div class="workflow-mascot-art workflow-rabbit">${mascotArt('bunny')}</div>
          <div class="workflow-mascot-bubble"><b>ฮึบๆ ไปกันต่อ</b><span>บันทึกงานเรียบร้อยแล้ว</span></div>
        </div>
      </aside>`;
    }

    if (counts.pending > 0) {
      const detail = counts.unread > 0
        ? `มีเอกสารรอรับทราบ ${counts.unread} งาน`
        : counts.followup > 0
          ? `มีเอกสารรอกดดำเนินการเสร็จสิ้น ${counts.followup} งาน`
          : `มีเอกสารรอดำเนินการ ${counts.action} งาน`;
      return `<aside id="workflow-mascot-host" class="workflow-mascot-host workflow-mascot-new" aria-live="polite">
        <div class="workflow-mascot-card">
          <div class="workflow-mascot-art workflow-duck">${mascotArt('duck')}</div>
          <div class="workflow-mascot-bubble"><b>ปื๊บๆ มีงานใหม่เข้ามานะ</b><span>${escapeHtml(detail)}</span></div>
        </div>
      </aside>`;
    }

    return `<aside id="workflow-mascot-host" class="workflow-mascot-host workflow-mascot-done" aria-live="polite">
      <div class="workflow-mascot-card workflow-bear-card">
        <div class="workflow-mascot-art workflow-bear">${mascotArt('bear')}</div>
        <div class="workflow-mascot-bubble"><b>งานเสร็จแล้ว</b><span>ไม่มีงานค้างในขณะนี้</span></div>
      </div>
      <div class="workflow-mascot-card workflow-panda-card">
        <div class="workflow-mascot-art workflow-panda">${mascotArt('panda')}</div>
        <div class="workflow-mascot-bubble"><b>พักสายตาสักนิดนะ</b><span>แพนด้ากำลังกินไม้ไผ่อยู่</span></div>
      </div>
    </aside>`;
  }

  function refreshWorkflowMascot() {
    if (isClericalUser()) return;
    const slot = document.getElementById('workflow-mascot-slot');
    const current = document.getElementById('workflow-mascot-host');
    const wrapper = document.createElement('div');
    wrapper.innerHTML = workflowMascotMarkup().trim();
    const next = wrapper.firstElementChild;
    if (current && next) {
      current.replaceWith(next);
    } else if (slot) {
      slot.replaceChildren(...(next ? [next] : []));
    }
  }

  function triggerWorkflowMascotProgress() {
    if (isClericalUser() || !workflowMascotEnabled()) return;
    state.workflowMascotUntil = Date.now() + 4300;
    if (state.workflowMascotTimer) window.clearTimeout(state.workflowMascotTimer);
    state.workflowMascotTimer = window.setTimeout(() => {
      state.workflowMascotUntil = 0;
      refreshWorkflowMascot();
    }, 4400);
  }

  function openRoleGuide() {
    const guide = ROLE_GUIDES[guideRoleKey()] || ROLE_GUIDES['ครู'];
    const steps = guide.steps.map(([title, description], index) => `
      <div class="role-guide-step">
        <span>${index + 1}</span>
        <div><b>${escapeHtml(title)}</b><p>${escapeHtml(description)}</p></div>
      </div>`).join('');
    Swal.fire({
      title: guide.title,
      html: `<div class="role-guide-content"><p class="role-guide-intro">${escapeHtml(guide.intro)}</p>${steps}<div class="role-guide-tip">คำแนะนำ: ตรวจชื่อ เลขรับ เรื่อง และผู้รับทุกครั้งก่อนยืนยันการส่งเอกสาร</div></div>`,
      width: 720,
      confirmButtonText: 'ปิดคู่มือ',
      confirmButtonColor: state.displaySettings?.primary || '#b91c1c',
      customClass: { popup: 'role-guide-popup' },
    });
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function pixelTextMarkup(text) {
    return [...String(text || '')]
      .map((character, index) => `<span class="pixel-letter" style="--pixel-index:${index}">${character === ' ' ? '&nbsp;' : escapeHtml(character)}</span>`)
      .join('');
  }

  function operationBadge(operationMode) {
    if (operationMode === 'รักษาการ') {
      return '<span class="operation-badge operation-acting">รักษาการ</span>';
    }
    if (operationMode === 'ผู้อำนวยการดำเนินงาน') {
      return '<span class="operation-badge operation-director">ผู้อำนวยการดำเนินงาน</span>';
    }
    return '';
  }

  function gasCall(functionName, ...args) {
    return new Promise((resolve, reject) => {
      if (!window.google || !google.script || !google.script.run) {
        reject(new Error('หน้านี้ต้องเปิดผ่านลิงก์ Google Apps Script Web App'));
        return;
      }
      const runner = google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler((error) => reject(new Error(error && error.message ? error.message : String(error))));
      runner[functionName](...args);
    });
  }

  function loading(title, text = '') {
    Swal.fire({ title, text, allowOutsideClick: false, didOpen: () => Swal.showLoading() });
  }

  function showError(error) {
    const message = error && error.message ? error.message : String(error || 'เกิดข้อผิดพลาด');
    Swal.fire('เกิดข้อผิดพลาด', message, 'error');
    if (/เซสชันหมดอายุ|เข้าสู่ระบบใหม่/i.test(message)) clearSession();
  }

  function getWebDeviceId_() {
    const key = 'officialDocWebDeviceId';
    let value = localStorage.getItem(key) || '';
    if (!value) {
      value = 'WEB-' + Date.now() + '-' + Math.random().toString(36).slice(2, 12);
      localStorage.setItem(key, value);
    }
    return value;
  }

  function webClientInfo_() {
    return {
      deviceId: getWebDeviceId_(),
      platform: /iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'ios-web' : (/Android/i.test(navigator.userAgent) ? 'android-web' : 'desktop-web'),
      userAgent: navigator.userAgent || '',
    };
  }

  function clearSession() {
    state.token = '';
    state.user = null;
    localStorage.removeItem('officialDocToken');
    sessionStorage.removeItem('officialDocToken');
    renderLogin();
  }

  function renderLogin() {
    root.innerHTML = `
      <div class="login-aurora-shell">
        <div class="aurora-layer aurora-layer-one" aria-hidden="true"></div>
        <div class="aurora-layer aurora-layer-two" aria-hidden="true"></div>
        <div class="aurora-layer aurora-layer-three" aria-hidden="true"></div>
        <div class="aurora-wave aurora-wave-one" aria-hidden="true"></div>
        <div class="aurora-wave aurora-wave-two" aria-hidden="true"></div>
        <div class="aurora-sparkles" aria-hidden="true"></div>

        <div class="login-card card w-full max-w-md p-8">
          <div class="text-center mb-7">
            <div class="login-logo-wrap"><img class="brand-logo login" src="${SCHOOL_LOGO_URL}" alt="โลโก้โรงเรียนวัดแม่กะ"></div>
            <h1 class="login-system-title mt-4">
              <span>ระบบสารบรรณอิเล็กทรอนิกส์</span>
              <span class="login-school-name">โรงเรียนวัดแม่กะ</span>
            </h1>
            <div class="rainbow-wave-title" aria-label="Watmaeka school">
              <span>Watmaeka school</span>
            </div>
          </div>
          <form id="login-form" class="space-y-4">
            <div><label class="font-semibold text-sm text-slate-700">ชื่อผู้ใช้</label><input id="login-username" class="input login-input mt-1" autocomplete="username" placeholder="กรุณากรอกชื่อผู้ใช้" required></div>
            <div><label class="font-semibold text-sm text-slate-700">รหัสผ่าน</label><input id="login-password" type="password" class="input login-input mt-1" autocomplete="current-password" placeholder="กรุณากรอกรหัสผ่าน" required></div>
            <button class="btn btn-primary login-submit w-full py-3" type="submit">เข้าสู่ระบบ</button>
          </form>
          <button id="mobile-access-help" class="login-help-link" type="button">เปิดไม่ได้ใน Google Chrome มือถือ?</button>
          <p class="text-xs text-slate-400 text-center mt-3">เวอร์ชัน ${escapeHtml(window.APP_BOOTSTRAP?.version || '')}</p>
        </div>
      </div>`;
    const mobileHelpButton = document.getElementById('mobile-access-help');
    if (mobileHelpButton) mobileHelpButton.onclick = openMobileAccessHelp;
    document.getElementById('login-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      loading('กำลังตรวจสอบ...');
      try {
        const result = await gasCall('login', document.getElementById('login-username').value, document.getElementById('login-password').value, webClientInfo_());
        if (!result.success) {
          Swal.fire('เข้าสู่ระบบไม่สำเร็จ', result.message || 'ข้อมูลไม่ถูกต้อง', 'error');
          return;
        }
        state.token = result.token;
        state.user = result.user;
        applyDisplaySettings(loadDisplaySettings(state.user.username));
        state.mascotSettings = loadMascotSettings(state.user.username);
        state.workflowMascotSettings = loadWorkflowMascotSettings(state.user.username);
        localStorage.setItem('officialDocToken', state.token);
        sessionStorage.removeItem('officialDocToken');
        state.tab = guideRoleKey() === 'ครู' ? 'inbox' : 'action';
        await loadDashboard();
        Swal.close();
      } catch (error) { showError(error); }
    });
  }

  async function bootstrap() {
    if (!state.token) {
      renderLogin();
      return;
    }
    loading('กำลังเปิดระบบ...');
    try {
      const result = await gasCall('getSessionInfo', state.token);
      state.user = result.user;
      localStorage.setItem('officialDocToken', state.token);
      sessionStorage.removeItem('officialDocToken');
      applyDisplaySettings(loadDisplaySettings(state.user.username));
      state.mascotSettings = loadMascotSettings(state.user.username);
      state.workflowMascotSettings = loadWorkflowMascotSettings(state.user.username);
      state.tab = guideRoleKey() === 'ครู' ? 'inbox' : 'action';
      await loadDashboard();
      Swal.close();
    } catch (error) {
      clearSession();
      Swal.close();
    }
  }

  async function loadDashboard() {
    const [result, appSettings] = await Promise.all([
      gasCall('getDashboardDocuments', state.token),
      gasCall('getApplicationSettings', state.token),
    ]);
    state.actionDocs = result.actionDocs || [];
    state.inboxDocs = result.inboxDocs || [];
    state.acknowledgedDocs = result.acknowledgedDocs || [];
    state.completedDocs = result.completedDocs || [];
    state.allDocs = result.allDocs || [];
    state.user = result.user || state.user;
    state.appSettings = appSettings || state.appSettings;
    if (isClericalUser() && !state.mascotSettings) {
      state.mascotSettings = loadMascotSettings(state.user.username);
    }
    if (!isClericalUser() && !state.workflowMascotSettings) {
      state.workflowMascotSettings = loadWorkflowMascotSettings(state.user.username);
    }
    renderDashboard();
    maybeOpenDeepLinkedDocument_();
  }

  function maybeOpenDeepLinkedDocument_() {
    if (state.deepLinkHandled || !state.pendingDocId || !state.user) return;
    const docId = state.pendingDocId;
    state.deepLinkHandled = true;
    state.pendingDocId = '';
    window.setTimeout(() => {
      const doc = findDoc(docId);
      if (doc) {
        openWorkspace(docId, false);
      } else {
        Swal.fire('ไม่พบเอกสาร', 'เอกสารจากการแจ้งเตือนอาจถูกย้ายสถานะ หรือบัญชีนี้ไม่ได้เป็นผู้รับ กรุณาค้นหาจากเลขรับ', 'info');
      }
    }, 120);
  }

  function renderDashboard() {
    const isTeacher = guideRoleKey() === 'ครู';
    if (state.tab === 'all' && !state.calendarFilter) state.calendarFilter = currentMonthCalendarFilter_();
    root.innerHTML = `
      <div class="app-shell">
        <header class="topbar">
          <div class="max-w-7xl mx-auto px-4 py-3 flex justify-between gap-4 items-center">
            <div class="brand-mark">
              <img class="brand-logo" src="${SCHOOL_LOGO_URL}" alt="โลโก้โรงเรียน">
              <div class="brand-copy"><div class="brand-title-main text-lg">ทะเบียนหนังสือโรงเรียนวัดแม่กะ</div><div class="brand-title-sub pixel-build" aria-label="Watmaeka school">${pixelTextMarkup('Watmaeka school')}</div></div>
              <button id="role-guide-btn" class="header-guide-btn" type="button" aria-label="เปิดคู่มือการใช้งาน" title="คู่มือการใช้งาน">
                <span class="guide-book-animation" aria-hidden="true"><i class="guide-book-cover"></i><i class="guide-book-page guide-page-left"></i><i class="guide-book-page guide-page-right"></i></span>
                <span>คู่มือการใช้งาน</span>
              </button>
            </div>
            <div class="flex items-center gap-3">
              <div class="text-right hidden sm:block"><div class="font-semibold">${escapeHtml(state.user.name)}</div><div class="text-xs text-amber-100">${escapeHtml(state.user.role)}</div></div>
              <button id="download-center-btn" class="btn bg-white/15 text-white">⬇ ดาวน์โหลด</button>
              <button id="web-push-btn" class="web-push-header-btn" type="button" aria-label="การแจ้งเตือน" title="เปิดหรือทดสอบการแจ้งเตือน">🔔</button>
              <button id="settings-btn" class="settings-gear-btn" type="button" aria-label="การตั้งค่า" title="การตั้งค่า">⚙</button>
              <button id="logout-btn" class="btn bg-red-950/40 text-white">ออกจากระบบ</button>
            </div>
          </div>
        </header>
        ${mascotLayerMarkup()}
        <main class="max-w-7xl mx-auto px-4 py-6">
          <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div class="flex flex-wrap gap-2 items-stretch">
              ${isClericalUser() ? '<button id="upload-btn" class="btn btn-success">＋ นำเข้าหนังสือใหม่</button>' : ''}
              <button id="refresh-btn" class="btn btn-muted">↻ รีเฟรช</button>
              ${state.inboxDocs.some((doc) => {
                const own = (doc.recipients || []).find((item) => item.userId === state.user.userId);
                return own && !own.acknowledgedAt;
              }) ? '<button id="acknowledge-all-btn" class="btn btn-ack-all" type="button">✅ รับทราบทั้งหมด</button>' : ''}
              ${isClericalUser() ? `<button id="line-notify-btn" class="btn line-notify-btn" type="button" aria-label="สรุปการรับทราบสำหรับส่ง LINE" title="สรุปการรับทราบสำหรับส่ง LINE">${lineLogoMarkup()}<span>LINE</span></button>` : ''}
              <button id="meeting-module-btn" class="btn meeting-module-btn" type="button" aria-label="เปิดระบบวาระการประชุม" title="วาระการประชุม">📋 <span>วาระการประชุม</span></button>
              <button id="calendar-sort-btn" class="btn calendar-sort-btn" type="button" aria-label="จัดเรียงเอกสารตามปฏิทิน" title="จัดเรียงตามปฏิทิน">📅 <span>จัดเรียงตามปฏิทิน</span></button>
            </div>
            <div class="flex gap-2 items-center">
              <input id="search-input" class="input w-64 max-w-full" placeholder="ค้นหาเลขรับ เรื่อง หรือผู้ส่ง">
              <select id="doc-filter" class="input w-auto">
                <option value="all">ทั้งหมด</option>
                <option value="unread">ยังไม่รับทราบ</option>
                <option value="read">รับทราบแล้ว</option>
                <option value="incomplete">รับทราบยังไม่ครบ</option>
                <option value="complete">รับทราบครบ</option>
              </select>
            </div>
          </div>
          <div class="dashboard-tabs-mascot-row">
            <div class="dashboard-tabs flex gap-2 overflow-auto pb-1">
              ${!isTeacher ? `<button class="tab-button ${state.tab === 'action' ? 'active' : ''}" data-tab="action">งานรอดำเนินการ (${state.actionDocs.length})</button>` : ''}
              <button class="tab-button ${state.tab === 'inbox' ? 'active' : ''}" data-tab="inbox">จดหมายเข้า (${state.inboxDocs.length})</button>
              ${isTeacher ? `<button class="tab-button ${state.tab === 'acknowledged' ? 'active' : ''}" data-tab="acknowledged">รับทราบแล้ว (${state.acknowledgedDocs.length})</button><button class="tab-button ${state.tab === 'completed' ? 'active' : ''}" data-tab="completed">ดำเนินการเสร็จสิ้น (${state.completedDocs.length})</button>` : ''}
              <button class="tab-button ${state.tab === 'all' ? 'active' : ''}" data-tab="all">จดหมายทั้งหมด (${state.allDocs.length})</button>
              ${!isTeacher ? `<button id="document-manage-btn" class="tab-button document-manage-btn" type="button" title="แก้ไขผู้รับหรือดาวน์โหลดเอกสาร">⚙ จัดการ</button>` : ''}
            </div>
            <div id="workflow-mascot-slot" class="workflow-mascot-slot">${workflowMascotMarkup()}</div>
          </div>
          <div id="calendar-active-filter"></div>
          <div class="card table-wrap"><table class="data-table"><thead><tr><th>เลขรับ</th><th>จาก</th><th>เรื่อง</th><th>สถานะ</th><th>การจัดการ</th></tr></thead><tbody id="document-tbody"></tbody></table></div>
          <div id="document-pagination" class="document-pagination"></div>
        </main>
      </div>`;

    document.querySelectorAll('.guide-tool-btn, #guide-tool-btn').forEach((element) => element.remove());
    document.documentElement.dataset.frontendVersion = FRONTEND_BUILD_VERSION;

    document.getElementById('logout-btn').onclick = async () => {
      try { await gasCall('logout', state.token); } catch (_) {}
      clearSession();
    };
    document.getElementById('refresh-btn').onclick = async () => {
      loading('กำลังรีเฟรช...');
      try { await loadDashboard(); Swal.close(); } catch (error) { showError(error); }
    };
    const acknowledgeAllBtn = document.getElementById('acknowledge-all-btn');
    if (acknowledgeAllBtn) acknowledgeAllBtn.onclick = acknowledgeAllPendingDocuments;
    document.getElementById('download-center-btn').onclick = openDownloadCenter;
    document.getElementById('settings-btn').onclick = openSettingsPanel;
    document.getElementById('web-push-btn').onclick = openWebPushPanel;
    document.getElementById('role-guide-btn')?.addEventListener('click', openRoleGuide);
    bindAdminMascots();
    const uploadBtn = document.getElementById('upload-btn');
    if (uploadBtn) uploadBtn.onclick = openUploadModal;
    const lineNotifyBtn = document.getElementById('line-notify-btn');
    if (lineNotifyBtn) lineNotifyBtn.onclick = openLineNotificationModal;
    const documentManageBtn = document.getElementById('document-manage-btn');
    if (documentManageBtn) documentManageBtn.onclick = openDocumentManagementMenu;
    document.getElementById('meeting-module-btn').onclick = openMeetingModule;
    document.getElementById('calendar-sort-btn').onclick = openCalendarSortModal;
    document.querySelectorAll('[data-tab]').forEach((button) => {
      button.onclick = () => {
        state.tab = button.dataset.tab;
        state.documentPage = 1;
        if (state.tab === 'all' && !state.calendarFilter) state.calendarFilter = currentMonthCalendarFilter_();
        renderDashboard();
      };
    });
    document.getElementById('search-input').addEventListener('input', () => { state.documentPage = 1; renderDocumentRows(); });
    document.getElementById('doc-filter').addEventListener('change', () => { state.documentPage = 1; renderDocumentRows(); });
    renderDocumentRows();
  }

  function currentDocuments() {
    if (state.tab === 'action') return state.actionDocs;
    if (state.tab === 'inbox') return state.inboxDocs;
    if (state.tab === 'acknowledged') return state.acknowledgedDocs;
    if (state.tab === 'completed') return state.completedDocs;
    return state.allDocs;
  }


  function receiveNumberParts(value) {
    const match = String(value || '').trim().replace(/^'/, '').match(/^(\d+)\s*\/\s*(\d{4})$/);
    if (!match) return { valid: false, number: -1, year: -1 };
    return { valid: true, number: Number(match[1]), year: Number(match[2]) };
  }

  function sortDocumentsByReceiveNumberDesc(documents) {
    return [...(documents || [])].sort((a, b) => {
      const left = receiveNumberParts(a.recvNo);
      const right = receiveNumberParts(b.recvNo);
      if (left.valid !== right.valid) return right.valid ? 1 : -1;
      if (left.number !== right.number) return right.number - left.number;
      if (left.year !== right.year) return right.year - left.year;
      return new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0);
    });
  }


  function bangkokDateParts_(value) {
    const date = value instanceof Date ? value : new Date(value || Date.now());
    if (Number.isNaN(date.getTime())) return null;
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const map = {};
    parts.forEach((part) => { if (part.type !== 'literal') map[part.type] = part.value; });
    return {
      year: Number(map.year),
      month: Number(map.month),
      day: Number(map.day),
      key: `${map.year}-${map.month}-${map.day}`,
      monthKey: `${map.year}-${map.month}`,
    };
  }

  function currentMonthCalendarFilter_() {
    const parts = bangkokDateParts_(new Date()) || { year: new Date().getFullYear(), month: new Date().getMonth() + 1 };
    return { mode: 'month', year: parts.year, month: parts.month };
  }

  function addUtcDaysToYmd_(ymd, delta) {
    const match = String(ymd || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return '';
    const d = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + Number(delta || 0)));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  }

  function weekRangeFromYmd_(ymd) {
    const match = String(ymd || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    const d = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
    const day = d.getUTCDay() || 7; // Monday=1 ... Sunday=7
    const start = addUtcDaysToYmd_(ymd, 1 - day);
    const end = addUtcDaysToYmd_(start, 6);
    return { start, end };
  }

  function filterDocumentsByCalendar_(documents) {
    const docs = [...(documents || [])];
    if (state.tab !== 'all') return docs;
    const filter = state.calendarFilter || currentMonthCalendarFilter_();
    return docs.filter((doc) => {
      const parts = bangkokDateParts_(doc.createdAt || doc.updatedAt);
      if (!parts) return false;
      if (filter.mode === 'year') return parts.year === Number(filter.year);
      if (filter.mode === 'week') {
        const range = weekRangeFromYmd_(filter.anchor);
        return !!range && parts.key >= range.start && parts.key <= range.end;
      }
      return parts.year === Number(filter.year) && parts.month === Number(filter.month);
    });
  }

  function thaiMonthName_(month) {
    return ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'][Number(month) - 1] || '';
  }

  function calendarFilterLabel_() {
    const filter = state.calendarFilter || currentMonthCalendarFilter_();
    if (filter.mode === 'year') return `รายปี พ.ศ. ${Number(filter.year) + 543}`;
    if (filter.mode === 'week') {
      const range = weekRangeFromYmd_(filter.anchor);
      if (!range) return 'รายสัปดาห์';
      const [sy, sm, sd] = range.start.split('-').map(Number);
      const [ey, em, ed] = range.end.split('-').map(Number);
      return `รายสัปดาห์ ${sd} ${thaiMonthName_(sm)} ${sy + 543} – ${ed} ${thaiMonthName_(em)} ${ey + 543}`;
    }
    return `รายเดือน ${thaiMonthName_(filter.month)} ${Number(filter.year) + 543}`;
  }

  function renderCalendarActiveFilter_() {
    const host = document.getElementById('calendar-active-filter');
    if (!host) return;
    if (state.tab !== 'all') {
      host.innerHTML = '';
      return;
    }
    host.innerHTML = `<div class="calendar-filter-chip"><span>📅 ${escapeHtml(calendarFilterLabel_())}</span><button id="calendar-change-filter" type="button">เปลี่ยนช่วง</button></div>`;
    document.getElementById('calendar-change-filter')?.addEventListener('click', openCalendarSortModal);
  }

  async function openCalendarSortModal() {
    const allDocs = state.allDocs || [];
    const years = Array.from(new Set(allDocs.map((doc) => bangkokDateParts_(doc.createdAt || doc.updatedAt)?.year).filter(Boolean))).sort((a, b) => b - a);
    const nowParts = bangkokDateParts_(new Date());
    if (nowParts && !years.includes(nowParts.year)) years.unshift(nowParts.year);
    const current = state.calendarFilter || currentMonthCalendarFilter_();
    const defaultAnchor = current.mode === 'week' && current.anchor ? current.anchor : (nowParts?.key || new Date().toISOString().slice(0, 10));
    const defaultMonth = `${Number(current.year || nowParts.year)}-${String(Number(current.month || nowParts.month)).padStart(2, '0')}`;
    const defaultYear = Number(current.year || nowParts.year);
    let selectedMode = current.mode || 'month';

    const result = await Swal.fire({
      title: '📅 จัดเรียงตามปฏิทิน',
      html: `<div class="calendar-sort-dialog">
        <div class="calendar-mode-buttons">
          <button type="button" data-calendar-mode="week">รายสัปดาห์</button>
          <button type="button" data-calendar-mode="month">รายเดือน</button>
          <button type="button" data-calendar-mode="year">รายปี</button>
        </div>
        <div id="calendar-sort-input-host"></div>
        <p class="calendar-sort-note">เอกสารจะอ้างอิงวันที่ลงรับ และจดหมายทั้งหมดจะแสดงรายเดือนเป็นค่าเริ่มต้น</p>
      </div>`,
      showCancelButton: true,
      confirmButtonText: 'แสดงเอกสาร',
      cancelButtonText: 'ยกเลิก',
      didOpen: () => {
        const popup = Swal.getPopup();
        const host = popup.querySelector('#calendar-sort-input-host');
        const buttons = [...popup.querySelectorAll('[data-calendar-mode]')];
        const renderInput = () => {
          buttons.forEach((button) => button.classList.toggle('active', button.dataset.calendarMode === selectedMode));
          if (selectedMode === 'week') {
            host.innerHTML = `<label>เลือกวันที่ในสัปดาห์<input id="calendar-week-anchor" type="date" class="input" value="${escapeHtml(defaultAnchor)}"></label>`;
          } else if (selectedMode === 'year') {
            host.innerHTML = `<label>เลือกปี<select id="calendar-year" class="input">${years.map((year) => `<option value="${year}" ${year === defaultYear ? 'selected' : ''}>พ.ศ. ${year + 543}</option>`).join('')}</select></label>`;
          } else {
            host.innerHTML = `<label>เลือกเดือน<input id="calendar-month" type="month" class="input" value="${escapeHtml(defaultMonth)}"></label>`;
          }
        };
        buttons.forEach((button) => button.addEventListener('click', () => {
          selectedMode = button.dataset.calendarMode;
          renderInput();
        }));
        renderInput();
      },
      preConfirm: () => {
        const popup = Swal.getPopup();
        if (selectedMode === 'week') {
          const anchor = popup.querySelector('#calendar-week-anchor')?.value || '';
          if (!anchor) {
            Swal.showValidationMessage('กรุณาเลือกวันที่');
            return false;
          }
          return { mode: 'week', anchor };
        }
        if (selectedMode === 'year') {
          return { mode: 'year', year: Number(popup.querySelector('#calendar-year')?.value || defaultYear) };
        }
        const monthValue = popup.querySelector('#calendar-month')?.value || '';
        const match = monthValue.match(/^(\d{4})-(\d{2})$/);
        if (!match) {
          Swal.showValidationMessage('กรุณาเลือกเดือน');
          return false;
        }
        return { mode: 'month', year: Number(match[1]), month: Number(match[2]) };
      },
    });
    if (!result.isConfirmed || !result.value) return;
    state.calendarFilter = result.value;
    state.tab = 'all';
    state.documentPage = 1;
    renderDashboard();
  }

  function renderDocumentPagination_(totalCount) {
    const host = document.getElementById('document-pagination');
    if (!host) return;
    const pageSize = Number(state.displaySettings?.pageSize || 25);
    const totalPages = Math.max(1, Math.ceil(Number(totalCount || 0) / pageSize));
    state.documentPage = Math.max(1, Math.min(totalPages, Number(state.documentPage || 1)));
    if (totalPages <= 1) {
      host.innerHTML = totalCount ? `<span class="pagination-info">แสดง ${totalCount} รายการ</span>` : '';
      return;
    }
    const visible = [];
    const start = Math.max(1, state.documentPage - 2);
    const end = Math.min(totalPages, state.documentPage + 2);
    for (let page = start; page <= end; page += 1) visible.push(page);
    host.innerHTML = `<button type="button" class="btn-page" data-doc-page="${state.documentPage - 1}" ${state.documentPage <= 1 ? 'disabled' : ''}>← ก่อนหน้า</button>
      ${visible.map((page) => `<button type="button" class="btn-page ${page === state.documentPage ? 'active' : ''}" data-doc-page="${page}">${page}</button>`).join('')}
      <button type="button" class="btn-page" data-doc-page="${state.documentPage + 1}" ${state.documentPage >= totalPages ? 'disabled' : ''}>ถัดไป →</button>
      <span class="pagination-info">หน้า ${state.documentPage}/${totalPages} · ${totalCount} รายการ</span>`;
    host.querySelectorAll('[data-doc-page]').forEach((button) => {
      button.onclick = () => {
        const page = Number(button.dataset.docPage);
        if (!Number.isFinite(page) || page < 1 || page > totalPages) return;
        state.documentPage = page;
        renderDocumentRows();
        document.querySelector('.table-wrap')?.scrollIntoView({ behavior: state.displaySettings?.reducedMotion ? 'auto' : 'smooth', block: 'start' });
      };
    });
  }

  function acknowledgementButtonClass(doc) {
    const circular = doc?.dispatchMode === 'เวียนคณะครู' || doc?.dispatchType === 'เวียนคณะครู';
    const urgent = doc?.priority === 'ด่วน';
    if (circular && urgent) return 'ack-btn-circular-urgent';
    if (circular) return 'ack-btn-circular';
    if (urgent) return 'ack-btn-urgent';
    return 'ack-btn-normal';
  }

  function renderDocumentRows() {
    const tbody = document.getElementById('document-tbody');
    if (!tbody) return;
    const query = (document.getElementById('search-input')?.value || '').trim().toLowerCase();
    const filter = document.getElementById('doc-filter')?.value || 'all';
    let sourceDocs = currentDocuments();
    if (state.tab === 'all') sourceDocs = sortDocumentsByReceiveNumberDesc(filterDocumentsByCalendar_(sourceDocs));
    renderCalendarActiveFilter_();
    let docs = sourceDocs.filter((doc) => {
      const text = `${doc.recvNo} ${doc.subject} ${doc.fromSender} ${doc.status} ${doc.operationMode || ''} ${doc.priority || ''} ${doc.dispatchMode || ''}`.toLowerCase();
      if (query && !text.includes(query)) return false;
      const ownRecipient = (doc.recipients || []).find((item) => item.userId === state.user.userId);
      if (filter === 'unread') return ownRecipient ? !ownRecipient.acknowledgedAt : doc.ackCount < doc.recipientCount;
      if (filter === 'read') return ownRecipient ? !!ownRecipient.acknowledgedAt : false;
      if (filter === 'incomplete') return doc.recipientCount > 0 && doc.ackCount < doc.recipientCount;
      if (filter === 'complete') return doc.recipientCount > 0 && doc.ackCount === doc.recipientCount;
      return true;
    });
    const totalFiltered = docs.length;
    renderDocumentPagination_(totalFiltered);
    if (!docs.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center text-slate-500 py-8">ไม่มีเอกสารในรายการนี้</td></tr>';
      return;
    }
    const pageSize = Number(state.displaySettings?.pageSize || 25);
    const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
    state.documentPage = Math.max(1, Math.min(totalPages, Number(state.documentPage || 1)));
    docs = docs.slice((state.documentPage - 1) * pageSize, state.documentPage * pageSize);
    tbody.innerHTML = docs.map((doc) => {
      const isAckComplete = Number(doc.recipientCount || 0) > 0 && Number(doc.ackCount || 0) >= Number(doc.recipientCount || 0);
      const showAckCompletionColor = ['inbox', 'acknowledged', 'completed', 'all'].includes(state.tab);
      const ackStatusClass = showAckCompletionColor
        ? (isAckComplete ? 'text-green-600 font-bold' : 'text-red-600 font-bold')
        : 'text-slate-600';
      const completionCount = Number(doc.completionCount || 0);
      const recipientCount = Number(doc.recipientCount || 0);
      const recipientText = recipientCount
        ? `<button class="text-xs ${ackStatusClass} underline ack-status-btn" data-doc-id="${escapeHtml(doc.docId)}">รับทราบ ${doc.ackCount}/${recipientCount} • เสร็จสิ้น ${completionCount}/${recipientCount}</button>`
        : '';
      const ownRecipient = (doc.recipients || []).find((item) => item.userId === state.user.userId);
      const ackButton = state.tab === 'inbox' && ownRecipient && !ownRecipient.acknowledgedAt
        ? `<button class="btn text-xs acknowledge-btn ${acknowledgementButtonClass(doc)}" data-doc-id="${escapeHtml(doc.docId)}">รับทราบ</button>` : '';
      const completeButton = ownRecipient && ownRecipient.acknowledgedAt && !ownRecipient.completedAt && !doc.allRecipientsCompleted
        ? `<button class="btn btn-success text-xs complete-doc-btn" data-doc-id="${escapeHtml(doc.docId)}">ดำเนินการเสร็จสิ้น</button>` : '';
      const waitingMessage = ownRecipient?.completedAt && !doc.allRecipientsCompleted
        ? `<div class="recipient-waiting-note">✓ คุณดำเนินการแล้ว — รอผู้รับคนอื่น</div>` : '';
      const priorityBadge = doc.priority === 'ด่วน' ? '<span class="badge badge-urgent">ด่วน</span>' : '<span class="badge badge-normal">ปกติ</span>';
      const circularBadge = doc.dispatchMode === 'เวียนคณะครู' || doc.dispatchType === 'เวียนคณะครู'
        ? '<span class="badge badge-circular">เวียนคณะครู</span>' : '';
      const actionButton = state.tab === 'action'
        ? `<button class="btn btn-primary text-xs action-doc-btn" data-doc-id="${escapeHtml(doc.docId)}">ประทับตรา / จัดการ</button>`
        : `<button class="btn btn-muted text-xs view-doc-btn quick-view-btn" data-doc-id="${escapeHtml(doc.docId)}">⚡ เปิดด่วน</button>`;
      const replaceButton = isClericalUser()
        ? `<button class="btn btn-warning text-xs replace-doc-btn" data-doc-id="${escapeHtml(doc.docId)}">เปลี่ยน PDF</button>`
        : '';
      const reminderButton = isClericalUser() && recipientCount
        ? `<button class="btn btn-reminder text-xs reminder-doc-btn" data-doc-id="${escapeHtml(doc.docId)}">🔔 ส่งการแจ้งเตือน</button>`
        : '';
      return `<tr>
        <td class="font-bold text-slate-700 whitespace-nowrap">${escapeHtml(doc.recvNo)}</td>
        <td class="whitespace-nowrap">${escapeHtml(doc.fromSender)}</td>
        <td><div class="font-semibold">${escapeHtml(doc.subject)}</div><div class="text-xs text-slate-400 mt-1">${escapeHtml(doc.docId)}</div></td>
        <td><div class="flex flex-wrap gap-2 items-center"><span class="badge">${escapeHtml(doc.status)}</span>${operationBadge(doc.operationMode)}${doc.recipientCount ? priorityBadge : ''}${circularBadge}</div><div class="mt-2">${recipientText}</div></td>
        <td><div class="flex flex-col gap-2">${actionButton}${ackButton}${completeButton}${waitingMessage}${reminderButton}${replaceButton}<button class="btn btn-purple text-xs attachment-btn" data-doc-id="${escapeHtml(doc.docId)}">ไฟล์แนบ / รวม PDF (${(doc.attachments || []).length})</button></div></td>
      </tr>`;
    }).join('');

    tbody.querySelectorAll('.action-doc-btn').forEach((button) => button.onclick = () => openWorkspace(button.dataset.docId, true));
    tbody.querySelectorAll('.view-doc-btn').forEach((button) => {
      button.onclick = () => openQuickDocumentViewer(button.dataset.docId);
      let hoverTimer = null;
      const warm = () => {
        clearTimeout(hoverTimer);
        hoverTimer = setTimeout(() => prefetchDocumentFile_(button.dataset.docId), 120);
      };
      button.addEventListener('mouseenter', warm, { passive: true });
      button.addEventListener('focus', warm, { passive: true });
      button.addEventListener('touchstart', () => prefetchDocumentFile_(button.dataset.docId), { passive: true, once: true });
    });
    tbody.querySelectorAll('.acknowledge-btn').forEach((button) => button.onclick = () => acknowledge(button.dataset.docId));
    tbody.querySelectorAll('.complete-doc-btn').forEach((button) => button.onclick = () => completeDocument(button.dataset.docId));
    tbody.querySelectorAll('.ack-status-btn').forEach((button) => button.onclick = () => showAckStatus(button.dataset.docId));
    tbody.querySelectorAll('.attachment-btn').forEach((button) => button.onclick = () => openAttachments(button.dataset.docId));
    tbody.querySelectorAll('.replace-doc-btn').forEach((button) => button.onclick = () => openReplaceDocumentModal(button.dataset.docId));
    tbody.querySelectorAll('.reminder-doc-btn').forEach((button) => button.onclick = () => openDocumentReminderModal(button.dataset.docId));
  }


  function findDoc(docId) {
    return [...state.actionDocs, ...state.inboxDocs, ...state.acknowledgedDocs, ...state.completedDocs, ...state.allDocs].find((doc) => doc.docId === docId);
  }


  const MAX_CLIENT_PDF_BYTES = 15 * 1024 * 1024;

  function selectedFiles(input) {
    return [...(input?.files || [])];
  }

  function validatePdfFiles(files, requireAtLeastOne = true) {
    const list = [...(files || [])];
    if (requireAtLeastOne && !list.length) throw new Error('กรุณาเลือกไฟล์ PDF อย่างน้อย 1 ไฟล์');
    list.forEach((file) => {
      const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name || '');
      if (!isPdf) throw new Error(`ไฟล์ ${file.name || '-'} ไม่ใช่ PDF`);
      if (Number(file.size || 0) <= 0) throw new Error(`ไฟล์ ${file.name || '-'} ว่างเปล่า`);
      if (Number(file.size || 0) > MAX_CLIENT_PDF_BYTES) throw new Error(`ไฟล์ ${file.name || '-'} มีขนาดเกิน 15 MB`);
    });
    return list;
  }

  function renderPdfSelection(input, host, prefixText = '') {
    if (!host) return;
    const files = selectedFiles(input);
    if (!files.length) {
      host.innerHTML = '<span class="text-slate-400">ยังไม่ได้เลือกไฟล์</span>';
      return;
    }
    host.innerHTML = `${prefixText ? `<div class="merge-prefix-note">${escapeHtml(prefixText)}</div>` : ''}<ol class="pdf-order-list">${files.map((file, index) => `<li><b>${index + 1}.</b><span>${escapeHtml(file.name)}</span><small>${(file.size / (1024 * 1024)).toFixed(2)} MB</small></li>`).join('')}</ol>`;
  }

  async function mergePdfFiles(files, options = {}) {
    const list = validatePdfFiles(files);
    const output = await PDFLib.PDFDocument.create();
    let pageCount = 0;

    const appendBytes = async (bytes, label) => {
      let source;
      try {
        source = await PDFLib.PDFDocument.load(bytes);
      } catch (error) {
        throw new Error(`ไม่สามารถเปิด PDF ${label || ''} ได้ อาจมีรหัสผ่านหรือไฟล์เสีย`);
      }
      const indices = source.getPageIndices();
      if (!indices.length) throw new Error(`PDF ${label || ''} ไม่มีหน้าเอกสาร`);
      const pages = await output.copyPages(source, indices);
      pages.forEach((page) => output.addPage(page));
      pageCount += pages.length;
    };

    if (options.prependBase64) {
      await appendBytes(base64ToUint8Array(options.prependBase64), options.prependLabel || 'เอกสารหลัก');
    }

    for (const file of list) {
      await appendBytes(new Uint8Array(await file.arrayBuffer()), file.name);
    }

    const mergedBytes = await output.save({ useObjectStreams: true });
    if (mergedBytes.length > MAX_CLIENT_PDF_BYTES) {
      throw new Error(`ไฟล์ที่รวมแล้วมีขนาด ${(mergedBytes.length / (1024 * 1024)).toFixed(2)} MB เกินขีดจำกัด 15 MB กรุณาลดจำนวนหรือบีบอัดไฟล์ก่อน`);
    }
    const name = String(options.fileName || `รวมเอกสาร-${Date.now()}.pdf`).replace(/[\\/:*?"<>|]/g, '_');
    return {
      file: new File([mergedBytes], name, { type: 'application/pdf', lastModified: Date.now() }),
      pageCount,
      size: mergedBytes.length,
    };
  }

  function buildFileUploadForm(fileFieldName, file, fields = {}) {
    if (typeof DataTransfer === 'undefined') {
      throw new Error('เบราว์เซอร์นี้ไม่รองรับการเตรียมไฟล์ กรุณาเปิดด้วย Google Chrome รุ่นปัจจุบัน');
    }
    const form = document.createElement('form');
    form.className = 'hide';
    Object.entries(fields).forEach(([name, value]) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = value == null ? '' : String(value);
      form.appendChild(input);
    });
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.name = fileFieldName;
    const transfer = new DataTransfer();
    transfer.items.add(file);
    fileInput.files = transfer.files;
    form.appendChild(fileInput);
    document.body.appendChild(form);
    return form;
  }

  async function uploadFileForm(functionName, fileFieldName, file, fields) {
    const form = buildFileUploadForm(fileFieldName, file, fields);
    try {
      return await gasCall(functionName, form);
    } finally {
      form.remove();
    }
  }

  async function uploadAttachmentFile(docId, file) {
    return uploadFileForm('uploadAttachment', 'attachmentFile', file, {
      sessionToken: state.token,
      docId,
    });
  }

  function openReplaceDocumentModal(docId) {
    const doc = findDoc(docId);
    if (!doc || !isClericalUser()) return;
    const overlay = document.createElement('div');
    overlay.className = 'modal-backdrop';
    overlay.innerHTML = `<div class="modal-panel max-w-xl">
      <div class="flex justify-between items-center mb-4"><div><h2 class="text-xl font-bold">เปลี่ยนไฟล์เอกสาร</h2><p class="text-sm text-slate-500">${escapeHtml(doc.recvNo)} — ${escapeHtml(doc.subject)}</p></div><button class="text-2xl close-modal">×</button></div>
      <div class="replacement-warning"><b>ข้อมูลที่ระบบจะทำให้อัตโนมัติ</b><ul><li>เก็บไฟล์เดิมไว้ใน Google Drive และ Audit Log</li><li>รวม PDF ที่เลือกตามลำดับเป็นไฟล์ใหม่</li><li>รีเซ็ตสถานะกลับเป็น “รอธุรการประทับตรา”</li><li>ล้างรายชื่อผู้รับเดิมเพื่อให้ดำเนินงานใหม่อย่างถูกต้อง</li><li>ไฟล์แนบเดิมยังคงอยู่ครบ</li></ul></div>
      <form id="replace-document-form" class="space-y-4">
        <div><label class="font-semibold text-sm">เลือก PDF ใหม่ได้หลายไฟล์</label><input id="replacement-pdf-files" class="input mt-1" type="file" accept="application/pdf,.pdf" multiple required><p class="text-xs text-slate-500 mt-1">ระบบจะรวมตามลำดับที่เลือก ไฟล์รวมต้องไม่เกิน 15 MB</p></div>
        <div id="replacement-pdf-order" class="pdf-selection-summary"></div>
        <label class="confirm-reset-check"><input id="confirm-replace-reset" type="checkbox" required><span>ฉันตรวจสอบแล้วและยืนยันให้เอกสารกลับไปเริ่มขั้นตอนประทับตราใหม่</span></label>
        <div class="flex justify-end gap-2"><button type="button" class="btn btn-muted close-modal">ยกเลิก</button><button class="btn btn-warning" type="submit">เปลี่ยนไฟล์และเริ่มดำเนินงานใหม่</button></div>
      </form>
    </div>`;
    document.body.appendChild(overlay);
    const input = overlay.querySelector('#replacement-pdf-files');
    const summary = overlay.querySelector('#replacement-pdf-order');
    renderPdfSelection(input, summary);
    input.onchange = () => renderPdfSelection(input, summary);
    overlay.querySelectorAll('.close-modal').forEach((button) => button.onclick = () => overlay.remove());
    overlay.querySelector('#replace-document-form').onsubmit = async (event) => {
      event.preventDefault();
      if (!overlay.querySelector('#confirm-replace-reset').checked) return;
      loading('กำลังรวมและเปลี่ยน PDF...', 'ไฟล์เดิมจะถูกเก็บไว้เป็นประวัติ');
      try {
        const files = validatePdfFiles(selectedFiles(input));
        const merged = await mergePdfFiles(files, {
          fileName: `${doc.recvNo.replace('/', '-')}-${doc.subject}-replacement.pdf`,
        });
        const result = await uploadFileForm('replaceDocumentFile', 'replacementPdfFile', merged.file, {
          sessionToken: state.token,
          docId,
          sourceNames: JSON.stringify(files.map((file) => file.name)),
        });
        overlay.remove();
        await loadDashboard();
        Swal.fire('เปลี่ยนไฟล์สำเร็จ', `เอกสาร ${doc.recvNo} ถูกรีเซ็ตกลับเข้าคิวธุรการแล้ว (${result.pageCount || merged.pageCount} หน้า)`, 'success');
      } catch (error) {
        showError(error);
      }
    };
  }

  function openUploadModal() {
    const defaultSender = state.appSettings?.defaults?.fromSender || 'สพป.ชม.2';
    const defaultOperationMode = state.appSettings?.defaults?.operationMode || 'normal';
    const overlay = document.createElement('div');
    overlay.className = 'modal-backdrop';
    overlay.innerHTML = `<div class="modal-panel upload-multi-panel">
      <div class="flex justify-between items-center mb-4">
        <div>
          <h2 class="text-xl font-bold">นำเข้าหนังสือรับเรื่องใหม่</h2>
          <p class="text-xs text-slate-500 mt-1">เพิ่มได้หลายฉบับในครั้งเดียว โดยระบบออกเลขรับต่อเนื่องให้อัตโนมัติ</p>
        </div>
        <button class="text-2xl close-modal">×</button>
      </div>

      <form id="upload-form" class="space-y-4">
        <input type="hidden" name="sessionToken" value="${escapeHtml(state.token)}">

        <div class="multi-upload-mode">
          <label class="multi-upload-mode-card active">
            <input type="radio" name="uploadMode" value="separate" checked>
            <span>
              <b>📚 เพิ่มหลายฉบับ</b>
              <small>PDF แต่ละไฟล์ = หนังสือคนละฉบับ เหมาะกับการนำเข้าหลายเรื่องพร้อมกัน</small>
            </span>
          </label>
          <label class="multi-upload-mode-card">
            <input type="radio" name="uploadMode" value="merge">
            <span>
              <b>📎 รวมเป็นฉบับเดียว</b>
              <small>รวม PDF หลายไฟล์ตามลำดับให้เป็นหนังสือฉบับเดียว</small>
            </span>
          </label>
        </div>

        <div>
          <label class="font-semibold text-sm">ไฟล์ PDF</label>
          <input id="new-document-pdf-files" class="input mt-1" type="file" accept="application/pdf,.pdf" multiple required>
          <p id="new-document-file-help" class="text-xs text-slate-500 mt-1">
            เลือก PDF ได้หลายไฟล์ แต่ละไฟล์จะถูกสร้างเป็นหนังสือคนละฉบับ
          </p>
        </div>

        <div id="new-document-pdf-order" class="pdf-selection-summary"></div>

        <div id="multi-document-fields" class="multi-document-fields">
          <div class="multi-document-empty">เลือกไฟล์ PDF เพื่อกรอกชื่อเรื่องของแต่ละฉบับ</div>
        </div>

        <div id="single-document-fields" class="hide space-y-3">
          <div>
            <label class="font-semibold text-sm">จาก</label>
            <input class="input mt-1" name="fromSenderMerged" value="${escapeHtml(defaultSender)}">
          </div>
          <div>
            <label class="font-semibold text-sm">เรื่อง</label>
            <input class="input mt-1" name="subjectMerged">
          </div>
        </div>

        <fieldset class="operation-picker">
          <legend>การดำเนินงาน</legend>
          <label class="operation-option operation-normal">
            <input type="radio" name="operationMode" value="normal" ${defaultOperationMode === 'normal' ? 'checked' : ''}>
            <span><b>1. ปกติ</b><small>ธุรการ → รองผู้อำนวยการ → ผู้อำนวยการ</small></span>
          </label>
          <label class="operation-option operation-acting-option">
            <input type="radio" name="operationMode" value="acting" ${defaultOperationMode === 'acting' ? 'checked' : ''}>
            <span><b>2. รองรักษาการ</b><small>รองผู้อำนวยการรักษาการแทนผู้อำนวยการ</small></span>
          </label>
          <label class="operation-option operation-director-option">
            <input type="radio" name="operationMode" value="director" ${defaultOperationMode === 'director' ? 'checked' : ''}>
            <span><b>3. รองผู้อำนวยการไม่อยู่</b><small>ส่งตรงให้ผู้อำนวยการดำเนินงาน</small></span>
          </label>
        </fieldset>

        <div class="flex justify-end gap-2">
          <button type="button" class="btn btn-muted close-modal">ยกเลิก</button>
          <button id="multi-upload-submit" class="btn btn-primary" type="submit">📚 เพิ่มหนังสือ</button>
        </div>
      </form>
    </div>`;

    document.body.appendChild(overlay);

    const form = overlay.querySelector('#upload-form');
    const pdfInput = overlay.querySelector('#new-document-pdf-files');
    const pdfSummary = overlay.querySelector('#new-document-pdf-order');
    const multiFields = overlay.querySelector('#multi-document-fields');
    const singleFields = overlay.querySelector('#single-document-fields');
    const fileHelp = overlay.querySelector('#new-document-file-help');
    const submitButton = overlay.querySelector('#multi-upload-submit');

    const makeSubjectFromFileName = (name) =>
      String(name || '')
        .replace(/\.pdf$/i, '')
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const getUploadMode = () =>
      form.querySelector('input[name="uploadMode"]:checked')?.value || 'separate';

    const refreshModeCards = () => {
      overlay.querySelectorAll('.multi-upload-mode-card').forEach((label) => {
        const radio = label.querySelector('input[type="radio"]');
        label.classList.toggle('active', !!radio?.checked);
      });
    };

    const renderMultiRows = () => {
      const files = selectedFiles(pdfInput);
      const mode = getUploadMode();

      renderPdfSelection(pdfInput, pdfSummary);
      refreshModeCards();

      const isSeparate = mode === 'separate';
      multiFields.classList.toggle('hide', !isSeparate);
      singleFields.classList.toggle('hide', isSeparate);

      if (isSeparate) {
        fileHelp.textContent = 'เลือก PDF ได้หลายไฟล์ แต่ละไฟล์จะถูกสร้างเป็นหนังสือคนละฉบับ และออกเลขรับต่อเนื่องให้อัตโนมัติ';
        submitButton.textContent = files.length > 1 ? `📚 เพิ่มหนังสือ ${files.length} ฉบับ` : '📚 เพิ่มหนังสือ';

        if (!files.length) {
          multiFields.innerHTML = '<div class="multi-document-empty">เลือกไฟล์ PDF เพื่อกรอกชื่อเรื่องของแต่ละฉบับ</div>';
          return;
        }

        const oldValues = {};
        multiFields.querySelectorAll('[data-file-key]').forEach((row) => {
          oldValues[row.dataset.fileKey] = {
            subject: row.querySelector('.batch-subject')?.value || '',
            sender: row.querySelector('.batch-sender')?.value || '',
          };
        });

        multiFields.innerHTML = files.map((file, index) => {
          const key = `${file.name}|${file.size}|${file.lastModified}`;
          const previous = oldValues[key] || {};
          return `<div class="multi-document-row" data-file-key="${escapeHtml(key)}">
            <div class="multi-document-row-head">
              <span class="multi-document-number">${index + 1}</span>
              <div>
                <b>${escapeHtml(file.name)}</b>
                <small>${formatFileSize(file.size)}</small>
              </div>
            </div>
            <div class="multi-document-row-fields">
              <label>จาก
                <input class="input batch-sender" value="${escapeHtml(previous.sender || defaultSender)}" required>
              </label>
              <label>เรื่อง
                <input class="input batch-subject" value="${escapeHtml(previous.subject || makeSubjectFromFileName(file.name))}" required>
              </label>
            </div>
          </div>`;
        }).join('');
      } else {
        fileHelp.textContent = 'ระบบจะรวมไฟล์ตามลำดับที่เลือกเป็นเอกสารฉบับเดียว ขนาดรวมไม่เกิน 15 MB';
        submitButton.textContent = '📎 รวมและอัปโหลด';
      }
    };

    pdfInput.onchange = renderMultiRows;
    form.querySelectorAll('input[name="uploadMode"]').forEach((radio) => {
      radio.onchange = renderMultiRows;
    });

    overlay.querySelectorAll('.close-modal').forEach((button) => {
      button.onclick = () => overlay.remove();
    });

    renderMultiRows();

    form.onsubmit = async (event) => {
      event.preventDefault();

      const selectedMode = form.querySelector('input[name="operationMode"]:checked')?.value || 'normal';
      const uploadMode = getUploadMode();

      if (selectedMode !== 'normal') {
        const detail = selectedMode === 'acting'
          ? 'หนังสือทั้งหมดที่กำลังนำเข้าจะส่งให้รองผู้อำนวยการในฐานะผู้รักษาการ และเมื่อรองฯ บันทึกแล้วจะกลับไปคิวธุรการโดยไม่ผ่านบัญชีผู้อำนวยการ'
          : 'หนังสือทั้งหมดที่กำลังนำเข้าจะข้ามคิวรองผู้อำนวยการและส่งตรงไปยังผู้อำนวยการ';

        const confirmation = await Swal.fire({
          icon: 'warning',
          title: 'ยืนยันรูปแบบการดำเนินงาน',
          text: detail,
          showCancelButton: true,
          confirmButtonText: 'ยืนยัน',
          cancelButtonText: 'กลับไปตรวจสอบ',
          confirmButtonColor: '#b91c1c',
        });
        if (!confirmation.isConfirmed) return;
      }

      try {
        const files = validatePdfFiles(selectedFiles(pdfInput));

        if (uploadMode === 'merge') {
          const subject = String(form.elements.subjectMerged.value || '').trim();
          const sender = String(form.elements.fromSenderMerged.value || '').trim();
          if (!subject || !sender) throw new Error('กรุณากรอกเรื่องและหน่วยงานผู้ส่งให้ครบ');

          loading('กำลังรวมและอัปโหลด PDF...', 'บันทึกไฟล์ลง Google Drive');
          const merged = await mergePdfFiles(files, {
            fileName: `${subject || 'หนังสือรับ'}-${Date.now()}.pdf`,
          });

          const result = await uploadFileForm('uploadNewDocument', 'pdfFile', merged.file, {
            sessionToken: state.token,
            fromSender: sender,
            subject,
            operationMode: selectedMode,
            sourceNames: JSON.stringify(files.map((file) => file.name)),
          });

          overlay.remove();
          await loadDashboard();
          Swal.fire('สำเร็จ', `อัปโหลดเรียบร้อย เลขรับ ${result.recvNo} รวมทั้งหมด ${merged.pageCount} หน้า`, 'success');
          return;
        }

        // โหมดเพิ่มหลายฉบับ: แต่ละ PDF เป็นหนังสือคนละฉบับ
        const rows = Array.from(multiFields.querySelectorAll('.multi-document-row'));
        if (rows.length !== files.length) throw new Error('รายการไฟล์ไม่ตรงกัน กรุณาเลือกไฟล์ใหม่อีกครั้ง');

        const jobs = rows.map((row, index) => ({
          file: files[index],
          sender: String(row.querySelector('.batch-sender')?.value || '').trim(),
          subject: String(row.querySelector('.batch-subject')?.value || '').trim(),
        }));

        jobs.forEach((job, index) => {
          if (!job.sender) throw new Error(`ฉบับที่ ${index + 1}: กรุณากรอกหน่วยงานผู้ส่ง`);
          if (!job.subject) throw new Error(`ฉบับที่ ${index + 1}: กรุณากรอกชื่อเรื่อง`);
        });

        const confirmBatch = await Swal.fire({
          icon: 'question',
          title: `เพิ่มหนังสือ ${jobs.length} ฉบับ?`,
          html: `<div class="text-left">
            <p>ระบบจะสร้างหนังสือแยกฉบับ และออกเลขรับต่อเนื่องตามลำดับไฟล์</p>
            <div class="batch-upload-confirm-list">
              ${jobs.slice(0, 10).map((job, index) =>
                `<div><b>${index + 1}.</b> ${escapeHtml(job.subject)}</div>`
              ).join('')}
              ${jobs.length > 10 ? `<div><b>และอีก ${jobs.length - 10} ฉบับ</b></div>` : ''}
            </div>
          </div>`,
          showCancelButton: true,
          confirmButtonText: `📚 เพิ่ม ${jobs.length} ฉบับ`,
          cancelButtonText: 'กลับไปแก้ไข',
        });
        if (!confirmBatch.isConfirmed) return;

        Swal.fire({
          title: 'กำลังเพิ่มหนังสือหลายฉบับ',
          html: `<div id="batch-upload-progress-text">กำลังเตรียม...</div>
                 <div class="ack-all-progress"><div id="ack-all-progress-bar"></div></div>`,
          allowOutsideClick: false,
          allowEscapeKey: false,
          showConfirmButton: false,
          didOpen: () => Swal.showLoading(),
        });

        const success = [];
        const failed = [];

        // ทำทีละฉบับเพื่อให้เลขรับเรียงต่อเนื่องและลดภาระ Apps Script/Drive
        for (let i = 0; i < jobs.length; i += 1) {
          const job = jobs[i];
          const textEl = document.getElementById('batch-upload-progress-text');
          const barEl = document.getElementById('ack-all-progress-bar');

          if (textEl) textEl.textContent = `กำลังเพิ่มฉบับที่ ${i + 1}/${jobs.length} — ${job.subject}`;
          if (barEl) barEl.style.width = `${Math.round((i / jobs.length) * 100)}%`;

          try {
            const result = await uploadFileForm('uploadNewDocument', 'pdfFile', job.file, {
              sessionToken: state.token,
              fromSender: job.sender,
              subject: job.subject,
              operationMode: selectedMode,
              sourceNames: JSON.stringify([job.file.name]),
            });
            success.push({ ...job, result });
          } catch (error) {
            failed.push({
              ...job,
              message: String(error?.message || error || 'ไม่ทราบสาเหตุ'),
            });
          }

          if (barEl) barEl.style.width = `${Math.round(((i + 1) / jobs.length) * 100)}%`;
        }

        overlay.remove();
        await loadDashboard();

        if (!failed.length) {
          const firstNo = success[0]?.result?.recvNo || '';
          const lastNo = success[success.length - 1]?.result?.recvNo || '';
          Swal.fire({
            icon: 'success',
            title: 'เพิ่มหนังสือสำเร็จ',
            html: `<div>
              เพิ่มทั้งหมด <b>${success.length} ฉบับ</b><br>
              ${success.length > 1 ? `เลขรับตั้งแต่ <b>${escapeHtml(firstNo)}</b> ถึง <b>${escapeHtml(lastNo)}</b>` : `เลขรับ <b>${escapeHtml(firstNo)}</b>`}
            </div>`,
          });
          return;
        }

        Swal.fire({
          icon: 'warning',
          title: 'เพิ่มหนังสือเสร็จแล้วบางส่วน',
          html: `<div class="text-left">
            <p>สำเร็จ <b>${success.length}</b> ฉบับ / ไม่สำเร็จ <b>${failed.length}</b> ฉบับ</p>
            <div class="batch-upload-failed-list">
              ${failed.slice(0, 8).map((item) =>
                `<div>• ${escapeHtml(item.subject)}<br><small>${escapeHtml(item.message)}</small></div>`
              ).join('')}
            </div>
            <p class="text-xs mt-2">ฉบับที่สำเร็จถูกบันทึกแล้ว ส่วนรายการที่ไม่สำเร็จสามารถนำเข้าใหม่เฉพาะฉบับนั้นได้</p>
          </div>`,
        });
      } catch (error) {
        showError(error);
      }
    };
  }

  async function normalizeSignatureImageDataUrl(signatureDataUrl) {
    if (/^data:image\/(png|jpe?g)/i.test(signatureDataUrl || '')) return signatureDataUrl;
    return await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, image.naturalWidth || image.width || 1);
        canvas.height = Math.max(1, image.naturalHeight || image.height || 1);
        const context = canvas.getContext('2d');
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      image.onerror = () => reject(new Error('ไฟล์ลายเซ็นไม่ใช่รูปภาพที่รองรับ กรุณาติดต่อผู้ดูแลระบบ'));
      image.src = signatureDataUrl;
    });
  }

  async function embedSignatureIntoAcknowledgementSlot(fileBase64, signatureDataUrl, slot) {
    const pdfDoc = await PDFLib.PDFDocument.load(fileBase64);
    const pages = pdfDoc.getPages();
    const page = pages[Number(slot.pageIndex) || 0];
    if (!page) throw new Error('ไม่พบหน้าสำหรับวางลายเซ็น');
    if (!signatureDataUrl) throw new Error('กรุณาส่งลายเซ็นต์ให้ผู้ดูแลระบบ');
    const normalizedSignature = await normalizeSignatureImageDataUrl(signatureDataUrl);
    const image = /^data:image\/(jpe?g)/i.test(normalizedSignature)
      ? await pdfDoc.embedJpg(normalizedSignature)
      : await pdfDoc.embedPng(normalizedSignature);
    const padding = Math.max(1.5, Math.min(Number(slot.width || 0), Number(slot.height || 0)) * 0.06);
    const maxWidth = Math.max(1, Number(slot.width) - padding * 2);
    const maxHeight = Math.max(1, Number(slot.height) - padding * 2);
    const ratio = Math.min(maxWidth / image.width, maxHeight / image.height);
    const width = image.width * ratio;
    const height = image.height * ratio;
    page.drawImage(image, {
      x: Number(slot.x) + padding + (maxWidth - width) / 2,
      y: Number(slot.y) + padding + (maxHeight - height) / 2,
      width,
      height,
    });
    return await pdfDoc.saveAsBase64();
  }

  async function acknowledgeOneDocument_(docId) {
    let saved = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const signing = await gasCall('getAcknowledgementSigningData', state.token, docId);
      if (signing.alreadyAcknowledged) {
        saved = signing;
        break;
      }
      if (signing.legacy) {
        saved = await gasCall('acknowledgeLegacyDocument', state.token, docId);
        break;
      }
      const base64 = await embedSignatureIntoAcknowledgementSlot(
        signing.file.base64,
        signing.signatureDataUrl,
        signing.slot
      );
      try {
        saved = await gasCall('saveAcknowledgedDocument', state.token, {
          docId,
          base64,
          expectedVersion: signing.expectedVersion,
        });
        break;
      } catch (error) {
        if (!/ACK_VERSION_CONFLICT/.test(error?.message || '') || attempt >= 2) throw error;
      }
    }
    if (!saved) throw new Error('ไม่สามารถบันทึกลายเซ็นได้ กรุณาลองใหม่');
    quickPdfCache.delete(docId);
    return saved;
  }

  async function acknowledge(docId) {
    if (!state.user?.signatureConfigured) {
      Swal.fire('ยังไม่มีลายเซ็น', 'กรุณาส่งลายเซ็นต์ให้ผู้ดูแลระบบ', 'warning');
      return;
    }

    const confirm = await Swal.fire({
      icon: 'question',
      title: 'ยืนยันรับทราบ',
      text: 'ยืนยันว่าคุณได้อ่านเอกสารฉบับนี้แล้ว และต้องการใส่ลายเซ็นรับทราบ',
      showCancelButton: true,
      confirmButtonText: 'ยืนยันรับทราบ',
      cancelButtonText: 'ยกเลิก',
    });
    if (!confirm.isConfirmed) return;

    loading('กำลังใส่ลายเซ็นและบันทึกรับทราบ...');
    try {
      await acknowledgeOneDocument_(docId);
      triggerWorkflowMascotProgress();
      await loadDashboard();
      Swal.fire('สำเร็จ', 'ใส่ลายเซ็นและบันทึกรับทราบเรียบร้อยแล้ว', 'success');
    } catch (error) { showError(error); }
  }

  async function acknowledgeAllPendingDocuments() {
    if (!state.user?.signatureConfigured) {
      Swal.fire('ยังไม่มีลายเซ็น', 'กรุณาส่งลายเซ็นต์ให้ผู้ดูแลระบบก่อนใช้ปุ่มรับทราบทั้งหมด', 'warning');
      return;
    }

    const pending = (state.inboxDocs || []).filter((doc) => {
      const own = (doc.recipients || []).find((item) => item.userId === state.user.userId);
      return own && !own.acknowledgedAt;
    });

    if (!pending.length) {
      Swal.fire('ไม่มีเอกสารค้าง', 'คุณรับทราบเอกสารครบทั้งหมดแล้ว', 'success');
      return;
    }

    const preview = pending.slice(0, 8)
      .map((doc, i) => `${i + 1}. ${escapeHtml(doc.recvNo)} — ${escapeHtml(doc.subject)}`)
      .join('<br>');
    const more = pending.length > 8 ? `<br><b>และอีก ${pending.length - 8} ฉบับ</b>` : '';

    const confirm = await Swal.fire({
      icon: 'warning',
      title: `รับทราบทั้งหมด ${pending.length} ฉบับ?`,
      html: `<div class="text-left leading-7">
        <p><b>การกดปุ่มนี้หมายถึงคุณยืนยันว่าได้อ่านเอกสารทั้งหมดที่ค้างอยู่แล้ว</b></p>
        <p>ระบบจะใส่ลายเซ็นของคุณลงในกล่อง “ทราบ” ของแต่ละฉบับอัตโนมัติ</p>
        <div class="ack-all-preview">${preview}${more}</div>
      </div>`,
      showCancelButton: true,
      confirmButtonText: `✅ รับทราบทั้งหมด ${pending.length} ฉบับ`,
      cancelButtonText: 'ยกเลิก',
      reverseButtons: true,
    });
    if (!confirm.isConfirmed) return;

    let successCount = 0;
    const failed = [];

    Swal.fire({
      title: 'กำลังรับทราบเอกสารทั้งหมด',
      html: `<div id="ack-all-progress-text">กำลังเตรียม...</div>
             <div class="ack-all-progress"><div id="ack-all-progress-bar"></div></div>`,
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => Swal.showLoading(),
    });

    for (let i = 0; i < pending.length; i += 1) {
      const doc = pending[i];
      const textEl = document.getElementById('ack-all-progress-text');
      const barEl = document.getElementById('ack-all-progress-bar');
      if (textEl) {
        textEl.textContent = `กำลังดำเนินการ ${i + 1}/${pending.length} — ${doc.recvNo}`;
      }
      if (barEl) {
        barEl.style.width = `${Math.round((i / pending.length) * 100)}%`;
      }

      try {
        await acknowledgeOneDocument_(doc.docId);
        successCount += 1;
      } catch (error) {
        failed.push({
          doc,
          message: String(error?.message || error || 'ไม่ทราบสาเหตุ'),
        });
      }

      if (barEl) {
        barEl.style.width = `${Math.round(((i + 1) / pending.length) * 100)}%`;
      }
    }

    triggerWorkflowMascotProgress();
    await loadDashboard();

    if (!failed.length) {
      Swal.fire(
        'สำเร็จ',
        `รับทราบเอกสารทั้งหมด ${successCount} ฉบับเรียบร้อยแล้ว`,
        'success'
      );
      return;
    }

    const failedHtml = failed.slice(0, 6)
      .map((item) => `<li>${escapeHtml(item.doc.recvNo)} — ${escapeHtml(item.doc.subject)}<br><small>${escapeHtml(item.message)}</small></li>`)
      .join('');

    Swal.fire({
      icon: 'warning',
      title: 'ดำเนินการเสร็จแล้วบางส่วน',
      html: `<div class="text-left">
        <p>สำเร็จ ${successCount} ฉบับ / ไม่สำเร็จ ${failed.length} ฉบับ</p>
        <ul class="ack-all-failed-list">${failedHtml}</ul>
        <p class="text-sm">เอกสารที่ไม่สำเร็จยังคงอยู่ในจดหมายเข้า สามารถกดรับทราบทีละฉบับได้</p>
      </div>`,
      confirmButtonText: 'ปิด',
    });
  }


  async function completeDocument(docId) {
    const confirm = await Swal.fire({
      icon: 'question',
      title: 'ยืนยันดำเนินการเสร็จสิ้น',
      text: 'ยืนยันว่าคุณดำเนินการตามหนังสือฉบับนี้เสร็จสิ้นแล้ว',
      showCancelButton: true,
      confirmButtonText: 'ยืนยันเสร็จสิ้น',
      cancelButtonText: 'ยกเลิก',
    });
    if (!confirm.isConfirmed) return;
    loading('กำลังบันทึกสถานะ...');
    try {
      const result = await gasCall('completeDocumentAction', state.token, docId);
      triggerWorkflowMascotProgress();
      await loadDashboard();
      Swal.fire('สำเร็จ', result.allCompleted
        ? 'ผู้รับทุกคนดำเนินการครบแล้ว เอกสารถูกย้ายไปหมวดดำเนินการเสร็จสิ้น'
        : 'บันทึกแล้ว กรุณารอผู้รับคนอื่นดำเนินการให้ครบ', 'success');
    } catch (error) { showError(error); }
  }



  function formatThaiLineSummaryDate(value) {
    const date = value instanceof Date ? value : new Date(value || Date.now());
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('th-TH', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Bangkok',
    }).format(date);
  }

  function lineSummaryRecipientStats(doc) {
    const recipients = Array.isArray(doc?.recipients) ? doc.recipients : [];
    const recipientCountFromDocument = Number(doc?.recipientCount || 0);
    const acknowledgedCountFromDocument = Number(doc?.ackCount || 0);
    const total = Math.max(recipients.length, Number.isFinite(recipientCountFromDocument) ? recipientCountFromDocument : 0);
    const acknowledgedFromRows = recipients.filter((item) => !!item.acknowledgedAt).length;
    const acknowledged = Math.min(total, Math.max(acknowledgedFromRows, Number.isFinite(acknowledgedCountFromDocument) ? acknowledgedCountFromDocument : 0));
    const pending = Math.max(total - acknowledged, 0);
    const pendingNames = recipients
      .filter((item) => !item.acknowledgedAt)
      .map((item) => String(item.name || item.email || '').trim())
      .filter(Boolean);
    return { total, acknowledged, pending, pendingNames };
  }

  function compareReceiveNumbersAsc(leftDoc, rightDoc) {
    const left = receiveNumberParts(leftDoc?.recvNo);
    const right = receiveNumberParts(rightDoc?.recvNo);
    if (left.valid !== right.valid) return left.valid ? -1 : 1;
    if (left.year !== right.year) return left.year - right.year;
    if (left.number !== right.number) return left.number - right.number;
    return String(leftDoc?.subject || '').localeCompare(String(rightDoc?.subject || ''), 'th');
  }

  function sortLineSummaryDocuments(documents) {
    return [...(documents || [])].sort((left, right) => {
      const leftDate = new Date(left?.createdAt || 0).getTime();
      const rightDate = new Date(right?.createdAt || 0).getTime();
      if (leftDate !== rightDate) return leftDate - rightDate;
      return compareReceiveNumbersAsc(left, right);
    });
  }

  function buildLineAcknowledgementSummary(documents, summaryDate) {
    const selectedDocuments = sortLineSummaryDocuments(documents);
    if (!selectedDocuments.length) return '';
    const lines = [
      '🔔 สรุปการรับทราบหนังสือราชการ',
      'โรงเรียนวัดแม่กะ',
      '',
      `วันที่ ${formatThaiLineSummaryDate(summaryDate || new Date())}`,
      '',
    ];

    selectedDocuments.forEach((doc, index) => {
      const stats = lineSummaryRecipientStats(doc);
      lines.push(`เรื่องที่ ${index + 1}`);
      lines.push('');
      lines.push(`เลขรับ ${String(doc.recvNo || '-').trim()}`);
      lines.push(`เรื่อง ${String(doc.subject || '-').trim()}`);
      lines.push(`จาก ${String(doc.fromSender || '-').trim()}`);
      lines.push('');
      lines.push(`ผู้รับทั้งหมด ${stats.total} คน`);
      lines.push(`รับทราบแล้ว ${stats.acknowledged} คน`);
      lines.push(`ยังไม่ได้รับทราบ ${stats.pending} คน`);
      lines.push('');
      lines.push('รายชื่อผู้ยังไม่ได้รับทราบ');
      if (stats.pending === 0) {
        lines.push('รับทราบครบทุกคนแล้ว');
      } else if (stats.pendingNames.length) {
        stats.pendingNames.forEach((name) => lines.push(name));
        const missingNameCount = Math.max(stats.pending - stats.pendingNames.length, 0);
        if (missingNameCount) lines.push(`ยังไม่พบชื่อผู้รับในข้อมูล ${missingNameCount} คน`);
      } else {
        lines.push(`ยังไม่พบชื่อผู้รับในข้อมูล ${stats.pending} คน`);
      }
      if (index < selectedDocuments.length - 1) lines.push('', '');
    });
    return lines.join('\n').trim();
  }

  function openLineNotificationModal() {
    if (!isClericalUser()) {
      Swal.fire('ไม่มีสิทธิ์ใช้งาน', 'เมนูสรุปการรับทราบสำหรับ LINE ใช้ได้เฉพาะบัญชีธุรการ', 'warning');
      return;
    }

    const documents = [...new Map(sortDocumentsByReceiveNumberDesc(state.allDocs || []).map((doc) => [doc.docId, doc])).values()]
      .filter((doc) => Number(doc.recipientCount || (doc.recipients || []).length || 0) > 0)
      .sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0));
    const today = new Date();
    const todayKey = localDateKey(today);
    const monthKey = todayKey.slice(0, 7);
    const weekMonday = mondayOfWeek(today);
    const overlay = document.createElement('div');
    overlay.className = 'modal-backdrop line-notification-backdrop';
    overlay.innerHTML = `<div class="modal-panel line-notification-panel line-summary-panel">
      <div class="line-modal-heading">
        <div class="line-modal-title-wrap">${lineLogoMarkup()}<div><h2>สรุปการรับทราบสำหรับส่ง LINE</h2><p>เลือกเอกสารได้หลายวัน ระบบจะแสดงวันที่สร้างสรุปวันนี้เพียงครั้งเดียวและไม่แสดงเวลา</p></div></div>
        <button class="text-2xl close-modal" type="button" aria-label="ปิด">×</button>
      </div>
      <div class="line-modal-grid line-summary-grid">
        <section class="line-picker-section line-summary-picker">
          <div class="download-period-tabs line-summary-period-tabs">
            <button class="download-period-tab active" data-line-mode="day" type="button">รายวัน</button>
            <button class="download-period-tab" data-line-mode="week" type="button">รายสัปดาห์</button>
            <button class="download-period-tab" data-line-mode="month" type="button">รายเดือน</button>
            <button class="download-period-tab" data-line-mode="custom" type="button">เลือกหลายวัน</button>
          </div>
          <div class="download-filter-panel line-summary-filter-panel">
            <div id="line-day-filter" class="download-filter-control"><label>วันที่<input id="line-day-value" class="input" type="date" value="${todayKey}"></label></div>
            <div id="line-week-filter" class="download-filter-control hide"><label>เลือกวันใดก็ได้ในสัปดาห์<input id="line-week-value" class="input" type="date" value="${localDateKey(weekMonday)}"></label><div id="line-week-label" class="download-range-label"></div></div>
            <div id="line-month-filter" class="download-filter-control hide"><label>เดือน<input id="line-month-value" class="input" type="month" value="${monthKey}"></label></div>
            <div id="line-custom-filter" class="download-filter-control download-custom-range hide"><label>ตั้งแต่วันที่<input id="line-start-value" class="input" type="date" value="${localDateKey(addLocalDays(today, -6))}"></label><label>ถึงวันที่<input id="line-end-value" class="input" type="date" value="${todayKey}"></label></div>
            <input id="line-document-search" class="input download-search-input" placeholder="ค้นหาเลขรับ เรื่อง หรือผู้ส่ง">
          </div>
          <div class="download-selection-toolbar line-summary-toolbar"><div><b id="line-result-count">0 เอกสาร</b><span id="line-selected-count">เลือกแล้ว 0 เรื่อง</span></div><div><button id="select-all-line-docs" class="btn btn-muted text-xs" type="button">เลือกทั้งหมดที่แสดง</button><button id="clear-line-docs" class="btn btn-muted text-xs" type="button">ยกเลิกทั้งหมด</button></div></div>
          <div id="line-document-list" class="download-date-list line-summary-document-list"></div>
        </section>
        <section class="line-message-section line-summary-message-section">
          <div class="line-message-heading"><div><h3>ข้อความสรุปสำหรับคัดลอก</h3><p>วันที่ด้านบนคือวันนี้ เอกสารทุกวันจะเรียงต่อกันเป็นเรื่องที่ 1, 2, 3</p></div><span class="line-local-badge">ไม่ใช้โทเคน</span></div>
          <div id="line-summary-date" class="line-summary-today">วันที่ ${formatThaiLineSummaryDate(today)}</div>
          <textarea id="line-message-text" class="input line-message-text line-summary-message-text" placeholder="เลือกเอกสารเพื่อสร้างสรุป" disabled></textarea>
          <div id="line-message-warning" class="line-message-warning">กรุณาเลือกเอกสารอย่างน้อย 1 เรื่อง</div>
          <div class="line-message-actions">
            <button id="reset-line-message" class="btn btn-muted" type="button" disabled>คืนข้อความเดิม</button>
            <button id="copy-line-message" class="btn line-copy-btn" type="button" disabled>${lineLogoMarkup()}<span>คัดลอกข้อความ</span></button>
          </div>
        </section>
      </div>
    </div>`;
    document.body.appendChild(overlay);

    let mode = 'day';
    let visibleDocuments = [];
    let generatedMessage = '';
    const selectedIds = new Set();
    const list = overlay.querySelector('#line-document-list');
    const messageArea = overlay.querySelector('#line-message-text');
    const warning = overlay.querySelector('#line-message-warning');
    const resetButton = overlay.querySelector('#reset-line-message');
    const copyButton = overlay.querySelector('#copy-line-message');
    const close = () => overlay.remove();
    overlay.querySelector('.close-modal').onclick = close;
    overlay.addEventListener('click', (event) => { if (event.target === overlay) close(); });

    const dateRange = () => {
      if (mode === 'day') {
        const day = parseLocalDateInput(overlay.querySelector('#line-day-value').value);
        return day ? { start: day, end: day } : null;
      }
      if (mode === 'week') {
        const selected = parseLocalDateInput(overlay.querySelector('#line-week-value').value);
        if (!selected) return null;
        const start = mondayOfWeek(selected);
        const end = addLocalDays(start, 6);
        overlay.querySelector('#line-week-label').textContent = `${formatThaiDocumentDate(localDateKey(start))} – ${formatThaiDocumentDate(localDateKey(end))}`;
        return { start, end };
      }
      if (mode === 'month') {
        const match = overlay.querySelector('#line-month-value').value.match(/^(\d{4})-(\d{2})$/);
        if (!match) return null;
        return {
          start: new Date(Number(match[1]), Number(match[2]) - 1, 1),
          end: new Date(Number(match[1]), Number(match[2]), 0),
        };
      }
      const start = parseLocalDateInput(overlay.querySelector('#line-start-value').value);
      const end = parseLocalDateInput(overlay.querySelector('#line-end-value').value);
      return start && end && start <= end ? { start, end } : null;
    };

    const selectedDocuments = () => sortLineSummaryDocuments(documents.filter((doc) => selectedIds.has(doc.docId)));

    const refreshMessage = () => {
      const chosen = selectedDocuments();
      generatedMessage = buildLineAcknowledgementSummary(chosen, new Date());
      messageArea.value = generatedMessage;
      messageArea.disabled = !chosen.length;
      resetButton.disabled = !chosen.length;
      copyButton.disabled = !chosen.length;
      overlay.querySelector('#line-selected-count').textContent = `เลือกแล้ว ${chosen.length} เรื่อง`;
      warning.classList.toggle('hide', chosen.length > 0);
    };

    const renderList = () => {
      const range = dateRange();
      const query = String(overlay.querySelector('#line-document-search').value || '').trim().toLowerCase();
      if (!range) {
        visibleDocuments = [];
        list.innerHTML = '<div class="download-empty-state">กรุณาตรวจสอบช่วงวันที่ให้ถูกต้อง</div>';
        overlay.querySelector('#line-result-count').textContent = '0 เอกสาร';
        refreshMessage();
        return;
      }
      const startKey = localDateKey(range.start);
      const endKey = localDateKey(range.end);
      visibleDocuments = documents.filter((doc) => {
        const key = localDateKey(doc.createdAt);
        if (!key || key < startKey || key > endKey) return false;
        return !query || `${doc.recvNo} ${doc.subject} ${doc.fromSender}`.toLowerCase().includes(query);
      });
      overlay.querySelector('#line-result-count').textContent = `${visibleDocuments.length} เอกสาร`;
      if (!visibleDocuments.length) {
        list.innerHTML = '<div class="download-empty-state"><b>ไม่พบเอกสารในช่วงเวลานี้</b><span>ลองเปลี่ยนวันที่หรือเลือกช่วงวันที่อื่น</span></div>';
        refreshMessage();
        return;
      }
      const groups = new Map();
      visibleDocuments.forEach((doc) => {
        const key = localDateKey(doc.createdAt) || 'unknown';
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(doc);
      });
      list.innerHTML = [...groups.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([dateKey, groupDocs]) => {
        const groupIds = groupDocs.map((doc) => doc.docId);
        const allSelected = groupIds.every((id) => selectedIds.has(id));
        return `<section class="download-date-group" data-date-key="${escapeHtml(dateKey)}">
          <header><div><b>${escapeHtml(formatThaiDocumentDate(dateKey))}</b><span>${groupDocs.length} เอกสาร</span></div><button class="download-select-day" data-line-date-key="${escapeHtml(dateKey)}" type="button">${allSelected ? 'ยกเลิกวันนี้' : 'เลือกทั้งหมดวันนี้'}</button></header>
          <div class="download-day-documents">${groupDocs.sort(compareReceiveNumbersAsc).map((doc) => {
            const stats = lineSummaryRecipientStats(doc);
            return `<label class="download-document-row line-summary-document-row ${selectedIds.has(doc.docId) ? 'is-selected' : ''}"><input type="checkbox" class="line-summary-check" value="${escapeHtml(doc.docId)}" ${selectedIds.has(doc.docId) ? 'checked' : ''}><span class="download-check-visual"></span><span class="download-document-info"><b>${escapeHtml(doc.recvNo)} — ${escapeHtml(doc.subject)}</b><small>${escapeHtml(doc.fromSender)} • รับทราบ ${stats.acknowledged}/${stats.total}</small></span><span class="line-pending-badge ${stats.pending === 0 ? 'is-complete' : ''}">${stats.pending === 0 ? 'ครบแล้ว' : `ค้าง ${stats.pending}`}</span></label>`;
          }).join('')}</div>
        </section>`;
      }).join('');
      overlay.querySelectorAll('.line-summary-check').forEach((input) => {
        input.onchange = () => {
          if (input.checked) selectedIds.add(input.value); else selectedIds.delete(input.value);
          renderList();
        };
      });
      overlay.querySelectorAll('[data-line-date-key]').forEach((button) => {
        button.onclick = () => {
          const dayDocuments = visibleDocuments.filter((doc) => localDateKey(doc.createdAt) === button.dataset.lineDateKey);
          const shouldSelect = !dayDocuments.every((doc) => selectedIds.has(doc.docId));
          dayDocuments.forEach((doc) => shouldSelect ? selectedIds.add(doc.docId) : selectedIds.delete(doc.docId));
          renderList();
        };
      });
      refreshMessage();
    };

    overlay.querySelectorAll('[data-line-mode]').forEach((button) => {
      button.onclick = () => {
        mode = button.dataset.lineMode;
        overlay.querySelectorAll('[data-line-mode]').forEach((item) => item.classList.toggle('active', item === button));
        ['day', 'week', 'month', 'custom'].forEach((name) => overlay.querySelector(`#line-${name}-filter`).classList.toggle('hide', name !== mode));
        selectedIds.clear();
        renderList();
      };
    });
    ['#line-day-value', '#line-week-value', '#line-month-value', '#line-start-value', '#line-end-value'].forEach((selector) => {
      overlay.querySelector(selector).onchange = () => { selectedIds.clear(); renderList(); };
    });
    overlay.querySelector('#line-document-search').oninput = renderList;
    overlay.querySelector('#select-all-line-docs').onclick = () => { visibleDocuments.forEach((doc) => selectedIds.add(doc.docId)); renderList(); };
    overlay.querySelector('#clear-line-docs').onclick = () => { selectedIds.clear(); renderList(); };
    resetButton.onclick = () => { messageArea.value = generatedMessage; };
    copyButton.onclick = async () => {
      const chosen = selectedDocuments();
      if (!chosen.length) return;
      const copied = await copyTextToClipboard(messageArea.value, 'คัดลอกสรุปการรับทราบสำหรับส่งใน LINE แล้ว');
      if (copied) {
        gasCall('recordLineDailySummaryCopy', state.token, chosen.map((doc) => doc.docId))
          .catch((error) => console.warn('บันทึก Audit Log สรุป LINE ไม่สำเร็จ', error));
      }
    };

    renderList();
  }

  function showAckStatus(docId) {
    const doc = findDoc(docId);
    const html = (doc.recipients || []).map((item) => {
      const ackLabel = item.acknowledgedAt ? 'รับทราบแล้ว' : 'ยังไม่รับทราบ';
      const completeLabel = item.completedAt ? 'ดำเนินการเสร็จสิ้น' : (item.acknowledgedAt ? 'รอดำเนินการเสร็จสิ้น' : 'ยังไม่เริ่มดำเนินการ');
      return `<div class="ack-status-person-row"><div><b>${item.acknowledgedAt ? '✅' : '❌'} ${escapeHtml(item.name)}</b><small>ช่องลายเซ็น ${Number(item.signatureSlot || 0) || '-'}</small></div><div><span>${escapeHtml(ackLabel)}</span><small>${escapeHtml(completeLabel)}</small></div></div>`;
    }).join('') || '<p>ยังไม่มีผู้รับ</p>';
    Swal.fire({ title: 'สถานะการรับทราบและดำเนินการ', html: `<div class="text-left max-h-80 overflow-auto">${html}</div>`, confirmButtonText: 'ปิด' });
  }


  async function openDocumentReminderModal(docId) {
    if (!isClericalUser()) return;
    const doc = findDoc(docId);
    if (!doc) return;
    const recipients = Array.isArray(doc.recipients) ? doc.recipients : [];
    if (!recipients.length) {
      Swal.fire('ยังไม่มีผู้รับ', 'เอกสารฉบับนี้ยังไม่ได้ส่งให้ผู้รับ', 'info');
      return;
    }
    const result = await Swal.fire({
      title: '🔔 ส่งการแจ้งเตือน',
      html: `<div class="reminder-recipient-list">
        <p>เลือกผู้รับที่ต้องการส่ง Web Push เตือนให้เปิดเอกสาร</p>
        <div class="reminder-actions"><button type="button" id="reminder-select-pending">เลือกผู้ยังไม่รับทราบ</button><button type="button" id="reminder-select-all">เลือกทั้งหมด</button></div>
        <div class="reminder-checkboxes">${recipients.map((item) => `<label><input type="checkbox" value="${escapeHtml(item.userId)}" ${item.acknowledgedAt ? '' : 'checked'}><span><b>${escapeHtml(item.name)}</b><small>${item.acknowledgedAt ? 'รับทราบแล้ว' : 'ยังไม่รับทราบ'}${item.completedAt ? ' · ดำเนินการเสร็จแล้ว' : ''}</small></span></label>`).join('')}</div>
      </div>`,
      showCancelButton: true,
      confirmButtonText: 'ส่งการแจ้งเตือน',
      cancelButtonText: 'ยกเลิก',
      didOpen: () => {
        const popup = Swal.getPopup();
        const checks = () => [...popup.querySelectorAll('.reminder-checkboxes input')];
        popup.querySelector('#reminder-select-pending').onclick = () => {
          const pending = new Set(recipients.filter((item) => !item.acknowledgedAt).map((item) => item.userId));
          checks().forEach((input) => { input.checked = pending.has(input.value); });
        };
        popup.querySelector('#reminder-select-all').onclick = () => checks().forEach((input) => { input.checked = true; });
      },
      preConfirm: () => {
        const ids = [...Swal.getPopup().querySelectorAll('.reminder-checkboxes input:checked')].map((input) => input.value);
        if (!ids.length) {
          Swal.showValidationMessage('กรุณาเลือกผู้รับอย่างน้อย 1 คน');
          return false;
        }
        return ids;
      },
    });
    if (!result.isConfirmed || !result.value) return;
    loading('กำลังส่งการแจ้งเตือน...');
    try {
      const response = await gasCall('sendDocumentReminder', state.token, docId, result.value);
      Swal.fire('ส่งแล้ว', `ส่ง Web Push ไปยังผู้รับที่พร้อมรับแจ้งเตือน ${Number(response.result?.sent || 0)} คน`, 'success');
    } catch (error) { showError(error); }
  }

  function openAttachments(docId) {
    const doc = findDoc(docId);
    if (!doc) return;
    const overlay = document.createElement('div');
    overlay.className = 'modal-backdrop';
    const attachmentList = (doc.attachments || []).map((item) => `<button class="download-attachment attachment-file-row" data-id="${escapeHtml(item.attachmentId)}"><span class="attachment-file-icon">📎</span><span><b>${escapeHtml(item.filename)}</b><small>โดย ${escapeHtml(item.uploadedBy)} • ${escapeHtml(item.mimeType || 'ไฟล์แนบ')}</small></span><span class="attachment-download-label">เปิด / ดาวน์โหลด</span></button>`).join('') || '<p class="text-slate-500 text-center py-5">ยังไม่มีไฟล์แนบแยก</p>';

    const mergeSection = isClericalUser() ? `
      <section class="merge-pdf-section">
        <div class="merge-section-heading"><div><h3>รวม PDF เข้ากับเอกสารหลัก</h3><p>เอกสารหลักฉบับปัจจุบันจะอยู่หน้าแรก แล้วต่อ PDF ที่เลือกตามลำดับ</p></div><span class="merge-admin-badge">สำหรับธุรการ</span></div>
        <form id="merge-pdf-form" class="space-y-3">
          <input id="merge-pdf-files" class="input" type="file" accept="application/pdf,.pdf" multiple required>
          <div id="merge-pdf-order" class="pdf-selection-summary"></div>
          <label class="confirm-reset-check merge-confirm"><input id="confirm-merge-pdf" type="checkbox" required><span>ยืนยันว่าต้องการต่อไฟล์เหล่านี้เข้ากับเอกสารฉบับปัจจุบัน</span></label>
          <button class="btn btn-primary w-full" type="submit">รวม PDF และบันทึกเป็นเอกสารฉบับปัจจุบัน</button>
        </form>
      </section>` : '';

    overlay.innerHTML = `<div class="modal-panel max-w-2xl">
      <div class="flex justify-between items-center mb-4"><div><h2 class="text-xl font-bold">ไฟล์เอกสารและไฟล์แนบ</h2><p class="text-sm text-slate-500">${escapeHtml(doc.recvNo)} — ${escapeHtml(doc.subject)}</p></div><button class="text-2xl close-modal">×</button></div>
      <button id="download-main-document" class="main-document-row"><span class="main-document-icon">📄</span><span><b>เอกสารหลักฉบับปัจจุบัน</b><small>รวมตราประทับและ PDF ที่ถูกรวมเพิ่มเติมล่าสุด</small></span><span class="attachment-download-label">เปิด / ดาวน์โหลด</span></button>
      <section class="attachment-list-section"><h3>ไฟล์แนบแยก (${(doc.attachments || []).length})</h3><div class="space-y-2">${attachmentList}</div></section>
      ${mergeSection}
      <section class="attachment-upload-section">
        <h3>แนบไฟล์เพิ่มเติม</h3>
        <form id="attachment-form" class="space-y-3"><input type="hidden" name="sessionToken" value="${escapeHtml(state.token)}"><input type="hidden" name="docId" value="${escapeHtml(docId)}"><input class="input" name="attachmentFile" type="file" required><button class="btn btn-success w-full" type="submit">แนบไฟล์ตอบกลับ</button></form>
      </section>
    </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('.close-modal').onclick = () => overlay.remove();

    overlay.querySelector('#download-main-document').onclick = async () => {
      const previewWindow = window.open('about:blank', '_blank');
      loading('กำลังเตรียมเอกสารหลัก...');
      try {
        const result = await gasCall('getDocumentFile', state.token, docId, false);
        previewOrDownloadFile(result.file, previewWindow);
        Swal.close();
      } catch (error) {
        if (previewWindow && !previewWindow.closed) previewWindow.close();
        showError(error);
      }
    };

    overlay.querySelectorAll('.download-attachment').forEach((button) => button.onclick = async () => {
      const previewWindow = window.open('about:blank', '_blank');
      loading('กำลังเตรียมไฟล์...');
      try {
        const result = await gasCall('getAttachmentFile', state.token, button.dataset.id);
        previewOrDownloadFile(result.file, previewWindow);
        Swal.close();
      } catch (error) {
        if (previewWindow && !previewWindow.closed) previewWindow.close();
        showError(error);
      }
    });

    const mergeForm = overlay.querySelector('#merge-pdf-form');
    if (mergeForm) {
      const mergeInput = overlay.querySelector('#merge-pdf-files');
      const mergeSummary = overlay.querySelector('#merge-pdf-order');
      renderPdfSelection(mergeInput, mergeSummary, 'เอกสารหลักฉบับปัจจุบันจะเป็นลำดับที่ 1');
      mergeInput.onchange = () => renderPdfSelection(mergeInput, mergeSummary, 'เอกสารหลักฉบับปัจจุบันจะเป็นลำดับที่ 1');
      mergeForm.onsubmit = async (event) => {
        event.preventDefault();
        if (!overlay.querySelector('#confirm-merge-pdf').checked) return;
        loading('กำลังรวม PDF...', 'อ่านเอกสารหลักและต่อไฟล์ที่เลือก');
        try {
          const files = validatePdfFiles(selectedFiles(mergeInput));
          const current = await gasCall('getDocumentFile', state.token, docId, false);
          const merged = await mergePdfFiles(files, {
            prependBase64: current.file.base64,
            prependLabel: 'เอกสารหลักฉบับปัจจุบัน',
            fileName: `${doc.recvNo.replace('/', '-')}-${doc.subject}-merged.pdf`,
          });
          await uploadFileForm('saveMergedDocument', 'mergedPdfFile', merged.file, {
            sessionToken: state.token,
            docId,
            sourceNames: JSON.stringify(files.map((file) => file.name)),
            pageCount: merged.pageCount,
          });

          const failedAttachments = [];
          for (const file of files) {
            try {
              await uploadAttachmentFile(docId, file);
            } catch (error) {
              failedAttachments.push(file.name);
            }
          }

          overlay.remove();
          await loadDashboard();
          if (failedAttachments.length) {
            Swal.fire({
              icon: 'warning',
              title: 'รวม PDF สำเร็จ',
              html: `<p>เอกสารหลักถูกอัปเดตเป็น ${merged.pageCount} หน้าแล้ว</p><p class="mt-2">แต่บันทึกไฟล์แนบแยกไม่สำเร็จ: ${escapeHtml(failedAttachments.join(', '))}</p>`,
            });
          } else {
            Swal.fire('รวม PDF สำเร็จ', `เอกสารหลักฉบับใหม่มีทั้งหมด ${merged.pageCount} หน้า และเก็บไฟล์ที่เลือกไว้ในรายการไฟล์แนบแล้ว`, 'success');
          }
        } catch (error) {
          showError(error);
        }
      };
    }

    overlay.querySelector('#attachment-form').onsubmit = async (event) => {
      event.preventDefault();
      loading('กำลังอัปโหลดไฟล์แนบ...');
      try {
        await gasCall('uploadAttachment', event.currentTarget);
        overlay.remove();
        await loadDashboard();
        Swal.fire('สำเร็จ', 'แนบไฟล์เรียบร้อยแล้ว', 'success');
      } catch (error) { showError(error); }
    };
  }

  async function openQuickDocumentViewer(docId) {
    const doc = findDoc(docId);
    if (!doc) {
      Swal.fire('ไม่พบเอกสาร', 'กรุณารีเฟรชหน้าแล้วลองใหม่', 'warning');
      return;
    }

    loading('กำลังเปิดเอกสารแบบด่วน...');
    let blobUrl = '';
    try {
      const result = await getDocumentFileQuick_(docId);
      if (!result?.file?.base64) throw new Error('ไม่พบข้อมูล PDF');

      blobUrl = base64PdfToBlobUrl_(result.file.base64);

      const viewer = document.createElement('div');
      viewer.className = 'quick-pdf-viewer';
      viewer.innerHTML = `
        <div class="quick-pdf-toolbar">
          <div class="quick-pdf-title">
            <b>⚡ ${escapeHtml(doc.recvNo)} — ${escapeHtml(doc.subject)}</b>
            <small>Quick Viewer • ใช้ตัวแสดง PDF ของเบราว์เซอร์เพื่อเปิดได้เร็วขึ้น</small>
          </div>
          <div class="quick-pdf-actions">
            <button type="button" class="btn btn-success" id="quick-pdf-download">⬇ ดาวน์โหลด</button>
            <button type="button" class="btn btn-muted" id="quick-pdf-full">↗ เปิดเต็มหน้าต่าง</button>
            <button type="button" class="btn btn-danger" id="quick-pdf-close">✕ ปิด</button>
          </div>
        </div>
        <iframe class="quick-pdf-frame" src="${blobUrl}#toolbar=1&navpanes=0&view=FitH" title="${escapeHtml(doc.subject)}"></iframe>
      `;
      document.body.appendChild(viewer);

      const cleanup = () => {
        viewer.remove();
        if (blobUrl) URL.revokeObjectURL(blobUrl);
      };

      viewer.querySelector('#quick-pdf-close').onclick = cleanup;
      viewer.querySelector('#quick-pdf-download').onclick = () =>
        downloadBase64(result.file.base64, buildDocumentDownloadFileName(doc), 'application/pdf');
      viewer.querySelector('#quick-pdf-full').onclick = () => {
        const tab = window.open(blobUrl, '_blank', 'noopener,noreferrer');
        if (!tab) Swal.fire('เบราว์เซอร์บล็อกหน้าต่างใหม่', 'กรุณาอนุญาต Pop-up สำหรับเว็บไซต์นี้', 'info');
      };

      Swal.close();
    } catch (error) {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      showError(error);
    }
  }

  async function openWorkspace(docId, requestedAction) {
    const doc = findDoc(docId);
    loading('กำลังโหลด PDF...');
    try {
      const result = await gasCall('getDocumentFile', state.token, docId, true);
      state.currentDoc = { ...doc, ...result.document };
      state.currentPermissions = result.permissions || {
        role: guideRoleKey(),
        currentRole: state.currentDoc.currentRole || '',
        assignedToUserRole: false,
        canStamp: false,
        canDispatch: false,
        readOnly: true,
        reason: 'ไม่พบข้อมูลสิทธิ์จากระบบ',
      };
      state.originalPdfBase64 = result.file.base64;
      state.pdfPageViews = [];
      state.stampsInitialized = false;

      if (requestedAction && !state.currentPermissions.canStamp && !state.currentPermissions.canDispatch) {
        Swal.close();
        await Swal.fire({
          icon: 'warning',
          title: 'เอกสารไม่อยู่ในคิวดำเนินการ',
          html: `<div class="text-left leading-7">
            <div><b>บทบาทของคุณ:</b> ${escapeHtml(state.currentPermissions.role || guideRoleKey())}</div>
            <div><b>คิวปัจจุบัน:</b> ${escapeHtml(state.currentPermissions.currentRole || state.currentDoc.currentRole || '-')}</div>
            <div class="mt-2">${escapeHtml(state.currentPermissions.reason || 'เปิดเอกสารได้ในโหมดอ่านอย่างเดียว')}</div>
          </div>`,
          confirmButtonText: 'เปิดอ่านเอกสาร',
        });
      }

      renderWorkspace();
      await loadPdf(state.originalPdfBase64);

      if (state.currentPermissions.canStamp && document.querySelector('.draggable-stamp')) {
        initializeStamps();
        state.stampsInitialized = true;
        document.querySelectorAll('.draggable-stamp').forEach((stamp) => updateStampPageTarget(stamp));
      }

      if (state.currentPermissions.canDispatch) {
        await loadDispatchUsers();
      }
      Swal.close();
    } catch (error) { showError(error); }
  }

  function renderWorkspace() {
    const doc = state.currentDoc;
    const permissions = state.currentPermissions || {};
    const role = permissions.actingRole || permissions.role || guideRoleKey();
    const canStamp = permissions.canStamp === true;
    const showDispatch = permissions.canDispatch === true;
    const accessLabel = canStamp
      ? 'โหมดประทับตรา'
      : showDispatch
        ? 'โหมดจ่ายเรื่อง'
        : 'โหมดอ่านอย่างเดียว';
    const workspace = document.createElement('div');
    workspace.id = 'workspace-view';
    workspace.className = 'workspace';
    workspace.innerHTML = `
      <div class="workspace-toolbar">
        <div class="flex items-center gap-3"><button id="workspace-close" class="btn btn-muted">← กลับ</button><div><div class="font-bold">${escapeHtml(doc.recvNo)} — ${escapeHtml(doc.subject)}</div><div class="text-xs text-slate-200">${escapeHtml(doc.status)} • ${escapeHtml(accessLabel)} • แสดงเอกสารครบทุกหน้า</div></div></div>
        <div class="flex items-center gap-2 flex-wrap">
          <button id="zoom-out" class="btn btn-muted">−</button><span id="zoom-label" class="text-sm min-w-14 text-center">${Math.round(state.currentScale * 100)}%</span><button id="zoom-in" class="btn btn-muted">＋</button>
          ${canStamp ? `${role === 'ผู้อำนวยการ' ? '<button id="ipad-handwriting" class="btn btn-ipad" type="button">✍ ใช้งานผ่าน iPad</button>' : ''}<button id="save-stamp" class="btn btn-primary">บันทึกและส่งต่อ</button>` : ''}
          ${!canStamp && !showDispatch ? `<span class="workspace-readonly-note">อ่านอย่างเดียว • คิวปัจจุบัน: ${escapeHtml(permissions.currentRole || doc.currentRole || '-')}</span>` : ''}
          <button id="download-current" class="btn btn-success">ดาวน์โหลด PDF</button>
        </div>
      </div>
      <div id="pdf-scroll-area" class="pdf-scroll-area">
        ${showDispatch ? dispatchMarkup() : ''}
        <div class="pdf-stage-wrap">
          <div id="pdf-container" class="pdf-container">
            <div id="pdf-pages" class="pdf-pages" aria-label="เอกสาร PDF ทุกหน้า"></div>
            ${canStamp ? stampMarkup(role, doc.recvNo) : ''}
          </div>
        </div>
      </div>`;
    document.body.appendChild(workspace);
    document.getElementById('workspace-close').onclick = closeWorkspace;
    document.getElementById('download-current').onclick = () => downloadBase64(state.originalPdfBase64, buildDocumentDownloadFileName(doc), 'application/pdf');
    document.getElementById('zoom-in').onclick = async () => {
      state.currentScale = Math.min(2.2, state.currentScale + .15);
      await renderAllPdfPages();
    };
    document.getElementById('zoom-out').onclick = async () => {
      state.currentScale = Math.max(.7, state.currentScale - .15);
      await renderAllPdfPages();
    };
    const ipadButton = document.getElementById('ipad-handwriting');
    if (ipadButton) ipadButton.onclick = () => openHandwritingPad();
    const saveButton = document.getElementById('save-stamp');
    if (saveButton) saveButton.onclick = saveAndStamp;
    if (showDispatch) initializeDispatch();
  }

  function stampMarkup(role, recvNo) {
    const signature = state.user.signatureDataUrl || '';
    if (role === 'รองผู้อำนวยการ') {
      const isActing = state.currentDoc?.operationMode === 'รักษาการ';
      if (isActing) {
        return stampWrapper('stamp-deputy-acting', 250, `
          <div class="acting-stamp-card">
            <div class="acting-stamp-grid acting-stamp-check-grid">
              <label class="acting-stamp-option"><input type="checkbox" data-meta="ทราบ"><span>ทราบ</span></label>
              <label class="acting-stamp-option"><input type="checkbox" data-meta="พิจารณา"><span>พิจารณา</span></label>
              <label class="acting-stamp-option"><input type="checkbox" data-meta="เห็นควรมอบ"><span>เห็นควรมอบ</span></label>
              <label class="acting-stamp-option"><input type="checkbox" data-meta="ยุติเรื่อง"><span>ยุติเรื่อง</span></label>
            </div>

            <div class="acting-stamp-grid acting-stamp-department-grid">
              <label class="acting-stamp-option"><input type="radio" name="deputy-acting-dept" value="วิชาการ"><span>วิชาการ</span></label>
              <label class="acting-stamp-option"><input type="radio" name="deputy-acting-dept" value="บุคคล"><span>บุคคล</span></label>
              <label class="acting-stamp-option"><input type="radio" name="deputy-acting-dept" value="งบประมาณ"><span>งบประมาณ</span></label>
              <label class="acting-stamp-option"><input type="radio" name="deputy-acting-dept" value="ทั่วไป"><span>ทั่วไป</span></label>
            </div>

            <textarea class="stamp-textarea acting-stamp-comment" rows="4" placeholder="บันทึกความคิดเห็น / ข้อสั่งการ"></textarea>

            <div class="acting-stamp-signature">
              ${signature ? `<img class="acting-stamp-signature-image" src="${signature}" alt="ลายเซ็น">` : '<div class="acting-stamp-signature-space"></div>'}
              <div class="acting-stamp-user-name">(${escapeHtml(state.user.name)})</div>
              <div class="acting-stamp-position">รองผู้อำนวยการโรงเรียนวัดแม่กะ</div>
              <div class="acting-stamp-position acting-stamp-position-acting">รักษาการแทนผู้อำนวยการโรงเรียนวัดแม่กะ</div>
            </div>
          </div>`);
      }
      return stampWrapper('stamp-deputy', 235, `
        <div style="width:235px;padding:5px;color:#1254c0;font-size:11px;line-height:1.45">
          <div style="font-weight:700;font-size:12px;margin-bottom:4px">เรียน ผู้อำนวยการโรงเรียนวัดแม่กะ</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:4px"><span>เพื่อโปรด</span><label><input type="checkbox" data-meta="ทราบ"> ทราบ</label><label><input type="checkbox" data-meta="พิจารณา"> พิจารณา</label></div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:4px"><label><input type="checkbox" data-meta="เห็นควรมอบ"> เห็นควรมอบ</label><label><input type="checkbox" data-meta="ยุติเรื่อง"> ยุติเรื่อง</label></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px;margin:0 8px 4px"><label><input type="radio" name="deputy-dept" value="วิชาการ"> วิชาการ</label><label><input type="radio" name="deputy-dept" value="บุคคล"> บุคคล</label><label><input type="radio" name="deputy-dept" value="งบประมาณ"> งบประมาณ</label><label><input type="radio" name="deputy-dept" value="ทั่วไป"> ทั่วไป</label></div>
          <textarea class="stamp-textarea" rows="3" placeholder="บันทึกความเห็นเพิ่มเติม"></textarea>
          <div style="text-align:center;margin-top:5px">${signature ? `<img src="${signature}" style="height:32px;max-width:145px;object-fit:contain;margin:auto">` : ''}<div>(${escapeHtml(state.user.name)})</div><div style="font-size:9px">รองผู้อำนวยการโรงเรียนวัดแม่กะ</div></div>
        </div>`);
    }
    if (role === 'ผู้อำนวยการ') {
      return stampWrapper('stamp-director', 220, `
        <div style="width:220px;padding:5px;color:#1254c0;font-size:11px;line-height:1.45">
          <div style="display:flex;justify-content:space-around;font-weight:700"><label><input type="checkbox" data-meta="ทราบ"> ทราบ</label><label><input type="checkbox" data-meta="ยุติเรื่อง"> ยุติเรื่อง</label></div>
          <div style="text-align:center;font-weight:700;margin:5px 0"><label><input type="checkbox" data-meta="ดำเนินการตามเสนอ"> ดำเนินการตามเสนอ</label></div>
          <div class="stamp-order-title">ข้อสั่งการ <button type="button" class="stamp-ui-only stamp-handwriting-open" data-open-handwriting title="เขียนผ่าน iPad">✍ เขียน</button></div>
          <div class="stamp-order-area" data-handwriting-area>
            <textarea class="stamp-textarea stamp-order-textarea" rows="4" placeholder="พิมพ์ข้อสั่งการ หรือกด ใช้งานผ่าน iPad"></textarea>
            <img class="stamp-handwriting-image hide" alt="ข้อสั่งการลายมือสีน้ำเงิน">
            <button type="button" class="stamp-ui-only stamp-handwriting-edit hide" data-open-handwriting>แตะเพื่อแก้ไขลายมือ</button>
          </div>
          <div style="text-align:center;margin-top:5px">${signature ? `<img src="${signature}" style="height:34px;max-width:145px;object-fit:contain;margin:auto">` : ''}<div>(${escapeHtml(state.user.name)})</div><div style="font-size:9px">ผู้อำนวยการโรงเรียนวัดแม่กะ</div></div>
        </div>`);
    }
    return stampWrapper('stamp-clerk-1', 180, `
      <div style="width:180px;padding:5px;color:#1254c0;font-size:12px;line-height:1.55"><div style="text-align:center;font-weight:700;font-size:14px">โรงเรียนวัดแม่กะ</div><div>เลขรับที่: <b>${escapeHtml(recvNo)}</b></div><div>วันที่: <b>${new Date().toLocaleDateString('th-TH')}</b></div></div>`) +
      stampWrapper('stamp-clerk-2', 245, `
      <div class="clerk-forward-stamp">
        <div>เรียน <b>ผู้อำนวยการโรงเรียนวัดแม่กะ</b></div>
        <textarea class="stamp-textarea" rows="4" placeholder="บันทึกเสนอ"></textarea>
        <div class="clerk-forward-signature-block">
          ${signature
            ? `<img class="clerk-forward-signature-image" src="${signature}" alt="ลายเซ็น ${escapeHtml(state.user.name)}">`
            : '<div class="clerk-forward-signature-space" aria-hidden="true"></div>'}
          <div class="clerk-forward-name">(${escapeHtml(state.user.name)})</div>
        </div>
      </div>`);
  }

  function stampWrapper(id, width, content) {
    const top = id.includes('2') ? 170 : id.includes('deputy') ? 250 : id.includes('director') ? 360 : 35;
    return `<div id="${id}" class="draggable-stamp stamp-mode-move" style="left:35px;top:${top}px;width:${width}px" data-base-width="${width}" data-scale="1" data-interaction-mode="move"><div class="stamp-content">${content}</div><span class="stamp-scale-label">100%</span><span class="stamp-mode-label">โหมด: ย้าย</span><span class="stamp-resize-handle" title="ลากเพื่อย่อ/ขยาย"></span></div>`;
  }

  function initializeStamps() {
    const stamps = document.querySelectorAll('.draggable-stamp');
    if (!stamps.length) return;

    stamps.forEach((stamp) => {
      const content = stamp.querySelector('.stamp-content');
      stamp.dataset.interactionMode = stamp.dataset.interactionMode || 'move';
      refreshStampBounds(stamp);
      setStampScale(stamp, Number(stamp.dataset.scale || 1));

      const images = [...content.querySelectorAll('img')];
      images.forEach((image) => {
        const update = () => {
          refreshStampBounds(stamp);
          setStampScale(stamp, Number(stamp.dataset.scale || 1));
          snapStampIntoPage(stamp, false);
        };
        if (image.complete) {
          if (image.decode) image.decode().catch(() => {}).finally(update);
          else update();
        } else {
          image.addEventListener('load', update, { once: true });
          image.addEventListener('error', update, { once: true });
        }
      });

      if (window.ResizeObserver) {
        const observer = new ResizeObserver(() => {
          refreshStampBounds(stamp);
          setStampScale(stamp, Number(stamp.dataset.scale || 1));
        });
        observer.observe(content);
        stamp._stampResizeObserver = observer;
      }

      let tapStart = null;
      stamp.addEventListener('pointerdown', (event) => {
        selectStamp(stamp);
        if (event.target.closest('input, textarea, label, .stamp-resize-handle')) return;
        tapStart = { x: event.clientX, y: event.clientY };
      });
      stamp.addEventListener('pointerup', (event) => {
        if (!tapStart || event.target.closest('input, textarea, label, .stamp-resize-handle')) {
          tapStart = null;
          return;
        }
        const distance = Math.hypot(event.clientX - tapStart.x, event.clientY - tapStart.y);
        tapStart = null;
        if (distance < 9) openStampToolMenu(stamp);
      });
      stamp.addEventListener('pointercancel', () => { tapStart = null; });
      initResizeHandle(stamp);
    });

    document.querySelectorAll('[data-open-handwriting]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        openHandwritingPad();
      });
    });

    try { interact('.draggable-stamp').unset(); } catch (_) {}
    interact('.draggable-stamp').draggable({
      ignoreFrom: '.stamp-resize-handle, input, textarea, label',
      listeners: {
        move(event) {
          const target = event.target;
          selectStamp(target);
          const mode = target.dataset.interactionMode || 'move';
          if (mode === 'resize') {
            const currentScale = Number(target.dataset.scale || 1);
            const baseWidth = Number(target.dataset.baseWidth || 200);
            const viewerFactor = getStampViewerFactor();
            const delta = (event.dx + event.dy) / 2;
            const nextScale = Math.min(2, Math.max(.5, currentScale + delta / (baseWidth * viewerFactor)));
            setStampScale(target, nextScale);
            updateStampPageTarget(target);
            return;
          }
          const x = (parseFloat(target.dataset.x) || 0) + event.dx;
          const y = (parseFloat(target.dataset.y) || 0) + event.dy;
          target.dataset.x = x;
          target.dataset.y = y;
          applyStampTransform(target);
          updateStampPageTarget(target);
        },
        end(event) {
          snapStampIntoPage(event.target, true);
          updateStampPageTarget(event.target);
        }
      },
      modifiers: [interact.modifiers.restrictRect({ restriction: '#pdf-container', endOnly: true })]
    });

    if (stamps[0]) {
      selectStamp(stamps[0]);
      snapStampIntoPage(stamps[0], false);
    }
    const container = document.getElementById('pdf-container');
    if (container) {
      container.addEventListener('pointerdown', (event) => {
        if (!event.target.closest('.draggable-stamp')) selectStamp(null);
      });
    }
  }

  function getPdfPageElements() {
    return [...document.querySelectorAll('.pdf-page-shell')];
  }

  function findClosestPageForStamp(stamp) {
    const pages = getPdfPageElements();
    if (!pages.length || !stamp) return null;
    const stampRect = stamp.getBoundingClientRect();
    const centerX = stampRect.left + stampRect.width / 2;
    const centerY = stampRect.top + stampRect.height / 2;
    let closest = pages[0];
    let closestDistance = Number.POSITIVE_INFINITY;

    pages.forEach((page) => {
      const rect = page.getBoundingClientRect();
      if (centerX >= rect.left && centerX <= rect.right && centerY >= rect.top && centerY <= rect.bottom) {
        closest = page;
        closestDistance = -1;
        return;
      }
      if (closestDistance === -1) return;
      const dx = centerX < rect.left ? rect.left - centerX : centerX > rect.right ? centerX - rect.right : 0;
      const dy = centerY < rect.top ? rect.top - centerY : centerY > rect.bottom ? centerY - rect.bottom : 0;
      const distance = Math.hypot(dx, dy);
      if (distance < closestDistance) {
        closestDistance = distance;
        closest = page;
      }
    });
    return closest;
  }

  function updateStampPageTarget(stamp) {
    if (!stamp) return null;
    const page = findClosestPageForStamp(stamp);
    const selected = state.selectedStamp === stamp;
    getPdfPageElements().forEach((item) => item.classList.toggle('stamp-target-page', selected && item === page));
    if (page) {
      stamp.dataset.pageIndex = page.dataset.pageIndex || '0';
      const label = stamp.querySelector('.stamp-mode-label');
      if (label) {
        const mode = (stamp.dataset.interactionMode || 'move') === 'resize' ? 'ย่อ/ขยาย' : 'ย้าย';
        label.textContent = `โหมด: ${mode} • หน้า ${Number(stamp.dataset.pageIndex) + 1}`;
      }
    }
    return page;
  }

  function snapStampIntoPage(stamp, animate) {
    const page = findClosestPageForStamp(stamp);
    const container = document.getElementById('pdf-container');
    if (!page || !container || !stamp) return;
    const pageRect = page.getBoundingClientRect();
    const stampRect = stamp.getBoundingClientRect();

    const maxLeft = Math.max(pageRect.left, pageRect.right - stampRect.width);
    const maxTop = Math.max(pageRect.top, pageRect.bottom - stampRect.height);
    const desiredLeft = Math.min(Math.max(stampRect.left, pageRect.left), maxLeft);
    const desiredTop = Math.min(Math.max(stampRect.top, pageRect.top), maxTop);
    const dx = desiredLeft - stampRect.left;
    const dy = desiredTop - stampRect.top;

    if (animate) stamp.classList.add('stamp-snapping');
    stamp.dataset.x = (parseFloat(stamp.dataset.x) || 0) + dx;
    stamp.dataset.y = (parseFloat(stamp.dataset.y) || 0) + dy;
    applyStampTransform(stamp);
    stamp.dataset.pageIndex = page.dataset.pageIndex || '0';
    if (animate) window.setTimeout(() => stamp.classList.remove('stamp-snapping'), 180);
  }

  function captureStampPlacements() {
    const pages = getPdfPageElements();
    if (!pages.length) return [];
    return [...document.querySelectorAll('.draggable-stamp')].map((stamp) => {
      const page = findClosestPageForStamp(stamp);
      if (!page) return null;
      const pageRect = page.getBoundingClientRect();
      const stampRect = stamp.getBoundingClientRect();
      return {
        id: stamp.id,
        pageIndex: Number(page.dataset.pageIndex || 0),
        xRatio: pageRect.width ? (stampRect.left - pageRect.left) / pageRect.width : 0,
        yRatio: pageRect.height ? (stampRect.top - pageRect.top) / pageRect.height : 0,
      };
    }).filter(Boolean);
  }

  function restoreStampPlacements(placements) {
    if (!placements?.length) return;
    const container = document.getElementById('pdf-container');
    if (!container) return;
    const containerRect = container.getBoundingClientRect();

    placements.forEach((placement) => {
      const stamp = document.getElementById(placement.id);
      const page = document.querySelector(`.pdf-page-shell[data-page-index="${placement.pageIndex}"]`);
      if (!stamp || !page) return;
      const pageRect = page.getBoundingClientRect();
      stamp.style.left = `${pageRect.left - containerRect.left + placement.xRatio * pageRect.width}px`;
      stamp.style.top = `${pageRect.top - containerRect.top + placement.yRatio * pageRect.height}px`;
      stamp.dataset.x = '0';
      stamp.dataset.y = '0';
      applyStampTransform(stamp);
      snapStampIntoPage(stamp, false);
    });
  }

  function selectStamp(stamp) {
    document.querySelectorAll('.draggable-stamp').forEach((item) => item.classList.toggle('selected', item === stamp));
    state.selectedStamp = stamp;
    if (stamp) updateStampPageTarget(stamp);
    else getPdfPageElements().forEach((item) => item.classList.remove('stamp-target-page'));
  }

  function setStampInteractionMode(stamp, mode) {
    const normalizedMode = mode === 'resize' ? 'resize' : 'move';
    stamp.dataset.interactionMode = normalizedMode;
    stamp.classList.toggle('stamp-mode-move', normalizedMode === 'move');
    stamp.classList.toggle('stamp-mode-resize', normalizedMode === 'resize');
    const label = stamp.querySelector('.stamp-mode-label');
    if (label) label.textContent = normalizedMode === 'resize' ? 'โหมด: ย่อ/ขยาย' : 'โหมด: ย้าย';
    state.stampInteractionMode = normalizedMode;
    selectStamp(stamp);
  }

  function openStampToolMenu(stamp) {
    selectStamp(stamp);
    const oldMenu = document.getElementById('stamp-tool-menu');
    if (oldMenu) oldMenu.remove();
    const overlay = document.createElement('div');
    overlay.id = 'stamp-tool-menu';
    overlay.className = 'stamp-tool-backdrop';
    overlay.innerHTML = `
      <div class="stamp-tool-sheet" role="dialog" aria-modal="true" aria-label="เครื่องมือตราประทับ">
        <div class="stamp-tool-title">เลือกวิธีปรับตราประทับ</div>
        <div class="stamp-tool-help">หลังเลือกแล้ว ให้แตะค้างและลากบนตราประทับ</div>
        <button type="button" class="stamp-tool-option" data-mode="move">
          <span class="stamp-tool-number">1</span>
          <span><b>ย้าย</b><small>ลากตราไปยังตำแหน่งที่ต้องการ</small></span>
        </button>
        <button type="button" class="stamp-tool-option" data-mode="resize">
          <span class="stamp-tool-number">2</span>
          <span><b>ย่อ / ขยาย</b><small>ลากไปทางขวาเพื่อขยาย ลากซ้ายเพื่อย่อ</small></span>
        </button>
        <div class="stamp-quick-resize">
          <button type="button" data-scale-step="-0.1">− ย่อ</button>
          <span>${Math.round(Number(stamp.dataset.scale || 1) * 100)}%</span>
          <button type="button" data-scale-step="0.1">＋ ขยาย</button>
        </div>
        <button type="button" class="stamp-tool-cancel">ปิด</button>
      </div>`;
    document.body.appendChild(overlay);
    const close = () => overlay.remove();
    overlay.addEventListener('pointerdown', (event) => {
      if (event.target === overlay) close();
    });
    overlay.querySelectorAll('[data-mode]').forEach((button) => {
      button.addEventListener('click', () => {
        setStampInteractionMode(stamp, button.dataset.mode);
        close();
        Swal.fire({
          toast: true,
          position: 'bottom',
          timer: 1800,
          showConfirmButton: false,
          icon: 'info',
          title: button.dataset.mode === 'resize' ? 'โหมดย่อ/ขยาย: ลากบนตราเพื่อปรับขนาด' : 'โหมดย้าย: ลากตราไปยังตำแหน่งใหม่'
        });
      });
    });
    overlay.querySelectorAll('[data-scale-step]').forEach((button) => {
      button.addEventListener('click', () => {
        setStampInteractionMode(stamp, 'resize');
        const step = Number(button.dataset.scaleStep || 0);
        setStampScale(stamp, Math.min(2, Math.max(.5, Number(stamp.dataset.scale || 1) + step)));
        const percent = overlay.querySelector('.stamp-quick-resize span');
        if (percent) percent.textContent = `${Math.round(Number(stamp.dataset.scale || 1) * 100)}%`;
      });
    });
    overlay.querySelector('.stamp-tool-cancel').addEventListener('click', close);
  }


  function getHandwritingElements() {
    const area = document.querySelector('[data-handwriting-area]');
    return {
      area,
      textarea: area?.querySelector('.stamp-order-textarea') || null,
      image: area?.querySelector('.stamp-handwriting-image') || null,
      editButton: area?.querySelector('.stamp-handwriting-edit') || null,
    };
  }

  function setHandwritingMode(enabled, dataUrl) {
    const { textarea, image, editButton } = getHandwritingElements();
    if (!textarea || !image) return;
    if (enabled && dataUrl) {
      image.src = dataUrl;
      image.classList.remove('hide');
      textarea.classList.add('hide');
      editButton?.classList.remove('hide');
      state.handwritingDataUrl = dataUrl;
      return;
    }
    image.classList.add('hide');
    image.removeAttribute('src');
    textarea.classList.remove('hide');
    editButton?.classList.add('hide');
    state.handwritingDataUrl = '';
  }

  function openHandwritingPad() {
    const { textarea, image } = getHandwritingElements();
    if (!textarea || !image) {
      Swal.fire({
        icon: 'info',
        title: 'ยังไม่พบช่องข้อสั่งการ',
        text: 'ปุ่มนี้ใช้ในขั้นตอนที่ผู้อำนวยการเขียนข้อสั่งการ',
        confirmButtonText: 'ตกลง',
      });
      return;
    }

    const existing = image.classList.contains('hide') ? '' : (image.getAttribute('src') || state.handwritingDataUrl || '');
    const overlay = document.createElement('div');
    overlay.id = 'ipad-handwriting-pad';
    overlay.className = 'handwriting-backdrop';
    overlay.innerHTML = `
      <section class="handwriting-dialog" role="dialog" aria-modal="true" aria-label="เขียนข้อสั่งการผ่าน iPad">
        <header class="handwriting-toolbar">
          <button type="button" class="handwriting-cancel">← ยกเลิก</button>
          <div class="handwriting-heading">
            <b>เขียนข้อสั่งการผ่าน iPad</b>
            <small>ใช้ Apple Pencil หรือนิ้วเขียน หมึกสีน้ำเงิน</small>
          </div>
          <div class="handwriting-actions">
            <button type="button" class="handwriting-undo">↶ ย้อนกลับ</button>
            <button type="button" class="handwriting-clear">ล้างทั้งหมด</button>
            <button type="button" class="handwriting-done">เสร็จสิ้น</button>
          </div>
        </header>
        <div class="handwriting-paper-wrap">
          <div class="handwriting-paper-label">ข้อสั่งการ</div>
          <canvas class="handwriting-canvas" aria-label="พื้นที่เขียนข้อสั่งการ"></canvas>
          <div class="handwriting-tip">วางฝ่ามือได้ตามปกติ และเขียนในกรอบด้วย Apple Pencil</div>
        </div>
        <footer class="handwriting-footer">
          <button type="button" class="handwriting-keyboard">⌨ กลับไปพิมพ์ข้อความ</button>
          <span>ลายมือจะถูกวางลงในตราประทับและบันทึกลง PDF</span>
        </footer>
      </section>`;
    document.body.appendChild(overlay);

    const canvas = overlay.querySelector('.handwriting-canvas');
    const ctx = canvas.getContext('2d', { alpha: true });
    state.handwritingTarget = { textarea, image };
    state.handwritingHistory = [];
    state.handwritingHasInk = Boolean(existing);

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const snapshot = state.handwritingHasInk ? canvas.toDataURL('image/png') : existing;
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#1254c0';
      if (snapshot) restoreHandwritingSnapshot(ctx, canvas, snapshot);
    };

    const restoreExisting = () => {
      if (!existing) return;
      restoreHandwritingSnapshot(ctx, canvas, existing);
    };

    requestAnimationFrame(() => {
      resizeCanvas();
      restoreExisting();
    });

    let drawing = false;
    let lastX = 0;
    let lastY = 0;
    let activePointerId = null;

    const pointFromEvent = (event) => {
      const rect = canvas.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };

    canvas.addEventListener('pointerdown', (event) => {
      if (activePointerId !== null) return;
      event.preventDefault();
      canvas.setPointerCapture?.(event.pointerId);
      activePointerId = event.pointerId;
      drawing = true;
      state.handwritingHistory.push(canvas.toDataURL('image/png'));
      if (state.handwritingHistory.length > 20) state.handwritingHistory.shift();
      const point = pointFromEvent(event);
      lastX = point.x;
      lastY = point.y;
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
    }, { passive: false });

    canvas.addEventListener('pointermove', (event) => {
      if (!drawing || event.pointerId !== activePointerId) return;
      event.preventDefault();
      const point = pointFromEvent(event);
      const pressure = event.pointerType === 'pen' && event.pressure > 0 ? event.pressure : .45;
      ctx.lineWidth = 2.1 + pressure * 3.2;
      ctx.strokeStyle = '#1254c0';
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
      lastX = point.x;
      lastY = point.y;
      state.handwritingHasInk = true;
    }, { passive: false });

    const finishStroke = (event) => {
      if (activePointerId !== null && event.pointerId !== activePointerId) return;
      drawing = false;
      activePointerId = null;
      ctx.closePath();
    };
    canvas.addEventListener('pointerup', finishStroke);
    canvas.addEventListener('pointercancel', finishStroke);
    canvas.addEventListener('pointerleave', (event) => {
      if (event.pointerType !== 'pen') finishStroke(event);
    });

    const close = () => {
      state.handwritingTarget = null;
      overlay.remove();
    };

    overlay.querySelector('.handwriting-cancel').addEventListener('click', close);
    overlay.querySelector('.handwriting-clear').addEventListener('click', () => {
      state.handwritingHistory.push(canvas.toDataURL('image/png'));
      ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
      state.handwritingHasInk = false;
    });
    overlay.querySelector('.handwriting-undo').addEventListener('click', () => {
      const previous = state.handwritingHistory.pop();
      if (!previous) return;
      ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
      restoreHandwritingSnapshot(ctx, canvas, previous);
      state.handwritingHasInk = true;
    });
    overlay.querySelector('.handwriting-keyboard').addEventListener('click', () => {
      setHandwritingMode(false, '');
      close();
      textarea.focus();
      Swal.fire({
        toast: true,
        position: 'bottom',
        timer: 1600,
        showConfirmButton: false,
        icon: 'info',
        title: 'กลับสู่โหมดพิมพ์ข้อความแล้ว',
      });
    });
    overlay.querySelector('.handwriting-done').addEventListener('click', () => {
      if (!state.handwritingHasInk) {
        Swal.fire({
          icon: 'warning',
          title: 'ยังไม่ได้เขียนข้อสั่งการ',
          text: 'กรุณาเขียนในกรอบ หรือกดกลับไปพิมพ์ข้อความ',
          confirmButtonText: 'เขียนต่อ',
        });
        return;
      }
      const dataUrl = trimHandwritingCanvas(canvas, '#1254c0');
      setHandwritingMode(true, dataUrl);
      close();
      refreshStampBounds(document.getElementById('stamp-director'));
      setStampScale(document.getElementById('stamp-director'), Number(document.getElementById('stamp-director')?.dataset.scale || 1));
      Swal.fire({
        toast: true,
        position: 'bottom',
        timer: 1800,
        showConfirmButton: false,
        icon: 'success',
        title: 'บันทึกลายมือสีน้ำเงินแล้ว',
      });
    });
  }

  function restoreHandwritingSnapshot(ctx, canvas, dataUrl) {
    if (!dataUrl) return;
    const image = new Image();
    image.onload = () => {
      ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
      ctx.drawImage(image, 0, 0, canvas.clientWidth, canvas.clientHeight);
    };
    image.src = dataUrl;
  }

  function trimHandwritingCanvas(canvas) {
    const sourceCtx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const pixels = sourceCtx.getImageData(0, 0, width, height);
    const data = pixels.data;
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const alpha = data[(y * width + x) * 4 + 3];
        if (alpha < 8) continue;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }

    if (maxX < minX || maxY < minY) return canvas.toDataURL('image/png');
    const pad = Math.max(16, Math.round((window.devicePixelRatio || 1) * 10));
    minX = Math.max(0, minX - pad);
    minY = Math.max(0, minY - pad);
    maxX = Math.min(width - 1, maxX + pad);
    maxY = Math.min(height - 1, maxY + pad);
    const trimmed = document.createElement('canvas');
    trimmed.width = maxX - minX + 1;
    trimmed.height = maxY - minY + 1;
    trimmed.getContext('2d').drawImage(canvas, minX, minY, trimmed.width, trimmed.height, 0, 0, trimmed.width, trimmed.height);
    return trimmed.toDataURL('image/png');
  }

  function initResizeHandle(stamp) {
    const handle = stamp.querySelector('.stamp-resize-handle');
    handle.addEventListener('pointerdown', (event) => {
      event.preventDefault(); event.stopPropagation(); selectStamp(stamp);
      const startX = event.clientX;
      const startScale = Number(stamp.dataset.scale || 1);
      const onMove = (moveEvent) => {
        const delta = moveEvent.clientX - startX;
        const baseWidth = Number(stamp.dataset.baseWidth || 200);
        const viewerFactor = getStampViewerFactor();
        const scale = Math.min(2, Math.max(.5, startScale + delta / (baseWidth * viewerFactor)));
        setStampScale(stamp, scale);
        updateStampPageTarget(stamp);
      };
      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    });
  }

  function refreshStampBounds(stamp) {
    const content = stamp.querySelector('.stamp-content');
    if (!content) return;
    const baseWidth = Number(stamp.dataset.baseWidth || content.scrollWidth || 200);
    // scrollHeight is measured before CSS transform, so it represents the
    // true content size and prevents the frame from drifting away.
    const baseHeight = Math.max(1, content.scrollHeight, content.offsetHeight);
    stamp.dataset.baseWidth = String(baseWidth);
    stamp.dataset.baseHeight = String(baseHeight);
  }

  function getStampViewerFactor() {
    const reference = Number(state.stampReferenceScale || 1.3);
    return Math.max(.35, Number(state.currentScale || reference) / reference);
  }

  function setStampScale(stamp, scale) {
    const userScale = Math.min(2, Math.max(.5, Number(scale) || 1));
    const viewerFactor = getStampViewerFactor();
    const visualScale = userScale * viewerFactor;
    stamp.dataset.scale = String(userScale);
    const baseWidth = Number(stamp.dataset.baseWidth || 200);
    const baseHeight = Number(stamp.dataset.baseHeight || stamp.querySelector('.stamp-content').scrollHeight || 100);
    stamp.style.width = `${baseWidth * visualScale}px`;
    stamp.style.height = `${baseHeight * visualScale}px`;
    stamp.querySelector('.stamp-content').style.transform = `scale(${visualScale})`;
    stamp.querySelector('.stamp-scale-label').textContent = `${Math.round(userScale * 100)}%`;
    applyStampTransform(stamp);
  }

  function applyStampTransform(stamp) {
    const x = parseFloat(stamp.dataset.x) || 0;
    const y = parseFloat(stamp.dataset.y) || 0;
    stamp.style.transform = `translate(${x}px, ${y}px)`;
  }

  async function loadPdf(base64) {
    const bytes = base64ToUint8Array(base64);
    state.currentPdf = await pdfjsLib.getDocument({ data: bytes }).promise;
    state.currentPageNumber = 1;
    await renderAllPdfPages();
  }

  async function renderAllPdfPages() {
    if (!state.currentPdf) return;
    const placements = captureStampPlacements();
    const pagesHost = document.getElementById('pdf-pages');
    const container = document.getElementById('pdf-container');
    if (!pagesHost || !container) return;

    pagesHost.innerHTML = '';
    state.pdfPageViews = [];
    let maxWidth = 0;

    for (let pageNumber = 1; pageNumber <= state.currentPdf.numPages; pageNumber += 1) {
      const page = await state.currentPdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: state.currentScale });
      const shell = document.createElement('section');
      shell.className = 'pdf-page-shell';
      shell.dataset.pageIndex = String(pageNumber - 1);
      shell.style.width = `${viewport.width}px`;
      shell.style.height = `${viewport.height}px`;
      shell.setAttribute('aria-label', `หน้า ${pageNumber} จาก ${state.currentPdf.numPages}`);

      const label = document.createElement('div');
      label.className = 'pdf-page-label';
      label.textContent = `หน้า ${pageNumber} / ${state.currentPdf.numPages}`;

      const canvas = document.createElement('canvas');
      canvas.className = 'pdf-page-canvas';
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      shell.append(label, canvas);
      pagesHost.appendChild(shell);
      maxWidth = Math.max(maxWidth, viewport.width);

      await page.render({
        canvasContext: canvas.getContext('2d'),
        viewport,
      }).promise;

      state.pdfPageViews.push({
        pageIndex: pageNumber - 1,
        pageNumber,
        shell,
        canvas,
        viewport,
      });
    }

    container.style.width = `${maxWidth}px`;
    const label = document.getElementById('zoom-label');
    if (label) label.textContent = `${Math.round(state.currentScale * 100)}%`;

    document.querySelectorAll('.draggable-stamp').forEach((stamp) => {
      refreshStampBounds(stamp);
      setStampScale(stamp, Number(stamp.dataset.scale || 1));
    });

    restoreStampPlacements(placements);
    if (!placements.length) {
      document.querySelectorAll('.draggable-stamp').forEach((stamp) => snapStampIntoPage(stamp, false));
    }
    if (state.selectedStamp) updateStampPageTarget(state.selectedStamp);
  }

  async function captureStampAtNativeResolution(stamp, captureScale) {
    const originalContent = stamp.querySelector('.stamp-content');
    const clone = originalContent.cloneNode(true);
    const baseWidth = Number(stamp.dataset.baseWidth || originalContent.scrollWidth || 200);

    clone.classList.add('stamp-capture-clone');
    clone.style.transform = 'none';
    clone.style.width = `${baseWidth}px`;
    clone.style.height = 'auto';
    clone.style.position = 'fixed';
    clone.style.left = '-12000px';
    clone.style.top = '0';
    clone.style.zIndex = '-1';
    clone.style.pointerEvents = 'none';
    clone.style.color = '#1254c0';
    clone.style.background = 'transparent';

    clone.querySelectorAll('.stamp-ui-only').forEach((element) => element.remove());
    clone.querySelectorAll('.stamp-textarea.hide, .stamp-handwriting-image.hide').forEach((element) => element.remove());

    const originalInputs = [...originalContent.querySelectorAll('input')];
    const cloneInputs = [...clone.querySelectorAll('input')];
    cloneInputs.forEach((input, index) => {
      const source = originalInputs[index];
      if (!source) return;
      input.checked = source.checked;
      input.value = source.value;
    });

    const originalTextareas = [...originalContent.querySelectorAll('textarea')];
    const cloneTextareas = [...clone.querySelectorAll('textarea')];
    cloneTextareas.forEach((textarea, index) => {
      const source = originalTextareas[index];
      textarea.value = source ? source.value : '';
    });

    document.body.appendChild(clone);
    try {
      const cloneImages = [...clone.querySelectorAll('img')];
      await Promise.all(cloneImages.map((image) => {
        if (image.complete) return image.decode ? image.decode().catch(() => {}) : Promise.resolve();
        return new Promise((resolve) => {
          image.addEventListener('load', resolve, { once: true });
          image.addEventListener('error', resolve, { once: true });
        });
      }));

      // Replace textarea controls with static text before capture. This avoids
      // browser-specific textarea rasterization and keeps Thai text aligned.
      const liveTextareas = [...clone.querySelectorAll('textarea')];
      liveTextareas.forEach((textarea) => {
        const computed = getComputedStyle(textarea);
        const div = document.createElement('div');
        div.className = 'temp-text-div';
        div.textContent = textarea.value || '';
        div.style.width = `${textarea.offsetWidth}px`;
        div.style.minHeight = `${textarea.offsetHeight}px`;
        div.style.padding = computed.padding;
        div.style.margin = computed.margin;
        div.style.font = computed.font;
        div.style.fontFamily = computed.fontFamily;
        div.style.fontSize = computed.fontSize;
        div.style.fontWeight = computed.fontWeight;
        div.style.lineHeight = computed.lineHeight;
        div.style.letterSpacing = computed.letterSpacing;
        div.style.whiteSpace = 'pre-wrap';
        div.style.overflowWrap = 'anywhere';
        div.style.color = '#1254c0';
        textarea.replaceWith(div);
      });

      // Reflow once after replacing controls.
      void clone.offsetHeight;
      return await html2canvas(clone, {
        backgroundColor: null,
        scale: captureScale,
        useCORS: true,
        logging: false,
        removeContainer: true,
        imageTimeout: 15000,
        foreignObjectRendering: false,
        scrollX: 0,
        scrollY: 0,
      });
    } finally {
      clone.remove();
    }
  }

  async function saveAndStamp() {
    loading('กำลังประทับตราทุกหน้าที่เลือกและส่งต่อ...');
    try {
      const pdfDoc = await PDFLib.PDFDocument.load(state.originalPdfBase64);
      const pdfPages = pdfDoc.getPages();
      const stamps = [...document.querySelectorAll('.draggable-stamp')];
      if (!stamps.length) throw new Error('ไม่พบตราประทับในเอกสาร');

      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      const stampCaptureScale = Math.min(8, Math.max(6, (window.devicePixelRatio || 1) * 3));

      for (const stamp of stamps) {
        snapStampIntoPage(stamp, false);
        const pageShell = findClosestPageForStamp(stamp);
        if (!pageShell) throw new Error('ไม่พบหน้าสำหรับวางตราประทับ');

        const pageIndex = Number(pageShell.dataset.pageIndex || 0);
        const page = pdfPages[pageIndex];
        const canvas = pageShell.querySelector('.pdf-page-canvas');
        if (!page || !canvas) throw new Error(`ไม่สามารถอ่านหน้า ${pageIndex + 1} ได้`);

        const pageRect = canvas.getBoundingClientRect();
        const stampRect = stamp.getBoundingClientRect();
        const scaleX = page.getWidth() / pageRect.width;
        const scaleY = page.getHeight() / pageRect.height;

        const localX = Math.min(
          Math.max(0, stampRect.left - pageRect.left),
          Math.max(0, pageRect.width - stampRect.width)
        );
        const localY = Math.min(
          Math.max(0, stampRect.top - pageRect.top),
          Math.max(0, pageRect.height - stampRect.height)
        );

        const capture = await captureStampAtNativeResolution(stamp, stampCaptureScale);
        const image = await pdfDoc.embedPng(capture.toDataURL('image/png'));
        page.drawImage(image, {
          x: localX * scaleX,
          y: page.getHeight() - localY * scaleY - stampRect.height * scaleY,
          width: stampRect.width * scaleX,
          height: stampRect.height * scaleY,
        });
        stamp.dataset.pageIndex = String(pageIndex);
      }

      const base64 = await pdfDoc.saveAsBase64();
      const stampMeta = collectStampMeta();
      await gasCall('saveStampedDocument', state.token, {
        docId: state.currentDoc.docId,
        base64,
        stampMeta,
      });
      triggerWorkflowMascotProgress();
      closeWorkspace();
      await loadDashboard();
      Swal.fire('สำเร็จ', 'ประทับตราในหน้าที่เลือกและส่งต่อเรียบร้อยแล้ว เอกสารถูกนำออกจากคิวของคุณแล้ว', 'success');
    } catch (error) { showError(error); }
  }

  function collectStampMeta() {
    const meta = {
      role: state.user.role,
      actingRole: state.currentPermissions?.actingRole || state.currentPermissions?.role || state.user.role,
      operationMode: state.currentDoc?.operationMode || '',
      options: [],
      department: '',
      text: '',
      handwriting: false,
      scales: [],
      placements: [],
      pageCount: Number(state.currentPdf?.numPages || 0),
    };
    document.querySelectorAll('.draggable-stamp input[type="checkbox"]:checked').forEach((input) => meta.options.push(input.dataset.meta || input.value || 'checked'));
    const department = document.querySelector('.draggable-stamp input[type="radio"]:checked');
    if (department) meta.department = department.value;
    meta.text = [...document.querySelectorAll('.draggable-stamp textarea:not(.hide)')].map((textarea) => textarea.value).filter(Boolean).join('\n');
    meta.handwriting = Boolean(document.querySelector('.stamp-handwriting-image:not(.hide)'));
    meta.scales = [...document.querySelectorAll('.draggable-stamp')].map((stamp) => ({
      id: stamp.id,
      scale: Number(stamp.dataset.scale || 1),
    }));
    meta.placements = [...document.querySelectorAll('.draggable-stamp')].map((stamp) => ({
      id: stamp.id,
      page: Number(stamp.dataset.pageIndex || 0) + 1,
      scale: Number(stamp.dataset.scale || 1),
    }));
    return meta;
  }

  function dispatchMarkup() {
    return `<div id="dispatch-panel" class="dispatch-panel dispatch-panel-top">
      <div class="dispatch-top-head">
        <div>
          <h3 class="text-xl font-bold text-red-800">ดำเนินการขั้นสุดท้าย</h3>
          <div class="dispatch-top-note">เลือกการส่งได้ทันทีจากด้านบนของเอกสาร ไม่ต้องเลื่อนไปท้าย PDF</div>
        </div>
        <button id="dispatch-jump-document" type="button" class="btn btn-muted">↓ ไปที่เอกสาร</button>
      </div>
      <div class="dispatch-section-title">1. เลือกรูปแบบการส่ง</div>
      <div class="dispatch-choice-grid dispatch-choice-grid-top">
        <label class="dispatch-all-choice"><input type="radio" name="dispatch-type" value="ทุกคน"> <span>👥 ส่งให้ทุกคน</span></label>
        <label><input type="radio" name="dispatch-type" value="บางคน"> ส่งให้บางคน</label>
        <label><input type="radio" name="dispatch-type" value="เวียนคณะครู"> เวียนคณะครู</label>
        <label><input type="radio" name="dispatch-type" value="ยุติเรื่อง"> ยุติเรื่อง</label>
      </div>
      <div id="dispatch-priority" class="dispatch-priority-panel hide">
        <div class="dispatch-section-title">2. เลือกประเภทหนังสือ</div>
        <div class="dispatch-priority-options">
          <label class="priority-normal"><input type="radio" name="dispatch-priority" value="ปกติ" checked> ปกติ <small>ปุ่มรับทราบสีเหลือง</small></label>
          <label class="priority-urgent"><input type="radio" name="dispatch-priority" value="ด่วน"> ด่วน <small>ปุ่มรับทราบสีม่วง</small></label>
        </div>
        <div class="dispatch-color-note">เวียนคณะครูใช้ปุ่มสีแดง และถ้าเลือกด่วนร่วมด้วยจะเป็นปุ่มสองสีแดง–ม่วง</div>
      </div>
      <div id="dispatch-users" class="hide border rounded-xl bg-amber-50 p-4">
        <div class="font-bold mb-3">เลือกผู้รับ</div>
        <div id="dispatch-user-grid" class="user-grid"></div>
      </div>
      <div id="ack-box-instruction" class="ack-box-instruction hide">3. กล่อง “ทราบ” จะอยู่บริเวณด้านบนของหน้าแรก • สามารถลากย้าย ย่อ หรือขยายได้ ก่อนกดยืนยันส่งเรื่อง</div>
      <div class="text-right mt-5"><button id="dispatch-submit" class="btn btn-success">ยืนยันตำแหน่งและส่งเรื่อง</button></div>
    </div>`;
  }

  function acknowledgementBoxContent(capacity) {
    const columns = capacity > 8 ? 2 : 1;
    const slots = Array.from({ length: Math.max(1, capacity) }, (_, index) => `
      <div class="ack-sign-slot" data-ack-slot="${index + 1}">
        <span class="ack-slot-number">${index + 1}.</span>
        <span class="ack-signature-target" data-ack-target="${index + 1}"></span>
      </div>`).join('');
    return `<div class="acknowledgement-box-card ack-columns-${columns}" style="--ack-columns:${columns}"><div class="acknowledgement-box-title">ทราบ</div><div class="acknowledgement-slot-grid">${slots}</div></div>`;
  }

  function removeAcknowledgementBox() {
    const box = document.getElementById('acknowledgement-box-stamp');
    if (box?._stampResizeObserver) box._stampResizeObserver.disconnect();
    if (box) box.remove();
    state.stampsInitialized = false;
  }

  function ensureAcknowledgementBox() {
    const selected = document.querySelector('input[name="dispatch-type"]:checked')?.value || '';
    const instruction = document.getElementById('ack-box-instruction');
    if (!selected || selected === 'ยุติเรื่อง') {
      removeAcknowledgementBox();
      instruction?.classList.add('hide');
      return;
    }
    instruction?.classList.remove('hide');
    if (document.getElementById('acknowledgement-box-stamp')) return;
    const container = document.getElementById('pdf-container');
    if (!container) return;
    const capacity = Math.max(1, state.allUsers.length);
    const wrapper = document.createElement('div');
    wrapper.innerHTML = stampWrapper('acknowledgement-box-stamp', capacity > 8 ? 330 : 255, acknowledgementBoxContent(capacity));
    const box = wrapper.firstElementChild;
    box.classList.add('acknowledgement-box-stamp');
    box.style.top = '28px';
    container.appendChild(box);
    initializeStamps();
    state.stampsInitialized = true;
  }

  async function captureAcknowledgementBoxForDispatch() {
    const stamp = document.getElementById('acknowledgement-box-stamp');
    if (!stamp) throw new Error('ไม่พบกล่อง “ทราบ” บนเอกสาร');
    snapStampIntoPage(stamp, false);
    const pageShell = findClosestPageForStamp(stamp);
    if (!pageShell) throw new Error('ไม่พบหน้าสำหรับวางกล่องทราบ');
    const pageIndex = Number(pageShell.dataset.pageIndex || 0);
    const pdfDoc = await PDFLib.PDFDocument.load(state.originalPdfBase64);
    const page = pdfDoc.getPages()[pageIndex];
    const canvas = pageShell.querySelector('.pdf-page-canvas');
    if (!page || !canvas) throw new Error('ไม่สามารถอ่านหน้า PDF ได้');
    const pageRect = canvas.getBoundingClientRect();
    const stampRect = stamp.getBoundingClientRect();
    const scaleX = page.getWidth() / pageRect.width;
    const scaleY = page.getHeight() / pageRect.height;
    const localX = Math.max(0, stampRect.left - pageRect.left);
    const localY = Math.max(0, stampRect.top - pageRect.top);
    const captureScale = Math.min(8, Math.max(6, (window.devicePixelRatio || 1) * 3));
    const capture = await captureStampAtNativeResolution(stamp, captureScale);
    const image = await pdfDoc.embedPng(capture.toDataURL('image/png'));
    page.drawImage(image, {
      x: localX * scaleX,
      y: page.getHeight() - localY * scaleY - stampRect.height * scaleY,
      width: stampRect.width * scaleX,
      height: stampRect.height * scaleY,
    });
    const slots = [...stamp.querySelectorAll('.ack-signature-target')].map((target) => {
      const rect = target.getBoundingClientRect();
      const targetLocalX = localX + (rect.left - stampRect.left);
      const targetLocalY = localY + (rect.top - stampRect.top);
      return {
        slot: Number(target.dataset.ackTarget || 0),
        pageIndex,
        x: targetLocalX * scaleX,
        y: page.getHeight() - targetLocalY * scaleY - rect.height * scaleY,
        width: rect.width * scaleX,
        height: rect.height * scaleY,
      };
    });
    return {
      base64: await pdfDoc.saveAsBase64(),
      acknowledgementBox: {
        pageIndex,
        capacity: slots.length,
        slots,
        box: {
          x: localX * scaleX,
          y: page.getHeight() - localY * scaleY - stampRect.height * scaleY,
          width: stampRect.width * scaleX,
          height: stampRect.height * scaleY,
        },
      },
    };
  }

  async function loadDispatchUsers() {
    state.allUsers = await gasCall('listActiveUsers', state.token);
    const grid = document.getElementById('dispatch-user-grid');
    grid.innerHTML = state.allUsers.map((user) => `<label class="bg-white border rounded-lg p-3 flex gap-2 ${user.signatureConfigured ? '' : 'dispatch-user-no-signature'}"><input type="checkbox" class="dispatch-user" value="${escapeHtml(user.userId)}"><span><b>${escapeHtml(user.name)}</b><br><small>${escapeHtml(user.role)}${user.department ? ' • ' + escapeHtml(user.department) : ''}</small>${user.signatureConfigured ? '' : '<br><small class="text-red-600">ยังไม่มีลายเซ็น</small>'}</span></label>`).join('');
    document.querySelectorAll('.dispatch-user').forEach((checkbox) => checkbox.onchange = ensureAcknowledgementBox);
    if (document.querySelector('input[name="dispatch-type"]:checked')) {
      removeAcknowledgementBox();
      ensureAcknowledgementBox();
    }
  }

  function initializeDispatch() {
    const refreshDispatchUi = () => {
      const type = document.querySelector('input[name="dispatch-type"]:checked')?.value || '';
      document.getElementById('dispatch-users')?.classList.toggle('hide', type !== 'บางคน');
      document.getElementById('dispatch-priority')?.classList.toggle('hide', !type || type === 'ยุติเรื่อง');
      ensureAcknowledgementBox();

      if (type === 'ทุกคน') {
        window.setTimeout(() => {
          const box = document.getElementById('acknowledgement-box-stamp');
          const firstPage = document.querySelector('.pdf-page-shell');
          (box || firstPage)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 80);
      }
    };
    document.querySelectorAll('input[name="dispatch-type"]').forEach((radio) => radio.onchange = refreshDispatchUi);
    document.querySelectorAll('.dispatch-user').forEach((checkbox) => checkbox.onchange = refreshDispatchUi);

    const jumpDocumentButton = document.getElementById('dispatch-jump-document');
    if (jumpDocumentButton) {
      jumpDocumentButton.onclick = () => {
        const firstPage = document.querySelector('.pdf-page-shell') || document.getElementById('pdf-container');
        firstPage?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      };
    }

    document.getElementById('dispatch-submit').onclick = async () => {
      const selected = document.querySelector('input[name="dispatch-type"]:checked');
      if (!selected) { Swal.fire('แจ้งเตือน', 'กรุณาเลือกรูปแบบการส่งเรื่อง', 'warning'); return; }
      const userIds = [...document.querySelectorAll('.dispatch-user:checked')].map((input) => input.value);
      if (selected.value === 'บางคน' && !userIds.length) {
        Swal.fire('แจ้งเตือน', 'กรุณาเลือกผู้รับอย่างน้อย 1 คน', 'warning');
        return;
      }
      const priority = document.querySelector('input[name="dispatch-priority"]:checked')?.value || 'ปกติ';
      loading(selected.value === 'ยุติเรื่อง' ? 'กำลังยุติเรื่อง...' : 'กำลังวางกล่องทราบและจ่ายเรื่อง...');
      try {
        let stamped = { base64: '', acknowledgementBox: null };
        if (selected.value !== 'ยุติเรื่อง') stamped = await captureAcknowledgementBoxForDispatch();
        await gasCall('dispatchDocument', state.token, {
          docId: state.currentDoc.docId,
          type: selected.value,
          priority,
          userIds,
          base64: stamped.base64,
          acknowledgementBox: stamped.acknowledgementBox,
        });
        closeWorkspace();
        await loadDashboard();
        Swal.fire('สำเร็จ', selected.value === 'ยุติเรื่อง'
          ? 'ยุติเรื่องและเก็บเข้าแฟ้มเรียบร้อยแล้ว'
          : 'วางกล่องทราบและส่งเรื่องเรียบร้อยแล้ว', 'success');
      } catch (error) { showError(error); }
    };
  }


  function closeWorkspace() {
    document.querySelectorAll('.draggable-stamp').forEach((stamp) => {
      if (stamp._stampResizeObserver) stamp._stampResizeObserver.disconnect();
    });
    try { interact('.draggable-stamp').unset(); } catch (_) {}
    const workspace = document.getElementById('workspace-view');
    if (workspace) workspace.remove();
    state.currentDoc = null;
    state.currentPermissions = null;
    state.originalPdfBase64 = '';
    state.currentPdf = null;
    state.pdfPageViews = [];
    state.stampsInitialized = false;
    state.selectedStamp = null;
  }


  function openExternal(url) {
    if (!url) {
      Swal.fire('ไม่พบลิงก์', 'ระบบยังไม่มีลิงก์สำหรับรายการนี้', 'warning');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  async function copyTextToClipboard(text, successMessage) {
    const value = String(text || '').trim();
    if (!value) {
      Swal.fire('ไม่พบข้อมูล', 'ยังไม่มีข้อความหรือลิงก์ให้คัดลอก', 'warning');
      return false;
    }
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
      } else {
        const area = document.createElement('textarea');
        area.value = value;
        area.setAttribute('readonly', '');
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        document.execCommand('copy');
        area.remove();
      }
      Swal.fire('คัดลอกแล้ว', successMessage || 'คัดลอกเรียบร้อยแล้ว', 'success');
      return true;
    } catch (error) {
      Swal.fire({
        title: 'คัดลอกไม่สำเร็จ',
        html: `<p>แตะค้างที่ลิงก์ด้านล่างแล้วเลือกคัดลอก</p><div class="mobile-url-box">${escapeHtml(value)}</div>`,
        icon: 'warning',
      });
      return false;
    }
  }

  function generateTemporaryPassword() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    const values = new Uint32Array(12);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(values);
      return [...values].map((value) => alphabet[value % alphabet.length]).join('');
    }
    return Array.from({ length: 12 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
  }

  function openMobileAccessHelp() {
    const webAppUrl = String(window.APP_BOOTSTRAP?.webAppUrl || state.appSettings?.admin?.system?.webAppUrl || '').trim();
    Swal.fire({
      title: 'เปิดระบบบน Google Chrome มือถือ',
      width: 680,
      html: `
        <div class="mobile-help-content">
          <div class="mobile-help-step"><b>1. ใช้ลิงก์ Web App เท่านั้น</b><p>ลิงก์ที่ถูกต้องควรเป็น Google Apps Script และลงท้ายด้วย <code>/exec</code> ไม่ใช่ลิงก์ GitHub Pages</p></div>
          <div class="mobile-help-step"><b>2. เปิดด้วย Chrome ปกติ</b><p>หลีกเลี่ยงโหมดไม่ระบุตัวตน และตรวจว่า Chrome อนุญาตคุกกี้สำหรับเว็บไซต์ Google</p></div>
          <div class="mobile-help-step"><b>3. ตรวจสิทธิ์ Deployment</b><p>ผู้ดูแลควรตั้ง “ผู้ที่มีสิทธิ์เข้าถึง” เป็น “ทุกคน” หรือให้ผู้ใช้ลงชื่อเข้า Google ด้วยบัญชีที่ได้รับอนุญาต</p></div>
          ${webAppUrl ? `<div class="mobile-url-box">${escapeHtml(webAppUrl)}</div>` : '<div class="settings-warning-box">ยังอ่าน URL ของ Web App ไม่ได้ กรุณาให้ธุรการเปิดเมนู ตรวจสอบระบบ</div>'}
        </div>`,
      showCancelButton: !!webAppUrl,
      confirmButtonText: webAppUrl ? 'คัดลอกลิงก์' : 'ปิด',
      cancelButtonText: 'ปิด',
      preConfirm: () => webAppUrl ? copyTextToClipboard(webAppUrl, 'คัดลอกลิงก์สำหรับเปิดบนมือถือแล้ว') : true,
    });
  }

  function settingsNavButton(id, icon, title, description, admin) {
    return `<button class="settings-nav-item ${admin ? 'settings-admin-item' : ''}" data-settings-section="${id}"><span class="settings-nav-icon">${icon}</span><span><b>${title}</b><small>${description}</small></span></button>`;
  }

  function statusPill(ready, label) {
    return `<span class="settings-status ${ready ? 'is-ready' : 'is-missing'}">${ready ? '✓' : '!' } ${escapeHtml(label)}</span>`;
  }

  function themePresetCards(current) {
    return Object.entries(THEME_PRESETS).map(([key, preset]) => `<button type="button" class="theme-preset-card ${current.preset === key ? 'selected' : ''}" data-theme-preset="${key}">
      <span class="theme-preset-colors"><i style="background:${preset.primary}"></i><i style="background:${preset.secondary}"></i></span>
      <span><b>${escapeHtml(preset.name)}</b><small>${escapeHtml(preset.description)}</small></span>
    </button>`).join('');
  }

  async function openWebPushPanel() {
    loading('กำลังตรวจสอบการแจ้งเตือน...');
    try {
      const status = await gasCall('getWebPushStatus', state.token);
      Swal.close();
      const expiry = status.idleExpiresAt ? new Date(status.idleExpiresAt).toLocaleString('th-TH') : '-';
      const configuredText = status.configured
        ? (status.deviceCount ? `เปิดรับแจ้งเตือนแล้ว ${status.deviceCount} อุปกรณ์` : 'ระบบพร้อม แต่เครื่องนี้ยังไม่ได้เปิดรับแจ้งเตือน')
        : 'ผู้ดูแลยังไม่ได้ตั้งค่า OneSignal';
      const dialog = await Swal.fire({
        title: '🔔 การแจ้งเตือนหนังสือราชการ',
        width: 680,
        html: `<div class="web-push-dialog">
          <div class="web-push-status ${status.deviceCount ? 'is-ready' : ''}">
            <b>${escapeHtml(configuredText)}</b>
            <span>บัญชีจะถูกจดจำ และบังคับเข้าสู่ระบบใหม่เมื่อไม่ได้ใช้งานเกิน ${Number(status.idleDays || 5)} วัน</span>
            <small>เซสชันปัจจุบันหมดอายุโดยประมาณ: ${escapeHtml(expiry)}</small>
          </div>
          <div class="web-push-guide-grid">
            <div><b>Android / คอมพิวเตอร์</b><p>กดเปิดการแจ้งเตือน แล้วเลือก “อนุญาต” ใน Chrome หรือ Edge</p></div>
            <div><b>iPhone / iPad</b><p>เปิดหน้าที่ระบบพาไปด้วย Safari เพิ่มไว้หน้าจอโฮม แล้วเปิดจากไอคอนก่อนกดอนุญาต</p></div>
          </div>
          <div class="web-push-privacy">การแจ้งเตือนจะแสดงเฉพาะเลขรับและชื่อเรื่อง ส่วน PDF ต้องเปิดผ่านระบบและตรวจสิทธิ์ตามบัญชีเดิม</div>
        </div>`,
        showCancelButton: true,
        showDenyButton: status.deviceCount > 0,
        confirmButtonText: status.deviceCount ? 'เปิดเพิ่มอีกอุปกรณ์' : 'เปิดการแจ้งเตือน',
        denyButtonText: 'ส่งแจ้งเตือนทดสอบ',
        cancelButtonText: 'ปิด',
      });
      if (dialog.isDenied) {
        loading('กำลังส่งแจ้งเตือนทดสอบ...');
        try {
          await gasCall('sendTestWebPushToMe', state.token);
          Swal.fire('ส่งแล้ว', 'กรุณาตรวจแถบแจ้งเตือนของอุปกรณ์ที่เปิดรับไว้', 'success');
        } catch (error) { showError(error); }
        return;
      }
      if (!dialog.isConfirmed) return;
      if (!status.configured) {
        Swal.fire('ยังตั้งค่าไม่ครบ', 'ให้ธุรการใช้เมนูข้อ 7 และ 8 ใน Google Sheet แล้ว Deploy ใหม่ก่อน', 'warning');
        return;
      }
      loading('กำลังสร้างลิงก์เปิดการแจ้งเตือน...');
      const pairing = await gasCall('createWebPushPairing', state.token);
      Swal.close();
      const popup = window.open(pairing.url, '_blank', 'noopener');
      if (!popup) {
        await copyTextToClipboard(pairing.url, 'คัดลอกลิงก์แล้ว');
        Swal.fire('เบราว์เซอร์บล็อกหน้าต่างใหม่', 'ระบบคัดลอกลิงก์ให้แล้ว กรุณาวางลิงก์ใน Chrome หรือ Safari', 'info');
      }
    } catch (error) { showError(error); }
  }

  function settingsSectionMarkup(sectionId, isAdmin) {
    const user = state.user || {};
    const admin = state.appSettings?.admin || {};
    const defaults = state.appSettings?.defaults || { fromSender: 'สพป.ชม.2', operationMode: 'normal' };
    const display = state.displaySettings || DEFAULT_DISPLAY_SETTINGS;
    const workflowMascot = state.workflowMascotSettings || loadWorkflowMascotSettings(user.username);
    const signatureHtml = user.signatureDataUrl
      ? `<img class="settings-signature-preview" src="${user.signatureDataUrl}" alt="ตัวอย่างลายเซ็น">`
      : '<div class="settings-empty-signature">ยังไม่ได้ตั้งค่าลายเซ็น</div>';

    const sections = {
      account: `<section class="settings-content-section"><h2>👤 บัญชีของฉัน</h2><p class="settings-lead">ข้อมูลบัญชีที่อ่านจากชีต Users</p><div class="settings-info-grid"><div><span>ชื่อ</span><b>${escapeHtml(user.name)}</b></div><div><span>ชื่อผู้ใช้</span><b>${escapeHtml(user.username)}</b></div><div><span>บทบาท</span><b>${escapeHtml(user.role)}</b></div><div><span>ฝ่าย/งาน</span><b>${escapeHtml(user.department || 'ยังไม่ระบุ')}</b></div><div><span>อีเมล</span><b>${escapeHtml(user.email || 'ยังไม่ระบุ')}</b></div><div><span>ลายเซ็น</span><b>${user.signatureConfigured || user.signatureDataUrl ? 'ตั้งค่าแล้ว' : 'ยังไม่ตั้งค่า'}</b></div></div></section>`,
      password: `<section class="settings-content-section"><h2>🔐 เปลี่ยนรหัสผ่าน</h2><p class="settings-lead">รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร</p><form id="change-own-password-form" class="settings-form"><label>รหัสผ่านเดิม<input class="input" type="password" name="currentPassword" autocomplete="current-password" required></label><label>รหัสผ่านใหม่<input class="input" type="password" name="newPassword" autocomplete="new-password" minlength="8" required></label><label>ยืนยันรหัสผ่านใหม่<input class="input" type="password" name="confirmPassword" autocomplete="new-password" minlength="8" required></label><button class="btn btn-primary" type="submit">บันทึกรหัสผ่านใหม่</button></form></section>`,
      signature: `<section class="settings-content-section"><h2>✍️ ลายเซ็นของฉัน</h2><p class="settings-lead">ลายเซ็นถูกอ่านจาก signatureFileId ในชีต Users</p><div class="settings-signature-card">${signatureHtml}<div><b>${user.signatureConfigured || user.signatureDataUrl ? 'ตั้งค่าลายเซ็นแล้ว' : 'ยังไม่ได้ตั้งค่าลายเซ็น'}</b><p>ผู้ดูแลระบบเป็นผู้เปลี่ยนไฟล์ลายเซ็น เพื่อป้องกันการนำลายเซ็นของบุคคลอื่นมาใช้</p></div></div></section>`,
      display: `<section class="settings-content-section"><h2>🖥️ การแสดงผล</h2><p class="settings-lead">เลือกธีมสำเร็จรูปหรือกำหนดสีหลักและสีรองเอง การตั้งค่าจะจำไว้ใน Browser เครื่องนี้</p><div class="settings-display-grid"><div><h3>โทนสีสำเร็จรูป</h3><div id="theme-preset-grid" class="theme-preset-grid">${themePresetCards(display)}</div><h3 class="mt-5">กำหนดสีเอง</h3><div class="theme-color-inputs"><label>สีหลัก<div><input id="theme-primary" type="color" value="${display.primary}"><input id="theme-primary-text" class="input" value="${display.primary}"></div></label><label>สีรอง<div><input id="theme-secondary" type="color" value="${display.secondary}"><input id="theme-secondary-text" class="input" value="${display.secondary}"></div></label></div><div class="settings-background-block"><h3>พื้นหลังหน้าเว็บ</h3><label class="switch-row"><span>เปิดภาพพื้นหลัง</span><input id="display-background-enabled" type="checkbox" ${display.backgroundEnabled ? 'checked' : ''}></label><label>URL รูปภาพพื้นหลัง<input id="display-background-url" class="input" placeholder="https://..." value="${escapeHtml(display.backgroundUrl || '')}"></label><label>ความเข้มพื้นหลัง<input id="display-background-opacity" type="range" min="0" max="0.45" step="0.01" value="${Number(display.backgroundOpacity ?? 0.12)}"></label><p class="text-xs text-slate-500">ระบบใช้ภาพพื้นหลังแบบ fixed layer เพียงชั้นเดียว ไม่ทำ animation เพื่อช่วยลดอาการหน่วง</p></div><div class="settings-toggle-list"><label>จำนวนเอกสารต่อหน้า<select id="display-page-size" class="input"><option value="15" ${display.pageSize === 15 ? 'selected' : ''}>15 รายการ</option><option value="25" ${display.pageSize === 25 ? 'selected' : ''}>25 รายการ</option><option value="50" ${display.pageSize === 50 ? 'selected' : ''}>50 รายการ</option><option value="100" ${display.pageSize === 100 ? 'selected' : ''}>100 รายการ</option></select></label><label>ขนาดตัวอักษร<select id="display-font-scale" class="input"><option value="0.9" ${display.fontScale === .9 ? 'selected' : ''}>เล็ก</option><option value="1" ${display.fontScale === 1 ? 'selected' : ''}>ปกติ</option><option value="1.15" ${display.fontScale === 1.15 ? 'selected' : ''}>ใหญ่</option></select></label><label class="switch-row"><span>ลดภาพเคลื่อนไหว</span><input id="display-reduced-motion" type="checkbox" ${display.reducedMotion ? 'checked' : ''}></label><label class="switch-row"><span>เพิ่มความคมชัดของสี</span><input id="display-high-contrast" type="checkbox" ${display.highContrast ? 'checked' : ''}></label></div></div><div><h3>ตัวอย่างหน้าจอ</h3><div id="theme-live-preview" class="theme-live-preview" style="--preview-primary:${display.primary};--preview-secondary:${display.secondary}"><div class="preview-topbar">ทะเบียนหนังสือโรงเรียนวัดแม่กะ</div><div class="preview-body"><div class="preview-side"><i></i><i></i><i></i></div><div class="preview-main"><div class="preview-stats"><span>125</span><span>8</span><span>23</span></div><div class="preview-table"><b></b><b></b><b></b></div><div class="preview-buttons"><button>ปุ่มหลัก</button><button>ปุ่มรอง</button></div></div></div></div><div class="settings-theme-tip"><b>คำแนะนำ</b><p><b>สบายตา</b> เหมาะกับใช้งานนาน • <b>ทางการ</b> เหมาะกับเอกสารราชการ • <b>กลางคืน</b> ช่วยลดแสงจ้า</p></div></div></div><div class="settings-actions"><button id="reset-display-settings" class="btn btn-muted" type="button">คืนค่าเริ่มต้น</button><button id="save-display-settings" class="btn btn-primary" type="button">บันทึกการแสดงผล</button></div></section>`,
      workflowMascot: `<section class="settings-content-section"><h2>🐥 มาสคอตแจ้งเตือนงาน</h2><p class="settings-lead">สำหรับครู รองผู้อำนวยการ และผู้อำนวยการ สามารถซ่อนหรือแสดงเป็ด กระต่าย หมี และแพนด้าได้ตามต้องการ</p><div class="mascot-settings-card"><label class="switch-row mascot-master-switch"><span><b>แสดงมาสคอตแจ้งเตือนงาน</b><small>เมื่อปิด มาสคอตจะไม่แสดงบนหน้ารายการเอกสาร แต่จำนวนงานและการแจ้งเตือนอื่นยังทำงานตามปกติ</small></span><input id="workflow-mascot-enabled" type="checkbox" ${workflowMascot.enabled ? 'checked' : ''}></label><div class="mascot-preview-box"><b>ตัวอย่างมาสคอต</b><div class="mascot-settings-preview"><span title="เป็ดแจ้งงานใหม่">${mascotArt('duck')}</span><span title="กระต่ายบันทึกสำเร็จ">${mascotArt('bunny')}</span><span title="หมีงานเสร็จแล้ว">${mascotArt('bear')}</span><span title="แพนด้าพักสายตา">${mascotArt('panda')}</span></div><small>การตั้งค่านี้บันทึกแยกตามชื่อผู้ใช้ใน Browser เครื่องที่กำลังใช้งาน</small></div></div><div class="settings-actions"><button id="reset-workflow-mascot-settings" class="btn btn-muted" type="button">เปิดค่าเริ่มต้น</button><button id="save-workflow-mascot-settings" class="btn btn-primary" type="button">บันทึกการตั้งค่า</button></div></section>`,
      mascots: `<section class="settings-content-section"><h2>🎀 มาสคอตและตัวละคร</h2><p class="settings-lead">แสดงเฉพาะบัญชีที่มีบทบาท “ธุรการ” เลือกตัวละครได้สูงสุด 10 ตัว และเลือกตำแหน่งที่ต้องการ</p><div class="mascot-settings-card"><label class="switch-row mascot-master-switch"><span><b>เปิดใช้งานมาสคอต</b><small>ปิดได้ทุกเมื่อหากต้องการหน้าเว็บแบบเรียบ</small></span><input id="mascot-enabled" type="checkbox" ${(state.mascotSettings || loadMascotSettings()).enabled ? 'checked' : ''}></label><div class="mascot-settings-block"><h3>เลือกตัวละคร <small>เลือกได้ไม่เกิน 10 ตัว</small></h3><div id="mascot-choice-grid" class="mascot-choice-grid">${ADMIN_MASCOT_CATALOG.map((item) => `<label class="mascot-choice-card"><input type="checkbox" value="${item.id}" ${(state.mascotSettings || loadMascotSettings()).selected.includes(item.id) ? 'checked' : ''}><span class="mascot-choice-icon">${item.icon}</span><b>${escapeHtml(item.name)}</b></label>`).join('')}</div></div><div class="mascot-settings-options"><fieldset><legend>ตำแหน่งแสดงผล</legend><label><input type="radio" name="mascotPosition" value="top" ${(state.mascotSettings || loadMascotSettings()).position === 'top' ? 'checked' : ''}> วิ่งบริเวณด้านบนของหน้าเว็บ</label><label><input type="radio" name="mascotPosition" value="page" ${(state.mascotSettings || loadMascotSettings()).position === 'page' ? 'checked' : ''}> วิ่งภายในพื้นที่หน้าเว็บ</label></fieldset><label>ความเร็ว<select id="mascot-speed" class="input"><option value="slow" ${(state.mascotSettings || loadMascotSettings()).speed === 'slow' ? 'selected' : ''}>ช้า</option><option value="normal" ${(state.mascotSettings || loadMascotSettings()).speed === 'normal' ? 'selected' : ''}>ปกติ</option><option value="fast" ${(state.mascotSettings || loadMascotSettings()).speed === 'fast' ? 'selected' : ''}>เร็ว</option></select></label></div><div class="mascot-preview-box"><b>ตัวอย่างที่เลือก</b><div id="mascot-settings-preview" class="mascot-settings-preview"></div><small>เมื่อแตะตัวละครในหน้าเว็บ จะสุ่มแอนิเมชันและแสดงหัวใจ ดาว หรือข้อความสั้น ๆ</small></div></div><div class="settings-actions"><button id="reset-mascot-settings" class="btn btn-muted" type="button">คืนค่าเริ่มต้น</button><button id="save-mascot-settings" class="btn btn-primary" type="button">บันทึกมาสคอต</button></div></section>`,
      users: `<section class="settings-content-section"><h2>👥 จัดการผู้ใช้งาน</h2><p class="settings-lead">ธุรการสามารถตั้งรหัสผ่านใหม่ให้ครู รองผู้อำนวยการ หรือผู้อำนวยการได้ โดยไม่ต้องทราบรหัสเดิม</p><div class="settings-summary-card"><div class="user-admin-toolbar"><div><b>ผู้ใช้งานทั้งหมด ${Number(admin.counts?.users || 0)} คน</b><p>ระบบไม่แสดงรหัสผ่านเดิม และจะเก็บเฉพาะค่า Hash ในชีต Users</p></div><button id="open-users-sheet" class="btn btn-muted" type="button">เปิดชีต Users</button></div><input id="admin-user-search" class="input mt-4" placeholder="ค้นหาชื่อ ชื่อผู้ใช้ บทบาท หรือฝ่าย"><div id="admin-user-list" class="admin-user-list"><div class="settings-loading-row">กำลังอ่านรายชื่อผู้ใช้...</div></div></div></section>`,
      import: `<section class="settings-content-section"><h2>📥 ค่าเริ่มต้นการนำเข้า</h2><p class="settings-lead">ค่าที่กำหนดจะถูกใส่ให้อัตโนมัติเมื่อเปิดหน้าต่างนำเข้าหนังสือใหม่</p><form id="import-defaults-form" class="settings-form"><label>หน่วยงานผู้ส่งเริ่มต้น<input class="input" name="fromSender" value="${escapeHtml(defaults.fromSender || 'สพป.ชม.2')}" required></label><label>รูปแบบการดำเนินงานเริ่มต้น<select class="input" name="operationMode"><option value="normal" ${defaults.operationMode === 'normal' ? 'selected' : ''}>ปกติ</option><option value="acting" ${defaults.operationMode === 'acting' ? 'selected' : ''}>รองรักษาการ</option><option value="director" ${defaults.operationMode === 'director' ? 'selected' : ''}>รองผู้อำนวยการไม่อยู่</option></select></label><button class="btn btn-primary" type="submit">บันทึกค่าเริ่มต้น</button></form></section>`,
      receive: `<section class="settings-content-section"><h2>🔢 เลขรับและปีทะเบียน</h2><p class="settings-lead">ระบบจะนำเลขรับล่าสุดมาบวก 1 สำหรับเอกสารฉบับถัดไป</p><form id="receive-settings-form" class="settings-form"><label>เลขรับล่าสุด<input class="input" type="number" min="0" step="1" name="lastNumber" value="${Number(admin.receive?.lastNumber || 0)}" required></label><label>ปีทะเบียน พ.ศ.<input class="input" type="number" min="2500" max="3000" step="1" name="year" value="${Number(admin.receive?.year || new Date().getFullYear() + 543)}" required></label><div class="settings-next-number">เลขถัดไป: <b id="next-receive-number">${escapeHtml(admin.receive?.nextNumber || '-')}</b></div><button class="btn btn-primary" type="submit">บันทึกเลขรับ</button></form></section>`,
      system: `<section class="settings-content-section"><h2>🩺 ตรวจสอบระบบ</h2><p class="settings-lead">ตรวจสอบการเชื่อมต่อ Google Sheet, Drive และหน้าเว็บ</p><div id="system-status-grid" class="system-status-grid">${statusPill(true, 'Google Sheet พร้อม')}${statusPill(admin.system?.rootFolderReady, 'โฟลเดอร์หลัก')}${statusPill(admin.system?.originalFolderReady, 'เอกสารต้นฉบับ')}${statusPill(admin.system?.stampedFolderReady, 'เอกสารประทับตรา')}${statusPill(admin.system?.signatureFolderReady, 'โฟลเดอร์ลายเซ็น')}${statusPill(Number(admin.system?.designedConcurrentUsers || 0) >= 15, 'รองรับพร้อมกัน 15 คน')}<div class="settings-version-row"><span>Frontend</span><b>${escapeHtml(admin.system?.frontendVersion || '-')}</b></div><div class="settings-version-row"><span>เอกสารในทะเบียน</span><b>${Number(admin.counts?.documents || 0)}</b></div></div><div class="webapp-link-card"><div><b>ลิงก์สำหรับเปิดระบบและส่งให้ผู้ใช้งาน</b><p>ใช้ลิงก์ Google Apps Script Web App ที่ลงท้ายด้วย <code>/exec</code> เท่านั้น</p><div class="mobile-url-box">${escapeHtml(admin.system?.webAppUrl || 'ยังอ่านลิงก์ Web App ไม่ได้')}</div></div><button id="copy-webapp-url" class="btn btn-primary" type="button" ${admin.system?.webAppUrl ? '' : 'disabled'}>คัดลอกลิงก์</button></div><div class="settings-warning-box">หากเปิดใน LINE ได้ แต่เปิดใน Chrome ไม่ได้ ให้ตรวจ Deployment ว่าอนุญาต “ทุกคน” หรือให้ผู้ใช้ลงชื่อเข้า Google ด้วยบัญชีที่ได้รับอนุญาต และตรวจการอนุญาตคุกกี้ของเว็บไซต์ Google</div><div class="settings-actions"><button id="refresh-system-status" class="btn btn-primary" type="button">ตรวจสอบอีกครั้ง</button></div></section>`,

      data: `<section class="settings-content-section"><h2>🗂️ จัดการข้อมูล</h2><p class="settings-lead">เปิดทะเบียนและโฟลเดอร์จัดเก็บข้อมูลของระบบ</p><div class="data-link-grid"><button data-open-url="${escapeHtml(admin.documentsSheetUrl || '')}">📄 ชีต Documents<small>${Number(admin.counts?.documents || 0)} รายการ</small></button><button data-open-url="${escapeHtml(admin.auditSheetUrl || '')}">🧾 Audit Log<small>${Number(admin.counts?.audit || 0)} รายการ</small></button><button data-open-url="${escapeHtml(admin.folders?.original || '')}">📥 เอกสารต้นฉบับ</button><button data-open-url="${escapeHtml(admin.folders?.stamped || '')}">✅ เอกสารประทับตรา</button><button data-open-url="${escapeHtml(admin.folders?.attachments || '')}">📎 ไฟล์แนบ</button><button data-open-url="${escapeHtml(admin.folders?.signatures || '')}">✍️ ลายเซ็น</button></div><div class="settings-warning-box">เพื่อป้องกันการลบผิด ระบบยังไม่ใส่ปุ่ม “ล้างข้อมูลทั้งหมด” ในหน้าเว็บ การล้างข้อมูลให้ทำจาก Google Sheet และ Drive หลังสำรองข้อมูลแล้ว</div><button id="settings-open-download-center" class="btn btn-primary mt-4" type="button">เปิดศูนย์ดาวน์โหลดเอกสาร</button></section>`,
    };
    if (!isAdmin && ['users', 'import', 'receive', 'system', 'data'].includes(sectionId)) return sections.account;
    return sections[sectionId] || sections.account;
  }

  function openSettingsPanel() {
    const isAdmin = isClericalUser();
    let activeSection = 'account';
    let originalDisplay = { ...(state.displaySettings || DEFAULT_DISPLAY_SETTINGS) };
    let displayDraft = { ...originalDisplay };
    let displaySaved = true;
    const overlay = document.createElement('div');
    overlay.className = 'settings-backdrop';
    overlay.innerHTML = `<div class="settings-shell"><aside class="settings-sidebar"><div class="settings-sidebar-head"><div><span class="settings-large-gear">⚙</span><h2>การตั้งค่า</h2><p>จัดการบัญชีและระบบ</p></div><button class="settings-close" type="button" aria-label="ปิด">×</button></div><nav>${settingsNavButton('account','👤','บัญชีของฉัน','ข้อมูลบัญชีและสิทธิ์')}${settingsNavButton('password','🔐','เปลี่ยนรหัสผ่าน','ดูแลความปลอดภัย')}${settingsNavButton('signature','✍️','ลายเซ็นของฉัน','ตรวจสถานะลายเซ็น')}${settingsNavButton('display','🖥️','การแสดงผล','ธีม สี และตัวอักษร')}${!isAdmin ? settingsNavButton('workflowMascot','🐥','มาสคอตแจ้งเตือน','เปิดหรือปิดสัตว์แจ้งงาน') : ''}${isAdmin ? `<div class="settings-admin-divider"><span>สำหรับผู้ดูแล</span></div>${settingsNavButton('mascots','🎀','มาสคอตและตัวละคร','เลือกตัวละครและตำแหน่ง',true)}${settingsNavButton('users','👥','จัดการผู้ใช้งาน','เปิดชีต Users',true)}${settingsNavButton('import','📥','ค่าเริ่มต้นการนำเข้า','ผู้ส่งและเส้นทาง',true)}${settingsNavButton('receive','🔢','เลขรับและปีทะเบียน','เลขเอกสารถัดไป',true)}${settingsNavButton('system','🩺','ตรวจสอบระบบ','สถานะระบบทั้งหมด',true)}${settingsNavButton('data','🗂️','จัดการข้อมูล','ชีตและโฟลเดอร์',true)}` : ''}</nav><button class="settings-close-bottom" type="button">ปิด</button></aside><main id="settings-content" class="settings-content"></main></div>`;
    document.body.appendChild(overlay);

    const content = overlay.querySelector('#settings-content');
    const renderSection = (sectionId) => {
      activeSection = sectionId;
      content.innerHTML = settingsSectionMarkup(sectionId, isAdmin);
      overlay.querySelectorAll('[data-settings-section]').forEach((button) => button.classList.toggle('active', button.dataset.settingsSection === sectionId));
      bindSettingsSection(sectionId);
    };

    const close = () => {
      if (!displaySaved) applyDisplaySettings(originalDisplay);
      overlay.remove();
    };

    const updateThemePreview = () => {
      const primary = normalizeHexColor(overlay.querySelector('#theme-primary')?.value, displayDraft.primary);
      const secondary = normalizeHexColor(overlay.querySelector('#theme-secondary')?.value, displayDraft.secondary);
      displayDraft = { ...displayDraft, primary, secondary, preset: displayDraft.preset || 'custom' };
      const preview = overlay.querySelector('#theme-live-preview');
      if (preview) {
        preview.style.setProperty('--preview-primary', primary);
        preview.style.setProperty('--preview-secondary', secondary);
      }
      applyDisplaySettings(displayDraft);
      displaySaved = false;
    };

    const bindSettingsSection = (sectionId) => {
      const passwordForm = overlay.querySelector('#change-own-password-form');
      if (passwordForm) passwordForm.onsubmit = async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        if (form.get('newPassword') !== form.get('confirmPassword')) {
          Swal.fire('ตรวจสอบข้อมูล', 'รหัสผ่านใหม่และช่องยืนยันไม่ตรงกัน', 'warning');
          return;
        }
        loading('กำลังเปลี่ยนรหัสผ่าน...');
        try {
          const result = await gasCall('changeOwnPassword', state.token, form.get('currentPassword'), form.get('newPassword'));
          event.currentTarget.reset();
          Swal.fire(
            result.auditSaved === false ? 'เปลี่ยนรหัสผ่านแล้ว' : 'สำเร็จ',
            result.message || 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว',
            result.auditSaved === false ? 'warning' : 'success'
          );
        } catch (error) { showError(error); }
      };

      if (sectionId === 'display') {
        const syncTextAndColor = (colorId, textId) => {
          const color = overlay.querySelector(colorId);
          const text = overlay.querySelector(textId);
          color.oninput = () => { text.value = color.value; displayDraft.preset = 'custom'; updateThemePreview(); };
          text.onchange = () => { text.value = normalizeHexColor(text.value, color.value); color.value = text.value; displayDraft.preset = 'custom'; updateThemePreview(); };
        };
        syncTextAndColor('#theme-primary', '#theme-primary-text');
        syncTextAndColor('#theme-secondary', '#theme-secondary-text');
        overlay.querySelectorAll('[data-theme-preset]').forEach((button) => button.onclick = () => {
          const key = button.dataset.themePreset;
          const preset = THEME_PRESETS[key];
          displayDraft = { ...displayDraft, preset: key, primary: preset.primary, secondary: preset.secondary };
          overlay.querySelector('#theme-primary').value = preset.primary;
          overlay.querySelector('#theme-primary-text').value = preset.primary;
          overlay.querySelector('#theme-secondary').value = preset.secondary;
          overlay.querySelector('#theme-secondary-text').value = preset.secondary;
          overlay.querySelectorAll('[data-theme-preset]').forEach((item) => item.classList.toggle('selected', item === button));
          updateThemePreview();
        });
        overlay.querySelector('#display-page-size').onchange = (event) => { displayDraft.pageSize = Number(event.target.value); state.documentPage = 1; };
        overlay.querySelector('#display-background-enabled').onchange = (event) => { displayDraft.backgroundEnabled = event.target.checked; updateThemePreview(); };
        overlay.querySelector('#display-background-url').onchange = (event) => { displayDraft.backgroundUrl = String(event.target.value || '').trim(); updateThemePreview(); };
        overlay.querySelector('#display-background-opacity').oninput = (event) => { displayDraft.backgroundOpacity = Number(event.target.value); updateThemePreview(); };
        overlay.querySelector('#display-font-scale').onchange = (event) => { displayDraft.fontScale = Number(event.target.value); updateThemePreview(); };
        overlay.querySelector('#display-reduced-motion').onchange = (event) => { displayDraft.reducedMotion = event.target.checked; updateThemePreview(); };
        overlay.querySelector('#display-high-contrast').onchange = (event) => { displayDraft.highContrast = event.target.checked; updateThemePreview(); };
        overlay.querySelector('#save-display-settings').onclick = () => {
          saveDisplaySettings(displayDraft);
          originalDisplay = { ...displayDraft };
          displaySaved = true;
          Swal.fire('บันทึกแล้ว', 'ระบบจดจำธีมและการแสดงผลบนเครื่องนี้แล้ว', 'success');
        };
        overlay.querySelector('#reset-display-settings').onclick = () => {
          displayDraft = { ...DEFAULT_DISPLAY_SETTINGS };
          applyDisplaySettings(displayDraft);
          displaySaved = false;
          renderSection('display');
        };
      }

      if (sectionId === 'workflowMascot' && !isAdmin) {
        overlay.querySelector('#save-workflow-mascot-settings').onclick = () => {
          const enabled = overlay.querySelector('#workflow-mascot-enabled').checked;
          saveWorkflowMascotSettings({ enabled });
          Swal.fire({
            icon: 'success',
            title: enabled ? 'เปิดมาสคอตแล้ว' : 'ปิดมาสคอตแล้ว',
            text: enabled ? 'มาสคอตแจ้งเตือนจะแสดงบนหน้ารายการเอกสาร' : 'มาสคอตถูกซ่อนแล้ว การทำงานและจำนวนแจ้งเตือนยังเหมือนเดิม',
            timer: 1700,
            showConfirmButton: false,
          });
          close();
          renderDashboard();
        };

        overlay.querySelector('#reset-workflow-mascot-settings').onclick = () => {
          saveWorkflowMascotSettings({ ...DEFAULT_WORKFLOW_MASCOT_SETTINGS });
          renderSection('workflowMascot');
        };
      }

      if (sectionId === 'mascots' && isAdmin) {
        const updateMascotPreview = () => {
          const preview = overlay.querySelector('#mascot-settings-preview');
          if (!preview) return;
          const selected = [...overlay.querySelectorAll('#mascot-choice-grid input:checked')].map((input) => input.value).slice(0, 10);
          preview.innerHTML = selected.length
            ? selected.map((id) => {
                const item = ADMIN_MASCOT_CATALOG.find((candidate) => candidate.id === id);
                return item ? `<span title="${escapeHtml(item.name)}">${item.icon}</span>` : '';
              }).join('')
            : '<em>ยังไม่ได้เลือกตัวละคร</em>';
        };
        overlay.querySelectorAll('#mascot-choice-grid input').forEach((input) => {
          input.onchange = () => {
            const checked = overlay.querySelectorAll('#mascot-choice-grid input:checked');
            if (checked.length > 10) {
              input.checked = false;
              Swal.fire('เลือกได้สูงสุด 10 ตัว', 'กรุณายกเลิกตัวละครบางตัวก่อนเลือกเพิ่ม', 'warning');
            }
            updateMascotPreview();
          };
        });
        updateMascotPreview();

        overlay.querySelector('#save-mascot-settings').onclick = () => {
          const selected = [...overlay.querySelectorAll('#mascot-choice-grid input:checked')].map((input) => input.value).slice(0, 10);
          const enabled = overlay.querySelector('#mascot-enabled').checked;
          if (enabled && !selected.length) {
            Swal.fire('ยังไม่ได้เลือกตัวละคร', 'กรุณาเลือกอย่างน้อย 1 ตัว หรือปิดการใช้งานมาสคอต', 'warning');
            return;
          }
          saveMascotSettings({
            enabled,
            selected,
            position: overlay.querySelector('input[name="mascotPosition"]:checked')?.value || 'top',
            speed: overlay.querySelector('#mascot-speed').value || 'normal',
          });
          Swal.fire({ icon: 'success', title: 'บันทึกมาสคอตแล้ว', text: 'การตั้งค่าใหม่จะแสดงทันทีบนหน้ารายการเอกสาร', timer: 1500, showConfirmButton: false });
          close();
          renderDashboard();
        };

        overlay.querySelector('#reset-mascot-settings').onclick = () => {
          saveMascotSettings({ ...DEFAULT_ADMIN_MASCOT_SETTINGS, selected: [...DEFAULT_ADMIN_MASCOT_SETTINGS.selected] });
          renderSection('mascots');
        };
      }

      const usersButton = overlay.querySelector('#open-users-sheet');
      if (usersButton) usersButton.onclick = () => openExternal(state.appSettings?.admin?.usersSheetUrl);

      if (sectionId === 'users') {
        const list = overlay.querySelector('#admin-user-list');
        const search = overlay.querySelector('#admin-user-search');
        const renderAdminUsers = () => {
          const query = String(search?.value || '').trim().toLowerCase();
          const filtered = (state.adminUsers || []).filter((item) => `${item.name} ${item.username} ${item.role} ${item.department || ''} ${item.email || ''}`.toLowerCase().includes(query));
          list.innerHTML = filtered.length ? filtered.map((item) => `
            <div class="admin-user-row ${item.active ? '' : 'is-inactive'}">
              <div class="admin-user-avatar">${escapeHtml((item.name || item.username || '?').slice(0, 1))}</div>
              <div class="admin-user-main"><b>${escapeHtml(item.name || '-')}</b><span>@${escapeHtml(item.username)} • ${escapeHtml(item.role || '-')}</span><small>${escapeHtml(item.department || 'ยังไม่ระบุฝ่าย')}${item.email ? ' • ' + escapeHtml(item.email) : ''}</small></div>
              <div class="admin-user-flags"><span class="mini-status ${item.active ? 'ok' : 'off'}">${item.active ? 'ใช้งาน' : 'ปิดบัญชี'}</span><span class="mini-status ${item.signatureConfigured ? 'ok' : 'neutral'}">${item.signatureConfigured ? 'มีลายเซ็น' : 'ไม่มีลายเซ็น'}</span></div>
              <button class="btn btn-primary admin-reset-password" type="button" data-user-id="${escapeHtml(item.userId)}" ${item.active ? '' : 'disabled'}>ตั้งรหัสใหม่</button>
            </div>`).join('') : '<div class="settings-empty-row">ไม่พบผู้ใช้ที่ตรงกับคำค้นหา</div>';
          list.querySelectorAll('.admin-reset-password').forEach((button) => {
            button.onclick = async () => {
              const target = state.adminUsers.find((item) => item.userId === button.dataset.userId);
              if (!target) return;
              const temporary = generateTemporaryPassword();
              const dialog = await Swal.fire({
                title: `ตั้งรหัสผ่านใหม่ให้ ${escapeHtml(target.name)}`,
                html: `<div class="admin-password-dialog"><p>ระบบไม่จำเป็นต้องทราบรหัสผ่านเดิม</p><label>รหัสผ่านใหม่<input id="admin-new-password" class="swal2-input" type="text" value="${temporary}" minlength="8"></label><label>ยืนยันรหัสผ่าน<input id="admin-confirm-password" class="swal2-input" type="text" value="${temporary}" minlength="8"></label><small>อย่างน้อย 8 ตัวอักษร กรุณาส่งรหัสให้เจ้าของบัญชีเป็นการส่วนตัว</small></div>`,
                showCancelButton: true,
                confirmButtonText: 'บันทึกรหัสใหม่',
                cancelButtonText: 'ยกเลิก',
                focusConfirm: false,
                preConfirm: () => {
                  const password = document.getElementById('admin-new-password').value;
                  const confirm = document.getElementById('admin-confirm-password').value;
                  if (password.length < 8) {
                    Swal.showValidationMessage('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร');
                    return false;
                  }
                  if (password !== confirm) {
                    Swal.showValidationMessage('รหัสผ่านทั้งสองช่องไม่ตรงกัน');
                    return false;
                  }
                  return password;
                },
              });
              if (!dialog.isConfirmed) return;
              loading('กำลังตั้งรหัสผ่านใหม่...');
              try {
                const result = await gasCall('adminResetUserPassword', state.token, target.userId, dialog.value);
                await Swal.fire({
                  title: result.auditSaved === false ? 'เปลี่ยนรหัสผ่านแล้ว' : 'สำเร็จ',
                  html: `<p>${escapeHtml(result.message || 'ตั้งรหัสผ่านใหม่เรียบร้อยแล้ว')}</p><div class="temporary-password-box"><span>${escapeHtml(dialog.value)}</span><button id="copy-temp-password" class="btn btn-muted" type="button">คัดลอกรหัส</button></div><p class="text-sm text-slate-500">ให้เจ้าของบัญชีเข้าสู่ระบบด้วยรหัสนี้ แล้วเปลี่ยนรหัสผ่านของตนเองอีกครั้ง</p>`,
                  icon: result.auditSaved === false ? 'warning' : 'success',
                  didOpen: () => {
                    const copy = document.getElementById('copy-temp-password');
                    if (copy) copy.onclick = () => copyTextToClipboard(dialog.value, 'คัดลอกรหัสผ่านแล้ว');
                  },
                });
              } catch (error) { showError(error); }
            };
          });
        };
        if (search) search.oninput = renderAdminUsers;
        gasCall('listUsersForAdmin', state.token)
          .then((result) => {
            state.adminUsers = result.users || [];
            renderAdminUsers();
          })
          .catch((error) => { list.innerHTML = `<div class="settings-error-row">${escapeHtml(error.message || error)}</div>`; });
      }

      const importForm = overlay.querySelector('#import-defaults-form');
      if (importForm) importForm.onsubmit = async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        loading('กำลังบันทึกค่าเริ่มต้น...');
        try {
          const result = await gasCall('saveImportDefaults', state.token, { fromSender: form.get('fromSender'), operationMode: form.get('operationMode') });
          state.appSettings.defaults = result.defaults;
          Swal.fire('สำเร็จ', 'บันทึกค่าเริ่มต้นการนำเข้าแล้ว', 'success');
        } catch (error) { showError(error); }
      };

      const receiveForm = overlay.querySelector('#receive-settings-form');
      if (receiveForm) {
        const updateNext = () => {
          const number = Number(receiveForm.elements.lastNumber.value || 0);
          const year = Number(receiveForm.elements.year.value || 0);
          overlay.querySelector('#next-receive-number').textContent = `${number + 1}/${year}`;
        };
        receiveForm.elements.lastNumber.oninput = updateNext;
        receiveForm.elements.year.oninput = updateNext;
        receiveForm.onsubmit = async (event) => {
          event.preventDefault();
          loading('กำลังบันทึกเลขรับ...');
          try {
            const result = await gasCall('saveReceiveSettings', state.token, { lastNumber: Number(receiveForm.elements.lastNumber.value), year: Number(receiveForm.elements.year.value) });
            state.appSettings.admin.receive = result.receive;
            overlay.querySelector('#next-receive-number').textContent = result.receive.nextNumber;
            Swal.fire('สำเร็จ', `เลขรับถัดไปคือ ${result.receive.nextNumber}`, 'success');
          } catch (error) { showError(error); }
        };
      }

      const copyWebAppButton = overlay.querySelector('#copy-webapp-url');
      if (copyWebAppButton) copyWebAppButton.onclick = () => copyTextToClipboard(state.appSettings?.admin?.system?.webAppUrl, 'คัดลอกลิงก์ Web App สำหรับส่งให้ผู้ใช้งานแล้ว');

      const refreshStatus = overlay.querySelector('#refresh-system-status');
      if (refreshStatus) refreshStatus.onclick = async () => {
        loading('กำลังตรวจสอบระบบ...');
        try {
          const result = await gasCall('refreshAdminSystemStatus', state.token);
          state.appSettings.admin = result.admin;
          Swal.close();
          renderSection('system');
        } catch (error) { showError(error); }
      };

      overlay.querySelectorAll('[data-open-url]').forEach((button) => button.onclick = () => openExternal(button.dataset.openUrl));
      const downloadButton = overlay.querySelector('#settings-open-download-center');
      if (downloadButton) downloadButton.onclick = () => { close(); openDownloadCenter(); };
    };

    overlay.querySelectorAll('[data-settings-section]').forEach((button) => button.onclick = () => renderSection(button.dataset.settingsSection));
    overlay.querySelectorAll('.settings-close, .settings-close-bottom').forEach((button) => button.onclick = close);
    overlay.onclick = (event) => { if (event.target === overlay) close(); };
    renderSection(activeSection);
  }

  function openDocumentManagementMenu() {
    if (!canManageDocumentRecipients()) {
      Swal.fire('ไม่มีสิทธิ์ใช้งาน', 'เมนูจัดการใช้ได้เฉพาะธุรการ รองผู้อำนวยการ และผู้อำนวยการ', 'warning');
      return;
    }
    const overlay = document.createElement('div');
    overlay.className = 'modal-backdrop document-manage-backdrop';
    overlay.innerHTML = `<div class="modal-panel document-manage-menu-panel">
      <div class="document-manage-menu-heading">
        <div><span class="document-manage-kicker">จัดการเอกสารรับ</span><h2>เลือกสิ่งที่ต้องการดำเนินการ</h2><p>แก้ไขรายชื่อผู้รับ หรือดาวน์โหลด PDF ตามช่วงเวลา</p></div>
        <button class="text-2xl close-modal" type="button" aria-label="ปิด">×</button>
      </div>
      <div class="document-manage-option-grid">
        <button id="open-recipient-manager" class="document-manage-option recipient-option" type="button">
          <span class="document-manage-option-icon">👥</span><span><b>แก้ไขผู้รับ</b><small>เพิ่มผู้รับที่ตกหล่น หรือลบผู้รับเดิมด้วย Checkbox โดยรักษาสถานะของคนที่ยังเลือกไว้</small></span><i>›</i>
        </button>
        <button id="open-pdf-download-manager" class="document-manage-option download-option" type="button">
          <span class="document-manage-option-icon">📥</span><span><b>ดาวน์โหลดเอกสาร</b><small>เลือก PDF รายวัน รายสัปดาห์ รายเดือน หรือช่วงวันที่ และรวมหลายไฟล์เป็น ZIP</small></span><i>›</i>
        </button>
      </div>
      <div class="document-manage-permission-note">สิทธิ์เมนูนี้: ธุรการ • รองผู้อำนวยการ • ผู้อำนวยการ</div>
    </div>`;
    document.body.appendChild(overlay);
    const close = () => overlay.remove();
    overlay.querySelector('.close-modal').onclick = close;
    overlay.onclick = (event) => { if (event.target === overlay) close(); };
    overlay.querySelector('#open-recipient-manager').onclick = () => { close(); openRecipientManagementModal(); };
    overlay.querySelector('#open-pdf-download-manager').onclick = () => { close(); openDownloadCenter(); };
  }

  function recipientStatusLabel(recipient) {
    if (!recipient) return { text: 'ยังไม่ได้ส่ง', className: 'not-assigned' };
    if (recipient.acknowledgedAt) return { text: 'รับทราบแล้ว', className: 'acknowledged' };
    if (recipient.openedAt) return { text: 'เปิดอ่านแล้ว', className: 'opened' };
    return { text: 'ยังไม่ได้รับทราบ', className: 'pending' };
  }

  async function openRecipientManagementModal() {
    if (!canManageDocumentRecipients()) {
      Swal.fire('ไม่มีสิทธิ์ใช้งาน', 'แก้ไขผู้รับได้เฉพาะธุรการ รองผู้อำนวยการ และผู้อำนวยการ', 'warning');
      return;
    }
    const documents = sortDocumentsByReceiveNumberDesc(state.allDocs || []);
    if (!documents.length) {
      Swal.fire('ยังไม่มีเอกสาร', 'ไม่พบเอกสารสำหรับแก้ไขผู้รับ', 'info');
      return;
    }

    loading('กำลังอ่านรายชื่อผู้ใช้...');
    let users;
    try {
      users = await gasCall('listActiveUsers', state.token);
      Swal.close();
    } catch (error) {
      showError(error);
      return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'modal-backdrop recipient-manager-backdrop';
    overlay.innerHTML = `<div class="modal-panel recipient-manager-panel">
      <div class="recipient-manager-heading">
        <div><span class="document-manage-kicker">จัดการผู้รับเอกสาร</span><h2>เพิ่มหรือลบผู้รับ</h2><p>ติ๊กชื่อที่ต้องการให้เป็นผู้รับ และเอาเครื่องหมายถูกออกจากชื่อที่ต้องการลบ</p></div>
        <button class="text-2xl close-modal" type="button" aria-label="ปิด">×</button>
      </div>
      <div class="recipient-manager-layout">
        <section class="recipient-document-picker">
          <label class="line-field-label" for="recipient-document-search">ค้นหาเอกสาร</label>
          <input id="recipient-document-search" class="input" placeholder="เลขรับ เรื่อง หรือผู้ส่ง">
          <label class="line-field-label" for="recipient-document-select">เลือกเอกสาร</label>
          <select id="recipient-document-select" class="input"><option value="">— กรุณาเลือกเอกสาร —</option></select>
          <div id="recipient-document-summary" class="recipient-document-summary"><p>เลือกเอกสารเพื่อแก้ไขรายชื่อผู้รับ</p></div>
          <div class="recipient-manager-warning"><b>สำคัญ</b><span>ผู้รับที่ยังคงติ๊กอยู่จะรักษาวันที่เปิดอ่านและสถานะรับทราบเดิมไว้</span></div>
        </section>
        <section class="recipient-user-section">
          <div class="recipient-user-toolbar">
            <div><h3>รายชื่อผู้ใช้งาน</h3><p id="recipient-selection-summary">ยังไม่ได้เลือกเอกสาร</p></div>
            <div class="recipient-quick-actions"><button id="recipient-select-all" class="btn btn-muted text-xs" type="button" disabled>เลือกทั้งหมด</button><button id="recipient-clear-all" class="btn btn-muted text-xs" type="button" disabled>ยกเลิกทั้งหมด</button></div>
          </div>
          <input id="recipient-user-search" class="input" placeholder="ค้นหาชื่อ บทบาท หรือฝ่าย" disabled>
          <div id="recipient-user-list" class="recipient-user-list"><div class="recipient-empty-state">กรุณาเลือกเอกสารก่อน</div></div>
        </section>
      </div>
      <div class="recipient-manager-footer"><button class="btn btn-muted close-modal-bottom" type="button">ยกเลิก</button><button id="save-document-recipients" class="btn btn-primary" type="button" disabled>บันทึกการแก้ไขผู้รับ</button></div>
    </div>`;
    document.body.appendChild(overlay);

    const documentSearch = overlay.querySelector('#recipient-document-search');
    const documentSelect = overlay.querySelector('#recipient-document-select');
    const documentSummary = overlay.querySelector('#recipient-document-summary');
    const userSearch = overlay.querySelector('#recipient-user-search');
    const userList = overlay.querySelector('#recipient-user-list');
    const selectionSummary = overlay.querySelector('#recipient-selection-summary');
    const selectAllButton = overlay.querySelector('#recipient-select-all');
    const clearAllButton = overlay.querySelector('#recipient-clear-all');
    const saveButton = overlay.querySelector('#save-document-recipients');
    let selectedDocument = null;
    let initialRecipientIds = new Set();
    let selectedUserIds = new Set();
    let recipientByUserId = new Map();
    let userPool = users.slice();

    const close = () => overlay.remove();
    overlay.querySelector('.close-modal').onclick = close;
    overlay.querySelector('.close-modal-bottom').onclick = close;
    overlay.onclick = (event) => { if (event.target === overlay) close(); };

    const renderDocumentOptions = () => {
      const query = String(documentSearch.value || '').trim().toLowerCase();
      const previous = documentSelect.value;
      const filtered = documents.filter((doc) => `${doc.recvNo} ${doc.subject} ${doc.fromSender}`.toLowerCase().includes(query));
      documentSelect.innerHTML = `<option value="">— กรุณาเลือกเอกสาร —</option>${filtered.map((doc) => `<option value="${escapeHtml(doc.docId)}">${escapeHtml(doc.recvNo)} — ${escapeHtml(doc.subject)}</option>`).join('')}`;
      if (filtered.some((doc) => doc.docId === previous)) documentSelect.value = previous;
      if (!filtered.length) documentSelect.innerHTML = '<option value="">ไม่พบเอกสารที่ค้นหา</option>';
      if (previous && !filtered.some((doc) => doc.docId === previous)) selectDocument('');
    };

    const updateSelectionSummary = () => {
      if (!selectedDocument) {
        selectionSummary.textContent = 'ยังไม่ได้เลือกเอกสาร';
        return;
      }
      const added = [...selectedUserIds].filter((id) => !initialRecipientIds.has(id)).length;
      const removed = [...initialRecipientIds].filter((id) => !selectedUserIds.has(id)).length;
      const retained = [...selectedUserIds].filter((id) => initialRecipientIds.has(id)).length;
      selectionSummary.textContent = `ผู้รับ ${selectedUserIds.size} คน • เพิ่ม ${added} • ลบ ${removed} • คงเดิม ${retained}`;
    };

    const renderUsers = () => {
      if (!selectedDocument) {
        userList.innerHTML = '<div class="recipient-empty-state">กรุณาเลือกเอกสารก่อน</div>';
        return;
      }
      const query = String(userSearch.value || '').trim().toLowerCase();
      const filtered = userPool.filter((user) => `${user.name} ${user.username || ''} ${user.role || ''} ${user.department || ''}`.toLowerCase().includes(query));
      if (!filtered.length) {
        userList.innerHTML = '<div class="recipient-empty-state">ไม่พบรายชื่อที่ค้นหา</div>';
        return;
      }
      userList.innerHTML = filtered.map((user) => {
        const recipient = recipientByUserId.get(user.userId);
        const status = recipientStatusLabel(recipient);
        return `<label class="recipient-checkbox-row ${selectedUserIds.has(user.userId) ? 'is-selected' : ''}">
          <input type="checkbox" class="recipient-user-check" value="${escapeHtml(user.userId)}" ${selectedUserIds.has(user.userId) ? 'checked' : ''}>
          <span class="recipient-check-visual" aria-hidden="true"></span>
          <span class="recipient-user-info"><b>${escapeHtml(user.name)}</b><small>${escapeHtml(user.role)}${user.department ? ' • ' + escapeHtml(user.department) : ''}</small></span>
          <span class="recipient-status-chip ${status.className}">${escapeHtml(status.text)}</span>
        </label>`;
      }).join('');
      userList.querySelectorAll('.recipient-user-check').forEach((input) => {
        input.onchange = () => {
          if (input.checked) selectedUserIds.add(input.value); else selectedUserIds.delete(input.value);
          updateSelectionSummary();
          renderUsers();
        };
      });
    };

    const selectDocument = (docId) => {
      selectedDocument = documents.find((doc) => doc.docId === docId) || null;
      const recipients = selectedDocument?.recipients || [];
      recipientByUserId = new Map(recipients.map((recipient) => [recipient.userId, recipient]));
      const activeIds = new Set(users.map((user) => user.userId));
      const inactiveRecipientUsers = recipients
        .filter((recipient) => !activeIds.has(recipient.userId))
        .map((recipient) => ({
          userId: recipient.userId,
          username: '',
          name: recipient.name || recipient.email || recipient.userId,
          role: 'บัญชีเดิม/ปิดใช้งาน',
          email: recipient.email || '',
          department: '',
        }));
      userPool = [...users, ...inactiveRecipientUsers];
      initialRecipientIds = new Set(recipients.map((recipient) => recipient.userId));
      selectedUserIds = new Set(initialRecipientIds);
      const enabled = !!selectedDocument;
      userSearch.disabled = !enabled;
      selectAllButton.disabled = !enabled;
      clearAllButton.disabled = !enabled;
      saveButton.disabled = !enabled;
      if (!selectedDocument) {
        documentSummary.innerHTML = '<p>เลือกเอกสารเพื่อแก้ไขรายชื่อผู้รับ</p>';
        userSearch.value = '';
      } else {
        documentSummary.innerHTML = `<div class="recipient-summary-number">เลขรับ ${escapeHtml(selectedDocument.recvNo || '-')}</div><h3>${escapeHtml(selectedDocument.subject || '-')}</h3><p><b>จาก:</b> ${escapeHtml(selectedDocument.fromSender || '-')}</p><div class="recipient-summary-count">ผู้รับเดิม ${recipients.length} คน • รับทราบแล้ว ${recipients.filter((item) => item.acknowledgedAt).length} คน</div>`;
      }
      updateSelectionSummary();
      renderUsers();
    };

    documentSearch.oninput = renderDocumentOptions;
    documentSelect.onchange = () => selectDocument(documentSelect.value);
    userSearch.oninput = renderUsers;
    selectAllButton.onclick = () => { selectedUserIds = new Set(userPool.map((user) => user.userId)); updateSelectionSummary(); renderUsers(); };
    clearAllButton.onclick = () => { selectedUserIds.clear(); updateSelectionSummary(); renderUsers(); };

    saveButton.onclick = async () => {
      if (!selectedDocument) return;
      if (!selectedUserIds.size) {
        Swal.fire('ยังไม่มีผู้รับ', 'กรุณาเลือกผู้รับอย่างน้อย 1 คน เพื่อป้องกันเอกสารไม่มีผู้รับ', 'warning');
        return;
      }
      const userMap = new Map(userPool.map((user) => [user.userId, user]));
      const addedIds = [...selectedUserIds].filter((id) => !initialRecipientIds.has(id));
      const removedIds = [...initialRecipientIds].filter((id) => !selectedUserIds.has(id));
      const retainedIds = [...selectedUserIds].filter((id) => initialRecipientIds.has(id));
      const removedAcknowledged = removedIds.filter((id) => recipientByUserId.get(id)?.acknowledgedAt);
      const names = (ids) => ids.map((id) => userMap.get(id)?.name || recipientByUserId.get(id)?.name || id);
      const warningHtml = removedAcknowledged.length
        ? `<div class="recipient-confirm-danger"><b>มีผู้ที่รับทราบแล้วถูกลบ ${removedAcknowledged.length} คน</b><span>${names(removedAcknowledged).map(escapeHtml).join(', ')}</span></div>` : '';
      const confirmation = await Swal.fire({
        title: 'ยืนยันการแก้ไขผู้รับ?',
        html: `<div class="recipient-confirm-summary"><div><span>เพิ่ม</span><b>${addedIds.length} คน</b><small>${names(addedIds).map(escapeHtml).join(', ') || '-'}</small></div><div><span>ลบ</span><b>${removedIds.length} คน</b><small>${names(removedIds).map(escapeHtml).join(', ') || '-'}</small></div><div><span>คงเดิม</span><b>${retainedIds.length} คน</b></div></div>${warningHtml}<p class="recipient-confirm-note">สถานะของผู้รับที่ยังคงเลือกอยู่จะไม่ถูกล้าง</p>`,
        icon: removedAcknowledged.length ? 'warning' : 'question',
        showCancelButton: true,
        confirmButtonText: 'ยืนยันการแก้ไขผู้รับ',
        cancelButtonText: 'กลับไปตรวจสอบ',
        confirmButtonColor: removedAcknowledged.length ? '#b91c1c' : '#2563eb',
        reverseButtons: true,
      });
      if (!confirmation.isConfirmed) return;
      loading('กำลังบันทึกรายชื่อผู้รับ...');
      try {
        const result = await gasCall('updateDocumentRecipients', state.token, {
          docId: selectedDocument.docId,
          userIds: [...selectedUserIds],
          expectedRecipientIds: [...initialRecipientIds],
        });
        close();
        await loadDashboard();
        Swal.fire('บันทึกสำเร็จ', `เพิ่ม ${result.addedCount} คน • ลบ ${result.removedCount} คน • คงสถานะเดิม ${result.retainedCount} คน`, 'success');
      } catch (error) {
        showError(error);
      }
    };

    renderDocumentOptions();
  }

  function localDateKey(value) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function parseLocalDateInput(value) {
    const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function addLocalDays(date, amount) {
    const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    next.setDate(next.getDate() + amount);
    return next;
  }

  function mondayOfWeek(date) {
    const day = date.getDay();
    return addLocalDays(date, day === 0 ? -6 : 1 - day);
  }

  function formatThaiDocumentDate(dateKey) {
    const date = parseLocalDateInput(dateKey);
    return date ? date.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'ไม่ทราบวันที่';
  }

  function sanitizeZipLabel(value) {
    return String(value || '').replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, '-').slice(0, 80);
  }

  function openDownloadCenter() {
    const docs = guideRoleKey() === 'ครู' ? state.inboxDocs : state.allDocs.length ? state.allDocs : [...state.actionDocs, ...state.inboxDocs];
    const unique = [...new Map(docs.map((doc) => [doc.docId, doc])).values()]
      .filter((doc) => doc.currentFileId)
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    const todayKey = localDateKey(new Date());
    const monthKey = todayKey.slice(0, 7);
    const weekMonday = mondayOfWeek(new Date());
    const overlay = document.createElement('div');
    overlay.className = 'modal-backdrop download-manager-backdrop';
    overlay.innerHTML = `<div class="modal-panel download-manager-panel">
      <div class="download-manager-heading"><div><span class="document-manage-kicker">ดาวน์โหลดเฉพาะไฟล์ PDF</span><h2>ดาวน์โหลดเอกสารตามช่วงเวลา</h2><p>เลือกหนึ่งไฟล์เพื่อดาวน์โหลด PDF หรือเลือกหลายไฟล์เพื่อรวมเป็น ZIP</p></div><button class="text-2xl close-modal" type="button" aria-label="ปิด">×</button></div>
      <div class="download-period-tabs">
        <button class="download-period-tab active" data-download-mode="day" type="button">รายวัน</button>
        <button class="download-period-tab" data-download-mode="week" type="button">รายสัปดาห์</button>
        <button class="download-period-tab" data-download-mode="month" type="button">รายเดือน</button>
        <button class="download-period-tab" data-download-mode="custom" type="button">เลือกช่วงวันที่</button>
      </div>
      <div class="download-filter-panel">
        <div id="download-day-filter" class="download-filter-control"><label>วันที่<input id="download-day-value" class="input" type="date" value="${todayKey}"></label></div>
        <div id="download-week-filter" class="download-filter-control hide"><label>เลือกวันใดก็ได้ในสัปดาห์<input id="download-week-value" class="input" type="date" value="${localDateKey(weekMonday)}"></label><div id="download-week-label" class="download-range-label"></div></div>
        <div id="download-month-filter" class="download-filter-control hide"><label>เดือน<input id="download-month-value" class="input" type="month" value="${monthKey}"></label></div>
        <div id="download-custom-filter" class="download-filter-control download-custom-range hide"><label>ตั้งแต่วันที่<input id="download-start-value" class="input" type="date" value="${localDateKey(addLocalDays(new Date(), -6))}"></label><label>ถึงวันที่<input id="download-end-value" class="input" type="date" value="${todayKey}"></label></div>
        <input id="download-search" class="input download-search-input" placeholder="ค้นหาเลขรับ เรื่อง หรือผู้ส่ง">
      </div>
      <div class="download-selection-toolbar"><div><b id="download-result-count">0 เอกสาร</b><span id="download-selected-count">เลือกแล้ว 0 ไฟล์</span></div><div><button id="select-all-download" class="btn btn-muted text-xs" type="button">เลือกทั้งหมดที่แสดง</button><button id="clear-download" class="btn btn-muted text-xs" type="button">ยกเลิกทั้งหมด</button></div></div>
      <div id="download-list" class="download-date-list"></div>
      <div id="download-progress" class="hide mt-4"><div class="flex justify-between text-sm"><span id="download-progress-text">กำลังเตรียมไฟล์</span><span id="download-progress-percent">0%</span></div><div class="progress-track mt-2"><div id="download-progress-bar" class="progress-bar"></div></div></div>
      <div class="download-manager-footer"><span>ไฟล์ที่เลือกหลายรายการจะรวมเป็น ZIP อัตโนมัติ</span><button id="download-selected" class="btn btn-success" type="button">ดาวน์โหลดไฟล์ที่เลือก</button></div>
    </div>`;
    document.body.appendChild(overlay);

    let mode = 'day';
    let visibleDocs = [];
    const selectedIds = new Set();
    const close = () => overlay.remove();
    overlay.querySelector('.close-modal').onclick = close;
    overlay.onclick = (event) => { if (event.target === overlay) close(); };

    const dateRange = () => {
      if (mode === 'day') {
        const day = parseLocalDateInput(overlay.querySelector('#download-day-value').value);
        return day ? { start: day, end: day, label: localDateKey(day) } : null;
      }
      if (mode === 'week') {
        const selected = parseLocalDateInput(overlay.querySelector('#download-week-value').value);
        if (!selected) return null;
        const start = mondayOfWeek(selected);
        const end = addLocalDays(start, 6);
        overlay.querySelector('#download-week-label').textContent = `${formatThaiDocumentDate(localDateKey(start))} – ${formatThaiDocumentDate(localDateKey(end))}`;
        return { start, end, label: `${localDateKey(start)}_ถึง_${localDateKey(end)}` };
      }
      if (mode === 'month') {
        const match = overlay.querySelector('#download-month-value').value.match(/^(\d{4})-(\d{2})$/);
        if (!match) return null;
        const start = new Date(Number(match[1]), Number(match[2]) - 1, 1);
        const end = new Date(Number(match[1]), Number(match[2]), 0);
        return { start, end, label: `${match[1]}-${match[2]}` };
      }
      const start = parseLocalDateInput(overlay.querySelector('#download-start-value').value);
      const end = parseLocalDateInput(overlay.querySelector('#download-end-value').value);
      if (!start || !end || start > end) return null;
      return { start, end, label: `${localDateKey(start)}_ถึง_${localDateKey(end)}` };
    };

    const updateSelectedCount = () => {
      overlay.querySelector('#download-selected-count').textContent = `เลือกแล้ว ${selectedIds.size} ไฟล์`;
      overlay.querySelector('#download-selected').disabled = selectedIds.size === 0;
    };

    const renderList = () => {
      const range = dateRange();
      const query = String(overlay.querySelector('#download-search').value || '').trim().toLowerCase();
      if (!range) {
        visibleDocs = [];
        overlay.querySelector('#download-list').innerHTML = '<div class="download-empty-state">กรุณาตรวจสอบช่วงวันที่ให้ถูกต้อง</div>';
        overlay.querySelector('#download-result-count').textContent = '0 เอกสาร';
        selectedIds.clear();
        updateSelectedCount();
        return;
      }
      const startKey = localDateKey(range.start);
      const endKey = localDateKey(range.end);
      visibleDocs = unique.filter((doc) => {
        const key = localDateKey(doc.createdAt);
        if (!key || key < startKey || key > endKey) return false;
        return !query || `${doc.recvNo} ${doc.subject} ${doc.fromSender}`.toLowerCase().includes(query);
      });
      const visibleIdSet = new Set(visibleDocs.map((doc) => doc.docId));
      [...selectedIds].forEach((id) => { if (!visibleIdSet.has(id)) selectedIds.delete(id); });
      overlay.querySelector('#download-result-count').textContent = `${visibleDocs.length} เอกสาร`;
      if (!visibleDocs.length) {
        overlay.querySelector('#download-list').innerHTML = '<div class="download-empty-state"><b>ไม่พบเอกสารในช่วงเวลานี้</b><span>ลองเปลี่ยนวันที่หรือค้นหาด้วยคำอื่น</span></div>';
        updateSelectedCount();
        return;
      }
      const groups = new Map();
      visibleDocs.forEach((doc) => {
        const key = localDateKey(doc.createdAt) || 'unknown';
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(doc);
      });
      overlay.querySelector('#download-list').innerHTML = [...groups.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([dateKey, groupDocs]) => {
        const groupIds = groupDocs.map((doc) => doc.docId);
        const allSelected = groupIds.every((id) => selectedIds.has(id));
        return `<section class="download-date-group" data-date-key="${escapeHtml(dateKey)}">
          <header><div><b>${escapeHtml(formatThaiDocumentDate(dateKey))}</b><span>${groupDocs.length} เอกสาร</span></div><button class="download-select-day" data-date-key="${escapeHtml(dateKey)}" type="button">${allSelected ? 'ยกเลิกวันนี้' : 'เลือกทั้งหมดวันนี้'}</button></header>
          <div class="download-day-documents">${groupDocs.map((doc) => `<label class="download-document-row ${selectedIds.has(doc.docId) ? 'is-selected' : ''}"><input type="checkbox" class="download-check" value="${escapeHtml(doc.docId)}" ${selectedIds.has(doc.docId) ? 'checked' : ''}><span class="download-check-visual"></span><span class="download-document-info"><b>${escapeHtml(doc.recvNo)} — ${escapeHtml(doc.subject)}</b><small>${escapeHtml(doc.fromSender)} • ${escapeHtml(doc.status)}</small></span><span class="download-pdf-badge">PDF</span></label>`).join('')}</div>
        </section>`;
      }).join('');
      overlay.querySelectorAll('.download-check').forEach((input) => {
        input.onchange = () => {
          if (input.checked) selectedIds.add(input.value); else selectedIds.delete(input.value);
          renderList();
        };
      });
      overlay.querySelectorAll('.download-select-day').forEach((button) => {
        button.onclick = () => {
          const dayDocs = visibleDocs.filter((doc) => localDateKey(doc.createdAt) === button.dataset.dateKey);
          const shouldSelect = !dayDocs.every((doc) => selectedIds.has(doc.docId));
          dayDocs.forEach((doc) => shouldSelect ? selectedIds.add(doc.docId) : selectedIds.delete(doc.docId));
          renderList();
        };
      });
      updateSelectedCount();
    };

    overlay.querySelectorAll('[data-download-mode]').forEach((button) => {
      button.onclick = () => {
        mode = button.dataset.downloadMode;
        overlay.querySelectorAll('[data-download-mode]').forEach((item) => item.classList.toggle('active', item === button));
        ['day', 'week', 'month', 'custom'].forEach((name) => overlay.querySelector(`#download-${name}-filter`).classList.toggle('hide', name !== mode));
        selectedIds.clear();
        renderList();
      };
    });
    ['#download-day-value', '#download-week-value', '#download-month-value', '#download-start-value', '#download-end-value'].forEach((selector) => {
      overlay.querySelector(selector).onchange = () => { selectedIds.clear(); renderList(); };
    });
    overlay.querySelector('#download-search').oninput = renderList;
    overlay.querySelector('#select-all-download').onclick = () => { visibleDocs.forEach((doc) => selectedIds.add(doc.docId)); renderList(); };
    overlay.querySelector('#clear-download').onclick = () => { selectedIds.clear(); renderList(); };
    overlay.querySelector('#download-selected').onclick = async () => {
      const ids = [...selectedIds];
      if (!ids.length) { Swal.fire('แจ้งเตือน', 'กรุณาเลือกเอกสารอย่างน้อย 1 ไฟล์', 'warning'); return; }
      const progress = overlay.querySelector('#download-progress');
      progress.classList.remove('hide');
      try {
        if (ids.length === 1) {
          updateDownloadProgress(overlay, 10, 'กำลังอ่าน PDF');
          const result = await gasCall('getDocumentFile', state.token, ids[0], false);
          const downloadName = buildDocumentDownloadFileName(result.document);
          downloadBase64(result.file.base64, downloadName, 'application/pdf');
          updateDownloadProgress(overlay, 100, 'ดาวน์โหลด PDF สำเร็จ');
          return;
        }
        const zip = new JSZip();
        for (let index = 0; index < ids.length; index++) {
          const result = await gasCall('getDocumentFile', state.token, ids[index], false);
          const downloadName = buildDocumentDownloadFileName(result.document);
          const safeName = uniqueFileName(zip, downloadName);
          zip.file(safeName, result.file.base64, { base64: true });
          updateDownloadProgress(overlay, Math.round(((index + 1) / ids.length) * 75), `รับไฟล์ ${index + 1}/${ids.length}`);
        }
        const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } }, (meta) => updateDownloadProgress(overlay, 75 + Math.round(meta.percent * .25), 'กำลังสร้าง ZIP'));
        const range = dateRange();
        downloadBlob(blob, `เอกสารราชการ-${sanitizeZipLabel(range?.label || todayKey)}-${ids.length}-ไฟล์.zip`);
        updateDownloadProgress(overlay, 100, 'สร้าง ZIP สำเร็จ');
      } catch (error) { showError(error); }
    };
    renderList();
  }

  function updateDownloadProgress(overlay, percent, text) {
    overlay.querySelector('#download-progress-bar').style.width = `${percent}%`;
    overlay.querySelector('#download-progress-percent').textContent = `${percent}%`;
    overlay.querySelector('#download-progress-text').textContent = text;
  }

  function buildDocumentDownloadFileName(doc) {
    const receiveNumber = String(doc?.recvNo || 'ไม่ทราบเลขรับ')
      .trim()
      .replace(/[\\/]+/g, '-')
      .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_')
      .replace(/\s+/g, ' ')
      .slice(0, 40) || 'ไม่ทราบเลขรับ';
    const subject = String(doc?.subject || 'ไม่มีชื่อเรื่อง')
      .trim()
      .replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/[. ]+$/g, '')
      .slice(0, 120) || 'ไม่มีชื่อเรื่อง';
    return `${receiveNumber} (${subject}).pdf`;
  }

  function uniqueFileName(zip, name) {
    const safe = String(name || 'document.pdf').replace(/[\\/:*?"<>|]/g, '_');
    if (!zip.file(safe)) return safe;
    const dot = safe.lastIndexOf('.');
    const base = dot > 0 ? safe.slice(0, dot) : safe;
    const ext = dot > 0 ? safe.slice(dot) : '';
    let index = 2;
    while (zip.file(`${base}-${index}${ext}`)) index++;
    return `${base}-${index}${ext}`;
  }

  function base64ToUint8Array(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  function downloadBase64(base64, name, mimeType) {
    const bytes = base64ToUint8Array(base64);
    downloadBlob(new Blob([bytes], { type: mimeType || 'application/octet-stream' }), name);
  }

  function previewOrDownloadFile(file, previewWindow) {
    const mimeType = String(file?.mimeType || '').toLowerCase();
    if (mimeType === 'application/pdf' || /\.pdf$/i.test(file?.name || '')) {
      const bytes = base64ToUint8Array(file.base64);
      const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
      if (previewWindow && !previewWindow.closed) {
        previewWindow.location.replace(url);
      } else {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 120000);
      return;
    }
    if (previewWindow && !previewWindow.closed) previewWindow.close();
    downloadBase64(file.base64, file.name, file.mimeType);
  }

  function downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name || 'download';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }


  // ==================== โมดูลวาระการประชุม 3.4.1 ====================

  const MEETING_AGENDA_LABELS = {
    '1': 'ระเบียบวาระที่ 1 เรื่องที่ประธานแจ้งให้ทราบ',
    '2': 'ระเบียบวาระที่ 2 รับรองรายงานการประชุมครั้งก่อน',
    '3': 'ระเบียบวาระที่ 3 เรื่องสืบเนื่องจากการประชุมครั้งก่อน',
    '4': 'ระเบียบวาระที่ 4 เรื่องเสนอที่ประชุมให้รับทราบ',
    '5': 'ระเบียบวาระที่ 5 เรื่องเสนอพิจารณา',
  };

  function meetingStatusClass(status) {
    const value = String(status || '');
    if (value.includes('ครบ')) return 'meeting-status-complete';
    if (value.includes('ส่งกลับ')) return 'meeting-status-returned';
    if (value.includes('รอ')) return 'meeting-status-waiting';
    if (value.includes('ส่งให้')) return 'meeting-status-sent';
    return 'meeting-status-draft';
  }

  function meetingRoleCanEdit() {
    return !!state.currentMeetingDetails?.permissions?.canEdit;
  }

  async function openMeetingModule() {
    state.activeModule = 'meetings';
    state.meetingTab = guideRoleKey() === 'ครู' ? 'inbox' : 'action';
    loading('กำลังเปิดระบบวาระการประชุม...');
    try {
      await loadMeetingDashboard();
      Swal.close();
    } catch (error) { showError(error); }
  }

  async function loadMeetingDashboard() {
    const result = await gasCall('getMeetingDashboard', state.token);
    state.meetingSetupRequired = !!result.setupRequired;
    state.meetingActionMeetings = result.actionMeetings || [];
    state.meetingInboxMeetings = result.inboxMeetings || [];
    state.meetingAllMeetings = result.allMeetings || [];
    state.user = result.user || state.user;
    renderMeetingDashboard();
  }

  function currentMeetings() {
    if (state.meetingTab === 'action') return state.meetingActionMeetings;
    if (state.meetingTab === 'inbox') return state.meetingInboxMeetings;
    return state.meetingAllMeetings;
  }

  function renderMeetingDashboard() {
    const isTeacher = guideRoleKey() === 'ครู';
    root.innerHTML = `
      <div class="app-shell meeting-app-shell">
        <header class="topbar meeting-topbar">
          <div class="max-w-7xl mx-auto px-4 py-3 flex justify-between gap-4 items-center">
            <div class="brand-mark">
              <img class="brand-logo" src="${SCHOOL_LOGO_URL}" alt="โลโก้โรงเรียน">
              <div class="brand-copy"><div class="brand-title-main text-lg">ระบบวาระการประชุม</div><div class="brand-title-sub">โรงเรียนวัดแม่กะ</div></div>
            </div>
            <div class="flex items-center gap-3">
              <div class="text-right hidden sm:block"><div class="font-semibold">${escapeHtml(state.user.name)}</div><div class="text-xs text-amber-100">${escapeHtml(state.user.role)}</div></div>
              <button id="meeting-web-push-btn" class="web-push-header-btn" type="button" aria-label="การแจ้งเตือน" title="เปิดหรือทดสอบการแจ้งเตือน">🔔</button>
              <button id="meeting-settings-btn" class="settings-gear-btn" type="button" aria-label="การตั้งค่า">⚙</button>
              <button id="meeting-logout-btn" class="btn bg-red-950/40 text-white">ออกจากระบบ</button>
            </div>
          </div>
        </header>
        <main class="max-w-7xl mx-auto px-4 py-6">
          <div class="meeting-module-banner">
            <div><b>📋 เอกสารวาระการประชุม</b><span>ข้อมูลส่วนนี้แยกจากหนังสือรับอย่างสมบูรณ์</span></div>
            <button id="back-to-documents-btn" class="btn btn-muted">← กลับเอกสารรับ</button>
          </div>
          ${state.meetingSetupRequired ? meetingSetupRequiredMarkup() : `
            <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div class="flex flex-wrap gap-2">
                ${isClericalUser() ? '<button id="create-meeting-btn" class="btn btn-success">＋ สร้างวาระการประชุม</button>' : ''}
                <button id="refresh-meeting-btn" class="btn btn-muted">↻ รีเฟรช</button>
              </div>
              <input id="meeting-search-input" class="input w-72 max-w-full" placeholder="ค้นหาชื่อ ครั้งที่ หรือสถานะ">
            </div>
            <div class="meeting-dashboard-summary">
              <div><b>${state.meetingActionMeetings.length}</b><span>รอฉันดำเนินการ</span></div>
              <div><b>${state.meetingAllMeetings.length || state.meetingInboxMeetings.length}</b><span>${isTeacher ? 'วาระที่ได้รับ' : 'วาระทั้งหมด'}</span></div>
              <div><b>${[...state.meetingAllMeetings, ...state.meetingInboxMeetings].filter((m) => m.status === 'ดำเนินการครบแล้ว').length}</b><span>ดำเนินการครบ</span></div>
            </div>
            <div class="dashboard-tabs flex gap-2 overflow-auto pb-2">
              ${!isTeacher ? `<button class="tab-button ${state.meetingTab === 'action' ? 'active' : ''}" data-meeting-tab="action">รอฉันตรวจ (${state.meetingActionMeetings.length})</button>` : ''}
              <button class="tab-button ${state.meetingTab === 'inbox' ? 'active' : ''}" data-meeting-tab="inbox">วาระที่ส่งถึงฉัน (${state.meetingInboxMeetings.length})</button>
              ${!isTeacher ? `<button class="tab-button ${state.meetingTab === 'all' ? 'active' : ''}" data-meeting-tab="all">วาระทั้งหมด (${state.meetingAllMeetings.length})</button>` : ''}
            </div>
            <div class="card table-wrap meeting-table-wrap"><table class="data-table"><thead><tr><th>ครั้งที่ / วันที่</th><th>ชื่อการประชุม</th><th>สถานะ</th><th>การดำเนินการ</th></tr></thead><tbody id="meeting-tbody"></tbody></table></div>
          `}
        </main>
      </div>`;

    document.getElementById('back-to-documents-btn').onclick = async () => {
      state.activeModule = 'documents';
      loading('กำลังกลับระบบเอกสารรับ...');
      try { await loadDashboard(); Swal.close(); } catch (error) { showError(error); }
    };
    document.getElementById('meeting-settings-btn').onclick = openSettingsPanel;
    document.getElementById('meeting-web-push-btn').onclick = openWebPushPanel;
    document.getElementById('meeting-logout-btn').onclick = async () => {
      try { await gasCall('logout', state.token); } catch (_) {}
      clearSession();
    };
    if (state.meetingSetupRequired) return;
    document.getElementById('refresh-meeting-btn').onclick = async () => {
      loading('กำลังรีเฟรชวาระการประชุม...');
      try { await loadMeetingDashboard(); Swal.close(); } catch (error) { showError(error); }
    };
    document.getElementById('create-meeting-btn')?.addEventListener('click', openCreateMeetingModal);
    document.querySelectorAll('[data-meeting-tab]').forEach((button) => {
      button.onclick = () => { state.meetingTab = button.dataset.meetingTab; renderMeetingDashboard(); };
    });
    document.getElementById('meeting-search-input').addEventListener('input', renderMeetingRows);
    renderMeetingRows();
  }

  function meetingSetupRequiredMarkup() {
    return `<div class="card meeting-setup-card">
      <div class="meeting-setup-icon">🧰</div>
      <h2>ต้องติดตั้งโครงสร้างวาระการประชุมหนึ่งครั้ง</h2>
      <p>ระบบยังไม่พบชีตเฉพาะวาระการประชุม ข้อมูลหนังสือรับเดิมยังอยู่ครบและไม่ได้รับผลกระทบ</p>
      <div class="meeting-setup-steps"><b>ให้บัญชีธุรการดำเนินการ:</b><ol><li>เปิด Google Sheet ของระบบ</li><li>เลือกเมนู “ระบบสารบรรณ”</li><li>กด “5) ติดตั้ง/ซ่อมโมดูลวาระการประชุม”</li><li>กลับมารีเฟรชหน้านี้</li></ol></div>
    </div>`;
  }

  function renderMeetingRows() {
    const tbody = document.getElementById('meeting-tbody');
    if (!tbody) return;
    const query = String(document.getElementById('meeting-search-input')?.value || '').trim().toLowerCase();
    const meetings = currentMeetings().filter((meeting) => `${meeting.meetingNo} ${meeting.meetingTitle} ${meeting.meetingDate} ${meeting.status}`.toLowerCase().includes(query));
    if (!meetings.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center text-slate-500 py-8">ไม่มีวาระการประชุมในรายการนี้</td></tr>';
      return;
    }
    tbody.innerHTML = meetings.map((meeting) => {
      const recipientSummary = meeting.recipientCount ? `<div class="meeting-recipient-summary">ดำเนินการ ${meeting.completedCount}/${meeting.recipientCount}</div>` : '';
      return `<tr>
        <td><div class="font-bold">${escapeHtml(meeting.meetingNo || 'ไม่ระบุครั้ง')}</div><div class="text-xs text-slate-500">${escapeHtml(meeting.meetingDate || 'ยังไม่กำหนดวันที่')} ${escapeHtml(meeting.meetingTime || '')}</div></td>
        <td><div class="font-semibold">${escapeHtml(meeting.meetingTitle)}</div><div class="text-xs text-slate-400 mt-1">${escapeHtml(meeting.location || '')}</div></td>
        <td><span class="meeting-status ${meetingStatusClass(meeting.status)}">${escapeHtml(meeting.status)}</span>${recipientSummary}</td>
        <td><button class="btn btn-primary text-xs open-meeting-btn" data-meeting-id="${escapeHtml(meeting.meetingId)}">${state.meetingTab === 'action' ? 'เปิดตรวจและแก้ไข' : 'เปิดดูวาระ'}</button></td>
      </tr>`;
    }).join('');
    tbody.querySelectorAll('.open-meeting-btn').forEach((button) => button.onclick = () => openMeetingEditor(button.dataset.meetingId));
  }

  function openCreateMeetingModal() {
    if (!isClericalUser()) return;
    const overlay = document.createElement('div');
    overlay.className = 'modal-backdrop';
    overlay.innerHTML = `<div class="modal-panel meeting-create-modal">
      <div class="flex justify-between items-start gap-3 mb-4"><div><h2 class="text-xl font-bold">สร้างวาระการประชุมใหม่</h2><p class="text-sm text-slate-500">ข้อมูลวาระจะแยกจากเอกสารรับ และสามารถแก้ค่าเริ่มต้นก่อนบันทึกได้</p></div><button class="text-2xl close-modal">×</button></div>
      <form id="create-meeting-form" class="meeting-form-grid">
        <div class="meeting-field span-2"><label>ชื่อการประชุม *</label><input name="meetingTitle" class="input" required value="${escapeHtml(MEETING_DEFAULTS.meetingTitle)}"></div>
        <div class="meeting-field"><label>ครั้งที่</label><input name="meetingNo" class="input" placeholder="เช่น 7/2569"></div>
        <div class="meeting-field"><label>วันที่ประชุม</label><input name="meetingDate" type="date" class="input"></div>
        <div class="meeting-field"><label>เวลา</label><input name="meetingTime" type="time" class="input"></div>
        <div class="meeting-field span-2"><label>สถานที่</label><input name="location" class="input" value="${escapeHtml(MEETING_DEFAULTS.location)}"></div>
        <div class="meeting-field"><label>ประธานการประชุม</label><input name="chairman" class="input" value="${escapeHtml(MEETING_DEFAULTS.chairman)}"></div>
        <div class="meeting-field"><label>ผู้บันทึก</label><input name="secretary" class="input" value="${escapeHtml(MEETING_DEFAULTS.secretary)}"></div>
        <div class="span-2 meeting-create-note">เมื่อบันทึกแล้ว ระบบจะเปิดหน้าจดวาระ 5 กล่องให้ทันที</div>
        <div class="span-2 flex justify-end gap-2"><button type="button" class="btn btn-muted close-modal">ยกเลิก</button><button type="submit" class="btn btn-success">บันทึกและเริ่มจดวาระ</button></div>
      </form>
    </div>`;
    document.body.appendChild(overlay);
    overlay.querySelectorAll('.close-modal').forEach((button) => button.onclick = () => overlay.remove());
    const createMeetingForm = overlay.querySelector('#create-meeting-form');
    Object.entries(MEETING_DEFAULTS).forEach(([field, value]) => {
      const input = createMeetingForm.elements[field];
      if (input && !String(input.value || '').trim()) input.value = value;
    });
    createMeetingForm.onsubmit = async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      loading('กำลังสร้างวาระการประชุม...');
      try {
        const result = await gasCall('createMeeting', state.token, {
          meetingTitle: String(form.elements.meetingTitle.value || '').trim() || MEETING_DEFAULTS.meetingTitle,
          meetingNo: form.elements.meetingNo.value,
          meetingDate: form.elements.meetingDate.value,
          meetingTime: form.elements.meetingTime.value,
          location: String(form.elements.location.value || '').trim() || MEETING_DEFAULTS.location,
          chairman: String(form.elements.chairman.value || '').trim() || MEETING_DEFAULTS.chairman,
          secretary: String(form.elements.secretary.value || '').trim() || MEETING_DEFAULTS.secretary,
        });
        overlay.remove();
        Swal.close();
        await openMeetingEditor(result.meetingId);
      } catch (error) { showError(error); }
    };
  }

  async function openMeetingEditor(meetingId) {
    loading('กำลังเปิดวาระการประชุม...');
    try {
      const requests = [gasCall('getMeetingDetails', state.token, meetingId)];
      if (isClericalUser() && !state.meetingUsers.length) requests.push(gasCall('listActiveUsers', state.token));
      const results = await Promise.all(requests);
      state.currentMeetingDetails = results[0];
      if (results[1]) state.meetingUsers = results[1];
      state.meetingEditorTab = 'notes';
      renderMeetingEditor();
      Swal.close();
    } catch (error) { showError(error); }
  }

  function meetingEditorValues() {
    return state.currentMeetingDetails?.meeting || {};
  }

  function updateMeetingMeta(field, value) {
    if (!state.currentMeetingDetails?.meeting) return;
    state.currentMeetingDetails.meeting[field] = value;
  }

  function renderMeetingEditor() {
    const details = state.currentMeetingDetails;
    if (!details) return;
    const meeting = details.meeting;
    const canEdit = !!details.permissions.canEdit;
    root.innerHTML = `<div class="app-shell meeting-app-shell">
      <header class="topbar meeting-topbar"><div class="max-w-7xl mx-auto px-4 py-3 flex justify-between gap-4 items-center">
        <div class="brand-mark"><img class="brand-logo" src="${SCHOOL_LOGO_URL}" alt="โลโก้โรงเรียน"><div class="brand-copy"><div class="brand-title-main text-lg">${escapeHtml(meeting.meetingTitle)}</div><div class="brand-title-sub">${escapeHtml(meeting.meetingNo || 'วาระการประชุม')} · ${escapeHtml(meeting.status)}</div></div></div>
        <div class="flex gap-2"><button id="meeting-editor-back" class="btn bg-white/15 text-white">← รายการวาระ</button><button id="meeting-editor-logout" class="btn bg-red-950/40 text-white">ออกจากระบบ</button></div>
      </div></header>
      <main class="max-w-7xl mx-auto px-4 py-6">
        <div class="meeting-editor-head">
          <div><span class="meeting-status ${meetingStatusClass(meeting.status)}">${escapeHtml(meeting.status)}</span><small>เวอร์ชันข้อมูล ${meeting.version}</small></div>
          <div class="meeting-edit-lock ${canEdit ? 'can-edit' : 'read-only'}">${canEdit ? '✏️ คุณสามารถแก้ไขวาระนี้ได้' : '🔒 เปิดดูอย่างเดียว — งานอยู่กับ ' + escapeHtml(meeting.currentRole || 'บทบาทอื่น')}</div>
        </div>
        <div class="meeting-editor-tabs">
          <button class="meeting-editor-tab ${state.meetingEditorTab === 'notes' ? 'active' : ''}" data-editor-tab="notes">1. จดวาระการประชุม</button>
          <button class="meeting-editor-tab ${state.meetingEditorTab === 'review' ? 'active' : ''}" data-editor-tab="review">2. ตรวจและส่งต่อ</button>
          <button class="meeting-editor-tab ${state.meetingEditorTab === 'publish' ? 'active' : ''}" data-editor-tab="publish">3. เอกสารฉบับสมบูรณ์</button>
        </div>
        <section id="meeting-editor-content">${meetingEditorSectionMarkup()}</section>
      </main>
    </div>`;
    document.getElementById('meeting-editor-back').onclick = async () => {
      loading('กำลังกลับหน้ารายการ...');
      try { state.currentMeetingDetails = null; await loadMeetingDashboard(); Swal.close(); } catch (error) { showError(error); }
    };
    document.getElementById('meeting-editor-logout').onclick = async () => {
      try { await gasCall('logout', state.token); } catch (_) {}
      clearSession();
    };
    document.querySelectorAll('[data-editor-tab]').forEach((button) => {
      button.onclick = () => { state.meetingEditorTab = button.dataset.editorTab; renderMeetingEditor(); };
    });
    bindMeetingEditorSection();
  }

  function meetingEditorSectionMarkup() {
    if (state.meetingEditorTab === 'review') return meetingReviewMarkup();
    if (state.meetingEditorTab === 'publish') return meetingPublishMarkup();
    return meetingNotesMarkup();
  }

  function agendaItemText_(item, label) {
    if (!item) return '';
    const title = String(item.title || '').trim();
    const summary = String(item.summary || '').trim();
    if (!title || title === label || title === 'ยังไม่ได้ตั้งชื่อเรื่อง') return summary;
    return [title, summary].filter(Boolean).join('\n');
  }

  function normalizeMeetingAgendaTextBoxes() {
    const sourceItems = Array.isArray(state.currentMeetingDetails?.items) ? state.currentMeetingDetails.items : [];
    const normalized = Object.entries(MEETING_AGENDA_LABELS).map(([code, label], index) => {
      const group = sourceItems.filter((item) => String(item.agendaCode) === code);
      const combinedText = group.map((item) => agendaItemText_(item, label)).filter(Boolean).join('\n\n');
      const first = group[0] || {};
      return {
        itemId: first.itemId || '',
        agendaCode: code,
        sortOrder: index + 1,
        title: label,
        summary: combinedText,
        createdBy: first.createdBy || '',
        createdAt: first.createdAt || '',
        version: first.version || 1,
      };
    });
    state.currentMeetingDetails.items = normalized;
    return normalized;
  }

  function meetingNotesMarkup() {
    const meeting = meetingEditorValues();
    const canEdit = meetingRoleCanEdit();
    const disabled = canEdit ? '' : 'disabled';
    const agendaItems = normalizeMeetingAgendaTextBoxes();
    const agendaBoxes = Object.entries(MEETING_AGENDA_LABELS).map(([code, label], index) => {
      const item = agendaItems[index];
      return `<section class="meeting-note-bucket agenda-${code}">
        <div class="meeting-note-bucket-head"><div><span class="meeting-agenda-code">${code}</span><h2>${escapeHtml(label)}</h2></div></div>
        <article class="meeting-agenda-text-card" data-item-index="${index}">
          <label class="meeting-agenda-text-label" for="meeting-agenda-text-${code}">${escapeHtml(label)}</label>
          <textarea id="meeting-agenda-text-${code}" data-item-field="summary" class="input meeting-agenda-textarea" placeholder="กรอกเนื้อหาวาระนี้..." ${disabled}>${escapeHtml(item.summary)}</textarea>
        </article>
      </section>`;
    }).join('');
    return `<div class="meeting-notes-layout">
      <div class="card meeting-meta-card">
        <div class="meeting-section-title"><div><h2>ข้อมูลการประชุม</h2><p>ค่าเริ่มต้นสามารถแก้ไขได้ และระบบบันทึกประวัติทุกครั้ง</p></div><span class="meeting-manual-badge">บันทึกโดยผู้ใช้งาน</span></div>
        <div class="meeting-form-grid">
          <div class="meeting-field span-2"><label>ชื่อการประชุม</label><input data-meeting-meta="meetingTitle" class="input" value="${escapeHtml(meeting.meetingTitle)}" ${disabled}></div>
          <div class="meeting-field"><label>ครั้งที่</label><input data-meeting-meta="meetingNo" class="input" value="${escapeHtml(meeting.meetingNo)}" ${disabled}></div>
          <div class="meeting-field"><label>วันที่</label><input data-meeting-meta="meetingDate" type="date" class="input" value="${escapeHtml(String(meeting.meetingDate || '').slice(0,10))}" ${disabled}></div>
          <div class="meeting-field"><label>เวลา</label><input data-meeting-meta="meetingTime" type="time" class="input" value="${escapeHtml(meeting.meetingTime)}" ${disabled}></div>
          <div class="meeting-field span-2"><label>สถานที่</label><input data-meeting-meta="location" class="input" value="${escapeHtml(meeting.location)}" ${disabled}></div>
          <div class="meeting-field"><label>ประธานการประชุม</label><input data-meeting-meta="chairman" class="input" value="${escapeHtml(meeting.chairman)}" ${disabled}></div>
          <div class="meeting-field"><label>ผู้บันทึก</label><input data-meeting-meta="secretary" class="input" value="${escapeHtml(meeting.secretary)}" ${disabled}></div>
        </div>
      </div>
      <div class="meeting-note-buckets">${agendaBoxes}</div>
      ${canEdit ? `<div class="meeting-save-bar"><button id="save-meeting-agenda" class="btn btn-muted">💾 บันทึกข้อมูลทั้งหมด</button><button id="meeting-go-review" class="btn btn-primary">ต่อไป: ตรวจและส่งต่อ →</button></div>` : '<div class="meeting-save-bar"><button id="meeting-go-review" class="btn btn-primary">ดูหน้าตรวจและส่งต่อ →</button></div>'}
    </div>`;
  }

  function meetingReviewMarkup() {
    const meeting = meetingEditorValues();
    const items = normalizeMeetingAgendaTextBoxes();
    const grouped = Object.entries(MEETING_AGENDA_LABELS).map(([code, label], index) => {
      const text = String(items[index]?.summary || '').trim();
      return `<section class="meeting-preview-agenda"><h2>${escapeHtml(label)}</h2>${text ? `<article><p>${escapeHtml(text).replace(/\n/g, '<br>')}</p></article>` : '<div class="meeting-preview-empty">ยังไม่มีข้อมูล</div>'}</section>`;
    }).join('');
    return `<div class="meeting-review-layout">
      <div class="meeting-process-toolbar card"><div><h2>ตรวจข้อความก่อนส่งต่อ</h2><p>ตรวจข้อความภายในวาระทั้ง 5 ก่อนดำเนินการตามบทบาท</p></div><div class="flex flex-wrap gap-2"><button id="meeting-back-notes" class="btn btn-muted">← กลับไปแก้ไข</button><button id="show-meeting-history" class="btn btn-muted">ประวัติการแก้ไข</button></div></div>
      <div class="card meeting-preview-header"><h1>${escapeHtml(meeting.meetingTitle)}</h1><p>${meeting.meetingNo ? 'ครั้งที่ ' + escapeHtml(meeting.meetingNo) : ''}${meeting.meetingDate ? ' · วันที่ ' + escapeHtml(String(meeting.meetingDate).slice(0,10)) : ''}${meeting.meetingTime ? ' เวลา ' + escapeHtml(meeting.meetingTime) + ' น.' : ''}</p><p>${meeting.location ? 'สถานที่ ' + escapeHtml(meeting.location) : ''}</p><p>${meeting.chairman ? 'ประธานการประชุม ' + escapeHtml(meeting.chairman) : ''}${meeting.secretary ? ' · ผู้บันทึก ' + escapeHtml(meeting.secretary) : ''}</p></div>
      <div class="meeting-preview-list">${grouped}</div>
      ${meetingWorkflowActionsMarkup()}
    </div>`;
  }

  function meetingWorkflowActionsMarkup() {
    const details = state.currentMeetingDetails;
    const meeting = details.meeting;
    if (!details.permissions.canEdit) return '';
    let role = guideRoleKey();
    if (role === 'ผู้ดูแลระบบสารบรรณ') {
      role = details.permissions?.currentRole || meeting.currentRole || 'ธุรการ';
    }
    if (role === 'ธุรการ') {
      const returned = ['ส่งคืนธุรการ'].includes(meeting.status);
      return `<div class="card meeting-workflow-card"><div><b>ขั้นตอนถัดไปของธุรการ</b><p>${returned ? 'ตรวจข้อความพร้อมคัดลอก แล้วเปลี่ยนเป็นสถานะรออัปโหลด PDF' : 'ตรวจร่างครบแล้วจึงส่งให้รองผู้อำนวยการ'}</p></div><div>${returned ? '<button class="btn btn-primary meeting-transition-btn" data-transition="CLERK_WAITING_PDF">พร้อมจัดทำ/อัปโหลด PDF</button>' : '<button class="btn btn-primary meeting-transition-btn" data-transition="CLERK_TO_DEPUTY">ส่งให้รองผู้อำนวยการตรวจและแก้ไข</button>'}</div></div>`;
    }
    if (role === 'รองผู้อำนวยการ') {
      const returnedByDirector = meeting.status === 'ผู้อำนวยการส่งกลับ';
      return `<div class="card meeting-workflow-card"><div><b>การตรวจของรองผู้อำนวยการ</b><p>${returnedByDirector ? 'ผู้อำนวยการส่งกลับมาแก้ไข กรุณาตรวจแล้วส่งให้ผู้อำนวยการอีกครั้ง' : 'บันทึกการแก้ไขก่อนเลือกส่งกลับหรือส่งต่อ'}</p></div><div class="flex flex-wrap gap-2">${returnedByDirector ? '' : '<button class="btn btn-warning meeting-transition-btn" data-transition="DEPUTY_TO_CLERK">ส่งกลับให้ธุรการแก้ไข</button>'}<button class="btn btn-primary meeting-transition-btn" data-transition="DEPUTY_TO_DIRECTOR">${returnedByDirector ? 'ส่งให้ผู้อำนวยการตรวจอีกครั้ง' : 'ส่งให้ผู้อำนวยการตรวจและแก้ไข'}</button></div></div>`;
    }
    if (role === 'ผู้อำนวยการ') {
      return `<div class="card meeting-workflow-card"><div><b>การตรวจของผู้อำนวยการ</b><p>ส่งกลับรองผู้อำนวยการ หรือส่งคืนธุรการเพื่อจัดทำฉบับสมบูรณ์</p></div><div class="flex flex-wrap gap-2"><button class="btn btn-warning meeting-transition-btn" data-transition="DIRECTOR_TO_DEPUTY">ส่งกลับให้รองผู้อำนวยการแก้ไข</button><button class="btn btn-primary meeting-transition-btn" data-transition="DIRECTOR_TO_CLERK">ส่งคืนธุรการ</button></div></div>`;
    }
    return '';
  }

  function formattedMeetingAgendaText() {
    const meeting = meetingEditorValues();
    const items = normalizeMeetingAgendaTextBoxes();
    const lines = [];
    lines.push(meeting.meetingTitle || 'รายงานการประชุม');
    if (meeting.meetingNo) lines.push(`ครั้งที่ ${meeting.meetingNo}`);
    if (meeting.meetingDate) lines.push(`วันที่ ${String(meeting.meetingDate).slice(0, 10)}${meeting.meetingTime ? ' เวลา ' + meeting.meetingTime + ' น.' : ''}`);
    if (meeting.location) lines.push(`ณ ${meeting.location}`);
    if (meeting.chairman) lines.push(`ประธานการประชุม ${meeting.chairman}`);
    if (meeting.secretary) lines.push(`ผู้บันทึก ${meeting.secretary}`);
    lines.push('');
    Object.entries(MEETING_AGENDA_LABELS).forEach(([code, label], index) => {
      lines.push(label);
      const text = String(items[index]?.summary || '').trim();
      if (text) lines.push(text);
      lines.push('');
    });
    return lines.join('\n').trim();
  }

  function meetingRecipientStatusMarkup() {
    const recipients = state.currentMeetingDetails.meeting.recipients || [];
    if (!recipients.length) return '<div class="meeting-no-recipients">ยังไม่ได้ส่งให้ผู้เกี่ยวข้อง</div>';
    return `<div class="meeting-recipient-list">${recipients.map((recipient) => {
      const done = !!recipient.acknowledgedAt || !!recipient.signedAt;
      return `<div class="meeting-recipient-row ${done ? 'done' : 'pending'}"><div><b>${done ? '✅' : '⏳'} ${escapeHtml(recipient.name)}</b><span>${escapeHtml(recipient.requiredAction)}</span></div><small>${escapeHtml(recipient.status || (done ? 'ดำเนินการแล้ว' : 'รอดำเนินการ'))}</small></div>`;
    }).join('')}</div>`;
  }

  function meetingPublishMarkup() {
    const details = state.currentMeetingDetails;
    const meeting = details.meeting;
    const ownRecipient = (meeting.recipients || []).find((item) => item.userId === state.user.userId);
    const canUpload = details.permissions.canUploadPdf && ['ส่งคืนธุรการ', 'รออัปโหลด PDF'].includes(meeting.status);
    const copyText = formattedMeetingAgendaText();
    return `<div class="meeting-publish-grid">
      <div class="card meeting-copy-card">
        <div class="meeting-section-title"><div><h2>ข้อความพร้อมคัดลอกไป Microsoft Word</h2><p>ระบบจัดหัวข้อวาระให้แล้ว ธุรการยังสามารถแก้รูปแบบใน Word ได้</p></div><button id="copy-meeting-text" class="btn btn-primary">📋 คัดลอกข้อความ</button></div>
        <textarea id="meeting-copy-text" class="input meeting-copy-text">${escapeHtml(copyText)}</textarea>
      </div>
      <div class="card meeting-pdf-card">
        <div class="meeting-section-title"><div><h2>PDF ฉบับสมบูรณ์และผู้รับ</h2><p>ส่วนนี้แยกจากไฟล์เอกสารรับเดิม</p></div>${meeting.hasPdf ? '<span class="meeting-pdf-ready">มี PDF แล้ว</span>' : '<span class="meeting-pdf-waiting">ยังไม่มี PDF</span>'}</div>
        ${meeting.hasPdf ? '<button id="view-meeting-pdf" class="btn btn-muted">เปิดดู PDF ฉบับสมบูรณ์</button>' : ''}
        ${canUpload ? meetingUploadFormMarkup() : ''}
        ${ownRecipient && meeting.hasPdf ? meetingRecipientActionMarkup(ownRecipient) : ''}
        <div class="meeting-recipient-status-block"><h3>สถานะผู้เกี่ยวข้อง</h3>${meetingRecipientStatusMarkup()}</div>
      </div>
    </div>`;
  }

  function meetingUploadFormMarkup() {
    const users = state.meetingUsers || [];
    return `<form id="meeting-pdf-upload-form" class="meeting-upload-form">
      <div class="meeting-field"><label>เลือก PDF ฉบับสมบูรณ์</label><input id="meeting-final-pdf" class="input" type="file" accept="application/pdf,.pdf" required></div>
      <div class="meeting-field"><label>การดำเนินการของผู้รับ</label><select id="meeting-required-action" class="input"><option value="รับทราบ">เปิดอ่านและรับทราบ</option><option value="ลงลายเซ็น">ลงลายเซ็นรับรอง</option></select></div>
      <div class="meeting-recipient-mode"><label><input type="radio" name="meetingRecipientMode" value="ทุกคน" checked> ส่งให้ทุกคนอัตโนมัติ</label><label><input type="radio" name="meetingRecipientMode" value="บางคน"> เลือกเฉพาะบุคคล</label></div>
      <div id="meeting-user-picker" class="meeting-user-picker is-disabled">${users.map((user) => `<label><input type="checkbox" value="${escapeHtml(user.userId)}" disabled><span><b>${escapeHtml(user.name)}</b><small>${escapeHtml(user.role)}${user.department ? ' · ' + escapeHtml(user.department) : ''}</small></span></label>`).join('')}</div>
      <button class="btn btn-success w-full" type="submit">อัปโหลด PDF และส่งให้ผู้เกี่ยวข้อง</button>
    </form>`;
  }

  function meetingRecipientActionMarkup(recipient) {
    const done = !!recipient.acknowledgedAt || !!recipient.signedAt;
    if (done) return '<div class="meeting-own-action done">✅ คุณดำเนินการวาระฉบับนี้แล้ว</div>';
    const action = recipient.requiredAction === 'ลงลายเซ็น' ? 'ลงลายเซ็น' : 'รับทราบ';
    return `<div class="meeting-own-action"><b>งานของคุณ: ${escapeHtml(action)}</b><p>กรุณาเปิดอ่าน PDF ให้ครบก่อนยืนยัน</p><button id="complete-meeting-recipient" class="btn btn-success" data-action="${escapeHtml(action)}">${action === 'ลงลายเซ็น' ? '✍ ลงลายเซ็นรับรอง' : '✅ รับทราบ'}</button></div>`;
  }

  function bindMeetingEditorSection() {
    document.querySelectorAll('[data-meeting-meta]').forEach((input) => {
      input.addEventListener('input', () => updateMeetingMeta(input.dataset.meetingMeta, input.value));
    });
    document.querySelectorAll('[data-item-index]').forEach((card) => {
      const index = Number(card.dataset.itemIndex);
      card.querySelectorAll('[data-item-field]').forEach((input) => {
        input.addEventListener('input', () => {
          const item = state.currentMeetingDetails.items[index];
          if (!item) return;
          item[input.dataset.itemField] = input.value;
          item.title = MEETING_AGENDA_LABELS[String(item.agendaCode)] || item.title;
        });
      });
    });
    document.getElementById('save-meeting-agenda')?.addEventListener('click', () => saveMeetingAgenda());
    document.getElementById('meeting-go-review')?.addEventListener('click', async () => {
      if (meetingRoleCanEdit()) {
        const saved = await saveMeetingAgenda({ quiet: true });
        if (!saved) return;
      }
      state.meetingEditorTab = 'review';
      renderMeetingEditor();
    });
    document.getElementById('meeting-back-notes')?.addEventListener('click', () => { state.meetingEditorTab = 'notes'; renderMeetingEditor(); });
    document.getElementById('show-meeting-history')?.addEventListener('click', showMeetingHistory);
    document.querySelectorAll('.meeting-transition-btn').forEach((button) => button.onclick = () => transitionMeetingAction(button.dataset.transition));
    document.getElementById('copy-meeting-text')?.addEventListener('click', async () => {
      const text = document.getElementById('meeting-copy-text').value;
      if (await copyTextToClipboard(text, 'คัดลอกข้อความวาระการประชุมแล้ว')) {
        gasCall('recordMeetingAgendaCopy', state.token, state.currentMeetingDetails.meeting.meetingId).catch(() => {});
      }
    });
    document.getElementById('view-meeting-pdf')?.addEventListener('click', openMeetingPdf);
    const modeInputs = document.querySelectorAll('input[name="meetingRecipientMode"]');
    modeInputs.forEach((input) => input.onchange = toggleMeetingUserPicker);
    document.getElementById('meeting-pdf-upload-form')?.addEventListener('submit', uploadMeetingPdfAndDispatch);
    document.getElementById('complete-meeting-recipient')?.addEventListener('click', completeOwnMeetingAction);
  }

  function meetingSavePayload() {
    const meeting = meetingEditorValues();
    return {
      meetingId: meeting.meetingId,
      expectedVersion: meeting.version,
      meetingTitle: meeting.meetingTitle,
      meetingNo: meeting.meetingNo,
      meetingDate: String(meeting.meetingDate || '').slice(0, 10),
      meetingTime: meeting.meetingTime,
      location: meeting.location,
      chairman: meeting.chairman,
      secretary: meeting.secretary,
      items: normalizeMeetingAgendaTextBoxes().map((item, index) => {
        const agendaCode = MEETING_AGENDA_LABELS[String(item.agendaCode)] ? String(item.agendaCode) : String(index + 1);
        const summary = String(item.summary || '').trim();
        return {
          itemId: item.itemId || '',
          agendaCode,
          sortOrder: index + 1,
          title: summary ? MEETING_AGENDA_LABELS[agendaCode] : '',
          summary,
          version: item.version || 1,
        };
      }),
    };
  }

  async function saveMeetingAgenda(options = {}) {
    loading('กำลังบันทึกวาระการประชุม...');
    try {
      await gasCall('saveMeetingAgenda', state.token, meetingSavePayload());
      const refreshed = await gasCall('getMeetingDetails', state.token, meetingEditorValues().meetingId);
      state.currentMeetingDetails = refreshed;
      if (!options.quiet) Swal.fire('บันทึกสำเร็จ', 'บันทึกข้อมูลและประวัติการแก้ไขแล้ว', 'success');
      else Swal.close();
      renderMeetingEditor();
      return true;
    } catch (error) { showError(error); return false; }
  }

  async function transitionMeetingAction(action) {
    if (meetingRoleCanEdit()) {
      const save = await Swal.fire({
        icon: 'question', title: 'บันทึกและส่งต่อวาระหรือไม่',
        text: 'ระบบจะบันทึกการแก้ไขล่าสุดก่อนส่งต่อ',
        input: 'textarea', inputLabel: 'ความคิดเห็นหรือหมายเหตุ (ไม่บังคับ)',
        showCancelButton: true, confirmButtonText: 'บันทึกและส่งต่อ', cancelButtonText: 'ยกเลิก',
      });
      if (!save.isConfirmed) return;
      loading('กำลังบันทึกและส่งต่อ...');
      try {
        const saved = await gasCall('saveMeetingAgenda', state.token, meetingSavePayload());
        state.currentMeetingDetails.meeting.version = saved.version;
        await gasCall('transitionMeeting', state.token, {
          meetingId: meetingEditorValues().meetingId,
          expectedVersion: saved.version,
          action,
          comment: save.value || '',
        });
        state.currentMeetingDetails = null;
        await loadMeetingDashboard();
        Swal.fire('ส่งต่อสำเร็จ', 'ระบบบันทึกผู้ดำเนินการ วันเวลา และขั้นตอนใหม่แล้ว', 'success');
      } catch (error) { showError(error); }
    }
  }

  function meetingAuditDetailMarkup(rawDetails) {
    try {
      const details = JSON.parse(rawDetails || '{}');
      const changes = Array.isArray(details.changes) ? details.changes : [];
      const summary = [];
      if (details.fromStatus || details.toStatus) summary.push(`${details.fromStatus || '-'} → ${details.toStatus || '-'}`);
      if (Number.isFinite(Number(details.changedCount))) summary.push(`แก้ไข ${details.changedCount} จุด`);
      if (details.recipientCount) summary.push(`ผู้รับ ${details.recipientCount} คน`);
      const changeLines = changes.slice(0, 8).map((change) => {
        if (change.type === 'meeting') return `ข้อมูลการประชุม: ${change.field}`;
        if (change.type === 'item-added') return `เพิ่มเรื่อง: ${change.title || '-'}`;
        if (change.type === 'item-deleted') return `ลบเรื่อง: ${change.title || '-'}`;
        if (change.type === 'item-reordered') return `ย้ายลำดับเรื่อง ${change.itemId}`;
        if (change.type === 'item-changed') return `แก้ ${change.field}: ${change.itemId}`;
        return change.type || 'แก้ไขข้อมูล';
      });
      return `${summary.length ? `<p class="meeting-audit-summary">${escapeHtml(summary.join(' · '))}</p>` : ''}${changeLines.length ? `<ul>${changeLines.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ul>` : ''}`;
    } catch (_) { return ''; }
  }

  function showMeetingHistory() {
    const reviews = state.currentMeetingDetails.reviews || [];
    const audit = state.currentMeetingDetails.audit || [];
    const reviewHtml = reviews.length ? reviews.map((item) => `<div class="meeting-history-entry"><b>${escapeHtml(item.reviewerName)} · ${escapeHtml(item.reviewerRole)}</b><span>${escapeHtml(item.action)}</span><p>${escapeHtml(item.comment || 'ไม่มีความคิดเห็น')}</p><small>${escapeHtml(item.createdAt)}</small></div>`).join('') : '<p>ยังไม่มีความคิดเห็น</p>';
    const auditHtml = audit.length ? audit.slice(0, 50).map((item) => `<div class="meeting-audit-entry"><b>${escapeHtml(item.action)}</b><span>${escapeHtml(item.role)} · ${escapeHtml(item.username)}</span>${meetingAuditDetailMarkup(item.details)}<small>${escapeHtml(item.timestamp)}</small></div>`).join('') : '<p>ยังไม่มี Audit Log</p>';
    Swal.fire({ title: 'ประวัติการแก้ไขและส่งต่อ', html: `<div class="meeting-history-modal"><h3>ความคิดเห็นผู้ตรวจ</h3>${reviewHtml}<h3>Audit Log</h3>${auditHtml}</div>`, width: 780, confirmButtonText: 'ปิด' });
  }

  function toggleMeetingUserPicker() {
    const mode = document.querySelector('input[name="meetingRecipientMode"]:checked')?.value || 'ทุกคน';
    const picker = document.getElementById('meeting-user-picker');
    if (!picker) return;
    picker.classList.toggle('is-disabled', mode === 'ทุกคน');
    picker.querySelectorAll('input').forEach((input) => { input.disabled = mode === 'ทุกคน'; });
  }

  async function uploadMeetingPdfAndDispatch(event) {
    event.preventDefault();
    const fileInput = document.getElementById('meeting-final-pdf');
    const file = validatePdfFiles(selectedFiles(fileInput))[0];
    const recipientMode = document.querySelector('input[name="meetingRecipientMode"]:checked')?.value || 'ทุกคน';
    const userIds = [...document.querySelectorAll('#meeting-user-picker input:checked')].map((input) => input.value);
    if (recipientMode === 'บางคน' && !userIds.length) {
      Swal.fire('ยังไม่ได้เลือกผู้รับ', 'กรุณาเลือกผู้รับอย่างน้อย 1 คน', 'warning');
      return;
    }
    const confirmation = await Swal.fire({
      icon: 'warning', title: 'ยืนยันอัปโหลดและส่งวาระ',
      text: recipientMode === 'ทุกคน' ? 'PDF จะถูกส่งให้ผู้ใช้ที่เปิดใช้งานทุกบัญชี' : `PDF จะถูกส่งให้ผู้รับ ${userIds.length} คน`,
      showCancelButton: true, confirmButtonText: 'ยืนยันส่ง', cancelButtonText: 'กลับไปตรวจสอบ',
    });
    if (!confirmation.isConfirmed) return;
    loading('กำลังอัปโหลด PDF และส่งให้ผู้เกี่ยวข้อง...');
    try {
      await uploadFileForm('uploadAndDispatchMeetingPdf', 'meetingPdfFile', file, {
        sessionToken: state.token,
        meetingId: meetingEditorValues().meetingId,
        recipientMode,
        requiredAction: document.getElementById('meeting-required-action').value,
        expectedVersion: meetingEditorValues().version,
        userIds: JSON.stringify(userIds),
      });
      state.currentMeetingDetails = await gasCall('getMeetingDetails', state.token, meetingEditorValues().meetingId);
      renderMeetingEditor();
      Swal.fire('ส่งวาระสำเร็จ', 'ระบบแยกติดตามผู้รับ ลายเซ็น และการรับทราบไว้ในโมดูลวาระการประชุมแล้ว', 'success');
    } catch (error) { showError(error); }
  }

  async function openMeetingPdf() {
    const previewWindow = window.open('about:blank', '_blank');
    try {
      const result = await gasCall('getMeetingPdf', state.token, meetingEditorValues().meetingId, true);
      previewOrDownloadFile(result.file, previewWindow);
      state.currentMeetingDetails = await gasCall('getMeetingDetails', state.token, meetingEditorValues().meetingId);
      renderMeetingEditor();
    } catch (error) {
      if (previewWindow && !previewWindow.closed) previewWindow.close();
      showError(error);
    }
  }

  async function completeOwnMeetingAction(event) {
    const action = event.currentTarget.dataset.action || 'รับทราบ';
    const result = await Swal.fire({
      icon: 'question', title: `ยืนยัน${action}`, input: 'textarea',
      inputLabel: 'หมายเหตุ (ไม่บังคับ)', showCancelButton: true,
      confirmButtonText: `ยืนยัน${action}`, cancelButtonText: 'ยกเลิก',
    });
    if (!result.isConfirmed) return;
    loading(`กำลังบันทึก${action}...`);
    try {
      await gasCall('completeMeetingRecipient', state.token, meetingEditorValues().meetingId, action, result.value || '');
      state.currentMeetingDetails = await gasCall('getMeetingDetails', state.token, meetingEditorValues().meetingId);
      renderMeetingEditor();
      Swal.fire('บันทึกสำเร็จ', `${action}เรียบร้อยแล้ว`, 'success');
    } catch (error) { showError(error); }
  }

  bootstrap();
})();
