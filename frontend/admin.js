// ADMIN.JS — functions for the Admin dashboard.
// PAGE_ROLE is the role allowed to open this particular HTML page.
const PAGE_ROLE = "admin";

// These variables keep the data loaded from the backend.
let currentUser = null;
let products = [];
let currentPage = 1;
let sortAscending = true;
let requestNumber = 0;
let pendingAction = null;
const PRODUCTS_PER_PAGE = 8;

// 1. BACKEND CONNECTION
// fetch() sends a request. await waits for the backend's reply.
// The browser sends the login cookie automatically on the same origin.
async function sendRequest(path, method = "GET", body = null) {
  const options = {
    method: method,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
  };
  if (body !== null) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(path, options);
  const result = await response.json();

  if (response.status === 401) {
    window.location.replace("index.html");
    throw new Error("Please sign in again.");
  }
  if (!response.ok) {
    let message = "Please check the entered values.";
    if (typeof result.detail === "string") {
      message = result.detail;
    }
    throw new Error(message);
  }
  return result;
}

// Format a number as Indian rupees.
function formatPrice(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

// Product names come from users. Escape them before adding them to HTML.
function escapeHTML(value) {
  let text = String(value);
  text = text.replaceAll("&", "&amp;");
  text = text.replaceAll("<", "&lt;");
  text = text.replaceAll(">", "&gt;");
  text = text.replaceAll('"', "&quot;");
  text = text.replaceAll("'", "&#39;");
  return text;
}

function showMessage(message, isError = false) {
  const notice = document.getElementById("notice");
  notice.textContent = message;
  notice.hidden = false;
  notice.classList.toggle("error", isError);
}

// 2. HAMBURGER MENU
// hidden = true hides an element; hidden = false displays it.
function openMenu() {
  document.getElementById("sidebar").hidden = false;
  document.getElementById("backdrop").hidden = false;
  document.getElementById("menuToggle").setAttribute("aria-expanded", "true");
  document.body.classList.add("drawer-open");
  document.querySelector(".main").inert = true;
  document.querySelector(".topbar").inert = true;
  document.getElementById("closeMenu").focus();
}

function closeMenu() {
  document.getElementById("sidebar").hidden = true;
  document.getElementById("backdrop").hidden = true;
  document.getElementById("menuToggle").setAttribute("aria-expanded", "false");
  document.body.classList.remove("drawer-open");
  document.querySelector(".main").inert = false;
  document.querySelector(".topbar").inert = false;
  document.getElementById("menuToggle").focus();
}

function handleMenuKeyboard(event) {
  const sidebar = document.getElementById("sidebar");
  if (sidebar.hidden) return;
  if (event.key === "Escape") closeMenu();

  // Keep keyboard navigation inside the open drawer.
  if (event.key === "Tab") {
    const buttons = sidebar.querySelectorAll("button");
    const firstButton = buttons[0];
    const lastButton = buttons[buttons.length - 1];
    if (event.shiftKey && document.activeElement === firstButton) {
      event.preventDefault();
      lastButton.focus();
    } else if (!event.shiftKey && document.activeElement === lastButton) {
      event.preventDefault();
      firstButton.focus();
    }
  }
}

// 3. SWITCH BETWEEN SECTIONS
function showSection(sectionName) {
  currentPage = 1;
  document.getElementById("search").value = "";
  document.getElementById("category").value = "";
  document.getElementById("stockFilter").value = "all";

  if (sectionName === "low") {
    document.getElementById("stockFilter").value = "low";
  } else if (sectionName === "high") {
    document.getElementById("stockFilter").value = "high";
  }

  document.getElementById("overview").hidden = sectionName !== "overview";
  document.getElementById("inventorySection").hidden = sectionName === "users";

  const titles = {
    overview: "Admin Overview",
    products: "Products",
    low: "Low stock",
    high: "High stock",
    users: "Team members",
  };
  document.getElementById("pageTitle").textContent = titles[sectionName];

  const menuButtons = document.querySelectorAll(".nav-button");
  for (const button of menuButtons) {
    button.classList.toggle("active", button.dataset.view === sectionName);
  }
  closeMenu();
  displayProducts();
}

// 4. SEARCH, FILTER AND SORT PRODUCTS
function getFilteredProducts() {
  const searchText = document
    .getElementById("search")
    .value.trim()
    .toLowerCase();
  const category = document.getElementById("category").value;
  const stockLevel = document.getElementById("stockFilter").value;
  const matches = [];

  for (const product of products) {
    const searchableText = (
      product.id +
      " " +
      product.name +
      " " +
      product.category +
      " " +
      product.supplier
    ).toLowerCase();
    if (searchText !== "" && !searchableText.includes(searchText)) continue;
    if (category !== "" && product.category !== category) continue;
    if (stockLevel === "low" && product.quantity > 5) continue;
    if (stockLevel === "out" && product.quantity !== 0) continue;
    if (stockLevel === "high" && product.quantity <= 20) continue;
    matches.push(product);
  }

  matches.sort(function (first, second) {
    const comparison = first.name.localeCompare(second.name);
    if (sortAscending) return comparison;
    return -comparison;
  });
  return matches;
}

function getStockBadge(product) {
  if (product.quantity === 0) {
    return '<span class="status out">Out of stock</span>';
  }
  if (product.quantity <= 5) {
    return '<span class="status low">Low stock</span>';
  }
  return '<span class="status">In stock</span>';
}

function displayProducts() {
  const filteredProducts = getFilteredProducts();
  const totalPages = Math.max(
    1,
    Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE),
  );
  currentPage = Math.min(currentPage, totalPages);
  const start = (currentPage - 1) * PRODUCTS_PER_PAGE;
  const visibleProducts = filteredProducts.slice(
    start,
    start + PRODUCTS_PER_PAGE,
  );
  const tableBody = document.getElementById("productBody");
  tableBody.innerHTML = "";

  for (const product of visibleProducts) {
    // data-id stores the product ID on each action button.
    let actionButtons = `<button class="secondary" data-action="stock" data-id="${product.id}">Adjust</button>`;
    actionButtons += `<button class="secondary" data-action="edit" data-id="${product.id}">Edit</button><button class="secondary" data-action="delete" data-id="${product.id}">Delete</button>`;
    tableBody.innerHTML += `
            <tr>
                <td><strong>${escapeHTML(product.name)}</strong><small>Product #${product.id}</small></td>
                <td>${escapeHTML(product.category)}</td>
                <td><strong>${product.quantity}</strong> units<small>${getStockBadge(product)}</small></td>
                <td>${formatPrice(product.price)}</td>
                <td>${escapeHTML(product.supplier)}</td>
                <td><div class="row-actions">${actionButtons}</div></td>
            </tr>`;
  }
  if (visibleProducts.length === 0) {
    tableBody.innerHTML =
      '<tr><td colspan="6" class="empty">No products found. Try another filter.</td></tr>';
  }
  document.getElementById("resultCount").textContent =
    filteredProducts.length + " products";
  document.getElementById("pageInfo").textContent =
    "Page " + currentPage + " of " + totalPages;
  document.getElementById("previous").disabled = currentPage <= 1;
  document.getElementById("next").disabled = currentPage >= totalPages;
}

