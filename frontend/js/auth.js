// Enhanced authentication functionality
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on login or register page
    const isLoginPage = document.getElementById('loginForm');
    const isRegisterPage = document.getElementById('registerForm');
    
    if (isLoginPage) {
        initLogin();
    }
    
    if (isRegisterPage) {
        initRegister();
    }

    // Initialize particles if available
    if (typeof initAuthParticles === 'function') {
        initAuthParticles();
    }
});

function initLogin() {
    const loginForm = document.getElementById('loginForm');
    const loginEmail = document.getElementById('loginEmail');
    const loginPassword = document.getElementById('loginPassword');
    const loginTogglePassword = loginForm.querySelector('.password-toggle');
    const loginSubmitBtn = loginForm.querySelector('.auth-submit');
    const loginBtnText = loginSubmitBtn.querySelector('.btn-text');
    const loginBtnIcon = loginSubmitBtn.querySelector('.btn-icon');
    const loginBtnLoading = loginSubmitBtn.querySelector('.btn-loading');
    const loginMessage = document.getElementById('loginMessage');
    const successModal = document.getElementById('successModal');
    const successTitle = document.getElementById('successTitle');
    const successMessage = document.getElementById('successMessage');

    // Password visibility toggle
    if (loginTogglePassword) {
        loginTogglePassword.addEventListener('click', function() {
            const isPassword = loginPassword.type === 'password';
            loginPassword.type = isPassword ? 'text' : 'password';
            this.innerHTML = isPassword ? '<i class="fas fa-eye-slash"></i>' : '<i class="fas fa-eye"></i>';
            this.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
        });
    }

    // Real-time validation
    if (loginEmail) {
        loginEmail.addEventListener('blur', validateLoginEmail);
    }
    
    if (loginPassword) {
        loginPassword.addEventListener('blur', validateLoginPassword);
    }

    function validateLoginEmail() {
        const email = loginEmail.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (!email) {
            showLoginMessage('Please enter your email address', 'error');
            loginEmail.classList.add('error');
            return false;
        }
        
        if (!emailRegex.test(email)) {
            showLoginMessage('Please enter a valid email address', 'error');
            loginEmail.classList.add('error');
            return false;
        }
        
        clearLoginMessage();
        loginEmail.classList.remove('error');
        loginEmail.classList.add('success');
        return true;
    }

    function validateLoginPassword() {
        const password = loginPassword.value.trim();
        
        if (!password) {
            showLoginMessage('Please enter your password', 'error');
            loginPassword.classList.add('error');
            return false;
        }
        
        clearLoginMessage();
        loginPassword.classList.remove('error');
        loginPassword.classList.add('success');
        return true;
    }

    function showLoginMessage(text, type) {
        loginMessage.textContent = text;
        loginMessage.className = `form-message message-${type}`;
    }

    function clearLoginMessage() {
        loginMessage.textContent = '';
        loginMessage.className = 'form-message';
    }

    // Form submission
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Validate form
            const isEmailValid = validateLoginEmail();
            const isPasswordValid = validateLoginPassword();
            
            if (!isEmailValid || !isPasswordValid) {
                return;
            }

            // Show loading state
            setLoginLoadingState(true);

            try {
                // Simulate API call - replace with actual API endpoint
                const formData = {
                    email: loginEmail.value.trim(),
                    password: loginPassword.value,
                    rememberMe: document.getElementById('rememberMe').checked
                };

                // Replace this with actual fetch call
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                // Simulate successful login
                showSuccess('Welcome Back!', 'You\'ve successfully signed in. Redirecting to your dashboard...');
                
            } catch (error) {
                showLoginMessage('Login failed. Please check your credentials and try again.', 'error');
                setLoginLoadingState(false);
            }
        });
    }

    function setLoginLoadingState(loading) {
        if (loading) {
            loginSubmitBtn.disabled = true;
            loginBtnText.textContent = 'Signing In...';
            loginBtnIcon.style.opacity = '0';
            loginBtnLoading.style.opacity = '1';
        } else {
            loginSubmitBtn.disabled = false;
            loginBtnText.textContent = 'Sign In';
            loginBtnIcon.style.opacity = '1';
            loginBtnLoading.style.opacity = '0';
        }
    }

    // Social login handlers
    const loginSocialBtns = loginForm.querySelectorAll('.social-btn');
    loginSocialBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const provider = this.classList[1].replace('-btn', '');
            showLoginMessage(`Redirecting to ${provider} authentication...`, 'info');
            
            // Simulate social auth - replace with actual implementation
            setTimeout(() => {
                showLoginMessage(`${provider} authentication would redirect to OAuth flow`, 'info');
            }, 1000);
        });
    });

    // Add input filled state
    const loginInputs = loginForm.querySelectorAll('.input-field');
    loginInputs.forEach(input => {
        input.addEventListener('input', function() {
            if (this.value.trim() !== '') {
                this.classList.add('filled');
            } else {
                this.classList.remove('filled');
            }
        });
        
        // Check initial state
        if (input.value.trim() !== '') {
            input.classList.add('filled');
        }
    });

    function showSuccess(title, message) {
        successTitle.textContent = title;
        successMessage.textContent = message;
        successModal.classList.add('active');
        const progressBar = successModal.querySelector('.progress-bar');
        
        // Reset animation
        progressBar.style.animation = 'none';
        // Force reflow
        progressBar.offsetWidth;
        progressBar.style.animation = 'progressFill 2.5s linear forwards';
        
        setTimeout(() => {
            // Redirect to dashboard - replace with actual redirect
            window.location.href = '../pages/dashboard.html';
        }, 2500);
    }
}

