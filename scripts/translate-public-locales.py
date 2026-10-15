"""Developer-only translation of an explicit public-source string list.

No profiles, private reports, credentials, or application runtime are read.
Uses a public translation endpoint; results are linguistic drafts, not validation.
Existing translations are retained. Checkpoints stay in the OS temporary folder.
"""
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
import argparse
import hashlib
import json
import re
import tempfile
import time
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parent.parent
LOCALES = ROOT / 'app' / 'locales'
MANIFEST = ROOT / 'scripts' / 'localization' / 'v2-keys.json'
IPIP_FIRST_PERSON = json.loads(MANIFEST.read_text(encoding='utf-8')).get('ipipFirstPerson',{})
REFRESH_IDIOMS={'O*NET® Interest Profiler Short Form','Am the life of the party.','Seldom feel blue.','Often feel blue.'}
LANGUAGES = ['ar','zh','es','hi','fr','pt','ru','bn','ja','de','ur','id','ko','tr','it','fa','he','sw','vi','pa','mr','te','ta','th','gu','pl','uk','ms','ha']
CONTEXT = {
    'Action':'Development action', 'Dimension':'Assessment dimension',
    'Distance':'Difference from target', 'Extraversion':'Extraversion trait',
    'Social':'Social interests', 'Accommodation':'Willingness to accommodate',
    'minutes':'duration in minutes', 'items':'assessment items',
    'Conscientiousness':'Conscientiousness trait', 'Agreeableness':'Agreeableness trait',
    'responses':'assessment responses', 'tasks':'graded tasks',
    'manager':'team manager', 'Manager':'Team manager', 'Peer':'Colleague at the same level',
    'Foundation':'Basic practice tasks', 'Applied':'Applied practice tasks',
    'Attempted':'Attempted tasks',
    '3 · Neutral':'3 · Neither agree nor disagree',
    'OpenAI API':'API interface from OpenAI',
}

def protect(text):
    tokens = {}
    pattern = r'\{\w+\}|Brain Studio|Brain Works|O\*NET(?:®)?|IPIP(?:-50)?|\bOHBDS\b|\bHBDI(?:®)?|\bHerrmann\b|\bFreudly\b|Personality Test Center|\bOpenAI\b|\bAnthropic\b|Google Gemini|\bOpenRouter\b|\bOllama\b|\bAPI\b|\bHTTPS\b|66\s*−\s*A\s*\+\s*B|\bPDF\b|\bJSON\b|\bIQ\b'
    def replace(match):
        token = 'BSTOKEN' + str(len(tokens)) + 'X'
        tokens[token] = match[0]
        return token
    return re.sub(pattern, replace, text), tokens

def request(text, language):
    url = 'https://translate.googleapis.com/translate_a/single?' + urllib.parse.urlencode({
        'client':'gtx', 'sl':'en', 'tl':'zh-CN' if language=='zh' else language, 'dt':'t', 'q':text
    })
    for attempt in range(4):
        try:
            req=urllib.request.Request(url,headers={'User-Agent':'BrainStudio-Public-Localization/2.0'})
            with urllib.request.urlopen(req,timeout=45) as response:
                result=json.load(response)
            return ''.join(part[0] for part in result[0] if part[0])
        except Exception:
            if attempt==3: raise
            time.sleep(2**attempt)

def restore_tokens(translated, tokens):
    for token, original in tokens.items():
        pattern=r'\s*'.join(re.escape(char) for char in token)
        translated=re.sub(pattern,lambda _:original,translated,flags=re.IGNORECASE)
    return translated.strip()

