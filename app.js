(async()=>{
  try{
    const r=await fetch('https://almohammdin.github.io/hatta-brand-guide/',{cache:'force-cache'});
    if(!r.ok)return;
    const d=new DOMParser().parseFromString(await r.text(),'text/html');
    const css=[...d.querySelectorAll('style')].map(s=>s.textContent||'').join('\n');
    const faces=(css.match(/@font-face\s*\{[\s\S]*?\}/g)||[]).filter(x=>/Hatta Mada|IBM Plex Sans Arabic|El Messiri/i.test(x)).join('\n');
    if(faces){const st=document.createElement('style');st.textContent=faces;document.head.appendChild(st)}
    const mark=d.querySelector('.mini-brand img')?.getAttribute('src')||'';
    const full=d.querySelector('.cover-logo img')?.getAttribute('src')||mark;
    if(mark){document.querySelectorAll('[data-hatta-mark]').forEach(i=>{i.src=mark;i.hidden=false});document.querySelectorAll('[data-mark-fallback]').forEach(e=>e.hidden=true)}
    if(full){document.querySelectorAll('[data-hatta-full]').forEach(i=>{i.src=full;i.hidden=false});document.querySelectorAll('[data-full-fallback]').forEach(e=>e.hidden=true)}
  }catch(e){}
})();

