// script.js - controls stages, music, mic, particles and interactions
// Keep everything self-contained and dependency-free.

// Basic DOM refs
const startBtn = document.getElementById('start');
const intro = document.getElementById('intro');
const stageRoot = document.getElementById('stage-root');
const cinnamon = document.getElementById('cinnamon');
const friendsEl = document.getElementById('friends');
const cakeHolder = document.getElementById('cake-holder');
const particles = document.getElementById('particles');
const banner = document.getElementById('banner');
const stageMsg = document.getElementById('stage-msg');
const musicToggle = document.getElementById('music-toggle');
const replayBtn = document.getElementById('replay');
const final = document.getElementById('final');
const closeFinal = document.getElementById('close-final');
const bgCanvas = document.getElementById('bg-canvas');

let currentStage = 0;
let musicOn = true;
let audioCtx, masterGain, musicLoop;
let micStream, analyser, micEnabled=false, micInterval;
let singingTimeout;

// Utilities
const sleep = ms => new Promise(r=>setTimeout(r,ms));
function rand(min,max){ return Math.random()*(max-min)+min }

// initialize background canvas (speckles + four-point stars)
function drawBackground(){
  const c = bgCanvas;
  const dpr = window.devicePixelRatio || 1;
  c.width = innerWidth * dpr;
  c.height = innerHeight * dpr;
  c.style.width = innerWidth + 'px';
  c.style.height = innerHeight + 'px';
  const ctx = c.getContext('2d');
  ctx.scale(dpr,dpr);
  // gradient
  const g = ctx.createLinearGradient(0,0,0,c.height/dpr);
  g.addColorStop(0,'#cfefff');
  g.addColorStop(1,'#e8faff');
  ctx.fillStyle = g;
  ctx.fillRect(0,0,c.width/dpr,c.height/dpr);

  // speckles
  for(let i=0;i<200;i++){
    const x = Math.random()*c.width/dpr, y=Math.random()*c.height/dpr;
    ctx.fillStyle = 'rgba(255,255,255,'+ (Math.random()*0.9+0.1) +')';
    ctx.beginPath(); ctx.arc(x,y, Math.random()*1.6+0.3,0,Math.PI*2); ctx.fill();
  }
  // 4-point stars
  function drawStar(x,y,sz,alpha){
    ctx.save(); ctx.translate(x,y); ctx.rotate(Math.random()*Math.PI);
    ctx.fillStyle = 'rgba(255,255,255,'+alpha+')';
    ctx.fillRect(-sz/10,-sz,sz/5,sz*2);
    ctx.fillRect(-sz,-sz/10,sz*2,sz/5);
    ctx.restore();
  }
  for(let i=0;i<12;i++){
    drawStar(rand(20,innerWidth-20), rand(40,innerHeight-120), rand(8,22), rand(.3,.9));
  }
}
drawBackground();
addEventListener('resize', drawBackground);

// create friends avatars (reusable simple SVG)
function makeFriend(kind=0){
  const div = document.createElement('div');
  div.className = 'friend clap';
  // slight variation
  const hue = 200 + Math.floor(Math.random()*40);
  const eye = Math.random()>0.5 ? 'open' : 'smile';
  const svg = `
  <svg viewBox="0 0 80 120" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="40" cy="70" rx="32" ry="25" fill="#fff" stroke="#5aa6e6" stroke-width="3"/>
    <ellipse cx="14" cy="30" rx="12" ry="20" fill="#fff" stroke="#5aa6e6" stroke-width="3"/>
    <ellipse cx="66" cy="30" rx="12" ry="20" fill="#fff" stroke="#5aa6e6" stroke-width="3"/>
    <circle cx="30" cy="64" r="5" fill="#7dbef0"/>
    <circle cx="50" cy="64" r="5" fill="#7dbef0"/>
    <path d="M30 74 q10 8 20 0" stroke="#7dbef0" stroke-width="2" fill="none" stroke-linecap="round"/>
    <ellipse cx="26" cy="76" rx="6" ry="3.5" fill="#ffd0de"/>
    <ellipse cx="54" cy="76" rx="6" ry="3.5" fill="#ffd0de"/>
  </svg>`;
  div.innerHTML = svg;
  // random clap offset
  div.style.animationDelay = (Math.random()*600)+'ms';
  return div;
}

