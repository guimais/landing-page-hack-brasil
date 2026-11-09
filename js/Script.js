'use strict';

const usuarioPrefereMenosMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const bibliotecaDeAnimacao = window.Motion;
const BibliotecaDeRolagemSuave = window.Lenis;
const navegadorControladoPorAutomacao = navigator.webdriver;
const animacoesEstaoLiberadas = Boolean(bibliotecaDeAnimacao) && !usuarioPrefereMenosMovimento;

const curvaDeDesaceleracao = [0.22, 1, 0.36, 1];
const curvaComImpulso = [0.34, 1.4, 0.64, 1];
const duracaoDasEntradas = 0.9;
const duracaoDaRevelacaoDosTitulos = 1.1;
const intervaloEntreEntradas = 0.08;
const distanciaDasEntradas = 28;
const distanciaDaEntradaDosDocumentos = 80;
const duracaoDaContagemDosNumeros = 1.6;
const mascaraFechada = 'inset(0% 0% 100% 0%)';
const mascaraAberta = 'inset(0% 0% 0% 0%)';
const saldoInicialDaEscola = 18430;
const proporcaoMinimaDaBarraDeProgresso = 0.14;
const pausaNoFimDaCenaHorizontal = 0.2;
const duracaoDaContagemAoPlanejar = 1400;
const atrasoDaContagemAoPlanejar = 250;
const duracaoDaContagemAoDesfazer = 900;
const folgaParaGarantirValorFinal = 120;

