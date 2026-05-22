// ========================================================
// OGRO TEAM v6.0 — SCRIPT PRINCIPAL
// ========================================================

var DB = {
    precos: { Comercial: 150, Atleta: 100, Bolsista: 0, Instrutor: 80, Particular: 250 },
    precosPorCT: {},
    alunos: [
        {
            id: "1", nome: "Carlos Silva", email: "carlos@email.com", whatsapp: "21999998888",
            ctId: "1", plano: "Mensal", status: "Em dia", perfil: "Comercial",
            modalidade: "Muay Thai", graduacao: "VERMELHO", frequencia: 14, foto: "", senha: "123",
            docTipo: "RG", docNumero: "1234567", docFoto: "",
            campeonatos: [{ id: "c1", nome: "Copa RJ 2026", data: "2026-03-10", local: "Rio de Janeiro/RJ", resultado: "Vitória", anexo: "" }],
            autorizacoes: [], condicoesClincias: [],
            avisos: [], suspensaoMotivo: "",
            historicoPagamentos: []
        },
        {
            id: "2", nome: "Marcos Lima", email: "marcos@email.com", whatsapp: "21988887777",
            ctId: "1", plano: "Trimestral", status: "Inadimplente", perfil: "Atleta",
            modalidade: "Boxe", graduacao: "CLASSE B", frequencia: 8, foto: "", senha: "123",
            docTipo: "CNH", docNumero: "987654", docFoto: "",
            campeonatos: [], autorizacoes: [], condicoesClincias: [],
            avisos: [], suspensaoMotivo: "",
            historicoPagamentos: []
        }
    ],
    cts: [
        {
            id: "1", nome: "CT Matriz", responsavel: "Igor Santos", instrutor: "Mestre Ogro",
            cnpj: "12.345.678/0001-00", endereco: "Av. Principal, 100", cidade: "Rio de Janeiro/RJ",
            whatsapp: "21977776666", capacidade: 30, mensalidade: 150,
            contrato: { dataInicio: "2026-01-01", dataFim: "2026-12-31", arquivo: "", historico: [] }
        }
    ],
    admins: [
        { id: "1", nome: "Equipe Ogro", email: "equipeogroteam@gmail.com", senha: "LsBo2026$", nivel: "Mestre" },
        { id: "2", nome: "Apoio 1", email: "apoio@ogroteam.com", senha: "123", nivel: "Apoio Administrativo" }
    ],
    pagamentos: [
        { id: "p1", alunoId: "1", ctId: "1", valor: 150, metodo: "Pix", data: "2026-05-01", status: "Pago" }
    ],
    avisosMural: [],
    presencaSemanal: {},
    logs: [
        { data: "21/05/2026 - 09:00", autor: "Sistema", acao: "Inicialização", detalhe: "Ogro Team v6.0 iniciado." }
    ]
};

var currentUser = null;
var qrScanner = null;
var autCameraStream = null;
var docCameraStream = null;
var autorizCameraStream = null;
var clinicaCameraStream = null;

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
    if (s.includes('-')) { var p = s.split('-'); return p[2] + "/" + p[1] + "/" + p[0]; }
    return s;
}

function getMensalidadeAluno(aluno) {
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
    DB.cts.forEach(function(c) { sel.innerHTML += '<option value="' + c.id + '">' + c.nome + '</option>'; });
}

