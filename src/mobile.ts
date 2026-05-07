import Peer, { DataConnection } from 'peerjs';
import { GameAction, BroadcastMessage, GameState, Player, Question } from './types/index';
import { PEER_HOST, PEER_PORT } from './config';

// UI Elements
const statusDot = document.querySelector('.status-dot') as HTMLElement;
const statusText = document.getElementById('status-text');
const connectionError = document.getElementById('connection-error');
const currentRoundEl = document.getElementById('current-round');

// Views
const gridView = document.getElementById('grid-view');
const questionView = document.getElementById('question-view');
const specialView = document.getElementById('special-view');
const specialIconEl = document.getElementById('special-icon');
const specialTitleEl = document.getElementById('special-title');
const specialDescEl = document.getElementById('special-description');
const loaderEl = document.getElementById('loader');

// Grid Elements
const roundSelector = document.getElementById('round-selector');
const questionsGrid = document.getElementById('questions-grid');

// Question Elements
const questionTextEl = document.getElementById('current-question-text');
const answerTextEl = document.getElementById('current-answer-text');
const questionTypeEl = document.getElementById('question-type');
const answerMediaEl = document.getElementById('answer-media');

// Players
const playersListEl = document.getElementById('players-list');
const selectedPlayerNameEl = document.getElementById('selected-player-name');

// State
let selectedPlayerId: number | null = null;
let currentState: GameState | null = null;
let currentRoundData: any | null = null;
let currentTab: 'grid' | 'players' | 'setup' = 'grid';

// Get Host ID from URL
const params = new URLSearchParams(window.location.search);
const hostId = params.get('host');

if (!hostId) {
    if (statusText) statusText.textContent = 'Error: No Host ID';
    if (statusDot) statusDot.style.backgroundColor = 'red';
    alert('Host ID is missing in URL!');
}

function renderGrid(state: GameState) {
    if (!questionsGrid) return;
    questionsGrid.innerHTML = '';

    const questions = state.rounds[state.currentRoundName] || [];
    const categories: { [key: string]: Question[] } = {};

    questions.forEach(q => {
        if (!categories[q.category]) categories[q.category] = [];
        categories[q.category].push(q);
    });

    Object.keys(categories).sort().forEach(cat => {
        const catBlock = document.createElement('div');
        catBlock.className = 'cat-block';
        catBlock.innerHTML = `<div class="cat-title">${cat}</div>`;

        const row = document.createElement('div');
        row.className = 'q-row';

        categories[cat].forEach(q => {
            const card = document.createElement('div');
            card.className = `q-card ${q.played ? 'played' : ''}`;

            if (q.specialType) {
                const iconMap: Record<string, string> = {
                    cat: '🐱',
                    bet: '💰',
                    auction: '🔨',
                    special: '🎁',
                };
                const icon = iconMap[q.specialType] || '🎁';
                card.innerHTML = `<span style="font-size: 1.2em">${icon}</span><br><span style="font-size: 0.8em">${q.score}</span>`;
            } else {
                // Regular question with type icon
                const typeIcons: Record<string, string> = {
                    audio: '🎵',
                    video: '🎬',
                    image: '🖼️',
                    mashup: '🎼',
                    select: '✅',
                    text: '' // No icon for text
                };
                const typeIcon = typeIcons[q.type] || '';
                if (typeIcon) {
                    card.innerHTML = `<span style="font-size: 1.2em">${typeIcon}</span><br><span style="font-size: 0.8em">${q.score}</span>`;
                } else {
                    card.textContent = q.score.toString();
                }
                if (q.played) card.classList.add('played');
            }

            if (state.bannedThemes?.includes(q.category)) {
                card.style.opacity = '0.3';
                card.style.textDecoration = 'line-through';
            }

            card.onclick = () => {
                if (state.roundTypes?.[state.currentRoundName] === 'final') {
                    if (state.bannedThemes?.includes(q.category)) return;

                    const allCategories = Object.keys(categories);
                    const unbannedCount = allCategories.filter(c => !state.bannedThemes?.includes(c)).length;

                    if (unbannedCount === 1) {
                        send({
                            type: 'GAME_ACTION',
                            action: { type: 'SELECT_QUESTION', payload: q.id, source: 'mobile' }
                        });
                    } else {
                        send({
                            type: 'GAME_ACTION',
                            action: { type: 'BAN_THEME', payload: q.category, source: 'mobile' }
                        });
                    }
                } else {
                    send({
                        type: 'GAME_ACTION',
                        action: { type: 'SELECT_QUESTION', payload: q.id, source: 'mobile' }
                    });
                }
            };
            row.appendChild(card);
        });

        catBlock.appendChild(row);
        questionsGrid.appendChild(catBlock);
    });
}

