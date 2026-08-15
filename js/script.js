/*==================================================
CORPOFITNESS PREMIUM 2026
SCRIPT PRINCIPAL — REFORMULADO (FRAMER-LEVEL + HIGH-END)
==================================================*/

// Global helper: split `.word` nodes into per-character spans for animated titles
function runSplitTitle() {
    const splitTitleEl = document.querySelector('.split-title');
    if (!splitTitleEl) return;
    const words = splitTitleEl.querySelectorAll('.word');
    let totalCharIndex = 0;

    words.forEach((word) => {
        const text = word.textContent.trim();
        word.innerHTML = '';

        [...text].forEach((char) => {
            const span = document.createElement('span');
            span.classList.add('char');
            span.textContent = char;
            span.style.animationDelay = `${(totalCharIndex * 0.035) + 0.1}s`;
            word.appendChild(span);
            totalCharIndex++;
        });
    });
}

function buildHeroTitle(line1, line2) {
    if (!line1 || !line1.trim() || !line2 || !line2.trim()) return null;
    const formatLine = (text) => text.trim().split(/\s+/).filter(Boolean).map((word) => `<span class="word">${word}</span>`).join(' ');
    return `<span class="hero-line">${formatLine(line1)}</span><span class="hero-line">${formatLine(line2)}</span>`;
}

