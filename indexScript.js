// Mobile Navigation Toggle
const mobileToggle = document.querySelector('.mobile-toggle');
const nav = document.querySelector('nav');

mobileToggle.addEventListener('click', () => {
    nav.classList.toggle('active');
    mobileToggle.innerHTML = nav.classList.contains('active') 
        ? '<i class="fas fa-times"></i>' 
        : '<i class="fas fa-bars"></i>';
});

// Navigation links
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

// Modal elements
const modal = document.getElementById('orderModal');
const closeModal = document.querySelector('.close-modal');
const orderButtons = document.querySelectorAll('.order-btn');
const orderForm = document.getElementById('orderForm');
const phoneInput = document.getElementById('phone');
const phoneError = document.getElementById('phoneError');
const submitBtn = document.getElementById('submitBtn');
const productNameInput = document.getElementById('productName');
const modalTitle = document.getElementById('modalTitle');

// Open modal
orderButtons.forEach(button => {
    button.addEventListener('click', (e) => {
        e.preventDefault();
        const productName = button.getAttribute('data-product');
        productNameInput.value = productName;
        modalTitle.textContent = `Order: ${productName}`;
        modal.style.display = 'flex';
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

window.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.style.display = 'none';
    }
});

// Phone validation
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

// ========== SIMPLE SUPABASE SUBMISSION ==========
const SUPABASE_URL = "https://pqwywqjrqxbqjdoadzct.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxd3l3cWpycXhicWpkb2FkemN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2OTQ5MzYsImV4cCI6MjA4MjI3MDkzNn0.OXNKTNj8ru8hNphmZZOs9wuMjA64jNPMO4Grt-JPUHc";

// Wait for Supabase to load
function initApp() {
    if (typeof supabase === 'undefined') {
        console.log('Waiting for Supabase...');
        setTimeout(initApp, 100);
        return;
    }
    
    console.log('✅ Supabase loaded');
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    
    // Form submission
    orderForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('name').value.trim();
        const phone = phoneInput.value.trim();
        const product = productNameInput.value;
        
        if (!phone.startsWith('+212')) {
            phoneError.style.display = 'block';
            return;
        }
        
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';
        
        try {
            console.log('Submitting to Supabase...', { name, phone, product });
            
            const { data, error } = await supabaseClient
                .from('orders')
                .insert([{
                    customer_name: name,
                    customer_phone: phone,
                    product_name: product,
                    status: 'new'
                }]);
            
            if (error) {
                console.error('Supabase error:', error);
                alert(`❌ Error: ${error.message}`);
            } else {
                console.log('✅ Order saved:', data);
                alert(`✅ Thank you ${name}! Order saved.`);
            }
        } catch (error) {
            console.error('Network error:', error);
            alert('❌ Network error. Please try again.');
        } finally {
            orderForm.reset();
            modal.style.display = 'none';
            submitBtn.textContent = 'Place Order';
            submitBtn.disabled = false;
        }
    });
    
    console.log('✅ App initialized');
}

// Start the app
initApp();

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