function initRegister() {
    const registerForm = document.getElementById('registerForm');
    const registerMessage = document.getElementById('registerMessage');
    const submitBtn = document.getElementById('submitBtn');
    const btnTextEl = submitBtn && submitBtn.querySelector('.btn-text');
    const btnIcon = submitBtn && submitBtn.querySelector('.btn-icon');
    const btnLoading = submitBtn && submitBtn.querySelector('.btn-loading');
    const togglePassword = document.getElementById('togglePassword');
    const password = document.getElementById('password');
    const confirmPassword = document.getElementById('confirmPassword');
    const avatar = document.getElementById('avatar');
    const preview = document.getElementById('preview');
    const strengthFill = document.querySelector('.strength-fill');
    const strengthText = document.querySelector('.strength-text');
    const passwordStrength = document.getElementById('passwordStrength');
    const successModal = document.getElementById('successModal');
    const successTitle = document.getElementById('successTitle');
    const successMessage = document.getElementById('successMessage');

    // Password visibility
    if (togglePassword && password && confirmPassword) {
        togglePassword.addEventListener('click', () => {
            const isPassword = password.type === 'password';
            password.type = isPassword ? 'text' : 'password';
            confirmPassword.type = isPassword ? 'text' : 'password';
            togglePassword.innerHTML = isPassword ? '<i class="fas fa-eye-slash"></i>' : '<i class="fas fa-eye"></i>';
            togglePassword.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
        });
    }

    // Password strength indicator
    if (password && strengthFill && strengthText) {
        password.addEventListener('input', function() {
            const strength = calculatePasswordStrength(this.value);
            strengthFill.style.width = strength.percentage + '%';
            strengthFill.dataset.strength = strength.score;
            strengthFill.className = `strength-fill strength-${strength.level}`;
            strengthText.textContent = strength.text;
            strengthText.className = `strength-text strength-${strength.level}`;
            
            // Show strength indicator when password has content
            if (this.value.length > 0) {
                passwordStrength.classList.add('visible');
            } else {
                passwordStrength.classList.remove('visible');
            }
        });
    }

    function calculatePasswordStrength(password) {
        let score = 0;
        let text = 'Very Weak';
        let level = 'very-weak';
        let percentage = 10;
        if (!password) return { score: 0, text, level, percentage };

        if (password.length >= 8) score++;
        if (password.length >= 12) score++;
        if (/[a-z]/.test(password)) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^a-zA-Z0-9]/.test(password)) score++;

        if (score >= 6) { text = 'Very Strong'; level = 'very-strong'; percentage = 100; }
        else if (score >= 5) { text = 'Strong'; level = 'strong'; percentage = 80; }
        else if (score >= 4) { text = 'Good'; level = 'good'; percentage = 60; }
        else if (score >= 3) { text = 'Fair'; level = 'fair'; percentage = 40; }
        else if (score >= 2) { text = 'Weak'; level = 'weak'; percentage = 20; }

        return { score, text, level, percentage };
    }

    // Avatar preview
    if (avatar && preview) {
        avatar.addEventListener('change', function() {
            preview.innerHTML = '';
            const file = this.files && this.files[0];
            if (!file) return;
            if (file.size > 2 * 1024 * 1024) {
                showRegisterMessage('Profile photo must be under 2MB.', 'error');
                this.value = '';
                return;
            }
            if (!file.type.match('image.*')) {
                showRegisterMessage('Please select a valid image file.', 'error');
                this.value = '';
                return;
            }

            const reader = new FileReader();
            reader.onload = function(e) {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.alt = 'Profile preview';
                preview.appendChild(img);

                const removeBtn = document.createElement('button');
                removeBtn.type = 'button';
                removeBtn.className = 'remove-preview';
                removeBtn.innerHTML = '<i class="fas fa-times"></i>';
                removeBtn.setAttribute('aria-label', 'Remove profile picture');
                removeBtn.addEventListener('click', function() {
                    preview.innerHTML = '';
                    avatar.value = '';
                });
                preview.appendChild(removeBtn);
            };
            reader.readAsDataURL(file);
        });
    }

    // Validation helpers
    function validateRegisterForm() {
        if (!registerForm) return false;
        registerMessage.textContent = '';
        registerMessage.className = 'form-message';
        
        // Check required fields
        const requiredFields = registerForm.querySelectorAll('[required]');
        let allValid = true;
        
        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                field.classList.add('error');
                allValid = false;
            } else {
                field.classList.remove('error');
            }
        });
        
        if (!allValid) {
            showRegisterMessage('Please fill all required fields correctly.', 'error');
            return false;
        }
        
        // Check email format
        const email = document.getElementById('email');
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.value.trim())) {
            showRegisterMessage('Please enter a valid email address.', 'error');
            email.classList.add('error');
            return false;
        } else {
            email.classList.remove('error');
        }
        
        // Check password match
        if (password && confirmPassword && password.value !== confirmPassword.value) {
            showRegisterMessage('Passwords do not match.', 'error');
            password.classList.add('error');
            confirmPassword.classList.add('error');
            return false;
        } else {
            password.classList.remove('error');
            confirmPassword.classList.remove('error');
        }
        
        // Check password strength
        const strength = password ? calculatePasswordStrength(password.value) : { score: 0 };
        if (strength.score < 3) {
            showRegisterMessage('Please choose a stronger password.', 'warning');
            return false;
        }
        
        // Check terms agreement
        if (!document.getElementById('terms').checked) {
            showRegisterMessage('Please agree to the terms and conditions.', 'error');
            return false;
        }
        
        return true;
    }

    function showRegisterMessage(text, type = 'info') {
        if (!registerMessage) return;
        registerMessage.textContent = text;
        registerMessage.className = `form-message message-${type}`;
    }

    // Submit handler
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!validateRegisterForm()) return;

            // UI loading
            if (submitBtn) submitBtn.disabled = true;
            if (btnTextEl) btnTextEl.textContent = 'Creating Account...';
            if (btnIcon) btnIcon.style.opacity = '0';
            if (btnLoading) btnLoading.style.opacity = '1';

            try {
                const formData = new FormData();
                formData.append('name', document.getElementById('name').value.trim());
                formData.append('email', document.getElementById('email').value.trim().toLowerCase());
                formData.append('password', password.value);
                formData.append('role', document.getElementById('role').value);
                if (avatar && avatar.files[0]) formData.append('avatar', avatar.files[0]);

                // Replace with actual API endpoint
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    body: formData,
                    credentials: 'include'
                });

                // Simulate response parsing
                const result = await new Promise(resolve => {
                    setTimeout(() => {
                        resolve({ success: true, message: 'Registration successful' });
                    }, 1500);
                });

                if (result.success) {
                    // Success
                    showSuccess('Welcome to Star Media Tech!', 'Your account has been created successfully. Redirecting you to your dashboard...');
                } else {
                    throw new Error(result.message || 'Registration failed');
                }
            } catch (error) {
                console.error('Registration error:', error);
                showRegisterMessage(error.message || 'Network error. Please try again.', 'error');
            } finally {
                // Reset button state if not redirecting
                if (!successModal.classList.contains('active')) {
                    setTimeout(() => {
                        if (submitBtn) submitBtn.disabled = false;
                        if (btnTextEl) btnTextEl.textContent = 'Create Account';
                        if (btnIcon) btnIcon.style.opacity = '1';
                        if (btnLoading) btnLoading.style.opacity = '0';
                    }, 300);
                }
            }
        });
    }

    // Social login handlers
    const registerSocialBtns = registerForm.querySelectorAll('.social-btn');
    registerSocialBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const providerClass = Array.from(this.classList).find(c => c.endsWith('-btn'));
            const provider = providerClass ? providerClass.replace('-btn', '') : 'provider';
            showRegisterMessage(`Redirecting to ${provider} authentication...`, 'info');
            setTimeout(() => showRegisterMessage(`${provider} authentication not configured yet.`, 'warning'), 1000);
        });
    });

    // Real-time validation / UX
    const registerInputs = registerForm ? registerForm.querySelectorAll('input, select') : [];
    registerInputs.forEach(input => {
        input.addEventListener('blur', function() {
            if (this.value.trim() !== '') this.classList.add('filled'); 
            else this.classList.remove('filled');
        });
        
        if (input.id === 'confirmPassword') {
            input.addEventListener('input', function() {
                if (this.value && password && password.value && this.value !== password.value) {
                    this.classList.add('error');
                } else {
                    this.classList.remove('error');
                }
            });
        }
    });

    // Small animation delay for benefit items
    document.querySelectorAll('.benefit-item').forEach((item, index) => { 
        item.style.animationDelay = `${index * 0.08}s`; 
    });

    function showSuccess(title, message) {
        successTitle.textContent = title;
        successMessage.textContent = message;
        successModal.classList.add('active');
        const progressBar = successModal.querySelector('.progress-bar');
        
        // Reset animation
        progressBar.style.animation = 'none';
        // Force reflow
        progressBar.offsetWidth;
        progressBar.style.animation = 'progressFill 2.5s linear forwards';
        
        setTimeout(() => {
            // Redirect to dashboard - replace with actual redirect
            window.location.href = '../pages/dashboard.html';
        }, 2500);
    }
}