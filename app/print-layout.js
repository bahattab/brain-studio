'use strict';
(() => {
  const credit='Created by Brain Studio, Emad Bahattab, Email: bahattab@yahoo.com';
  function cleanup(){document.getElementById('print-document')?.remove();delete document.body.dataset.printReady;}
  function prepare(){
    cleanup();
    const content=document.getElementById('content');if(!content)return;
    const table=document.createElement('table');table.id='print-document';table.dir=document.documentElement.dir;
    const body=document.createElement('tbody'),row=document.createElement('tr'),cell=document.createElement('td');
    const selected=content.querySelector(':scope > .print-report');
    const children=selected?[content.querySelector(':scope > .page-heading'),selected]:[...content.children];
    for(const child of children.filter(Boolean)){
      const clone=child.cloneNode(true);
      // Printed editable notes reflect their current text, including unsaved edits.
      const originals=[...child.querySelectorAll('textarea')],copies=[...clone.querySelectorAll('textarea')];
      copies.forEach((node,index)=>node.textContent=originals[index].value);
      cell.append(clone);
    }
    row.append(cell);body.append(row);table.append(body);
    // Chromium page-margin boxes repeat the credit without adding a flow row.
    // The page margin reserves footer space and cannot create an orphan tfoot.
    if(typeof window.CSSMarginRule!=='function'){
      // Other print engines retain a repeating table-footer credit fallback.
      const foot=document.createElement('tfoot'),footRow=document.createElement('tr'),footCell=document.createElement('td');
      footCell.className='print-credit';footCell.dir='ltr';footCell.textContent=credit;footRow.append(footCell);foot.append(footRow);table.append(foot);
    }
    document.body.prepend(table);document.body.dataset.printReady='true';
  }
  window.addEventListener('beforeprint',prepare);window.addEventListener('afterprint',cleanup);
  window.PrintLayout=Object.freeze({prepare,cleanup});
})();
