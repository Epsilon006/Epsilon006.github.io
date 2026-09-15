/* One intensity drives both the picture and the recorded sound layers. */
((root) => {
  'use strict';
  const clamp = value => Math.max(0, Math.min(1, Number(value) || 0));
  function sample(value) {
    const rain = clamp(value), density = Math.pow(rain, 1.25);
    const transition = clamp((rain - .28) / .62), power = Math.pow(rain, .7);
    return {rain, density, speed: .65 + .55*rain, length: .65 + .6*rain,
      light: Math.cos(transition*Math.PI/2)*power,
      heavy: Math.sin(transition*Math.PI/2)*power,
      birds: .9 * (1 - Math.pow(clamp((rain-.3)/.6), 1.4)),
      label: rain === 0 ? 'Still' : rain <= .3 ? 'Light rain' : rain <= .7 ? 'Steady rain' : 'Heavy rain'};
  }
  function ambience(mode='auto',hour=new Date().getHours()+new Date().getMinutes()/60) {
    const anchors=[[0,0,.78],[4,0,.78],[5,.35,.85],[7,1,1],[10,.65,1],[15,.5,1],[18,.75,.92],[20,.15,.82],[21,0,.78],[24,0,.78]];
    const fixed={dawn:7,day:13,dusk:18,night:23};
    const h=mode==='auto'?hour:(fixed[mode]??hour);
    let i=0;while(i<anchors.length-2&&h>anchors[i+1][0])i++;
    const a=anchors[i],b=anchors[i+1],t=clamp((h-a[0])/(b[0]-a[0])),ease=t*t*(3-2*t);
    return {birds:a[1]+(b[1]-a[1])*ease,level:a[2]+(b[2]-a[2])*ease,label:h<5||h>=21?'Night':h<9?'Dawn':h<17?'Day':h<20?'Dusk':'Night'};
  }
  const api = {sample, ambience, approach: (current,target,dt) => Math.abs(target-current)<.0005 ? target : current+(target-current)*(1-Math.exp(-dt/.16))};
  if (typeof module !== 'undefined') module.exports = api;
  else root.RainWeather = api;
})(typeof window === 'undefined' ? {} : window);
