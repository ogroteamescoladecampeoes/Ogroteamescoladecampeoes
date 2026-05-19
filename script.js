// ========================================================
// 🛠️ BANCO DE DADOS SIMULADO — OGRO TEAM v3.0
// ========================================================
let session = {
    currentUser: null,
    precos: { Comercial: 150, Atleta: 100, Bolsista: 0, Instrutor: 80, Particular: 250 },
    alunos: [
        { id: "1", nome: "Carlos Silva", email: "carlos@email.com", whatsapp: "21999998888",
          ctId: "1", plano: "Mensal", statusFinanceiro: "Em dia", perfil: "Comercial",
          modalidade: "Muay Thai", graduacao: "VERMELHO", frequencia: 14, foto: "", senha: "Abc@1234",
          campeonatos: [{ id:"c1", nome:"Copa RJ 2026", data:"10/03/2026", local:"Rio de Janeiro/RJ", resultado:"Vitória" }],
          autorizacoes: [] },
        { id: "2", nome: "Marcos Lima", email: "marcos@email.com", whatsapp: "21988887777",
          ctId: "1", plano: "Trimestral", statusFinanceiro: "Inadimplente", perfil: "Atleta",
          modalidade: "Boxe", graduacao: "CLASSE B", frequencia: 8, foto: "", senha: "Xyz#5678",
          campeonatos: [], autorizacoes: [] }
    ],
    cts: [
        { id: "1", nome: "CT Matriz", professor: "Professor Igor", cnpj: "12.345.678/0001-00",
          responsavel: "Mestre Ogro", endereco: "Av. Principal, 100", cidade: "Rio de Janeiro/RJ",
          whatsapp: "21977776666", capacidade: 30, mensalidade: 150 }
    ],
    admins: [
        { id: "1", nome: "Mestre Ogro", email: "admin@ogroteam.com", senha: "adm123", nivel: "Mestre" },
        { id: "2", nome: "Apoio 1", email: "apoio@ogroteam.com", senha: "apoio123", nivel: "Apoio Administrativo" }
    ],
    logs: [
        { data: "18/05/2026 - 10:14", autor: "Admin [Mestre]", acao: "Inicialização", detalhe: "Sistema Ogro Team v3.0 iniciado com sucesso." }
    ]
};

// ========================================================
// 🔑 UTILITÁRIOS
// ========================================================
function gerarSenhaAleatoria() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!";
    let senha = "";
    for (let i = 0; i < 8; i++) senha += chars[Math.floor(Math.random() * chars.length)];
    return senha;
}

