(function () {
  'use strict';
  // Pure checks: no model calls, inferred legal rules, or transmission of matrix content.
  function inspect(data) {
    const issues = [];
    if (!data.companyName.trim()) issues.push({type:'company', text:'أضف اسم المنشأة حتى يظهر في النسخة المصدرة.'});
    if (!data.rows.length) issues.push({type:'empty', text:'أضف القرارات التي تريد توزيع صلاحياتها.'});
    data.rows.forEach((row, index) => {
      const messages = [], approvals = row.cells.filter(c => c === 'decide').length;
      if (!approvals) messages.push('حدد جهة الاعتماد النهائي');
      if (approvals > 1) messages.push('راجع تعدد جهات الاعتماد النهائي وحدود كل جهة');
      if (row.cells.includes('blank')) messages.push('استكمل الأدوار غير المحددة، أو اختر «غير معني»');
      // Only explicit placeholder wording is flagged. Numeric ranges and policy references
      // cannot reliably be judged from free text, so they remain a human review question.
      if (/حد معين|حد مالي معين|\[المبلغ\]|XXX/i.test(row.name + ' ' + row.note)) messages.push('استبدل العبارة المؤقتة بحد مالي أو مرجع محدد');
      if (messages.length) issues.push({type:'row', index, text:messages.join(' · ')});
    });
    if (!data.notes.trim()) issues.push({type:'source', text:'وثق مصدر الصلاحيات وحدود التفويض في ملاحظات المصفوفة.'});
    return {issues, ready:data.rows.filter(r => r.cells.filter(c => c === 'decide').length === 1 && !r.cells.includes('blank')).length};
  }
  if (typeof module !== 'undefined' && module.exports) { module.exports = {inspect}; return; }
  if (!window.AuthorityMatrix) return;
  const $ = id => document.getElementById(id);
  const safe = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const panel = document.createElement('div');
  panel.className = 'matrix-checks no-print';
  panel.innerHTML = '<div class="check-heading"><div><span class="eyebrow">فحص الاكتمال</span><h3>راجع البنود قبل التصدير</h3></div><span id="checkCount" class="check-count"></span></div><p id="checkSummary" role="status" aria-live="polite"></p><details id="checkDetails"><summary>عرض الملاحظات والوصول إلى البنود</summary><ul id="checkList"></ul></details><details class="human-check"><summary>أسئلة المراجعة المهنية</summary><ul><li>هل الحدود المالية محددة بمبلغ أو مرجع معروف لكل قرار يحتاجها؟</li><li>هل يجمع الشخص نفسه أدوار الاقتراح والمراجعة والاعتماد، حتى لو ظهرت بمسميات مختلفة؟</li><li>هل الأدوار المسماة في الملاحظات موجودة فعليا، وهل تتفق الصلاحيات مع وثائق المنشأة؟</li></ul><p>هذه أسئلة للمراجعة البشرية. فحص الاكتمال يتحقق من البيانات المدخلة، ولا يمثل اعتمادا للمصفوفة.</p></details>';
  $('matrix').querySelector('.matrix-scroll').before(panel);

  const service = document.createElement('section');
  service.id = 'review-service'; service.className = 'no-print';
  service.innerHTML = `<div class="card review-service"><div><span class="eyebrow">حتى لحلول الأعمال</span><h2>اطلب مراجعة مصفوفة منشأتك</h2><p>نراجع توزيع الأدوار وحدود الاعتماد، ونقترح تعديلات تناسب نشاطك وهيكل منشأتك.</p><div class="review-deliverables"><span>مراجعة الأدوار والتداخلات</span><span>ملاحظات على حدود التفويض</span><span>توصيات للتطبيق</span></div><p>نحدد نطاق العمل والأتعاب بعد الاطلاع على طلبك.</p></div><div><button class="btn btn-primary" id="reviewOpen">جهز طلب المراجعة</button><p class="start-note">طلب مختصر، ثم تواصل عبر واتساب حتى.</p></div></div>`;
  $('matrix').after(service);
  const dialog = document.createElement('dialog'); dialog.id = 'reviewDialog';
  dialog.setAttribute('aria-labelledby','reviewTitle');
  dialog.innerHTML = `<form id="reviewForm"><h2 id="reviewTitle">طلب مراجعة المصفوفة</h2><p>أدخل نبذة عن منشأتك. ستراجع الرسالة في واتساب قبل إرسالها.</p><label for="reviewName">اسم المنشأة</label><input id="reviewName" type="text" maxlength="150" required><label for="reviewActivity">النشاط</label><input id="reviewActivity" type="text" maxlength="150" required placeholder="مثال: مطاعم ومقاه"><label for="reviewSize">عدد الموظفين</label><select id="reviewSize" required><option value="">اختر العدد</option><option>1–10</option><option>11–50</option><option>51–200</option><option>أكثر من 200</option></select><label for="reviewNeed">ما الموضوع الذي تريد مراجعته؟</label><textarea id="reviewNeed" rows="3" maxlength="600" required placeholder="مثال: تتأخر الموافقات ونريد توزيع صلاحيات مديري الفروع"></textarea><p class="start-note">التواصل عبر رقمك في واتساب. تتضمن الرسالة هذه الحقول فقط؛ محتوى المصفوفة وسياق العميل الخاص يبقيان في الصفحة.</p><div class="actions-row"><button type="submit" class="btn btn-primary">معاينة رسالة الطلب</button><button type="button" id="reviewCancel" class="btn">إغلاق</button></div></form><div id="reviewPreview" hidden><h3>راجع رسالتك</h3><pre id="reviewText"></pre><a id="reviewWhatsapp" class="btn btn-primary" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">فتح واتساب للإرسال</a><p class="start-note">فتح واتساب لا يؤكد إرسال الطلب. أكمل الإرسال داخل التطبيق.</p><details><summary>مشاركة المصفوفة مع الطلب · اختياري</summary><p>صدر المصفوفة بملف JSON من الأداة، ثم أرفق الملف بنفسك في المحادثة بعد مراجعته. يشمل الملف اسم المنشأة والقرارات والأدوار وملاحظات المصفوفة، ويستبعد سياق العميل الخاص في مسار.</p><button type="button" class="btn" id="reviewExport">تنزيل المصفوفة JSON</button></details><div class="actions-row"><button type="button" class="btn" id="reviewEdit">تعديل البيانات</button><button type="button" class="btn" id="reviewClose">إغلاق</button></div></div><p id="reviewStatus" role="status" aria-live="polite"></p>`;
  document.body.append(dialog);

  // Names only; never include text, row titles, IDs, URL parameters, or contact data.
  // No analytics account currently exists in this site. An explicitly configured
  // host may consume this event; the local counts are diagnostics, not site-wide totals.
  const allowed = new Set(['view','edit','check_complete','json_export','print_open','review_open','review_prepared','whatsapp_open']);
  const counts = {}, once = new Set();
  function track(name, oneTime=false) {
    if (!allowed.has(name) || (oneTime && once.has(name))) return;
    once.add(name); counts[name]=(counts[name]||0)+1;
    window.dispatchEvent(new CustomEvent('authoritymatrix:metric',{detail:{event:'authority_matrix_'+name}}));
  }
  window.AuthorityMatrixMetrics = {summary:() => ({scope:'current-page-session',aggregateConnected:false,counts:{...counts}})};
  track('view',true);
  function refresh() {
    let data;
    try {data=window.AuthorityMatrix.snapshot();} catch {return;}
    const result=inspect(data);
    $('checkCount').textContent=result.ready+' / '+data.rows.length+' قرار';
    $('checkSummary').textContent=result.issues.length
      ? result.issues.length+' ملاحظة للاستكمال. يشير العداد إلى القرارات ذات اعتماد واحد وأدوار محددة.'
      : 'اكتملت الحقول التي يفحصها النظام. راجع حدود التفويض وتوافقها مع وثائق المنشأة قبل الاعتماد.';
    $('checkDetails').hidden=!result.issues.length;
    // Bound the DOM for a large imported matrix; all findings remain accessible.
    $('checkList').innerHTML=result.issues.map(item => '<li>'+(item.type==='row'
      ? '<button type="button" data-row="'+item.index+'"><b>'+safe(data.rows[item.index].name)+'</b><span>'+safe(item.text)+'</span></button>'
      : '<button type="button" data-target="'+({company:'companyName',empty:'newRowInput',source:'matrixNotes'}[item.type])+'">'+safe(item.text)+'</button>')+'</li>').join('');
    if (!result.issues.length) track('check_complete',true);
  }
  $('checkList').onclick=e=>{
    const button=e.target.closest('button'); if(!button)return;
    if(button.dataset.row!==undefined) window.AuthorityMatrix.focusRow(Number(button.dataset.row));
    else {const target=$(button.dataset.target); target.scrollIntoView({block:'center'}); target.focus({preventScroll:true});}
  };
  let refreshTimer;
  window.addEventListener('matrixchange',()=>{clearTimeout(refreshTimer);refreshTimer=setTimeout(refresh,180);});
  // Only user edits count as edits; loading private data does not.
  $('matrixTable').addEventListener('click',e=>{if(e.target.closest('button'))track('edit',true);});
  for(const id of ['companyName','matrixNotes']) $(id).addEventListener('input',()=>track('edit',true));
  for(const id of ['addRoleBtn','addRowBtn']) $(id).addEventListener('click',()=>track('edit',true));
  for(const id of ['exportBtn','viewExportBtn','backupBtn']) $(id)?.addEventListener('click',()=>track('json_export'));
  $('printBtn').addEventListener('click',()=>track('print_open'));
  $('reviewOpen').onclick=()=>{
    $('reviewName').value=$('companyName').value.slice(0,150);
    $('reviewForm').hidden=false;$('reviewPreview').hidden=true;$('reviewStatus').textContent='';
    dialog.showModal();track('review_open');
  };
  $('reviewForm').onsubmit=e=>{
    e.preventDefault();
    for(const id of ['reviewName','reviewActivity','reviewNeed']) {
      const input=$(id);input.value=input.value.trim();
      if(!input.value){input.reportValidity();return;}
    }
    const message='طلب مراجعة مصفوفة الصلاحيات | حتى\n\nاسم المنشأة: '+$('reviewName').value+'\nالنشاط: '+$('reviewActivity').value+'\nعدد الموظفين: '+$('reviewSize').value+'\nموضوع المراجعة: '+$('reviewNeed').value+'\n\nالمصدر: أداة مصفوفة الصلاحيات';
    $('reviewText').textContent=message;
    // Same business contact already published on /services/.
    $('reviewWhatsapp').href='https://wa.me/966506350457?text='+encodeURIComponent(message);
    $('reviewForm').hidden=true;$('reviewPreview').hidden=false;$('reviewWhatsapp').focus();track('review_prepared');
  };
  $('reviewWhatsapp').onclick=()=>{track('whatsapp_open');$('reviewStatus').textContent='أكمل الإرسال في واتساب. يمكنك العودة هنا لتنزيل المصفوفة وإرفاقها.';};
  $('reviewExport').onclick=()=>{$('exportBtn').click();$('reviewStatus').textContent='تم تجهيز تنزيل ملف المصفوفة. أرفقه في واتساب بنفسك بعد مراجعته.';};
  $('reviewEdit').onclick=()=>{$('reviewForm').hidden=false;$('reviewPreview').hidden=true;$('reviewName').focus();};
  for(const id of ['reviewCancel','reviewClose']) $(id).onclick=()=>dialog.close();
  dialog.addEventListener('close',()=>{
    $('reviewForm').reset();$('reviewText').textContent='';$('reviewWhatsapp').removeAttribute('href');$('reviewStatus').textContent='';$('reviewOpen').focus();
  });
  refresh();
})();