def translate_batch(keys, language):
    if language == 'ha' and any(re.fullmatch(r'(3|6|12|24) hours', key) for key in keys):
        return [('Sa’o’i '+key.split()[0]) if re.fullmatch(r'(3|6|12|24) hours',key) else translate_batch([key],language)[0] for key in keys]
    prepared=[protect(IPIP_FIRST_PERSON.get(key,key)) for key in keys]
    result=request('\n'.join(pair[0] for pair in prepared),language).splitlines()
    if len(result)!=len(keys):
        if len(keys)==1: raise ValueError('Translation changed line structure')
        midpoint=len(keys)//2
        return translate_batch(keys[:midpoint],language)+translate_batch(keys[midpoint:],language)
    final=[]
    for key, translated, (_,tokens) in zip(keys,result,prepared):
        translated=restore_tokens(translated,tokens)
        if not translated or '\ufffd' in translated: raise ValueError('Empty or invalid translation')
        if sorted(re.findall(r'\{\w+\}',key))!=sorted(re.findall(r'\{\w+\}',translated)):
            raise ValueError('Translated placeholders changed')
        if re.search(r'BSTOKEN\d+X',translated,re.I): raise ValueError('Unrestored token')
        if translated==key and re.search(r'[A-Za-z]{4}',key):
            if key in CONTEXT:
                contextual,contextTokens=protect(CONTEXT[key])
                translated=restore_tokens(request(contextual,language),contextTokens)
            if translated==key:raise ValueError('Translation remained English: '+key)
        final.append(translated)
    return final

def run_language(language, keys, preserve, cache):
    file=cache/(language+'.json')
    done=json.loads(file.read_text(encoding='utf-8')) if file.exists() else {}
    original=json.loads((LOCALES/(language+'.json')).read_text(encoding='utf-8'))
    missing=[key for key in keys if (key not in original or key in REFRESH_IDIOMS) and key not in done and key not in preserve]
    batches=[];batch=[];length=0
    for key in missing:
        # Bound URL length even after percent-encoding non-ASCII punctuation.
        if batch and (length+len(key)>1800 or len(batch)>=18):batches.append(batch);batch=[];length=0
        batch.append(key);length+=len(key)+1
    if batch:batches.append(batch)
    for index,batch in enumerate(batches,1):
        try: values=translate_batch(batch,language)
        except ValueError:
            values=[translate_batch([key],language)[0] for key in batch]
        done.update(zip(batch,values));file.write_text(json.dumps(done,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        if index%6==0 or index==len(batches):print(language,index,'/',len(batches),'batches',flush=True)
        time.sleep(.4)
    for key in preserve:
        if key in keys:done[key]=key
    return language,done

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--apply',action='store_true');parser.add_argument('--workers',type=int,default=3)
    args=parser.parse_args()
    manifest=json.loads(MANIFEST.read_text(encoding='utf-8'));keys=manifest['keys'];preserve=manifest['preserve']
    identity=hashlib.sha256(json.dumps(keys).encode()).hexdigest()[:16]
    cache=Path(tempfile.gettempdir())/('BrainStudioPublicTranslation-'+identity);cache.mkdir(exist_ok=True)
    results={}
    with ThreadPoolExecutor(max_workers=max(1,min(args.workers,4))) as pool:
        futures=[pool.submit(run_language,lang,keys,preserve,cache) for lang in LANGUAGES]
        for future in as_completed(futures):
            language,translations=future.result();results[language]=translations;print(language,'complete',len(translations),flush=True)
    if args.apply:
        overrides=json.loads((ROOT/'scripts/localization/critical-overrides.json').read_text(encoding='utf-8'))
        catalog=json.loads((LOCALES/'catalog.json').read_text(encoding='utf-8'))
        catalog.update({key:key for key in keys});catalog=dict(sorted(catalog.items()))
        for language in LANGUAGES:
            file=LOCALES/(language+'.json');values=json.loads(file.read_text(encoding='utf-8'));values.update(results[language]);values.update(overrides.get(language,{}));values={key:values[key] for key in catalog}
            file.write_text(json.dumps(values,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        (LOCALES/'catalog.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        print('APPLIED',len(catalog),'keys across',len(LANGUAGES)+1,'languages',flush=True)

if __name__=='__main__': main()
