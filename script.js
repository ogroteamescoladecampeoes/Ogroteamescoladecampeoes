// ========================================================
// OGRO TEAM v5.0 — SCRIPT PRINCIPAL
// ========================================================

var DB = {
    precos: { Comercial: 150, Atleta: 100, Bolsista: 0, Instrutor: 80, Particular: 250 },
    precosPorCT: {},   // { ctId: { Comercial:x, Atleta:x, ... } }
    alunos: [
        {
            id: "1", nome: "Carlos Silva", email: "carlos@email.com", whatsapp: "21999998888",
            ctId: "1", plano: "Mensal", status: "Em dia", perfil: "Comercial",
            modalidade: "Muay Thai", graduacao: "VERMELHO", frequencia: 14, foto: "", senha: "123",
            docTipo: "RG", docNumero: "1234567", docFoto: "",
            campeonatos: [{ id:"c1", nome:"Copa RJ 2026", data:"2026-03-10", local:"Rio de Janeiro/RJ", resultado:"Vitória" }],
            autorizacoes: []
        },
        {
            id: "2", nome: "Marcos Lima", email: "marcos@email.com", whatsapp: "21988887777",
            ctId: "1", plano: "Trimestral", status: "Inadimplente", perfil: "Atleta",
            modalidade: "Boxe", graduacao: "CLASSE B", frequencia: 8, foto: "", senha: "123",
            docTipo: "CNH", docNumero: "987654", docFoto: "",
            campeonatos: [], autorizacoes: []
        }
    ],
    cts: [
        {
            id: "1", nome: "CT Matriz", professor: "Professor Igor",
            cnpj: "12.345.678/0001-00", responsavel: "Mestre Ogro",
            endereco: "Av. Principal, 100", cidade: "Rio de Janeiro/RJ",
            whatsapp: "21977776666", capacidade: 30, mensalidade: 150,
            contrato: { dataInicio: "2026-01-01", dataFim: "2026-12-31", arquivo: "", prorrogado: false, historico: [] }
        }
    ],
    admins: [
        { id: "1", nome: "Equipe Ogro", email: "equipeogroteam@gmail.com", senha: "LsBo2026$", nivel: "Mestre" },
        { id: "2", nome: "Apoio 1", email: "apoio@ogroteam.com", senha: "123", nivel: "Apoio Administrativo" }
    ],
    pagamentos: [
        { id: "p1", alunoId: "1", ctId: "1", valor: 150, metodo: "Pix", data: "2026-05-01", status: "Pago" }
    ],
    logs: [
        { data: "20/05/2026 - 09:00", autor: "Sistema", acao: "Inicialização", detalhe: "Ogro Team v5.0 iniciado." }
    ]
};

var currentUser = null;
var qrScanner = null;
var autCameraStream = null;
var docCameraStream = null;

