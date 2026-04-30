// ══════════════════════════════════════════════════════════
// EnglishLab — app.js
// Carga content.json y renderiza las unidades dinámicamente.
//
// CÓMO EDITAR CONTENIDO:
//   → Cambia lecturas, vocab, ejercicios: edita content.json
//   → Cambia el diseño o lógica: edita index.html
//   → Agrega una unidad nueva: añade un objeto al array del nivel en content.json
// ══════════════════════════════════════════════════════════

// ── Variables globales de contenido ──
window.EL_CONTENT = null;   // Se llena al cargar content.json
window.EL_LOADED  = {};     // Qué niveles ya se renderizaron

// ── Colores por nivel ──
var LV_COLOR = { a1:'#1D9E75', a2:'#1a4fd4', b1:'#c07000', b2:'#7c3aed' };
var LV_DK    = { a1:'#0a5c42', a2:'#0c447c', b1:'#633806', b2:'#3C3489' };
var LV_BG    = { a1:'#e6f5f0', a2:'#e6eefb', b1:'#fff8ed', b2:'#f3e8ff' };
var LV_LABEL = { a1:'A1', a2:'A2', b1:'B1', b2:'B2' };

// ══════════════════════════════════════════════════════════
// 1. CARGAR content.json
// ══════════════════════════════════════════════════════════
function elLoadContent(callback) {
  if (window.EL_CONTENT) { callback(window.EL_CONTENT); return; }
  fetch('./content.json?v=' + Date.now())
    .then(function(r) { return r.json(); })
    .then(function(data) {
      window.EL_CONTENT = data;
      // Sincronizar QD (quiz data) y UNIT_NAMES_MAP desde el JSON
      if (data.unitNames) window.UNIT_NAMES_MAP = data.unitNames;
      callback(data);
    })
    .catch(function(err) {
      console.error('EnglishLab: No se pudo cargar content.json', err);
    });
}

// ══════════════════════════════════════════════════════════
// 2. PUNTO DE ENTRADA — reemplaza loadA1/loadA2/loadB1/loadB2
// ══════════════════════════════════════════════════════════
function elLoadLevel(lv) {
  if (window.EL_LOADED[lv]) return;
  window.EL_LOADED[lv] = true;

  elLoadContent(function(data) {
    var units = data[lv] && data[lv].units;
    if (!units) { console.warn('No units for level:', lv); return; }

    // Inyectar quiz data en QD global
    if (data[lv].quiz && window.QD) {
      window.QD[lv] = data[lv].quiz;
    }

    var el = document.getElementById(lv + '-content');
    if (!el) return;
    el.innerHTML = buildLevelHTML(lv, units);

    // Restaurar progreso en sidebar
    if (window.restoreSidebarProgress) restoreSidebarProgress(lv);

    // Activar primera unidad
    var p = document.getElementById(lv + 'p0');
    if (p) p.classList.add('active');
    var btns = document.querySelectorAll('#s-' + lv + ' .u-btn');
    if (btns[0]) btns[0].classList.add('active');

    // Desbloquear si tiene acceso
    if (window.checkAccess && checkAccess()) {
      btns.forEach(function(b) { b.classList.remove('locked'); });
      for (var i = 0; i < units.length; i++) {
        var nn = document.getElementById(lv + 'n' + i);
        if (nn && nn.textContent !== '✓') nn.textContent = i + 1;
      }
    }
  });
}

// ══════════════════════════════════════════════════════════
// 3. CONSTRUIR HTML DE UN NIVEL COMPLETO
// ══════════════════════════════════════════════════════════
function buildLevelHTML(lv, units) {
  var c  = LV_COLOR[lv] || '#1D9E75';
  var dk = LV_DK[lv]   || '#0a5c42';
  var bg = LV_BG[lv]   || '#e6f5f0';

  return units.map(function(u, idx) {
    var isLast   = idx === units.length - 1;
    var nextLbl  = isLast ? '' : 'Siguiente unidad';
    var nextBtn  = isLast ? '' :
      '<button class="btn-p" style="background:' + c + ';" onclick="su(\'' + lv + '\',' + u.nextIdx + ',document.querySelectorAll(\'#s-' + lv + ' .u-btn\')[' + u.nextIdx + '])">Siguiente →</button>';

    return (
      '<div class="unit-panel" id="' + lv + 'p' + idx + '">' +
        buildSidebarButtons(lv, u, idx, c, dk) +
        buildReadingPanel(lv, u, idx, c, dk, bg) +
        buildVocabPanel(lv, u, idx, c, dk, bg) +
        buildGrammarPanel(lv, u, idx, c, dk, bg) +
        buildEjerciciosPanel(lv, u, idx, c, dk, bg) +
        buildSpeakingPanel(lv, u, idx, c, dk, bg) +
        buildTestPanel(lv, u, idx, c, dk) +
        buildJuegoPanel(lv, u, idx, c, dk) +
        buildNextUnit(lv, u, idx, isLast, nextLbl, nextBtn, c, dk) +
      '</div>'
    );
  }).join('');
}

