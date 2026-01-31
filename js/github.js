/**
 * Archie Vault - GitHub API Wrapper
 * Handles all interactions with the private GitHub repository
 */

class GitHubAPI {
    constructor() {
        this.token = null;
        this.owner = 'Archietech1228';
        this.repo = 'VAULT-ARCHIETECH';
        this.baseURL = 'https://api.github.com';
        this.rateLimit = {
            remaining: 5000,
            reset: null
        };
    }

    /**
     * Set the authentication token
     */
    setToken(token) {
        this.token = token;
    }

    /**
     * Clear the token
     */
    clearToken() {
        this.token = null;
    }

    /**
     * Make an authenticated API request
     */
    async request(endpoint, options = {}) {
        if (!this.token) {
            throw new Error('GitHub token not set');
        }

        const url = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${endpoint}`;
        
        const response = await fetch(url, {
            ...options,
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
                ...options.headers
            }
        });

        // Update rate limit info
        const remaining = response.headers.get('X-RateLimit-Remaining');
        const reset = response.headers.get('X-RateLimit-Reset');
        if (remaining) this.rateLimit.remaining = parseInt(remaining);
        if (reset) this.rateLimit.reset = new Date(parseInt(reset) * 1000);

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || `GitHub API error: ${response.status}`);
        }

        // Handle 204 No Content
        if (response.status === 204) {
            return null;
        }

        return response.json();
    }

    /**
     * Verify token and get user info
     */
    async verifyToken() {
        try {
            const user = await this.request('/user');
            return {
                valid: true,
                username: user.login,
                avatar: user.avatar_url
            };
        } catch (error) {
            return {
                valid: false,
                error: error.message
            };
        }
    }

    /**
     * Check if the data repository exists and is accessible
     */
    async checkRepository() {
        try {
            const repo = await this.request(`/repos/${this.owner}/${this.repo}`);
            return {
                exists: true,
                private: repo.private,
                size: repo.size
            };
        } catch (error) {
            if (error.message.includes('404') || error.message.includes('Not Found')) {
                return { exists: false };
            }
            throw error;
        }
    }

    /**
     * Get file content from repository
     */
    async getFile(path) {
        try {
            const data = await this.request(`/repos/${this.owner}/${this.repo}/contents/${path}`);
            
            // Decode base64 content
            const content = atob(data.content.replace(/\n/g, ''));
            
            return {
                content: content,
                sha: data.sha,
                size: data.size
            };
        } catch (error) {
            // Handle both 404 and empty repo messages
            if (error.message.includes('404') || error.message.includes('Not Found') || error.message.includes('empty')) {
                return null;
            }
            throw error;
        }
    }

    /**
     * Get raw file content (for binary files)
     */
    async getFileRaw(path) {
        try {
            const data = await this.request(`/repos/${this.owner}/${this.repo}/contents/${path}`);
            return {
                content: data.content, // Base64 encoded
                sha: data.sha,
                size: data.size
            };
        } catch (error) {
            if (error.message.includes('404') || error.message.includes('Not Found') || error.message.includes('empty')) {
                return null;
            }
            throw error;
        }
    }

    /**
     * Get file as JSON
     */
    async getJSON(path) {
        const file = await this.getFile(path);
        if (!file) return null;
        return JSON.parse(file.content);
    }

    /**
     * Create or update a file
     */
    async putFile(path, content, message = 'Update via Archie Vault') {
        // Check if file exists to get SHA
        let sha = null;
        try {
            const existing = await this.request(`/repos/${this.owner}/${this.repo}/contents/${path}`);
            sha = existing.sha;
        } catch {
            // File doesn't exist, that's fine
        }

        // Encode content to base64
        let base64Content;
        if (typeof content === 'string') {
            base64Content = btoa(unescape(encodeURIComponent(content)));
        } else if (content instanceof Uint8Array || content instanceof ArrayBuffer) {
            const bytes = content instanceof ArrayBuffer ? new Uint8Array(content) : content;
            let binary = '';
            for (let i = 0; i < bytes.length; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            base64Content = btoa(binary);
        } else {
            base64Content = btoa(content);
        }

        const body = {
            message: message,
            content: base64Content
        };

        if (sha) {
            body.sha = sha;
        }

        const result = await this.request(`/repos/${this.owner}/${this.repo}/contents/${path}`, {
            method: 'PUT',
            body: JSON.stringify(body)
        });

        return {
            sha: result.content.sha,
            path: result.content.path
        };
    }

    /**
     * Save JSON file
     */
    async putJSON(path, data, message) {
        const content = JSON.stringify(data, null, 2);
        return this.putFile(path, content, message);
    }

    /**
     * Delete a file
     */
    async deleteFile(path, message = 'Delete via Archie Vault') {
        // Get the SHA first
        const file = await this.request(`/repos/${this.owner}/${this.repo}/contents/${path}`);
        
        await this.request(`/repos/${this.owner}/${this.repo}/contents/${path}`, {
            method: 'DELETE',
            body: JSON.stringify({
                message: message,
                sha: file.sha
            })
        });

        return true;
    }

    /**
     * List files in a directory
     */
    async listFiles(path = '') {
        try {
            const data = await this.request(`/repos/${this.owner}/${this.repo}/contents/${path}`);
            
            if (!Array.isArray(data)) {
                // Single file
                return [data];
            }

            return data.map(item => ({
                name: item.name,
                path: item.path,
                type: item.type, // 'file' or 'dir'
                size: item.size,
                sha: item.sha
            }));
        } catch (error) {
            if (error.message.includes('404') || error.message.includes('Not Found') || error.message.includes('empty')) {
                return [];
            }
            throw error;
        }
    }

    /**
     * Get the SHA of the data folder
     */
    async getTreeSha(path = '') {
        try {
            const branch = await this.request(`/repos/${this.owner}/${this.repo}/branches/main`);
            return branch.commit.sha;
        } catch {
            return null;
        }
    }

    /**
     * Create multiple files in one commit (for batch operations)
     * This is more efficient for creating many files at once
     */
    async createTree(files) {
        // Get the current tree SHA
        const ref = await this.request(`/repos/${this.owner}/${this.repo}/git/ref/heads/main`);
        const commitSha = ref.object.sha;
        const commit = await this.request(`/repos/${this.owner}/${this.repo}/git/commits/${commitSha}`);
        const treeSha = commit.tree.sha;

        // Create blobs for each file
        const tree = await Promise.all(files.map(async (file) => {
            const blob = await this.request(`/repos/${this.owner}/${this.repo}/git/blobs`, {
                method: 'POST',
                body: JSON.stringify({
                    content: file.content,
                    encoding: file.encoding || 'base64'
                })
            });

            return {
                path: file.path,
                mode: '100644',
                type: 'blob',
                sha: blob.sha
            };
        }));

        // Create new tree
        const newTree = await this.request(`/repos/${this.owner}/${this.repo}/git/trees`, {
            method: 'POST',
            body: JSON.stringify({
                base_tree: treeSha,
                tree: tree
            })
        });

        // Create commit
        const newCommit = await this.request(`/repos/${this.owner}/${this.repo}/git/commits`, {
            method: 'POST',
            body: JSON.stringify({
                message: 'Batch update via Archie Vault',
                tree: newTree.sha,
                parents: [commitSha]
            })
        });

        // Update reference
        await this.request(`/repos/${this.owner}/${this.repo}/git/refs/heads/main`, {
            method: 'PATCH',
            body: JSON.stringify({
                sha: newCommit.sha
            })
        });

        return newCommit.sha;
    }

    /**
     * Get repository size info
     */
    async getStorageInfo() {
        const repo = await this.request(`/repos/${this.owner}/${this.repo}`);
        return {
            sizeKB: repo.size,
            sizeMB: (repo.size / 1024).toFixed(2),
            sizeGB: (repo.size / 1024 / 1024).toFixed(4)
        };
    }

    /**
     * Get remaining API calls
     */
    getRateLimitInfo() {
        return {
            remaining: this.rateLimit.remaining,
            reset: this.rateLimit.reset
        };
    }

    /**
     * Initialize repository with vault structure if empty
     */
    async initializeVault(salt, verificationToken) {
        // Create the meta file with salt and verification
        const meta = {
            version: '1.0.0',
            created: new Date().toISOString(),
            salt: salt, // Base64 encoded
            verification: verificationToken // Encrypted verification token
        };

        await this.putJSON('vault.meta', meta, 'Initialize Archie Vault');

        // Create empty index
        await this.putFile('index.enc', JSON.stringify({ iv: '', data: '' }), 'Initialize vault index');

        // Create data directory marker
        await this.putFile('data/.gitkeep', '', 'Create data directory');

        return true;
    }

    /**
     * Get vault metadata (salt, verification)
     */
    async getVaultMeta() {
        return this.getJSON('vault.meta');
    }

    /**
     * Check if vault is initialized
     */
    async isVaultInitialized() {
        const meta = await this.getVaultMeta();
        return meta !== null;
    }
}

// Export singleton instance
window.VaultGitHub = new GitHubAPI();
