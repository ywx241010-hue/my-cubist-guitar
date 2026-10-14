// =====================================================================
//  《立体主义吉他》— 起始文件
//  PART A（下面）是手势识别引擎，不要修改。
//  PART B 已经写好了大部分，只留下 5 个 ★ 标记的函数，
//  每一步让 Qwen 写其中一个，替换掉 ★ 标记之间的临时版本。
// =====================================================================


// ---------------------------------------------------------------------
//  PART A — 手势识别引擎（三个项目完全相同，不要修改）
// ---------------------------------------------------------------------
const MP_VERSION = "0.10.21";
// MediaPipe 的两个下载来源：先用国内镜像 npmmirror，失败再用 jsDelivr
const MP_URLS = [
  `https://registry.npmmirror.com/@mediapipe/tasks-vision/${MP_VERSION}/files`,
  `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}`,
];
// 手势模型：先找项目文件夹里的 gesture_recognizer.task，
// 没有的话再从 Google 下载（中国大陆通常无法访问 Google）
const MODEL_URLS = [
  "gesture_recognizer.task",
  "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
];

// 模型认识的 8 种手势（英文名是模型给出的名字，中文名用来显示）
const GESTURE_NAMES = {
  None: "无",
  Closed_Fist: "握拳 ✊",
  Open_Palm: "张开手掌 🖐",
  Pointing_Up: "食指向上 ☝️",
  Thumb_Down: "拇指向下 👎",
  Thumb_Up: "拇指向上 👍",
  Victory: "剪刀手 ✌️",
  ILoveYou: "我爱你 🤟",
};

let video;                 // 摄像头画面（p5 capture）
let recognizer = null;     // MediaPipe 手势识别模型
let hands = [];            // 每一帧：看到的所有手（0、1 或 2 只）。每只手是一个对象：
                           //   hand.gesture — 手势名，例如 "Open_Palm"（见上面的 GESTURE_NAMES）
                           //   hand.score   — 把握程度，0 到 1（1 = 非常确定）
                           //   hand.points  — 21 个点 {x, y}，画布像素坐标，已经镜像
                           //   hand.side    — "Left" 或 "Right"
let lastVideoTime = -1;
let started = false;
let showCamera = false;

async function loadGestureRecognizer() {
  setStatus("正在加载手势模型…");
  for (const base of MP_URLS) {
    let vision, fileset;
    try {
      vision = await import(`${base}/vision_bundle.mjs`);
      fileset = await vision.FilesetResolver.forVisionTasks(`${base}/wasm`);
    } catch (e) {
      continue; // 这个来源打不开，换下一个
    }
    for (const model of MODEL_URLS) {
      for (const delegate of ["GPU", "CPU"]) { // 有的电脑不能用 GPU，就退回 CPU
        try {
          recognizer = await vision.GestureRecognizer.createFromOptions(fileset, {
            baseOptions: { modelAssetPath: model, delegate },
            runningMode: "VIDEO",
            numHands: 2,
          });
          return; // 成功！
        } catch (e) {
          // 失败就试下一个
        }
      }
    }
  }
  setStatus("⚠️ 手势模型加载失败：请把 gesture_recognizer.task 放进项目文件夹（和 index.html 放在一起），然后刷新页面");
}

// 每一帧调用一次：向 MediaPipe 要最新的手势和关键点，
// 并把 0~1 的数值换算成镜像后的画布像素坐标。
let cameraOk = null;
function updateHands() {
  if (!recognizer || !video) return;

  // 摄像头没有画面时提示用户（没有授权，或者被别的软件占用）
  const ok = video.elt.readyState >= 2;
  if (ok !== cameraOk) {
    cameraOk = ok;
    setStatus(ok ? "把手伸到摄像头前，做一个手势 ✋"
                 : "正在等待摄像头…请点击「允许」，或点击地址栏里的摄像头图标，然后刷新页面");
  }
  if (!ok) return;

  if (video.elt.currentTime === lastVideoTime) return; // 还没有新的画面
  lastVideoTime = video.elt.currentTime;

  const result = recognizer.recognizeForVideo(video.elt, performance.now());
  const sides = result.handedness || result.handednesses || [];
  hands = result.landmarks.map((lm, i) => {
    const best = (result.gestures[i] && result.gestures[i][0]) || { categoryName: "None", score: 0 };
    return {
      gesture: best.categoryName || "None",
      score: best.score,
      side: sides[i] && sides[i][0] ? sides[i][0].categoryName : "",
      points: lm.map((p) => ({ x: (1 - p.x) * width, y: p.y * height, z: p.z })),
    };
  });
}

