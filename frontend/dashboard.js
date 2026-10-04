const API_URL = "http://127.0.0.1:8000";

let products = [];


// --------------------------
// CURRENT USER
// --------------------------

const user = JSON.parse(
  localStorage.getItem("user")
);


if (!user) {

  window.location.href =
    "index.html";

}


const welcomeElement =
  document.getElementById("welcome");


if (welcomeElement && user) {

  welcomeElement.textContent =
    `Welcome, ${user.name}`;

}


// --------------------------
// SIDEBAR SECTIONS
// --------------------------

function showSection(
  sectionId,
  button = null
) {

  document
    .querySelectorAll(".content-section")
    .forEach((section) => {

      section.classList.remove(
        "active-section"
      );

    });


  const selectedSection =
    document.getElementById(sectionId);


  if (selectedSection) {

    selectedSection.classList.add(
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


  if (sectionId === "productsSection") {

    loadProducts();

  }

}


// --------------------------
// LOAD PRODUCTS
// --------------------------

async function loadProducts() {

  try {

    const response =
      await fetch(
        `${API_URL}/products`
      );


    products =
      await response.json();


    displayProducts();

    updateDashboard();

  }

  catch (error) {

    console.log(
      "Error loading products:",
      error
    );

  }

}


// --------------------------
// DISPLAY PRODUCTS
// --------------------------

function displayProducts() {

  const productBody =
    document.getElementById(
      "productBody"
    );


  if (!productBody) {

    return;

  }


  productBody.innerHTML = "";


  products.forEach((product) => {

    const row = `

      <tr>

        <td>${product.id}</td>

        <td>${product.name}</td>

        <td>${product.category}</td>

        <td>${product.quantity}</td>

        <td>₹${product.price}</td>

        <td>${product.supplier}</td>

        <td>

          <button
            class="edit-button"
            onclick="openEditModal(${product.id})"
          >
            Edit
          </button>

          <button
            class="delete-button"
            onclick="openDeleteModal(${product.id})"
          >
            Delete
          </button>

        </td>

      </tr>

    `;


    productBody.innerHTML += row;

  });

}


// --------------------------
// DASHBOARD COUNTERS
// --------------------------

function updateDashboard() {

  const totalProducts =
    products.length;


  const totalStock =
    products.reduce(
      (total, product) =>
        total + product.quantity,
      0
    );


  const lowStock =
    products.filter(
      (product) =>
        product.quantity <= 5
    ).length;


  const inventoryValue =
    products.reduce(
      (total, product) =>
        total +
        (
          product.quantity *
          product.price
        ),
      0
    );


  document.getElementById(
    "totalProducts"
  ).textContent = totalProducts;


  document.getElementById(
    "totalStock"
  ).textContent = totalStock;


  document.getElementById(
    "lowStock"
  ).textContent = lowStock;


  document.getElementById(
    "inventoryValue"
  ).textContent =
    `₹${inventoryValue.toFixed(2)}`;

}


// --------------------------
// ADD PRODUCT
// --------------------------

const productForm =
  document.getElementById(
    "productForm"
  );


if (productForm) {

  productForm.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();


      const productData = {

        name:
          document.getElementById(
            "productName"
          ).value,

        category:
          document.getElementById(
            "productCategory"
          ).value,

        quantity:
          parseInt(
            document.getElementById(
              "productQuantity"
            ).value
          ),

        price:
          parseFloat(
            document.getElementById(
              "productPrice"
            ).value
          ),

        supplier:
          document.getElementById(
            "productSupplier"
          ).value

      };


      const response =
        await fetch(
          `${API_URL}/products`,
          {

            method: "POST",

            headers: {

              "Content-Type":
                "application/json"

            },

            body:
              JSON.stringify(
                productData
              )

          }
        );


      if (response.ok) {

        productForm.reset();

        await loadProducts();


        showSection(
          "productsSection"
        );


        document
          .querySelectorAll(
            ".menu-button"
          )
          .forEach((button) => {

            button.classList.remove(
              "active-menu"
            );

          });


        const buttons =
          document.querySelectorAll(
            ".menu-button"
          );


        if (buttons[1]) {

          buttons[1].classList.add(
            "active-menu"
          );

        }

      }

  });

}


// --------------------------
// OPEN EDIT MODAL
// --------------------------

function openEditModal(productId) {

  const product =
    products.find(
      (item) =>
        item.id === productId
    );


  if (!product) {

    return;

  }


  document.getElementById(
    "editProductId"
  ).value = product.id;


  document.getElementById(
    "editProductName"
  ).value = product.name;


  document.getElementById(
    "editProductCategory"
  ).value = product.category;


  document.getElementById(
    "editProductQuantity"
  ).value = product.quantity;


  document.getElementById(
    "editProductPrice"
  ).value = product.price;


  document.getElementById(
    "editProductSupplier"
  ).value = product.supplier;


  document.getElementById(
    "editModal"
  ).classList.add("show");

}


// --------------------------
// CLOSE EDIT MODAL
// --------------------------

function closeEditModal() {

  document.getElementById(
    "editModal"
  ).classList.remove("show");

}


// --------------------------
// UPDATE PRODUCT
// --------------------------

async function updateProduct() {

  const productId =
    document.getElementById(
      "editProductId"
    ).value;


  const updatedProduct = {

    name:
      document.getElementById(
        "editProductName"
      ).value,

    category:
      document.getElementById(
        "editProductCategory"
      ).value,

    quantity:
      parseInt(
        document.getElementById(
          "editProductQuantity"
        ).value
      ),

    price:
      parseFloat(
        document.getElementById(
          "editProductPrice"
        ).value
      ),

    supplier:
      document.getElementById(
        "editProductSupplier"
      ).value

  };


  const response =
    await fetch(
      `${API_URL}/products/${productId}`,
      {

        method: "PUT",

        headers: {

          "Content-Type":
            "application/json"

        },

        body:
          JSON.stringify(
            updatedProduct
          )

      }
    );


  if (response.ok) {

    closeEditModal();

    loadProducts();

  }

}


// --------------------------
// DELETE MODAL
// --------------------------

function openDeleteModal(
  productId
) {

  document.getElementById(
    "deleteProductId"
  ).value = productId;


  document.getElementById(
    "deleteModal"
  ).classList.add("show");

}


function closeDeleteModal() {

  document.getElementById(
    "deleteModal"
  ).classList.remove("show");

}


// --------------------------
// DELETE PRODUCT
// --------------------------

async function confirmDeleteProduct() {

  const productId =
    document.getElementById(
      "deleteProductId"
    ).value;


  const response =
    await fetch(
      `${API_URL}/products/${productId}`,
      {
        method: "DELETE"
      }
    );


  if (response.ok) {

    closeDeleteModal();

    loadProducts();

  }

}


// --------------------------
// LOGOUT MODAL
// --------------------------

function openLogoutModal() {

  document.getElementById(
    "logoutModal"
  ).classList.add("show");

}


function closeLogoutModal() {

  document.getElementById(
    "logoutModal"
  ).classList.remove("show");

}


// --------------------------
// LOGOUT
// --------------------------

function confirmLogout() {

  localStorage.removeItem(
    "user"
  );
  window.location.href =
    "index.html";
}
// INITIAL LOAD
loadProducts();