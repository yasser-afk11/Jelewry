// Mobile Navigation Toggle
const mobileToggle = document.querySelector(".mobile-toggle");
const nav = document.querySelector("nav");

mobileToggle.addEventListener("click", () => {
  nav.classList.toggle("active");
  mobileToggle.innerHTML = nav.classList.contains("active")
    ? '<i class="fas fa-times"></i>'
    : '<i class="fas fa-bars"></i>';
});

// Close mobile menu when clicking a link
document.querySelectorAll("nav a").forEach((link) => {
  link.addEventListener("click", () => {
    nav.classList.remove("active");
    mobileToggle.innerHTML = '<i class="fas fa-bars"></i>';
  });
});

// Header scroll effect
window.addEventListener("scroll", () => {
  const header = document.querySelector("header");
  if (window.scrollY > 50) {
    header.classList.add("scrolled");
  } else {
    header.classList.remove("scrolled");
  }
});

// Order Modal functionality
const modal = document.getElementById("orderModal");
const closeModal = document.querySelector(".close-modal");
const orderButtons = document.querySelectorAll(".order-btn");
const orderForm = document.getElementById("orderForm");
const phoneInput = document.getElementById("phone");
const phoneError = document.getElementById("phoneError");
const submitBtn = document.getElementById("submitBtn");
const productNameInput = document.getElementById("productName");
const modalTitle = document.getElementById("modalTitle");

// Open modal when clicking order buttons
orderButtons.forEach((button) => {
  button.addEventListener("click", (e) => {
    e.preventDefault();
    const productName = button.getAttribute("data-product");
    productNameInput.value = productName;
    modalTitle.textContent = `Order: ${productName}`;
    modal.style.display = "flex";

    // Clear form
    orderForm.reset();
    phoneError.style.display = "none";
    submitBtn.disabled = false;
    submitBtn.textContent = "Place Order";
  });
});

// Close modal
closeModal.addEventListener("click", () => {
  modal.style.display = "none";
});

// Close modal when clicking outside
window.addEventListener("click", (e) => {
  if (e.target === modal) {
    modal.style.display = "none";
  }
});

// Validate phone number format
phoneInput.addEventListener("input", () => {
  const phoneValue = phoneInput.value.trim();

  if (phoneValue.startsWith("+212")) {
    phoneError.style.display = "none";
    submitBtn.disabled = false;
  } else {
    phoneError.style.display = "block";
    submitBtn.disabled = true;
  }
});

// FORM SUBMISSION
orderForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const name = document.getElementById("name").value.trim();
  const phone = phoneInput.value.trim();
  const product = productNameInput.value;
  const timestamp = new Date().toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  // Final validation
  if (!phone.startsWith("+212")) {
    phoneError.style.display = "block";
    return;
  }

  if (!name || !phone || !product) {
    alert("Please fill in all fields");
    return;
  }

  // Disable submit button and show loading
  submitBtn.disabled = true;
  submitBtn.textContent = "Processing...";

  // Save order to localStorage
  saveOrderToStorage(name, phone, product, timestamp);

  // Show success message to customer
  alert(
    `✅ Thank you ${name}! Your order for "${product}" has been received.\nWe will contact you at ${phone} within 24 hours.`
  );

  // Reset form and close modal
  orderForm.reset();
  modal.style.display = "none";
  submitBtn.textContent = "Place Order";
  submitBtn.disabled = false;
});

// Function to save order to localStorage
function saveOrderToStorage(name, phone, product, timestamp) {
  try {
    // Get existing orders from localStorage
    const orders = JSON.parse(localStorage.getItem("jewelryOrders") || "[]");

    // Add new order
    const newOrder = {
      timestamp: timestamp,
      name: name,
      phone: phone,
      product: product,
      status: "New",
    };

    orders.push(newOrder);

    // Save back to localStorage
    localStorage.setItem("jewelryOrders", JSON.stringify(orders));

    console.log(`Order saved. Total: ${orders.length}`);

    return newOrder;
  } catch (error) {
    console.error("Error saving:", error);
    return null;
  }
}





// 🔐 SECURE ADMIN SYSTEM





// ✅ YOUR PASSWORD
const ADMIN_PASSWORD = "Od6YnBDhUPS4fKrnykBHTF6zlQ02Sdh9D4zFBPfya7kO";
let isAdminAuthenticated = false;

// ✅ COMMAND 1: Open Admin
function openAdmin() {
  if (isAdminAuthenticated) {
    showAdminMenu();
    return;
  }

  // Ask for password
  const password = prompt("Enter admin password:");

  if (password === ADMIN_PASSWORD) {
    isAdminAuthenticated = true;
    console.log("%c✅ Admin access granted!", "color: green; font-size: 16px;");
    showAdminMenu();
  } else {
    console.log("%c❌ Access denied!", "color: red; font-size: 16px;");
    alert("Incorrect password!");
  }
}