// ========================================================
// UTILITÁRIOS
// ========================================================
function gerarSenha() {
    var chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!";
    var s = "";
    for (var i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
}

function agora() {
    var d = new Date();
    return d.toLocaleDateString('pt-BR') + " - " + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function log(autor, acao, detalhe) {
    DB.logs.unshift({ data: agora(), autor: autor, acao: acao, detalhe: detalhe });
}

function formatarData(s) {
    if (!s) return "—";
    if (s.includes('-')) {
        var p = s.split('-');
        return p[2] + "/" + p[1] + "/" + p[0];
    }
    return s;
}

function getMensalidadeAluno(aluno) {
    // Preço por CT por perfil tem prioridade, depois global
    if (DB.precosPorCT[aluno.ctId] && DB.precosPorCT[aluno.ctId][aluno.perfil] !== undefined) {
        return Number(DB.precosPorCT[aluno.ctId][aluno.perfil]);
    }
    return Number(DB.precos[aluno.perfil]) || 0;
}

function getCTNome(ctId) {
    var ct = DB.cts.find(function(c) { return c.id === ctId; });
    return ct ? ct.nome : "—";
}

function popularCTs(selectId, comTodos) {
    var sel = document.getElementById(selectId);
    if (!sel) return;
    sel.innerHTML = comTodos ? '<option value="">Todos os CTs</option>' : '<option value="">Selecione o CT</option>';
    DB.cts.forEach(function(c) {
        sel.innerHTML += '<option value="' + c.id + '">' + c.nome + '</option>';
    });
}

// ========================================================
// MODAL GENÉRICO
// ========================================================
function mostrarModal(titulo, texto) {
    document.getElementById('modal-titulo').textContent = titulo;
    document.getElementById('modal-texto').textContent = texto;
    document.getElementById('modal').dataset.texto = texto;
    document.getElementById('modal').style.display = 'flex';
}

// ========================================================
// NAVEGAÇÃO
// ========================================================
function ir(pagina) {
    var PERM = {
        "Mestre":                  [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],
        "Administrador Integral":  [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],
        "Apoio Administrativo":    [1,2,3,4,5,6,8,9,10,11,12,14,15],
        "Aluno Instrutor":         [1,2,8,12],
        "Aluno":                   [1,2,12]
    };

    if (pagina !== 1 && pagina !== 2 && !currentUser) {
        mostrarModal("ACESSO NEGADO", "Efetue o login primeiro.");
        return;
    }

    var nivel = currentUser ? currentUser.nivel : "";
    var perm = PERM[nivel] || [1, 2];
    if (currentUser && perm.indexOf(pagina) === -1) {
        mostrarModal("ACESSO RESTRITO", "Seu perfil não tem permissão para esta área.");
        return;
    }

    if (pagina !== 8 && qrScanner) {
        try { qrScanner.clear(); } catch(e) {}
        qrScanner = null;
        var rd = document.getElementById('reader');
        if (rd) { rd.style.display = "none"; rd.innerHTML = ""; }
    }

    var footer = document.querySelector('.footer-fixo');
    var isAdmin = ["Mestre","Administrador Integral","Apoio Administrativo"].indexOf(nivel) !== -1;
    if (isAdmin) footer.classList.add('show-footer');
    else footer.classList.remove('show-footer');

    document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
    var dest = document.getElementById('p' + pagina);
    if (dest) dest.classList.add('active');
    window.scrollTo(0, 0);

    if (pagina === 4)  popularCTs('cad-ct', false);
    if (pagina === 6)  renderDashboard();
    if (pagina === 7)  renderEquipe();
    if (pagina === 8)  renderPresenca();
    if (pagina === 9)  renderRegistros();
    if (pagina === 11) renderRelatorio();
    if (pagina === 12) renderCarteirinha();
    if (pagina === 13) renderConfig();
    if (pagina === 14) renderCampeonatos();
    if (pagina === 15) renderPagamentos();
    if (pagina === 5)  {} // CT page — sem auto-render
}

// ========================================================
// INICIALIZAÇÃO
// ========================================================
document.addEventListener('DOMContentLoaded', function() {

    // data-nav genérico
    document.querySelectorAll('[data-nav]').forEach(function(el) {
        el.addEventListener('click', function() { ir(parseInt(this.dataset.nav)); });
    });

    // --- LOGIN ---
    document.getElementById('toggle-senha').addEventListener('click', function() {
        var inp = document.getElementById('login-senha');
        inp.type = inp.type === 'password' ? 'text' : 'password';
    });

    document.getElementById('btn-login').addEventListener('click', function() {
        var input = document.getElementById('login-email').value.trim();
        var senha = document.getElementById('login-senha').value.trim();
        if (!input || !senha) { mostrarModal("ATENÇÃO", "Preencha login e senha."); return; }

        var adm = DB.admins.find(function(a) { return (a.email === input || a.nome === input) && a.senha === senha; });
        if (adm) {
            currentUser = Object.assign({}, adm);
            log("Admin [" + adm.nivel + "]", "Login", adm.nome + " autenticado.");
            ir(3); return;
        }

        var al = DB.alunos.find(function(a) { return (a.email === input || a.nome === input || a.whatsapp === input) && a.senha === senha; });
        if (al) {
            currentUser = Object.assign({}, al);
            currentUser.nivel = al.perfil === "Instrutor" ? "Aluno Instrutor" : "Aluno";
            ir(12); return;
        }

        mostrarModal("ACESSO NEGADO", "Credenciais inválidas.\nVerifique seu login e senha.");
    });

    document.getElementById('login-senha').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') document.getElementById('btn-login').click();
    });

    // --- RECUPERAÇÃO ---
    document.getElementById('link-esqueceu').addEventListener('click', function() { ir(2); });
    document.getElementById('link-voltar-login').addEventListener('click', function() { ir(1); });
    document.getElementById('btn-recuperar').addEventListener('click', function() {
        var usuario = document.getElementById('recup-usuario').value.trim();
        var nova = document.getElementById('recup-nova').value.trim();
        var confirma = document.getElementById('recup-confirma').value.trim();
        if (!usuario || !nova) { mostrarModal("ATENÇÃO", "Preencha todos os campos."); return; }
        if (nova !== confirma) { mostrarModal("ATENÇÃO", "As senhas não coincidem."); return; }
        var adm = DB.admins.find(function(a) { return a.email === usuario || a.nome === usuario; });
        if (adm) { adm.senha = nova; log("Sistema", "Recuperação", "Senha de " + adm.nome + " redefinida."); mostrarModal("✅ SUCESSO", "Senha atualizada!"); return; }
        var al = DB.alunos.find(function(a) { return a.email === usuario || a.nome === usuario || a.whatsapp === usuario; });
        if (al) { al.senha = nova; log("Sistema", "Recuperação", "Senha de " + al.nome + " redefinida."); mostrarModal("✅ SUCESSO", "Senha atualizada!"); return; }
        mostrarModal("NÃO ENCONTRADO", "Nenhum cadastro encontrado.");
    });

    // --- SAIR ---
    document.getElementById('btn-sair').addEventListener('click', function() {
        currentUser = null;
        document.getElementById('login-email').value = "";
        document.getElementById('login-senha').value = "";
        ir(1);
    });
    document.getElementById('btn-sair-aluno').addEventListener('click', function() { currentUser = null; ir(1); });

    // --- MODAL ---
    document.getElementById('btn-modal-fechar').addEventListener('click', function() {
        document.getElementById('modal').style.display = 'none';
    });
    document.getElementById('btn-modal-copiar').addEventListener('click', function() {
        var texto = document.getElementById('modal').dataset.texto || "";
        if (navigator.clipboard) {
            navigator.clipboard.writeText(texto).then(function() { alert("✅ Copiado!"); });
        } else {
            var ta = document.createElement('textarea');
            ta.value = texto; document.body.appendChild(ta); ta.select();
            document.execCommand('copy'); document.body.removeChild(ta); alert("✅ Copiado!");
        }
    });

    // --- FOTO ALUNO ---
    document.getElementById('aluno-foto-preview').addEventListener('click', function() { document.getElementById('foto-upload').click(); });
    document.getElementById('foto-upload').addEventListener('change', function(e) { lerFoto(e, 'aluno-foto-preview'); });

    // --- DOC CÂMERA ---
    document.getElementById('btn-cad-doc-camera').addEventListener('click', function() {
        var div = document.getElementById('cad-doc-camera-div');
        if (div.style.display === 'block') {
            div.style.display = 'none'; pararStream(docCameraStream); docCameraStream = null;
        } else {
            div.style.display = 'block';
            abrirCameraStream('cad-doc-video', function(s) { docCameraStream = s; });
        }
    });
    document.getElementById('btn-cad-doc-arquivo').addEventListener('click', function() { document.getElementById('cad-doc-arquivo').click(); });
    document.getElementById('cad-doc-arquivo').addEventListener('change', function(e) { lerFoto(e, 'cad-doc-preview'); });
    document.getElementById('btn-cad-doc-capturar').addEventListener('click', function() {
        capturarFoto('cad-doc-video', 'cad-doc-preview');
        document.getElementById('cad-doc-camera-div').style.display = 'none';
        pararStream(docCameraStream); docCameraStream = null;
    });

    // --- SALVAR ALUNO ---
    document.getElementById('btn-salvar-aluno').addEventListener('click', function() {
        var nome = document.getElementById('cad-nome').value.trim();
        var email = document.getElementById('cad-email').value.trim();
        var whatsapp = document.getElementById('cad-whatsapp').value.trim();
        var ctId = document.getElementById('cad-ct').value;
        var perfil = document.getElementById('cad-perfil').value;
        var status = document.getElementById('cad-status').value;
        var graduacao = document.getElementById('cad-graduacao').value.toUpperCase();
        var foto = document.getElementById('aluno-foto-preview').dataset.foto || "";
        var docFoto = document.getElementById('cad-doc-preview').dataset.foto || "";

        if (!nome || !whatsapp) { mostrarModal("ATENÇÃO", "Nome e WhatsApp são obrigatórios."); return; }
        if (!ctId) { mostrarModal("ATENÇÃO", "Selecione o CT/Academia."); return; }

        var senha = gerarSenha();
        var ctNome = getCTNome(ctId);
        var novo = {
            id: String(Date.now()), nome: nome, email: email, whatsapp: whatsapp,
            ctId: ctId, perfil: perfil, status: status, graduacao: graduacao,
            foto: foto, senha: senha,
            plano: document.getElementById('cad-plano').value,
            modalidade: document.getElementById('cad-modalidade').value,
            docTipo: document.getElementById('cad-doc-tipo').value,
            docNumero: document.getElementById('cad-doc-numero').value,
            docFoto: docFoto, frequencia: 0, campeonatos: [], autorizacoes: []
        };

        DB.alunos.push(novo);
        log("Admin [" + currentUser.nivel + "]", "Cadastro Aluno", nome + " — " + ctNome + " | " + perfil);

        ['cad-nome','cad-email','cad-whatsapp','cad-graduacao','cad-doc-numero'].forEach(function(id) {
            document.getElementById(id).value = "";
        });
        document.getElementById('cad-ct').value = "";
        resetPreview('aluno-foto-preview', '📷 Foto');
        resetPreview('cad-doc-preview', 'Foto Doc');

        var msg = "🥋 OGRO TEAM — Bem-vindo(a), " + nome + "!\n\n"
            + "✅ Cadastro realizado.\n\n"
            + "👤 Login: " + (email || nome) + "\n"
            + "🔑 Senha: " + senha + "\n\n"
            + "CT: " + ctNome + "\n"
            + "Perfil: " + perfil;

        // Simula envio e-mail + WhatsApp
        if (email) { log("Sistema", "E-mail", "Credenciais enviadas para " + email); console.info("[EMAIL] " + email + "\n" + msg); }
        if (whatsapp) { log("Sistema", "WhatsApp", "Credenciais enviadas para " + whatsapp); console.info("[WHATSAPP] " + whatsapp + "\n" + msg); }

        mostrarModal("✅ ALUNO CADASTRADO!", msg);
    });

    // --- CT ---
    document.getElementById('btn-salvar-ct').addEventListener('click', function() {
        var nome = document.getElementById('ct-nome').value.trim();
        var professor = document.getElementById('ct-professor').value.trim();
        if (!nome || !professor) { mostrarModal("ATENÇÃO", "Nome e Professor são obrigatórios."); return; }
        var novoId = String(Date.now());
        DB.cts.push({
            id: novoId, nome: nome, professor: professor,
            cnpj: document.getElementById('ct-cnpj').value,
            responsavel: document.getElementById('ct-responsavel').value,
            endereco: document.getElementById('ct-endereco').value,
            cidade: document.getElementById('ct-cidade').value,
            whatsapp: document.getElementById('ct-whatsapp').value,
            capacidade: document.getElementById('ct-capacidade').value,
            mensalidade: document.getElementById('ct-mensalidade').value,
            contrato: { dataInicio: document.getElementById('ct-contrato-inicio').value, dataFim: document.getElementById('ct-contrato-fim').value, arquivo: "", prorrogado: false, historico: [] }
        });
        log("Admin [" + currentUser.nivel + "]", "Cadastro CT", nome + " registrado.");
        mostrarModal("✅ SUCESSO", "CT " + nome + " registrado!");
        ['ct-nome','ct-professor','ct-cnpj','ct-responsavel','ct-endereco','ct-cidade','ct-whatsapp','ct-capacidade','ct-mensalidade','ct-contrato-inicio','ct-contrato-fim'].forEach(function(id) { document.getElementById(id).value = ""; });
        verificarVencimentosContratos();
    });

    // --- CONTRATO ARQUIVO ---
    document.getElementById('btn-ct-contrato-arquivo').addEventListener('click', function() { document.getElementById('ct-contrato-file').click(); });
    document.getElementById('ct-contrato-file').addEventListener('change', function(e) { lerFoto(e, 'ct-contrato-preview'); });

    // --- EQUIPE ---
    document.getElementById('btn-salvar-adm').addEventListener('click', function() {
        var nome = document.getElementById('adm-nome').value.trim();
        var email = document.getElementById('adm-email').value.trim();
        var senha = document.getElementById('adm-senha').value.trim();
        var nivel = document.getElementById('adm-nivel').value;
        if (!nome || !email || !senha) { mostrarModal("ATENÇÃO", "Preencha todos os campos."); return; }
        DB.admins.push({ id: String(Date.now()), nome: nome, email: email, senha: senha, nivel: nivel });
        log("Mestre", "Equipe", nome + " adicionado como " + nivel);
        document.getElementById('adm-nome').value = "";
        document.getElementById('adm-email').value = "";
        document.getElementById('adm-senha').value = "";
        renderEquipe();
    });

    // --- QR CATRACA ---
    document.getElementById('btn-camera-qr').addEventListener('click', function() {
        var readerDiv = document.getElementById('reader');
        if (qrScanner) {
            try { qrScanner.clear(); } catch(e) {}
            qrScanner = null; readerDiv.style.display = "none"; readerDiv.innerHTML = ""; return;
        }
        readerDiv.style.display = "block"; readerDiv.innerHTML = "";
        // Força câmera traseira — sem fallback para frontal
        var config = { fps: 15, qrbox: { width: 220, height: 220 }, videoConstraints: { facingMode: { exact: "environment" } } };
        try {
            qrScanner = new Html5QrcodeScanner("reader", config, false);
            qrScanner.render(function(txt) {
                try { qrScanner.clear(); } catch(e) {}
                qrScanner = null; readerDiv.style.display = "none"; readerDiv.innerHTML = "";
                processarQR(txt);
            }, function() {});
        } catch(e) {
            mostrarModal("ERRO CÂMERA", "Não foi possível acessar a câmera traseira.\nVerifique as permissões do navegador.");
            readerDiv.style.display = "none";
        }
    });

    document.getElementById('btn-checkin').addEventListener('click', function() {
        var id = document.getElementById('presenca-aluno').value;
        if (id) processarQR(id);
    });

    // --- BUSCA REGISTROS ---
    document.getElementById('busca-reativa').addEventListener('input', function() { renderRegistros(); });

    // --- EDIT FOTO ---
    document.getElementById('edit-foto-preview').addEventListener('click', function() { document.getElementById('edit-foto-file').click(); });
    document.getElementById('edit-foto-file').addEventListener('change', function(e) { lerFoto(e, 'edit-foto-preview'); });

    // --- SALVAR EDIÇÃO ---
    document.getElementById('btn-salvar-edicao').addEventListener('click', function() {
        var id = document.getElementById('edit-id').value;
        var al = DB.alunos.find(function(a) { return a.id === id; });
        if (!al) return;
        var gradNova = document.getElementById('edit-graduacao').value.toUpperCase();
        if (al.graduacao !== gradNova) log("Admin", "Graduação", al.nome + ": " + al.graduacao + " → " + gradNova);
        al.nome = document.getElementById('edit-nome').value;
        al.email = document.getElementById('edit-email').value;
        al.whatsapp = document.getElementById('edit-whatsapp').value;
        al.ctId = document.getElementById('edit-ct').value || al.ctId;
        al.plano = document.getElementById('edit-plano').value;
        al.status = document.getElementById('edit-status').value;
        al.perfil = document.getElementById('edit-perfil').value;
        al.modalidade = document.getElementById('edit-modalidade').value;
        al.graduacao = gradNova;
        al.foto = document.getElementById('edit-foto-preview').dataset.foto || al.foto;
        al.docTipo = document.getElementById('edit-doc-tipo').value;
        al.docNumero = document.getElementById('edit-doc-numero').value;
        al.docFoto = document.getElementById('edit-doc-preview').dataset.foto || al.docFoto;
        log("Admin [" + currentUser.nivel + "]", "Edição", al.nome + " atualizado.");
        mostrarModal("✅ SUCESSO", "Dados de " + al.nome + " salvos!");
        ir(9);
    });

    // --- EDIT DOC ---
    document.getElementById('btn-edit-doc-arquivo').addEventListener('click', function() { document.getElementById('edit-doc-file').click(); });
    document.getElementById('edit-doc-file').addEventListener('change', function(e) { lerFoto(e, 'edit-doc-preview'); });

    // --- FILTROS RELATÓRIO ---
    document.getElementById('btn-filtrar-rel').addEventListener('click', function() { renderRelatorio(); });
    document.getElementById('btn-exportar-rel').addEventListener('click', function() { exportarRelatorio(); });

    // --- CONFIGURAÇÕES ---
    document.getElementById('btn-salvar-precos').addEventListener('click', function() {
        DB.precos.Comercial  = parseFloat(document.getElementById('conf-comercial').value)  || 0;
        DB.precos.Atleta     = parseFloat(document.getElementById('conf-atleta').value)      || 0;
        DB.precos.Particular = parseFloat(document.getElementById('conf-particular').value)  || 0;
        DB.precos.Instrutor  = parseFloat(document.getElementById('conf-instrutor').value)   || 0;
        DB.precos.Bolsista   = parseFloat(document.getElementById('conf-bolsista').value)    || 0;
        log("Admin [" + currentUser.nivel + "]", "Preços Globais", "Tabela global atualizada.");
        mostrarModal("✅ SUCESSO", "Preços globais atualizados com sucesso!");
    });

    document.getElementById('conf-ct-sel').addEventListener('change', function() { carregarPrecoCT(); });
    document.getElementById('btn-salvar-preco-ct').addEventListener('click', function() { salvarPrecoCT(); });

    // --- CAMPEONATOS ---
    document.getElementById('btn-salvar-camp').addEventListener('click', function() {
        var id = document.getElementById('camp-atleta').value;
        var nome = document.getElementById('camp-nome').value.trim();
        var data = document.getElementById('camp-data').value;
        var local = document.getElementById('camp-local').value.trim();
        var resultado = document.getElementById('camp-resultado').value;
        if (!id) { mostrarModal("ATENÇÃO", "Selecione o atleta."); return; }
        if (!nome || !data || !local) { mostrarModal("ATENÇÃO", "Preencha nome, data e local."); return; }
        var al = DB.alunos.find(function(a) { return a.id === id; });
        if (!al) return;
        al.campeonatos.push({ id: String(Date.now()), nome: nome, data: data, local: local, resultado: resultado });
        log("Admin [" + currentUser.nivel + "]", "Campeonato", al.nome + " — " + nome + ": " + resultado);
        document.getElementById('camp-nome').value = "";
        document.getElementById('camp-data').value = "";
        document.getElementById('camp-local').value = "";
        mostrarModal("✅ SUCESSO", "Campeonato registrado para " + al.nome + "!");
        carregarAtleta();
    });

    // --- AUTORIZAÇÕES ---
    document.getElementById('btn-aut-camera').addEventListener('click', function() {
        var div = document.getElementById('aut-camera-div');
        if (div.style.display === 'block') {
            div.style.display = 'none'; pararStream(autCameraStream); autCameraStream = null;
        } else {
            div.style.display = 'block';
            abrirCameraStream('aut-video', function(s) { autCameraStream = s; });
        }
    });
    document.getElementById('btn-aut-arquivo').addEventListener('click', function() { document.getElementById('aut-arquivo-input').click(); });
    document.getElementById('aut-arquivo-input').addEventListener('change', function(e) { lerFoto(e, 'aut-preview'); });
    document.getElementById('btn-aut-capturar').addEventListener('click', function() {
        capturarFoto('aut-video', 'aut-preview');
        document.getElementById('aut-camera-div').style.display = 'none';
        pararStream(autCameraStream); autCameraStream = null;
    });
    document.getElementById('btn-salvar-aut').addEventListener('click', function() {
        var id = document.getElementById('camp-atleta').value;
        var desc = document.getElementById('aut-desc').value.trim();
        var foto = document.getElementById('aut-preview').dataset.foto || "";
        if (!id) { mostrarModal("ATENÇÃO", "Selecione o atleta."); return; }
        if (!desc) { mostrarModal("ATENÇÃO", "Descreva o documento."); return; }
        var al = DB.alunos.find(function(a) { return a.id === id; });
        if (!al) return;
        al.autorizacoes.push({ id: String(Date.now()), desc: desc, data: new Date().toLocaleDateString('pt-BR'), foto: foto });
        log("Admin [" + currentUser.nivel + "]", "Autorização", '"' + desc + '" para ' + al.nome);
        document.getElementById('aut-desc').value = "";
        resetPreview('aut-preview', 'Doc');
        mostrarModal("✅ SUCESSO", "Autorização registrada para " + al.nome + "!");
        carregarAtleta();
    });

    // --- PAGAMENTOS ---
    document.getElementById('btn-filtrar-pag').addEventListener('click', function() { renderPagamentos(); });
    document.getElementById('btn-salvar-pag').addEventListener('click', function() { registrarPagamento(); });
    document.getElementById('btn-pag-pix').addEventListener('click', function() { abrirFormPagamento('Pix'); });
    document.getElementById('btn-pag-cartao').addEventListener('click', function() { abrirFormPagamento('Cartão'); });

    verificarVencimentosContratos();
});