// 5. DASHBOARD SUMMARY
function updateDashboard() {
  let totalStock = 0;
  let inventoryValue = 0;
  let lowStock = 0;
  let outOfStock = 0;
  const restockProducts = [];

  for (const product of products) {
    totalStock += product.quantity;
    inventoryValue += product.quantity * product.price;
    if (product.quantity === 0) outOfStock++;
    else if (product.quantity <= 5) lowStock++;
    if (product.quantity <= 5) restockProducts.push(product);
  }

  document.getElementById("totalProducts").textContent = products.length;
  document.getElementById("totalStock").textContent =
    totalStock.toLocaleString("en-IN");
  document.getElementById("lowStock").textContent = lowStock + outOfStock;
  document.getElementById("inventoryValue").textContent =
    formatPrice(inventoryValue);

  const healthyStock = products.length - lowStock - outOfStock;
  let healthyPercent = 0;
  let lowPercent = 0;
  if (products.length > 0) {
    healthyPercent = (healthyStock / products.length) * 100;
    lowPercent = (lowStock / products.length) * 100;
    document.getElementById("healthyPercent").textContent =
      Math.round(healthyPercent) + "%";
    document.getElementById("healthDonut").style.background =
      `conic-gradient(#218164 0% ${healthyPercent}%, #edb65c ${healthyPercent}% ${healthyPercent + lowPercent}%, #ce6c65 ${healthyPercent + lowPercent}% 100%)`;
  } else {
    document.getElementById("healthyPercent").textContent = "—";
    document.getElementById("healthDonut").style.background = "#e9eeeb";
  }
  document.getElementById("healthLegend").innerHTML = `
        <div class="legend-row"><span class="dot" style="background:#218164"></span>Healthy<strong>${healthyStock}</strong></div>
        <div class="legend-row"><span class="dot" style="background:#edb65c"></span>Low stock<strong>${lowStock}</strong></div>
        <div class="legend-row"><span class="dot" style="background:#ce6c65"></span>Out of stock<strong>${outOfStock}</strong></div>`;

  restockProducts.sort(function (first, second) {
    return first.quantity - second.quantity;
  });
  const restockList = document.getElementById("restockList");
  restockList.innerHTML = "";
  for (const product of restockProducts.slice(0, 3)) {
    restockList.innerHTML += `<div class="restock-item"><div><strong>${escapeHTML(product.name)}</strong><small>${escapeHTML(product.category)} · ${product.quantity} units remaining</small></div>${getStockBadge(product)}</div>`;
  }
  if (restockProducts.length === 0) {
    restockList.innerHTML =
      '<p class="empty">All clear. No products need restocking.</p>';
  }
}

