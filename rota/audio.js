// Rota Digital — Modo Áudio.
// O jogo inteiro pelo teclado, com voz em português do Brasil e sons:
//   setas = escolher (na Programação, põem blocos de seta)
//   Enter = confirmar   Esc = voltar   Espaço = ouvir de novo   H = ajuda
// O que o jogo fala também vai para uma região "aria-live", para o NVDA e o
// Narrador lerem. Quem usa leitor de tela pode desligar a voz própria do jogo.
// As funções de progresso vêm de rota/jogo.js (parâmetro api).
function criarModoAudio(api) {
  'use strict';
  const $ = (sel) => document.querySelector(sel);
  const estado = api.estado;
  const acess = api.acess;

  const ANO_FALADO = { 1: 'primeiro ano', 2: 'segundo ano', 3: 'terceiro ano' };
  const NUMERO = ['zero', 'uma', 'duas', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez'];
  const LUGAR_FALADO = {
    escola: 'a escola', padaria: 'a padaria', praca: 'a praça', biblioteca: 'a biblioteca',
    mercado: 'o mercado', casa: 'a casa da vovó', parque: 'o parque', hospital: 'o posto de saúde',
    museu: 'o museu', zoologico: 'o zoológico',
  };
  const NOME_BLOCO = { direita: 'direita', esquerda: 'esquerda', cima: 'para cima', baixo: 'para baixo' };
  const NOMES_LETRAS = {
    A: 'á', B: 'bê', C: 'cê', D: 'dê', E: 'é', F: 'éfe', G: 'gê', H: 'agá', I: 'i', J: 'jota',
    K: 'cá', L: 'éle', M: 'ême', N: 'êne', O: 'ó', P: 'pê', Q: 'quê', R: 'érre', S: 'ésse',
    T: 'tê', U: 'u', V: 'vê', W: 'dáblio', X: 'xis', Y: 'ípsilon', Z: 'zê',
    Ç: 'cê cedilha', Ã: 'á com til', Õ: 'ó com til', Á: 'á com acento', É: 'é com acento',
    Í: 'i com acento', Ó: 'ó com acento', Ú: 'u com acento', Â: 'á com chapéu', Ê: 'ê com chapéu', Ô: 'ô com chapéu',
  };
  const AJUDA_GERAL = 'Ajuda. Setas para cima e para baixo: escolher. Enter: confirmar. Esc: voltar. ' +
    'Barra de espaço: ouvir de novo. P: pausa. H: esta ajuda.';

  let ativo = false;
  let iniciado = false;
  let vista = null;
  let ultimaFala = '';

  // =================================================================
  // Voz
  // =================================================================
  let voz = null;
  function escolherVoz() {
    const vozes = window.speechSynthesis ? speechSynthesis.getVoices() : [];
    voz = vozes.find((v) => /pt[-_]BR/i.test(v.lang)) || vozes.find((v) => /^pt/i.test(v.lang)) || null;
  }
  if (window.speechSynthesis) {
    escolherVoz();
    speechSynthesis.addEventListener('voiceschanged', escolherVoz);
  }
  // Tira os emojis: a voz não deve ler "carro vermelho" no meio da frase.
  function limpar(texto) {
    return String(texto).replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu, '').replace(/\s+/g, ' ').trim();
  }
  function esperarMs(ms) {
    return new Promise((resolver) => {
      let resta = ms;
      let ultimo = Date.now();
      const relogio = setInterval(() => {
        const agora = Date.now();
        if (!estado.pausado) resta -= agora - ultimo;
        ultimo = agora;
        if (resta <= 0) { clearInterval(relogio); resolver(); }
      }, 50);
    });
  }
  // Fala o texto. A promessa termina quando a fala acaba (mais ou menos, sem voz própria).
  function falar(texto) {
    const t = limpar(texto);
    ultimaFala = t;
    const regiao = $('#fala');
    regiao.textContent = '';
    setTimeout(() => { regiao.textContent = t; }, 60);
    if (!acess.vozPropria || !window.speechSynthesis) return esperarMs(Math.min(7000, 500 + t.length * 60));
    speechSynthesis.cancel();
    return new Promise((resolver) => {
      const u = new SpeechSynthesisUtterance(t);
      u.lang = 'pt-BR';
      if (voz) u.voice = voz;
      u.rate = acess.calmo ? .88 : .95;
      let feito = false;
      const fim = () => { if (!feito) { feito = true; resolver(); } };
      u.onend = fim;
      u.onerror = fim;
      setTimeout(fim, 2000 + t.length * 95); // segurança, se o navegador não avisar o fim
      speechSynthesis.speak(u);
    });
  }
  function comPonto(t) { return /[.!?]$/.test(t) ? t : t + '.'; }
  function maiuscula(t) { return t.charAt(0).toUpperCase() + t.slice(1); }
  function plural(n, um, varios) { return n === 1 ? 'uma ' + um : (NUMERO[n] || n) + ' ' + varios; }
  function estrelasFala(n) { return n === 1 ? 'uma estrela' : (NUMERO[n] === 'duas' ? 'duas' : 'três') + ' estrelas'; }

  // =================================================================
  // Sons (direita e esquerda pelo estéreo; para cima mais agudo, para baixo mais grave)
  // =================================================================
  let ctx = null;
  function contexto() {
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
    } catch (e) { ctx = null; }
    return ctx;
  }
  function nota(freq, inicio, dur, opc) {
    const c = contexto();
    if (!c) return;
    const o = Object.assign({ tipo: 'sine', vol: .25, pan: 0, ate: null }, opc || {});
    const t0 = c.currentTime + inicio;
    const osc = c.createOscillator();
    osc.type = acess.calmo ? 'sine' : o.tipo;
    osc.frequency.setValueAtTime(freq, t0);
    if (o.ate) osc.frequency.exponentialRampToValueAtTime(o.ate, t0 + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(.0001, t0);
    g.gain.linearRampToValueAtTime(o.vol * (acess.calmo ? .5 : 1), t0 + .02);
    g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    let saida = osc.connect(g);
    if (c.createStereoPanner) {
      const p = c.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, o.pan));
      saida = saida.connect(p);
    }
    saida.connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + .05);
  }
  function panDe(x, colunas) { return colunas > 1 ? (x / (colunas - 1)) * 1.6 - .8 : 0; }
  function tomDe(y, linhas) { return 300 * Math.pow(2, (linhas > 1 ? (linhas - 1 - y) / (linhas - 1) : .5) * 1.2); }
  const SONS = {
    passo: (x, y, m) => nota(tomDe(y, m.linhas), 0, .22, { tipo: 'triangle', vol: .3, pan: panDe(x, m.colunas) }),
    bloco: (dir) => {
      const d = DIRECOES[dir];
      nota(d.dy < 0 ? 620 : d.dy > 0 ? 300 : 440, 0, .12, { tipo: 'triangle', vol: .2, pan: d.dx * .8 });
    },
    batida: (pan) => {
      nota(160, 0, .4, { tipo: 'square', vol: .22, pan: pan, ate: 55 });
      nota(110, .05, .35, { tipo: 'sawtooth', vol: .12, pan: pan, ate: 50 });
    },
    chegada: () => [523, 659, 784, 1047].forEach((f, i) => nota(f, i * .14, .3, { tipo: 'triangle', vol: .25 })),
    vermelho: () => { nota(330, 0, .28, { vol: .3 }); nota(262, .32, .4, { vol: .3 }); },
    verde: () => { nota(523, 0, .16, { vol: .3 }); nota(784, .16, .35, { vol: .3 }); },
    certo: () => { nota(523, 0, .15, { tipo: 'triangle' }); nota(784, .15, .3, { tipo: 'triangle' }); },
    errado: () => { nota(392, 0, .2); nota(330, .22, .3); },
    menu: () => nota(660, 0, .05, { vol: .1 }),
    dirigir: () => nota(180, 0, .7, { tipo: 'sawtooth', vol: .1, ate: 340 }),
    festa: () => [523, 587, 659, 784, 659, 784, 1047].forEach((f, i) => nota(f, i * .16, .3, { tipo: 'triangle', vol: .25 })),
  };

  // =================================================================
  // Vistas: título, texto e lista de opções (escolhidas com as setas)
  // =================================================================
  function mostrar(v, prefixo) {
    vista = v;
    vista.sel = vista.sel || 0;
    desenhar();
    if (iniciado) falar((prefixo || '') + falaDaVista());
  }
  function falaDaVista() {
    let t = (vista.titulo ? vista.titulo + '. ' : '') + (vista.texto || '');
    if (vista.opcoes && vista.opcoes.length && !vista.semLerOpcao) {
      t += ' Use as setas para escolher e aperte Enter. ' + comPonto(vista.opcoes[vista.sel].rotulo);
    }
    return t;
  }
  function desenhar() {
    $('#audio-titulo').textContent = vista.titulo || '';
    $('#audio-texto').textContent = vista.texto || '';
    const lista = $('#audio-opcoes');
    lista.innerHTML = '';
    (vista.opcoes || []).forEach((o, i) => {
      const li = document.createElement('li');
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', String(i === vista.sel));
      li.className = (i === vista.sel ? 'escolhida' : '') + (o.tentada ? ' tentada' : '');
      li.textContent = o.rotulo;
      li.addEventListener('click', () => { vista.sel = i; desenhar(); confirmar(); });
      lista.appendChild(li);
    });
    $('#audio-extra').innerHTML = vista.extra ? vista.extra() : '';
  }
  function moverSelecao(d) {
    const n = (vista.opcoes || []).length;
    if (!n) return;
    vista.sel = (vista.sel + d + n) % n;
    SONS.menu();
    desenhar();
    falar(comPonto(vista.opcoes[vista.sel].rotulo));
  }
  function confirmar() {
    const o = vista.opcoes && vista.opcoes[vista.sel];
    if (o) o.acao();
  }

  function tecla(e) {
    if (!ativo) return;
    if (!iniciado) { e.preventDefault(); comecar(); return; }
    if (vista.tecla && vista.tecla(e)) { e.preventDefault(); return; }
    const k = e.key;
    const letra = k.length === 1 ? k.toLowerCase() : '';
    if (k === 'ArrowDown' || k === 'ArrowRight') moverSelecao(1);
    else if (k === 'ArrowUp' || k === 'ArrowLeft') moverSelecao(-1);
    else if (k === 'Enter') confirmar();
    else if (k === 'Escape') { if (vista.voltar) vista.voltar(); else falar('Você já está no começo do jogo.'); }
    else if (k === ' ') falar(ultimaFala || falaDaVista());
    else if (letra === 'h') falar(vista.ajuda || AJUDA_GERAL);
    else if (letra === 'p') { api.pausar(); falar('Pausa. Quando quiser voltar, aperte Enter.'); }
    else if (/^[1-9]$/.test(k) && vista.numeros) {
      const i = Number(k) - 1;
      if (i < vista.opcoes.length) { vista.sel = i; desenhar(); confirmar(); }
    } else return;
    e.preventDefault();
  }

  // =================================================================
  // Início, nome, ano e acessibilidade
  // =================================================================
  function vistaInicio(prefixo) {
    if (!estado.ano) api.escolherAno(1);
    mostrar({
      titulo: 'Rota Digital',
      texto: 'Bem-vindo à Rota Digital! Você vai dirigir um carrinho pela Cidade Digital.' + (estado.nome ? ' Olá, ' + estado.nome + '!' : ''),
      opcoes: [
        { rotulo: 'Começar o jogo', acao: () => vistaCidade() },
        { rotulo: estado.nome ? 'Trocar o nome. Agora o nome é ' + estado.nome : 'Escrever o meu nome', acao: vistaNome },
        { rotulo: 'Trocar o ano. Agora é o ' + ANO_FALADO[estado.ano], acao: vistaAno },
        { rotulo: 'Acessibilidade', acao: () => vistaAcess() },
      ],
    }, prefixo);
  }

  function vistaNome() {
    let nome = estado.nome || '';
    mostrar({
      titulo: 'Seu nome',
      texto: 'Digite o seu nome. Eu falo cada letra. Para apagar, aperte Backspace. Quando terminar, aperte Enter. Para pular, aperte Esc.',
      opcoes: [],
      extra: () => '<p class="audio-nome" aria-hidden="true">' + (nome ? nome.replace(/[<>&]/g, '') : '&nbsp;') + '</p>',
      tecla: (e) => {
        const k = e.key;
        if (k === 'Tab') return false;
        if (k === 'Enter') {
          estado.nome = nome.trim();
          $('#campo-nome').value = estado.nome;
          vistaInicio(estado.nome ? 'Muito bem! Seu nome é ' + estado.nome + '. ' : 'Tudo bem, ficou sem nome. ');
        } else if (k === 'Escape') {
          vistaInicio('Tudo bem, vamos pular o nome. ');
        } else if (k === 'Backspace') {
          if (!nome) falar('Não tem letras para apagar.');
          else {
            const c = nome.slice(-1);
            nome = nome.slice(0, -1);
            falar('Apaguei ' + falarLetra(c) + '.');
          }
        } else if (k.length === 1 && /[\p{L} ]/u.test(k) && nome.length < 40) {
          nome += k;
          falar(falarLetra(k));
        }
        desenhar();
        return true;
      },
    });
  }
  function falarLetra(c) {
    if (c === ' ') return 'espaço';
    return NOMES_LETRAS[c.toUpperCase()] || c;
  }

  function vistaAno() {
    mostrar({
      titulo: 'Escolha o ano',
      texto: '',
      sel: estado.ano - 1,
      opcoes: [1, 2, 3].map((n) => ({
        rotulo: maiuscula(ANO_FALADO[n]),
        acao: () => { api.escolherAno(n); vistaInicio('Pronto! Agora é o ' + ANO_FALADO[n] + '. '); },
      })),
      voltar: () => vistaInicio(),
    });
  }

  function vistaAcess(sel, prefixo) {
    mostrar({
      titulo: 'Acessibilidade',
      texto: 'Enter liga ou desliga cada opção.',
      sel: sel || 0,
      opcoes: api.OPCOES_ACESS.map((o, i) => ({
        rotulo: o.titulo + ': ' + (acess[o.id] ? 'ligado' : 'desligado') + '. ' + o.desc,
        acao: () => {
          api.trocarAcess(o.id);
          if (ativo) vistaAcess(i, o.titulo + ': ' + (acess[o.id] ? 'ligado' : 'desligado') + '. ');
        },
      })).concat([{ rotulo: 'Voltar ao início', acao: () => vistaInicio() }]),
      semLerOpcao: !!prefixo,
      voltar: () => vistaInicio(),
    }, prefixo);
  }

  // =================================================================
  // Cidade (no lugar do mapa) e bairros
  // =================================================================
  function quantosSelos() { return api.ORDEM_BAIRROS.filter(api.temSelo).length; }
  function situacaoBairro(b) {
    const total = api.totalMissoes(b);
    let feitas = 0;
    for (let i = 0; i < total; i++) if (api.estrelasDe(b, i)) feitas++;
    if (api.temSelo(b)) return 'Concluído. Você tem o selo.';
    if (!feitas) return 'Ainda não começou. Tem ' + plural(total, 'missão', 'missões') + '.';
    return 'Você fez ' + feitas + ' de ' + total + ' missões.';
  }
  function vistaCidade(prefixo) {
    estado.bairro = null;
    const selos = quantosSelos();
    const opcoes = api.ORDEM_BAIRROS.map((b) => ({
      rotulo: api.BAIRROS[b].nome + '. ' + situacaoBairro(b),
      acao: () => { SONS.dirigir(); vistaBairro(b, 'O carro chegou ao ' + api.BAIRROS[b].nome + '. '); },
    }));
    opcoes.push({
      rotulo: api.todosSelos() ? 'Praça Digital. Está aberta! Vamos comemorar.' : 'Praça Digital. Está fechada. Ela abre quando você tiver os 3 selos.',
      acao: vistaPraca,
    });
    opcoes.push({ rotulo: 'Voltar ao início', acao: () => vistaInicio() });
    mostrar({
      titulo: 'Cidade Digital',
      texto: 'Você está na Cidade Digital. ' +
        (selos === 0 ? 'Você ainda não tem selos.' : selos === 1 ? 'Você tem um selo.' : 'Você tem ' + NUMERO[selos] + ' selos.') +
        ' Escolha um bairro.',
      opcoes: opcoes,
      voltar: () => vistaInicio(),
    }, prefixo);
  }

  const TEXTO_BAIRRO = {
    prog: 'Aqui você monta o caminho do carro com as setas do teclado.',
    tic: 'Aqui você ajuda a Loja de Tecnologia com aparelhos, ícones e mídias.',
    cid: 'Aqui você ouve placas sobre a internet e escolhe o que fazer.',
  };
  function vistaBairro(b, prefixo) {
    estado.bairro = b;
    const total = api.totalMissoes(b);
    const opcoes = [];
    let sel = -1;
    for (let i = 0; i < total; i++) {
      const est = api.estrelasDe(b, i);
      const aberta = api.liberada(b, i);
      if (sel < 0 && aberta && !est) sel = i;
      opcoes.push({
        rotulo: 'Missão ' + (i + 1) + '. ' + (est ? 'Feita, com ' + estrelasFala(est) + '.' : aberta ? 'Nova.' : 'Fechada.'),
        acao: aberta ? () => abrirMissao(b, i) : () => falar('Essa missão está fechada. Primeiro faça a missão ' + i + '.'),
      });
    }
    opcoes.push({ rotulo: 'Voltar para a cidade', acao: () => vistaCidade() });
    mostrar({
      titulo: api.BAIRROS[b].nome,
      texto: TEXTO_BAIRRO[b] + ' Escolha uma missão.',
      sel: Math.max(0, sel),
      opcoes: opcoes,
      voltar: () => vistaCidade(),
    }, prefixo);
  }
  function abrirMissao(b, i) {
    estado.bairro = b;
    estado.missao = i;
    if (b === 'prog') missaoProg(i); else missaoPerguntas(b, i);
  }

  function noticias(r) {
    let t = '';
    if (r.novoSelo) t += ' Você ganhou o selo do ' + api.BAIRROS[estado.bairro].nome + '!';
    if (r.praca) t += ' Agora você tem os 3 selos. A Praça Digital está aberta!';
    return t;
  }
  function vistaResultado(b, i, fala, r) {
    const opcoes = [];
    if (r.praca) opcoes.push({ rotulo: 'Ir para a Praça Digital', acao: vistaPraca });
    if (i + 1 < api.totalMissoes(b)) opcoes.push({ rotulo: 'Próxima missão', acao: () => abrirMissao(b, i + 1) });
    opcoes.push({ rotulo: 'Jogar de novo esta missão', acao: () => abrirMissao(b, i) });
    opcoes.push({ rotulo: 'Voltar para o bairro', acao: () => vistaBairro(b) });
    mostrar({ titulo: 'Missão terminada', texto: fala, opcoes: opcoes, voltar: () => vistaBairro(b) });
  }

  // =================================================================
  // Bairro da Programação
  // =================================================================
  let A = null;
  let execucao = 0;

  function missaoProg(i) {
    const fase = FASES_AUDIO[estado.ano][i];
    const regras = REGRAS_PROGRAMACAO[estado.ano];
    const mapa = lerMapa(fase);
    const ideal = blocosIdeais(mapa, regras);
    A = {
      i: i, fase: fase, mapa: mapa, regras: regras, ideal: ideal,
      limite: regras.limite ? ideal + 2 : null,
      lugar: LUGAR_FALADO[fase.destino] || 'o destino',
      programa: [], falhas: 0, x: mapa.inicio.x, y: mapa.inicio.y, t: 0,
      conferiu: false, executando: false, erroEm: -1,
    };
    mostrar({
      titulo: 'Programação, missão ' + (i + 1),
      texto: 'Leve o carro até ' + A.lugar + '. ' + descreverMapa() + ' ' + instrucoesProg(),
      opcoes: [],
      tecla: teclaProg,
      voltar: () => { execucao++; vistaBairro('prog'); },
      ajuda: ajudaProg(),
      extra: desenhoProg,
    });
  }
  function instrucoesProg() {
    let t = 'Use as setas para montar o caminho. Cada seta anda uma casa. Depois aperte Enter para o carro andar.';
    if (A.regras.repetir) t += ' A tecla R repete a próxima seta.';
    if (A.regras.espere) t += ' A tecla E confere a cor do semáforo.';
    if (A.limite) t += ' Você pode usar até ' + A.limite + ' blocos.';
    return t + ' Para ouvir de novo, aperte a barra de espaço.';
  }
  function ajudaProg() {
    let t = 'Ajuda da programação. Setas: põem um bloco de seta. Cada seta anda uma casa. Enter: o carro anda. ' +
      'Backspace: apaga o último bloco. L: diz onde o carro está e o que tem em volta. O: lê o seu programa. ';
    if (A.regras.repetir) t += 'R: repetir a próxima seta. Aperte R de novo para mudar o número. ';
    if (A.regras.espere) t += 'E: conferir o semáforo. Se estiver vermelho, o carro espera. ';
    return t + 'Esc: volta para as missões. Barra de espaço: ouvir de novo.';
  }
  function relativo(dx, dy) {
    const dist = Math.abs(dx) + Math.abs(dy);
    if (dist === 0) return 'no mesmo lugar do carro';
    if (dist === 1) return 'logo ' + (dx > 0 ? 'à direita' : dx < 0 ? 'à esquerda' : dy < 0 ? 'acima' : 'abaixo') + ' do carro';
    const partes = [];
    if (dx) partes.push(plural(Math.abs(dx), 'casa', 'casas') + (dx > 0 ? ' à direita' : ' à esquerda'));
    if (dy) partes.push(plural(Math.abs(dy), 'casa', 'casas') + (dy < 0 ? ' acima' : ' abaixo'));
    return partes.join(' e ') + ' do carro';
  }
  function lugarNaCidade(x, y) {
    const m = A.mapa;
    const meioV = m.linhas === 3 ? 'no meio' : (y === 1 ? 'no meio, mais para cima' : 'no meio, mais para baixo');
    const meioH = m.colunas === 3 ? 'no meio' : (x === 1 ? 'no meio, mais para a esquerda' : 'no meio, mais para a direita');
    const cima = y === 0;
    const baixo = y === m.linhas - 1;
    const esq = x === 0;
    const dir = x === m.colunas - 1;
    const h = esq ? 'à esquerda' : dir ? 'à direita' : meioH;
    if ((cima || baixo) && (esq || dir)) return 'no canto de ' + (cima ? 'cima' : 'baixo') + ', ' + h;
    const v = cima ? 'em cima' : baixo ? 'embaixo' : meioV;
    if (v === 'no meio' && h === 'no meio') return 'bem no meio da cidade';
    return v + ', ' + h;
  }
  function destinoRelativo(x, y) {
    return maiuscula(A.lugar) + ' está ' + relativo(A.mapa.destino.x - x, A.mapa.destino.y - y) + '.';
  }
  function descreverMapa() {
    const m = A.mapa;
    let t = 'A cidade tem ' + NUMERO[m.colunas] + ' casas de largura e ' + NUMERO[m.linhas] + ' de altura. ' +
      'O carro está ' + lugarNaCidade(m.inicio.x, m.inicio.y) + '. ' + destinoRelativo(m.inicio.x, m.inicio.y);
    let predios = false;
    m.casas.forEach((linha, y) => linha.forEach((c, x) => {
      const rel = relativo(x - m.inicio.x, y - m.inicio.y);
      if (c === 'K') t += ' Há um cone ' + rel + '.';
      if (c === 'O') t += ' Há uma obra ' + rel + '.';
      if (c === 'S') t += ' Há um semáforo ' + rel + '.';
      if (c === 'X') predios = true;
    }));
    if (predios) t += ' Os prédios deixam só um caminho de rua. A tecla L diz o que tem em volta do carro.';
    return t;
  }
  function oQueTem(x, y) {
    const m = A.mapa;
    if (x < 0 || y < 0 || x >= m.colunas || y >= m.linhas) return 'fim da cidade';
    if (x === m.destino.x && y === m.destino.y) return A.lugar;
    return { O: 'uma obra', K: 'um cone', X: 'um prédio', S: 'um semáforo', '.': 'rua livre' }[m.casas[y][x]];
  }
  function onde() {
    const x = A.x;
    const y = A.y;
    falar('O carro está ' + lugarNaCidade(x, y) + '. ' +
      'À direita: ' + oQueTem(x + 1, y) + '. À esquerda: ' + oQueTem(x - 1, y) + '. ' +
      'Acima: ' + oQueTem(x, y - 1) + '. Abaixo: ' + oQueTem(x, y + 1) + '. ' +
      (x === A.mapa.destino.x && y === A.mapa.destino.y ? '' : destinoRelativo(x, y)));
  }
  function nomeBloco(b) {
    if (b.tipo === 'seta') return NOME_BLOCO[b.dir];
    if (b.tipo === 'repetir') return 'repetir ' + b.vezes + ' vezes';
    return 'conferir o semáforo';
  }
  function contagem() { const n = A.programa.length; return n === 1 ? 'Um bloco.' : n + ' blocos.'; }
  function lerPrograma() {
    if (!A.programa.length) { falar('O programa está vazio. Use as setas para pôr blocos.'); return; }
    falar('Seu programa tem ' + A.programa.length + (A.programa.length === 1 ? ' bloco: ' : ' blocos: ') + A.programa.map(nomeBloco).join(', ') + '.');
  }
  function cabeMais() {
    if (A.limite && A.programa.length >= A.limite) {
      SONS.errado();
      falar('Já são ' + A.limite + ' blocos, que é o máximo. Use a tecla R para repetir e economizar blocos.');
      return false;
    }
    return true;
  }
  function teclaProg(e) {
    const k = e.key;
    const letra = k.length === 1 ? k.toLowerCase() : '';
    if (A.executando) return !(k === 'Escape' || k === ' ' || letra === 'p' || letra === 'h');
    const setas = { ArrowUp: 'cima', ArrowDown: 'baixo', ArrowLeft: 'esquerda', ArrowRight: 'direita' };
    if (setas[k]) {
      if (!cabeMais()) return true;
      const ant = A.programa[A.programa.length - 1];
      A.programa.push({ tipo: 'seta', dir: setas[k] });
      A.erroEm = -1;
      SONS.bloco(setas[k]);
      const vezes = ant && ant.tipo === 'repetir' ? ', ' + ant.vezes + ' vezes' : '';
      falar(maiuscula(NOME_BLOCO[setas[k]]) + vezes + '. ' + contagem());
    } else if (letra === 'r' && A.regras.repetir) {
      const ult = A.programa[A.programa.length - 1];
      if (ult && ult.tipo === 'repetir') {
        ult.vezes = ult.vezes >= 3 ? 2 : ult.vezes + 1;
        falar('Repetir ' + ult.vezes + ' vezes.');
      } else {
        if (!cabeMais()) return true;
        A.programa.push({ tipo: 'repetir', vezes: 2 });
        A.erroEm = -1;
        falar('Repetir 2 vezes. Aperte R de novo para mudar o número, ou aperte uma seta.');
      }
    } else if (letra === 'e' && A.regras.espere) {
      if (!cabeMais()) return true;
      A.programa.push({ tipo: 'espere' });
      A.erroEm = -1;
      falar('Conferir o semáforo. ' + contagem());
    } else if (k === 'Backspace' || k === 'Delete') {
      apagar();
    } else if (k === 'Enter') {
      executar();
    } else if (letra === 'l') {
      onde();
    } else if (letra === 'o') {
      lerPrograma();
    } else {
      return false;
    }
    desenhar();
    return true;
  }
  // Onde o carro fica depois dos blocos (sem bater), para ajudar a continuar o caminho.
  function posicaoFinal(programa) {
    let x = A.mapa.inicio.x;
    let y = A.mapa.inicio.y;
    for (let i = 0; i < programa.length; i++) {
      let vezes = 1;
      let b = programa[i];
      if (b.tipo === 'repetir') { vezes = b.vezes; b = programa[++i]; }
      if (!b || b.tipo !== 'seta') continue;
      for (let k = 0; k < vezes; k++) { x += DIRECOES[b.dir].dx; y += DIRECOES[b.dir].dy; }
    }
    return { x: x, y: y };
  }
  function apagar() {
    if (A.erroEm >= 0 && A.erroEm < A.programa.length) {
      A.programa = A.programa.slice(0, A.erroEm);
      A.erroEm = -1;
      if (!A.programa.length) { falar('Apaguei o bloco com problema. O programa ficou vazio. Comece de novo com as setas.'); return; }
      const p = posicaoFinal(A.programa);
      falar('Apaguei o bloco com problema e os que vinham depois. Ficou assim: ' + contagem() + ' ' +
        'Com eles, ' + A.lugar + ' fica ' + relativo(A.mapa.destino.x - p.x, A.mapa.destino.y - p.y) + '. Continue com as setas.');
      return;
    }
    if (!A.programa.length) { falar('O programa está vazio.'); return; }
    const b = A.programa.pop();
    falar('Apaguei: ' + nomeBloco(b) + '. ' + (A.programa.length ? 'Ficaram ' + contagem().toLowerCase() : 'O programa está vazio.'));
  }

  function vermelho(t) { return t % 6 < 3; }
  async function executar() {
    if (!A.programa.length) { falar('O programa está vazio. Use as setas para pôr blocos.'); return; }
    const ult = A.programa[A.programa.length - 1];
    if (ult.tipo === 'repetir') { falar('O último bloco é repetir. Ele precisa de uma seta depois. Aperte uma seta.'); return; }
    const id = ++execucao;
    A.executando = true;
    A.x = A.mapa.inicio.x;
    A.y = A.mapa.inicio.y;
    A.t = 0;
    A.conferiu = false;
    desenhar();
    await falar('O carro vai andar.');
    let chegouEm = -1;
    for (let i = 0; i < A.programa.length; i++) {
      let vezes = 1;
      let alvo = i;
      if (A.programa[i].tipo === 'repetir') { vezes = A.programa[i].vezes; alvo = i + 1; }
      const bloco = A.programa[alvo];
      for (let k = 0; k < vezes; k++) {
        if (chegouEm === -2) chegouEm = i;
        const r = bloco.tipo === 'seta' ? await passo(bloco.dir) : await conferir(id);
        if (id !== execucao) return;
        if (r.erro) {
          A.executando = false;
          A.falhas++;
          A.erroEm = i;
          desenhar();
          falar(r.erro + ' Foi no bloco ' + (i + 1) + '. Aperte Backspace para apagar a partir dele e depois continue com as setas. ' +
            'Na próxima vez, o carro começa do início.');
          return;
        }
        if (A.x === A.mapa.destino.x && A.y === A.mapa.destino.y && chegouEm === -1) chegouEm = -2;
      }
      i = alvo;
    }
    A.executando = false;
    desenhar();
    if (A.x === A.mapa.destino.x && A.y === A.mapa.destino.y) { vencer(); return; }
    A.falhas++;
    if (chegouEm >= 0) {
      A.erroEm = chegouEm;
      falar('O carro passou por ' + A.lugar + ', mas não parou lá. Aperte Backspace para apagar os blocos que sobram.');
    } else {
      A.erroEm = -1;
      falar('O programa acabou, mas o carro ainda não chegou. ' + destinoRelativo(A.x, A.y) +
        ' Continue o programa com mais setas e aperte Enter para testar de novo.');
    }
  }
  async function passo(dir) {
    const d = DIRECOES[dir];
    const nx = A.x + d.dx;
    const ny = A.y + d.dy;
    const m = A.mapa;
    const fora = nx < 0 || ny < 0 || nx >= m.colunas || ny >= m.linhas;
    const c = fora ? null : m.casas[ny][nx];
    let erro = null;
    if (fora) erro = 'O carro ia sair da cidade.';
    else if (c === 'O') erro = 'O carro bateu numa obra.';
    else if (c === 'K') erro = 'O carro bateu num cone.';
    else if (c === 'X') erro = 'O carro bateu num prédio.';
    else if (c === 'S' && !A.conferiu) erro = 'O carro chegou no semáforo sem conferir a cor. Use a tecla E antes dessa seta.';
    else if (c === 'S' && vermelho(A.t)) erro = 'O semáforo estava vermelho.';
    if (erro) {
      if (c === 'S') SONS.vermelho(); else SONS.batida(panDe(A.x, m.colunas));
      await esperarMs(500);
      return { erro: erro };
    }
    A.x = nx;
    A.y = ny;
    A.t++;
    A.conferiu = false;
    SONS.passo(nx, ny, m);
    desenhar();
    await esperarMs(acess.calmo ? 800 : 650);
    return {};
  }
  async function conferir(id) {
    const perto = A.mapa.semaforos.some((s) => Math.abs(s.x - A.x) + Math.abs(s.y - A.y) === 1);
    A.conferiu = true;
    if (!perto) { await falar('Aqui não tem semáforo.'); return {}; }
    if (vermelho(A.t)) {
      SONS.vermelho();
      await falar('Semáforo vermelho. Vamos esperar.');
      while (vermelho(A.t)) {
        if (id !== execucao) return {};
        await esperarMs(900);
        A.t++;
        desenhar();
      }
      SONS.verde();
      await falar('Ficou verde! Pode ir.');
    } else {
      SONS.verde();
      await falar('Semáforo verde. Pode ir.');
    }
    return {};
  }
  function vencer() {
    SONS.chegada();
    const n = A.programa.length;
    let est;
    if (acess.calmo) est = 3;
    else if (estado.ano === 1) est = A.falhas === 0 ? 3 : A.falhas <= 2 ? 2 : 1;
    else est = Math.max(1, 3 - (n > A.ideal ? 1 : 0) - (A.falhas >= 2 ? 1 : 0));
    const r = api.registrarConclusao('prog', A.i, est);
    let fala = acess.calmo
      ? 'O carro chegou até ' + A.lugar + '. Você ganhou três estrelas.'
      : 'Muito bem! O carro chegou até ' + A.lugar + '! Você ganhou ' + estrelasFala(est) + '.';
    if (!acess.calmo && est < 3 && n > A.ideal) fala += ' Dá para fazer com só ' + A.ideal + ' blocos, usando a tecla R.';
    vistaResultado('prog', A.i, fala + noticias(r), r);
  }
  // Desenho simples do tabuleiro, para quem está ajudando a criança enxergar.
  function desenhoProg() {
    const m = A.mapa;
    let h = '<div class="audio-tabuleiro" aria-hidden="true" style="--cols:' + m.colunas + '">';
    for (let y = 0; y < m.linhas; y++) {
      for (let x = 0; x < m.colunas; x++) {
        let c = '';
        const cel = m.casas[y][x];
        if (cel === 'O') c = '🚧';
        if (cel === 'K') c = '🔶';
        if (cel === 'X') c = '🏢';
        if (cel === 'S') c = vermelho(A.t) ? '🔴' : '🟢';
        if (x === m.destino.x && y === m.destino.y) c = DESTINOS[A.fase.destino].emoji;
        if (x === A.x && y === A.y) c = '🚗';
        h += '<span>' + c + '</span>';
      }
    }
    h += '</div><p class="audio-programa" aria-hidden="true">Programa: ' + (A.programa.length ? A.programa.map(nomeBloco).join(' · ') : '(vazio)') + '</p>';
    return h;
  }

  // =================================================================
  // Bairros das TICs e da Cidadania Digital
  // =================================================================
  let Qa = null;
  function missaoPerguntas(b, i) {
    Qa = { b: b, i: i, itens: api.itensDaMissao(b, i), k: 0, sub: 0, erros: 0 };
    perguntaAtual('Missão ' + (i + 1) + '. ');
  }
  function descricaoOpcao(o) {
    const d = Qa.b === 'tic' ? descricaoImg(o.img) : '';
    return d ? maiuscula(d) : o.texto;
  }
  function rotuloItem() {
    return (Qa.b === 'tic' ? 'Entrega ' : 'Placa ') + (Qa.k + 1) + ' de ' + Qa.itens.length + '.';
  }
  function tituloQuiz() { return api.BAIRROS[Qa.b].curto + ', missão ' + (Qa.i + 1); }
  const AJUDA_PERGUNTA = 'Ajuda. Escute a pergunta. Use as setas para ouvir cada opção, ou aperte o número da opção. ' +
    'Enter confirma. Barra de espaço repete. Esc volta para as missões.';
  function perguntaAtual(prefixo) {
    const it = Qa.itens[Qa.k];
    if (it.tipo === 'arrastar') { Qa.sub = 0; itemArrastar(prefixo); return; }
    const opcoes = it.opcoes.map((o, j) => ({ rotulo: 'Opção ' + (j + 1) + ': ' + descricaoOpcao(o), acao: () => responder(j) }));
    let texto = rotuloItem() + ' ' + it.pergunta + ' ' + opcoes.map((o) => o.rotulo).join('. ') + '.';
    if (acess.calmo && Qa.b === 'cid') texto += ' Lembre: quando tiver dúvida, peça ajuda a um adulto.';
    mostrar({
      titulo: tituloQuiz(),
      texto: texto + ' Escolha com as setas ou com o número, e aperte Enter.',
      opcoes: opcoes, numeros: true, semLerOpcao: true,
      voltar: () => vistaBairro(Qa.b), ajuda: AJUDA_PERGUNTA,
    }, prefixo);
  }
  function responder(j) {
    const it = Qa.itens[Qa.k];
    const o = it.opcoes[j];
    if (o.certa) {
      SONS.certo();
      acertou(it.explicacao);
    } else if (vista.opcoes[j].tentada) {
      falar('Você já tentou essa opção. Escolha outra.');
    } else {
      Qa.erros++;
      SONS.errado();
      vista.opcoes[j].tentada = true;
      desenhar();
      falar((acess.calmo ? 'Vamos tentar de novo. ' : 'Boa tentativa! ') + (o.dica || '') + ' Escolha outra opção.');
    }
  }
  function acertou(explicacao) {
    const ultimo = Qa.k + 1 >= Qa.itens.length;
    mostrar({
      titulo: tituloQuiz(),
      texto: (acess.calmo ? 'Resposta certa. ' : 'Isso mesmo! ') + explicacao + ' Aperte Enter para continuar.',
      opcoes: [{ rotulo: ultimo ? 'Terminar a missão' : 'Continuar', acao: proxima }],
      semLerOpcao: true,
      voltar: () => vistaBairro(Qa.b), ajuda: AJUDA_PERGUNTA,
    });
  }
  function proxima() {
    Qa.k++;
    if (Qa.k < Qa.itens.length) perguntaAtual();
    else terminarPerguntas();
  }
  // Arrastar vira escolha: o jogo fala o item e a criança escolhe o lugar.
  function itemArrastar(prefixo) {
    const it = Qa.itens[Qa.k];
    const item = it.itens[Qa.sub];
    const nome = maiuscula(descricaoImg(item.img) || item.texto);
    const opcoes = it.lugares.map((l, j) => ({ rotulo: 'Opção ' + (j + 1) + ': ' + l.texto, acao: () => levar(j) }));
    const comeco = Qa.sub === 0 ? rotuloItem() + ' ' + it.pergunta + ' ' : '';
    mostrar({
      titulo: tituloQuiz(),
      texto: comeco + 'Item: ' + nome + '. Para onde ele vai? ' + opcoes.map((o) => o.rotulo).join('. ') + '.',
      opcoes: opcoes, numeros: true, semLerOpcao: true,
      voltar: () => vistaBairro(Qa.b), ajuda: AJUDA_PERGUNTA,
    }, prefixo);
  }
  function levar(j) {
    const it = Qa.itens[Qa.k];
    const item = it.itens[Qa.sub];
    const lugar = it.lugares[j];
    if (vista.opcoes[j].tentada) {
      falar('Você já tentou essa opção. Escolha outra.');
    } else if (lugar.id === item.lugar) {
      SONS.certo();
      Qa.sub++;
      vista.opcoes.forEach((o) => { o.tentada = false; });
      if (Qa.sub >= it.itens.length) acertou(it.explicacao);
      else itemArrastar((acess.calmo ? 'Certo. ' : 'Isso! ') + 'Vai em ' + lugar.texto + '. ');
    } else {
      Qa.erros++;
      SONS.errado();
      vista.opcoes[j].tentada = true;
      desenhar();
      falar((acess.calmo ? 'Vamos tentar de novo. ' : 'Boa tentativa! ') + 'Esse item não vai em ' + lugar.texto + '. Escolha outra opção.');
    }
  }
  function terminarPerguntas() {
    SONS.chegada();
    const est = acess.calmo ? 3 : Qa.erros === 0 ? 3 : Qa.erros <= 2 ? 2 : 1;
    const r = api.registrarConclusao(Qa.b, Qa.i, est);
    const fala = (Qa.b === 'tic' ? 'Todas as entregas chegaram à Loja de Tecnologia! ' : 'Você passou por todas as placas com cuidado! ') +
      'Você ganhou ' + estrelasFala(est) + '.';
    vistaResultado(Qa.b, Qa.i, fala + noticias(r), r);
  }

  // =================================================================
  // Praça Digital
  // =================================================================
  function textoCertificado() {
    const data = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
    return 'Certificado da Rota Digital. Certificamos que ' + (estado.nome || 'você') + ' completou a Rota Digital do ' +
      ANO_FALADO[estado.ano] + ', cumprindo as missões dos bairros da Programação, das TICs e da Cidadania Digital. ' +
      'Selos conquistados: Programação, TICs e Cidadania Digital. Data: ' + data + '.';
  }
  function vistaPraca() {
    if (!api.todosSelos()) {
      falar('A Praça Digital está fechada. Ela abre quando você tiver os 3 selos. Agora você tem ' +
        (quantosSelos() === 1 ? 'um selo.' : NUMERO[quantosSelos()] + ' selos.'));
      return;
    }
    SONS.festa();
    mostrar({
      titulo: 'Praça Digital',
      texto: (estado.nome ? 'Parabéns, ' + estado.nome + '! ' : 'Parabéns! ') +
        'Você chegou à Praça Digital! Você ganhou os três selos: o selo da Programação, o selo das TICs e o selo da Cidadania Digital. ' +
        'Agora vou ler o seu certificado. ' + textoCertificado(),
      opcoes: [
        { rotulo: 'Ouvir o certificado de novo', acao: () => falar(textoCertificado()) },
        { rotulo: 'Imprimir o certificado', acao: () => { api.imprimirCertificado(); falar('Pronto. Peça a um adulto para pegar o papel na impressora.'); } },
        { rotulo: 'Voltar para a cidade', acao: () => vistaCidade() },
      ],
      semLerOpcao: true,
      voltar: () => vistaCidade(),
    });
  }

  // =================================================================
  // Ligar e desligar
  // =================================================================
  function comecar() {
    iniciado = true;
    contexto();
    $('#audio-comecar').hidden = true;
    focar();
    falar(falaDaVista());
  }
  function iniciar() {
    ativo = true;
    iniciado = false;
    api.mostrarTela('audio');
    $('#audio-comecar').hidden = false;
    $('#audio-comecar').onclick = comecar;
    vistaInicio();
    focar();
    // Se a pessoa ligou o Modo Áudio agora (com um clique), já dá para falar.
    if (navigator.userActivation && navigator.userActivation.isActive) comecar();
  }
  function parar() {
    ativo = false;
    execucao++;
    if (window.speechSynthesis) speechSynthesis.cancel();
  }
  function focar() { const app = $('#audio-app'); if (app) app.focus({ preventScroll: true }); }
  function aoContinuar() { focar(); falar('Vamos continuar. ' + (vista ? falaDaVista() : '')); }

  return { iniciar: iniciar, parar: parar, tecla: tecla, falar: falar, focar: focar, aoContinuar: aoContinuar };
}
