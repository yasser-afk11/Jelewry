// ========== CONFIGURATION ==========
const SUPABASE_URL = "https://pqwywqjrqxbqjdoadzct.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxd3l3cWpycXhicWpkb2FkemN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2OTQ5MzYsImV4cCI6MjA4MjI3MDkzNn0.OXNKTNj8ru8hNphmZZOs9wuMjA64jNPMO4Grt-JPUHc";

// ========== DOM ELEMENTS ==========
const mobileToggle = document.querySelector('.mobile-toggle');
const nav = document.querySelector('nav');
const header = document.querySelector('header');
const modal = document.getElementById('orderModal');
const closeModal = document.querySelector('.close-modal');
const orderButtons = document.querySelectorAll('.order-btn');
const orderForm = document.getElementById('orderForm');
const phoneInput = document.getElementById('phone');
const phoneError = document.getElementById('phoneError');
const submitBtn = document.getElementById('submitBtn');
const productNameInput = document.getElementById('productName');
const modalTitle = document.getElementById('modalTitle');

// ========== HELPER FUNCTIONS ==========
function isValidMoroccanPhone(phone) {
    // Format: +212 followed by 9 digits
    return /^\+212[0-9]{9}$/.test(phone.trim());
}

function showLoading(button, text = 'Saving...') {
    button.disabled = true;
    button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${text}`;
}

function resetButton(button, text = 'Place Order') {
    button.disabled = false;
    button.textContent = text;
}

function showError(element, message) {
    element.textContent = message;
    element.style.display = 'block';
    element.style.color = '#e74c3c';
}

function hideError(element) {
    element.style.display = 'none';
}

// ========== MOBILE NAVIGATION ==========
function initMobileNavigation() {
    if (!mobileToggle || !nav) return;
    
    mobileToggle.addEventListener('click', () => {
        const isActive = nav.classList.toggle('active');
        mobileToggle.innerHTML = isActive 
            ? '<i class="fas fa-times"></i>' 
            : '<i class="fas fa-bars"></i>';
        mobileToggle.setAttribute('aria-expanded', isActive);
    });
    
    // Close mobile menu when clicking links
    document.querySelectorAll('nav a').forEach(link => {
        link.addEventListener('click', () => {
            nav.classList.remove('active');
            mobileToggle.innerHTML = '<i class="fas fa-bars"></i>';
            mobileToggle.setAttribute('aria-expanded', 'false');
        });
    });
}

// ========== HEADER SCROLL EFFECT ==========
function initHeaderScroll() {
    if (!header) return;
    
    window.addEventListener('scroll', () => {
        header.classList.toggle('scrolled', window.scrollY > 50);
    });
}

// ========== MODAL MANAGEMENT ==========
function initModal() {
    if (!modal || !orderButtons.length) return;
    
    // Open modal
    orderButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const productName = button.getAttribute('data-product');
            productNameInput.value = productName;
            modalTitle.textContent = `Order: ${productName}`;
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden'; // Prevent background scroll
            orderForm.reset();
            hideError(phoneError);
            phoneInput.style.borderColor = '#ddd';
            resetButton(submitBtn, 'Place Order');
        });
    });
    
    // Close modal
    closeModal.addEventListener('click', closeModalHandler);
    window.addEventListener('click', (e) => {
        if (e.target === modal) closeModalHandler();
    });
    
    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display === 'flex') {
            closeModalHandler();
        }
    });
}

function closeModalHandler() {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// ========== FORM VALIDATION ==========
function initFormValidation() {
    if (!phoneInput) return;
    
    phoneInput.addEventListener('input', () => {
        const phoneValue = phoneInput.value;
        
        if (!phoneValue) {
            hideError(phoneError);
            phoneInput.style.borderColor = '#ddd';
            submitBtn.disabled = true;
            return;
        }
        
        if (isValidMoroccanPhone(phoneValue)) {
            hideError(phoneError);
            phoneInput.style.borderColor = '#4CAF50';
            submitBtn.disabled = false;
        } else {
            showError(phoneError, 'Phone must be: +212 followed by 9 digits (e.g., +212612345678)');
            phoneInput.style.borderColor = '#e74c3c';
            submitBtn.disabled = true;
        }
    });
    
    // Prevent form submission on Enter key in input fields
    orderForm.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
            e.preventDefault();
        }
    });
}

// ========== FORM SUBMISSION ==========
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const name = document.getElementById('name').value.trim();
    const phone = phoneInput.value.trim();
    const product = productNameInput.value;
    
    // Final validation
    if (!name || !phone || !product) {
        alert('Please fill all fields');
        return;
    }
    
    if (!isValidMoroccanPhone(phone)) {
        showError(phoneError, 'Invalid phone format. Must be: +212XXXXXXXXX');
        phoneInput.style.borderColor = '#e74c3c';
        return;
    }
    
    showLoading(submitBtn);
    
    try {
        // Check if Supabase is available
        if (typeof supabase === 'undefined') {
            throw new Error('Database service is temporarily unavailable');
        }
        
        const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        
        const { data, error } = await supabaseClient
            .from('orders')
            .insert([{
                customer_name: name,
                customer_phone: phone,
                product_name: product,
                status: 'new',
                created_at: new Date().toISOString()
            }])
            .select();
        
        if (error) throw error;
        
        // Success
        console.log('✅ Order saved:', data);
        alert(`✅ Thank you ${name}! Your order for "${product}" has been received. We'll contact you at ${phone} within 24 hours.`);
        
        // Reset and close
        orderForm.reset();
        closeModalHandler();
        
        // Optional: Play success sound or show confetti
        // new Audio('success.mp3').play().catch(() => {});
        
    } catch (error) {
        console.error('❌ Order submission error:', error);
        
        // Fallback: Save to localStorage if Supabase fails
        try {
            const orders = JSON.parse(localStorage.getItem('pending_orders') || '[]');
            orders.push({
                name,
                phone,
                product,
                timestamp: new Date().toISOString()
            });
            localStorage.setItem('pending_orders', JSON.stringify(orders));
            
            alert(`⚠️ Order saved offline. We'll process it when connection is restored.`);
            console.log('Order saved to localStorage:', orders);
        } catch (localError) {
            alert(`❌ Error: ${error.message}. Please try again or contact hello@elenajewelry.com`);
        }
        
    } finally {
        resetButton(submitBtn, 'Place Order');
    }
}