function registrarLogLocal(autor, acao, detalhe) {
    const agora = new Date();
    const dataFormatada = `${agora.toLocaleDateString('pt-BR')} - ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    session.logs.unshift({ data: dataFormatada, autor, acao, detalhe });
}

window.previewFoto = function(event, elementId) {
    const file = event.target.files[0];
    if (!file) return;
    const fr = new FileReader();
    fr.onload = function() {
        const preview = document.getElementById(elementId);
        preview.style.backgroundImage = `url(${fr.result})`;
        preview.textContent = "";
        preview.dataset.fotoBase64 = fr.result;
    };
    fr.readAsDataURL(file);
};

// ========================================================
// 📋 MODAL GENÉRICO
// ========================================================
function exibirModal(titulo, texto, icone) {
    icone = icone || "🥋";
    document.getElementById('modal-titulo-cred').textContent = icone + " " + titulo;
    document.getElementById('modal-texto-credenciais').textContent = texto;
    const modal = document.getElementById('modal-credenciais');
    modal.dataset.textoParaCopiar = texto;
    modal.style.display = 'flex';
}

function exibirModalCredenciais(nome, login, senha, email) {
    const texto = "🥋 OGRO TEAM — Bem-vindo(a), " + nome + "!\n\nSeu acesso foi criado:\n\n👤 Login: " + login + "\n🔑 Senha: " + senha + "\n\nGuarde sua senha com segurança.\nAcesse o aplicativo com essas credenciais.";
    exibirModal("CADASTRO REALIZADO!", texto, "🥋");
    if (email) {
        registrarLogLocal("Sistema", "E-mail Enviado", "Credenciais enviadas para " + email + " — Login: " + login);
        console.info("[EMAIL SIMULADO] Para: " + email + "\nLogin: " + login + "\nSenha: " + senha);
    }
}

window.copiarCredenciais = function() {
    const texto = document.getElementById('modal-credenciais').dataset.textoParaCopiar;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(texto).then(function() { alert("✅ Copiado! Cole no SMS ou e-mail."); });
    } else {
        const ta = document.createElement('textarea');
        ta.value = texto;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        alert("✅ Copiado!");
    }
};

window.fecharModalCredenciais = function() {
    document.getElementById('modal-credenciais').style.display = 'none';
};

// ========================================================
// 🔁 NAVEGAÇÃO COM CONTROLE DE PERMISSÃO
// ========================================================
let html5QrcodeScanner = null;

const PERMISSOES = {
    "Mestre": [1,2,3,4,5,6,7,8,9,10,11,12,13,14],
    "Administrador Integral": [1,2,3,4,5,6,7,8,9,10,11,12,13,14],
    "Apoio Administrativo": [1,2,3,4,5,6,8,9,10,11,12,14],
    "Aluno Instrutor": [1,2,8,12],
    "Aluno": [1,2,12]
};

window.firebaseNavegar = function(idPagina) {
    if (idPagina !== 1 && idPagina !== 2 && !session.currentUser) {
        alert("Acesso negado: Efetue o login.");
        idPagina = 1;
    }

    const nivel = session.currentUser ? session.currentUser.nivel : "";
    const permitidas = PERMISSOES[nivel] || [1, 2];

    if (session.currentUser && permitidas.indexOf(idPagina) === -1) {
        alert("Acesso Restrito: Seu perfil não possui permissão para esta área.");
        return;
    }

    if (idPagina !== 8 && html5QrcodeScanner) {
        try { html5QrcodeScanner.clear(); } catch(e) {}
        html5QrcodeScanner = null;
        const rd = document.getElementById('reader');
        if (rd) { rd.style.display = "none"; rd.innerHTML = ""; }
    }

    const footer = document.querySelector('.footer-fixo');
    const isAdmin = nivel === "Mestre" || nivel === "Administrador Integral" || nivel === "Apoio Administrativo";
    if (isAdmin) footer.classList.add('show-footer');
    else footer.classList.remove('show-footer');

    // Rodapé de perfil do aluno
    const rodapeAluno = document.getElementById('rodape-perfil-aluno');
    if (rodapeAluno) {
        if (session.currentUser && (nivel === "Aluno" || nivel === "Aluno Instrutor")) {
            const ctNome = session.cts.find(function(c){ return c.id === session.currentUser.ctId; });
            rodapeAluno.textContent = "Perfil: " + (session.currentUser.perfil || "Aluno") + " | " + (ctNome ? ctNome.nome : "—");
            rodapeAluno.style.display = "block";
        } else {
            rodapeAluno.style.display = "none";
        }
    }

    document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
    const destino = document.getElementById('p' + idPagina);
    if (destino) destino.classList.add('active');
    window.scrollTo(0, 0);

    if (idPagina === 4) popularSelectCTs('cad-aluno-ct');
    if (idPagina === 6) renderizarDashboard();
    if (idPagina === 7) renderizarEquipeAdmin();
    if (idPagina === 8) inicializarModuloFrequencia();
    if (idPagina === 9) renderizarCadastros();
    if (idPagina === 11) window.firebaseFiltroRelatorio();
    if (idPagina === 12) renderizarCarteirinhaAluno();
    if (idPagina === 13) renderizarConfiguracoes();
    if (idPagina === 14) renderizarCampeonatos();
};

window.navegarPara = window.firebaseNavegar;

function popularSelectCTs(selectId) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    sel.innerHTML = '<option value="">Selecione o CT/Academia</option>';
    session.cts.forEach(function(c) { sel.innerHTML += '<option value="' + c.id + '">' + c.nome + '</option>'; });
}

// ========================================================
// 🔐 AUTENTICAÇÃO
// ========================================================
window.firebaseLogin = function() {
    const input = document.getElementById('login-email').value.trim();
    const senha = document.getElementById('login-senha').value.trim();

    const adm = session.admins.find(function(a) { return (a.email === input || a.nome === input) && a.senha === senha; });
    if (adm) {
        session.currentUser = JSON.parse(JSON.stringify(adm));
        registrarLogLocal("Admin [" + adm.nivel + "]", "Login", adm.nome + " autenticado.");
        window.firebaseNavegar(3);
        return;
    }

    const aluno = session.alunos.find(function(a) { return (a.email === input || a.nome === input || a.whatsapp === input) && a.senha === senha; });
    if (aluno) {
        session.currentUser = JSON.parse(JSON.stringify(aluno));
        session.currentUser.nivel = aluno.perfil === "Instrutor" ? "Aluno Instrutor" : "Aluno";
        window.firebaseNavegar(12);
        return;
    }

    alert("Credenciais inválidas. Verifique seu login e senha.");
};

// ========================================================
// 👤 CADASTRO DE ALUNOS
// ========================================================
window.firebaseSalvarAluno = function() {
    const nome = document.getElementById('cad-aluno-nome').value.trim();
    const email = document.getElementById('cad-aluno-email').value.trim();
    const whatsapp = document.getElementById('cad-aluno-whatsapp').value.trim();
    const ctId = document.getElementById('cad-aluno-ct').value;
    const perfil = document.getElementById('cad-aluno-perfil').value;
    const status = document.getElementById('cad-aluno-status').value;
    const foto = document.getElementById('aluno-foto-preview').dataset.fotoBase64 || "";
    const graduacao = document.getElementById('cad-aluno-graduacao').value.toUpperCase();

    if (!nome || !whatsapp) return alert("Preencha Nome e WhatsApp.");
    if (!ctId) return alert("Selecione o CT/Academia do aluno.");

    const senhaGerada = gerarSenhaAleatoria();
    const ctNome = (session.cts.find(function(c){ return c.id === ctId; }) || {}).nome || ctId;

    const novo = {
        id: String(Date.now()),
        nome: nome, email: email, whatsapp: whatsapp, ctId: ctId,
        perfil: perfil, statusFinanceiro: status, foto: foto,
        graduacao: graduacao, senha: senhaGerada,
        plano: document.getElementById('cad-aluno-plano').value,
        modalidade: document.getElementById('cad-aluno-modalidade').value,
        frequencia: 0, campeonatos: [], autorizacoes: []
    };

    session.alunos.push(novo);
    registrarLogLocal("Admin [" + session.currentUser.nivel + "]", "Cadastro Aluno",
        nome + " cadastrado em " + ctNome + " | Perfil: " + perfil + " | Status: " + status);

    ['cad-aluno-nome','cad-aluno-email','cad-aluno-whatsapp','cad-aluno-graduacao'].forEach(function(id) {
        document.getElementById(id).value = "";
    });
    document.getElementById('cad-aluno-ct').value = "";
    const fp = document.getElementById('aluno-foto-preview');
    fp.style.backgroundImage = "none";
    fp.textContent = "Toque para Foto";
    delete fp.dataset.fotoBase64;

    exibirModalCredenciais(nome, email || nome, senhaGerada, email);
};

// ========================================================
// 🏛️ CADASTRO DE CTs
// ========================================================
window.firebaseSalvarCT = function() {
    const nome = document.getElementById('cad-ct-nome').value.trim();
    const professor = document.getElementById('cad-ct-professor').value.trim();
    if (!nome || !professor) return alert("Nome da Filial e Professor são obrigatórios.");

    const novoId = String(Date.now());
    session.cts.push({
        id: novoId, nome: nome, professor: professor,
        cnpj: document.getElementById('cad-ct-cnpj').value,
        responsavel: document.getElementById('cad-ct-responsavel').value,
        endereco: document.getElementById('cad-ct-endereco').value,
        cidade: document.getElementById('cad-ct-cidade').value,
        whatsapp: document.getElementById('cad-ct-whatsapp').value,
        capacidade: document.getElementById('cad-ct-capacidade').value,
        mensalidade: document.getElementById('cad-ct-mensalidade').value
    });

    registrarLogLocal("Admin [" + session.currentUser.nivel + "]", "Cadastro CT", "Filial " + nome + " registrada.");
    alert("Filial registrada com sucesso!");

    ['cad-ct-nome','cad-ct-professor','cad-ct-cnpj','cad-ct-responsavel',
     'cad-ct-endereco','cad-ct-cidade','cad-ct-whatsapp','cad-ct-capacidade','cad-ct-mensalidade'].forEach(function(id) {
        document.getElementById(id).value = "";
    });

    window.firebaseNavegar(3);
};

// ========================================================
// 👥 GESTÃO DE EQUIPE — TEMPO REAL
// ========================================================
window.firebaseSalvarNovoAdmin = function() {
    const nome = document.getElementById('adm-nome').value.trim();
    const email = document.getElementById('adm-email').value.trim();
    const senha = document.getElementById('adm-senha').value.trim();
    const nivel = document.getElementById('adm-nivel').value;

    if (!nome || !email || !senha) return alert("Preencha todos os campos.");

    session.admins.push({ id: String(Date.now()), nome: nome, email: email, senha: senha, nivel: nivel });
    registrarLogLocal("Mestre", "Nova Atribuição", nome + " adicionado como [" + nivel + "].");

    document.getElementById('adm-nome').value = "";
    document.getElementById('adm-email').value = "";
    document.getElementById('adm-senha').value = "";

    renderizarEquipeAdmin();
};

window.removerAdmin = function(idAdmin) {
    if (!confirm("Revogar acesso deste gestor?")) return;
    const idx = session.admins.findIndex(function(a) { return a.id === String(idAdmin); });
    if (idx !== -1) {
        registrarLogLocal("Mestre", "Revogação", "Acesso de " + session.admins[idx].nome + " revogado.");
        session.admins.splice(idx, 1);
    }
    renderizarEquipeAdmin();
};

window.promoverUsuario = function(idAluno, nivelAlvo) {
    const aluno = session.alunos.find(function(a) { return a.id === String(idAluno); });
    if (!aluno) return;

    if (aluno.perfil === "Instrutor" && nivelAlvo === "Administrador Integral") {
        alert("Instrutores só podem ser promovidos até Apoio Administrativo.");
        nivelAlvo = "Apoio Administrativo";
    }

    session.admins.push({
        id: String(Date.now()), nome: aluno.nome,
        email: aluno.email || aluno.nome.toLowerCase().replace(/\s+/g,'') + "@ogroteam.com",
        senha: aluno.senha || "123", nivel: nivelAlvo
    });

    registrarLogLocal("Mestre", "Privilégio", aluno.nome + " promovido para [" + nivelAlvo + "].");
    alert(aluno.nome + " adicionado como " + nivelAlvo + "!");
    renderizarEquipeAdmin();
};

function renderizarEquipeAdmin() {
    const container = document.getElementById('lista-promocao-alunos');
    container.innerHTML = "";

    const h4g = document.createElement('h4');
    h4g.textContent = "Gestores Ativos";
    container.appendChild(h4g);

    session.admins.forEach(function(a) {
        const div = document.createElement('div');
        div.className = "item-registro";
        div.innerHTML = '<div><strong>' + a.nome + '</strong><br><small style="color:#8a8a8a;">' + a.nivel + ' | ' + a.email + '</small></div>' +
            (a.id !== "1"
                ? '<button class="btn btn-vermelho" style="padding:4px 8px;font-size:11px;width:auto;" onclick="removerAdmin(\'' + a.id + '\')">Revogar</button>'
                : '<small style="color:#16a34a;">Dono Master</small>');
        container.appendChild(div);
    });

    const h4a = document.createElement('h4');
    h4a.style.cssText = "margin-top:15px;margin-bottom:5px;";
    h4a.textContent = "Alunos para Promoção";
    container.appendChild(h4a);

    session.alunos.forEach(function(a) {
        const div = document.createElement('div');
        div.className = "item-registro";
        div.innerHTML = '<span>' + a.nome + ' <small style="color:#8a8a8a;">(' + a.perfil + ')</small></span>' +
            '<div style="display:flex;gap:4px;">' +
            (a.perfil !== "Instrutor" ? '<button class="btn btn-primary" style="padding:4px 6px;font-size:10px;width:auto;" onclick="promoverUsuario(\'' + a.id + '\',\'Administrador Integral\')">Admin</button>' : '') +
            '<button class="btn btn-accent" style="padding:4px 6px;font-size:10px;width:auto;background:#262626;" onclick="promoverUsuario(\'' + a.id + '\',\'Apoio Administrativo\')">Apoio</button>' +
            '</div>';
        container.appendChild(div);
    });
}

// ========================================================
// 📊 DASHBOARD — COBRANÇA POR E-MAIL + RELATÓRIO
// ========================================================
function renderizarDashboard() {
    let faturamento = 0, inadimplencia = 0, recebido = 0;
    let mThai = 0, boxe = 0, mma = 0;

    session.alunos.forEach(function(a) {
        const valor = Number(session.precos[a.perfil]) || 0;
        if (a.statusFinanceiro !== "Trancada" && a.statusFinanceiro !== "Suspenso") {
            faturamento += valor;
            if (a.statusFinanceiro === "Em dia") recebido += valor;
            else inadimplencia += valor;
        }
        if (a.modalidade === "Muay Thai") mThai++;
        if (a.modalidade === "Boxe") boxe++;
        if (a.modalidade === "MMA") mma++;
    });

    document.getElementById('dash-faturamento').textContent = "R$ " + faturamento.toFixed(2);
    document.getElementById('dash-inadimplencia').textContent = "R$ " + inadimplencia.toFixed(2);
    document.getElementById('dash-recebido').textContent = "R$ " + recebido.toFixed(2);

    const total = mThai + boxe + mma || 1;
    document.getElementById('chart-count-muay').textContent = mThai;
    document.getElementById('chart-count-boxe').textContent = boxe;
    document.getElementById('chart-count-mma').textContent = mma;
    document.getElementById('bar-muay').style.width = ((mThai/total)*100) + '%';
    document.getElementById('bar-boxe').style.width = ((boxe/total)*100) + '%';
    document.getElementById('bar-mma').style.width = ((mma/total)*100) + '%';

    const lista = document.getElementById('dash-lista-devedores');
    lista.innerHTML = "";
    const devedores = session.alunos.filter(function(a) { return a.statusFinanceiro !== "Em dia"; });
    if (devedores.length === 0) {
        lista.innerHTML = "<p style='color:#4ade80;text-align:center;padding:20px;'>✅ Nenhum devedor.</p>";
        return;
    }
    devedores.forEach(function(a) {
        const div = document.createElement('div');
        div.className = "item-registro";
        div.innerHTML = '<div><strong>' + a.nome + '</strong> [' + a.statusFinanceiro.toUpperCase() + ']<br>' +
            '<small style="color:#8a8a8a;">R$ ' + Number(session.precos[a.perfil]).toFixed(2) + ' | ' + (a.email || 'sem e-mail') + '</small></div>' +
            '<button class="btn btn-primary" style="padding:4px 8px;font-size:11px;width:auto;" onclick="cobrarPorEmail(\'' + a.id + '\')">📧 Cobrar</button>';
        lista.appendChild(div);
    });
}

window.cobrarPorEmail = function(idAluno) {
    const a = session.alunos.find(function(x) { return x.id === String(idAluno); });
    if (!a) return;
    const texto = "⚠️ OGRO TEAM — Olá " + a.nome + "!\n\nIdentificamos uma pendência no seu plano " + a.plano + ".\nValor em aberto: R$ " + Number(session.precos[a.perfil]).toFixed(2) + "\n\nPor favor, regularize na secretaria para manter seu acesso ativo.\n\nOgro Team 🥋";
    if (a.email) {
        registrarLogLocal("Admin [" + session.currentUser.nivel + "]", "E-mail Cobrança", "Cobrança enviada para " + a.email + " — " + a.nome);
        console.info("[EMAIL COBRANÇA] Para: " + a.email + "\n" + texto);
    }
    exibirModal("MENSAGEM DE COBRANÇA", texto, "⚠️");
};

window.exportarRelatorio = function() {
    const cat = document.getElementById('rep-categoria').value;
    const mod = document.getElementById('rep-modalidade').value;
    let filtrados = session.alunos;
    if (cat !== "Todos") filtrados = filtrados.filter(function(a) { return a.perfil === cat; });
    if (mod !== "Todas") filtrados = filtrados.filter(function(a) { return a.modalidade === mod; });

    if (filtrados.length === 0) return alert("Nenhum aluno para exportar.");

    const agora = new Date().toLocaleDateString('pt-BR');
    let txt = "OGRO TEAM — RELATÓRIO GERADO EM " + agora + "\n";
    txt += "Filtro: " + cat + " | " + mod + "\n";
    txt += "========================================\n";
    filtrados.forEach(function(a, i) {
        const ctNome = (session.cts.find(function(c){ return c.id === a.ctId; }) || {}).nome || "—";
        txt += (i+1) + ". " + a.nome + "\n   Perfil: " + a.perfil + " | CT: " + ctNome + " | " + a.modalidade + "\n   Status: " + a.statusFinanceiro + " | R$ " + Number(session.precos[a.perfil]).toFixed(2) + "\n   E-mail: " + (a.email||'-') + " | WhatsApp: " + a.whatsapp + "\n\n";
    });

    exibirModal("RELATÓRIO EXPORTADO", txt, "📊");
    registrarLogLocal("Admin [" + session.currentUser.nivel + "]", "Relatório", "Relatório gerado: " + filtrados.length + " alunos | " + cat + "/" + mod);
};

// ========================================================
// ⏱️ PRESENÇA — CÂMERA TRASEIRA FORÇADA
// ========================================================
function inicializarModuloFrequencia() {
    const sa = document.getElementById('presenca-aluno');
    const sc = document.getElementById('presenca-ct');
    sa.innerHTML = "";
    sc.innerHTML = "";
    session.alunos.forEach(function(a) { sa.innerHTML += '<option value="' + a.id + '">' + a.nome + '</option>'; });
    session.cts.forEach(function(c) { sc.innerHTML += '<option value="' + c.id + '">' + c.nome + '</option>'; });
}

window.firebaseAtivarCamera = function() {
    const readerDiv = document.getElementById('reader');
    if (html5QrcodeScanner) {
        try { html5QrcodeScanner.clear(); } catch(e) {}
        html5QrcodeScanner = null;
        readerDiv.style.display = "none";
        readerDiv.innerHTML = "";
        return;
    }
    readerDiv.style.display = "block";
    readerDiv.innerHTML = "";

    const config = { fps: 15, qrbox: { width: 220, height: 220 }, rememberLastUsedCamera: false, videoConstraints: { facingMode: { exact: "environment" } } };
    const configFallback = { fps: 15, qrbox: { width: 220, height: 220 } };

    function iniciarScanner(cfg) {
        html5QrcodeScanner = new Html5QrcodeScanner("reader", cfg, false);
        html5QrcodeScanner.render(function(txt) {
            try { html5QrcodeScanner.clear(); } catch(e) {}
            html5QrcodeScanner = null;
            readerDiv.style.display = "none";
            readerDiv.innerHTML = "";
            processarEntradaValidada(txt);
        }, function() {});
    }

    try { iniciarScanner(config); }
    catch(e) {
        try { iniciarScanner(configFallback); }
        catch(e2) { alert("Erro ao acessar câmera. Verifique permissões."); readerDiv.style.display = "none"; }
    }
};

function processarEntradaValidada(idAluno) {
    const aluno = session.alunos.find(function(a) { return a.id === String(idAluno); });
    const ctSel = document.getElementById('presenca-ct').value;
    const ct = session.cts.find(function(c) { return c.id === String(ctSel); }) || { nome: "CT Principal" };

    if (!aluno) return alert("QR Code não reconhecido.");
    if (aluno.statusFinanceiro === "Suspenso" || aluno.statusFinanceiro === "Trancada") {
        alert("❌ ACESSO NEGADO: " + aluno.nome + " — Status [" + aluno.statusFinanceiro.toUpperCase() + "]. Procure a secretaria.");
        return;
    }

    aluno.frequencia = (aluno.frequencia || 0) + 1;
    const agora = new Date();
    const dataEHora = agora.toLocaleDateString('pt-BR') + " às " + agora.toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'});
    registrarLogLocal("Catraca", "Check-in", aluno.nome + " entrou em " + ct.nome + " — " + dataEHora);

    const mural = document.getElementById('mural-chamadas');
    const div = document.createElement('div');
    div.className = "item-registro";
    div.innerHTML = "<strong>" + dataEHora + "</strong> — 🥋 " + aluno.nome + " | " + ct.nome;
    mural.insertBefore(div, mural.firstChild);
    alert("🥊 ENTRADA AUTORIZADA! Bom treino, " + aluno.nome + "!");
}

window.firebasePresencaManual = function() {
    const id = document.getElementById('presenca-aluno').value;
    if (id) processarEntradaValidada(id);
};

// ========================================================
// 🗂️ CENTRAL DE REGISTROS
// ========================================================
window.renderizarCadastros = function() {
    const busca = (document.getElementById('pesquisa-reativa').value || "").toLowerCase();
    const container = document.getElementById('lista-sincronizada');
    container.innerHTML = "";

    const af = session.alunos.filter(function(a) { return a.nome.toLowerCase().includes(busca) || (a.email||"").toLowerCase().includes(busca); });
    const cf = session.cts.filter(function(c) { return c.nome.toLowerCase().includes(busca) || c.professor.toLowerCase().includes(busca); });

    if (af.length === 0 && cf.length === 0) {
        container.innerHTML = "<p style='color:#8a8a8a;text-align:center;padding:20px;'>Nenhum registro encontrado.</p>";
        return;
    }

    af.forEach(function(a) {
        const ctNome = (session.cts.find(function(c){ return c.id === a.ctId; }) || {}).nome || "—";
        const corS = a.statusFinanceiro === 'Em dia' ? '#16a34a' : (a.statusFinanceiro === 'Inadimplente' ? '#ba0f14' : '#d97706');
        const fStyle = a.foto ? 'background-image:url(' + a.foto + ');' : '';
        const div = document.createElement('div');
        div.className = "item-registro";
        div.innerHTML = '<div style="display:flex;align-items:center;gap:10px;">' +
            '<div class="mini-avatar" style="' + fStyle + '"></div>' +
            '<div><strong>' + a.nome + '</strong><br><small style="color:#8a8a8a;">' + a.perfil + ' | ' + ctNome + ' | ' + a.graduacao + '</small></div></div>' +
            '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">' +
            '<span class="badge" style="background:' + corS + ';">' + a.statusFinanceiro + '</span>' +
            '<div><button class="btn btn-primary" style="padding:4px 8px;font-size:11px;width:auto;" onclick="window.firebaseAbrirEdicao(\'' + a.id + '\')">Editar</button>' +
            '<button class="btn btn-vermelho" style="padding:4px 8px;font-size:11px;width:auto;margin-left:2px;" onclick="window.firebaseExcluirItem(\'' + a.id + '\',\'aluno\')">Excluir</button></div></div>';
        container.appendChild(div);
    });

    cf.forEach(function(c) {
        const div = document.createElement('div');
        div.className = "item-registro";
        div.innerHTML = '<div><strong>🏛️ ' + c.nome + '</strong><br><small style="color:#8a8a8a;">Prof: ' + c.professor + ' | Líder: ' + c.responsavel + '</small></div>' +
            '<button class="btn btn-vermelho" style="padding:4px 8px;font-size:11px;width:auto;" onclick="window.firebaseExcluirItem(\'' + c.id + '\',\'ct\')">Excluir</button>';
        container.appendChild(div);
    });
};

window.firebaseExcluirItem = function(id, tipo) {
    if (!confirm("Deletar permanentemente?")) return;
    if (tipo === 'aluno') {
        const idx = session.alunos.findIndex(function(a) { return a.id === String(id); });
        if (idx !== -1) { registrarLogLocal("Admin [" + session.currentUser.nivel + "]", "Exclusão", "Aluno ID " + id + " removido."); session.alunos.splice(idx, 1); }
    } else {
        const idx = session.cts.findIndex(function(c) { return c.id === String(id); });
        if (idx !== -1) { registrarLogLocal("Admin [" + session.currentUser.nivel + "]", "Exclusão", "CT ID " + id + " removido."); session.cts.splice(idx, 1); }
    }
    window.renderizarCadastros();
};

window.firebaseAbrirEdicao = function(idAluno) {
    const a = session.alunos.find(function(x) { return x.id === String(idAluno); });
    if (!a) return;
    document.getElementById('edit-id-oculto').value = a.id;
    document.getElementById('edit-nome').value = a.nome;
    document.getElementById('edit-email').value = a.email || "";
    document.getElementById('edit-plano').value = a.plano;
    document.getElementById('edit-modalidade').value = a.modalidade;
    document.getElementById('edit-graduacao').value = a.graduacao;
    const ep = document.getElementById('edit-foto-preview');
    ep.style.backgroundImage = a.foto ? 'url(' + a.foto + ')' : "none";
    ep.dataset.fotoBase64 = a.foto || "";
    window.firebaseNavegar(10);
};

window.firebaseSalvarAlteracoesDedicadas = function() {
    const id = document.getElementById('edit-id-oculto').value;
    const aluno = session.alunos.find(function(a) { return a.id === String(id); });
    if (!aluno) return;
    const gradNova = document.getElementById('edit-graduacao').value.toUpperCase();
    if (aluno.graduacao !== gradNova)
        registrarLogLocal("Admin [" + session.currentUser.nivel + "]", "Graduação", aluno.nome + ": [" + aluno.graduacao + "] → [" + gradNova + "]");
    aluno.nome = document.getElementById('edit-nome').value;
    aluno.email = document.getElementById('edit-email').value.trim();
    aluno.plano = document.getElementById('edit-plano').value;
    aluno.modalidade = document.getElementById('edit-modalidade').value;
    aluno.graduacao = gradNova;
    aluno.foto = document.getElementById('edit-foto-preview').dataset.fotoBase64 || aluno.foto;
    registrarLogLocal("Admin [" + session.currentUser.nivel + "]", "Edição", "Dados de " + aluno.nome + " atualizados.");
    alert("Alterações salvas!");
    window.firebaseNavegar(9);
};

// ========================================================
// 📊 RELATÓRIOS
// ========================================================
window.firebaseFiltroRelatorio = function() {
    const cat = document.getElementById('rep-categoria').value;
    const mod = document.getElementById('rep-modalidade').value;
    const grid = document.getElementById('relatorio-resultado-tela');
    grid.innerHTML = "";

    let filtrados = session.alunos;
    if (cat !== "Todos") filtrados = filtrados.filter(function(a) { return a.perfil === cat; });
    if (mod !== "Todas") filtrados = filtrados.filter(function(a) { return a.modalidade === mod; });

    document.getElementById('rep-count-alunos').textContent = filtrados.length;
    let soma = 0;
    filtrados.forEach(function(f) { soma += (session.precos[f.perfil] || 0); });
    document.getElementById('rep-soma-valores').textContent = "R$ " + soma.toFixed(2);

    if (filtrados.length === 0) {
        grid.innerHTML = "<p style='color:#8a8a8a;text-align:center;padding:20px;'>Nenhum registro.</p>";
        return;
    }

    filtrados.forEach(function(a) {
        const ctNome = (session.cts.find(function(c){ return c.id === a.ctId; }) || {}).nome || "—";
        const div = document.createElement('div');
        div.className = "item-registro";
        div.innerHTML = '<div><strong>' + a.nome + '</strong><br><small style="color:#8a8a8a;">' + a.modalidade + ' | ' + ctNome + ' | ' + a.statusFinanceiro + '</small></div>' +
            '<span style="color:#4ade80;font-weight:bold;">R$ ' + Number(session.precos[a.perfil]).toFixed(2) + '</span>';
        grid.appendChild(div);
    });
};

// ========================================================
// 📱 CARTEIRINHA DO ALUNO
// ========================================================
function renderizarCarteirinhaAluno() {
    const a = session.currentUser;
    if (!a) return;
    const ctNome = (session.cts.find(function(c){ return c.id === a.ctId; }) || {}).nome || "—";

    document.getElementById('aluno-perfil-nome').textContent = a.nome;
    document.getElementById('aluno-tag-perfil').textContent = "[" + (a.perfil || "ALUNO").toUpperCase() + "]";
    document.getElementById('aluno-tag-graduacao').textContent = (a.modalidade || "") + " — " + (a.graduacao || "");
    document.getElementById('aluno-contador-freq').textContent = a.frequencia || 0;

    const dadosEl = document.getElementById('aluno-dados-basicos');
    if (dadosEl) {
        dadosEl.innerHTML =
            '<div class="dado-item"><span class="dado-label">📧 E-mail</span><span>' + (a.email || "—") + '</span></div>' +
            '<div class="dado-item"><span class="dado-label">📱 WhatsApp</span><span>' + (a.whatsapp || "—") + '</span></div>' +
            '<div class="dado-item"><span class="dado-label">🏛️ CT/Academia</span><span>' + ctNome + '</span></div>' +
            '<div class="dado-item"><span class="dado-label">📋 Plano</span><span>' + (a.plano || "—") + '</span></div>';
    }

    const box = document.getElementById('aluno-status-financeiro');
    if (a.statusFinanceiro === "Em dia") {
        box.className = "status-box status-pago";
        box.innerHTML = "<h3>ACESSO AUTORIZADO ✔️</h3><p>Mensalidade em dia.</p>";
    } else {
        box.className = "status-box status-atraso";
        box.innerHTML = "<h3>STATUS [" + (a.statusFinanceiro||"").toUpperCase() + "] ⚠️</h3><p>Procure a secretaria.</p>";
    }

    const avatarEl = document.getElementById('aluno-avatar-foto');
    if (a.foto) { avatarEl.style.backgroundImage = 'url(' + a.foto + ')'; avatarEl.textContent = ""; }
    else { avatarEl.style.backgroundImage = "none"; avatarEl.textContent = "👤"; }

    const qrEl = document.getElementById('qrcode-carteirinha');
    qrEl.innerHTML = "";
    if (typeof QRCode !== 'undefined') {
        new QRCode(qrEl, { text: String(a.id), width: 130, height: 130, colorDark: "#000000", colorLight: "#ffffff" });
    }

    // Campeonatos
    const campEl = document.getElementById('aluno-campeonatos-lista');
    if (campEl) {
        const campeonatos = a.campeonatos || [];
        if (campeonatos.length === 0) {
            campEl.innerHTML = "<p style='color:#8a8a8a;text-align:center;padding:10px;'>Nenhum campeonato registrado.</p>";
        } else {
            campEl.innerHTML = "";
            campeonatos.forEach(function(c) {
                const corRes = { 'Vitória': '#16a34a', 'Derrota': '#ba0f14', 'Empate': '#d97706', 'W.O': '#6b7280' };
                campEl.innerHTML += '<div class="item-registro"><div><strong>' + c.nome + '</strong><br><small style="color:#8a8a8a;">' + c.data + ' | ' + c.local + '</small></div><span class="badge" style="background:' + (corRes[c.resultado]||'#262626') + ';">' + c.resultado + '</span></div>';
            });
        }
    }

    // Rodapé com perfil
    const rodapeEl = document.getElementById('rodape-perfil-aluno');
    if (rodapeEl) rodapeEl.textContent = "Perfil: " + (a.perfil || "Aluno") + " | " + ctNome;
}

// ========================================================
// 🏆 PÁGINA 14 — CAMPEONATOS E AUTORIZAÇÕES
// ========================================================
function renderizarCampeonatos() {
    const sel = document.getElementById('camp-select-aluno');
    if (!sel) return;
    sel.innerHTML = '<option value="">Selecione o Atleta</option>';
    session.alunos.forEach(function(a) { sel.innerHTML += '<option value="' + a.id + '">' + a.nome + '</option>'; });
    document.getElementById('camp-lista').innerHTML = "";
    document.getElementById('aut-lista').innerHTML = "";
}

window.carregarDadosAtleta = function() {
    const id = document.getElementById('camp-select-aluno').value;
    if (!id) return;
    const aluno = session.alunos.find(function(a) { return a.id === String(id); });
    if (!aluno) return;

    const campLista = document.getElementById('camp-lista');
    campLista.innerHTML = "";
    const camps = aluno.campeonatos || [];
    if (camps.length === 0) {
        campLista.innerHTML = "<p style='color:#8a8a8a;text-align:center;padding:10px;'>Nenhum campeonato.</p>";
    } else {
        camps.forEach(function(c, i) {
            const corRes = { 'Vitória': '#16a34a', 'Derrota': '#ba0f14', 'Empate': '#d97706', 'W.O': '#6b7280' };
            campLista.innerHTML += '<div class="item-registro"><div><strong>' + c.nome + '</strong><br><small style="color:#8a8a8a;">' + c.data + ' | ' + c.local + '</small></div>' +
                '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">' +
                '<span class="badge" style="background:' + (corRes[c.resultado]||'#262626') + ';">' + c.resultado + '</span>' +
                '<button class="btn btn-vermelho" style="padding:2px 6px;font-size:10px;width:auto;" onclick="excluirCampeonato(\'' + id + '\',' + i + ')">Remover</button></div></div>';
        });
    }

    const autLista = document.getElementById('aut-lista');
    autLista.innerHTML = "";
    const auts = aluno.autorizacoes || [];
    if (auts.length === 0) {
        autLista.innerHTML = "<p style='color:#8a8a8a;text-align:center;padding:10px;'>Nenhuma autorização.</p>";
    } else {
        auts.forEach(function(au, i) {
            autLista.innerHTML += '<div class="item-registro"><div><strong>' + au.descricao + '</strong><br><small style="color:#8a8a8a;">' + au.data + '</small></div>' +
                '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">' +
                (au.foto ? '<div style="width:40px;height:40px;border-radius:4px;background-image:url(' + au.foto + ');background-size:cover;border:1px solid #ba0f14;"></div>' : '') +
                '<button class="btn btn-vermelho" style="padding:2px 6px;font-size:10px;width:auto;" onclick="excluirAutorizacao(\'' + id + '\',' + i + ')">Remover</button></div></div>';
        });
    }
};

window.salvarCampeonato = function() {
    const id = document.getElementById('camp-select-aluno').value;
    const nome = document.getElementById('camp-nome').value.trim();
    const data = document.getElementById('camp-data').value;
    const local = document.getElementById('camp-local').value.trim();
    const resultado = document.getElementById('camp-resultado').value;

    if (!id) return alert("Selecione o atleta.");
    if (!nome || !data || !local) return alert("Preencha nome, data e local.");

    const aluno = session.alunos.find(function(a) { return a.id === String(id); });
    if (!aluno) return;
    if (!aluno.campeonatos) aluno.campeonatos = [];
    aluno.campeonatos.push({ id: String(Date.now()), nome: nome, data: data, local: local, resultado: resultado });

    registrarLogLocal("Admin [" + session.currentUser.nivel + "]", "Campeonato", aluno.nome + " — " + nome + " em " + local + " (" + data + "): " + resultado);

    document.getElementById('camp-nome').value = "";
    document.getElementById('camp-data').value = "";
    document.getElementById('camp-local').value = "";
    alert("Campeonato registrado!");
    window.carregarDadosAtleta();
};

window.excluirCampeonato = function(idAluno, idx) {
    if (!confirm("Remover este campeonato?")) return;
    const aluno = session.alunos.find(function(a) { return a.id === String(idAluno); });
    if (aluno && aluno.campeonatos) {
        registrarLogLocal("Admin [" + session.currentUser.nivel + "]", "Remoção Campeonato", aluno.nome + " — " + (aluno.campeonatos[idx]||{}).nome + " removido.");
        aluno.campeonatos.splice(idx, 1);
    }
    window.carregarDadosAtleta();
};

let cameraAutStream = null;
window.abrirCameraAutorizacao = function() {
    const camDiv = document.getElementById('aut-camera-div');
    if (camDiv.style.display === "block") {
        camDiv.style.display = "none";
        if (cameraAutStream) { cameraAutStream.getTracks().forEach(function(t){ t.stop(); }); cameraAutStream = null; }
        return;
    }
    camDiv.style.display = "block";
    const video = document.getElementById('aut-video');
    navigator.mediaDevices.getUserMedia({ video: { facingMode: { exact: "environment" } } })
        .catch(function() { return navigator.mediaDevices.getUserMedia({ video: true }); })
        .then(function(stream) { cameraAutStream = stream; video.srcObject = stream; video.play(); })
        .catch(function() { alert("Não foi possível acessar a câmera."); });
};

window.capturarFotoAutorizacao = function() {
    const video = document.getElementById('aut-video');
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    const preview = document.getElementById('aut-foto-preview');
    preview.style.backgroundImage = 'url(' + dataUrl + ')';
    preview.textContent = "";
    preview.dataset.fotoBase64 = dataUrl;
    document.getElementById('aut-camera-div').style.display = "none";
    if (cameraAutStream) { cameraAutStream.getTracks().forEach(function(t){ t.stop(); }); cameraAutStream = null; }
};

window.salvarAutorizacao = function() {
    const id = document.getElementById('camp-select-aluno').value;
    const descricao = document.getElementById('aut-descricao').value.trim();
    const fotoEl = document.getElementById('aut-foto-preview');
    const foto = fotoEl.dataset.fotoBase64 || "";

    if (!id) return alert("Selecione o atleta.");
    if (!descricao) return alert("Descreva o documento de autorização.");

    const aluno = session.alunos.find(function(a) { return a.id === String(id); });
    if (!aluno) return;

    const agora = new Date().toLocaleDateString('pt-BR');
    if (!aluno.autorizacoes) aluno.autorizacoes = [];
    aluno.autorizacoes.push({ id: String(Date.now()), descricao: descricao, data: agora, foto: foto });

    registrarLogLocal("Admin [" + session.currentUser.nivel + "]", "Autorização", "Documento \"" + descricao + "\" adicionado para " + aluno.nome + ".");

    document.getElementById('aut-descricao').value = "";
    fotoEl.style.backgroundImage = "none";
    fotoEl.textContent = "Foto do Doc";
    delete fotoEl.dataset.fotoBase64;
    alert("Autorização registrada!");
    window.carregarDadosAtleta();
};

window.excluirAutorizacao = function(idAluno, idx) {
    if (!confirm("Remover esta autorização?")) return;
    const aluno = session.alunos.find(function(a) { return a.id === String(idAluno); });
    if (aluno && aluno.autorizacoes) {
        registrarLogLocal("Admin [" + session.currentUser.nivel + "]", "Remoção Autorização", aluno.nome + " — " + (aluno.autorizacoes[idx]||{}).descricao + " removida.");
        aluno.autorizacoes.splice(idx, 1);
    }
    window.carregarDadosAtleta();
};

// ========================================================
// ⚙️ CONFIGURAÇÕES — PREÇOS GLOBAIS E POR CT
// ========================================================
function renderizarConfiguracoes() {
    document.getElementById('conf-preco-comercial').value = session.precos.Comercial;
    document.getElementById('conf-preco-atleta').value = session.precos.Atleta;
    document.getElementById('conf-preco-particular').value = session.precos.Particular;
    document.getElementById('conf-preco-instrutor').value = session.precos.Instrutor;

    const selCT = document.getElementById('conf-ct-select');
    if (selCT) {
        selCT.innerHTML = '<option value="">Selecione o CT</option>';
        session.cts.forEach(function(c) { selCT.innerHTML += '<option value="' + c.id + '">' + c.nome + '</option>'; });
    }

    const timeline = document.getElementById('timeline-auditoria');
    timeline.innerHTML = "";
    session.logs.forEach(function(l) {
        timeline.innerHTML += '<div class="timeline-item"><div class="meta">' + l.data + ' | <strong>' + l.autor + '</strong></div>' +
            '<div class="acao" style="color:#ba0f14;font-weight:bold;font-size:11px;text-transform:uppercase;">' + l.acao + '</div>' +
            '<div class="detalhe" style="color:#ffffff;margin-top:2px;">' + l.detalhe + '</div></div>';
    });
}

window.carregarPrecoCT = function() {
    const id = document.getElementById('conf-ct-select').value;
    if (!id) return;
    const ct = session.cts.find(function(c) { return c.id === id; });
    if (ct) document.getElementById('conf-ct-mensalidade').value = ct.mensalidade || 0;
};

window.salvarPrecoCT = function() {
    const id = document.getElementById('conf-ct-select').value;
    const valor = parseFloat(document.getElementById('conf-ct-mensalidade').value) || 0;
    if (!id) return alert("Selecione um CT.");
    const ct = session.cts.find(function(c) { return c.id === id; });
    if (ct) {
        ct.mensalidade = valor;
        registrarLogLocal("Admin [" + session.currentUser.nivel + "]", "Preço CT", "Mensalidade de " + ct.nome + " → R$ " + valor.toFixed(2));
        alert("Mensalidade de " + ct.nome + " atualizada!");
        renderizarConfiguracoes();
    }
};

window.firebaseSalvarPrecos = function() {
    session.precos.Comercial = parseFloat(document.getElementById('conf-preco-comercial').value) || 0;
    session.precos.Atleta = parseFloat(document.getElementById('conf-preco-atleta').value) || 0;
    session.precos.Particular = parseFloat(document.getElementById('conf-preco-particular').value) || 0;
    session.precos.Instrutor = parseFloat(document.getElementById('conf-preco-instrutor').value) || 0;
    registrarLogLocal("Admin [" + session.currentUser.nivel + "]", "Tabela de Preços", "Preços globais atualizados.");
    alert("Tabela de preços atualizada!");
    renderizarConfiguracoes();
};

window.firebaseLogoff = function() {
    session.currentUser = null;
    if (html5QrcodeScanner) { try { html5QrcodeScanner.clear(); } catch(e) {} html5QrcodeScanner = null; }
    if (cameraAutStream) { cameraAutStream.getTracks().forEach(function(t){ t.stop(); }); cameraAutStream = null; }
    window.firebaseNavegar(1);
};
