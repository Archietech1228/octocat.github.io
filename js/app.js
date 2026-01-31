/**
 * Archie Vault - Main Application Controller
 * Orchestrates all components and handles app lifecycle
 */

class VaultApp {
    constructor() {
        this.currentSection = 'files';
        this.initialized = false;
    }

    /**
     * Initialize the application
     */
    async init() {
        console.log('🏰 Archie Vault initializing...');
        
        // Register service worker for PWA
        this.registerServiceWorker();

        // Setup event listeners
        this.setupEventListeners();

        // Check for saved token
        const savedToken = VaultAuth.getSavedToken();
        if (savedToken) {
            document.getElementById('github-token').value = savedToken;
            document.getElementById('remember-token').checked = true;
        }

        // Initialize icons
        lucide.createIcons();

        this.initialized = true;
        console.log('🏰 Archie Vault ready!');
    }

    /**
     * Register service worker
     */
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('Service Worker registered:', registration.scope);
            } catch (error) {
                console.warn('Service Worker registration failed:', error);
            }
        }
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // ==================== Login Flow ====================
        
        // Verify token button
        document.getElementById('verify-token-btn').addEventListener('click', () => {
            this.handleVerifyToken();
        });

        // Back to token button
        document.getElementById('back-btn').addEventListener('click', () => {
            this.showLoginStep(1);
        });

        // Login form submit
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleUnlock();
        });

        // Create vault button
        document.getElementById('create-vault-btn').addEventListener('click', () => {
            this.handleCreateVault();
        });

        // ==================== Main App Navigation ====================

        // Desktop nav items
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchSection(btn.dataset.section);
            });
        });

        // Mobile nav items
        document.querySelectorAll('.nav-item-mobile').forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchSection(btn.dataset.section);
                this.closeMobileSidebar();
            });
        });

        // Mobile menu toggle
        document.getElementById('mobile-menu-btn').addEventListener('click', () => {
            this.openMobileSidebar();
        });

        document.getElementById('close-sidebar-btn').addEventListener('click', () => {
            this.closeMobileSidebar();
        });

        document.getElementById('sidebar-overlay').addEventListener('click', () => {
            this.closeMobileSidebar();
        });

        // Settings button
        document.getElementById('settings-btn').addEventListener('click', () => {
            this.showSettings();
        });

        document.getElementById('close-settings').addEventListener('click', () => {
            document.getElementById('settings-modal').classList.add('hidden');
        });

        // Logout button
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.handleLogout();
        });

        // Settings actions
        document.getElementById('clear-token-btn').addEventListener('click', () => {
            this.handleClearToken();
        });

        document.getElementById('export-vault-btn').addEventListener('click', () => {
            this.handleExportVault();
        });

        document.getElementById('change-password-btn').addEventListener('click', () => {
            this.handleChangePassword();
        });

        // ==================== File Vault Event Listeners ====================
        
        // These are now handled in file-manager.js after it loads

        // ==================== Keyboard Shortcuts ====================
        
        document.addEventListener('keydown', (e) => {
            // Escape to close modals
            if (e.key === 'Escape') {
                UI.closeModal();
                UI.hideContextMenu();
            }
        });
    }

    /**
     * Show login step (1 = token, 2 = password)
     */
    showLoginStep(step) {
        const step1 = document.getElementById('step1');
        const step2 = document.getElementById('step2');
        const indicator1 = document.getElementById('step1-indicator');
        const indicator2 = document.getElementById('step2-indicator');

        if (step === 1) {
            step1.classList.remove('hidden');
            step2.classList.add('hidden');
            indicator1.classList.add('bg-vault-primary');
            indicator1.classList.remove('bg-vault-border');
            indicator2.classList.remove('bg-vault-primary');
            indicator2.classList.add('bg-vault-border');
        } else {
            step1.classList.add('hidden');
            step2.classList.remove('hidden');
            indicator1.classList.remove('bg-vault-primary');
            indicator1.classList.add('bg-vault-border');
            indicator2.classList.add('bg-vault-primary');
            indicator2.classList.remove('bg-vault-border');
            document.getElementById('vault-password').focus();
        }
    }

    /**
     * Show/hide login error
     */
    showLoginError(message) {
        const errorDiv = document.getElementById('login-error');
        document.getElementById('error-text').textContent = message;
        errorDiv.classList.remove('hidden');
    }

    hideLoginError() {
        document.getElementById('login-error').classList.add('hidden');
    }

    /**
     * Show/hide loading state
     */
    showLoginLoading(message) {
        document.getElementById('login-loading').classList.remove('hidden');
        document.getElementById('loading-text').textContent = message;
    }

    hideLoginLoading() {
        document.getElementById('login-loading').classList.add('hidden');
    }

    /**
     * Handle token verification
     */
    async handleVerifyToken() {
        const token = document.getElementById('github-token').value.trim();
        const remember = document.getElementById('remember-token').checked;

        if (!token) {
            this.showLoginError('Please enter your GitHub token');
            return;
        }

        this.hideLoginError();
        this.showLoginLoading('Verifying token...');

        try {
            const result = await VaultAuth.verifyToken(token, remember);
            
            this.showLoginLoading('Checking vault status...');
            const vaultStatus = await VaultAuth.checkVaultStatus();

            this.hideLoginLoading();

            if (vaultStatus.needsSetup) {
                // Show create vault option
                document.getElementById('setup-prompt').classList.remove('hidden');
            }

            this.showLoginStep(2);
            UI.toast(`Welcome, ${result.username}!`, 'success');

        } catch (error) {
            this.hideLoginLoading();
            this.showLoginError(error.message);
        }
    }

    /**
     * Handle unlock (existing vault)
     */
    async handleUnlock() {
        const password = document.getElementById('vault-password').value;

        if (!password) {
            this.showLoginError('Please enter your vault password');
            return;
        }

        this.hideLoginError();
        this.showLoginLoading('Unlocking vault...');

        try {
            await VaultAuth.unlockVault(password);
            this.hideLoginLoading();
            this.showMainApp();
            UI.toast('Vault unlocked!', 'success');
        } catch (error) {
            this.hideLoginLoading();
            this.showLoginError(error.message);
        }
    }

    /**
     * Handle create new vault
     */
    async handleCreateVault() {
        const password = document.getElementById('vault-password').value;

        if (!password) {
            this.showLoginError('Please enter a password for your new vault');
            return;
        }

        if (password.length < 8) {
            this.showLoginError('Password must be at least 8 characters');
            return;
        }

        const confirmed = await UI.confirm(
            'This will create a new encrypted vault. Make sure to remember your password - there is NO recovery option!',
            { title: 'Create New Vault', confirmText: 'Create Vault' }
        );

        if (!confirmed) return;

        this.hideLoginError();
        this.showLoginLoading('Creating vault...');

        try {
            await VaultAuth.initializeVault(password);
            this.hideLoginLoading();
            this.showMainApp();
            UI.toast('Vault created successfully!', 'success');
        } catch (error) {
            this.hideLoginLoading();
            this.showLoginError(error.message);
        }
    }

    /**
     * Show the main app interface
     */
    showMainApp() {
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('main-app').classList.remove('hidden');

        // Initialize section managers
        if (window.FileManager) FileManager.init();
        if (window.PasswordManager) PasswordManager.init();
        if (window.TokenVault) TokenVault.init();
        if (window.IdeasLab) IdeasLab.init();
        if (window.MediaVault) MediaVault.init();
        if (window.ClipboardManager) ClipboardManager.init();

        // Update UI
        this.updateStorageInfo();
        this.switchSection('files');

        // Refresh icons
        lucide.createIcons();
    }

    /**
     * Switch to a section
     */
    switchSection(section) {
        this.currentSection = section;

        // Update nav active state
        document.querySelectorAll('.nav-item, .nav-item-mobile').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.section === section);
        });

        // Show/hide sections
        document.querySelectorAll('.vault-section').forEach(el => {
            el.classList.add('hidden');
        });
        document.getElementById(`section-${section}`).classList.remove('hidden');

        // Trigger section-specific refresh
        switch (section) {
            case 'files':
                if (window.FileManager) FileManager.refresh();
                break;
            case 'passwords':
                if (window.PasswordManager) PasswordManager.refresh();
                break;
            case 'tokens':
                if (window.TokenVault) TokenVault.refresh();
                break;
            case 'ideas':
                if (window.IdeasLab) IdeasLab.refresh();
                break;
            case 'media':
                if (window.MediaVault) MediaVault.refresh();
                break;
            case 'clipboard':
                if (window.ClipboardManager) ClipboardManager.refresh();
                break;
        }
    }

    /**
     * Open mobile sidebar
     */
    openMobileSidebar() {
        document.getElementById('mobile-sidebar').classList.remove('-translate-x-full');
        document.getElementById('sidebar-overlay').classList.remove('hidden');
    }

    /**
     * Close mobile sidebar
     */
    closeMobileSidebar() {
        document.getElementById('mobile-sidebar').classList.add('-translate-x-full');
        document.getElementById('sidebar-overlay').classList.add('hidden');
    }

    /**
     * Show settings modal
     */
    showSettings() {
        const stats = VaultStorage.getStats();
        document.getElementById('total-files').textContent = stats.totalFiles;
        document.getElementById('settings-storage').textContent = stats.totalSizeMB + ' MB';
        document.getElementById('settings-modal').classList.remove('hidden');
    }

    /**
     * Update storage info in sidebar
     */
    updateStorageInfo() {
        const stats = VaultStorage.getStats();
        const rateLimit = VaultGitHub.getRateLimitInfo();

        // Storage bar (assuming 100GB max)
        const maxGB = 100;
        const usedGB = stats.totalSize / (1024 * 1024 * 1024);
        const percentage = Math.min((usedGB / maxGB) * 100, 100);
        
        document.getElementById('storage-bar').style.width = `${percentage}%`;
        document.getElementById('storage-used').textContent = stats.totalSizeMB + ' MB';
        document.getElementById('api-remaining').textContent = rateLimit.remaining;
    }

    /**
     * Handle logout
     */
    async handleLogout() {
        const confirmed = await UI.confirm('Are you sure you want to logout?', {
            title: 'Logout',
            confirmText: 'Logout'
        });

        if (confirmed) {
            VaultAuth.logout();
            document.getElementById('main-app').classList.add('hidden');
            document.getElementById('login-screen').classList.remove('hidden');
            document.getElementById('vault-password').value = '';
            this.showLoginStep(1);
            UI.toast('Logged out', 'info');
        }
    }

    /**
     * Handle clear saved token
     */
    async handleClearToken() {
        const confirmed = await UI.confirm(
            'This will remove the saved token from this device. You will need to enter it again next time.',
            { title: 'Clear Saved Token', danger: true, confirmText: 'Clear Token' }
        );

        if (confirmed) {
            VaultAuth.clearSavedToken();
            document.getElementById('settings-modal').classList.add('hidden');
            UI.toast('Token cleared', 'success');
        }
    }

    /**
     * Handle export vault
     */
    async handleExportVault() {
        const confirmed = await UI.confirm(
            'This will download a DECRYPTED backup of all your data. Handle with extreme care!',
            { title: 'Export Vault', danger: true, confirmText: 'Export' }
        );

        if (confirmed) {
            UI.showLoading('Preparing export...');
            try {
                const manifest = VaultStorage.getManifest();
                const exportData = {
                    exported: new Date().toISOString(),
                    version: manifest.version,
                    passwords: manifest.passwords,
                    tokens: manifest.tokens,
                    ideas: manifest.ideas,
                    snippets: manifest.snippets,
                    fileCount: manifest.files.length,
                    warning: 'This file contains sensitive data. Delete after use!'
                };

                const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                UI.downloadBlob(blob, `archie-vault-backup-${Date.now()}.json`);
                UI.hideLoading();
                UI.toast('Export downloaded', 'success');
            } catch (error) {
                UI.hideLoading();
                UI.toast('Export failed: ' + error.message, 'error');
            }
        }
    }

    /**
     * Handle change password
     */
    async handleChangePassword() {
        UI.toast('Password change coming soon!', 'info');
        // TODO: Implement password change flow
    }

    /**
     * Update sync status indicator
     */
    setSyncStatus(status) {
        const icon = document.getElementById('sync-icon');
        const text = document.getElementById('sync-text');

        switch (status) {
            case 'syncing':
                icon.className = 'w-2 h-2 rounded-full bg-vault-warning animate-pulse';
                text.textContent = 'Syncing...';
                break;
            case 'synced':
                icon.className = 'w-2 h-2 rounded-full bg-vault-success';
                text.textContent = 'Synced';
                break;
            case 'error':
                icon.className = 'w-2 h-2 rounded-full bg-vault-danger';
                text.textContent = 'Error';
                break;
        }
    }
}

// Create app instance and initialize
const App = new VaultApp();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
