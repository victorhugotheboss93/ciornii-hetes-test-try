// ===== MODUL GULAG ESCAPE (V3.4) =====
(()=>{
const W=1280,H=720,N=32,FOV=1.15,C=640,$=id=>document.getElementById(id),cv=$('gameCanvas'),cx=cv.getContext('2d');

const IMG={};
[
 'nkvd1-patrol-front','nkvd1-patrol-back','nkvd1-chase-front','nkvd1-chase-back',
 'nkvd2-patrol-front','nkvd2-patrol-back','nkvd2-chase-front','nkvd2-chase-back',
 'nkvdcommander-front','nkvdcommander-back','nkvdcommander-chase-front','nkvdcommander-chase-back',
 'key','gaz-m1'
].forEach(n=>{
 IMG[n]=new Image(); IMG[n].src=n+'.png';
});

// Audio specific pentru Gulag Win / Lose
const sndGulagLose = new Audio('gulag-sssr-gimn.mp3');
const sndGulagWin = new Audio('patiot-pesnya-sovietwave.mp3');

// Harta 3D: Tuneluri cu camere deschise
const M=new Uint8Array(N*N);
for(let i=0;i<N;i++)M[i]=M[N*N-1-i]=M[i*N]=M[i*N+N-1]=1;

for(let y=6; y<26; y+=8){
 for(let x=6; x<26; x+=8){
  for(let cy=y; cy<y+4; cy++){
   for(let cx=x; cx<cx+4; cx++){
    if(cy>0 && cy<N-1 && cx>0 && cx<N-1) M[cy*N+cx]=0;
   }
  }
 }
}
for(let i=2; i<N-2; i++){
 M[4*N+i] = 0;
 M[16*N+i] = 0;
 M[i*N+4] = 0;
 M[i*N+20] = 0;
}
for(let i=1;i<5;i++) for(let j=1;j<5;j++) M[j*N+i]=0;
M[2*N+10]=0; M[1*N+28]=0; M[2*N+28]=0; M[3*N+28]=0;

const Z=new Float32Array(C);
const solid=(x,y,r=.2)=>{
 if(x<0||x>=N||y<0||y>=N) return 1;
 return M[((y-r)|0)*N+((x-r)|0)]||M[((y-r)|0)*N+((x+r)|0)]||M[((y+r)|0)*N+((x-r)|0)]||M[((y+r)|0)*N+((x+r)|0)];
};

const cast=(px,py,a)=>{
 let dx=Math.cos(a)||1e-9,dy=Math.sin(a)||1e-9,mx=px|0,my=py|0,ax=Math.abs(1/dx),ay=Math.abs(1/dy),
 sx=dx<0?-1:1,sy=dy<0?-1:1,tx=(dx<0?px-mx:mx+1-px)*ax,ty=(dy<0?py-my:my+1-py)*ay,s=0,t=0;
 for(let i=0;i<70;i++){
  if(tx<ty){tx+=ax;mx+=sx;s=0}else{ty+=ay;my+=sy;s=1}
  if(mx<0||mx>=N||my<0||my>=N){t=1;break;}
  t=M[my*N+mx];if(t)break;
 }
 const d=s?ty-ay:tx-ax,w=s?px+d*dx:py+d*dy;
 return [d,t,s,w-Math.floor(w)];
};

const los=(x1,y1,x2,y2)=>cast(x1,y1,Math.atan2(y2-y1,x2-x1))[0]>Math.hypot(x2-x1,y2-y1);

let G={on:false, state:'playing', fadeAlpha:0, messageTimer:0, winStep:0, loseStep:0};

cv.addEventListener('mousemove', e=>{
 if(!G.on || G.state!=='playing') return;
 if(document.pointerLockElement === cv){
  G.a += e.movementX * 0.003;
 }
});

cv.addEventListener('click', ()=>{
 if(G.on && document.pointerLockElement !== cv){
  cv.requestPointerLock && cv.requestPointerLock();
 }
});

window.startGulagSession=function(){
 ['main-menu','classic-menu','sh-menu','sh-arsenal','sh-lose','sh-win','auth-panel'].forEach(id=>{
  const el=$(id); if(el) el.classList.add('hidden');
 });
 
 if(typeof stopMenuMusic === 'function') stopMenuMusic();
 if(window.sndStalingradBgm){ window.sndStalingradBgm.pause(); }
 sndGulagLose.pause(); sndGulagLose.currentTime = 0;
 sndGulagWin.pause(); sndGulagWin.currentTime = 0;

 currentMode = 'GULAG';
 gameActive = false;

 G={
  on:true, state:'playing', x:2.5, y:2.5, a:0, hp:100, maxHp:100,
  hasKey:false, doorUnlocked:false, escaped:false,
  keyObj:{x:26.5, y:26.5, taken:false},
  carObj:{x:28.5, y:2.5},
  guards:[
   {x:10.5, y:6.5, type:'nkvd1', state:'patrol', a:0, hp:40, hasFlashlight:true, weapon:'korovin'},
   {x:18.5, y:14.5, type:'nkvd2', state:'patrol', a:Math.PI, hp:40, hasFlashlight:true, weapon:'korovin'},
   {x:22.5, y:22.5, type:'nkvd1', state:'patrol', a:1.5, hp:40, hasFlashlight:true, weapon:'korovin'},
   {x:25.5, y:25.5, type:'nkvdcommander', state:'office', a:3.14, hp:80, hasFlashlight:false, weapon:'ppsh'}
  ],
  t:performance.now(), flash:0, prompt:'', fadeAlpha:0, loseStep:0, winStep:0, timer:0
 };

 cv.requestPointerLock&&cv.requestPointerLock();
 requestAnimationFrame(gulagLoop);
};

addEventListener('keydown',e=>{
 if(!G.on) return;
 if(G.state==='playing' && (e.key.toLowerCase()==='e'||e.key===' ')){
  if(!G.hasKey && !G.keyObj.taken && Math.hypot(G.x-G.keyObj.x, G.y-G.keyObj.y)<2.0){
   G.hasKey=true;
   G.keyObj.taken=true;
   G.prompt='Ai găsit cheia porții!';
   setTimeout(()=>G.prompt='', 3000);
  }
  else if(G.hasKey && Math.hypot(G.x-G.carObj.x, G.y-G.carObj.y)<2.5){
   G.state='win';
   G.winStep=1;
   G.timer=0;
   document.exitPointerLock&&document.exitPointerLock();
   sndGulagWin.currentTime=0;
   sndGulagWin.play().catch(e=>{});
   if(window.gameStats) { window.gameStats.gulagEscapes = (window.gameStats.gulagEscapes || 0) + 1; }
   if(typeof saveStats === 'function') saveStats();
   else if(window.syncStatsToCloud) window.syncStatsToCloud();
  }
 }
});

function updateGulag(dt){
 if(G.state==='win'){
  G.timer += dt;
  if(G.timer > 2.5 && G.winStep === 1) G.winStep = 2;
  if(G.timer > 4.5 && G.winStep === 2) G.winStep = 3;
  return;
 }

 if(G.state==='lose'){
  G.timer += dt;
  G.fadeAlpha = Math.min(1, G.fadeAlpha + dt * 0.8);
  if(G.timer > 1.5 && G.loseStep === 1) G.loseStep = 2;
  if(G.timer > 3.2 && G.loseStep === 2) G.loseStep = 3;
  return;
 }

 const k=n=>(window.keys||{})[n];
 let forward=(k('w')||k('arrowup')?1:0)-(k('s')||k('arrowdown')?1:0);
 let strafe=(k('d')||k('arrowright')?1:0)-(k('a')||k('arrowleft')?1:0);

 let c=Math.cos(G.a), s=Math.sin(G.a);
 let mx=forward*c - strafe*s;
 let my=forward*s + strafe*c;
 let spd=4.0;

 if(k('q')) G.a -= 2.2 * dt;
 if(k('e')) G.a += 2.2 * dt;

 const l=Math.hypot(mx,my);
 if(l){
  mx=(mx/l)*spd*dt; my=(my/l)*spd*dt;
  if(!solid(G.x+mx, G.y)) G.x+=mx;
  if(!solid(G.x, G.y+my)) G.y+=my;
 }

 if(!G.hasKey && !G.keyObj.taken && Math.hypot(G.x-G.keyObj.x, G.y-G.keyObj.y)<2.0){
  G.prompt='Apasă [E] sau [Space] pentru a lua Cheia';
 } else if(G.hasKey && Math.hypot(G.x-G.carObj.x, G.y-G.carObj.y)<2.5){
  G.prompt='Apasă [E] sau [Space] pentru a urca în GAZ M1 și a scăpa!';
 } else if(!G.prompt.includes('găsit')){
  G.prompt='';
 }

 G.guards.forEach(g=>{
  let dx=G.x-g.x, dy=G.y-g.y, d=Math.hypot(dx,dy);
  let angleToPlayer = Math.atan2(dy, dx);
  let angleDiff = Math.abs(Math.atan2(Math.sin(g.a - angleToPlayer), Math.cos(g.a - angleToPlayer)));
  let inFlashlightCone = (g.state === 'office') ? (d < 8 && angleDiff < 1.2) : (d < 7 && angleDiff < 0.85);
  let see = inFlashlightCone && los(g.x, g.y, G.x, G.y);

  if(see){
   g.state='chase';
   g.a=angleToPlayer;
   let nx=g.x+Math.cos(g.a)*2.5*dt, ny=g.y+Math.sin(g.a)*2.5*dt;
   if(!solid(nx,g.y)) g.x=nx;
   if(!solid(g.x,ny)) g.y=ny;

   if(d<1.3){
    G.hp -= (g.weapon==='ppsh'?35:20)*dt;
    G.flash=0.3;
    if(G.hp<=0 && G.state==='playing'){
     G.state='lose';
     G.loseStep=1;
     G.timer=0;
     document.exitPointerLock&&document.exitPointerLock();
     sndGulagLose.currentTime=0;
     sndGulagLose.play().catch(e=>{});
    }
   }
  } else {
   if(g.state === 'chase') g.state = (g.type === 'nkvdcommander') ? 'office' : 'patrol';
   if(g.state === 'patrol') g.a += dt * 0.4;
  }
 });

 if(G.flash>0) G.flash -= dt;
}

function renderGulag(){
 cx.clearRect(0,0,W,H);
 cx.save();
 cx.fillStyle='#111'; cx.fillRect(0,0,W,H/2);
 cx.fillStyle='#1a1715'; cx.fillRect(0,H/2,W,H/2);

 for(let i=0;i<C;i++){
  const a=G.a+(i/C-.5)*FOV;
  const [d,t,s,wx]=cast(G.x,G.y,a);
  const p=Math.max(.05,d*Math.cos(a-G.a));
  Z[i]=p;
  const h=H/p, y0=(H-h)/2;
  const sh=Math.max(.05, 1-p/12)*(s?.6:1);
  const r=t===2?95:50, g=t===2?50:45, b=t===2?35:35;
  cx.fillStyle=`rgb(${r*sh|0},${g*sh|0},${b*sh|0})`;
  cx.fillRect(i*2,y0,2,h);
 }

 // Randare Cheie din 'key.png'
 if(!G.keyObj.taken){
  let df=Math.atan2(G.keyObj.y-G.y, G.keyObj.x-G.x)-G.a;
  df=Math.atan2(Math.sin(df),Math.cos(df));
  if(Math.abs(df)<FOV/2+.4){
   let dist=Math.hypot(G.keyObj.x-G.x, G.keyObj.y-G.y);
   let pDist=Math.max(0.2, dist*Math.cos(df));
   let h=H/pDist*0.45, w=h;
   let l=(.5+df/FOV)*W-w/2, y=(H-h)/2;
   if(Z[(l+w/2)>>1] > pDist && IMG.key.complete && IMG.key.naturalWidth){
    cx.drawImage(IMG.key, l, y, w, h);
   }
  }
 }

 // Randare Mașină GAZ M1 din 'gaz-m1.png'
 {
  let df=Math.atan2(G.carObj.y-G.y, G.carObj.x-G.x)-G.a;
  df=Math.atan2(Math.sin(df),Math.cos(df));
  if(Math.abs(df)<FOV/2+.5){
   let dist=Math.hypot(G.carObj.x-G.x, G.carObj.y-G.y);
   let pDist=Math.max(0.3, dist*Math.cos(df));
   let h=H/pDist*1.3, w=h*1.4;
   let l=(.5+df/FOV)*W-w/2, y=(H-h)/2;
   if(Z[(l+w/2)>>1] > pDist && IMG['gaz-m1'].complete && IMG['gaz-m1'].naturalWidth){
    cx.drawImage(IMG['gaz-m1'], l, y, w, h);
   }
  }
 }

 G.guards.sort((a,b)=>Math.hypot(b.x-G.x,b.y-G.y)-Math.hypot(a.x-G.x,a.y-G.y)).forEach(g=>{
  let df=Math.atan2(g.y-G.y, g.x-G.x)-G.a;
  df=Math.atan2(Math.sin(df),Math.cos(df));
  if(Math.abs(df)>FOV/2+.6) return;
  let dist=Math.hypot(g.x-G.x, g.y-G.y);
  let pDist=Math.max(0.3, dist*Math.cos(df));
  let h=H/pDist*1.0, w=h*0.6;
  let l=(.5+df/FOV)*W-w/2, y=(H-h)/2;

  let angleToPlayer = Math.atan2(G.y - g.y, G.x - g.x);
  let relativeAngle = g.a - angleToPlayer;
  let isFront = Math.cos(relativeAngle) > 0;
  
  let currentActionState = (g.state === 'office') ? 'front' : g.state;
  let spriteKey=`${g.type}-${currentActionState}-${isFront ? 'front' : 'back'}`;
  let img=IMG[spriteKey] || IMG[`${g.type}-patrol-front`];

  if(Z[(l+w/2)>>1] > pDist){
   if(img && img.complete && img.naturalWidth){
    cx.drawImage(img, l, y, w, h);
   } else {
    cx.fillStyle='#c0392b'; cx.fillRect(l,y,w,h);
   }

   if(g.hasFlashlight){
    cx.save();
    let lx=l+w/2, ly=y+h*0.45;
    let grad=cx.createRadialGradient(lx,ly,10,lx,ly,w*2.2);
    grad.addColorStop(0,'rgba(255,255,180,0.7)');
    grad.addColorStop(0.5,'rgba(255,220,90,0.3)');
    grad.addColorStop(1,'rgba(255,180,30,0)');
    cx.fillStyle=grad;
    cx.beginPath(); cx.arc(lx,ly,w*2.2,0,Math.PI*2); cx.fill();
    cx.restore();
   }
  }
 });

 if(G.flash>0){ 
  cx.fillStyle=`rgba(255,0,0,${G.flash})`; 
  cx.fillRect(0,0,W,H); 
 }
 cx.restore();

 if(G.state==='playing'){
  cx.fillStyle='rgba(0,0,0,0.6)'; cx.fillRect(15, 15, 280, 70);
  cx.fillStyle='#fff'; cx.font='bold 16px sans-serif';
  cx.fillText(`HP Gulag: ${Math.ceil(Math.max(0,G.hp))}/100`, 30, 40);
  cx.fillText(`Cheie Ieșire: ${G.hasKey?'OBȚINUTĂ':'LIPSEȘTE'}`, 30, 65);

  if(G.prompt){
   cx.fillStyle='rgba(0,0,0,0.8)'; cx.fillRect(W/2 - 280, H - 90, 560, 45);
   cx.fillStyle='#ffcc00'; cx.font='bold 20px sans-serif';
   cx.textAlign='center'; cx.fillText(G.prompt, W/2, H - 60);
   cx.textAlign='left';
  }
 }

 if(G.state==='lose'){
  cx.fillStyle=`rgba(0, 0, 0, ${G.fadeAlpha})`;
  cx.fillRect(0, 0, W, H);

  if(G.loseStep >= 1){
   cx.fillStyle='#ff3333'; cx.font='bold 48px sans-serif'; cx.textAlign='center';
   cx.fillText("Ai fost prins.", W/2, H/2 - 60);
  }
  if(G.loseStep >= 2){
   cx.fillStyle='#ffcc00'; cx.font='bold 28px sans-serif';
   cx.fillText("Stalin poate fi linistit.", W/2, H/2);
  }
  if(G.loseStep >= 3){
   drawMenuButton("Inapoi la meniu..");
  }
  cx.textAlign='left';
 }

 if(G.state==='win'){
  cx.fillStyle='rgba(10, 10, 15, 0.9)';
  cx.fillRect(0, 0, W, H);

  if(G.winStep >= 1){
   cx.fillStyle='#33ff33'; cx.font='bold 48px sans-serif'; cx.textAlign='center';
   cx.fillText("Ai evadat", W/2, H/2 - 60);
  }
  if(G.winStep >= 2){
   cx.fillStyle='#ff3333'; cx.font='bold 28px sans-serif';
   cx.fillText("Stalin nu este fericit >:(", W/2, H/2);
  }
  if(G.winStep >= 3){
   drawMenuButton("Inapoi la meniu...");
  }
  cx.textAlign='left';
 }
}

function drawMenuButton(text){
 let btnX = W/2 - 140, btnY = H/2 + 70, btnW = 280, btnH = 60;
 cx.fillStyle = '#cc0000';
 cx.fillRect(btnX, btnY, btnW, btnH);
 cx.strokeStyle = '#ffff00';
 cx.lineWidth = 3;
 cx.strokeRect(btnX, btnY, btnW, btnH);
 cx.fillStyle = '#ffff00';
 cx.font = 'bold 22px sans-serif';
 cx.textAlign = 'center';
 cx.fillText(text, W/2, btnY + 37);
}

cv.addEventListener('click', e=>{
 if(!G.on || (G.state !== 'win' && G.state !== 'lose')) return;
 let btnX = W/2 - 140, btnY = H/2 + 70, btnW = 280, btnH = 60;
 let rect = cv.getBoundingClientRect();
 let mouseX = (e.clientX - rect.left) * (W / rect.width);
 let mouseY = (e.clientY - rect.top) * (H / rect.height);
 if(mouseX >= btnX && mouseX <= btnX+btnW && mouseY >= btnY && mouseY <= btnY+btnH){
  G.on = false;
  sndGulagLose.pause(); sndGulagLose.currentTime = 0;
  sndGulagWin.pause(); sndGulagWin.currentTime = 0;
  if(window.backToMain) window.backToMain();
 }
});

function gulagLoop(t){
 if(!G.on) return;
 const dt=Math.min(.05,(t-G.t)/1000||0); G.t=t;
 updateGulag(dt); 
 renderGulag();
 if(G.on) requestAnimationFrame(gulagLoop);
}
})();