const API_URL = "http://127.0.0.1:8000";

function showForm(formId) {
  document.querySelectorAll(".form-box").forEach((form) => {
    form.classList.remove("active");
  });

  document.getElementById(formId).classList.add("active");
}


// REGISTER
document.getElementById("registerForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const message = document.getElementById("registerMessage");
  message.textContent = "Registering...";

  const password =
    document.getElementById("registerPassword").value;

  const confirmPassword =
    document.getElementById("confirmPassword").value;


  // CHECK PASSWORDS
  if (password !== confirmPassword) {
    message.textContent = "Passwords do not match.";
    message.style.color = "red";
    return;
  }


  const data = {
    name: document.getElementById("registerName").value,
    email: document.getElementById("registerEmail").value,
    password: password,
    role: document.getElementById("registerRole").value
  };


  try {
    const response = await fetch(`${API_URL}/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });


    const result = await response.json();


    if (!response.ok) {
      message.textContent = result.detail || "Registration failed.";
      message.style.color = "red";
      return;
    }


    message.textContent =
      "Registration successful. You can now login.";

    message.style.color = "green";


    document
      .getElementById("registerForm")
      .reset();


    setTimeout(() => {
      showForm("login-form");
    }, 800);


  } catch (error) {

    message.textContent =
      "Cannot connect to backend server.";

    message.style.color = "red";
  }
});


// LOGIN
document.getElementById("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const message = document.getElementById("loginMessage");

  message.textContent = "Logging in...";


  const data = {
    email: document.getElementById("loginEmail").value,
    password: document.getElementById("loginPassword").value
  };


  try {
    const response = await fetch(`${API_URL}/login`, {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify(data)
    });


    const result = await response.json();


    if (!response.ok) {
      message.textContent = result.detail || "Login failed.";
      message.style.color = "red";
      return;
    }


    localStorage.setItem(
      "user",
      JSON.stringify(result.user)
    );


    message.textContent = "Login successful.";
    message.style.color = "green";


    if (result.user.role === "super_admin") {

      window.location.href =
        "super_admin.html";

    } else if (result.user.role === "admin") {

      window.location.href =
        "admin.html";

    } else {

      window.location.href =
        "employee.html";
    }


  } catch (error) {

    message.textContent =
      "Cannot connect to backend server.";

    message.style.color = "red";
  }
});