// Show admin menu after authentication
function showAdminMenu() {
  console.clear();
  console.log(
    "%c🔐 ADMIN PANEL - JEWELRY ORDERS",
    "color: #7c6f5a; font-size: 18px; font-weight: bold;"
  );
  console.log("=========================================");
  console.log("Available commands:");
  console.log("1. viewOrders()    - View all orders");
  console.log("2. downloadCSV()   - Download orders as CSV");
  console.log("3. clearOrders()   - Delete all orders");
  console.log("4. logoutAdmin()   - Logout from admin");
  console.log("=========================================");
}

// ✅ COMMAND 2: View all orders
function viewOrders() {
  if (!checkAdmin()) return;

  const orders = JSON.parse(localStorage.getItem("jewelryOrders") || "[]");

  console.clear();
  console.log(
    "%c📊 ALL ORDERS",
    "color: #7c6f5a; font-size: 16px; font-weight: bold;"
  );
  console.log(`📈 Total Orders: ${orders.length}`);
  console.log("================================");

  if (orders.length === 0) {
    console.log("%cNo orders yet.", "color: #666;");
    return;
  }

  // Display as table
  console.table(orders);

  // Also show CSV format
  console.log(
    "%c📋 CSV Format (ready to copy):",
    "color: #666; font-weight: bold;"
  );
  console.log("Timestamp,Name,Phone,Product,Status");
  orders.forEach((order, index) => {
    console.log(
      `"${order.timestamp}","${order.name}","${order.phone}","${order.product}","${order.status}"`
    );
  });
}

// ✅ COMMAND 3: Download CSV
function downloadCSV() {
  if (!checkAdmin()) return;

  try {
    const orders = JSON.parse(localStorage.getItem("jewelryOrders") || "[]");

    if (orders.length === 0) {
      alert("No orders found.");
      return;
    }

    // Create CSV
    let csv = "Timestamp,Name,Phone,Product,Status\n";

    orders.forEach((order) => {
      csv += `"${order.timestamp}","${order.name}","${order.phone}","${order.product}","${order.status}"\n`;
    });

    // Download
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const filename = `jewelry-orders-${
      new Date().toISOString().split("T")[0]
    }.csv`;

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    console.log(
      `%c✅ Downloaded ${orders.length} orders as: ${filename}`,
      "color: green; font-weight: bold;"
    );
    alert(`✅ Downloaded ${orders.length} orders!\nFile: ${filename}`);
  } catch (error) {
    console.error("Error:", error);
    alert("Error downloading CSV.");
  }
}

// ✅ COMMAND 4: Clear all orders
function clearOrders() {
  if (!checkAdmin()) return;

  const orders = JSON.parse(localStorage.getItem("jewelryOrders") || "[]");

  if (orders.length === 0) {
    alert("No orders to clear.");
    return;
  }

  if (
    confirm(
      `⚠️ WARNING: This will delete ALL ${orders.length} orders.\n\nThis action cannot be undone!`
    )
  ) {
    localStorage.removeItem("jewelryOrders");
    console.log(
      "%c🗑️ All orders cleared.",
      "color: orange; font-weight: bold;"
    );
    alert(`✅ All ${orders.length} orders have been permanently deleted.`);
  }
}

// ✅ COMMAND 5: Logout
function logoutAdmin() {
  isAdminAuthenticated = false;
  console.log("%c👋 Admin logged out", "color: #666;");
  console.log("Type 'openAdmin()' to login again");
}

// Check if admin is authenticated
function checkAdmin() {
  if (!isAdminAuthenticated) {
    console.log(
      "%c🔒 Authentication required!",
      "color: red; font-weight: bold;"
    );
    console.log("Type: openAdmin() to login");
    return false;
  }
  return true;
}

// Secret keyboard shortcut: Ctrl+Shift+J to open admin
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.shiftKey && e.key === "J") {
    e.preventDefault();
    openAdmin();
  }
});

// Show help message in console
console.log(
  "%c💎 JEWELRY STORE ADMIN",
  "color: #7c6f5a; font-size: 16px; font-weight: bold;"
);
console.log("Type 'openAdmin()' in console and use password");
console.log("Shortcut: Ctrl+Shift+J");
console.log("==============================================");

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", function (e) {
    if (this.classList.contains("order-btn")) return;

    e.preventDefault();

    const targetId = this.getAttribute("href");
    if (targetId === "#") return;

    const targetElement = document.querySelector(targetId);
    if (targetElement) {
      window.scrollTo({
        top: targetElement.offsetTop - 80,
        behavior: "smooth",
      });
    }
  });
});
