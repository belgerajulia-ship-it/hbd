const scenes = [
  "intro",
  "stage1",
  "stage2",
  "stage3",
  "stage4",
  "finale"
];

let current = 0;

let audioCtx = null;
let soundOn = false;

let musicTimer = null;

let blown = false;
let walked = false;
let kissed = false;


const $ = (selector) =>
  document.querySelector(selector);

const $$ = (selector) =>
  [...document.querySelectorAll(selector)];


/* =====================================================
   SCENE NAVIGATION
===================================================== */

function showScene(id) {

  $$(".scene").forEach(scene => {
    scene.classList.remove("active");
  });

  const scene =
    document.getElementById(id);

  if (scene) {
    scene.classList.add("active");
  }

  const index =
    scenes.indexOf(id);

  if (index >= 0) {
    current = index;
  }


  $$(".dot").forEach((dot, i) => {

    dot.classList.toggle(
      "active",
      i === Math.min(
        Math.max(current - 1, 0),
        4
      )
    );

  });


  if (id === "stage1") {
    startConfetti();
  }


  if (id === "stage2") {
    buildEqualizer();
  }


  if (id === "stage4") {
    resetWalk();
  }


  if (id === "finale") {
    stopMusic();
  }

}


/* =====================================================
   INTRO
===================================================== */

$("#startBtn").addEventListener(
  "click",
  () => {

    showScene("stage1");

    startMusic();

    tinyChime();

  }
);


/* =====================================================
   NEXT BUTTONS
===================================================== */

$$(".next-btn[data-next]").forEach(
  button => {

    button.addEventListener(
      "click",
      () => {

        const id =
          button.dataset.next;

        if (id) {
          showScene(id);
        }

      }
    );

  }
);


/* =====================================================
   STAGE 1 CONFETTI
===================================================== */

function startConfetti() {

  const wrap =
    $("#confetti1");

  if (!wrap || wrap.dataset.done) {
    return;
  }

  wrap.dataset.done = "1";


  const symbols = [
    "✦",
    "•",
    "♡",
    "✧"
  ];


  for (let i = 0; i < 85; i++) {

    const particle =
      document.createElement("i");

    particle.textContent =
      symbols[
        i % symbols.length
      ];


    particle.style.left =
      Math.random() * 100 + "%";


    particle.style.setProperty(
      "--x",
      (Math.random() * 260 - 130) + "px"
    );


    particle.style.animationDuration =
      (3.5 + Math.random() * 4) + "s";


    particle.style.animationDelay =
      (Math.random() * 2.5) + "s";


    particle.style.fontSize =
      (6 + Math.random() * 12) + "px";


    particle.style.color =
      [
        "#fff",
        "#ffd77d",
        "#f8a5c4",
        "#63b6e5"
      ][i % 4];


    wrap.appendChild(particle);

  }

}


/* =====================================================
   STAGE 2 EQUALIZER
===================================================== */

function buildEqualizer() {

  const equalizer =
    $("#equalizer");

  if (
    !equalizer ||
    equalizer.dataset.done
  ) {
    return;
  }

  equalizer.dataset.done = "1";


  for (let i = 0; i < 18; i++) {

    const bar =
      document.createElement("i");

    bar.style.height =
      (8 + Math.random() * 34) + "px";

    bar.style.animationDelay =
      (Math.random() * .6) + "s";


    equalizer.appendChild(bar);

  }

}


/* =====================================================
   STAGE 3 — BLOW CAKE
===================================================== */

$("#blowBtn").addEventListener(
  "click",
  () => {

    if (blown) {
      return;
    }

    blown = true;


    $("#heroCake")
      .classList
      .add("blown");


    $(".wind-ring")
      .classList
      .add("go");


    createBlownStars();


    $("#blowBtn").textContent =
      "WISH SENT INTO THE STARS ✦";


    setTimeout(() => {

      $("#toStage4")
        .classList
        .remove("hidden");

    }, 1200);


    playTone(
      523.25,
      .12
    );


    setTimeout(() => {

      playTone(
        659.25,
        .12
      );

    }, 100);


    setTimeout(() => {

      playTone(
        783.99,
        .18
      );

    }, 200);

  }
);