// ========================================================
// DASHBOARD
// ========================================================
function renderDashboard() {
    // Filtros
    var filtCT   = document.getElementById('dash-filtro-ct').value;
    var filtPerf = document.getElementById('dash-filtro-perfil').value;
    var filtStat = document.getElementById('dash-filtro-status').value;

    var fat = 0, inad = 0, rec = 0, muay = 0, boxe = 0, mma = 0;
    var alunosFiltrados = DB.alunos.filter(function(a) {
        if (filtCT && a.ctId !== filtCT) return false;
        if (filtPerf !== "Todos" && a.perfil !== filtPerf) return false;
        if (filtStat !== "Todos" && a.status !== filtStat) return false;
        return true;
    });

    alunosFiltrados.forEach(function(a) {
        var val = getMensalidadeAluno(a);
        if (a.status !== "Trancada" && a.status !== "Suspenso") {
            fat += val;
            if (a.status === "Em dia") rec += val; else inad += val;
        }
        if (a.modalidade === "Muay Thai") muay++;
        if (a.modalidade === "Boxe") boxe++;
        if (a.modalidade === "MMA") mma++;
    });

    document.getElementById('dash-fat').textContent = "R$ " + fat.toFixed(2);
    document.getElementById('dash-inad').textContent = "R$ " + inad.toFixed(2);
    document.getElementById('dash-rec').textContent = "R$ " + rec.toFixed(2);

    var tot = muay + boxe + mma || 1;
    document.getElementById('cnt-muay').textContent = muay;
    document.getElementById('cnt-boxe').textContent = boxe;
    document.getElementById('cnt-mma').textContent = mma;
    document.getElementById('bar-muay').style.width = (muay/tot*100) + '%';
    document.getElementById('bar-boxe').style.width = (boxe/tot*100) + '%';
    document.getElementById('bar-mma').style.width = (mma/tot*100) + '%';

    var lista = document.getElementById('dash-devedores');
    lista.innerHTML = "";
    var devs = alunosFiltrados.filter(function(a) { return a.status !== "Em dia"; });
    if (devs.length === 0) {
        lista.innerHTML = "<p style='color:#4ade80;text-align:center;padding:20px'>✅ Sem inadimplentes no filtro selecionado.</p>";
    } else {
        devs.forEach(function(a) {
            var val = getMensalidadeAluno(a).toFixed(2);
            var ctNome = getCTNome(a.ctId);
            var div = document.createElement('div');
            div.className = "item-registro";
            div.innerHTML =
                '<div><strong>' + a.nome + '</strong> [' + a.status.toUpperCase() + ']<br>' +
                '<small style="color:#8a8a8a">R$ ' + val + ' | ' + ctNome + ' | ' + (a.email || 'sem e-mail') + '</small></div>' +
                '<div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end">' +
                '<button class="btn btn-primary" style="padding:4px 8px;font-size:11px;width:auto" onclick="cobrarEmail(\'' + a.id + '\')">📧 E-mail</button>' +
                '<button class="btn btn-accent" style="padding:4px 8px;font-size:11px;width:auto" onclick="cobrarTexto(\'' + a.id + '\')">📋 Copiar msg</button>' +
                '</div>';
            lista.appendChild(div);
        });
    }
}

