const video = document.getElementById("video");
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

  setInterval(async () => {
    context.clearRect(0, 0, canvas.width, canvas.height);

    const detections = await faceapi
      .detectAllFaces(
        video,
        new faceapi.TinyFaceDetectorOptions({
          inputSize: 160,
          scoreThreshold: 0.5
        })
      )
      .withFaceLandmarks()
      .withFaceExpressions()
      .withAgeAndGender();

    if (detections.length === 0) {
      adviceText.textContent = "Wajah belum terdeteksi.";
      return;
    }

    const resized = faceapi.resizeResults(detections, displaySize);

    faceapi.draw.drawDetections(canvas, resized);
    faceapi.draw.drawFaceLandmarks(canvas, resized);

    // 🔥 Tampilkan label (ekspresi + umur + gender) di bawah wajah
    resized.forEach(det => {
      const { box } = det.detection;

      const topExpr = Object.entries(det.expressions)
        .sort((a, b) => b[1] - a[1])[0][0];

      const age = det.age.toFixed(0);
      const gender = det.gender;

      const textY = box.y + box.height + 25;

      context.fillStyle = "rgba(0, 0, 0, 0.6)";
      context.fillRect(box.x, textY - 18, 200, 45);

      context.fillStyle = "white";
      context.font = "14px Arial";

      context.fillText(`🙂 Ekspresi: ${topExpr}`, box.x + 5, textY);
      context.fillText(`👤 ${gender}, ${age} tahun`, box.x + 5, textY + 20);
    });

    // 🔥 Wajah utama = yang paling besar
    const main = detections
      .map(det => ({
        ...det,
        area: det.detection.box.width * det.detection.box.height
      }))
      .sort((a, b) => b.area - a.area)[0];

    const mainExp = Object.entries(main.expressions)
      .sort((a, b) => b[1] - a[1])[0][0];

    updateAdvice(mainExp);

  }, 500);
}

function updateAdvice(exp) {
  const adviceMap = {
    happy: "Kamu terlihat bahagia, pertahankan energi positifmu.",
    sad: "Terlihat sedih, coba istirahat atau cerita ke teman.",
    angry: "Terlihat marah, coba tarik napas dan relaksasi.",
    surprised: "Terkejut? Pastikan semuanya aman.",
    neutral: "Kamu terlihat tenang, bagus untuk kesehatan mental."
  };

  adviceText.textContent = adviceMap[exp] || "Jaga kondisi mental kamu.";
}