/* =====================================================
   BLOWN STARS
===================================================== */

function createBlownStars() {

  const wrap =
    $(".blown-stars");


  for (let i = 0; i < 45; i++) {

    const star =
      document.createElement("i");

    star.textContent =
      i % 3 === 0
        ? "♡"
        : "✦";


    star.style.left =
      (35 + Math.random() * 30) + "%";


    star.style.top =
      (35 + Math.random() * 30) + "%";


    star.style.setProperty(
      "--dx",
      (Math.random() * 100 - 50) + "vw"
    );


    star.style.setProperty(
      "--dy",
      (Math.random() * 90 - 45) + "vh"
    );


    star.style.animationDelay =
      (Math.random() * .25) + "s";


    wrap.appendChild(star);

  }

}


/* =====================================================
   STAGE 4 — WALK CLOSER
===================================================== */

function resetWalk() {

  $("#walker")
    .classList
    .remove(
      "close",
      "very-close"
    );


  $("#bouquet").style.opacity =
    "1";


  $("#kiss")
    .classList
    .remove("pop");


  $("#walkBtn")
    .classList
    .remove("hidden");


  $("#kissBtn")
    .classList
    .add("hidden");


  $("#toFinal")
    .classList
    .add("hidden");


  $("#closerCopy")
    .querySelector("h2")
    .innerHTML =
      "These flowers<br>are for <em>you.</em>";


  walked = false;
  kissed = false;

}


$("#walkBtn").addEventListener(
  "click",
  () => {

    if (!walked) {

      walked = true;


      $("#walker")
        .classList
        .add("close");


      $("#closerCopy")
        .querySelector("h2")
        .innerHTML =
          "Just a little<br><em>closer...</em>";


      $("#walkBtn").textContent =
        "closer ♡";


      setTimeout(() => {

        $("#walker")
          .classList
          .add("very-close");


        $("#walkBtn")
          .classList
          .add("hidden");


        $("#kissBtn")
          .classList
          .remove("hidden");

      }, 1800);

    }

  }
);


/* =====================================================
   KISS
===================================================== */

$("#kissBtn").addEventListener(
  "click",
  () => {

    if (kissed) {
      return;
    }

    kissed = true;


    $("#bouquet")
      .style.opacity = "0";


    $("#kiss")
      .classList
      .add("pop");


    createKissHearts();


    setTimeout(() => {

      $("#toFinal")
        .classList
        .remove("hidden");

    }, 900);


    tinyChime();

  }
);


/* =====================================================
   KISS HEARTS
===================================================== */

function createKissHearts() {

  const scene =
    $("#stage4");


  for (let i = 0; i < 22; i++) {

    const heart =
      document.createElement("span");


    heart.textContent =
      i % 2
        ? "♡"
        : "✦";


    heart.style.position =
      "absolute";


    heart.style.left =
      (50 + Math.random() * 30 - 15)
      + "%";


    heart.style.top =
      (45 + Math.random() * 25 - 12)
      + "%";


    heart.style.zIndex = 25;


    heart.style.color =
      i % 2
        ? "#ff9cbd"
        : "#fff5a5";


    heart.style.fontSize =
      (15 + Math.random() * 30)
      + "px";


    heart.style.pointerEvents =
      "none";


    heart.animate(

      [
        {
          transform:
            "translate(0,0) scale(.4)",

          opacity: 0
        },

        {
          transform:
            "translate(0,-30px) scale(1)",

          opacity: 1,

          offset: .2
        },

        {
          transform:
            `
            translate(
              ${Math.random() * 300 - 150}px,
              ${-80 - Math.random() * 250}px
            )
            scale(1.25)
            rotate(${Math.random() * 80 - 40}deg)
            `,

          opacity: 0
        }

      ],

      {
        duration:
          1300 + Math.random() * 800,

        delay:
          Math.random() * 250,

        easing:
          "cubic-bezier(.1,.7,.2,1)",

        fill:
          "forwards"
      }

    );


    scene.appendChild(heart);


    setTimeout(() => {
      heart.remove();
    }, 2500);

  }

}


