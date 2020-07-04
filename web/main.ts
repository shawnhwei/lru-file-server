const uploadDiv = document.getElementById("upload")!;
const shareDiv = document.getElementById("share")!;
const shareText = document.getElementById("share-text")!;
const shareHint = document.getElementById("share-hint")!;
const progressDiv = document.getElementById("progress")!;
const progressBar = document.getElementById("progress-bar")!;
const progressText = document.getElementById("progress-text")!;
const fileInput = document.getElementById("file")! as HTMLInputElement;

function highlight(event: MouseEvent) {
  const range = document.createRange();

  range.selectNodeContents(shareText);

  const selection = window.getSelection();
  if (selection !== null) {
    selection.removeAllRanges();
    selection.addRange(range);
    document.execCommand("copy");
    shareHint.classList.remove("invisible");
  }
}

function clickHandler(event: MouseEvent) {
  fileInput.click();
}

function dragoverHandler(event: DragEvent) {
  event.preventDefault();
  document.body.classList.add("bg-blue-200");
}

function dragleaveHandler(event: DragEvent) {
  event.preventDefault();
  document.body.classList.remove("bg-blue-200");
}

function dropHandler(event: DragEvent) {
  event.preventDefault();
  document.body.classList.remove("bg-blue-200");

  if (event.dataTransfer !== null) {
    if (event.dataTransfer.files.length === 1) {
      const file = event.dataTransfer.files[0];
      upload(file);
    }
  }
}

function changeHandler(event: Event) {
  if (fileInput.files !== null) {
    const file = fileInput.files[0];
    upload(file);
  }
}

function upload(file: File) {
  window.ondragover = null;
  window.ondrop = null;

  uploadDiv.classList.add("hidden");
  progressDiv.classList.remove("hidden");
  document.body.classList.remove("p-4");

  var formData = new FormData();
  formData.append("file", file);
  var xhr = new XMLHttpRequest();
  xhr.open("PUT", window.location.origin, true);
  xhr.upload.onprogress = function (event) {
    const percent = (100 * (event.loaded / event.total)).toFixed(2);
    progressBar.style.width = percent + "%";
    progressText.innerText = percent + "%";
  }
  xhr.onload = function () {
    if (xhr.status >= 300) {
      document.body.classList.add("bg-red-400");
      progressBar.classList.add("hidden");
      progressText.innerText = "Error";
    } else {
      const data = JSON.parse(xhr.responseText);
      document.body.classList.add("p4", "bg-green-300");
      progressDiv.classList.add("hidden");
      shareDiv.classList.remove("hidden");
      shareText.innerText = window.location.origin + "/" + data.filename;
    }
  }
  xhr.send(formData);
}

window.ondragover = (event: DragEvent) => event.preventDefault();
window.ondrop = (event: DragEvent) => event.preventDefault();
uploadDiv.onclick = clickHandler;
uploadDiv.ondragover = dragoverHandler;
uploadDiv.ondragleave = dragleaveHandler;
uploadDiv.ondrop = dropHandler;
shareDiv.onclick = highlight;
fileInput.onchange = changeHandler;

// var xhr = new XMLHttpRequest();
// xhr.open("GET", window.location.origin + "/stats", true);
// xhr.onload = function () {
//   const data = JSON.parse(xhr.responseText);
//   const percent = (100 * (data.storage.used / data.storage.total)).toFixed(2);
//   document.getElementById("storage-total").innerText = Math.round(data.storage.total / 1000000000) + "GB";
//   document.getElementById("storage-bar").style.width = percent + "%";
//   document.getElementById("storage-marker").style.width = percent + "%";
//   document.getElementById("storage-text").style.width = percent + "%";
//   document.getElementById("storage-text").innerText = percent + "%";
// }
// xhr.send();
