# 🚗 Rota Digital

Jogo educativo de **Educação Digital** para o **Ciclo de Alfabetização (1º, 2º e 3º ano do Ensino Fundamental)**, alinhado ao Currículo da Cidade de São Paulo – Tecnologias para Aprendizagem: **Programação**, **Tecnologias da Informação e Comunicação (TICs)** e **Letramento Digital**.

Um carrinho percorre a **Cidade Digital**, vista de cima. Cada bairro é um eixo:

| Bairro | 1º ano | 2º ano | 3º ano |
| --- | --- | --- | --- |
| 🧩 **Programação** | sequência de setas, caminhos curtos | bloco 🔁 REPETIR | semáforos que mudam de cor e bloco 🚦 SE VERMELHO, ESPERE, com limite de blocos |
| 💻 **TICs** (Loja de Tecnologia) | aparelhos e periféricos e para que servem | ícones de programas e de ações | tipos de mídia e qual combina com cada situação |
| 🛡️ **Cidadania Digital** (placas digitais) | situações simples: dados pessoais, pedir ajuda, senha, gentileza, autoria, tempo de tela | + desconhecidos, golpes simples ("Você ganhou um prêmio!") e autoria | situações mais elaboradas |

Cada missão vale até ⭐⭐⭐. Terminando as missões de um bairro, a criança ganha o **selo** do bairro. Com os 3 selos, o carro chega à **Praça Digital**, com festa e um **certificado** com o nome digitado no início (o nome não é salvo nem enviado). Os bairros podem ser jogados em qualquer ordem: um bairro por aula.

- Só HTML, CSS e JavaScript, sem instalação. Abra o `index.html` ou publique no GitHub Pages.
- Tudo funciona com cliques do mouse, com botões grandes. Arrastar é opcional (dá para clicar no item e depois na caixa).
- Não depende de som: o som começa **desligado**, e todo retorno é visual.
- Funciona sem internet depois de carregado. Sem anúncios, sem links externos, sem coleta de dados.
- **Área do professor** (botão discreto 🔑, protegido por uma conta de somar): liberar todas as fases e apagar o progresso (com confirmação). O progresso fica salvo só no navegador daquele computador.
- Atalhos opcionais: setas do teclado, R (REPETIR), E (ESPERE), Enter (Executar), Delete (tirar bloco), 1/2/3 (respostas), P (pausa), H (como jogar).

### Acessibilidade

O botão **♿ Acessibilidade** fica na tela inicial e também na Área do professor. As escolhas ficam salvas no navegador daquele computador.

- **🎧 Modo Áudio** (estudante cego, com teclado e fones): o jogo fala sozinho em português e funciona só pelo teclado: setas para escolher, Enter para confirmar, Esc para voltar, barra de espaço para ouvir de novo e H para a ajuda falada. No lugar do mapa há um menu falado com os bairros e os selos. Na Programação, os tabuleiros são menores (3x3 até 4x4), o jogo descreve o caminho antes da missão, a tecla L diz onde o carro está, e cada passo tem um som: à direita e à esquerda pelo fone, mais agudo para cima e mais grave para baixo. No 3º ano, a cor do semáforo é avisada por voz e por som. Funciona também com o NVDA e o Narrador; nesse caso, desligue a **voz do próprio jogo** para não ouvir duas vozes.
- **🌿 Modo Calmo** (estudantes com TEA): tela mais limpa, cores suaves, sem piscar nem tremer, uma barra mostrando a missão atual e quantas faltam, instruções em passos numerados, erros mostrados de forma neutra e a mesma recompensa ao fim de cada missão. Na Cidadania Digital, sem rostos assustados e com o lembrete "peça ajuda a um adulto". Opção extra: **desligar todas as animações** (o carro pula de casa em casa).
- **🔠 Letras e botões maiores** e **🌓 Alto contraste**, para qualquer estudante.

### Como acrescentar perguntas e situações

As perguntas do Bairro das TICs e as situações do Bairro da Cidadania Digital ficam no arquivo [`perguntas.js`](perguntas.js), na raiz. O começo do arquivo explica, com modelos prontos, como copiar e colar uma pergunta nova. A cada 3 perguntas novas de um ano, aparece uma missão nova. As fases da Programação ficam em [`rota/fases.js`](rota/fases.js), desenhadas com letras.

Para conferir se não ficou nenhum erro de digitação: `node testes/rota.test.js`.

Endereço: https://phisantos51-hub.github.io/rota-digital/

```
index.html            Rota Digital (página principal)
perguntas.js          perguntas das TICs e situações da Cidadania Digital
rota/fases.js         fases da Programação
rota/icones.js        desenhos (aparelhos, ícones, mídias, carro, semáforo)
rota/jogo.js          telas, mapa, missões, estrelas, selos, progresso e acessibilidade
rota/audio.js         Modo Áudio (voz, sons e teclado)
rota/estilo.css       visual
testes/rota.test.js   confere fases e perguntas
```