function popularAlunosPorCT(selectId, ctId) {
    var sel = document.getElementById(selectId);
    if (!sel) return;
    sel.innerHTML = '<option value="">Todos os alunos</option>';
    var lista = ctId ? DB.alunos.filter(function(a) { return a.ctId === ctId; }) : DB.alunos;
    lista.forEach(function(a) { sel.innerHTML += '<option value="' + a.id + '">' + a.nome + '</option>'; });
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
// AVISOS / MURAL — SISTEMA INTERNO
// ========================================================
function enviarAvisoInterno(alunoId, titulo, corpo, autor) {
    var aviso = {
        id: String(Date.now()),
        titulo: titulo,
        corpo: corpo,
        autor: autor || (currentUser ? currentUser.nome : "Sistema"),
        data: agora(),
        lido: false
    };
    if (alunoId === "todos") {
        DB.alunos.forEach(function(a) {
            if (!a.avisos) a.avisos = [];
            a.avisos.unshift(JSON.parse(JSON.stringify(aviso)));
        });
    } else {
        var al = DB.alunos.find(function(a) { return a.id === alunoId; });
        if (al) { if (!al.avisos) al.avisos = []; al.avisos.unshift(aviso); }
    }
    DB.avisosMural.unshift({ alunoId: alunoId, aviso: aviso });
    log(aviso.autor, "Aviso Enviado", titulo + (alunoId === "todos" ? " → Todos" : " → " + getCTNome(alunoId)));
    // Simula email
    if (alunoId !== "todos") {
        var al2 = DB.alunos.find(function(a) { return a.id === alunoId; });
        if (al2 && al2.email) console.info("[EMAIL] " + al2.email + " | " + titulo + "\n" + corpo);
    } else {
        DB.alunos.forEach(function(a) { if (a.email) console.info("[EMAIL] " + a.email + " | " + titulo); });
    }
}

// ========================================================
// NAVEGAÇÃO
// ========================================================
function ir(pagina) {
    var PERM = {
        "Mestre":                 [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18],
        "Administrador Integral": [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18],
        "Apoio Administrativo":   [1,2,3,4,5,6,8,9,10,11,12,14,15,16,17,18],
        "Aluno Instrutor":        [1,2,8,12],
        "Aluno":                  [1,2,12]
    };
    if (pagina !== 1 && pagina !== 2 && !currentUser) { mostrarModal("ACESSO NEGADO", "Efetue o login primeiro."); return; }
    var nivel = currentUser ? currentUser.nivel : "";
    var perm = PERM[nivel] || [1, 2];
    if (currentUser && perm.indexOf(pagina) === -1) { mostrarModal("ACESSO RESTRITO", "Seu perfil não tem permissão para esta área."); return; }

    if (pagina !== 8 && qrScanner) {
        try { qrScanner.clear(); } catch(e) {}
        qrScanner = null;
        var rd = document.getElementById('reader');
        if (rd) { rd.style.display = "none"; rd.innerHTML = ""; }
    }

    var footer = document.querySelector('.footer-fixo');
    var isAdmin = ["Mestre","Administrador Integral","Apoio Administrativo"].indexOf(nivel) !== -1;
    footer.classList.toggle('show-footer', isAdmin);

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
    if (pagina === 16) {} // edição CT
    if (pagina === 17) renderAvisos();
    if (pagina === 18) renderAutorizacaoClinica();
}

// ========================================================
// INICIALIZAÇÃO
// ========================================================
document.addEventListener('DOMContentLoaded', function() {

    document.querySelectorAll('[data-nav]').forEach(function(el) {
        el.addEventListener('click', function() { ir(parseInt(this.dataset.nav)); });
    });

    // LOGIN
    document.getElementById('toggle-senha').addEventListener('click', function() {
        var inp = document.getElementById('login-senha');
        inp.type = inp.type === 'password' ? 'text' : 'password';
    });
    document.getElementById('btn-login').addEventListener('click', function() {
        var input = document.getElementById('login-email').value.trim();
        var senha = document.getElementById('login-senha').value.trim();
        if (!input || !senha) { mostrarModal("ATENÇÃO", "Preencha login e senha."); return; }
        var adm = DB.admins.find(function(a) { return (a.email === input || a.nome === input) && a.senha === senha; });
        if (adm) { currentUser = Object.assign({}, adm); log("Admin", "Login", adm.nome + " autenticado."); ir(3); return; }
        var al = DB.alunos.find(function(a) { return (a.email === input || a.nome === input || a.whatsapp === input) && a.senha === senha; });
        if (al) { currentUser = Object.assign({}, al); currentUser.nivel = al.perfil === "Instrutor" ? "Aluno Instrutor" : "Aluno"; ir(12); return; }
        mostrarModal("ACESSO NEGADO", "Credenciais inválidas.\nVerifique seu login e senha.");
    });
    document.getElementById('login-senha').addEventListener('keypress', function(e) { if (e.key === 'Enter') document.getElementById('btn-login').click(); });

    // RECUPERAÇÃO
    document.getElementById('link-esqueceu').addEventListener('click', function() { ir(2); });
    document.getElementById('link-voltar-login').addEventListener('click', function() { ir(1); });
    document.getElementById('btn-recuperar').addEventListener('click', function() {
        var u = document.getElementById('recup-usuario').value.trim();
        var n = document.getElementById('recup-nova').value.trim();
        var c = document.getElementById('recup-confirma').value.trim();
        if (!u || !n) { mostrarModal("ATENÇÃO", "Preencha todos os campos."); return; }
        if (n !== c) { mostrarModal("ATENÇÃO", "As senhas não coincidem."); return; }
        var adm = DB.admins.find(function(a) { return a.email === u || a.nome === u; });
        if (adm) { adm.senha = n; mostrarModal("✅ SUCESSO", "Senha atualizada!"); return; }
        var al = DB.alunos.find(function(a) { return a.email === u || a.nome === u || a.whatsapp === u; });
        if (al) { al.senha = n; mostrarModal("✅ SUCESSO", "Senha atualizada!"); return; }
        mostrarModal("NÃO ENCONTRADO", "Cadastro não encontrado.");
    });

    // SAIR
    document.getElementById('btn-sair').addEventListener('click', function() { currentUser = null; document.getElementById('login-email').value = ""; document.getElementById('login-senha').value = ""; ir(1); });
    document.getElementById('btn-sair-aluno').addEventListener('click', function() { currentUser = null; ir(1); });

    // MODAL
    document.getElementById('btn-modal-fechar').addEventListener('click', function() { document.getElementById('modal').style.display = 'none'; });
    document.getElementById('btn-modal-copiar').addEventListener('click', function() {
        var t = document.getElementById('modal').dataset.texto || "";
        if (navigator.clipboard) { navigator.clipboard.writeText(t).then(function() { alert("✅ Copiado!"); }); }
        else { var ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); alert("✅ Copiado!"); }
    });

    // FOTO ALUNO
    document.getElementById('aluno-foto-preview').addEventListener('click', function() { document.getElementById('foto-upload').click(); });
    document.getElementById('foto-upload').addEventListener('change', function(e) { lerFoto(e, 'aluno-foto-preview'); });

    // DOC CÂMERA
    document.getElementById('btn-cad-doc-camera').addEventListener('click', function() {
        var div = document.getElementById('cad-doc-camera-div');
        if (div.style.display === 'block') { div.style.display = 'none'; pararStream(docCameraStream); docCameraStream = null; }
        else { div.style.display = 'block'; abrirCameraStream('cad-doc-video', function(s) { docCameraStream = s; }); }
    });
    document.getElementById('btn-cad-doc-arquivo').addEventListener('click', function() { document.getElementById('cad-doc-arquivo').click(); });
    document.getElementById('cad-doc-arquivo').addEventListener('change', function(e) { lerFoto(e, 'cad-doc-preview'); });
    document.getElementById('btn-cad-doc-capturar').addEventListener('click', function() {
        capturarFoto('cad-doc-video', 'cad-doc-preview');
        document.getElementById('cad-doc-camera-div').style.display = 'none';
        pararStream(docCameraStream); docCameraStream = null;
    });

    // SALVAR ALUNO
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
            foto: foto, senha: senha, plano: document.getElementById('cad-plano').value,
            modalidade: document.getElementById('cad-modalidade').value,
            docTipo: document.getElementById('cad-doc-tipo').value,
            docNumero: document.getElementById('cad-doc-numero').value,
            docFoto: docFoto, frequencia: 0, campeonatos: [], autorizacoes: [],
            condicoesClincias: [], avisos: [], suspensaoMotivo: "", historicoPagamentos: []
        };
        DB.alunos.push(novo);
        log("Admin [" + currentUser.nivel + "]", "Cadastro Aluno", nome + " — " + ctNome);
        ['cad-nome','cad-email','cad-whatsapp','cad-graduacao','cad-doc-numero'].forEach(function(id) { document.getElementById(id).value = ""; });
        document.getElementById('cad-ct').value = "";
        resetPreview('aluno-foto-preview', '📷 Foto');
        resetPreview('cad-doc-preview', 'Foto Doc');
        var msg = "🥋 OGRO TEAM — Bem-vindo(a), " + nome + "!\n\n✅ Cadastro realizado.\n\n👤 Login: " + (email || nome) + "\n🔑 Senha: " + senha + "\n\nCT: " + ctNome + "\nPerfil: " + perfil;
        if (email) { console.info("[EMAIL] " + email + "\n" + msg); }
        // Aviso interno
        enviarAvisoInterno(novo.id, "Bem-vindo ao Ogro Team! 🥋", "Seu cadastro foi realizado com sucesso.\nLogin: " + (email || nome) + "\nSenha: " + senha, "Sistema");
        mostrarModal("✅ ALUNO CADASTRADO!", msg);
    });

    // CT
    document.getElementById('btn-salvar-ct').addEventListener('click', function() {
        var nome = document.getElementById('ct-nome').value.trim();
        var responsavel = document.getElementById('ct-responsavel').value.trim();
        if (!nome || !responsavel) { mostrarModal("ATENÇÃO", "Nome e Responsável são obrigatórios."); return; }
        var novoId = String(Date.now());
        DB.cts.push({
            id: novoId, nome: nome, responsavel: responsavel,
            instrutor: document.getElementById('ct-instrutor').value,
            cnpj: document.getElementById('ct-cnpj').value,
            endereco: document.getElementById('ct-endereco').value,
            cidade: document.getElementById('ct-cidade').value,
            whatsapp: document.getElementById('ct-whatsapp').value,
            capacidade: document.getElementById('ct-capacidade').value,
            mensalidade: document.getElementById('ct-mensalidade').value,
            contrato: { dataInicio: document.getElementById('ct-contrato-inicio').value, dataFim: document.getElementById('ct-contrato-fim').value, arquivo: document.getElementById('ct-contrato-preview').dataset.foto || "", historico: [] }
        });
        log("Admin [" + currentUser.nivel + "]", "Cadastro CT", nome + " registrado.");
        mostrarModal("✅ SUCESSO", "CT " + nome + " registrado!");
        ['ct-nome','ct-responsavel','ct-instrutor','ct-cnpj','ct-endereco','ct-cidade','ct-whatsapp','ct-capacidade','ct-mensalidade','ct-contrato-inicio','ct-contrato-fim'].forEach(function(id) { document.getElementById(id).value = ""; });
        resetPreview('ct-contrato-preview', 'Contrato');
        verificarVencimentosContratos();
    });
    document.getElementById('btn-ct-contrato-arquivo').addEventListener('click', function() { document.getElementById('ct-contrato-file').click(); });
    document.getElementById('ct-contrato-file').addEventListener('change', function(e) { lerFoto(e, 'ct-contrato-preview'); });

    // EQUIPE
    document.getElementById('btn-salvar-adm').addEventListener('click', function() {
        var nome = document.getElementById('adm-nome').value.trim();
        var email = document.getElementById('adm-email').value.trim();
        var senha = document.getElementById('adm-senha').value.trim();
        var nivel = document.getElementById('adm-nivel').value;
        if (!nome || !email || !senha) { mostrarModal("ATENÇÃO", "Preencha todos os campos."); return; }
        DB.admins.push({ id: String(Date.now()), nome: nome, email: email, senha: senha, nivel: nivel });
        log("Mestre", "Equipe", nome + " adicionado como " + nivel);
        document.getElementById('adm-nome').value = ""; document.getElementById('adm-email').value = ""; document.getElementById('adm-senha').value = "";
        renderEquipe();
    });

    // QR CATRACA — câmera traseira forçada
    document.getElementById('btn-camera-qr').addEventListener('click', function() {
        var readerDiv = document.getElementById('reader');
        if (qrScanner) { try { qrScanner.clear(); } catch(e) {} qrScanner = null; readerDiv.style.display = "none"; readerDiv.innerHTML = ""; return; }
        readerDiv.style.display = "block"; readerDiv.innerHTML = "";
        try {
            qrScanner = new Html5QrcodeScanner("reader", { fps: 15, qrbox: { width: 220, height: 220 }, videoConstraints: { facingMode: { exact: "environment" } } }, false);
            qrScanner.render(function(txt) {
                try { qrScanner.clear(); } catch(e) {} qrScanner = null;
                readerDiv.style.display = "none"; readerDiv.innerHTML = ""; processarQR(txt);
            }, function() {});
        } catch(e) { mostrarModal("ERRO CÂMERA", "Não foi possível acessar a câmera traseira."); readerDiv.style.display = "none"; }
    });
    document.getElementById('btn-checkin').addEventListener('click', function() { var id = document.getElementById('presenca-aluno').value; if (id) processarQR(id); });

    // BUSCA REGISTROS
    document.getElementById('busca-reativa').addEventListener('input', function() { renderRegistros(); });
    document.getElementById('filtro-ct-registros').addEventListener('change', function() { renderRegistros(); });
    document.getElementById('filtro-aluno-registros').addEventListener('input', function() { renderRegistros(); });

    // EDIT FOTO
    document.getElementById('edit-foto-preview').addEventListener('click', function() { document.getElementById('edit-foto-file').click(); });
    document.getElementById('edit-foto-file').addEventListener('change', function(e) { lerFoto(e, 'edit-foto-preview'); });
    document.getElementById('btn-edit-doc-arquivo').addEventListener('click', function() { document.getElementById('edit-doc-file').click(); });
    document.getElementById('edit-doc-file').addEventListener('change', function(e) { lerFoto(e, 'edit-doc-preview'); });

    // SALVAR EDIÇÃO
    document.getElementById('btn-salvar-edicao').addEventListener('click', function() {
        var id = document.getElementById('edit-id').value;
        var al = DB.alunos.find(function(a) { return a.id === id; });
        if (!al) return;
        var gradNova = document.getElementById('edit-graduacao').value.toUpperCase();
        if (al.graduacao !== gradNova) log("Admin", "Graduação", al.nome + ": " + al.graduacao + " → " + gradNova);
        var novoStatus = document.getElementById('edit-status').value;
        // Suspensão com motivo
        if (novoStatus === "Suspenso" && al.status !== "Suspenso") {
            var motivo = prompt("Informe o motivo da suspensão de " + al.nome + ":");
            if (!motivo) { mostrarModal("ATENÇÃO", "Informe o motivo da suspensão."); return; }
            al.suspensaoMotivo = motivo;
            enviarAvisoInterno(al.id, "⚠️ Conta Suspensa", "Seu acesso foi suspenso.\nMotivo: " + motivo + "\n\nProcure a secretaria para regularizar.", "Admin");
            log("Admin [" + currentUser.nivel + "]", "Suspensão", al.nome + " suspenso. Motivo: " + motivo);
        } else if (novoStatus !== "Suspenso") { al.suspensaoMotivo = ""; }
        al.nome = document.getElementById('edit-nome').value;
        al.email = document.getElementById('edit-email').value;
        al.whatsapp = document.getElementById('edit-whatsapp').value;
        al.ctId = document.getElementById('edit-ct').value || al.ctId;
        al.plano = document.getElementById('edit-plano').value;
        al.status = novoStatus;
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

    // FILTROS RELATÓRIO
    document.getElementById('btn-filtrar-rel').addEventListener('click', function() { renderRelatorio(); });
    document.getElementById('btn-exportar-rel').addEventListener('click', function() { exportarRelatorio(); });

    // CONFIGURAÇÕES
    document.getElementById('btn-salvar-precos').addEventListener('click', function() {
        DB.precos.Comercial  = parseFloat(document.getElementById('conf-comercial').value)  || 0;
        DB.precos.Atleta     = parseFloat(document.getElementById('conf-atleta').value)      || 0;
        DB.precos.Particular = parseFloat(document.getElementById('conf-particular').value)  || 0;
        DB.precos.Instrutor  = parseFloat(document.getElementById('conf-instrutor').value)   || 0;
        DB.precos.Bolsista   = parseFloat(document.getElementById('conf-bolsista').value)    || 0;
        log("Admin [" + currentUser.nivel + "]", "Preços Globais", "Tabela global atualizada.");
        mostrarModal("✅ SUCESSO", "Preços globais atualizados!");
    });
    document.getElementById('conf-ct-sel').addEventListener('change', function() { carregarPrecoCT(); });
    document.getElementById('conf-ct-perfil-sel').addEventListener('change', function() { carregarValorPerfil(); });
    document.getElementById('btn-salvar-preco-ct').addEventListener('click', function() { salvarPrecoCT(); });

    // CAMPEONATOS
    document.getElementById('btn-salvar-camp').addEventListener('click', function() {
        var id = document.getElementById('camp-atleta').value;
        var nome = document.getElementById('camp-nome').value.trim();
        var data = document.getElementById('camp-data').value;
        var local = document.getElementById('camp-local').value.trim();
        var resultado = document.getElementById('camp-resultado').value;
        var anexo = document.getElementById('camp-anexo-preview').dataset.foto || "";
        if (!id) { mostrarModal("ATENÇÃO", "Selecione o atleta."); return; }
        if (!nome || !data || !local) { mostrarModal("ATENÇÃO", "Preencha nome, data e local."); return; }
        var al = DB.alunos.find(function(a) { return a.id === id; });
        if (!al) return;
        al.campeonatos.push({ id: String(Date.now()), nome: nome, data: data, local: local, resultado: resultado, anexo: anexo });
        log("Admin [" + currentUser.nivel + "]", "Campeonato", al.nome + " — " + nome + ": " + resultado);
        enviarAvisoInterno(al.id, "🏆 Campeonato Registrado", "Campeonato: " + nome + "\nData: " + formatarData(data) + " | Local: " + local + "\nResultado: " + resultado, "Admin");
        document.getElementById('camp-nome').value = ""; document.getElementById('camp-data').value = ""; document.getElementById('camp-local').value = "";
        resetPreview('camp-anexo-preview', 'Anexo');
        mostrarModal("✅ SUCESSO", "Campeonato registrado para " + al.nome + "!");
        carregarAtleta();
    });
    document.getElementById('btn-camp-anexo-arquivo').addEventListener('click', function() { document.getElementById('camp-anexo-file').click(); });
    document.getElementById('camp-anexo-file').addEventListener('change', function(e) { lerFoto(e, 'camp-anexo-preview'); });
    document.getElementById('btn-camp-anexo-camera').addEventListener('click', function() {
        var div = document.getElementById('camp-camera-div');
        if (div.style.display === 'block') { div.style.display = 'none'; pararStream(autCameraStream); autCameraStream = null; }
        else { div.style.display = 'block'; abrirCameraStream('camp-video', function(s) { autCameraStream = s; }); }
    });
    document.getElementById('btn-camp-capturar').addEventListener('click', function() {
        capturarFoto('camp-video', 'camp-anexo-preview');
        document.getElementById('camp-camera-div').style.display = 'none';
        pararStream(autCameraStream); autCameraStream = null;
    });

    // PAGAMENTOS
    document.getElementById('btn-filtrar-pag').addEventListener('click', function() { renderPagamentos(); });
    document.getElementById('btn-salvar-pag').addEventListener('click', function() { registrarPagamento(); });
    document.getElementById('btn-pag-pix').addEventListener('click', function() { abrirFormPagamento('Pix'); });
    document.getElementById('btn-pag-cartao').addEventListener('click', function() { abrirFormPagamento('Cartão'); });
    document.getElementById('pag-filtro-ct').addEventListener('change', function() {
        popularAlunosPorCT('pag-filtro-aluno', this.value);
        renderPagamentos();
    });
    document.getElementById('pag-ct-sel').addEventListener('change', function() {
        popularAlunosPorCT('pag-aluno-sel', this.value);
    });

    // AVISOS — form envio
    document.getElementById('btn-enviar-aviso').addEventListener('click', function() { enviarAvisoForm(); });
    document.getElementById('aviso-ct-sel').addEventListener('change', function() {
        popularAlunosPorCT('aviso-aluno-sel', this.value);
    });

    // AUTORIZAÇÃO / CONDIÇÕES CLÍNICAS
    document.getElementById('btn-salvar-autorizacao').addEventListener('click', function() { salvarAutorizacao(); });
    document.getElementById('btn-aut-camera').addEventListener('click', function() { toggleCamera('aut-camera-div', 'aut-video', function(s){ autorizCameraStream=s; }); });
    document.getElementById('btn-aut-arquivo').addEventListener('click', function() { document.getElementById('aut-arquivo-input').click(); });
    document.getElementById('aut-arquivo-input').addEventListener('change', function(e) { lerFoto(e, 'aut-preview'); });
    document.getElementById('btn-aut-capturar').addEventListener('click', function() {
        capturarFoto('aut-video', 'aut-preview');
        document.getElementById('aut-camera-div').style.display = 'none';
        pararStream(autorizCameraStream); autorizCameraStream = null;
    });

    document.getElementById('btn-salvar-clinica').addEventListener('click', function() { salvarClinica(); });
    document.getElementById('btn-clinica-camera').addEventListener('click', function() { toggleCamera('clinica-camera-div', 'clinica-video', function(s){ clinicaCameraStream=s; }); });
    document.getElementById('btn-clinica-arquivo').addEventListener('click', function() { document.getElementById('clinica-arquivo-input').click(); });
    document.getElementById('clinica-arquivo-input').addEventListener('change', function(e) { lerFoto(e, 'clinica-preview'); });
    document.getElementById('btn-clinica-capturar').addEventListener('click', function() {
        capturarFoto('clinica-video', 'clinica-preview');
        document.getElementById('clinica-camera-div').style.display = 'none';
        pararStream(clinicaCameraStream); clinicaCameraStream = null;
    });

    // EDIT CT
    document.getElementById('btn-salvar-edit-ct') && document.getElementById('btn-salvar-edit-ct').addEventListener('click', salvarEdicaoCT);
    document.getElementById('btn-prorrogar-ct') && document.getElementById('btn-prorrogar-ct').addEventListener('click', prorrogarContrato);

    // FILTRO RELATÓRIO CT
    document.getElementById('rep-ct').addEventListener('change', function() { renderRelatorio(); });

    verificarVencimentosContratos();
});

