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
  let currentFilter = 'all';
  let isList = false;
  let currentReading = 0;

  function validatedState(value) {
    if (!value || typeof value !== 'object' || value.version !== 1) throw new Error('Choose a valid portfolio backup (version 1).');
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
    catch { /* Keep published content when a saved draft is unavailable. */ }
  }
  loadLocal();
  // Keep reviewed readings and their evidence together, including in browsers
  // that still contain drafts from the retired editor. Stored drafts are retained.
  const analyses = () => content.analyses;
  const cover = (book, favorite = false) => `<div class="cover-shell"><img src="assets/covers/${book.id}.svg" alt="" ${favorite?'':'loading="lazy"'} width="600" height="800"><div class="cover-copy"><span class="cover-number">${book.number} / GREAT BOOKS</span><span class="cover-title">${escapeHTML(book.title)}</span><span class="cover-author">${escapeHTML(book.author)}</span><span class="cover-edition">THE LITERARY COLLECTION</span></div></div>`;

  function renderBooks() {
    const shown = analyses().filter(b=>currentFilter==='all'||groups[currentFilter].includes(b.id));
    $('#book-grid').classList.toggle('list-view',isList);
    $('#book-grid').innerHTML = shown.map(book=>`<article class="book-card"><button class="book-cover-button" data-read="${book.id}" aria-label="Read ${escapeHTML(book.title)} literary analysis">${cover(book)}<span class="book-hover"><span>Open the reading ↗</span></span></button><div class="book-info"><div class="book-info-top"><span class="lens-tag">${escapeHTML(book.lens)} lens</span><span class="book-number">${book.number}</span></div><button class="book-title-button" data-read="${book.id}">${escapeHTML(book.title)}</button><p class="book-author">${escapeHTML(book.author)}</p><p class="book-description">${escapeHTML(book.shortDescription)}</p><div class="book-footer"><span>${escapeHTML(book.readTime)}</span><button data-read="${book.id}" aria-label="Read analysis of ${escapeHTML(book.title)}">Read analysis ↗</button></div></div></article>`).join('');
    $('#filter-count').textContent = currentFilter==='all'?`Showing all ${content.analyses.length} masterpieces`:`Showing ${shown.length} of ${content.analyses.length} masterpieces`;
  }
  function renderProfile() {
    const p={...state.profile,name:content.profile.name,photo:content.profile.photo};
    $('#student-meta').innerHTML = `${escapeHTML(p.name||'YOUR NAME')} <span>·</span> ${escapeHTML([p.course,p.section].filter(Boolean).join(' · ')||'COURSE, YEAR & SECTION')}`;
    $('#about-title').textContent=p.name;
    ['intro','interests','expectation'].forEach(key=>{
      const el=$(`#profile-${key}`);
      if(!el.dataset.default) el.dataset.default=el.textContent;
      el.textContent=p[key]||el.dataset.default;
    });
    const portrait=$('#profile-portrait');
    if(!portrait.dataset.default) portrait.dataset.default=portrait.innerHTML;
    portrait.innerHTML=p.photo?`<div class="portrait-photo"><img src="${p.photo}" alt="Portrait of ${escapeHTML(p.name||'the portfolio author')} seated outdoors" width="1200" height="1600"></div>`:portrait.dataset.default;
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
    $('.favorite .handwritten').hidden=f.work!=='odyssey';
  }
  function renderLearning() {
    const icons=['◎','⌘','✧','↗'];
    $('#learning-grid').innerHTML=state.learning.map((item,i)=>`<article class="learning-card"><div class="learning-icon" aria-hidden="true">${icons[i]}<span>0${i+1}</span></div><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.body)}</p></article>`).join('');
  }
  function renderReflection() {
    $('#reflection-questions').innerHTML=state.reflection.map((item,i)=>`<details class="reflection-item" ${i===0?'open':''}><summary><span>0${i+1}</span><span>${escapeHTML(item.title)}</span><span aria-hidden="true">+</span></summary><div class="reflection-answer"><strong>${escapeHTML(content.reflection[i].question)}</strong><p>${escapeHTML(item.body)}</p></div></details>`).join('');
  }
  function renderAll(){renderBooks();renderProfile();renderFavorite();renderLearning();renderReflection();}

  const externalLink = (source, className = '') => `<a${className ? ` class="${className}"` : ''} href="${escapeHTML(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(source.label)} <span aria-hidden="true">↗</span></a>`;
  const passageReferences = section => `<div class="passage-references"><span>Passage references</span>${section.citations.map(source => externalLink(source)).join('')}</div>`;
  function bookReferences(book) {
    return `<section class="reader-sources"><h2>Text & references</h2><p class="reference-context">These texts support the story details. Literary arguments and personal connections are interpretations of the text.</p><ol class="reference-list">${book.sources.map(source => `<li>${externalLink(source)}${source.note ? `<p>${escapeHTML(source.note)}</p>` : ''}</li>`).join('')}</ol></section>`;
  }
  function readingOpening(book, favorite = false, introduction = book.overview) {
    const image = window.PORTFOLIO_IMAGES?.[book.id];
    const artwork = image ? `<figure class="reader-artwork"><img src="${escapeHTML(image.src)}" alt="${escapeHTML(image.alt)}" decoding="async"><figcaption>${escapeHTML(image.caption)}<a href="${escapeHTML(image.source)}" target="_blank" rel="noopener noreferrer">${escapeHTML(image.credit)} ↗</a></figcaption></figure>` : '';
    return `<div class="reader-opening"><div class="reader-opening-copy"><header class="reader-opening-header"><h1 id="reader-title">${escapeHTML(book.title)}</h1><p class="reader-byline">${escapeHTML(book.author)} · ${escapeHTML(book.year)}${favorite ? '' : ` <span aria-hidden="true">/</span> ${escapeHTML(book.readTime)}`}</p><div class="book-access">${externalLink(book.bookLink, 'book-read-link')}${book.additionalBookLink ? externalLink(book.additionalBookLink, 'book-edition-link') : ''}<p class="book-edition">${escapeHTML(book.edition)}</p></div></header><p class="reader-intro">${escapeHTML(introduction)}</p></div>${artwork}</div>`;
  }

  function readBook(id, updateHash=true) {
    const all=analyses();
    const book=all.find(b=>b.id===id);
    if(!book)return;
    currentReading=all.indexOf(book);
    $('#reader-body').innerHTML=`<div class="reader-eyebrow"><span>${book.number} / THE LITERARY COLLECTION</span><span class="lens-tag">${escapeHTML(book.lens)} lens</span></div>${readingOpening(book)}${book.sections.map(s=>`<section class="reader-section"><h2>${escapeHTML(s.heading)}</h2>${s.paragraphs.map(p=>`<p>${escapeHTML(p)}</p>`).join('')}${passageReferences(s)}</section>`).join('')}${bookReferences(book)}`;
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
    $('#reader-body').innerHTML=`<div class="reader-eyebrow">THE ONE THAT STAYED WITH ME</div>${readingOpening(book, true, f.deck)}${[{heading:'The story, in brief',body:f.overview},{heading:'Why this masterpiece',body:f.reasons},{heading:'Themes, characters & lessons',body:f.lessons},{heading:'A personal connection',body:f.connection}].map(s=>`<section class="reader-section"><h2>${escapeHTML(s.heading)}</h2>${s.body.split(/\n\s*\n/).map(p=>`<p>${escapeHTML(p)}</p>`).join('')}</section>`).join('')}${bookReferences(book)}<section class="reader-sources"><h2>Another way into the story</h2><button class="text-link" data-read="${book.id}">Read the full ${escapeHTML(book.lens.toLowerCase())} analysis ↗</button></section>`;
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
  // Local profile and reflection drafts take priority. Reviewed readings above
  // always come from the published content and retain their passage references.
  if(!localStorageHasDraft()){
    fetch('portfolio.json',{cache:'no-cache'}).then(response=>response.ok?response.json():null).then(value=>{if(value&&!localStorageHasDraft()){state=validatedState(value);renderAll();openHash();}}).catch(()=>{});
  }
  function localStorageHasDraft(){try{return !!localStorage.getItem(storageKey);}catch{return false;}}
})();