// ========== SMOOTH SCROLLING ==========
function initSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            // Skip order buttons
            if (this.classList.contains('order-btn')) return;
            
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const target = document.querySelector(targetId);
            if (target) {
                const headerHeight = header ? header.offsetHeight : 80;
                const targetPosition = target.offsetTop - headerHeight;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
                
                // Update URL hash without scrolling
                history.pushState(null, null, targetId);
            }
        });
    });
}

// ========== SUPABASE INITIALIZATION ==========
async function initSupabase() {
    // Check if Supabase script is loaded
    if (typeof supabase === 'undefined') {
        console.warn('Supabase not loaded, using fallback mode');
        
        // Load Supabase dynamically if not present
        try {
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
            console.log('✅ Supabase loaded dynamically');
        } catch (error) {
            console.log('❌ Supabase failed to load, using offline mode');
        }
    }
}

// ========== INITIALIZE EVERYTHING ==========
async function initApp() {
    console.log('🚀 Initializing Elena Jewelry Website...');
    
    // Initialize all features
    initMobileNavigation();
    initHeaderScroll();
    initModal();
    initFormValidation();
    initSmoothScrolling();
    
    // Setup form submission
    if (orderForm) {
        orderForm.addEventListener('submit', handleFormSubmit);
    }
    
    // Initialize Supabase (non-blocking)
    initSupabase().then(() => {
        console.log('✅ Supabase ready');
    }).catch(error => {
        console.warn('⚠️ Supabase initialization failed:', error);
    });
    
    // Set current year in footer if needed
    const yearSpan = document.querySelector('footer p');
    if (yearSpan) {
        yearSpan.innerHTML = yearSpan.innerHTML.replace('2023', new Date().getFullYear());
    }
    
    console.log('✅ Website initialized successfully');
}

// ========== START THE APP ==========
// Wait for DOM to be fully loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// Make functions available globally if needed (for debugging)
window.ElenaJewelry = {
    isValidMoroccanPhone,
    initApp,
    submitOrder: handleFormSubmit
};