// ========================================================
// DASHBOARD — VISUAL RICO
// ========================================================
function renderDashboard() {
    // Popula filtro CT com CTs cadastrados
    var selDashCT = document.getElementById('dash-filtro-ct');
    var valAtualCT = selDashCT.value;
    selDashCT.innerHTML = '<option value="">Todos os CTs</option>';
    DB.cts.forEach(function(c) { selDashCT.innerHTML += '<option value="' + c.id + '">' + c.nome + '</option>'; });
    if (valAtualCT) selDashCT.value = valAtualCT;

    var filtCT   = selDashCT.value;
    var filtPerf = document.getElementById('dash-filtro-perfil').value;
    var filtStat = document.getElementById('dash-filtro-status').value;

    var fat=0, inad=0, rec=0, muay=0, boxe=0, mma=0, total=0;
    var alunosFiltrados = DB.alunos.filter(function(a) {
        if (filtCT && a.ctId !== filtCT) return false;
        if (filtPerf !== "Todos" && a.perfil !== filtPerf) return false;
        if (filtStat !== "Todos" && a.status !== filtStat) return false;
        return true;
    });

    total = alunosFiltrados.length;
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
    document.getElementById('dash-total-alunos').textContent = total;

    var tot = muay + boxe + mma || 1;
    document.getElementById('cnt-muay').textContent = muay;
    document.getElementById('cnt-boxe').textContent = boxe;
    document.getElementById('cnt-mma').textContent = mma;
    document.getElementById('bar-muay').style.width = (muay/tot*100) + '%';
    document.getElementById('bar-boxe').style.width = (boxe/tot*100) + '%';
    document.getElementById('bar-mma').style.width = (mma/tot*100) + '%';

    // Gráfico financeiro — barra visual
    var pctRec = fat > 0 ? (rec/fat*100) : 0;
    var pctInad = fat > 0 ? (inad/fat*100) : 0;
    document.getElementById('bar-receita').style.width = pctRec + '%';
    document.getElementById('bar-inadimplencia-bar').style.width = pctInad + '%';
    document.getElementById('pct-receita').textContent = pctRec.toFixed(0) + '%';
    document.getElementById('pct-inad').textContent = pctInad.toFixed(0) + '%';

    // Presença semanal
    renderPresencaSemanal();

    // Inadimplência detalhada
    var lista = document.getElementById('dash-devedores');
    lista.innerHTML = "";
    var devs = alunosFiltrados.filter(function(a) { return a.status !== "Em dia"; });
    if (devs.length === 0) { lista.innerHTML = "<p style='color:#4ade80;text-align:center;padding:20px'>✅ Sem inadimplentes no filtro.</p>"; }
    else {
        devs.forEach(function(a) {
            var val = getMensalidadeAluno(a).toFixed(2);
            var ctNome = getCTNome(a.ctId);
            var cor = a.status === "Inadimplente" ? "#ba0f14" : a.status === "Suspenso" ? "#d97706" : "#6b7280";
            var div = document.createElement('div'); div.className = "item-registro";
            div.innerHTML =
                '<div style="flex:1"><strong>' + a.nome + '</strong>' +
                (a.suspensaoMotivo ? '<br><small style="color:#d97706">Motivo: ' + a.suspensaoMotivo + '</small>' : '') +
                '<br><small style="color:#8a8a8a">R$ ' + val + ' | ' + ctNome + '</small></div>' +
                '<div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end">' +
                '<span class="badge" style="background:' + cor + '">' + a.status + '</span>' +
                '<button class="btn btn-primary" style="padding:4px 8px;font-size:10px;width:auto" onclick="cobrarEmail(\'' + a.id + '\')">📧 Cobrar</button>' +
                '<button class="btn btn-accent" style="padding:4px 8px;font-size:10px;width:auto" onclick="cobrarTexto(\'' + a.id + '\')">📋 Msg</button>' +
                '</div>';
            lista.appendChild(div);
        });
    }
}

function renderPresencaSemanal() {
    var dias = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
    var hoje = new Date();
    var barras = document.getElementById('presenca-semanal-bars');
    if (!barras) return;
    barras.innerHTML = "";
    var max = 0;
    var dados = [];
    for (var i = 6; i >= 0; i--) {
        var d = new Date(hoje); d.setDate(hoje.getDate() - i);
        var key = d.toISOString().split('T')[0];
        var count = (DB.presencaSemanal[key] || 0);
        if (count > max) max = count;
        dados.push({ dia: dias[d.getDay()], count: count });
    }
    dados.forEach(function(item) {
        var pct = max > 0 ? Math.round(item.count / max * 100) : 0;
        var bar = document.createElement('div'); bar.className = "pres-bar-wrap";
        bar.innerHTML = '<div class="pres-bar-label">' + item.count + '</div>' +
            '<div class="pres-bar-outer"><div class="pres-bar-inner" style="height:' + pct + '%"></div></div>' +
            '<div class="pres-bar-dia">' + item.dia + '</div>';
        barras.appendChild(bar);
    });
}