document.addEventListener("DOMContentLoaded", () => {

    /*==================================================
    1. LOADER PREMIUM
    ==================================================*/
    const loader = document.getElementById("loader");

    if (loader) {
        // Delay mínimo para percepção de qualidade
        setTimeout(() => {
            loader.style.opacity = "0";
            loader.style.visibility = "hidden";
            loader.style.pointerEvents = "none";

            // Remove do DOM após a transição (performance)
            setTimeout(() => {
                if (loader.parentNode) {
                    loader.parentNode.removeChild(loader);
                }
            }, 800);
        }, 1400);
    }

    /*==================================================
    2. HEADER SCROLL + GLASS EFFECT
    ==================================================*/
    const header = document.querySelector("header");

    if (header) {
        const handleHeaderScroll = () => {
            if (window.scrollY > 60) {
                header.classList.add("scrolled");
            } else {
                header.classList.remove("scrolled");
            }
        };

        window.addEventListener("scroll", handleHeaderScroll, { passive: true });
        handleHeaderScroll(); // estado inicial
    }

    /*==================================================
    3. MENU MOBILE PREMIUM
    ==================================================*/
    const menuBtn = document.querySelector(".menu-mobile");
    const nav = document.querySelector("nav");

    if (menuBtn && nav) {
        const icon = menuBtn.querySelector("i");

        const closeMenu = () => {
            nav.classList.remove("active");
            if (icon) {
                icon.classList.remove("fa-xmark");
                icon.classList.add("fa-bars");
            }
            document.body.style.overflow = "";
        };

        const openMenu = () => {
            nav.classList.add("active");
            if (icon) {
                icon.classList.remove("fa-bars");
                icon.classList.add("fa-xmark");
            }
            document.body.style.overflow = "hidden";
        };

        menuBtn.addEventListener("click", () => {
            if (nav.classList.contains("active")) {
                closeMenu();
            } else {
                openMenu();
            }
        });

        // Fecha ao clicar em qualquer link
        document.querySelectorAll("nav a").forEach(link => {
            link.addEventListener("click", () => {
                closeMenu();
            });
        });

        // Fecha com tecla ESC
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && nav.classList.contains("active")) {
                closeMenu();
            }
        });
    }

    /*==================================================
    4. SCROLL SUAVE REFINADO
    ==================================================*/
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener("click", function (e) {
            const targetId = this.getAttribute("href");

            if (targetId === "#" || targetId === "") return;

            const destino = document.querySelector(targetId);

            if (destino) {
                e.preventDefault();

                const headerHeight = header ? header.offsetHeight : 80;
                const targetPosition = destino.getBoundingClientRect().top + window.pageYOffset - headerHeight - 12;

                window.scrollTo({
                    top: targetPosition,
                    behavior: "smooth"
                });
            }
        });
    });

    /*==================================================
    5. BOTÃO VOLTAR AO TOPO
    ==================================================*/
    const btnTopo = document.getElementById("topo");

    if (btnTopo) {
        const toggleBtnTopo = () => {
            if (window.scrollY > 480) {
                btnTopo.style.display = "flex";
                btnTopo.style.opacity = "1";
            } else {
                btnTopo.style.opacity = "0";
                setTimeout(() => {
                    if (window.scrollY <= 480) {
                        btnTopo.style.display = "none";
                    }
                }, 300);
            }
        };

        window.addEventListener("scroll", toggleBtnTopo, { passive: true });

        btnTopo.addEventListener("click", () => {
            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });
        });
    }

    /*==================================================
    6. AOS ANIMATION (CONFIGURAÇÃO PREMIUM)
    ==================================================*/
    if (typeof AOS !== "undefined") {
        AOS.init({
            duration: 900,
            once: true,
            offset: 70,
            easing: "ease-out-cubic",
            disable: false
        });
    }

    /*==================================================
    7. CONTADORES ANIMADOS (SMOOTH & PRECISE)
    ==================================================*/
    const numeros = document.querySelectorAll(".numero h2");
    let contadorExecutado = false;

    function animarNumero(elemento, valorFinal) {
        const duracao = 1800; // ms
        const inicio = performance.now();
        const valorInicial = 0;

        const atualizar = (tempoAtual) => {
            const progresso = Math.min((tempoAtual - inicio) / duracao, 1);
            const ease = progresso === 1 ? 1 : 1 - Math.pow(2, -10 * progresso);
            const valorAtual = Math.floor(valorInicial + (valorFinal - valorInicial) * ease);

            elemento.innerText = valorAtual.toLocaleString("pt-BR") + (valorFinal >= 100 ? "+" : "");

            if (progresso < 1) {
                requestAnimationFrame(atualizar);
            } else {
                if (valorFinal === 98) {
                    elemento.innerText = "98%";
                } else if (valorFinal === 12) {
                    elemento.innerText = "12";
                } else {
                    elemento.innerText = valorFinal.toLocaleString("pt-BR") + "+";
                }
            }
        };

        requestAnimationFrame(atualizar);
    }

    function iniciarContadores() {
        if (contadorExecutado) return;
        contadorExecutado = true;

        numeros.forEach(numero => {
            const textoOriginal = numero.innerText;
            const valorFinal = parseInt(textoOriginal.replace(/\D/g, "")) || 0;
            animarNumero(numero, valorFinal);
        });
    }

    const areaContador = document.querySelector(".contador");

    if (areaContador) {
        const observerContador = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    iniciarContadores();
                    observerContador.disconnect();
                }
            });
        }, {
            threshold: 0.35
        });

        observerContador.observe(areaContador);
    }

    /*==================================================
    8. FAQ — respostas sempre abertas
    ==================================================*/
    const faqCards = document.querySelectorAll('#faq .faq-card');

    faqCards.forEach(card => {
        const body = card.querySelector('.faq-card-body');
        if (!body) return;
        body.classList.add('open');
        body.style.maxHeight = 'none';
    });

    /*==================================================
    9. SWIPER DEPOIMENTOS E MODALIDADES
    ==================================================*/
    if (typeof Swiper !== "undefined") {
        const swiperDepoimentos = document.querySelector(".swiper-depoimentos");
        if (swiperDepoimentos) {
            new Swiper(".swiper-depoimentos", {
                slidesPerView: 1,
                spaceBetween: 28,
                loop: false,
                grabCursor: true,
                autoplay: {
                    delay: 5500,
                    disableOnInteraction: false,
                    pauseOnMouseEnter: true
                },
                pagination: {
                    el: ".swiper-depoimentos .swiper-pagination",
                    clickable: true,
                    dynamicBullets: true
                },
                breakpoints: {
                    640: {
                        slidesPerView: 1.2,
                        spaceBetween: 24
                    },
                    768: {
                        slidesPerView: 2,
                        spaceBetween: 28
                    },
                    1100: {
                        slidesPerView: 3,
                        spaceBetween: 32
                    }
                }
            });
        }

        const swiperModalidades = document.querySelector(".swiper-modalidades");
        if (swiperModalidades) {
            new Swiper(".swiper-modalidades", {
                slidesPerView: 1,
                spaceBetween: 24,
                loop: false,
                grabCursor: true,
                autoplay: {
                    delay: 6500,
                    disableOnInteraction: false,
                    pauseOnMouseEnter: true
                },
                pagination: {
                    el: ".swiper-modalidades .swiper-pagination",
                    clickable: true,
                    dynamicBullets: true
                },
                breakpoints: {
                    640: {
                        slidesPerView: 1.05,
                        spaceBetween: 20
                    },
                    768: {
                        slidesPerView: 2,
                        spaceBetween: 24
                    },
                    1100: {
                        slidesPerView: 3,
                        spaceBetween: 28
                    }
                }
            });
        }
    }

    /*==================================================
    10. REVELAÇÃO AO ROLAR (ENHANCED)
    ==================================================*/
    const elementosReveal = document.querySelectorAll(
        ".card, .plano, .numero, .professor, .modalidade, .depoimento, .galeria-item"
    );

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("slideUp");
                entry.target.style.opacity = "1";
                revealObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.12,
        rootMargin: "0px 0px -40px 0px"
    });

    elementosReveal.forEach(el => {
        el.style.opacity = "0";
        revealObserver.observe(el);
    });

    /*==================================================
    11. WHATSAPP FLUTUANTE (LINK CORRIGIDO + MENSAGEM)
    ==================================================*/
    const whatsapp = document.querySelector(".whatsapp");

    if (whatsapp) {
        const numeroWhatsApp = "5582996786183";
        const mensagemPadrao = encodeURIComponent(
            "Olá! Vim pelo site da Corpofitness Premium e gostaria de mais informações sobre planos e matrícula."
        );

        whatsapp.href = `https://wa.me/${numeroWhatsApp}?text=${mensagemPadrao}`;
        whatsapp.target = "_blank";
        whatsapp.rel = "noopener noreferrer";
    }

    /*==================================================
    14. FORMULÁRIO DE CONTATO (LOCALSTORAGE)
    ==================================================*/
    const formContatoSite = document.getElementById("formContatoSite");

    if (formContatoSite) {
        formContatoSite.addEventListener("submit", (e) => {
            e.preventDefault();

            const nome = document.getElementById("contatoNome")?.value.trim();
            const email = document.getElementById("contatoEmail")?.value.trim();
            const tel = document.getElementById("contatoTel")?.value.trim();
            const msg = document.getElementById("contatoMsg")?.value.trim();

            if (!nome || !email || !tel || !msg) {
                alert("Por favor, preencha todos os campos.");
                return;
            }

            const contatos = JSON.parse(localStorage.getItem("corpofitness_contatos")) || [];

            contatos.unshift({
                nome,
                email,
                tel,
                msg,
                data: new Date().toISOString()
            });

            localStorage.setItem("corpofitness_contatos", JSON.stringify(contatos));

            const btn = formContatoSite.querySelector("button");
            const textoOriginal = btn.innerHTML;

            btn.innerHTML = `<i class="fas fa-check"></i> Mensagem Enviada!`;
            btn.style.background = "#22c55e";
            btn.disabled = true;

            setTimeout(() => {
                btn.innerHTML = textoOriginal;
                btn.style.background = "";
                btn.disabled = false;
                formContatoSite.reset();
            }, 2800);
        });
    }

    /*==================================================
    17. GALERIA DINÂMICA
    ==================================================*/
    function carregarGaleriaNoSite() {
        const container = document.getElementById("containerGaleriaSite");
        if (!container) return;

        let fotos = [];

        try {
            const dadosSalvos = localStorage.getItem("corpofitness_galeria");
            if (dadosSalvos) {
                fotos = JSON.parse(dadosSalvos);
            }
        } catch (e) {
            console.error("Erro ao ler galeria do localStorage:", e);
        }

        if (!fotos || fotos.length === 0) {
            fotos = [
                {
                    titulo: "Área de Musculação",
                    categoria: "Estrutura",
                    img: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=800"
                },
                {
                    titulo: "Espaço Cardio",
                    categoria: "Equipamentos",
                    img: "https://images.unsplash.com/photo-1576678927484-cc909957088c?q=80&w=800"
                },
                {
                    titulo: "Sala de Aulas Coletivas",
                    categoria: "Aulas",
                    img: "https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=800"
                },
                {
                    titulo: "Ambiente Climatizado",
                    categoria: "Estrutura",
                    img: "https://images.unsplash.com/photo-1571902943202-507c2746457b?q=80&w=800"
                }
            ];
        }

        container.innerHTML = "";

        fotos.forEach((item, index) => {
            const imagemSrc = item.img || item.foto || "https://via.placeholder.com/600x400?text=Sem+Imagem";
            const titulo = item.titulo || "Academia";
            const categoria = item.categoria || "Corpofitness";

            container.innerHTML += `
                <div class="galeria-item" data-aos="fade-up" data-aos-delay="${index * 60}">
                    <img src="${imagemSrc}" 
                         alt="${titulo}" 
                         loading="lazy"
                         onerror="this.onerror=null; this.src='https://via.placeholder.com/600x400?text=Erro+ao+Carregar';">
                    <div class="galeria-overlay">
                        <span class="cat-tag">${categoria}</span>
                        <h4>${titulo}</h4>
                    </div>
                </div>
            `;
        });
    }

    /*==================================================
    18. ACTIVE NAV LINK ON SCROLL (EXTRA PREMIUM)
    ==================================================*/
    const sections = document.querySelectorAll("section[id]");
    const navLinks = document.querySelectorAll("nav a");

    function atualizarLinkAtivo() {
        const scrollPos = window.scrollY + 140;

        sections.forEach(section => {
            const top = section.offsetTop;
            const height = section.offsetHeight;
            const id = section.getAttribute("id");

            if (scrollPos >= top && scrollPos < top + height) {
                navLinks.forEach(link => {
                    link.classList.remove("active");
                    if (link.getAttribute("href") === `#${id}`) {
                        link.classList.add("active");
                    }
                });
            }
        });
    }

    window.addEventListener("scroll", atualizarLinkAtivo, { passive: true });

});

