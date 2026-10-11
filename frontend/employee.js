const PAGE_ROLE = "employee";

let currentUser = null;
let products = [];
let currentPage = 1;
let sortAscending = true;
let requestNumber = 0;
let pendingAction = null;
const PRODUCTS_PER_PAGE = 8;

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

function formatPrice(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

// Escape product names before putting them into table HTML.
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

  // Keep Tab focus inside the menu.
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
    overview: "Employee Overview",
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
  const tableBody = document.getElementById("inventoryRows");
  tableBody.innerHTML = "";

  for (const product of visibleProducts) {
    let actionButtons = `<button class="secondary" data-action="stock" data-id="${product.id}">Adjust</button>`;

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
  // Ignore a response if another refresh has already started.
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

function openStockForm(product) {
  document.getElementById("stockAdjustmentForm").reset();
  document.getElementById("stockError").textContent = "";
  document.getElementById("stockId").value = product.id;
  document.getElementById("stockName").textContent =
    product.name + " · " + product.quantity + " units in stock";
  document.getElementById("stockDialog").showModal();
}

async function saveStock(event) {
  event.preventDefault();
  const submitButton = document.querySelector("#stockAdjustmentForm .primary");
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

function formatCSVCell(value) {
  let text = String(value);
  // Keep user text from becoming a spreadsheet formula.
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
  document
    .getElementById("stockAdjustmentForm")
    .addEventListener("submit", saveStock);
  document
    .getElementById("inventoryRows")
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
}

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
