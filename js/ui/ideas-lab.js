/**
 * Archie Vault - Ideas Lab UI
 * Handles the Ideas/Notes section
 */

const IdeasLab = {
    currentFilter: 'all',

    init() {
        this.setupEventListeners();
    },

    setupEventListeners() {
        document.getElementById('add-idea-btn').addEventListener('click', () => {
            this.showAddIdeaModal();
        });

        // Filter buttons
        document.querySelectorAll('.idea-filter').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.idea-filter').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentFilter = btn.dataset.filter;
                this.refresh();
            });
        });
    },

    refresh() {
        const ideaList = document.getElementById('idea-list');
        const ideas = VaultStorage.getIdeas(this.currentFilter);

        if (ideas.length === 0) {
            ideaList.innerHTML = `
                <div class="col-span-full text-center text-vault-muted py-8">
                    <i data-lucide="lightbulb" class="w-12 h-12 mx-auto mb-3 opacity-50"></i>
                    <p>${this.currentFilter === 'all' ? 'No ideas yet. Start brainstorming!' : 'No ideas in this category'}</p>
                </div>
            `;
            lucide.createIcons();
            return;
        }

        ideaList.innerHTML = ideas.map(idea => this.renderIdeaCard(idea)).join('');
        lucide.createIcons();

        // Add click handlers
        ideaList.querySelectorAll('.idea-card').forEach(card => {
            const id = card.dataset.id;
            
            card.addEventListener('click', (e) => {
                if (e.target.closest('.idea-actions')) return;
                this.showIdeaModal(id);
            });

            card.querySelector('.edit-btn')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showEditIdeaModal(id);
            });

            card.querySelector('.delete-btn')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteIdea(id);
            });
        });
    },

    renderIdeaCard(idea) {
        const priorityClass = `priority-${idea.priority}`;
        const statusEmoji = {
            'idea': '💡',
            'in-progress': '🚧',
            'done': '✅'
        };

        const tagsHtml = idea.tags?.length 
            ? idea.tags.map(tag => `<span class="px-2 py-0.5 bg-vault-primary/20 text-vault-primary text-xs rounded">${UI.escapeHtml(tag)}</span>`).join('') 
            : '';

        return `
            <div class="idea-card ${priorityClass}" data-id="${idea.id}">
                <div class="flex items-start justify-between mb-2">
                    <span class="text-lg">${statusEmoji[idea.status] || '💡'}</span>
                    <div class="idea-actions flex gap-1">
                        <button class="edit-btn p-1 hover:bg-vault-bg rounded" title="Edit">
                            <i data-lucide="pencil" class="w-4 h-4"></i>
                        </button>
                        <button class="delete-btn p-1 hover:bg-vault-danger/20 text-vault-danger rounded" title="Delete">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                </div>
                <h3 class="font-medium mb-2">${UI.escapeHtml(idea.title)}</h3>
                ${idea.content ? `<p class="text-sm text-vault-muted line-clamp-3 mb-3">${UI.escapeHtml(idea.content.substring(0, 150))}${idea.content.length > 150 ? '...' : ''}</p>` : ''}
                <div class="flex flex-wrap gap-1 mt-2">
                    ${tagsHtml}
                </div>
                <div class="text-xs text-vault-muted mt-3">
                    ${UI.formatDate(idea.created)}
                </div>
            </div>
        `;
    },

    showAddIdeaModal() {
        const content = `
            <div class="modal-header">
                <h3 class="text-lg font-semibold">New Idea</h3>
                <button class="modal-close p-2 hover:bg-vault-bg rounded-lg">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>
            <div class="modal-body space-y-4">
                <div>
                    <label class="block text-sm font-medium mb-2">Title *</label>
                    <input type="text" id="idea-title" class="w-full px-4 py-2 bg-vault-bg border border-vault-border rounded-lg focus:outline-none focus:border-vault-primary" placeholder="What's your idea?">
                </div>
                <div>
                    <label class="block text-sm font-medium mb-2">Description</label>
                    <textarea id="idea-content" rows="5" class="w-full px-4 py-2 bg-vault-bg border border-vault-border rounded-lg focus:outline-none focus:border-vault-primary" placeholder="Describe your idea in detail... (Markdown supported)"></textarea>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium mb-2">Priority</label>
                        <select id="idea-priority" class="w-full px-4 py-2 bg-vault-bg border border-vault-border rounded-lg focus:outline-none focus:border-vault-primary">
                            <option value="backlog">📋 Backlog</option>
                            <option value="medium">⚡ Medium</option>
                            <option value="hot">🔥 Hot</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-2">Status</label>
                        <select id="idea-status" class="w-full px-4 py-2 bg-vault-bg border border-vault-border rounded-lg focus:outline-none focus:border-vault-primary">
                            <option value="idea">💡 Idea</option>
                            <option value="in-progress">🚧 In Progress</option>
                            <option value="done">✅ Done</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-medium mb-2">Tags (comma separated)</label>
                    <input type="text" id="idea-tags" class="w-full px-4 py-2 bg-vault-bg border border-vault-border rounded-lg focus:outline-none focus:border-vault-primary" placeholder="e.g., webapp, ai, startup">
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary modal-cancel">Cancel</button>
                <button class="btn btn-primary modal-save">Save Idea</button>
            </div>
        `;

        const modal = UI.showModal(content);

        document.querySelector('.modal-close').addEventListener('click', () => modal.close());
        document.querySelector('.modal-cancel').addEventListener('click', () => modal.close());
        document.querySelector('.modal-save').addEventListener('click', () => {
            this.saveIdea(modal);
        });
    },

    showEditIdeaModal(id) {
        const idea = VaultStorage.getIdeas().find(i => i.id === id);
        if (!idea) return;

        const content = `
            <div class="modal-header">
                <h3 class="text-lg font-semibold">Edit Idea</h3>
                <button class="modal-close p-2 hover:bg-vault-bg rounded-lg">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>
            <div class="modal-body space-y-4">
                <div>
                    <label class="block text-sm font-medium mb-2">Title *</label>
                    <input type="text" id="idea-title" value="${UI.escapeHtml(idea.title)}" class="w-full px-4 py-2 bg-vault-bg border border-vault-border rounded-lg focus:outline-none focus:border-vault-primary">
                </div>
                <div>
                    <label class="block text-sm font-medium mb-2">Description</label>
                    <textarea id="idea-content" rows="5" class="w-full px-4 py-2 bg-vault-bg border border-vault-border rounded-lg focus:outline-none focus:border-vault-primary">${UI.escapeHtml(idea.content || '')}</textarea>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium mb-2">Priority</label>
                        <select id="idea-priority" class="w-full px-4 py-2 bg-vault-bg border border-vault-border rounded-lg focus:outline-none focus:border-vault-primary">
                            <option value="backlog" ${idea.priority === 'backlog' ? 'selected' : ''}>📋 Backlog</option>
                            <option value="medium" ${idea.priority === 'medium' ? 'selected' : ''}>⚡ Medium</option>
                            <option value="hot" ${idea.priority === 'hot' ? 'selected' : ''}>🔥 Hot</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-2">Status</label>
                        <select id="idea-status" class="w-full px-4 py-2 bg-vault-bg border border-vault-border rounded-lg focus:outline-none focus:border-vault-primary">
                            <option value="idea" ${idea.status === 'idea' ? 'selected' : ''}>💡 Idea</option>
                            <option value="in-progress" ${idea.status === 'in-progress' ? 'selected' : ''}>🚧 In Progress</option>
                            <option value="done" ${idea.status === 'done' ? 'selected' : ''}>✅ Done</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-medium mb-2">Tags (comma separated)</label>
                    <input type="text" id="idea-tags" value="${(idea.tags || []).join(', ')}" class="w-full px-4 py-2 bg-vault-bg border border-vault-border rounded-lg focus:outline-none focus:border-vault-primary">
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
            this.updateIdea(id, modal);
        });
    },

    showIdeaModal(id) {
        const idea = VaultStorage.getIdeas().find(i => i.id === id);
        if (!idea) return;

        const statusEmoji = {
            'idea': '💡',
            'in-progress': '🚧',
            'done': '✅'
        };

        const content = `
            <div class="modal-header">
                <h3 class="text-lg font-semibold flex items-center gap-2">
                    <span>${statusEmoji[idea.status] || '💡'}</span>
                    ${UI.escapeHtml(idea.title)}
                </h3>
                <button class="modal-close p-2 hover:bg-vault-bg rounded-lg">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>
            <div class="modal-body">
                ${idea.content ? `<div class="prose prose-invert max-w-none mb-4">${UI.escapeHtml(idea.content).replace(/\n/g, '<br>')}</div>` : '<p class="text-vault-muted">No description</p>'}
                ${idea.tags?.length ? `
                    <div class="flex flex-wrap gap-1 mt-4">
                        ${idea.tags.map(tag => `<span class="px-2 py-1 bg-vault-primary/20 text-vault-primary text-xs rounded">${UI.escapeHtml(tag)}</span>`).join('')}
                    </div>
                ` : ''}
                <div class="text-xs text-vault-muted mt-4">
                    Created: ${UI.formatDate(idea.created)}
                    ${idea.updated !== idea.created ? ` • Updated: ${UI.formatDate(idea.updated)}` : ''}
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary modal-close-btn">Close</button>
                <button class="btn btn-primary modal-edit">Edit</button>
            </div>
        `;

        const modal = UI.showModal(content);

        document.querySelector('.modal-close').addEventListener('click', () => modal.close());
        document.querySelector('.modal-close-btn').addEventListener('click', () => modal.close());
        document.querySelector('.modal-edit').addEventListener('click', () => {
            modal.close();
            this.showEditIdeaModal(id);
        });
    },

    async saveIdea(modal) {
        const title = document.getElementById('idea-title').value.trim();
        const content = document.getElementById('idea-content').value.trim();
        const priority = document.getElementById('idea-priority').value;
        const status = document.getElementById('idea-status').value;
        const tagsValue = document.getElementById('idea-tags').value.trim();
        const tags = tagsValue ? tagsValue.split(',').map(t => t.trim()).filter(Boolean) : [];

        if (!title) {
            UI.toast('Please enter a title', 'warning');
            return;
        }

        App.setSyncStatus('syncing');
        modal.close();

        try {
            await VaultStorage.addIdea({ title, content, priority, status, tags });
            App.setSyncStatus('synced');
            this.refresh();
            UI.toast('Idea saved!', 'success');
        } catch (error) {
            App.setSyncStatus('error');
            UI.toast('Failed to save: ' + error.message, 'error');
        }
    },

    async updateIdea(id, modal) {
        const title = document.getElementById('idea-title').value.trim();
        const content = document.getElementById('idea-content').value.trim();
        const priority = document.getElementById('idea-priority').value;
        const status = document.getElementById('idea-status').value;
        const tagsValue = document.getElementById('idea-tags').value.trim();
        const tags = tagsValue ? tagsValue.split(',').map(t => t.trim()).filter(Boolean) : [];

        if (!title) {
            UI.toast('Please enter a title', 'warning');
            return;
        }

        App.setSyncStatus('syncing');
        modal.close();

        try {
            await VaultStorage.updateIdea(id, { title, content, priority, status, tags });
            App.setSyncStatus('synced');
            this.refresh();
            UI.toast('Idea updated!', 'success');
        } catch (error) {
            App.setSyncStatus('error');
            UI.toast('Failed to update: ' + error.message, 'error');
        }
    },

    async deleteIdea(id) {
        const confirmed = await UI.confirm(
            'Are you sure you want to delete this idea?',
            { title: 'Delete Idea', danger: true, confirmText: 'Delete' }
        );

        if (!confirmed) return;

        App.setSyncStatus('syncing');

        try {
            await VaultStorage.deleteIdea(id);
            App.setSyncStatus('synced');
            this.refresh();
            UI.toast('Idea deleted', 'success');
        } catch (error) {
            App.setSyncStatus('error');
            UI.toast('Failed to delete: ' + error.message, 'error');
        }
    }
};

window.IdeasLab = IdeasLab;
