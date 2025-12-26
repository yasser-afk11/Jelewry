// Mobile Navigation Toggle
const mobileToggle = document.querySelector('.mobile-toggle');
const nav = document.querySelector('nav');

mobileToggle.addEventListener('click', () => {
    nav.classList.toggle('active');
    mobileToggle.innerHTML = nav.classList.contains('active') 
        ? '<i class="fas fa-times"></i>' 
        : '<i class="fas fa-bars"></i>';
});

// Close mobile menu when clicking a link
document.querySelectorAll('nav a').forEach(link => {
    link.addEventListener('click', () => {
        nav.classList.remove('active');
        mobileToggle.innerHTML = '<i class="fas fa-bars"></i>';
    });
});

// Header scroll effect
window.addEventListener('scroll', () => {
    const header = document.querySelector('header');
    if (window.scrollY > 50) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
});

// Order Modal functionality
const modal = document.getElementById('orderModal');
const closeModal = document.querySelector('.close-modal');
const orderButtons = document.querySelectorAll('.order-btn');
const orderForm = document.getElementById('orderForm');
const phoneInput = document.getElementById('phone');
const phoneError = document.getElementById('phoneError');
const submitBtn = document.getElementById('submitBtn');
const productNameInput = document.getElementById('productName');
const modalTitle = document.getElementById('modalTitle');

// Open modal when clicking order buttons
orderButtons.forEach(button => {
    button.addEventListener('click', (e) => {
        e.preventDefault();
        const productName = button.getAttribute('data-product');
        productNameInput.value = productName;
        modalTitle.textContent = `Order: ${productName}`;
        modal.style.display = 'flex';
        
        // Clear form
        orderForm.reset();
        phoneError.style.display = 'none';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Place Order';
    });
});

// Close modal
closeModal.addEventListener('click', () => {
    modal.style.display = 'none';
});

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.style.display = 'none';
    }
});

// Validate phone number format
phoneInput.addEventListener('input', () => {
    const phoneValue = phoneInput.value.trim();
    
    if (phoneValue.startsWith('+212')) {
        phoneError.style.display = 'none';
        submitBtn.disabled = false;
    } else {
        phoneError.style.display = 'block';
        submitBtn.disabled = true;
    }
});

// ========== SUPABASE SETUP ==========
const SUPABASE_URL = "https://pqwywqjrqxbqjdoadzct.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxd3l3cWpycXhicWpkb2FkemN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2OTQ5MzYsImV4cCI6MjA4MjI3MDkzNn0.OXNKTNj8ru8hNphmZZOs9wuMjA64jNPMO4Grt-JPUHc";

// ✅ CREATE SUPABASE CLIENT
let supabaseClient;
try {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log("✅ Supabase client created successfully");
    // Make available globally for testing
    window.sbClient = supabaseClient;
} catch (error) {
    console.error("❌ Failed to create Supabase client:", error);
}

// ========== FORM SUBMISSION ==========
orderForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('name').value.trim();
    const phone = phoneInput.value.trim();
    const product = productNameInput.value;
    
    // Validation
    if (!phone.startsWith('+212')) {
        phoneError.style.display = 'block';
        return;
    }
    
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving Order...';
    
    try {
        // ✅ Use supabaseClient (not supabase)
        const { data, error } = await supabaseClient
            .from('orders')
            .insert([
                {
                    customer_name: name,
                    customer_phone: phone,
                    product_name: product,
                    status: 'new'
                }
            ]);
        
        if (error) throw error;
        
        alert(`✅ Thank you ${name}! Order for "${product}" saved.\nWe'll contact you at ${phone} within 24h.`);
        
    } catch (error) {
        console.error('Supabase error:', error);
        alert(`✅ Thank you ${name}! Order received.`);
    } finally {
        orderForm.reset();
        modal.style.display = 'none';
        submitBtn.textContent = 'Place Order';
        submitBtn.disabled = false;
    }
});