const textosDoSaldo = {
	parado: {
		rotulo: 'Saldo parado',
		mensagem: 'Se nada for feito, o saldo do PDDE Básico volta para o governo no prazo de fevereiro.',
		botao: 'Planejar este saldo <span class="seta" aria-hidden="true">→</span>',
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

const cartaoDoExtrato = document.getElementById('cartao-extrato');
const botaoPlanejarSaldo = document.getElementById('botao-planejar-saldo');
const valorDoSaldo = document.getElementById('valor-do-saldo');
const rotuloDoSaldo = document.getElementById('rotulo-do-saldo');
const mensagemDeStatus = document.getElementById('mensagem-de-status');
const lancamentosPlanejados = document.querySelectorAll('.lancamento-planejado');
const tituloPrincipal = document.getElementById('titulo-principal');
const textosDasLinhasDoTitulo = document.querySelectorAll('.texto-da-linha');

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

let rolagemSuave = null;
let saldoEstaPlanejado = false;
let numeroDaContagemAtual = 0;
let distanciaHorizontalDasEtapas = 0;
let distanciaDoTituloEmMovimento = 0;

iniciarPagina();

function iniciarPagina() {
	ativarRolagemSuave();
	ativarBotaoDePlanejarSaldo();

	if (animacoesEstaoLiberadas) {
		ativarCenaHorizontal();
		ativarTituloEmMovimento();
		ativarAnimacoes();
	} else {
		ativarRolagemManualDasEtapas();
	}
}

function ativarRolagemSuave() {
	const podeSuavizarRolagem = !usuarioPrefereMenosMovimento
		&& BibliotecaDeRolagemSuave
		&& !navegadorControladoPorAutomacao;

	if (podeSuavizarRolagem) {
		rolagemSuave = new BibliotecaDeRolagemSuave({
			duration: 1.15,
			easing: (progresso) => 1 - Math.pow(1 - progresso, 4),
			smoothWheel: true,
		});

		const atualizarRolagemAQuadro = (momento) => {
			rolagemSuave.raf(momento);
			requestAnimationFrame(atualizarRolagemAQuadro);
		};

		requestAnimationFrame(atualizarRolagemAQuadro);
	}

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
	acompanharRolagemManual();
}

function ativarCenaHorizontal() {
	if (!secaoComoFunciona || !palcoHorizontal || !linhaDeEtapas) {
		return;
	}

	secaoComoFunciona.classList.add('cena-horizontal');
	linhaDeEtapas.removeAttribute('tabindex');

	const medirCenaHorizontal = () => {
		const ultimaEtapa = etapas[etapas.length - 1];
		const inicioDaLinha = linhaDeEtapas.getBoundingClientRect().left;
		const fimDaUltimaEtapa = ultimaEtapa.getBoundingClientRect().right;
		const larguraTotalDasEtapas = fimDaUltimaEtapa - inicioDaLinha;
		const larguraVisivel = linhaDeEtapas.clientWidth;
		const alturaDaTela = window.innerHeight;

		distanciaHorizontalDasEtapas = Math.max(0, larguraTotalDasEtapas - larguraVisivel);

		const alturaDaCena = alturaDaTela + distanciaHorizontalDasEtapas + alturaDaTela * pausaNoFimDaCenaHorizontal;
		secaoComoFunciona.style.setProperty('--altura-da-cena', `${alturaDaCena}px`);
	};

	medirCenaHorizontal();
	window.addEventListener('resize', medirCenaHorizontal);
	document.fonts?.ready.then(medirCenaHorizontal);

	bibliotecaDeAnimacao.scroll((progresso) => {
		const progressoDoMovimento = Math.min(1, progresso * (1 + pausaNoFimDaCenaHorizontal));
		const deslocamento = -distanciaHorizontalDasEtapas * progressoDoMovimento;

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

	tituloEmMovimento.classList.add('titulo-deslizando');

	const medirTitulo = () => {
		const larguraDoTitulo = tituloDoProblema.scrollWidth;
		const larguraVisivel = tituloEmMovimento.clientWidth;

		distanciaDoTituloEmMovimento = Math.max(0, larguraDoTitulo - larguraVisivel);
	};

	medirTitulo();
	window.addEventListener('resize', medirTitulo);
	document.fonts?.ready.then(medirTitulo);

	bibliotecaDeAnimacao.scroll((progresso) => {
		const deslocamento = -distanciaDoTituloEmMovimento * progresso;
		tituloDoProblema.style.transform = `translate3d(${deslocamento}px, 0, 0)`;
	}, {
		target: tituloEmMovimento,
		offset: ['start end', 'end start'],
	});
}

function ativarBotaoDePlanejarSaldo() {
	if (!cartaoDoExtrato || !botaoPlanejarSaldo || !valorDoSaldo) {
		return;
	}

	botaoPlanejarSaldo.addEventListener('click', () => {
		saldoEstaPlanejado = !saldoEstaPlanejado;

		const textosDoMomento = saldoEstaPlanejado ? textosDoSaldo.planejado : textosDoSaldo.parado;

		cartaoDoExtrato.classList.toggle('saldo-planejado', saldoEstaPlanejado);
		botaoPlanejarSaldo.classList.toggle('botao-destaque', !saldoEstaPlanejado);
		botaoPlanejarSaldo.classList.toggle('botao-suave', saldoEstaPlanejado);
		botaoPlanejarSaldo.setAttribute('aria-pressed', String(saldoEstaPlanejado));
		botaoPlanejarSaldo.innerHTML = textosDoMomento.botao;
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

function exibirValorDoSaldo(valor) {
	valorDoSaldo.textContent = formatadorDeReais.format(valor);
}

function contarValorDoSaldo(valorInicial, valorFinal, duracao, atraso) {
	if (usuarioPrefereMenosMovimento) {
		exibirValorDoSaldo(valorFinal);
		return;
	}

	const numeroDestaContagem = ++numeroDaContagemAtual;
	let momentoDeInicio = null;

	const avancarContagem = (momentoAtual) => {
		if (numeroDestaContagem !== numeroDaContagemAtual) {
			return;
		}

		if (momentoDeInicio === null) {
			momentoDeInicio = momentoAtual + atraso;
		}

		const progresso = Math.min(1, Math.max(0, (momentoAtual - momentoDeInicio) / duracao));
		const progressoDesacelerado = 1 - Math.pow(2, -10 * progresso);
		const valorDoMomento = valorInicial + (valorFinal - valorInicial) * progressoDesacelerado;

		exibirValorDoSaldo(progresso >= 1 ? valorFinal : valorDoMomento);

		if (progresso < 1) {
			requestAnimationFrame(avancarContagem);
		}
	};

	requestAnimationFrame(avancarContagem);

	setTimeout(() => {
		if (numeroDestaContagem === numeroDaContagemAtual) {
			exibirValorDoSaldo(valorFinal);
		}
	}, atraso + duracao + folgaParaGarantirValorFinal);
}

function ativarAnimacoes() {
	const { animate: animar, inView: quandoAparecer, stagger: escalonar } = bibliotecaDeAnimacao;

	window.motionReady = true;

	tituloPrincipal.classList.add('realce-pendente');

	animar('.cabecalho > *', { opacity: [0, 1], y: [-12, 0] }, {
		delay: escalonar(0.06, { startDelay: 0.1 }),
		duration: duracaoDasEntradas,
		ease: curvaDeDesaceleracao,
	});

	animar(cartaoDoExtrato, { opacity: [0, 1], y: [40, 0] }, {
		duration: duracaoDasEntradas,
		ease: curvaDeDesaceleracao,
	});

	animar(textosDasLinhasDoTitulo, { y: ['110%', '0%'] }, {
		delay: escalonar(0.12, { startDelay: 0.3 }),
		duration: duracaoDaRevelacaoDosTitulos,
		ease: curvaDeDesaceleracao,
	}).then(() => {
		tituloPrincipal.classList.remove('realce-pendente');
		tituloPrincipal.classList.add('realce-ativo');
	});

	animar('.texto-de-apoio, .losango, .extrato', { opacity: [0, 1], y: [distanciaDasEntradas, 0] }, {
		delay: escalonar(intervaloEntreEntradas, { startDelay: 0.6 }),
		duration: duracaoDasEntradas,
		ease: curvaDeDesaceleracao,
	});

	blocosQueAparecemAoRolar.forEach((bloco) => {
		quandoAparecer(bloco, () => revelarBloco(bloco), { amount: 0.15 });
	});

	numerosQueContam.forEach((numero) => {
		quandoAparecer(numero, () => contarNumero(numero), { amount: 0.6 });
	});
}

function revelarBloco(bloco) {
	const { animate: animar } = bibliotecaDeAnimacao;
	const partesDoBloco = Array.from(bloco.children);
	const blocoDeDocumentos = bloco.classList.contains('documentos');

	partesDoBloco.forEach((parte, posicao) => {
		const atraso = posicao * intervaloEntreEntradas;

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
	});
}

function contarNumero(numero) {
	const valorFinal = Number(numero.dataset.valor);
	const casasDecimais = Number(numero.dataset.casasDecimais);
	const prefixo = numero.dataset.prefixo ?? '';
	const sufixo = numero.dataset.sufixo ?? '';

	const formatadorDoNumero = new Intl.NumberFormat('pt-BR', {
		minimumFractionDigits: casasDecimais,
		maximumFractionDigits: casasDecimais,
	});

	const escreverNumero = (valor) => {
		numero.textContent = `${prefixo}${formatadorDoNumero.format(valor)}${sufixo}`;
	};

	bibliotecaDeAnimacao.animate(0, valorFinal, {
		duration: duracaoDaContagemDosNumeros,
		ease: curvaDeDesaceleracao,
		onUpdate: escreverNumero,
		onComplete: () => escreverNumero(valorFinal),
	});
}