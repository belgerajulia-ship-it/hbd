/* script.js
   Controls stage transitions, particles, mic interaction, music toggle, and replay.
   Uses only vanilla JS. Designed for performance: canvas particle system and DOM updates.
*/

/* =========================
   Utility + State
   ========================= */
const state = {
  stage: 1,
  audio: null,
  audioAllowed: false,
  micStream: null,
  micAnalyser: null,
  micData: null,
  micActive: false,
  particles: [],
  particleCtx: null,
  particleCanvas: null,
  animFrame: null,
  confettiActive: false,
  singingTimer: null
};

/* DOM references (ensure IDs exist in HTML) */
const stages = {
  1: document.getElementById('stage-1'),
  2: document.getElementById('stage-2'),
  3: document.getElementById('stage-3'),
  4: document.getElementById('stage-4'),
  5: document.getElementById('stage-5'),
};
const continueBtn = document.getElementById('continueBtn');
const blowBtn = document.getElementById('blowBtn');
const micState = document.getElementById('micState');
const micStatus = document.getElementById('mic-status');
const continueTo3Btn = document.getElementById('continueTo3Btn');
const continueTo4Btn = document.getElementById('continueTo4Btn');
const readMessageBtn = document.getElementById('readMessageBtn');
const replayBtn = document.getElementById('replayBtn');
const musicToggle = document.getElementById('musicToggle');
const wishMade = document.getElementById('wishMade');

const friendsArea = document.getElementById('friends-area');
const friendsArea3 = document.getElementById('friends-area-3');

const particlesCanvas = document.getElementById('particles-canvas');