// ==================================================
// MICRO-INTERAÇÕES: TILT 3D NOS CARDS & MAGNETIC BUTTONS
// ==================================================
document.addEventListener('DOMContentLoaded', () => {
    const tiltElements = document.querySelectorAll('.card, .plano, .modalidade, .professor');

    tiltElements.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;

            const rotateX = (-y / rect.height) * 12;
            const rotateY = (x / rect.width) * 12;

            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px)`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)';
        });
    });

    const magneticBtns = document.querySelectorAll('.btn-primary, .btn-header, .whatsapp');

    magneticBtns.forEach(btn => {
        btn.addEventListener('mousemove', (e) => {
            const rect = btn.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;

            btn.style.transform = `translate3d(${x * 0.25}px, ${y * 0.25}px, 0) scale(1.03)`;
        });

        btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'translate3d(0, 0, 0) scale(1)';
        });
    });
});

// ==================================================
// FEEDBACK & NOTIFICAÇÃO TOAST NO FORMULÁRIO DE CONTATO
// ==================================================
function exibirToastFeedback(mensagem, tipo = 'sucesso') {
    let toast = document.getElementById('toast-feedback');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast-feedback';
        toast.style.cssText = `
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%) translateY(100px);
            background: rgba(8, 19, 31, 0.9);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(0, 102, 255, 0.4);
            color: #fff;
            padding: 16px 32px;
            border-radius: 50px;
            font-size: 0.95rem;
            font-weight: 600;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(0, 102, 255, 0.3);
            z-index: 100000;
            transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.5s ease;
            opacity: 0;
            pointer-events: none;
        `;
        document.body.appendChild(toast);
    }

    toast.textContent = mensagem;
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(100px)';
    }, 4000);
}

document.addEventListener('DOMContentLoaded', () => {
    const formContato = document.getElementById('formContatoSite');
    if (formContato) {
        formContato.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const btnSubmit = formContato.querySelector('button[type="submit"]');
            const textoOriginal = btnSubmit.innerHTML;

            btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
            btnSubmit.classList.add('btn-loading'); // Add loading class
            btnSubmit.style.pointerEvents = 'none';

            setTimeout(() => {
                exibirToastFeedback('✨ Sua mensagem foi enviada! Entraremos em contato em breve.');
                formContato.reset();
                btnSubmit.innerHTML = textoOriginal;
                btnSubmit.style.pointerEvents = 'all';
                btnSubmit.classList.remove('btn-loading'); // Remove loading class
            }, 1200);
        });
    }
});

// ==================================================
// PARALLAX NO HERO & DELEGAÇÃO DO LIGHTBOX
// ==================================================
window.addEventListener('scroll', () => {
    const scrolled = window.scrollY;
    
    const heroVideo = document.querySelector('.hero video');
    const heroContent = document.querySelector('.hero-content');

    if (heroVideo && scrolled < window.innerHeight) {
        heroVideo.style.transform = `scale(1.05) translateY(${scrolled * 0.25}px)`;
    }
    if (heroContent && scrolled < window.innerHeight) {
        heroContent.style.transform = `translateY(${scrolled * 0.15}px)`;
        heroContent.style.opacity = 1 - (scrolled / (window.innerHeight * 0.8));
    }
});

document.addEventListener('click', (e) => {
    const galeriaItem = e.target.closest('.galeria-item');
    if (galeriaItem) {
        const img = galeriaItem.querySelector('img');
        const caption = galeriaItem.querySelector('h4')?.innerText || '';
        
        const lightbox = document.getElementById('lightbox');
        const lightboxImg = document.getElementById('lightbox-img');
        const lightboxCaption = document.getElementById('lightbox-caption');

        if (lightbox && img) {
            lightboxImg.src = img.src;
            lightboxCaption.innerText = caption;
            lightbox.classList.add('active');
        }
    }

    if (e.target.matches('.lightbox, .lightbox-close')) {
        const lightbox = document.getElementById('lightbox');
        if (lightbox) lightbox.classList.remove('active');
    }
});

// ==================================================
// PERFORMANCE ENGINE & CORE WEB VITALS OPTIMIZATIONS
// ==================================================
function throttle(func, limit = 16) {
    let inThrottle;
    return function (...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    };
}

function debounce(func, delay = 200) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

document.addEventListener('DOMContentLoaded', () => {
    const observerOptions = {
        root: null,
        rootMargin: '50px 0px',
        threshold: 0.15
    };

    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const elementsToAnimate = document.querySelectorAll('.card, .plano, .modalidade, .professor, .numero, .titulo');
    elementsToAnimate.forEach(el => revealObserver.observe(el));
});

const onScrollPerformanceHandler = throttle(() => {
    const header = document.querySelector('header');
    const topoBtn = document.getElementById('topo');
    const scrolled = window.scrollY;

    if (header) {
        if (scrolled > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    }

    if (topoBtn) {
        if (scrolled > 400) {
            topoBtn.style.display = 'flex';
        } else {
            topoBtn.style.display = 'none';
        }
    }
}, 16);

window.addEventListener('scroll', onScrollPerformanceHandler, { passive: true });

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('⚡ SW Ativado com sucesso:', reg.scope))
            .catch(err => console.warn('⚠️ Falha ao registrar SW:', err));
    });
}

// ==================================================
// ACESSIBILIDADE E NAVEGAÇÃO POR TECLADO
// ==================================================
document.addEventListener('DOMContentLoaded', () => {
    const btnMenuMobile = document.getElementById('btnMenuMobile');
    const navMenu = document.getElementById('navMenu');

    if (btnMenuMobile && navMenu) {
        btnMenuMobile.addEventListener('click', () => {
            const isExpanded = btnMenuMobile.getAttribute('aria-expanded') === 'true';
            btnMenuMobile.setAttribute('aria-expanded', !isExpanded);
            navMenu.classList.toggle('active');
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const lightbox = document.getElementById('lightbox');
            if (lightbox && lightbox.classList.contains('active')) {
                lightbox.classList.remove('active');
                const lastFocused = document.querySelector('.galeria-item:focus, .galeria-item img:focus');
                if (lastFocused) lastFocused.focus();
            }
        }
    });
});

// ==================================================
// MÓDULO DE VALIDAÇÃO, MÁSCARA E CONVERSÃO WHATSAPP
// ==================================================
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('formContatoSite');
    if (!form) return;

    const inputNome = document.getElementById('contatoNome');
    const inputEmail = document.getElementById('contatoEmail');
    const inputTel = document.getElementById('contatoTel');
    const inputMsg = document.getElementById('contatoMsg');
    const charCount = document.getElementById('charCount');
    const toast = document.getElementById('toastSuccess');
    const honeypot = document.getElementById('website_hp');

    const whatsappNumero = "5582996786183";

    inputTel.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, "");
        if (value.length > 11) value = value.slice(0, 11);

        if (value.length > 10) {
            value = value.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
        } else if (value.length > 5) {
            value = value.replace(/^(\d{2})(\d{4})(\d{0,4})$/, "($1) $2-$3");
        } else if (value.length > 2) {
            value = value.replace(/^(\d{2})(\d{0,5})$/, "($1) $2");
        } else if (value.length > 0) {
            value = value.replace(/^(\d*)$/, "($1");
        }
        
        e.target.value = value;
        validarCampo(inputTel, value.replace(/\D/g, "").length >= 10);
    });

    inputMsg.addEventListener('input', () => {
        const currentLength = inputMsg.value.length;
        charCount.textContent = currentLength;

        const counterContainer = charCount.parentElement;
        if (currentLength >= 280) {
            counterContainer.className = "char-counter limit-reached";
        } else if (currentLength >= 220) {
            counterContainer.className = "char-counter limit-near";
        } else {
            counterContainer.className = "char-counter";
        }

        validarCampo(inputMsg, currentLength >= 10);
    });

    inputNome.addEventListener('input', () => {
        validarCampo(inputNome, inputNome.value.trim().length >= 3);
    });

    inputEmail.addEventListener('input', () => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        validarCampo(inputEmail, emailRegex.test(inputEmail.value.trim()));
    });

    function validarCampo(element, isValido) {
        const group = element.closest('.form-group');
        if (!group) return;

        if (isValido) {
            group.classList.remove('is-invalid');
            group.classList.add('is-valid');
        } else {
            group.classList.remove('is-valid');
            group.classList.add('is-invalid');
        }
    }

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        if (honeypot && honeypot.value !== "") {
            console.warn("Spam detectado via honeypot.");
            return;
        }

        const isNomeValid = inputNome.value.trim().length >= 3;
        const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inputEmail.value.trim());
        const isTelValid = inputTel.value.replace(/\D/g, "").length >= 10;
        const isMsgValid = inputMsg.value.trim().length >= 10;

        validarCampo(inputNome, isNomeValid);
        validarCampo(inputEmail, isEmailValid);
        validarCampo(inputTel, isTelValid);
        validarCampo(inputMsg, isMsgValid);

        if (!isNomeValid || !isEmailValid || !isTelValid || !isMsgValid) {
            return;
        }

        toast.classList.add('show');

        const textoWhatsApp = 
`*NOVO CONTATO VIA SITE - CORPOFITNESS*
----------------------------------
Nome: ${inputNome.value.trim()}
E-mail: ${inputEmail.value.trim()}
Telefone: ${inputTel.value.trim()}
----------------------------------
Mensagem:
${inputMsg.value.trim()}`;

        const urlWhatsApp = `https://wa.me/${whatsappNumero}?text=${encodeURIComponent(textoWhatsApp)}`;

        setTimeout(() => {
            window.open(urlWhatsApp, '_blank');
            toast.classList.remove('show');
            form.reset();
            
            document.querySelectorAll('.form-group').forEach(g => {
                g.classList.remove('is-valid', 'is-invalid');
            });
            charCount.textContent = "0";
        }, 1800);
    });
});

