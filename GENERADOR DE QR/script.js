// ***********---**********************
// SECCIÓN 0. GESTIÓN DE AUDIO Y EFECTOS
// ***********---**********************
const errorSound = new Audio("Assets/error_sound.mp3");
const scanSound = new Audio("Assets/scaneo.mp3");
const successSound = new Audio("Assets/resultado.mp3");

// --- SELECTORES GENERALES Y DE PESTAÑAS ---
const wrapper = document.querySelector(".wrapper"),
      tabBtns = document.querySelectorAll(".tab-btn"),
      tabContents = document.querySelectorAll(".tab-content");

tabBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    tabBtns.forEach(b => b.classList.remove("active"));
    tabContents.forEach(c => c.classList.remove("active"));

    btn.classList.add("active");
    const target = btn.getAttribute("data-tab");

    if (target === "generator") {
      document.getElementById("generator-section").classList.add("active");
      if (isGeneratorActive) wrapper.classList.add("generator-active");
      else wrapper.classList.remove("generator-active");
    } else {
      document.getElementById("decoder-section").classList.add("active");
      wrapper.classList.add("generator-active");
    }
  });
});



// ***********---**********************
// SECCIÓN 1: GENERADOR DE QR
// ***********---********************
const qrInput = wrapper.querySelector(".qr-text"),
      sizeSelect = wrapper.querySelector(".qr-size"),
      formatSelect = wrapper.querySelector(".qr-format"),
      qzoneSelect = wrapper.querySelector(".qr-qzone"),
      colorInput = wrapper.querySelector(".qr-color"),
      bgcolorInput = wrapper.querySelector(".qr-bgcolor"),
      generateBtn = wrapper.querySelector(".generate-btn"),
      qrImg = wrapper.querySelector("#generator-section .qr-code img"),
      downloadBtn = wrapper.querySelector(".download-btn"),
      syncStatus = wrapper.querySelector("#generator-section .sync-status"),
      contrastWarning = document.getElementById("contrastWarning");

let isGeneratorActive = false;
let lastDownloadedConfig = "";
let downloadCounter = {};

