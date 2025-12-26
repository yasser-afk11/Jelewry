// ========== CONFIGURATION ==========
// IMPORTANT: These should ideally be in environment variables
// For static sites, we'll use these with proper security measures
const SUPABASE_URL = "https://pqwywqjrqxbqjdoadzct.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxd3l3cWpycXhicWpkb2FkemN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2OTQ5MzYsImV4cCI6MjA4MjI3MDkzNn0.OXNKTNj8ru8hNphmZZOs9wuMjA64jNPMO4Grt-JPUHc";

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 30000; // 30 seconds
const MAX_ORDERS_PER_WINDOW = 3;

// ========== DOM ELEMENTS ==========
let mobileToggle, nav, header, modal, closeModal, orderButtons, orderForm;
let phoneInput, phoneError, submitBtn, productNameInput, modalTitle, honeypotInput;

// ========== SECURITY & VALIDATION FUNCTIONS ==========
function sanitizeInput(input, maxLength = 255) {
    if (typeof input !== 'string') return '';
    return input
        .trim()
        .slice(0, maxLength)
        .replace(/[<>"'`;]/g, '') // Remove dangerous characters
        .replace(/\s+/g, ' '); // Normalize whitespace
}

function isValidMoroccanPhone(phone) {
    // Strict validation: +212 followed by exactly 9 digits
    return /^\+212[0-9]{9}$/.test(phone.trim());
}

function isValidName(name) {
    const trimmed = name.trim();
    return trimmed.length >= 2 && 
           trimmed.length <= 100 && 
           /^[a-zA-Z\u0600-\u06FF\s\-'.]+$/.test(trimmed); // Allows Arabic & Latin chars
}

function generateOrderId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 6);
    return `ELENA-${timestamp}-${random}`.toUpperCase();
}

function checkRateLimit() {
    try {
        const now = Date.now();
        const orders = JSON.parse(localStorage.getItem('order_attempts') || '[]');
        
        // Remove old attempts
        const recentOrders = orders.filter(time => now - time < RATE_LIMIT_WINDOW);
        
        if (recentOrders.length >= MAX_ORDERS_PER_WINDOW) {
            const oldest = recentOrders[0];
            const waitTime = Math.ceil((oldest + RATE_LIMIT_WINDOW - now) / 1000);
            return {
                allowed: false,
                message: `Too many orders. Please wait ${waitTime} seconds.`
            };
        }
        
        // Add current attempt
        recentOrders.push(now);
        localStorage.setItem('order_attempts', JSON.stringify(recentOrders));
        
        return { allowed: true };
    } catch (error) {
        console.warn('Rate limit check failed:', error);
        return { allowed: true }; // Fail open for UX
    }
}

function checkHoneypot() {
    if (!honeypotInput) return true;
    return honeypotInput.value === '' || honeypotInput.value === 'https://';
}

// ========== SUPABASE CLIENT MANAGEMENT ==========
let supabaseClient = null;
let supabaseReady = false;
let supabaseRetries = 0;
const MAX_SUPABASE_RETRIES = 3;

async function initializeSupabase() {
    if (supabaseReady && supabaseClient) return supabaseClient;
    
    try {
        // Check if Supabase is already loaded
        if (typeof supabase === 'undefined') {
            // Load dynamically
            await new Promise((resolve, reject) => {
                if (supabaseRetries >= MAX_SUPABASE_RETRIES) {
                    reject(new Error('Max retries reached'));
                    return;
                }
                
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
                script.onload = resolve;
                script.onerror = () => {
                    supabaseRetries++;
                    reject(new Error('Failed to load Supabase'));
                };
                document.head.appendChild(script);
            });
        }
        
        // Create client with enhanced configuration
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
                detectSessionInUrl: false
            },
            global: {
                headers: {
                    'X-Client-Info': 'elena-jewelry-v1.0'
                }
            }
        });
        
        // Test connection
        const { error } = await supabaseClient
            .from('orders')
            .select('count', { count: 'exact', head: true })
            .limit(1);
            
        if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned" which is fine
            throw error;
        }
        
        supabaseReady = true;
        console.log('✅ Supabase initialized successfully');
        return supabaseClient;
        
    } catch (error) {
        console.error('❌ Supabase initialization failed:', error);
        supabaseReady = false;
        supabaseClient = null;
        return null;
    }
}

