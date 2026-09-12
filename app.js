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
  let weatherTime = 0, splashBudget = 0;
  function waterline(){const scale=Math.max(w/1672,h/941);return (h-941*scale)/2+535*scale;}
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

  }
  function resize() {
    ratio=Math.min(devicePixelRatio||1,1.75); w=innerWidth;h=innerHeight;gw=glass.clientWidth;gh=glass.clientHeight;
    for(const [c,context,cw,ch] of [[weather,ctx,w,h],[mist,fog,gw,gh],[fogLayer,paint,gw,gh],[paneRain,near,gw,gh]]) {
      c.width=Math.round(cw*ratio);c.height=Math.round(ch*ratio);context.setTransform(ratio,0,0,ratio,0,0);
    }
    drops=Array.from({length:Math.min(480,Math.max(180,Math.round(w*h/4200)))},()=>({x:random(-50,w+50),y:random(-h,h),z:random(.15,1),speed:random(650,1100),phase:random(0,6.28)}));
    beads=Array.from({length:Math.min(90,Math.round(gw/16))},()=>({x:random(0,gw),y:random(0,gh),r:random(.7,2.4),speed:random(3,15),phase:random(0,6.28)}));
    ripples=[];resetFog();drawWeather(0);drawNearRain(0);
  }
  function ripple(x,y,power=1) {
    const horizon=waterline();
    const depth=Math.max(.03,Math.min(1,(y-horizon)/Math.max(1,h-horizon)));
    ripples.push({x,y,age:0,duration:random(.65,1.3),max:random(12,30)*(.15+depth*.85)*power,depth,phase:random(0,6.28)});
    if(ripples.length>100)ripples.shift();
  }
  function drawWeather(dt) {
    weatherTime+=dt;ctx.clearRect(0,0,w,h);ctx.lineCap='round';
    const wind=(pointer.sx-.5)*150-38+Math.sin(weatherTime*.6)*10;
    const count=Math.round(drops.length*rain);
    for(let i=0;i<count;i++){
      const d=drops[i];const speed=d.speed*(.38+d.z*.8);
      d.y+=speed*dt;d.x+=(wind+Math.sin(weatherTime+d.phase)*7)*dt;
      if(d.y>h+55){d.y=random(-100,-20);d.x=random(-80,w+80);}
      if(d.x<-100)d.x=w+70;if(d.x>w+100)d.x=-70;
      const length=(8+d.z*d.z*34),slant=wind/speed*length;
      ctx.strokeStyle='rgba(193,215,220,'+(.035+d.z*d.z*.14)+')';ctx.lineWidth=.4+d.z*.75;
      ctx.beginPath();ctx.moveTo(d.x-slant,d.y-length);ctx.lineTo(d.x,d.y);ctx.stroke();
      if(d.z>.86){ctx.strokeStyle='rgba(218,234,235,.19)';ctx.beginPath();ctx.moveTo(d.x-slant*.12,d.y-length*.12);ctx.lineTo(d.x,d.y);ctx.stroke();}
    }
    const horizon=Math.max(0,Math.min(h-1,waterline()));
    splashBudget+=dt*rain*Math.min(65,w/25);
    while(splashBudget>=1){ripple(random(0,w),horizon+(h-horizon)*Math.pow(Math.random(),1.4));splashBudget--;}
    for(let i=ripples.length-1;i>=0;i--){const r=ripples[i];r.age+=dt;const progress=r.age/r.duration;
      if(progress>=1){ripples.splice(i,1);continue;}
      const radius=1+r.max*progress,alpha=Math.sin(Math.PI*Math.min(1,progress*1.4))*(1-progress)*(.1+r.depth*.12);
      ctx.lineWidth=.45+r.depth*.35;ctx.strokeStyle='rgba(191,219,215,'+Math.max(0,alpha)+')';
      const flatten=.12+r.depth*.18;
      ctx.beginPath();ctx.ellipse(r.x,r.y,radius,radius*flatten,0,r.phase,r.phase+Math.PI*1.65);ctx.stroke();
      if(progress>.18){ctx.strokeStyle='rgba(190,218,214,'+Math.max(0,alpha*.4)+')';ctx.beginPath();ctx.ellipse(r.x,r.y,radius*.66,radius*.66*flatten,0,r.phase+1,r.phase+5.4);ctx.stroke();}
      if(progress<.13&&r.depth>.5){ctx.strokeStyle='rgba(204,225,221,'+(.13*(1-progress/.13))+')';ctx.beginPath();ctx.moveTo(r.x,r.y);ctx.lineTo(r.x+1,r.y-3*r.depth);ctx.stroke();}
    }
  }
  function drawNearRain(dt=0) {
    near.clearRect(0,0,gw,gh);if(closed)return;
    const rect=glass.getBoundingClientRect();
    near.globalAlpha=.2;near.drawImage(weather,-rect.left,-rect.top,w,h);near.globalAlpha=1;
    for(const b of beads){
      const sliding=b.r>1.4&&rain>0;
      if(sliding){b.y+=dt*b.speed*rain*(.35+Math.max(0,Math.sin(weatherTime*.6+b.phase))*1.7);b.x+=Math.sin(weatherTime*.4+b.phase)*dt*.9;}
      if(b.y>gh+10){b.y=-10;b.x=random(0,gw);}
      if(sliding){const tail=10+b.r*8;const g=near.createLinearGradient(b.x,b.y-tail,b.x,b.y);g.addColorStop(0,'rgba(194,225,224,0)');g.addColorStop(1,'rgba(194,225,224,.12)');near.strokeStyle=g;near.lineWidth=b.r*.5;near.beginPath();near.moveTo(b.x,b.y-tail);near.quadraticCurveTo(b.x+Math.sin(b.phase)*2,b.y-tail/2,b.x,b.y);near.stroke();}
      near.fillStyle='rgba(5,29,35,.2)';near.beginPath();near.ellipse(b.x,b.y,b.r*.75,b.r*1.15,0,0,Math.PI*2);near.fill();
      near.strokeStyle='rgba(203,230,226,.36)';near.lineWidth=.65;near.beginPath();near.ellipse(b.x,b.y,b.r*.75,b.r*1.15,0,.2,2.4);near.stroke();
      near.fillStyle='rgba(225,245,239,.45)';near.beginPath();near.arc(b.x-b.r*.2,b.y+b.r*.45,Math.max(.35,b.r*.2),0,Math.PI*2);near.fill();
    }
  }
  function tick(t) {
    frame=0; const dt=Math.min((t-last)/1000||.016,.04);last=t;elapsed+=dt;
    pointer.sx+=(pointer.x-pointer.sx)*Math.min(1,dt*4);pointer.sy+=(pointer.y-pointer.sy)*Math.min(1,dt*4);
    document.documentElement.style.setProperty('--mx',`${(pointer.sx-.5)*22}px`);
    document.documentElement.style.setProperty('--my',`${(pointer.sy-.5)*14}px`);
    glass.style.setProperty('--ry',`${(pointer.sx-.5)*.8}deg`);glass.style.setProperty('--rx',`${(.5-pointer.sy)*.6}deg`);
    drawWeather(dt);drawNearRain(dt);
    if(!closed){if(elapsed>.18){paint.globalCompositeOperation="destination-out";paint.fillStyle="rgba(0,0,0,.006)";paint.fillRect(0,0,gw,gh);fillFog(.008);elapsed=0;}drawFog();}
    schedule();
  }
  function schedule(){if(!paused&&!document.hidden&&!frame)frame=requestAnimationFrame(tick);}
  function syncPause(){window.rainSoundscape.setPaused(paused);pauseButton.setAttribute('aria-pressed',String(paused));pauseButton.textContent=paused?'Resume motion':'Pause motion';if(paused){cancelAnimationFrame(frame);frame=0;}else{last=performance.now();schedule();}}
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
    if(!paused&&performance.now()-lastRipple>140){ripple(event.clientX,waterline()+(h-waterline())*(.15+pointer.y*.8),1.15);lastRipple=performance.now();}
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
  rainInput.addEventListener('input',()=>{rain=+rainInput.value/100;window.rainSoundscape.setRain(rain);if(paused){drawWeather(0);drawNearRain();}});
  reduced.addEventListener('change',event=>{paused=event.matches;syncPause();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else{last=performance.now();schedule();}});
  let resizeTimer;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(resize,100);});
  window.rainSoundscape.setRain(rain);resize();syncPause();
})();



