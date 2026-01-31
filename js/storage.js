/**
 * Archie Vault - Storage Manager
 * Manages the encrypted manifest and file operations
 */

class StorageManager {
    constructor() {
        this.manifest = null;
        this.currentPath = '/';
        this.isLoaded = false;
    }

    /**
     * Initialize empty manifest structure
     */
    createEmptyManifest() {
        return {
            version: '1.0.0',
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
            files: [],      // File Vault items
            passwords: [],  // Password Manager items
            tokens: [],     // Token Vault items
            ideas: [],      // Ideas Lab items
            media: [],      // Media Vault items
            snippets: [],   // Quick Clipboard items
            totalSize: 0
        };
    }

    /**
     * Load and decrypt the manifest from GitHub
     */
    async loadManifest() {
        try {
            const indexFile = await VaultGitHub.getFile('index.enc');
            
            if (!indexFile || !indexFile.content) {
                // No manifest exists, create empty one
                this.manifest = this.createEmptyManifest();
                this.isLoaded = true;
                return this.manifest;
            }

            const encryptedIndex = JSON.parse(indexFile.content);
            
            if (!encryptedIndex.iv || !encryptedIndex.data) {
                // Empty or invalid manifest
                this.manifest = this.createEmptyManifest();
                this.isLoaded = true;
                return this.manifest;
            }

            this.manifest = await VaultCrypto.decryptJSON(encryptedIndex);
            this.isLoaded = true;
            return this.manifest;
        } catch (error) {
            console.error('Failed to load manifest:', error);
            throw new Error('Failed to decrypt vault. Wrong password?');
        }
    }

    /**
     * Save the manifest to GitHub (encrypted)
     */
    async saveManifest() {
        if (!this.manifest) {
            throw new Error('No manifest to save');
        }

        this.manifest.updated = new Date().toISOString();
        
        const encrypted = await VaultCrypto.encryptJSON(this.manifest);
        await VaultGitHub.putFile('index.enc', JSON.stringify(encrypted), 'Update vault index');
        
        return true;
    }

    /**
     * Get the current manifest
     */
    getManifest() {
        return this.manifest;
    }

    // ==================== File Vault Operations ====================

    /**
     * Upload a file to the vault
     */
    async uploadFile(file, folder = '/') {
        const id = VaultCrypto.generateUUID();
        const shardPath = `data/${id.substring(0, 2)}`;
        const blobPath = `${shardPath}/${id}.bin`;

        // Encrypt the file
        const encrypted = await VaultCrypto.encryptFile(file);
        
        // Prepare the blob content (IV + encrypted data as JSON)
        const blobContent = JSON.stringify({
            iv: encrypted.iv,
            data: encrypted.data
        });

        // Upload to GitHub
        await VaultGitHub.putFile(blobPath, blobContent, `Upload: ${file.name}`);

        // Add to manifest
        const fileEntry = {
            id: id,
            name: file.name,
            type: 'file',
            size: file.size,
            mime: file.type || 'application/octet-stream',
            folder: folder,
            blobPath: blobPath,
            created: new Date().toISOString(),
            updated: new Date().toISOString()
        };

        this.manifest.files.push(fileEntry);
        this.manifest.totalSize += file.size;
        
        await this.saveManifest();
        
        return fileEntry;
    }

    /**
     * Download and decrypt a file
     */
    async downloadFile(fileId) {
        const fileEntry = this.manifest.files.find(f => f.id === fileId);
        if (!fileEntry) {
            throw new Error('File not found');
        }

        // Get the encrypted blob
        const blob = await VaultGitHub.getFile(fileEntry.blobPath);
        if (!blob) {
            throw new Error('File data not found');
        }

        const encryptedData = JSON.parse(blob.content);
        
        // Decrypt
        const decryptedBlob = await VaultCrypto.decryptFile({
            iv: encryptedData.iv,
            data: encryptedData.data,
            mimeType: fileEntry.mime
        });

        return {
            blob: decryptedBlob,
            name: fileEntry.name,
            mime: fileEntry.mime
        };
    }

    /**
     * Delete a file from the vault
     */
    async deleteFile(fileId) {
        const fileIndex = this.manifest.files.findIndex(f => f.id === fileId);
        if (fileIndex === -1) {
            throw new Error('File not found');
        }

        const fileEntry = this.manifest.files[fileIndex];

        // Delete from GitHub
        try {
            await VaultGitHub.deleteFile(fileEntry.blobPath, `Delete: ${fileEntry.name}`);
        } catch (error) {
            console.warn('Could not delete blob file:', error);
        }

        // Remove from manifest
        this.manifest.files.splice(fileIndex, 1);
        this.manifest.totalSize -= fileEntry.size;
        
        await this.saveManifest();
        
        return true;
    }