// ══════════════════════════════════════════════════════════
// 4. RENDERERS POR SECCIÓN
// ══════════════════════════════════════════════════════════

function buildSidebarButtons(lv, u, idx, c, dk) {
  // Los botones del sidebar ya están en el HTML estático del nivel
  // Esta función no necesita generar nada adicional
  return '';
}

function buildReadingPanel(lv, u, idx, c, dk, bg) {
  var r = u.reading || {};
  var vocabHTML = (r.vocab || []).map(function(pair) {
    return '<div class="vocab-item"><div class="vi-en">' + pair[0] + '</div><div class="vi-es">' + pair[1] + '</div></div>';
  }).join('');

  var extraVocab = (r.extra_vocab || []).map(function(pair) {
    return '<div class="ex-c"><div class="ex-en">' + pair[0] + '</div><div class="ex-es">' + pair[1] + '</div></div>';
  }).join('');

  return (
    '<div class="spanel active" id="' + lv + '-' + u.id + '-reading">' +
      '<div class="skill-header"><div class="skill-ico-big">👁️</div>' +
        '<div><div class="skill-h-title" style="color:' + dk + ';">Reading</div>' +
        '<div class="skill-h-sub">Lee. Las palabras en naranja son vocabulario clave.</div></div></div>' +
      // Tip box
      '<div style="background:linear-gradient(135deg,' + c + ',' + dk + ');border-radius:12px;padding:14px 18px;margin-bottom:16px;display:flex;gap:12px;align-items:flex-start;">' +
        '<span style="font-size:24px;flex-shrink:0;">💡</span>' +
        '<div><div style="font-size:11px;font-weight:700;color:rgba(255,255,255,.6);letter-spacing:.06em;margin-bottom:4px;">' + (u.grammar.tip_label || '').toUpperCase() + '</div>' +
        '<div style="font-size:13px;color:rgba(255,255,255,.9);line-height:1.6;">' + (u.grammar.tip_text || '') + '</div></div></div>' +
      // Reading card
      '<div class="read-card">' +
        '<div class="read-meta"><span class="read-tag" style="background:' + bg + ';color:' + c + ';">' + LV_LABEL[lv] + '</span>' +
          '<span class="read-tag" style="background:' + bg + ';color:' + dk + ';">' + u.title + '</span></div>' +
        '<div class="read-text">' + (r.text_en || '') + '</div>' +
        '<div class="read-trans">' + (r.text_es || '') + '</div>' +
        '<div class="vocab-box">' +
          '<div class="vocab-title" style="color:' + dk + ';">Vocabulario clave — toca para ver mas</div>' +
          '<div class="vocab-grid">' + vocabHTML + '</div>' +
          '<div id="' + lv + 'vex-' + u.id + '" style="display:none;background:' + dk + ';color:#fff;border-radius:10px;padding:12px 16px;margin-top:10px;font-size:13px;line-height:1.7;"></div>' +
        '</div>' +
      '</div>' +
      // Comprensión
      '<div class="comp-box">' +
        '<div class="comp-title" style="color:' + dk + ';">Comprension</div>' +
        '<div class="comp-q">1. De que trata el texto? Escribelo en ingles.</div>' +
        '<textarea class="comp-area" placeholder="The text is about..."></textarea>' +
        '<div class="comp-gap"></div>' +
        '<div class="comp-q">2. Usa una expresion en una oracion propia.</div>' +
        '<textarea class="comp-area" rows="2" placeholder="I would say..."></textarea>' +
      '</div>' +
    '</div>'
  );
}

