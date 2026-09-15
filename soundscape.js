/* Real field recordings, hosted with this page. Credits: audio-credits.html. */
(() => {
  'use strict';
  const buttons = [...document.querySelectorAll('[data-sound]')];
  const volumeInput = document.querySelector('#volume');
  let context, master, light, heavy, birds, buffers, loading, timer, suspendTimer;
  let enabled = false, paused = false, started = false, failed = false;
  let volume = Number(volumeInput.value)/100, state = RainWeather.sample(.65);
  let nextBird = 0, birdUntil = 0;
  const active = () => enabled && !paused && !document.hidden;
  function fade(param, value, seconds=.04) {
    const now = context.currentTime;
    param.cancelScheduledValues(now);
    param.setValueAtTime(param.value, now);
    param.linearRampToValueAtTime(value, now+seconds);
  }
  function renderButtons() {
    const text = enabled ? (!buffers ? 'Loading sounds…' : paused ? 'Sound paused' : 'Sound on') : failed ? 'Retry sound' : 'Sound off';
    buttons.forEach(button => {
      button.textContent = text;
      button.setAttribute('aria-pressed', String(enabled));
      button.title = enabled ? 'Mute rain and birds' : 'Play natural rain and birds';
    });
  }
  function updateMix() {
    if (!buffers) return;
    fade(light.gain, state.light);
    fade(heavy.gain, state.heavy);
    fade(birds.gain, state.birds, .12);
  }
  function init() {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) throw new Error('Web Audio unavailable');
    context = new Audio();
    master = context.createGain(); master.gain.value = 0; master.connect(context.destination);
    [light,heavy,birds] = [0,1,2].map(() => {
      const gain = context.createGain(); gain.gain.value = 0; gain.connect(master); return gain;
    });
  }
  async function load() {
    const decoded = await Promise.all(['rain-light','rain-heavy','wood-thrush'].map(async name => {
      const controller = new AbortController(), timeout = setTimeout(() => controller.abort(),30000);
      try {
        const response = await fetch('./assets/audio/'+name+'.mp3', {signal:controller.signal});
        if (!response.ok) throw new Error('Recording unavailable');
        return await context.decodeAudioData(await response.arrayBuffer());
      } finally {clearTimeout(timeout);}
    }));
    buffers = decoded;
  }
  function startBeds() {
    if (started) return;
    [light,heavy].forEach((gain,index) => {
      const source = context.createBufferSource(); source.buffer = buffers[index];
      source.loop = true; source.connect(gain); source.start();
    });
    started = true;
  }
  function scheduleBird() {
    if (!active() || !buffers || context.state !== 'running') return;
    const now = context.currentTime;
    if (state.birds < .03 || now < nextBird || now < birdUntil) return;
    const source = context.createBufferSource(), envelope = context.createGain();
    source.buffer = buffers[2];
    // Whole recorded phrases preserve real harmonics, rhythm and stereo distance.
    const duration = 8, offset = [0,9,18][Math.floor(Math.random()*3)];
    envelope.gain.setValueAtTime(0,now);
    envelope.gain.linearRampToValueAtTime(1,now+.7);
    envelope.gain.setValueAtTime(1,now+duration-1);
    envelope.gain.linearRampToValueAtTime(0,now+duration);
    source.connect(envelope); envelope.connect(birds);
    source.start(now,offset,duration); birdUntil = now+duration;
    nextBird = birdUntil+3+Math.random()*4+state.rain*5;
    source.onended = () => {source.disconnect();envelope.disconnect();};
  }
  async function syncPlayback() {
    renderButtons(); clearTimeout(suspendTimer);
    if (!context) return;
    if (active() && buffers) {
      try {await context.resume();} catch {enabled=false;failed=true;renderButtons();return;}
      if (!active()) return;
      startBeds(); updateMix(); fade(master.gain,volume,.18);
      if (!timer) {nextBird=Math.min(nextBird,context.currentTime+.8);timer=setInterval(scheduleBird,200);}
    } else {
      clearInterval(timer);timer=undefined;
      fade(master.gain,0,.12);
      suspendTimer=setTimeout(() => {if(!active())context.suspend().catch(()=>{});},180);
    }
  }
  buttons.forEach(button => button.addEventListener('click', async () => {
    enabled = !enabled;failed = false;renderButtons();
    if (!enabled) {syncPlayback();return;}
    try {
      if (!context) init();
      await context.resume();
      if (!buffers) {
        if (!loading) loading = load().finally(() => {loading=undefined;});
        await loading;
      }
      await syncPlayback();
    } catch {
      enabled=false;failed=true;syncPlayback();
      document.querySelector('#announcement').textContent='The recordings could not load. Select Retry sound to try again.';
    }
  }));
  volumeInput.addEventListener('input',() => {
    volume=Number(volumeInput.value)/100;
    volumeInput.setAttribute('aria-valuetext',Math.round(volume*100)+' percent');
    if (buffers) fade(master.gain,active()?volume:0,.08);
  });
  document.addEventListener('visibilitychange',syncPlayback);
  window.rainSoundscape = {
    setWeather(value) {
      const previous=state;state=value;
      if (context && previous.birds<.03 && state.birds>=.03) nextBird=context.currentTime+.8;
      updateMix();
    },
    setPaused(value) {paused=value;syncPlayback();}
  };
  renderButtons();
})();
