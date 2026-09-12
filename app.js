(() => {
  'use strict';
  const glass = document.querySelector('#glass');
  const weather = document.querySelector('#weather');
  const mist = document.querySelector('#mist');
  const ctx = weather.getContext('2d');
  const paneRain = document.querySelector('#pane-rain');
  const near = paneRain.getContext('2d');
  const fog = mist.getContext('2d');
  const fogLayer = document.createElement('canvas');
  const paint = fogLayer.getContext('2d');
  const close = document.querySelector('#close');
  const reopen = document.querySelector('#reopen');
  const rest = document.querySelector('#rest');
  const pauseButton = document.querySelector('#pause');
  const rainInput = document.querySelector('#rain');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = reduced.matches, closed = false, dragging = false, inside = false;
  let w = 0, h = 0, gw = 0, gh = 0, ratio = 1, frame = 0, last = 0, elapsed = 0, lastRipple = 0;
  let rain = +rainInput.value / 100, drops = [], beads = [], ripples = [];
  const pointer = {x:.65, y:.45, fx:0, fy:0, sx:.5, sy:.5, previous:null};
  const random = (a,b) => a + Math.random() * (b-a);
  function announce(text) { document.querySelector('#announcement').textContent = text; }
  function fillFog(alpha = 1) {
    paint.globalCompositeOperation = 'source-over';
    paint.globalAlpha = alpha;
    const gradient = paint.createLinearGradient(0,0,gw,gh*.2);
    gradient.addColorStop(0,'rgba(119,161,151,0)');
    gradient.addColorStop(.36,'rgba(119,161,151,.02)');
    gradient.addColorStop(.64,'rgba(157,186,181,.24)');
    gradient.addColorStop(1,'rgba(165,193,190,.39)');
    paint.fillStyle=gradient;paint.fillRect(0,0,gw,gh);paint.globalAlpha=1;
  }
  function resetFog() {
    paint.clearRect(0,0,gw,gh); fillFog();
    for(let i=0;i<12;i++) {
      const x=random(gw*.4,gw*1.1), y=random(0,gh), r=random(80,240);
      const g=paint.createRadialGradient(x,y,0,x,y,r);
      g.addColorStop(0,'rgba(186,212,202,.09)');g.addColorStop(1,'rgba(186,212,202,0)');
      paint.fillStyle=g;paint.fillRect(x-r,y-r,r*2,r*2);
    }
    drawFog();
  }
  function erase(x,y,r,strength) {
    paint.globalCompositeOperation='destination-out';
    const g=paint.createRadialGradient(x,y,r*.16,x,y,r);
    g.addColorStop(0,`rgba(0,0,0,${strength})`);g.addColorStop(1,'rgba(0,0,0,0)');
    paint.fillStyle=g;paint.fillRect(x-r,y-r,r*2,r*2);paint.globalCompositeOperation='source-over';
  }
  function drawFog() {
    fog.clearRect(0,0,gw,gh);fog.drawImage(fogLayer,0,0,gw,gh);
    if(inside && !closed) {
      fog.globalCompositeOperation='destination-out';
      const r=dragging?105:75,g=fog.createRadialGradient(pointer.fx,pointer.fy,0,pointer.fx,pointer.fy,r);
      g.addColorStop(0,'rgba(0,0,0,.48)');g.addColorStop(1,'transparent');fog.fillStyle=g;
      fog.fillRect(pointer.fx-r,pointer.fy-r,r*2,r*2);fog.globalCompositeOperation='source-over';
    }
    // Condensation sits on the same pane as the content; wiped areas lose the beads too.
    fog.save();fog.globalCompositeOperation='source-atop';
    for(const b of beads){fog.beginPath();fog.ellipse(b.x,b.y,b.r*.65,b.r*1.2,-.15,0,Math.PI*2);fog.strokeStyle='rgba(231,255,247,.3)';fog.lineWidth=.6;fog.stroke();}
    fog.restore();
  }
  function resize() {
    ratio=Math.min(devicePixelRatio||1,1.75); w=innerWidth;h=innerHeight;gw=glass.clientWidth;gh=glass.clientHeight;
    for(const [c,context,cw,ch] of [[weather,ctx,w,h],[mist,fog,gw,gh],[fogLayer,paint,gw,gh],[paneRain,near,gw,gh]]) {
      c.width=Math.round(cw*ratio);c.height=Math.round(ch*ratio);context.setTransform(ratio,0,0,ratio,0,0);
    }
    drops=Array.from({length:160},()=>({x:random(0,w),y:random(-h,h),z:random(.3,1),speed:random(430,850)}));
    beads=Array.from({length:100},()=>({x:random(gw*.42,gw),y:random(0,gh),r:random(.8,2.6)}));
    resetFog();drawWeather(0);drawNearRain();
  }
  function ripple(x,y,power=1) {ripples.push({x,y,r:3,life:1,power});if(ripples.length>45)ripples.shift();}
  function drawWeather(dt) {
    ctx.clearRect(0,0,w,h);ctx.lineCap='round';
    const wind=(pointer.sx-.5)*110-35;
    const count=Math.round(drops.length*rain);
    for(let i=0;i<count;i++){
      const d=drops[i];d.y+=d.speed*d.z*dt;d.x+=wind*d.z*dt;
      if(d.y>h+40){d.y=-40;d.x=random(-50,w+50);}if(d.x<-60)d.x=w+40;if(d.x>w+60)d.x=-40;
      ctx.strokeStyle=`rgba(191,220,215,${.08+d.z*.2})`;ctx.lineWidth=d.z*.8;
      ctx.beginPath();ctx.moveTo(d.x,d.y);ctx.lineTo(d.x+wind*.028,d.y+18*d.z);ctx.stroke();
    }
    if(dt && rain>0 && Math.random()<rain*.34)ripple(random(0,w),random(h*.61,h),random(.3,.8));
    for(let i=ripples.length-1;i>=0;i--){const r=ripples[i];r.r+=dt*32;r.life-=dt*.46;
      if(r.life<=0){ripples.splice(i,1);continue;}
      ctx.strokeStyle=`rgba(179,220,207,${r.life*.3*r.power})`;ctx.lineWidth=.8;
      for(let j=0;j<2;j++){ctx.beginPath();ctx.ellipse(r.x,r.y,r.r*(1+j*.35)*2.4,r.r*(1+j*.35)*.42,0,0,Math.PI*2);ctx.stroke();}
    }
  }
  function drawNearRain() {
    near.clearRect(0,0,gw,gh);
    if (!closed) {const rect=glass.getBoundingClientRect();near.drawImage(weather,-rect.left,-rect.top,w,h);}
  }
  function tick(t) {
    frame=0; const dt=Math.min((t-last)/1000||.016,.04);last=t;elapsed+=dt;
    pointer.sx+=(pointer.x-pointer.sx)*Math.min(1,dt*4);pointer.sy+=(pointer.y-pointer.sy)*Math.min(1,dt*4);
    document.documentElement.style.setProperty('--mx',`${(pointer.sx-.5)*22}px`);
    document.documentElement.style.setProperty('--my',`${(pointer.sy-.5)*14}px`);
    glass.style.setProperty('--ry',`${(pointer.sx-.5)*.8}deg`);glass.style.setProperty('--rx',`${(.5-pointer.sy)*.6}deg`);
    drawWeather(dt);drawNearRain();
    if(!closed){if(elapsed>.18){paint.globalCompositeOperation="destination-out";paint.fillStyle="rgba(0,0,0,.006)";paint.fillRect(0,0,gw,gh);fillFog(.008);elapsed=0;}drawFog();}
    schedule();
  }
  function schedule(){if(!paused&&!document.hidden&&!frame)frame=requestAnimationFrame(tick);}
  function syncPause(){pauseButton.setAttribute('aria-pressed',String(paused));pauseButton.textContent=paused?'Resume motion':'Pause motion';if(paused){cancelAnimationFrame(frame);frame=0;}else{last=performance.now();schedule();}}
  function locate(event){
    pointer.x=Math.max(0,Math.min(1,event.clientX/w));pointer.y=Math.max(0,Math.min(1,event.clientY/h));
    const rect=glass.getBoundingClientRect();pointer.fx=(event.clientX-rect.left)*gw/rect.width;pointer.fy=(event.clientY-rect.top)*gh/rect.height;
    inside=!closed && pointer.fx>=0 && pointer.fx<gw && pointer.fy>=0 && pointer.fy<gh;
  }
  document.addEventListener('pointermove',event=>{
    locate(event);
    if(dragging&&inside){
      const prev=pointer.previous||{x:pointer.fx,y:pointer.fy};const dist=Math.hypot(pointer.fx-prev.x,pointer.fy-prev.y);const steps=Math.max(1,Math.ceil(dist/15));
      for(let i=1;i<=steps;i++)erase(prev.x+(pointer.fx-prev.x)*i/steps,prev.y+(pointer.fy-prev.y)*i/steps,65,.65);
      pointer.previous={x:pointer.fx,y:pointer.fy};
    }
    if(!paused&&performance.now()-lastRipple>85){ripple(event.clientX,h*.64+pointer.y*h*.32,.8);lastRipple=performance.now();}
    if(paused&&!closed)drawFog();
  },{passive:true});
  glass.addEventListener('pointerdown',event=>{
    if(event.target.closest('a,button,input,label')||event.button!==0)return;
    event.preventDefault();locate(event);dragging=true;pointer.previous={x:pointer.fx,y:pointer.fy};glass.setPointerCapture(event.pointerId);erase(pointer.fx,pointer.fy,65,.9);drawFog();
  });
  function release(){dragging=false;pointer.previous=null;}
  glass.addEventListener('pointerup',release);glass.addEventListener('pointercancel',release);glass.addEventListener('lostpointercapture',release);
  glass.addEventListener('pointerleave',()=>{if(!dragging){inside=false;drawFog();}});
  // Keep links and controls scrollable; touch-drag only claims the open scene itself.
  glass.style.touchAction='pan-y';
  function setClosed(value){
    closed=value;release();glass.classList.toggle('closed',value);glass.inert=value;document.body.classList.toggle('is-closed',value);rest.hidden=!value;
    if(value){inside=false;reopen.focus();announce('The glass is closed. The rain remains.');}
    else {resize();close.focus();announce('The glass is open again.');}
  }
  close.addEventListener('click',()=>setClosed(true));reopen.addEventListener('click',()=>setClosed(false));
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!closed)setClosed(true);});
  document.querySelector('#reset').addEventListener('click',()=>{resetFog();announce('The mist has settled again.');});
  pauseButton.addEventListener('click',()=>{paused=!paused;syncPause();});
  rainInput.addEventListener('input',()=>{rain=+rainInput.value/100;if(paused){drawWeather(0);drawNearRain();}});
  reduced.addEventListener('change',event=>{paused=event.matches;syncPause();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else{last=performance.now();schedule();}});
  let resizeTimer;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(resize,100);});
  resize();syncPause();
})();


