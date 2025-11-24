import { logger } from '../utils/logger';
import { authService } from '../utils/api/index';
import { loginLimiter } from '../utils/api/rate-limiter';

export class message {
    errorDiv: HTMLElement;
    successDiv: HTMLElement;

    showError(message: string) {
      this.errorDiv.textContent = message;
      this.errorDiv.classList.remove('hidden');
      this.successDiv.classList.add('hidden');
    }

    showSuccess(message: string) {
      this.successDiv.textContent = message;
      this.successDiv.classList.remove('hidden');
      this.errorDiv.classList.add('hidden');
    };

    hideMessages() {
      this.errorDiv.classList.add('hidden');
      this.successDiv.classList.add('hidden');
    };

    constructor(errorDiv: HTMLElement, successDiv: HTMLElement) {
        this.errorDiv = errorDiv;
        this.successDiv = successDiv;
    }

}

export class UserLogin {
    email: string;
    password: string;
    rememberMe: boolean;

    validateInputs(message: message) {
        if (!this.email || !this.password) {
            logger.warn('Login validation failed: missing email or password');
            message.showError('Email and password are required');
            return;
      }
    }

    checkRateLimit(message: message) {
        if (!loginLimiter.isAllowed(this.email, 5, 60 * 1000)) {
            const remaining = loginLimiter.getRemainingTime(this.email);
            const minutes = Math.ceil(remaining / 60000);
            logger.warn(`Rate limit exceeded for ${this.email}, remaining time: ${minutes}m`);
            message.showError(
            `Too many login attempts. Please try again in ${minutes} minute${minutes !== 1 ? 's' : ''}.`
            );
        return;
      }
    }

    async tryLogin(message: message, submitBtn: HTMLButtonElement) {
        try {
            logger.info(`Login attempt for email: ${this.email}`);

            // Call the real API
            const response = await authService.login(
            { email: this.email, password: this.password },
            this.rememberMe
            );

            logger.debug('Login response received', { 
            success: response.success, 
            hasToken: !!localStorage.getItem('token'),
            isAuthenticated: authService.isAuthenticated()
            });

            if (response.success) {
            // Clear rate limit on success
            loginLimiter.reset(this.email);
            logger.info(`Login successful for ${this.email}`);
            message.showSuccess('Login successful! Redirecting...');
            
            // Redirect after short delay
            setTimeout(() => {
                const params = new URLSearchParams(window.location.search);
                const next = params.get('next') || '/dashboard';
                logger.debug(`Redirecting to: ${next}`);
                window.location.replace(next);
            }, 500);
            } else {
            logger.error('Login failed', 'An unexpected error occurred during login.');
            message.showError('Login failed. Please check your credentials or try again later.');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span class="mr-2">&gt;</span> LOGIN';
            }
        } catch (err: any) {
            logger.error('Login network error: please try again later.');
            message.showError('Network error: Please try again later.');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span class="mr-2">&gt;</span> LOGIN';
        }
    }

    constructor(email: string, password: string, rememberMe: boolean) {
        this.email = email;
        this.password = password;
        this.rememberMe = rememberMe;
    }
}