    /**
     * Rename a file
     */
    async renameFile(fileId, newName) {
        const fileEntry = this.manifest.files.find(f => f.id === fileId);
        if (!fileEntry) {
            throw new Error('File not found');
        }

        fileEntry.name = newName;
        fileEntry.updated = new Date().toISOString();
        
        await this.saveManifest();
        
        return fileEntry;
    }

    /**
     * Create a folder
     */
    async createFolder(name, parent = '/') {
        const id = VaultCrypto.generateUUID();
        
        const folderEntry = {
            id: id,
            name: name,
            type: 'folder',
            folder: parent,
            created: new Date().toISOString()
        };

        this.manifest.files.push(folderEntry);
        await this.saveManifest();
        
        return folderEntry;
    }

    /**
     * Get files in a folder
     */
    getFilesInFolder(folder = '/') {
        return this.manifest.files.filter(f => f.folder === folder);
    }

    // ==================== Password Manager Operations ====================

    /**
     * Add a password entry
     */
    async addPassword(entry) {
        const id = VaultCrypto.generateUUID();
        
        const passwordEntry = {
            id: id,
            site: entry.site,
            username: entry.username,
            password: entry.password,
            url: entry.url || '',
            notes: entry.notes || '',
            category: entry.category || 'general',
            created: new Date().toISOString(),
            updated: new Date().toISOString()
        };

        this.manifest.passwords.push(passwordEntry);
        await this.saveManifest();
        
        return passwordEntry;
    }

    /**
     * Update a password entry
     */
    async updatePassword(id, updates) {
        const entry = this.manifest.passwords.find(p => p.id === id);
        if (!entry) {
            throw new Error('Password not found');
        }

        Object.assign(entry, updates, { updated: new Date().toISOString() });
        await this.saveManifest();
        
        return entry;
    }

    /**
     * Delete a password entry
     */
    async deletePassword(id) {
        const index = this.manifest.passwords.findIndex(p => p.id === id);
        if (index === -1) {
            throw new Error('Password not found');
        }

        this.manifest.passwords.splice(index, 1);
        await this.saveManifest();
        
        return true;
    }

    /**
     * Get all passwords
     */
    getPasswords() {
        return this.manifest.passwords || [];
    }

    /**
     * Search passwords
     */
    searchPasswords(query) {
        const q = query.toLowerCase();
        return this.manifest.passwords.filter(p => 
            p.site.toLowerCase().includes(q) ||
            p.username.toLowerCase().includes(q) ||
            (p.notes && p.notes.toLowerCase().includes(q))
        );
    }

    // ==================== Token Vault Operations ====================

    /**
     * Add a token entry
     */
    async addToken(entry) {
        const id = VaultCrypto.generateUUID();
        
        const tokenEntry = {
            id: id,
            service: entry.service,
            token: entry.token,
            description: entry.description || '',
            environment: entry.environment || 'production',
            expiresAt: entry.expiresAt || null,
            created: new Date().toISOString(),
            updated: new Date().toISOString()
        };

        this.manifest.tokens.push(tokenEntry);
        await this.saveManifest();
        
        return tokenEntry;
    }

    /**
     * Update a token entry
     */
    async updateToken(id, updates) {
        const entry = this.manifest.tokens.find(t => t.id === id);
        if (!entry) {
            throw new Error('Token not found');
        }

        Object.assign(entry, updates, { updated: new Date().toISOString() });
        await this.saveManifest();
        
        return entry;
    }

    /**
     * Delete a token entry
     */
    async deleteToken(id) {
        const index = this.manifest.tokens.findIndex(t => t.id === id);
        if (index === -1) {
            throw new Error('Token not found');
        }

        this.manifest.tokens.splice(index, 1);
        await this.saveManifest();
        
        return true;
    }

    /**
     * Get all tokens
     */
    getTokens() {
        return this.manifest.tokens || [];
    }

    // ==================== Ideas Lab Operations ====================

    /**
     * Add an idea entry
     */
    async addIdea(entry) {
        const id = VaultCrypto.generateUUID();
        
        const ideaEntry = {
            id: id,
            title: entry.title,
            content: entry.content || '',
            priority: entry.priority || 'backlog', // hot, medium, backlog
            status: entry.status || 'idea', // idea, in-progress, done
            tags: entry.tags || [],
            created: new Date().toISOString(),
            updated: new Date().toISOString()
        };

        this.manifest.ideas.push(ideaEntry);
        await this.saveManifest();
        
        return ideaEntry;
    }

