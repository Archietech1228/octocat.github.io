/**
 * Archie Vault - Authentication System
 * Handles the double-lock authentication process
 */

class AuthManager {
    constructor() {
        this.isAuthenticated = false;
        this.tokenStorageKey = 'archie_vault_token';
    }

    /**
     * Check for saved token
     */
    getSavedToken() {
        return localStorage.getItem(this.tokenStorageKey);
    }

    /**
     * Save token to localStorage
     */
    saveToken(token) {
        localStorage.setItem(this.tokenStorageKey, token);
    }

    /**
     * Clear saved token
     */
    clearSavedToken() {
        localStorage.removeItem(this.tokenStorageKey);
    }

    /**
     * Set session token (also stores in sessionStorage for current session)
     */
    setSessionToken(token) {
        sessionStorage.setItem('vault_session_token', token);
        VaultGitHub.setToken(token);
    }

    /**
     * Step 1: Verify GitHub token
     */
    async verifyToken(token, remember = true) {
        try {
            VaultGitHub.setToken(token);
            
            // Verify the token works
            const result = await VaultGitHub.verifyToken();
            
            if (!result.valid) {
                throw new Error(result.error || 'Invalid token');
            }

            // Check if repo is accessible
            const repoCheck = await VaultGitHub.checkRepository();
            
            if (!repoCheck.exists) {
                throw new Error('Repository VAULT-ARCHIETECH not found. Please create it first!');
            }

            if (!repoCheck.private) {
                throw new Error('Warning: Repository is PUBLIC! Please make it private for security.');
            }

            // Save token if requested
            if (remember) {
                this.saveToken(token);
            }
            
            this.setSessionToken(token);

            return {
                success: true,
                username: result.username
            };
        } catch (error) {
            VaultGitHub.clearToken();
            throw error;
        }
    }

    /**
     * Check if vault is initialized (first time setup?)
     */
    async checkVaultStatus() {
        const isInitialized = await VaultGitHub.isVaultInitialized();
        return {
            initialized: isInitialized,
            needsSetup: !isInitialized
        };
    }

    /**
     * Step 2a: Initialize new vault (first time setup)
     */
    async initializeVault(password) {
        try {
            // Generate salt
            const salt = VaultCrypto.generateSalt();
            const saltBase64 = VaultCrypto.arrayToBase64(salt);

            // Derive key from password
            await VaultCrypto.deriveKey(password);

            // Create verification token
            const verificationToken = await VaultCrypto.createVerificationToken();

            // Initialize vault on GitHub
            await VaultGitHub.initializeVault(saltBase64, verificationToken);

            // Create empty manifest
            VaultStorage.manifest = VaultStorage.createEmptyManifest();
            await VaultStorage.saveManifest();

            this.isAuthenticated = true;

            return { success: true };
        } catch (error) {
            VaultCrypto.clearKey();
            throw error;
        }
    }

    /**
     * Step 2b: Unlock existing vault
     */
    async unlockVault(password) {
        try {
            // Get vault metadata (salt and verification)
            const meta = await VaultGitHub.getVaultMeta();
            
            if (!meta) {
                throw new Error('Vault not initialized. Please create a new vault first.');
            }

            // Set salt and derive key
            VaultCrypto.setSalt(meta.salt);
            await VaultCrypto.deriveKey(password);

            // Verify password using verification token
            const isValid = await VaultCrypto.verifyPassword(meta.verification);
            
            if (!isValid) {
                VaultCrypto.clearKey();
                throw new Error('Incorrect password');
            }

            // Load the encrypted manifest
            await VaultStorage.loadManifest();

            this.isAuthenticated = true;

            return { success: true };
        } catch (error) {
            VaultCrypto.clearKey();
            throw error;
        }
    }

    /**
     * Logout - clear everything
     */
    logout() {
        this.isAuthenticated = false;
        VaultCrypto.clearKey();
        VaultGitHub.clearToken();
        sessionStorage.removeItem('vault_session_token');
        // Note: We don't clear localStorage token on logout, only the session
    }

    /**
     * Full logout - also clear saved token
     */
    fullLogout() {
        this.logout();
        this.clearSavedToken();
    }

    /**
     * Change vault password
     * Re-encrypts all data with new password
     */
    async changePassword(currentPassword, newPassword) {
        try {
            // First, verify current password
            const meta = await VaultGitHub.getVaultMeta();
            VaultCrypto.setSalt(meta.salt);
            await VaultCrypto.deriveKey(currentPassword);
            
            const isValid = await VaultCrypto.verifyPassword(meta.verification);
            if (!isValid) {
                throw new Error('Current password is incorrect');
            }

            // Load and decrypt all data with current password
            const manifest = await VaultStorage.loadManifest();

            // Generate new salt and derive new key
            const newSalt = VaultCrypto.generateSalt();
            const newSaltBase64 = VaultCrypto.arrayToBase64(newSalt);
            await VaultCrypto.deriveKey(newPassword);

            // Create new verification token
            const newVerificationToken = await VaultCrypto.createVerificationToken();

            // Update vault metadata
            await VaultGitHub.putJSON('vault.meta', {
                version: meta.version,
                created: meta.created,
                salt: newSaltBase64,
                verification: newVerificationToken,
                passwordChanged: new Date().toISOString()
            }, 'Change vault password');

            // Re-encrypt and save manifest
            await VaultStorage.saveManifest();

            return { success: true };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Check if authenticated
     */
    isLoggedIn() {
        return this.isAuthenticated && VaultCrypto.isInitialized();
    }
}

// Export singleton instance
window.VaultAuth = new AuthManager();