/* =====================================================
   FINAL EXPLOSION
===================================================== */

$("#finalBtn").addEventListener(
  "click",
  () => {

    const wrap =
      $("#finalExplosion");


    for (let i = 0; i < 110; i++) {

      const particle =
        document.createElement("i");


      particle.textContent =
        [
          "✦",
          "♡",
          "★",
          "·",
          "✧"
        ][i % 5];


      particle.style.setProperty(
        "--x",
        (Math.random() * 150 - 75)
        + "vw"
      );


      particle.style.setProperty(
        "--y",
        (Math.random() * 120 - 60)
        + "vh"
      );


      particle.style.setProperty(
        "--r",
        (Math.random() * 720 - 360)
        + "deg"
      );


      particle.style.animationDelay =
        (Math.random() * .45)
        + "s";


      particle.style.fontSize =
        (10 + Math.random() * 30)
        + "px";


      particle.style.color =
        [
          "#fff",
          "#ffd66f",
          "#f8a4c4",
          "#8dd9f4"
        ][i % 4];


      wrap.appendChild(particle);

    }


    $("#endNote")
      .classList
      .add("show");


    tinyChime();


    setTimeout(() => {

      $("#finalBtn").textContent =
        "forever & always ♡";

    }, 800);

  }
);


/* =====================================================
   AUDIO
===================================================== */

function initAudio() {

  if (!audioCtx) {

    audioCtx =
      new (
        window.AudioContext ||
        window.webkitAudioContext
      )();

  }


  if (
    audioCtx.state ===
    "suspended"
  ) {

    audioCtx.resume();

  }

}


function playTone(
  frequency,
  duration = .2
) {

  if (!soundOn) {
    return;
  }


  initAudio();


  const oscillator =
    audioCtx.createOscillator();

  const gain =
    audioCtx.createGain();


  oscillator.type =
    "sine";


  oscillator.frequency.value =
    frequency;


  gain.gain.setValueAtTime(
    .0001,
    audioCtx.currentTime
  );


  gain.gain.exponentialRampToValueAtTime(
    .07,
    audioCtx.currentTime + .02
  );


  gain.gain.exponentialRampToValueAtTime(
    .0001,
    audioCtx.currentTime + duration
  );


  oscillator
    .connect(gain)
    .connect(audioCtx.destination);


  oscillator.start();


  oscillator.stop(
    audioCtx.currentTime +
    duration +
    .03
  );

}


function tinyChime() {

  [
    523.25,
    659.25,
    783.99,
    1046.5
  ].forEach(
    (note, index) => {

      setTimeout(
        () => playTone(note, .18),
        index * 90
      );

    }
  );

}


function startMusic() {

  soundOn = true;

  initAudio();


  if (musicTimer) {
    return;
  }


  const notes = [
    261.63,
    293.66,
    329.63,
    392,
    329.63,
    293.66,
    261.63,
    392
  ];


  let index = 0;


  musicTimer =
    setInterval(
      () => {

        playTone(
          notes[
            index++ %
            notes.length
          ],
          .22
        );

      },
      420
    );

}


function stopMusic() {

  clearInterval(
    musicTimer
  );

  musicTimer = null;

}


$("#soundToggle").addEventListener(
  "click",
  () => {

    soundOn = !soundOn;


    $("#soundToggle").textContent =
      soundOn
        ? "♫"
        : "×";


    if (soundOn) {

      initAudio();

      startMusic();

    } else {

      stopMusic();

    }

  }
);


/* =====================================================
   KEYBOARD
===================================================== */