// populate friends group depending on stage
function populateFriends(count=10){
  friendsEl.innerHTML='';
  for(let i=0;i<count;i++){
    friendsEl.appendChild(makeFriend(i));
  }
}

// particle generator (confetti, hearts, petals, sparkles)
function emitParticle({x=50,y=50, color='#fff', size=12, life=2000, shape='confetti'}){
  const el = document.createElement('div');
  el.className='particle';
  el.style.left = x+'%';
  el.style.top = y+'%';
  const s = Math.max(size,6) + 'px';
  el.style.width = s; el.style.height = s;
  el.style.opacity = 1;
  el.style.transform = `translate(-50%,-50%) rotate(${rand(0,360)}deg)`;
  el.style.zIndex = 40;
  // shape content
  if(shape==='heart'){
    el.innerHTML = `<svg width="${s}" height="${s}" viewBox="0 0 24 24"><path fill="${color}" d="M12 21s-7-4.9-9-8c-1.5-2.4.1-5.5 2.9-5.5 1.6 0 3.1.9 4.1 2.1 1-1.2 2.5-2.1 4.1-2.1 2.8 0 4.4 3.1 2.9 5.5-2 3.1-9 8-9 8z"/></svg>`;
  } else if(shape==='petal'){
    el.innerHTML = `<svg width="${s}" height="${s}" viewBox="0 0 24 24"><path fill="${color}" d="M12 2c2.5 0 5 9 0 16-5-7-2.5-16 0-16z"/></svg>`;
  } else if(shape==='spark'){
    el.innerHTML = `<svg width="${s}" height="${s}" viewBox="0 0 24 24"><path fill="${color}" d="M12 2l1.8 5.8L20 9l-5.8 1.2L12 16 10.8 10.2 5 9l5.2-1.2z"/></svg>`;
  } else {
    // confetti rectangle
    el.style.background = color;
    el.style.borderRadius = '3px';
  }
  particles.appendChild(el);

  // animate
  const vx = rand(-40,40), vy = rand(40,120);
  const rot = rand(-360,360);
  el.animate([
    {transform:el.style.transform,opacity:1},
    {transform:`translate(calc(-50% + ${vx}px), calc(-50% + ${vy}px)) rotate(${rot}deg)`, opacity:0}
  ],{duration:life, easing:'cubic-bezier(.2,.8,.2,1)'});
  setTimeout(()=>el.remove(), life+80);
}

// show confetti burst
function confettiBurst(centerX=50,centerY=40,amount=36){
  const colors = ['#ffd9e6','#fff7d9','#cfefff','#ffd0de','#ffefef','#fffbe6','#ffd1b3','#d6f0ff'];
  for(let i=0;i<amount;i++){
    emitParticle({
      x:centerX + rand(-9,9),
      y:centerY + rand(-9,9),
      color: colors[Math.floor(Math.random()*colors.length)],
      size: rand(6,14),
      life: rand(1600,2600),
      shape: 'confetti'
    });
  }
}

// sparkles / hearts shower
function heartsShower(amount=36){
  for(let i=0;i<amount;i++){
    emitParticle({
      x: rand(10,90),
      y: rand(-10,20),
      color: ['#ff9aa2','#ffb7b2','#ffd1dc','#fff1f2'][Math.floor(Math.random()*4)],
      size: rand(10,28),
      life: rand(1600,3000),
      shape: 'heart'
    });
  }
}

// petals and flowers
function petalsExplosion(centerX=50,centerY=50,amount=48){
  for(let i=0;i<amount;i++){
    emitParticle({
      x:centerX + rand(-12,12),
      y:centerY + rand(-8,8),
      color: ['#ffc7d1','#ffd0de','#ffefd6'][Math.floor(Math.random()*3)],
      size: rand(8,20),
      life: rand(1200,2600),
      shape: 'petal'
    });
  }
}

// sparkles
function sparkleRain(amount=20){
  for(let i=0;i<amount;i++){
    emitParticle({
      x: rand(8,92),
      y: rand(2,40),
      color: '#fff',
      size: rand(8,20),
      life: rand(900,1800),
      shape: 'spark'
    });
  }
}

// Stage flows
async function startShow(){
  intro.classList.add('hidden');
  currentStage = 1;
  await stage1();
  await stage2();
  await stage3();
  await stage4();
  await stage5();
}