function renderRoundSelector(state: GameState) {
    if (!roundSelector) return;
    roundSelector.innerHTML = '';

    (state.roundNames || []).forEach(rName => {
        const btn = document.createElement('div');
        btn.className = `round-tab ${rName === state.currentRoundName ? 'active' : ''}`;
        btn.textContent = rName;
        btn.onclick = () => {
            if (rName !== state.currentRoundName) {
                send({
                    type: 'GAME_ACTION',
                    action: { type: 'SWITCH_ROUND', payload: rName, source: 'mobile' }
                });
            }
        };
        roundSelector.appendChild(btn);
    });
}


function renderManagePlayers(state: GameState) {
    const list = document.getElementById('manage-players-list');
    if (!list) return;

    // Don't re-render if user is actively editing a field inside the list
    if (list.contains(document.activeElement) && document.activeElement?.tagName === 'INPUT') return;

    list.innerHTML = '';

    (state.players || []).forEach(p => {
        const item = document.createElement('div');
        item.className = 'player-list-item';
        item.style.cssText = 'flex-direction: column; align-items: stretch; gap: 8px;';

        // Header row: player number + remove button
        const header = document.createElement('div');
        header.style.cssText = 'display: flex; align-items: center; justify-content: space-between;';

        const title = document.createElement('span');
        title.style.cssText = 'font-weight: bold; color: #bb86fc;';
        title.textContent = `Player #${p.id}`;

        const removeBtn = document.createElement('button');
        removeBtn.className = 'btn btn-danger';
        removeBtn.style.padding = '4px 10px';
        removeBtn.style.fontSize = '0.8em';
        removeBtn.textContent = '✕ Remove';
        removeBtn.onclick = () => {
            if (confirm(`Remove ${p.name}?`)) {
                send({
                    type: 'GAME_ACTION',
                    action: { type: 'REMOVE_PLAYER', payload: { playerId: p.id }, source: 'mobile' }
                });
            }
        };

        header.appendChild(title);
        header.appendChild(removeBtn);

        // Name field
        const nameRow = document.createElement('div');
        nameRow.style.cssText = 'display: flex; gap: 8px; align-items: center;';
        const nameLabel = document.createElement('label');
        nameLabel.textContent = 'Name:';
        nameLabel.style.cssText = 'color: #aaa; font-size: 0.85em; min-width: 42px;';
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.value = p.name;
        nameInput.style.cssText = 'flex: 1; background: #2a2a2a; border: 1px solid #444; border-radius: 6px; color: #fff; padding: 6px 10px; font-size: 0.95em;';
        nameRow.appendChild(nameLabel);
        nameRow.appendChild(nameInput);

        // Score field
        const scoreRow = document.createElement('div');
        scoreRow.style.cssText = 'display: flex; gap: 8px; align-items: center;';
        const scoreLabel = document.createElement('label');
        scoreLabel.textContent = 'Score:';
        scoreLabel.style.cssText = 'color: #aaa; font-size: 0.85em; min-width: 42px;';
        const scoreInput = document.createElement('input');
        scoreInput.type = 'number';
        scoreInput.value = String(p.score);
        scoreInput.style.cssText = 'flex: 1; background: #2a2a2a; border: 1px solid #444; border-radius: 6px; color: #fff; padding: 6px 10px; font-size: 0.95em;';
        scoreRow.appendChild(scoreLabel);
        scoreRow.appendChild(scoreInput);

        // Save button
        const saveBtn = document.createElement('button');
        saveBtn.className = 'btn';
        saveBtn.style.cssText = 'background: #03dac6; color: #000; font-weight: bold; width: 100%; padding: 8px;';
        saveBtn.textContent = '💾 Save';
        saveBtn.onclick = () => {
            const newName = nameInput.value.trim();
            const newScore = parseInt(scoreInput.value, 10);
            if (!newName) { alert('Name cannot be empty'); return; }
            if (isNaN(newScore)) { alert('Score must be a number'); return; }
            send({
                type: 'GAME_ACTION',
                action: {
                    type: 'UPDATE_PLAYER',
                    payload: { playerId: p.id, name: newName, score: newScore },
                    source: 'mobile'
                }
            });
            saveBtn.textContent = '✅ Saved';
            setTimeout(() => { saveBtn.textContent = '💾 Save'; }, 1500);
        };

        item.appendChild(header);
        item.appendChild(nameRow);
        item.appendChild(scoreRow);
        item.appendChild(saveBtn);
        list.appendChild(item);
    });
}

