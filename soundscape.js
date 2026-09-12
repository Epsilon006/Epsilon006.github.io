/* A local, synthesized soundscape. No audio downloads or autoplay. */
(() => {
  'use strict';
  const buttons = [...document.querySelectorAll('[data-sound]')];
  let context, master, rainBus, birdBus, layers, noise, timer;
  let enabled = false, paused = false, intensity = .65, nextBird = 0, busy = false;
  const random = (a,b) => a + Math.random() * (b-a);
  function mix(r) {
    return { air: .19 * Math.pow(r, .8), body: .48*r*r,
      spray: .13*r*r*r, drops: 3*r + 32*r*r, birds: .045*Math.pow(1-r, 1.8) };
  }
  function smooth(param, value, seconds = .12) {
    param.cancelScheduledValues(context.currentTime);
    param.setTargetAtTime(value, context.currentTime, seconds);
  }
  function init() {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) throw new Error('Audio is unavailable in this browser.');
    context = new Audio();
    master = context.createGain(); master.gain.value = 0;
    const limiter = context.createDynamicsCompressor();
    limiter.threshold.value = -12; limiter.ratio.value = 4;
    master.connect(limiter); limiter.connect(context.destination);
    rainBus = context.createGain(); rainBus.gain.value = 0; rainBus.connect(master);
    birdBus = context.createGain(); birdBus.connect(master);
    noise = context.createBuffer(2, context.sampleRate * 11, context.sampleRate);
    for (let channel=0; channel<2; channel++) {
      const data = noise.getChannelData(channel);
      for (let i=0; i<data.length; i++) data[i] = Math.random()*2-1;
    }
    layers = [[1800, .55], [380, .45], [5500, .65]].map(([frequency,q], i) => {
      const source = context.createBufferSource(); source.buffer = noise; source.loop = true;
      const filter = context.createBiquadFilter(); filter.type = 'bandpass';
      filter.frequency.value = frequency; filter.Q.value = q;
      const gain = context.createGain(); gain.gain.value = 0;
      source.connect(filter); filter.connect(gain); gain.connect(rainBus);
      source.start(0, i*2.71);
      return {gain, filter};
    });
  }
  function sync() {
    buttons.forEach(button => {
      button.textContent = enabled ? 'Sound on' : 'Sound off';
      button.setAttribute('aria-pressed', String(enabled));
      button.title = enabled ? 'Mute rain and birds' : 'Enable rain and birds';
    });
    if (!context) return;
    const active = enabled && !paused && !document.hidden;
    smooth(master.gain, active ? .72 : 0, .06);
    // A separate gate silences every rain voice, including existing drops, at zero.
    smooth(rainBus.gain, intensity > 0 ? 1 : 0, .025);
    const values = mix(intensity);
    ['air','body','spray'].forEach((key,i) => smooth(layers[i].gain.gain, values[key]));
    smooth(layers[0].filter.frequency, 1300 + 1400*intensity);
    smooth(birdBus.gain, values.birds);
    clearInterval(timer); timer = undefined;
    if (active) timer = setInterval(schedule, 100);
  }
  function drop(time) {
    const source = context.createBufferSource(); source.buffer = noise;
    const filter = context.createBiquadFilter(); filter.type = 'bandpass';
    filter.frequency.value = random(700,3200); filter.Q.value = random(.6,1.8);
    const gain = context.createGain(), pan = context.createStereoPanner();
    pan.pan.value = random(-.85,.85);
    gain.gain.setValueAtTime(0,time);
    gain.gain.linearRampToValueAtTime(random(.014,.045)*(.3+.7*intensity),time+.003);
    gain.gain.exponentialRampToValueAtTime(.00001,time+random(.035,.09));
    source.connect(filter); filter.connect(gain); gain.connect(pan); pan.connect(rainBus);
    source.start(time,random(0,9)); source.stop(time+.12);
    source.onended = () => {source.disconnect();filter.disconnect();gain.disconnect();pan.disconnect();};
  }
  function bird(time) {
    const pan = context.createStereoPanner(); pan.pan.value = random(-.8,.8); pan.connect(birdBus);
    const base = random(2100,3100), count = Math.floor(random(2,5));
    for (let i=0;i<count;i++) {
      const start = time+i*.19, oscillator = context.createOscillator(), gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(base*.8,start);
      oscillator.frequency.exponentialRampToValueAtTime(base*random(1.15,1.5),start+.045);
      oscillator.frequency.exponentialRampToValueAtTime(base*.92,start+.13);
      gain.gain.setValueAtTime(0,start); gain.gain.linearRampToValueAtTime(.65,start+.018);
      gain.gain.exponentialRampToValueAtTime(.0001,start+.15);
      oscillator.connect(gain);gain.connect(pan);oscillator.start(start);oscillator.stop(start+.17);
      oscillator.onended = () => {oscillator.disconnect();gain.disconnect();if(i===count-1)pan.disconnect();};
    }
  }
  function schedule() {
    if (!enabled || paused || document.hidden || context.state !== 'running') return;
    const now = context.currentTime, expected = mix(intensity).drops*.1;
    const count = Math.floor(expected)+(Math.random()<expected%1 ? 1 : 0);
    for (let i=0;i<count;i++) drop(now+random(.005,.095));
    if (now>=nextBird) {
      if (intensity<.85 && Math.random()<(1-intensity)*.9) bird(now+.01);
      nextBird = now+random(6,14)+intensity*18;
    }
  }
  buttons.forEach(button => button.addEventListener('click', async () => {
    if (busy) return; busy = true;
    try {
      if (!context) init();
      if (!enabled) await context.resume();
      enabled = !enabled; nextBird = context.currentTime+random(2,5); sync();
    } catch (error) {
      enabled = false; sync();
      document.querySelector('#announcement').textContent = 'Sound could not start. Please try again.';
    } finally { busy = false; }
  }));
  document.addEventListener('visibilitychange', sync);
  window.rainSoundscape = {
    setRain(value) { intensity = Math.max(0,Math.min(1,value)); sync(); },
    setPaused(value) { paused = value; sync(); }
  };
  sync();
})();