// 在每只手的手腕旁边写出识别到的手势和把握程度（学习和调试用）
function drawGestureInfo() {
  push();
  textSize(16);
  textAlign(CENTER, TOP);
  for (const hand of hands) {
    const w = hand.points[0];
    const y = min(w.y + 14, height - 70); // 不要跑到画面外面
    const label = `${GESTURE_NAMES[hand.gesture] || hand.gesture}  ${round(hand.score * 100)}%`;
    noStroke();
    fill(0, 120);
    rect(w.x - textWidth(label) / 2 - 8, y, textWidth(label) + 16, 26, 6);
    fill(255);
    text(label, w.x, y + 4);
  }
  pop();
}

function drawCamera() {
  push();
  translate(width, 0);
  scale(-1, 1); // 镜像，像照镜子一样
  tint(255, 70);
  image(video, 0, 0, width, height);
  pop();
}

function setStatus(msg) {
  select("#status").html(msg);
}


// ---------------------------------------------------------------------
//  PART B — 作品：《立体主义吉他》（致敬巴勃罗·毕加索）
// ---------------------------------------------------------------------

// 每个手势是一个和弦；每个和弦是毕加索的一个时期，有自己的颜色
const CHORD_FOR_GESTURE = {
  Closed_Fist: "Am", Open_Palm: "C", Pointing_Up: "G",
  Victory: "F", ILoveYou: "E", Thumb_Up: "Dm",
};
const PERIODS = {
  Am: { name: "蓝色时期", colors: ["#1c2e5c", "#2f4a8a", "#5b7bb5", "#a9bfd9", "#e6e2d3"] },
  C:  { name: "玫瑰时期", colors: ["#c97b6b", "#e3a99a", "#f2d0c0", "#b85c4f", "#f5e6d8"] },
  G:  { name: "分析立体主义", colors: ["#7a6a4f", "#a68d63", "#c9b48a", "#5a5046", "#d9cfb8"] },
  F:  { name: "综合立体主义", colors: ["#d9452b", "#f2b632", "#2a6f97", "#2e2e2e", "#f0e6d2"] },
  E:  { name: "《格尔尼卡》", colors: ["#111111", "#4a4a4a", "#8a8a8a", "#cfcfcf", "#f5f5f5"] },
  Dm: { name: "《梦》", colors: ["#d63a3a", "#f2c14e", "#3a8f5c", "#8e6bb8", "#f6e7d0"] },
};
const KEY_CHORDS = ["Am", "C", "G", "F", "E", "Dm"]; // 键盘 1~6
const STABLE = 4;        // 和弦手势要稳定 4 帧
const STRUM_SPEED = 0.03; // 扫弦：手每帧移动超过画面高度的 3%

let fragments = [];      // 拼贴的碎片：{x, y, rot, tx, ty, trot, w, h, kind, col, homeX, homeY}
let currentChord = "G";
let vibration = 0;       // 琴弦的振动 0~1
let guitarShift = 0;     // 吉他左右两半错开的距离（立体主义！）
let handState = {};      // 每只手：{candidate, count, stable, prevY, vy, cooldown}
let showInfo = true;

// 声音：12 个声部轮流用，每根弦一个
let voices = [];
let nextVoice = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  makeCollage();
  select("#start").mouseClicked(startExperience);
}