window.cobrarEmail = function(id) {
    var a = DB.alunos.find(function(x) { return x.id === id; });
    if (!a) return;
    var val = getMensalidadeAluno(a).toFixed(2);
    var msg = "⚠️ OGRO TEAM\n\nOlá " + a.nome + "!\n\nIdentificamos pendência no seu plano " + a.plano + ".\nValor: R$ " + val + "\n\nRegularize na secretaria para manter seu acesso.\n\nOgro Team 🥋";
    enviarAvisoInterno(a.id, "⚠️ Pendência Financeira", "Valor em aberto: R$ " + val + "\nPlano: " + a.plano + "\n\nRegularize na secretaria.", "Sistema");
    if (a.email) console.info("[EMAIL] " + a.email + "\n" + msg);
    mostrarModal("📧 COBRANÇA ENVIADA", msg + "\n\n✅ Aviso enviado no mural do aluno." + (a.email ? "\n✅ E-mail simulado para: " + a.email : ""));
};

window.cobrarTexto = function(id) {
    var a = DB.alunos.find(function(x) { return x.id === id; }); if (!a) return;
    var val = getMensalidadeAluno(a).toFixed(2);
    mostrarModal("📋 MENSAGEM DE COBRANÇA", "⚠️ OGRO TEAM\n\nOlá " + a.nome + "!\n\nPendência no plano " + a.plano + ".\nValor: R$ " + val + "\n\nRegularize na secretaria.\n\nOgro Team 🥋");
};

// ========================================================
// EQUIPE
// ========================================================
function renderEquipe() {
    var lista = document.getElementById('lista-equipe'); lista.innerHTML = "";
    DB.admins.forEach(function(a) {
        var div = document.createElement('div'); div.className = "item-registro";
        div.innerHTML = '<div><strong>' + a.nome + '</strong><br><small style="color:#8a8a8a">' + a.nivel + ' | ' + a.email + '</small></div>' +
            (a.id !== "1" ? '<button class="btn btn-vermelho" style="padding:4px 8px;font-size:11px;width:auto" onclick="revogarAdmin(\'' + a.id + '\')">Revogar</button>' : '<small style="color:#16a34a">Master</small>');
        lista.appendChild(div);
    });
    // Só mostra na lista de promoção alunos que NÃO estão promovidos
    var prom = document.getElementById('lista-promocao'); prom.innerHTML = "";
    var alunosNaoPromovidos = DB.alunos.filter(function(a) { return !a.promovido; });
    if (alunosNaoPromovidos.length === 0) {
        prom.innerHTML = "<p style='color:#8a8a8a;text-align:center;padding:12px;font-size:12px'>Todos os alunos já foram promovidos.</p>";
    } else {
        alunosNaoPromovidos.forEach(function(a) {
            var ctNome = getCTNome(a.ctId);
            var div = document.createElement('div'); div.className = "item-registro";
            div.innerHTML = '<div><strong>' + a.nome + '</strong><br><small style="color:#8a8a8a">' + a.perfil + ' | ' + ctNome + '</small></div>' +
                '<div style="display:flex;gap:4px">' +
                (a.perfil !== "Instrutor" ? '<button class="btn btn-primary" style="padding:4px 6px;font-size:10px;width:auto" onclick="promover(\'' + a.id + '\',\'Administrador Integral\')">Admin</button>' : '') +
                '<button class="btn btn-accent" style="padding:4px 6px;font-size:10px;width:auto;background:#262626" onclick="promover(\'' + a.id + '\',\'Apoio Administrativo\')">Apoio</button></div>';
            prom.appendChild(div);
        });
    }
}

window.revogarAdmin = function(id) {
    if (!confirm("Revogar acesso?")) return;
    var idx = DB.admins.findIndex(function(a) { return a.id === id; });
    if (idx !== -1) {
        var adminRemovido = DB.admins[idx];
        log("Mestre","Revogação", adminRemovido.nome + " removido.");
        // Se esse admin veio de uma promoção de aluno, desmarca o aluno
        if (adminRemovido.alunoId) {
            var aluno = DB.alunos.find(function(a) { return a.id === adminRemovido.alunoId; });
            if (aluno) { aluno.promovido = false; aluno.nivelAdmin = ""; }
        }
        DB.admins.splice(idx, 1);
    }
    renderEquipe();
};

window.promover = function(idAluno, nivel) {
    var al = DB.alunos.find(function(a) { return a.id === idAluno; }); if (!al) return;
    if (al.perfil === "Instrutor" && nivel === "Administrador Integral") { nivel = "Apoio Administrativo"; alert("Instrutor promovido como Apoio Administrativo."); }
    // Marca o aluno como promovido para sumir da lista
    al.promovido = true;
    al.nivelAdmin = nivel;
    DB.admins.push({ id: String(Date.now()), alunoId: al.id, nome: al.nome, email: al.email || al.nome.replace(/\s/g,'').toLowerCase()+'@ogroteam.com', senha: al.senha||"123", nivel: nivel });
    log("Mestre","Promoção", al.nome + " → " + nivel); renderEquipe();
};

// ========================================================
// PRESENÇA
// ========================================================
function renderPresenca() {
    var sa = document.getElementById('presenca-aluno'); var sc = document.getElementById('presenca-ct');
    sa.innerHTML = ""; sc.innerHTML = "";
    DB.alunos.forEach(function(a) { sa.innerHTML += '<option value="' + a.id + '">' + a.nome + '</option>'; });
    DB.cts.forEach(function(c) { sc.innerHTML += '<option value="' + c.id + '">' + c.nome + '</option>'; });
}

function processarQR(idAluno) {
    var al = DB.alunos.find(function(a) { return a.id === idAluno; });
    var ctId = document.getElementById('presenca-ct').value;
    var ct = DB.cts.find(function(c) { return c.id === ctId; }) || { nome: "CT Principal" };
    if (!al) { mostrarModal("QR NÃO RECONHECIDO", "Atleta não encontrado."); return; }
    if (al.status === "Suspenso" || al.status === "Trancada") {
        mostrarModal("❌ ACESSO NEGADO", al.nome + "\nStatus: " + al.status.toUpperCase() + (al.suspensaoMotivo ? "\nMotivo: " + al.suspensaoMotivo : "") + "\n\nProcure a secretaria.");
        return;
    }
    al.frequencia = (al.frequencia || 0) + 1;
    var hoje = new Date().toISOString().split('T')[0];
    DB.presencaSemanal[hoje] = (DB.presencaSemanal[hoje] || 0) + 1;
    var hora = agora();
    log("Catraca","Check-in", al.nome + " — " + ct.nome + " — " + hora);
    var mural = document.getElementById('mural-freq');
    var div = document.createElement('div'); div.className = "item-registro";
    div.innerHTML = '<strong>' + hora + '</strong> — 🥋 ' + al.nome + ' | ' + ct.nome;
    mural.insertBefore(div, mural.firstChild);
    mostrarModal("✅ ENTRADA AUTORIZADA", "🥊 Bom treino, " + al.nome + "!\n\n" + ct.nome + "\n" + hora);
}

// ========================================================
// CENTRAL DE REGISTROS
// ========================================================
function renderRegistros() {
    // Popular select de CT com os cadastrados
    var selCTReg = document.getElementById('filtro-ct-registros');
    var valCTReg = selCTReg.value;
    selCTReg.innerHTML = '<option value="">Todos os CTs</option>';
    DB.cts.forEach(function(c) { selCTReg.innerHTML += '<option value="' + c.id + '">' + c.nome + '</option>'; });
    if (valCTReg) selCTReg.value = valCTReg;

    var filtCT    = selCTReg.value;
    var filtAluno = document.getElementById('filtro-aluno-registros').value.toLowerCase();
    var busca     = document.getElementById('busca-reativa').value.toLowerCase();
    var c = document.getElementById('lista-registros'); c.innerHTML = "";

    var af = DB.alunos.filter(function(a) {
        var ctOk = !filtCT || a.ctId === filtCT;
        var nomeOk = !filtAluno || a.nome.toLowerCase().includes(filtAluno);
        var buscaOk = !busca || a.nome.toLowerCase().includes(busca) || (a.email||"").toLowerCase().includes(busca);
        return ctOk && nomeOk && buscaOk;
    });

    var cf = DB.cts.filter(function(x) {
        if (filtCT && x.id !== filtCT) return false;
        return !busca || x.nome.toLowerCase().includes(busca) || x.responsavel.toLowerCase().includes(busca);
    });

    if (af.length === 0 && cf.length === 0) { c.innerHTML = "<p style='color:#8a8a8a;text-align:center;padding:20px'>Nenhum resultado.</p>"; return; }

    af.forEach(function(a) {
        var ctNome = getCTNome(a.ctId);
        var cor = a.status === 'Em dia' ? '#16a34a' : a.status === 'Inadimplente' ? '#ba0f14' : '#d97706';
        var fStyle = a.foto ? 'background-image:url(' + a.foto + ');' : '';
        var div = document.createElement('div'); div.className = "item-registro";
        div.innerHTML = '<div style="display:flex;align-items:center;gap:10px"><div class="mini-avatar" style="' + fStyle + '"></div>' +
            '<div><strong>' + a.nome + '</strong><br><small style="color:#8a8a8a">' + a.perfil + ' | ' + ctNome + ' | ' + a.graduacao + '</small>' +
            (a.suspensaoMotivo ? '<br><small style="color:#d97706">⚠️ ' + a.suspensaoMotivo + '</small>' : '') + '</div></div>' +
            '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">' +
            '<span class="badge" style="background:' + cor + '">' + a.status + '</span>' +
            '<div><button class="btn btn-primary" style="padding:4px 8px;font-size:11px;width:auto" onclick="abrirEdicao(\'' + a.id + '\')">Editar</button>' +
            '<button class="btn btn-vermelho" style="padding:4px 8px;font-size:11px;width:auto;margin-left:2px" onclick="excluirAluno(\'' + a.id + '\')">Excluir</button></div></div>';
        c.appendChild(div);
    });

    if (af.length > 0 && cf.length > 0) {
        var sep = document.createElement('div'); sep.style.cssText = "border-top:1px solid #262626;margin:8px 0;padding:4px 12px;color:#8a8a8a;font-size:11px;text-transform:uppercase"; sep.textContent = "CTs"; c.appendChild(sep);
    }

    cf.forEach(function(ct) {
        var div = document.createElement('div'); div.className = "item-registro";
        var con = ct.contrato || {};
        var hoje = new Date().toISOString().split('T')[0];
        var vencendo = con.dataFim && con.dataFim <= hoje;
        div.innerHTML = '<div><strong>🏛️ ' + ct.nome + '</strong>' + (vencendo ? ' <span class="badge" style="background:#ba0f14">Contrato Vencido</span>' : '') +
            '<br><small style="color:#8a8a8a">Resp: ' + ct.responsavel + ' | Instr: ' + (ct.instrutor||"—") + '</small></div>' +
            '<div style="display:flex;gap:4px"><button class="btn btn-primary" style="padding:4px 8px;font-size:11px;width:auto" onclick="abrirEdicaoCT(\'' + ct.id + '\')">Editar</button>' +
            '<button class="btn btn-vermelho" style="padding:4px 8px;font-size:11px;width:auto" onclick="excluirCT(\'' + ct.id + '\')">Excluir</button></div>';
        c.appendChild(div);
    });
}

