/* 配货喵：所有订单与图片只在浏览器本地处理 */
const FLOORS = ["通信2楼","康乐3楼","通信4楼","康乐4楼","通信5楼","康乐5楼","经济5楼","汇通","宝华","太平洋","其他"];
const DEFAULT_STALLS = {
  "328":"通信2楼","33":"通信2楼","DMB":"通信2楼","FAFA":"通信2楼","FD":"通信2楼","HS":"通信2楼","KK":"通信2楼","KKK":"通信2楼","KYL":"通信2楼","M":"通信2楼","MJ":"通信2楼","NTX":"通信2楼","PC":"通信2楼","PP":"通信2楼","QJ":"通信2楼","RD2":"通信2楼","SK":"通信2楼","SM":"通信2楼","V8":"通信2楼","WB":"通信2楼","XG":"通信2楼","XK":"通信2楼","XX":"通信2楼","YS":"通信2楼","YT":"通信2楼","ZS":"通信2楼","马赛米":"通信2楼","HAHA":"通信2楼",
  "GJD":"康乐3楼","硬虎":"康乐4楼","JY":"通信4楼","KOI":"通信4楼","NK":"通信4楼","ROMA":"通信4楼","LC":"康乐4楼","霸":"康乐4楼",
  "99":"通信5楼","BK":"通信5楼","CYM":"通信5楼","GAGA":"通信5楼","HMS":"通信5楼","ININ":"通信5楼","LX":"通信5楼","MINJIE":"通信5楼","ONE":"通信5楼","POP":"通信5楼","SC":"通信5楼","TIMI":"通信5楼","WT":"通信5楼","XF":"通信5楼","XINXIU":"通信5楼","YQ":"通信5楼","YQSN":"通信5楼","YUANYUAN":"通信5楼","ZZ":"通信5楼","有米":"通信5楼","XW":"通信5楼","YC":"通信5楼",
  "JD":"康乐5楼","KF":"康乐5楼","RD":"康乐5楼","GS":"经济5楼","广深":"经济5楼","GOULI":"汇通","LEO":"汇通"
};

const ALIASES = {MAI:"MAIMAI",MAIMAIMJ:"MAIMAI"};
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const safe = value => value == null ? "" : String(value).trim();
let stallMap = JSON.parse(localStorage.getItem("peihuo-stalls") || "null") || {...DEFAULT_STALLS};
let generatedCards = [];
let installPrompt = null;
const ORDER_DB_NAME = "peihuo-local-orders";
const ORDER_STORE_NAME = "uploads";

function localDateKey(date=new Date()){
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}
function openOrderDb(){
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open(ORDER_DB_NAME,1);
    request.onupgradeneeded=()=>{ const db=request.result; if(!db.objectStoreNames.contains(ORDER_STORE_NAME)){const store=db.createObjectStore(ORDER_STORE_NAME,{keyPath:"id",autoIncrement:true});store.createIndex("date","date");} };
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error||new Error("无法打开本地订单库"));
  });
}
async function getTodayUploads(){
  const db=await openOrderDb();
  return new Promise((resolve,reject)=>{const tx=db.transaction(ORDER_STORE_NAME,"readonly"),request=tx.objectStore(ORDER_STORE_NAME).index("date").getAll(localDateKey());request.onsuccess=()=>resolve(request.result.sort((a,b)=>a.createdAt-b.createdAt));request.onerror=()=>reject(request.error);tx.oncomplete=()=>db.close();});
}
async function saveTodayUpload(file,data){
  const db=await openOrderDb();
  return new Promise((resolve,reject)=>{const tx=db.transaction(ORDER_STORE_NAME,"readwrite");tx.objectStore(ORDER_STORE_NAME).add({date:localDateKey(),name:file.name,createdAt:Date.now(),data});tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>{db.close();reject(tx.error);};});
}
async function clearTodayUploads(){
  const uploads=await getTodayUploads(),db=await openOrderDb();
  return new Promise((resolve,reject)=>{const tx=db.transaction(ORDER_STORE_NAME,"readwrite"),store=tx.objectStore(ORDER_STORE_NAME);uploads.forEach(item=>store.delete(item.id));tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>{db.close();reject(tx.error);};});
}