// 在吉他周围放 14 块碎片：报纸、木纹、圆点、纯色
function makeCollage() {
  fragments = [];
  const kinds = ["plain", "news", "wood", "dots"];
  for (let i = 0; i < 14; i++) {
    const homeX = width * 0.5 + random(-width * 0.3, width * 0.3);
    const homeY = height * 0.55 + random(-height * 0.3, height * 0.3);
    fragments.push({
      x: homeX, y: homeY, rot: 0, tx: homeX, ty: homeY, trot: random(-0.3, 0.3),
      w: random(80, 200), h: random(60, 180), kind: kinds[i % 4],
      col: random(PERIODS.G.colors), homeX, homeY,
    });
  }
}

function startExperience() {
  userStartAudio();

  video = createCapture(VIDEO);
  video.size(640, 480);
  video.hide();

  for (let i = 0; i < 12; i++) {
    const osc = new p5.Oscillator("triangle");
    osc.amp(0);
    osc.start();
    const env = new p5.Envelope();
    env.setADSR(0.002, 1.4, 0, 0.3);
    env.setRange(0.16, 0);
    voices.push({ osc, env });
  }

  select("#intro").hide();
  started = true;
  loadGestureRecognizer();
}

function draw() {
  background("#e9e0cc");
  if (started) {
    updateHands();
    if (showCamera) drawCamera();
    readHands();
  }

  // 碎片慢慢移到新的位置
  for (const f of fragments) {
    f.x = lerp(f.x, f.tx, 0.15);
    f.y = lerp(f.y, f.ty, 0.15);
    f.rot = lerp(f.rot, f.trot, 0.15);
    drawFragment(f);
  }
  drawGuitar();
  drawLabels();

  if (started) {
    for (const hand of hands) {
      noStroke();
      fill(30, 160);
      circle(hand.points[9].x, hand.points[9].y, 16);
    }
    if (showInfo) drawGestureInfo();
  }
}

// ---------- 两只手：左边的手按和弦，右边的手扫弦 ----------

function readHands() {
  const seen = [];
  for (const hand of hands) {
    seen.push(hand.side);
    let s = handState[hand.side];
    if (!s) s = handState[hand.side] = { candidate: "None", count: 0, stable: "None", prevY: hand.points[9].y, vy: 0, cooldown: 0 };
    const g = hand.score >= 0.6 ? hand.gesture : "None";
    if (g === s.candidate) s.count++;
    else { s.candidate = g; s.count = 1; }
    if (s.count >= STABLE) s.stable = s.candidate;
  }
  for (const side in handState) if (!seen.includes(side)) delete handState[side];
  if (hands.length === 0) return;

  // 画面左边的手 = 按和弦的手；右边的手 = 扫弦的手（只有一只手时，两件事都由它来做）
  const sorted = [...hands].sort((a, b) => a.points[9].x - b.points[9].x);
  const chordHand = sorted[0];
  const strumHand = sorted[sorted.length - 1];

  const chord = CHORD_FOR_GESTURE[handState[chordHand.side].stable];
  if (chord && chord !== currentChord) {
    currentChord = chord;
    if (hands.length === 1) doStrum("down"); // 只有一只手：换和弦时自动扫一下
  }

  // 扫弦：手掌上下移动得够快，就扫一下（向下 = 下扫，向上 = 上扫）
  const s = handState[strumHand.side];
  const y = strumHand.points[9].y;
  s.vy = lerp(s.vy, y - s.prevY, 0.5);
  s.prevY = y;
  s.cooldown--;
  if (s.cooldown <= 0 && abs(s.vy) > height * STRUM_SPEED) {
    doStrum(s.vy > 0 ? "down" : "up");
    s.cooldown = 10;
  }
}

function doStrum(direction) {
  strum(chordNotes(currentChord), direction);
  shuffleCollage(PERIODS[currentChord].colors);
  vibration = 1;
  guitarShift = random(-30, 30);
}

// ★★★★★★ 第 1 步 开始：把这里的 drawFragment 函数整个换成 Qwen 写的版本 ★★★★★★
function drawFragment(f) {
  // 临时版本：一个不转、没有轮廓的长方形
  push();
  translate(f.x, f.y);
  rectMode(CENTER);
  noStroke();
  fill(f.col);
  rect(0, 0, f.w, f.h);
  drawTexture(f.kind, f.w, f.h);
  pop();
}
// ★★★★★★ 第 1 步 结束 ★★★★★★

