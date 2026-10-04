const user = JSON.parse(localStorage.getItem("user"));

if (!user) {
  window.location.href = "index.html";
}

document.getElementById("welcome").textContent =
  `Welcome ${user.name} (${user.role})`;

function logout() {
  localStorage.removeItem("user");
  window.location.href = "index.html";
}
