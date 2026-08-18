/* script.js
   All interactive logic:
   - stage transitions
   - particles: confetti, hearts, petals
   - microphone detection & blow out
   - audio control
   - replay reset
   - accessibility considerations
*/

/* Helpers and state */
const state = {
  stage: 1,
  audioEnabled: false,
  micStream: null,
  micAnalyser: null,
  micDataArray: null,
  micListening: false,
  particles: [],
  spawnedNodes: []
};

/* DOM references */
const stages = document.querySelectorAll('.stage');
const toStage2Btn = document.getElementById('toStage2');
const toStage3Btn = document.getElementById('toStage3');
const toStage4Btn = document.getElementById('toStage4');
const toStage5Btn = document.getElementById('toStage5');
const replayBtn = document.getElementById('replay');
const musicToggle = document.getElementById('musicToggle');
const musicIcon = document.getElementById('musicIcon');
const audioEl = document.getElementById('bgAudio');

const greetingEl = document.getElementById('greeting');
const confettiContainer1 = document.getElementById('confetti1');
const sparkles1 = document.getElementById('sparkles1');

/* Particle utility: create an element and animate via JS using transforms */
function createParticle(type, x, y, opts = {}) {
  const el = document.createElement('div');
  el.className = 'particle ' + (opts.className || '');
  // type classes for style if needed
  if (type === 'heart') el.classList.add('heart');
  if (type === 'flower') el.classList.add('flower');
  if (type === 'star') el.classList.add('star');
  if (type === 'confetti') el.classList.add('confetti-piece');

  const size = opts.size || (type === 'confetti' ? 8 + Math.random()*12 : 8 + Math.random()*12);
  el.style.width = size + 'px';
  el.style.height = size + (type === 'confetti' ? 'px' : 'px');
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  el.style.opacity = 1;
  el.style.transform = `translate3d(0,0,0) rotate(${Math.random()*360}deg)`;
  document.body.appendChild(el);
  state.spawnedNodes.push(el);

  // animate outward with random velocity
  const angle = (opts.angle != null) ? opts.angle : Math.random() * Math.PI * 2;
  const speed = opts.speed || (50 + Math.random()*300);
  const vx = Math.cos(angle) * speed;
  const vy = Math.sin(angle) * speed - (opts.upward ? 80 : 0);
  const duration = opts.duration || (1200 + Math.random()*1500);

  // use requestAnimationFrame for motion
  const start = performance.now();
  function frame(now){
    const t = (now - start)/duration;
    if (t >= 1) {
      // fade out then remove after a short delay
      el.style.transition = 'opacity 400ms linear';
      el.style.opacity = 0;
      setTimeout(() => {
        el.remove();
        const idx = state.spawnedNodes.indexOf(el);
        if (idx !== -1) state.spawnedNodes.splice(idx,1);
      }, 420);
      return;
    }
    // easing approx
    const ease = 1 - Math.pow(1-t,3);
    const curX = vx * ease;
    const curY = vy * ease + (opts.gravity || 0.5) * (now - start)/10;
    const rot = ease * 720;
    el.style.transform = `translate3d(${curX}px,${curY}px,0) rotate(${rot}deg)`;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return el;
}

/* Trigger confetti burst */
function confettiBurst(x=window.innerWidth/2, y=window.innerHeight/2, count=40) {
  for (let i=0;i<count;i++){
    createParticle('confetti', x, y, {angle: Math.random()*Math.PI*2, speed: 120 + Math.random()*360, duration: 900 + Math.random()*900, className:'confetti-piece', gravity: 0.2});
  }
}

/* Flower/rose/heart explosion (used in Stage2) */
function magicalExplosion(x,y,count=80) {
  const types = ['heart','flower','star','confetti'];
  for (let i=0;i<count;i++){
    const type = types[Math.floor(Math.random()*types.length)];
    const opts = {angle: Math.random()*Math.PI*2, speed: 120 + Math.random()*340, duration: 800 + Math.random()*1200, upward:true};
    createParticle(type, x, y, opts);
  }
}

/* Floating hearts for Stage4 */
let heartsInterval = null;
function spawnFloatingHeart(){
  const x = 20 + Math.random()*(window.innerWidth-40);
  const y = window.innerHeight + 20;
  const el = createParticle('heart', x, y, {angle: -Math.PI/2 + (Math.random()-0.5)*0.6, speed: 200 + Math.random()*120, duration: 2200 + Math.random()*1600, upward:false});
  // subtle scale and opacity handled in createParticle
}

/* Stage transition helper */
function goToStage(n) {
  // Reset or prepare transitions
  const cur = state.stage;
  if (cur === n) return;
  // hide current
  const currentEl = document.querySelector(`.stage[data-stage="${cur}"]`);
  const nextEl = document.querySelector(`.stage[data-stage="${n}"]`);
  if (currentEl) {
    currentEl.classList.remove('active');
    // small delay for cinematic effect
    setTimeout(()=> currentEl.setAttribute('hidden',''), 700);
  }
  if (nextEl) {
    nextEl.removeAttribute('hidden');
    // allow paint
    requestAnimationFrame(()=> {
      nextEl.classList.add('active');
      // stage-specific start actions
      if (n === 1) startStage1();
      if (n === 2) startStage2();
      if (n === 3) startStage3();
      if (n === 4) startStage4();
      if (n === 5) startStage5();
    });
  }
  state.stage = n;
}

/* Stage 1 initialization/celebration sequence */
function startStage1(){
  // show greeting after a short delay and spawn confetti and sparkles
  greetingEl.classList.add('visible');
  // small sparkles canvas (simple twinkle via DOM dots)
  createSparkles(60, 'stage1-sparkles');

  // friends clap and sing animation is CSS-driven. Start confetti after a moment.
  setTimeout(()=>{
    // spawn confetti gently then a burst
    gentleConfetti(80);
    setTimeout(()=>confettiBurst(window.innerWidth/2, window.innerHeight/3, 90), 1200);
  }, 800);

  // ensure control visible
  const btn = document.getElementById('toStage2');
  btn.disabled = false;
}

/* gentle confetti fall across screen */
function gentleConfetti(total=80) {
  const w = window.innerWidth;
  for (let i=0;i<total;i++){
    const x = Math.random()*w;
    const y = -20 - Math.random()*200;
    createParticle('confetti', x, y, {angle: Math.PI/2 + (Math.random()-0.5)*0.4, speed: 40 + Math.random()*160, duration: 2800 + Math.random()*1600, className:'confetti-piece', gravity: 0.05});
  }
}

/* sparkles renderer using canvas (simple twinkling stars) */
function createSparkles(amount, canvasId){
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  canvas.width = innerWidth;
  canvas.height = innerHeight;
  const ctx = canvas.getContext('2d');
  const stars = [];
  for (let i=0;i<amount;i++){
    stars.push({
      x: Math.random()*canvas.width,
      y: Math.random()*canvas.height,
      r: 0.6 + Math.random()*2.2,
      a: Math.random(),
      da: 0.005 + Math.random()*0.02
    });
  }
  function draw(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    for (const s of stars){
      s.a += s.da;
      if (s.a > 1 || s.a < 0) { s.da = -s.da; s.a += s.da; }
      ctx.beginPath();
      ctx.fillStyle = `rgba(255,255,255,${0.6*Math.abs(s.a)})`;
      ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
      ctx.fill();
    }
    requestAnimationFrame(draw);
  }
  draw();
}

/* Stage2 — cake and microphone interaction */
const micButton = document.getElementById('micButton');
const tapBlow = document.getElementById('tapBlow');
const heartCake = document.getElementById('heartCake');
const afterWish = document.getElementById('afterWish');

function startStage2(){
  // prepare canvas sparkles
  createSparkles(40, 'stage2-sparkles');

  // show mic button. start listening when clicked.
  micButton.hidden = false;
  micButton.disabled = false;
  tapBlow.hidden = true;
  afterWish.hidden = true;

  // try to initialize microphone on first user interaction only
  micButton.onclick = async function(){
    enableAudioContextForUserInteraction();
    micButton.disabled = true;
    micButton.setAttribute('aria-pressed','true');
    // request microphone
    try {
      await startMicListening();
      startMicDetectBlow();
    } catch(err){
      // microphone not available or permission denied — show fallback
      tapBlow.hidden = false;
      tapBlow.onclick = ()=> extinguishCandlesAndExplode();
    }
  };

  // allow tap fallback even without mic
  tapBlow.onclick = ()=> extinguishCandlesAndExplode();
}

/* Start microphone and setup analyser */
async function startMicListening(){
  if (state.micListening) return;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('No microphone API');
  const stream = await navigator.mediaDevices.getUserMedia({audio:true});
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const source = audioCtx.createMediaStreamSource(stream);
  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 256;
  source.connect(analyser);
  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  state.micStream = stream;
  state.micAnalyser = analyser;
  state.micDataArray = dataArray;
  state.micListening = true;
}

/* Analyze mic input for strong bursts (blow) */
function startMicDetectBlow(){
  if (!state.micAnalyser) return;
  const analyser = state.micAnalyser;
  const data = state.micDataArray;
  let lastPeak = 0;
  let blown = false;
  const threshold = 0.28; // tune for sensitivity
  function tick(){
    analyser.getByteFrequencyData(data);
    // compute normalized energy
    let sum = 0;
    for (let i=0;i<data.length;i++) sum += data[i];
    const avg = sum / data.length / 255;
    // detect rising edge beyond threshold
    if (!blown && avg > threshold && avg > lastPeak + 0.04) {
      blown = true;
      extinguishCandlesAndExplode();
    }
    lastPeak = avg;
    if (!blown) requestAnimationFrame(tick);
  }
  tick();
}

/* extinguish flames: toggle CSS and spawn explosion */
function extinguishCandlesAndExplode(){
  // extinguish flames visually
  const flames = document.querySelectorAll('.flame');
  flames.forEach(f => f.classList.add('extinguished'));

  // small dimming of cake
  heartCake.classList.add('dim');

  // brief pause then explosion
  setTimeout(()=> {
    const rect = heartCake.getBoundingClientRect();
    const cx = rect.left + rect.width/2;
    const cy = rect.top + rect.height/2 - 20;
    magicalExplosion(cx, cy, 120);
    // reveal message, show continue
    setTimeout(()=> {
      afterWish.hidden = false;
      const cont = document.getElementById('toStage3');
      cont.disabled = false;
    }, 1000);
  }, 450);
}

/* Stage3 — singing scene */
function startStage3(){
  // create particles for stage3
  createSparkles(40, 'stage3-particles');
  // Start music only on user interaction
  // Visual sequence ~60 seconds: We'll loop gentle animations; music plays via audio control
  // Ensure to show 20 friends (some created via JS to add variety)
  spawnFriendsForStage3(20);
  // auto-advance controls available
  const btn = document.getElementById('toStage4');
  btn.disabled = false;
}

/* Create or animate friends in stage3 */
function spawnFriendsForStage3(count){
  // already has 20 placeholder divs; add subtle instruments and staggered animation
  const container = document.getElementById('friends-stage3');
  // add small decorative children to each friend for visual variety
  Array.from(container.children).forEach((el, i) => {
    el.innerHTML = '';
    el.style.width = (40 + (i%5))*1 + 'px';
    el.style.height = (50 + (i%4)*6) + 'px';
    el.style.borderRadius = (10 + (i%4)*4) + 'px';
    // instrument or prop
    const prop = document.createElement('div');
    prop.className = 'instrument';
    prop.style.width = '10px';
    prop.style.height = '10px';
    prop.style.background = ['#ffd1e6','#fff7d8','#e6f8ff','#ffd7e2'][i%4];
    prop.style.borderRadius = '3px';
    prop.style.marginTop = '6px';
    el.appendChild(prop);
    el.style.animationDelay = (i%5)*100 + 'ms';
  });

  // add animated musical notes (DOM)
  const parent = document.querySelector('#stage3 .stage-inner');
  const notes = [];
  for (let i=0;i<16;i++){
    const n = document.createElement('div');
    n.className = 'music-note';
    n.textContent = '♪';
    n.style.position = 'absolute';
    n.style.left = (50 + Math.random()*40 - 20) + '%';
    n.style.top = (35 + Math.random()*20) + '%';
    n.style.fontSize = (14 + Math.random()*18) + 'px';
    n.style.opacity = 0.1 + Math.random()*0.9;
    n.style.transform = `translateY(${20+Math.random()*60}px)`;
    n.style.transition = 'transform 2500ms linear, opacity 1200ms linear';
    parent.appendChild(n);
    notes.push(n);
    // animate
    setTimeout(()=> {
      n.style.transform = 'translateY(-140px)';
      n.style.opacity = 0.05;
      setTimeout(()=> n.remove(), 3500);
    }, i*400);
  }

  // If birthday.mp3 exists and user interacted (music control), play as needed
}

/* Stage4 — walk, bouquet, kiss */
function startStage4(){
  createSparkles(40, 'stage4-hearts');
  // animate puppy walking in
  const walk = document.getElementById('puppyWalk');
  walk.classList.add('walked');
  // after a while, enlarge bouquet and trigger kiss effect
  setTimeout(()=> {
    const bouquet = document.getElementById('bouquet');
    bouquet.style.transform = 'translateX(-50%) scale(1.15)';
    bouquet.style.transition = 'transform 700ms cubic-bezier(.2,.9,.25,1)';
    // pulse glow
    bouquet.classList.add('pulse');
    // then approach and kiss
    setTimeout(()=> {
      // approach: scale puppy toward viewer
      walk.style.transform = 'translateY(-8vh) scale(1.08)';
      // spawn many hearts upward
      for (let i=0;i<200;i++){
        setTimeout(()=> spawnFloatingHeart(), i*25);
      }
      // show kiss text and enable continue
      const ktext = document.getElementById('kissText');
      ktext.hidden = false;
      // show button to continue
      const btn = document.getElementById('toStage5');
      btn.hidden = false;
      btn.disabled = false;
    }, 900);
  }, 1200);
}

/* Stage5 — final message with typewriter reveal */
const finalMessageContainer = document.getElementById('finalMessage');
const finalDecor = document.getElementById('finalDecor');

function startStage5(){
  // petals canvas
  createSparkles(40, 'stage5-petals');
  // prepare final text
  const fullText = `Happy birthday, my gorgeous wife! ❤️ I’ve been so incredibly happy and grateful since you came into my life. Thank you for being my safe place, my home, and my happiness. You deserve every beautiful thing this world has to offer. All I ever wish for you is good health, genuine happiness, and for this new chapter of your life to bring you closer to your dreams. I will always support u and stand beside you through whatever phase, every dream, and in everything. Happy 27th Birthday, my love. I love you bebiii more than u know and will always love you. ❤️`;
  // split into paragraphs for readability
  const paragraphs = [
    "Happy birthday, my gorgeous wife! ❤️ I’ve been so incredibly happy and grateful since you came into my life. Thank you for being my safe place, my home, and my happiness.",
    "You deserve every beautiful thing this world has to offer. All I ever wish for you is good health, genuine happiness, and for this new chapter of your life to bring you closer to your dreams.",
    "I will always support u and stand beside you through whatever phase, every dream, and in everything.",
    "Happy 27th Birthday, my love. I love you bebiii more than u know and will always love you. ❤️"
  ];
  finalMessageContainer.innerHTML = '';
  // Typewriter reveal per paragraph
  let idx = 0;
  function revealParagraph(i){
    if (i >= paragraphs.length) return;
    const p = document.createElement('p');
    p.className = 'fade-in';
    finalMessageContainer.appendChild(p);
    const text = paragraphs[i];
    // emphasize the penultimate line phrase "Happy 27th Birthday, my love."
    const emphasize = "Happy 27th Birthday, my love.";
    let pos = 0;
    function typeChar(){
      if (pos < text.length){
        p.textContent += text[pos++];
        setTimeout(typeChar, 18 + Math.random()*28);
      } else {
        // after finishing p, if this paragraph contains emphasize, style it
        if (text.includes(emphasize)){
          const html = p.textContent.replace(emphasize, `\n${emphasize}`);
          p.textContent = '';
          const parts = html.split('\n');
          p.textContent = parts[0];
          const em = document.createElement('span');
          em.className = 'emphasis';
          em.textContent = parts[1];
          p.appendChild(document.createElement('br'));
          p.appendChild(em);
        }
        setTimeout(()=> revealParagraph(i+1), 450);
      }
    }
    typeChar();
  }
  revealParagraph(0);
}

/* Music control behavior */
musicToggle.addEventListener('click', () => {
  enableAudioContextForUserInteraction();
  if (audioEl.paused) {
    playAudio();
  } else {
    pauseAudio();
  }
});

function enableAudioContextForUserInteraction() {
  // Called on first user interaction to avoid autoplay block
  if (state.audioEnabled) return;
  state.audioEnabled = true;
  // attempt to resume audio context if necessary
  if (audioEl) {
    audioEl.preload = 'auto';
  }
}

function playAudio(){
  audioEl.play().then(()=> {
    musicIcon.textContent = '🔊';
    musicToggle.setAttribute('aria-pressed','true');
  }).catch(err => {
    // cannot play (autoplay policy) — remain idle; provide visual feedback
    musicIcon.textContent = '🔈';
    musicToggle.setAttribute('aria-pressed','false');
    console.warn('Audio play prevented', err);
  });
}

function pauseAudio(){
  audioEl.pause();
  musicIcon.textContent = '🔈';
  musicToggle.setAttribute('aria-pressed','false');
}

/* handle missing audio gracefully */
audioEl.addEventListener('error', ()=> {
  // Hide music control if audio file missing
  musicToggle.style.opacity = 0.55;
  musicToggle.disabled = true;
  musicIcon.textContent = '🔈';
});

/* Replay: reset everything and return to Stage1 */
replayBtn.addEventListener('click', ()=> {
  resetAll();
  goToStage(1);
});

function resetAll(){
  // Reset state flags
  state.stage = 1;
  // Remove dynamically spawned nodes
  state.spawnedNodes.forEach(n => n.remove());
  state.spawnedNodes = [];
  // Reset cake flames
  document.querySelectorAll('.flame').forEach(f => f.classList.remove('extinguished'));
  // Reset heart intervals
  if (heartsInterval) { clearInterval(heartsInterval); heartsInterval = null; }
  // Stop mic stream
  if (state.micStream){
    state.micStream.getTracks().forEach(t => t.stop());
    state.micStream = null;
  }
  state.micListening = false;
  // reset puppy positions and classes
  const walk = document.getElementById('puppyWalk');
  if (walk) walk.classList.remove('walked');
  // hide texts/buttons
  document.getElementById('afterWish').hidden = true;
  document.getElementById('toStage5').hidden = true;
  document.getElementById('kissText').hidden = true;
  // clear final message
  finalMessageContainer.innerHTML = '';
  // reset greeting
  greetingEl.classList.remove('visible');
  // pause audio
  pauseAudio();
}

/* Hook up navigation buttons */
toStage2Btn.addEventListener('click', ()=> {
  enableAudioContextForUserInteraction();
  // cinematic transition
  goToStage(2);
});
toStage3Btn?.addEventListener('click', ()=> {
  goToStage(3);
});
toStage4Btn?.addEventListener('click', ()=> {
  goToStage(4);
});
toStage5Btn?.addEventListener('click', ()=> {
  goToStage(5);
});

/* Make sure Continue button enabling flow */
document.getElementById('toStage3').addEventListener('click', ()=> {
  goToStage(3);
});

/* Window resize adjustments for canvas */
window.addEventListener('resize', ()=> {
  ['stage1-sparkles','stage2-sparkles','stage3-particles','stage4-hearts','stage5-petals'].forEach(id=>{
    const c = document.getElementById(id);
    if (c){ c.width = innerWidth; c.height = innerHeight; }
  });
});

/* Startup */
(function init(){
  // show stage1 and trigger its animations
  goToStage(1);

  // attach click handlers for fallback taps
  // stage2 fallback if mic permission not given
  // initial greeting button state
  document.querySelectorAll('.btn').forEach(b => {
    b.addEventListener('touchstart', ()=> b.classList.add('touched'), {passive:true});
    b.addEventListener('touchend', ()=> b.classList.remove('touched'), {passive:true});
  });

  // ensure friend elements animate (add clap class)
  document.querySelectorAll('.friends .friend').forEach((el, i) => {
    // randomize clap timing using animationDelay
    el.style.animationDelay = (i*80 + Math.random()*180) + 'ms';
    // slight transform for 3D feel
    el.style.willChange = 'transform';
  });

  // set disable states to be enabled later
  document.getElementById('toStage2').disabled = false;
  document.getElementById('toStage3').disabled = true;
  document.getElementById('toStage4').disabled = true;
  document.getElementById('toStage5').disabled = true;

  // set accessibility focus management for keyboard users
  document.addEventListener('keydown', (e)=> {
    if (e.key === 'ArrowRight') {
      // proceed to next stage
      if (state.stage < 5) goToStage(state.stage + 1);
    } else if (e.key === 'Escape') {
      // replay prompt
    }
  });

  // allow initial music playback only after user gesture — clicking any primary button enables
  document.body.addEventListener('click', enableAudioContextForUserInteraction, {once:true,passive:true});
})();
