document.addEventListener('DOMContentLoaded', () => {
    let activeRecipientId = null; // ID пользователя, с которым открыт чат
    let selectedFile = null;

    const chatsList = document.getElementById('chatsList');
    const messagesContainer = document.getElementById('messagesContainer');
    const currentChatName = document.getElementById('currentChatName');
    const currentAvatar = document.getElementById('currentAvatar');
    const activeChatHeader = document.getElementById('activeChatHeader');
    const chatInputArea = document.getElementById('chatInputArea');

    const chatInput = document.querySelector('.chat-input-area input[type="text"]');
    const sendBtn = document.querySelector('.send-btn');
    const attachBtn = document.querySelector('.attach-btn');
    const fileInput = document.getElementById('fileInput');
    const filePreview = document.getElementById('filePreview');
    const fileNameSpan = document.getElementById('fileName');
    const removeFileBtn = document.getElementById('removeFileBtn');

    const userSearchInput = document.getElementById('userSearchInput');
    const searchResults = document.getElementById('searchResults');

    function isVideoFile(filename) {
        if (!filename) return false;
        const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov'];
        return videoExtensions.some(ext => filename.toLowerCase().endsWith(ext));
    }

    // Рендер сообщения
    function renderMessage(text, filename, sender, time) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${sender}`;

        let contentHTML = '';
        if (filename) {
            if (isVideoFile(filename)) {
                contentHTML += `
                    <div class="video-attachment">
                        <video controls width="100%" style="max-width: 300px; border-radius: 8px; margin-bottom: 5px;">
                            <source src="/static/uploads/${filename}" type="video/mp4">
                        </video>
                    </div>`;
            } else {
                contentHTML += `<div class="attachment-badge"><i class="fa fa-file"></i> ${filename}</div>`;
            }
        }
        if (text) contentHTML += `<div>${text}</div>`;
        contentHTML += `<span class="message-time">${time}</span>`;

        msgDiv.innerHTML = `<div class="message-content">${contentHTML}</div>`;
        messagesContainer.appendChild(msgDiv);
    }

    // Открытие диалога с конкретным пользователем
    window.openChatWithUser = async function(userId, name, avatar) {
        activeRecipientId = userId;
        currentChatName.innerText = name;
        currentAvatar.innerText = avatar ? avatar.charAt(0).toUpperCase() : name.charAt(0).toUpperCase();
        
        activeChatHeader.style.display = 'flex';
        chatInputArea.style.display = 'block';
        searchResults.style.display = 'none';
        userSearchInput.value = '';

        // Загрузка сообщений с этим пользователем
        const res = await fetch(`/api/messages/${userId}`);
        const messages = await res.json();

        messagesContainer.innerHTML = '';
        if (messages.length === 0) {
            messagesContainer.innerHTML = '<div class="no-chat-selected">Нет сообщений. Напишите первое сообщение!</div>';
        } else {
            messages.forEach(msg => {
                renderMessage(msg.text, msg.filename, msg.sender, msg.time);
            });
        }
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    };

    // Поиск пользователей при вводе в инпут
    let searchTimeout;
    userSearchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();
        if (!query) {
            searchResults.style.display = 'none';
            return;
        }

        searchTimeout = setTimeout(async () => {
            const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
            const users = await res.json();

            searchResults.innerHTML = '';
            if (users.length === 0) {
                searchResults.innerHTML = '<div style="padding: 10px; color: #888;">Ничего не найдено</div>';
            } else {
                users.forEach(user => {
                    const div = document.createElement('div');
                    div.className = 'search-result-item';
                    div.style.cssText = 'padding: 10px; cursor: pointer; display: flex; align-items: center; gap: 10px; border-bottom: 1px solid #eee;';
                    div.innerHTML = `
                        <div class="avatar-placeholder" style="width: 30px; height: 30px; font-size: 14px;">${user.name.charAt(0)}</div>
                        <div>
                            <div style="font-weight: 600;">${user.name}</div>
                            <div style="font-size: 12px; color: #666;">@${user.username}</div>
                        </div>
                    `;
                    div.addEventListener('click', () => {
                        openChatWithUser(user.id, user.name, user.avatar);
                    });
                    searchResults.appendChild(div);
                });
            }
            searchResults.style.display = 'block';
        }, 300);
    });

    // Отправка сообщения
    async function sendMessage() {
        const text = chatInput.value.trim();
        if ((!text && !selectedFile) || !activeRecipientId) return;

        const now = new Date();
        const timeStr = now.getHours().toString().padStart(2, '0') + ':' +
                        now.getMinutes().toString().padStart(2, '0');

        const formData = new FormData();
        formData.append('recipient_id', activeRecipientId);
        formData.append('text', text);
        formData.append('time', timeStr);
        if (selectedFile) formData.append('file', selectedFile);

        const response = await fetch('/api/messages/send', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        if (result.status === 'success') {
            // Если до этого была надпись "Нет сообщений", очищаем контейнер
            if (messagesContainer.querySelector('.no-chat-selected')) {
                messagesContainer.innerHTML = '';
            }
            renderMessage(text, result.filename, 'outgoing', timeStr);
        }

        chatInput.value = '';
        selectedFile = null;
        fileInput.value = '';
        if (filePreview) filePreview.style.display = 'none';
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    if (attachBtn && fileInput) {
        attachBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', () => {
            if (fileInput.files.length > 0) {
                selectedFile = fileInput.files[0];
                fileNameSpan.innerText = selectedFile.name;
                filePreview.style.display = 'flex';
            }
        });
    }

    if (removeFileBtn) {
        removeFileBtn.addEventListener('click', () => {
            selectedFile = null;
            fileInput.value = '';
            filePreview.style.display = 'none';
        });
    }

    if (sendBtn) sendBtn.addEventListener('click', sendMessage);
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendMessage();
            }
        });
    }
});
