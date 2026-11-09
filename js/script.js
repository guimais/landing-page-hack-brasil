'use strict';

const usuarioPrefereMenosMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const bibliotecaDeAnimacao = window.Motion;
const BibliotecaDeRolagemSuave = window.Lenis;
const navegadorControladoPorAutomacao = navigator.webdriver;
const animacoesEstaoLiberadas = Boolean(bibliotecaDeAnimacao) && !usuarioPrefereMenosMovimento;
const consultaDeTelaCompacta = window.matchMedia('(max-width: 767px), (max-height: 560px)');

const curvaDeDesaceleracao = [0.22, 1, 0.36, 1];
const curvaComImpulso = [0.34, 1.4, 0.64, 1];
const duracaoDasEntradas = 0.9;
const duracaoDaRevelacaoDosTitulos = 1.1;
const intervaloEntreEntradas = 0.08;
const distanciaDasEntradas = 28;
const distanciaDaEntradaDosDocumentos = 80;
const mascaraFechada = 'inset(0% 0% 100% 0%)';
const mascaraAberta = 'inset(0% 0% 0% 0%)';

const suavidadeDaRolagem = 0.12;
const proporcaoMinimaDaBarraDeProgresso = 0.14;
const pausaNoFimDaCenaHorizontal = 0.2;

const saldoInicialDaEscola = 18430;
const duracaoDaContagemAoPlanejar = 1400;
const atrasoDaContagemAoPlanejar = 250;
const duracaoDaContagemAoDesfazer = 900;
const duracaoDaContagemDosNumeros = 1600;
const folgaParaGarantirValorFinal = 120;

const textosDoSaldo = {
	parado: {
		rotulo: 'Saldo parado',
		mensagem: 'Se nada for feito, o saldo do PDDE Básico volta para o governo no prazo de fevereiro.',
		botao: 'Planejar este saldo',
	},
	planejado: {
		rotulo: 'Saldo após o plano',
		mensagem: 'Saldo planejado: quatro compras permitidas pelo programa, com preços e ata prontos. Nada volta para o governo.',
		botao: 'Desfazer o plano',
	},
};

const formatadorDeReais = new Intl.NumberFormat('pt-BR', {
	style: 'currency',
	currency: 'BRL',
});

const raizDaPagina = document.documentElement;
const cartaoDoExtrato = document.getElementById('cartao-extrato');
const botaoPlanejarSaldo = document.getElementById('botao-planejar-saldo');
const textoDoBotaoPlanejar = document.getElementById('texto-do-botao-planejar');
const valorDoSaldo = document.getElementById('valor-do-saldo');
const rotuloDoSaldo = document.getElementById('rotulo-do-saldo');
const mensagemDeStatus = document.getElementById('mensagem-de-status');
const lancamentosPlanejados = document.querySelectorAll('.lancamento-planejado');

const tituloEmMovimento = document.getElementById('titulo-em-movimento');
const tituloDoProblema = document.getElementById('titulo-problema');

const secaoComoFunciona = document.getElementById('como-funciona');
const palcoHorizontal = document.getElementById('palco-horizontal');
const linhaDeEtapas = document.getElementById('linha-de-etapas');
const barraDeProgresso = document.getElementById('barra-de-progresso');
const etapas = document.querySelectorAll('.etapa');

const linksParaSecoesDaPagina = document.querySelectorAll('a[href^="#"]');
const blocosQueAparecemAoRolar = document.querySelectorAll('[data-aparecer]');
const numerosQueContam = document.querySelectorAll('[data-contar]');

const medicoesAoRedimensionar = [];
const filaDeRevelacao = [];
const partesJaEnfileiradas = new WeakSet();

let rolagemSuave = null;
let saldoEstaPlanejado = false;
let cancelarContagemDoSaldo = null;
let medicaoAgendada = false;
let revelacaoAgendada = false;
let ultimaLarguraMedida = window.innerWidth;
let distanciaHorizontalDasEtapas = 0;
let distanciaDoTituloEmMovimento = 0;

iniciarPagina();

function iniciarPagina() {
	ativarRolagemSuave();
	ativarLinksInternos();
	ativarBotaoDePlanejarSaldo();

	ativarRolagemManualDasEtapas();

	if (animacoesEstaoLiberadas) {
		raizDaPagina.classList.add('animacoes-ativas');
		ativarCenaHorizontal();
		ativarTituloEmMovimento();
		ativarRevelacoesAoRolar();
	}

	window.addEventListener('resize', agendarMedicoes, { passive: true });
	document.fonts?.ready.then(executarMedicoes);
}