window.cobrarEmail = function(id) {
    var a = DB.alunos.find(function(x) { return x.id === id; });
    if (!a) return;
    var val = getMensalidadeAluno(a).toFixed(2);
    var msg = "⚠️ OGRO TEAM — Olá " + a.nome + "!\n\nPendência no plano " + a.plano + ".\nValor: R$ " + val + "\n\nRegularize na secretaria.\n\nOgro Team 🥋";
    if (a.email) { log("Admin", "E-mail Cobrança", a.email + " — " + a.nome); console.info("[EMAIL] " + a.email + "\n" + msg); }
    if (a.whatsapp) { log("Admin", "WhatsApp Cobrança", a.whatsapp + " — " + a.nome); console.info("[WHATSAPP] " + a.whatsapp + "\n" + msg); }
    mostrarModal("📧 COBRANÇA — " + a.nome, msg + "\n\n" + (a.email ? "[E-mail simulado → " + a.email + "]" : "⚠️ Sem e-mail") + "\n" + (a.whatsapp ? "[WhatsApp simulado → " + a.whatsapp + "]" : "⚠️ Sem WhatsApp"));
};

window.cobrarTexto = function(id) {
    var a = DB.alunos.find(function(x) { return x.id === id; });
    if (!a) return;
    var val = getMensalidadeAluno(a).toFixed(2);
    mostrarModal("📋 COBRANÇA", "⚠️ OGRO TEAM — Olá " + a.nome + "!\n\nPendência no plano " + a.plano + ".\nValor: R$ " + val + "\n\nRegularize na secretaria para manter seu acesso.\n\nOgro Team 🥋");
};

// ========================================================
// EQUIPE
// ========================================================
function renderEquipe() {
    var lista = document.getElementById('lista-equipe');
    lista.innerHTML = "";
    DB.admins.forEach(function(a) {
        var div = document.createElement('div');
        div.className = "item-registro";
        div.innerHTML = '<div><strong>' + a.nome + '</strong><br><small style="color:#8a8a8a">' + a.nivel + ' | ' + a.email + '</small></div>' +
            (a.id !== "1" ? '<button class="btn btn-vermelho" style="padding:4px 8px;font-size:11px;width:auto" onclick="revogarAdmin(\'' + a.id + '\')">Revogar</button>' : '<small style="color:#16a34a">Master</small>');
        lista.appendChild(div);
    });

    var prom = document.getElementById('lista-promocao');
    prom.innerHTML = "";
    DB.alunos.forEach(function(a) {
        var ctNome = getCTNome(a.ctId);
        var div = document.createElement('div');
        div.className = "item-registro";
        div.innerHTML =
            '<div><span><strong>' + a.nome + '</strong></span><br>' +
            '<small style="color:#8a8a8a">' + a.perfil + ' | ' + ctNome + '</small></div>' +
            '<div style="display:flex;gap:4px">' +
            (a.perfil !== "Instrutor" ? '<button class="btn btn-primary" style="padding:4px 6px;font-size:10px;width:auto" onclick="promover(\'' + a.id + '\',\'Administrador Integral\')">Admin</button>' : '') +
            '<button class="btn btn-accent" style="padding:4px 6px;font-size:10px;width:auto;background:#262626" onclick="promover(\'' + a.id + '\',\'Apoio Administrativo\')">Apoio</button></div>';
        prom.appendChild(div);
    });
}

window.revogarAdmin = function(id) {
    if (!confirm("Revogar acesso?")) return;
    var idx = DB.admins.findIndex(function(a) { return a.id === id; });
    if (idx !== -1) { log("Mestre", "Revogação", DB.admins[idx].nome + " removido."); DB.admins.splice(idx, 1); }
    renderEquipe();
};

window.promover = function(idAluno, nivel) {
    var al = DB.alunos.find(function(a) { return a.id === idAluno; });
    if (!al) return;
    if (al.perfil === "Instrutor" && nivel === "Administrador Integral") { nivel = "Apoio Administrativo"; alert("Instrutor promovido como Apoio Administrativo."); }
    DB.admins.push({ id: String(Date.now()), nome: al.nome, email: al.email || al.nome.replace(/\s/g,'').toLowerCase()+'@ogroteam.com', senha: al.senha || "123", nivel: nivel });
    log("Mestre", "Promoção", al.nome + " → " + nivel);
    renderEquipe();
};

// ========================================================
// PRESENÇA
// ========================================================
function renderPresenca() {
    var sa = document.getElementById('presenca-aluno');
    var sc = document.getElementById('presenca-ct');
    sa.innerHTML = ""; sc.innerHTML = "";
    DB.alunos.forEach(function(a) { sa.innerHTML += '<option value="' + a.id + '">' + a.nome + '</option>'; });
    DB.cts.forEach(function(c) { sc.innerHTML += '<option value="' + c.id + '">' + c.nome + '</option>'; });
}