function buildVocabPanel(lv, u, idx, c, dk, bg) {
  var r = u.reading || {};
  var flashCard = (r.vocab || []).slice(0, 6).map(function(pair, i) {
    return '<div class="fc" onclick="this.classList.toggle(\'flipped\')">' +
      '<div class="fc-front">' + pair[0] + '</div>' +
      '<div class="fc-back">' + pair[1] + '</div></div>';
  }).join('');

  var extraHTML = (r.extra_vocab || []).map(function(pair) {
    return '<div class="ex-c"><div class="ex-en">' + pair[0] + '</div><div class="ex-es">' + pair[1] + '</div></div>';
  }).join('');

  var chipsHTML = (u.chips || []).map(function(ch) {
    return '<button class="chip">' + ch + '</button>';
  }).join('');

  return (
    '<div class="spanel" id="' + lv + '-' + u.id + '-vocab">' +
      '<div class="skill-header"><div class="skill-ico-big">📚</div>' +
        '<div><div class="skill-h-title" style="color:' + dk + ';">Vocabulario</div>' +
        '<div class="skill-h-sub">Flashcards interactivas. Toca para voltear.</div></div></div>' +
      '<div class="gram-box" style="border-color:rgba(' + hexToRgb(c) + ',.2);">' +
        '<div class="gram-title" style="color:' + dk + ';">🃏 Flashcards</div>' + flashCard + '</div>' +
      (extraHTML ? '<div class="gram-box" style="border-color:rgba(' + hexToRgb(c) + ',.2);">' +
        '<div class="gram-title" style="color:' + dk + ';">📖 Vocabulario adicional</div>' +
        '<div class="ex-grid">' + extraHTML + '</div></div>' : '') +
      '<div style="background:' + bg + ';border-radius:11px;padding:14px 16px;">' +
        '<div class="chips-lbl" style="color:' + dk + ';">Frases clave</div>' +
        '<div class="chips-wrap">' + chipsHTML + '</div></div>' +
    '</div>'
  );
}

function buildGrammarPanel(lv, u, idx, c, dk, bg) {
  var g = u.grammar || {};
  var gramHTML = (g.table || []).map(function(row) {
    return '<tr><td>' + row[0] + '</td><td>' + row[1] + '</td><td>' + (row[2] || '') + '</td></tr>';
  }).join('');

  var dialogue = g.dialogue || {};
  var lHTML = (dialogue.lines || []).map(function(line) {
    var isA = line[0] === 'A';
    return '<div class="d-msg ' + (isA ? 'd-a' : 'd-b') + '">' +
      '<div class="d-bubble"><div class="d-en">' + line[1] + '</div>' +
      '<div class="d-es">' + line[2] + '</div></div></div>';
  }).join('');

  var chipsHTML = (u.chips || []).map(function(ch) {
    return '<button class="chip">' + ch + '</button>';
  }).join('');

  return (
    '<div class="spanel" id="' + lv + '-' + u.id + '-gram">' +
      '<div class="skill-header"><div class="skill-ico-big">📐</div>' +
        '<div><div class="skill-h-title" style="color:' + dk + ';">Gramatica</div>' +
        '<div class="skill-h-sub">Aprende las estructuras y practica.</div></div></div>' +
      '<div class="gram-box" style="border-color:rgba(' + hexToRgb(c) + ',.2);">' +
        '<div class="gram-title" style="color:' + dk + ';">📐 Estructuras clave</div>' +
        '<table class="g-table"><thead><tr><th>Ingles</th><th>Espanol</th><th>Nota</th></tr></thead>' +
        '<tbody>' + gramHTML + '</tbody></table></div>' +
      '<div class="gram-box" style="border-color:rgba(' + hexToRgb(c) + ',.2);">' +
        '<div class="gram-title" style="color:' + dk + ';">💬 Dialogo modelo</div>' +
        '<div class="dialogue">' +
          '<div class="d-header" style="border-bottom:1px solid rgba(' + hexToRgb(c) + ',.2);">' +
            '<div class="d-dot" style="background:' + c + ';"></div>' +
            '<span class="d-label" style="margin-left:9px;color:' + dk + ';">' + (dialogue.scene || u.speaking.scene || '') + '</span></div>' +
          '<div class="d-body">' + lHTML + '</div></div></div>' +
      '<div class="tip" style="border-left-color:' + c + ';background:' + bg + ';">' +
        '<div class="tip-lbl" style="color:' + dk + ';">' + (g.tip_label || '') + '</div>' +
        (g.tip_text || '') + '</div>' +
    '</div>'
  );
}