// ==================================================
// MÓDULO HERO: PARALLAX, SPLIT TEXT, COUNTERS & CANVAS PARTICLES
// ==================================================
document.addEventListener('DOMContentLoaded', () => {
    // initial run for hero split title animation
    runSplitTitle();

    const counterElements = document.querySelectorAll('.counter-number');

    const counterObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el = entry.target;
                const target = parseInt(el.getAttribute('data-target'), 10);
                const suffix = el.getAttribute('data-suffix') || '';
                const duration = 2000;
                const stepTime = 16;
                const steps = duration / stepTime;
                const increment = target / steps;
                let current = 0;

                const timer = setInterval(() => {
                    current += increment;
                    if (current >= target) {
                        el.textContent = target.toLocaleString('pt-BR') + suffix;
                        clearInterval(timer);
                    } else {
                        el.textContent = Math.floor(current).toLocaleString('pt-BR') + suffix;
                    }
                }, stepTime);

                observer.unobserve(el);
            }
        });
    }, { threshold: 0.4 });

    counterElements.forEach(el => counterObserver.observe(el));

    const heroVideo = document.querySelector('.hero-video-parallax');
    const heroOverlay = document.querySelector('.hero-overlay-parallax');
    const heroSection = document.querySelector('.hero');

    if (heroVideo && heroSection) {
        let latestKnownScrollY = 0;
        let ticking = false;

        window.addEventListener('scroll', () => {
            latestKnownScrollY = window.scrollY;
            if (!ticking) {
                requestAnimationFrame(() => {
                    const heroHeight = heroSection.offsetHeight;
                    if (latestKnownScrollY <= heroHeight) {
                        const translateY = latestKnownScrollY * 0.38;
                        heroVideo.style.transform = `translate3d(0, ${translateY}px, 0)`;
                        if (heroOverlay) {
                            heroOverlay.style.transform = `translate3d(0, ${translateY * 0.2}px, 0)`;
                        }
                    }
                    ticking = false;
                });
                ticking = true;
            }
        });

        // Ensure looping on browsers that sometimes break loop; provide mobile/slow fallback
        const heroPoster = document.querySelector('.hero-poster');
        if (heroVideo) {
            try {
                heroVideo.addEventListener('ended', () => {
                    try { heroVideo.currentTime = 0; heroVideo.play(); } catch (e) {}
                });

                heroVideo.addEventListener('error', () => {
                    heroVideo.style.display = 'none';
                    if (heroPoster) heroPoster.style.display = 'block';
                });

                const isMobile = window.matchMedia('(max-width: 768px)').matches || /Mobi|Android/i.test(navigator.userAgent || '');
                // only treat as mobile to avoid removing sources on some desktops
                if (isMobile) {
                    if (heroPoster) heroPoster.style.display = 'block';
                    try { heroVideo.pause(); } catch (e) {}
                    // remove sources to avoid heavy download on mobile
                    heroVideo.removeAttribute('src');
                    heroVideo.querySelectorAll && heroVideo.querySelectorAll('source').forEach(s => s.removeAttribute('src'));
                    try { heroVideo.load(); } catch (e) {}
                }
            } catch (e) {
                console.error('Hero video handling error', e);
            }
        }
    }

    const canvas = document.getElementById('heroParticlesCanvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        let width = canvas.width = canvas.offsetWidth;
        let height = canvas.height = canvas.offsetHeight;

        window.addEventListener('resize', () => {
            width = canvas.width = canvas.offsetWidth;
            height = canvas.height = canvas.offsetHeight;
        });

        const particles = Array.from({ length: 45 }, () => ({
            x: Math.random() * width,
            y: Math.random() * height,
            radius: Math.random() * 2 + 0.5,
            vx: (Math.random() - 0.5) * 0.4,
            vy: (Math.random() - 0.5) * 0.4,
            alpha: Math.random() * 0.5 + 0.2
        }));

        function drawParticles() {
            ctx.clearRect(0, 0, width, height);

            particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;

                if (p.x < 0) p.x = width;
                if (p.x > width) p.x = 0;
                if (p.y < 0) p.y = height;
                if (p.y > height) p.y = 0;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(77, 163, 255, ${p.alpha})`;
                ctx.shadowBlur = 8;
                ctx.shadowColor = 'rgba(0, 102, 255, 0.8)';
                ctx.fill();
            });

            requestAnimationFrame(drawParticles);
        }

        drawParticles();
    }
});

// ==================================================
// TOGGLE MENSAL / ANUAL DE PREÇOS
// ==================================================
const togglePricing = document.getElementById('togglePricing');
const labelMensal = document.getElementById('labelMensal');
const labelAnual = document.getElementById('labelAnual');
const priceVals = document.querySelectorAll('.price-val');

if (togglePricing) {
    togglePricing.addEventListener('click', () => {
        const isAnual = togglePricing.classList.toggle('active');
        togglePricing.setAttribute('aria-checked', isAnual);

        labelMensal.classList.toggle('active', !isAnual);
        labelAnual.classList.toggle('active', isAnual);

        priceVals.forEach(priceEl => {
            const valMensal = priceEl.getAttribute('data-mensal');
            const valAnual = priceEl.getAttribute('data-anual');

            priceEl.style.opacity = '0';
            setTimeout(() => {
                priceEl.textContent = isAnual ? valAnual : valMensal;
                priceEl.style.opacity = '1';
            }, 180);
        });
    });
}

// --- 1. STICKY CTA MOBILE CONTROL ---
const stickyCta = document.getElementById('stickyCtaMobile');
window.addEventListener('scroll', () => {
    if (window.scrollY > 400 && stickyCta) {
        stickyCta.classList.add('show');
    } else if (stickyCta) {
        stickyCta.classList.remove('show');
    }
});

// --- 2. EXIT INTENT MODAL CONTROL ---
const exitModal = document.getElementById('exitModal');
const closeExitModal = document.getElementById('closeExitModal');
let hasShownExitModal = false;

document.addEventListener('mouseleave', (e) => {
    if (e.clientY < 0 && !hasShownExitModal && exitModal) {
        hasShownExitModal = true;
        exitModal.classList.add('active');
    }
});

if (closeExitModal) {
    closeExitModal.addEventListener('click', () => {
        exitModal.classList.remove('active');
    });
}

// SIMULAÇÃO DE PROVA SOCIAL FLUTUANTE
const socialProofs = [
    "Marcos A. acabou de se matricular no Plano VIP Black!",
    "Juliana M. agendou uma aula experimental.",
    "Carlos H. renovou o Plano Duo."
];

function mostrarProvaSocial() {
    const msg = socialProofs[Math.floor(Math.random() * socialProofs.length)];
    const toast = document.createElement('div');
    toast.className = 'social-proof-toast';
    toast.innerHTML = `<i class="fas fa-check-circle"></i> ${msg}`;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 4500);
}

// Desativado: prova social automática (solicitado pelo usuário)
// setInterval(mostrarProvaSocial, 25000);

// ==================================================
// LÓGICA DO CLIENTE - INTEGRADA AO SUPABASE
// ==================================================
document.addEventListener('DOMContentLoaded', () => {
    carregarPlanosSite();
    inicializarFormContato();
});

async function carregarPlanosSite() {
    const container = document.querySelector('.planos');
    if (!container) return;

    const { data: planos, error } = await _supabase
        .from('planos')
        .select('*')
        .order('ordem', { ascending: true });

    if (error) {
        console.error('Erro ao buscar planos do Supabase:', error);
        return;
    }

    if (!planos || planos.length === 0) return;

    container.innerHTML = '';

    planos.forEach((p, index) => {
        const eDestaque = p.destaque === 'sim';
        const itensHTML = p.itens ? p.itens.map(i => `<li>${i}</li>`).join('') : '';

        const planoCard = document.createElement('div');
        planoCard.className = `plano ${eDestaque ? 'destaque pulse-glow' : ''}`;
        planoCard.setAttribute('data-aos', 'fade-up');
        planoCard.setAttribute('data-aos-delay', (index * 100).toString());

        planoCard.innerHTML = `
            ${p.badge ? `<div class="badge-shimmer"><i class="fas fa-fire"></i> ${p.badge}</div>` : ''}
            <h3>${p.nome}</h3>
            <p class="plano-desc">Acesso completo e suporte profissional.</p>
            <div class="valor">
                <small>R$</small> <span>${p.valor}</span> <small>${p.sufixo || '/mês'}</small>
            </div>
            <ul>${itensHTML}</ul>
            <a href="#contato" class="${eDestaque ? 'btn-primary' : 'btn-plano'}" ${eDestaque ? 'style="width: 100%; justify-content: center;"' : ''}>
                Matricular Agora
            </a>
        `;

        container.appendChild(planoCard);
    });
}

function inicializarFormContato() {
    const form = document.getElementById('formContato');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nome = document.getElementById('nome')?.value;
        const email = document.getElementById('email')?.value;
        const tel = document.getElementById('whatsapp')?.value || document.getElementById('tel')?.value;
        const msg = document.getElementById('mensagem')?.value;

        const btnSubmit = form.querySelector('button[type="submit"]');
        const txtOriginal = btnSubmit ? btnSubmit.innerHTML : 'Enviar';
        if (btnSubmit) btnSubmit.innerHTML = 'Enviando...';

        const { error } = await _supabase.from('contatos').insert([{
            nome: nome,
            email: email,
            tel: tel,
            msg: msg
        }]);

        if (btnSubmit) btnSubmit.innerHTML = txtOriginal;

        if (!error) {
            alert('Mensagem enviada com sucesso! Entraremos em contato em breve.');
            form.reset();
        } else {
            console.error('Erro ao salvar contato:', error);
            alert('Falha ao enviar mensagem. Tente novamente mais tarde.');
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {

    async function carregarHero() {
        const { data: hero } = await _supabase.from('hero_config').select('*').eq('id', 1).single();
        if (hero) {
            const h1Title = document.querySelector('.hero-content h1') || document.querySelector('#hero h1');
            const subTitle = document.querySelector('.hero-content p') || document.querySelector('#hero p');
            const heroVideo = document.querySelector('#hero video') || document.querySelector('.hero-video');

                if (h1Title && hero.t1) {
                const newHTML = buildHeroTitle(hero.t1, hero.t2);
                if (newHTML && h1Title.innerHTML.trim() !== newHTML.trim()) {
                    h1Title.classList.add('split-title');
                    h1Title.innerHTML = newHTML;
                    runSplitTitle();
                }
            }
            if (subTitle) subTitle.textContent = hero.sub;
            if (heroVideo && hero.video) {
                // set source if element has <source>, otherwise set src and try to play
                const sourceEl = heroVideo.querySelector && heroVideo.querySelector('source');
                if (sourceEl) {
                    sourceEl.src = hero.video;
                } else {
                    try { heroVideo.src = hero.video; } catch(e){}
                }
                try { heroVideo.load(); heroVideo.play().catch(()=>{}); } catch(e){}
            }
        }
    }

    async function carregarPlanos() {
        const { data: planos } = await _supabase.from('planos').select('*').order('ordem', { ascending: true });
        const container = document.querySelector('#planos .planos-grid') || document.querySelector('.pricing-container');
        
        if (container && planos && planos.length > 0) {
            container.innerHTML = '';
            planos.forEach(p => {
                const itensHTML = (p.itens || []).map(item => `<li><i class="fas fa-check"></i> ${item}</li>`).join('');
                const destaqueClass = p.destaque === 'sim' ? 'plano-card destaque' : 'plano-card';

                container.innerHTML += `
                    <div class="${destaqueClass}" data-aos="fade-up">
                        ${p.badge ? `<span class="badge-destaque">${p.badge}</span>` : ''}
                        <h3>${p.nome}</h3>
                        <div class="preco">
                            <span class="moeda">R$</span>
                            <span class="valor">${p.valor.replace('R$', '').trim()}</span>
                            <span class="sufixo">${p.sufixo}</span>
                        </div>
                        <ul class="beneficios-list">
                            ${itensHTML}
                        </ul>
                        <a href="#contato" class="btn btn-primary">Matricular-se</a>
                    </div>
                `;
            });
        }
    }

    async function carregarGaleria() {
        const { data: fotos } = await _supabase.from('galeria').select('*').order('ordem', { ascending: true });
        const container = document.querySelector('#galeria .galeria-grid') || document.querySelector('.gallery-container');

        if (container && fotos && fotos.length > 0) {
            container.innerHTML = '';
            fotos.forEach(f => {
                container.innerHTML += `
                    <div class="galeria-item" data-categoria="${f.categoria.toLowerCase()}" data-aos="zoom-in">
                        <img src="${f.img}" alt="${f.titulo}" loading="lazy">
                        <div class="galeria-overlay">
                            <h4>${f.titulo}</h4>
                            <span>${f.categoria}</span>
                        </div>
                    </div>
                `;
            });
        }
    }

    async function carregarProfessores() {
        const { data: professores } = await _supabase.from('professores').select('*').order('created_at', { ascending: false });
        const container = document.querySelector('#professores .team-grid') || document.querySelector('.professores-container');

        if (container && professores && professores.length > 0) {
            container.innerHTML = '';
            professores.forEach(p => {
                container.innerHTML += `
                    <div class="team-card" data-aos="fade-up">
                        <div class="team-img">
                            <img src="${p.foto}" alt="${p.nome}">
                        </div>
                        <div class="team-info">
                            <h4>${p.nome}</h4>
                            <p>${p.esp}</p>
                            <div class="social-links">
                                ${p.instagram ? `<a href="${p.instagram}" target="_blank"><i class="fab fa-instagram"></i></a>` : ''}
                                ${p.facebook ? `<a href="${p.facebook}" target="_blank"><i class="fab fa-facebook"></i></a>` : ''}
                            </div>
                        </div>
                    </div>
                `;
            });
        }
    }

    async function carregarBanners() {
        const { data: banners } = await _supabase.from('banners').select('*').order('created_at', { ascending: false });
        
        if (banners && banners.length > 0) {
            const topoBanner = banners.find(b => b.posicao === 'topo');
            const bannerContainer = document.querySelector('#banner-promocional');

            if (topoBanner && bannerContainer) {
                bannerContainer.style.backgroundImage = `url('${topoBanner.img}')`;
                const tituloBanner = bannerContainer.querySelector('h2') || bannerContainer.querySelector('.banner-title');
                if (tituloBanner) tituloBanner.textContent = topoBanner.titulo;
                bannerContainer.style.display = 'block';
            }
        }
    }

    const formContato = document.querySelector('#formContato') || document.querySelector('form#contatoForm');
    if (formContato) {
        formContato.addEventListener('submit', async (e) => {
            e.preventDefault();

            const nome = formContato.querySelector('[name="nome"], #nome')?.value || '';
            const email = formContato.querySelector('[name="email"], #email')?.value || '';
            const tel = formContato.querySelector('[name="tel"], [name="whatsapp"], #tel')?.value || '';
            const msg = formContato.querySelector('[name="mensagem"], [name="msg"], #msg')?.value || '';

            const { error } = await _supabase.from('contatos').insert([{
                nome,
                email,
                tel,
                msg,
                status: 'Pendente'
            }]);

            if (error) {
                alert('Ocorreu um erro ao enviar sua mensagem. Tente novamente.');
                console.error(error);
            } else {
                alert('Mensagem enviada com sucesso! Entraremos em contato em breve.');
                formContato.reset();
            }
        });
    }

    carregarHero();
    carregarPlanos();
    carregarGaleria();
    carregarProfessores();
    carregarBanners();
});
window.carregarPlanosAdmin = async function() {
    try {
        const { data: planos, error } = await _supabase.from('planos').select('*').order('ordem', { ascending: true });
        if (error) throw error;

        const container = document.getElementById('listaPlanosAdmin');
        if (!container) return;

        container.innerHTML = '';
        (planos || []).forEach((p) => {
            const itensHTML = (p.itens || []).map(i => `<li style="font-size:0.8rem; color:var(--gray); margin: 3px 0;">✔ ${i}</li>`).join('');
            container.innerHTML += `
                <div class="draggable-card" draggable="true" data-id="${p.id}" style="background: var(--dark-2); padding: 20px; border-radius: 12px; border: 1px solid ${p.destaque === 'sim' ? 'var(--primary)' : 'var(--border)'}; position: relative;">
                    <div style="font-size:0.75rem; color:var(--primary-light); margin-bottom:6px; cursor:grab;">☰ Arraste para mover</div>
                    ${p.badge ? `<span style="background: var(--primary); font-size: 0.65rem; padding: 2px 8px; border-radius: 10px; font-weight: bold; position: absolute; top: 12px; right: 12px;">${p.badge}</span>` : ''}
                    <h3 style="font-size: 1.2rem; color: var(--text-color);">${p.nome}</h3>
                    <div style="font-size: 1.8rem; font-weight: bold; color: var(--primary-light); margin: 10px 0;">
                        R$${p.valor}<small style="font-size: 0.8rem; color: var(--gray);">${p.sufixo}</small>
                    </div>
                    <ul style="list-style: none; margin-bottom: 15px;">${itensHTML}</ul>
                    <div style="display: flex; gap: 8px;">
                        <button type="button" onclick="editarPlano('${p.id}')" class="btn-action-bar" style="flex:1;">✏️ Editar</button>
                        <button type="button" onclick="removerPlano('${p.id}')" class="btn-action-bar btn-danger">🗑️ Excluir</button>
                    </div>
                </div>
            `;
        });

        iniciarDragAndDrop('listaPlanosAdmin', 'planos', window.carregarPlanosAdmin);
    } catch (err) {
        console.warn('Aviso de conexão com o Supabase (DNS/Rede):', err.message);
        window.showToast("Erro de conexão com o banco de dados. Verifique sua internet.");
    }
};