async function saveOrderToSupabase(orderData) {
    if (!supabaseReady) {
        const client = await initializeSupabase();
        if (!client) throw new Error('Database unavailable');
    }
    
    try {
        const { data, error } = await supabaseClient
            .from('orders')
            .insert([{
                id: orderData.id,
                customer_name: orderData.name,
                customer_phone: orderData.phone,
                product_name: orderData.product,
                status: 'pending',
                ip_address: await getClientIP(),
                user_agent: navigator.userAgent,
                created_at: new Date().toISOString(),
                metadata: {
                    browser_language: navigator.language,
                    screen_resolution: `${window.screen.width}x${window.screen.height}`,
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
                }
            }])
            .select()
            .single();
            
        if (error) throw error;
        return { success: true, data };
        
    } catch (error) {
        console.error('Supabase save error:', error);
        return { 
            success: false, 
            error: error.message,
            code: error.code
        };
    }
}

async function getClientIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        return 'unknown';
    }
}

function saveOrderToLocalStorage(orderData) {
    try {
        const pendingOrders = JSON.parse(localStorage.getItem('pending_orders') || '[]');
        pendingOrders.push({
            ...orderData,
            saved_at: new Date().toISOString(),
            retry_count: 0
        });
        localStorage.setItem('pending_orders', JSON.stringify(pendingOrders));
        localStorage.setItem('last_offline_save', Date.now());
        return true;
    } catch (error) {
        console.error('Local storage save failed:', error);
        return false;
    }
}