function registrarMedicao(medir) {
	medicoesAoRedimensionar.push(medir);
	medir();
}

function executarMedicoes() {
	medicaoAgendada = false;
	ultimaLarguraMedida = window.innerWidth;
	medicoesAoRedimensionar.forEach((medir) => medir());
}

function agendarMedicoes() {
	const larguraNaoMudou = window.innerWidth === ultimaLarguraMedida;

	if (medicaoAgendada || larguraNaoMudou) {
		return;
	}

	medicaoAgendada = true;
	requestAnimationFrame(executarMedicoes);
}

function ativarRolagemSuave() {
	const podeSuavizarRolagem = BibliotecaDeRolagemSuave
		&& !usuarioPrefereMenosMovimento
		&& !navegadorControladoPorAutomacao;

	if (!podeSuavizarRolagem) {
		return;
	}

	rolagemSuave = new BibliotecaDeRolagemSuave({
		autoRaf: true,
		lerp: suavidadeDaRolagem,
		smoothWheel: true,
	});
}

function ativarLinksInternos() {
	linksParaSecoesDaPagina.forEach((link) => {
		link.addEventListener('click', (evento) => {
			const enderecoDaSecao = link.getAttribute('href');
			const secaoDeDestino = enderecoDaSecao.length > 1 ? document.querySelector(enderecoDaSecao) : null;

			if (!secaoDeDestino) {
				return;
			}

			evento.preventDefault();

			if (rolagemSuave) {
				rolagemSuave.scrollTo(secaoDeDestino);
			} else {
				secaoDeDestino.scrollIntoView({ behavior: usuarioPrefereMenosMovimento ? 'auto' : 'smooth' });
			}
		});
	});
}

function atualizarBarraDeProgresso(progresso) {
	const tamanhoDaBarra = proporcaoMinimaDaBarraDeProgresso + (1 - proporcaoMinimaDaBarraDeProgresso) * progresso;
	barraDeProgresso.style.transform = `scaleX(${tamanhoDaBarra})`;
}

function ativarRolagemManualDasEtapas() {
	if (!linhaDeEtapas || !barraDeProgresso) {
		return;
	}

	const acompanharRolagemManual = () => {
		const rolagemMaxima = linhaDeEtapas.scrollWidth - linhaDeEtapas.clientWidth;
		atualizarBarraDeProgresso(rolagemMaxima > 0 ? linhaDeEtapas.scrollLeft / rolagemMaxima : 1);
	};

	linhaDeEtapas.addEventListener('scroll', acompanharRolagemManual, { passive: true });
	consultaDeTelaCompacta.addEventListener('change', acompanharRolagemManual);
	acompanharRolagemManual();
}

function ativarCenaHorizontal() {
	if (!secaoComoFunciona || !palcoHorizontal || !linhaDeEtapas || !barraDeProgresso || etapas.length === 0) {
		return;
	}

	let ultimoDeslocamentoDasEtapas = null;

	const medirCena = () => {
		if (consultaDeTelaCompacta.matches) {
			return;
		}

		const alturaDoPalco = palcoHorizontal.clientHeight;
		distanciaHorizontalDasEtapas = Math.max(0, linhaDeEtapas.scrollWidth - linhaDeEtapas.clientWidth);

		const alturaDaCena = alturaDoPalco * (1 + pausaNoFimDaCenaHorizontal) + distanciaHorizontalDasEtapas;
		secaoComoFunciona.style.setProperty('--altura-da-cena', `${alturaDaCena}px`);
	};

	const aplicarModoDaCena = () => {
		const cenaFixaNaTela = !consultaDeTelaCompacta.matches;

		secaoComoFunciona.classList.toggle('cena-horizontal', cenaFixaNaTela);

		if (cenaFixaNaTela) {
			linhaDeEtapas.removeAttribute('tabindex');
		} else {
			linhaDeEtapas.setAttribute('tabindex', '0');
			linhaDeEtapas.style.transform = '';
			ultimoDeslocamentoDasEtapas = null;
		}

		medirCena();
	};

	registrarMedicao(medirCena);
	consultaDeTelaCompacta.addEventListener('change', aplicarModoDaCena);
	aplicarModoDaCena();

	bibliotecaDeAnimacao.scroll((progresso) => {
		if (consultaDeTelaCompacta.matches || distanciaHorizontalDasEtapas === 0) {
			return;
		}

		const percursoComPausa = distanciaHorizontalDasEtapas + palcoHorizontal.clientHeight * pausaNoFimDaCenaHorizontal;
		const progressoDoMovimento = Math.min(1, progresso * percursoComPausa / distanciaHorizontalDasEtapas);
		const deslocamento = Math.round(-distanciaHorizontalDasEtapas * progressoDoMovimento);

		if (deslocamento === ultimoDeslocamentoDasEtapas) {
			return;
		}

		ultimoDeslocamentoDasEtapas = deslocamento;
		linhaDeEtapas.style.transform = `translate3d(${deslocamento}px, 0, 0)`;
		atualizarBarraDeProgresso(progressoDoMovimento);
	}, {
		target: secaoComoFunciona,
		offset: ['start start', 'end end'],
	});
}