window.abrirEdicao = function(id) {
    var al = DB.alunos.find(function(a) { return a.id === id; }); if (!al) return;
    document.getElementById('edit-id').value = al.id;
    document.getElementById('edit-nome').value = al.nome;
    document.getElementById('edit-email').value = al.email || "";
    document.getElementById('edit-whatsapp').value = al.whatsapp || "";
    popularCTs('edit-ct', false); document.getElementById('edit-ct').value = al.ctId || "";
    document.getElementById('edit-plano').value = al.plano;
    document.getElementById('edit-status').value = al.status;
    document.getElementById('edit-perfil').value = al.perfil;
    document.getElementById('edit-modalidade').value = al.modalidade;
    document.getElementById('edit-graduacao').value = al.graduacao;
    document.getElementById('edit-doc-tipo').value = al.docTipo || "RG";
    document.getElementById('edit-doc-numero').value = al.docNumero || "";
    var ep = document.getElementById('edit-foto-preview');
    if (al.foto) { ep.style.backgroundImage='url('+al.foto+')'; ep.textContent=""; ep.dataset.foto=al.foto; } else { ep.style.backgroundImage="none"; ep.textContent="Foto"; delete ep.dataset.foto; }
    var dp = document.getElementById('edit-doc-preview');
    if (al.docFoto) { dp.style.backgroundImage='url('+al.docFoto+')'; dp.textContent=""; dp.dataset.foto=al.docFoto; } else { dp.style.backgroundImage="none"; dp.textContent="Doc"; delete dp.dataset.foto; }
    var cores = {'Vitória':'#16a34a','Derrota':'#ba0f14','Empate':'#d97706','W.O':'#6b7280'};
    var campEl = document.getElementById('edit-camp-lista'); campEl.innerHTML = "";
    (al.campeonatos||[]).forEach(function(c) {
        campEl.innerHTML += '<div class="item-registro"><div><strong>' + c.nome + '</strong><br><small style="color:#8a8a8a">' + formatarData(c.data) + ' | ' + c.local + '</small></div><span class="badge" style="background:' + (cores[c.resultado]||'#262626') + '">' + c.resultado + '</span></div>';
    });
    var autEl = document.getElementById('edit-aut-lista'); autEl.innerHTML = "";
    (al.autorizacoes||[]).forEach(function(au) {
        autEl.innerHTML += '<div class="item-registro"><div><strong>' + au.desc + '</strong><br><small style="color:#8a8a8a">' + au.data + '</small></div>' + (au.foto ? '<div style="width:36px;height:36px;border-radius:4px;background:url('+au.foto+') center/cover;border:1px solid #ba0f14"></div>' : '<small style="color:#8a8a8a">Sem doc</small>') + '</div>';
    });
    var clinEl = document.getElementById('edit-clinica-lista'); clinEl.innerHTML = "";
    (al.condicoesClincias||[]).forEach(function(cl) {
        clinEl.innerHTML += '<div class="item-registro"><div><strong>' + cl.desc + '</strong><br><small style="color:#8a8a8a">' + cl.data + '</small></div>' + (cl.foto ? '<div style="width:36px;height:36px;border-radius:4px;background:url('+cl.foto+') center/cover;border:1px solid #2563eb"></div>' : '<small style="color:#8a8a8a">Sem doc</small>') + '</div>';
    });
    ir(10);
};

