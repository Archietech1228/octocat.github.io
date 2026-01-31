/**
 * Archie Vault - File Manager UI
 * Handles the File Vault section
 */

const FileManager = {
    currentFolder: '/',
    selectedFiles: [],

    init() {
        this.setupEventListeners();
        this.refresh();
    },

    setupEventListeners() {
        // Upload button
        document.getElementById('upload-file-btn').addEventListener('click', () => {
            document.getElementById('file-input').click();
        });

        // File input change
        document.getElementById('file-input').addEventListener('change', (e) => {
            this.handleFileSelect(e.target.files);
            e.target.value = ''; // Reset input
        });

        // New folder button
        document.getElementById('new-folder-btn').addEventListener('click', () => {
            this.createFolder();
        });

        // Drag and drop
        const dropZone = document.getElementById('drop-zone');
        
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            this.handleFileSelect(e.dataTransfer.files);
        });

        // Click on drop zone
        dropZone.addEventListener('click', () => {
            document.getElementById('file-input').click();
        });
    },

    async refresh() {
        const fileList = document.getElementById('file-list');
        const files = VaultStorage.getFilesInFolder(this.currentFolder);

        if (files.length === 0) {
            fileList.innerHTML = `
                <div class="text-center text-vault-muted py-8">
                    <i data-lucide="folder-open" class="w-12 h-12 mx-auto mb-3 opacity-50"></i>
                    <p>No files yet. Upload something to get started!</p>
                </div>
            `;
            lucide.createIcons();
            return;
        }

        // Sort: folders first, then files by name
        const sorted = files.sort((a, b) => {
            if (a.type === 'folder' && b.type !== 'folder') return -1;
            if (a.type !== 'folder' && b.type === 'folder') return 1;
            return a.name.localeCompare(b.name);
        });

        fileList.innerHTML = sorted.map(file => this.renderFileItem(file)).join('');
        lucide.createIcons();

        // Add click handlers
        fileList.querySelectorAll('.file-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.closest('.file-actions')) return;
                this.handleFileClick(item.dataset.id);
            });

            item.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.showFileContextMenu(e, item.dataset.id);
            });
        });

        // Update breadcrumb
        this.updateBreadcrumb();
    },

    renderFileItem(file) {
        const icon = UI.getFileIcon(file.mime, file.type === 'folder');
        const size = file.type === 'folder' ? '' : UI.formatSize(file.size);
        const date = UI.formatDate(file.created);

        return `
            <div class="file-item" data-id="${file.id}" data-type="${file.type}">
                <i data-lucide="${icon}" class="w-5 h-5 text-vault-${file.type === 'folder' ? 'warning' : 'muted'}"></i>
                <div class="flex-1 min-w-0">
                    <div class="font-medium truncate">${UI.escapeHtml(file.name)}</div>
                    <div class="text-xs text-vault-muted">${size} ${size ? '•' : ''} ${date}</div>
                </div>
                <div class="file-actions flex gap-1">
                    ${file.type !== 'folder' ? `
                        <button class="p-2 hover:bg-vault-bg rounded-lg download-btn" title="Download">
                            <i data-lucide="download" class="w-4 h-4"></i>
                        </button>
                    ` : ''}
                    <button class="p-2 hover:bg-vault-bg rounded-lg more-btn" title="More">
                        <i data-lucide="more-vertical" class="w-4 h-4"></i>
                    </button>
                </div>
            </div>
        `;
    },

    updateBreadcrumb() {
        const breadcrumb = document.getElementById('file-breadcrumb');
        const parts = this.currentFolder.split('/').filter(Boolean);
        
        let html = `
            <button class="breadcrumb-item text-vault-primary hover:text-vault-secondary" data-path="/">
                <i data-lucide="home" class="w-4 h-4"></i>
            </button>
        `;

        let path = '';
        parts.forEach((part, index) => {
            path += '/' + part;
            html += `
                <span class="text-vault-muted">/</span>
                <button class="breadcrumb-item text-vault-primary hover:text-vault-secondary" data-path="${path}">
                    ${UI.escapeHtml(part)}
                </button>
            `;
        });

        breadcrumb.innerHTML = html;
        lucide.createIcons();

        // Add click handlers
        breadcrumb.querySelectorAll('.breadcrumb-item').forEach(btn => {
            btn.addEventListener('click', () => {
                this.navigateToFolder(btn.dataset.path);
            });
        });
    },

    handleFileClick(fileId) {
        const files = VaultStorage.getFilesInFolder(this.currentFolder);
        const file = files.find(f => f.id === fileId);
        
        if (!file) return;

        if (file.type === 'folder') {
            this.navigateToFolder(file.folder === '/' ? `/${file.name}` : `${file.folder}/${file.name}`);
        } else {
            this.previewOrDownload(file);
        }
    },

    navigateToFolder(path) {
        this.currentFolder = path || '/';
        this.refresh();
    },

    async handleFileSelect(files) {
        if (!files || files.length === 0) return;

        for (const file of files) {
            await this.uploadFile(file);
        }
    },

    async uploadFile(file) {
        // Check file size (100MB limit for GitHub)
        if (file.size > 100 * 1024 * 1024) {
            UI.toast(`File too large: ${file.name} (max 100MB)`, 'error');
            return;
        }

        App.setSyncStatus('syncing');
        UI.toast(`Uploading ${file.name}...`, 'info');

        try {
            await VaultStorage.uploadFile(file, this.currentFolder);
            App.setSyncStatus('synced');
            App.updateStorageInfo();
            this.refresh();
            UI.toast(`Uploaded: ${file.name}`, 'success');
        } catch (error) {
            App.setSyncStatus('error');
            UI.toast(`Failed to upload: ${error.message}`, 'error');
        }
    },

    async createFolder() {
        const name = await UI.prompt('Enter folder name:', {
            title: 'New Folder',
            placeholder: 'My Folder'
        });

        if (!name) return;

        try {
            await VaultStorage.createFolder(name, this.currentFolder);
            this.refresh();
            UI.toast(`Folder created: ${name}`, 'success');
        } catch (error) {
            UI.toast(`Failed to create folder: ${error.message}`, 'error');
        }
    },

    async previewOrDownload(file) {
        // For now, just download
        await this.downloadFile(file.id);
    },

    async downloadFile(fileId) {
        App.setSyncStatus('syncing');
        UI.toast('Downloading and decrypting...', 'info');

        try {
            const result = await VaultStorage.downloadFile(fileId);
            UI.downloadBlob(result.blob, result.name);
            App.setSyncStatus('synced');
            UI.toast('Download complete!', 'success');
        } catch (error) {
            App.setSyncStatus('error');
            UI.toast(`Download failed: ${error.message}`, 'error');
        }
    },

    showFileContextMenu(e, fileId) {
        const files = VaultStorage.getFilesInFolder(this.currentFolder);
        const file = files.find(f => f.id === fileId);
        
        if (!file) return;

        const items = [];

        if (file.type !== 'folder') {
            items.push({
                icon: 'download',
                label: 'Download',
                action: () => this.downloadFile(fileId)
            });
            items.push({
                icon: 'eye',
                label: 'Preview',
                action: () => this.previewFile(fileId)
            });
        } else {
            items.push({
                icon: 'folder-open',
                label: 'Open',
                action: () => this.handleFileClick(fileId)
            });
        }

        items.push({ separator: true });
        
        items.push({
            icon: 'pencil',
            label: 'Rename',
            action: () => this.renameFile(fileId)
        });

        items.push({
            icon: 'trash-2',
            label: 'Delete',
            danger: true,
            action: () => this.deleteFile(fileId)
        });

        UI.showContextMenu(e.clientX, e.clientY, items);
    },

    async renameFile(fileId) {
        const files = VaultStorage.getFilesInFolder(this.currentFolder);
        const file = files.find(f => f.id === fileId);
        
        if (!file) return;

        const newName = await UI.prompt('Enter new name:', {
            title: 'Rename',
            defaultValue: file.name
        });

        if (!newName || newName === file.name) return;

        try {
            await VaultStorage.renameFile(fileId, newName);
            this.refresh();
            UI.toast('Renamed successfully', 'success');
        } catch (error) {
            UI.toast(`Rename failed: ${error.message}`, 'error');
        }
    },

    async deleteFile(fileId) {
        const files = VaultStorage.getFilesInFolder(this.currentFolder);
        const file = files.find(f => f.id === fileId);
        
        if (!file) return;

        const confirmed = await UI.confirm(
            `Are you sure you want to delete "${file.name}"? This cannot be undone.`,
            { title: 'Delete File', danger: true, confirmText: 'Delete' }
        );

        if (!confirmed) return;

        App.setSyncStatus('syncing');

        try {
            await VaultStorage.deleteFile(fileId);
            App.setSyncStatus('synced');
            App.updateStorageInfo();
            this.refresh();
            UI.toast('Deleted successfully', 'success');
        } catch (error) {
            App.setSyncStatus('error');
            UI.toast(`Delete failed: ${error.message}`, 'error');
        }
    },

    async previewFile(fileId) {
        UI.toast('Preview coming soon!', 'info');
        // TODO: Implement file preview
    }
};

// Make available globally
window.FileManager = FileManager;
