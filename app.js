const $=s=>document.querySelector(s);
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const STORE='hse.finmarkets.350.v2', LEGACY_STORE='hse.finmarkets.200.v1';
const clone=x=>JSON.parse(JSON.stringify(x));
const blank=()=>({schemaVersion:2,answers:{},drafts:{},skipped:{},history:[],legacyArchive:{},activeBlock:0,position:0});
let storageProblem='', persistenceBlocked=false;
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const validSelection=x=>Array.isArray(x)&&x.every(i=>Number.isInteger(i)&&i>=0&&i<5)&&new Set(x).size===x.length;
function validAnswer(a,q){return object(a)&&(!q||a.type===q.type)&&['correct','partial','incorrect'].includes(a.grade)&&(a.type==='mc'?validSelection(a.selected):a.type==='open'&&typeof a.text==='string')}
function validArchive(entry){if(!object(entry)||!object(entry.question))return false;const q=entry.question;return typeof q.prompt==='string'&&validAnswer(entry.answer,q)&&(q.type!=='mc'||(Array.isArray(q.options)&&q.options.length===5&&q.options.every(o=>object(o)&&typeof o.label==='string')))}
function validState(x){
 if(!object(x)||x.schemaVersion!==2||!object(x.answers)||!object(x.drafts)||!object(x.skipped)||!Array.isArray(x.history)||!object(x.legacyArchive||{}))return false;
 for(const [id,a] of Object.entries(x.answers))if(!validAnswer(a,BANK.questions.find(q=>q.id===id)))return false;
 for(const [id,d] of Object.entries(x.drafts)){if(!object(d))return false;const q=BANK.questions.find(q=>q.id===id);if(q?.type==='mc'&&!validSelection(d.selected))return false;if(q?.type==='open'&&typeof d.text!=='string')return false}
 if(!Object.values(x.skipped).every(v=>typeof v==='boolean'))return false;
 if(!Object.values(x.legacyArchive||{}).every(validArchive))return false;
 return true;
}
function loadState(){
  let raw,old;
  try{raw=localStorage.getItem(STORE);old=localStorage.getItem(LEGACY_STORE)}catch{storageProblem='Браузер запретил локальное хранилище. Прогресс доступен только до закрытия страницы; используйте экспорт.';persistenceBlocked=true;return blank()}
  if(raw!==null){
    try{const x=JSON.parse(raw);if(validState(x))return x}catch{}
    storageProblem='Сохранённые данные V2 не удалось прочитать. Они сохранены без перезаписи. Используйте экспорт текущей сессии и проверьте настройки браузера.';persistenceBlocked=true;return blank();
  }
  if(old===null)return blank();
  let prepared;
  try{
    const legacy=JSON.parse(old);if(!object(legacy)||!object(legacy.answers))throw new Error('legacy');
    const next={...blank(),...clone(legacy),schemaVersion:2,drafts:{},skipped:{},legacyArchive:{},history:Array.isArray(legacy.history)?clone(legacy.history):[],legacyState:clone(legacy),migration:{from:LEGACY_STORE,at:new Date().toISOString()}};
    for(const id of BANK.meta.legacyReplacementIds){
      if(!next.answers[id])continue;
      const entry={answer:clone(next.answers[id]),question:clone(BANK.meta.legacyReplacements[id])};
      next.legacyArchive[id]=entry;
      next.history.push({kind:'legacyQuestionRetired',id,time:next.migration.at,...clone(entry)});
      delete next.answers[id];
    }
    next.history.push({kind:'migration',time:next.migration.at,from:LEGACY_STORE,retained:Object.keys(next.answers).length,archived:Object.keys(next.legacyArchive).length});
    if(!validState(next))throw new Error('invalidLegacy');
    prepared=next;
    const serialized=JSON.stringify(next);localStorage.setItem(STORE,serialized);
    if(localStorage.getItem(STORE)!==serialized)throw new Error('readback');
    return next;
  }catch{storageProblem='Не удалось перенести старый прогресс. Исходная запись V1 сохранена. При доступности данных они загружены для этой сессии; используйте экспорт.';
    persistenceBlocked=true;if(prepared)return prepared;return blank();}
}
let state=loadState(), selected=new Set(),draft='',current=null;
if(!Number.isInteger(state.activeBlock)||state.activeBlock<0||state.activeBlock>7)state.activeBlock=0;
if(!Number.isInteger(state.position)||state.position<0||state.position>49)state.position=0;
function notice(){ $('#storageNotice').innerHTML=storageProblem?`<div class="note error">${escape(storageProblem)}</div>`:'' }
function save(){if(persistenceBlocked){notice();return false}try{localStorage.setItem(STORE,JSON.stringify(state));return true}catch{storageProblem='Не удалось сохранить последние изменения в браузере. Они доступны в этой сессии; экспортируйте результаты перед закрытием.';notice();return false}}
const qs=n=>BANK.questions.filter(q=>q.block===n);
const qbyid=id=>BANK.questions.find(q=>q.id===id);
const score=a=>a?.grade==='correct'?1:a?.grade==='partial'?.5:0;
function stats(n){const list=qs(n),done=list.filter(q=>state.answers[q.id]);return {done:done.length,total:list.length,complete:done.length===50,score:done.reduce((s,q)=>s+score(state.answers[q.id]),0)}}
function record(kind,id,data={}){state.history.push({kind,id,time:new Date().toISOString(),...clone(data)})}
function button(label,fn,cls='btn'){const b=document.createElement('button');b.className=cls;b.textContent=label;b.onclick=fn;return b}
function mainTop(){window.scrollTo(0,0)}
function renderHome(){
  current=null;state.activeBlock=0;state.reviewIds=null;save();
  const done=BANK.questions.filter(q=>state.answers[q.id]).length;
  $('#main').innerHTML=`<section class="hero"><div class="pills"><span class="pill">350 вопросов</span><span class="pill">7 вариантов по 50</span><span class="pill">25 MC + 25 открытых в каждом</span></div><h1>Экзаменационный<br>тренажёр</h1><p>Финансовые рынки и институты. Разбирайте механизм, проверяйте ответ и возвращайтесь к сложным заданиям. Вариант 5 посвящён пробелам, законам и учебным кейсам; варианты 6 и 7 охватывают весь курс.</p></section><section class="panel"><div class="row between"><strong>Выберите вариант</strong><span class="small">${done}/350 отвечено</span></div><div class="bar"><div style="width:${done/350*100}%"></div></div><div class="grid" id="blocks"></div><div class="note">Вопрос можно пропустить без оценки и вернуться к нему позднее. После отправки сразу появляется разбор. Итог варианта доступен после всех 50 ответов. MC засчитывается только за полный верный набор.</div><div class="row"><button class="btn subtle" id="summaryBtn">Общая аналитика</button></div></section>`;
  for(let n=1;n<=7;n++){const x=stats(n),b=button('',()=>startBlock(n),'block');b.innerHTML=`<span>Вариант ${n}${n===5?' · кейсы и пробелы':''}</span><strong>${x.done}/50</strong><span>${x.complete?'Все ответы отправлены':'В процессе'}</span><div class="bar"><div style="width:${x.done*2}%"></div></div>`;$('#blocks').append(b)}
  $('#summaryBtn').onclick=renderSummary;
  if(Object.keys(state.legacyArchive||{}).length){const el=document.createElement('div');el.className='note';el.textContent='Три повторявшихся задания обновлены. Предыдущие ответы сохранены отдельно и не засчитываются как ответы на новые формулировки. ';el.append(button('История V1',renderLegacy,'btn subtle'));$('#blocks').parentElement.append(el)}mainTop();
}
function renderLegacy(){current=null;$('#main').innerHTML='<section class="hero"><h1>История обновлённых заданий V1</h1><p>Исходные ответы и оценки сохранены. Для новых заданий требуется новый ответ.</p></section><section class="panel" id="legacyAnswers"></section>';for(const [id,entry] of Object.entries(state.legacyArchive||{})){const q=entry.question,a=entry.answer,el=document.createElement('article');el.className='topicline';el.innerHTML=`<strong>${escape(id)} · прежняя формулировка</strong><p>${escape(q.prompt)}</p><p>${q.type==='mc'?'Выбрано: '+a.selected.map(i=>'ABCDE'[i]+'. '+q.options[i].label).map(escape).join('; '):escape(a.text)}</p><p>Прежняя оценка: ${escape(a.grade)} · ${score(a)} / 1${a.selfGraded?' · самооценка':''}</p>`;$('#legacyAnswers').append(el)}mainTop()}
function startBlock(n){state.activeBlock=n;state.reviewIds=null;const list=qs(n);const i=list.findIndex(q=>!state.answers[q.id]);state.position=i<0?0:i;save();renderQuestion();mainTop()}
function navigate(i){state.position=i;save();renderQuestion();mainTop()}
function renderNav(){
 const list=qs(state.activeBlock);const x=stats(state.activeBlock);
 const el=$('#questionNav');el.innerHTML=`<div class="row between"><strong>Вариант ${state.activeBlock} · ${x.done}/50 отвечено</strong><span class="small">Вопрос ${state.position+1}/50</span></div><div class="nav-grid" id="navGrid"></div><div class="legend"><span>□ Не отвечен</span><span>◷ Пропущен</span><span>✓ Отвечен</span></div><div class="row" style="margin-top:14px"><button class="btn outline" id="skippedBtn">Перейти к пропущенным</button><button class="btn" id="finishBtn" ${x.complete?'':'disabled'}>Завершить вариант</button></div>`;
 list.forEach((q,i)=>{const status=state.answers[q.id]?'answered':state.skipped[q.id]?'skipped':'unanswered';const label=status==='answered'?'Отвечен':status==='skipped'?'Пропущен':'Не отвечен';const b=button(`${i+1}${status==='answered'?' ✓':status==='skipped'?' ◷':''}`,()=>navigate(i),'nav-q '+status+(i===state.position?' current':''));b.setAttribute('aria-label',`Вопрос ${i+1}: ${label}`);if(i===state.position)b.setAttribute('aria-current','step');b.dataset.id=q.id;$('#navGrid').append(b)});
 $('#skippedBtn').onclick=goSkipped;$('#finishBtn').onclick=renderResults;
}
function goSkipped(){const list=qs(state.activeBlock);let i=list.findIndex(q=>state.skipped[q.id]&&!state.answers[q.id]);if(i<0)i=list.findIndex(q=>!state.answers[q.id]);if(i>=0)navigate(i)}
function renderQuestion(){
 const list=qs(state.activeBlock),q=list[state.position];if(!q){renderHome();return}current=q;
 const a=state.answers[q.id],d=state.drafts[q.id]||{};selected=new Set(a?.type==='mc'?a.selected:d.selected||[]);draft=a?.type==='open'?a.text||'':d.text||'';
 $('#main').innerHTML=`<section class="panel nav-panel" id="questionNav" aria-label="Навигация по вопросам"></section><section class="panel"><div class="qhead"><span class="qtype">${q.type==='mc'?'ВОПРОС С ВАРИАНТАМИ':'ОТКРЫТЫЙ ВОПРОС'} · ${q.id}</span><span class="small">${escape(q.subTopic)}</span></div><h2 class="question">${escape(q.prompt)}</h2><p class="small">${q.type==='mc'?'Отметьте все верные варианты. Их может быть от одного до четырёх.':'Ответьте в 1–3 предложениях с выводом и обоснованием.'}</p><div id="inputs"></div><div id="feedbackSlot" aria-live="polite"></div><div class="row" id="actions" style="margin-top:20px"></div><p id="answerHint" class="small"></p></section>`;
 renderNav();
 if(q.type==='mc')q.options.forEach((o,i)=>{const el=document.createElement('div');el.className='option';el.tabIndex=a?-1:0;el.setAttribute('role','checkbox');el.setAttribute('aria-checked',selected.has(i));el.setAttribute('aria-disabled',!!a);el.innerHTML=`<span class="letter">${'ABCDE'[i]}</span><span class="option-text">${escape(o.label)}</span>`;const toggle=()=>{if(state.answers[q.id])return;selected.has(i)?selected.delete(i):selected.add(i);state.drafts[q.id]={selected:[...selected]};save();renderSelected()};el.onclick=toggle;el.onkeydown=e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();toggle()}};$('#inputs').append(el)});
 else {const text=document.createElement('textarea');text.setAttribute('aria-label','Ваш ответ');text.placeholder='Ваш вывод и обоснование…';text.value=draft;text.disabled=!!a;text.oninput=()=>{draft=text.value;state.drafts[q.id]={text:draft};save()};$('#inputs').append(text)}
 renderSelected();if(a)showFeedback(q,a);else {$('#actions').append(button('Проверить ответ',()=>submit(q)),button('Пропустить',()=>skip(q),'btn outline'));$('#answerHint').textContent='Черновик сохраняется в этом браузере. Разбор откроется после отправки.';appendNavigation()}
}
function renderSelected(){if(current?.type==='mc')[...$('#inputs').children].forEach((e,i)=>{e.classList.toggle('selected',selected.has(i));e.setAttribute('aria-checked',selected.has(i))})}
function appendNavigation(){const a=$('#actions');if(state.position>0)a.append(button('← Предыдущий',()=>navigate(state.position-1),'btn subtle'));if(state.position<49)a.append(button('Следующий →',()=>navigate(state.position+1),'btn subtle'));else if(!stats(state.activeBlock).complete)a.append(button('Оставшиеся вопросы',renderIncomplete,'btn subtle'));else a.append(button('Результаты варианта',renderResults))}
function skip(q){if(state.answers[q.id])return;state.skipped[q.id]=true;record('skip',q.id);save();if(state.position<49)navigate(state.position+1);else renderIncomplete()}
function normal(s){return String(s||'').toLowerCase().normalize('NFKC').replace(/ё/g,'е').replace(/[^\p{L}\p{N}]+/gu,' ')}
function openRubric(q,text){const t=normal(text),hits=q.criteria.map(group=>group.some(term=>t.includes(normal(term))));const n=hits.filter(Boolean).length;return {hits,grade:n===hits.length&&text.trim().length>30?'correct':n===0?'incorrect':'partial'}}
function submit(q){
 if(state.answers[q.id])return;
 if(q.type==='mc'&&!selected.size){alert('Отметьте хотя бы один вариант или пропустите вопрос.');return}
 if(q.type==='open'&&draft.trim().length<12){alert('Добавьте содержательный ответ или пропустите вопрос.');return}
 let a;const time=new Date().toISOString();
 if(q.type==='mc'){const choices=[...selected].sort((a,b)=>a-b),correct=q.options.map((o,i)=>o.isCorrect?i:-1).filter(i=>i>=0);a={type:'mc',selected:choices,grade:choices.length===correct.length&&choices.every((x,i)=>x===correct[i])?'correct':'incorrect',time}}
 else {const x=openRubric(q,draft);a={type:'open',text:draft,grade:x.grade,autoGrade:x.grade,hits:x.hits,time}}
 state.answers[q.id]=a;delete state.skipped[q.id];delete state.drafts[q.id];record('submit',q.id,{answer:a});save();renderQuestion();$('#feedbackSlot').scrollIntoView({block:'start'});
}
function sourceMarkup(q){
 const extra=(q.additionalSources||[]).map(s=>'<br>Дополнительно: '+escape(s.source)+', PDF-слайды '+s.pages.map(escape).join(', ')+'.').join('');
 return `<div class="context"><strong>Источник:</strong> ${escape(q.source)}, PDF-слайд ${q.page}${q.sourcePages?.length>1?' (также '+q.sourcePages.join(', ')+')':''}.${q.sourceNote?'<br>'+escape(q.sourceNote):''}${extra}${q.legalReference?'<br>'+escape(q.legalReference.title)+'. Проверено: '+escape(q.legalReference.checkedAt)+'. '+[q.legalReference.url,...q.legalReference.additionalUrls||[]].map((url,i)=>'<a target="_blank" rel="noopener noreferrer" href="'+escape(url)+'">Правовой источник '+(i+1)+'</a>').join(' · '):''}</div>`
}
function showFeedback(q,a){
 const good=a.grade==='correct';let markup=`<div class="feedback"><h3 class="${good?'good':a.grade==='incorrect'?'bad':''}">${q.type==='open'?(a.selfGraded?'Самооценка: ':'Предварительно: '):''}${good?'Верно':a.grade==='partial'?'Частично':'Неверно'} · ${score(a)} / 1</h3><h4>Эталонный ответ</h4>`;
 if(q.type==='mc'){
  markup+=`<ul class="paper">${q.options.map((o,i)=>o.isCorrect?`<li><strong>${'ABCDE'[i]}.</strong> ${escape(o.label)}</li>`:'').join('')}</ul>`;
  [...$('#inputs').children].forEach((el,i)=>{el.classList.toggle('right',q.options[i].isCorrect);el.classList.toggle('wrong',!q.options[i].isCorrect&&a.selected.includes(i))});
 }else markup+=`<p class="paper">${escape(q.model)}</p>`;
 markup+=`<h4>Разъяснение простыми словами</h4><p>${escape(q.plainExplanation)}</p>`;
 if(q.type==='mc')markup+=`<details><summary>Почему варианты правильные или неправильные</summary><ol type="A">${q.options.map(o=>`<li><strong>${o.isCorrect?'Верно':'Неверно'}: ${escape(o.label)}</strong><br>${escape(o.reason)}</li>`).join('')}</ol></details>`;
 else {markup+=`<h4>Критерии зачёта</h4><ul>${q.keyPoints.map(t=>`<li>${escape(t)}</li>`).join('')}</ul>${q.commonMistake?'<p><strong>Типичная ошибка:</strong> '+escape(q.commonMistake)+'</p>':''}<p class="small">Проверка по ключевым словам предварительная: она не оценивает смысл как преподаватель. Сверьте вывод и объяснение с эталоном. Верно — 1; частично — 0,5; неверно — 0.</p><div class="row" id="selfgrade"></div>`}
 markup+=sourceMarkup(q)+'</div>';$('#feedbackSlot').innerHTML=markup;
 if(q.type==='open')for(const [label,grade] of [['Верно','correct'],['Частично','partial'],['Неверно','incorrect']])$('#selfgrade').append(button(label,()=>{state.answers[q.id].grade=grade;state.answers[q.id].selfGraded=true;record('selfGrade',q.id,{grade});save();showFeedback(q,state.answers[q.id])},a.grade===grade?'btn':'btn subtle'));
 $('#actions').innerHTML='';appendNavigation();$('#answerHint').textContent=q.type==='mc'?'Ответ сохранён. Строгая проверка полного набора.':'Ответ сохранён. Самооценку можно изменить.';
 renderNav();
}
function renderIncomplete(){const n=state.activeBlock,x=stats(n);if(x.complete){renderResults();return}current=null;$('#main').innerHTML=`<section class="panel"><h1>Осталось ответить на ${50-x.done} вопросов</h1><p>Пропуски не оцениваются. Итоговый балл откроется после всех 50 ответов.</p><div class="row" id="remainingActions"></div></section>`;$('#remainingActions').append(button('Перейти к пропущенным',goSkipped),button('Продолжить вариант',()=>startBlock(n),'btn subtle'));mainTop()}
function resetBlock(n){if(!confirm('Перезапустить только вариант '+n+'? Предыдущие ответы останутся в истории экспорта.'))return;const ids=qs(n).map(q=>q.id),answers=Object.fromEntries(ids.filter(id=>state.answers[id]).map(id=>[id,clone(state.answers[id])]));record('resetBlock',null,{block:n,answers});for(const id of ids){delete state.answers[id];delete state.drafts[id];delete state.skipped[id]}save();startBlock(n)}
function renderResults(){const n=state.activeBlock,x=stats(n);if(!x.complete){renderIncomplete();return}current=null;$('#main').innerHTML=`<section class="hero"><h1>Результат варианта ${n}</h1><p>Все 50 ответов отправлены. Оценки открытых ответов учитывают вашу самооценку.</p></section><section class="panel"><div class="results"><div class="metric"><strong>50/50</strong><span>Отвечено</span></div><div class="metric"><strong>${x.score.toFixed(1)} / 50</strong><span>Баллов</span></div><div class="metric"><strong>${Math.round(x.score/50*100)}%</strong><span>Итог</span></div></div><div id="topicStats"></div><div class="row" id="resultActions" style="margin-top:24px"></div></section>`;
 for(const group of 'ABCDEF'){const questions=qs(n).filter(q=>q.group===group);$('#topicStats').insertAdjacentHTML('beforeend',`<div class="topicline">${escape(questions[0].source)}: ${questions.reduce((s,q)=>s+score(state.answers[q.id]),0)} / ${questions.length}</div>`)}
 $('#resultActions').append(button('Просмотреть ответы',()=>navigate(0)),button('Заново весь вариант',()=>resetBlock(n),'btn outline'),button('Все варианты',renderHome,'btn subtle'));mainTop();
}
function renderSummary(){current=null;$('#main').innerHTML=`<section class="hero"><h1>Общая аналитика</h1><p>Для незавершённых вариантов показан только прогресс. Итоги каждого варианта доступны после 50 ответов.</p></section><section class="panel" id="overallBlocks"></section>`;
 for(let n=1;n<=7;n++){const x=stats(n),el=document.createElement('div');el.className='topicline';el.innerHTML=`<div class="row between"><strong>Вариант ${n}</strong><span>${x.done}/50 отвечено${x.complete?' · '+x.score.toFixed(1)+' / 50 баллов':' · итог скрыт'}</span></div><div class="row" id="summaryActions${n}"></div>`;$('#overallBlocks').append(el);const actions=$('#summaryActions'+n);actions.append(button(x.complete?'Результаты':'Продолжить',()=>{state.activeBlock=n;if(x.complete)renderResults();else startBlock(n)},'btn subtle'),button('Перезапустить',()=>resetBlock(n),'btn outline'))}mainTop();
}
function exportData(){return {schemaVersion:2,exportedAt:new Date().toISOString(),course:BANK.meta.title,questions:350,questionBank:BANK.questions.map(q=>({id:q.id,block:q.block,type:q.type,question:q.prompt,topic:q.subTopic,sourceVersion:q.sourceVersion})),answers:Object.fromEntries(Object.entries(state.answers).map(([k,v])=>[k,{...clone(v),question:qbyid(k)?.prompt,topic:qbyid(k)?.subTopic}])),drafts:clone(state.drafts),skipped:clone(state.skipped),history:clone(state.history),legacyArchive:clone(state.legacyArchive||{}),migration:state.migration?clone(state.migration):null,legacyState:state.legacyState?clone(state.legacyState):null,blocks:Array.from({length:7},(_,i)=>{const x=stats(i+1);return {block:i+1,answered:x.done,complete:x.complete,score:x.complete?x.score:null}})}}
$('#exportBtn').onclick=()=>{const blob=new Blob([JSON.stringify(exportData(),null,2)],{type:'application/json;charset=utf-8'}),u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download='hse_finmarkets_exam_results_v2.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),3000)};
$('#homeBtn').onclick=renderHome;notice();if(state.activeBlock)renderQuestion();else renderHome();
