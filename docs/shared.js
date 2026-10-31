// 一页通共用代码：二维码资料格式、代码表、求助页渲染。
// 求助页（根目录 index.html）和填表工具（tool/）都加载这个文件，保证编码和解码一致。

// 二维码里的网址。协议和域名写大写，二维码可以用字母数字模式；路径 ice/ 必须和仓库名一样保持小写
const BASE_URL = "HTTPS://NOLAN11701.GITHUB.IO/ice/";

// 常见急救要点和过敏原用短代码存进二维码，求助页再展开成英文 + 中文
// 代码一旦印在贴纸上就不能改含义，只能新增
const COND = {
  HTN: ["High blood pressure", "高血压"], DM: ["Diabetes", "糖尿病"], AF: ["Atrial fibrillation", "房颤"],
  CHD: ["Heart disease", "心脏病"], PM: ["Pacemaker", "心脏起搏器"], BT: ["Takes blood thinner", "服用抗凝血药"],
  STK: ["Prior stroke", "中风史"], DEM: ["Dementia / memory loss", "失智 / 记忆力差"], PD: ["Parkinson's", "帕金森"],
  EPI: ["Seizures", "癫痫"], COPD: ["COPD / lung disease", "慢阻肺"], CKD: ["Kidney disease", "肾病"], HOH: ["Hard of hearing", "听力差"],
};
const ALG = {
  PCN: ["Penicillin", "青霉素"], SUL: ["Sulfa drugs", "磺胺类药"], ASA: ["Aspirin", "阿司匹林"], NSAID: ["Ibuprofen / NSAIDs", "布洛芬类"],
  IOD: ["Iodine contrast", "碘造影剂"], LTX: ["Latex", "乳胶"], SHF: ["Shellfish", "贝类"], NUT: ["Nuts", "坚果"],
};
const REL = {
  D: ["daughter", "女儿"], S: ["son", "儿子"], W: ["wife", "老伴"], H: ["husband", "老伴"],
  GD: ["granddaughter", "孙女"], GS: ["grandson", "孙子"], SIS: ["sister", "姐妹"], BRO: ["brother", "兄弟"], F: ["family", "家人"],
};
const LANG = { M: ["Mandarin", "普通话"], C: ["Cantonese", "粤语"] };
const LIMIT = { cond: 3, alg: 2, med: 3, fam: 2 };

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

// 求助页内容：以英文为主，附中文，给路人和急救人员看
function helpHTML(d) {
  const lang = LANG[d.lang] || LANG.M;
  const item = dict => k => dict[k] ? `${esc(dict[k][0])} <span class="zh">${esc(dict[k][1])}</span>` : esc(untoken(k));
  const famBtn = f => {
    const [ren, rzh] = REL[f.r] || REL.F;
    const nm = f.n ? ` (${esc(untoken(f.n))})` : "";
    return `<a class="call" href="${telHref(f.p)}">📞 Call ${ren}${nm}<span>打给${rzh} · ${fmtPhone(f.p)}</span></a>`;
  };
  return `
    <div class="alert"><b>This person may need help</b><span>此人可能需要帮助</span></div>
    <div class="line"><span class="k">Name:</span> ${esc(untoken(d.nameEn))} ${esc(d.nameZh)}</div>
    <div class="line"><span class="k">Speaks:</span> ${lang[0]} only <span class="zh">只会说${lang[1]}</span></div>
    ${d.cond.length ? `<div class="line">⚠ <span class="k">Conditions:</span> ${d.cond.map(item(COND)).join(", ")}</div>` : ""}
    ${d.alg.length ? `<div class="line">⚠ <span class="k">Allergies:</span> ${d.alg.map(item(ALG)).join(", ")}</div>` : ""}
    ${d.med.length ? `<div class="line">💊 <span class="k">Medications:</span> ${d.med.map(m => esc(untoken(m))).join(", ")}</div>` : ""}
    ${d.fam.map(famBtn).join("")}
    <a class="call e911" href="tel:911">📞 Call 911</a>
    <div class="foot">Communication aid only, not a medical device.<br>沟通辅助工具，不是医疗设备。</div>`;
}