function processarQR(idAluno) {
    var al = DB.alunos.find(function(a) { return a.id === idAluno; });
    var ctId = document.getElementById('presenca-ct').value;
    var ct = DB.cts.find(function(c) { return c.id === ctId; }) || { nome: "CT Principal" };
    if (!al) { mostrarModal("QR NÃO RECONHECIDO", "QR Code não pertence a nenhum atleta cadastrado."); return; }
    if (al.status === "Suspenso" || al.status === "Trancada") {
        mostrarModal("❌ ACESSO NEGADO", al.nome + "\nStatus: " + al.status.toUpperCase() + "\nProcure a secretaria.");
        return;
    }
    al.frequencia = (al.frequencia || 0) + 1;
    var hora = agora();
    log("Catraca", "Check-in", al.nome + " — " + ct.nome + " — " + hora);
    var mural = document.getElementById('mural-freq');
    var div = document.createElement('div'); div.className = "item-registro";
    div.innerHTML = '<strong>' + hora + '</strong> — 🥋 ' + al.nome + ' | ' + ct.nome;
    mural.insertBefore(div, mural.firstChild);
    mostrarModal("✅ ENTRADA AUTORIZADA", "🥊 Bom treino, " + al.nome + "!\n\n" + ct.nome + "\n" + hora);
}

// ========================================================
// REGISTROS (CENTRAL)
// ========================================================
function renderRegistros() {
    var busca = (document.getElementById('busca-reativa').value || "").toLowerCase();
    var c = document.getElementById('lista-registros');
    c.innerHTML = "";

    var af = DB.alunos.filter(function(a) {
        return a.nome.toLowerCase().includes(busca) || (a.email||"").toLowerCase().includes(busca) || (a.whatsapp||"").includes(busca);
    });
    var cf = DB.cts.filter(function(x) {
        return x.nome.toLowerCase().includes(busca) || x.professor.toLowerCase().includes(busca) || (x.cidade||"").toLowerCase().includes(busca);
    });

    if (af.length === 0 && cf.length === 0) { c.innerHTML = "<p style='color:#8a8a8a;text-align:center;padding:20px'>Nenhum resultado.</p>"; return; }

    af.forEach(function(a) {
        var ctNome = getCTNome(a.ctId);
        var cor = a.status === 'Em dia' ? '#16a34a' : a.status === 'Inadimplente' ? '#ba0f14' : '#d97706';
        var fStyle = a.foto ? 'background-image:url(' + a.foto + ');' : '';
        var div = document.createElement('div'); div.className = "item-registro";
        div.innerHTML =
            '<div style="display:flex;align-items:center;gap:10px">' +
            '<div class="mini-avatar" style="' + fStyle + '"></div>' +
            '<div><strong>' + a.nome + '</strong><br><small style="color:#8a8a8a">' + a.perfil + ' | ' + ctNome + ' | ' + a.graduacao + '</small></div></div>' +
            '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">' +
            '<span class="badge" style="background:' + cor + '">' + a.status + '</span>' +
            '<div><button class="btn btn-primary" style="padding:4px 8px;font-size:11px;width:auto" onclick="abrirEdicao(\'' + a.id + '\')">Editar</button>' +
            '<button class="btn btn-vermelho" style="padding:4px 8px;font-size:11px;width:auto;margin-left:2px" onclick="excluirAluno(\'' + a.id + '\')">Excluir</button></div></div>';
        c.appendChild(div);
    });

    cf.forEach(function(ct) {
        var div = document.createElement('div'); div.className = "item-registro";
        div.innerHTML =
            '<div><strong>🏛️ ' + ct.nome + '</strong><br><small style="color:#8a8a8a">Prof: ' + ct.professor + ' | ' + (ct.cidade||"") + '</small></div>' +
            '<div style="display:flex;gap:4px">' +
            '<button class="btn btn-primary" style="padding:4px 8px;font-size:11px;width:auto" onclick="abrirEdicaoCT(\'' + ct.id + '\')">Editar</button>' +
            '<button class="btn btn-vermelho" style="padding:4px 8px;font-size:11px;width:auto" onclick="excluirCT(\'' + ct.id + '\')">Excluir</button></div>';
        c.appendChild(div);
    });
}

window.abrirEdicao = function(id) {
    var al = DB.alunos.find(function(a) { return a.id === id; });
    if (!al) return;
    document.getElementById('edit-id').value = al.id;
    document.getElementById('edit-nome').value = al.nome;
    document.getElementById('edit-email').value = al.email || "";
    document.getElementById('edit-whatsapp').value = al.whatsapp || "";
    popularCTs('edit-ct', false);
    document.getElementById('edit-ct').value = al.ctId || "";
    document.getElementById('edit-plano').value = al.plano;
    document.getElementById('edit-status').value = al.status;
    document.getElementById('edit-perfil').value = al.perfil;
    document.getElementById('edit-modalidade').value = al.modalidade;
    document.getElementById('edit-graduacao').value = al.graduacao;
    document.getElementById('edit-doc-tipo').value = al.docTipo || "RG";
    document.getElementById('edit-doc-numero').value = al.docNumero || "";

    var ep = document.getElementById('edit-foto-preview');
    if (al.foto) { ep.style.backgroundImage = 'url(' + al.foto + ')'; ep.textContent = ""; ep.dataset.foto = al.foto; }
    else { ep.style.backgroundImage = "none"; ep.textContent = "Foto"; delete ep.dataset.foto; }

    var dp = document.getElementById('edit-doc-preview');
    if (al.docFoto) { dp.style.backgroundImage = 'url(' + al.docFoto + ')'; dp.textContent = ""; dp.dataset.foto = al.docFoto; }
    else { dp.style.backgroundImage = "none"; dp.textContent = "Doc"; delete dp.dataset.foto; }

    // Campeonatos na edição
    var campEl = document.getElementById('edit-camp-lista');
    campEl.innerHTML = "";
    (al.campeonatos || []).forEach(function(c) {
        var cores = { 'Vitória':'#16a34a', 'Derrota':'#ba0f14', 'Empate':'#d97706', 'W.O':'#6b7280' };
        campEl.innerHTML += '<div class="item-registro"><div><strong>' + c.nome + '</strong><br><small style="color:#8a8a8a">' + formatarData(c.data) + ' | ' + c.local + '</small></div><span class="badge" style="background:' + (cores[c.resultado]||'#262626') + '">' + c.resultado + '</span></div>';
    });

    // Autorizações na edição
    var autEl = document.getElementById('edit-aut-lista');
    autEl.innerHTML = "";
    (al.autorizacoes || []).forEach(function(au) {
        autEl.innerHTML += '<div class="item-registro"><div><strong>' + au.desc + '</strong><br><small style="color:#8a8a8a">' + au.data + '</small></div>' +
            (au.foto ? '<div style="width:36px;height:36px;border-radius:4px;background:url(' + au.foto + ') center/cover;border:1px solid #ba0f14"></div>' : '<small style="color:#8a8a8a">Sem foto</small>') + '</div>';
    });

    ir(10);
};

window.abrirEdicaoCT = function(id) {
    var ct = DB.cts.find(function(c) { return c.id === id; });
    if (!ct) return;
    document.getElementById('edit-ct-id').value = ct.id;
    document.getElementById('edit-ct-nome').value = ct.nome;
    document.getElementById('edit-ct-professor').value = ct.professor;
    document.getElementById('edit-ct-cnpj').value = ct.cnpj || "";
    document.getElementById('edit-ct-responsavel').value = ct.responsavel || "";
    document.getElementById('edit-ct-endereco').value = ct.endereco || "";
    document.getElementById('edit-ct-cidade').value = ct.cidade || "";
    document.getElementById('edit-ct-whatsapp').value = ct.whatsapp || "";
    document.getElementById('edit-ct-capacidade').value = ct.capacidade || "";
    document.getElementById('edit-ct-mensalidade').value = ct.mensalidade || "";
    var con = ct.contrato || {};
    document.getElementById('edit-ct-inicio').value = con.dataInicio || "";
    document.getElementById('edit-ct-fim').value = con.dataFim || "";
    ir(16);
};

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('btn-salvar-edit-ct') && document.getElementById('btn-salvar-edit-ct').addEventListener('click', function() {
        var id = document.getElementById('edit-ct-id').value;
        var ct = DB.cts.find(function(c) { return c.id === id; });
        if (!ct) return;
        var nomePrev = ct.nome;
        ct.nome = document.getElementById('edit-ct-nome').value;
        ct.professor = document.getElementById('edit-ct-professor').value;
        ct.cnpj = document.getElementById('edit-ct-cnpj').value;
        ct.responsavel = document.getElementById('edit-ct-responsavel').value;
        ct.endereco = document.getElementById('edit-ct-endereco').value;
        ct.cidade = document.getElementById('edit-ct-cidade').value;
        ct.whatsapp = document.getElementById('edit-ct-whatsapp').value;
        ct.capacidade = document.getElementById('edit-ct-capacidade').value;
        ct.mensalidade = document.getElementById('edit-ct-mensalidade').value;
        if (!ct.contrato) ct.contrato = {};
        var novoinicio = document.getElementById('edit-ct-inicio').value;
        var novofim = document.getElementById('edit-ct-fim').value;
        if (ct.contrato.dataFim && novofim > ct.contrato.dataFim) {
            ct.contrato.historico = ct.contrato.historico || [];
            ct.contrato.historico.push({ dataInicio: ct.contrato.dataInicio, dataFim: ct.contrato.dataFim, prorrogado: true });
            ct.contrato.prorrogado = true;
        }
        ct.contrato.dataInicio = novoinicio;
        ct.contrato.dataFim = novofim;
        log("Admin [" + currentUser.nivel + "]", "Edição CT", nomePrev + " atualizado.");
        mostrarModal("✅ SUCESSO", "CT " + ct.nome + " atualizado!");
        ir(9);
    });

    document.getElementById('btn-prorrogar-ct') && document.getElementById('btn-prorrogar-ct').addEventListener('click', function() {
        var id = document.getElementById('edit-ct-id').value;
        var ct = DB.cts.find(function(c) { return c.id === id; });
        if (!ct || !ct.contrato) return;
        var novaFim = prompt("Nova data de término do contrato (AAAA-MM-DD):", ct.contrato.dataFim || "");
        if (!novaFim) return;
        ct.contrato.historico = ct.contrato.historico || [];
        ct.contrato.historico.push({ dataInicio: ct.contrato.dataInicio, dataFim: ct.contrato.dataFim, prorrogado: true });
        ct.contrato.dataFim = novaFim;
        ct.contrato.prorrogado = true;
        log("Admin [" + currentUser.nivel + "]", "Prorrogação CT", ct.nome + " prorrogado até " + formatarData(novaFim));
        document.getElementById('edit-ct-fim').value = novaFim;
        mostrarModal("✅ SUCESSO", "Contrato de " + ct.nome + " prorrogado até " + formatarData(novaFim));
    });
});

