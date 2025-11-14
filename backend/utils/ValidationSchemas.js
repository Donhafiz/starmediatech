/**
 * Validation Schemas using Yup
 * Comprehensive form validation for authentication and user data
 */

// Yup is required - make sure to include it in your project
// <script src="https://cdn.jsdelivr.net/npm/yup@1.3.2/dist/yup.min.js"></script>

class ValidationSchemas {
    constructor() {
        this.initSchemas();
    }

    /**
     * Initialize all validation schemas
     */
    initSchemas() {
        // Common validation rules
        this.commonRules = {
            email: yup
                .string()
                .email('Please enter a valid email address')
                .required('Email address is required')
                .trim()
                .lowercase()
                .max(254, 'Email address is too long'),

            password: yup
                .string()
                .required('Password is required')
                .min(8, 'Password must be at least 8 characters')
                .max(128, 'Password is too long')
                .matches(
                    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                    'Password must contain at least one lowercase letter, one uppercase letter, and one number'
                ),

            name: yup
                .string()
                .required('Full name is required')
                .min(2, 'Name must be at least 2 characters')
                .max(100, 'Name is too long')
                .matches(
                    /^[a-zA-Z\s\-']+$/,
                    'Name can only contain letters, spaces, hyphens, and apostrophes'
                )
                .trim(),

            phone: yup
                .string()
                .matches(
                    /^\+?[\d\s\-\(\)]{10,}$/,
                    'Please enter a valid phone number'
                )
                .transform((value) => value.replace(/[^\d+]/g, '')), // Remove formatting for storage

            url: yup
                .string()
                .url('Please enter a valid URL')
                .max(500, 'URL is too long'),

            requiredString: (fieldName) => 
                yup.string().required(`${fieldName} is required`).trim(),

            optionalString: yup.string().trim().nullable(),

            number: yup
                .number()
                .typeError('Must be a valid number')
                .positive('Must be a positive number')
                .integer('Must be a whole number'),

            date: yup
                .date()
                .typeError('Please enter a valid date')
                .max(new Date(), 'Date cannot be in the future')
        };

        // Define schemas
        this.schemas = {
            // Authentication schemas
            login: yup.object({
                email: this.commonRules.email,
                password: yup.string().required('Password is required'),
                rememberMe: yup.boolean().default(false)
            }),

            register: yup.object({
                name: this.commonRules.name,
                email: this.commonRules.email,
                password: this.commonRules.password,
                confirmPassword: yup
                    .string()
                    .required('Please confirm your password')
                    .oneOf([yup.ref('password')], 'Passwords must match'),
                role: yup
                    .string()
                    .oneOf(['student', 'consultant', 'business'], 'Please select a valid role')
                    .required('Role is required'),
                avatar: yup
                    .mixed()
                    .test('fileSize', 'File size is too large', (value) => {
                        if (!value) return true; // Optional field
                        return value.size <= 2 * 1024 * 1024; // 2MB
                    })
                    .test('fileType', 'Unsupported file format', (value) => {
                        if (!value) return true; // Optional field
                        return ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(value.type);
                    }),
                terms: yup
                    .boolean()
                    .oneOf([true], 'You must accept the terms and conditions')
                    .required('You must accept the terms and conditions')
            }),

            // Password reset schemas
            forgotPassword: yup.object({
                email: this.commonRules.email
            }),

            resetPassword: yup.object({
                password: this.commonRules.password,
                confirmPassword: yup
                    .string()
                    .required('Please confirm your password')
                    .oneOf([yup.ref('password')], 'Passwords must match'),
                token: yup.string().required('Reset token is required')
            }),

            // Profile schemas
            profile: yup.object({
                name: this.commonRules.name,
                email: this.commonRules.email,
                phone: this.commonRules.phone,
                bio: yup
                    .string()
                    .max(500, 'Bio must be less than 500 characters')
                    .nullable(),
                location: yup
                    .string()
                    .max(100, 'Location is too long')
                    .nullable(),
                website: this.commonRules.url.nullable(),
                company: yup
                    .string()
                    .max(100, 'Company name is too long')
                    .nullable(),
                jobTitle: yup
                    .string()
                    .max(100, 'Job title is too long')
                    .nullable()
            }),

            // Consultant profile schemas
            consultantProfile: yup.object({
                name: this.commonRules.name,
                email: this.commonRules.email,
                phone: this.commonRules.phone,
                bio: yup
                    .string()
                    .required('Bio is required')
                    .min(50, 'Bio must be at least 50 characters')
                    .max(1000, 'Bio must be less than 1000 characters'),
                specialization: yup
                    .string()
                    .required('Specialization is required')
                    .max(100, 'Specialization is too long'),
                experience: yup
                    .number()
                    .typeError('Experience must be a number')
                    .required('Experience is required')
                    .min(0, 'Experience cannot be negative')
                    .max(50, 'Experience seems too high'),
                hourlyRate: yup
                    .number()
                    .typeError('Hourly rate must be a number')
                    .required('Hourly rate is required')
                    .min(10, 'Hourly rate must be at least $10')
                    .max(1000, 'Hourly rate seems too high'),
                skills: yup
                    .array()
                    .of(yup.string().min(2, 'Skill must be at least 2 characters'))
                    .min(3, 'Please add at least 3 skills')
                    .max(20, 'Too many skills'),
                education: yup
                    .array()
                    .of(
                        yup.object({
                            degree: yup.string().required('Degree is required'),
                            school: yup.string().required('School is required'),
                            year: yup
                                .number()
                                .typeError('Year must be a number')
                                .min(1900, 'Year seems too early')
                                .max(new Date().getFullYear(), 'Year cannot be in the future')
                                .required('Year is required')
                        })
                    )
                    .min(1, 'Please add at least one education entry'),
                certifications: yup
                    .array()
                    .of(
                        yup.object({
                            name: yup.string().required('Certification name is required'),
                            issuer: yup.string().required('Issuer is required'),
                            year: yup
                                .number()
                                .typeError('Year must be a number')
                                .min(1900, 'Year seems too early')
                                .max(new Date().getFullYear(), 'Year cannot be in the future')
                                .required('Year is required')
                        })
                    )
            }),

            // Course schemas
            course: yup.object({
                title: yup
                    .string()
                    .required('Course title is required')
                    .min(5, 'Title must be at least 5 characters')
                    .max(100, 'Title is too long'),
                description: yup
                    .string()
                    .required('Course description is required')
                    .min(50, 'Description must be at least 50 characters')
                    .max(2000, 'Description is too long'),
                category: yup
                    .string()
                    .required('Category is required'),
                level: yup
                    .string()
                    .oneOf(['beginner', 'intermediate', 'advanced'], 'Please select a valid level')
                    .required('Level is required'),
                price: yup
                    .number()
                    .typeError('Price must be a number')
                    .required('Price is required')
                    .min(0, 'Price cannot be negative')
                    .max(10000, 'Price seems too high'),
                duration: yup
                    .number()
                    .typeError('Duration must be a number')
                    .required('Duration is required')
                    .min(1, 'Duration must be at least 1 hour')
                    .max(1000, 'Duration seems too long'),
                objectives: yup
                    .array()
                    .of(yup.string().min(10, 'Objective must be at least 10 characters'))
                    .min(3, 'Please add at least 3 learning objectives')
                    .max(20, 'Too many objectives')
            }),

            // Booking schemas
            booking: yup.object({
                serviceId: yup.string().required('Service selection is required'),
                consultantId: yup.string().required('Consultant selection is required'),
                date: yup
                    .date()
                    .required('Booking date is required')
                    .min(new Date(), 'Booking date cannot be in the past'),
                timeSlot: yup.string().required('Time slot is required'),
                notes: yup
                    .string()
                    .max(500, 'Notes must be less than 500 characters')
                    .nullable(),
                specialRequirements: yup
                    .string()
                    .max(1000, 'Requirements must be less than 1000 characters')
                    .nullable()
            }),

            // Payment schemas
            payment: yup.object({
                cardNumber: yup
                    .string()
                    .required('Card number is required')
                    .matches(/^\d{16}$/, 'Card number must be 16 digits'),
                expiryDate: yup
                    .string()
                    .required('Expiry date is required')
                    .matches(/^(0[1-9]|1[0-2])\/\d{2}$/, 'Expiry date must be in MM/YY format')
                    .test('expiry', 'Card has expired', (value) => {
                        if (!value) return false;
                        const [month, year] = value.split('/');
                        const expiry = new Date(2000 + parseInt(year), parseInt(month) - 1);
                        return expiry > new Date();
                    }),
                cvv: yup
                    .string()
                    .required('CVV is required')
                    .matches(/^\d{3,4}$/, 'CVV must be 3 or 4 digits'),
                cardholderName: yup
                    .string()
                    .required('Cardholder name is required')
                    .min(2, 'Name is too short')
                    .max(100, 'Name is too long')
                    .matches(/^[a-zA-Z\s]+$/, 'Name can only contain letters and spaces')
            }),

            // Contact form schema
            contact: yup.object({
                name: this.commonRules.name,
                email: this.commonRules.email,
                subject: yup
                    .string()
                    .required('Subject is required')
                    .min(5, 'Subject must be at least 5 characters')
                    .max(200, 'Subject is too long'),
                message: yup
                    .string()
                    .required('Message is required')
                    .min(10, 'Message must be at least 10 characters')
                    .max(2000, 'Message is too long'),
                category: yup
                    .string()
                    .oneOf(['general', 'technical', 'billing', 'partnership'], 'Please select a valid category')
                    .required('Category is required')
            })
        };
    }

    /**
     * Get validation schema by name
     * @param {string} schemaName - Name of the schema
     * @returns {Object} Yup schema
     */
    getSchema(schemaName) {
        const schema = this.schemas[schemaName];
        if (!schema) {
            throw new Error(`Schema '${schemaName}' not found`);
        }
        return schema;
    }

    /**
     * Validate data against schema
     * @param {string} schemaName - Name of the schema
     * @param {Object} data - Data to validate
     * @returns {Promise} Validation result
     */
    async validate(schemaName, data) {
        try {
            const schema = this.getSchema(schemaName);
            const validatedData = await schema.validate(data, {
                abortEarly: false,
                stripUnknown: true
            });
            
            return {
                isValid: true,
                data: validatedData,
                errors: null
            };
        } catch (error) {
            if (error instanceof yup.ValidationError) {
                const errors = this.formatYupErrors(error);
                return {
                    isValid: false,
                    data: null,
                    errors: errors
                };
            }
            throw error;
        }
    }

    /**
     * Format Yup validation errors into a more usable format
     * @param {yup.ValidationError} error - Yup validation error
     * @returns {Object} Formatted errors
     */
    formatYupErrors(error) {
        const formattedErrors = {};
        
        if (error.inner) {
            error.inner.forEach((err) => {
                if (err.path) {
                    formattedErrors[err.path] = err.message;
                }
            });
        } else if (error.path) {
            formattedErrors[error.path] = error.message;
        }
        
        return formattedErrors;
    }

    /**
     * Create custom validation rule
     * @param {string} fieldName - Field name
     * @param {Function} validator - Validation function
     * @param {string} message - Error message
     * @returns {Object} Yup validation chain
     */
    createCustomRule(fieldName, validator, message) {
        return yup.mixed().test(fieldName, message, validator);
    }

    /**
     * Password strength validator
     * @param {string} value - Password value
     * @returns {boolean} Whether password is strong enough
     */
    passwordStrengthValidator(value) {
        if (!value) return false;
        
        let strength = 0;
        
        // Length check
        if (value.length >= 8) strength++;
        if (value.length >= 12) strength++;
        
        // Character type checks
        if (/[a-z]/.test(value)) strength++;
        if (/[A-Z]/.test(value)) strength++;
        if (/[0-9]/.test(value)) strength++;
        if (/[^a-zA-Z0-9]/.test(value)) strength++;
        
        return strength >= 4; // Require at least 4 out of 6 criteria
    }

    /**
     * File type validator
     * @param {Array} allowedTypes - Allowed MIME types
     * @param {number} maxSize - Maximum file size in bytes
     * @returns {Function} Validation function
     */
    createFileValidator(allowedTypes, maxSize) {
        return function(value) {
            if (!value) return true; // Optional field
            
            // Check file type
            if (!allowedTypes.includes(value.type)) {
                return this.createError({
                    path: this.path,
                    message: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`
                });
            }
            
            // Check file size
            if (value.size > maxSize) {
                return this.createError({
                    path: this.path,
                    message: `File size must be less than ${(maxSize / 1024 / 1024).toFixed(1)}MB`
                });
            }
            
            return true;
        };
    }

    /**
     * Confirm password validator
     * @param {string} reference - Field to compare with
     * @param {string} message - Error message
     * @returns {Function} Validation function
     */
    createConfirmValidator(reference, message) {
        return function(value) {
            return value === this.parent[reference] 
                ? true 
                : this.createError({ path: this.path, message });
        };
    }

    /**
     * Async username availability check
     * @param {string} username - Username to check
     * @returns {Promise<boolean>} Whether username is available
     */
    async checkUsernameAvailability(username) {
        try {
            const response = await fetch('/api/auth/check-username', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username })
            });
            
            if (!response.ok) {
                throw new Error('Username check failed');
            }
            
            const data = await response.json();
            return data.available;
            
        } catch (error) {
            console.error('Username availability check failed:', error);
            return false;
        }
    }

    /**
     * Async email availability check
     * @param {string} email - Email to check
     * @returns {Promise<boolean>} Whether email is available
     */
    async checkEmailAvailability(email) {
        try {
            const response = await fetch('/api/auth/check-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email })
            });
            
            if (!response.ok) {
                throw new Error('Email check failed');
            }
            
            const data = await response.json();
            return data.available;
            
        } catch (error) {
            console.error('Email availability check failed:', error);
            return false;
        }
    }

    /**
     * Real-time validation for form fields
     * @param {string} schemaName - Schema name
     * @param {string} fieldName - Field name
     * @param {*} value - Field value
     * @returns {Promise<string|null>} Error message or null if valid
     */
    async validateField(schemaName, fieldName, value) {
        try {
            const schema = this.getSchema(schemaName);
            const fieldSchema = yup.reach(schema, fieldName);
            
            await fieldSchema.validate(value);
            return null; // No error
        } catch (error) {
            return error.message;
        }
    }

    /**
     * Debounced field validation for better UX
     * @param {Function} validator - Validation function
     * @param {number} delay - Delay in milliseconds
     * @returns {Function} Debounced validation function
     */
    createDebouncedValidator(validator, delay = 500) {
        let timeoutId;
        
        return async function(...args) {
            clearTimeout(timeoutId);
            
            return new Promise((resolve) => {
                timeoutId = setTimeout(async () => {
                    const result = await validator(...args);
                    resolve(result);
                }, delay);
            });
        };
    }
}

// Password strength utility
const PasswordUtils = {
    /**
     * Calculate password strength score
     * @param {string} password - Password to evaluate
     * @returns {Object} Strength information
     */
    calculateStrength: function(password) {
        let score = 0;
        const feedback = [];
        
        if (!password) {
            return {
                score: 0,
                strength: 'Very Weak',
                level: 'very-weak',
                percentage: 0,
                feedback: ['Password is required']
            };
        }
        
        // Length checks
        if (password.length >= 8) score++;
        if (password.length >= 12) score++;
        
        // Character diversity checks
        if (/[a-z]/.test(password)) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^a-zA-Z0-9]/.test(password)) score++;
        
        // Provide feedback
        if (password.length < 8) {
            feedback.push('Use at least 8 characters');
        }
        if (!/[a-z]/.test(password)) {
            feedback.push('Add lowercase letters');
        }
        if (!/[A-Z]/.test(password)) {
            feedback.push('Add uppercase letters');
        }
        if (!/[0-9]/.test(password)) {
            feedback.push('Add numbers');
        }
        if (!/[^a-zA-Z0-9]/.test(password)) {
            feedback.push('Add special characters');
        }
        
        // Determine strength level
        let strength, level, percentage;
        
        if (score >= 6) {
            strength = 'Very Strong';
            level = 'very-strong';
            percentage = 100;
        } else if (score >= 5) {
            strength = 'Strong';
            level = 'strong';
            percentage = 80;
        } else if (score >= 4) {
            strength = 'Good';
            level = 'good';
            percentage = 60;
        } else if (score >= 3) {
            strength = 'Fair';
            level = 'fair';
            percentage = 40;
        } else if (score >= 2) {
            strength = 'Weak';
            level = 'weak';
            percentage = 20;
        } else {
            strength = 'Very Weak';
            level = 'very-weak';
            percentage = 10;
        }
        
        return {
            score,
            strength,
            level,
            percentage,
            feedback: feedback.length > 0 ? feedback : ['Strong password!']
        };
    },
    
    /**
     * Generate a random secure password
     * @param {number} length - Password length
     * @returns {string} Generated password
     */
    generatePassword: function(length = 12) {
        const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
        let password = '';
        
        // Ensure at least one of each required character type
        password += 'a'; // lowercase
        password += 'A'; // uppercase
        password += '1'; // number
        password += '!'; // special
        
        // Fill the rest randomly
        for (let i = 4; i < length; i++) {
            password += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        
        // Shuffle the password
        return password.split('').sort(() => 0.5 - Math.random()).join('');
    }
};

// Create global instance
const validationSchemas = new ValidationSchemas();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ValidationSchemas, PasswordUtils, validationSchemas };
} else {
    window.ValidationSchemas = ValidationSchemas;
    window.PasswordUtils = PasswordUtils;
    window.validationSchemas = validationSchemas;
}

// Auto-initialize when Yup is available
if (typeof yup !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('Validation schemas initialized');
    });
} else {
    console.warn('Yup library not found. Please include Yup for validation to work.');
}