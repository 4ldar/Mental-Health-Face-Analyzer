const video = document.getElementById("video");
const expText = document.getElementById("exp");
const ageText = document.getElementById("age");
const genderText = document.getElementById("gender");
const adviceText = document.getElementById("advice");

document.getElementById("start-btn").addEventListener("click", startVideo);

async function startVideo() {
  try {
    console.log("Loading models...");

    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri("/dist/models"),
      faceapi.nets.faceLandmark68Net.loadFromUri("/dist/models"),
      faceapi.nets.faceExpressionNet.loadFromUri("/dist/models"),
      faceapi.nets.ageGenderNet.loadFromUri("/dist/models"),
    ]);

    console.log("Models loaded!");

    // 🔥 OPTIMASI 1 — turunin resolusi biar deteksi lebih cepat
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 480, height: 360 }
    });

    video.srcObject = stream;

    video.addEventListener("playing", () => {
      const canvas = document.getElementById("overlay");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      detectLoop();
    });

  } catch (err) {
    console.error("Error starting camera:", err);
  }
}

async function detectLoop() {
  const canvas = document.getElementById("overlay");
  const context = canvas.getContext("2d");

  const displaySize = {
    width: canvas.width,
    height: canvas.height
  };

  faceapi.matchDimensions(canvas, displaySize);

  // 🔥 OPTIMASI 2 — interval dilebihin sedikit (500ms)
  setInterval(async () => {
    context.clearRect(0, 0, canvas.width, canvas.height);

    // 🔥 OPTIMASI 3 — TinyFaceDetectorOptions diperkecil inputSize
    const detection = await faceapi
      .detectSingleFace(
        video,
        new faceapi.TinyFaceDetectorOptions({
          inputSize: 160,
          scoreThreshold: 0.5
        })
      )
      .withFaceLandmarks()
      .withFaceExpressions()
      .withAgeAndGender();

    if (!detection) {
      expText.textContent = "-";
      ageText.textContent = "-";
      genderText.textContent = "-";
      adviceText.textContent = "Wajah belum terdeteksi.";
      return;
    }

    const resized = faceapi.resizeResults(detection, displaySize);

    faceapi.draw.drawDetections(canvas, resized);
    faceapi.draw.drawFaceLandmarks(canvas, resized);

    const expressions = detection.expressions;
    const age = detection.age;
    const gender = detection.gender;

    const topExpr = Object.entries(expressions)
      .sort((a, b) => b[1] - a[1])[0][0];

    expText.textContent = topExpr;
    ageText.textContent = age.toFixed(0);
    genderText.textContent = gender;

    updateAdvice(topExpr);

  }, 500); // dari 300 → 500ms
}

function updateAdvice(exp) {
  const adviceMap = {
    happy: "Kamu terlihat bahagia, pertahankan energi positifmu.",
    sad: "Terlihat sedih, coba istirahat atau curhat.",
    angry: "Terlihat marah, coba tarik napas dan relaksasi.",
    surprised: "Seperti terkejut, pastikan kamu baik-baik saja.",
    neutral: "Kamu terlihat tenang, bagus untuk kesehatan mental."
  };

  adviceText.textContent = adviceMap[exp] || "Jaga kondisi mental kamu.";
}
