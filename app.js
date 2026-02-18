const PRESETS = {
      general: [
        "Técnica",
        "Patrones",
        "Escalas",
        "Arpegios",
        "Lectura",
        "Ritmo",
        "Escucha activa",
        "Repertorio",
        "Creatividad (inventar 4 compases)",
        "Teoría aplicada"
      ],
      piano_guitarra: [
        "Técnica",
        "Patrones",
        "Escalas",
        "Acordes",
        "Independencia",
        "Lectura",
        "Ritmo"
      ],
      violin: [
        "Técnica",
        "Patrones",
        "Escalas",
        "Arpegios",
        "Lectura",
        "Ritmo"
      ],
      canto: [
        "Respiración",
        "Apoyo",
        "Entonación",
        "Afinación",
        "Patrones",
        "Escalas",
        "Arpegios",
        "Lectura",
        "Ritmo"
      ],
      bateria: [
        "Técnica",
        "Patrones / Grooves",
        "Coordinación",
        "Fills",
        "Ritmo"
      ]
    };

    const DEFAULTS = [
      { name: "Técnica (escalas / digitación)", enabled: true },
      { name: "Repertorio (una sección)", enabled: true },
      { name: "Lectura rítmica", enabled: true },
      { name: "Lectura melódica", enabled: true },
      { name: "Entrenamiento auditivo", enabled: true },
      { name: "Improvisación libre", enabled: true },
      { name: "Improvisación pregunta-respuesta", enabled: true },
      { name: "Ritmo con metrónomo", enabled: true },
      { name: "Coordinación / independencia", enabled: true },
      { name: "Creatividad: componer 4 compases", enabled: true },
      { name: "Escucha activa (analizar una canción)", enabled: true },
      { name: "Teoría aplicada", enabled: true },
      { name: "Técnica de manos (calentamiento)", enabled: true },
      { name: "Dinámica / articulación", enabled: true },
      { name: "Memoria (tocar sin mirar)", enabled: true },
      { name: "Reto: tocar lento perfecto", enabled: true },
      { name: "Reto: tocar y cantar", enabled: true },
      { name: "Reto: variar el ritmo", enabled: true },
      { name: "Juego: “no pares el pulso”", enabled: true },
      { name: "Repaso de la clase anterior", enabled: true },
      { name: "Exploración: inventa un patrón", enabled: true }
    ];

    const LS_KEY = "musicala_selector_v2";   // subí versión por el nuevo campo used
    const LS_LAST = "musicala_selector_last_v2";
    const LS_SOUND = "musicala_selector_sound_v1";

    let items = loadItems();
    let lastWinner = localStorage.getItem(LS_LAST) || "";
    let isSpinning = false;
    let currentActiveIndex = -1;
    let lastPickedId = null;

    let soundOn = (localStorage.getItem(LS_SOUND) ?? "1") === "1";

    const $list = document.getElementById("list");
    const $btnSpin = document.getElementById("btnSpin");
    const $btnReset = document.getElementById("btnReset");
    const $btnReactivate = document.getElementById("btnReactivate");
    const $btnAdd = document.getElementById("btnAdd");
    const $newName = document.getElementById("newName");

    const $presetSelect = document.getElementById("presetSelect");
    const $btnLoadPreset = document.getElementById("btnLoadPreset");
    const $btnAddPreset = document.getElementById("btnAddPreset");

    const $statActive = document.getElementById("statActive");
    const $statTotal = document.getElementById("statTotal");
    const $statLast = document.getElementById("statLast");
    const $statSound = document.getElementById("statSound");
    const $btnSound = document.getElementById("btnSound");

    const $resultText = document.getElementById("resultText");
    const $resultBox = document.getElementById("resultBox");
    const $btnAgain = document.getElementById("btnAgain");
    const $btnDisableWinner = document.getElementById("btnDisableWinner");
    const $btnClearLast = document.getElementById("btnClearLast");

    const $winOverlay = document.getElementById("winOverlay");
    const $winCard = document.getElementById("winCard");
    const $btnCloseOverlay = document.getElementById("btnCloseOverlay");
    const $btnOverlayAgain = document.getElementById("btnOverlayAgain");
    const $btnOverlayOk = document.getElementById("btnOverlayOk");

    // ===== Audio
    let audioCtx = null;
    function ensureAudio(){
      if (!soundOn) return;
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === "suspended") audioCtx.resume();
    }
    function beep(freq=880, dur=0.03, type="sine", gain=0.02){
      if (!soundOn) return;
      try{
        ensureAudio();
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.type = type;
        o.frequency.value = freq;
        g.gain.value = gain;
        o.connect(g); g.connect(audioCtx.destination);
        o.start();
        setTimeout(() => { try{o.stop();}catch(e){} }, Math.max(10, dur*1000));
      }catch(e){}
    }
    function tickSound(){ beep(820, 0.02, "square", 0.012); }
    function winSound(){
      beep(784, 0.06, "sine", 0.03);
      setTimeout(()=>beep(988, 0.06, "sine", 0.03), 70);
      setTimeout(()=>beep(1175,0.08, "sine", 0.03), 140);
    }
    function setSoundUI(){
      $statSound.textContent = `🔊 Sonido: ${soundOn ? "ON" : "OFF"}`;
      $btnSound.textContent = soundOn ? "🔊" : "🔇";
      $btnSound.setAttribute("aria-pressed", soundOn ? "true" : "false");
    }

    // ===== Utils / Storage
    function uid(){ return Math.random().toString(16).slice(2) + Date.now().toString(16); }
    function normalize(s){ return (s || "").trim().replace(/\s+/g," "); }
    function escapeHtml(str){
      return String(str).replace(/[&<>"']/g, s => ({
        "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
      }[s]));
    }
    function saveItems(){ localStorage.setItem(LS_KEY, JSON.stringify(items)); }

    function loadItems(){
      const raw = localStorage.getItem(LS_KEY);
      if (!raw){
        // primera vez: used=false
        return DEFAULTS.map(d => ({ id: uid(), name: d.name, enabled: !!d.enabled, used: false }));
      }
      try{
        const parsed = JSON.parse(raw);
        // migración: si no existe used, lo ponemos false
        return parsed.map(it => ({
          id: it.id || uid(),
          name: it.name,
          enabled: !!it.enabled,
          used: !!it.used
        }));
      }catch(e){
        return DEFAULTS.map(d => ({ id: uid(), name: d.name, enabled: !!d.enabled, used: false }));
      }
    }

    // ===== Regla: solo participan ACTIVAS y NO USADAS
    function eligibleItems(){
      return items.filter(i => i.enabled && !i.used);
    }

    function updateStats(){
      const elig = eligibleItems().length;
      $statActive.textContent = `Activas: ${elig}`;
      $statTotal.textContent = `Total: ${items.length}`;
      $statLast.textContent = `Última: ${lastWinner ? lastWinner : "—"}`;

      const canSpin = elig >= 1;
      $btnSpin.disabled = isSpinning || !canSpin;

      $btnAgain.disabled = isSpinning || !canSpin;
      $btnDisableWinner.disabled = !lastPickedId || isSpinning;
      $btnClearLast.disabled = !lastWinner || isSpinning;

      // reactivate solo si hay usadas
      $btnReactivate.disabled = isSpinning || !items.some(i => i.used);
    }

    function render(){
      $list.innerHTML = "";
      items.forEach((it, idx) => {
        const isWinner = (lastPickedId && it.id === lastPickedId);
        const isMarked = !!it.used;

        const el = document.createElement("div");
        el.className =
          "item " +
          (it.enabled ? "enabled" : "disabled") +
          (idx === currentActiveIndex ? " active" : "") +
          (isWinner ? " winner" : "") +
          (isMarked ? " marked" : "");
        el.dataset.id = it.id;

        const metaText = it.used ? "Usada (no participa)" : (it.enabled ? "Activa" : "Inactiva");

        el.innerHTML = `
          <div class="left">
            <div class="check" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <div style="min-width:0">
              <div class="name" title="${escapeHtml(it.name)}">${escapeHtml(it.name)}</div>
              <div class="meta">${metaText}</div>
            </div>
          </div>
          <div class="mini">
            <button type="button" title="${it.enabled ? "Desactivar" : "Activar"}" data-action="toggle" aria-label="${it.enabled ? "Desactivar" : "Activar"}">✓</button>
            <button type="button" title="Eliminar" data-action="remove" aria-label="Eliminar">✕</button>
          </div>
        `;

        el.addEventListener("click", (ev) => {
          if (isSpinning) return;

          const btn = ev.target.closest("button");
          if (btn){
            const action = btn.dataset.action;
            if (action === "toggle") toggleItem(it.id);
            if (action === "remove") removeItem(it.id);
            ev.stopPropagation();
            return;
          }
          toggleItem(it.id);
        });

        $list.appendChild(el);
      });

      updateStats();
    }

    function addItem(name){
      const n = normalize(name);
      if (!n) return;

      const exists = items.some(i => normalize(i.name).toLowerCase() === n.toLowerCase());
      if (exists){
        flashResult("Esa opción ya existe 🙂");
        return;
      }

      items.unshift({ id: uid(), name: n, enabled: true, used: false });
      saveItems();
      render();
    }

    function removeItem(id){
      items = items.filter(i => i.id !== id);
      if (lastPickedId === id) lastPickedId = null;
      saveItems();
      render();
    }

    function toggleItem(id){
      items = items.map(i => i.id === id ? ({...i, enabled: !i.enabled}) : i);
      saveItems();
      render();
    }

    function resetDefaults(){
      items = DEFAULTS.map(d => ({ id: uid(), name: d.name, enabled: !!d.enabled, used: false }));
      lastWinner = "";
      lastPickedId = null;
      localStorage.removeItem(LS_LAST);
      saveItems();
      currentActiveIndex = -1;
      $resultText.textContent = "—";
      render();
    }

    function reactivateUsed(){
      items = items.map(i => ({...i, used: false}));
      saveItems();
      render();
      flashResult("Reactivadas todas las usadas ♻️");
    }

    function flashResult(text){
      $resultText.textContent = text;
      popResultBox();
    }

    function popResultBox(){
      $resultBox.classList.remove("pop");
      void $resultBox.offsetWidth;
      $resultBox.classList.add("pop");
    }

    // ===== Overlay
    function openOverlay(win){
      $winCard.innerHTML = `
        <div class="bigtext">👉 ${escapeHtml(win.name)}</div>
        <div class="small">Esta opción quedó como <b>usada</b> y ya no participa hasta reactivarla.</div>
      `;
      document.body.classList.add("modal-open");
      $winOverlay.hidden = false;

      const bg = $winOverlay.querySelector(".overlay-backdrop");
      if (bg) bg.onclick = () => closeOverlay();

      window.addEventListener("keydown", onEscClose);
    }

    function closeOverlay(){
      $winOverlay.hidden = true;
      document.body.classList.remove("modal-open");
      window.removeEventListener("keydown", onEscClose);
    }

    function onEscClose(e){
      if (e.key === "Escape") closeOverlay();
    }

    // ===== Presets
    function getPresetNames(key){
      return (PRESETS[key] || []).map(x => normalize(x)).filter(Boolean);
    }

    function presetLabel(key){
      const map = {
        general: "General (mixto)",
        piano_guitarra: "Piano / Guitarra",
        violin: "Violín",
        canto: "Canto",
        bateria: "Batería"
      };
      return map[key] || key;
    }

    function applyPresetReplace(key){
      const names = getPresetNames(key);
      if (!names.length){
        flashResult("Ese preset está vacío 😅");
        return;
      }
      items = names.map(n => ({ id: uid(), name: n, enabled: true, used: false }));
      lastPickedId = null;
      currentActiveIndex = -1;
      saveItems();
      render();
      flashResult(`Preset cargado: ${presetLabel(key)} ✅`);
    }

    function applyPresetAdd(key){
      const names = getPresetNames(key);
      if (!names.length){
        flashResult("Ese preset está vacío 😅");
        return;
      }
      const existing = new Set(items.map(i => normalize(i.name).toLowerCase()));
      const toAdd = names.filter(n => !existing.has(n.toLowerCase()));
      if (!toAdd.length){
        flashResult("Ya tenías todas esas opciones 🙂");
        return;
      }
      toAdd.reverse().forEach(n => items.unshift({ id: uid(), name: n, enabled: true, used: false }));
      saveItems();
      render();
      flashResult(`Agregadas ${toAdd.length} del preset: ${presetLabel(key)} ✅`);
    }

    // ===== Random (solo elegibles)
    function pickWinner(){
      const pool = eligibleItems();
      if (pool.length === 0) return null;
      return pool[Math.floor(Math.random() * pool.length)];
    }

    function spinToWinner(winnerId){
      const activeIdxs = items
        .map((it, idx) => (it.enabled && !it.used) ? idx : -1)
        .filter(idx => idx !== -1);

      if (activeIdxs.length === 0) return;

      const winnerIndex = items.findIndex(it => it.id === winnerId);
      if (winnerIndex === -1) return;
      if (!(items[winnerIndex].enabled && !items[winnerIndex].used)) return;

      isSpinning = true;
      updateStats();

      const minDelay = 35;
      const startDelay = 140;
      const stepsMin = 26;
      const stepsMax = 48;
      const extraSteps = randInt(stepsMin, stepsMax);

      let seqPos = Math.floor(Math.random() * activeIdxs.length);
      currentActiveIndex = activeIdxs[seqPos];
      render();

      const winnerPos = activeIdxs.indexOf(winnerIndex);
      const distToWinner = (winnerPos - seqPos + activeIdxs.length) % activeIdxs.length;
      const totalSteps = extraSteps + distToWinner;

      let step = 0;
      let delay = startDelay;

      function tick(){
        if (!isSpinning) return;

        seqPos = (seqPos + 1) % activeIdxs.length;
        currentActiveIndex = activeIdxs[seqPos];
        render();
        tickSound();

        step++;

        const t = step / totalSteps;
        const accelPhase = t < 0.55 ? (t / 0.55) : 1;
        const decelPhase = t > 0.55 ? ((t - 0.55) / 0.45) : 0;

        const dFast = lerp(startDelay, minDelay, accelPhase);
        const dSlow = lerp(minDelay, 220, decelPhase);
        delay = decelPhase > 0 ? dSlow : dFast;

        if (step >= totalSteps){
          finishSpin();
          return;
        }
        setTimeout(tick, delay);
      }

      function finishSpin(){
        isSpinning = false;

        // ganador
        const win = items[winnerIndex];
        lastPickedId = win.id;
        lastWinner = win.name;
        localStorage.setItem(LS_LAST, lastWinner);

        // marcar como usada + desactivar para que no vuelva a entrar
        items = items.map(i => i.id === win.id ? ({...i, used: true, enabled: false}) : i);
        saveItems();

        $resultText.textContent = `👉 ${win.name}`;
        popResultBox();
        winSound();

        render();
        updateStats();

        openOverlay(win);

        setTimeout(() => {
          const node = document.querySelector(`.item[data-id="${win.id}"]`);
          if (node && node.scrollIntoView){
            node.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 120);

        // si se acabaron, avisar
        if (eligibleItems().length === 0){
          setTimeout(() => {
            flashResult("Se acabaron las opciones activas 😅 Usa ♻️ Reactivar usadas o ↺ Predeterminadas.");
          }, 350);
        }
      }

      setTimeout(tick, delay);
    }

    function lerp(a,b,t){ return a + (b-a)*t; }
    function randInt(a,b){ return Math.floor(Math.random()*(b-a+1))+a; }

    // ===== Eventos
    $btnAdd.addEventListener("click", () => {
      addItem($newName.value);
      $newName.value = "";
      $newName.focus();
    });

    $newName.addEventListener("keydown", (e) => {
      if (e.key === "Enter"){
        addItem($newName.value);
        $newName.value = "";
      }
    });

    $btnReset.addEventListener("click", resetDefaults);

    $btnReactivate.addEventListener("click", () => {
      if (isSpinning) return;
      reactivateUsed();
    });

    $btnSound.addEventListener("click", () => {
      soundOn = !soundOn;
      localStorage.setItem(LS_SOUND, soundOn ? "1" : "0");
      setSoundUI();
      if (soundOn) ensureAudio();
      flashResult(soundOn ? "Sonido activado 🔊" : "Sonido apagado 🔇");
    });

    $btnLoadPreset.addEventListener("click", () => {
      if (isSpinning) return;
      applyPresetReplace($presetSelect.value);
    });

    $btnAddPreset.addEventListener("click", () => {
      if (isSpinning) return;
      applyPresetAdd($presetSelect.value);
    });

    $btnSpin.addEventListener("click", () => {
      if (isSpinning) return;

      const pool = eligibleItems();
      if (pool.length === 0){
        flashResult("No hay opciones activas (sin usar). Usa ♻️ Reactivar usadas o ↺ Predeterminadas.");
        return;
      }

      if (soundOn) ensureAudio();

      const winner = pickWinner();
      if (!winner){
        flashResult("No hay opciones activas 😅");
        return;
      }
      spinToWinner(winner.id);
    });

    $btnAgain.addEventListener("click", () => {
      if (isSpinning) return;
      $btnSpin.click();
    });

    // desactivar manual (sin marcar usada, solo apaga)
    $btnDisableWinner.addEventListener("click", () => {
      if (isSpinning) return;
      if (!lastPickedId) return;
      toggleItem(lastPickedId);
      lastPickedId = null;
      $resultText.textContent = "—";
      popResultBox();
      updateStats();
    });

    // “permitir repetir la última” (solo afecta lastWinner, no “used”)
    $btnClearLast.addEventListener("click", () => {
      if (isSpinning) return;
      lastWinner = "";
      localStorage.removeItem(LS_LAST);
      $statLast.textContent = "Última: —";
      flashResult("Listo: ahora puede repetir la última 🙂");
      updateStats();
    });

    // overlay
    $btnCloseOverlay.addEventListener("click", closeOverlay);
    $btnOverlayOk.addEventListener("click", closeOverlay);
    $btnOverlayAgain.addEventListener("click", () => {
      closeOverlay();
      $btnSpin.click();
    });

    // Inicial
    if (lastWinner){
      $resultText.textContent = `Última vez: ${lastWinner}`;
    }
    setSoundUI();
    render();
