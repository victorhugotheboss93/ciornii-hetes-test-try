// ===== MODUL SHOOTER & MULTIPLAYER FIREBASE FIRESTORE (V3.6.4) =====
(()=>{
const W=1280,H=720,N=32,FOV=1.15,C=640,$=id=>document.getElementById(id),cv=$('gameCanvas'),cx=cv.getContext('2d');
const IMG={};
['enemy','makarov','ppsh','mosin','svt40','rpg7','ak47','rpk16','pkm','ak12'].forEach(n=>{
 IMG[n]=new Image(); IMG[n].src=n+'.png';
});

const myUniqueId = 'p_' + Math.random().toString(36).substring(2, 9);
let unsubscribeMp = null;
let lastSyncTime = 0;
let killFeedMessages = []; 

function addKillFeed(text) {
 killFeedMessages.push({ text: text, time: performance.now() + 4000 });
 if (killFeedMessages.length > 5) killFeedMessages.shift();
}

const SKINS={
 hetes:{name:'Hetes', front:'hetes-front.png', back:'hetes-back.png', cond:'I-l ai de la inceput', unlock:()=>true, ab:'Lasere din ochi rosii (max 10m pe AI)', multiWeapon:false},
 catalin:{name:'Catalin', front:'catalin-front.png', back:'catalin-back.png', cond:'Dupa ce castigi modul aura hetes', unlock:()=>window.gameStats.auraCompletions>=1, ab:'Aura luminoasă & rezistență la gloanțe & o viață în plus', multiWeapon:false},
 proletar:{name:'Proletar', front:'proletar-front.png', back:'proletar-back.png', cond:'Castigi modul sovietic de la modul clasic', unlock:()=>(window.gameStats.classicCompletions?.soviet||0)>=1, ab:'Echipează 3 arme & armă nouă la fiecare 6 utilizări de abilitate & regenerare 5 HP între pauze', multiWeapon:false, maxWeapons:5},
 gopnik:{name:'Gopnik', front:'gopnik-front.png', back:'gopnik-back.png', cond:'Castigi modul sovietic si modul stalingrad', unlock:()=>(window.gameStats.classicCompletions?.soviet||0)>=1 && (window.gameStats.shooter?.wins||0)>=1, ab:'Player muzical Hardbass (Taste M, K, L) & Vodka (+50 HP)', multiWeapon:false},
 nazbol:{name:'Nazbol', front:'nazbol-front.png', back:'nazbol-back.png', cond:'Castigi modul sovietic, stalingrad de 2 ori + 100 victime', unlock:()=>(window.gameStats.classicCompletions?.soviet||0)>=1 && (window.gameStats.shooter?.wins||0)>=2 && (window.gameStats.shooter?.kills||0)>=100, ab:'Fum roșu (invulnerabilitate 5s, cooldown 20s, viteză mare)', multiWeapon:false},
 'soldat-sovietic':{name:'Soldat Sovietic', front:'soldat-sovietic-front.png', back:'soldat-sovietic-back.png', cond:'Castigi modul sovietic, stalingrad de 5 ori + 300 victime', unlock:()=>(window.gameStats.classicCompletions?.soviet||0)>=1 && (window.gameStats.shooter?.wins||0)>=5 && (window.gameStats.shooter?.kills||0)>=300, ab:'Până la 5 arme & Grenade devastation (kill instant)', multiWeapon:true},
 'cernobil-stalker':{name:'Cernobîl Stalker', front:'cernobil-stalker-front.png', back:'cernobil-stalker-back.png', cond:'Castigi modul sovietic, stalingrad de 10 ori + 500 victime', unlock:()=>(window.gameStats.classicCompletions?.soviet||0)>=1 && (window.gameStats.shooter?.wins||0)>=10 && (window.gameStats.shooter?.kills||0)>=500, ab:'Gloanțe toxice & Daune toxice pe rază 15m & Grenade toxice (kill instant + efect)', multiWeapon:true},
'soldat-rus-modern': {
   name: 'Soldat Rus Modern', 
   front: 'soldat-rus-modern-front.png', 
   back: 'soldat-rus-modern-back.png', 
   cond: 'Castigi sovietic de 3 ori, stalingrad de 10 ori, 1000 victime + castigi la mp', 
   unlock: () => {
     const g = window.gameStats || {};
     const s = g.shooter || {};
     const c = g.classicCompletions || {};
     return Number(c.soviet ?? 0) >= 3 && Number(s.wins ?? 0) >= 10 && Number(s.kills ?? 0) >= 1000 && Number(s.mpWins ?? 0) >= 1;
   }, 
   ab: 'Rezistență sporită la gloanțe & 125 HP & 5 arme & Grenade', 
   multiWeapon: true
 },
'anti-furry-hetes': {
   name: 'Anti-Furry Hetes', 
   front: 'anti-furry-hetes-front.png', 
   back: 'anti-furry-hetes-back.png', 
   cond: 'Castigi sovietic de 7 ori, stalingrad de 20 de ori, 2500 victime + mp de 3 ori', 
   unlock: () => {
     const g = window.gameStats || {};
     const s = g.shooter || {};
     const c = g.classicCompletions || {};
     return Number(c.soviet ?? 0) >= 7 && Number(s.wins ?? 0) >= 20 && Number(s.kills ?? 0) >= 2500 && Number(s.mpWins ?? 0) >= 3;
   }, 
   ab: 'Rage Mode (200 HP, viteză mare, lasere la 3s) & Grenade & Lasere & 5 arme', 
   multiWeapon: true
 }
};
Object.keys(SKINS).forEach(k=>{
 const s=SKINS[k];
 s.imgF=new Image(); s.imgF.src=s.front;
 s.imgB=new Image(); s.imgB.src=s.back;
});

const WP={
 mak:{n:'Makarov',img:'makarov',dmg:26,rate:.33,ammo:Infinity,give:0,need:0},
 mos:{n:'Mosin-Nagant',img:'mosin',dmg:100,rate:1.1,ammo:30,give:3,need:0},
 ppsh:{n:'PPSh-41',img:'ppsh',dmg:14,rate:.075,ammo:200,give:14,need:15},
 svt:{n:'SVT-40',img:'svt40',dmg:45,rate:.25,ammo:70,give:6,need:40},
 rpg:{n:'RPG-7',img:'rpg7',dmg:150,rate:1.8,ammo:8,give:1,need:80,sp:2.5},
 ak:{n:'AK-47',img:'ak47',dmg:30,rate:.1,ammo:150,give:10,need:120},
 rpk16:{n:'RPK-16',img:'rpk16',dmg:28,rate:.09,ammo:200,give:15,need:200},
 pkm:{n:'PKM',img:'pkm',dmg:40,rate:.12,ammo:250,give:20,need:350},
 ak12:{n:'AK-12',img:'ak12',dmg:34,rate:.08,ammo:180,give:15,need:500}
};

const GRS_PLAYLIST = [
 { name: "Священная война - Sp00n .exe - 8 bit remix", src: "svoina.mp3" },
 { name: "Наш гимн - Hard Bass School", src: "nashgimn.mp3" },
 { name: "Триполоски - Davay", src: "tripoloski.mp3" },
 { name: "Cheeki Breeki Hardbass Anthem - apartje", src: "cheekibreeki.mp3" },
 { name: "Kalinka Hardbass Remix - DJ Bonebreaker", src: "kalinkahardbass.mp3" }
];
let currentGopnikTrackIdx = 0;
let gopnikAudio = null;

const gs=()=>{const g=window.gameStats;return g.shooter||(g.shooter={kills:0,wins:0,score:0,loadout:['mak','mos','ppsh'],skin:'hetes',mpWins:0})};
window.mergeShooterStats=s=>{const m=gs();['kills','wins','score','mpWins'].forEach(k=>{if(s[k]>m[k])m[k]=s[k]});if(s.loadout&&!m.kills)m.loadout=s.loadout;if(s.skin)m.skin=s.skin};
const pl=(a,v=.5)=>{try{const c=a.cloneNode();c.volume=v;c.play().catch(()=>{})}catch(e){}};

function getMaxWeapons(skinKey){
 const sk=SKINS[skinKey];
 if(sk.maxWeapons) return sk.maxWeapons;
 return sk.multiWeapon ? 5 : 3;
}

const M=new Uint8Array(N*N);let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
for(let i=0;i<N;i++)M[i]=M[N*N-1-i]=M[i*N]=M[i*N+N-1]=1;
[[3,3,7,6,1,2],[12,3,6,5,2,3],[21,3,8,7,1,1],[3,13,6,7,2,0],[12,12,8,6,1,2],[23,14,6,8,2,3],[4,24,8,5,1,0],[15,23,7,6,2,1]].forEach(([x,y,w,h,t,d])=>{
 for(let i=0;i<w;i++)for(let j=0;j<h;j++)if(!i||!j||i==w-1||j==h-1)M[(y+j)*N+x+i]=rnd()<.13?0:t;
 const dx=d==1?x+w-1:d==3?x:x+(w>>1),dy=d==0?y:d==2?y+h-1:y+(h>>1);M[dy*N+dx]=0});
for(let k=0;k<45;k++){const x=1+rnd()*30|0,y=1+rnd()*30|0;if(!M[y*N+x])M[y*N+x]=3}
for(let i=-2;i<=2;i++)for(let j=-2;j<=2;j++)M[(10+j)*N+10+i]=0;

const COL=[0,[170,80,55],[125,125,130],[80,68,60]],Z=new Float32Array(C);
const solid=(x,y,r=.2)=>M[((y-r)|0)*N+((x-r)|0)]||M[((y-r)|0)*N+((x+r)|0)]||M[((y+r)|0)*N+((x+r)|0)]||M[((y+r)|0)*N+((x+r)|0)];
const cast=(px,py,a)=>{let dx=Math.cos(a)||1e-9,dy=Math.sin(a)||1e-9,mx=px|0,my=py|0,ax=Math.abs(1/dx),ay=Math.abs(1/dy),sx=dx<0?-1:1,sy=dy<0?-1:1,
 tx=(dx<0?px-mx:mx+1-px)*ax,ty=(dy<0?py-my:my+1-py)*ay,s=0,t=0;
 for(let i=0;i<70;i++){if(tx<ty){tx+=ax;mx+=sx;s=0}else{ty+=ay;my+=sy;s=1}t=M[my*N+mx];if(t)break}
 const d=s?ty-ay:tx-ax,w=s?px+d*dx:py+d*dy;return[d,t,s,w-Math.floor(w)]}
const los=(x1,y1,x2,y2)=>cast(x1,y1,Math.atan2(y2-y1,x2-x1))[0]>Math.hypot(x2-x1,y2-y1);

const st=document.createElement('style');
st.textContent=`
.btn-shooter{border-left:8px solid #cc0000}
#sh-cards{display:flex;gap:12px;flex-wrap:wrap;justify-content:center;max-width:650px;margin:10px;max-height:420px;overflow-y:auto;padding-right:5px;}
.shc{width:115px;background:#222;border:2px solid #555;border-radius:8px;padding:6px;text-align:center;cursor:pointer;font-size:11px}
.shc img{width:100%;height:50px;object-fit:contain}
.shc.on{border-color:#ffcc00;background:#443}
.shc.lock{opacity:.4;cursor:not-allowed}
#sh-lose{background:rgba(0,0,0,0);transition:background 8s}
#sh-lose.dark{background:#000}
#sh-lose-btn{opacity:0;transition:opacity 2.5s ease-in-out;pointer-events:none}
#sh-lose-btn.show-btn{opacity:1;pointer-events:auto}
#sh-win{background:rgba(0,0,0,.6)}
.sh-layout{display:flex;width:95%;height:80vh;align-items:center;justify-content:space-between;gap:15px;}
.sh-side-menu{width:280px;height:100%;background:rgba(0,0,0,0.8);border:2px solid #ffcc00;border-radius:8px;padding:12px;overflow-y:auto;font-size:12px;text-align:left;}
.sh-side-menu h3{color:#ffcc00;margin-top:0;text-align:center;border-bottom:1px solid #444;padding-bottom:5px;}
.sh-center-panel{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;}
.sh-right-buttons{width:220px;display:flex;flex-direction:column;gap:15px;justify-content:center;align-items:center;}
#mp-back-btn {
 position: absolute; top: 20px; left: 20px; z-index: 100;
 padding: 8px 16px; font-size: 14px; background: #c0392b;
 border: 1px solid #e74c3c; color: white; border-radius: 4px;
 cursor: pointer; font-weight: bold;
}
#mp-back-btn:hover { background: #e74c3c; }
`;
document.head.appendChild(st);

$('game-container').insertAdjacentHTML('beforeend',`
<button id="mp-back-btn" class="hidden" onclick="backToMain()">Ieși la meniu</button>
<div id="sh-menu" class="screen hidden"><h1 class="main-title" style="font-size:50px">Modul Shooter</h1>
<div class="modes-list" style="margin-top:30px">
<button class="btn btn-aura" onclick="shArsenal('stalingrad')">Modul Stalingrad</button>
<button class="btn btn-soviet" onclick="shArsenal('multiplayer')">Modul Multiplayer Online (FFA)</button>
<button class="btn btn-back" onclick="backToMain()">Înapoi la meniu</button></div></div>

<div id="sh-arsenal" class="screen hidden">
  <div class="sh-layout">
    <div class="sh-side-menu" id="sh-side-info">
      <h3>Ghid Skinuri & Abilități</h3>
      <div id="skin-info-list"></div>
    </div>
    <div class="sh-center-panel">
      <h1 class="main-title" style="font-size:36px;margin-bottom:5px;">Arsenal & Skinuri</h1>
      <div style="color:#ccc;text-align:center;font-size:12px" id="arsenal-sub">Alege armele și skinul.</div>
      <div id="sh-cards"></div>
      <div style="margin:5px;font-size:13px;color:#ffcc00" id="skin-desc">Skin: Hetes</div>
    </div>
    <div class="sh-right-buttons">
      <button class="btn btn-easy" style="min-width:180px;padding:12px 20px;font-size:18px;" onclick="shStartGame()">Start Game</button>
      <button class="btn btn-back" style="min-width:180px;padding:10px 20px;font-size:16px;" onclick="shMenu()">Înapoi</button>
    </div>
  </div>
</div>

<div id="sh-lose" class="screen hidden">
  <button id="sh-lose-btn" class="btn btn-back" onclick="backToMain()">Înapoi la meniu</button>
</div>
<div id="sh-win" class="screen hidden"><div class="end-title" style="color:#33ff33">Misiune Îndeplinită! ☭</div><button class="btn btn-back" onclick="backToMain()">Înapoi la meniu</button></div>`);

document.querySelector('#main-menu .modes-list').insertAdjacentHTML('beforeend','<button class="btn btn-shooter" onclick="shMenu()">Modul Shooter</button>');

const show=(id,v)=>$(id).classList.toggle('hidden',!v);
let shooterGameType='stalingrad';

window.shMenu=()=>{
 show('main-menu',0);show('auth-panel',0);show('sh-arsenal',0);show('sh-menu',1);$('mp-back-btn').classList.add('hidden');
 if(window.hideMobileControls) window.hideMobileControls();
};
window.shArsenal=(type)=>{
 shooterGameType=type;
 show('sh-menu',0);show('sh-arsenal',1);
 cards();
 renderSideInfo();
 $('mp-back-btn').classList.add('hidden');
};

function renderSideInfo(){
 let html='';
 Object.keys(SKINS).forEach(k=>{
  const sk=SKINS[k];
  const unlocked=sk.unlock();
  html+=`<div style="margin-bottom:10px;padding:6px;background:#222;border-radius:4px;border-left:3px solid ${unlocked?'#2ecc71':'#e74c3c'}">
   <strong style="color:${unlocked?'#2ecc71':'#ff6b6b'}">${sk.name}</strong><br>
   <span style="font-size:10px;color:#aaa"><b>Condiție:</b> ${sk.cond}</span><br>
   <span style="font-size:10px;color:#ffcc00"><b>Abilitate:</b> ${sk.ab}</span>
  </div>`;
 });
 $('skin-info-list').innerHTML=html;
}

function cards(){
 const g=gs();
 const maxWeapons = getMaxWeapons(g.skin);
 $('arsenal-sub').innerText=`Alege armele (max ${maxWeapons}) și skinul.`;

 let html='<div style="width:100%;text-align:center;color:#00ffcc;font-size:12px;"><b>ARME:</b></div>';
 html+=Object.keys(WP).map(id=>{
  const w=WP[id],ok=g.kills>=w.need,on=g.loadout.includes(id);
  return`<div class="shc ${ok?'':'lock'} ${on&&ok?'on':''}" onclick="shPickW('${id}')"><img src="${w.img}.png"><b>${w.n}</b><br>${ok?(on?'✔ echipată':'disponibilă'):'🔒 '+w.need+' vit'}</div>`
 }).join('');

 html+='<div style="width:100%;text-align:center;color:#ffcc00;font-size:12px;margin-top:6px;"><b>SKINURI:</b></div>';
 html+=Object.keys(SKINS).map(key=>{
  const sk=SKINS[key],ok=sk.unlock(),on=g.skin===key;
  return`<div class="shc ${ok?'':'lock'} ${on&&ok?'on':''}" onclick="shPickSkin('${key}')"><img src="${sk.front}"><b>${sk.name}</b><br>${ok?(on?'✔ selectat':'disponibil'):'🔒 Blocat'}</div>`
 }).join('');

 $('sh-cards').innerHTML=html+`<div style="width:100%;text-align:center;margin-top:6px;font-size:11px;">Victime totale: ${g.kills}</div>`;
 $('skin-desc').innerText=`Skin activ: ${SKINS[g.skin].name} — Abilitate: ${SKINS[g.skin].ab}`;
}

window.shPickW=id=>{
 const g=gs();
 if(g.kills<WP[id].need)return;
 const maxWeapons = getMaxWeapons(g.skin);
 const i=g.loadout.indexOf(id);
 if(i>=0){
  if(g.loadout.length>1)g.loadout.splice(i,1);
 }else{
  if(g.loadout.length>=maxWeapons)g.loadout.shift();
  g.loadout.push(id);
 }
 cards();
};

window.shPickSkin=key=>{
 if(SKINS[key].unlock()){
  const g=gs();
  g.skin=key;
  const maxW = getMaxWeapons(key);
  if(g.loadout.length > maxW){
   g.loadout = [g.loadout[0]];
  }
  cards();
 }
};

window.shStartGame=()=>{
 const g=gs();
 const maxWeapons = getMaxWeapons(g.skin);
 g.loadout=g.loadout.filter(i=>WP[i]&&g.kills>=WP[i].need);
 if(!g.loadout.length)g.loadout=['mak'];
 if(g.loadout.length>maxWeapons)g.loadout=g.loadout.slice(0, maxWeapons);

 startShooterSession(shooterGameType);
};

const ulb=window.updateLeaderboardUI,slt=window.switchLeaderboardTab;
window.updateLeaderboardUI=function(){
 ulb();
 const c=$('leaderboard-content');
 if(currentLeaderboardTab==='shooter'){
  const L=(window.globalUsersList||[]).slice().sort((a,b)=>(b.shooterScore||0)-(a.shooterScore||0));
  c.innerHTML=L.length?L.map((p,i)=>`<div class="global-item"><span>#${i+1} <strong>${p.name}</strong></span><span>Scor: <strong style="color:#ff6b6b">${p.shooterScore||0}</strong> | Victime: ${p.shooterKills||0}</span></div>`).join(''):'<div style="text-align:center;margin-top:20px;color:#aaa">Fără scoruri în această categorie.</div>';
 } else if(currentLeaderboardTab==='personal'){
  const s=gs();
  c.insertAdjacentHTML('beforeend','<hr style="border:0;border-top:1px solid #444;margin:5px 0"><strong>Shooter:</strong> victime <span style="color:#ff6b6b">'+s.kills+'</span> · victorii '+s.wins+' · scor '+s.score);
 }
};
window.switchLeaderboardTab=t=>{
 slt(t);
 const tabShooter=$('tab-shooter');
 if(tabShooter) tabShooter.classList.toggle('active',t==='shooter');
};
window.updateLeaderboardUI();

let S={on:false};let loseTimer=null;const k=n=>keys[n];
const bm=window.backToMain;
window.backToMain=()=>{
 S.on=false;
 if(loseTimer){clearTimeout(loseTimer);loseTimer=null;}
 $('sh-lose-btn').classList.remove('show-btn');
 $('mp-back-btn').classList.add('hidden');
 ['sh-menu','sh-arsenal','sh-lose','sh-win'].forEach(i=>show(i,0));
 if(window.db && window.fsDeleteDoc){
  window.fsDeleteDoc(window.fsDoc(window.db, "mp_sessions", myUniqueId)).catch(()=>{});
 }
 if(unsubscribeMp){ unsubscribeMp(); unsubscribeMp = null; }
 if(gopnikAudio){ gopnikAudio.pause(); gopnikAudio=null; }
 if(S.music)S.music.pause();
 if(window.sndStalingradBgm){window.sndStalingradBgm.pause();window.sndStalingradBgm.currentTime=0;}
 document.exitPointerLock&&document.exitPointerLock();bm()
};

function startShooterSession(mode){
 const g=gs();
 if(loseTimer){clearTimeout(loseTimer);loseTimer=null;}
 $('sh-lose-btn').classList.remove('show-btn');
 ['sh-arsenal','sh-lose','sh-win'].forEach(i=>show(i,0));$('sh-lose').classList.remove('dark');
 stopMenuMusic();sndUssrWin.pause();currentMode='SHOOTER';gameActive=false;

 if(window.setupMobileShooterUI) window.setupMobileShooterUI();

 if(window.sndStalingradBgm){
  window.sndStalingradBgm.volume=0.8;
  window.sndStalingradBgm.currentTime=0;
  window.sndStalingradBgm.play().catch(()=>{});
 }

 let spawnX = 10.5, spawnY = 10.5;
 if(mode === 'multiplayer') {
  const hash = [...myUniqueId].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const spawns = [[5.5, 5.5], [26.5, 5.5], [5.5, 26.5], [26.5, 26.5], [16.5, 16.5]];
  let chosen = spawns[hash % spawns.length];
  spawnX = chosen[0]; spawnY = chosen[1];

  if(window.db && window.fsOnSnapshot && window.fsCollection) {
   if(unsubscribeMp) unsubscribeMp();
   unsubscribeMp = window.fsOnSnapshot(window.fsCollection(window.db, "mp_sessions"), (snapshot) => {
    if(!S.on || S.mode !== 'multiplayer') return;
    S.mpPlayers = [];
    snapshot.forEach(docSnap => {
     const data = docSnap.data();
     if(data.id !== myUniqueId && (Date.now() - data.updatedAt < 4000)) {
      S.mpPlayers.push(data);
     }
    });
   });
  }
 }

 let baseHp = 100;
 if(g.skin==='soldat-rus-modern') baseHp = 125;
 if(g.skin==='anti-furry-hetes') baseHp = 200;

 S={
  on:true, mode:mode, x:spawnX, y:spawnY, a:0, hp:baseHp, maxHp:baseHp,
  w:g.loadout.slice(), cur:0, ammo:{}, cd:0, en:[], mpPlayers:[],
  wave:0, left:0, nw:1, sp:0, kills:0, katcd:0, flash:0, kick:0, hm:0,
  bob:0, ban:0, bt:'', t:performance.now(), fire:0,
  skin:g.skin, abilityCd:0, rage:false, rageTimer:0, extraLife:(g.skin==='catalin'?1:0),
  proletarCount:0, proletarRegenTimer:0, proletarWeaponProgress:0, toxicTarget:null, toxicTimer:0,
  nazbolSmokeTimer:0, nazbolInvincible:false,
  mpTimeLeft: 300,
  gopnikTrack: 0
 };
 S.w.forEach(i=>S.ammo[i]=WP[i].ammo);

 if(mode==='multiplayer'){
  $('mp-back-btn').classList.remove('hidden');
 } else {
  $('mp-back-btn').classList.add('hidden');
 }

 cv.requestPointerLock&&cv.requestPointerLock();
 requestAnimationFrame(loop);
}

cv.addEventListener('mousedown',()=>{if(!S.on)return;S.fire=1;if(document.pointerLockElement!==cv)cv.requestPointerLock()});
addEventListener('mouseup',()=>S.fire=0);
addEventListener('mousemove',e=>{if(S.on&&document.pointerLockElement===cv)S.a+=e.movementX*.0028});

window.updateMobileLookAngle = (delta) => { if(S.on) S.a += delta; };
window.triggerMobileAbility = () => { if(S.on) triggerSkinAbility(); };
window.triggerMobileKatyusha = () => { if(S.on && S.mode==='stalingrad') triggerKatyusha(); };

addEventListener('keydown',e=>{
 if(!S.on)return;
 if(e.key===' '||e.key.startsWith('Arrow'))e.preventDefault();
 if(e.key.toLowerCase()==='g'){ triggerSkinAbility(); }
 if(e.key.toLowerCase()==='f' && S.mode==='stalingrad'){ triggerKatyusha(); }

 if(S.skin==='gopnik'){
  let key = e.key.toLowerCase();
  if(key==='m'){ S.gopnikTrack=0; playGopnikMusic(); }
  else if(key==='k'){ S.gopnikTrack = (S.gopnikTrack - 1 + GRS_PLAYLIST.length) % GRS_PLAYLIST.length; playGopnikMusic(); }
  else if(key==='l'){ S.gopnikTrack = (S.gopnikTrack + 1) % GRS_PLAYLIST.length; playGopnikMusic(); }
 }
});

function playGopnikMusic(){
 if(window.sndStalingradBgm){ window.sndStalingradBgm.pause(); }
 if(gopnikAudio){ gopnikAudio.pause(); }
 let track = GRS_PLAYLIST[S.gopnikTrack];
 gopnikAudio = new Audio(track.src);
 gopnikAudio.loop = true;
 gopnikAudio.volume = 0.8;
 gopnikAudio.play().catch(()=>{});
 addKillFeed(`Gopnik a pus melodia: ${track.name}`);
}

function triggerKatyusha(){
 if(S.katcd>0)return;
 S.katcd=50;
 pl(sndExplosionRocket);
 S.flash=0.2;
 let killed=0;
 const g = gs();
 S.en.forEach(e=>{
  if(killed<4 && !e.dead){ 
   e.dead=1; 
   S.kills++; 
   g.kills = (g.kills || 0) + 1;
   g.score = (g.score || 0) + 50;
   killed++; 
  }
 });
 addKillFeed(`${window.currentUserDisplayName || 'Jucător'} a folosit Katyusha!`);
 saveStats();
}

function triggerSkinAbility(){
 if(S.abilityCd>0)return;

 if(S.skin==='nazbol'){
  S.abilityCd = 20;
  S.nazbolSmokeTimer = 5;
  S.nazbolInvincible = true;
  S.flash = 0.5;
  addKillFeed(`${window.currentUserDisplayName || 'Jucător'} a activat fumul roșu Nazbol (Invulnerabil 5s)!`);
  return;
 }

 if(S.skin==='soldat-sovietic' || S.skin==='soldat-rus-modern' || S.skin==='cernobil-stalker' || S.skin==='anti-furry-hetes'){
  S.abilityCd = S.skin==='anti-furry-hetes' ? 75 : 15;
  if(S.skin==='anti-furry-hetes'){
   S.rage = true;
   S.rageTimer = 15;
   S.hp = 200; S.maxHp = 200;
  }
  S.flash=0.4;
  let targets = [];
  S.en.forEach(e=>{ if(Math.hypot(e.x-S.x, e.y-S.y)<=10){ targets.push(e); } });
  
  if(targets.length > 0){
   let primary = targets[0];
   dmg(primary, 99999);
   if(S.skin==='cernobil-stalker'){ S.toxicTarget=primary; S.toxicTimer=3; }
   
   S.en.forEach(e=>{
    if(!e.dead && e !== primary && Math.hypot(e.x-primary.x, e.y-primary.y)<=2){
     dmg(e, 99999);
     if(S.skin==='cernobil-stalker'){ S.toxicTarget=e; S.toxicTimer=3; }
    }
   });
  }
  pl(sndExplosionRocket);
  addKillFeed(`${window.currentUserDisplayName || 'Jucător'} a aruncat o grenadă devastatoare (Kill Instant)!`);
  return;
 }

 S.abilityCd=10;
 if(S.skin==='hetes'){
  S.flash=0.4;
  S.en.forEach(e=>{ if(Math.hypot(e.x-S.x, e.y-S.y)<=10){ dmg(e, 100); } });
  pl(sndExplosionRocket);
  addKillFeed(`${window.currentUserDisplayName || 'Jucător'} a folosit laserele din ochi!`);
 } else if(S.skin==='gopnik'){
  S.hp=Math.min(S.maxHp, S.hp+50);
  pl(sndGun);
  addKillFeed(`${window.currentUserDisplayName || 'Jucător'} a băut Vodka (+50 HP)!`);
 } else if(S.skin==='proletar'){
  S.proletarCount++;
  S.proletarWeaponProgress++;
  if(S.proletarWeaponProgress >= 6){
   S.proletarWeaponProgress = 0;
   const allWKeys=Object.keys(WP);
   const newW = allWKeys.find(w=>!S.w.includes(w));
   if(newW && S.w.length < 5){ 
    S.w.push(newW); 
    S.ammo[newW]=WP[newW].ammo; 
    addKillFeed(`${window.currentUserDisplayName || 'Jucător'} a primit o armă nouă după 6 utilizări: ${WP[newW].n}!`);
   }
  } else {
   addKillFeed(`${window.currentUserDisplayName || 'Jucător'} a folosit abilitatea Proletar (${S.proletarWeaponProgress}/6 până la armă nouă)!`);
  }
  cards();
 }
}

function dmg(e,n){
 if(e.dead)return;
 e.hp-=n;
 S.hm=.12;
 if(e.hp<=0){
  e.dead=1;
  S.kills++;
  const g = gs();
  g.kills = (g.kills || 0) + 1;
  g.score = (g.score || 0) + 50;
  if(S.skin==='anti-furry-hetes' && S.rage){
   S.hp = Math.min(200, S.hp + 25);
  }
  saveStats(); 
  S.w.forEach(i=>{const w=WP[i];if(w.ammo!==Infinity)S.ammo[i]=Math.min(w.ammo*1.5,S.ammo[i]+w.give)});
 }
}

function hurt(n){
 if(S.nazbolInvincible) return;
 
 let resist = 1;
 if(S.skin==='soldat-rus-modern'||S.skin==='cernobil-stalker'||S.skin==='catalin') resist = 0.7;
 
 S.hp-=n*resist; S.flash=.3;
 
 if(S.skin==='anti-furry-hetes' && S.hp < 40 && S.abilityCd > 5){
  S.abilityCd -= 3;
 }

 if(S.hp<=0){
  if(S.extraLife>0){S.extraLife=0;S.hp=(S.skin==='anti-furry-hetes'?200:100);addKillFeed(`${window.currentUserDisplayName || 'Jucător'} a folosit viața suplimentară!`);return;}
  if(S.mode==='stalingrad'){
   addKillFeed(`${window.currentUserDisplayName || 'Jucător'} a fost trimis în GULAG!`);
   end(0);
  } else {
   S.hp=(S.skin==='anti-furry-hetes'?200:100);
   const hash = [...myUniqueId].reduce((acc, char) => acc + char.charCodeAt(0), 0);
   const spawns = [[5.5, 5.5], [26.5, 5.5], [5.5, 26.5], [26.5, 26.5], [16.5, 16.5]];
   let chosen = spawns[hash % spawns.length];
   S.x = chosen[0]; S.y = chosen[1];
  }
 }
}

function end(w){
 S.on=false;document.exitPointerLock&&document.exitPointerLock();
 $('mp-back-btn').classList.add('hidden');
 if(window.db && window.fsDeleteDoc){
  window.fsDeleteDoc(window.fsDoc(window.db, "mp_sessions", myUniqueId)).catch(()=>{});
 }
 if(unsubscribeMp){ unsubscribeMp(); unsubscribeMp = null; }
 if(gopnikAudio){ gopnikAudio.pause(); gopnikAudio=null; }
 const g=gs();
 if(w) g.wins = (g.wins || 0) + 1;
 if(S.mode==='multiplayer') g.mpWins = (g.mpWins || 0) + 1;
 g.score = (g.score || 0) + (w ? 2000 : 500);
 saveStats();
 stopMenuMusic();
 if(window.sndStalingradBgm){window.sndStalingradBgm.pause();window.sndStalingradBgm.currentTime=0;}
 S.music=new Audio(w?'gimn-sssr.mp3':'tyomnaya-noch.mp3');S.music.play().catch(()=>{});
 const el=$(w?'sh-win':'sh-lose');el.classList.remove('hidden');
 if(!w){
  setTimeout(()=>el.classList.add('dark'),50);
  loseTimer=setTimeout(()=>{$('sh-lose-btn').classList.add('show-btn');},10000);
 }
}

function shoot(){
 const id=S.w[S.cur],w=WP[id];if(S.ammo[id]<=0){S.cd=.3;return}
 let rateMultiplier = 1;
 if(S.rage) rateMultiplier = 0.6;
 if(S.skin==='anti-furry-hetes' && S.abilityCd <= 0 && Math.random() < 0.35){
  S.en.forEach(e=>{ if(Math.hypot(e.x-S.x, e.y-S.y)<=10) dmg(e, 50); });
 }

 S.cd=w.rate*rateMultiplier;S.ammo[id]--;S.kick=1;pl(w.sp?sndExplosionRocket:sndGun);
 const wd=cast(S.x,S.y,S.a)[0];let best=null,bd=1e9;
 
 S.en.forEach(e=>{const dx=e.x-S.x,dy=e.y-S.y,d=Math.hypot(dx,dy);let df=Math.atan2(dy,dx)-S.a;df=Math.atan2(Math.sin(df),Math.cos(df));if(Math.abs(df)*d<.38&&d<bd&&d<wd+.3){best=e;bd=d}});
 S.mpPlayers.forEach(p=>{if(p.dead)return;const dx=p.x-S.x,dy=p.y-S.y,d=Math.hypot(dx,dy);let df=Math.atan2(dy,dx)-S.a;df=Math.atan2(Math.sin(df),Math.cos(df));if(Math.abs(df)*d<.38&&d<bd&&d<wd+.3){best=p;bd=d}});

 if(w.sp){
  const L=best?bd:wd,ex=S.x+Math.cos(S.a)*L,ey=S.y+Math.sin(S.a)*L;
  S.en.forEach(e=>{const d=Math.hypot(e.x-ex,e.y-ey);if(d<w.sp)dmg(e,w.dmg)});
 } else if(best){
  if(best.id){
   S.kills++;
   const g = gs();
   g.kills = (g.kills || 0) + 1;
   g.score = (g.score || 0) + 50;
   addKillFeed(`${window.currentUserDisplayName || 'Jucător'} l-a eliminat pe ${best.name || 'Inamic'}!`);
   saveStats(); 
   if(window.db && window.fsSetDoc){
    window.fsSetDoc(window.fsDoc(window.db, "mp_sessions", best.id), {
     hp: Math.max(0, (best.hp || 100) - w.dmg)
    }, { merge: true }).catch(()=>{});
   }
  } else {
   dmg(best,w.dmg);
   if(S.skin==='cernobil-stalker'){ S.toxicTarget=best; S.toxicTimer=3; }
  }
 }
}

function spawn(){
 for(let i=0;i<60;i++){
  const x = 1.5 + Math.random() * (N - 3);
  const y = 1.5 + Math.random() * (N - 3);
  const mapIndex = (y | 0) * N + (x | 0);
  if(!M[mapIndex] && Math.hypot(x - S.x, y - S.y) > 7){
   S.en.push({x, y, hp:60, cd:1.5, sp:1 + S.wave * .12, hurt:0, wander:0, off:0});
   S.left--;
   return;
  }
 }
}

function update(dt){
 let forward = (k('w') || k('arrowup') ? 1 : 0) - (k('s') || k('arrowdown') ? 1 : 0);
 let strafe = (k('d') ? 1 : 0) - (k('a') ? 1 : 0);

 let c = Math.cos(S.a), s = Math.sin(S.a);
 let mx = forward * c - strafe * s;
 let my = forward * s + strafe * c;
 
 let spd = 3.2;
 if(S.skin==='gopnik'||S.skin==='hetes') spd = 4.2;
 if(S.skin==='nazbol' && S.nazbolInvincible) spd = 5.5;
 if(S.rage) spd = 5.8;

 S.a += ((k('arrowright')?1:0)-(k('arrowleft')?1:0))*2.2*dt;
 const l = Math.hypot(mx, my);
 if(l){
  mx = (mx / l) * spd * dt;
  my = (my / l) * spd * dt;
  S.bob += dt * 9;
  if(!solid(S.x + mx, S.y)) S.x += mx;
  if(!solid(S.x, S.y + my)) S.y += my;
 }
 
 for(let i=0;i<5;i++)if(k(''+(i+1))&&S.w[i])S.cur=i;
 S.cd-=dt;S.kick=Math.max(0,S.kick-dt*6);S.flash-=dt;S.hm-=dt;S.ban-=dt;S.katcd-=dt;S.abilityCd-=dt;

 if(S.skin==='proletar'){
  S.proletarRegenTimer += dt;
  if(S.proletarRegenTimer >= 5){
   S.proletarRegenTimer = 0;
   S.hp = Math.min(S.maxHp, S.hp + 5);
  }
 }

 if(S.nazbolSmokeTimer > 0){
  S.nazbolSmokeTimer -= dt;
  if(S.nazbolSmokeTimer <= 0){
   S.nazbolInvincible = false;
  }
 }

 S.rageTimer -= dt;
 if(S.rageTimer <= 0){
  S.rage = false;
 }

 if((S.fire||window.mobileShooterFire||k(' '))&&S.cd<=0)shoot();

 if(S.mode==='multiplayer'){
  S.mpTimeLeft -= dt;
  if(S.mpTimeLeft <= 0){
   end(1);
   return;
  }

  const now = performance.now();
  if(now - lastSyncTime > 100 && window.db && window.fsSetDoc) {
   lastSyncTime = now;
   window.fsSetDoc(window.fsDoc(window.db, "mp_sessions", myUniqueId), {
    id: myUniqueId,
    name: window.currentUserDisplayName || 'Anonim',
    x: S.x,
    y: S.y,
    a: S.a,
    hp: S.hp,
    skin: S.skin,
    weapon: S.w[S.cur],
    kills: S.kills,
    gopnikTrack: S.gopnikTrack,
    updatedAt: Date.now()
   }, { merge: true }).catch(()=>{});
  }
 }

 if(S.toxicTarget && S.toxicTimer>0){
  S.toxicTimer-=dt;
  if(!S.toxicTarget.dead) S.toxicTarget.hp-=5*dt;
  if(S.toxicTarget.hp<=0) { S.toxicTarget.dead=1; S.kills++; S.toxicTarget=null; }
 }

 if(S.mode==='stalingrad'){
  if(!S.left&&!S.en.length){
   if(S.wave==4){end(1);return}
   if((S.nw-=dt)<=0){
    S.wave++; S.left=5+4*S.wave; S.hp=Math.min(S.maxHp,S.hp+30);
    S.ban=2.5; S.bt='Valul '+S.wave+' / 4'; S.nw=3;
   }
  }
  if(S.left&&S.en.length<10&&(S.sp-=dt)<=0){S.sp=1.2;spawn();}
  
  S.en.forEach(e=>{
   const dx=S.x-e.x,dy=S.y-e.y,d=Math.hypot(dx,dy),see=d<14&&los(e.x,e.y,S.x,S.y);
   e.hurt-=dt;e.wander-=dt;
   if(!see&&Math.random()<dt*.4){e.wander=1;e.off=(Math.random()-.5)*4}
   let a=Math.atan2(dy,dx)+(e.wander>0?e.off:0);
   let nx=e.x+Math.cos(a)*e.sp*dt, ny=e.y+Math.sin(a)*e.sp*dt;
   if(!solid(nx,e.y,.25)){e.x=nx;} else {e.x+=Math.sin(a)*e.sp*dt;}
   if(!solid(e.x,ny,.25)){e.y=ny;} else {e.y+=Math.cos(a)*e.sp*dt;}
   
   if(see&&(e.cd-=dt)<=0){e.cd=1+Math.random();pl(sndNaziRifle,.3);if(Math.random()<.75-d*.035)hurt(5+(Math.random()*4|0))}
  });
  S.en=S.en.filter(e=>!e.dead);
 }
}

const sky=cx.createLinearGradient(0,0,0,H/2);sky.addColorStop(0,'#2a2022');sky.addColorStop(1,'#c4743a');
const flr=cx.createLinearGradient(0,H/2,0,H);flr.addColorStop(0,'#3d342e');flr.addColorStop(1,'#14110f');

function render(){
 cx.save();
 cx.fillStyle=sky;cx.fillRect(0,0,W,H/2);cx.fillStyle=flr;cx.fillRect(0,H/2,W,H/2);
 for(let i=0;i<C;i++){const a=S.a+(i/C-.5)*FOV,[d,t,s,wx]=cast(S.x,S.y,a),p=Math.max(.05,d*Math.cos(a-S.a));Z[i]=p;
  const h=H/p,y0=(H-h)/2,sh=Math.max(.1,1-p/15)*(s?.7:1),c=COL[t];
  for(let r=0;r<8;r++){const u=wx*4+(r&1)*.5,f=u-Math.floor(u),v=(.7+.3*Math.abs(Math.sin(Math.floor(u)*91.7+r*13.3+t)))*(f<.06?.55:1)*sh;
   cx.fillStyle=`rgb(${c[0]*v|0},${c[1]*v|0},${c[2]*v|0})`;cx.fillRect(i*2,y0+h*r/8,2,h/8+1)}}

 if(S.nazbolSmokeTimer > 0){
  cx.fillStyle = 'rgba(200, 0, 0, 0.45)';
  cx.fillRect(0, 0, W, H);
 }

 S.en.map(e=>(e.d=Math.hypot(e.x-S.x,e.y-S.y),e)).sort((a,b)=>b.d-a.d).forEach(e=>{
  let df=Math.atan2(e.y-S.y,e.x-S.x)-S.a;df=Math.atan2(Math.sin(df),Math.cos(df));if(Math.abs(df)>FOV/2+.4)return;
  const p=e.d*Math.cos(df);if(p<.3)return;const h=H/p*.95,w=h*.65,l=(.5+df/FOV)*W-w/2,y=(H-h)/2+h*.03;
  const im=IMG.enemy;
  for(let x=Math.max(0,l|0);x<Math.min(W,l+w);x+=2){
   if(Z[x>>1]<p)continue;
   if(im.complete&&im.naturalWidth)cx.drawImage(im,(x-l)/w*im.naturalWidth,0,2/w*im.naturalWidth,im.naturalHeight,x,y,2,h);
   else{cx.fillStyle='#4a5a3a';cx.fillRect(x,y,2,h)}
  }
 });

 S.mpPlayers.forEach(p=>{
  let df=Math.atan2(p.y-S.y, p.x-S.x)-S.a; df=Math.atan2(Math.sin(df), Math.cos(df));
  if(Math.abs(df)<FOV/2+.4){
   let dist=Math.hypot(p.x-S.x, p.y-S.y);
   let pDist=Math.max(0.3, dist*Math.cos(df));
   let h=H/pDist*0.9, w=h*0.6;
   let l=(.5+df/FOV)*W - w/2, y=(H-h)/2;
   const skObj = SKINS[p.skin] || SKINS.hetes;
   
   let viewAngle = p.a - Math.atan2(p.y - S.y, p.x - S.x);
   let isBack = Math.cos(viewAngle) >= 0;
   let imgSkin = isBack ? skObj.imgB : skObj.imgF;

   for(let x=Math.max(0,l|0);x<Math.min(W,l+w);x+=2){
    if(Z[x>>1]<pDist)continue;
    if(imgSkin && imgSkin.complete && imgSkin.naturalWidth){
     cx.drawImage(imgSkin, (x-l)/w*imgSkin.naturalWidth, 0, 2/w*imgSkin.naturalWidth, imgSkin.naturalHeight, x, y, 2, h);
    } else {
     cx.fillStyle='#e74c3c'; cx.fillRect(x, y, 2, h);
    }
   }

   cx.fillStyle = '#ffff00';
   cx.font = 'bold 13px sans-serif';
   cx.textAlign = 'center';
   cx.fillText(p.name || 'Anonim', l + w/2, y - 8);
   cx.textAlign = 'left';

   if(p.weapon && WP[p.weapon]){
    let wpObj = WP[p.weapon];
    let wImg = IMG[wpObj.img];
    if(wImg && wImg.complete && wImg.naturalWidth){
     let weaponX = l + w * 0.58;
     let weaponY = y + h * 0.58;
     let weaponW = w * 0.22;
     let weaponH = h * 0.12;
     cx.drawImage(wImg, weaponX, weaponY, weaponW, weaponH);
    }
   }
  }
 });

 const id=S.w[S.cur],wp=WP[id],wi=IMG[wp.img];
 if(wi.complete&&wi.naturalWidth){const h=H*.5,ww=h*wi.naturalWidth/wi.naturalHeight;
  cx.drawImage(wi,W*.62-ww*.35+Math.sin(S.bob)*12+S.kick*14,H-h*.92+Math.abs(Math.cos(S.bob))*10+S.kick*28,ww,h)}
 if(S.flash>0){cx.fillStyle=`rgba(200,0,0,${S.flash})`;cx.fillRect(0,0,W,H)}
 cx.restore();

 if(S.skin==='catalin'){
  ctx.strokeStyle = '#00ffff';
  ctx.lineWidth = 4;
  ctx.shadowBlur = 15;
  ctx.shadowColor = '#00ffff';
  ctx.strokeRect(2, 2, W-4, H-4);
  ctx.shadowBlur = 0;
 }

 cx.strokeStyle=S.hm>0?'#f33':'#fff';cx.lineWidth=2;cx.beginPath();cx.moveTo(W/2-10,H/2);cx.lineTo(W/2+10,H/2);cx.moveTo(W/2,H/2-10);cx.lineTo(W/2,H/2+10);cx.stroke();
 
 let hpBarWidth = Math.min(260, (S.maxHp / 100) * 260);
 cx.fillStyle='rgba(0,0,0,.6)';cx.fillRect(20,20,hpBarWidth,26);
 cx.fillStyle='#d22';cx.fillRect(20,20,Math.max(0,S.hp)*(hpBarWidth/S.maxHp),26);
 cx.strokeStyle='#fff';cx.strokeRect(20,20,hpBarWidth,26);
 cx.fillStyle='#fff';cx.font='bold 16px sans-serif';cx.fillText('HP '+Math.ceil(Math.max(0,S.hp))+'/'+S.maxHp,28,39);
 
 cx.fillStyle='rgba(0,0,0,0.7)';cx.fillRect(W-70,20,50,50);
 cx.strokeStyle='#ffcc00';cx.lineWidth=2;cx.strokeRect(W-70,20,50,50);
 cx.fillStyle=S.abilityCd<=0?'#ffcc00':'#666';cx.font='bold 32px sans-serif';
 cx.fillText('G',W-57,56);

 cx.fillStyle='#ffff00';cx.font='bold 16px sans-serif';
 if(S.mode==='stalingrad') {
  cx.fillText(`Victime: ${S.kills} · Rămași: ${S.en.length+S.left}`,20,70);
 } else {
  let mins = Math.floor(S.mpTimeLeft / 60);
  let secs = Math.floor(S.mpTimeLeft % 60);
  let timeStr = mins + ':' + (secs < 10 ? '0' : '') + secs;
  cx.fillText(`Multiplayer FFA · Victime: ${S.kills} · Timp: ${timeStr}`,20,70);
 }

 let currentTextY = 95;

 if(S.mode==='stalingrad'){
  cx.fillStyle=S.katcd<=0?'#00ffcc':'#888';
  cx.fillText('F - Katyusha: '+(S.katcd<=0?'[GATA]':Math.ceil(S.katcd)+'s'),20,currentTextY);
  currentTextY += 22;
 }

 cx.fillStyle=S.abilityCd<=0?'#00ffcc':'#888';
 cx.fillText('G - Abilitate: '+(S.abilityCd<=0?'[GATA]':Math.ceil(S.abilityCd)+'s'),20,currentTextY);
 currentTextY += 22;

 if(S.skin==='proletar'){
  cx.fillStyle='#ffcc00';
  cx.fillText(`Proletar Armă: ${S.proletarWeaponProgress}/6`, 20, currentTextY);
  currentTextY += 22;
 }

 if(S.skin==='gopnik'){
  let gopX = W - 320, gopY = 20, gopW = 240, gopH = 50;
  cx.fillStyle='rgba(0,0,0,0.8)'; cx.fillRect(gopX, gopY, gopW, gopH);
  cx.strokeStyle='#ffcc00'; cx.lineWidth=2; cx.strokeRect(gopX, gopY, gopW, gopH);
  cx.fillStyle='#ffcc00'; cx.font='bold 11px sans-serif';
  cx.fillText('🎵 Gopnik Hardbass (M, K, L)', gopX + 8, gopY + 16);
  cx.fillStyle='#fff'; cx.font='10px sans-serif';
  let curTrackName = GRS_PLAYLIST[S.gopnikTrack].name;
  if(curTrackName.length > 32) curTrackName = curTrackName.substring(0, 30) + '...';
  cx.fillText(curTrackName, gopX + 8, gopY + 36);
 }

 S.w.forEach((i,n)=>{cx.fillStyle=n==S.cur?'#ffcc00':'#aaa';cx.fillText(`${n+1}. ${WP[i].n}  ${S.ammo[i]===Infinity?'∞':Math.floor(S.ammo[i])}`,20,H-100+n*20)});
 if(S.ban>0){cx.fillStyle='#ff3333';cx.font='bold 48px sans-serif';cx.textAlign='center';cx.fillText(S.bt,W/2,200);cx.textAlign='left'}

 let nowTime = performance.now();
 killFeedMessages = killFeedMessages.filter(kf => kf.time > nowTime);
 if(killFeedMessages.length > 0){
  let kfX = W - 320, kfY = 140;
  cx.fillStyle = 'rgba(0,0,0,0.6)';
  cx.fillRect(kfX - 10, kfY - 5, 310, killFeedMessages.length * 22 + 10);
  cx.font = 'bold 12px sans-serif';
  killFeedMessages.forEach((kf, idx) => {
   let alpha = Math.min(1, (kf.time - nowTime) / 1000);
   cx.fillStyle = `rgba(255, 204, 0, ${alpha})`;
   cx.fillText(kf.text, kfX, kfY + 14 + idx * 22);
  });
 }

 if(S.mode==='multiplayer'){
  let lbX = W - 380, lbY = 250, lbW = 190, lbH = 150;
  cx.fillStyle='rgba(0,0,0,0.7)'; cx.fillRect(lbX, lbY, lbW, lbH);
  cx.strokeStyle='#ffcc00'; cx.lineWidth=2; cx.strokeRect(lbX, lbY, lbW, lbH);
  
  cx.fillStyle='#ffcc00'; cx.font='bold 13px sans-serif';
  cx.fillText('Leaderboard Rundă (FFA)', lbX + 10, lbY + 20);
  
  let allP = [{ name: window.currentUserDisplayName || 'Anonim', kills: S.kills }];
  S.mpPlayers.forEach(p => allP.push({ name: p.name || 'Anonim', kills: p.kills || 0, gopnikTrack: p.gopnikTrack || 0 }));
  allP.sort((a,b) => b.kills - a.kills);
  
  cx.font = '11px sans-serif';
  allP.slice(0, 5).forEach((p, idx) => {
   cx.fillStyle = '#fff';
   cx.fillText(`${idx + 1}. ${p.name}`, lbX + 10, lbY + 42 + idx * 20);
   cx.fillStyle = '#ff6b6b';
   cx.fillText(`Vit: ${p.kills}`, lbX + 130, lbY + 42 + idx * 20);
  });
 }

 const mmX=W-170, mmY=410, mmSz=140;
 cx.fillStyle='rgba(0,0,0,0.7)'; cx.fillRect(mmX, mmY, mmSz, mmSz);
 cx.strokeStyle='#ffcc00'; cx.lineWidth=2; cx.strokeRect(mmX, mmY, mmSz, mmSz);
 
 let pMmX = mmX + (S.x / N) * mmSz;
 let pMmY = mmY + (S.y / N) * mmSz;
 cx.fillStyle='#2ecc71'; cx.beginPath(); cx.arc(pMmX, pMmY, 4, 0, Math.PI*2); cx.fill();

 S.en.forEach(e=>{
  let eX = mmX + (e.x / N) * mmSz;
  let eY = mmY + (e.y / N) * mmSz;
  cx.fillStyle='#e74c3c'; cx.fillRect(eX-2, eY-2, 4, 4);
 });

 S.mpPlayers.forEach(p=>{
  let pX = mmX + (p.x / N) * mmSz;
  let pY = mmY + (p.y / N) * mmSz;
  cx.fillStyle='#e74c3c'; cx.fillRect(pX-2, pY-2, 4, 4);
 });
}

function loop(t){if(!S.on)return;const dt=Math.min(.05,(t-S.t)/1000||0);S.t=t;update(dt);render();if(S.on)requestAnimationFrame(loop)}
})();