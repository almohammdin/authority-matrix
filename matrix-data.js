(function(root){
  'use strict';
  const keys=['none','inform','consult','review','recommend','decide','blank'];
  function text(value,max,label){
    if(typeof value!=='string'||value.length>max)throw new Error('قيمة غير صالحة: '+label);
    return value.trim();
  }
  function validate(data){
    if(!data||data.format!=='hatta-authority-matrix'||data.version!==1)throw new Error('صيغة الملف غير مدعومة. استخدم ملف JSON مصدرا من مصفوفة حتى.');
    if(!Array.isArray(data.roles)||data.roles.length<1||data.roles.length>50)throw new Error('عدد المناصب يجب أن يكون بين 1 و50.');
    if(!Array.isArray(data.rows)||data.rows.length>500)throw new Error('الحد الأقصى 500 قرار.');
    const roles=data.roles.map(r=>text(r,200,'المنصب'));
    if(roles.some(r=>!r)||new Set(roles).size!==roles.length)throw new Error('أسماء المناصب فارغة أو مكررة.');
    const rows=data.rows.map(row=>{
      if(!row||!Array.isArray(row.cells)||row.cells.length!==roles.length)throw new Error('عدد خلايا القرار لا يطابق عدد المناصب.');
      const name=text(row.name,1500,'القرار');
      if(!name)throw new Error('أحد القرارات بلا اسم.');
      const cells=row.cells.map(cell=>{
        const value=typeof cell==='number'&&Number.isInteger(cell)?keys[cell]:cell;
        if(!keys.includes(value))throw new Error('إحدى حالات الصلاحية غير معروفة.');
        return value;
      });
      return {name,cells,note:text(row.note??'',4000,'ملاحظة القرار')};
    });
    return {format:'hatta-authority-matrix',version:1,companyName:text(data.companyName??'',300,'اسم الشركة'),notes:text(data.notes??'',12000,'ملاحظات المصفوفة'),roles,rows};
  }
  const api={keys,validate,parse:raw=>validate(JSON.parse(raw.replace(/^\uFEFF/,'')))};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.MatrixData=api;
})(typeof window!=='undefined'?window:globalThis);
