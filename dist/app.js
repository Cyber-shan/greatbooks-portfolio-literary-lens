(() => {
  'use strict';
  const content = window.PORTFOLIO_CONTENT;
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const storageKey = 'marginalia-portfolio-v1';
  const groups = { identity: ['whirlwind', 'odyssey', 'genji'], society: ['panchatantra', 'mahabharata', 'iliad', 'roland', 'genji'], journey: ['ramayana', 'odyssey', 'whirlwind'] };
  const defaultFavorite = content.favorite;
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
  function usePublishedWriting() {
    // The editor is retired. Show the current published revision while leaving
    // any old browser backup untouched in localStorage.
    const published = emptyState();
    ['profile', 'analyses', 'favorite', 'learning', 'reflection'].forEach(key => { state[key] = published[key]; });
  }
  usePublishedWriting();
  const analyses = () => content.analyses.map(book=>({...book,...state.analyses[book.id]}));
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
    $('#reflection-questions').innerHTML=state.reflection.map((item,i)=>`<details class="reflection-item" ${i===0?'open':''}><summary><span>0${i+1}</span><span>${escapeHTML(item.title)}</span><span aria-hidden="true">+</span></summary><div class="reflection-answer"><strong>${escapeHTML(content.reflection[i].question)}</strong>${item.body.split(/\n\s*\n/).map(paragraph=>`<p>${escapeHTML(paragraph)}</p>`).join('')}</div></details>`).join('');
  }
  function renderAll(){renderBooks();renderProfile();renderFavorite();renderLearning();renderReflection();}

  function readingArtwork(book) {
    const image = window.PORTFOLIO_IMAGES?.[book.id];
    return image ? `<figure class="reader-artwork"><img src="${escapeHTML(image.src)}" alt="${escapeHTML(image.alt)}" decoding="async"><figcaption>${escapeHTML(image.caption)}<a href="${escapeHTML(image.source)}" target="_blank" rel="noopener noreferrer">${escapeHTML(image.credit)} ↗</a></figcaption></figure>` : '';
  }
  function readingOpening(book, favorite = false, introduction = book.overview, organized = false) {
    const artwork = readingArtwork(book);
    if (organized) return `<div class="reader-opening"><div class="reader-opening-copy"><header class="reader-opening-header"><p class="analysis-title-label">Literary masterpiece</p><h1 id="reader-title">${escapeHTML(book.title)}</h1><dl class="analysis-metadata"><div><dt>Author</dt><dd>${escapeHTML(book.author)}</dd></div><div><dt>Literary lens</dt><dd>${escapeHTML(book.lens)}</dd></div></dl><p class="analysis-context">${escapeHTML(book.year)} <span aria-hidden="true">·</span> ${escapeHTML(book.readTime)}</p></header><section class="analysis-introduction" aria-labelledby="analysis-introduction-title"><h2 id="analysis-introduction-title">Introduction</h2><p class="reader-intro">${escapeHTML(introduction)}</p></section></div>${artwork}</div>`;
    return `<div class="reader-opening"><div class="reader-opening-copy"><header class="reader-opening-header"><h1 id="reader-title">${escapeHTML(book.title)}</h1><p class="reader-byline">${escapeHTML(book.author)} · ${escapeHTML(book.year)}${favorite ? '' : ` <span aria-hidden="true">/</span> ${escapeHTML(book.readTime)}`}</p></header><p class="reader-intro">${escapeHTML(introduction)}</p></div>${artwork}</div>`;
  }

  function favoriteOpening(book, favorite) {
    const themes = favorite.themes.split(',').map(theme => theme.trim()).filter(Boolean);
    return `<div class="reader-opening favorite-reader-opening"><div class="reader-opening-copy"><header class="reader-opening-header"><h1 id="reader-title">${escapeHTML(book.title)}</h1><p class="reader-byline">${escapeHTML(book.author)} · ${escapeHTML(book.year)}</p></header><div class="favorite-opening-story"><p class="reader-intro">${escapeHTML(favorite.deck)}</p>${themes.length ? `<ul class="favorite-opening-themes" aria-label="Key themes">${themes.map(theme => `<li>${escapeHTML(theme)}</li>`).join('')}</ul>` : ''}<section class="reader-section favorite-opening-summary"><h2>The story, in brief</h2>${favorite.overview.split(/\n\s*\n/).map(paragraph => `<p>${escapeHTML(paragraph)}</p>`).join('')}</section></div></div>${readingArtwork(book)}</div>`;
  }

  function organizedAnalysis(book) {
    // The original closing paragraph becomes the conclusion. Keep every
    // paragraph in its existing order and preserve the argument of each work.
    const lastSection = book.sections.at(-1);
    const conclusion = lastSection?.paragraphs.length > 1 ? lastSection.paragraphs.at(-1) : '';
    const sections = book.sections.map((section, index) => {
      const paragraphs = conclusion && index === book.sections.length - 1 ? section.paragraphs.slice(0, -1) : section.paragraphs;
      return `<section class="reader-section"><h3>${escapeHTML(section.heading)}</h3>${paragraphs.map(p=>`<p>${escapeHTML(p)}</p>`).join('')}</section>`;
    }).join('');
    return `<section class="organized-analysis" aria-labelledby="literary-analysis-title"><h2 id="literary-analysis-title">Literary analysis</h2>${sections}</section>${conclusion ? `<section class="analysis-conclusion" aria-labelledby="analysis-conclusion-title"><h2 id="analysis-conclusion-title">Conclusion</h2><p>${escapeHTML(conclusion)}</p></section>` : ''}`;
  }

  function readBook(id, updateHash=true) {
    const all=analyses();
    const book=all.find(b=>b.id===id);
    if(!book)return;
    currentReading=all.indexOf(book);
    const organized = book.id !== 'odyssey';
    $('#reader-body').innerHTML=`<div class="reader-eyebrow"><span>${book.number} / THE LITERARY COLLECTION</span><span class="lens-tag">${escapeHTML(book.lens)} lens</span></div>${readingOpening(book, false, book.overview, organized)}${organized ? organizedAnalysis(book) : book.sections.map(s=>`<section class="reader-section"><h2>${escapeHTML(s.heading)}</h2>${s.paragraphs.map(p=>`<p>${escapeHTML(p)}</p>`).join('')}</section>`).join('')}<section class="reader-sources"><h2>Text & reference</h2>${book.sources?.length?book.sources.map(s=>`<a href="${escapeHTML(s.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(s.label)} ↗</a>`).join(''):'<p>References are listed with the published analysis.</p>'}</section>`;
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
    $('#reader-body').innerHTML=`<div class="reader-eyebrow">THE ONE THAT STAYED WITH ME</div>${favoriteOpening(book, f)}${[{heading:'Why this masterpiece',body:f.reasons},{heading:'Themes, characters & lessons',body:f.lessons},{heading:'A personal connection',body:f.connection}].map(s=>`<section class="reader-section"><h2>${escapeHTML(s.heading)}</h2>${s.body.split(/\n\s*\n/).map(p=>`<p>${escapeHTML(p)}</p>`).join('')}</section>`).join('')}${f.sources?.length ? `<section class="reader-sources"><h2>Passages discussed</h2>${f.sources.map(source=>`<a href="${escapeHTML(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(source.label)} ↗</a>`).join('')}<p class="favorite-source-note">${escapeHTML(f.sourceNote)}</p></section>` : ''}<section class="reader-sources"><h2>Another way into the story</h2><button class="text-link" data-read="${book.id}">Read the full ${escapeHTML(book.lens.toLowerCase())} analysis ↗</button></section>`;
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
  // Published writing takes priority over backups from the retired editor.
  if(!localStorageHasDraft()){
    fetch('portfolio.json',{cache:'no-cache'}).then(response=>response.ok?response.json():null).then(value=>{if(value&&!localStorageHasDraft()){state=validatedState(value);usePublishedWriting();renderAll();openHash();}}).catch(()=>{});
  }
  function localStorageHasDraft(){try{return !!localStorage.getItem(storageKey);}catch{return false;}}
})();