function updatePlayersList(players: Player[]) {
    // Current players grid
    const container = document.getElementById('players-list');
    if (!container) return;

    container.innerHTML = '';

    players.forEach(p => {
        const card = document.createElement('div');
        card.className = 'player-card';
        if (selectedPlayerId === p.id) {
            card.classList.add('selected');
            const nameEl = document.getElementById('selected-player-name');
            if (nameEl) nameEl.textContent = `Selected: ${p.name}`;
        }

        card.innerHTML = `
            <div class="player-score">${p.score}</div>
            <div class="player-name">${p.name}</div>
        `;

        // Single tap to select
        card.onclick = () => {
            if (selectedPlayerId === p.id) {
                selectedPlayerId = null; // deselect
                const nameEl = document.getElementById('selected-player-name');
                if (nameEl) nameEl.textContent = '';
            } else {
                selectedPlayerId = p.id;
            }
            updatePlayersList(currentState?.players || []);
        };

        // Long press to set arbitrary score
        let pressTimer: any;

        card.addEventListener('touchstart', (e) => {
            pressTimer = setTimeout(() => {
                const newScoreStr = prompt(`Set score for ${p.name}:`, p.score.toString());
                if (newScoreStr !== null) {
                    const newScore = parseInt(newScoreStr, 10);
                    if (!isNaN(newScore)) {
                        send({
                            type: 'GAME_ACTION',
                            action: {
                                type: 'SET_SCORE',
                                payload: { playerId: p.id, score: newScore }
                            }
                        });
                    }
                }
            }, 800); // 800ms long press
        });

        card.addEventListener('touchend', () => {
            clearTimeout(pressTimer);
        });

        card.addEventListener('touchmove', () => {
            clearTimeout(pressTimer); // Cancel if moved
        });

        // Also support mouse long press for testing on desktop
        card.addEventListener('mousedown', () => {
            pressTimer = setTimeout(() => {
                const newScoreStr = prompt(`Set score for ${p.name}:`, p.score.toString());
                if (newScoreStr !== null) {
                    const newScore = parseInt(newScoreStr, 10);
                    if (!isNaN(newScore)) {
                        send({
                            type: 'GAME_ACTION',
                            action: {
                                type: 'SET_SCORE',
                                payload: { playerId: p.id, score: newScore }
                            }
                        });
                    }
                }
            }, 800);
        });

        card.addEventListener('mouseup', () => clearTimeout(pressTimer));
        card.addEventListener('mouseleave', () => clearTimeout(pressTimer));

        container.appendChild(card);
    });
}

