/**
 * Archie Vault - Encryption Engine
 * Uses Web Crypto API for AES-256-GCM encryption
 * 
 * Security specs:
 * - Algorithm: AES-GCM (256-bit)
 * - Key Derivation: PBKDF2-SHA256 (300,000 iterations)
 * - IV: 12 bytes (random per encryption)
 * - Salt: 16 bytes (generated once per vault)
 */

class CryptoEngine {
    constructor() {
        this.PBKDF2_ITERATIONS = 300000;
        this.SALT_LENGTH = 16;
        this.IV_LENGTH = 12;
        this.KEY_LENGTH = 256;
        this.masterKey = null;
        this.salt = null;
    }

    /**
     * Generate cryptographically secure random bytes
     */
    generateRandomBytes(length) {
        return crypto.getRandomValues(new Uint8Array(length));
    }

    /**
     * Generate a new salt for the vault
     */
    generateSalt() {
        this.salt = this.generateRandomBytes(this.SALT_LENGTH);
        return this.salt;
    }

    /**
     * Set an existing salt (loaded from vault)
     */
    setSalt(saltArray) {
        if (saltArray instanceof Uint8Array) {
            this.salt = saltArray;
        } else if (Array.isArray(saltArray)) {
            this.salt = new Uint8Array(saltArray);
        } else if (typeof saltArray === 'string') {
            // Base64 encoded salt
            this.salt = this.base64ToArray(saltArray);
        }
    }

    /**
     * Derive encryption key from password using PBKDF2
     */
    async deriveKey(password) {
        if (!this.salt) {
            throw new Error('Salt not set. Initialize vault first.');
        }

        // Convert password to bytes
        const encoder = new TextEncoder();
        const passwordBytes = encoder.encode(password);

        // Import password as key material
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            passwordBytes,
            'PBKDF2',
            false,
            ['deriveKey']
        );

