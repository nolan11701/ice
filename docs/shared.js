// 一页通共用代码：二维码资料格式、代码表、求助页渲染。
// 求助页（根目录 index.html）和填表工具（tool/）都加载这个文件，保证编码和解码一致。

// 二维码里的网址。协议和域名写大写，二维码可以用字母数字模式；路径 sos/ 必须和仓库名一样保持小写
const BASE_URL = "HTTPS://NOLAN11701.GITHUB.IO/sos/";

// 合作中心：贴纸表面只印简称，求助页显示完整名称、地址和电话。不进二维码，不影响二维码密度
const CENTER = {
  name: "Crown City Adult Day Health Care Center",
  short: "Crown City ADHC Center",
  address: "122 N El Molino Ave, Pasadena, CA 91101",
  phone: "6265838822",
};

// 常见急救要点和过敏原用短代码存进二维码，求助页再展开成 [英文, 中文, 西班牙语]
// 代码一旦印在贴纸上就不能改含义，只能新增
const COND = {
  HTN: ["High blood pressure", "高血压", "Presión arterial alta"], DM: ["Diabetes", "糖尿病", "Diabetes"],
  AF: ["Atrial fibrillation", "房颤", "Fibrilación auricular"], CHD: ["Heart disease", "心脏病", "Enfermedad del corazón"],
  PM: ["Pacemaker", "心脏起搏器", "Marcapasos"], BT: ["Takes blood thinner", "服用抗凝血药", "Toma anticoagulantes"],
  STK: ["Prior stroke", "中风史", "Derrame cerebral previo"], DEM: ["Dementia / memory loss", "失智 / 记忆力差", "Demencia / pérdida de memoria"],
  PD: ["Parkinson's", "帕金森", "Parkinson"], EPI: ["Seizures", "癫痫", "Convulsiones"],
  COPD: ["COPD / lung disease", "慢阻肺", "EPOC / enfermedad pulmonar"], CKD: ["Kidney disease", "肾病", "Enfermedad renal"],
  HOH: ["Hard of hearing", "听力差", "Problemas de audición"],
};
const ALG = {
  PCN: ["Penicillin", "青霉素", "Penicilina"], SUL: ["Sulfa drugs", "磺胺类药", "Medicamentos con sulfa"],
  ASA: ["Aspirin", "阿司匹林", "Aspirina"], NSAID: ["Ibuprofen / NSAIDs", "布洛芬类", "Ibuprofeno / AINE"],
  IOD: ["Iodine contrast", "碘造影剂", "Contraste yodado"], LTX: ["Latex", "乳胶", "Látex"],
  SHF: ["Shellfish", "贝类", "Mariscos"], NUT: ["Nuts", "坚果", "Nueces"],
};
const REL = {
  D: ["daughter", "女儿", "hija"], S: ["son", "儿子", "hijo"], W: ["wife", "老伴", "esposa"], H: ["husband", "老伴", "esposo"],
  GD: ["granddaughter", "孙女", "nieta"], GS: ["grandson", "孙子", "nieto"], SIS: ["sister", "姐妹", "hermana"],
  BRO: ["brother", "兄弟", "hermano"], F: ["family", "家人", "familiar"],
};
// 语言代码也印在贴纸里了，只能新增：M 普通话 / C 粤语 / E 英语 / S 西班牙语
const LANG = {
  M: ["Mandarin", "普通话", "mandarín"], C: ["Cantonese", "粤语", "cantonés"],
  E: ["English", "英语", "inglés"], S: ["Spanish", "西班牙语", "español"],
};
const LIMIT = { cond: 3, alg: 2, med: 3, fam: 2 };