async function stage1(){
  // Setup stage 1: cinnamon pops, friends = 10, cake appears, confetti, banner
  populateFriends(10);
  cakeHolder.innerHTML = '';
  banner.classList.remove('show');
  // cake HTML (simple)
  const cakeHTML = `
    <div class="cake" aria-hidden="true">
      <svg viewBox="0 0 600 300" width="520" height="180">
        <defs><linearGradient id="cg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#ffddee"/></linearGradient></defs>
        <rect x="80" y="80" rx="22" ry="16" width="440" height="120" fill="url(#cg)" stroke="#e9bcd4" stroke-width="4"/>
        <g transform="translate(160,44)">
          <circle cx="40" cy="80" r="24" fill="#ffefef"/>
          <circle cx="120" cy="80" r="24" fill="#fff0f6"/>
        </g>
      </svg>
    </div>`;
  cakeHolder.innerHTML = cakeHTML;
  // pop cinnamon
  cinnamon.classList.add('pop');
  // confetti and banner
  confettiBurst(50,40,40);
  sparkleRain(16);
  await sleep(600);
  banner.classList.add('show');
  stageMsg.textContent = "Cinnamon Roll and friends are singing for you!";
  stageMsg.style.opacity = 1;
  // continuous confetti for a while
  const confettiInterval = setInterval(()=>confettiBurst(rand(30,70), rand(20,60), 22), 1200);
  await sleep(6000);
  clearInterval(confettiInterval);
  // fade banner but keep stage visible a little longer
  banner.classList.remove('show');
  await sleep(900);
}

async function stage2(){
  currentStage = 2;
  stageMsg.textContent = "Make a wish — blow out the candles! (allow mic or tap the cake)";
  // render heart-shaped cake with 27 candles
  cakeHolder.innerHTML = '';
  const cakeSVG = createHeartCake(27);
  cakeHolder.appendChild(cakeSVG);
  // animate flames
  animateFlames(true);
  // show mic enable button in the message area
  const enableMicBtn = document.createElement('button');
  enableMicBtn.textContent = 'Enable mic (blow)';
  enableMicBtn.className='control-btn';
  stageMsg.appendChild(enableMicBtn);

  // mic logic (getUserMedia + analyser)
  enableMicBtn.onclick = async ()=>{
    enableMicBtn.disabled = true;
    enableMicBtn.textContent = 'Listening...';
    try{
      await enableMicrophone();
    }catch(e){
      enableMicBtn.textContent = 'Mic denied — tap the cake to blow';
      console.warn('mic failed',e);
    }
  };

  // tap to blow fallback
  cakeHolder.querySelector('.cake-heart').addEventListener('click', ()=> {
    extinguishCandles();
  });

  // Wait until extinguished
  await new Promise(resolve=>{
    // set a global check
    const check = setInterval(()=>{
      if(!document.querySelectorAll('.candle.flame').length){
        clearInterval(check);
        resolve();
      }
    },200);
  });

  // After extinguish: magical explosion
  petalsExplosion(50,40,60);
  heartsShower(48);
  sparkleRain(26);
  stageMsg.textContent = "Wish granted ✨";
  await sleep(1400);
}