function saveStalls(){ localStorage.setItem("peihuo-stalls", JSON.stringify(stallMap)); }
function toast(message){ const el=$("#toast"); el.textContent=message; el.classList.add("show"); clearTimeout(toast.timer); toast.timer=setTimeout(()=>el.classList.remove("show"),2600); }
function setProgress(percent,title,detail){ $("#progressCard").classList.remove("hidden"); $("#progressValue").textContent=`${percent}%`; $("#progressBar").style.width=`${percent}%`; $("#progressTitle").textContent=title; $("#progressDetail").textContent=detail; }
function switchTab(name){ $$(".view").forEach(v=>v.classList.toggle("active",v.id===`view-${name}`)); $$(".bottom-nav button").forEach(b=>b.classList.toggle("active",b.dataset.tab===name)); scrollTo({top:0,behavior:"smooth"}); if(name==="stalls") renderStalls(); if(name==="history") renderHistory(); }

$$('[data-tab]').forEach(button=>button.addEventListener("click",()=>switchTab(button.dataset.tab)));
FLOORS.forEach(f=>$("#stallFloor").insertAdjacentHTML("beforeend",`<option>${f}</option>`));
$("#stallForm").addEventListener("submit",event=>{ event.preventDefault(); const name=safe($("#stallName").value).toUpperCase(); if(!name)return; stallMap[name]=$("#stallFloor").value; saveStalls(); event.target.reset(); renderStalls(); toast(`已添加 ${name}`); });
$("#stallSearch").addEventListener("input",renderStalls);
$("#resetStalls").addEventListener("click",()=>{ if(confirm("恢复默认档口映射？")){stallMap={...DEFAULT_STALLS};saveStalls();renderStalls();} });
$("#clearHistory").addEventListener("click",()=>{ if(confirm("清空本机历史记录？")){localStorage.removeItem("peihuo-history");renderHistory();} });
window.removeStall=name=>{ delete stallMap[name]; saveStalls(); renderStalls(); };