// ========== ADMIN SYSTEM ==========
const ADMIN_PASSWORD = "Od6YnBDhUPS4fKrnykBHTF6zlQ02Sdh9D4zFBPfya7kO";
let isAdmin = false;

// Command 1: Open Admin
async function openAdmin() {
    if (isAdmin) {
        showAdminMenu();
        return;
    }
    
    const password = prompt("Admin Password:");
    if (password === ADMIN_PASSWORD) {
        isAdmin = true;
        console.log("%c✅ ADMIN ACCESS GRANTED", "color: green; font-size: 16px;");
        showAdminMenu();
    } else {
        console.log("%c❌ ACCESS DENIED", "color: red;");
        alert("Wrong password!");
    }
}

// Show admin menu
async function showAdminMenu() {
    console.clear();
    console.log("%c🔐 JEWELRY ORDERS ADMIN", "color: #7c6f5a; font-size: 18px;");
    console.log("========================");
    console.log("Commands:");
    console.log("1. viewOrders()");
    console.log("2. downloadCSV()");
    console.log("3. clearOrders()");
    console.log("4. logoutAdmin()");
    console.log("========================");
}

// Command 2: View orders
async function viewOrders() {
    if (!checkAdmin()) return;
    
    try {
        // ✅ Use supabaseClient
        const { data: orders, error } = await supabaseClient
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        console.clear();
        console.log("%c📊 ORDERS", "color: #7c6f5a; font-size: 16px;");
        console.log(`Total: ${orders.length}`);
        
        if (orders.length === 0) {
            console.log("No orders");
            return;
        }
        
        console.table(orders.map(o => ({
            ID: o.id,
            Date: new Date(o.created_at).toLocaleString(),
            Name: o.customer_name,
            Phone: o.customer_phone,
            Product: o.product_name,
            Status: o.status
        })));
        
    } catch (error) {
        console.error("Error:", error);
    }
}

// Command 3: Download CSV
async function downloadCSV() {
    if (!checkAdmin()) return;
    
    try {
        // ✅ Use supabaseClient
        const { data: orders, error } = await supabaseClient
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        if (!orders.length) {
            alert("No orders");
            return;
        }
        
        let csv = "ID,Date,Name,Phone,Product,Status\n";
        orders.forEach(o => {
            csv += `${o.id},"${new Date(o.created_at).toLocaleString()}","${o.customer_name}","${o.customer_phone}","${o.product_name}","${o.status}"\n`;
        });
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `orders-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        
        console.log(`✅ Downloaded ${orders.length} orders`);
        alert(`Downloaded ${orders.length} orders`);
        
    } catch (error) {
        console.error("Error:", error);
        alert("Download failed");
    }
}

// Command 4: Clear orders
async function clearOrders() {
    if (!checkAdmin()) return;
    
    if (!confirm("⚠️ DELETE ALL ORDERS?")) return;
    
    try {
        // ✅ Use supabaseClient
        const { error } = await supabaseClient
            .from('orders')
            .delete()
            .neq('id', 0);
        
        if (error) throw error;
        
        console.log("%c🗑️ All orders deleted", "color: orange;");
        alert("All orders deleted");
        
    } catch (error) {
        console.error("Error:", error);
        alert("Delete failed");
    }
}

// Command 5: Logout
function logoutAdmin() {
    isAdmin = false;
    console.log("%c👋 Logged out", "color: #666;");
}

// Check admin
function checkAdmin() {
    if (!isAdmin) {
        console.log("%c🔒 Login: openAdmin()", "color: red;");
        return false;
    }
    return true;
}

// Keyboard shortcut
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'J') {
        e.preventDefault();
        openAdmin();
    }
});

console.log('💎 Jewelry Store Ready');
console.log('Type "openAdmin()" to login');

// Smooth scrolling
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        if (this.classList.contains('order-btn')) return;
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            window.scrollTo({
                top: target.offsetTop - 80,
                behavior: 'smooth'
            });
        }
    });
});