function createHeartCake(nCandles=27){
  // create container element
  const holder = document.createElement('div');
  holder.className = 'cake';
  // create SVG element via DOM
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS,'svg');
  svg.setAttribute('viewBox','0 0 600 360');
  svg.setAttribute('width','520');
  svg.setAttribute('height','260');
  svg.classList.add('cake-heart');

  // heart shape
  const heart = document.createElementNS(svgNS,'path');
  heart.setAttribute('d','M300 230 C 260 190 200 150 260 110 C 300 80 340 100 340 100 C 380 80 420 80 440 110 C 480 150 420 190 380 230 C 340 270 320 300 300 310 C 280 300 260 270 220 230 C 180 190 120 150 180 110 C 220 70 320 70 320 70 C 340 70 420 70 460 110 C500 150 420 210 380 230 C340 252 320 280 300 310');
  heart.setAttribute('fill','#fff0f6');
  heart.setAttribute('stroke','#e9bcd4');
  heart.setAttribute('stroke-width','4');
  svg.appendChild(heart);

  // decorative top icing
  const icing = document.createElementNS(svgNS,'ellipse');
  icing.setAttribute('cx','300'); icing.setAttribute('cy','150'); icing.setAttribute('rx','170'); icing.setAttribute('ry','40');
  icing.setAttribute('fill','#fff5f9'); icing.setAttribute('opacity','0.9');
  svg.appendChild(icing);

  // candles: arrange along top arc
  const centerX=300, centerY=120, radius=160;
  const startAngle = -120*Math.PI/180, endAngle = -60*Math.PI/180;
  for(let i=0;i<nCandles;i++){
    const t = i/(nCandles-1);
    const angle = startAngle + (endAngle-startAngle)*t;
    const x = centerX + Math.cos(angle)*radius*0.78;
    const y = centerY + Math.sin(angle)*radius*0.78;
    // candle group
    const g = document.createElementNS(svgNS,'g');
    g.setAttribute('transform',`translate(${x},${y})`);
    g.setAttribute('class','candle');
    // stick
    const stick = document.createElementNS(svgNS,'rect');
    stick.setAttribute('x','-4'); stick.setAttribute('y','0'); stick.setAttribute('width','8'); stick.setAttribute('height','26');
    stick.setAttribute('fill','#ffd1d8'); stick.setAttribute('stroke','#ff9aa2'); stick.setAttribute('stroke-width','1');
    g.appendChild(stick);
    // flame
    const flame = document.createElementNS(svgNS,'path');
    flame.setAttribute('d','M0 -6 Q3 -14 0 -22 Q-3 -14 0 -6 Z'); flame.setAttribute('fill','#ffd86b');
    flame.setAttribute('class','flame');
    g.appendChild(flame);
    // add to svg
    svg.appendChild(g);
  }

  // add to holder
  holder.appendChild(svg);
  return holder;
}

function animateFlames(on=true){
  const flames = document.querySelectorAll('.flame');
  flames.forEach((f,i)=>{
    f.style.transformOrigin = '0 0';
    if(on){
      const dur = 600 + (i%3)*80;
      f.animate([
        {transform:'translateY(0) scale(1)', opacity:1},
        {transform:'translateY(-4px) scale(0.9)', opacity:0.9},
        {transform:'translateY(0) scale(1)', opacity:1}
      ],{duration:dur,iterations:Infinity,easing:'ease-in-out'});
    } else {
      // remove animations and hide flames
      f.getAnimations().forEach(a=>a.cancel());
      f.style.opacity = 0;
      const parentG = f.parentElement;
      if(parentG) parentG.classList.remove('flame');
    }
  });
}

// microphone enable and detection
async function enableMicrophone(){
  if (micEnabled) return;
  try{
    micStream = await navigator.mediaDevices.getUserMedia({audio:true});
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 1024;
    const source = audioCtx.createMediaStreamSource(micStream);
    source.connect(analyser);
    micEnabled = true;
    detectBlowFromMic();
  }catch(e){
    micEnabled=false;
    throw e;
  }
}

function detectBlowFromMic(){
  const data = new Uint8Array(analyser.frequencyBinCount);
  let blowCount = 0;
  micInterval = setInterval(()=>{
    analyser.getByteFrequencyData(data);
    let sum = 0;
    for(let i=0;i<data.length;i++) sum += data[i];
    const avg = sum / data.length;
    // sensitivity tweak: for mobile may need to adjust; we allow short loud pops counted as blow
    if(avg > 35){
      blowCount++;
    } else {
      blowCount = Math.max(0, blowCount-1);
    }
    if(blowCount > 3){
      // considered blown
      clearInterval(micInterval);
      extinguishCandles();
    }
  },140);
}

// extinguish candles (stop flames and animate)
function extinguishCandles(){
  // stop flame animations and remove flame elements by toggling style
  const flamePaths = document.querySelectorAll('.flame');
  flamePaths.forEach(fp=>{
    fp.style.transition = 'opacity .6s ease';
    fp.style.opacity = 0;
    const g = fp.parentElement;
    if(g) g.classList.remove('flame');
  });
  // float tiny sparkles
  petalsExplosion(50,40,40);
  confettiBurst(50,45,28);
  // remove any micInterval
  if(micInterval) clearInterval(micInterval);
  // remove mic media
  if(micStream){
    micStream.getTracks().forEach(t=>t.stop());
    micStream = null;
  }
}

