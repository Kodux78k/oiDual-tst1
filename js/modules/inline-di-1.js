// main.js - FusionOS (substitua o arquivo atual por este)
// Versão: FusionOS Vision - main.js com Renderer robusto e toggleCard otimizado

const FusionOS = (() => {
    // --- CONFIG & ORB KEYS ---
    const CONFIG = {
        keyLocal: 'di_origin_apps_v3',
        keySystemV4: 'DI_SYSTEM_DUAL_APPS',
        keySystemV3: 'fusion_os_state_v2_3',
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
            const userApps = _state.apps.filter(app => !app.isSystem && app.type !== 'sys');
            try { localStorage.setItem(CONFIG.keyLocal, JSON.stringify(userApps)); } catch(e){}
            try { localStorage.setItem(CONFIG.keyUI, JSON.stringify(_state.uiStates)); } catch(e){}
        },

        load: () => {
            let combinedApps = [...SYS_APPS];
            const processedUrls = new Set();

            try {
                const rawLocal = localStorage.getItem(CONFIG.keyLocal);
                if (rawLocal) {
                    const localApps = JSON.parse(rawLocal);
                    localApps.forEach(app => {
                        app.isSystem = false;
                        combinedApps.push(app);
                        if (app.url) processedUrls.add(app.url);
                    });
                }
            } catch(e) { console.warn("Erro ao ler Orb Local", e); }

            const loadSystemKey = (key) => {
                try {
                    const raw = localStorage.getItem(key);
                    if (!raw) return;
                    const parsed = JSON.parse(raw);
                    const list = Array.isArray(parsed) ? parsed : (parsed.installed || []);
                    list.forEach(item => {
                        if (item.url && processedUrls.has(item.url)) return;
                        combinedApps.push({
                            id: item.id || item.code || `sys_${Math.random().toString(36).substr(2,9)}`,
                            name: item.name || 'Módulo Fusion',
                            url: item.url,
                            icon: item.icon || 'box',
                            desc: item.desc || item.group || 'Sistema',
                            active: true,
                            isSystem: true
                        });
                        if (item.url) processedUrls.add(item.url);
                    });
                } catch(e) { console.warn(`Erro ao ler Orb Sistema ${key}`, e); }
            };

            loadSystemKey(CONFIG.keySystemV4);
            loadSystemKey(CONFIG.keySystemV3);

            _state.apps = combinedApps;

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
            if(!container) return;
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

    // --- helpers de animação (usados por toggleCard) ---
    function animateCollapse(el) {
      const startHeight = el.scrollHeight || 0;
      el.style.maxHeight = startHeight + 'px';
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          el.style.transition = 'max-height 300ms cubic-bezier(0.22, 1, 0.36, 1), opacity 200ms ease';
          el.style.maxHeight = '0px';
          el.style.opacity = '0';
          el.style.pointerEvents = 'none';
        });
      });
    }
    function animateExpand(el) {
      el.style.pointerEvents = 'auto';
      el.style.opacity = '1';
      el.style.transition = 'max-height 350ms cubic-bezier(0.22, 1, 0.36, 1), opacity 200ms ease';
      requestAnimationFrame(() => {
        const target = el.scrollHeight || 0;
        el.style.maxHeight = target + 'px';
        const onEnd = (ev) => {
          if (ev.propertyName === 'max-height') {
            el.style.maxHeight = 'none';
            el.removeEventListener('transitionend', onEnd);
          }
        };
        el.addEventListener('transitionend', onEnd);
      });
    }

    // --- toggleCard (função robusta) ---
    function toggleCard(id) {
      const card = document.getElementById(`card-${id}`);
      if (!card) return;

      const wasMin = card.classList.contains('minimized');

      if (wasMin) card.classList.remove('minimized');
      else card.classList.add('minimized');

      const isNowMin = !wasMin;
      _state.uiStates[id] = isNowMin;
      Storage.save();

      const iframe = card.querySelector('iframe');
      const body = card.querySelector('.fusion-body');

      if (isNowMin) {
        if (body) animateCollapse(body);
        setTimeout(() => {
          if (iframe) iframe.src = 'about:blank';
        }, 320);
      } else {
        if (iframe && iframe.dataset.realSrc) {
          let loaded = false;
          const onLoad = () => {
            if (loaded) return;
            loaded = true;
            try { animateExpand(body); } catch(e) {}
            iframe.removeEventListener('load', onLoad);
          };
          iframe.addEventListener('load', onLoad);
          iframe.src = iframe.dataset.realSrc;
          setTimeout(() => {
            if (!loaded) try { animateExpand(body); } catch(e) {}
          }, 700);
        } else {
          if (body) animateExpand(body);
        }
      }

      // atualiza dashboard/bolinhas
      try { Renderer.dashboard(); } catch(e) {}
    }

    // -----------------------------
    // RENDERER ROBUSTO (usa toggleCard)
    // -----------------------------
    const Renderer = {
      stream: () => {
        const feed = document.getElementById('fusion-feed');
        if (!feed) return;
        feed.innerHTML = '';

        _state.apps.forEach(app => {
          if (app.type === 'sys') {
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

          // HEADER (DOM-safe)
          const header = document.createElement('div');
          header.className = 'fusion-header flex items-center justify-between cursor-pointer select-none';
          header.addEventListener('click', () => toggleCard(app.id));

          const left = document.createElement('div');
          left.className = 'flex items-center gap-4';

          const iconWrap = document.createElement('div');
          iconWrap.className = `w-10 h-10 rounded-full ${isSysApp ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' : 'bg-gradient-to-br from-white/10 to-white/5 border-white/10 text-sky-300'} border flex items-center justify-center shadow-inner relative`;
          iconWrap.innerHTML = `<i data-lucide="${app.icon || 'box'}" width="18"></i>`;
          if (isSysApp) {
            const dot = document.createElement('div');
            dot.className = 'absolute -bottom-1 -right-1 w-3 h-3 bg-purple-500 rounded-full border-2 border-black';
            iconWrap.appendChild(dot);
          }

          const meta = document.createElement('div');
          const h3 = document.createElement('h3');
          h3.className = 'font-bold text-sm text-white/90 leading-tight';
          h3.textContent = app.name;
          const sub = document.createElement('div');
          sub.className = 'text-[10px] text-white/40 font-mono tracking-wide flex items-center gap-2';
          try {
            sub.textContent = app.url ? new URL(app.url).hostname : 'LOCAL';
          } catch (e) {
            sub.textContent = 'LOCAL';
          }
          if (isSysApp) {
            const span = document.createElement('span');
            span.className = 'text-purple-400 font-bold';
            span.textContent = ' [SYS]';
            sub.appendChild(span);
          }
          meta.appendChild(h3);
          meta.appendChild(sub);

          left.appendChild(iconWrap);
          left.appendChild(meta);

          const right = document.createElement('div');
          right.className = 'flex items-center gap-2';

          const chevron = document.createElement('div');
          chevron.className = `text-white/20 chevron-icon mr-2 transition-transform`;
          if (isMin) chevron.classList.add('-rotate-90');
          chevron.innerHTML = `<i data-lucide="chevron-down" width="18"></i>`;

          const btnReload = document.createElement('button');
          btnReload.className = 'p-2 hover:bg-white/10 rounded-full text-white/40 hover:text-white transition';
          btnReload.title = 'Recarregar';
          btnReload.innerHTML = `<i data-lucide="refresh-cw" width="14"></i>`;
          btnReload.addEventListener('click', (ev) => { ev.stopPropagation(); FusionOS.reloadApp(app.id); });

          const btnRemove = document.createElement('button');
          btnRemove.className = 'p-2 rounded-full text-white/40';
          btnRemove.title = isSysApp ? 'Ocultar nesta sessão' : 'Remover permanentemente';
          btnRemove.innerHTML = `<i data-lucide="${isSysApp ? 'eye-off' : 'x'}" width="14"></i>`;
          btnRemove.addEventListener('click', (ev) => { ev.stopPropagation(); FusionOS.removeApp(app.id); });

          right.appendChild(chevron);
          right.appendChild(btnReload);
          right.appendChild(btnRemove);

          header.appendChild(left);
          header.appendChild(right);

          // BODY
          const body = document.createElement('div');
          body.className = 'fusion-body flex-1 relative transition-all duration-300 ease-in-out overflow-hidden';
          if (isMin) {
            body.style.maxHeight = '0px';
            body.style.opacity = '0';
            body.style.pointerEvents = 'none';
          } else {
            body.style.maxHeight = 'none';
            body.style.opacity = '1';
            body.style.pointerEvents = 'auto';
          }

          if (app.url) {
            const src = isMin ? 'about:blank' : app.url;
            const iframe = document.createElement('iframe');
            iframe.src = src;
            iframe.dataset.realSrc = app.url;
            iframe.className = 'w-full h-[600px] border-none bg-black/40';
            iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups allow-downloads');
            body.appendChild(iframe);
          } else if (app.html) {
            const wrapper = document.createElement('div');
            wrapper.className = 'p-6 text-white/80';
            wrapper.innerHTML = app.html;
            body.appendChild(wrapper);
          }

          card.appendChild(header);
          card.appendChild(body);
          feed.appendChild(card);
        });

        if (window.lucide) lucide.createIcons();
      },

      dashboard: () => {
        const grid = document.getElementById('dashboard-grid');
        if (!grid) return;
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
        if (window.lucide) lucide.createIcons();
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
                const count = _state.apps.length - 1;
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

        toggleCard: toggleCard,

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
            if(!input) return;
            let url = input.value.trim();
            if (!url) return;

            if (!url.startsWith('http')) url = 'https://' + url;

            let name = '';
            try { name = new URL(url).hostname.replace('www.','').split('.')[0].toUpperCase(); } catch(e) { name = 'MODULE'; }

            const newApp = {
                id: 'MOD_' + Date.now(),
                name: name,
                url: url,
                icon: 'globe',
                active: true,
                isSystem: false
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
                try { localStorage.removeItem(CONFIG.keyLocal); } catch(e){}
                try { localStorage.removeItem(CONFIG.keyUI); } catch(e){}
                location.reload();
            }
        }
    };
})();

// Auto-Boot
window.addEventListener('DOMContentLoaded', FusionOS.init);