// ★★★★★★ 第 2 步 开始：把这里的 drawTexture 函数整个换成 Qwen 写的版本 ★★★★★★
function drawTexture(kind, w, h) {
  // 临时版本：还没有纹理
}
// ★★★★★★ 第 2 步 结束 ★★★★★★

// ★★★★★★ 第 3 步 开始：把这里的 chordNotes 函数整个换成 Qwen 写的版本 ★★★★★★
function chordNotes(name) {
  // 临时版本：不管什么和弦，都弹 C
  return [48, 52, 55];
}
// ★★★★★★ 第 3 步 结束 ★★★★★★

// ★★★★★★ 第 4 步 开始：把这里的 strum 函数整个换成 Qwen 写的版本 ★★★★★★
function strum(notes, direction) {
  // 临时版本：所有的音同时响
  for (const n of notes) playString(n, 0);
}
// ★★★★★★ 第 4 步 结束 ★★★★★★

// ★★★★★★ 第 5 步 开始：把这里的 shuffleCollage 函数整个换成 Qwen 写的版本 ★★★★★★
function shuffleCollage(colors) {
  // 临时版本：只换颜色，不动
  for (const f of fragments) f.col = random(colors);
}
// ★★★★★★ 第 5 步 结束 ★★★★★★

// ---------- 下面这些已经写好了，不需要改 ----------

// 吉他：琴身分成左右两半，错开一点（同时从两个角度看）；音孔、琴颈、6 根会振动的弦
function drawGuitar() {
  const colors = PERIODS[currentChord].colors;
  push();
  translate(width * 0.5, height * 0.55);
  rotate(-0.25);
  stroke(20);
  strokeWeight(4);
  fill(colors[1]);
  arc(-40 - guitarShift / 2, 0, 220, 260, HALF_PI, HALF_PI + PI, CHORD); // 左半边
  fill(colors[2]);
  arc(-40 + guitarShift / 2, 0, 220, 260, -HALF_PI, HALF_PI, CHORD);     // 右半边
  fill(110, 75, 40);
  rect(60, -22, 260, 44);                                                // 琴颈
  fill(20);
  circle(-40, 0, 70);                                                    // 音孔
  stroke(240, 230, 210);
  strokeWeight(1.5);
  noFill();
  for (let i = 0; i < 6; i++) {
    const y0 = -17 + i * 7;
    beginShape();
    for (let x = -120; x <= 320; x += 10) {
      const wave = vibration * 5 * sin(frameCount * 0.9 + i * 1.3 + x * 0.05) * sin(map(x, -120, 320, 0, PI));
      vertex(x, y0 + wave);
    }
    endShape();
  }
  pop();
  vibration *= 0.93;
}

function drawLabels() {
  noStroke();
  fill(25);
  textAlign(LEFT, TOP);
  textSize(54);
  textStyle(BOLD);
  text(currentChord, 24, 16);
  textStyle(NORMAL);
  textSize(20);
  text(PERIODS[currentChord].name, 24, 78);
  textSize(15);
  fill(25, 180);
  textAlign(CENTER, BOTTOM);
  text("左手：✊ Am · 🖐 C · ☝️ G · ✌️ F · 🤟 E · 👍 Dm    右手：上下快速移动 = 扫弦", width / 2, height - 44);
}

function playString(midi, delay) {
  if (voices.length === 0) return;
  const v = voices[nextVoice];
  nextVoice = (nextVoice + 1) % voices.length;
  v.osc.freq(midiToFreq(midi), 0, delay);
  v.env.play(v.osc, delay);
}

function keyPressed() {
  if (key >= "1" && key <= "6") { // 用键盘测试：1~6 选和弦并下扫
    currentChord = KEY_CHORDS[int(key) - 1];
    doStrum("down");
  }
  if (key === " ") doStrum("up");
  if (key === "s" || key === "S") saveCanvas("my-cubist-guitar", "png");
  if (key === "v" || key === "V") showCamera = !showCamera;
  if (key === "i" || key === "I") showInfo = !showInfo;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  makeCollage();
}