// Stage 3: singing with friends (20)
async function stage3(){
  currentStage = 3;
  stageMsg.textContent = "Cinnamon Roll is singing for you 🎤";
  populateFriends(20);
  // show microphone in SVG
  document.getElementById('micro').style.transition = 'opacity .6s';
  document.getElementById('micro').style.opacity = 1;
  // animate mouth in simple pulse
  const mouth = document.getElementById('mouth');
  if(mouth){
    mouth.animate([{transform:'scale(1)'},{transform:'scale(1.06)'},{transform:'scale(1)'}],{duration:500,iterations:Infinity,easing:'ease-in-out'});
  }
  // show stage lighting (flash)
  const scene = document.querySelector('.scene');
  const light = document.createElement('div'); light.style.position='absolute'; light.style.top='-30%'; light.style.left='50%'; light.style.width='380px';
  light.style.height='380px'; light.style.zIndex=28; light.style.pointerEvents='none';
  light.style.background='radial-gradient(circle at 50% 20%, rgba(255,255,255,0.12), rgba(255,255,255,0))';
  scene.appendChild(light);
  // dancing friends movement
  document.querySelectorAll('.friend').forEach((f,i)=>{
    f.style.transition = 'transform .6s ease';
    setInterval(()=> f.style.transform = `translateY(${ (Math.sin(Date.now()/500 + i) * 6)}px)`, 160);
  });

  // play singing (synth loop)
  startMusic(true);
  // singing duration ~60 seconds (but keep stage flexible)
  const duration = 60*1000;
  stageMsg.textContent = "Singing: \"Happy Birthday to You\" (you can skip)";
  // allow skipping by clicking stageMsg:
  let skipped = false;
  const skip = ()=>{ skipped = true; stageMsg.removeEventListener('click', skip) };
  stageMsg.addEventListener('click', skip);
  // create musical notes particle
  const noteInterval = setInterval(()=> {
    emitParticle({x:rand(30,70), y:rand(30,80), color:'#7dbef0', size:18, life:1800, shape:'spark'});
  }, 600);
  // singing mouth animation more lively
  const mouthAnim = mouth.animate([
    {d:'M135 135 q15 18 30 0'},
    {d:'M135 133 q15 24 30 0'},
    {d:'M135 135 q15 18 30 0'}
  ],{duration:400,iterations:Infinity});
  // wait
  const startAt = Date.now();
  while(Date.now()-startAt < duration && !skipped){
    await sleep(400);
  }
  clearInterval(noteInterval);
  mouthAnim.cancel();
  stageMsg.textContent = "Finished singing 🎵";
  // stop music but keep background playing optionally
  // continue to next stage after short pause
  await sleep(800);
  // remove lighting
  light.remove();
  // hide microphone
  document.getElementById('micro').style.opacity = 0;
  // small sparkle
  sparkleRain(16);
}

async function stage4(){
  currentStage = 4;
  stageMsg.textContent = "Cinnamon Roll walks up with a bouquet 🌹";
  // show bouquet and animate cinnamon walking toward screen
  cinnamon.classList.add('walk');
  // animate transform
  cinnamon.style.transition = 'transform 1400ms cubic-bezier(.2,.9,.1,1), scale 900ms';
  cinnamon.style.transform = 'translateY(-60px) scale(1.05)';
  // show bouquet as SVG append to cinnamon
  const micro = document.getElementById('micro');
  const svg = document.getElementById('cinn-svg');
  // create bouquet graphic near right hand
  const bouquet = document.createElementNS("http://www.w3.org/2000/svg",'g');
  bouquet.setAttribute('id','bouquet');
  bouquet.setAttribute('transform','translate(200,170) scale(.8)');
  bouquet.innerHTML = `<g>
    <path d="M4 22 C 14 18 24 18 34 22 L30 34 C 20 30 10 30 4 34 Z" fill="#7dbef0" opacity="0.06"/>
    <circle cx="12" cy="18" r="9" fill="#ff8aa6" />
    <circle cx="28" cy="18" r="9" fill="#ff636b" />
    <path d="M18 28 L18 44" stroke="#8b5a4a" stroke-width="4" stroke-linecap="round"/>
  </g>`;
  svg.appendChild(bouquet);
  await sleep(1200);
  // approach closer
  cinnamon.style.transform = 'translateY(-20px) scale(1.25)';
  // give bouquet (animate bouquet moving)
  const b = document.getElementById('bouquet');
  if(b){
    b.animate([{transform:'translate(200,170) scale(.8)'},{transform:'translate(80,120) scale(.95)'}],{duration:900,easing:'ease-out',fill:'forwards'});
  }
  // hearts floating
  heartsShower(70);
  await sleep(1200);
  // cute kiss animation (brief scale)
  cinnamon.style.transform = 'translateY(-10px) scale(1.32)';
  // large hearts
  heartsShower(120);
  await sleep(1200);
}

