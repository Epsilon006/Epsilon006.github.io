/* Long CC0 field recordings. Source notes are retained in audio-credits.html. */
(() => {
  'use strict';
  const buttons=[...document.querySelectorAll('[data-sound]')];
  const volumeInput=document.querySelector('#volume'),timeInput=document.querySelector('#sound-time');
  let context,master,tone,buses,loading,timer,suspendTimer,failed=false;
  let enabled=false,paused=false,volume=+volumeInput.value/100,state=RainWeather.sample(.65);
  let scene=RainWeather.ambience(timeInput.value);
  const buffers=[null,null,null],sources=[null,null,null];
  const active=()=>enabled&&!paused&&!document.hidden;
  function fade(param,value,seconds=.08){
    const now=context.currentTime;param.cancelScheduledValues(now);param.setValueAtTime(param.value,now);param.linearRampToValueAtTime(value,now+seconds);
  }
  function render(){
    const ready=buffers[0]||buffers[1];
    const text=enabled?(!ready?'Loading sounds…':paused?'Sound paused':'Sound on'):failed?'Retry sound':'Sound off';
    buttons.forEach(button=>{button.textContent=text;button.setAttribute('aria-pressed',String(enabled));button.title=enabled?'Mute the soundscape':'Play continuous rain and birds';});
    timeInput.title=(timeInput.value==='auto'?'Local time · ':'')+scene.label;
  }
  function mix(){
    if(!context)return;
    fade(buses[0].gain,state.light);
    fade(buses[1].gain,state.heavy);
    fade(buses[2].gain,state.birds*scene.birds,.7);
  }
  function updateTime(){
    scene=RainWeather.ambience(timeInput.value);render();mix();
    if(context){fade(tone.frequency,scene.label==='Night'?4200:6000,3);fade(master.gain,active()?volume*.8*scene.level:0,1.5);}
  }
  function init(){
    const Audio=window.AudioContext||window.webkitAudioContext;
    if(!Audio)throw Error('Audio unavailable');context=new Audio();
    master=context.createGain();master.gain.value=0;
    tone=context.createBiquadFilter();tone.type='lowpass';tone.frequency.value=6000;tone.Q.value=.5;
    const limiter=context.createDynamicsCompressor();limiter.threshold.value=-16;limiter.knee.value=12;limiter.ratio.value=3;limiter.attack.value=.015;limiter.release.value=.35;
    master.connect(tone);tone.connect(limiter);limiter.connect(context.destination);
    buses=[0,1,2].map(()=>{const gain=context.createGain();gain.gain.value=0;gain.connect(master);return gain;});
  }
  function startAvailable(){
    buffers.forEach((buffer,i)=>{
      if(!buffer||sources[i])return;
      const source=context.createBufferSource();source.buffer=buffer;source.loop=true;const entrance=context.createGain();entrance.gain.value=0;source.connect(entrance);entrance.connect(buses[i]);source.start();fade(entrance.gain,1,2);sources[i]=source;
    });
    mix();render();
  }
  async function load(){
    const results=await Promise.allSettled(['leaves-soft-long','leaves-dense-long','birds-long'].map(async(name,i)=>{
      if(buffers[i])return;
      const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),120000);
      try{
        const response=await fetch('./assets/audio/'+name+'.mp3',{signal:controller.signal});
        if(!response.ok)throw Error('Recording unavailable');
        buffers[i]=await context.decodeAudioData(await response.arrayBuffer());
        // Begin as recordings arrive; do not wait for all long tracks to download.
        if(active()){startAvailable();fade(master.gain,volume*.8*scene.level,1.5);}
        render();
      }finally{clearTimeout(timeout);}
    }));
    if(results.some(result=>result.status==='rejected'))throw Error('Some recordings did not load');
  }
  async function sync(){
    render();clearTimeout(suspendTimer);
    if(!context)return;
    if(active()){
      try{await context.resume();}catch{enabled=false;failed=true;render();return;}
      if(!active())return;startAvailable();fade(master.gain,volume*.8*scene.level,1.5);
      if(!timer)timer=setInterval(updateTime,30000);
    }else{
      clearInterval(timer);timer=undefined;fade(master.gain,0,.2);
      suspendTimer=setTimeout(()=>{if(!active())context.suspend().catch(()=>{});},250);
    }
  }
  buttons.forEach(button=>button.addEventListener('click',async()=>{
    enabled=!enabled;failed=false;render();
    if(!enabled){sync();return;}
    try{
      if(!context)init();await sync();
      if(buffers.some(buffer=>!buffer)){
        if(!loading)loading=load().finally(()=>{loading=undefined;});await loading;
      }
      await sync();
    }catch{
      enabled=false;failed=true;sync();
      document.querySelector('#announcement').textContent='A recording could not load. Select Retry sound to continue.';
    }
  }));
  volumeInput.addEventListener('input',()=>{volume=+volumeInput.value/100;if(context)fade(master.gain,active()?volume*.8*scene.level:0,.25);});
  timeInput.addEventListener('change',updateTime);
  document.addEventListener('visibilitychange',()=>{scene=RainWeather.ambience(timeInput.value);sync();});
  window.rainSoundscape={setWeather(value){state=value;mix();},setPaused(value){paused=value;sync();}};
  render();
})();
