/* Learn module UI: lesson hub, lesson player, flashcards, XP / streak / badges.
   Relies on globals from index.html: mainEl, backBtn, brandLabel, DOMAIN_META,
   shuffleArr, renderHome, startSession, and LESSONS / CARDS from the data files. */
(function(){
"use strict";

const LKEY = "ccp_drill_learn_v1";
const XP_CHECK = 10, XP_LESSON = 25, XP_PERFECT = 15, XP_CARD = 2;
const LEVELS = ["Cloud Curious","Console Clicker","Bucket Builder","Instance Wrangler","VPC Voyager","Policy Pro","Well-Architected","Cloud Practitioner"];
const XP_PER_LEVEL = 120;

/* ---------- storage ---------- */
function load(){
  let s = {xp:0, done:{}, streak:0, lastDay:"", cards:{}, badges:{}};
  try{ const raw = localStorage.getItem(LKEY); if(raw) s = Object.assign(s, JSON.parse(raw)); }catch(e){}
  return s;
}
function save(){ try{ localStorage.setItem(LKEY, JSON.stringify(L)); }catch(e){} }
let L = load();

function dayStr(d){ return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
function touchStreak(){
  const now = new Date(), today = dayStr(now);
  if(L.lastDay === today) return;
  const y = new Date(now); y.setDate(y.getDate()-1);
  L.streak = (L.lastDay === dayStr(y)) ? L.streak+1 : 1;
  L.lastDay = today;
}
function streakNow(){
  // a streak that wasn't continued yesterday or today has lapsed
  if(!L.lastDay) return 0;
  const now = new Date(), y = new Date(now); y.setDate(y.getDate()-1);
  return (L.lastDay===dayStr(now) || L.lastDay===dayStr(y)) ? L.streak : 0;
}
function addXP(n){ L.xp += n; touchStreak(); }
function levelInfo(){
  const lvl = Math.floor(L.xp/XP_PER_LEVEL);
  return {n:lvl+1, title:LEVELS[Math.min(lvl, LEVELS.length-1)], into:L.xp%XP_PER_LEVEL, need:XP_PER_LEVEL};
}

/* ---------- helpers ---------- */
const doneCount = () => LESSONS.filter(l=>L.done[l.id]).length;
const domainLessons = d => LESSONS.filter(l=>l.domain===d);
const nextLesson = () => LESSONS.find(l=>!L.done[l.id]) || null;
const masteredCount = () => CARDS.filter(c=>(L.cards[c.id]||0)>=3).length;
const esc = s => String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;");
function go(label, back){
  window.scrollTo(0,0);
  brandLabel.textContent = label;
  backBtn.style.display = "flex";
  window.backAction = back;
}
function mount(html){
  const el = document.createElement("div");
  el.className = "screen";
  el.innerHTML = html;
  mainEl.innerHTML = "";
  mainEl.appendChild(el);
  return el;
}

const BADGES = [
  {id:"first",  icon:"🌱", name:"First Steps",     desc:"Finish a lesson",              test:()=>doneCount()>=1},
  {id:"perfect",icon:"🎯", name:"Bullseye",        desc:"A lesson with no misses",      test:()=>Object.values(L.done).some(d=>d.perfect)},
  {id:"streak3",icon:"🔥", name:"On Fire",         desc:"3-day streak",                 test:()=>streakNow()>=3},
  {id:"cards",  icon:"🃏", name:"Card Shark",      desc:"Master 20 flashcards",         test:()=>masteredCount()>=20},
  {id:"domain", icon:"🏅", name:"Domain Master",   desc:"Finish every lesson in a domain", test:()=>Object.keys(DOMAIN_META).some(d=>domainLessons(d).every(l=>L.done[l.id]))},
  {id:"champ",  icon:"🏆", name:"Cloud Champion",  desc:"Finish all lessons",           test:()=>doneCount()===LESSONS.length}
];
function awardBadges(){
  const fresh = [];
  BADGES.forEach(b=>{ if(!L.badges[b.id] && b.test()){ L.badges[b.id] = Date.now(); fresh.push(b); } });
  return fresh;
}

/* ---------- home card (called from renderHome) ---------- */
window.learnHomeCard = function(){
  const li = levelInfo(), nx = nextLesson(), st = streakNow();
  const started = doneCount()>0 || L.xp>0;
  return `
    <div class="card modecard learncard">
      <div class="modehead"><h2><span class="modeicon">🎓</span>Learn</h2>
        <span class="lvlpill mono">Lv ${li.n} · ${li.title}</span></div>
      <p>${started ? "Bite-size lessons, mini-quizzes and flashcards. Pick up where you left off." : "New to AWS? Start here — short, playful lessons on every exam domain, with quick checks along the way."}</p>
      <div class="xptrack"><div style="width:${Math.round(li.into/li.need*100)}%"></div></div>
      <div class="learnstats mono"><span>⭐ ${L.xp} XP</span><span>🔥 ${st} day${st===1?"":"s"}</span><span>📘 ${doneCount()}/${LESSONS.length}</span></div>
      <button class="primarybtn" id="learnStart">${nx ? (started ? "Continue: "+esc(nx.title)+" →" : "Start learning →") : "Browse lessons →"}</button>
    </div>`;
};
window.bindLearnHome = function(){
  const b = document.getElementById("learnStart");
  if(b) b.addEventListener("click", ()=>renderHub());
};

/* ---------- hub ---------- */
function renderHub(){
  go("LEARN", ()=>{ window.backAction=null; renderHome(); });
  const li = levelInfo(), nx = nextLesson(), st = streakNow();
  const earned = BADGES.filter(b=>L.badges[b.id]).length;

  const domainsHtml = Object.keys(DOMAIN_META).map(d=>{
    const ls = domainLessons(d), done = ls.filter(l=>L.done[l.id]).length;
    return `
      <div class="lhdomain">
        <div class="lhdhead"><span class="chip">${DOMAIN_META[d].label}</span><span class="mono lhcount">${done}/${ls.length} · ${DOMAIN_META[d].weight}% of exam</span></div>
        ${ls.map(l=>{
          const dn = L.done[l.id], isNext = nx && nx.id===l.id;
          return `<button class="lessonrow ${dn?"isdone":""} ${isNext?"isnext":""}" data-lesson="${l.id}">
            <span class="lricon">${l.icon}</span>
            <span class="lrinfo"><span class="lrtitle">${l.title}</span><span class="lrmeta">${l.blurb}</span></span>
            <span class="lrstate">${dn ? (dn.perfect?"🎯":"✓") : (isNext?"▶":"›")}</span>
          </button>`;
        }).join("")}
      </div>`;
  }).join("");

  mount(`
    <div>
      <div class="eyebrow">Learning path</div>
      <h1>Level ${li.n}: ${li.title}</h1>
      <div class="xptrack big"><div style="width:${Math.round(li.into/li.need*100)}%"></div></div>
      <div class="learnstats mono"><span>⭐ ${L.xp} XP</span><span>🔥 ${st}-day streak</span><span>${li.need-li.into} XP to next level</span></div>
    </div>
    ${nx ? `<button class="primarybtn" id="hubNext">Up next: ${nx.icon} ${esc(nx.title)} →</button>` : `<div class="card"><h2>🏆 Path complete!</h2><p>You've finished every lesson. Replay any lesson, drill the flashcards, then take a full exam.</p></div>`}
    <button class="domainrow" id="hubCards">
      <div class="lricon big">🃏</div>
      <div class="domaininfo"><div class="name">Scenario flashcards</div><div class="meta">${masteredCount()}/${CARDS.length} mastered · "which service?"</div></div>
      <div class="chev">›</div>
    </button>
    ${domainsHtml}
    <div class="card">
      <h2>Badges <span class="mono lhcount">${earned}/${BADGES.length}</span></h2>
      <div class="badgegrid">${BADGES.map(b=>`
        <div class="badge ${L.badges[b.id]?"on":""}" title="${b.desc}">
          <div class="bicon">${b.icon}</div><div class="bname">${b.name}</div><div class="bdesc">${b.desc}</div>
        </div>`).join("")}</div>
    </div>
  `);
  mainEl.querySelectorAll("[data-lesson]").forEach(b=>b.addEventListener("click", ()=>startLesson(b.dataset.lesson)));
  const hn = document.getElementById("hubNext"); if(hn) hn.addEventListener("click", ()=>startLesson(nx.id));
  document.getElementById("hubCards").addEventListener("click", renderCardPicker);
}

/* ---------- lesson player ---------- */
let LS = null;

function startLesson(id){
  const lesson = LESSONS.find(l=>l.id===id);
  LS = {lesson, i:0, firstTry:0, checks:lesson.steps.filter(s=>s.k==="check").length, missed:0, xp:0, replay:!!L.done[id], answered:false};
  renderStep();
}

function renderStep(){
  const {lesson, i} = LS, step = lesson.steps[i], total = lesson.steps.length;
  go(lesson.title.toUpperCase(), renderHub);
  LS.answered = false;

  const seg = `<div class="segbar">${lesson.steps.map((s,n)=>`<span class="${n<i?"done":n===i?"cur":""}"></span>`).join("")}</div>`;
  const meta = `<div class="progressmeta"><span>${lesson.icon} Step ${i+1} / ${total}</span><span>${LS.replay?"Review · no XP":"⭐ +"+LS.xp+" XP"}</span></div>`;
  const isLast = i===total-1;

  if(step.k==="card"){
    mount(`
      <div class="progresswrap">${meta}${seg}</div>
      <div class="stepcard">
        <h1>${step.title}</h1>
        ${step.body?`<p class="stepbody">${step.body}</p>`:""}
        ${step.analogy?`<div class="analogy"><span class="aicon">💡</span><span>${step.analogy}</span></div>`:""}
        ${step.bullets?`<ul class="kv">${step.bullets.map((b,n)=>`<li style="--d:${n*70}ms"><b>${b[0]}</b><span>${b[1]}</span></li>`).join("")}</ul>`:""}
        ${step.mnemonic?`<div class="mnemonic"><span class="aicon">🧠</span><span>${step.mnemonic}</span></div>`:""}
      </div>
      <div class="footerbar"><button class="primarybtn" id="stepNext">${isLast?"Finish lesson →":"Got it →"}</button></div>
    `);
    document.getElementById("stepNext").addEventListener("click", advance);
    return;
  }

  // check step — shuffle options but remember the right one
  const order = shuffleArr(step.o.map((_,n)=>n));
  const letters = ["A","B","C","D"];
  mount(`
    <div class="progresswrap">${meta}${seg}</div>
    <div class="chip">⚡ Quick check</div>
    <div class="qtext">${step.q}</div>
    <div class="options" id="optionsWrap">${order.map((orig,n)=>`
      <button class="option" data-orig="${orig}"><div class="row"><div class="letter">${letters[n]}</div><div class="otext">${step.o[orig]}</div></div></button>`).join("")}
    </div>
    <div class="feedback" id="fb" style="display:none;"></div>
    <div class="footerbar" id="footerBar" style="display:none;"><button class="primarybtn" id="stepNext">${isLast?"Finish lesson →":"Continue →"}</button></div>
  `);
  mainEl.querySelectorAll("#optionsWrap .option").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      if(LS.answered) return;
      LS.answered = true;
      const pick = +btn.dataset.orig, ok = pick===step.a;
      mainEl.querySelectorAll("#optionsWrap .option").forEach(el=>{
        el.classList.add("locked");
        if(+el.dataset.orig===step.a) el.classList.add("correct");
        else if(el===btn) el.classList.add("incorrect");
      });
      if(ok){ LS.firstTry++; if(!LS.replay){ LS.xp += XP_CHECK; } } else { LS.missed++; }
      const fb = document.getElementById("fb");
      fb.className = "feedback "+(ok?"fbgood":"fbbad");
      fb.innerHTML = `<b>${ok?"Nice! "+(LS.replay?"":"+"+XP_CHECK+" XP"):"Not quite."}</b> ${step.why}`;
      fb.style.display = "block";
      document.getElementById("footerBar").style.display = "block";
      document.getElementById("stepNext").addEventListener("click", advance);
      fb.scrollIntoView({behavior:"smooth", block:"nearest"});
    });
  });
}

function advance(){
  if(LS.i < LS.lesson.steps.length-1){ LS.i++; renderStep(); }
  else finishLesson();
}

function finishLesson(){
  const {lesson} = LS;
  const perfect = LS.missed===0 && LS.checks>0;
  let gained = 0;
  if(!LS.replay){
    gained = LS.xp + XP_LESSON + (perfect?XP_PERFECT:0);
    addXP(gained);
    L.done[lesson.id] = {at:Date.now(), perfect};
  } else if(perfect && !L.done[lesson.id].perfect){
    L.done[lesson.id].perfect = true;
  }
  const fresh = awardBadges();
  save();

  go("LESSON COMPLETE", renderHub);
  const nx = nextLesson();
  const pctRight = LS.checks ? Math.round(LS.firstTry/LS.checks*100) : 100;
  mount(`
    <div class="confetti" aria-hidden="true">${Array.from({length:22},(_,n)=>`<i style="--x:${(n*47)%100}%;--d:${(n%7)*0.18}s;--r:${(n*53)%360}deg">${["☁️","⭐","⚡","🎉","🔥"][n%5]}</i>`).join("")}</div>
    <div class="scorehero">
      <div class="eyebrow">${LS.replay?"Lesson reviewed":"Lesson complete"}</div>
      <div class="bigemoji">${perfect?"🎯":lesson.icon}</div>
      <h1>${lesson.title}</h1>
      <p>${LS.firstTry} of ${LS.checks} checks right first try (${pctRight}%)</p>
      ${LS.replay?"":`<div class="xpgain mono">+${gained} XP</div>
      <p class="mono xpbreak">${LS.xp} checks + ${XP_LESSON} lesson${perfect?" + "+XP_PERFECT+" perfect":""}</p>`}
    </div>
    ${fresh.map(b=>`<div class="card newbadge"><div class="bicon">${b.icon}</div><div><div class="eyebrow">Badge unlocked</div><b>${b.name}</b><p>${b.desc}</p></div></div>`).join("")}
    <div class="card">
      <h2>Lock it in</h2>
      <p>Test this domain with real exam-style questions while it's fresh.</p>
      <button class="ghostbtn" id="drillDomain">Practice ${DOMAIN_META[lesson.domain].label} →</button>
    </div>
    ${nx && nx.id!==lesson.id ? `<button class="primarybtn" id="nextLesson">Next: ${nx.icon} ${esc(nx.title)} →</button>` : ``}
    <button class="ghostbtn" id="toHub">Back to learning path</button>
  `);
  document.getElementById("toHub").addEventListener("click", renderHub);
  const nl = document.getElementById("nextLesson"); if(nl) nl.addEventListener("click", ()=>startLesson(nx.id));
  document.getElementById("drillDomain").addEventListener("click", ()=>{
    window.backAction = null;
    startSession(lesson.domain, {examMode:false, length:10});
  });
}

/* ---------- flashcards ---------- */
function renderCardPicker(){
  go("FLASHCARDS", renderHub);
  const cats = Object.keys(CARD_CATS);
  const rows = [{key:"all", label:"Mixed — every category", icon:"🃏", list:CARDS}].concat(
    cats.map(k=>({key:k, label:CARD_CATS[k].label, icon:CARD_CATS[k].icon, list:CARDS.filter(c=>c.cat===k)})));
  mount(`
    <div>
      <div class="eyebrow">Scenario flashcards</div>
      <h1>Which service fits?</h1>
      <p>The exam describes a need; you name the service. Read the scenario, say your answer, flip to check. Cards you miss come back more often.</p>
    </div>
    <div class="domaingrid">${rows.map(r=>{
      const m = r.list.filter(c=>(L.cards[c.id]||0)>=3).length;
      return `<button class="domainrow" data-cat="${r.key}">
        <div class="lricon big">${r.icon}</div>
        <div class="domaininfo"><div class="name">${r.label}</div><div class="meta">${m}/${r.list.length} mastered</div></div>
        <div class="chev">›</div></button>`;}).join("")}
    </div>
    ${Object.keys(L.cards).length?`<button class="linkbtn" id="resetCards">Reset flashcard progress</button>`:""}
  `);
  mainEl.querySelectorAll("[data-cat]").forEach(b=>b.addEventListener("click", ()=>startCards(b.dataset.cat)));
  const rc = document.getElementById("resetCards");
  if(rc) rc.addEventListener("click", ()=>{ if(confirm("Reset flashcard progress?")){ L.cards={}; save(); renderCardPicker(); } });
}

let CS = null;
function startCards(cat){
  const pool = cat==="all" ? CARDS : CARDS.filter(c=>c.cat===cat);
  // lowest box first (shuffled within box) so weak cards surface
  const sorted = shuffleArr(pool.slice()).sort((a,b)=>(L.cards[a.id]||0)-(L.cards[b.id]||0));
  CS = {cat, deck:shuffleArr(sorted.slice(0,10)), i:0, got:0, flipped:false, xp:0};
  renderCard();
}

function renderCard(){
  go("FLASHCARDS", renderCardPicker);
  const c = CS.deck[CS.i]; CS.flipped = false;
  mount(`
    <div class="progresswrap">
      <div class="progressmeta"><span>Card ${CS.i+1} / ${CS.deck.length}</span><span>⭐ +${CS.xp} XP</span></div>
      <div class="progressbar"><div style="width:${CS.i/CS.deck.length*100}%"></div></div>
    </div>
    <div class="chip">${CARD_CATS[c.cat].icon} ${CARD_CATS[c.cat].label}</div>
    <button class="flashcard" id="flash" aria-live="polite">
      <span class="fclabel mono">SCENARIO</span>
      <span class="fctext">${c.front}</span>
      <span class="fchint mono">tap to reveal the service</span>
    </button>
    <div class="footerbar" id="grade" style="display:none;">
      <div class="gradebtns">
        <button class="ghostbtn" id="again">Still learning</button>
        <button class="primarybtn" id="gotit">Got it ✓</button>
      </div>
    </div>
  `);
  const flash = document.getElementById("flash");
  flash.addEventListener("click", ()=>{
    if(CS.flipped) return;
    CS.flipped = true;
    flash.classList.add("flipped");
    flash.innerHTML = `<span class="fclabel mono">ANSWER</span><span class="fctext ans">${esc(c.back)}</span><span class="fcwhy">${c.hint}</span><span class="fcq">${c.front}</span>`;
    document.getElementById("grade").style.display = "block";
  });
  const grade = ok=>{
    const box = L.cards[c.id]||0;
    L.cards[c.id] = ok ? Math.min(box+1,3) : 0;
    if(ok){ CS.got++; CS.xp += XP_CARD; addXP(XP_CARD); }
    save();
    if(CS.i < CS.deck.length-1){ CS.i++; renderCard(); } else finishCards();
  };
  document.getElementById("gotit").addEventListener("click", ()=>grade(true));
  document.getElementById("again").addEventListener("click", ()=>grade(false));
}

function finishCards(){
  const fresh = awardBadges(); save();
  go("FLASHCARDS", renderCardPicker);
  mount(`
    <div class="scorehero">
      <div class="eyebrow">Deck complete</div>
      <div class="bigemoji">🃏</div>
      <div class="scorebig mono">${CS.got}/${CS.deck.length}</div>
      <p>cards recalled · <span class="mono">+${CS.xp} XP</span></p>
    </div>
    ${fresh.map(b=>`<div class="card newbadge"><div class="bicon">${b.icon}</div><div><div class="eyebrow">Badge unlocked</div><b>${b.name}</b><p>${b.desc}</p></div></div>`).join("")}
    <button class="primarybtn" id="again2">Another round</button>
    <button class="ghostbtn" id="toPicker">Choose a category</button>
    <button class="ghostbtn" id="toHub2">Back to learning path</button>
  `);
  document.getElementById("again2").addEventListener("click", ()=>startCards(CS.cat));
  document.getElementById("toPicker").addEventListener("click", renderCardPicker);
  document.getElementById("toHub2").addEventListener("click", renderHub);
}

window.renderLearnHub = renderHub;
})();