// 求助页的第二语言跟着长者的语言：说中文的附中文，说西班牙语的附西班牙语，说英语的只有英文
// col：COND / ALG / REL / LANG 里对应的那一栏
const SECOND = {
  zh: { col: 1, alert: "此人可能需要帮助", speaks: l => `只会说${l}`, call: r => `打给${r}`,
    center: "日间保健中心", callCenter: "打给日间保健中心", foot: "沟通辅助工具，不是医疗设备。" },
  es: { col: 2, alert: "Esta persona puede necesitar ayuda", speaks: l => `Solo habla ${l}`, call: r => `Llamar a su ${r}`,
    center: "Centro de día", callCenter: "Llamar al centro de día", foot: "Herramienta de comunicación, no es un dispositivo médico." },
};
const secondFor = lang => lang === "S" ? SECOND.es : lang === "E" ? null : SECOND.zh;

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const digits = s => String(s || "").replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
const fmtPhone = d => d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : d;
const telHref = d => "tel:" + (d.length === 10 ? "+1" + d : d);
// 自由文本只保留 A-Z 0-9，空格转成 "-"，保证资料部分都能用字母数字模式
const token = s => String(s || "").toUpperCase().replace(/[^A-Z0-9 ]/g, "").trim().replace(/\s+/g, "-");
const untoken = s => s.replace(/-/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

// 格式 v1：版本*英文名*中文名(%XX)*语言*病史.病史*过敏*药.药*称呼电话名.称呼电话名
// 以后加字段只能加在末尾，旧贴纸才能继续用
function encode(d) {
  return ["1", d.nameEn, encodeURIComponent(d.nameZh), d.lang, d.cond.join("."), d.alg.join("."), d.med.join("."),
    d.fam.map(f => f.r + f.p + f.n).join(".")].join("*").replace(/\*+$/, "");
}

function decode(hash) {
  const parts = hash.replace(/^#/, "").split("*");
  if (parts[0] !== "1") throw new Error("unsupported version: " + parts[0]);
  const list = s => (s ? s.split(".").filter(Boolean) : []);
  let zh = "";
  try { zh = decodeURIComponent(parts[2] || ""); } catch { zh = ""; }
  return {
    nameEn: parts[1] || "", nameZh: zh, lang: parts[3] || "M",
    cond: list(parts[4]), alg: list(parts[5]), med: list(parts[6]),
    fam: list(parts[7]).map(s => { const m = s.match(/^([A-Z]+?)(\d{10})([A-Z-]*)$/); return m ? { r: m[1], p: m[2], n: m[3] } : null; }).filter(Boolean),
  };
}

// 中心信息和拨号按钮；读不出二维码时也显示，sec 为第二语言（可为 null）
function centerHTML(sec) {
  return `
    <div class="org-card">
      <div class="org-label">Day center${sec ? ` · ${sec.center}` : ""}</div>
      <div class="org-name">${esc(CENTER.name)}</div>
      <div class="org-addr">${esc(CENTER.address)}</div>
      <a class="call org" href="${telHref(CENTER.phone)}">📞 Call day center<span>${sec ? `${sec.callCenter} · ` : ""}${fmtPhone(CENTER.phone)}</span></a>
    </div>`;
}

// 求助页内容：以英文为主，附长者的语言，给路人和急救人员看
function helpHTML(d) {
  const sec = secondFor(d.lang);
  const lang = LANG[d.lang] || LANG.M;
  // 第二语言和英文写法一样时（例如西班牙语的 Diabetes）不重复显示
  const two = (en, other) => `${en}${sec && other && other.toLowerCase() !== en.toLowerCase() ? ` <span class="zh">${esc(other)}</span>` : ""}`;
  const item = dict => k => dict[k] ? two(esc(dict[k][0]), sec && dict[k][sec.col]) : esc(untoken(k));
  const famBtn = f => {
    const r = REL[f.r] || REL.F;
    const nm = f.n ? ` (${esc(untoken(f.n))})` : "";
    return `<a class="call" href="${telHref(f.p)}">📞 Call ${r[0]}${nm}<span>${sec ? `${sec.call(r[sec.col])} · ` : ""}${fmtPhone(f.p)}</span></a>`;
  };
  return `
    <div class="alert"><b>This person may need help</b>${sec ? `<span>${sec.alert}</span>` : ""}</div>
    <div class="line"><span class="k">Name:</span> ${esc(untoken(d.nameEn))} ${esc(d.nameZh)}</div>
    <div class="line"><span class="k">Speaks:</span> ${d.lang === "E" ? lang[0] : two(`${lang[0]} only`, sec && sec.speaks(lang[sec.col]))}</div>
    ${d.cond.length ? `<div class="line">⚠ <span class="k">Conditions:</span> ${d.cond.map(item(COND)).join(", ")}</div>` : ""}
    ${d.alg.length ? `<div class="line">⚠ <span class="k">Allergies:</span> ${d.alg.map(item(ALG)).join(", ")}</div>` : ""}
    ${d.med.length ? `<div class="line">💊 <span class="k">Medications:</span> ${d.med.map(m => esc(untoken(m))).join(", ")}</div>` : ""}
    ${d.fam.map(famBtn).join("")}
    ${centerHTML(sec)}
    <a class="call e911" href="tel:911">📞 Call 911</a>
    <div class="foot">Communication aid only, not a medical device.${sec ? `<br>${sec.foot}` : ""}</div>`;
}