function fillCategoryFilter() {
  const categorySelect = document.getElementById("category");
  const selectedCategory = categorySelect.value;
  const categories = [];
  for (const product of products) {
    if (!categories.includes(product.category))
      categories.push(product.category);
  }
  categories.sort();
  categorySelect.innerHTML = '<option value="">All categories</option>';
  for (const category of categories) {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categorySelect.appendChild(option);
  }
  categorySelect.value = selectedCategory;
}

async function loadProducts() {
  // If a newer refresh starts, ignore this request's older result.
  requestNumber++;
  const thisRequest = requestNumber;
  const refreshButton = document.getElementById("refresh");
  refreshButton.disabled = true;
  refreshButton.textContent = "Loading…";
  try {
    const result = await sendRequest("/products");
    if (thisRequest !== requestNumber) return;
    products = result;
    fillCategoryFilter();
    updateDashboard();
    displayProducts();
  } catch (error) {
    showMessage(error.message, true);
    document.getElementById("resultCount").textContent =
      "Could not load products. Please refresh.";
  } finally {
    if (thisRequest === requestNumber) {
      refreshButton.disabled = false;
      refreshButton.textContent = "↻ Refresh";
    }
  }
}

// 6. STOCK ADJUSTMENT (available to every role)
function openStockForm(product) {
  document.getElementById("stockForm").reset();
  document.getElementById("stockError").textContent = "";
  document.getElementById("stockId").value = product.id;
  document.getElementById("stockName").textContent =
    product.name + " · " + product.quantity + " units in stock";
  document.getElementById("stockDialog").showModal();
}

async function saveStock(event) {
  event.preventDefault(); // Prevent the browser from reloading the form page.
  const submitButton = document.querySelector("#stockForm .primary");
  submitButton.disabled = true;
  try {
    const productId = document.getElementById("stockId").value;
    const change = Number(document.getElementById("stockChange").value);
    if (!Number.isInteger(change) || change === 0) {
      throw new Error("Enter a nonzero whole number.");
    }
    await sendRequest("/products/" + productId + "/quantity", "PATCH", {
      change: change,
    });
    document.getElementById("stockDialog").close();
    showMessage("Stock updated.");
    await loadProducts();
  } catch (error) {
    document.getElementById("stockError").textContent = error.message;
  } finally {
    submitButton.disabled = false;
  }
}

// PRODUCT MANAGEMENT: only admin and super admin pages include these functions.
function openProductForm(product = null) {
  document.getElementById("productForm").reset();
  document.getElementById("formError").textContent = "";
  document.getElementById("productId").value = "";
  document.getElementById("formTitle").textContent = "Add product";
  document.getElementById("productQuantity").value = 0;
  document.getElementById("productPrice").value = 0;

  if (product !== null) {
    document.getElementById("formTitle").textContent = "Edit product";
    document.getElementById("productId").value = product.id;
    document.getElementById("productName").value = product.name;
    document.getElementById("productCategory").value = product.category;
    document.getElementById("productQuantity").value = product.quantity;
    document.getElementById("productPrice").value = product.price;
    document.getElementById("productSupplier").value = product.supplier;
  }
  document.getElementById("productDialog").showModal();
}

async function saveProduct(event) {
  event.preventDefault();
  const button = document.querySelector("#productForm .primary");
  button.disabled = true;
  document.getElementById("formError").textContent = "";
  try {
    const productId = document.getElementById("productId").value;
    const productData = {
      name: document.getElementById("productName").value.trim(),
      category: document.getElementById("productCategory").value.trim(),
      quantity: Number(document.getElementById("productQuantity").value),
      price: Number(document.getElementById("productPrice").value),
      supplier: document.getElementById("productSupplier").value.trim(),
    };
    if (productId === "") {
      await sendRequest("/products", "POST", productData);
      showMessage("Product added.");
    } else {
      await sendRequest("/products/" + productId, "PUT", productData);
      showMessage("Product updated.");
    }
    document.getElementById("productDialog").close();
    await loadProducts();
  } catch (error) {
    document.getElementById("formError").textContent = error.message;
  } finally {
    button.disabled = false;
  }
}

function askDeleteProduct(product) {
  askConfirmation(
    "Delete product?",
    product.name + " will be removed from the inventory.",
    async function () {
      await sendRequest("/products/" + product.id, "DELETE");
      showMessage("Product deleted.");
      await loadProducts();
    },
  );
}

