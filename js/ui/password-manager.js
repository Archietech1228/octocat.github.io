/**
 * Archie Vault - Password Manager UI
 * Handles the Password Vault section
 */

const PasswordManager = {
    init() {
        this.setupEventListeners();
    },

    setupEventListeners() {
        // Add password button
        document.getElementById('add-password-btn').addEventListener('click', () => {
            this.showAddPasswordModal();
        });

        // Search
        document.getElementById('password-search').addEventListener('input', UI.debounce((e) => {
            this.refresh(e.target.value);
        }, 300));
    },

    refresh(searchQuery = '') {
        const passwordList = document.getElementById('password-list');
        let passwords = VaultStorage.getPasswords();

        if (searchQuery) {
            passwords = VaultStorage.searchPasswords(searchQuery);
        }

        if (passwords.length === 0) {
            passwordList.innerHTML = `
                <div class="text-center text-vault-muted py-8">
                    <i data-lucide="key-round" class="w-12 h-12 mx-auto mb-3 opacity-50"></i>
                    <p>${searchQuery ? 'No matching passwords' : 'No passwords saved yet'}</p>
                </div>
            `;
            lucide.createIcons();
            return;
        }

        passwordList.innerHTML = passwords.map(pw => this.renderPasswordItem(pw)).join('');
        lucide.createIcons();

        // Add event listeners
        passwordList.querySelectorAll('.credential-item').forEach(item => {
            const id = item.dataset.id;

            item.querySelector('.copy-username')?.addEventListener('click', () => {
                const pw = passwords.find(p => p.id === id);
                UI.copyToClipboard(pw.username);
            });

            item.querySelector('.copy-password')?.addEventListener('click', () => {
                const pw = passwords.find(p => p.id === id);
                UI.copyToClipboard(pw.password);
            });

            item.querySelector('.toggle-password')?.addEventListener('click', (e) => {
                const btn = e.currentTarget;
                const display = item.querySelector('.password-display');
                const pw = passwords.find(p => p.id === id);
                
                if (display.textContent === '••••••••') {
                    display.textContent = pw.password;
                    btn.innerHTML = '<i data-lucide="eye-off" class="w-4 h-4"></i>';
                } else {
                    display.textContent = '••••••••';
                    btn.innerHTML = '<i data-lucide="eye" class="w-4 h-4"></i>';
                }
                lucide.createIcons();
            });

            item.querySelector('.edit-btn')?.addEventListener('click', () => {
                this.showEditPasswordModal(id);
            });

            item.querySelector('.delete-btn')?.addEventListener('click', () => {
                this.deletePassword(id);
            });
        });
    },

    renderPasswordItem(pw) {
        return `
            <div class="credential-item" data-id="${pw.id}">
                <div class="w-10 h-10 rounded-lg bg-vault-primary/20 flex items-center justify-center flex-shrink-0">
                    <i data-lucide="globe" class="w-5 h-5 text-vault-primary"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <div class="font-medium">${UI.escapeHtml(pw.site)}</div>
                    <div class="text-sm text-vault-muted">${UI.escapeHtml(pw.username)}</div>
                </div>
                <div class="flex items-center gap-2">
                    <div class="flex items-center gap-1 px-3 py-1 bg-vault-bg rounded-lg">
                        <span class="password-display font-mono text-sm">••••••••</span>
                        <button class="toggle-password p-1 hover:text-vault-primary">
                            <i data-lucide="eye" class="w-4 h-4"></i>
                        </button>
                    </div>
                    <button class="copy-username p-2 hover:bg-vault-bg rounded-lg" title="Copy username">
                        <i data-lucide="user" class="w-4 h-4"></i>
                    </button>
                    <button class="copy-password p-2 hover:bg-vault-bg rounded-lg" title="Copy password">
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

    showAddPasswordModal() {
        const content = `
            <div class="modal-header">
                <h3 class="text-lg font-semibold">Add Password</h3>
                <button class="modal-close p-2 hover:bg-vault-bg rounded-lg">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>
            <div class="modal-body space-y-4">
                <div>
                    <label class="block text-sm font-medium mb-2">Website/App Name *</label>
                    <input type="text" id="pw-site" class="w-full px-4 py-2 bg-vault-bg border border-vault-border rounded-lg focus:outline-none focus:border-vault-primary" placeholder="e.g., GitHub, Netflix">
                </div>
                <div>
                    <label class="block text-sm font-medium mb-2">Username/Email *</label>
                    <input type="text" id="pw-username" class="w-full px-4 py-2 bg-vault-bg border border-vault-border rounded-lg focus:outline-none focus:border-vault-primary" placeholder="your@email.com">
                </div>
                <div>
                    <label class="block text-sm font-medium mb-2">Password *</label>
                    <div class="relative">
                        <input type="password" id="pw-password" class="w-full px-4 py-2 pr-24 bg-vault-bg border border-vault-border rounded-lg focus:outline-none focus:border-vault-primary" placeholder="Enter password">
                        <button type="button" id="generate-pw-btn" class="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs bg-vault-primary/20 text-vault-primary rounded hover:bg-vault-primary/30">
                            Generate
                        </button>
                    </div>
                    <div class="password-strength mt-2">
                        <div class="bar"></div>
                        <div class="bar"></div>
                        <div class="bar"></div>
                        <div class="bar"></div>
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-medium mb-2">URL (optional)</label>
                    <input type="url" id="pw-url" class="w-full px-4 py-2 bg-vault-bg border border-vault-border rounded-lg focus:outline-none focus:border-vault-primary" placeholder="https://...">
                </div>
                <div>
                    <label class="block text-sm font-medium mb-2">Notes (optional)</label>
                    <textarea id="pw-notes" rows="2" class="w-full px-4 py-2 bg-vault-bg border border-vault-border rounded-lg focus:outline-none focus:border-vault-primary" placeholder="Additional notes..."></textarea>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary modal-cancel">Cancel</button>
                <button class="btn btn-primary modal-save">Save Password</button>
            </div>
        `;

        const modal = UI.showModal(content);

        // Generate password button
        document.getElementById('generate-pw-btn').addEventListener('click', () => {
            const generated = VaultCrypto.generatePassword(16);
            document.getElementById('pw-password').value = generated;
            document.getElementById('pw-password').type = 'text';
            this.updatePasswordStrength(generated);
        });

        // Password strength indicator
        document.getElementById('pw-password').addEventListener('input', (e) => {
            this.updatePasswordStrength(e.target.value);
        });

        document.querySelector('.modal-close').addEventListener('click', () => modal.close());
        document.querySelector('.modal-cancel').addEventListener('click', () => modal.close());
        document.querySelector('.modal-save').addEventListener('click', () => {
            this.savePassword(modal);
        });
    },

    showEditPasswordModal(id) {
        const pw = VaultStorage.getPasswords().find(p => p.id === id);
        if (!pw) return;

        const content = `
            <div class="modal-header">
                <h3 class="text-lg font-semibold">Edit Password</h3>
                <button class="modal-close p-2 hover:bg-vault-bg rounded-lg">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>
            <div class="modal-body space-y-4">
                <div>
                    <label class="block text-sm font-medium mb-2">Website/App Name *</label>
                    <input type="text" id="pw-site" value="${UI.escapeHtml(pw.site)}" class="w-full px-4 py-2 bg-vault-bg border border-vault-border rounded-lg focus:outline-none focus:border-vault-primary">
                </div>
                <div>
                    <label class="block text-sm font-medium mb-2">Username/Email *</label>
                    <input type="text" id="pw-username" value="${UI.escapeHtml(pw.username)}" class="w-full px-4 py-2 bg-vault-bg border border-vault-border rounded-lg focus:outline-none focus:border-vault-primary">
                </div>
                <div>
                    <label class="block text-sm font-medium mb-2">Password *</label>
                    <input type="text" id="pw-password" value="${UI.escapeHtml(pw.password)}" class="w-full px-4 py-2 bg-vault-bg border border-vault-border rounded-lg focus:outline-none focus:border-vault-primary">
                </div>
                <div>
                    <label class="block text-sm font-medium mb-2">URL</label>
                    <input type="url" id="pw-url" value="${UI.escapeHtml(pw.url || '')}" class="w-full px-4 py-2 bg-vault-bg border border-vault-border rounded-lg focus:outline-none focus:border-vault-primary">
                </div>
                <div>
                    <label class="block text-sm font-medium mb-2">Notes</label>
                    <textarea id="pw-notes" rows="2" class="w-full px-4 py-2 bg-vault-bg border border-vault-border rounded-lg focus:outline-none focus:border-vault-primary">${UI.escapeHtml(pw.notes || '')}</textarea>
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
            this.updatePassword(id, modal);
        });
    },

    updatePasswordStrength(password) {
        const strength = VaultCrypto.calculatePasswordStrength(password);
        const indicator = document.querySelector('.password-strength');
        
        indicator.className = 'password-strength';
        
        if (strength === 0) return;
        if (strength === 1) indicator.classList.add('weak');
        else if (strength === 2) indicator.classList.add('fair');
        else if (strength === 3) indicator.classList.add('good');
        else indicator.classList.add('strong');
    },

    async savePassword(modal) {
        const site = document.getElementById('pw-site').value.trim();
        const username = document.getElementById('pw-username').value.trim();
        const password = document.getElementById('pw-password').value;
        const url = document.getElementById('pw-url').value.trim();
        const notes = document.getElementById('pw-notes').value.trim();

        if (!site || !username || !password) {
            UI.toast('Please fill in all required fields', 'warning');
            return;
        }

        App.setSyncStatus('syncing');
        modal.close();

        try {
            await VaultStorage.addPassword({ site, username, password, url, notes });
            App.setSyncStatus('synced');
            this.refresh();
            UI.toast('Password saved!', 'success');
        } catch (error) {
            App.setSyncStatus('error');
            UI.toast('Failed to save: ' + error.message, 'error');
        }
    },

    async updatePassword(id, modal) {
        const site = document.getElementById('pw-site').value.trim();
        const username = document.getElementById('pw-username').value.trim();
        const password = document.getElementById('pw-password').value;
        const url = document.getElementById('pw-url').value.trim();
        const notes = document.getElementById('pw-notes').value.trim();

        if (!site || !username || !password) {
            UI.toast('Please fill in all required fields', 'warning');
            return;
        }

        App.setSyncStatus('syncing');
        modal.close();

        try {
            await VaultStorage.updatePassword(id, { site, username, password, url, notes });
            App.setSyncStatus('synced');
            this.refresh();
            UI.toast('Password updated!', 'success');
        } catch (error) {
            App.setSyncStatus('error');
            UI.toast('Failed to update: ' + error.message, 'error');
        }
    },

    async deletePassword(id) {
        const confirmed = await UI.confirm(
            'Are you sure you want to delete this password?',
            { title: 'Delete Password', danger: true, confirmText: 'Delete' }
        );

        if (!confirmed) return;

        App.setSyncStatus('syncing');

        try {
            await VaultStorage.deletePassword(id);
            App.setSyncStatus('synced');
            this.refresh();
            UI.toast('Password deleted', 'success');
        } catch (error) {
            App.setSyncStatus('error');
            UI.toast('Failed to delete: ' + error.message, 'error');
        }
    }
};

window.PasswordManager = PasswordManager;
