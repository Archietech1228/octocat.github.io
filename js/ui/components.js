/**
 * Archie Vault - UI Components
 * Reusable UI elements and helpers
 */

const UI = {
    /**
     * Show a toast notification
     */
    toast(message, type = 'info', duration = 3000) {
        const container = document.getElementById('toast-container');
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: 'check-circle',
            error: 'alert-circle',
            warning: 'alert-triangle',
            info: 'info'
        };

        toast.innerHTML = `
            <i data-lucide="${icons[type] || 'info'}" class="w-5 h-5 ${type === 'success' ? 'text-vault-success' : type === 'error' ? 'text-vault-danger' : type === 'warning' ? 'text-vault-warning' : 'text-vault-primary'}"></i>
            <span>${message}</span>
        `;

        container.appendChild(toast);
        lucide.createIcons({ icons: { [icons[type]]: true }, attrs: {} });

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },

    /**
     * Show a modal with custom content
     */
    showModal(content, options = {}) {
        const overlay = document.getElementById('modal-overlay');
        const modalContent = document.getElementById('modal-content');
        
        modalContent.innerHTML = content;
        overlay.classList.remove('hidden');
        
        // Initialize icons in modal
        lucide.createIcons();

        // Handle close
        if (options.closable !== false) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    this.closeModal();
                }
            }, { once: true });
        }

        return {
            close: () => this.closeModal(),
            element: modalContent
        };
    },

    /**
     * Close the modal
     */
    closeModal() {
        const overlay = document.getElementById('modal-overlay');
        overlay.classList.add('hidden');
    },

    /**
     * Show confirmation dialog
     */
    async confirm(message, options = {}) {
        return new Promise((resolve) => {
            const content = `
                <div class="modal-header">
                    <h3 class="text-lg font-semibold">${options.title || 'Confirm'}</h3>
                    <button class="modal-close p-2 hover:bg-vault-bg rounded-lg">
                        <i data-lucide="x" class="w-5 h-5"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <p class="text-vault-muted">${message}</p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary modal-cancel">Cancel</button>
                    <button class="btn ${options.danger ? 'btn-danger' : 'btn-primary'} modal-confirm">
                        ${options.confirmText || 'Confirm'}
                    </button>
                </div>
            `;

            const modal = this.showModal(content);

            document.querySelector('.modal-close').addEventListener('click', () => {
                modal.close();
                resolve(false);
            });

            document.querySelector('.modal-cancel').addEventListener('click', () => {
                modal.close();
                resolve(false);
            });

            document.querySelector('.modal-confirm').addEventListener('click', () => {
                modal.close();
                resolve(true);
            });
        });
    },

    /**
     * Show a prompt dialog
     */
    async prompt(message, options = {}) {
        return new Promise((resolve) => {
            const content = `
                <div class="modal-header">
                    <h3 class="text-lg font-semibold">${options.title || 'Input'}</h3>
                    <button class="modal-close p-2 hover:bg-vault-bg rounded-lg">
                        <i data-lucide="x" class="w-5 h-5"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <p class="text-vault-muted mb-4">${message}</p>
                    <input 
                        type="${options.type || 'text'}" 
                        class="w-full px-4 py-2 bg-vault-bg border border-vault-border rounded-lg focus:outline-none focus:border-vault-primary"
                        placeholder="${options.placeholder || ''}"
                        value="${options.defaultValue || ''}"
                        id="prompt-input"
                    >
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary modal-cancel">Cancel</button>
                    <button class="btn btn-primary modal-confirm">${options.confirmText || 'OK'}</button>
                </div>
            `;

            const modal = this.showModal(content);
            const input = document.getElementById('prompt-input');
            input.focus();

            const handleSubmit = () => {
                modal.close();
                resolve(input.value);
            };

            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') handleSubmit();
            });

            document.querySelector('.modal-close').addEventListener('click', () => {
                modal.close();
                resolve(null);
            });

            document.querySelector('.modal-cancel').addEventListener('click', () => {
                modal.close();
                resolve(null);
            });

            document.querySelector('.modal-confirm').addEventListener('click', handleSubmit);
        });
    },

    /**
     * Show loading overlay
     */
    showLoading(message = 'Loading...') {
        const overlay = document.createElement('div');
        overlay.id = 'loading-overlay';
        overlay.className = 'fixed inset-0 bg-black/70 z-[100] flex items-center justify-center';
        overlay.innerHTML = `
            <div class="text-center">
                <div class="spinner mx-auto mb-4"></div>
                <p class="text-vault-muted">${message}</p>
            </div>
        `;
        document.body.appendChild(overlay);
    },

    /**
     * Hide loading overlay
     */
    hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) overlay.remove();
    },

    /**
     * Copy text to clipboard
     */
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.toast('Copied to clipboard', 'success');
            return true;
        } catch {
            this.toast('Failed to copy', 'error');
            return false;
        }
    },

    /**
     * Download a blob as a file
     */
    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    /**
     * Format date for display
     */
    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
        
        return date.toLocaleDateString();
    },

    /**
     * Format file size
     */
    formatSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    /**
     * Get file icon based on mime type
     */
    getFileIcon(mimeType, isFolder = false) {
        if (isFolder) return 'folder';
        
        if (!mimeType) return 'file';
        
        if (mimeType.startsWith('image/')) return 'image';
        if (mimeType.startsWith('video/')) return 'film';
        if (mimeType.startsWith('audio/')) return 'music';
        if (mimeType.includes('pdf')) return 'file-text';
        if (mimeType.includes('zip') || mimeType.includes('archive') || mimeType.includes('compressed')) return 'archive';
        if (mimeType.includes('text') || mimeType.includes('json') || mimeType.includes('javascript')) return 'file-code';
        
        return 'file';
    },

    /**
     * Show context menu
     */
    showContextMenu(x, y, items) {
        // Remove existing context menu
        this.hideContextMenu();

        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.id = 'context-menu';
        
        items.forEach((item, index) => {
            if (item.separator) {
                menu.innerHTML += '<hr>';
            } else {
                const btn = document.createElement('button');
                btn.className = item.danger ? 'danger' : '';
                btn.innerHTML = `
                    <i data-lucide="${item.icon || 'chevron-right'}" class="w-4 h-4"></i>
                    <span>${item.label}</span>
                `;
                btn.addEventListener('click', () => {
                    this.hideContextMenu();
                    item.action();
                });
                menu.appendChild(btn);
            }
        });

        // Position the menu
        document.body.appendChild(menu);
        lucide.createIcons();

        // Adjust position to stay within viewport
        const rect = menu.getBoundingClientRect();
        if (x + rect.width > window.innerWidth) {
            x = window.innerWidth - rect.width - 10;
        }
        if (y + rect.height > window.innerHeight) {
            y = window.innerHeight - rect.height - 10;
        }

        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;

        // Close on click outside
        setTimeout(() => {
            document.addEventListener('click', () => this.hideContextMenu(), { once: true });
        }, 100);
    },

    /**
     * Hide context menu
     */
    hideContextMenu() {
        const menu = document.getElementById('context-menu');
        if (menu) menu.remove();
    },

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    /**
     * Debounce function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};

// Make available globally
window.UI = UI;