function ativarTituloEmMovimento() {
	if (!tituloEmMovimento || !tituloDoProblema) {
		return;
	}

	let ultimoDeslocamentoDoTitulo = null;

	const medirTitulo = () => {
		distanciaDoTituloEmMovimento = Math.max(0, tituloDoProblema.scrollWidth - tituloEmMovimento.clientWidth);
	};

	const aplicarModoDoTitulo = () => {
		const tituloDesliza = !consultaDeTelaCompacta.matches;

		tituloEmMovimento.classList.toggle('titulo-deslizando', tituloDesliza);

		if (!tituloDesliza) {
			tituloDoProblema.style.transform = '';
			ultimoDeslocamentoDoTitulo = null;
		}

		medirTitulo();
	};

	registrarMedicao(medirTitulo);
	consultaDeTelaCompacta.addEventListener('change', aplicarModoDoTitulo);
	aplicarModoDoTitulo();

	bibliotecaDeAnimacao.inView(tituloEmMovimento, () => {
		tituloEmMovimento.classList.add('titulo-revelado');

		if (consultaDeTelaCompacta.matches) {
			revelarParte(tituloDoProblema, 0, false);
		}
	}, { amount: 0.4 });

	bibliotecaDeAnimacao.scroll((progresso) => {
		if (consultaDeTelaCompacta.matches) {
			return;
		}

		const deslocamento = Math.round(-distanciaDoTituloEmMovimento * progresso);

		if (deslocamento === ultimoDeslocamentoDoTitulo) {
			return;
		}

		ultimoDeslocamentoDoTitulo = deslocamento;
		tituloDoProblema.style.transform = `translate3d(${deslocamento}px, 0, 0)`;
	}, {
		target: tituloEmMovimento,
		offset: ['start end', 'end start'],
	});
}

function ativarBotaoDePlanejarSaldo() {
	if (!cartaoDoExtrato || !botaoPlanejarSaldo || !textoDoBotaoPlanejar || !valorDoSaldo) {
		return;
	}

	botaoPlanejarSaldo.addEventListener('click', () => {
		saldoEstaPlanejado = !saldoEstaPlanejado;

		const textosDoMomento = saldoEstaPlanejado ? textosDoSaldo.planejado : textosDoSaldo.parado;

		cartaoDoExtrato.classList.toggle('saldo-planejado', saldoEstaPlanejado);
		botaoPlanejarSaldo.classList.toggle('botao-destaque', !saldoEstaPlanejado);
		botaoPlanejarSaldo.classList.toggle('botao-suave', saldoEstaPlanejado);
		botaoPlanejarSaldo.setAttribute('aria-pressed', String(saldoEstaPlanejado));
		textoDoBotaoPlanejar.textContent = textosDoMomento.botao;
		rotuloDoSaldo.textContent = textosDoMomento.rotulo;
		mensagemDeStatus.textContent = textosDoMomento.mensagem;

		if (saldoEstaPlanejado) {
			mostrarLancamentosPlanejados();
			contarValorDoSaldo(saldoInicialDaEscola, 0, duracaoDaContagemAoPlanejar, atrasoDaContagemAoPlanejar);
		} else {
			contarValorDoSaldo(0, saldoInicialDaEscola, duracaoDaContagemAoDesfazer, 0);
		}
	});
}

function mostrarLancamentosPlanejados() {
	if (!animacoesEstaoLiberadas) {
		return;
	}

	bibliotecaDeAnimacao.animate(lancamentosPlanejados, { opacity: [0, 1], x: [-16, 0] }, {
		delay: bibliotecaDeAnimacao.stagger(0.12),
		duration: 0.7,
		ease: curvaDeDesaceleracao,
	});
}

function contarValorDoSaldo(valorInicial, valorFinal, duracao, atraso) {
	cancelarContagemDoSaldo?.();

	cancelarContagemDoSaldo = animarNumero({
		valorInicial,
		valorFinal,
		duracao,
		atraso,
		aoAtualizar: (valor) => {
			valorDoSaldo.textContent = formatadorDeReais.format(valor);
		},
	});
}

