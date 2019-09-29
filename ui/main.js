function disableDrop(event) {
  event.preventDefault();
}

function highlight(event) {
  const range = document.createRange();
  range.selectNodeContents(event.target);
  window.getSelection().removeAllRanges();
  window.getSelection().addRange(range);
}

function clickHandler(event) {
  document.getElementById("file").click();
}

function dragoverHandler(event) {
  event.preventDefault();
  document.getElementById("box").classList.remove("bg-dark-blue");
  document.getElementById("box").classList.add("bg-blue");
}

function dragleaveHandler(event) {
  event.preventDefault();
  document.getElementById("box").classList.remove("bg-blue");
  document.getElementById("box").classList.add("bg-dark-blue");
}

function dropHandler(event) {
  event.preventDefault();
  document.getElementById("box").classList.remove("bg-blue");
  document.getElementById("box").classList.add("bg-dark-blue");

  if (event.dataTransfer.files.length === 1) {
    const file = event.dataTransfer.files[0];
    upload(file);
  }
}

function changeHandler(event) {
  const file = document.getElementById("file").files[0];
  upload(file);
}

function upload(file) {
  document.getElementById("upload").classList.add("hidden");
  document.getElementById("progress").classList.remove("hidden");

  var formData = new FormData();
  formData.append("file", file);
  var xhr = new XMLHttpRequest();
  xhr.open("PUT", window.location.origin + "/files", true);
  xhr.upload.onprogress = function (event) {
    const percent = (100 * (event.loaded / event.total)).toFixed(2);
    document.getElementById("progress-text").innerText = percent + "%";
    document.getElementById("progress-bar").style.width = percent + "%";
  }
  xhr.onload = function () {
    if (xhr.status >= 300) {
      document.getElementById("box").classList.remove("bg-dark-blue");
      document.getElementById("box").classList.add("bg-dark-red");
      document.getElementById("progress-bar").classList.add("hidden");
      document.getElementById("progress-text").innerText = "Error";
      return;
    }

    const data = JSON.parse(xhr.responseText);
    document.getElementById("box").classList.remove("bg-dark-blue");
    document.getElementById("box").classList.add("bg-green");
    document.getElementById("progress").classList.add("hidden");
    document.getElementById("share").classList.remove("hidden");
    document.getElementById("share-text").innerText = window.location.origin + "/files/" + data.filename;
  }
  xhr.send(formData);
}

window.ondragover = disableDrop;
window.ondrop = disableDrop;
document.getElementById("upload").onclick = clickHandler;
document.getElementById("upload").ondragover = dragoverHandler;
document.getElementById("upload").ondragleave = dragleaveHandler;
document.getElementById("upload").ondrop = dropHandler;
document.getElementById("file").onchange = changeHandler;
document.getElementById("share").onclick = highlight;

var xhr = new XMLHttpRequest();
xhr.open("GET", window.location.origin + "/stats", true);
xhr.onload = function () {
  const data = JSON.parse(xhr.responseText);
  const percent = (100 * (data.storage.used / data.storage.total)).toFixed(2);
  document.getElementById("storage-total").innerText = Math.round(data.storage.total / 1000000000) + "GB";
  document.getElementById("storage-bar").style.width = percent + "%";
  document.getElementById("storage-marker").style.width = percent + "%";
  document.getElementById("storage-text").style.width = percent + "%";
  document.getElementById("storage-text").innerText = percent + "%";
}
xhr.send();
