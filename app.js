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
    'توقيع عقد يتجاوز حد الصلاحية المالية المحدد',
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

  const esc=s=>MatrixData.currencyText(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
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

  function render(notify=true){
    let h='<thead><tr><th>القرار / الصلاحية</th>';
    roles.forEach((r,i)=>{
      h+=`<th>${roles.length>1?`<button class="role-remove no-print" onclick="AM.removeRole(${i})" title="حذف العمود" aria-label="حذف ${esc(r)}">✕</button>`:''}${esc(r)}</th>`;
    });
    h+='</tr></thead><tbody>';

    rows.forEach((r,ri)=>{
      if(!visibleRow(r))return;
      const dc=r.cells.filter(c=>LEVELS[c].key==='decide').length;
      const flagTitle=dc===1?'جهة اعتماد نهائي واحدة':(dc===0?'لا توجد جهة اعتماد نهائي':'أكثر من جهة اعتماد نهائي');
      h+=`<tr id="decision-${ri}" tabindex="-1"><th><button class="row-remove no-print" onclick="AM.removeRow(${ri})" title="حذف القرار" aria-label="حذف القرار">✕</button><span class="row-flag ${dc===1?'flag-ok':'flag-warn'}" title="${flagTitle}"></span>${esc(clean(r.name))}<button class="note-edit no-print" onclick="AM.editNote(${ri})" aria-label="تعديل ملاحظة القرار">ملاحظة</button>${r.note?`<div class="row-note">${esc(r.note)}</div>`:''}</th>`;
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
    const select=document.getElementById('roleView'),previous=select.value;
    select.innerHTML='<option value="">المصفوفة الشاملة</option>'+'<option value="management">مصفوفة الإدارة</option><option value="branch">مصفوفة مدير الفرع</option>'+roles.map((r,i)=>`<option value="${i}">${esc(r)}</option>`).join('');select.value=previous;
    if(notify)saveLocal();
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

  function visibleRow(r){
    const value=document.getElementById('roleView').value;
    if(value==='')return true;
    if(value==='management')return roles.some((role,i)=>!/(المالك|المدير العام|المدير التنفيذي|المدير المالي|مدير الفرع)/.test(role)&&r.cells[i]>=3&&r.cells[i]<=5);
    if(value==='branch')return roles.some((role,i)=>/مدير الفرع/.test(role)&&r.cells[i]!==0&&!/^0[12]\s*\|/.test(r.name));
    return r.cells[Number(value)]!==undefined&&r.cells[Number(value)]!==0;
  }
  document.getElementById('roleView').onchange=()=>render(false);
  function buildPrint(){
    const total=rows.length;
    const complete=rows.filter(r=>r.cells.filter(c=>LEVELS[c].key==='decide').length===1).length;
    const missing=rows.filter(r=>r.cells.filter(c=>LEVELS[c].key==='decide').length===0).length;
    const dup=rows.filter(r=>r.cells.filter(c=>LEVELS[c].key==='decide').length>1).length;
    const selected=document.getElementById('roleView').value;
    const filtered=rows.filter(visibleRow),groups=[];
    for(let start=0;start<roles.length;start+=5)groups.push({start,roles:roles.slice(start,start+5)});
    const title=selected===''?'المصفوفة الشاملة':selected==='management'?'مصفوفة الإدارة':selected==='branch'?'مصفوفة مدير الفرع':'قرارات '+roles[Number(selected)];
    const notes=document.getElementById('matrixNotes').value;
    document.getElementById('printArea').innerHTML=groups.map((group,index)=>{
      const header=`<div class="print-header"><div><img class="print-logo" src="https://almohammdin.github.io/services/assets/hatta/logo.webp" alt="حتى لحلول الأعمال"><h1>مصفوفة الصلاحيات</h1><b>${esc(company()||'اسم الشركة غير محدد')}</b><p>${esc(title)}</p></div><div class="print-meta">${new Date().toLocaleDateString('ar-SA-u-nu-latn')}<br>${filtered.length} قرار · مجموعة المناصب ${index+1} / ${groups.length}</div></div>`;
      const table='<table><colgroup><col style="width:38%">'+group.roles.map(()=>'<col>').join('')+'</colgroup><thead><tr><th>القرار / الصلاحية وحدودها</th>'+group.roles.map(r=>`<th>${esc(r)}</th>`).join('')+'</tr></thead><tbody>'+filtered.map((r,i)=>`<tr class="${(r.note||'').length>1500?'long-row':''}"><th><span class="decision-number">${i+1}.</span> ${esc(clean(r.name))}${r.note?`<div class="row-note">${esc(r.note)}</div>`:''}</th>`+r.cells.slice(group.start,group.start+5).map(v=>`<td style="background:${LEVELS[v].color};color:${LEVELS[v].text}">${LEVELS[v].label}</td>`).join('')+'</tr>').join('')+'</tbody></table>';
      return `<section class="print-group">${header}${index===0&&notes?`<div class="print-notes">${esc(notes)}</div>`:''}<div class="print-summary">فحص المصفوفة الشاملة: ${complete} بجهة اعتماد واحدة · ${missing} دون اعتماد · ${dup} باعتماد مكرر. لا يغني عن المراجعة والاعتماد الرسمي.</div>${table}<div class="print-legend">${LEVELS.map(l=>`<span>${l.label}</span>`).join(' · ')}</div></section>`;
    }).join('');
  }
  document.getElementById('printBtn').onclick=async()=>{buildPrint();await document.fonts.ready;await Promise.all([...document.querySelectorAll('#printArea img')].map(i=>i.decode().catch(()=>{})));const previous=document.title;document.title='مصفوفة الصلاحيات - '+(company()||'مسار');window.addEventListener('afterprint',()=>{document.title=previous},{once:true});window.print()};

  document.getElementById('resetBtn').onclick=()=>{
    if(!confirm('سيتم مسح محتوى المصفوفة بالكامل والعودة للحالة الافتراضية. هل تريد المتابعة؟'))return;
    roles=[...DEFAULT_ROLES];
    rows=DEFAULT_ROWS.map(name=>({name,cells:DEFAULT_ROLES.map(()=>6),note:''}));
    document.getElementById('companyName').value='';
    document.getElementById('matrixNotes').value='';
    render();toast('تم مسح المحتوى');
  };

  const storageKey='hatta-authority-matrix-v1';
  function snapshot(){
    return MatrixData.validate({format:'hatta-authority-matrix',version:1,companyName:company(),notes:document.getElementById('matrixNotes').value,roles:[...roles],rows:rows.map(r=>({name:r.name,note:r.note||'',cells:r.cells.map(c=>LEVELS[c].key)}))});
  }
  function saveLocal(){window.dispatchEvent(new Event('matrixchange'))}
  function applyData(data){
    roles=[...data.roles];
    rows=data.rows.map(r=>({name:r.name,note:r.note,cells:r.cells.map(c=>LEVELS.findIndex(l=>l.key===c))}));
    document.getElementById('companyName').value=data.companyName;
    document.getElementById('matrixNotes').value=data.notes;
  }
  function exportData(viewOnly=false){
    const data=snapshot();if(viewOnly){data.rows=data.rows.filter((r,i)=>visibleRow(rows[i]));const select=document.getElementById('roleView');data.notes='نسخة العرض: '+select.options[select.selectedIndex].text+' | مشتقة من المصفوفة المرجعية نفسها.\n'+data.notes}
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;const view=document.getElementById('roleView');a.download=(company()||'authority-matrix')+(viewOnly?' - '+view.options[view.selectedIndex].text:'').replace(/[<>:"/\\|?*\x00-\x1F]/g,'-')+'.json';
    document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  const importDialog=document.getElementById('importDialog');
  const fileInput=document.getElementById('importFile');
  let pendingImport=null;
  let importSequence=0;
  document.getElementById('importBtn').onclick=()=>fileInput.click();
  document.getElementById('exportBtn').onclick=()=>exportData();
  const viewExport=document.getElementById('viewExportBtn');if(viewExport)viewExport.onclick=()=>exportData(true);
  document.getElementById('backupBtn').onclick=()=>exportData();
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
  window.AuthorityMatrix={snapshot,focusRow(index){document.getElementById('roleView').value='';render(false);const row=document.getElementById('decision-'+index);if(row){row.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});row.focus({preventScroll:true})}},load(data){applyData(MatrixData.parse(JSON.stringify(data)));document.getElementById('roleView').value='';render()},clear(){roles=[...DEFAULT_ROLES];rows=DEFAULT_ROWS.map(name=>({name,cells:roles.map(()=>6),note:''}));document.getElementById('companyName').value='';document.getElementById('matrixNotes').value='';document.getElementById('roleView').value='';document.getElementById('printArea').replaceChildren();render()},restoreLegacy(){const saved=localStorage.getItem(storageKey);if(!saved)throw new Error('لا توجد نسخة سابقة في هذا المتصفح');this.load(MatrixData.parse(saved))}};


  renderLegend();
  render();
})();