function animarNumero({ valorInicial, valorFinal, duracao, atraso = 0, aoAtualizar }) {
	if (usuarioPrefereMenosMovimento) {
		aoAtualizar(valorFinal);
		return () => {};
	}

	let foiCancelada = false;
	let momentoDeInicio = null;

	const avancarQuadro = (momentoAtual) => {
		if (foiCancelada) {
			return;
		}

		momentoDeInicio ??= momentoAtual + atraso;

		const progresso = Math.min(1, Math.max(0, (momentoAtual - momentoDeInicio) / duracao));
		const progressoDesacelerado = 1 - Math.pow(2, -10 * progresso);

		if (progresso >= 1) {
			aoAtualizar(valorFinal);
			return;
		}

		aoAtualizar(valorInicial + (valorFinal - valorInicial) * progressoDesacelerado);
		requestAnimationFrame(avancarQuadro);
	};

	const garantiaDoValorFinal = setTimeout(() => {
		if (!foiCancelada) {
			aoAtualizar(valorFinal);
		}
	}, atraso + duracao + folgaParaGarantirValorFinal);

	requestAnimationFrame(avancarQuadro);

	return () => {
		foiCancelada = true;
		clearTimeout(garantiaDoValorFinal);
	};
}

function ativarRevelacoesAoRolar() {
	const { inView: quandoAparecer } = bibliotecaDeAnimacao;

	blocosQueAparecemAoRolar.forEach((bloco) => {
		const blocoDeDocumentos = bloco.classList.contains('documentos');

		Array.from(bloco.children).forEach((parte) => {
			quandoAparecer(parte, () => enfileirarRevelacao(parte, blocoDeDocumentos), { amount: 0.2 });
		});
	});

	numerosQueContam.forEach((numero) => {
		quandoAparecer(numero, () => contarNumero(numero), { amount: 0.6 });
	});
}

function enfileirarRevelacao(parte, blocoDeDocumentos) {
	const partesAnterioresPuladas = [];
	let parteAnterior = parte.previousElementSibling;

	while (parteAnterior) {
		partesAnterioresPuladas.unshift(parteAnterior);
		parteAnterior = parteAnterior.previousElementSibling;
	}

	[...partesAnterioresPuladas, parte]
		.filter((parteDoBloco) => !partesJaEnfileiradas.has(parteDoBloco))
		.forEach((parteDoBloco) => {
			partesJaEnfileiradas.add(parteDoBloco);
			filaDeRevelacao.push({ parte: parteDoBloco, blocoDeDocumentos });
		});

	if (revelacaoAgendada) {
		return;
	}

	revelacaoAgendada = true;
	requestAnimationFrame(revelarFila);
}

function revelarFila() {
	revelacaoAgendada = false;

	filaDeRevelacao.splice(0).forEach(({ parte, blocoDeDocumentos }, posicao) => {
		revelarParte(parte, posicao * intervaloEntreEntradas, blocoDeDocumentos);
	});
}

function revelarParte(parte, atraso, blocoDeDocumentos) {
	const { animate: animar } = bibliotecaDeAnimacao;

	parte.classList.add('parte-revelada');

	if (parte.tagName === 'H2') {
		animar(parte, { opacity: [0, 1], clipPath: [mascaraFechada, mascaraAberta], y: [40, 0] }, {
			delay: atraso,
			duration: duracaoDaRevelacaoDosTitulos,
			ease: curvaDeDesaceleracao,
		});
		return;
	}

	animar(parte, {
		opacity: [0, 1],
		y: [blocoDeDocumentos ? distanciaDaEntradaDosDocumentos : distanciaDasEntradas, 0],
	}, {
		delay: atraso,
		duration: duracaoDasEntradas,
		ease: blocoDeDocumentos ? curvaComImpulso : curvaDeDesaceleracao,
	});
}

function contarNumero(numero) {
	const { valor, casasDecimais, prefixo = '', sufixo = '' } = numero.dataset;

	const formatadorDoNumero = new Intl.NumberFormat('pt-BR', {
		minimumFractionDigits: Number(casasDecimais),
		maximumFractionDigits: Number(casasDecimais),
	});

	animarNumero({
		valorInicial: 0,
		valorFinal: Number(valor),
		duracao: duracaoDaContagemDosNumeros,
		aoAtualizar: (valorDoMomento) => {
			numero.textContent = `${prefixo}${formatadorDoNumero.format(valorDoMomento)}${sufixo}`;
		},
	});
}