function selectPlayer(id: number, name: string) {
    selectedPlayerId = id;
    if (selectedPlayerNameEl) selectedPlayerNameEl.textContent = `Selected: ${name}`;

    if (playersListEl) {
        Array.from(playersListEl.children).forEach((child: any) => {
            child.classList.remove('selected');
        });

        // Re-render handled by state updates usually, but for instant feedback:
        send({ type: 'REQUEST_SYNC' });
    }
}

function updateView(state: GameState) {
    if (currentRoundEl) {
        currentRoundEl.textContent = state.currentRoundName || 'Lobby';
    }

    // Always update data regardless of visibility
    renderManagePlayers(state);

    // Only manage main visibility if we are on the grid tab
    if (currentTab !== 'grid') return;

    // Hide all views first
    if (gridView) gridView.classList.add('hidden');
    if (questionView) questionView.classList.add('hidden');
    if (specialView) specialView.classList.add('hidden');

    if (state.mode === 'GRID') {
        if (gridView) gridView.classList.remove('hidden');
        renderGrid(state);
        renderRoundSelector(state);
    } else if (state.specialMode) { // Check for special mode
        if (specialView) specialView.classList.remove('hidden');

        const q = state.rounds[state.currentRoundName]?.find(q => q.id === state.currentQuestionId);
        if (q) {
            const iconMap: Record<string, string> = {
                cat: '🐱',
                bet: '💰',
                auction: '🔨',
                special: '🎁',
            };
            if (specialIconEl) specialIconEl.textContent = iconMap[state.specialMode] || '🎁';
            if (specialTitleEl) specialTitleEl.textContent = (state.specialMode === 'cat' ? 'Kot v meshke' : state.specialMode).toUpperCase();
            if (specialDescEl) specialDescEl.textContent = q.specialDescription || 'No description';
        }
    } else {
        if (gridView) gridView.classList.add('hidden');
        if (questionView) questionView.classList.remove('hidden');

        // Find current question to show text
        let questionText = 'Active Question';
        let answerText = '';
        let questionType = '';

        // Search in current round
        const questions = state.rounds[state.currentRoundName] || [];
        const currentQ = questions.find(q => q.id === state.currentQuestionId);

        if (currentQ) {
            questionText = currentQ.question || 'Media Question';
            questionType = currentQ.type || 'text';
            // Answer is already fully resolved at parse time (SiqService)
            answerText = currentQ.answer || 'Answer hidden';

            if (questionTextEl) questionTextEl.textContent = questionText;
            if (questionTypeEl) {
                questionTypeEl.textContent = questionType;
                // Optional: translate or format type
                const typeMap: Record<string, string> = {
                    text: 'Текст',
                    image: 'Изображение',
                    audio: 'Аудио',
                    video: 'Видео',
                    mashup: 'Мэшап',
                    select: 'Выбор'
                };
                questionTypeEl.textContent = typeMap[questionType] || questionType.toUpperCase();
            }

            if (answerTextEl) {
                answerTextEl.textContent = answerText;
                answerTextEl.classList.remove('hidden');

                // Add visual indicator if answer is not yet revealed to players
                if (!state.visible.answer) {
                    answerTextEl.style.opacity = '0.7';
                    answerTextEl.style.borderStyle = 'dashed';
                    answerTextEl.title = 'Hidden from players';
                } else {
                    answerTextEl.style.opacity = '1';
                    answerTextEl.style.borderStyle = 'solid';
                    answerTextEl.title = 'Visible to players';
                }
            }

            if (answerMediaEl) {
                answerMediaEl.innerHTML = '';
                answerMediaEl.classList.add('hidden');

                if (currentQ.answerImageUrl || (currentRoundData && currentRoundData.answerImage)) {
                    const img = document.createElement('img');
                    // Prefer Base64 data from currentRoundData if available (for mobile), fallback to blob URL (desktop/same-tab)
                    img.src = (currentRoundData && currentRoundData.answerImage)
                        ? currentRoundData.answerImage
                        : currentQ.answerImageUrl!;

                    img.style.maxWidth = '100%';
                    img.style.maxHeight = '200px';
                    img.style.borderRadius = '8px';
                    img.style.objectFit = 'contain';

                    // Add error handling
                    img.onerror = () => {
                        console.error('Failed to load answer image');
                        img.style.display = 'none';
                        const err = document.createElement('div');
                        err.textContent = '❌ Image failed';
                        err.style.color = 'red';
                        answerMediaEl.appendChild(err);
                    };

                    answerMediaEl.appendChild(img);
                    answerMediaEl.classList.remove('hidden');
                }

                // Video is intentionally skipped in mobile admin to avoid slow loading
                if (currentQ.answerVideoUrl && !currentQ.answerImageUrl) {
                    const badge = document.createElement('div');
                    badge.textContent = '🎬 Video answer';
                    badge.style.cssText = 'background:#333;padding:10px;border-radius:8px;color:#aaa;font-size:0.9em;text-align:center;';
                    answerMediaEl.appendChild(badge);
                    answerMediaEl.classList.remove('hidden');
                }
            }
        }
    }

    // Players
    if (state.players) {
        updatePlayersList(state.players);
    }
}

