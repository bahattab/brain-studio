'use strict';
(() => {
  const downloads = new Set();
  window.desktop = Object.freeze({
    platform: 'web', canPrint: true, canConfirmSave: false,
    async exportPDF(language) {
      // Browsers cannot verify whether a print dialog saved a PDF or was canceled.
      if (typeof window.print !== 'function') throw new Error('Printing unavailable');
      window.print();
      return { saved: false, printRequested: true, canPrint: true, language };
    },
    async exportJSON(report) {
      const text=JSON.stringify(report,null,2);
      if(typeof text!=='string'||text.length>(report?.type==='imported-questionnaire'?4000000:3000000))throw new Error('Invalid or oversized report');
      const url=URL.createObjectURL(new Blob([text],{type:'application/json;charset=utf-8'}));
      const anchor=document.createElement('a');
      anchor.href=url;anchor.download='Brain-Studio-Answers.json';anchor.hidden=true;
      document.body.append(anchor);
      try { anchor.click(); } finally {
        anchor.remove(); downloads.add(url);
        setTimeout(()=>{URL.revokeObjectURL(url);downloads.delete(url);},60000);
      }
      return { saved: false, downloadRequested: true };
    }
  });
  window.addEventListener('pagehide',()=>{for(const url of downloads)URL.revokeObjectURL(url);downloads.clear();});
  if ('serviceWorker' in navigator && window.isSecureContext) {
    window.addEventListener('load',()=>{
      // Relative URL keeps deployments below a subdirectory within their own scope.
      navigator.serviceWorker.register('./service-worker.js',{scope:'./'}).catch(error=>console.warn('Offline cache unavailable:',error.message));
    });
  }
})();