async function stage5(){
  currentStage = 5;
  // Soft romantic background: overlay red roses & petals
  stageMsg.textContent = "A message for you 💌";
  // create rose-like particles
  for(let i=0;i<6;i++){
    petalsExplosion(rand(20,80), rand(10,70), 18);
    await sleep(200);
  }
  // Show final message modal
  final.classList.remove('hidden');
  // cinematic reveal animation
  final.animate([{transform:'translateY(30px) scale(.98)', opacity:0},{transform:'translateY(0) scale(1)', opacity:1}],{duration:700,easing:'cubic-bezier(.2,.9,.1,1)'});
  stageMsg.textContent = "Forever & always ❤️";
  // stop background music if desired - keep playing or let user toggle.
}

// replay functionality: reset state
function resetAll(){
  // clear DOM modifications and resets
  currentStage = 0;
  intro.classList.remove('hidden');
  final.classList.add('hidden');
  friendsEl.innerHTML = '';
  cakeHolder.innerHTML = '';
  particles.innerHTML = '';
  banner.classList.remove('show');
  stageMsg.textContent = '';
  cinnamon.style.transform = '';
  document.getElementById('micro').style.opacity = 0;
  // stop music completely
  stopMusic();
}

// Music synth (simple loop)
function startMusic(looping=false){
  if(!musicOn) return;
  if(!audioCtx){
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if(!masterGain){
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.25;
    masterGain.connect(audioCtx.destination);
  }
  // create simple arpeggio
  const now = audioCtx.currentTime;
  // stop previous
  if(musicLoop) { musicLoop.stop(); musicLoop = null; }
  // schedule notes using OscillatorNode wrapper
  const notes = [440, 554.37, 659.25, 880]; // simple progression A4, C#5, E5, A5
  const dur = 0.45;
  const node = audioCtx.createOscillator();
  node.type = 'sine';
  const g = audioCtx.createGain();
  g.gain.value = 0;
  node.connect(g);
  g.connect(masterGain);
  node.start();
  let step = 0;
  function tick(){
    const t = audioCtx.currentTime;
    const freq = notes[step % notes.length];
    node.frequency.cancelScheduledValues(t);
    node.frequency.setValueAtTime(freq, t);
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.14, t+0.02);
    g.gain.linearRampToValueAtTime(0.0,t+dur);
    step++;
    // small sparkle
    sparkleRain(2);
    if(musicOn) setTimeout(tick, dur*1000);
    else { node.stop(); node.disconnect(); }
  }
  musicLoop = { stop: ()=>{ try{ node.stop(); }catch(e){} } };
  tick();
}

function stopMusic(){
  if(masterGain) masterGain.gain.value = 0;
  if(musicLoop){ try{ musicLoop.stop(); }catch(e){} }
  musicLoop = null;
}

// Music toggle button
musicToggle.addEventListener('click', ()=>{
  musicOn = !musicOn;
  musicToggle.setAttribute('aria-pressed', String(musicOn));
  musicToggle.style.opacity = musicOn ? 1 : 0.65;
  if(musicOn) startMusic();
  else stopMusic();
});

// replay
replayBtn.addEventListener('click', ()=> {
  resetAll();
});

// close final
closeFinal && closeFinal.addEventListener('click', ()=> {
  final.classList.add('hidden');
});

// Start button
startBtn.addEventListener('click', ()=> {
  startShow().catch(e=>console.error(e));
  // start background music softly
  startMusic();
});

// small accessibility: allow keyboard enter to start
startBtn.addEventListener('keyup', (e)=> { if(e.key==='Enter') startBtn.click(); });

// On load populate small scene
populateFriends(6);

// ensure canvas sits behind everything
bgCanvas.style.zIndex = 0;

// small help: if user navigates away, stop mic/music
window.addEventListener('pagehide', ()=>{
  if(micStream) micStream.getTracks().forEach(t=>t.stop());
  stopMusic();
});

// end of script
