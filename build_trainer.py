#!/usr/bin/env python3
"""Deterministic standalone build and source ZIP; never reads private course inputs."""
import argparse,collections,json,pathlib,zipfile,hashlib
ROOT=pathlib.Path(__file__).resolve().parent
def validate(bank):
    questions=bank['questions']
    assert len(questions)==350
    assert [q['id'] for q in questions]==[f'Q{i:03d}' for i in range(1,351)]
    assert len(set(q['prompt'].casefold() for q in questions))==350
    limits=dict(zip('ABCDEF',[94,21,62,172,133,75]))
    sourceLimits={s[0]:limits[g] for g,s in zip('ABCDEF',bank['meta']['source_files'])}
    for n in range(1,8):
        block=[q for q in questions if q['block']==n]
        assert len(block)==50
        assert collections.Counter(q['type'] for q in block)=={'mc':25,'open':25}
    for q in questions:
        assert q['number']==int(q['id'][1:])
        assert q['prompt'] and q['model'] and q['plainExplanation']
        assert q['source'] in sourceLimits and q['filename']
        assert all(1<=p<=sourceLimits[q['source']] for p in q['sourcePages'])
        assert q['page'] in q['sourcePages']
        if q['type']=='mc':
            assert len(q['options'])==5 and 1<=sum(o['isCorrect'] for o in q['options'])<=4
            assert len(set(o['label'] for o in q['options']))==5
            assert all(o['reason'] for o in q['options'])
        else:assert len(q['keyPoints'])>=2 and len(q['criteria'])>=2 and all(q['criteria'])
def build(check=False):
    bank=json.loads((ROOT/'questions.json').read_text());validate(bank)
    text=(ROOT/'template.html').read_text()
    for token,name in [('__CSS__','styles.css'),('__APP__','app.js')]:
        assert text.count(token)==1;text=text.replace(token,(ROOT/name).read_text())
    assert text.count('__BANK__')==1
    text=text.replace('__BANK__',json.dumps(bank,ensure_ascii=False,separators=(',',':')).replace('</','<\\/'))
    payload=text.encode()
    if check:assert (ROOT/'index.html').read_bytes()==payload,'Stale index.html; rebuild'
    else:(ROOT/'index.html').write_bytes(payload)
    files=['index.html','questions.json','template.html','app.js','styles.css','build_trainer.py','README.md','.nojekyll','.gitignore','downloads/HSE_FinMarkets_Exam_Trainer_200.zip']
    files += sorted(str(p.relative_to(ROOT)) for p in (ROOT/'docs').glob('*.md'))
    files += sorted(str(p.relative_to(ROOT)) for p in (ROOT/'tests').glob('*') if p.is_file())
    target=ROOT/'downloads/HSE_FinMarkets_Exam_Trainer_350.zip'
    import io
    output=io.BytesIO()
    with zipfile.ZipFile(output,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
        for name in files:
            info=zipfile.ZipInfo(name,date_time=(2026,10,28,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o100644<<16
            z.writestr(info,(ROOT/name).read_bytes())
    if check:assert target.read_bytes()==output.getvalue(),'Stale source ZIP; rebuild'
    else:target.write_bytes(output.getvalue())
    print(json.dumps({'questions':350,'html_sha256':hashlib.sha256(payload).hexdigest(),'zip_sha256':hashlib.sha256(output.getvalue()).hexdigest(),'check':check}))
if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');build(parser.parse_args().check)