window.abrirEdicaoCT = function(id) {
    var ct = DB.cts.find(function(c) { return c.id === id; }); if (!ct) return;
    document.getElementById('edit-ct-id').value = ct.id;
    document.getElementById('edit-ct-nome').value = ct.nome;
    document.getElementById('edit-ct-responsavel').value = ct.responsavel;
    document.getElementById('edit-ct-instrutor').value = ct.instrutor || "";
    document.getElementById('edit-ct-cnpj').value = ct.cnpj || "";
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

function salvarEdicaoCT() {
    var id = document.getElementById('edit-ct-id').value;
    var ct = DB.cts.find(function(c) { return c.id === id; }); if (!ct) return;
    ct.nome = document.getElementById('edit-ct-nome').value;
    ct.responsavel = document.getElementById('edit-ct-responsavel').value;
    ct.instrutor = document.getElementById('edit-ct-instrutor').value;
    ct.cnpj = document.getElementById('edit-ct-cnpj').value;
    ct.endereco = document.getElementById('edit-ct-endereco').value;
    ct.cidade = document.getElementById('edit-ct-cidade').value;
    ct.whatsapp = document.getElementById('edit-ct-whatsapp').value;
    ct.capacidade = document.getElementById('edit-ct-capacidade').value;
    ct.mensalidade = document.getElementById('edit-ct-mensalidade').value;
    if (!ct.contrato) ct.contrato = {};
    ct.contrato.dataInicio = document.getElementById('edit-ct-inicio').value;
    ct.contrato.dataFim = document.getElementById('edit-ct-fim').value;
    log("Admin [" + currentUser.nivel + "]", "Edição CT", ct.nome + " atualizado.");
    mostrarModal("✅ SUCESSO", "CT " + ct.nome + " atualizado!"); ir(9);
}

function prorrogarContrato() {
    var id = document.getElementById('edit-ct-id').value;
    var ct = DB.cts.find(function(c) { return c.id === id; }); if (!ct || !ct.contrato) return;
    var novaFim = prompt("Nova data de término (AAAA-MM-DD):", ct.contrato.dataFim || "");
    if (!novaFim) return;
    ct.contrato.historico = ct.contrato.historico || [];
    ct.contrato.historico.push({ dataInicio: ct.contrato.dataInicio, dataFim: ct.contrato.dataFim });
    ct.contrato.dataFim = novaFim; ct.contrato.prorrogado = true;
    document.getElementById('edit-ct-fim').value = novaFim;
    log("Admin [" + currentUser.nivel + "]", "Prorrogação CT", ct.nome + " prorrogado até " + formatarData(novaFim));
    mostrarModal("✅ SUCESSO", "Contrato de " + ct.nome + " prorrogado até " + formatarData(novaFim));
}

window.excluirAluno = function(id) {
    if (!confirm("Excluir este aluno?")) return;
    var idx = DB.alunos.findIndex(function(a) { return a.id === id; });
    if (idx !== -1) { log("Admin","Exclusão",DB.alunos[idx].nome+" removido."); DB.alunos.splice(idx,1); }
    renderRegistros();
};
window.excluirCT = function(id) {
    if (!confirm("Excluir este CT?")) return;
    var idx = DB.cts.findIndex(function(c) { return c.id === id; });
    if (idx !== -1) { log("Admin","Exclusão",DB.cts[idx].nome+" removido."); DB.cts.splice(idx,1); }
    renderRegistros();
};

// ========================================================
// RELATÓRIOS
// ========================================================
function renderRelatorio() {
    // Popular select de CT com os cadastrados
    var selRepCT = document.getElementById('rep-ct');
    var valCTAtual = selRepCT.value;
    selRepCT.innerHTML = '<option value="">Todos os CTs</option>';
    DB.cts.forEach(function(c) { selRepCT.innerHTML += '<option value="' + c.id + '">' + c.nome + '</option>'; });
    if (valCTAtual) selRepCT.value = valCTAtual;

    var perfil  = document.getElementById('rep-perfil').value;
    var mod     = document.getElementById('rep-modalidade').value;
    var ctFilt  = selRepCT.value;
    var stFilt  = document.getElementById('rep-status').value;
    var dataDe  = document.getElementById('rep-data-de').value;
    var dataAte = document.getElementById('rep-data-ate').value;
    var lista   = document.getElementById('rep-lista'); lista.innerHTML = "";

    var f = DB.alunos;
    if (perfil !== "Todos") f = f.filter(function(a) { return a.perfil === perfil; });
    if (mod !== "Todas")    f = f.filter(function(a) { return a.modalidade === mod; });
    if (ctFilt)             f = f.filter(function(a) { return a.ctId === ctFilt; });
    if (stFilt !== "Todos") f = f.filter(function(a) { return a.status === stFilt; });

    // Filtro de data: filtra pagamentos no período e retorna só alunos que pagaram nesse período
    if (dataDe || dataAte) {
        var alunosComPag = DB.pagamentos.filter(function(p) {
            var deOk  = !dataDe  || p.data >= dataDe;
            var ateOk = !dataAte || p.data <= dataAte;
            return deOk && ateOk;
        }).map(function(p) { return p.alunoId; });
        f = f.filter(function(a) { return alunosComPag.indexOf(a.id) !== -1; });
    }

    document.getElementById('rep-count').textContent = f.length;
    var soma = 0; f.forEach(function(a) { soma += getMensalidadeAluno(a); });
    document.getElementById('rep-soma').textContent = "R$ " + soma.toFixed(2);
    if (f.length === 0) { lista.innerHTML = "<p style='color:#8a8a8a;text-align:center;padding:20px'>Nenhum resultado.</p>"; return; }
    f.forEach(function(a) {
        var ctNome = getCTNome(a.ctId);
        var cor = a.status === 'Em dia' ? '#16a34a' : a.status === 'Inadimplente' ? '#ba0f14' : '#d97706';
        var div = document.createElement('div'); div.className = "item-registro";
        div.innerHTML = '<div><strong>' + a.nome + '</strong><br><small style="color:#8a8a8a">' + a.modalidade + ' | ' + ctNome + '</small></div>' +
            '<div style="text-align:right"><span class="badge" style="background:' + cor + ';display:block;margin-bottom:4px">' + a.status + '</span><span style="color:#4ade80;font-weight:bold">R$ ' + getMensalidadeAluno(a).toFixed(2) + '</span></div>';
        lista.appendChild(div);
    });
}

function exportarRelatorio() {
    var perfil  = document.getElementById('rep-perfil').value;
    var mod     = document.getElementById('rep-modalidade').value;
    var ctFilt  = document.getElementById('rep-ct').value;
    var stFilt  = document.getElementById('rep-status').value;
    var dataDe  = document.getElementById('rep-data-de').value;
    var dataAte = document.getElementById('rep-data-ate').value;
    var f = DB.alunos;
    if (perfil !== "Todos") f = f.filter(function(a) { return a.perfil === perfil; });
    if (mod !== "Todas")    f = f.filter(function(a) { return a.modalidade === mod; });
    if (ctFilt)             f = f.filter(function(a) { return a.ctId === ctFilt; });
    if (stFilt !== "Todos") f = f.filter(function(a) { return a.status === stFilt; });
    if (dataDe || dataAte) {
        var alunosComPag = DB.pagamentos.filter(function(p) {
            return (!dataDe || p.data >= dataDe) && (!dataAte || p.data <= dataAte);
        }).map(function(p) { return p.alunoId; });
        f = f.filter(function(a) { return alunosComPag.indexOf(a.id) !== -1; });
    }
    if (f.length === 0) { mostrarModal("ATENÇÃO", "Nenhum aluno para exportar."); return; }
    var periodo = (dataDe || dataAte) ? (" | Período: " + (dataDe ? formatarData(dataDe) : "início") + " até " + (dataAte ? formatarData(dataAte) : "hoje")) : "";
    var txt = "OGRO TEAM — RELATÓRIO\n" + new Date().toLocaleDateString('pt-BR') + "\nFiltros: " + perfil + " | " + mod + " | " + (ctFilt ? getCTNome(ctFilt) : "Todos CTs") + " | Status: " + stFilt + periodo + "\n" + "=".repeat(40) + "\n\n";
    f.forEach(function(a, i) {
        txt += (i+1) + ". " + a.nome + "\n   CT: " + getCTNome(a.ctId) + " | " + a.perfil + " | " + a.modalidade + "\n   Status: " + a.status + " | R$ " + getMensalidadeAluno(a).toFixed(2) + "\n   E-mail: " + (a.email||"—") + "\n\n";
    });
    log("Admin [" + currentUser.nivel + "]", "Relatório", f.length + " registros exportados.");
    mostrarModal("📊 RELATÓRIO", txt);
}

// ========================================================
// CARTEIRINHA
// ========================================================
function renderCarteirinha() {
    var a = currentUser; if (!a) return;
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
    if (a.status === "Em dia") { statusEl.className="status-box status-pago"; statusEl.innerHTML="<h3>ACESSO AUTORIZADO ✔️</h3><p>Mensalidade em dia.</p>"; }
    else { statusEl.className="status-box status-atraso"; statusEl.innerHTML="<h3>STATUS: " + (a.status||"").toUpperCase() + " ⚠️</h3>" + (a.suspensaoMotivo ? "<p>Motivo: " + a.suspensaoMotivo + "</p>" : "<p>Procure a secretaria.</p>"); }
    var av = document.getElementById('aluno-avatar');
    if (a.foto) { av.style.backgroundImage='url('+a.foto+')'; av.textContent=""; } else { av.style.backgroundImage="none"; av.textContent="👤"; }
    var qrEl = document.getElementById('aluno-qr'); qrEl.innerHTML = "";
    if (typeof QRCode !== 'undefined') new QRCode(qrEl, { text: String(a.id), width: 130, height: 130, colorDark:"#000000", colorLight:"#ffffff" });
    // Campeonatos
    var camps = document.getElementById('aluno-camps'); camps.innerHTML = "";
    var cores = {'Vitória':'#16a34a','Derrota':'#ba0f14','Empate':'#d97706','W.O':'#6b7280'};
    (a.campeonatos||[]).forEach(function(c) {
        camps.innerHTML += '<div class="item-registro"><div><strong>' + c.nome + '</strong><br><small style="color:#8a8a8a">' + formatarData(c.data) + ' | ' + c.local + '</small></div><span class="badge" style="background:' + (cores[c.resultado]||'#262626') + '">' + c.resultado + '</span></div>';
    });
    if (!(a.campeonatos||[]).length) camps.innerHTML = "<p style='color:#8a8a8a;text-align:center;padding:10px'>Nenhum campeonato.</p>";
    // Mural de avisos
    renderMuralAluno(a);
    // Pagamento
    var valMensal = getMensalidadeAluno(a).toFixed(2);
    document.getElementById('aluno-pix-area').innerHTML =
        '<p style="color:#8a8a8a;font-size:12px;margin-bottom:8px">Mensalidade: <strong style="color:#4ade80">R$ ' + valMensal + '</strong></p>' +
        '<button class="btn btn-primary" style="margin-bottom:8px" onclick="pagarPix(\'' + a.id + '\',' + valMensal + ')">💠 Pagar via Pix</button>' +
        '<button class="btn btn-accent" onclick="pagarCartao(\'' + a.id + '\',' + valMensal + ')">💳 Pagar via Cartão</button>';
    document.getElementById('rodape-aluno').textContent = "Perfil: " + (a.perfil||"Aluno") + " | " + ctNome;
}

function renderMuralAluno(a) {
    var muralEl = document.getElementById('aluno-mural-avisos');
    if (!muralEl) return;
    muralEl.innerHTML = "";
    var avisos = a.avisos || [];
    if (avisos.length === 0) { muralEl.innerHTML = "<p style='color:#8a8a8a;text-align:center;padding:10px'>Nenhum aviso.</p>"; return; }
    avisos.forEach(function(av) {
        var div = document.createElement('div'); div.className = "aviso-item" + (av.lido ? "" : " aviso-nao-lido");
        div.innerHTML = '<div class="aviso-header"><span class="aviso-titulo">' + av.titulo + '</span><span class="aviso-data">' + av.data + '</span></div>' +
            '<div class="aviso-corpo">' + av.corpo + '</div>' +
            '<div class="aviso-autor">— ' + av.autor + '</div>';
        div.addEventListener('click', function() { av.lido = true; div.classList.remove('aviso-nao-lido'); });
        muralEl.appendChild(div);
    });
    // Conta não lidos
    var naoLidos = avisos.filter(function(av) { return !av.lido; }).length;
    var badge = document.getElementById('badge-avisos');
    if (badge) { badge.textContent = naoLidos > 0 ? naoLidos : ""; badge.style.display = naoLidos > 0 ? "inline-flex" : "none"; }
}

window.pagarPix = function(alunoId, valor) {
    var al = DB.alunos.find(function(a) { return a.id === alunoId; }); if (!al) return;
    var msg = "💠 OGRO TEAM — Pix\n\nAluno: " + al.nome + "\nValor: R$ " + valor + "\n\nChave Pix: pagamentos@ogroteam.com.br\n\nApós o pagamento, envie o comprovante para a secretaria.";
    log("Aluno","Pagamento Pix",al.nome+" — R$ "+valor);
    if (al.email) console.info("[EMAIL] " + al.email + "\n" + msg);
    mostrarModal("💠 PAGAR VIA PIX", msg);
};

window.pagarCartao = function(alunoId, valor) {
    var al = DB.alunos.find(function(a) { return a.id === alunoId; }); if (!al) return;
    var msg = "💳 OGRO TEAM — Mercado Pago\n\nAluno: " + al.nome + "\nValor: R$ " + valor + "\n\nLink: https://mpago.la/ogroteam\n\n[Integração real via API Mercado Pago]";
    log("Aluno","Pagamento Cartão",al.nome+" — R$ "+valor);
    if (al.email) console.info("[EMAIL] " + al.email + "\n" + msg);
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
    var tl = document.getElementById('timeline-auditoria'); tl.innerHTML = "";
    DB.logs.forEach(function(l) {
        tl.innerHTML += '<div class="timeline-item"><div class="meta">' + l.data + ' | <strong>' + l.autor + '</strong></div>' +
            '<div class="acao" style="color:#ba0f14;font-weight:bold;font-size:11px;text-transform:uppercase">' + l.acao + '</div>' +
            '<div style="color:#fff;margin-top:2px;font-size:12px">' + l.detalhe + '</div></div>';
    });
}

function carregarPrecoCT() {
    var id = document.getElementById('conf-ct-sel').value;
    // Popula select de perfil
    document.getElementById('conf-ct-perfil-row').style.display = id ? 'block' : 'none';
    document.getElementById('conf-ct-valor-row').style.display = 'none';
    document.getElementById('conf-ct-perfil-sel').value = "";
    document.getElementById('conf-ct-valor').value = "";
}

function carregarValorPerfil() {
    var ctId = document.getElementById('conf-ct-sel').value;
    var perfil = document.getElementById('conf-ct-perfil-sel').value;
    if (!ctId || !perfil) return;
    document.getElementById('conf-ct-valor-row').style.display = 'block';
    var precosCT = DB.precosPorCT[ctId] || {};
    var val = precosCT[perfil] !== undefined ? precosCT[perfil] : DB.precos[perfil] || 0;
    document.getElementById('conf-ct-valor').value = val;
}

function salvarPrecoCT() {
    var ctId   = document.getElementById('conf-ct-sel').value;
    var perfil = document.getElementById('conf-ct-perfil-sel').value;
    var valor  = parseFloat(document.getElementById('conf-ct-valor').value);
    if (!ctId) { mostrarModal("ATENÇÃO", "Selecione um CT."); return; }
    if (!perfil) { mostrarModal("ATENÇÃO", "Selecione o perfil."); return; }
    if (isNaN(valor)) { mostrarModal("ATENÇÃO", "Digite o valor."); return; }
    if (!DB.precosPorCT[ctId]) DB.precosPorCT[ctId] = {};
    DB.precosPorCT[ctId][perfil] = valor;
    var ct = DB.cts.find(function(c) { return c.id === ctId; });
    var ctNome = ct ? ct.nome : ctId;
    log("Admin [" + currentUser.nivel + "]", "Preço CT", ctNome + " | " + perfil + " → R$ " + valor.toFixed(2));
    // Avisa alunos do CT com esse perfil
    DB.alunos.filter(function(a) { return a.ctId === ctId && a.perfil === perfil; }).forEach(function(a) {
        enviarAvisoInterno(a.id, "💰 Atualização de Mensalidade", "O valor da sua mensalidade foi atualizado para R$ " + valor.toFixed(2) + ".\n\nPerfil: " + perfil + " | CT: " + ctNome, "Admin");
    });
    mostrarModal("✅ SUCESSO", ctNome + " | " + perfil + " → R$ " + valor.toFixed(2) + "\n\nAlunos deste CT e perfil foram notificados automaticamente.");
}

// ========================================================
// CAMPEONATOS
// ========================================================
function renderCampeonatos() {
    var sel = document.getElementById('camp-atleta');
    sel.innerHTML = '<option value="">Selecione o Atleta</option>';
    DB.alunos.forEach(function(a) { sel.innerHTML += '<option value="' + a.id + '">' + a.nome + ' (' + getCTNome(a.ctId) + ')</option>'; });
    document.getElementById('camp-lista').innerHTML = "";
}

window.carregarAtleta = function() {
    var id = document.getElementById('camp-atleta').value;
    var al = DB.alunos.find(function(a) { return a.id === id; });
    var campLista = document.getElementById('camp-lista'); campLista.innerHTML = "";
    if (!al) return;
    var cores = {'Vitória':'#16a34a','Derrota':'#ba0f14','Empate':'#d97706','W.O':'#6b7280'};
    var camps = al.campeonatos || [];
    if (camps.length === 0) campLista.innerHTML = "<p style='color:#8a8a8a;text-align:center;padding:10px'>Nenhum campeonato.</p>";
    else camps.forEach(function(c, i) {
        var div = document.createElement('div'); div.className = "item-registro";
        div.innerHTML = '<div style="flex:1"><strong>' + c.nome + '</strong><br><small style="color:#8a8a8a">' + formatarData(c.data) + ' | ' + c.local + '</small></div>' +
            '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">' +
            '<span class="badge" style="background:' + (cores[c.resultado]||'#262626') + '">' + c.resultado + '</span>' +
            (c.anexo ? '<div style="width:36px;height:36px;border-radius:4px;background:url('+c.anexo+') center/cover;border:1px solid #ba0f14;cursor:pointer" onclick="verAnexo(\''+c.anexo+'\')"></div>' : '') +
            '<button class="btn btn-vermelho" style="padding:2px 6px;font-size:10px;width:auto" onclick="excluirCamp(\'' + id + '\',' + i + ')">Remover</button></div>';
        campLista.appendChild(div);
    });
};

window.verAnexo = function(src) { mostrarModal("📎 Anexo", ""); document.getElementById('modal-texto').innerHTML = '<img src="' + src + '" style="width:100%;border-radius:6px">'; };
window.excluirCamp = function(idAluno, idx) {
    if (!confirm("Remover campeonato?")) return;
    var al = DB.alunos.find(function(a) { return a.id === idAluno; });
    if (al) { log("Admin","Remoção",al.campeonatos[idx].nome+" de "+al.nome); al.campeonatos.splice(idx,1); }
    carregarAtleta();
};

// ========================================================
// AUTORIZAÇÃO E CONDIÇÕES CLÍNICAS (P18)
// ========================================================
function renderAutorizacaoClinica() {
    var sel = document.getElementById('aut-atleta');
    sel.innerHTML = '<option value="">Selecione o Atleta</option>';
    DB.alunos.forEach(function(a) { sel.innerHTML += '<option value="' + a.id + '">' + a.nome + ' (' + getCTNome(a.ctId) + ')</option>'; });
    document.getElementById('aut-lista').innerHTML = "";
    document.getElementById('clinica-lista').innerHTML = "";
}

window.carregarAtletaAut = function() {
    var id = document.getElementById('aut-atleta').value;
    var al = DB.alunos.find(function(a) { return a.id === id; });
    var autLista = document.getElementById('aut-lista'); autLista.innerHTML = "";
    var clinLista = document.getElementById('clinica-lista'); clinLista.innerHTML = "";
    if (!al) return;
    var auts = al.autorizacoes || [];
    if (auts.length === 0) autLista.innerHTML = "<p style='color:#8a8a8a;text-align:center;padding:10px'>Nenhuma autorização.</p>";
    else auts.forEach(function(au, i) {
        var div = document.createElement('div'); div.className = "item-registro";
        div.innerHTML = '<div><strong>' + au.desc + '</strong><br><small style="color:#8a8a8a">' + au.data + '</small></div>' +
            '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">' +
            (au.foto ? '<div style="width:36px;height:36px;border-radius:4px;background:url('+au.foto+') center/cover;border:1px solid #ba0f14;cursor:pointer" onclick="verAnexo(\''+au.foto+'\')"></div>' : '') +
            '<button class="btn btn-vermelho" style="padding:2px 6px;font-size:10px;width:auto" onclick="excluirAut(\'' + id + '\',' + i + ')">Remover</button></div>';
        autLista.appendChild(div);
    });
    var clins = al.condicoesClincias || [];
    if (clins.length === 0) clinLista.innerHTML = "<p style='color:#8a8a8a;text-align:center;padding:10px'>Nenhum registro clínico.</p>";
    else clins.forEach(function(cl, i) {
        var div = document.createElement('div'); div.className = "item-registro";
        div.innerHTML = '<div><strong>' + cl.desc + '</strong><br><small style="color:#8a8a8a">' + cl.data + '</small></div>' +
            '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">' +
            (cl.foto ? '<div style="width:36px;height:36px;border-radius:4px;background:url('+cl.foto+') center/cover;border:1px solid #2563eb;cursor:pointer" onclick="verAnexo(\''+cl.foto+'\')"></div>' : '') +
            '<button class="btn btn-vermelho" style="padding:2px 6px;font-size:10px;width:auto" onclick="excluirClinica(\'' + id + '\',' + i + ')">Remover</button></div>';
        clinLista.appendChild(div);
    });
};

function salvarAutorizacao() {
    var id = document.getElementById('aut-atleta').value;
    var desc = document.getElementById('aut-desc').value.trim();
    var foto = document.getElementById('aut-preview').dataset.foto || "";
    if (!id) { mostrarModal("ATENÇÃO","Selecione o atleta."); return; }
    if (!desc) { mostrarModal("ATENÇÃO","Descreva a autorização."); return; }
    var al = DB.alunos.find(function(a) { return a.id === id; }); if (!al) return;
    if (!al.autorizacoes) al.autorizacoes = [];
    al.autorizacoes.push({ id: String(Date.now()), desc: desc, data: new Date().toLocaleDateString('pt-BR'), foto: foto });
    log("Admin [" + currentUser.nivel + "]","Autorização",'"'+desc+'" para '+al.nome);
    enviarAvisoInterno(al.id,"📋 Nova Autorização","O documento \""+desc+"\" foi registrado no seu cadastro.","Admin");
    document.getElementById('aut-desc').value = ""; resetPreview('aut-preview','Doc');
    mostrarModal("✅ SUCESSO","Autorização registrada para "+al.nome+"!");
    carregarAtletaAut();
}

function salvarClinica() {
    var id = document.getElementById('aut-atleta').value;
    var desc = document.getElementById('clinica-desc').value.trim();
    var foto = document.getElementById('clinica-preview').dataset.foto || "";
    if (!id) { mostrarModal("ATENÇÃO","Selecione o atleta."); return; }
    if (!desc) { mostrarModal("ATENÇÃO","Descreva a condição clínica."); return; }
    var al = DB.alunos.find(function(a) { return a.id === id; }); if (!al) return;
    if (!al.condicoesClincias) al.condicoesClincias = [];
    al.condicoesClincias.push({ id: String(Date.now()), desc: desc, data: new Date().toLocaleDateString('pt-BR'), foto: foto });
    log("Admin [" + currentUser.nivel + "]","Condição Clínica",'"'+desc+'" para '+al.nome);
    document.getElementById('clinica-desc').value = ""; resetPreview('clinica-preview','Doc');
    mostrarModal("✅ SUCESSO","Condição clínica registrada para "+al.nome+"!");
    carregarAtletaAut();
}

window.excluirAut = function(idAluno, idx) {
    if (!confirm("Remover autorização?")) return;
    var al = DB.alunos.find(function(a) { return a.id === idAluno; });
    if (al && al.autorizacoes) { log("Admin","Remoção Aut",al.autorizacoes[idx].desc+" de "+al.nome); al.autorizacoes.splice(idx,1); }
    carregarAtletaAut();
};
window.excluirClinica = function(idAluno, idx) {
    if (!confirm("Remover registro clínico?")) return;
    var al = DB.alunos.find(function(a) { return a.id === idAluno; });
    if (al && al.condicoesClincias) { log("Admin","Remoção Clínica",al.condicoesClincias[idx].desc+" de "+al.nome); al.condicoesClincias.splice(idx,1); }
    carregarAtletaAut();
};

// ========================================================
// AVISOS / MURAL ADMIN (P17)
// ========================================================
function renderAvisos() {
    popularCTs('aviso-ct-sel', true);
    document.getElementById('aviso-ct-sel').innerHTML = '<option value="">Todos os CTs</option>' + DB.cts.map(function(c) { return '<option value="'+c.id+'">'+c.nome+'</option>'; }).join('');
    popularAlunosPorCT('aviso-aluno-sel', '');
    var lista = document.getElementById('lista-avisos-enviados'); lista.innerHTML = "";
    if (DB.avisosMural.length === 0) { lista.innerHTML = "<p style='color:#8a8a8a;text-align:center;padding:20px'>Nenhum aviso enviado.</p>"; return; }
    DB.avisosMural.slice(0, 50).forEach(function(item) {
        var av = item.aviso;
        var destino = item.alunoId === "todos" ? "📢 Todos os alunos" : (DB.alunos.find(function(a) { return a.id === item.alunoId; }) || {}).nome || "—";
        var div = document.createElement('div'); div.className = "aviso-item";
        div.innerHTML = '<div class="aviso-header"><span class="aviso-titulo">' + av.titulo + '</span><span class="aviso-data">' + av.data + '</span></div>' +
            '<div class="aviso-corpo">' + av.corpo + '</div>' +
            '<div class="aviso-autor">Para: ' + destino + ' — ' + av.autor + '</div>';
        lista.appendChild(div);
    });
}

function enviarAvisoForm() {
    var titulo = document.getElementById('aviso-titulo').value.trim();
    var corpo  = document.getElementById('aviso-corpo').value.trim();
    var ctId   = document.getElementById('aviso-ct-sel').value;
    var alunoId = document.getElementById('aviso-aluno-sel').value;
    if (!titulo || !corpo) { mostrarModal("ATENÇÃO","Preencha título e mensagem."); return; }
    var destino;
    if (alunoId) { destino = alunoId; }
    else if (ctId) {
        // Envia para todos do CT
        DB.alunos.filter(function(a){ return a.ctId === ctId; }).forEach(function(a) {
            enviarAvisoInterno(a.id, titulo, corpo, currentUser.nome);
        });
        log("Admin [" + currentUser.nivel + "]","Aviso CT",titulo+" → "+getCTNome(ctId));
        document.getElementById('aviso-titulo').value = ""; document.getElementById('aviso-corpo').value = "";
        mostrarModal("✅ AVISO ENVIADO","Aviso enviado para todos os alunos do CT " + getCTNome(ctId) + "!");
        renderAvisos(); return;
    } else { destino = "todos"; }
    enviarAvisoInterno(destino, titulo, corpo, currentUser.nome);
    document.getElementById('aviso-titulo').value = ""; document.getElementById('aviso-corpo').value = "";
    mostrarModal("✅ AVISO ENVIADO","Aviso enviado com sucesso!");
    renderAvisos();
}

// ========================================================
// PAGAMENTOS (P15)
// ========================================================
function renderPagamentos() {
    // Popular filtros de CT e aluno fiéis ao cadastro
    var selFiltCT = document.getElementById('pag-filtro-ct');
    var valFiltCT = selFiltCT.value;
    selFiltCT.innerHTML = '<option value="">Todos os CTs</option>';
    DB.cts.forEach(function(c) { selFiltCT.innerHTML += '<option value="' + c.id + '">' + c.nome + '</option>'; });
    if (valFiltCT) selFiltCT.value = valFiltCT;

    // Popular alunos do filtro com base no CT selecionado
    var selFiltAluno = document.getElementById('pag-filtro-aluno');
    var valFiltAluno = selFiltAluno ? selFiltAluno.value : "";
    popularAlunosPorCT('pag-filtro-aluno', valFiltCT);
    if (valFiltAluno) selFiltAluno.value = valFiltAluno;

    var filtCT    = valFiltCT;
    var filtAluno = selFiltAluno ? selFiltAluno.value : "";
    var filtDe    = document.getElementById('pag-filtro-de').value;
    var filtAte   = document.getElementById('pag-filtro-ate').value;
    var filtMin   = parseFloat(document.getElementById('pag-filtro-val-min').value) || 0;
    var filtMax   = parseFloat(document.getElementById('pag-filtro-val-max').value) || Infinity;
    var lista = document.getElementById('pag-lista'); lista.innerHTML = "";

    var f = DB.pagamentos.filter(function(p) {
        var al = DB.alunos.find(function(a) { return a.id === p.alunoId; });
        // Filtro por CT: usa o ctId do aluno ou do pagamento
        var ctIdReal = p.ctId || (al ? al.ctId : "");
        var ctOk    = !filtCT    || ctIdReal === filtCT;
        // Filtro por aluno: selecionável
        var alunoOk = !filtAluno || p.alunoId === filtAluno;
        var deOk    = !filtDe    || p.data >= filtDe;
        var ateOk   = !filtAte   || p.data <= filtAte;
        var valOk   = p.valor >= filtMin && p.valor <= filtMax;
        return ctOk && alunoOk && deOk && ateOk && valOk;
    });

    var total = 0; f.forEach(function(p) { total += p.valor; });
    var totalGeral = 0; DB.pagamentos.forEach(function(p) { totalGeral += p.valor; });
    document.getElementById('pag-total-filtro').textContent = "R$ " + total.toFixed(2);
    document.getElementById('pag-total-geral').textContent  = "R$ " + totalGeral.toFixed(2);
    document.getElementById('pag-count').textContent = f.length;

    if (f.length === 0) { lista.innerHTML = "<p style='color:#8a8a8a;text-align:center;padding:20px'>Nenhum pagamento encontrado.</p>"; return; }
    f.forEach(function(p) {
        var al = DB.alunos.find(function(a) { return a.id === p.alunoId; });
        var nome = al ? al.nome : "—";
        var ctNome = getCTNome(p.ctId || (al ? al.ctId : ""));
        var corM = p.metodo === "Pix" ? '#4ade80' : '#2563eb';
        var div = document.createElement('div'); div.className = "item-registro";
        div.innerHTML = '<div><strong>' + nome + '</strong><br><small style="color:#8a8a8a">' + formatarData(p.data) + ' | ' + ctNome + '</small></div>' +
            '<div style="text-align:right"><span style="color:#4ade80;font-weight:bold;display:block">R$ ' + p.valor.toFixed(2) + '</span><span class="badge" style="background:' + corM + '">' + p.metodo + '</span></div>';
        lista.appendChild(div);
    });
}

window.abrirFormPagamento = function(metodo) {
    document.getElementById('pag-metodo').value = metodo;
    document.getElementById('form-novo-pagamento').style.display = 'block';
    // Popular CTs fiéis ao cadastro
    var selPagCT = document.getElementById('pag-ct-sel');
    selPagCT.innerHTML = '<option value="">Selecione o CT</option>';
    DB.cts.forEach(function(c) { selPagCT.innerHTML += '<option value="' + c.id + '">' + c.nome + '</option>'; });
    // Popular alunos (todos inicialmente)
    popularAlunosPorCT('pag-aluno-sel', '');
    // Ao trocar CT no form, atualiza lista de alunos e preenche valor sugerido
    selPagCT.onchange = function() {
        popularAlunosPorCT('pag-aluno-sel', this.value);
    };
    // Ao selecionar aluno, sugere valor da mensalidade
    document.getElementById('pag-aluno-sel').onchange = function() {
        var alId = this.value;
        var al = DB.alunos.find(function(a) { return a.id === alId; });
        if (al) document.getElementById('pag-valor').value = getMensalidadeAluno(al).toFixed(2);
    };
};

function registrarPagamento() {
    var alunoId = document.getElementById('pag-aluno-sel').value;
    var ctId    = document.getElementById('pag-ct-sel').value;
    var valor   = parseFloat(document.getElementById('pag-valor').value);
    var metodo  = document.getElementById('pag-metodo').value;
    var data    = document.getElementById('pag-data').value || new Date().toISOString().split('T')[0];
    if (!alunoId) { mostrarModal("ATENÇÃO","Selecione o aluno."); return; }
    if (!valor || valor <= 0) { mostrarModal("ATENÇÃO","Informe o valor."); return; }
    var al = DB.alunos.find(function(a) { return a.id === alunoId; }); if (!al) return;
    DB.pagamentos.push({ id: String(Date.now()), alunoId: alunoId, ctId: ctId||al.ctId, valor: valor, metodo: metodo, data: data, status: "Pago" });
    if (al.status === "Inadimplente") { al.status = "Em dia"; log("Sistema","Status Atualizado",al.nome+" → Em dia após pagamento."); }
    log("Admin [" + currentUser.nivel + "]","Pagamento",al.nome+" — R$"+valor.toFixed(2)+" via "+metodo);
    var msg = "✅ OGRO TEAM — Pagamento confirmado!\n\nAluno: "+al.nome+"\nValor: R$ "+valor.toFixed(2)+"\nMétodo: "+metodo+"\nData: "+formatarData(data);
    enviarAvisoInterno(al.id,"✅ Pagamento Confirmado","Valor: R$ "+valor.toFixed(2)+" | "+metodo+"\nData: "+formatarData(data),"Sistema");
    if (al.email) console.info("[EMAIL] "+al.email+"\n"+msg);
    document.getElementById('form-novo-pagamento').style.display = 'none';
    document.getElementById('pag-valor').value = ""; document.getElementById('pag-aluno-sel').value = "";
    mostrarModal("✅ PAGAMENTO REGISTRADO",msg);
    renderPagamentos();
}

// ========================================================
// CONTRATOS — VERIFICAÇÃO
// ========================================================
function verificarVencimentosContratos() {
    var hoje = new Date().toISOString().split('T')[0];
    var avisos = [];
    DB.cts.forEach(function(ct) {
        if (!ct.contrato || !ct.contrato.dataFim) return;
        var diff = Math.floor((new Date(ct.contrato.dataFim) - new Date(hoje)) / (1000*60*60*24));
        if (diff <= 30 && diff >= 0) avisos.push("⚠️ " + ct.nome + ": vence em " + diff + " dia(s) — " + formatarData(ct.contrato.dataFim));
        else if (diff < 0) avisos.push("❌ " + ct.nome + ": VENCIDO em " + formatarData(ct.contrato.dataFim));
    });
    if (avisos.length > 0) setTimeout(function() { mostrarModal("📋 CONTRATOS", avisos.join("\n\n")); }, 800);
}

// ========================================================
// CÂMERA E FOTO
// ========================================================
function lerFoto(event, previewId) {
    var file = event.target.files[0]; if (!file) return;
    var reader = new FileReader();
    reader.onload = function() { var el = document.getElementById(previewId); el.style.backgroundImage='url('+reader.result+')'; el.textContent=""; el.dataset.foto=reader.result; };
    reader.readAsDataURL(file);
}

function resetPreview(id, texto) {
    var el = document.getElementById(id); el.style.backgroundImage="none"; el.textContent=texto; delete el.dataset.foto;
}

function pararStream(stream) { if (stream) stream.getTracks().forEach(function(t) { t.stop(); }); }

function abrirCameraStream(videoId, callback) {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: { exact: "environment" } } })
        .catch(function() { return navigator.mediaDevices.getUserMedia({ video: true }); })
        .then(function(stream) { callback(stream); var v = document.getElementById(videoId); v.srcObject=stream; v.play(); })
        .catch(function() { mostrarModal("ERRO","Câmera não disponível."); });
}

function capturarFoto(videoId, previewId) {
    var v = document.getElementById(videoId);
    var canvas = document.createElement('canvas'); canvas.width=v.videoWidth; canvas.height=v.videoHeight;
    canvas.getContext('2d').drawImage(v,0,0);
    var dataUrl = canvas.toDataURL('image/jpeg',0.8);
    var prev = document.getElementById(previewId); prev.style.backgroundImage='url('+dataUrl+')'; prev.textContent=""; prev.dataset.foto=dataUrl;
}

function toggleCamera(divId, videoId, callback) {
    var div = document.getElementById(divId);
    if (div.style.display === 'block') { div.style.display='none'; }
    else { div.style.display='block'; abrirCameraStream(videoId, callback); }
}