window.excluirAluno = function(id) {
    if (!confirm("Excluir este aluno permanentemente?")) return;
    var idx = DB.alunos.findIndex(function(a) { return a.id === id; });
    if (idx !== -1) { log("Admin [" + currentUser.nivel + "]", "Exclusão", DB.alunos[idx].nome + " removido."); DB.alunos.splice(idx, 1); }
    renderRegistros();
};

window.excluirCT = function(id) {
    if (!confirm("Excluir este CT permanentemente?")) return;
    var idx = DB.cts.findIndex(function(c) { return c.id === id; });
    if (idx !== -1) { log("Admin [" + currentUser.nivel + "]", "Exclusão", DB.cts[idx].nome + " removido."); DB.cts.splice(idx, 1); }
    renderRegistros();
};

// ========================================================
// RELATÓRIOS
// ========================================================
function renderRelatorio() {
    var perfil = document.getElementById('rep-perfil').value;
    var mod    = document.getElementById('rep-modalidade').value;
    var ctFilt = document.getElementById('rep-ct').value;
    var lista  = document.getElementById('rep-lista');
    lista.innerHTML = "";

    var f = DB.alunos;
    if (perfil !== "Todos") f = f.filter(function(a) { return a.perfil === perfil; });
    if (mod !== "Todas")    f = f.filter(function(a) { return a.modalidade === mod; });
    if (ctFilt)             f = f.filter(function(a) { return a.ctId === ctFilt; });

    document.getElementById('rep-count').textContent = f.length;
    var soma = 0; f.forEach(function(a) { soma += getMensalidadeAluno(a); });
    document.getElementById('rep-soma').textContent = "R$ " + soma.toFixed(2);

    if (f.length === 0) { lista.innerHTML = "<p style='color:#8a8a8a;text-align:center;padding:20px'>Nenhum resultado.</p>"; return; }
    f.forEach(function(a) {
        var ctNome = getCTNome(a.ctId);
        var div = document.createElement('div'); div.className = "item-registro";
        div.innerHTML = '<div><strong>' + a.nome + '</strong><br><small style="color:#8a8a8a">' + a.modalidade + ' | ' + ctNome + ' | ' + a.status + '</small></div>' +
            '<span style="color:#4ade80;font-weight:bold">R$ ' + getMensalidadeAluno(a).toFixed(2) + '</span>';
        lista.appendChild(div);
    });
}

function exportarRelatorio() {
    var perfil = document.getElementById('rep-perfil').value;
    var mod    = document.getElementById('rep-modalidade').value;
    var ctFilt = document.getElementById('rep-ct').value;
    var f = DB.alunos;
    if (perfil !== "Todos") f = f.filter(function(a) { return a.perfil === perfil; });
    if (mod !== "Todas")    f = f.filter(function(a) { return a.modalidade === mod; });
    if (ctFilt)             f = f.filter(function(a) { return a.ctId === ctFilt; });
    if (f.length === 0) { mostrarModal("ATENÇÃO", "Nenhum aluno para exportar."); return; }
    var txt = "OGRO TEAM — RELATÓRIO\n" + new Date().toLocaleDateString('pt-BR') + "\nFiltros: " + perfil + " | " + mod + " | CT: " + (ctFilt ? getCTNome(ctFilt) : "Todos") + "\n" + "=".repeat(40) + "\n\n";
    f.forEach(function(a, i) {
        txt += (i+1) + ". " + a.nome + "\n   CT: " + getCTNome(a.ctId) + " | " + a.perfil + " | " + a.modalidade + "\n   Status: " + a.status + " | R$ " + getMensalidadeAluno(a).toFixed(2) + "\n   E-mail: " + (a.email||"—") + " | WhatsApp: " + a.whatsapp + "\n\n";
    });
    log("Admin [" + currentUser.nivel + "]", "Relatório", f.length + " registros exportados.");
    mostrarModal("📊 RELATÓRIO", txt);
}

// ========================================================
// CARTEIRINHA
// ========================================================
function renderCarteirinha() {
    var a = currentUser;
    if (!a) return;
    var alBanco = DB.alunos.find(function(x) { return x.id === a.id; });
    if (alBanco) a = alBanco;

    var ctNome = getCTNome(a.ctId);
    document.getElementById('aluno-nome-tela').textContent = a.nome;
    document.getElementById('aluno-tag').textContent = "[" + (a.perfil||"ALUNO").toUpperCase() + "]";
    document.getElementById('aluno-grad-tela').textContent = (a.modalidade||"") + " — " + (a.graduacao||"");
    document.getElementById('aluno-freq').textContent = a.frequencia || 0;

    document.getElementById('aluno-dados').innerHTML =
        '<div class="dado-item"><span class="dado-label">📧 E-mail</span><span>' + (a.email||"—") + '</span></div>' +
        '<div class="dado-item"><span class="dado-label">📱 WhatsApp</span><span>' + (a.whatsapp||"—") + '</span></div>' +
        '<div class="dado-item"><span class="dado-label">🏛️ CT</span><span>' + ctNome + '</span></div>' +
        '<div class="dado-item"><span class="dado-label">📋 Plano</span><span>' + (a.plano||"—") + '</span></div>';

    var statusEl = document.getElementById('aluno-status');
    if (a.status === "Em dia") {
        statusEl.className = "status-box status-pago";
        statusEl.innerHTML = "<h3>ACESSO AUTORIZADO ✔️</h3><p>Mensalidade em dia.</p>";
    } else {
        statusEl.className = "status-box status-atraso";
        statusEl.innerHTML = "<h3>STATUS: " + (a.status||"").toUpperCase() + " ⚠️</h3><p>Procure a secretaria.</p>";
    }

    var av = document.getElementById('aluno-avatar');
    if (a.foto) { av.style.backgroundImage = 'url(' + a.foto + ')'; av.textContent = ""; }
    else { av.style.backgroundImage = "none"; av.textContent = "👤"; }

    var qrEl = document.getElementById('aluno-qr');
    qrEl.innerHTML = "";
    if (typeof QRCode !== 'undefined') {
        new QRCode(qrEl, { text: String(a.id), width: 130, height: 130, colorDark:"#000000", colorLight:"#ffffff" });
    }

    // Campeonatos
    var camps = document.getElementById('aluno-camps');
    camps.innerHTML = "";
    var lista = a.campeonatos || [];
    if (lista.length === 0) { camps.innerHTML = "<p style='color:#8a8a8a;text-align:center;padding:10px'>Nenhum campeonato.</p>"; }
    else {
        var cores = {'Vitória':'#16a34a','Derrota':'#ba0f14','Empate':'#d97706','W.O':'#6b7280'};
        lista.forEach(function(c) {
            camps.innerHTML += '<div class="item-registro"><div><strong>' + c.nome + '</strong><br><small style="color:#8a8a8a">' + formatarData(c.data) + ' | ' + c.local + '</small></div><span class="badge" style="background:' + (cores[c.resultado]||'#262626') + '">' + c.resultado + '</span></div>';
        });
    }

    document.getElementById('rodape-aluno').textContent = "Perfil: " + (a.perfil||"Aluno") + " | " + ctNome;

    // Pagamento via Pix/Cartão
    var valMensal = getMensalidadeAluno(a).toFixed(2);
    var pixArea = document.getElementById('aluno-pix-area');
    if (pixArea) {
        pixArea.innerHTML =
            '<h3>💳 Pagar Mensalidade</h3>' +
            '<p style="color:#8a8a8a;font-size:13px;margin-bottom:12px">Valor: <strong style="color:#4ade80">R$ ' + valMensal + '</strong></p>' +
            '<button class="btn btn-primary" style="margin-bottom:8px" onclick="pagarPix(\'' + a.id + '\',' + valMensal + ')">💠 Pagar via Pix</button>' +
            '<button class="btn btn-accent" onclick="pagarCartao(\'' + a.id + '\',' + valMensal + ')">💳 Pagar via Cartão (Mercado Pago)</button>';
    }
}