document.addEventListener(
  "keydown",
  event => {

    if (
      event.key ===
      "ArrowRight"
    ) {

      const map = {
        0: "stage1",
        1: "stage2",
        2: "stage3",
        3: "stage4",
        4: "finale"
      };


      if (map[current]) {
        showScene(
          map[current]
        );
      }

    }

  }
);


/* =====================================================
   IMAGE UPLOAD SYSTEM
===================================================== */

const uploadToggle =
  document.getElementById(
    "uploadToggle"
  );

const uploadPanel =
  document.getElementById(
    "uploadPanel"
  );

const uploadClose =
  document.getElementById(
    "uploadClose"
  );

const clearUploads =
  document.getElementById(
    "clearUploads"
  );


/* Open uploader */

uploadToggle.addEventListener(
  "click",
  () => {

    uploadPanel.classList.toggle(
      "open"
    );

  }
);


/* Close uploader */

uploadClose.addEventListener(
  "click",
  () => {

    uploadPanel.classList.remove(
      "open"
    );

  }
);


/* Default images */

const uploadDefaults = {

  stage1Photo:
    "cinnamon-roll.jpg",

  stage2Photo:
    "cinnamon-roll.jpg",

  stage3Photo:
    "",

  stage4Photo:
    "cinnamon-roll.jpg",

  finalPhoto:
    "cinnamon-roll.jpg"

};


/* Save image */

function saveUploadedImage(
  targetId,
  dataUrl
) {

  try {

    localStorage.setItem(
      "birthday-upload-" +
      targetId,

      dataUrl
    );

  } catch (error) {

    console.warn(
      "Could not save image.",
      error
    );

  }

}


/* Load saved images */

function loadUploadedImages() {

  Object.keys(
    uploadDefaults
  ).forEach(
    id => {

      const saved =
        localStorage.getItem(
          "birthday-upload-" +
          id
        );


      if (saved) {

        applyUploadedImage(
          id,
          saved
        );

      }

    }
  );

}


/* Apply image */

function applyUploadedImage(
  targetId,
  src
) {

  const image =
    document.getElementById(
      targetId
    );


  if (!image) {
    return;
  }


  image.src = src;


  if (
    targetId ===
    "stage3Photo"
  ) {

    image.classList.add(
      "has-photo"
    );

  }

}


/* Upload handlers */

document
  .querySelectorAll(
    "[data-upload-target]"
  )
  .forEach(
    input => {

      input.addEventListener(
        "change",
        event => {

          const file =
            event.target.files &&
            event.target.files[0];


          if (
            !file ||
            !file.type.startsWith(
              "image/"
            )
          ) {

            return;

          }


          const reader =
            new FileReader();


          reader.onload =
            () => {

              applyUploadedImage(
                input.dataset
                  .uploadTarget,

                reader.result
              );


              saveUploadedImage(
                input.dataset
                  .uploadTarget,

                reader.result
              );


              input
                .closest(".upload-row")
                .style.outline =
                "2px solid #f3a0bd";


              setTimeout(
                () => {

                  input
                    .closest(".upload-row")
                    .style.outline =
                    "";

                },
                700
              );

            };


          reader.readAsDataURL(
            file
          );

        }
      );

    }
  );


/* Reset images */

clearUploads.addEventListener(
  "click",
  () => {

    Object.keys(
      uploadDefaults
    ).forEach(
      id => {

        localStorage.removeItem(
          "birthday-upload-" +
          id
        );

      }
    );


    Object.entries(
      uploadDefaults
    ).forEach(
      ([id, src]) => {

        const image =
          document.getElementById(
            id
          );


        if (image) {

          image.src = src;


          if (
            id ===
            "stage3Photo"
          ) {

            image.classList.remove(
              "has-photo"
            );

          }

        }

      }
    );


    document
      .querySelectorAll(
        "[data-upload-target]"
      )
      .forEach(
        input => {

          input.value = "";

        }
      );

  }
);


/* Load saved uploads */

loadUploadedImages();
