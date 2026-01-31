/**
 * Archie Vault - Media Vault UI
 * Handles the Media (Videos, Images, Audio) section
 */

const MediaVault = {
    init() {
        this.setupEventListeners();
    },

    setupEventListeners() {
        document.getElementById('upload-media-btn').addEventListener('click', () => {
            this.showUploadDialog();
        });
    },

    showUploadDialog() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'video/*,audio/*,image/*';
        input.multiple = true;
        
        input.onchange = (e) => {
            this.handleMediaUpload(e.target.files);
        };
        
        input.click();
    },

    async handleMediaUpload(files) {
        for (const file of files) {
            if (file.size > 100 * 1024 * 1024) {
                UI.toast(`File too large: ${file.name} (max 100MB)`, 'error');
                continue;
            }

            App.setSyncStatus('syncing');
            UI.toast(`Uploading ${file.name}...`, 'info');

            try {
                await VaultStorage.uploadMedia(file);
                App.setSyncStatus('synced');
                this.refresh();
                UI.toast(`Uploaded: ${file.name}`, 'success');
            } catch (error) {
                App.setSyncStatus('error');
                UI.toast(`Failed to upload: ${error.message}`, 'error');
            }
        }
        App.updateStorageInfo();
    },

    refresh() {
        const mediaList = document.getElementById('media-list');
        const media = VaultStorage.getMedia();

        if (media.length === 0) {
            mediaList.innerHTML = `
                <div class="col-span-full text-center text-vault-muted py-8">
                    <i data-lucide="film" class="w-12 h-12 mx-auto mb-3 opacity-50"></i>
                    <p>No media files yet</p>
                </div>
            `;
            lucide.createIcons();
            return;
        }

        mediaList.innerHTML = media.map(item => this.renderMediaCard(item)).join('');
        lucide.createIcons();

        // Add click handlers
        mediaList.querySelectorAll('.media-card').forEach(card => {
            const id = card.dataset.id;
            
            card.addEventListener('click', (e) => {
                if (e.target.closest('.media-actions')) return;
                this.previewMedia(id);
            });

            card.querySelector('.download-btn')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.downloadMedia(id);
            });

            card.querySelector('.delete-btn')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteMedia(id);
            });
        });
    },

    renderMediaCard(item) {
        const icons = {
            video: 'film',
            audio: 'music',
            image: 'image',
            other: 'file'
        };
        const icon = icons[item.type] || 'file';

        return `
            <div class="media-card" data-id="${item.id}">
                <div class="absolute inset-0 flex items-center justify-center bg-vault-bg">
                    <i data-lucide="${icon}" class="w-12 h-12 text-vault-muted opacity-50"></i>
                </div>
                <div class="overlay">
                    <div class="flex-1 min-w-0">
                        <div class="font-medium text-sm truncate">${UI.escapeHtml(item.name)}</div>
                        <div class="text-xs text-vault-muted">${UI.formatSize(item.size)}</div>
                    </div>
                    <div class="media-actions flex gap-1">
                        <button class="download-btn p-1 hover:bg-white/20 rounded" title="Download">
                            <i data-lucide="download" class="w-4 h-4"></i>
                        </button>
                        <button class="delete-btn p-1 hover:bg-vault-danger/20 text-vault-danger rounded" title="Delete">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    async previewMedia(id) {
        const media = VaultStorage.getMedia().find(m => m.id === id);
        if (!media) return;

        UI.showLoading('Decrypting media...');

        try {
            const result = await VaultStorage.downloadFile(id);
            UI.hideLoading();

            const url = URL.createObjectURL(result.blob);

            let previewContent = '';
            
            if (media.type === 'video') {
                previewContent = `
                    <video controls class="w-full max-h-[70vh]" autoplay>
                        <source src="${url}" type="${media.mime}">
                        Your browser does not support video playback.
                    </video>
                `;
            } else if (media.type === 'audio') {
                previewContent = `
                    <div class="p-8 text-center">
                        <i data-lucide="music" class="w-16 h-16 mx-auto text-vault-primary mb-4"></i>
                        <p class="mb-4">${UI.escapeHtml(media.name)}</p>
                        <audio controls class="w-full" autoplay>
                            <source src="${url}" type="${media.mime}">
                            Your browser does not support audio playback.
                        </audio>
                    </div>
                `;
            } else if (media.type === 'image') {
                previewContent = `
                    <img src="${url}" alt="${UI.escapeHtml(media.name)}" class="w-full max-h-[70vh] object-contain">
                `;
            } else {
                // Can't preview, offer download
                UI.downloadBlob(result.blob, result.name);
                return;
            }

            const content = `
                <div class="modal-header">
                    <h3 class="text-lg font-semibold truncate flex-1">${UI.escapeHtml(media.name)}</h3>
                    <button class="modal-close p-2 hover:bg-vault-bg rounded-lg flex-shrink-0">
                        <i data-lucide="x" class="w-5 h-5"></i>
                    </button>
                </div>
                <div class="bg-black">
                    ${previewContent}
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary modal-close-btn">Close</button>
                    <button class="btn btn-primary modal-download">
                        <i data-lucide="download" class="w-4 h-4"></i>
                        Download
                    </button>
                </div>
            `;

            const modal = UI.showModal(content);
            lucide.createIcons();

            // Clean up URL on close
            const cleanup = () => {
                URL.revokeObjectURL(url);
            };

            document.querySelector('.modal-close').addEventListener('click', () => {
                modal.close();
                cleanup();
            });

            document.querySelector('.modal-close-btn').addEventListener('click', () => {
                modal.close();
                cleanup();
            });

            document.querySelector('.modal-download').addEventListener('click', () => {
                UI.downloadBlob(result.blob, result.name);
            });

        } catch (error) {
            UI.hideLoading();
            UI.toast('Failed to preview: ' + error.message, 'error');
        }
    },

    async downloadMedia(id) {
        const media = VaultStorage.getMedia().find(m => m.id === id);
        if (!media) return;

        App.setSyncStatus('syncing');
        UI.toast('Downloading and decrypting...', 'info');

        try {
            const result = await VaultStorage.downloadFile(id);
            UI.downloadBlob(result.blob, result.name);
            App.setSyncStatus('synced');
            UI.toast('Download complete!', 'success');
        } catch (error) {
            App.setSyncStatus('error');
            UI.toast('Download failed: ' + error.message, 'error');
        }
    },

    async deleteMedia(id) {
        const confirmed = await UI.confirm(
            'Are you sure you want to delete this media file?',
            { title: 'Delete Media', danger: true, confirmText: 'Delete' }
        );

        if (!confirmed) return;

        App.setSyncStatus('syncing');

        try {
            await VaultStorage.deleteMedia(id);
            App.setSyncStatus('synced');
            App.updateStorageInfo();
            this.refresh();
            UI.toast('Media deleted', 'success');
        } catch (error) {
            App.setSyncStatus('error');
            UI.toast('Failed to delete: ' + error.message, 'error');
        }
    }
};

window.MediaVault = MediaVault;