(function(){
  /*
    Ordered authority states use one coherent blue scale instead of unrelated
    categorical colors. Final approval is the only gold accent because it is
    the terminal/highest authority state. Text/background pairs are selected
    to meet WCAG AA contrast for normal text.
  */
  const LEVELS=[
    {key:'none',      label:'غير معني',       color:'#F7F8FA', text:'#667085'},
    {key:'inform',    label:'يُبلَّغ',         color:'#EEF3F7', text:'#385A74'},
    {key:'consult',   label:'يُستشار',        color:'#E2EBF3', text:'#264C6B'},
    {key:'review',    label:'يُراجع',         color:'#CCDCE9', text:'#173F63'},
    {key:'recommend', label:'يوصي',           color:'#AFC8DB', text:'#102F50'},
    {key:'decide',    label:'يعتمد نهائيا',  color:'#D5AE69', text:'#153B66'},
    {key:'blank',     label:'غير محدد',       color:'#FFFFFF', text:'#98A2B3', legend:'غير محدد'}
  ];

  const DEFAULT_ROLES=['الجمعية العامة','مجلس الإدارة','اللجنة التنفيذية','الرئيس التنفيذي','الإدارة التنفيذية'];
  const DEFAULT_ROWS=[
    'تعيين أو إنهاء الرئيس التنفيذي',
    'اعتماد الميزانية التقديرية السنوية',
    'اعتماد مصروف تشغيلي داخل الميزانية حتى حد معين',
    'اعتماد مصروف أو التزام خارج الميزانية',
    'توقيع عقد يتجاوز السقف المالي المحدد',
    'فتح فرع أو نشاط جديد',
    'الدخول في استثمار أو مشروع جديد',
    'الاقتراض أو تقديم ضمانات',
    'توزيع الأرباح',
    'اعتماد القوائم المالية السنوية',
    'تعيين المراجع الخارجي',
    'الصفقات مع الأطراف ذات العلاقة'
  ];

  let roles=[...DEFAULT_ROLES];
  let rows=DEFAULT_ROWS.map(name=>({name,cells:DEFAULT_ROLES.map(()=>0)}));

  const table=document.getElementById('matrixTable');
  const legend=document.getElementById('legend');
  const statusTxt=document.getElementById('statusTxt');
  const toastEl=document.getElementById('toast');

  const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clean=n=>String(n||'').replace(/^[×✕✖]\s*/,'').trim();

  function toast(m){
    toastEl.textContent=m;
    toastEl.classList.add('show');
    setTimeout(()=>toastEl.classList.remove('show'),1800);
  }

  function renderLegend(){
    legend.innerHTML=LEVELS.map(l=>
      `<div class="legend-item"><span class="swatch" style="background:${l.color}"></span>${l.label}</div>`
    ).join('');
  }

  function updateStatus(){
    const total=rows.length;
    const complete=rows.filter(r=>r.cells.filter(c=>LEVELS[c].key==='decide').length===1).length;
    const missing=rows.filter(r=>r.cells.filter(c=>LEVELS[c].key==='decide').length===0).length;
    const dup=rows.filter(r=>r.cells.filter(c=>LEVELS[c].key==='decide').length>1).length;
    let m=`بنود باعتماد نهائي صحيح: <b>${complete}</b> من <b>${total}</b>.`;
    if(missing)m+=` يوجد <b>${missing}</b> بند بلا اعتماد نهائي.`;
    if(dup)m+=` يوجد <b>${dup}</b> بند فيه أكثر من اعتماد نهائي.`;
    if(!missing&&!dup)m+=' المصفوفة منضبطة من حيث جهة الاعتماد النهائي.';
    statusTxt.innerHTML=m;
  }

  function render(){
    let h='<thead><tr><th>القرار / الصلاحية</th>';
    roles.forEach((r,i)=>{
      h+=`<th>${roles.length>1?`<button class="role-remove no-print" onclick="AM.removeRole(${i})" title="حذف العمود" aria-label="حذف ${esc(r)}">✕</button>`:''}${esc(r)}</th>`;
    });
    h+='</tr></thead><tbody>';

    rows.forEach((r,ri)=>{
      const dc=r.cells.filter(c=>LEVELS[c].key==='decide').length;
      const flagTitle=dc===1?'جهة اعتماد نهائي واحدة':(dc===0?'لا توجد جهة اعتماد نهائي':'أكثر من جهة اعتماد نهائي');
      h+=`<tr><th><button class="row-remove no-print" onclick="AM.removeRow(${ri})" title="حذف القرار" aria-label="حذف القرار">✕</button><span class="row-flag ${dc===1?'flag-ok':'flag-warn'}" title="${flagTitle}"></span>${esc(clean(r.name))}</th>`;
      r.cells.forEach((v,ci)=>{
        const l=LEVELS[v];
        const display=l.key==='blank'?'':l.label;
        h+=`<td class="cell"><button class="cell-btn" data-level="${l.key}" title="${l.label}" aria-label="${l.label}" style="background:${l.color};color:${l.text}" onclick="AM.cycleCell(${ri},${ci})">${display}</button></td>`;
      });
      h+='</tr>';
    });

    h+='</tbody>';
    table.innerHTML=h;
    updateStatus();
  }

  window.AM={
    cycleCell(r,c){rows[r].cells[c]=(rows[r].cells[c]+1)%LEVELS.length;render()},
    removeRole(i){roles.splice(i,1);rows.forEach(r=>r.cells.splice(i,1));render()},
    removeRow(i){rows.splice(i,1);render()}
  };

  document.getElementById('addRoleBtn').onclick=()=>{
    const i=document.getElementById('newRoleInput'),v=i.value.trim();
    if(!v)return;
    roles.push(v);rows.forEach(r=>r.cells.push(0));i.value='';render();
  };

  document.getElementById('addRowBtn').onclick=()=>{
    const i=document.getElementById('newRowInput'),v=i.value.trim();
    if(!v)return;
    rows.push({name:v,cells:roles.map(()=>0)});i.value='';render();
  };

  const company=()=>document.getElementById('companyName').value.trim();

  function buildPrint(){
    const total=rows.length;
    const complete=rows.filter(r=>r.cells.filter(c=>LEVELS[c].key==='decide').length===1).length;
    const missing=rows.filter(r=>r.cells.filter(c=>LEVELS[c].key==='decide').length===0).length;
    const dup=rows.filter(r=>r.cells.filter(c=>LEVELS[c].key==='decide').length>1).length;
    let t='<table><thead><tr><th>القرار / الصلاحية</th>'+roles.map(r=>`<th>${esc(r)}</th>`).join('')+'</tr></thead><tbody>';
    rows.forEach(r=>{
      t+=`<tr><th>${esc(clean(r.name))}</th>`+r.cells.map(v=>`<td>${LEVELS[v].legend||LEVELS[v].label}</td>`).join('')+'</tr>';
    });
    t+='</tbody></table>';
    document.getElementById('printArea').innerHTML=`<div class="print-header"><div><div class="print-kicker">حتى لحلول الأعمال</div><h1>مصفوفة الصلاحيات</h1><b>${esc(company()||'اسم الشركة غير محدد')}</b></div><div class="print-meta">${new Date().toLocaleDateString('ar-SA-u-nu-latn')}<br>${total} بند</div></div><div class="print-summary"><span class="print-pill">صحيح: ${complete}</span><span class="print-pill">ناقص: ${missing}</span><span class="print-pill">مكرر: ${dup}</span></div>${t}<div class="print-legend">${LEVELS.map(l=>`<div class="print-legend-item"><span class="print-swatch" style="background:${l.color}"></span>${l.label}</div>`).join('')}</div>`;
  }

  document.getElementById('printBtn').onclick=()=>{buildPrint();window.print()};
  document.getElementById('resetBtn').onclick=()=>{
    if(!confirm('سيتم مسح محتوى المصفوفة بالكامل والعودة للحالة الافتراضية. هل تريد المتابعة؟'))return;
    roles=[...DEFAULT_ROLES];
    rows=DEFAULT_ROWS.map(name=>({name,cells:DEFAULT_ROLES.map(()=>0)}));
    document.getElementById('companyName').value='';
    render();toast('تم مسح المحتوى');
  };

  renderLegend();
  render();
})();