async function retryPendingOrders() {
    if (!supabaseReady) return;
    
    try {
        const pendingOrders = JSON.parse(localStorage.getItem('pending_orders') || '[]');
        if (pendingOrders.length === 0) return;
        
        const successful = [];
        const failed = [];
        
        for (const order of pendingOrders) {
            if (order.retry_count >= 3) {
                failed.push(order);
                continue;
            }
            
            const result = await saveOrderToSupabase(order);
            if (result.success) {
                successful.push(order.id);
            } else {
                order.retry_count = (order.retry_count || 0) + 1;
                failed.push(order);
            }
            
            // Small delay between retries
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Update localStorage
        localStorage.setItem('pending_orders', JSON.stringify(failed));
        
        if (successful.length > 0) {
            console.log(`✅ Retried ${successful.length} pending orders`);
        }
        
    } catch (error) {
        console.error('Order retry failed:', error);
    }
}

// ========== FORM HANDLING ==========
function showLoading(button, text = 'Processing...') {
    button.disabled = true;
    button.classList.add('loading');
    const originalText = button.textContent;
    button.dataset.originalText = originalText;
    button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${text}`;
}

function resetButton(button) {
    button.disabled = false;
    button.classList.remove('loading');
    const originalText = button.dataset.originalText || 'Place Order';
    button.textContent = originalText;
}

function showError(element, message) {
    element.textContent = message;
    element.style.display = 'block';
    setTimeout(() => {
        element.style.opacity = '1';
    }, 10);
}

function hideError(element) {
    element.style.opacity = '0';
    setTimeout(() => {
        element.style.display = 'none';
    }, 300);
}

function showSuccess(message, duration = 5000) {
    // Create success message element
    const successEl = document.createElement('div');
    successEl.className = 'success-message-global';
    successEl.innerHTML = `
        <div style="
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 15px 20px;
            border-radius: 5px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 2000;
            animation: slideIn 0.3s ease;
        ">
            <i class="fas fa-check-circle"></i> ${message}
        </div>
    `;
    document.body.appendChild(successEl);
    
    setTimeout(() => {
        successEl.remove();
    }, duration);
}

// ========== MODAL MANAGEMENT ==========
function initModal() {
    if (!modal || !orderButtons.length) return;
    
    // Add honeypot field to modal form if not exists
    if (!document.querySelector('.honeypot-field')) {
        const honeypotDiv = document.createElement('div');
        honeypotDiv.className = 'honeypot-field';
        honeypotDiv.style.cssText = 'opacity: 0; position: absolute; height: 0; overflow: hidden;';
        honeypotDiv.innerHTML = `
            <label for="website">Website</label>
            <input type="text" id="website" name="website" tabindex="-1" autocomplete="off" 
                   placeholder="https://" value="">
        `;
        orderForm.appendChild(honeypotDiv);
        honeypotInput = document.getElementById('website');
    }
    
    orderButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            
            const productName = button.getAttribute('data-product');
            const productPrice = button.closest('.collection-info')?.querySelector('.price')?.textContent || '';
            
            productNameInput.value = productName;
            modalTitle.textContent = `Order: ${productName}`;
            modalTitle.dataset.productPrice = productPrice;
            
            modal.style.display = 'flex';
            document.body.classList.add('modal-open');
            document.documentElement.style.overflow = 'hidden';
            
            orderForm.reset();
            hideError(phoneError);
            phoneInput.style.borderColor = '#ddd';
            resetButton(submitBtn);
            
            // Focus on name field for accessibility
            setTimeout(() => {
                document.getElementById('name').focus();
            }, 100);
        });
    });
    
    // Close modal handlers
    closeModal.addEventListener('click', closeModalHandler);
    window.addEventListener('click', (e) => {
        if (e.target === modal) closeModalHandler();
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display === 'flex') {
            closeModalHandler();
        }
    });
}

function closeModalHandler() {
    modal.style.display = 'none';
    document.body.classList.remove('modal-open');
    document.documentElement.style.overflow = '';
}

// ========== FORM VALIDATION ==========
function initFormValidation() {
    if (!phoneInput || !orderForm) return;
    
    // Real-time phone validation
    phoneInput.addEventListener('input', () => {
        const phoneValue = phoneInput.value;
        
        if (!phoneValue) {
            hideError(phoneError);
            phoneInput.style.borderColor = '#ddd';
            return;
        }
        
        if (isValidMoroccanPhone(phoneValue)) {
            hideError(phoneError);
            phoneInput.classList.remove('invalid');
            phoneInput.classList.add('valid');
        } else {
            showError(phoneError, 'Phone must be: +212 followed by 9 digits (e.g., +212612345678)');
            phoneInput.classList.remove('valid');
            phoneInput.classList.add('invalid');
        }
    });
    
    // Name validation
    const nameInput = document.getElementById('name');
    if (nameInput) {
        nameInput.addEventListener('input', () => {
            const nameValue = nameInput.value.trim();
            if (nameValue && !isValidName(nameValue)) {
                nameInput.classList.add('invalid');
            } else {
                nameInput.classList.remove('invalid');
            }
        });
    }
    
    // Form submission
    orderForm.addEventListener('submit', handleFormSubmit);
}

async function handleFormSubmit(e) {
    e.preventDefault();
    
    // 1. Check honeypot
    if (!checkHoneypot()) {
        console.log('Bot detected via honeypot');
        // Silently fail - don't alert bots
        orderForm.reset();
        closeModalHandler();
        return;
    }
    
    // 2. Rate limiting
    const rateLimit = checkRateLimit();
    if (!rateLimit.allowed) {
        alert(rateLimit.message);
        return;
    }
    
    // 3. Validate inputs
    const name = sanitizeInput(document.getElementById('name').value);
    const phone = phoneInput.value.trim();
    const product = productNameInput.value;
    
    if (!name || !phone || !product) {
        alert('Please fill all required fields.');
        return;
    }
    
    if (!isValidName(name)) {
        alert('Please enter a valid name (2-100 characters, letters and spaces only).');
        return;
    }
    
    if (!isValidMoroccanPhone(phone)) {
        showError(phoneError, 'Invalid phone format. Must be: +212 followed by 9 digits');
        phoneInput.classList.add('invalid');
        return;
    }
    
    // 4. Generate order ID
    const orderId = generateOrderId();
    
    // 5. Show loading state
    showLoading(submitBtn, 'Processing Order...');
    
    // 6. Prepare order data
    const orderData = {
        id: orderId,
        name: name,
        phone: phone,
        product: product,
        timestamp: Date.now()
    };
    
    try {
        // 7. Try to save to Supabase
        const supabaseResult = await saveOrderToSupabase(orderData);
        
        if (supabaseResult.success) {
            // Success!
            console.log('✅ Order saved to Supabase:', supabaseResult.data);
            
            // Show success message
            showSuccess(`Thank you ${name}! Order #${orderId} received. We'll contact you soon.`);
            
            // Reset and close
            setTimeout(() => {
                orderForm.reset();
                closeModalHandler();
                resetButton(submitBtn);
                
                // Optional: Play success sound
                try {
                    new Audio('https://assets.mixkit.co/sfx/preview/mixkit-correct-answer-tone-2870.mp3').play();
                } catch (e) {}
            }, 1000);
            
        } else {
            // Supabase failed, save locally
            console.warn('Supabase save failed, saving locally:', supabaseResult.error);
            
            const savedLocally = saveOrderToLocalStorage(orderData);
            
            if (savedLocally) {
                showSuccess(`Order saved offline (#${orderId}). We'll process it when connected.`);
                
                setTimeout(() => {
                    orderForm.reset();
                    closeModalHandler();
                    resetButton(submitBtn);
                }, 1500);
            } else {
                throw new Error('Failed to save order locally');
            }
        }
        
    } catch (error) {
        console.error('Order processing failed:', error);
        
        // Final fallback
        alert(`❌ Order processing failed. Please contact us directly at hello@elenajewelry.com with your order details.`);
        
        resetButton(submitBtn);
    }
}