function renderStalls(){
  const q=safe($("#stallSearch").value).toUpperCase();
  const rows=Object.entries(stallMap).filter(([s,f])=>!q||s.toUpperCase().includes(q)||f.includes(q)).sort((a,b)=>FLOORS.indexOf(a[1])-FLOORS.indexOf(b[1])||a[0].localeCompare(b[0]));
  $("#stallTotal").textContent=Object.keys(stallMap).length;
  $("#stallList").innerHTML=rows.map(([s,f])=>`<div class="stall-row"><strong>${escapeHtml(s)}</strong><span>${escapeHtml(f)}</span><button onclick="removeStall('${escapeAttr(s)}')" aria-label="删除">×</button></div>`).join("");
}
function renderHistory(){
  const history=JSON.parse(localStorage.getItem("peihuo-history")||"[]");
  $("#historyList").innerHTML=history.length?history.map(h=>`<article class="history-item"><h3>${escapeHtml(h.name)}</h3><p>${escapeHtml(h.time)}</p><p>${h.orders} 行订单 · ${h.stalls} 个档口 · ${h.cards} 张卡片</p></article>`).join(""):`<div class="empty-state"><span class="pixel-paw"></span><p>暂无历史记录</p></div>`;
}
function escapeHtml(s){ return safe(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function escapeAttr(s){ return safe(s).replace(/[\\']/g,"\\$&"); }

const input=$("#orderInput"), drop=$("#dropZone");
input.addEventListener("change",()=>input.files[0]&&processFile(input.files[0]));
["dragenter","dragover"].forEach(type=>drop.addEventListener(type,e=>{e.preventDefault();drop.style.transform="scale(1.01)";}));
["dragleave","drop"].forEach(type=>drop.addEventListener(type,e=>{e.preventDefault();drop.style.transform="";}));
drop.addEventListener("drop",e=>{const file=e.dataTransfer.files[0];if(file)processFile(file);});

async function processFile(file){
  if(!file.name.toLowerCase().endsWith(".xlsx")){toast("请选择 .xlsx 文件");return;}
  try{
    setProgress(8,"正在读取订单",file.name);
    await nextFrame();
    const data=await file.arrayBuffer();
    const previousUploads=await getTodayUploads();
    setProgress(20,"正在提取商品图片",previousUploads.length?`追加到今日已有 ${previousUploads.length} 个文件`:"解析 WPS / 飞书内嵌图片");
    const batches=[];
    for(const upload of previousUploads)batches.push(await readOrderBatch(upload.data));
    const currentBatch=await readOrderBatch(data);
    batches.push(currentBatch);
    const orders=batches.flatMap(batch=>batch.orders);
    const sheetName=currentBatch.sheetName;
    setProgress(42,"正在解析订单",`本次 ${currentBatch.orders.length} 行，今日累计 ${orders.length} 行`);
    setProgress(61,"正在安全合并","商品SKU → 多品名主编码 → 图片ID");
    const parsed=orders.map(parseOrder);
    const grouped=mergeOrders(parsed);
    const unknown=[...new Set(parsed.filter(x=>!stallMap[x.stall.toUpperCase()]).map(x=>x.stall))];
    if(unknown.length) toast(`${unknown.length} 个档口未映射，已归入“其他”`);
    setProgress(76,"正在生成卡片",`共 ${Object.keys(grouped).length} 个档口`);
    releaseGeneratedCards();
    generatedCards=await generateCards(grouped);
    setProgress(100,"生成完成",`${generatedCards.length} 张配货卡可以下载`);
    await saveTodayUpload(file,data);
    updateDashboard(orders,grouped,generatedCards,file.name,sheetName,currentBatch.orders.length,previousUploads.length+1);
    input.value="";
    setTimeout(()=>$("#progressCard").classList.add("hidden"),1300);
  }catch(error){ console.error(error); $("#progressCard").classList.add("hidden"); toast(error.message||"生成失败，请检查订单文件"); }
}
const nextFrame=()=>new Promise(resolve=>requestAnimationFrame(resolve));

async function readOrderBatch(data){
  const imageMap=await extractCellImages(data);
  return readOrders(data,imageMap);
}

function normalizePath(path){ const out=[]; path.split("/").forEach(p=>{if(p==="..")out.pop();else if(p&&p!==".")out.push(p);});return out.join("/"); }
async function extractCellImages(data){
  const map={};
  const zip=await JSZip.loadAsync(data);
  const parser=new DOMParser();

  if(zip.file("xl/cellimages.xml")&&zip.file("xl/_rels/cellimages.xml.rels")){
    const relDoc=parser.parseFromString(await zip.file("xl/_rels/cellimages.xml.rels").async("text"),"application/xml");
    const rels={}; [...relDoc.getElementsByTagNameNS("*","Relationship")].forEach(r=>rels[r.getAttribute("Id")]=r.getAttribute("Target"));
    const cellDoc=parser.parseFromString(await zip.file("xl/cellimages.xml").async("text"),"application/xml");
    for(const pic of [...cellDoc.getElementsByTagNameNS("*","pic")]){
      const prop=pic.getElementsByTagNameNS("*","cNvPr")[0], blip=pic.getElementsByTagNameNS("*","blip")[0];
      if(!prop||!blip)continue;
      const id=prop.getAttribute("name")||"";
      const rid=blip.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships","embed")||blip.getAttribute("r:embed")||"";
      const target=rels[rid]; if(!id||!target)continue;
      const path=target.startsWith("xl/")?target:normalizePath(`xl/${target}`);
      const entry=zip.file(path); if(!entry)continue;
      map[id]=URL.createObjectURL(await entry.async("blob"));
    }
  }

  const drawings=Object.keys(zip.files).filter(path=>/^xl\/drawings\/drawing\d+\.xml$/i.test(path));
  for(const drawingPath of drawings){
    const relPath=drawingPath.replace("xl/drawings/","xl/drawings/_rels/")+".rels";
    if(!zip.file(relPath))continue;
    const relDoc=parser.parseFromString(await zip.file(relPath).async("text"),"application/xml");
    const rels={}; [...relDoc.getElementsByTagNameNS("*","Relationship")].forEach(r=>rels[r.getAttribute("Id")]=r.getAttribute("Target"));
    const drawingDoc=parser.parseFromString(await zip.file(drawingPath).async("text"),"application/xml");
    const anchors=[...drawingDoc.getElementsByTagNameNS("*","twoCellAnchor"),...drawingDoc.getElementsByTagNameNS("*","oneCellAnchor")];
    for(const anchor of anchors){
      const from=anchor.getElementsByTagNameNS("*","from")[0], blip=anchor.getElementsByTagNameNS("*","blip")[0];
      const row=from?.getElementsByTagNameNS("*","row")[0]?.textContent;
      const rid=blip?.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships","embed")||blip?.getAttribute("r:embed")||"";
      const target=rels[rid]; if(row==null||!target)continue;
      const path=normalizePath(`xl/drawings/${target}`), entry=zip.file(path);
      if(entry)map[`row:${row}`]=URL.createObjectURL(await entry.async("blob"));
    }
  }
  return map;
}
function readOrders(data,imageMap){
  const wb=XLSX.read(data,{type:"array",cellFormula:true});
  const sheetName=wb.SheetNames.at(-1), ws=wb.Sheets[sheetName];
  const rows=XLSX.utils.sheet_to_json(ws,{header:1,raw:true,defval:""});
  if(!rows.length)throw new Error("订单表为空");
  const headers=rows[0].map(safe), required=["产品规格","单个产品数量","多品名","商品名称","商品图片"];
  const missing=required.filter(x=>!headers.includes(x)); if(missing.length)throw new Error(`缺少字段：${missing.join("、")}`);
  const ix={};headers.forEach((h,i)=>{if(h)ix[h]=i;});
  const orders=[];
  for(let r=1;r<rows.length;r++){
    const row=rows[r]||[];
    const cell=ws[XLSX.utils.encode_cell({r,c:ix["商品图片"]})];
    const formula=cell?.f?`=${cell.f}`:safe(row[ix["商品图片"]]);
    const id=(formula.match(/DISPIMG\("([^"]+)"/i)||[])[1]||"";
    const item={orderNo:safe(row[ix["订单号"]]),spec:safe(row[ix["产品规格"]]),qty:Math.max(1,parseInt(row[ix["单个产品数量"]])||1),multiName:safe(row[ix["多品名"]]),sku:ix["商品SKU"]==null?"":safe(row[ix["商品SKU"]]),stall:safe(row[ix["商品名称"]]),code:ix["商品编码"]==null?"":safe(row[ix["商品编码"]]),imageId:id,image:imageMap[id]||imageMap[`row:${r}`]||""};
    if(item.orderNo||item.spec||item.multiName||item.sku||item.stall||formula)orders.push(item);
  }
  if(!orders.length)throw new Error("最后一个 Sheet 没有订单行");
  return {orders,sheetName};
}

function normalizeSku(value){return safe(value).replace(/\s+/g,"").replace(/\d+个$/,"").toLowerCase();}
function productKey(name){const clean=safe(name).replace(/\*\d+$/,"");const i=clean.search(/-xhs-|_/i);if(i<=0)return"";const prefix=clean.slice(0,i).replace(/\s+/g,"").toLowerCase();return/[a-f0-9]{12,}/i.test(prefix)?prefix:"";}
function normalizeModel(value){let s=safe(value).replace(/^i?Phone\s*/i,"").replace(/\s+/g,"");s=s.replace(/(\d{1,2})(?:ProMax|Pro\s*Max|PM)$/i,"$1ProMax");s=s.replace(/(\d{1,2})(?:Pro|P)$/i,"$1Pro");return s;}
function extractModel(spec,name){
  const found=[];const re=/(?:i?Phone\s*)?(13|14|15|16|17)\s*(Pro\s*Max|promax|PM|Pro|P)?\b/gi;let m;
  while((m=re.exec(spec))) {const v=normalizeModel(m[1]+(m[2]||""));if(!found.includes(v))found.push(v);}
  const air=safe(spec).match(/Airpods?\s*\d?\s*代?/i);if(air)return air[0];
  if(found.length)return found.filter(x=>!found.some(y=>y!==x&&y.startsWith(x))).join("/");
  const clean=safe(name).replace(/\*\d+$/,"");
  const fallback=clean.match(/(?:iPhone|苹果|[-_])(13|14|15|16|17)\s*(Pro\s*Max|promax|PM|Pro|P)?/i);return fallback?normalizeModel(fallback[1]+(fallback[2]||"")):"未标注型号";
}
const TRANSLATIONS=[["เปลือกแม่เหล็กเดี่ยวไม่มีอุปกรณ์เสริม","磁吸单壳(无配件)"],["เปลือกหอยเดี่ยวไม่มีอุปกรณ์เสริม","单壳(无配件)"],["ตัวเรือน + เปลือก + ตัวยึด","壳+支架"],["เปลือกแม่เหล็ก + ตัวยึดแม่เหล็ก","磁吸壳+磁吸支架"],["ตัวยึดเปลือก + แม่เหล็ก","壳+磁吸支架"],["เปลือกแม่เหล็ก + ตัวยึด","磁吸壳+支架"],["ตัวเครื่อง + เปลือก + โซ่","壳+链条"],["เปลือกเดี่ยว + เชือกเส้นเล็ก","单壳+细绳"],["Vỏ từ tính + Giá đỡ","磁吸壳+支架"],["Vỏ đơn từ tính","磁吸单壳"],["เปลือกแม่เหล็กเดี่ยว","磁吸单壳"],["เปลือกเดี่ยว","单壳"],["เปลือกหอย","壳"],["เปลือก","壳"],["เชลล์","壳"],["ตัวเรือน","壳体"],["ตัวเครื่อง","壳体"],["ตัวยึด","支架"],["โซ่","链条"],["แม่เหล็ก","磁吸"],["สีขาว","白色"],["สีน้ำตาล","棕色"],["ดอกไม้","花朵"],["หัวใจ","爱心"],["Single Shell","单壳"],["Vỏ đơn","单壳"]].sort((a,b)=>b[0].length-a[0].length);
function translateSpec(spec){let s=safe(spec).replace(/^option:\s*/i,"").replace(/Warehouse:.*$/is,"");s=s.replace(/i?Phone\s*\d{1,2}\s*(Pro\s*Max|Pro|promax)?/gi,"").replace(/(?:^|[,，\s])(13|14|15|16|17)\s*(Pro\s*Max|Pro|promax|PM|P)?(?:[,，\s]|$)/gi," ").replace(/Airpods?\s*\d?\s*代?/gi,"");TRANSLATIONS.forEach(([a,b])=>s=s.split(a).join(b));return s.replace(/[^\u4e00-\u9fffA-Za-z0-9+\-()（）【】×➕.,， ]/g," ").replace(/\s+/g," ").replace(/^[+,，\s]+|[+,，\s]+$/g,"");}
function styleName(name,stall){const clean=safe(name).replace(/\*\d+$/,"");const pieces=clean.split(/[-_]/).map(x=>x.trim()).filter(Boolean).filter(p=>!(/^[a-f0-9]{10,}$/i.test(p)||p.toUpperCase()===stall.toUpperCase()||p.toLowerCase()==="xhs"||/^(i?Phone\s*)?\d{1,2}\s*(pro|promax|pro\s*max)?$/i.test(p)||/^\d{1,3}$/.test(p)));const meaningful=pieces.filter(p=>/[\u4e00-\u9fff【】]/.test(p));return meaningful.join("_")||translateSpec(clean)||"未识别款式";}
function parseOrder(o){const stall=(ALIASES[o.stall]||o.stall||"未标注档口").trim();const remark=/缺|整套/.test(o.spec)?o.spec:"";const specCn=remark?"":translateSpec(o.spec);return{stall,style:styleName(o.multiName,stall),sku:o.sku,skuNorm:normalizeSku(o.sku),productKey:productKey(o.multiName),model:extractModel(o.spec,o.multiName),specCn,qty:o.qty,remark,orderNo:o.orderNo,imageId:o.imageId,image:o.image};}
function mergeOrders(items){
  const stalls={};items.forEach(i=>(stalls[i.stall]||=[]).push(i));const result={};
  Object.entries(stalls).forEach(([stall,rows])=>{const map=new Map();rows.forEach(i=>{const key=i.skuNorm?`S|${i.skuNorm}|${i.style}|${i.remark}`:i.productKey?`P|${i.productKey}|${i.style}|${i.specCn}|${i.remark}`:`I|${i.imageId}|${i.style}|${i.specCn}|${i.remark}`;if(!map.has(key))map.set(key,{...i,models:{},orderNos:[]});const g=map.get(key);g.models[i.model]=(g.models[i.model]||0)+i.qty;if(i.orderNo)g.orderNos.push(i.orderNo);if(!g.image&&i.image)g.image=i.image;});result[stall]=[...map.values()];});return result;
}

function roundRect(ctx,x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();}}
function loadImage(src){return new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=src;});}
function wrap(ctx,text,maxWidth,maxLines=2){const lines=[];let line="";for(const ch of safe(text)){if(ctx.measureText(line+ch).width<=maxWidth)line+=ch;else{if(line)lines.push(line);line=ch;if(lines.length===maxLines)break;}}if(line&&lines.length<maxLines)lines.push(line);return lines;}
async function drawCard(floor,stall,total,page,pages,items){
  const W=900, header=150, rowH=286, footer=82, H=header+items.length*rowH+footer;const c=document.createElement("canvas");c.width=W;c.height=H;const x=c.getContext("2d");
  x.fillStyle="#fffaf4";x.fillRect(0,0,W,H);const grad=x.createLinearGradient(0,0,W,0);grad.addColorStop(0,"#ff7466");grad.addColorStop(1,"#ff8b78");x.fillStyle=grad;x.fillRect(0,0,W,header);x.fillStyle="#fff";x.font="800 42px sans-serif";x.fillText(`${floor} · ${stall}`,34,68);x.font="600 22px sans-serif";x.fillText(`配货卡 · ${new Date().toLocaleDateString("zh-CN")}${pages>1?` · ${page}/${pages}`:""}`,36,108);roundRect(x,670,28,190,88,22,"#fff8f3");x.fillStyle="#ef665d";x.font="800 34px sans-serif";x.textAlign="center";x.fillText(`共 ${total} 件`,765,83);x.textAlign="left";
  let y=header;
  for(const item of items){roundRect(x,20,y+12,W-40,rowH-20,22,"#fff","#efdcd0");const ix=38,iy=y+30,size=220;roundRect(x,ix,iy,size,size,18,"#f7f1ec");if(item.image){try{const img=await loadImage(item.image);const scale=Math.min(size/img.width,size/img.height);const w=img.width*scale,h=img.height*scale;x.save();x.beginPath();x.roundRect(ix,iy,size,size,18);x.clip();x.drawImage(img,ix+(size-w)/2,iy+(size-h)/2,w,h);x.restore();}catch{}}else{x.fillStyle="#ae9c90";x.font="24px sans-serif";x.textAlign="center";x.fillText("无图",ix+size/2,iy+size/2);x.textAlign="left";}
    const tx=286,max=570;x.fillStyle="#282524";x.font="800 30px sans-serif";wrap(x,item.style,max,1).forEach((line,j)=>x.fillText(line,tx,y+62+j*34));x.fillStyle="#7e7975";x.font="23px sans-serif";x.fillText(`规格：${item.specCn||item.style}`,tx,y+105);x.fillStyle="#1569d7";x.font="800 34px sans-serif";const models=Object.entries(item.models).sort().map(([m,q])=>`${m} × ${q}`).join("   ");wrap(x,models,max,2).forEach((line,j)=>x.fillText(line,tx,y+160+j*42));x.fillStyle="#8a8581";x.font="18px sans-serif";x.fillText((item.productKey||item.sku||item.imageId||"无商品编码").slice(0,34)+(item.productKey?.length>34?"…":""),tx,y+236);if(item.remark){x.fillStyle="#d8443e";x.font="700 18px sans-serif";x.fillText(`! ${item.remark}`,tx,y+264);}y+=rowH;
  }
  x.fillStyle="#fff5ed";x.fillRect(0,H-footer,W,footer);x.fillStyle="#e95650";x.strokeStyle="#e95650";x.lineWidth=4;x.strokeRect(32,H-57,30,30);x.font="700 23px sans-serif";x.fillText("已配齐",76,H-33);x.textAlign="center";x.fillStyle="#302c2a";x.font="800 25px sans-serif";x.fillText(`${items.length} 个商品 · ${total} 件`,W/2,H-34);x.textAlign="left";
  const blob=await new Promise(resolve=>c.toBlob(resolve,"image/png"));return{url:URL.createObjectURL(blob),blob};
}
async function generateCards(grouped){const cards=[];const stalls=Object.keys(grouped).sort((a,b)=>{const fa=stallMap[a.toUpperCase()]||"其他",fb=stallMap[b.toUpperCase()]||"其他";return FLOORS.indexOf(fa)-FLOORS.indexOf(fb)||a.localeCompare(b);});for(let si=0;si<stalls.length;si++){const stall=stalls[si],items=grouped[stall],floor=stallMap[stall.toUpperCase()]||"其他",total=items.reduce((n,i)=>n+Object.values(i.models).reduce((a,b)=>a+b,0),0),chunks=[];for(let i=0;i<items.length;i+=4)chunks.push(items.slice(i,i+4));for(let p=0;p<chunks.length;p++){setProgress(76+Math.round(((si+p/chunks.length)/stalls.length)*22),"正在生成卡片",`${floor} · ${stall}`);const image=await drawCard(floor,stall,total,p+1,chunks.length,chunks[p]);cards.push({floor,stall,total,page:p+1,pages:chunks.length,count:chunks[p].length,...image,filename:`${String(cards.length+1).padStart(2,"0")}_${floor}_档口${stall}${chunks.length>1?`_${p+1}`:""}.png`});await nextFrame();}}return cards;}

function updateDashboard(orders,grouped,cards,fileName,sheetName,addedOrders=orders.length,fileCount=1,writeHistory=true){
  $("#orderCount").textContent=orders.length;$("#stallCount").textContent=Object.keys(grouped).length;$("#cardCount").textContent=cards.length;$("#recentEmpty").classList.toggle("hidden",cards.length>0);$("#downloadAll").classList.toggle("hidden",!cards.length);
  $("#recentCards").innerHTML=cards.slice(0,3).map((c,i)=>`<article class="result-card"><img src="${c.url}" alt="配货卡预览"><div class="result-main"><h3>${escapeHtml(c.floor)} · ${escapeHtml(c.stall)} · ${c.total}件</h3><p>${c.count} 个商品 · 第 ${c.page}/${c.pages} 页</p><div class="result-actions"><a href="${c.url}" download="${escapeHtml(c.filename)}">下载卡片</a></div></div></article>`).join("");
  if(writeHistory){const history=JSON.parse(localStorage.getItem("peihuo-history")||"[]");history.unshift({name:fileName,time:new Date().toLocaleString("zh-CN"),sheet:sheetName,orders:addedOrders,stalls:Object.keys(grouped).length,cards:cards.length});localStorage.setItem("peihuo-history",JSON.stringify(history.slice(0,30)));renderHistory();toast(`已追加 ${addedOrders} 行 · 今日 ${fileCount} 个文件，共 ${orders.length} 行`);}
}
function releaseGeneratedCards(){generatedCards.forEach(card=>card.url&&URL.revokeObjectURL(card.url));generatedCards=[];}
async function restoreToday(){
  try{
    const uploads=await getTodayUploads();if(!uploads.length)return;
    setProgress(12,"正在恢复今日订单",`${uploads.length} 个已上传文件`);
    const batches=[];for(const upload of uploads)batches.push(await readOrderBatch(upload.data));
    const orders=batches.flatMap(batch=>batch.orders),parsed=orders.map(parseOrder),grouped=mergeOrders(parsed);
    releaseGeneratedCards();generatedCards=await generateCards(grouped);
    updateDashboard(orders,grouped,generatedCards,"今日累计",batches.at(-1)?.sheetName||"",0,uploads.length,false);
    setProgress(100,"今日订单已恢复",`${uploads.length} 个文件 · ${orders.length} 行订单`);
    setTimeout(()=>$("#progressCard").classList.add("hidden"),900);
  }catch(error){console.error(error);$("#progressCard").classList.add("hidden");toast("今日订单恢复失败，可重新上传文件");}
}
$("#clearToday").addEventListener("click",async()=>{
  const uploads=await getTodayUploads();if(!uploads.length){toast("今天还没有累计订单");return;}
  if(!confirm(`清空今天累计的 ${uploads.length} 个订单文件？档口映射和历史记录不会受影响。`))return;
  await clearTodayUploads();releaseGeneratedCards();$("#orderCount").textContent="0";$("#stallCount").textContent="0";$("#cardCount").textContent="0";$("#recentCards").innerHTML="";$("#recentEmpty").classList.remove("hidden");$("#downloadAll").classList.add("hidden");toast("今日累计订单已清空");
});
$("#downloadAll").addEventListener("click",async()=>{if(!generatedCards.length)return;const zip=new JSZip();generatedCards.forEach(c=>zip.file(c.filename,c.blob));const blob=await zip.generateAsync({type:"blob"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`配货卡_${new Date().toISOString().slice(0,10)}.zip`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);});

window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();installPrompt=e;});
$("#installButton").addEventListener("click",async()=>{if(installPrompt){installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;}else toast("请在浏览器菜单中选择“安装应用”或“添加到主屏幕”");});
function updateNetwork(){ $("#networkText").textContent=navigator.onLine?"离线可用":"当前离线"; }
addEventListener("online",updateNetwork);addEventListener("offline",updateNetwork);updateNetwork();renderStalls();renderHistory();restoreToday();
if("serviceWorker" in navigator)addEventListener("load",()=>navigator.serviceWorker.register("./sw.js"));