function handleMessage(msg: BroadcastMessage) {
    // Hide loader on any message response
    if (loaderEl) loaderEl.classList.add('hidden');

    if (msg.type === 'STATE') {
        const state = msg.state as GameState;
        currentState = state;
        updateView(state);
    } else if (msg.type === 'LOAD_ROUND_DATA') {
        currentRoundData = msg.data;
        // If we have state, trigger a view update to try and render media immediately
        if (currentState) {
            updateView(currentState);
        }
    }
}

function send(msg: any) {
    if (conn && conn.open) {
        // Show loader for state-changing actions
        if (msg.type === 'GAME_ACTION' || msg.type === 'REQUEST_SYNC') {
            if (loaderEl) loaderEl.classList.remove('hidden');
        }
        conn.send(msg);
    }
}

function updateStatus(text: string, color: string) {
    if (statusText) statusText.textContent = text;
    if (statusDot) {
        if (color === 'green') statusDot.className = 'status-dot status-connected';
        else if (color === 'orange') statusDot.className = 'status-dot status-connecting';
        else statusDot.className = 'status-dot';

        if (color !== 'green' && color !== 'orange') {
            statusDot.style.backgroundColor = color;
        } else {
            statusDot.style.removeProperty('background-color');
        }
    }
}

// Bind buttons
function bindAction(id: string, actionType: any, payload?: any, requiresPlayer: boolean = false) {
    document.getElementById(id)?.addEventListener('click', (e) => {
        e.preventDefault();

        if (requiresPlayer) {
            if (selectedPlayerId === null) {
                alert('Select a player first!');
                return;
            }
        }

        const btn = document.getElementById(id);
        if (btn) {
            btn.style.opacity = '0.7';
            setTimeout(() => btn.style.opacity = '1', 100);
        }

        let finalPayload = payload;
        if (requiresPlayer) {
            if (typeof payload === 'object' && payload !== null) {
                finalPayload = { ...payload, playerId: selectedPlayerId };
            } else {
                finalPayload = { playerId: selectedPlayerId };
                if (payload !== undefined) {
                    if (typeof payload === 'object') {
                        finalPayload = { ...payload, playerId: selectedPlayerId };
                    }
                }
            }
        } else {
            if (typeof payload === 'object' && payload !== null) {
                finalPayload = { ...payload };
            } else {
                finalPayload = payload;
            }
        }

        send({
            type: 'GAME_ACTION',
            action: {
                type: actionType,
                payload: finalPayload,
                source: 'mobile'
            }
        });
    });
}

