'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
const credit='Created by Brain Studio, Emad Bahattab, Email: bahattab@yahoo.com';
const validator=String.raw`
import fitz,json,pathlib,re,sys
credit=sys.argv[1]
results=[]
for name in sys.argv[2:]:
    document=fitz.open(name)
    assert document.metadata.get('author','')=='', 'Unexpected PDF author metadata'
    assert not re.search(r'[A-Za-z]:[\\/](?:Users|My Drive)[\\/]',str(document.metadata)), 'Private path in PDF metadata'
    assert '@' not in str(document.metadata), 'Email-like PDF metadata'
    pages=[]
    for index,page in enumerate(document):
        text=page.get_text()
        assert text.count(credit)==1, f'{pathlib.Path(name).name}: creator count on page {index+1}'
        assert len(text.replace(credit,'').strip())>20, f'{pathlib.Path(name).name}: orphan credit-only page {index+1}'
        assert 'UNSELECTED-PRIVATE-FIXTURE' not in text, 'Unselected content leaked into chosen report'
        areas=page.search_for(credit)
        assert len(areas)==1, 'Creator credit wrapped or duplicated'
        area=areas[0]
        assert area.y0>=page.rect.height-70 and area.y1<=page.rect.height-10, 'Credit is outside the reserved bottom margin'
        assert area.x0>=0 and area.x1<=page.rect.width, 'Credit is horizontally clipped'
        other_spans=[]
        for block in page.get_text('dict')['blocks']:
            for line in block.get('lines',[]):
                line_text=''.join(span['text'] for span in line['spans'])
                if line_text.strip()==credit: continue
                for span in line['spans']:
                    rect=fitz.Rect(span['bbox'])
                    assert rect.x0>=-1 and rect.x1<=page.rect.width+1 and rect.y0>=-1 and rect.y1<=page.rect.height+1, 'Report text clipped by page bounds'
                    assert not rect.intersects(area), 'Report text overlaps creator credit'
                    other_spans.append(rect)
        pages.append({'page':index+1,'creditOccurrences':1,'creditBounds':list(area),'bodyCharacters':len(text.replace(credit,'')),'overlap':False,'orphan':False})
    results.append({'file':pathlib.Path(name).name,'pages':pages,'metadata':document.metadata})
print(json.dumps(results))
`;

test('real LTR/RTL short and multipage PDFs reserve a nonoverlapping creator footer without orphan pages',{timeout:120000},async t=>{
  const browser=await chromium.launch({headless:true,channel:process.env.PLATFORM_BROWSER_CHANNEL||(process.platform==='win32'?'msedge':undefined)});
  t.after(()=>browser.close());
  const output=path.join(root,'evidence','print-credit-components');fs.mkdirSync(output,{recursive:true});
  const files=[];
  for(const [direction,length] of [['ltr',2],['rtl',2],['ltr',70],['rtl',70]]){
    const page=await browser.newPage();
    const paragraph=direction==='rtl'?'نص تجريبي مستقل يختبر اتجاه قراءة التقرير ومساحة التذييل. هذه بيانات مصطنعة لا تمثل شخصًا أو نتيجة تقييم.':'Synthetic independent report content verifies pagination and footer clearance. It contains no participant record, assessment claim, or private source material.';
    await page.setContent(`<!doctype html><html dir="${direction}"><head><meta charset="utf-8"><title>Brain Studio synthetic print check</title></head><body><main id="content"><div class="page-heading"><h1>${direction==='rtl'?'تقرير تجريبي':'Synthetic report'}</h1></div><div class="profile-checks">UNSELECTED-PRIVATE-FIXTURE</div><section class="result-summary print-report">${Array.from({length},(_,i)=>`<p>${i+1}. ${paragraph} ${paragraph}</p>`).join('')}</section></main></body></html>`);
    await page.addStyleTag({content:fs.readFileSync(path.join(root,'app/style.css'),'utf8')});
    await page.addScriptTag({path:path.join(root,'app/print-layout.js')});
    assert.equal(await page.evaluate(()=>typeof CSSMarginRule==='function'),true,'This geometry gate requires a Chromium engine with page-margin boxes');
    const filename=path.join(output,`${direction}-${length===2?'short':'multipage'}.pdf`);files.push(filename);
    await page.pdf({path:filename,format:'A4',printBackground:true,preferCSSPageSize:true});
    await page.close();
  }
  const python=process.env.PDF_VERIFICATION_PYTHON||(process.platform==='win32'?'python':'python3');
  const result=spawnSync(python,['-c',validator,credit,...files],{encoding:'utf8',env:{...process.env,PYTHONUTF8:'1'},maxBuffer:2000000});
  assert.equal(result.status,0,result.stderr||result.error?.message);
  const reports=JSON.parse(result.stdout);assert.equal(reports.length,4);
  for(const report of reports)if(report.file.includes('multipage'))assert(report.pages.length>1,'The multipage fixture must exercise repeated page footers');
  fs.writeFileSync(path.join(output,'geometry-results.json'),JSON.stringify({passed:true,engine:'Chromium page-margin boxes',reports},null,2)+'\n');
});
