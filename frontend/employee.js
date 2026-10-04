const API_URL =
  "http://127.0.0.1:8000";


let employeeProducts = [];


// ==================================
// EMPLOYEE LOGIN CHECK
// ==================================

const employeeUser =
  JSON.parse(
    localStorage.getItem("user")
  );


if (!employeeUser) {

  window.location.href =
    "index.html";

}


if (
  employeeUser &&
  employeeUser.role !== "employee"
) {

  window.location.href =
    "index.html";

}


const employeeWelcome =
  document.getElementById(
    "welcome"
  );


if (
  employeeWelcome &&
  employeeUser
) {

  employeeWelcome.textContent =
    `Welcome, ${employeeUser.name}`;

}


// ==================================
// SIDEBAR
// ==================================

function showEmployeeSection(
  sectionId,
  button
) {

  document
    .querySelectorAll(
      ".content-section"
    )
    .forEach((section) => {

      section.classList.remove(
        "active-section"
      );

    });


  const selectedSection =
    document.getElementById(
      sectionId
    );


  if (selectedSection) {

    selectedSection.classList.add(
      "active-section"
    );

  }


  document
    .querySelectorAll(
      ".menu-button"
    )
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


  loadEmployeeProducts();

}


// ==================================
// LOAD PRODUCTS FROM SAME DATABASE
// ==================================

async function loadEmployeeProducts() {

  try {

    const response =
      await fetch(
        `${API_URL}/products`
      );


    if (!response.ok) {

      throw new Error(
        "Could not load products"
      );

    }


    employeeProducts =
      await response.json();


    displayEmployeeProducts();

    displayLowStockProducts();

    displayHighStockProducts();

    updateEmployeeDashboard();

  }

  catch (error) {

    console.error(
      "Employee product error:",
      error
    );

  }

}


// ==================================
// DISPLAY ALL STOCK
// ==================================

function displayEmployeeProducts() {

  const body =
    document.getElementById(
      "employeeProductBody"
    );


  if (!body) {

    return;

  }


  body.innerHTML = "";


  employeeProducts.forEach(
    (product) => {

      const row = `
        <tr>

          <td>
            ${product.id}
          </td>

          <td>
            ${product.name}
          </td>

          <td>
            ${product.category}
          </td>

          <td>
            ${product.quantity}
          </td>

          <td>
            ${product.supplier}
          </td>

          <td>

            <button
              class="delete-button"
              onclick="changeQuantity(
                ${product.id},
                -1
              )"
            >
              -
            </button>


            <span
              style="
                margin: 0 12px;
                font-weight: bold;
              "
            >

              ${product.quantity}

            </span>


            <button
              class="edit-button"
              onclick="changeQuantity(
                ${product.id},
                1
              )"
            >
              +
            </button>

          </td>

        </tr>
      `;


      body.innerHTML += row;

    }
  );

}


// ==================================
// CHANGE STOCK QUANTITY
// ==================================

async function changeQuantity(
  productId,
  change
) {

  try {

    const response =
      await fetch(
        `${API_URL}/products/${productId}/quantity`,
        {

          method: "PATCH",

          headers: {

            "Content-Type":
              "application/json"

          },

          body:
            JSON.stringify({

              change: change

            })

        }
      );


    const result =
      await response.json();


    if (!response.ok) {

      alert(
        result.detail ||
        "Unable to update quantity"
      );

      return;

    }


    await loadEmployeeProducts();

  }

  catch (error) {

    console.error(
      "Stock update error:",
      error
    );

  }

}


// ==================================
// LOW STOCK
// Quantity 1 - 5
// ==================================

function displayLowStockProducts() {

  const body =
    document.getElementById(
      "lowStockBody"
    );


  if (!body) {

    return;

  }


  body.innerHTML = "";


  const lowStockProducts =
    employeeProducts.filter(
      (product) =>
        product.quantity <= 5
    );


  if (
    lowStockProducts.length === 0
  ) {

    body.innerHTML = `
      <tr>

        <td colspan="6">
          No low-stock products
        </td>

      </tr>
    `;

    return;

  }


  lowStockProducts.forEach(
    (product) => {

      let status =
        "Low Stock";


      if (
        product.quantity === 0
      ) {

        status =
          "Out of Stock";

      }


      const row = `
        <tr>

          <td>
            ${product.id}
          </td>

          <td>
            ${product.name}
          </td>

          <td>
            ${product.category}
          </td>

          <td>
            ${product.quantity}
          </td>

          <td>
            ${product.supplier}
          </td>

          <td>
            ${status}
          </td>

        </tr>
      `;


      body.innerHTML += row;

    }
  );

}


// ==================================
// HIGH STOCK
// Quantity > 20
// ==================================

function displayHighStockProducts() {

  const body =
    document.getElementById(
      "highStockBody"
    );


  if (!body) {

    return;

  }


  body.innerHTML = "";


  const highStockProducts =
    employeeProducts.filter(
      (product) =>
        product.quantity > 20
    );


  if (
    highStockProducts.length === 0
  ) {

    body.innerHTML = `
      <tr>

        <td colspan="6">
          No high-stock products
        </td>

      </tr>
    `;

    return;

  }


  highStockProducts.forEach(
    (product) => {

      const row = `
        <tr>

          <td>
            ${product.id}
          </td>

          <td>
            ${product.name}
          </td>

          <td>
            ${product.category}
          </td>

          <td>
            ${product.quantity}
          </td>

          <td>
            ${product.supplier}
          </td>

          <td>
            High Stock
          </td>

        </tr>
      `;


      body.innerHTML += row;

    }
  );

}


// ==================================
// EMPLOYEE DASHBOARD COUNTERS
// ==================================

function updateEmployeeDashboard() {

  const totalProducts =
    employeeProducts.length;


  const totalStock =
    employeeProducts.reduce(
      (
        total,
        product
      ) =>
        total +
        product.quantity,
      0
    );


  const lowStock =
    employeeProducts.filter(
      (product) =>
        product.quantity > 0 &&
        product.quantity <= 5
    ).length;


  const outOfStock =
    employeeProducts.filter(
      (product) =>
        product.quantity === 0
    ).length;


  const totalProductsElement =
    document.getElementById(
      "employeeTotalProducts"
    );


  const totalStockElement =
    document.getElementById(
      "employeeTotalStock"
    );


  const lowStockElement =
    document.getElementById(
      "employeeLowStock"
    );


  const outOfStockElement =
    document.getElementById(
      "employeeOutOfStock"
    );


  if (totalProductsElement) {

    totalProductsElement.textContent =
      totalProducts;

  }


  if (totalStockElement) {

    totalStockElement.textContent =
      totalStock;

  }


  if (lowStockElement) {

    lowStockElement.textContent =
      lowStock;

  }


  if (outOfStockElement) {

    outOfStockElement.textContent =
      outOfStock;

  }

}


// ==================================
// EMPLOYEE LOGOUT
// ==================================

function employeeLogout() {

  localStorage.removeItem(
    "user"
  );


  window.location.href =
    "index.html";

}


// ==================================
// INITIAL LOAD
// ==================================

loadEmployeeProducts();