bindAction('btn-show-answer', 'SHOW_ANSWER');
bindAction('btn-show-question', 'REVEAL_MEDIA', 'question');
bindAction('btn-media-toggle', 'TOGGLE_MEDIA');

// Bind fullscreen toggle (custom non-GAME_ACTION message)
const btnFullscreenLocal = document.getElementById('btn-video-fullscreen');
if (btnFullscreenLocal) {
    btnFullscreenLocal.addEventListener('click', () => {
        send({ type: 'TOGGLE_FULLSCREEN' });
    });
}

bindAction('btn-back-grid', 'BACK_TO_GRID');
bindAction('btn-award-full', 'AWARD_POINTS', { multiplier: 'full' }, true);
bindAction('btn-award-half', 'AWARD_POINTS', { multiplier: 'half' }, true);
bindAction('btn-award-minus', 'AWARD_POINTS', { multiplier: 'minus' }, true);

// Bind Setup & Tabs
document.querySelectorAll('.tab-item').forEach(tab => {
    tab.addEventListener('click', () => {
        const target = tab.getAttribute('data-tab') as any;
        if (target) switchTab(target);
    });
});

function switchTab(tab: 'grid' | 'players' | 'setup') {
    currentTab = tab;

    // Update Tab UI
    document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
    document.querySelector(`.tab-item[data-tab="${tab}"]`)?.classList.add('active');

    // Hide all main views
    document.querySelectorAll('.view-panel').forEach(v => v.classList.add('hidden'));

    if (tab === 'grid') {
        if (currentState) updateView(currentState);
    } else if (tab === 'players') {
        document.getElementById('players-view')?.classList.remove('hidden');
    } else if (tab === 'setup') {
        document.getElementById('setup-view')?.classList.remove('hidden');
    }
}

// Add Player
document.getElementById('btn-add-player')?.addEventListener('click', () => {
    const input = document.getElementById('new-player-name') as HTMLInputElement;
    if (input && input.value) {
        send({
            type: 'GAME_ACTION',
            action: { type: 'ADD_PLAYER', payload: { name: input.value }, source: 'mobile' }
        });
        input.value = '';
    }
});

// Pack Upload
document.getElementById('siq-upload')?.addEventListener('change', (e) => {
    const input = e.target as HTMLInputElement;
    const status = document.getElementById('setup-status');
    const progressBar = document.getElementById('upload-progress-bar');
    const progressWrap = document.getElementById('upload-progress-wrap');

    if (input.files && input.files[0]) {
        const file = input.files[0];
        const sizeMb = (file.size / 1024 / 1024).toFixed(1);
        if (status) status.textContent = `Reading ${file.name} (${sizeMb} MB)...`;
        if (progressWrap) progressWrap.classList.remove('hidden');
        if (progressBar) progressBar.style.width = '0%';

        const reader = new FileReader();

        reader.onprogress = (evt) => {
            if (evt.lengthComputable && progressBar) {
                const pct = Math.round((evt.loaded / evt.total) * 50); // first 50% = reading
                progressBar.style.width = pct + '%';
                if (status) status.textContent = `Reading... ${pct * 2}%`;
            }
        };

        reader.onload = async () => {
            const buffer = reader.result as ArrayBuffer;
            if (progressBar) progressBar.style.width = '50%';
            if (status) status.textContent = 'Sending to host...';

            try {
                await sendChunked(file.name, buffer, (sent, total) => {
                    const pct = 50 + Math.round((sent / total) * 50); // 50%-100% = sending
                    if (progressBar) progressBar.style.width = pct + '%';
                    if (status) status.textContent = `Sending... ${pct}%`;
                });
                if (progressBar) progressBar.style.width = '100%';
                if (status) status.textContent = '✅ Sent! Processing on host...';
                setTimeout(() => {
                    if (progressWrap) progressWrap.classList.add('hidden');
                }, 2000);
            } catch (err) {
                console.error('Upload send failed', err);
                if (status) status.textContent = '❌ Send failed';
                if (progressWrap) progressWrap.classList.add('hidden');
            }
            input.value = '';
        };

        reader.onerror = () => {
            console.error('Upload read failed', reader.error);
            if (status) status.textContent = '❌ Error reading file';
            if (progressWrap) progressWrap.classList.add('hidden');
            input.value = '';
        };

        reader.readAsArrayBuffer(file);
    }
});

