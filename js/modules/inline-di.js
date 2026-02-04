const FusionOS = (() => {
    // --- CONFIG & ORB KEYS ---
    const CONFIG = {
        // Chaves de Dados (Ouro)
        keyLocal: 'di_origin_apps_v3',       // Orb Local (Escrita permitida)
        keySystemV4: 'DI_SYSTEM_DUAL_APPS',  // Orb Sistema (Leitura)
        keySystemV3: 'fusion_os_state_v2_3', // Orb Legacy (Leitura)
        
        // Chave de Estado Visual (Apenas UI)
        keyUI: 'fusion_os_v45_ui_state',
        
        voiceEnabled: false
    };

    const SYS_APPS = [
        { 
            id: 'SYS_TERMINAL', 
            name: 'Terminal', 
            type: 'sys', 
            icon: 'terminal-square', 
            active: true,
            desc: 'Prompt de comando',
            isSystem: true
        }
    ];

    let _state = { apps: [], uiStates: {} };

    // --- STORAGE ENGINE (ORB CONVERGENCE) ---
    const Storage = {
        save: () => {
            // Salva apenas os apps que NÃO são do sistema (User Created)
            const userApps = _state.apps.filter(app => !app.isSystem && app.type !== 'sys');
            localStorage.setItem(CONFIG.keyLocal, JSON.stringify(userApps));
            
            // Salva estado da UI (quem está minimizado)
            localStorage.setItem(CONFIG.keyUI, JSON.stringify(_state.uiStates));
        },

        load: () => {
            let combinedApps = [...SYS_APPS];
            const processedUrls = new Set();

            // 1. Carregar Apps Locais (Orb Pessoal)
            try {
                const rawLocal = localStorage.getItem(CONFIG.keyLocal);
                if (rawLocal) {
                    const localApps = JSON.parse(rawLocal);
                    localApps.forEach(app => {
                        app.isSystem = false; // Usuário pode deletar
                        combinedApps.push(app);
                        if(app.url) processedUrls.add(app.url);
                    });
                }
            } catch(e) { console.warn("Erro ao ler Orb Local", e); }

            // 2. Carregar Apps de Sistema (Fusion Orbs)
            const loadSystemKey = (key) => {
                try {
                    const raw = localStorage.getItem(key);
                    if (!raw) return;
                    const parsed = JSON.parse(raw);
                    // Suporta formato array direto ou objeto { installed: [] }
                    const list = Array.isArray(parsed) ? parsed : (parsed.installed || []);

                    list.forEach(item => {
                        // Evita duplicatas baseadas em URL
                        if (item.url && processedUrls.has(item.url)) return;

                        combinedApps.push({
                            id: item.id || item.code || `sys_${Math.random().toString(36).substr(2,9)}`,
                            name: item.name || 'Módulo Fusion',
                            url: item.url,
                            icon: item.icon || 'box', // Tenta usar ícone do sistema ou padrão
                            desc: item.desc || item.group || 'Sistema',
                            active: true,
                            isSystem: true // Protegido
                        });
                        if (item.url) processedUrls.add(item.url);
                    });
                } catch(e) { console.warn(`Erro ao ler Orb Sistema ${key}`, e); }
            };

            loadSystemKey(CONFIG.keySystemV4);
            loadSystemKey(CONFIG.keySystemV3);

            _state.apps = combinedApps;

            // 3. Carregar Estado da UI
            try {
                const rawUI = localStorage.getItem(CONFIG.keyUI);
                if (rawUI) _state.uiStates = JSON.parse(rawUI);
            } catch(e) { _state.uiStates = {}; }
        }
    };

    // --- BOTINOT ---
    const Botinot = {
        say: (msg, type = 'info') => {
            const container = document.getElementById('botinot-container');
            if(!container) return; // Segurança
            const el = document.createElement('div');
            el.className = 'bot-msg';
            
            const icon = type === 'error' ? 'alert-triangle' : (type === 'success' ? 'check' : 'info');
            const color = type === 'error' ? '#ef4444' : '#38bdf8';
            
            el.innerHTML = `
                <div class="bot-avatar" style="background: linear-gradient(135deg, ${color}, #000)">
                    <i data-lucide="${icon}" width="14" color="white"></i>
                </div>
                <div class="flex-1 font-medium text-sm leading-tight">${msg}</div>
            `;
            
            container.appendChild(el);
            if(window.lucide) lucide.createIcons();

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
            if(!feed) return;
            feed.innerHTML = '';

            _state.apps.forEach(app => {
                if (app.type === 'sys') {
                    // Terminal
                    feed.innerHTML += `
                        <div class="fusion-card p-1">
                            <div class="bg-black/60 p-5 rounded-[24px] flex items-center gap-4 border border-white/5">
                                <i data-lucide="terminal" class="text-sky-500 w-5 h-5"></i>
                                <input type="text" 
                                    class="bg-transparent w-full text-sm font-mono focus:outline-none text-white placeholder-white/20 uppercase tracking-widest" 
                                    placeholder="Digite um comando (ex: ADD url)..." 
                                    onkeydown="if(event.key === 'Enter'){ FusionOS.handleCommand(this.value); this.value=''; }">
                            </div>
                        </div>
                    `;
                    return;
                }

                const isMin = _state.uiStates[app.id] === true;
                const isSysApp = app.isSystem === true;
                
                const card = document.createElement('div');
                card.className = `fusion-card flex flex-col ${isMin ? 'minimized' : ''}`;
                card.id = `card-${app.id}`;

                // Header
                const headerHTML = `
                    <div class="fusion-header flex items-center justify-between cursor-pointer select-none" onclick="FusionOS.toggleCard('${app.id}')">
                        <div class="flex items-center gap-4">
                            <div class="w-10 h-10 rounded-full ${isSysApp ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' : 'bg-gradient-to-br from-white/10 to-white/5 border-white/10 text-sky-300'} border flex items-center justify-center shadow-inner relative">
                                <i data-lucide="${app.icon || 'box'}" width="18"></i>
                                ${isSysApp ? '<div class="absolute -bottom-1 -right-1 w-3 h-3 bg-purple-500 rounded-full border-2 border-black"></div>' : ''}
                            </div>
                            <div>
                                <h3 class="font-bold text-sm text-white/90 leading-tight">${app.name}</h3>
                                <div class="text-[10px] text-white/40 font-mono tracking-wide flex items-center gap-2">
                                    ${app.url ? new URL(app.url).hostname : 'LOCAL'}
                                    ${isSysApp ? '<span class="text-purple-400 font-bold">[SYS]</span>' : ''}
                                </div>
                            </div>
                        </div>
                        <div class="flex items-center gap-2">
                            <div class="text-white/20 chevron-icon mr-2 transition-transform ${isMin ? '-rotate-90' : ''}"><i data-lucide="chevron-down" width="18"></i></div>
                            <button onclick="event.stopPropagation(); FusionOS.reloadApp('${app.id}')" class="p-2 hover:bg-white/10 rounded-full text-white/40 hover:text-white transition" title="Recarregar"><i data-lucide="refresh-cw" width="14"></i></button>
                            <button onclick="event.stopPropagation(); FusionOS.removeApp('${app.id}')" class="p-2 hover:bg-red-500/20 rounded-full text-white/40 hover:text-red-400 transition" title="${isSysApp ? 'Ocultar nesta sessão' : 'Remover permanentemente'}"><i data-lucide="${isSysApp ? 'eye-off' : 'x'}" width="14"></i></button>
                        </div>
                    </div>
                `;

                // Body
                const body = document.createElement('div');
                body.className = 'fusion-body flex-1 relative transition-all duration-300 ease-in-out overflow-hidden';
                
                if (isMin) { body.style.maxHeight = '0px'; body.style.opacity = '0'; }
                else { body.style.maxHeight = '800px'; body.style.opacity = '1'; } // Altura máxima para animação

                if (app.url) {
                    const src = isMin ? 'about:blank' : app.url;
                    body.innerHTML = `<iframe src="${src}" data-real-src="${app.url}" class="w-full h-[600px] border-none bg-black/40" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads"></iframe>`;
                } else if (app.html) {
                        body.innerHTML = `<div class="p-6 text-white/80">${app.html}</div>`;
                }

                card.innerHTML = headerHTML;
                card.appendChild(body);
                feed.appendChild(card);
            });
            if(window.lucide) lucide.createIcons();
        },

        dashboard: () => {
            const grid = document.getElementById('dashboard-grid');
            if(!grid) return;
            grid.innerHTML = '';

            _state.apps.forEach(app => {
                const isSys = app.type === 'sys';
                const isSystemOrb = app.isSystem;
                
                const item = document.createElement('button');
                item.className = 'app-icon-btn group';
                item.onclick = () => {
                    FusionOS.scrollToApp(app.id);
                    FusionOS.toggleDashboard();
                };

                // Cores diferentes para Apps de Sistema vs Locais
                const iconColor = isSys ? 'text-sky-300' : (isSystemOrb ? 'text-purple-400' : 'text-white');
                const borderColor = isSystemOrb ? 'border-purple-500/30' : 'border-white/10';

                item.innerHTML = `
                    <div class="app-icon-box ${isSys ? 'sys' : ''} border ${borderColor}">
                        <i data-lucide="${app.icon || 'box'}" class="${iconColor}" width="32" stroke-width="1.5"></i>
                        ${_state.uiStates[app.id] ? '' : `<div class="absolute bottom-2 w-1.5 h-1.5 ${isSystemOrb ? 'bg-purple-400 shadow-[0_0_8px_#a855f7]' : 'bg-white shadow-[0_0_8px_white]'} rounded-full"></div>`}
                    </div>
                    <span class="app-icon-label">${app.name}</span>
                `;
                grid.appendChild(item);
            });
            if(window.lucide) lucide.createIcons();
        }
    };

    // --- CORE API ---
    return {
        init: () => {
            console.log("FusionOS Vision v2.5 // Orb Convergence Active");
            Storage.load();
            Renderer.stream();
            Renderer.dashboard();
            setTimeout(() => {
                const count = _state.apps.length - 1; // remove terminal count
                Botinot.say(`Orbs Conectados: ${count} módulos ativos.`);
            }, 800);
        },

        Botinot: Botinot,

        toggleDashboard: () => {
            const dash = document.getElementById('dashboard-overlay');
            if(!dash) return;
            const isOpen = dash.classList.contains('open');
            
            if (isOpen) {
                dash.classList.remove('open');
            } else {
                Renderer.dashboard(); 
                dash.classList.add('open');
                setTimeout(() => {
                    const inp = document.getElementById('module-url-input');
                    if(inp) inp.focus();
                }, 100);
            }
        },

        toggleCard: (id) => {
            const card = document.getElementById(`card-${id}`);
            if (!card) return;
            
            // Toggle Logic
            const wasMin = card.classList.contains('minimized');
            // Toggle class visual
            if(wasMin) card.classList.remove('minimized');
            else card.classList.add('minimized');

            const isNowMin = !wasMin;
            _state.uiStates[id] = isNowMin;
            Storage.save();
            
            // Iframe logic (Load/Unload to save RAM)
            const iframe = card.querySelector('iframe');
            const body = card.querySelector('.fusion-body');
            
            if (isNowMin) {
                if(body) { body.style.maxHeight = '0px'; body.style.opacity = '0'; }
                if(iframe) setTimeout(() => iframe.src = 'about:blank', 300); // delay para animação
            } else {
                if(body) { body.style.maxHeight = '800px'; body.style.opacity = '1'; }
                if(iframe && iframe.dataset.realSrc) iframe.src = iframe.dataset.realSrc;
            }
            
            Renderer.dashboard(); // Atualiza bolinhas de status
        },

        minimizeAll: () => {
            _state.apps.forEach(app => { if(app.type !== 'sys' && !_state.uiStates[app.id]) FusionOS.toggleCard(app.id); });
            Botinot.say("Modo Foco (Minimizado).");
            FusionOS.toggleDashboard();
        },

        expandAll: () => {
            _state.apps.forEach(app => { if(app.type !== 'sys' && _state.uiStates[app.id]) FusionOS.toggleCard(app.id); });
            Botinot.say("Visão Expandida.");
            FusionOS.toggleDashboard();
        },

        addUrlModule: () => {
            const input = document.getElementById('module-url-input');
            let url = input.value.trim();
            if (!url) return;

            if (!url.startsWith('http')) url = 'https://' + url;

            const newApp = {
                id: 'MOD_' + Date.now(),
                name: new URL(url).hostname.replace('www.','').split('.')[0].toUpperCase(),
                url: url,
                icon: 'globe',
                active: true,
                isSystem: false // Importante: Cria no Orb Local
            };

            _state.apps.unshift(newApp); 
            _state.uiStates[newApp.id] = false; // Começa expandido
            
            Storage.save();
            Renderer.stream();
            Renderer.dashboard();
            
            input.value = '';
            Botinot.say("Módulo " + newApp.name + " salvo no Orb Local.", "success");
            FusionOS.toggleDashboard();
        },

        removeApp: (id) => {
            const app = _state.apps.find(a => a.id === id);
            if(!app) return;

            if(app.isSystem) {
                if(!confirm('Este é um módulo do Sistema/Fusion. Ele será apenas ocultado até o próximo reinício. Continuar?')) return;
                _state.apps = _state.apps.filter(a => a.id !== id);
                Botinot.say("Módulo de sistema ocultado.");
            } else {
                if(!confirm('Excluir este módulo permanentemente do seu Orb Local?')) return;
                _state.apps = _state.apps.filter(a => a.id !== id);
                delete _state.uiStates[id];
                Storage.save();
                Botinot.say("Módulo excluído.");
            }
            Renderer.stream();
        },

        reloadApp: (id) => {
            const card = document.getElementById(`card-${id}`);
            const iframe = card?.querySelector('iframe');
            if(iframe && iframe.dataset.realSrc) {
                iframe.src = iframe.dataset.realSrc;
                Botinot.say("Recarregando fluxo...");
            }
        },

        scrollToApp: (id) => {
            const el = document.getElementById(id === 'SYS_TERMINAL' ? 'fusion-feed' : `card-${id}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el.classList.add('ring-2', 'ring-sky-500/50');
                setTimeout(() => el.classList.remove('ring-2', 'ring-sky-500/50'), 1000);
            }
        },

        handleCommand: (cmd) => {
            const raw = cmd.trim();
            if(!raw) return;
            const parts = raw.split(' ');
            const action = parts[0].toUpperCase();

            if (action === 'RESET') FusionOS.resetSystem();
            else if (action === 'ADD') {
                const url = parts[1];
                if(url) {
                    const inp = document.getElementById('module-url-input');
                    if(inp) {
                        inp.value = url;
                        FusionOS.addUrlModule();
                    }
                }
            } 
            else if (action === 'HELP') Botinot.say("Comandos: ADD [url], RESET", "info");
            else Botinot.say("Comando desconhecido.", "error");
        },

        resetSystem: () => {
            if(confirm("DANGER: Apagar seus Apps Locais (Orb Pessoal)?")) {
                localStorage.removeItem(CONFIG.keyLocal);
                localStorage.removeItem(CONFIG.keyUI);
                location.reload();
            }
        }
    };
})();

// Auto-Boot
window.addEventListener('DOMContentLoaded', FusionOS.init);
