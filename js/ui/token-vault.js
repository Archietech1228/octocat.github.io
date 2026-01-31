/**
 * Archie Vault - Token Vault UI
 * Handles the Token/API Keys section
 */

const TokenVault = {
    init() {
        this.setupEventListeners();
    },

    setupEventListeners() {
        document.getElementById('add-token-btn').addEventListener('click', () => {
            this.showAddTokenModal();
        });
    },

    refresh() {
        const tokenList = document.getElementById('token-list');
        const tokens = VaultStorage.getTokens();

        if (tokens.length === 0) {
            tokenList.innerHTML = `
                <div class="text-center text-vault-muted py-8">
                    <i data-lucide="ticket" class="w-12 h-12 mx-auto mb-3 opacity-50"></i>
                    <p>No tokens saved yet</p>
                </div>
            `;
            lucide.createIcons();
            return;
        }

        tokenList.innerHTML = tokens.map(token => this.renderTokenItem(token)).join('');
        lucide.createIcons();

        // Add event listeners
        tokenList.querySelectorAll('.credential-item').forEach(item => {
            const id = item.dataset.id;
            const token = tokens.find(t => t.id === id);

            item.querySelector('.copy-token')?.addEventListener('click', () => {
                UI.copyToClipboard(token.token);
            });

            item.querySelector('.toggle-token')?.addEventListener('click', (e) => {
                const btn = e.currentTarget;
                const display = item.querySelector('.token-display');
                
                if (display.textContent.includes('•')) {
                    display.textContent = token.token;
                    btn.innerHTML = '<i data-lucide="eye-off" class="w-4 h-4"></i>';
                } else {
                    display.textContent = this.maskToken(token.token);
                    btn.innerHTML = '<i data-lucide="eye" class="w-4 h-4"></i>';
                }
                lucide.createIcons();
            });

            item.querySelector('.edit-btn')?.addEventListener('click', () => {
                this.showEditTokenModal(id);
            });

            item.querySelector('.delete-btn')?.addEventListener('click', () => {
                this.deleteToken(id);
            });
        });
    },

    maskToken(token) {
        if (token.length <= 8) return '••••••••';
        return token.substring(0, 4) + '••••••••' + token.substring(token.length - 4);
    },

    renderTokenItem(token) {
        const envColors = {
            production: 'text-vault-danger',
            staging: 'text-vault-warning',
            development: 'text-vault-success'
        };
        const envColor = envColors[token.environment] || 'text-vault-muted';
        
        let expiryBadge = '';
        if (token.expiresAt) {
            const expires = new Date(token.expiresAt);
            const now = new Date();
            const daysLeft = Math.ceil((expires - now) / (1000 * 60 * 60 * 24));
            
            if (daysLeft < 0) {
                expiryBadge = '<span class="ml-2 px-2 py-0.5 bg-vault-danger/20 text-vault-danger text-xs rounded">Expired</span>';
            } else if (daysLeft < 7) {
                expiryBadge = `<span class="ml-2 px-2 py-0.5 bg-vault-warning/20 text-vault-warning text-xs rounded">Expires in ${daysLeft}d</span>`;
            }
        }

        return `
            <div class="credential-item" data-id="${token.id}">
                <div class="w-10 h-10 rounded-lg bg-vault-primary/20 flex items-center justify-center flex-shrink-0">
                    <i data-lucide="key" class="w-5 h-5 text-vault-primary"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <div class="font-medium flex items-center">
                        ${UI.escapeHtml(token.service)}
                        ${expiryBadge}
                    </div>
                    <div class="text-sm text-vault-muted flex items-center gap-2">
                        <span class="${envColor} text-xs uppercase">${token.environment}</span>
                        ${token.description ? `• ${UI.escapeHtml(token.description)}` : ''}
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <div class="flex items-center gap-1 px-3 py-1 bg-vault-bg rounded-lg max-w-[200px]">
                        <span class="token-display font-mono text-sm truncate">${this.maskToken(token.token)}</span>
                        <button class="toggle-token p-1 hover:text-vault-primary flex-shrink-0">
                            <i data-lucide="eye" class="w-4 h-4"></i>
                        </button>
                    </div>
                    <button class="copy-token p-2 hover:bg-vault-bg rounded-lg" title="Copy token">
                        <i data-lucide="copy" class="w-4 h-4"></i>
                    </button>
                    <button class="edit-btn p-2 hover:bg-vault-bg rounded-lg" title="Edit">
                        <i data-lucide="pencil" class="w-4 h-4"></i>
                    </button>
                    <button class="delete-btn p-2 hover:bg-vault-danger/20 text-vault-danger rounded-lg" title="Delete">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            </div>
        `;
    },

    showAddTokenModal() {
        const content = `
            <div class="modal-header">
                <h3 class="text-lg font-semibold">Add Token</h3>
                <button class="modal-close p-2 hover:bg-vault-bg rounded-lg">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>
            <div class="modal-body space-y-4">
                <div>
                    <label class="block text-sm font-medium mb-2">Service Name *</label>
                    <input type="text" id="token-service" class="w-full px-4 py-2 bg-vault-bg border border-vault-border rounded-lg focus:outline-none focus:border-vault-primary" placeholder="e.g., GitHub, AWS, Stripe">
                </div>
                <div>
                    <label class="block text-sm font-medium mb-2">Token/API Key *</label>
                    <textarea id="token-value" rows="3" class="w-full px-4 py-2 bg-vault-bg border border-vault-border rounded-lg focus:outline-none focus:border-vault-primary font-mono text-sm" placeholder="Paste your token here"></textarea>
                </div>
                <div>
                    <label class="block text-sm font-medium mb-2">Environment</label>
                    <select id="token-env" class="w-full px-4 py-2 bg-vault-bg border border-vault-border rounded-lg focus:outline-none focus:border-vault-primary">
                        <option value="production">Production</option>
                        <option value="staging">Staging</option>
                        <option value="development">Development</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium mb-2">Description</label>
                    <input type="text" id="token-desc" class="w-full px-4 py-2 bg-vault-bg border border-vault-border rounded-lg focus:outline-none focus:border-vault-primary" placeholder="What's this token for?">
                </div>
                <div>
                    <label class="block text-sm font-medium mb-2">Expiration Date (optional)</label>
                    <input type="date" id="token-expires" class="w-full px-4 py-2 bg-vault-bg border border-vault-border rounded-lg focus:outline-none focus:border-vault-primary">
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary modal-cancel">Cancel</button>
                <button class="btn btn-primary modal-save">Save Token</button>
            </div>
        `;

        const modal = UI.showModal(content);

        document.querySelector('.modal-close').addEventListener('click', () => modal.close());
        document.querySelector('.modal-cancel').addEventListener('click', () => modal.close());
        document.querySelector('.modal-save').addEventListener('click', () => {
            this.saveToken(modal);
        });
    },

    showEditTokenModal(id) {
        const token = VaultStorage.getTokens().find(t => t.id === id);
        if (!token) return;

        const content = `
            <div class="modal-header">
                <h3 class="text-lg font-semibold">Edit Token</h3>
                <button class="modal-close p-2 hover:bg-vault-bg rounded-lg">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>
            <div class="modal-body space-y-4">
                <div>
                    <label class="block text-sm font-medium mb-2">Service Name *</label>
                    <input type="text" id="token-service" value="${UI.escapeHtml(token.service)}" class="w-full px-4 py-2 bg-vault-bg border border-vault-border rounded-lg focus:outline-none focus:border-vault-primary">
                </div>
                <div>
                    <label class="block text-sm font-medium mb-2">Token/API Key *</label>
                    <textarea id="token-value" rows="3" class="w-full px-4 py-2 bg-vault-bg border border-vault-border rounded-lg focus:outline-none focus:border-vault-primary font-mono text-sm">${UI.escapeHtml(token.token)}</textarea>
                </div>
                <div>
                    <label class="block text-sm font-medium mb-2">Environment</label>
                    <select id="token-env" class="w-full px-4 py-2 bg-vault-bg border border-vault-border rounded-lg focus:outline-none focus:border-vault-primary">
                        <option value="production" ${token.environment === 'production' ? 'selected' : ''}>Production</option>
                        <option value="staging" ${token.environment === 'staging' ? 'selected' : ''}>Staging</option>
                        <option value="development" ${token.environment === 'development' ? 'selected' : ''}>Development</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium mb-2">Description</label>
                    <input type="text" id="token-desc" value="${UI.escapeHtml(token.description || '')}" class="w-full px-4 py-2 bg-vault-bg border border-vault-border rounded-lg focus:outline-none focus:border-vault-primary">
                </div>
                <div>
                    <label class="block text-sm font-medium mb-2">Expiration Date</label>
                    <input type="date" id="token-expires" value="${token.expiresAt ? token.expiresAt.split('T')[0] : ''}" class="w-full px-4 py-2 bg-vault-bg border border-vault-border rounded-lg focus:outline-none focus:border-vault-primary">
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary modal-cancel">Cancel</button>
                <button class="btn btn-primary modal-save">Update</button>
            </div>
        `;

        const modal = UI.showModal(content);

        document.querySelector('.modal-close').addEventListener('click', () => modal.close());
        document.querySelector('.modal-cancel').addEventListener('click', () => modal.close());
        document.querySelector('.modal-save').addEventListener('click', () => {
            this.updateToken(id, modal);
        });
    },

    async saveToken(modal) {
        const service = document.getElementById('token-service').value.trim();
        const token = document.getElementById('token-value').value.trim();
        const environment = document.getElementById('token-env').value;
        const description = document.getElementById('token-desc').value.trim();
        const expiresAt = document.getElementById('token-expires').value || null;

        if (!service || !token) {
            UI.toast('Please fill in required fields', 'warning');
            return;
        }

        App.setSyncStatus('syncing');
        modal.close();

        try {
            await VaultStorage.addToken({ service, token, environment, description, expiresAt });
            App.setSyncStatus('synced');
            this.refresh();
            UI.toast('Token saved!', 'success');
        } catch (error) {
            App.setSyncStatus('error');
            UI.toast('Failed to save: ' + error.message, 'error');
        }
    },

    async updateToken(id, modal) {
        const service = document.getElementById('token-service').value.trim();
        const token = document.getElementById('token-value').value.trim();
        const environment = document.getElementById('token-env').value;
        const description = document.getElementById('token-desc').value.trim();
        const expiresAt = document.getElementById('token-expires').value || null;

        if (!service || !token) {
            UI.toast('Please fill in required fields', 'warning');
            return;
        }

        App.setSyncStatus('syncing');
        modal.close();

        try {
            await VaultStorage.updateToken(id, { service, token, environment, description, expiresAt });
            App.setSyncStatus('synced');
            this.refresh();
            UI.toast('Token updated!', 'success');
        } catch (error) {
            App.setSyncStatus('error');
            UI.toast('Failed to update: ' + error.message, 'error');
        }
    },

    async deleteToken(id) {
        const confirmed = await UI.confirm(
            'Are you sure you want to delete this token?',
            { title: 'Delete Token', danger: true, confirmText: 'Delete' }
        );

        if (!confirmed) return;

        App.setSyncStatus('syncing');

        try {
            await VaultStorage.deleteToken(id);
            App.setSyncStatus('synced');
            this.refresh();
            UI.toast('Token deleted', 'success');
        } catch (error) {
            App.setSyncStatus('error');
            UI.toast('Failed to delete: ' + error.message, 'error');
        }
    }
};

window.TokenVault = TokenVault;
