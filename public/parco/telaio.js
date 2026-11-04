/* Il telaio comune dei giochi del parco di Elvezio.
   Ogni gioco chiama Telaio.start(cfg). Il telaio fa: istruzioni, livelli e stelle, punteggio, vite, tempo,
   pausa, suoni, risultato in caschetti, classifica per livello, account, condivisione. */
(function(){
'use strict';
var ICONS='https://d2ol7oe51mr4n9.cloudfront.net/user_3JsTmrBr43PtdGFpI9bsELoimP7/fafcb9f4-aaee-4b29-9106-75d21a37b361.webp';
var LV=['facile','medio','difficile'],LVN={facile:'Facile',medio:'Medio',difficile:'Difficile'};
var $=function(s,r){return (r||document).querySelector(s)};
var LS={get:function(k,d){try{var v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},set:function(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
function esc(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function stars(n,max){max=max||3;var h='<span class="t-st" aria-label="'+n+' stelle su '+max+'">';for(var i=0;i<max;i++)h+='<i class="'+(i<n?'on':'')+'">★</i>';return h+'</span>'}
function cas(on){return '<svg width="34" height="34" viewBox="0 0 40 40" aria-hidden="true"><path d="M6 30 C4 14 12 5 20 5 C28 5 36 14 34 30 L28 30 L28 17 C24 19 16 19 12 17 L12 30 Z" fill="'+(on?'#E8853B':'#E4D6B8')+'" stroke="'+(on?'#9a4a12':'#CDBB98')+'" stroke-width="2"/></svg>'}
// statistiche anonime
var SID=LS.get('elv_sid',null);if(!SID){SID=Math.random().toString(36).slice(2,12);LS.set('elv_sid',SID)}
var NOI=/[?&]noi=1/.test(location.search);if(NOI)LS.set('elv_noi',1);NOI=NOI||LS.get('elv_noi',0);
function ev(t,n,v){if(NOI)return;try{navigator.sendBeacon('/api/e',JSON.stringify({sid:SID,dev:innerWidth<760?'mob':'desk',ref:document.referrer.slice(0,120),ev:[{t:t,p:location.pathname,n:n||null,v:v==null?null:v}]}))}catch(e){}}

// ---------- suoni (sintetizzati, niente file) ----------
var AC=null,SND=LS.get('t_snd',true);
function ac(){if(!AC){try{AC=new (window.AudioContext||window.webkitAudioContext)()}catch(e){}}if(AC&&AC.state==='suspended')AC.resume();return AC}
function tone(f,d,type,vol,slide,delay){var a=ac();if(!a||!SND)return;var t=a.currentTime+(delay||0),o=a.createOscillator(),g=a.createGain();o.type=type||'sine';o.frequency.setValueAtTime(f,t);if(slide)o.frequency.exponentialRampToValueAtTime(slide,t+d);g.gain.setValueAtTime(vol||.2,t);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g);g.connect(a.destination);o.start(t);o.stop(t+d+.02)}
function noise(d,vol,hp){var a=ac();if(!a||!SND)return;var n=a.sampleRate*d,b=a.createBuffer(1,n,a.sampleRate),c=b.getChannelData(0);for(var i=0;i<n;i++)c[i]=(Math.random()*2-1)*(1-i/n);var s=a.createBufferSource(),g=a.createGain(),f=a.createBiquadFilter();f.type='highpass';f.frequency.value=hp||800;s.buffer=b;g.gain.value=vol||.2;s.connect(f);f.connect(g);g.connect(a.destination);s.start()}
var SFX={
  pop:function(){tone(520,.12,'triangle',.25,880)},
  hit:function(){noise(.18,.3,300);tone(180,.15,'square',.12,60)},
  boing:function(){tone(300,.25,'sine',.25,700);tone(700,.2,'sine',.12,300,.12)},
  whoosh:function(){noise(.25,.12,1500)},
  coin:function(){tone(880,.08,'square',.12);tone(1320,.15,'square',.12,null,.08)},
  bad:function(){tone(220,.3,'sawtooth',.15,110)},
  tick:function(){tone(1000,.04,'square',.06)},
  win:function(){[523,659,784,1046].forEach(function(f,i){tone(f,.22,'triangle',.18,null,i*.12)})},
  lose:function(){[392,330,262].forEach(function(f,i){tone(f,.3,'triangle',.18,null,i*.18)})},
  go:function(){tone(440,.1,'square',.12);tone(880,.2,'square',.12,null,.15)}
};
function sfx(n){try{SFX[n]&&SFX[n]()}catch(e){}}
function buzz(ms){if(SND&&navigator.vibrate)try{navigator.vibrate(ms)}catch(e){}}

// ---------- account ----------
var ME=null,READY=false;
function auth(){return fetch('/api/auth',{credentials:'same-origin'}).then(function(r){return r.json()}).then(function(j){ME=j.user;READY=!!j.ready;return j}).catch(function(){return {}})}

window.Telaio={start:function(cfg){
  var W=cfg.W||540,H=cfg.H||960,ID=cfg.id;
  document.title=cfg.title+' – Il parco giochi di Elvezio';
  document.body.innerHTML='<div class="t-app"><div class="t-bar"><a class="t-ib" href="/parco/" aria-label="Torna alla mappa">← <span>Mappa</span></a><span class="t-tt">'+esc(cfg.title)+'</span><button class="t-ib" id="tLb" type="button" aria-label="Classifica">🏆</button><button class="t-ib" id="tSnd" type="button" aria-label="Suono">'+(SND?'🔊':'🔇')+'</button><button class="t-ib" id="tPause" type="button" aria-label="Pausa" hidden>❚❚</button></div><main class="t-main" id="tMain"></main></div><div class="t-toast" id="tToast" role="status"></div>';
  var main=$('#tMain');
  function toast(t){var e=$('#tToast');e.textContent=t;e.classList.add('on');clearTimeout(e._t);e._t=setTimeout(function(){e.classList.remove('on')},2600)}
  $('#tSnd').onclick=function(){SND=!SND;LS.set('t_snd',SND);this.textContent=SND?'🔊':'🔇';if(SND)sfx('pop')};
  var medal='background-image:url('+ICONS+');background-position:'+(cfg.n%4)*100/3+'% '+Math.floor(cfg.n/4)*50+'%';
  function lvStars(l){return LS.get('stars_'+ID+'_'+l,0)}
  function lvBest(l){return LS.get('best_'+ID+'_'+l,0)}
  function unlocked(i){return i===0||lvStars(LV[i-1])>0||LS.get('t_all',0)}

  // ----- schermata iniziale -----
  function intro(){stop();$('#tPause').hidden=true;
    var h='<div class="t-scr"><div class="t-card"><div class="t-hero"><span class="t-medal" style="'+medal+'"></span><div><p>'+esc(cfg.zone||'Il parco giochi')+'</p><h1>'+esc(cfg.title)+'</h1></div></div>'+
      '<div class="t-say"><b aria-hidden="true">E</b><p>'+cfg.intro+'</p></div>'+
      '<ul class="t-how">'+cfg.how.map(function(x){return '<li><span aria-hidden="true">'+x[0]+'</span><div>'+x[1]+'</div></li>'}).join('')+'</ul>'+
      '<div class="t-lv">'+LV.map(function(l,i){var L=cfg.levels[l],u=unlocked(i);return '<button type="button" class="t-lvb'+(u?'':' lock')+'" data-l="'+l+'"'+(u?'':' aria-disabled="true"')+'><div><span class="n">'+(u?'':'🔒 ')+LVN[l]+'</span><small>'+esc(u?L.desc:'Prendi almeno una stella al livello prima')+(lvBest(l)?' · record '+lvBest(l):'')+'</small></div><span class="st">'+stars(lvStars(l))+'</span></button>'}).join('')+'</div>'+
      '<button class="t-lnk" type="button" id="tLb2">Vedi la classifica</button></div></div>';
    main.innerHTML=h;
    main.querySelectorAll('.t-lvb').forEach(function(b){b.onclick=function(){if(b.classList.contains('lock')){toast('Prima prendi almeno una stella al livello '+LVN[LV[LV.indexOf(b.dataset.l)-1]]+'.');return}play(b.dataset.l)}});
    $('#tLb2').onclick=function(){board(LV.filter(function(l,i){return unlocked(i)}).pop())};
  }
  function needLogin(){main.innerHTML='<div class="t-scr"><div class="t-card"><div class="t-hero"><span class="t-medal" style="'+medal+'"></span><div><p>Il parco giochi di Elvezio</p><h1>'+esc(cfg.title)+'</h1></div></div><div class="t-say"><b>E</b><p>Per giocare qui serve il tuo account del parco: così i punti vanno in classifica col tuo nome. È gratis e ci metti un minuto.</p></div><a class="t-btn gold" href="/parco/?torna='+encodeURIComponent(location.pathname)+'">Entra nel parco</a></div></div>'}

  // ----- partita -----
  var G=null,raf=0,last=0,state=null,paused=false,cv,ctx,scale=1,dpr=1;
  function stop(){cancelAnimationFrame(raf);raf=0;G=null;state=null}
  function play(l){var L=cfg.levels[l];stop();ac();
    main.innerHTML='<div class="t-stage" id="tStage"><canvas id="tCv" width="'+W+'" height="'+H+'"></canvas></div><div class="t-hud" id="tHud"></div><div class="t-pop" id="tPop"></div>';
    cv=$('#tCv');ctx=cv.getContext('2d');fit();
    state={l:l,L:L,score:0,lives:L.lives||cfg.lives||0,time:L.time||cfg.time||0,t0:Date.now(),over:false,tk:null,fx:[],combo:0};
    $('#tPause').hidden=false;paused=false;
    fetch('/api/start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({g:ID,l:l})}).then(function(r){return r.json()}).then(function(j){if(state)state.tk=j.tk}).catch(function(){});
    ev('game_start',ID+':'+l);
    G=cfg.game(api,L,l);hud();pop(cfg.ready||'Via!',900);sfx('go');
    last=performance.now();raf=requestAnimationFrame(frame);
  }
  function fit(){if(!cv)return;var st=$('#tStage');if(!st)return;var r=st.getBoundingClientRect();scale=Math.min((r.width-8)/W,(r.height-8)/H);dpr=Math.min(2,window.devicePixelRatio||1);
    cv.style.width=Math.round(W*scale)+'px';cv.style.height=Math.round(H*scale)+'px';cv.width=Math.round(W*scale*dpr);cv.height=Math.round(H*scale*dpr);ctx.setTransform(scale*dpr,0,0,scale*dpr,0,0)}
  addEventListener('resize',fit);
  function frame(t){raf=requestAnimationFrame(frame);var dt=Math.min(.05,(t-last)/1000);last=t;if(paused||!G||!state)return;
    if(!state.over){if(state.time){state.time-=dt;if(state.time<=0){state.time=0;end('tempo')}else if(state.time<5&&Math.floor(state.time+dt)!==Math.floor(state.time))sfx('tick')}
      G.update&&G.update(dt);hud()}
    ctx.clearRect(0,0,W,H);try{G.draw&&G.draw(ctx)}catch(err){if(!frame.warned){frame.warned=1;console.error(err)}}
    // effetti: testi che salgono e scintille
    for(var i=state.fx.length-1;i>=0;i--){var f=state.fx[i];f.t+=dt;if(f.t>f.d){state.fx.splice(i,1);continue}var k=f.t/f.d;
      if(f.txt){ctx.save();ctx.globalAlpha=1-k;ctx.font='900 '+(f.size||30)+'px Montserrat, sans-serif';ctx.textAlign='center';ctx.lineWidth=6;ctx.strokeStyle='#3E1019';ctx.fillStyle=f.c||'#FFD24A';ctx.strokeText(f.txt,f.x,f.y-k*60);ctx.fillText(f.txt,f.x,f.y-k*60);ctx.restore()}
      else{f.x+=f.vx*dt;f.y+=f.vy*dt;f.vy+=600*dt;ctx.globalAlpha=1-k;ctx.fillStyle=f.c;ctx.beginPath();ctx.arc(f.x,f.y,f.r*(1-k*.5),0,7);ctx.fill();ctx.globalAlpha=1}}
  }
  var lastHud='';
  function hud(){if(!state)return;var h='<span>Punti <b>'+state.score+'</b></span>';if(state.L.lives||cfg.lives)h+='<span>'+(state.lives>0?'❤️'.repeat(state.lives):'💔')+'</span>';if(state.time||state.L.time||cfg.time)h+='<span>⏱ <b>'+Math.ceil(state.time)+'</b></span>';if(cfg.hudExtra)h+=cfg.hudExtra(state);if(h!==lastHud){$('#tHud').innerHTML=h;lastHud=h}}
  function pop(t,ms){var e=$('#tPop');if(!e)return;e.textContent=t;e.classList.add('on');clearTimeout(e._t);e._t=setTimeout(function(){e.classList.remove('on')},ms||900)}
  function toLogical(e){var r=cv.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width*W,y:(e.clientY-r.top)/r.height*H}}
  main.addEventListener('pointerdown',function(e){if(!G||paused||!state||state.over||!cv)return;try{cv.setPointerCapture(e.pointerId)}catch(_){}G.down&&G.down(toLogical(e),e)});
  main.addEventListener('pointermove',function(e){if(!G||paused||!state||state.over||!cv)return;G.move&&G.move(toLogical(e),e)});
  main.addEventListener('pointerup',function(e){if(!G||paused||!state||state.over||!cv)return;G.up&&G.up(toLogical(e),e)});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&state&&!state.over){togglePause();return}if(G&&!paused&&state&&!state.over&&G.key)G.key(e.key,true,e)});
  document.addEventListener('keyup',function(e){if(G&&!paused&&state&&!state.over&&G.key)G.key(e.key,false,e)});
  $('#tPause').onclick=togglePause;
  document.addEventListener('visibilitychange',function(){if(document.hidden&&state&&!state.over&&!paused)togglePause()});
  function togglePause(){if(!state||state.over)return;paused=!paused;$('#tPause').textContent=paused?'▶':'❚❚';
    var o=$('#tPauseO');if(paused){o=document.createElement('div');o.id='tPauseO';o.className='t-scr';o.style.background='rgba(23,9,12,.55)';o.innerHTML='<div class="t-card" style="text-align:center"><h2 style="margin:0;font:800 30px Fraunces,serif;color:var(--wine)">Pausa</h2><p style="margin:0">Anche Elvezio si ferma per un caffè.</p><div class="t-row"><button class="t-btn gold" type="button" id="tRes">Continua</button><button class="t-btn ghost" type="button" id="tQuit">Esci dalla partita</button></div></div>';main.appendChild(o);$('#tRes').onclick=togglePause;$('#tQuit').onclick=function(){paused=false;intro()}}else if(o)o.remove();last=performance.now()}

  // l'interfaccia che usano i giochi
  var api={W:W,H:H,sfx:sfx,buzz:buzz,pop:pop,toast:toast,
    get ctx(){return ctx},get state(){return state},
    img:function(src){var i=new Image();i.crossOrigin='anonymous';i.src=src;return i},
    add:function(n,x,y,c){if(!state||state.over)return;state.score=Math.max(0,state.score+Math.round(n));if(x!=null)api.float((n>0?'+':'')+Math.round(n),x,y,c)},
    float:function(t,x,y,c,size){state&&state.fx.push({txt:t,x:x,y:y,c:c,size:size,t:0,d:.9})},
    burst:function(x,y,c,n){if(!state)return;for(var i=0;i<(n||14);i++){var a=Math.random()*6.28,s=120+Math.random()*260;state.fx.push({x:x,y:y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-200,r:3+Math.random()*5,c:c||'#FFD24A',t:0,d:.6+Math.random()*.4})}},
    lose:function(n){if(!state||state.over)return;state.lives=Math.max(0,state.lives-(n||1));buzz(120);sfx('bad');if(state.lives<=0)end('vite')},
    end:function(r){end(r||'fine')},
    shake:function(){var c=cv;if(!c)return;c.animate&&c.animate([{transform:'translate(0,0)'},{transform:'translate(-6px,3px)'},{transform:'translate(5px,-4px)'},{transform:'translate(0,0)'}],{duration:220})}
  };

  // ----- fine partita -----
  function end(reason){if(!state||state.over)return;state.over=true;$('#tPause').hidden=true;
    var s=state.score,l=state.l,L=state.L,th=L.stars,st=s>=th[2]?3:s>=th[1]?2:s>=th[0]?1:0,c=Math.max(1,Math.min(5,1+Math.floor(s/th[2]*4.2)));
    var prevBest=lvBest(l),prevSt=lvStars(l),newRec=s>prevBest;if(newRec)LS.set('best_'+ID+'_'+l,s);if(st>prevSt)LS.set('stars_'+ID+'_'+l,st);
    var mx=Math.max(lvStars('facile'),lvStars('medio'),lvStars('difficile'));LS.set('stars_'+ID,mx);
    ev('game_end',ID+':'+l,s);sfx(st?'win':'lose');
    var ni=LV.indexOf(l)+1,nextOk=ni<3&&unlocked(ni);
    var msg=cfg.verdict?cfg.verdict(st,s,reason):['Non preoccuparti: anche io la prima volta ho sbagliato tutto.','Bene! Ma la nonna ha fatto di più.','Bravo! Sei quasi un nipote ufficiale.','Perfetto! Ti nomino campione di '+esc(cfg.zone||'Ticino')+'.'][st];
    setTimeout(function(){
    main.innerHTML='<div class="t-scr"><div class="t-card t-res" style="text-align:center;justify-items:center">'+
      '<p style="margin:0;font:800 12px Montserrat;letter-spacing:.1em;text-transform:uppercase;color:var(--red)">'+esc(cfg.title)+' · '+LVN[l]+'</p>'+
      '<h2>'+(reason==='vite'?'Partita finita!':reason==='tempo'?'Tempo scaduto!':'Fine!')+'</h2>'+
      '<div class="t-big">'+s+'</div>'+stars(st)+
      '<div class="t-cas" aria-label="'+c+' caschetti su 5">'+[0,1,2,3,4].map(function(i){return cas(i<c)}).join('')+'</div>'+
      '<p style="margin:0">'+(newRec&&prevBest?'<b style="color:var(--red)">Nuovo record!</b> ':'')+'Il tuo record: '+Math.max(prevBest,s)+'</p>'+
      '<div class="t-say" style="text-align:left;justify-self:stretch"><b>E</b><p>'+msg+'</p></div>'+
      '<div class="t-rank" id="tRank" style="justify-self:stretch">Salvo in classifica…</div>'+
      (ni<3&&!nextOk?'<p style="margin:0;font-size:14px;color:var(--brown)">Prendi almeno una stella per aprire il livello '+LVN[LV[ni]]+'.</p>':'')+
      '<div class="t-row" style="justify-self:stretch"><button class="t-btn gold" type="button" id="tAgain">Rigioca</button>'+(nextOk?'<button class="t-btn wine" type="button" id="tNext">Livello '+LVN[LV[ni]]+' →</button>':'')+'</div>'+
      '<div class="t-row" style="justify-self:stretch"><button class="t-btn ghost" type="button" id="tShare">Condividi</button><button class="t-btn ghost" type="button" id="tBoard">Classifica</button><a class="t-btn ghost" href="/parco/">Mappa</a></div>'+
      '</div></div>';
    $('#tAgain').onclick=function(){play(l)};if($('#tNext'))$('#tNext').onclick=function(){play(LV[ni])};
    $('#tBoard').onclick=function(){board(l)};
    $('#tShare').onclick=function(){share('Ho fatto '+s+' punti a '+cfg.title+' ('+LVN[l]+') nel parco giochi di Elvezio, '+st+'/3 stelle. Riesci a battermi?')};
    save(s,l);
    },reason==='vite'||reason==='tempo'?700:400);
  }
  function save(s,l){var el=$('#tRank'),tk=state&&state.tk;
    if(!ME){el.innerHTML=READY?'<a href="/parco/?torna='+encodeURIComponent(location.pathname)+'" style="color:#FFD24A">Entra nel parco</a> per mettere i punti in classifica.':'La classifica del parco apre tra pochi giorni, insieme agli account.';return}
    if(!tk||s<1){el.textContent=s<1?'Zero punti: in classifica non ci vai, ma ci hai provato!':'Classifica non raggiungibile adesso.';return}
    fetch('/api/score',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({tk:tk,g:ID,score:s})}).then(function(r){return r.json()}).then(function(j){
      if(j.ok)el.innerHTML=j.rankWeek===1?'🏆 Sei <b>PRIMO</b> in classifica questa settimana!':'Sei <b>'+j.rankWeek+'°</b> questa settimana · <b>'+j.rankAll+'°</b> di sempre';
      else el.textContent=j.error==='troppo'?'Troppo veloce per essere vero! Punteggio non salvato.':'Non sono riuscito a salvare il punteggio.'}).catch(function(){el.textContent='Connessione assente: punteggio non salvato.'})}
  function share(t){var full=t+'\n'+location.origin+location.pathname;ev('share',ID);if(navigator.share)navigator.share({text:full}).catch(function(){});else if(navigator.clipboard)navigator.clipboard.writeText(full).then(function(){toast('Copiato! Incollalo nelle storie o su WhatsApp.')}).catch(function(){})}

  // ----- classifica per livello -----
  function board(l){l=l||'facile';var p='week';var sh=document.createElement('div');sh.className='t-sheet';sh.innerHTML='<div class="t-sheet-in" role="dialog" aria-modal="true" aria-label="Classifica"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><h3>'+esc(cfg.title)+'</h3><button class="t-ib" type="button" id="tLbX">Chiudi</button></div><div class="t-tabs" id="tLv">'+LV.map(function(x){return '<button type="button" data-l="'+x+'">'+LVN[x]+'</button>'}).join('')+'</div><div class="t-tabs" id="tPer"><button type="button" data-p="week">Questa settimana</button><button type="button" data-p="all">Di sempre</button></div><div id="tRows" style="display:grid;gap:6px"></div></div>';
    document.body.appendChild(sh);function close(){sh.remove()}$('#tLbX',sh).onclick=close;sh.onclick=function(e){if(e.target===sh)close()};
    function load(){sh.querySelectorAll('#tLv button').forEach(function(b){b.classList.toggle('on',b.dataset.l===l)});sh.querySelectorAll('#tPer button').forEach(function(b){b.classList.toggle('on',b.dataset.p===p)});
      $('#tRows',sh).innerHTML='<p style="color:#C9B8A0">Carico…</p>';
      fetch('/api/top?g='+ID+'&l='+l+'&p='+p+'&n=20').then(function(r){return r.json()}).then(function(j){var t=j.top||[];$('#tRows',sh).innerHTML=t.length?t.map(function(r,i){var me=ME&&r.name===ME.nick;return '<div class="t-lbr'+(me?' me':'')+'"><span class="r">'+(i+1)+'</span><span class="n">@'+esc(r.name)+(me?' · tu':'')+'</span><span class="s">'+r.score+'</span></div>'}).join(''):'<p style="color:#C9B8A0">Ancora nessuno qui. Il primo posto è libero!</p>'}).catch(function(){$('#tRows',sh).innerHTML='<p style="color:#C9B8A0">Classifica non raggiungibile adesso.</p>'})}
    sh.querySelectorAll('#tLv button').forEach(function(b){b.onclick=function(){l=b.dataset.l;load()}});sh.querySelectorAll('#tPer button').forEach(function(b){b.onclick=function(){p=b.dataset.p;load()}});load()}
  $('#tLb').onclick=function(){board(state?state.l:'facile')};

  main.innerHTML='<div class="t-scr"><div class="t-card" style="text-align:center"><span class="t-medal" style="'+medal+';justify-self:center"></span><p>Carico il gioco…</p></div></div>';
  var pre=(cfg.preload||[]).map(function(src){return new Promise(function(ok){var i=new Image();i.crossOrigin='anonymous';i.onload=i.onerror=function(){ok()};i.src=src})});
  Promise.all([auth()].concat(pre)).then(function(){if(READY&&!ME)needLogin();else intro()});
}};
})();
