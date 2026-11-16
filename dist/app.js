(() => {
  'use strict';
  const content = window.PORTFOLIO_CONTENT;
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const storageKey = 'marginalia-portfolio-v1';
  const groups = { identity: ['whirlwind', 'odyssey', 'genji'], society: ['panchatantra', 'mahabharata', 'iliad', 'roland', 'genji'], journey: ['ramayana', 'odyssey', 'whirlwind'] };
  const defaultFavorite = {"work":"odyssey","deck":"The longest journey is learning what it really means to come home.","overview":"After the Trojan War, Odysseus spends years struggling to return to Ithaca. Monsters, temptations, and divine conflict delay him, while Penelope and Telemachus face their own trials at home. The epic turns a voyage into a searching question about identity, belonging, and responsibility.","reasons":"I would choose The Odyssey because its idea of achievement reaches beyond winning a conflict. Odysseus has already helped defeat Troy, yet that victory does not give him a settled life. He must still learn how to return, how to recognize the people who matter to him, and how to recover his place without assuming that the world has waited unchanged. That makes the epic meaningful to a student approaching the end of a degree: finishing a major task is a beginning as well as an ending.\n\nI am drawn to the tension between intelligence and restraint. The escape from the Cyclops depends on cleverness, but Odysseus’s desire to announce his name creates a new danger. The same person can solve an immediate problem and damage the larger goal. This is a useful challenge to any simple definition of competence. Being capable requires attention to consequences, rather than confidence alone.","lessons":"Homecoming, endurance, identity, and hospitality give the epic its emotional depth. Penelope’s careful questioning shows that trust can involve both love and judgment. Her test of the marriage bed makes recognition depend on shared knowledge, not simply on a convincing appearance. Telemachus also develops through asking questions and learning how to act in uncertain circumstances.\n\nHospitality is especially striking because the treatment of a stranger reveals the moral character of a household. A visitor’s status may be hidden, so care cannot depend entirely on knowing whom one is helping. At the same time, the poem’s violence and unequal treatment of servants deserve scrutiny. Appreciating an ancient work includes noticing the boundaries of its moral vision. These complications make The Odyssey more valuable to discuss, rather than less.","connection":"As a fourth-year BSCIS student, I can connect the epic’s questions to the transition from completing academic requirements to taking responsibility for work that affects others. A solution may be technically clever while still creating new problems if its wider consequences are ignored. Odysseus’s encounter with the Cyclops gives me a concrete literary example of that difference.\n\nThe idea of homecoming also encourages me to think about what success is meant to serve. Skills, recognition, and future opportunities matter more when they support a meaningful life and responsible relationships. I would personalize this reflection further with a real project or decision from my own experience. The lesson I want to carry forward is to combine resourcefulness with humility: understand the destination, consider the people affected, and be willing to change the route.","themes":"Homecoming, Identity, Responsibility","custom":false};
  const emptyState = () => ({ version: 1, profile: { ...content.profile }, analyses: {}, favorite: { ...defaultFavorite }, learning: content.learning.map(x => ({...x, custom:false})), reflection: content.reflection.map(x => ({...x, custom:false})) });
  let state = emptyState();
  let draft;
  let currentFilter = 'all';
  let isList = true;
  let currentReading = 0;
  let currentWriting = 'whirlwind';
  let photoRemoved = false;
  let storageUnavailable = false;
  let publishedReady = Promise.resolve();

  function validatedState(value) {
    if (!value || typeof value !== 'object' || value.version !== 1) throw new Error('Choose a Marginalia portfolio backup (version 1).');
    const next = emptyState();
    const strings = (target, source, keys, max = 50000) => {
      if (!source || typeof source !== 'object') return;
      keys.forEach(key => { if (typeof source[key] === 'string') target[key] = source[key].slice(0,max); });
    };
    strings(next.profile, value.profile, ['name','course','section'], 160);
    strings(next.profile, value.profile, ['intro','interests','expectation']);
    if (typeof value.profile?.photo === 'string' && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value.profile.photo) && value.profile.photo.length < 2900000) next.profile.photo = value.profile.photo;
    content.analyses.forEach(original => {
      const input = value.analyses?.[original.id];
      if (!input || typeof input !== 'object') return;
      const item = {};
      strings(item, input, ['title','author','year','lens'], 250);
      strings(item, input, ['shortDescription','overview']);
      if (Array.isArray(input.sections) && input.sections.length > 0 && input.sections.length <= 30) item.sections = input.sections.map(section => ({heading: String(section.heading ?? '').slice(0,250), paragraphs: Array.isArray(section.paragraphs) ? section.paragraphs.slice(0,40).filter(x=>typeof x==='string').map(x=>x.slice(0,50000)) : []}));
      if (Array.isArray(input.sources)) item.sources = input.sources.slice(0,20).filter(s=>s && typeof s.url==='string' && /^https?:\/\//i.test(s.url)).map(s=>({label:String(s.label??s.url).slice(0,250),url:s.url.slice(0,2000)}));
      item.custom = input.custom === true;
      next.analyses[original.id] = item;
    });
    strings(next.favorite, value.favorite, ['deck','overview','reasons','lessons','connection','themes']);
    if (content.analyses.some(x=>x.id===value.favorite?.work)) next.favorite.work = value.favorite.work;
    next.favorite.custom = value.favorite?.custom === true;
    ['learning','reflection'].forEach(key => {
      const expected = key === 'learning' ? 4 : 5;
      if (!Array.isArray(value[key]) || value[key].length !== expected) return;
      next[key] = next[key].map((base,i) => {
        const item = {...base};
        strings(item,value[key][i],['title','body']);
        item.custom = value[key][i]?.custom === true;
        return item;
      });
    });
    return next;
  }

  function loadLocal() {
    try { const saved = localStorage.getItem(storageKey); if (saved) state = validatedState(JSON.parse(saved)); }
    catch { storageUnavailable = true; }
  }
  loadLocal();
  const analyses = () => content.analyses.map(book=>({...book,...state.analyses[book.id]}));
  const cover = (book, favorite = false) => `<div class="cover-shell"><img src="assets/covers/${book.id}.svg" alt="" ${favorite?'':'loading="lazy"'} width="600" height="800"><div class="cover-copy"><span class="cover-number">${book.number} / GREAT BOOKS</span><span class="cover-title">${escapeHTML(book.title)}</span><span class="cover-author">${escapeHTML(book.author)}</span><span class="cover-edition">THE LITERARY COLLECTION</span></div></div>`;

  function renderBooks() {
    const shown = analyses().filter(b=>currentFilter==='all'||groups[currentFilter].includes(b.id));
    $('#book-grid').classList.toggle('list-view',isList);
    $('#book-grid').innerHTML = shown.map(book=>`<article class="book-card"><button class="book-cover-button" data-read="${book.id}" aria-label="Read ${escapeHTML(book.title)} literary analysis">${cover(book)}<span class="book-hover"><span>Open the reading ↗</span></span></button><div class="book-info"><div class="book-info-top"><span class="lens-tag">${escapeHTML(book.lens)} lens</span><span class="book-number">${book.number}</span></div><button class="book-title-button" data-read="${book.id}">${escapeHTML(book.title)}</button><p class="book-author">${escapeHTML(book.author)}</p><p class="book-description">${escapeHTML(book.shortDescription)}</p><div class="book-footer"><span>${escapeHTML(book.readTime)}</span><button data-read="${book.id}" aria-label="Read analysis of ${escapeHTML(book.title)}">Read analysis ↗</button></div></div></article>`).join('');
    $('#filter-count').textContent = currentFilter==='all'?`Showing all ${content.analyses.length} masterpieces`:`Showing ${shown.length} of ${content.analyses.length} masterpieces`;
    $('#collection-sample-note').hidden = analyses().every(x=>x.custom);
  }
  function renderProfile() {
    const p=state.profile;
    $('#student-meta').innerHTML = `${escapeHTML(p.name||'YOUR NAME')} <span>·</span> ${escapeHTML([p.course,p.section].filter(Boolean).join(' · ')||'COURSE, YEAR & SECTION')}`;
    if(p.name) $('#about-title').innerHTML=`Hello, I’m <em>${escapeHTML(p.name.split(' ')[0])}.</em>`;
    else $('#about-title').innerHTML='A reader in <em>the making.</em>';
    ['intro','interests','expectation'].forEach(key=>{
      const el=$(`#profile-${key}`);
      if(!el.dataset.default) el.dataset.default=el.textContent;
      el.textContent=p[key]||el.dataset.default;
    });
    const portrait=$('#profile-portrait');
    if(!portrait.dataset.default) portrait.dataset.default=portrait.innerHTML;
    portrait.innerHTML=p.photo?`<img src="${p.photo}" alt="Portrait of ${escapeHTML(p.name||'the portfolio author')}">`:portrait.dataset.default;
    $('.about-edit').innerHTML=p.name?'Edit your introduction <span aria-hidden="true">↗</span>':'Introduce yourself <span aria-hidden="true">↗</span>';
  }
  function renderFavorite() {
    const f=state.favorite;
    const book=analyses().find(b=>b.id===f.work);
    $('#favorite-cover').innerHTML=cover(book,true);
    $('#favorite-title').textContent=book.title;
    $('#favorite-author').textContent=`${book.author} · ${book.year}`;
    $('#favorite-deck').textContent=f.deck;
    $('#favorite-description').textContent=f.overview;
    $('.favorite-themes').innerHTML=f.themes.split(',').map(s=>s.trim()).filter(Boolean).map(t=>`<span>${escapeHTML(t)}</span>`).join('');
    $('#favorite-sample').hidden=f.custom;
    $('.favorite .handwritten').hidden=f.work!=='odyssey';
  }
  function renderLearning() {
    const icons=['◎','⌘','✧','↗'];
    $('#learning-grid').innerHTML=state.learning.map((item,i)=>`<article class="learning-card"><div class="learning-icon" aria-hidden="true">${icons[i]}<span>0${i+1}</span></div><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.body)}</p></article>`).join('');
    $('#learning-sample').hidden=state.learning.every(x=>x.custom);
  }
  function renderReflection() {
    $('#reflection-questions').innerHTML=state.reflection.map((item,i)=>`<details class="reflection-item" ${i===0?'open':''}><summary><span>0${i+1}</span><span>${escapeHTML(item.title)}</span><span aria-hidden="true">+</span></summary><div class="reflection-answer"><strong>${escapeHTML(content.reflection[i].question)}</strong><p>${escapeHTML(item.body)}</p></div></details>`).join('');
    $('#reflection-sample').hidden=state.reflection.every(x=>x.custom);
  }
  function renderAll(){renderBooks();renderProfile();renderFavorite();renderLearning();renderReflection();}

  function readBook(id, updateHash=true) {
    const all=analyses();
    const book=all.find(b=>b.id===id);
    if(!book)return;
    currentReading=all.indexOf(book);
    $('#reader-body').innerHTML=`<div class="reader-eyebrow"><span>${book.number} / THE LITERARY COLLECTION</span><span class="lens-tag">${escapeHTML(book.lens)} lens</span></div><h1 id="reader-title">${escapeHTML(book.title)}</h1><p class="reader-byline">${escapeHTML(book.author)} · ${escapeHTML(book.year)} <span aria-hidden="true">/</span> ${escapeHTML(book.readTime)}</p>${book.custom?'':`<p class="reader-sample">AI-assisted draft. Review this interpretation against your class text and add your own insights before submitting.</p>`}<p class="reader-intro">${escapeHTML(book.overview)}</p>${book.sections.map(s=>`<section class="reader-section"><h2>${escapeHTML(s.heading)}</h2>${s.paragraphs.map(p=>`<p>${escapeHTML(p)}</p>`).join('')}</section>`).join('')}<section class="reader-sources"><h2>Text & reference</h2>${book.sources?.length?book.sources.map(s=>`<a href="${escapeHTML(s.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(s.label)} ↗</a>`).join(''):'<p>Add the sources used in your analysis through the portfolio editor.</p>'}</section>`;
    $('#reader-position').textContent=`${currentReading+1} of ${all.length}`;
    $('#previous-analysis').disabled=currentReading===0;
    $('#next-analysis').disabled=currentReading===all.length-1;
    $('#reader-dialog').scrollTop=0;
    if(!$('#reader-dialog').open)$('#reader-dialog').showModal();
    if(updateHash)history.replaceState(null,'',`#reading/${id}`);
  }
  function readFavorite() {
    const f=state.favorite, book=analyses().find(x=>x.id===f.work);
    currentReading=-1;
    $('#reader-body').innerHTML=`<div class="reader-eyebrow">THE ONE THAT STAYED WITH ME</div><h1 id="reader-title">${escapeHTML(book.title)}</h1><p class="reader-byline">${escapeHTML(book.author)} · ${escapeHTML(book.year)}</p>${f.custom?'':'<p class="reader-sample">AI-assisted draft favorite. Personalize these reasons and connections to match your own reading experience.</p>'}<p class="reader-intro">${escapeHTML(f.deck)}</p>${[{heading:'The story, in brief',body:f.overview},{heading:'Why this masterpiece',body:f.reasons},{heading:'Themes, characters & lessons',body:f.lessons},{heading:'A personal connection',body:f.connection}].map(s=>`<section class="reader-section"><h2>${escapeHTML(s.heading)}</h2>${s.body.split(/\n\s*\n/).map(p=>`<p>${escapeHTML(p)}</p>`).join('')}</section>`).join('')}<section class="reader-sources"><h2>Another way into the story</h2><button class="text-link" data-read="${book.id}">Read the full ${escapeHTML(book.lens.toLowerCase())} analysis ↗</button></section>`;
    $('#reader-position').textContent='A personal favorite';
    $('#previous-analysis').disabled=true;$('#next-analysis').disabled=true;
    if(!$('#reader-dialog').open)$('#reader-dialog').showModal();
    $('#reader-dialog').scrollTop=0;
    history.replaceState(null,'','#reading/favorite');
  }

  function closeReader(){
    $('#reader-dialog').close();
    if(location.hash.startsWith('#reading/'))history.replaceState(null,'',currentReading===-1?'#favorite':'#collection');
  }
  document.addEventListener('click',event=>{
    const read=event.target.closest('[data-read]');
    if(read)readBook(read.dataset.read);
    const edit=event.target.closest('[data-edit]');
    if(edit)openEditor(edit.dataset.edit||'profile');
  });
  $$('.filter').forEach(button=>button.addEventListener('click',()=>{
    currentFilter=button.dataset.filter;
    $$('.filter').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));});
    renderBooks();
  }));
  $('.view-toggle').addEventListener('click',()=>{
    isList=!isList;renderBooks();
    const title=isList?'Switch to grid view':'Switch to list view';
    $('.view-toggle').setAttribute('aria-label',title);$('.view-toggle').title=title;
    $('.view-toggle').innerHTML=isList?'<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" stroke="currentColor" stroke-width="1.3"/></svg>':'<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M8 6h13M8 12h13M8 18h13M3 6h1M3 12h1M3 18h1" stroke="currentColor" stroke-width="1.5"/></svg>';
  });
  $('.close-reader').addEventListener('click',closeReader);
  $('.reader-brand').addEventListener('click',closeReader);
  $('#reader-dialog').addEventListener('cancel',event=>{event.preventDefault();closeReader();});
  $('#previous-analysis').addEventListener('click',()=>readBook(analyses()[currentReading-1]?.id));
  $('#next-analysis').addEventListener('click',()=>readBook(analyses()[currentReading+1]?.id));
  $('#favorite-read').addEventListener('click',readFavorite);
  $('.menu-toggle').addEventListener('click',()=>{
    const open=$('.menu-toggle').getAttribute('aria-expanded')!=='true';
    $('.menu-toggle').setAttribute('aria-expanded',String(open));$('.menu-toggle').setAttribute('aria-label',open?'Close navigation':'Open navigation');$('#mobile-nav').hidden=!open;
  });
  $$('#mobile-nav a').forEach(link=>link.addEventListener('click',()=>{$('#mobile-nav').hidden=true;$('.menu-toggle').setAttribute('aria-expanded','false');$('.menu-toggle').setAttribute('aria-label','Open navigation');}));
  $('#credits-button').addEventListener('click',()=>$('#credits-dialog').showModal());
  $('.close-credits').addEventListener('click',()=>$('#credits-dialog').close());
  $$('dialog').forEach(dialog=>dialog.addEventListener('click',event=>{
    if(event.target!==dialog)return;
    const r=dialog.getBoundingClientRect();
    if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom){if(dialog.id==='reader-dialog')closeReader();else dialog.close();}
  }));

  function field(label,name,value,rows=3,help='') {
    return `<label>${escapeHTML(label)}<textarea name="${name}" rows="${rows}">${escapeHTML(value)}</textarea>${help?`<small>${escapeHTML(help)}</small>`:''}</label>`;
  }
  function input(label,name,value){return `<label>${escapeHTML(label)}<input name="${name}" value="${escapeHTML(value)}"></label>`;}
  function sectionsToText(sections){return sections.map(s=>`## ${s.heading}\n\n${s.paragraphs.join('\n\n')}`).join('\n\n');}
  function textToSections(text){
    const sections=[];
    text.split(/\n(?=##\s)/).forEach(chunk=>{
      const lines=chunk.trim().split('\n');
      const hasHeading=/^##\s/.test(lines[0]);
      const heading=hasHeading?lines.shift().replace(/^##\s+/,''):'Analysis';
      const paragraphs=lines.join('\n').trim().split(/\n\s*\n/).filter(x=>x.trim());
      if(paragraphs.length)sections.push({heading,paragraphs});
    });
    return sections;
  }
  function renderWritingFields(){
    const key=currentWriting, box=$('#writing-fields');
    if(key==='learning'){
      box.innerHTML='<p class="writing-section-description">Summarize what you actually learned. Use the four themes below, or give each one your own title.</p>'+draft.learning.map((x,i)=>input(`Learning ${i+1}: title`,`learning-title-${i}`,x.title)+field('What I learned',`learning-body-${i}`,x.body,4)).join('');
    } else if(key==='reflection'){
      box.innerHTML='<p class="writing-section-description">Answer each guide question with a specific experience from your Great Books course.</p>'+draft.reflection.map((x,i)=>input(`Reflection ${i+1}: heading`,`reflection-title-${i}`,x.title)+field(content.reflection[i].question,`reflection-body-${i}`,x.body,5)).join('');
    } else if(key==='favorite'){
      const f=draft.favorite;
      box.innerHTML=`<label>My favorite work<select name="favorite-work">${content.analyses.map(b=>`<option value="${b.id}" ${f.work===b.id?'selected':''}>${escapeHTML(draft.analyses[b.id]?.title||b.title)}</option>`).join('')}</select></label>`+field('A one-sentence introduction','favorite-deck',f.deck,2)+field('Brief overview','favorite-overview',f.overview,3)+field('Why I chose this masterpiece','favorite-reasons',f.reasons,6)+field('Significant themes, characters & lessons','favorite-lessons',f.lessons,6)+field('My personal connection or realization','favorite-connection',f.connection,5)+input('Themes, separated by commas','favorite-themes',f.themes);
      $('[name="favorite-work"]',box).addEventListener('change',event=>{
        const book={...content.analyses.find(b=>b.id===event.target.value),...draft.analyses[event.target.value]};
        $('[name="favorite-overview"]',box).value=book.overview;
        $('[name="favorite-deck"]',box).value=book.shortDescription;
        $('[name="favorite-themes"]',box).value=book.lens;
        ['reasons','lessons','connection'].forEach(k=>$(`[name="favorite-${k}"]`,box).value='');
      });
    } else {
      const book={...content.analyses.find(b=>b.id===key),...draft.analyses[key]};
      box.innerHTML='<p class="writing-section-description">Review and personalize the draft analysis. You can change the title, author, and literary lens to match your course. The illustrated cover stays with this collection slot.</p>'+`<div class="form-two">${input('Title','analysis-title',book.title)}${input('Author','analysis-author',book.author)}</div><div class="form-two">${input('Publication date','analysis-year',book.year)}${input('Literary lens','analysis-lens',book.lens)}</div>`+field('Short description for the bookshelf','analysis-description',book.shortDescription,2)+field('Overview or central argument','analysis-overview',book.overview,4)+field('Complete literary analysis','analysis-body',sectionsToText(book.sections),16,'Start each section heading with ## and separate paragraphs with a blank line.')+field('Sources & references','analysis-sources',(book.sources||[]).map(s=>`${s.label} | ${s.url}`).join('\n'),3,'One source per line: source title | https://example.com');
    }
  }
  function captureWriting(){
    if(!draft)return;
    const key=currentWriting, box=$('#writing-fields');
    const value=name=>$(`[name="${name}"]`,box)?.value.trim()||'';
    if(key==='learning'||key==='reflection'){
      draft[key]=draft[key].map((item,i)=>{
        const title=value(`${key}-title-${i}`),body=value(`${key}-body-${i}`);
        return {...item,title,body,custom:item.custom||title!==item.title||body!==item.body};
      });
    }else if(key==='favorite'){
      const before=JSON.stringify(draft.favorite);
      const f=draft.favorite;
      ['deck','overview','reasons','lessons','connection','themes'].forEach(k=>f[k]=value(`favorite-${k}`));
      f.work=value('favorite-work');
      if(before!==JSON.stringify(f))f.custom=true;
    }else{
      const original=content.analyses.find(b=>b.id===key), prior={...original,...draft.analyses[key]};
      const next={title:value('analysis-title')||prior.title,author:value('analysis-author')||prior.author,year:value('analysis-year'),lens:value('analysis-lens')||prior.lens,shortDescription:value('analysis-description'),overview:value('analysis-overview'),sections:textToSections(value('analysis-body')),sources:value('analysis-sources').split('\n').map(line=>{const split=line.indexOf('|');return split>=0?{label:line.slice(0,split).trim(),url:line.slice(split+1).trim()}:{label:line.trim(),url:line.trim()};}).filter(s=>/^https?:\/\//i.test(s.url))};
      if(!next.sections.length)next.sections=[{heading:'Analysis',paragraphs:['Add your literary analysis here.']}];
      const changed=Object.keys(next).some(k=>JSON.stringify(next[k])!==JSON.stringify(prior[k]));
      if(changed||prior.custom)draft.analyses[key]={...next,custom:changed||!!prior.custom};
    }
  }
  function setTab(tab){
    $$('.editor-tabs>button').forEach(button=>{const active=button.dataset.tab===tab;button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;});
    ['profile','writing','backup'].forEach(key=>$(`#${key}-panel`).hidden=key!==tab);
  }
  async function openEditor(tab){
    await publishedReady;
    draft=structuredClone(state);photoRemoved=false;
    const form=$('#portfolio-form');form.reset();
    ['name','course','section','intro','interests','expectation'].forEach(key=>form.elements[key].value=draft.profile[key]||'');
    $('#analysis-options').innerHTML=analyses().map(b=>`<option value="${b.id}">${b.number} · ${escapeHTML(b.title)}</option>`).join('');
    currentWriting='whirlwind';$('#writing-select').value=currentWriting;renderWritingFields();
    $('#remove-photo').hidden=!draft.profile.photo;
    $('#editor-status').textContent=storageUnavailable?'Browser saving is unavailable. Export a backup to keep edits.':'Your work belongs here.';
    $('#editor-status').classList.remove('editor-status-error');
    setTab(['profile','writing','backup'].includes(tab)?tab:'profile');
    $('#editor-dialog').showModal();$('#editor-dialog').scrollTop=0;
  }
  $('.close-editor').addEventListener('click',()=>$('#editor-dialog').close());
  $$('.editor-tabs>button').forEach(button=>{
    button.addEventListener('click',()=>setTab(button.dataset.tab));
    button.addEventListener('keydown',event=>{
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
      event.preventDefault();const tabs=$$('.editor-tabs>button');const index=tabs.indexOf(button);
      const next=event.key==='Home'?0:event.key==='End'?2:(index+(event.key==='ArrowRight'?1:2))%3;
      setTab(tabs[next].dataset.tab);tabs[next].focus();
    });
  });
  $('#writing-select').addEventListener('change',event=>{captureWriting();currentWriting=event.target.value;renderWritingFields();});
  $('#remove-photo').addEventListener('click',()=>{photoRemoved=true;delete draft.profile.photo;$('#portfolio-form').elements.photo.value='';$('#remove-photo').hidden=true;$('#editor-status').textContent='Photo will be removed when you save.';});
  const fileToDataURL=file=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('Could not read that photograph.'));reader.readAsDataURL(file);});
  async function captureProfile(){
    const form=$('#portfolio-form');
    ['name','course','section','intro','interests','expectation'].forEach(key=>draft.profile[key]=form.elements[key].value.trim());
    const photo=form.elements.photo.files[0];
    if(photo){
      if(!['image/jpeg','image/png','image/webp'].includes(photo.type))throw new Error('Choose a JPG, PNG, or WebP photograph.');
      if(photo.size>2*1024*1024)throw new Error('Choose a photograph smaller than 2 MB.');
      draft.profile.photo=await fileToDataURL(photo);
    }else if(photoRemoved)delete draft.profile.photo;
  }
  function persist(next){
    state=validatedState(next);
    try{localStorage.setItem(storageKey,JSON.stringify(state));storageUnavailable=false;return true;}
    catch{storageUnavailable=true;return false;}
  }
  $('#portfolio-form').addEventListener('submit',async event=>{
    event.preventDefault();
    try{
      captureWriting();await captureProfile();
      const saved=persist(draft);renderAll();
      if(saved){$('#editor-dialog').close();toast('Your portfolio draft is saved in this browser.');}
      else{$('#editor-status').textContent='Edits are visible, but browser storage is full or unavailable. Export a backup now.';$('#editor-status').classList.add('editor-status-error');}
    }catch(error){$('#editor-status').textContent=error.message;$('#editor-status').classList.add('editor-status-error');}
  });
  $('#export-portfolio').addEventListener('click',async()=>{
    try{captureWriting();await captureProfile();const backup=validatedState(draft);const blob=new Blob([JSON.stringify(backup,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='portfolio.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);$('#editor-status').textContent='Backup exported. Keep portfolio.json somewhere safe.';}
    catch(error){$('#editor-status').textContent=error.message;}
  });
  $('#import-portfolio').addEventListener('change',async event=>{
    const file=event.target.files[0];if(!file)return;
    try{
      if(file.size>5*1024*1024)throw new Error('Choose a portfolio backup smaller than 5 MB.');
      const next=validatedState(JSON.parse(await file.text()));
      const saved=persist(next);renderAll();
      if(saved){$('#editor-dialog').close();toast('Your portfolio backup has been restored.');}
      else{await openEditor('backup');$('#editor-status').textContent='Restored for this visit. Browser saving is unavailable; keep your backup.';}
    }catch(error){$('#editor-status').textContent=error instanceof SyntaxError?'This file is not a valid JSON backup.':error.message;$('#editor-status').classList.add('editor-status-error');}
    event.target.value='';
  });
  let toastTimeout;
  function toast(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>$('#toast').classList.remove('visible'),4300);}
  let scrollFrame=false;
  addEventListener('scroll',()=>{
    if(scrollFrame)return;scrollFrame=true;
    requestAnimationFrame(()=>{const height=document.documentElement.scrollHeight-innerHeight;$('.reading-progress span').style.width=`${height>0?(scrollY/height)*100:0}%`;scrollFrame=false;});
  },{passive:true});
  if('IntersectionObserver' in window){
    const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){$$('.main-nav a').forEach(link=>link.classList.toggle('current',link.hash===`#${entry.target.id}`));}});},{rootMargin:'-15% 0px -60% 0px'});
    $$('main>section[id]').forEach(section=>observer.observe(section));
  }
  function openHash(){const id=location.hash.replace('#reading/','');if(!location.hash.startsWith('#reading/')){if($('#reader-dialog').open)$('#reader-dialog').close();return;}if(id==='favorite')readFavorite();else readBook(id,false);}
  addEventListener('hashchange',openHash);
  renderAll();openHash();
  // The optional file is created by exporting a portfolio and adding it to dist/.
  // Local drafts take priority, so edits are never overwritten on refresh.
  if(!localStorageHasDraft()){
    publishedReady = fetch('portfolio.json',{cache:'no-cache'}).then(response=>response.ok?response.json():null).then(value=>{if(value&&!localStorageHasDraft()){state=validatedState(value);renderAll();openHash();}}).catch(()=>{});
  }
  function localStorageHasDraft(){try{return !!localStorage.getItem(storageKey);}catch{return false;}}
})();
