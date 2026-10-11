# How to explain the frontend

## Start with these three sentences

“HTML creates the page structure, CSS controls its appearance, and JavaScript handles button clicks, forms and backend requests. Each role has a separate page with its own CSS and JavaScript. FastAPI checks the login credentials and permissions, and SQLite stores users and products.”

## Files to open

| Page | HTML: page structure | CSS: design | JavaScript: behaviour |
| --- | --- | --- | --- |
| Login and signup | frontend/index.html | frontend/index.css | frontend/index.js |
| Admin | frontend/admin.html | frontend/admin.css | frontend/admin.js |
| Super admin | frontend/super_admin.html | frontend/super_admin.css | frontend/super_admin.js |
| Employee | frontend/employee.html | frontend/employee.css | frontend/employee.js |

Every HTML page links only to its own CSS and JavaScript. No shared dashboard page or redirect wrapper is needed. Common functions are repeated in each role's script so you can read and explain a page independently. If you change a common feature, update all three dashboard scripts.

## Login: explain index.js first

1. `showLoginForm()` and `showRegisterForm()` show one form and hide the other.
2. `login(event)` stops the normal form reload with `event.preventDefault()`.
3. It reads the email and password from the form inputs.
4. `sendLoginRequest()` sends the data to `/login` using `fetch()`.
5. The backend verifies the password and sets a session cookie.
6. `openRoleDashboard()` uses the returned role to open `admin.html`, `super_admin.html` or `employee.html`.
7. `register(event)` checks matching passwords and sends the signup data to `/register`. New accounts are employees; the super admin assigns other roles.

## Dashboard: explain the numbered sections in the JS file

| Function | What it does |
| --- | --- |
| `initializePage()` | Loads `/me`, checks the saved role, shows the user's name and starts loading products |
| `sendRequest()` | Sends an API request and handles backend error messages |
| `openMenu()` / `closeMenu()` | Opens or closes the hidden hamburger navigation |
| `showSection()` | Shows overview, products, low stock or high stock; super admin also has team members |
| `loadProducts()` | Gets the product array from `/products` |
| `fillCategoryFilter()` | Builds category options from the loaded products |
| `getFilteredProducts()` | Checks search text, category and stock level, then sorts the matches |
| `displayProducts()` | Builds table rows and displays eight products per page |
| `updateDashboard()` | Calculates total products, stock, inventory value and stock health |
| `openStockForm()` / `saveStock()` | Opens the stock dialog and sends a quantity change to the backend |
| `openProductForm()` / `saveProduct()` | Adds or edits products; present in admin and super admin scripts |
| `askDeleteProduct()` | Asks for confirmation, then deletes a product; admin and super admin only |
| `loadUsers()` / `handleRoleChange()` | Lists team members and changes their roles; super admin only |
| `askConfirmation()` / `runConfirmedAction()` | Waits for confirmation before performing a change |
| `exportProducts()` | Downloads the filtered inventory as CSV |
| `setupEvents()` | Connects buttons and forms to their functions using `addEventListener()` |

## Example: explain adding a product

“The Add product button calls `openProductForm()`. When I submit the form, `saveProduct()` reads the five fields and sends a POST request to `/products`. FastAPI verifies administrator access, validates the fields and inserts the product into SQLite. The frontend calls `loadProducts()` again, which updates the table and dashboard cards.”

For editing, the same form is filled with an existing product and sends PUT to `/products/{id}`. Deleting sends DELETE after confirmation. Stock adjustments send PATCH to `/products/{id}/quantity`.

## JavaScript words used in this project

| Code | Meaning |
| --- | --- |
| `document.getElementById("productName")` | Find an HTML element using its ID |
| `.value` | Read or set an input's value |
| `.textContent` | Set plain text inside an element |
| `.innerHTML` | Add HTML such as table rows |
| `.hidden` | Show or hide an element |
| `addEventListener("click", functionName)` | Run a function when a button is clicked |
| `event.preventDefault()` | Stop the browser's normal form submission reload |
| `async` / `await` | Work with a request that takes time; wait for its result |
| `fetch()` | Call a backend endpoint |
| `JSON.stringify(data)` | Convert an object to JSON for the request |
| `response.json()` | Convert the backend's JSON response into JavaScript data |
| `try` / `catch` / `finally` | Run a task, handle errors and restore the button state |
| `for ... of` | Process every item in an array |
| `data-id` / `dataset.id` | Store and read the product ID attached to a button |
| `escapeHTML()` | Safely display user-entered text inside generated HTML |

## CSS explanation

The CSS files use numbered comments. Start with theme colors and basic rules, then the top bar, cards, stock health, tables, drawer and dialogs. `display: grid` arranges cards and `display: flex` aligns controls. The `@media` rules adjust the layout for smaller screens. The navigation is hidden by default and JavaScript controls when it opens.

## Roles and security

The employee page contains stock management functions. The admin page also contains product CRUD functions. The super admin page additionally contains user management functions. The backend checks permissions on every request; hiding a frontend button alone does not secure an endpoint.

## Demonstration order

1. Run `npm run dev` from the project root.
2. Open http://127.0.0.1:8000/app/.
3. Explain index.html, index.css and index.js.
4. Sign in and demonstrate the hamburger menu.
5. Explain the summary cards, search and category filters.
6. Show an appropriate action for the current role.
7. Open that role's JS file and trace the named functions.
8. Show how the API endpoint updates backend/users.db.