function buildEjerciciosPanel(lv, u, idx, c, dk, bg) {
  // Ejercicios se generan desde QD — solo crear el contenedor
  // (La lógica de fill/build/trans se mantiene igual que antes)
  var fillHTML  = buildFillExercise(lv, u, c, dk);
  var buildHTML = buildBuildExercise(lv, u, c, dk);
  var transHTML = buildTransExercise(lv, u, c, dk);

  return (
    '<div class="spanel" id="' + lv + '-' + u.id + '-ejercicios">' +
      '<div class="skill-header"><div class="skill-ico-big">✏️</div>' +
        '<div><div class="skill-h-title" style="color:' + dk + ';">Ejercicios</div>' +
        '<div class="skill-h-sub">Pon a prueba lo que aprendiste.</div></div></div>' +
      '<div class="gram-box" style="border-color:rgba(' + hexToRgb(c) + ',.15);">' +
        '<div class="gram-title" style="color:' + dk + ';">🎯 Ejercicio A — Elige la opcion correcta</div>' +
        fillHTML + '</div>' +
      '<div class="gram-box" style="border-color:rgba(' + hexToRgb(c) + ',.15);">' +
        '<div class="gram-title" style="color:' + dk + ';">✍️ Ejercicio B — Construye oraciones</div>' +
        '<div style="font-size:13px;color:var(--muted);margin-bottom:12px;">Escribe una oracion con cada frase.</div>' +
        buildHTML + '</div>' +
      '<div class="gram-box" style="border-color:rgba(' + hexToRgb(c) + ',.15);">' +
        '<div class="gram-title" style="color:' + dk + ';">🔄 Ejercicio C — Traduccion rapida</div>' +
        '<div style="font-size:13px;color:var(--muted);margin-bottom:12px;">Traduce al ingles sin mirar las notas.</div>' +
        transHTML + '</div>' +
    '</div>'
  );
}

function buildSpeakingPanel(lv, u, idx, c, dk, bg) {
  var sp = u.speaking || {};
  var chipsHTML = (sp.phrases || []).map(function(ch) {
    return '<button class="chip" onclick="elChipEcho(this,\'' + lv + '\',\'' + u.id + '\')">' + ch + '</button>';
  }).join('');

  return (
    '<div class="spanel" id="' + lv + '-' + u.id + '-speaking">' +
      '<div class="skill-header"><div class="skill-ico-big">🗣️</div>' +
        '<div><div class="skill-h-title" style="color:' + dk + ';">Speaking</div>' +
        '<div class="skill-h-sub">' + (sp.scene || '') + '</div></div></div>' +
      '<div class="gram-box" style="border-color:rgba(' + hexToRgb(c) + ',.15);">' +
        '<div class="gram-title" style="color:' + dk + ';">🎯 Tu turno</div>' +
        '<div style="background:rgba(' + hexToRgb(c) + ',.08);border-radius:10px;padding:16px;margin-bottom:12px;border-left:4px solid ' + c + ';">' +
          '<div style="font-size:12px;font-weight:700;color:' + c + ';margin-bottom:6px;letter-spacing:.06em;">PREGUNTA DE PRACTICA</div>' +
          '<div style="font-size:16px;font-weight:600;color:var(--ink);">' + (sp.prompt || '') + '</div></div>' +
        '<div class="your-turn" style="background:' + bg + ';border-color:rgba(' + hexToRgb(c) + ',.2);margin-bottom:14px;">🗣️ ' + (sp.response_hint || '') + '</div></div>' +
      '<div class="gram-box" style="border-color:rgba(' + hexToRgb(c) + ',.15);">' +
        '<div class="gram-title" style="color:' + dk + ';">💬 Frases de apoyo</div>' +
        '<div class="chips-wrap">' + chipsHTML + '</div>' +
        '<div id="' + lv + 'chip-echo-' + u.id + '" style="display:none;margin-top:12px;background:' + dk + ';color:#a7f3d0;border-radius:8px;padding:10px 14px;font-size:14px;font-weight:600;text-align:center;"></div>' +
      '</div>' +
      '<div class="gram-box" style="border-color:rgba(' + hexToRgb(c) + ',.15);">' +
        '<div class="gram-title" style="color:' + dk + ';">🎙️ Rondas de practica</div>' +
        '<div style="display:flex;flex-direction:column;gap:8px;">' +
          '<div style="background:var(--paper);border:1.5px solid ' + c + ';border-radius:9px;padding:12px 14px;"><div style="font-size:11px;font-weight:700;color:' + dk + ';margin-bottom:4px;">RONDA 1 — Lee el dialogo</div><div style="font-size:13px;color:var(--ink);">Lee el dialogo de Gramatica en voz alta. Ambos roles.</div></div>' +
          '<div style="background:var(--paper);border:1.5px solid #f59e0b;border-radius:9px;padding:12px 14px;"><div style="font-size:11px;font-weight:700;color:#b45309;margin-bottom:4px;">RONDA 2 — Improvisa</div><div style="font-size:13px;color:var(--ink);">Responde la pregunta con tus propias palabras.</div></div>' +
          '<div style="background:var(--paper);border:1.5px solid ' + c + ';border-radius:9px;padding:12px 14px;"><div style="font-size:11px;font-weight:700;color:' + c + ';margin-bottom:4px;">RONDA 3 — Sin mirar</div><div style="font-size:13px;color:var(--ink);">Cierra los ojos. Di 5 frases clave de memoria.</div></div>' +
        '</div></div>' +
    '</div>'
  );
}