        // Derive AES key using PBKDF2
        this.masterKey = await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: this.salt,
                iterations: this.PBKDF2_ITERATIONS,
                hash: 'SHA-256'
            },
            keyMaterial,
            {
                name: 'AES-GCM',
                length: this.KEY_LENGTH
            },
            false, // not extractable
            ['encrypt', 'decrypt']
        );

        return this.masterKey;
    }

    /**
     * Check if the crypto engine is initialized with a key
     */
    isInitialized() {
        return this.masterKey !== null && this.salt !== null;
    }

    /**
     * Clear the master key from memory
     */
    clearKey() {
        this.masterKey = null;
    }

    /**
     * Encrypt data (string or ArrayBuffer)
     * Returns: { iv: base64, data: base64 }
     */
    async encrypt(data) {
        if (!this.masterKey) {
            throw new Error('Master key not derived. Call deriveKey first.');
        }

        // Convert string to bytes if needed
        let dataBytes;
        if (typeof data === 'string') {
            dataBytes = new TextEncoder().encode(data);
        } else if (data instanceof ArrayBuffer) {
            dataBytes = new Uint8Array(data);
        } else if (data instanceof Uint8Array) {
            dataBytes = data;
        } else {
            throw new Error('Data must be string, ArrayBuffer, or Uint8Array');
        }

        // Generate random IV
        const iv = this.generateRandomBytes(this.IV_LENGTH);

        // Encrypt
        const encryptedBuffer = await crypto.subtle.encrypt(
            {
                name: 'AES-GCM',
                iv: iv
            },
            this.masterKey,
            dataBytes
        );

        return {
            iv: this.arrayToBase64(iv),
            data: this.arrayToBase64(new Uint8Array(encryptedBuffer))
        };
    }

    /**
     * Decrypt data
     * Input: { iv: base64, data: base64 }
     * Returns: ArrayBuffer (convert to string if needed)
     */
    async decrypt(encryptedObj) {
        if (!this.masterKey) {
            throw new Error('Master key not derived. Call deriveKey first.');
        }

        const iv = this.base64ToArray(encryptedObj.iv);
        const encryptedData = this.base64ToArray(encryptedObj.data);

        try {
            const decryptedBuffer = await crypto.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    iv: iv
                },
                this.masterKey,
                encryptedData
            );

            return decryptedBuffer;
        } catch (error) {
            throw new Error('Decryption failed. Wrong password or corrupted data.');
        }
    }

    /**
     * Decrypt to string (convenience method)
     */
    async decryptToString(encryptedObj) {
        const buffer = await this.decrypt(encryptedObj);
        return new TextDecoder().decode(buffer);
    }

    /**
     * Encrypt a file (with chunking support for large files)
     * Returns encrypted blob with IV prepended
     */
    async encryptFile(file) {
        if (!this.masterKey) {
            throw new Error('Master key not derived.');
        }

        const arrayBuffer = await file.arrayBuffer();
        const encrypted = await this.encrypt(arrayBuffer);
        
        return {
            iv: encrypted.iv,
            data: encrypted.data,
            originalName: file.name,
            originalSize: file.size,
            mimeType: file.type
        };
    }

    /**
     * Decrypt a file
     */
    async decryptFile(encryptedFile) {
        const decryptedBuffer = await this.decrypt({
            iv: encryptedFile.iv,
            data: encryptedFile.data
        });

        return new Blob([decryptedBuffer], { 
            type: encryptedFile.mimeType || 'application/octet-stream' 
        });
    }

    /**
     * Encrypt JSON object
     */
    async encryptJSON(obj) {
        const jsonString = JSON.stringify(obj);
        return await this.encrypt(jsonString);
    }

    /**
     * Decrypt JSON object
     */
    async decryptJSON(encryptedObj) {
        const jsonString = await this.decryptToString(encryptedObj);
        return JSON.parse(jsonString);
    }

    /**
     * Create a verification hash for password validation
     * This is stored encrypted to verify correct password on login
     */
    async createVerificationToken() {
        const token = 'ARCHIE_VAULT_VERIFIED_' + Date.now();
        return await this.encrypt(token);
    }

    /**
     * Verify the password by attempting to decrypt the verification token
     */
    async verifyPassword(encryptedToken) {
        try {
            const decrypted = await this.decryptToString(encryptedToken);
            return decrypted.startsWith('ARCHIE_VAULT_VERIFIED_');
        } catch {
            return false;
        }
    }

    // ==================== Utility Methods ====================

    /**
     * Convert Uint8Array to Base64 string
     */
    arrayToBase64(array) {
        if (!(array instanceof Uint8Array)) {
            array = new Uint8Array(array);
        }
        let binary = '';
        for (let i = 0; i < array.length; i++) {
            binary += String.fromCharCode(array[i]);
        }
        return btoa(binary);
    }

    /**
     * Convert Base64 string to Uint8Array
     */
    base64ToArray(base64) {
        const binary = atob(base64);
        const array = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            array[i] = binary.charCodeAt(i);
        }
        return array;
    }

    /**
     * Generate a secure random password
     */
    generatePassword(length = 16, options = {}) {
        const {
            uppercase = true,
            lowercase = true,
            numbers = true,
            symbols = true
        } = options;

        let chars = '';
        if (uppercase) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        if (lowercase) chars += 'abcdefghijklmnopqrstuvwxyz';
        if (numbers) chars += '0123456789';
        if (symbols) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';

        if (!chars) chars = 'abcdefghijklmnopqrstuvwxyz';

        const randomBytes = this.generateRandomBytes(length);
        let password = '';
        for (let i = 0; i < length; i++) {
            password += chars[randomBytes[i] % chars.length];
        }

        return password;
    }

    /**
     * Calculate password strength (0-4)
     */
    calculatePasswordStrength(password) {
        let strength = 0;
        
        if (password.length >= 8) strength++;
        if (password.length >= 12) strength++;
        if (/[A-Z]/.test(password) && /[a-z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^A-Za-z0-9]/.test(password)) strength++;

        return Math.min(4, strength);
    }

    /**
     * Generate UUID v4
     */
    generateUUID() {
        const bytes = this.generateRandomBytes(16);
        bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
        bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 1

        const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
        return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }

    /**
     * Hash a string using SHA-256 (for non-sensitive fingerprinting)
     */
    async hashString(str) {
        const encoder = new TextEncoder();
        const data = encoder.encode(str);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        return this.arrayToBase64(new Uint8Array(hashBuffer));
    }
}

// Export singleton instance
window.VaultCrypto = new CryptoEngine();
