/**
 * Archie Vault - Clipboard/Snippets UI
 * Handles the Quick Clipboard section
 */

const ClipboardManager = {
    init() {
        this.setupEventListeners();
    },

    setupEventListeners() {
        document.getElementById('add-snippet-btn').addEventListener('click', () => {
            this.showAddSnippetModal();
        });
    },

    refresh() {
        const snippetList = document.getElementById('snippet-list');
        const snippets = VaultStorage.getSnippets();

        if (snippets.length === 0) {
            snippetList.innerHTML = `
                <div class="text-center text-vault-muted py-8">
                    <i data-lucide="clipboard" class="w-12 h-12 mx-auto mb-3 opacity-50"></i>
                    <p>No snippets saved yet</p>
                </div>
            `;
            lucide.createIcons();
            return;
        }

        snippetList.innerHTML = snippets.map(snippet => this.renderSnippetItem(snippet)).join('');
        lucide.createIcons();

        // Add event listeners
        snippetList.querySelectorAll('.snippet-item').forEach(item => {
            const id = item.dataset.id;
            const snippet = snippets.find(s => s.id === id);

            item.querySelector('.copy-btn')?.addEventListener('click', () => {
                UI.copyToClipboard(snippet.content);
            });

            item.querySelector('.pin-btn')?.addEventListener('click', () => {
                this.togglePin(id);
            });

            item.querySelector('.edit-btn')?.addEventListener('click', () => {
                this.showEditSnippetModal(id);
            });

            item.querySelector('.delete-btn')?.addEventListener('click', () => {
                this.deleteSnippet(id);
            });
        });
    },

    renderSnippetItem(snippet) {
        const languageColors = {
            javascript: 'text-yellow-400',
            python: 'text-blue-400',
            html: 'text-orange-400',
            css: 'text-pink-400',
            json: 'text-green-400',
            text: 'text-vault-muted'
        };
        const langColor = languageColors[snippet.language] || 'text-vault-muted';

        return `
            <div class="snippet-item ${snippet.pinned ? 'border-vault-warning' : ''}" data-id="${snippet.id}">
                <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center gap-2">
                        ${snippet.pinned ? '<i data-lucide="pin" class="w-4 h-4 text-vault-warning"></i>' : ''}
                        <span class="font-medium">${UI.escapeHtml(snippet.title)}</span>
                        <span class="text-xs ${langColor}">${snippet.language}</span>
                    </div>
                    <div class="flex items-center gap-1">
                        <button class="copy-btn p-1.5 hover:bg-vault-bg rounded" title="Copy">
                            <i data-lucide="copy" class="w-4 h-4"></i>
                        </button>
                        <button class="pin-btn p-1.5 hover:bg-vault-bg rounded" title="${snippet.pinned ? 'Unpin' : 'Pin'}">
                            <i data-lucide="${snippet.pinned ? 'pin-off' : 'pin'}" class="w-4 h-4"></i>
                        </button>
                        <button class="edit-btn p-1.5 hover:bg-vault-bg rounded" title="Edit">
                            <i data-lucide="pencil" class="w-4 h-4"></i>
                        </button>
                        <button class="delete-btn p-1.5 hover:bg-vault-danger/20 text-vault-danger rounded" title="Delete">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                </div>
                <pre class="font-mono text-sm whitespace-pre-wrap break-all">${UI.escapeHtml(snippet.content.length > 500 ? snippet.content.substring(0, 500) + '...' : snippet.content)}</pre>
                <div class="text-xs text-vault-muted mt-2">${UI.formatDate(snippet.created)}</div>
            </div>
        `;
    },

    showAddSnippetModal() {
        const content = `
            <div class="modal-header">
                <h3 class="text-lg font-semibold">New Snippet</h3>
                <button class="modal-close p-2 hover:bg-vault-bg rounded-lg">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>
            <div class="modal-body space-y-4">
                <div>
                    <label class="block text-sm font-medium mb-2">Title</label>
                    <input type="text" id="snippet-title" class="w-full px-4 py-2 bg-vault-bg border border-vault-border rounded-lg focus:outline-none focus:border-vault-primary" placeholder="e.g., API Response Template">
                </div>
                <div>
                    <label class="block text-sm font-medium mb-2">Content *</label>
                    <textarea id="snippet-content" rows="8" class="w-full px-4 py-2 bg-vault-bg border border-vault-border rounded-lg focus:outline-none focus:border-vault-primary font-mono text-sm" placeholder="Paste your snippet here..."></textarea>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium mb-2">Language</label>
                        <select id="snippet-language" class="w-full px-4 py-2 bg-vault-bg border border-vault-border rounded-lg focus:outline-none focus:border-vault-primary">
                            <option value="text">Plain Text</option>
                            <option value="javascript">JavaScript</option>
                            <option value="python">Python</option>
                            <option value="html">HTML</option>
                            <option value="css">CSS</option>
                            <option value="json">JSON</option>
                            <option value="sql">SQL</option>
                            <option value="bash">Bash</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    <div class="flex items-end">
                        <label class="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" id="snippet-pinned" class="w-4 h-4 rounded border-vault-border bg-vault-bg text-vault-primary">
                            <span class="text-sm">Pin to top</span>
                        </label>
                    </div>
                </div>
                <button type="button" id="paste-clipboard-btn" class="w-full py-2 bg-vault-card border border-vault-border hover:border-vault-primary rounded-lg transition-colors text-sm flex items-center justify-center gap-2">
                    <i data-lucide="clipboard-paste" class="w-4 h-4"></i>
                    Paste from Clipboard
                </button>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary modal-cancel">Cancel</button>
                <button class="btn btn-primary modal-save">Save Snippet</button>
            </div>
        `;

        const modal = UI.showModal(content);

        // Paste from clipboard button
        document.getElementById('paste-clipboard-btn').addEventListener('click', async () => {
            try {
                const text = await navigator.clipboard.readText();
                document.getElementById('snippet-content').value = text;
                UI.toast('Pasted from clipboard', 'success');
            } catch {
                UI.toast('Could not access clipboard', 'error');
            }
        });

        document.querySelector('.modal-close').addEventListener('click', () => modal.close());
        document.querySelector('.modal-cancel').addEventListener('click', () => modal.close());
        document.querySelector('.modal-save').addEventListener('click', () => {
            this.saveSnippet(modal);
        });
    },

    showEditSnippetModal(id) {
        const snippet = VaultStorage.getSnippets().find(s => s.id === id);
        if (!snippet) return;

        const content = `
            <div class="modal-header">
                <h3 class="text-lg font-semibold">Edit Snippet</h3>
                <button class="modal-close p-2 hover:bg-vault-bg rounded-lg">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>
            <div class="modal-body space-y-4">
                <div>
                    <label class="block text-sm font-medium mb-2">Title</label>
                    <input type="text" id="snippet-title" value="${UI.escapeHtml(snippet.title)}" class="w-full px-4 py-2 bg-vault-bg border border-vault-border rounded-lg focus:outline-none focus:border-vault-primary">
                </div>
                <div>
                    <label class="block text-sm font-medium mb-2">Content *</label>
                    <textarea id="snippet-content" rows="8" class="w-full px-4 py-2 bg-vault-bg border border-vault-border rounded-lg focus:outline-none focus:border-vault-primary font-mono text-sm">${UI.escapeHtml(snippet.content)}</textarea>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium mb-2">Language</label>
                        <select id="snippet-language" class="w-full px-4 py-2 bg-vault-bg border border-vault-border rounded-lg focus:outline-none focus:border-vault-primary">
                            <option value="text" ${snippet.language === 'text' ? 'selected' : ''}>Plain Text</option>
                            <option value="javascript" ${snippet.language === 'javascript' ? 'selected' : ''}>JavaScript</option>
                            <option value="python" ${snippet.language === 'python' ? 'selected' : ''}>Python</option>
                            <option value="html" ${snippet.language === 'html' ? 'selected' : ''}>HTML</option>
                            <option value="css" ${snippet.language === 'css' ? 'selected' : ''}>CSS</option>
                            <option value="json" ${snippet.language === 'json' ? 'selected' : ''}>JSON</option>
                            <option value="sql" ${snippet.language === 'sql' ? 'selected' : ''}>SQL</option>
                            <option value="bash" ${snippet.language === 'bash' ? 'selected' : ''}>Bash</option>
                            <option value="other" ${snippet.language === 'other' ? 'selected' : ''}>Other</option>
                        </select>
                    </div>
                    <div class="flex items-end">
                        <label class="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" id="snippet-pinned" ${snippet.pinned ? 'checked' : ''} class="w-4 h-4 rounded border-vault-border bg-vault-bg text-vault-primary">
                            <span class="text-sm">Pin to top</span>
                        </label>
                    </div>
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
            this.updateSnippet(id, modal);
        });
    },

    async saveSnippet(modal) {
        const title = document.getElementById('snippet-title').value.trim() || 'Untitled';
        const content = document.getElementById('snippet-content').value;
        const language = document.getElementById('snippet-language').value;
        const pinned = document.getElementById('snippet-pinned').checked;

        if (!content) {
            UI.toast('Please enter some content', 'warning');
            return;
        }

        App.setSyncStatus('syncing');
        modal.close();

        try {
            await VaultStorage.addSnippet({ title, content, language, pinned });
            App.setSyncStatus('synced');
            this.refresh();
            UI.toast('Snippet saved!', 'success');
        } catch (error) {
            App.setSyncStatus('error');
            UI.toast('Failed to save: ' + error.message, 'error');
        }
    },

    async updateSnippet(id, modal) {
        const title = document.getElementById('snippet-title').value.trim() || 'Untitled';
        const content = document.getElementById('snippet-content').value;
        const language = document.getElementById('snippet-language').value;
        const pinned = document.getElementById('snippet-pinned').checked;

        if (!content) {
            UI.toast('Please enter some content', 'warning');
            return;
        }

        App.setSyncStatus('syncing');
        modal.close();

        try {
            await VaultStorage.updateSnippet(id, { title, content, language, pinned });
            App.setSyncStatus('synced');
            this.refresh();
            UI.toast('Snippet updated!', 'success');
        } catch (error) {
            App.setSyncStatus('error');
            UI.toast('Failed to update: ' + error.message, 'error');
        }
    },

    async togglePin(id) {
        const snippet = VaultStorage.getSnippets().find(s => s.id === id);
        if (!snippet) return;

        App.setSyncStatus('syncing');

        try {
            await VaultStorage.updateSnippet(id, { pinned: !snippet.pinned });
            App.setSyncStatus('synced');
            this.refresh();
            UI.toast(snippet.pinned ? 'Unpinned' : 'Pinned', 'success');
        } catch (error) {
            App.setSyncStatus('error');
            UI.toast('Failed to update: ' + error.message, 'error');
        }
    },

    async deleteSnippet(id) {
        const confirmed = await UI.confirm(
            'Are you sure you want to delete this snippet?',
            { title: 'Delete Snippet', danger: true, confirmText: 'Delete' }
        );

        if (!confirmed) return;

        App.setSyncStatus('syncing');

        try {
            await VaultStorage.deleteSnippet(id);
            App.setSyncStatus('synced');
            this.refresh();
            UI.toast('Snippet deleted', 'success');
        } catch (error) {
            App.setSyncStatus('error');
            UI.toast('Failed to delete: ' + error.message, 'error');
        }
    }
};

window.ClipboardManager = ClipboardManager;
