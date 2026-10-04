const API_URL = "http://127.0.0.1:8000";

let superProducts = [];
let superUsers = [];


// -------------------------
// USER CHECK
// -------------------------

const superUser =
  JSON.parse(
    localStorage.getItem("user")
  );


if (!superUser) {
  window.location.href = "index.html";
}


if (
  superUser &&
  superUser.role !== "super_admin"
) {
  window.location.href = "index.html";
}


const welcome =
  document.getElementById("welcome");


if (welcome && superUser) {
  welcome.textContent =
    `Welcome, ${superUser.name}`;
}


// -------------------------
// SECTION SWITCHING
// -------------------------

function showSuperSection(
  sectionId,
  button
) {

  document
    .querySelectorAll(".content-section")
    .forEach((section) => {

      section.classList.remove(
        "active-section"
      );

    });


  const selected =
    document.getElementById(
      sectionId
    );


  if (selected) {
    selected.classList.add(
      "active-section"
    );
  }


  document
    .querySelectorAll(".menu-button")
    .forEach((menuButton) => {

      menuButton.classList.remove(
        "active-menu"
      );

    });


  if (button) {
    button.classList.add(
      "active-menu"
    );
  }


  loadSuperAdminData();
}


// -------------------------
// LOAD ALL DATA
// -------------------------

async function loadSuperAdminData() {

  try {

    const productResponse =
      await fetch(
        `${API_URL}/products`
      );


    const userResponse =
      await fetch(
        `${API_URL}/users`
      );


    superProducts =
      await productResponse.json();


    superUsers =
      await userResponse.json();


    displaySuperProducts();

    displaySuperUsers();

    displaySuperLowStock();

    displaySuperHighStock();

    updateSuperDashboard();

  }

  catch (error) {

    console.error(
      "Super admin error:",
      error
    );

  }

}


// -------------------------
// PRODUCTS
// -------------------------

function displaySuperProducts() {

  const body =
    document.getElementById(
      "superProductBody"
    );


  if (!body) {
    return;
  }


  body.innerHTML = "";


  superProducts.forEach(
    (product) => {

      body.innerHTML += `
        <tr>
          <td>${product.id}</td>
          <td>${product.name}</td>
          <td>${product.category}</td>
          <td>${product.quantity}</td>
          <td>₹${product.price}</td>
          <td>${product.supplier}</td>
        </tr>
      `;

    }
  );

}


// -------------------------
// USERS
// -------------------------

function displaySuperUsers() {

  const body =
    document.getElementById(
      "superUserBody"
    );


  if (!body) {
    return;
  }


  body.innerHTML = "";


  superUsers.forEach(
    (user) => {

      body.innerHTML += `
        <tr>
          <td>${user.id}</td>
          <td>${user.name}</td>
          <td>${user.email}</td>
          <td>${user.role}</td>
        </tr>
      `;

    }
  );

}


// -------------------------
// LOW STOCK
// -------------------------

function displaySuperLowStock() {

  const body =
    document.getElementById(
      "superLowStockBody"
    );


  if (!body) {
    return;
  }


  body.innerHTML = "";


  const lowStock =
    superProducts.filter(
      (product) =>
        product.quantity <= 5
    );


  lowStock.forEach(
    (product) => {

      body.innerHTML += `
        <tr>
          <td>${product.id}</td>
          <td>${product.name}</td>
          <td>${product.category}</td>
          <td>${product.quantity}</td>
          <td>${product.supplier}</td>
        </tr>
      `;

    }
  );

}


// -------------------------
// HIGH STOCK
// -------------------------

function displaySuperHighStock() {

  const body =
    document.getElementById(
      "superHighStockBody"
    );


  if (!body) {
    return;
  }


  body.innerHTML = "";


  const highStock =
    superProducts.filter(
      (product) =>
        product.quantity > 20
    );


  highStock.forEach(
    (product) => {

      body.innerHTML += `
        <tr>
          <td>${product.id}</td>
          <td>${product.name}</td>
          <td>${product.category}</td>
          <td>${product.quantity}</td>
          <td>${product.supplier}</td>
        </tr>
      `;

    }
  );

}


// -------------------------
// DASHBOARD
// -------------------------

function updateSuperDashboard() {

  const totalProducts =
    superProducts.length;


  const totalStock =
    superProducts.reduce(
      (total, product) =>
        total + product.quantity,
      0
    );


  const totalUsers =
    superUsers.length;


  const lowStock =
    superProducts.filter(
      (product) =>
        product.quantity <= 5
    ).length;


  document.getElementById(
    "superTotalProducts"
  ).textContent =
    totalProducts;


  document.getElementById(
    "superTotalStock"
  ).textContent =
    totalStock;


  document.getElementById(
    "superTotalUsers"
  ).textContent =
    totalUsers;


  document.getElementById(
    "superLowStock"
  ).textContent =
    lowStock;

}


// -------------------------
// LOGOUT
// -------------------------

function superAdminLogout() {

  localStorage.removeItem(
    "user"
  );


  window.location.href =
    "index.html";

}


// -------------------------
// INITIAL LOAD
// -------------------------

loadSuperAdminData();