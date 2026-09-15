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
  const api = {sample, approach: (current,target,dt) => Math.abs(target-current)<.0005 ? target : current+(target-current)*(1-Math.exp(-dt/.16))};
  if (typeof module !== 'undefined') module.exports = api;
  else root.RainWeather = api;
})(typeof window === 'undefined' ? {} : window);