const CHUNK_SIZE = 64 * 1024; // 64 KB per chunk

async function sendChunked(
    name: string,
    buffer: ArrayBuffer,
    onProgress: (sent: number, total: number) => void
): Promise<void> {
    const total = buffer.byteLength;
    const totalChunks = Math.ceil(total / CHUNK_SIZE);

    // Send header first
    send({
        type: 'GAME_ACTION',
        action: {
            type: 'UPLOAD_PACK_START',
            payload: { name, totalChunks, totalSize: total },
            source: 'mobile'
        }
    });

    for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, total);
        const chunk = buffer.slice(start, end);

        // Wait for DataChannel buffer to drain before sending next chunk
        const dc = (conn as any)?._dc as RTCDataChannel | undefined;
        if (dc) {
            while (dc.bufferedAmount > CHUNK_SIZE * 4) {
                await new Promise(r => setTimeout(r, 20));
            }
        }

        send({
            type: 'GAME_ACTION',
            action: {
                type: 'UPLOAD_PACK_CHUNK',
                payload: { name, chunkIndex: i, totalChunks, data: chunk },
                source: 'mobile'
            }
        });

        onProgress(end, total);
    }
}


// Reset (Reload)
document.getElementById('btn-reset-game')?.addEventListener('click', () => {
    if (confirm('Reload mobile interface?')) {
        window.location.reload();
    }
});

// Bind custom open special button
document.getElementById('btn-open-special')?.addEventListener('click', () => {
    if (currentState && currentState.currentQuestionId) {
        send({
            type: 'GAME_ACTION',
            action: { type: 'OPEN_SPECIAL', payload: currentState.currentQuestionId, source: 'mobile' }
        });
    }
});

// Initialize Peer
const peerConfig = {
    host: PEER_HOST,
    port: PEER_PORT,
    path: '/'
};

const peer = new Peer(peerConfig);
let conn: DataConnection | null = null;
let reconnectInterval: any = null;

peer.on('open', (id) => {
    console.log('Mobile Peer ID:', id);
    if (hostId) {
        connectToHost();
    }
});

peer.on('error', (err) => {
    console.error('Peer Error:', err);
    updateStatus('Error: ' + err.type, 'red');
});

peer.on('disconnected', () => {
    updateStatus('Disconnected', 'red');
    peer.reconnect();
});

function connectToHost() {
    if (!hostId) return;

    updateStatus('Connecting...', 'orange');

    if (conn) {
        conn.close();
    }

    conn = peer.connect(hostId);

    conn.on('open', () => {
        console.log('Connected to host:', hostId);
        updateStatus('Connected', 'green');
        if (connectionError) connectionError.style.display = 'none';
        if (loaderEl) loaderEl.classList.add('hidden'); // Hide loader on connect

        if (reconnectInterval) {
            clearInterval(reconnectInterval);
            reconnectInterval = null;
        }

        send({ type: 'REQUEST_SYNC' });
    });

    conn.on('data', (data) => {
        handleMessage(data as BroadcastMessage);
    });

    conn.on('close', () => {
        console.log('Connection closed');
        updateStatus('Disconnected', 'red');
        if (connectionError) connectionError.style.display = 'block';

        if (!reconnectInterval) {
            reconnectInterval = setInterval(() => {
                console.log('Reconnecting...');
                connectToHost();
            }, 3000);
        }
    });

    conn.on('error', (err) => {
        console.error('Connection Error:', err);
    });
}