function getLuminance(hex) {
  let rgb = parseInt(hex.replace('#', ''), 16);
  let r = (rgb >> 16) & 0xff;
  let g = (rgb >> 8) & 0xff;
  let b = (rgb >> 0) & 0xff;

  const a = [r, g, b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function checkColorContrast() {
  const lum1 = getLuminance(colorInput.value);
  const lum2 = getLuminance(bgcolorInput.value);
  const contrastRatio = (Math.max(lum1, lum2) + 0.05) / (Math.min(lum1, lum2) + 0.05);

  if (contrastRatio < 3.0) {
    contrastWarning.style.display = "block";
    errorSound.currentTime = 0;
    errorSound.play().catch(() => {});
  } else {
    contrastWarning.style.display = "none";
  }
}

function buildQrUrl() {
  const data = encodeURIComponent(qrInput.value.trim());
  const size = sizeSelect.value;
  const format = formatSelect.value;
  const qzone = qzoneSelect.value;
  const color = colorInput.value.replace("#", "");
  const bgcolor = bgcolorInput.value.replace("#", "");

  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}&data=${data}&format=${format}&qzone=${qzone}&color=${color}&bgcolor=${bgcolor}`;
}

function generateFileName() {
  const size = sizeSelect.value.split("x")[0];
  const format = formatSelect.value;
  const bgColorHex = bgcolorInput.value.replace("#", "").toUpperCase();
  const textColorHex = colorInput.value.replace("#", "").toUpperCase();

  return `codigo-qr_bg${bgColorHex}_txt${textColorHex}_${size}px.${format}`;
}

function updateQR() {
  if (!isGeneratorActive) return;
  if (!qrInput.value.trim()) { resetGeneratorState(); return; }

  syncStatus.innerText = "Sincronizando...";
  syncStatus.classList.add("updating");
  qrImg.src = buildQrUrl();
  
  qrImg.onload = () => {
    syncStatus.innerText = "Sincronizado";
    syncStatus.classList.remove("updating");

    const currentConfig = `${qrInput.value.trim()}-${sizeSelect.value}-${formatSelect.value}-${qzoneSelect.value}-${colorInput.value}-${bgcolorInput.value}`;
    if (lastDownloadedConfig !== currentConfig) {
      downloadBtn.innerHTML = "Descargar QR";
      downloadBtn.classList.remove("downloaded");
    } else {
      downloadBtn.innerHTML = "Volver a descargar";
      downloadBtn.classList.add("downloaded");
    }
  };
}

function resetGeneratorState() {
  wrapper.classList.remove("generator-active");
  generateBtn.classList.remove("hidden");
  generateBtn.innerText = "Generar Código QR";
  qrImg.src = "";
  isGeneratorActive = false;
  lastDownloadedConfig = "";
  downloadCounter = {};
}

generateBtn.addEventListener("click", () => {
  let qrValue = qrInput.value.trim();
  if (!qrValue) return;

  scanSound.currentTime = 0;
  scanSound.play().catch(() => {});

  generateBtn.innerText = "Generando...";
  qrImg.src = buildQrUrl();

  qrImg.onload = () => {
    wrapper.classList.add("generator-active");
    generateBtn.classList.add("hidden");
    isGeneratorActive = true;
    syncStatus.innerText = "Sincronizado";
    checkColorContrast();

    lastDownloadedConfig = "";
    downloadBtn.innerHTML = "Descargar QR";
    downloadBtn.classList.remove("downloaded");
  };
});

qrInput.addEventListener("input", () => {
  const val = qrInput.value.trim();
  if (!val) resetGeneratorState();
  else if (isGeneratorActive) updateQR();
});

colorInput.addEventListener("input", () => { updateQR(); checkColorContrast(); });
bgcolorInput.addEventListener("input", () => { updateQR(); checkColorContrast(); });
sizeSelect.addEventListener("change", updateQR);
formatSelect.addEventListener("change", updateQR);
qzoneSelect.addEventListener("change", updateQR);

downloadBtn.addEventListener("click", async () => {
  const val = qrInput.value.trim();
  if (!val) return;

  const url = buildQrUrl();
  const currentConfig = `${val}-${sizeSelect.value}-${formatSelect.value}-${qzoneSelect.value}-${colorInput.value}-${bgcolorInput.value}`;

  downloadBtn.innerHTML = `<span class="spinner"></span> Descargando...`;
  downloadBtn.disabled = true;

  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    
    let baseName = generateFileName();
    let finalFileName = baseName;

    if (lastDownloadedConfig === currentConfig) {
      downloadCounter[baseName] = (downloadCounter[baseName] || 0) + 1;
      const count = downloadCounter[baseName];
      const extension = formatSelect.value;
      const nameWithoutExt = baseName.substring(0, baseName.lastIndexOf('.'));
      finalFileName = `${nameWithoutExt} (${count}).${extension}`;
    } else {
      downloadCounter[baseName] = 0;
      lastDownloadedConfig = currentConfig;
    }

    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = finalFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);

    successSound.currentTime = 0;
    successSound.play().catch(() => {});

    downloadBtn.innerHTML = "¡Descargado!";
    downloadBtn.classList.add("downloaded");

    setTimeout(() => {
      downloadBtn.innerHTML = "Volver a descargar";
      downloadBtn.disabled = false;
    }, 1200);

  } catch (error) {
    console.error("Error al descargar la imagen QR:", error);
    errorSound.currentTime = 0;
    errorSound.play().catch(() => {});
    downloadBtn.innerHTML = "Error - Reintentar";
    downloadBtn.disabled = false;
  }
});







// ***********---**********************
// SECCIÓN 2 : DECODIFICADOR DE QR
// ***********---**********************
const qrFileinput = document.getElementById("qrFileinput"),
      dropZone = document.getElementById("dropZone"),
      dropZoneText = document.getElementById("dropZoneText"),
      resultContainer = document.getElementById("resultContainer"),
      decodedResult = document.getElementById("decodedResult"),
      decodeBtn = document.getElementById("decodeBtn"),
      previewUploadedImg = document.getElementById("previewUploadedImg"),
      placeholderPreview = document.getElementById("placeholderPreview"),
      decodeStatus = document.getElementById("decodeStatus"),
      copyBtn = document.getElementById("copyBtn");

let selectedFile = null;
let decodedUrlTarget = "";

dropZone.addEventListener("click", () => qrFileinput.click());

dropZone.addEventListener("mouseenter", () => {
  if (selectedFile) dropZoneText.innerText = "Adjuntar otro archivo";
});

dropZone.addEventListener("mouseleave", () => {
  if (selectedFile) dropZoneText.innerText = ` ${selectedFile.name}`;
});

qrFileinput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  
  selectedFile = file;
  dropZoneText.innerText = ` ${file.name}`;
  
  const reader = new FileReader();
  reader.onload = (event) => {
    previewUploadedImg.src = event.target.result;
    previewUploadedImg.style.display = "block";
    placeholderPreview.style.display = "none";
  };
  reader.readAsDataURL(file);

  decodeBtn.style.display = "block";
  decodeBtn.innerText = "Decodificar QR";
  decodeBtn.disabled = false;
  resultContainer.style.display = "none";
  decodedResult.value = "";
  decodedUrlTarget = "";
  decodeStatus.innerText = "Esperando imagen...";
});

decodeBtn.addEventListener("click", async () => {
  if (decodedUrlTarget) {
    window.open(decodedUrlTarget, "_blank");
    return;
  }

  if (!selectedFile) return;

  scanSound.currentTime = 0;
  scanSound.play().catch(() => {});

  decodeBtn.innerHTML = `<span class="spinner"></span> Leyendo QR...`;
  decodeBtn.disabled = true;
  decodeStatus.innerText = "Analizando...";
  decodeStatus.classList.add("updating");

  const formData = new FormData();
  formData.append("file", selectedFile);

  try {
    const response = await fetch("https://api.qrserver.com/v1/read-qr-code/", {
      method: "POST",
      body: formData
    });
    const data = await response.json();
    const resultText = data[0]?.symbol[0]?.data;

    if (resultText) {
      decodedResult.value = resultText;
      resultContainer.style.display = "flex";
      decodeStatus.innerText = "Decodificado con éxito";
      decodeStatus.classList.remove("updating");

      successSound.currentTime = 0;
      successSound.play().catch(() => {});

      if (resultText.startsWith("http://") || resultText.startsWith("https://")) {
        decodedUrlTarget = resultText;
        decodeBtn.innerHTML = "Ver enlace ↗";
      } else {
        decodedUrlTarget = "";
        decodeBtn.innerHTML = "Texto leído correctamente";
      }
      decodeBtn.disabled = false;

    } else {
      decodedResult.value = "QR inválido. Intenta de nuevo.";
      resultContainer.style.display = "flex";
      decodeStatus.innerText = "Error de lectura";
      decodeStatus.classList.remove("updating");
      
      errorSound.currentTime = 0;
      errorSound.play().catch(() => {});

      decodeBtn.innerHTML = "Intentar de nuevo";
      decodeBtn.disabled = false;
    }

  } catch (err) {
    console.error(err);
    decodedResult.value = "Error de red al procesar la imagen.";
    resultContainer.style.display = "flex";
    decodeStatus.innerText = "Error";
    
    errorSound.currentTime = 0;
    errorSound.play().catch(() => {});

    decodeBtn.innerHTML = "Decodificar QR";
    decodeBtn.disabled = false;
  }
});

copyBtn.addEventListener("click", () => {
  if (!decodedResult.value) return;
  navigator.clipboard.writeText(decodedResult.value).then(() => {
    const originalHTML = copyBtn.innerHTML;
    copyBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    setTimeout(() => {
      copyBtn.innerHTML = originalHTML;
    }, 1500);
  });
});