/* Initialize canvas size */
function resizeCanvas(){
  particlesCanvas.width = window.innerWidth;
  particlesCanvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();
state.particleCtx = particlesCanvas.getContext('2d');

/* =========================
   Stage management
   ========================= */
function goToStage(n){
  // cinematic transitions
  for(let i=1;i<=5;i++){
    const el = stages[i];
    if(!el) continue;
    if(i===n){
      el.classList.add('active');
      el.setAttribute('aria-hidden','false');
    } else {
      el.classList.remove('active');
      el.setAttribute('aria-hidden','true');
    }
  }
  state.stage = n;
  // stage-specific entry actions
  if(n===1) {
    startStage1();
    stopParticles();
    stopAudioVisual();
  }
  if(n===2) startStage2();
  if(n===3) startStage3();
  if(n===4) startStage4();
  if(n===5) startStage5();
}

/* =========================
   Stage 1: generate friends + confetti + title animation
   ========================= */
function startStage1(){
  // populate 10 friends
  friendsArea.innerHTML = '';
  const emojis = ['🐰','🐼','🦊','🐱','🐹','🦄','🐻','🐨','🐶','🐭'];
  for(let i=0;i<10;i++){
    const f = document.createElement('div');
    f.className = 'friend';
    f.style.transition = `transform .9s cubic-bezier(.2,.9,.2,1) ${0.08*i}s, opacity .8s ${0.08*i}s`;
    f.innerHTML = `<div class="face" aria-hidden="true">${emojis[i % emojis.length]}</div><div class="gift">🎁</div>`;
    friendsArea.appendChild(f);
    // animate in
    requestAnimationFrame(()=>{ f.style.opacity = 1; f.style.transform = 'translateY(0)'; });
  }

  // show bouncing HAPPY BIRTHDAY text and gradually start confetti
  document.getElementById('birthdayTitle').classList.add('glow','pulse');
  setTimeout(()=> startConfetti(800, 'confetti'), 1000);
}

/* =========================
   Particles / Confetti engine (canvas-based)
   ========================= */
function random(min,max){return Math.random()*(max-min)+min;}

function Particle(x,y,vx,vy, size, color, type){
  this.x=x; this.y=y; this.vx=vx; this.vy=vy; this.size=size; this.color=color; this.type=type; this.life=0;
}
Particle.prototype.update = function(dt){
  this.life += dt;
  this.x += this.vx*dt;
  this.y += this.vy*dt;
  // gravity for confetti/hearts
  if(this.type==='confetti' || this.type==='petal') this.vy += 400*dt;
  // gentle floating for hearts/sparkles
  if(this.type==='heart') { this.vx += Math.sin(this.life*5)*5*dt; this.vy -= 40*dt; }
};
Particle.prototype.draw = function(ctx){
  ctx.save();
  ctx.fillStyle = this.color;
  if(this.type==='confetti'){
    ctx.translate(this.x,this.y);
    ctx.rotate(this.life*10 % (Math.PI*2));
    ctx.fillRect(-this.size/2,-this.size/2,this.size,this.size*0.6);
  } else if(this.type==='heart'){
    // simple heart using two circles and a triangle
    ctx.beginPath();
    const s = this.size*0.6;
    ctx.moveTo(this.x, this.y);
    ctx.arc(this.x - s*0.35, this.y - s*0.2, s*0.32, 0, Math.PI*2);
    ctx.arc(this.x + s*0.35, this.y - s*0.2, s*0.32, 0, Math.PI*2);
    ctx.moveTo(this.x - s*0.5, this.y);
    ctx.quadraticCurveTo(this.x, this.y + s*0.9, this.x + s*0.5, this.y);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(this.x, this.y, Math.max(1,this.size/2), 0, Math.PI*2);
    ctx.fill();
  }
  ctx.restore();
};

function startConfetti(count=400, type='confetti'){
  // create particles emanating from top-center
  state.particles = [];
  state.confettiActive = true;
  const cx = window.innerWidth/2;
  const cy = window.innerHeight*0.35;
  const colors = ['#FFD166','#06D6A0','#FF6B6B','#4D96FF','#FFB5E8','#B28CFF'];
  for(let i=0;i<count;i++){
    const angle = Math.PI*(0.9 + 0.2*Math.random());
    const speed = random(80,380);
    const vx = Math.cos(angle)*speed * random(.6,1.4);
    const vy = Math.sin(angle)*speed * random(.6,1.3) - 60;
    const size = random(6,18);
    const color = colors[Math.floor(Math.random()*colors.length)];
    state.particles.push(new Particle(cx + random(-60,60), cy + random(-20,20), vx, vy, size, color, 'confetti'));
  }
  if(!state.animFrame) particleLoop();
}

function sparkExplosion(x,y,kind='spark',count=120){
  // small explosion of petals/hearts/sparkles
  const colors = ['#FFD6E1','#FF6B81','#FFD480','#FFF3D6','#AEE6FF'];
  for(let i=0;i<count;i++){
    const angle = random(0,Math.PI*2);
    const speed = random(40,360);
    const vx = Math.cos(angle)*speed;
    const vy = Math.sin(angle)*speed;
    const size = random(4,18);
    const color = colors[Math.floor(Math.random()*colors.length)];
    const type = (i%6===0 || kind==='heart') ? 'heart' : (i%3===0 ? 'petal' : 'spark');
    state.particles.push(new Particle(x + random(-12,12), y + random(-12,12), vx, vy, size, color, type));
  }
  if(!state.animFrame) particleLoop();
}

function particleLoop(){
  const ctx = state.particleCtx;
  let last = performance.now();
  state.animFrame = requestAnimationFrame(function frame(t){
    const dt = Math.min(0.033, (t - last)/1000);
    last = t;
    ctx.clearRect(0,0,particlesCanvas.width, particlesCanvas.height);
    // update
    for(let i=state.particles.length-1;i>=0;i--){
      const p = state.particles[i];
      p.update(dt);
      p.draw(ctx);
      // remove out-of-bounds or aged
      if(p.x < -200 || p.x > window.innerWidth+200 || p.y > window.innerHeight+200 || p.life > 6) {
        state.particles.splice(i,1);
      }
    }
    if(state.particles.length>0){
      state.animFrame = requestAnimationFrame(frame);
    } else {
      state.animFrame = null;
    }
  });
}

function stopParticles(){
  state.particles = [];
  if(state.animFrame) { cancelAnimationFrame(state.animFrame); state.animFrame = null; }
  const ctx = state.particleCtx;
  ctx.clearRect(0,0,particlesCanvas.width, particlesCanvas.height);
}

/* =========================
   Stage 2: heart cake + mic blow detection
   ========================= */
async function startStage2(){
  wishMade.classList.add('hidden'); continueTo3Btn.classList.add('hidden');
  document.getElementById('flame2').classList.remove('out');
  document.getElementById('flame7').classList.remove('out');
  micState.textContent = 'idle';
  micStatus.style.opacity = 1;
  // try to get mic if user clicks blow button - do not auto-prompt until user interacts
}

async function initMic(){
  if(state.micActive) return;
  try{
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    state.micStream = stream;
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    state.micAnalyser = analyser;
    state.micData = new Uint8Array(analyser.fftSize);
    state.micActive = true;
    micState.textContent = 'listening';
    // start detection loop
    detectBlow();
  } catch(e){
    micState.textContent = 'microphone unavailable';
    state.micActive = false;
    console.warn('Mic init failed:', e);
  }
}

let blowTimeout = null;
function detectBlow(){
  if(!state.micActive || !state.micAnalyser) return;
  const a = state.micAnalyser;
  a.getByteTimeDomainData(state.micData);
  // compute RMS
  let sum = 0;
  for(let i=0;i<state.micData.length;i++){
    const v = (state.micData[i] - 128)/128;
    sum += v*v;
  }
  const rms = Math.sqrt(sum/state.micData.length);
  // if rms crosses threshold, count as blow
  if(rms > 0.07){
    // require short sustained detection to avoid accidental taps
    if(!blowTimeout){
      blowTimeout = setTimeout(()=> {
        blowTimeout = null;
        extinguishCandles();
      }, 220);
    }
  } else {
    if(blowTimeout){
      clearTimeout(blowTimeout); blowTimeout = null;
    }
  }
  requestAnimationFrame(detectBlow);
}

/* Fallback tap handler or after successful blow */
function extinguishCandles(){
  // animate flames out
  document.getElementById('flame2').classList.add('out');
  document.getElementById('flame7').classList.add('out');
  micState.textContent = 'blown';
  // dim and then explode flowers/petals/hearts
  setTimeout(()=>{
    const cakeRect = document.getElementById('heartCake').getBoundingClientRect();
    sparkExplosion(cakeRect.left + cakeRect.width/2, cakeRect.top + cakeRect.height/2, 'heart', 220);
    wishMade.classList.remove('hidden');
    continueTo3Btn.classList.remove('hidden');
  }, 500);
}

/* =========================
   Stage 3: singing performance
   ========================= */
function startStage3(){
  // create 20 friends
  friendsArea3.innerHTML = '';
  const icons = ['🥁','🎸','🎷','🎹','🎺','🪘','🪗','🪕','🎻','🎤','🩷','🦊','🐰','🐻','🐼','🦄','🦁','🐨','🐶','🐱'];
  for(let i=0;i<20;i++){
    const f = document.createElement('div');
    f.className = 'friend';
    f.style.opacity = .95;
    f.style.transform = `translateY(${random(0,20)}px)`;
    f.innerHTML = `<div class="face" aria-hidden="true">${icons[i % icons.length]}</div>`;
    friendsArea3.appendChild(f);
    // tiny dance animation
    f.animate([{transform:'translateY(0)'},{transform:`translateY(${random(-8,8)}px)`},{transform:'translateY(0)'}], {duration:1200+Math.random()*1600, iterations:Infinity, delay:Math.random()*400});
  }

  // start one-minute visual "song"
  // allow optional local file 'birthday.mp3'
  tryLoadAudio();
  // visual musical notes and sparkles
  spawnMusicalNotes();
  // automatically stop visuals after ~60s unless user moves forward
  clearTimeout(state.singingTimer);
  state.singingTimer = setTimeout(()=> {
    // gentle finish
    sparkExplosion(window.innerWidth/2, window.innerHeight/2, 'spark', 140);
  }, 60000);
}

/* simple musical notes generator (canvas as particles) */
function spawnMusicalNotes(){
  // small periodic sparkles
  const interval = setInterval(()=>{
    const x = random(window.innerWidth*0.2, window.innerWidth*0.8);
    const y = random(window.innerHeight*0.2, window.innerHeight*0.6);
    sparkExplosion(x,y,'spark', 18);
  }, 700);
  setTimeout(()=> clearInterval(interval), 61000);
}

/* Try load local birthday.mp3 gracefully */
function tryLoadAudio(){
  if(state.audio) return;
  const audio = new Audio('birthday.mp3');
  audio.loop = true;
  audio.preload = 'auto';
  audio.addEventListener('canplay', ()=> {
    state.audio = audio;
    musicToggle.disabled = false;
  });
  audio.addEventListener('error', ()=> {
    // not available — no problem
    state.audio = null;
    musicToggle.disabled = false;
  });
  // do not autoplay: user must click musicToggle to start.
  musicToggle.disabled = true;
}

/* =========================
   Stage 4: walk + bouquet + kiss hearts
   ========================= */
function startStage4(){
  // animate approach
  const puppy = document.getElementById('puppyApproach');
  const readBtn = document.getElementById('readMessageBtn');
  const forYouText = document.getElementById('forYouText');
  readBtn.classList.add('hidden'); forYouText.classList.add('hidden');

  // start approach
  puppy.classList.remove('far');
  // animate scale & position via CSS class transitions
  setTimeout(()=>{
    puppy.classList.add('approaching');
  }, 200);

  // after approach time, give bouquet and kiss
  setTimeout(()=> {
    // bouquet forward effect: explosion of subtle hearts
    const rect = puppy.getBoundingClientRect();
    sparkExplosion(rect.left + rect.width/2, rect.top + rect.height/2, 'heart', 260);
    forYouText.classList.remove('hidden');
    readBtn.classList.remove('hidden');
  }, 2600);
}

/* =========================
   Stage 5: final romantic message + typewriter + replay
   ========================= */
function startStage5(){
  const finalMessageEl = document.getElementById('finalMessage');
  const msg = `Happy birthday, my gorgeous wife! ❤️

I’ve been so incredibly happy and grateful since you came into my life. Thank you for being my safe place, my home, and my happiness. You deserve every beautiful thing this world has to offer. All I ever wish for you is good health, genuine happiness, and for this new chapter of your life to bring you closer to your dreams. I will always support u and stand beside you through whatever phase, every dream, and in everything.

Happy 27th Birthday, my love.

I love you bebiii more than u know and will always love you. ❤️`;

  // typewriter effect with emphasis on the line "Happy 27th Birthday, my love."
  finalMessageEl.style.opacity = 1;
  finalMessageEl.textContent = '';
  const lines = msg.split('\n');
  let i=0, charIdx=0, lineIdx=0;
  function typeNext(){
    if(lineIdx >= lines.length) return;
    const line = lines[lineIdx];
    if(charIdx < line.length){
      finalMessageEl.textContent += line[charIdx++];
      setTimeout(typeNext, 18 + Math.random()*28);
    } else {
      finalMessageEl.textContent += '\n\n';
      lineIdx++; charIdx=0;
      setTimeout(typeNext, 220);
    }
  }
  typeNext();

  // subtle romantic particle bouquet
  setTimeout(()=> {
    startConfetti(340, 'petal');
    sparkExplosion(window.innerWidth/2, window.innerHeight/2, 'heart', 220);
  }, 800);
}

/* =========================
   Music toggle and audio handling
   ========================= */
musicToggle.addEventListener('click', async ()=>{
  if(!state.audio){
    // audio not available but we still toggle visual state
    musicToggle.classList.toggle('active');
    const isOn = musicToggle.classList.contains('active');
    musicToggle.textContent = isOn ? '🔊 Music' : '🔇 Music';
    return;
  }
  if(state.audio.paused){
    try {
      await state.audio.play();
      musicToggle.textContent = '🔊 Music';
      musicToggle.setAttribute('aria-pressed','true');
    } catch(e){
      // many browsers require user gesture; this click is a user gesture so still could fail
      console.warn('Audio play failed', e);
    }
  } else {
    state.audio.pause();
    musicToggle.textContent = '🔇 Music';
    musicToggle.setAttribute('aria-pressed','false');
  }
});

/* Helper to stop audio visuals */
function stopAudioVisual(){
  if(state.audio && !state.audio.paused){
    state.audio.pause();
    musicToggle.textContent = '🔇 Music';
  }
}

/* tryLoadAudio was called in stage3; this allows musicToggle to play once audio loads */
musicToggle.disabled = false; // always allow toggling (visual) — audio optional

/* =========================
   Event listeners for UI
   ========================= */
continueBtn.addEventListener('click', ()=> goToStage(2));

blowBtn.addEventListener('click', async ()=>{
  // on first tap, try to init mic, else fallback to tap
  if(!state.micActive && navigator.mediaDevices && navigator.mediaDevices.getUserMedia){
    // prompt user for mic permission
    micState.textContent = 'prompting...';
    await initMic();
    if(!state.micActive){
      // fallback tap
      extinguishCandles();
    } else {
      micState.textContent = 'blow now';
    }
  } else if(state.micActive){
    // inform them to blow (detection runs automatically)
    micState.textContent = 'blow now';
  } else {
    // no mic support: fallback tap
    extinguishCandles();
  }
});

continueTo3Btn.addEventListener('click', ()=> goToStage(3));
continueTo4Btn.addEventListener('click', ()=> goToStage(4));
readMessageBtn.addEventListener('click', ()=> goToStage(5));
replayBtn.addEventListener('click', resetAll);

/* small pause visuals button (toggles particle/animation) */
document.getElementById('pauseSongBtn').addEventListener('click', ()=>{
  if(state.animFrame || state.particles.length){
    stopParticles();
    this.textContent = 'Resume Visuals';
  } else {
    // restart small visual
    startConfetti(60);
  }
});

/* =========================
   Replay: fully reset experience
   ========================= */
function resetAll(){
  // stop audio
  if(state.audio){
    state.audio.pause();
    state.audio.currentTime = 0;
  }
  // stop mic
  if(state.micStream){
    state.micStream.getTracks().forEach(t=>t.stop());
    state.micStream = null;
    state.micActive = false;
    micState.textContent = 'idle';
  }
  // clear particles and timers
  stopParticles();
  clearTimeout(state.singingTimer);
  // reset DOM elements states
  document.getElementById('birthdayTitle').classList.remove('glow','pulse');
  document.getElementById('flame2').classList.remove('out');
  document.getElementById('flame7').classList.remove('out');
  wishMade.classList.add('hidden');
  document.getElementById('readMessageBtn').classList.add('hidden');
  document.getElementById('forYouText').classList.add('hidden');
  // friends cleared
  friendsArea.innerHTML = '';
  friendsArea3.innerHTML = '';
  // go back to stage1
  goToStage(1);
}

/* =========================
   Initialization
   ========================= */
// initial setup of stage1
goToStage(1);

// make Continue buttons accessible when keyboard used
continueBtn.addEventListener('keydown', (e)=>{ if(e.key==='Enter') goToStage(2); });

/* Ensure no console errors if audio file missing */
window.addEventListener('error', (e)=>{
  // swallow audio loading errors but keep them in console for debugging
  if(e && e.filename && e.filename.includes('birthday.mp3')) {
    console.warn('Local audio not found (birthday.mp3) — continuing without audio.');
  }
});