function buildTestPanel(lv, u, idx, c, dk) {
  return '<div class="spanel" id="' + lv + '-' + u.id + '-test"><div class="quiz-wrap" id="' + lv + '-qw-' + u.id + '"></div></div>';
}

function buildJuegoPanel(lv, u, idx, c, dk) {
  return '<div class="spanel" id="' + lv + '-' + u.id + '-juego"><div class="gram-box" style="border-color:rgba(' + hexToRgb(c) + ',.2);"><div class="gram-title" style="color:' + dk + ';">🎮 Minijuego de Vocabulario</div><div id="vg-' + lv + '-' + u.id + '"></div></div></div>';
}

function buildNextUnit(lv, u, idx, isLast, nextLbl, nextBtn, c, dk) {
  var html = '';
  html += '<div class="next-unit" id="' + lv + '-nr' + idx + '" style="display:none;">' +
    '<div><div class="nu-lbl">' + nextLbl + '</div><div class="nu-name">' + u.next + '</div></div>' +
    nextBtn + '</div>';
  html += '<div id="' + lv + '-unit-cert-' + idx + '" style="display:none;margin-top:10px;background:linear-gradient(135deg,' + dk + ' 0%,' + c + ' 100%);border-radius:14px;padding:14px 18px;flex-direction:row;align-items:center;gap:14px;">' +
    '<div style="font-size:24px;">🎓</div>' +
    '<div style="flex:1;"><div style="font-family:Syne,sans-serif;font-weight:700;font-size:13px;color:#fff;">Certificado de Unidad Completada</div>' +
    '<div style="font-size:11px;color:rgba(255,255,255,.7);">Unidad ' + (idx+1) + ' · Nivel ' + lv.toUpperCase() + '</div></div>' +
    '<button onclick="downloadCertificate(\'' + lv + '\',\'' + u.title + '\',' + (idx+1) + ')" style="background:#fff;color:' + dk + ';border:none;padding:8px 14px;border-radius:8px;font-family:DM Sans,sans-serif;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;">🎓 Ver Certificado</button></div>';
  if (isLast) {
    html += '<div id="' + lv + '-pdf-banner" style="display:none;margin-top:18px;background:linear-gradient(135deg,' + dk + ' 0%,' + c + ' 100%);border:1.5px solid rgba(' + hexToRgb(c) + ',.25);border-radius:14px;padding:18px 22px;flex-direction:row;align-items:center;gap:16px;">' +
      '<div style="font-size:28px;">📄</div>' +
      '<div style="flex:1;"><div style="font-family:Syne,sans-serif;font-weight:700;font-size:14px;color:#fff;">Nivel ' + lv.toUpperCase() + ' Completado</div></div>' +
      '<button onclick="downloadPDF(\'' + lv + '\')" style="background:#fff;color:' + dk + ';border:none;padding:10px 18px;border-radius:9px;font-family:DM Sans,sans-serif;font-size:13px;cursor:pointer;">Descargar PDF</button></div>';
  }
  return html;
}