// ========== OTHER INITIALIZATIONS ==========
function initMobileNavigation() {
    if (!mobileToggle || !nav) return;
    
    mobileToggle.addEventListener('click', () => {
        const isActive = nav.classList.toggle('active');
        mobileToggle.innerHTML = isActive 
            ? '<i class="fas fa-times"></i>' 
            : '<i class="fas fa-bars"></i>';
        mobileToggle.setAttribute('aria-expanded', isActive);
        document.body.classList.toggle('nav-open', isActive);
    });
    
    document.querySelectorAll('nav a').forEach(link => {
        link.addEventListener('click', () => {
            nav.classList.remove('active');
            mobileToggle.innerHTML = '<i class="fas fa-bars"></i>';
            mobileToggle.setAttribute('aria-expanded', 'false');
            document.body.classList.remove('nav-open');
        });
    });
}

function initHeaderScroll() {
    if (!header) return;
    window.addEventListener('scroll', () => {
        header.classList.toggle('scrolled', window.scrollY > 50);
    });
}

function initSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        if (anchor.classList.contains('order-btn')) return;
        
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const target = document.querySelector(targetId);
            if (target) {
                const headerHeight = header?.offsetHeight || 80;
                window.scrollTo({
                    top: target.offsetTop - headerHeight,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// ========== MAIN INITIALIZATION ==========
async function initApp() {
    console.log('🚀 Initializing Elena Jewelry Website...');
    
    // Cache DOM elements
    mobileToggle = document.querySelector('.mobile-toggle');
    nav = document.querySelector('nav');
    header = document.querySelector('header');
    modal = document.getElementById('orderModal');
    closeModal = document.querySelector('.close-modal');
    orderButtons = document.querySelectorAll('.order-btn');
    orderForm = document.getElementById('orderForm');
    phoneInput = document.getElementById('phone');
    phoneError = document.getElementById('phoneError');
    submitBtn = document.getElementById('submitBtn');
    productNameInput = document.getElementById('productName');
    modalTitle = document.getElementById('modalTitle');
    
    // Initialize features
    initMobileNavigation();
    initHeaderScroll();
    initModal();
    initFormValidation();
    initSmoothScrolling();
    
    // Initialize Supabase (non-blocking)
    initializeSupabase().then(client => {
        if (client) {
            // Retry any pending orders
            setTimeout(retryPendingOrders, 2000);
            
            // Set up periodic retry (every 5 minutes)
            setInterval(retryPendingOrders, 5 * 60 * 1000);
        }
    }).catch(console.error);
    
    // Update copyright year
    const yearSpan = document.querySelector('footer p');
    if (yearSpan) {
        yearSpan.innerHTML = yearSpan.innerHTML.replace('2023', new Date().getFullYear());
    }
    
    // Add CSS for success messages
    if (!document.querySelector('#success-styles')) {
        const style = document.createElement('style');
        style.id = 'success-styles';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
            .success-message-global > div {
                animation: slideIn 0.3s ease;
            }
            .success-message-global > div.removing {
                animation: slideOut 0.3s ease;
            }
        `;
        document.head.appendChild(style);
    }
    
    console.log('✅ Website initialized successfully');
}

// ========== STARTUP ==========
// Wait for DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// Export for debugging (optional)
window.ElenaJewelry = {
    initApp,
    retryPendingOrders,
    validatePhone: isValidMoroccanPhone
};