    /**
     * Update an idea entry
     */
    async updateIdea(id, updates) {
        const entry = this.manifest.ideas.find(i => i.id === id);
        if (!entry) {
            throw new Error('Idea not found');
        }

        Object.assign(entry, updates, { updated: new Date().toISOString() });
        await this.saveManifest();
        
        return entry;
    }

    /**
     * Delete an idea entry
     */
    async deleteIdea(id) {
        const index = this.manifest.ideas.findIndex(i => i.id === id);
        if (index === -1) {
            throw new Error('Idea not found');
        }

        this.manifest.ideas.splice(index, 1);
        await this.saveManifest();
        
        return true;
    }

    /**
     * Get all ideas
     */
    getIdeas(filter = 'all') {
        let ideas = this.manifest.ideas || [];
        
        if (filter === 'hot') ideas = ideas.filter(i => i.priority === 'hot');
        else if (filter === 'progress') ideas = ideas.filter(i => i.status === 'in-progress');
        else if (filter === 'done') ideas = ideas.filter(i => i.status === 'done');
        else if (filter === 'backlog') ideas = ideas.filter(i => i.priority === 'backlog');
        
        return ideas;
    }

    // ==================== Media Vault Operations ====================

    /**
     * Upload media file
     */
    async uploadMedia(file) {
        // Use the same upload logic as regular files but categorize as media
        const fileEntry = await this.uploadFile(file, '/media');
        
        // Also add to media list for quick access
        const mediaEntry = {
            id: fileEntry.id,
            name: file.name,
            type: this.getMediaType(file.type),
            size: file.size,
            mime: file.type,
            blobPath: fileEntry.blobPath,
            created: new Date().toISOString()
        };

        this.manifest.media.push(mediaEntry);
        await this.saveManifest();
        
        return mediaEntry;
    }

    /**
     * Get media type category
     */
    getMediaType(mimeType) {
        if (mimeType.startsWith('video/')) return 'video';
        if (mimeType.startsWith('audio/')) return 'audio';
        if (mimeType.startsWith('image/')) return 'image';
        return 'other';
    }

    /**
     * Delete media
     */
    async deleteMedia(id) {
        // Remove from media list
        const mediaIndex = this.manifest.media.findIndex(m => m.id === id);
        if (mediaIndex !== -1) {
            this.manifest.media.splice(mediaIndex, 1);
        }

        // Also remove the file
        await this.deleteFile(id);
        
        return true;
    }

    /**
     * Get all media
     */
    getMedia() {
        return this.manifest.media || [];
    }

    // ==================== Clipboard/Snippets Operations ====================

    /**
     * Add a snippet
     */
    async addSnippet(entry) {
        const id = VaultCrypto.generateUUID();
        
        const snippetEntry = {
            id: id,
            title: entry.title || 'Untitled',
            content: entry.content,
            language: entry.language || 'text',
            pinned: entry.pinned || false,
            created: new Date().toISOString()
        };

        this.manifest.snippets.push(snippetEntry);
        await this.saveManifest();
        
        return snippetEntry;
    }

    /**
     * Update a snippet
     */
    async updateSnippet(id, updates) {
        const entry = this.manifest.snippets.find(s => s.id === id);
        if (!entry) {
            throw new Error('Snippet not found');
        }

        Object.assign(entry, updates);
        await this.saveManifest();
        
        return entry;
    }

    /**
     * Delete a snippet
     */
    async deleteSnippet(id) {
        const index = this.manifest.snippets.findIndex(s => s.id === id);
        if (index === -1) {
            throw new Error('Snippet not found');
        }

        this.manifest.snippets.splice(index, 1);
        await this.saveManifest();
        
        return true;
    }

    /**
     * Get all snippets
     */
    getSnippets() {
        const snippets = this.manifest.snippets || [];
        // Sort with pinned items first
        return snippets.sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            return new Date(b.created) - new Date(a.created);
        });
    }

    // ==================== Statistics ====================

    /**
     * Get vault statistics
     */
    getStats() {
        return {
            totalFiles: this.manifest.files.filter(f => f.type === 'file').length,
            totalFolders: this.manifest.files.filter(f => f.type === 'folder').length,
            totalPasswords: this.manifest.passwords.length,
            totalTokens: this.manifest.tokens.length,
            totalIdeas: this.manifest.ideas.length,
            totalMedia: this.manifest.media.length,
            totalSnippets: this.manifest.snippets.length,
            totalSize: this.manifest.totalSize,
            totalSizeMB: (this.manifest.totalSize / (1024 * 1024)).toFixed(2)
        };
    }

    /**
     * Format file size for display
     */
    formatSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Export singleton instance
window.VaultStorage = new StorageManager();
