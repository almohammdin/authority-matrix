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
    {key:'blank',     label:'غير محدد',       color:'#FFFFFF', text:'#647184', legend:'غير محدد'}
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
  let rows=DEFAULT_ROWS.map(name=>({name,cells:DEFAULT_ROLES.map(()=>6),note:''}));

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
    let m=`بنود بجهة اعتماد نهائي واحدة: <b>${complete}</b> من <b>${total}</b>.`;
    if(missing)m+=` يوجد <b>${missing}</b> بند بلا اعتماد نهائي.`;
    if(dup)m+=` يوجد <b>${dup}</b> بند فيه أكثر من اعتماد نهائي.`;
    if(!missing&&!dup)m+=' تحقق عدد جهات الاعتماد لا يعني اكتمال مراجعة الصلاحيات.';
    const unresolved=rows.filter(r=>r.cells.includes(6)).length;
    if(unresolved)m+=` يوجد <b>${unresolved}</b> بند يتضمن أدوارا غير محددة.`;
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
      h+=`<tr><th><button class="row-remove no-print" onclick="AM.removeRow(${ri})" title="حذف القرار" aria-label="حذف القرار">✕</button><span class="row-flag ${dc===1?'flag-ok':'flag-warn'}" title="${flagTitle}"></span>${esc(clean(r.name))}<button class="note-edit no-print" onclick="AM.editNote(${ri})" aria-label="تعديل ملاحظة القرار">ملاحظة</button>${r.note?`<div class="row-note">${esc(r.note)}</div>`:''}</th>`;
      r.cells.forEach((v,ci)=>{
        const l=LEVELS[v];
        const display=l.label;
        h+=`<td class="cell"><button class="cell-btn" data-level="${l.key}" title="${l.label}" aria-label="${esc(r.name)}، ${esc(roles[ci])}، ${l.label}" style="background:${l.color};color:${l.text}" onclick="AM.cycleCell(${ri},${ci})">${display}</button></td>`;
      });
      h+='</tr>';
    });

    h+='</tbody>';
    table.innerHTML=h;
    updateStatus();
    saveLocal();
  }

  window.AM={
    editNote(i){const note=prompt('ملاحظات القرار وحدود التفويض',rows[i].note||'');if(note===null)return;if(note.length>4000){toast('الحد الأقصى للملاحظة 4000 حرف');return}rows[i].note=note.trim();render()},
    cycleCell(r,c){rows[r].cells[c]=(rows[r].cells[c]+1)%LEVELS.length;render()},
    removeRole(i){roles.splice(i,1);rows.forEach(r=>r.cells.splice(i,1));render()},
    removeRow(i){rows.splice(i,1);render()}
  };

  document.getElementById('addRoleBtn').onclick=()=>{
    const i=document.getElementById('newRoleInput'),v=i.value.trim();
    if(!v)return;
    if(roles.length>=50){toast('الحد الأقصى 50 منصبا');return}if(roles.includes(v)){toast('المنصب موجود بالفعل');return}
    roles.push(v);rows.forEach(r=>r.cells.push(6));i.value='';render();
  };

  document.getElementById('addRowBtn').onclick=()=>{
    const i=document.getElementById('newRowInput'),v=i.value.trim();
    if(!v)return;
    if(rows.length>=500){toast('الحد الأقصى 500 قرار');return}
    rows.push({name:v,cells:roles.map(()=>6)});i.value='';render();
  };

  const company=()=>document.getElementById('companyName').value.trim();

  function buildPrint(){
    const total=rows.length;
    const complete=rows.filter(r=>r.cells.filter(c=>LEVELS[c].key==='decide').length===1).length;
    const missing=rows.filter(r=>r.cells.filter(c=>LEVELS[c].key==='decide').length===0).length;
    const dup=rows.filter(r=>r.cells.filter(c=>LEVELS[c].key==='decide').length>1).length;
    let t='<table><thead><tr><th>القرار / الصلاحية</th>'+roles.map(r=>`<th>${esc(r)}</th>`).join('')+'</tr></thead><tbody>';
    rows.forEach(r=>{
      t+=`<tr><th>${esc(clean(r.name))}${r.note?`<div class="row-note">${esc(r.note)}</div>`:''}</th>`+r.cells.map(v=>`<td>${LEVELS[v].legend||LEVELS[v].label}</td>`).join('')+'</tr>';
    });
    t+='</tbody></table>';
    document.getElementById('printArea').innerHTML=`<div class="print-header"><div><div class="print-kicker">حتى لحلول الأعمال</div><h1>مصفوفة الصلاحيات</h1><b>${esc(company()||'اسم الشركة غير محدد')}</b></div><div class="print-meta">${new Date().toLocaleDateString('ar-SA-u-nu-latn')}<br>${total} بند</div></div>${document.getElementById('matrixNotes').value?`<div class="print-notes">${esc(document.getElementById('matrixNotes').value)}</div>`:''}<div class="print-summary"><span class="print-pill">صحيح: ${complete}</span><span class="print-pill">ناقص: ${missing}</span><span class="print-pill">مكرر: ${dup}</span></div>${t}<div class="print-legend">${LEVELS.map(l=>`<div class="print-legend-item"><span class="print-swatch" style="background:${l.color}"></span>${l.label}</div>`).join('')}</div>`;
  }

  document.getElementById('printBtn').onclick=()=>{buildPrint();window.print()};
  document.getElementById('resetBtn').onclick=()=>{
    if(!confirm('سيتم مسح محتوى المصفوفة بالكامل والعودة للحالة الافتراضية. هل تريد المتابعة؟'))return;
    roles=[...DEFAULT_ROLES];
    rows=DEFAULT_ROWS.map(name=>({name,cells:DEFAULT_ROLES.map(()=>6)}));
    document.getElementById('companyName').value='';
    document.getElementById('matrixNotes').value='';
    render();toast('تم مسح المحتوى');
  };

  const storageKey='hatta-authority-matrix-v1';
  function snapshot(){
    return {format:'hatta-authority-matrix',version:1,companyName:company(),notes:document.getElementById('matrixNotes').value,roles:[...roles],rows:rows.map(r=>({name:r.name,note:r.note||'',cells:r.cells.map(c=>LEVELS[c].key)}))};
  }
  let storageWarning=false;
  function saveLocal(){
    try{localStorage.setItem(storageKey,JSON.stringify(snapshot()))}
    catch(error){if(!storageWarning){storageWarning=true;toast('تعذر الحفظ التلقائي. صدّر البيانات للاحتفاظ بنسختك.')}}
  }
  function applyData(data){
    roles=[...data.roles];
    rows=data.rows.map(r=>({name:r.name,note:r.note,cells:r.cells.map(c=>LEVELS.findIndex(l=>l.key===c))}));
    document.getElementById('companyName').value=data.companyName;
    document.getElementById('matrixNotes').value=data.notes;
  }
  function exportData(){
    const blob=new Blob([JSON.stringify(snapshot(),null,2)],{type:'application/json;charset=utf-8'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=(company()||'authority-matrix').replace(/[<>:"/\\|?*\x00-\x1F]/g,'-')+'.json';
    document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  const importDialog=document.getElementById('importDialog');
  const fileInput=document.getElementById('importFile');
  let pendingImport=null;
  let importSequence=0;
  document.getElementById('importBtn').onclick=()=>fileInput.click();
  document.getElementById('exportBtn').onclick=exportData;
  document.getElementById('backupBtn').onclick=exportData;
  fileInput.onchange=async()=>{
    const selected=fileInput.files[0],sequence=++importSequence;
    fileInput.value='';pendingImport=null;
    if(!selected)return;
    try{
      if(selected.size>2*1024*1024)throw new Error('حجم الملف يتجاوز 2 MB.');
      const data=MatrixData.parse(await selected.text());
      if(sequence!==importSequence)return;
      pendingImport=data;
      const missing=data.rows.filter(r=>!r.cells.includes('decide')).length;
      const duplicate=data.rows.filter(r=>r.cells.filter(c=>c==='decide').length>1).length;
      document.getElementById('importPreview').innerHTML=`<b>${esc(data.companyName||'شركة دون اسم')}</b><div class="preview-counts"><span>${data.roles.length} منصب</span><span>${data.rows.length} قرار</span><span>${missing} دون اعتماد</span><span>${duplicate} باعتماد مكرر</span></div><p>${data.roles.map(esc).join(' · ')}</p>${data.notes?`<div class="preview-note">${esc(data.notes)}</div>`:''}`;
      importDialog.showModal();
    }catch(error){if(sequence===importSequence){pendingImport=null;toast(error instanceof SyntaxError?'تعذر قراءة JSON. تحقق من سلامة الملف.':error.message)}}
  };
  document.getElementById('confirmImportBtn').onclick=()=>{
    if(!pendingImport)return;
    applyData(pendingImport);pendingImport=null;importDialog.close();render();toast('تم استيراد المصفوفة');
    document.getElementById('matrix').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  };
  document.getElementById('cancelImportBtn').onclick=()=>importDialog.close();
  importDialog.addEventListener('close',()=>{pendingImport=null;document.getElementById('importBtn').focus()});
  document.getElementById('companyName').addEventListener('input',saveLocal);
  document.getElementById('matrixNotes').addEventListener('input',saveLocal);
  try{const saved=localStorage.getItem(storageKey);if(saved)applyData(MatrixData.parse(saved))}catch(error){toast('تعذر استعادة النسخة المحفوظة. يمكنك استيراد ملفك.')}

  renderLegend();
  render();
})();
