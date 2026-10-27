"""Run: python3 -m unittest discover -s tests -v. No private course inputs needed."""
import collections,hashlib,importlib.util,json,pathlib,re,unittest,zipfile
ROOT=pathlib.Path(__file__).resolve().parents[1]
SPEC=importlib.util.spec_from_file_location('builder',ROOT/'build_trainer.py');builder=importlib.util.module_from_spec(SPEC);SPEC.loader.exec_module(builder)
class BankTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.bank=json.loads((ROOT/'questions.json').read_text())
        with zipfile.ZipFile(ROOT/'downloads/HSE_FinMarkets_Exam_Trainer_200.zip') as z:cls.old=json.loads(z.read('questions.json'))
    def test_structure_and_sources(self):
        builder.validate(self.bank)
        for n,counts in [(5,[8,7,7,10,8,10]),(6,[8,8,8,9,9,8]),(7,[8,8,8,9,9,8])]:
            self.assertEqual(collections.Counter(q['group'] for q in self.bank['questions'] if q['block']==n),dict(zip('ABCDEF',counts)))
    def test_baseline_compatibility_and_authorized_replacements(self):
        replacements={'Q043','Q151','Q181'}
        for old,new in zip(self.old['questions'],self.bank['questions'][:200]):
            self.assertEqual((old['id'],old['number'],old['block'],old['type']),(new['id'],new['number'],new['block'],new['type']))
            if old['id'] in replacements:
                self.assertEqual(self.bank['meta']['legacyReplacements'][old['id']],old)
                self.assertNotEqual(old['prompt'],new['prompt'])
            elif old['type']=='mc':self.assertEqual(old['options'],[{k:o[k] for k in ['label','isCorrect']} for o in new['options']])
        self.assertEqual(hashlib.sha256((ROOT/'downloads/HSE_FinMarkets_Exam_Trainer_200.zip').read_bytes()).hexdigest(),'7c4a17bb478d38604d018e739cf9b3528ba1c77313948155d52a381c711d47ef')
    def test_no_exact_duplicates_and_varied_new_keys(self):
        questions=self.bank['questions']
        normalized=[re.sub(r'\W+','',q['prompt'].casefold()) for q in questions]
        self.assertEqual(len(set(normalized)),350)
        self.assertEqual(len(set(q['skill'] for q in questions)),350)
        keys=[q for q in questions if q['sourceVersion']==2 and q['type']=='mc']
        self.assertEqual(set(sum(o['isCorrect'] for o in q['options']) for q in keys),{1,2,3,4})
        self.assertTrue(any(not q['options'][0]['isCorrect'] for q in keys))
        self.assertTrue(any(q['options'][4]['isCorrect'] for q in keys))
    def test_reproducible_html_and_zip(self):
        builder.build(check=True)
        with zipfile.ZipFile(ROOT/'downloads/HSE_FinMarkets_Exam_Trainer_350.zip') as z:
            self.assertIsNone(z.testzip())
            self.assertEqual(z.read('index.html'),(ROOT/'index.html').read_bytes())
            self.assertEqual(z.read('questions.json'),(ROOT/'questions.json').read_bytes())
            self.assertFalse(any(n.lower().endswith(('.pdf','.xlsx','.xls','.env')) for n in z.namelist()))
    def test_standalone_runtime(self):
        html=(ROOT/'index.html').read_text()
        self.assertNotRegex(html,r'<script[^>]+src=')
        self.assertNotRegex((ROOT/'app.js').read_text(),r'\b(fetch|XMLHttpRequest|WebSocket)\s*\(')
        self.assertEqual(html.count('<script>'),1)
if __name__=='__main__':unittest.main()