window.pagarPix = function(alunoId, valor) {
    var al = DB.alunos.find(function(a) { return a.id === alunoId; });
    if (!al) return;
    // Simula geração de Pix
    var chavePix = "pagamentos@ogroteam.com.br";
    var msg = "💠 PAGAMENTO VIA PIX\n\nAluno: " + al.nome + "\nValor: R$ " + valor + "\n\nChave Pix: " + chavePix + "\n\nApós o pagamento, envie o comprovante para a secretaria.\n\n[Link de pagamento simulado — integração real via API do banco]";
    log("Aluno", "Pagamento Pix", al.nome + " — R$ " + valor);
    if (al.email) console.info("[EMAIL] Instruções Pix para " + al.email);
    if (al.whatsapp) console.info("[WHATSAPP] Instruções Pix para " + al.whatsapp);
    mostrarModal("💠 PAGAR VIA PIX", msg);
};

window.pagarCartao = function(alunoId, valor) {
    var al = DB.alunos.find(function(a) { return a.id === alunoId; });
    if (!al) return;
    var msg = "💳 PAGAMENTO VIA CARTÃO — MERCADO PAGO\n\nAluno: " + al.nome + "\nValor: R$ " + valor + "\n\nLink de pagamento:\nhttps://mpago.la/ogroteam\n\n[Link de pagamento simulado — integração real via API Mercado Pago]\n\nApós confirmar, o sistema será atualizado automaticamente.";
    log("Aluno", "Pagamento Cartão", al.nome + " — R$ " + valor);
    if (al.email) console.info("[EMAIL] Link Cartão para " + al.email);
    if (al.whatsapp) console.info("[WHATSAPP] Link Cartão para " + al.whatsapp);
    mostrarModal("💳 PAGAR VIA CARTÃO", msg);
};

// ========================================================
// CONFIGURAÇÕES
// ========================================================
function renderConfig() {
    document.getElementById('conf-comercial').value  = DB.precos.Comercial;
    document.getElementById('conf-atleta').value     = DB.precos.Atleta;
    document.getElementById('conf-particular').value = DB.precos.Particular;
    document.getElementById('conf-instrutor').value  = DB.precos.Instrutor;
    document.getElementById('conf-bolsista').value   = DB.precos.Bolsista || 0;

    popularCTs('conf-ct-sel', false);

    var tl = document.getElementById('timeline-auditoria');
    tl.innerHTML = "";
    DB.logs.forEach(function(l) {
        tl.innerHTML += '<div class="timeline-item"><div class="meta">' + l.data + ' | <strong>' + l.autor + '</strong></div>' +
            '<div class="acao" style="color:#ba0f14;font-weight:bold;font-size:11px;text-transform:uppercase">' + l.acao + '</div>' +
            '<div style="color:#fff;margin-top:2px;font-size:12px">' + l.detalhe + '</div></div>';
    });
}

function carregarPrecoCT() {
    var id = document.getElementById('conf-ct-sel').value;
    if (!id) return;
    var ct = DB.cts.find(function(c) { return c.id === id; });
    var precosCT = DB.precosPorCT[id] || {};
    document.getElementById('conf-ct-comercial').value  = precosCT.Comercial  !== undefined ? precosCT.Comercial  : (ct ? ct.mensalidade : "");
    document.getElementById('conf-ct-atleta').value     = precosCT.Atleta     !== undefined ? precosCT.Atleta     : "";
    document.getElementById('conf-ct-particular').value = precosCT.Particular !== undefined ? precosCT.Particular : "";
    document.getElementById('conf-ct-instrutor').value  = precosCT.Instrutor  !== undefined ? precosCT.Instrutor  : "";
    document.getElementById('conf-ct-bolsista').value   = precosCT.Bolsista   !== undefined ? precosCT.Bolsista   : "";
}

function salvarPrecoCT() {
    var id = document.getElementById('conf-ct-sel').value;
    if (!id) { mostrarModal("ATENÇÃO", "Selecione um CT."); return; }
    var ct = DB.cts.find(function(c) { return c.id === id; });
    DB.precosPorCT[id] = {
        Comercial:  parseFloat(document.getElementById('conf-ct-comercial').value)  || 0,
        Atleta:     parseFloat(document.getElementById('conf-ct-atleta').value)     || 0,
        Particular: parseFloat(document.getElementById('conf-ct-particular').value) || 0,
        Instrutor:  parseFloat(document.getElementById('conf-ct-instrutor').value)  || 0,
        Bolsista:   parseFloat(document.getElementById('conf-ct-bolsista').value)   || 0
    };
    log("Admin [" + currentUser.nivel + "]", "Preço CT", (ct ? ct.nome : id) + " — preços por perfil atualizados.");
    mostrarModal("✅ SUCESSO", "Preços do " + (ct ? ct.nome : id) + " atualizados por perfil!");
}

// ========================================================
// CAMPEONATOS E AUTORIZAÇÕES
// ========================================================
function renderCampeonatos() {
    var sel = document.getElementById('camp-atleta');
    sel.innerHTML = '<option value="">Selecione o Atleta</option>';
    DB.alunos.forEach(function(a) { sel.innerHTML += '<option value="' + a.id + '">' + a.nome + ' (' + getCTNome(a.ctId) + ')</option>'; });
    document.getElementById('camp-lista').innerHTML = "";
    document.getElementById('aut-lista').innerHTML = "";
}

window.carregarAtleta = function() {
    var id = document.getElementById('camp-atleta').value;
    var al = DB.alunos.find(function(a) { return a.id === id; });
    var campLista = document.getElementById('camp-lista');
    var autLista  = document.getElementById('aut-lista');
    campLista.innerHTML = ""; autLista.innerHTML = "";
    if (!al) return;

    var cores = {'Vitória':'#16a34a','Derrota':'#ba0f14','Empate':'#d97706','W.O':'#6b7280'};
    var camps = al.campeonatos || [];
    if (camps.length === 0) campLista.innerHTML = "<p style='color:#8a8a8a;text-align:center;padding:10px'>Nenhum campeonato.</p>";
    else camps.forEach(function(c, i) {
        var div = document.createElement('div'); div.className = "item-registro";
        div.innerHTML = '<div><strong>' + c.nome + '</strong><br><small style="color:#8a8a8a">' + formatarData(c.data) + ' | ' + c.local + '</small></div>' +
            '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">' +
            '<span class="badge" style="background:' + (cores[c.resultado]||'#262626') + '">' + c.resultado + '</span>' +
            '<button class="btn btn-vermelho" style="padding:2px 6px;font-size:10px;width:auto" onclick="excluirCamp(\'' + id + '\',' + i + ')">Remover</button></div>';
        campLista.appendChild(div);
    });

    var auts = al.autorizacoes || [];
    if (auts.length === 0) autLista.innerHTML = "<p style='color:#8a8a8a;text-align:center;padding:10px'>Nenhuma autorização.</p>";
    else auts.forEach(function(au, i) {
        var div = document.createElement('div'); div.className = "item-registro";
        div.innerHTML = '<div><strong>' + au.desc + '</strong><br><small style="color:#8a8a8a">' + au.data + '</small></div>' +
            '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">' +
            (au.foto ? '<div style="width:40px;height:40px;border-radius:4px;background:url(' + au.foto + ') center/cover;border:1px solid #ba0f14"></div>' : '') +
            '<button class="btn btn-vermelho" style="padding:2px 6px;font-size:10px;width:auto" onclick="excluirAut(\'' + id + '\',' + i + ')">Remover</button></div>';
        autLista.appendChild(div);
    });
};

