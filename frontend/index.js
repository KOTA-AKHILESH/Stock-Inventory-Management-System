// INDEX.JS — login and registration only.
// HTML creates the forms. CSS styles them. This file handles their behaviour.

// 1. Show either the login form or the registration form.
function showLoginForm() {
  document.getElementById("loginPanel").hidden = false;
  document.getElementById("registerPanel").hidden = true;
  document.querySelector('#loginForm input[name="email"]').focus();
}

function showRegisterForm() {
  document.getElementById("loginPanel").hidden = true;
  document.getElementById("registerPanel").hidden = false;
  document.querySelector('#registerForm input[name="name"]').focus();
}

// 2. Send login / registration details to the backend.
async function sendLoginRequest(path, data) {
  let response;
  try {
    response = await fetch(path, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  } catch (error) {
    throw new Error(
      "Cannot reach the server. Check that the backend is running.",
    );
  }
  const result = await response.json();
  if (!response.ok) {
    let message = "Please check your details.";
    if (typeof result.detail === "string") message = result.detail;
    throw new Error(message);
  }
  return result;
}

// 3. Open the correct HTML page using the role saved in the database.
function openRoleDashboard(role) {
  if (role === "super_admin") {
    window.location.href = "super_admin.html";
  } else if (role === "admin") {
    window.location.href = "admin.html";
  } else {
    window.location.href = "employee.html";
  }
}

// 4. Read the login form and send its email / password.
async function login(event) {
  event.preventDefault();
  const form = document.getElementById("loginForm");
  const button = form.querySelector('button[type="submit"]');
  const message = document.getElementById("loginMessage");
  button.disabled = true;
  message.textContent = "";
  const loginData = {
    email: form.elements.email.value,
    password: form.elements.password.value,
  };
  try {
    const result = await sendLoginRequest("/login", loginData);
    // Login also sets an HttpOnly cookie, which the browser stores.
    openRoleDashboard(result.user.role);
  } catch (error) {
    message.textContent = error.message;
  } finally {
    button.disabled = false;
  }
}

// 5. Validate matching passwords and register an employee account.
async function register(event) {
  event.preventDefault();
  const form = document.getElementById("registerForm");
  const button = form.querySelector('button[type="submit"]');
  const message = document.getElementById("registerMessage");
  button.disabled = true;
  message.textContent = "";
  try {
    if (form.elements.password.value !== form.elements.confirmPassword.value) {
      throw new Error("Passwords do not match.");
    }
    const registerData = {
      name: form.elements.name.value.trim(),
      email: form.elements.email.value,
      password: form.elements.password.value,
      role: "employee",
    };
    await sendLoginRequest("/register", registerData);
    const email = form.elements.email.value;
    form.reset();
    showLoginForm();
    document.getElementById("loginForm").elements.email.value = email;
    document.getElementById("loginMessage").textContent =
      "Account created. Please sign in.";
  } catch (error) {
    message.textContent = error.message;
  } finally {
    button.disabled = false;
  }
}

// 6. Connect HTML buttons and forms to the functions above.
document.getElementById("showLogin").addEventListener("click", showLoginForm);
document
  .getElementById("showRegister")
  .addEventListener("click", showRegisterForm);
document.getElementById("loginForm").addEventListener("submit", login);
document.getElementById("registerForm").addEventListener("submit", register);