// 7. CONFIRMATION AND SIGN OUT
// Store the action until the user presses Confirm.
function askConfirmation(title, message, action) {
  document.getElementById("confirmTitle").textContent = title;
  document.getElementById("confirmText").textContent = message;
  document.getElementById("confirmError").textContent = "";
  pendingAction = action;
  document.getElementById("confirmDialog").showModal();
}

async function runConfirmedAction() {
  const button = document.getElementById("confirmAction");
  button.disabled = true;
  try {
    await pendingAction();
    document.getElementById("confirmDialog").close();
  } catch (error) {
    document.getElementById("confirmError").textContent = error.message;
  } finally {
    button.disabled = false;
  }
}

async function logout() {
  await sendRequest("/logout", "POST");
  window.location.replace("index.html");
}

// 8. DOWNLOAD THE FILTERED TABLE AS CSV
function formatCSVCell(value) {
  let text = String(value);
  // Prevent spreadsheet applications treating user text as a formula.
  if (/^[=+@\-\t\r]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}

function exportProducts() {
  const rows = [["ID", "Name", "Category", "Quantity", "Price", "Supplier"]];
  for (const product of getFilteredProducts()) {
    rows.push([
      product.id,
      product.name,
      product.category,
      product.quantity,
      product.price,
      product.supplier,
    ]);
  }
  const csvLines = [];
  for (const row of rows) {
    const cells = [];
    for (const value of row) cells.push(formatCSVCell(value));
    csvLines.push(cells.join(","));
  }
  const file = new Blob(["\uFEFF" + csvLines.join("\r\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = "stockroom-inventory.csv";
  link.click();
  URL.revokeObjectURL(url);
}

// 9. BUTTON AND FORM EVENTS
function setupEvents() {
  document.getElementById("menuToggle").addEventListener("click", openMenu);
  document.getElementById("closeMenu").addEventListener("click", closeMenu);
  document.getElementById("backdrop").addEventListener("click", closeMenu);
  document.addEventListener("keydown", handleMenuKeyboard);

  for (const button of document.querySelectorAll(".nav-button")) {
    button.addEventListener("click", function () {
      showSection(button.dataset.view);
    });
  }
  for (const button of document.querySelectorAll("[data-close]")) {
    button.addEventListener("click", function () {
      document.getElementById(button.dataset.close).close();
    });
  }
  document
    .getElementById("viewLowStock")
    .addEventListener("click", function () {
      showSection("low");
    });
  document.getElementById("refresh").addEventListener("click", function () {
    document.getElementById("notice").hidden = true;
    loadProducts();
  });
  document.getElementById("search").addEventListener("input", resetTable);
  document.getElementById("category").addEventListener("change", resetTable);
  document.getElementById("stockFilter").addEventListener("change", resetTable);
  document.getElementById("sortName").addEventListener("click", function () {
    sortAscending = !sortAscending;
    displayProducts();
  });
  document.getElementById("previous").addEventListener("click", function () {
    currentPage--;
    displayProducts();
  });
  document.getElementById("next").addEventListener("click", function () {
    currentPage++;
    displayProducts();
  });
  document.getElementById("export").addEventListener("click", exportProducts);
  document.getElementById("stockForm").addEventListener("submit", saveStock);
  document
    .getElementById("productBody")
    .addEventListener("click", handleProductClick);
  document
    .getElementById("confirmAction")
    .addEventListener("click", runConfirmedAction);
  document
    .getElementById("confirmCancel")
    .addEventListener("click", function () {
      document.getElementById("confirmDialog").close();
    });
  document.getElementById("logout").addEventListener("click", function () {
    askConfirmation(
      "Sign out?",
      "You can sign in again whenever you need.",
      logout,
    );
  });
  document.getElementById("addProduct").addEventListener("click", function () {
    openProductForm();
  });
  document
    .getElementById("productForm")
    .addEventListener("submit", saveProduct);
}

function resetTable() {
  currentPage = 1;
  displayProducts();
}

function handleProductClick(event) {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const productId = Number(button.dataset.id);
  const product = products.find(function (item) {
    return item.id === productId;
  });
  if (!product) return;
  if (button.dataset.action === "stock") openStockForm(product);
  if (button.dataset.action === "edit") openProductForm(product);
  if (button.dataset.action === "delete") askDeleteProduct(product);
}

// 10. INITIAL PAGE LOAD
// The backend checks the actual session role; the page also redirects a user
// who tries opening the wrong dashboard URL manually.
async function initializePage() {
  try {
    currentUser = await sendRequest("/me");
    if (currentUser.role !== PAGE_ROLE) {
      window.location.replace(currentUser.role + ".html");
      return;
    }
    document.getElementById("userName").textContent = currentUser.name;
    document.getElementById("avatar").textContent = currentUser.name
      .charAt(0)
      .toUpperCase();
    setupEvents();
    await loadProducts();
  } catch (error) {
    showMessage(error.message, true);
  }
}

initializePage();