// ══════════════════════════════════════════════════════════
// 5. EJERCICIOS — generados desde chips/vocab
// ══════════════════════════════════════════════════════════
function buildFillExercise(lv, u, c, dk) {
  var chips = u.chips || [];
  if (!chips.length) return '<div style="color:var(--muted);font-size:13px;">Ejercicio no disponible.</div>';
  return chips.slice(0, 4).map(function(phrase, i) {
    var words = phrase.split(' ');
    var blank = words[Math.floor(words.length / 2)];
    var display = phrase.replace(blank, '___');
    return '<div class="nms-ex-item" style="margin-bottom:12px;">' +
      '<div style="font-size:14px;color:var(--ink);margin-bottom:6px;">' + display + '</div>' +
      '<input class="nms-ans" placeholder="Escribe: ' + blank + '" style="width:100%;padding:9px 12px;border-radius:8px;border:1.5px solid var(--border);font-family:DM Sans,sans-serif;font-size:14px;outline:none;" ' +
      'onblur="elCheckFill(this,\'' + blank + '\')" />' +
      '<div class="nms-ans-feedback"></div></div>';
  }).join('');
}

function buildBuildExercise(lv, u, c, dk) {
  var chips = u.chips || [];
  return chips.slice(0, 3).map(function(phrase) {
    return '<div class="build-item" style="margin-bottom:10px;">' +
      '<div style="font-size:12px;color:var(--muted);margin-bottom:4px;">Usa: <strong>' + phrase + '</strong></div>' +
      '<input class="build-inp" placeholder="Escribe una oracion..." style="width:100%;padding:9px 12px;border-radius:8px;border:1.5px solid var(--border);font-family:DM Sans,sans-serif;font-size:14px;outline:none;" /></div>';
  }).join('');
}

function buildTransExercise(lv, u, c, dk) {
  var extra = (u.reading && u.reading.extra_vocab) || [];
  return extra.slice(0, 4).map(function(pair) {
    return '<div class="trans-item" style="margin-bottom:10px;">' +
      '<div style="font-size:14px;font-weight:500;color:var(--ink);margin-bottom:4px;">' + pair[1] + '</div>' +
      '<input class="trans-inp" placeholder="In English..." style="width:100%;padding:9px 12px;border-radius:8px;border:1.5px solid var(--border);font-family:DM Sans,sans-serif;font-size:14px;outline:none;"' +
      ' onblur="elCheckTrans(this,\'' + pair[0].replace(/'/g, "\\'") + '\')" /></div>';
  }).join('');
}

// ══════════════════════════════════════════════════════════
// 6. HELPERS
// ══════════════════════════════════════════════════════════
function hexToRgb(hex) {
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '0,0,0';
  return parseInt(result[1],16) + ',' + parseInt(result[2],16) + ',' + parseInt(result[3],16);
}

function elChipEcho(btn, lv, unit) {
  var echo = document.getElementById(lv + 'chip-echo-' + unit);
  if (!echo) return;
  echo.style.display = 'block';
  echo.textContent = '🔊 ' + btn.textContent;
  setTimeout(function() { echo.style.display = 'none'; }, 2500);
}

function elCheckFill(input, correct) {
  var fb = input.nextElementSibling;
  if (!fb) return;
  var val = input.value.trim().toLowerCase();
  var ok = val === correct.toLowerCase();
  fb.textContent = ok ? '✓ Correcto!' : '✗ La respuesta es: ' + correct;
  fb.className = 'nms-ans-feedback ' + (ok ? 'nms-ok' : 'nms-ng');
}

function elCheckTrans(input, correct) {
  var val = input.value.trim().toLowerCase();
  var ok = val === correct.toLowerCase();
  input.style.borderColor = ok ? '#1D9E75' : '#e74c3c';
}

// ══════════════════════════════════════════════════════════
// 7. REEMPLAZAR loadA1/loadA2/loadB1/loadB2
//    (Se conectan al flujo existente del index.html)
// ══════════════════════════════════════════════════════════
window.loadA1 = function() {
  if (window.EL_CONTENT) {
    window.a1loaded = true;
    elLoadLevel('a1');
  } else {
    elLoadContent(function() { window.a1loaded = true; elLoadLevel('a1'); });
  }
};
window.loadA2 = function() {
  elLoadContent(function() { window.a2loaded = true; elLoadLevel('a2'); });
};
window.loadB1 = function() {
  elLoadContent(function() { window.b1loaded = true; elLoadLevel('b1'); });
};
window.loadB2 = function() {
  elLoadContent(function() { window.b2loaded = true; elLoadLevel('b2'); });
};

// ══════════════════════════════════════════════════════════
// 8. PRELOAD al inicio (opcional, mejora velocidad)
// ══════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', function() {
  elLoadContent(function(data) {
    // Content loaded — levels will render when user navigates to them
    console.log('EnglishLab content loaded ✓', Object.keys(data));
  });
});