window.excluirCamp = function(idAluno, idx) {
    if (!confirm("Remover campeonato?")) return;
    var al = DB.alunos.find(function(a) { return a.id === idAluno; });
    if (al) { log("Admin", "Remoção", al.campeonatos[idx].nome + " de " + al.nome); al.campeonatos.splice(idx, 1); }
    carregarAtleta();
};

window.excluirAut = function(idAluno, idx) {
    if (!confirm("Remover autorização?")) return;
    var al = DB.alunos.find(function(a) { return a.id === idAluno; });
    if (al) { log("Admin", "Remoção", al.autorizacoes[idx].desc + " de " + al.nome); al.autorizacoes.splice(idx, 1); }
    carregarAtleta();
};

// ========================================================
// PAGAMENTOS (P15)
// ========================================================
function renderPagamentos() {
    var filtNome  = (document.getElementById('pag-filtro-nome').value || "").toLowerCase();
    var filtCT    = document.getElementById('pag-filtro-ct').value;
    var filtDe    = document.getElementById('pag-filtro-de').value;
    var filtAte   = document.getElementById('pag-filtro-ate').value;
    var filtValMin = parseFloat(document.getElementById('pag-filtro-val-min').value) || 0;
    var filtValMax = parseFloat(document.getElementById('pag-filtro-val-max').value) || Infinity;

    var lista = document.getElementById('pag-lista');
    lista.innerHTML = "";

    var f = DB.pagamentos.filter(function(p) {
        var al = DB.alunos.find(function(a) { return a.id === p.alunoId; });
        var nomeOk = !filtNome || (al && al.nome.toLowerCase().includes(filtNome));
        var ctOk   = !filtCT  || p.ctId === filtCT;
        var deOk   = !filtDe  || p.data >= filtDe;
        var ateOk  = !filtAte || p.data <= filtAte;
        var valOk  = p.valor >= filtValMin && p.valor <= filtValMax;
        return nomeOk && ctOk && deOk && ateOk && valOk;
    });

    // Totalizador
    var total = 0; f.forEach(function(p) { total += p.valor; });

    // Totalizador sem filtro de data = tudo
    var totalGeral = 0; DB.pagamentos.forEach(function(p) { totalGeral += p.valor; });

    document.getElementById('pag-total-filtro').textContent = "R$ " + total.toFixed(2);
    document.getElementById('pag-total-geral').textContent  = "R$ " + totalGeral.toFixed(2);
    document.getElementById('pag-count').textContent = f.length;

    if (f.length === 0) { lista.innerHTML = "<p style='color:#8a8a8a;text-align:center;padding:20px'>Nenhum pagamento encontrado.</p>"; return; }

    f.forEach(function(p) {
        var al = DB.alunos.find(function(a) { return a.id === p.alunoId; });
        var nome = al ? al.nome : "—";
        var ctNome = getCTNome(p.ctId);
        var corMetodo = p.metodo === "Pix" ? '#4ade80' : '#2563eb';
        var div = document.createElement('div'); div.className = "item-registro";
        div.innerHTML =
            '<div>' +
            '<strong>' + nome + '</strong><br>' +
            '<small style="color:#8a8a8a">' + formatarData(p.data) + ' | ' + ctNome + '</small>' +
            '</div>' +
            '<div style="text-align:right">' +
            '<span style="color:#4ade80;font-weight:bold;display:block">R$ ' + p.valor.toFixed(2) + '</span>' +
            '<span class="badge" style="background:' + corMetodo + '">' + p.metodo + '</span>' +
            '</div>';
        lista.appendChild(div);
    });
}

window.abrirFormPagamento = function(metodo) {
    document.getElementById('pag-metodo').value = metodo;
    document.getElementById('form-novo-pagamento').style.display = 'block';
    // Popula alunos e CTs no form
    popularCTs('pag-ct-sel', false);
    var selAl = document.getElementById('pag-aluno-sel');
    selAl.innerHTML = '<option value="">Selecione o aluno</option>';
    DB.alunos.forEach(function(a) { selAl.innerHTML += '<option value="' + a.id + '">' + a.nome + '</option>'; });
};

function registrarPagamento() {
    var alunoId = document.getElementById('pag-aluno-sel').value;
    var ctId    = document.getElementById('pag-ct-sel').value;
    var valor   = parseFloat(document.getElementById('pag-valor').value);
    var metodo  = document.getElementById('pag-metodo').value;
    var data    = document.getElementById('pag-data').value || new Date().toISOString().split('T')[0];

    if (!alunoId) { mostrarModal("ATENÇÃO", "Selecione o aluno."); return; }
    if (!valor || valor <= 0) { mostrarModal("ATENÇÃO", "Informe o valor pago."); return; }

    var al = DB.alunos.find(function(a) { return a.id === alunoId; });
    if (!al) return;

    DB.pagamentos.push({ id: String(Date.now()), alunoId: alunoId, ctId: ctId || al.ctId, valor: valor, metodo: metodo, data: data, status: "Pago" });

    // Atualiza status do aluno para Em dia se havia inadimplente
    if (al.status === "Inadimplente") { al.status = "Em dia"; log("Sistema", "Status Atualizado", al.nome + " → Em dia após pagamento."); }

    log("Admin [" + currentUser.nivel + "]", "Pagamento", al.nome + " — R$ " + valor.toFixed(2) + " via " + metodo);

    // Simula e-mail + WhatsApp de confirmação
    var msg = "✅ OGRO TEAM — Pagamento confirmado!\n\nAluno: " + al.nome + "\nValor: R$ " + valor.toFixed(2) + "\nMétodo: " + metodo + "\nData: " + formatarData(data);
    if (al.email) { console.info("[EMAIL] " + al.email + "\n" + msg); }
    if (al.whatsapp) { console.info("[WHATSAPP] " + al.whatsapp + "\n" + msg); }

    document.getElementById('form-novo-pagamento').style.display = 'none';
    document.getElementById('pag-valor').value = "";
    document.getElementById('pag-aluno-sel').value = "";

    mostrarModal("✅ PAGAMENTO REGISTRADO", msg);
    renderPagamentos();
}

// ========================================================
// CONTRATOS — VERIFICAÇÃO DE VENCIMENTO
// ========================================================
function verificarVencimentosContratos() {
    var hoje = new Date().toISOString().split('T')[0];
    var avisos = [];
    DB.cts.forEach(function(ct) {
        if (!ct.contrato || !ct.contrato.dataFim) return;
        var fim = ct.contrato.dataFim;
        var diffDias = Math.floor((new Date(fim) - new Date(hoje)) / (1000 * 60 * 60 * 24));
        if (diffDias <= 30 && diffDias >= 0) {
            avisos.push("⚠️ Contrato " + ct.nome + " vence em " + diffDias + " dia(s) — " + formatarData(fim));
        } else if (diffDias < 0) {
            avisos.push("❌ Contrato " + ct.nome + " VENCIDO em " + formatarData(fim));
        }
    });
    if (avisos.length > 0) {
        setTimeout(function() { mostrarModal("📋 AVISOS DE CONTRATO", avisos.join("\n\n")); }, 800);
    }
}

// ========================================================
// CÂMERA E FOTO — UTILITÁRIOS
// ========================================================
function lerFoto(event, previewId) {
    var file = event.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function() {
        var el = document.getElementById(previewId);
        el.style.backgroundImage = 'url(' + reader.result + ')';
        el.textContent = "";
        el.dataset.foto = reader.result;
    };
    reader.readAsDataURL(file);
}

function resetPreview(id, texto) {
    var el = document.getElementById(id);
    el.style.backgroundImage = "none";
    el.textContent = texto;
    delete el.dataset.foto;
}

function pararStream(stream) {
    if (stream) stream.getTracks().forEach(function(t) { t.stop(); });
}

function abrirCameraStream(videoId, callback) {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: { exact: "environment" } } })
        .catch(function() { return navigator.mediaDevices.getUserMedia({ video: true }); })
        .then(function(stream) {
            callback(stream);
            var v = document.getElementById(videoId);
            v.srcObject = stream; v.play();
        })
        .catch(function() { mostrarModal("ERRO", "Câmera não disponível. Verifique as permissões."); });
}

function capturarFoto(videoId, previewId) {
    var v = document.getElementById(videoId);
    var canvas = document.createElement('canvas');
    canvas.width = v.videoWidth; canvas.height = v.videoHeight;
    canvas.getContext('2d').drawImage(v, 0, 0);
    var dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    var prev = document.getElementById(previewId);
    prev.style.backgroundImage = 'url(' + dataUrl + ')';
    prev.textContent = "";
    prev.dataset.foto = dataUrl;
}
