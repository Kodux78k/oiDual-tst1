
    const FusionOS = (() => {
        // --- CONFIG ---
        const CONFIG = {
            storageKey: 'fusion_os_v45_apps',
            stateKey: 'fusion_os_v45_ui',
            voiceEnabled: false
        };

        const DEFAULT_APPS = [
            { 
                id: 'SYS_TERMINAL', 
                name: 'Terminal', 
                type: 'sys', 
                icon: 'terminal-square', 
                active: true,
                desc: 'Prompt de comando'
            },
            { 
                id: 'APP_HUB', 
                name: 'Delta Hub', 
                url: 'https://kodux78k.github.io/DualInfodose-VirgemHuB/index.html', 
                icon: 'globe', 
                active: true,
                desc: 'Navegador Web'
            }
        ];

        let _state = { apps: [], uiStates: {} };

        // --- STORAGE ---
        const Storage = {
            save: () => {
                localStorage.setItem(CONFIG.storageKey, JSON.stringify(_state.apps));
                localStorage.setItem(CONFIG.stateKey, JSON.stringify(_state.uiStates));
            },
            load: () => {
                const rawApps = localStorage.getItem(CONFIG.storageKey);
                const rawUI = localStorage.getItem(CONFIG.stateKey);
                
                if (rawApps) {
                    try { _state.apps = JSON.parse(rawApps); } catch(e) { _state.apps = [...DEFAULT_APPS]; }
                } else { _state.apps = [...DEFAULT_APPS]; }

                if (rawUI) {
                    try { _state.uiStates = JSON.parse(rawUI); } catch(e) { _state.uiStates = {}; }
                }
            }
        };

        // --- BOTINOT ---
        const Botinot = {
            say: (msg, type = 'info') => {
                const container = document.getElementById('botinot-container');
                const el = document.createElement('div');
                el.className = 'bot-msg';
                
                // Avatar dinâmico
                const icon = type === 'error' ? 'alert-triangle' : (type === 'success' ? 'check' : 'info');
                const color = type === 'error' ? '#ef4444' : '#38bdf8';
                
                el.innerHTML = `
                    <div class="bot-avatar" style="background: linear-gradient(135deg, ${color}, #000)">
                        <i data-lucide="${icon}" width="14" color="white"></i>
                    </div>
                    <div class="flex-1 font-medium text-sm leading-tight">${msg}</div>
                `;
                
                container.appendChild(el);
                lucide.createIcons();

                setTimeout(() => {
                    el.style.opacity = '0';
                    el.style.transform = 'translateX(20px)';
                    setTimeout(() => el.remove(), 400);
                }, 4000);
            }
        };

        // --- RENDER ---
        const Renderer = {
            stream: () => {
                const feed = document.getElementById('fusion-feed');
                feed.innerHTML = '';

                _state.apps.forEach(app => {
                    if (app.type === 'sys') {
                        // Terminal estilo Glass Dark
                        feed.innerHTML += `
                            <div class="fusion-card p-1">
                                <div class="bg-black/60 p-5 rounded-[24px] flex items-center gap-4">
                                    <i data-lucide="terminal" class="text-sky-500 w-5 h-5"></i>
                                    <input type="text" 
                                        class="bg-transparent w-full text-sm font-mono focus:outline-none text-white placeholder-white/20 uppercase tracking-widest" 
                                        placeholder="Digite um comando..." 
                                        onkeydown="if(event.key === 'Enter'){ FusionOS.handleCommand(this.value); this.value=''; }">
                                </div>
                            </div>
                        `;
                        return;
                    }

                    const isMin = _state.uiStates[app.id] === true;
                    const card = document.createElement('div');
                    card.className = `fusion-card flex flex-col ${isMin ? 'minimized' : ''}`;
                    card.id = `card-${app.id}`;

                    // Header Moderno
                    const headerHTML = `
                        <div class="fusion-header flex items-center justify-between" onclick="FusionOS.toggleCard('${app.id}')">
                            <div class="flex items-center gap-4">
                                <div class="w-10 h-10 rounded-full bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center text-sky-300 shadow-inner">
                                    <i data-lucide="${app.icon || 'box'}" width="18"></i>
                                </div>
                                <div>
                                    <h3 class="font-bold text-sm text-white/90 leading-tight">${app.name}</h3>
                                    <div class="text-[10px] text-white/40 font-mono tracking-wide">${app.url ? new URL(app.url).hostname : 'LOCAL'}</div>
                                </div>
                            </div>
                            <div class="flex items-center gap-2">
                                <div class="text-white/20 chevron-icon mr-2"><i data-lucide="chevron-down" width="18"></i></div>
                                <button onclick="event.stopPropagation(); FusionOS.reloadApp('${app.id}')" class="p-2 hover:bg-white/10 rounded-full text-white/40 hover:text-white transition"><i data-lucide="refresh-cw" width="14"></i></button>
                                <button onclick="event.stopPropagation(); FusionOS.removeApp('${app.id}')" class="p-2 hover:bg-red-500/20 rounded-full text-white/40 hover:text-red-400 transition"><i data-lucide="x" width="14"></i></button>
                            </div>
                        </div>
                    `;

                    // Body
                    const body = document.createElement('div');
                    body.className = 'fusion-body flex-1 relative';
                    
                    if (isMin) { body.style.maxHeight = '0px'; body.style.opacity = '0'; }

                    if (app.url) {
                        const src = isMin ? 'about:blank' : app.url;
                        body.innerHTML = `<iframe src="${src}" data-real-src="${app.url}" class="w-full h-[600px] border-none" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads"></iframe>`;
                    } else if (app.html) {
                         body.innerHTML = `<div class="p-6">${app.html}</div>`;
                    }

                    card.innerHTML = headerHTML;
                    card.appendChild(body);
                    feed.appendChild(card);
                });
                lucide.createIcons();
            },

            dashboard: () => {
                const grid = document.getElementById('dashboard-grid');
                grid.innerHTML = '';

                _state.apps.forEach(app => {
                    const isSys = app.type === 'sys';
                    const item = document.createElement('button');
                    item.className = 'app-icon-btn group';
                    item.onclick = () => {
                        FusionOS.scrollToApp(app.id);
                        FusionOS.toggleDashboard();
                    };

                    // Ícone Circular Estilo Vision
                    item.innerHTML = `
                        <div class="app-icon-box ${isSys ? 'sys' : ''}">
                            <i data-lucide="${app.icon || 'box'}" class="${isSys ? 'text-sky-300' : 'text-white'}" width="32" stroke-width="1.5"></i>
                            ${_state.uiStates[app.id] ? '' : '<div class="absolute bottom-2 w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_8px_white]"></div>'}
                        </div>
                        <span class="app-icon-label">${app.name}</span>
                    `;
                    grid.appendChild(item);
                });
                lucide.createIcons();
            }
        };

        // --- CORE ---
        return {
            init: () => {
                console.log("FusionOS Vision Boot...");
                Storage.load();
                Renderer.stream();
                Renderer.dashboard();
                setTimeout(() => Botinot.say("Ambiente pronto."), 800);
            },

            Botinot: Botinot,

            toggleDashboard: () => {
                const dash = document.getElementById('dashboard-overlay');
                const isOpen = dash.classList.contains('open');
                
                if (isOpen) {
                    dash.classList.remove('open');
                } else {
                    Renderer.dashboard(); 
                    dash.classList.add('open');
                    setTimeout(() => document.getElementById('module-url-input').focus(), 100);
                }
            },

            toggleCard: (id) => {
                const card = document.getElementById(`card-${id}`);
                if (!card) return;
                const isNowMin = card.classList.toggle('minimized');
                _state.uiStates[id] = isNowMin;
                Storage.save();
                // Iframe logic
                const iframe = card.querySelector('iframe');
                if (iframe && iframe.dataset.realSrc) iframe.src = isNowMin ? 'about:blank' : iframe.dataset.realSrc;
                
                // Se estivermos no dashboard, atualiza os indicadores (pontinhos verdes)
                Renderer.dashboard();
            },

            minimizeAll: () => {
                _state.apps.forEach(app => { if(app.type !== 'sys' && !_state.uiStates[app.id]) FusionOS.toggleCard(app.id); });
                Botinot.say("Foco ativado (Minimizado).");
                FusionOS.toggleDashboard();
            },

            expandAll: () => {
                _state.apps.forEach(app => { if(app.type !== 'sys' && _state.uiStates[app.id]) FusionOS.toggleCard(app.id); });
                Botinot.say("Visão expandida.");
                FusionOS.toggleDashboard();
            },

            addUrlModule: () => {
                const input = document.getElementById('module-url-input');
                let url = input.value.trim();
                if (!url) return;

                if (!url.startsWith('http')) url = 'https://' + url;

                const newApp = {
                    id: 'MOD_' + Date.now(),
                    name: new URL(url).hostname.replace('www.','').split('.')[0].toUpperCase(), // Tenta extrair um nome curto
                    url: url,
                    icon: 'globe',
                    active: true
                };

                _state.apps.unshift(newApp); 
                _state.uiStates[newApp.id] = false; 
                Storage.save();
                Renderer.stream();
                Renderer.dashboard();
                input.value = '';
                Botinot.say("Módulo " + newApp.name + " adicionado.", "success");
                FusionOS.toggleDashboard();
            },

            removeApp: (id) => {
                if(!confirm('Remover módulo?')) return;
                _state.apps = _state.apps.filter(a => a.id !== id);
                delete _state.uiStates[id];
                Storage.save();
                Renderer.stream();
                Botinot.say("Módulo removido.");
            },

            reloadApp: (id) => {
                const card = document.getElementById(`card-${id}`);
                const iframe = card?.querySelector('iframe');
                if(iframe && iframe.dataset.realSrc) {
                    iframe.src = iframe.dataset.realSrc;
                    Botinot.say("Recarregando...");
                }
            },

            scrollToApp: (id) => {
                const el = document.getElementById(id === 'SYS_TERMINAL' ? 'fusion-feed' : `card-${id}`);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    el.classList.add('active-focus');
                    setTimeout(() => el.classList.remove('active-focus'), 2000);
                }
            },

            handleCommand: (cmd) => {
                const raw = cmd.trim().toUpperCase();
                if(!raw) return;
                if (raw === 'RESET') FusionOS.resetSystem();
                else if (raw.startsWith('ADD ')) {
                    const url = cmd.split(' ')[1];
                    if(url) {
                        document.getElementById('module-url-input').value = url;
                        FusionOS.addUrlModule();
                    }
                } else Botinot.say("Comando desconhecido.", "error");
            },

            resetSystem: () => {
                if(confirm("HARD RESET: Apagar tudo?")) {
                    localStorage.removeItem(CONFIG.storageKey);
                    localStorage.removeItem(CONFIG.stateKey);
                    location.reload();
                }
            }
        };
    })();

    window.addEventListener('DOMContentLoaded', FusionOS.init);
  