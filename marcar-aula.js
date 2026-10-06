/**
 * Execute no Console do DevTools na pagina de conteudo de um curso.
 *
 * A automacao usa os controles da propria pagina, portanto preserva o fluxo
 * normal de autenticacao e as regras usadas para marcar videos e PDFs.
 * Para interromper durante a execucao:
 *   window.__pararMarcacaoDeAulas = true
 */
(async () => {
  const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
  const visivel = (elemento) =>
    elemento instanceof HTMLElement &&
    elemento.getClientRects().length > 0 &&
    getComputedStyle(elemento).visibility !== 'hidden'

  const configuracao = {
    intervaloEntreAulas: 450,
    esperaDepoisDeAbrir: 900,
    tentativasSemAlteracao: 8
  }

  if (window.__marcacaoDeAulasEmAndamento) {
    console.warn('[Aulas] Ja existe uma marcacao em andamento.')
    return
  }

  if (!confirm('Marcar todas as videoaulas e todos os PDFs deste curso como concluidos?')) return

  window.__marcacaoDeAulasEmAndamento = true
  window.__pararMarcacaoDeAulas = false

  let marcadas = 0

  const abrirItensRecolhidos = async () => {
    const seletores = [
      '[role="button"][aria-label^="Disciplina "][aria-expanded="false"]',
      'button[aria-label^="Aula "][aria-expanded="false"]'
    ]
    const itens = [...document.querySelectorAll(seletores.join(','))].filter(visivel)

    for (const item of itens) {
      if (window.__pararMarcacaoDeAulas) return
      item.click()
      await esperar(configuracao.esperaDepoisDeAbrir)
    }
  }

  const marcarBotoesVisiveis = async () => {
    const botoes = [...document.querySelectorAll('button[aria-label^="Marcar aula como"]')].filter(
      visivel
    )

    for (const botao of botoes) {
      if (window.__pararMarcacaoDeAulas) return
      if (!botao.getAttribute('aria-label')?.startsWith('Marcar aula como')) continue

      botao.click()
      marcadas++
      console.log(`[Aulas] ${marcadas} aula(s) marcada(s).`)
      await esperar(configuracao.intervaloEntreAulas)
    }
  }

  const avancarListas = () => {
    let movimentou = false
    const listas = [...document.querySelectorAll('.painel-scroll')].filter(visivel)

    for (const lista of listas) {
      const anterior = lista.scrollTop
      lista.scrollTop = Math.min(lista.scrollTop + Math.max(lista.clientHeight * 0.8, 250), lista.scrollHeight)
      lista.dispatchEvent(new Event('scroll', { bubbles: true }))
      movimentou ||= lista.scrollTop !== anterior
    }

    return movimentou
  }

  const processarAba = async (ariaLabel) => {
    const aba = document.querySelector(`button[aria-label="${ariaLabel}"]`)
    if (!aba || !visivel(aba)) {
      console.info(`[Aulas] Aba indisponivel: ${ariaLabel}.`)
      return
    }

    aba.click()
    await esperar(1200)
    console.log(`[Aulas] Processando ${ariaLabel}.`)

    let rodadasOciosas = 0
    while (!window.__pararMarcacaoDeAulas && rodadasOciosas < configuracao.tentativasSemAlteracao) {
      const antes = marcadas
      await abrirItensRecolhidos()
      await marcarBotoesVisiveis()
      const movimentou = avancarListas()
      await esperar(800)

      rodadasOciosas = marcadas === antes && !movimentou ? rodadasOciosas + 1 : 0
    }
  }

  try {
    await processarAba('Videoaulas do curso')
    await processarAba('PDFs do curso')

    if (window.__pararMarcacaoDeAulas) {
      console.warn(`[Aulas] Interrompido. ${marcadas} aula(s) marcada(s) nesta execucao.`)
    } else {
      console.log(`[Aulas] Finalizado. ${marcadas} aula(s) marcada(s) nesta execucao.`)
    }
  } finally {
    window.__marcacaoDeAulasEmAndamento = false
  }
})()
