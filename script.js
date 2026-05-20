// ============================================================
// OGRO TEAM v4.0 — SCRIPT PRINCIPAL
// ============================================================

// ============================================================
// BANCO DE DADOS
// ============================================================
var DB = {
    precos: { Comercial: 150, Atleta: 100, Bolsista: 0, Instrutor: 80, Particular: 250 },
    alunos: [
        {
            id: "1", nome: "Carlos Silva", email: "carlos@email.com", whatsapp: "21999998888",
            ctId: "1", plano: "Mensal", status: "Em dia", perfil: "Comercial",
            modalidade: "Muay Thai", graduacao: "VERMELHO", frequencia: 14, foto: "", senha: "Abc@1234",
            docTipo: "RG", docNumero: "1234567", docFoto: "",
            campeonatos: [{ id: "c1", nome: "Copa RJ 2026", data: "2026-03-10", local: "Rio de Janeiro/RJ", resultado: "Vitória" }],
            autorizacoes: []
        },
        {
            id: "2", nome: "Marcos Lima", email: "marcos@email.com", whatsapp: "21988887777",
            ctId: "1", plano: "Trimestral", status: "Inadimplente", perfil: "Atleta",
            modalidade: "Boxe", graduacao: "CLASSE B", frequencia: 8, foto: "", senha: "Xyz#5678",
            docTipo: "CNH", docNumero: "9876543", docFoto: "",
            campeonatos: [], autorizacoes: []
        }
    ],
    cts: [
        {
            id: "1", nome: "CT Matriz", professor: "Professor Igor",
            cnpj: "12.345.678/0001-00", responsavel: "Mestre Ogro",
            endereco: "Av. Principal, 100", cidade: "Rio de Janeiro/RJ",
            whatsapp: "21977776666", capacidade: 30, mensalidade: 150
        }
    ],
    admins: [
        { id: "1", nome: "Mestre Ogro", email: "admin@ogroteam.com", senha: "123", nivel: "Mestre" },
        { id: "2", nome: "Apoio 1", email: "apoio@ogroteam.com", senha: "123", nivel: "Apoio Administrativo" }
    ],
    logs: [
        { data: "19/05/2026 - 09:00", autor: "Sistema", acao: "Início", detalhe: "Ogro Team v4.0 iniciado." }
    ]
};

var currentUser = null;
var qrScanner = null;
var cameraStream = null;

// ============================================================
// UTILITÁRIOS
// ============================================================
function gerarSenha() {
    var chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!";
    var s = "";
    for (var i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
}

function log(autor, acao, detalhe) {
    var agora = new Date();
    var d = agora.toLocaleDateString("pt-BR") + " - " + agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    DB.logs.unshift({ data: d, autor: autor, acao: acao, detalhe: detalhe });
}

function fmt(valor) {
    return "R$ " + Number(valor).toFixed(2);
}

function fmtData(str) {
    if (!str) return "";
    var p = str.split("-");
    if (p.length === 3) return p[2] + "/" + p[1] + "/" + p[0];
    return str;
}

function ctNome(id) {
    var c = DB.cts.find(function(x) { return x.id === id; });
    return c ? c.nome : "—";
}

// ============================================================
// MODAL
// ============================================================
function mostrarModal(titulo, texto, icone) {
    document.getElementById("modal-titulo").textContent = (icone || "🥋") + " " + titulo;
    document.getElementById("modal-texto").textContent = texto;
    document.getElementById("modal").dataset.texto = texto;
    document.getElementById("modal").style.display = "flex";
}

function fecharModal() {
    document.getElementById("modal").style.display = "none";
}

function copiarModal() {
    var t = document.getElementById("modal").dataset.texto || "";
    if (navigator.clipboard) {
        navigator.clipboard.writeText(t).then(function() { alert("✅ Copiado!"); });
    } else {
        var ta = document.createElement("textarea");
        ta.value = t;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        alert("✅ Copiado!");
    }
}

// ============================================================
// NAVEGAÇÃO
// ============================================================
var PERM = {
    "Mestre":                  [1,2,3,4,5,6,7,8,9,10,11,12,13,14],
    "Administrador Integral":  [1,2,3,4,5,6,7,8,9,10,11,12,13,14],
    "Apoio Administrativo":    [1,2,3,4,5,6,8,9,10,11,12,14],
    "Aluno Instrutor":         [1,2,8,12],
    "Aluno":                   [1,2,12]
};

function ir(pg) {
    pg = parseInt(pg);

    if (pg !== 1 && pg !== 2 && !currentUser) {
        alert("Faça o login primeiro.");
        pg = 1;
    }

    if (currentUser) {
        var nivel = currentUser.nivel || "Aluno";
        var perm = PERM[nivel] || [1, 2];
        if (perm.indexOf(pg) === -1) {
            alert("Seu perfil não tem acesso a esta área.");
            return;
        }
    }

    // Para câmera QR se sair da p8
    if (pg !== 8 && qrScanner) {
        try { qrScanner.clear(); } catch(e) {}
        qrScanner = null;
        var rd = document.getElementById("reader");
        if (rd) { rd.style.display = "none"; rd.innerHTML = ""; }
    }

    // Para câmeras de foto
    pararCamera();

    // Rodapé admin
    var footer = document.querySelector(".footer-fixo");
    var isAdmin = currentUser && (currentUser.nivel === "Mestre" || currentUser.nivel === "Administrador Integral" || currentUser.nivel === "Apoio Administrativo");
    if (isAdmin) footer.classList.add("show-footer");
    else footer.classList.remove("show-footer");

    document.querySelectorAll(".page").forEach(function(p) { p.classList.remove("active"); });
    var dest = document.getElementById("p" + pg);
    if (dest) dest.classList.add("active");
    window.scrollTo(0, 0);

    // Inicializações por página
    if (pg === 4) popularSelectCT("cad-ct");
    if (pg === 6) renderDashboard();
    if (pg === 7) renderEquipe();
    if (pg === 8) iniciarFrequencia();
    if (pg === 9) renderRegistros();
    if (pg === 11) renderRelatorio();
    if (pg === 12) renderCarteirinha();
    if (pg === 13) renderConfig();
    if (pg === 14) renderCampeonatos();
}

function popularSelectCT(idSel) {
    var sel = document.getElementById(idSel);
    if (!sel) return;
    sel.innerHTML = "<option value=''>Selecione o CT</option>";
    DB.cts.forEach(function(c) {
        sel.innerHTML += "<option value='" + c.id + "'>" + c.nome + "</option>";
    });
}

// ============================================================
// LOGIN
// ============================================================
function executarLogin() {
    var inp = (document.getElementById("login-email").value || "").trim();
    var sen = (document.getElementById("login-senha").value || "").trim();

    if (!inp || !sen) { alert("Preencha e-mail/nome e senha."); return; }

    // Busca admin
    var adm = DB.admins.find(function(a) {
        return (a.email === inp || a.nome === inp) && a.senha === sen;
    });
    if (adm) {
        currentUser = JSON.parse(JSON.stringify(adm));
        log("Admin [" + adm.nivel + "]", "Login", adm.nome + " entrou no sistema.");
        ir(3);
        return;
    }

    // Busca aluno
    var alu = DB.alunos.find(function(a) {
        return (a.email === inp || a.nome === inp || a.whatsapp === inp) && a.senha === sen;
    });
    if (alu) {
        currentUser = JSON.parse(JSON.stringify(alu));
        currentUser.nivel = alu.perfil === "Instrutor" ? "Aluno Instrutor" : "Aluno";
        ir(12);
        return;
    }

    alert("Login ou senha incorretos. Verifique e tente novamente.");
}

function executarRecuperacao() {
    var usuario = (document.getElementById("recup-usuario").value || "").trim();
    var nova = (document.getElementById("recup-nova").value || "").trim();
    var conf = (document.getElementById("recup-confirma").value || "").trim();

    if (!usuario) { alert("Informe seu e-mail ou nome."); return; }
    if (!nova) { alert("Digite a nova senha."); return; }
    if (nova !== conf) { alert("As senhas não coincidem."); return; }

    var adm = DB.admins.find(function(a) { return a.email === usuario || a.nome === usuario; });
    if (adm) { adm.senha = nova; log("Sistema", "Recuperação", "Senha do admin " + adm.nome + " redefinida."); alert("Senha redefinida! Faça o login."); ir(1); return; }

    var alu = DB.alunos.find(function(a) { return a.email === usuario || a.nome === usuario; });
    if (alu) { alu.senha = nova; log("Sistema", "Recuperação", "Senha do aluno " + alu.nome + " redefinida."); alert("Senha redefinida! Faça o login."); ir(1); return; }

    alert("Usuário não encontrado.");
}

// ============================================================
// FOTO PREVIEW
// ============================================================
function bindFoto(inputId, previewId) {
    var inp = document.getElementById(inputId);
    if (!inp) return;
    inp.addEventListener("change", function() {
        var file = inp.files[0];
        if (!file) return;
        var fr = new FileReader();
        fr.onload = function() {
            var el = document.getElementById(previewId);
            el.style.backgroundImage = "url(" + fr.result + ")";
            el.textContent = "";
            el.dataset.foto = fr.result;
        };
        fr.readAsDataURL(file);
    });
}

// ============================================================
// CÂMERA GENÉRICA (traseira)
// ============================================================
function abrirCamera(videoId, divId, onStream) {
    var div = document.getElementById(divId);
    if (div.style.display === "block") {
        pararCamera();
        div.style.display = "none";
        return;
    }
    div.style.display = "block";
    var video = document.getElementById(videoId);
    navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } } })
        .catch(function() { return navigator.mediaDevices.getUserMedia({ video: true }); })
        .then(function(stream) {
            cameraStream = stream;
            video.srcObject = stream;
            video.play();
            if (onStream) onStream(stream);
        })
        .catch(function() { alert("Câmera não disponível ou permissão negada."); div.style.display = "none"; });
}

function capturarFoto(videoId, previewId, divId) {
    var video = document.getElementById(videoId);
    var canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext("2d").drawImage(video, 0, 0);
    var data = canvas.toDataURL("image/jpeg", 0.8);
    var prev = document.getElementById(previewId);
    prev.style.backgroundImage = "url(" + data + ")";
    prev.textContent = "";
    prev.dataset.foto = data;
    pararCamera();
    document.getElementById(divId).style.display = "none";
}

function pararCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(function(t) { t.stop(); });
        cameraStream = null;
    }
}

// ============================================================
// CADASTRO DE ALUNO
// ============================================================
function salvarAluno() {
    var nome     = (document.getElementById("cad-nome").value || "").trim();
    var email    = (document.getElementById("cad-email").value || "").trim();
    var whatsapp = (document.getElementById("cad-whatsapp").value || "").trim();
    var ctId     = document.getElementById("cad-ct").value;
    var plano    = document.getElementById("cad-plano").value;
    var status   = document.getElementById("cad-status").value;
    var perfil   = document.getElementById("cad-perfil").value;
    var mod      = document.getElementById("cad-modalidade").value;
    var grad     = (document.getElementById("cad-graduacao").value || "").toUpperCase();
    var docTipo  = document.getElementById("cad-doc-tipo").value;
    var docNum   = (document.getElementById("cad-doc-numero").value || "").trim();
    var docFoto  = (document.getElementById("cad-doc-preview").dataset.foto || "");
    var foto     = (document.getElementById("aluno-foto-preview").dataset.foto || "");

    if (!nome)     { alert("Informe o nome do aluno."); return; }
    if (!whatsapp) { alert("Informe o WhatsApp do aluno."); return; }
    if (!ctId)     { alert("Selecione o CT/Academia."); return; }

    var senha = gerarSenha();
    var novo = {
        id: String(Date.now()), nome: nome, email: email, whatsapp: whatsapp,
        ctId: ctId, plano: plano, status: status, perfil: perfil,
        modalidade: mod, graduacao: grad, frequencia: 0,
        foto: foto, senha: senha,
        docTipo: docTipo, docNumero: docNum, docFoto: docFoto,
        campeonatos: [], autorizacoes: []
    };
    DB.alunos.push(novo);
    log("Admin [" + currentUser.nivel + "]", "Cadastro Aluno", nome + " | CT: " + ctNome(ctId) + " | Perfil: " + perfil);

    // Limpar campos
    ["cad-nome","cad-email","cad-whatsapp","cad-graduacao","cad-doc-numero"].forEach(function(id) {
        document.getElementById(id).value = "";
    });
    document.getElementById("cad-ct").value = "";
    var fp = document.getElementById("aluno-foto-preview");
    fp.style.backgroundImage = "none"; fp.textContent = "📷 Foto"; delete fp.dataset.foto;
    var dp = document.getElementById("cad-doc-preview");
    dp.style.backgroundImage = "none"; dp.textContent = "Foto Doc"; delete dp.dataset.foto;

    var login = email || nome;
    var msg = "🥋 OGRO TEAM\n\nOlá, " + nome + "! Seu acesso foi criado.\n\n👤 Login: " + login + "\n🔑 Senha: " + senha + "\n\nGuarde sua senha com segurança!";
    if (email) log("Sistema", "E-mail Credenciais", "Credenciais enviadas para " + email);
    mostrarModal("ACESSO CRIADO!", msg, "🥋");
}

// ============================================================
// CADASTRO DE CT
// ============================================================
function salvarCT() {
    var nome = (document.getElementById("ct-nome").value || "").trim();
    var prof = (document.getElementById("ct-professor").value || "").trim();
    if (!nome) { alert("Informe o nome da filial."); return; }
    if (!prof) { alert("Informe o professor responsável."); return; }
    var id = String(Date.now());
    DB.cts.push({
        id: id, nome: nome, professor: prof,
        cnpj:       document.getElementById("ct-cnpj").value,
        responsavel:document.getElementById("ct-responsavel").value,
        endereco:   document.getElementById("ct-endereco").value,
        cidade:     document.getElementById("ct-cidade").value,
        whatsapp:   document.getElementById("ct-whatsapp").value,
        capacidade: document.getElementById("ct-capacidade").value,
        mensalidade:parseFloat(document.getElementById("ct-mensalidade").value) || 0
    });
    log("Admin [" + currentUser.nivel + "]", "Cadastro CT", "Filial " + nome + " registrada.");
    alert("✅ Filial registrada!");
    ["ct-nome","ct-professor","ct-cnpj","ct-responsavel","ct-endereco","ct-cidade","ct-whatsapp","ct-capacidade","ct-mensalidade"].forEach(function(id) { document.getElementById(id).value = ""; });
    ir(3);
}

// ============================================================
// DASHBOARD
// ============================================================
function renderDashboard() {
    var fat = 0, inad = 0, rec = 0, muay = 0, boxe = 0, mma = 0;
    DB.alunos.forEach(function(a) {
        var v = DB.precos[a.perfil] || 0;
        if (a.status !== "Trancada" && a.status !== "Suspenso") {
            fat += v;
            if (a.status === "Em dia") rec += v; else inad += v;
        }
        if (a.modalidade === "Muay Thai") muay++;
        if (a.modalidade === "Boxe") boxe++;
        if (a.modalidade === "MMA") mma++;
    });
    document.getElementById("dash-fat").textContent  = fmt(fat);
    document.getElementById("dash-inad").textContent = fmt(inad);
    document.getElementById("dash-rec").textContent  = fmt(rec);
    var tot = muay + boxe + mma || 1;
    document.getElementById("cnt-muay").textContent = muay;
    document.getElementById("cnt-boxe").textContent = boxe;
    document.getElementById("cnt-mma").textContent  = mma;
    document.getElementById("bar-muay").style.width = (muay/tot*100) + "%";
    document.getElementById("bar-boxe").style.width = (boxe/tot*100) + "%";
    document.getElementById("bar-mma").style.width  = (mma/tot*100) + "%";

    var lista = document.getElementById("dash-devedores");
    lista.innerHTML = "";
    var dev = DB.alunos.filter(function(a) { return a.status !== "Em dia"; });
    if (!dev.length) { lista.innerHTML = "<p style='color:#4ade80;text-align:center;padding:16px'>✅ Nenhum devedor</p>"; return; }
    dev.forEach(function(a) {
        var v = DB.precos[a.perfil] || 0;
        var div = document.createElement("div");
        div.className = "item-registro";
        div.innerHTML =
            "<div>" +
            "<strong>" + a.nome + "</strong> [" + a.status + "]<br>" +
            "<small style='color:#8a8a8a'>" + fmt(v) + " | " + (a.email || "sem e-mail") + "</small>" +
            "</div>" +
            "<div style='display:flex;flex-direction:column;gap:4px;align-items:flex-end'>" +
            "<button class='btn btn-primary' style='padding:4px 8px;font-size:11px;width:auto' onclick='cobrarEmail(\"" + a.id + "\")'>📧 E-mail</button>" +
            "<button class='btn btn-accent' style='padding:4px 8px;font-size:11px;width:auto;background:#1c4a1c' onclick='cobrarMensagem(\"" + a.id + "\")'>💬 Mensagem</button>" +
            "</div>";
        lista.appendChild(div);
    });
}

function cobrarEmail(id) {
    var a = DB.alunos.find(function(x) { return x.id === id; });
    if (!a) return;
    var v = DB.precos[a.perfil] || 0;
    var msg = "⚠️ OGRO TEAM\n\nOlá, " + a.nome + "!\n\nSeu plano " + a.plano + " está com pagamento pendente.\nValor: " + fmt(v) + "\n\nPor favor, regularize na secretaria para manter seu acesso.\n\nOgro Team 🥋";
    if (a.email) log("Admin [" + currentUser.nivel + "]", "Cobrança E-mail", "Cobrança enviada para " + a.email + " — " + a.nome);
    mostrarModal("COBRANÇA POR E-MAIL", msg, "📧");
}

function cobrarMensagem(id) {
    var a = DB.alunos.find(function(x) { return x.id === id; });
    if (!a) return;
    var v = DB.precos[a.perfil] || 0;
    var msg = "⚠️ *OGRO TEAM*\n\nOlá, " + a.nome + "!\n\nSeu plano *" + a.plano + "* está com pagamento pendente.\nValor: *" + fmt(v) + "*\n\nPor favor, regularize na secretaria.\n\n🥋 Ogro Team";
    log("Admin [" + currentUser.nivel + "]", "Cobrança Mensagem", "Mensagem de cobrança gerada para " + a.nome);
    mostrarModal("MENSAGEM DE COBRANÇA", msg, "💬");
}

// ============================================================
// EQUIPE
// ============================================================
function renderEquipe() {
    var listaEquipe = document.getElementById("lista-equipe");
    listaEquipe.innerHTML = "";
    DB.admins.forEach(function(a) {
        var div = document.createElement("div");
        div.className = "item-registro";
        div.innerHTML =
            "<div><strong>" + a.nome + "</strong><br><small style='color:#8a8a8a'>" + a.nivel + " | " + a.email + "</small></div>" +
            (a.id !== "1"
                ? "<button class='btn btn-vermelho' style='padding:4px 8px;font-size:11px;width:auto' onclick='removerAdmin(\"" + a.id + "\")'>Revogar</button>"
                : "<small style='color:#16a34a'>Master</small>");
        listaEquipe.appendChild(div);
    });

    var listaProm = document.getElementById("lista-promocao");
    listaProm.innerHTML = "";
    DB.alunos.forEach(function(a) {
        var div = document.createElement("div");
        div.className = "item-registro";
        div.innerHTML =
            "<span>" + a.nome + " <small style='color:#8a8a8a'>(" + a.perfil + ")</small></span>" +
            "<div style='display:flex;gap:4px'>" +
            (a.perfil !== "Instrutor" ? "<button class='btn btn-primary' style='padding:4px 6px;font-size:10px;width:auto' onclick='promover(\"" + a.id + "\",\"Administrador Integral\")'>Admin</button>" : "") +
            "<button class='btn btn-accent' style='padding:4px 6px;font-size:10px;width:auto;background:#262626' onclick='promover(\"" + a.id + "\",\"Apoio Administrativo\")'>Apoio</button>" +
            "</div>";
        listaProm.appendChild(div);
    });
}

function salvarAdmin() {
    var nome  = (document.getElementById("adm-nome").value || "").trim();
    var email = (document.getElementById("adm-email").value || "").trim();
    var senha = (document.getElementById("adm-senha").value || "").trim();
    var nivel = document.getElementById("adm-nivel").value;
    if (!nome || !email || !senha) { alert("Preencha todos os campos."); return; }
    DB.admins.push({ id: String(Date.now()), nome: nome, email: email, senha: senha, nivel: nivel });
    log("Mestre", "Novo Gestor", nome + " adicionado como " + nivel);
    document.getElementById("adm-nome").value = "";
    document.getElementById("adm-email").value = "";
    document.getElementById("adm-senha").value = "";
    renderEquipe();
}

function removerAdmin(id) {
    if (!confirm("Revogar acesso deste gestor?")) return;
    var idx = DB.admins.findIndex(function(a) { return a.id === id; });
    if (idx !== -1) { log("Mestre", "Revogação", DB.admins[idx].nome + " removido."); DB.admins.splice(idx, 1); }
    renderEquipe();
}

function promover(idAluno, nivel) {
    var a = DB.alunos.find(function(x) { return x.id === idAluno; });
    if (!a) return;
    if (a.perfil === "Instrutor" && nivel === "Administrador Integral") {
        nivel = "Apoio Administrativo";
        alert("Instrutor só pode ser promovido até Apoio Administrativo.");
    }
    DB.admins.push({ id: String(Date.now()), nome: a.nome, email: a.email || a.nome.toLowerCase().replace(/\s/g,"") + "@ogroteam.com", senha: a.senha, nivel: nivel });
    log("Mestre", "Promoção", a.nome + " → " + nivel);
    alert(a.nome + " promovido como " + nivel + "!");
    renderEquipe();
}

// ============================================================
// PRESENÇA / CATRACA
// ============================================================
function iniciarFrequencia() {
    var sa = document.getElementById("presenca-aluno");
    var sc = document.getElementById("presenca-ct");
    sa.innerHTML = ""; sc.innerHTML = "";
    DB.alunos.forEach(function(a) { sa.innerHTML += "<option value='" + a.id + "'>" + a.nome + "</option>"; });
    DB.cts.forEach(function(c) { sc.innerHTML += "<option value='" + c.id + "'>" + c.nome + "</option>"; });
}

function ativarCamera() {
    var rd = document.getElementById("reader");
    if (qrScanner) {
        try { qrScanner.clear(); } catch(e) {}
        qrScanner = null;
        rd.style.display = "none"; rd.innerHTML = "";
        return;
    }
    rd.style.display = "block"; rd.innerHTML = "";
    function iniciar(cfg) {
        qrScanner = new Html5QrcodeScanner("reader", cfg, false);
        qrScanner.render(function(txt) {
            try { qrScanner.clear(); } catch(e) {}
            qrScanner = null;
            rd.style.display = "none"; rd.innerHTML = "";
            registrarEntrada(txt);
        }, function() {});
    }
    try { iniciar({ fps: 15, qrbox: { width: 220, height: 220 }, videoConstraints: { facingMode: { exact: "environment" } } }); }
    catch(e) { try { iniciar({ fps: 15, qrbox: { width: 220, height: 220 } }); } catch(e2) { alert("Câmera indisponível."); rd.style.display = "none"; } }
}

function registrarEntrada(idAluno) {
    var a = DB.alunos.find(function(x) { return x.id === idAluno; });
    var ctId = document.getElementById("presenca-ct").value;
    var ct = DB.cts.find(function(c) { return c.id === ctId; }) || { nome: "CT Principal" };
    if (!a) { alert("QR Code não reconhecido."); return; }
    if (a.status === "Suspenso" || a.status === "Trancada") {
        alert("❌ ACESSO NEGADO: " + a.nome + " — Status: " + a.status); return;
    }
    a.frequencia = (a.frequencia || 0) + 1;
    var agora = new Date();
    var dh = agora.toLocaleDateString("pt-BR") + " às " + agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    log("Catraca", "Check-in", a.nome + " entrou em " + ct.nome + " — " + dh);
    var mural = document.getElementById("mural-freq");
    var div = document.createElement("div");
    div.className = "item-registro";
    div.innerHTML = "<strong>" + dh + "</strong> — 🥋 " + a.nome + " | " + ct.nome;
    mural.insertBefore(div, mural.firstChild);
    alert("🥊 ENTRADA AUTORIZADA! Bom treino, " + a.nome + "!");
}

// ============================================================
// REGISTROS
// ============================================================
function renderRegistros() {
    var busca = (document.getElementById("busca-reativa").value || "").toLowerCase();
    var c = document.getElementById("lista-registros");
    c.innerHTML = "";
    var af = DB.alunos.filter(function(a) { return a.nome.toLowerCase().includes(busca) || (a.email || "").toLowerCase().includes(busca); });
    var cf = DB.cts.filter(function(ct) { return ct.nome.toLowerCase().includes(busca) || ct.professor.toLowerCase().includes(busca); });
    if (!af.length && !cf.length) { c.innerHTML = "<p style='color:#8a8a8a;text-align:center;padding:16px'>Nenhum resultado.</p>"; return; }
    af.forEach(function(a) {
        var cor = a.status === "Em dia" ? "#16a34a" : a.status === "Inadimplente" ? "#ba0f14" : "#d97706";
        var fs = a.foto ? "background-image:url(" + a.foto + ")" : "";
        var div = document.createElement("div");
        div.className = "item-registro";
        div.innerHTML =
            "<div style='display:flex;align-items:center;gap:10px'>" +
            "<div class='mini-avatar' style='" + fs + "'></div>" +
            "<div><strong>" + a.nome + "</strong><br><small style='color:#8a8a8a'>" + a.perfil + " | " + ctNome(a.ctId) + "</small></div>" +
            "</div>" +
            "<div style='display:flex;flex-direction:column;align-items:flex-end;gap:4px'>" +
            "<span class='badge' style='background:" + cor + "'>" + a.status + "</span>" +
            "<div>" +
            "<button class='btn btn-primary' style='padding:4px 8px;font-size:11px;width:auto' onclick='abrirEdicao(\"" + a.id + "\")'>Editar</button> " +
            "<button class='btn btn-vermelho' style='padding:4px 8px;font-size:11px;width:auto' onclick='excluirAluno(\"" + a.id + "\")'>Excluir</button>" +
            "</div></div>";
        c.appendChild(div);
    });
    cf.forEach(function(ct) {
        var div = document.createElement("div");
        div.className = "item-registro";
        div.innerHTML =
            "<div><strong>🏛️ " + ct.nome + "</strong><br><small style='color:#8a8a8a'>Prof: " + ct.professor + "</small></div>" +
            "<button class='btn btn-vermelho' style='padding:4px 8px;font-size:11px;width:auto' onclick='excluirCT(\"" + ct.id + "\")'>Excluir</button>";
        c.appendChild(div);
    });
}

function abrirEdicao(id) {
    var a = DB.alunos.find(function(x) { return x.id === id; });
    if (!a) return;
    document.getElementById("edit-id").value = a.id;
    document.getElementById("edit-nome").value = a.nome;
    document.getElementById("edit-email").value = a.email || "";
    document.getElementById("edit-whatsapp").value = a.whatsapp || "";
    document.getElementById("edit-plano").value = a.plano;
    document.getElementById("edit-status").value = a.status;
    document.getElementById("edit-modalidade").value = a.modalidade;
    document.getElementById("edit-graduacao").value = a.graduacao;
    var ep = document.getElementById("edit-foto-preview");
    ep.style.backgroundImage = a.foto ? "url(" + a.foto + ")" : "none";
    ep.dataset.foto = a.foto || "";
    ir(10);
}

function salvarEdicao() {
    var id = document.getElementById("edit-id").value;
    var a = DB.alunos.find(function(x) { return x.id === id; });
    if (!a) return;
    var gradNova = (document.getElementById("edit-graduacao").value || "").toUpperCase();
    if (a.graduacao !== gradNova) log("Admin", "Graduação", a.nome + ": " + a.graduacao + " → " + gradNova);
    a.nome       = document.getElementById("edit-nome").value;
    a.email      = document.getElementById("edit-email").value;
    a.whatsapp   = document.getElementById("edit-whatsapp").value;
    a.plano      = document.getElementById("edit-plano").value;
    a.status     = document.getElementById("edit-status").value;
    a.modalidade = document.getElementById("edit-modalidade").value;
    a.graduacao  = gradNova;
    var ep = document.getElementById("edit-foto-preview");
    if (ep.dataset.foto) a.foto = ep.dataset.foto;
    log("Admin [" + currentUser.nivel + "]", "Edição", "Dados de " + a.nome + " atualizados.");
    alert("✅ Dados salvos!");
    ir(9);
}

function excluirAluno(id) {
    if (!confirm("Excluir este aluno permanentemente?")) return;
    var idx = DB.alunos.findIndex(function(a) { return a.id === id; });
    if (idx !== -1) { log("Admin", "Exclusão", "Aluno " + DB.alunos[idx].nome + " removido."); DB.alunos.splice(idx, 1); }
    renderRegistros();
}

function excluirCT(id) {
    if (!confirm("Excluir este CT permanentemente?")) return;
    var idx = DB.cts.findIndex(function(c) { return c.id === id; });
    if (idx !== -1) { log("Admin", "Exclusão CT", DB.cts[idx].nome + " removido."); DB.cts.splice(idx, 1); }
    renderRegistros();
}

// ============================================================
// RELATÓRIOS
// ============================================================
function renderRelatorio() {
    var perf = document.getElementById("rep-perfil").value;
    var mod  = document.getElementById("rep-modalidade").value;
    var lista = document.getElementById("rep-lista");
    lista.innerHTML = "";
    var f = DB.alunos;
    if (perf !== "Todos") f = f.filter(function(a) { return a.perfil === perf; });
    if (mod !== "Todas")  f = f.filter(function(a) { return a.modalidade === mod; });
    document.getElementById("rep-count").textContent = f.length;
    var soma = 0; f.forEach(function(a) { soma += DB.precos[a.perfil] || 0; });
    document.getElementById("rep-soma").textContent = fmt(soma);
    if (!f.length) { lista.innerHTML = "<p style='color:#8a8a8a;text-align:center;padding:16px'>Nenhum resultado.</p>"; return; }
    f.forEach(function(a) {
        var div = document.createElement("div");
        div.className = "item-registro";
        div.innerHTML =
            "<div><strong>" + a.nome + "</strong><br><small style='color:#8a8a8a'>" + a.modalidade + " | " + ctNome(a.ctId) + " | " + a.status + "</small></div>" +
            "<span style='color:#4ade80;font-weight:bold'>" + fmt(DB.precos[a.perfil] || 0) + "</span>";
        lista.appendChild(div);
    });
}

function exportarRelatorio() {
    var perf = document.getElementById("rep-perfil").value;
    var mod  = document.getElementById("rep-modalidade").value;
    var f = DB.alunos;
    if (perf !== "Todos") f = f.filter(function(a) { return a.perfil === perf; });
    if (mod !== "Todas")  f = f.filter(function(a) { return a.modalidade === mod; });
    if (!f.length) { alert("Nenhum aluno para exportar."); return; }
    var txt = "OGRO TEAM — RELATÓRIO\n" + new Date().toLocaleDateString("pt-BR") + "\n";
    txt += "Filtros: " + perf + " | " + mod + "\n";
    txt += "==========================================\n";
    f.forEach(function(a, i) {
        txt += (i+1) + ". " + a.nome + "\n   Perfil: " + a.perfil + " | CT: " + ctNome(a.ctId) + " | " + a.modalidade + "\n   Status: " + a.status + " | " + fmt(DB.precos[a.perfil]||0) + "\n   E-mail: " + (a.email||"-") + " | WhatsApp: " + (a.whatsapp||"-") + "\n\n";
    });
    log("Admin [" + currentUser.nivel + "]", "Relatório", "Exportado: " + f.length + " alunos.");
    mostrarModal("RELATÓRIO EXPORTADO", txt, "📊");
}

// ============================================================
// CARTEIRINHA
// ============================================================
function renderCarteirinha() {
    var a = currentUser;
    if (!a) return;
    var ct = ctNome(a.ctId);
    document.getElementById("aluno-nome-tela").textContent = a.nome;
    document.getElementById("aluno-tag").textContent = "[" + (a.perfil || "ALUNO").toUpperCase() + "]";
    document.getElementById("aluno-grad-tela").textContent = (a.modalidade || "") + " — " + (a.graduacao || "");
    document.getElementById("aluno-freq").textContent = a.frequencia || 0;

    document.getElementById("aluno-dados").innerHTML =
        "<div class='dado-item'><span class='dado-label'>📧 E-mail</span><span>" + (a.email||"—") + "</span></div>" +
        "<div class='dado-item'><span class='dado-label'>📱 WhatsApp</span><span>" + (a.whatsapp||"—") + "</span></div>" +
        "<div class='dado-item'><span class='dado-label'>🏛️ CT</span><span>" + ct + "</span></div>" +
        "<div class='dado-item'><span class='dado-label'>📋 Plano</span><span>" + (a.plano||"—") + "</span></div>" +
        "<div class='dado-item'><span class='dado-label'>📄 Documento</span><span>" + (a.docTipo||"—") + " " + (a.docNumero||"") + "</span></div>";

    var box = document.getElementById("aluno-status");
    if (a.status === "Em dia") {
        box.className = "status-box status-pago";
        box.innerHTML = "<h3>ACESSO AUTORIZADO ✔️</h3><p>Mensalidade em dia.</p>";
    } else {
        box.className = "status-box status-atraso";
        box.innerHTML = "<h3>STATUS [" + (a.status||"").toUpperCase() + "] ⚠️</h3><p>Procure a secretaria.</p>";
    }

    var av = document.getElementById("aluno-avatar");
    if (a.foto) { av.style.backgroundImage = "url(" + a.foto + ")"; av.textContent = ""; }
    else { av.style.backgroundImage = "none"; av.textContent = "👤"; }

    var qrEl = document.getElementById("aluno-qr");
    qrEl.innerHTML = "";
    if (typeof QRCode !== "undefined") {
        new QRCode(qrEl, { text: String(a.id), width: 130, height: 130, colorDark: "#000", colorLight: "#fff" });
    }

    var camps = document.getElementById("aluno-camps");
    camps.innerHTML = "";
    var list = a.campeonatos || [];
    if (!list.length) { camps.innerHTML = "<p style='color:#8a8a8a;text-align:center;padding:12px'>Nenhum campeonato.</p>"; }
    else {
        var cores = { "Vitória": "#16a34a", "Derrota": "#ba0f14", "Empate": "#d97706", "W.O": "#6b7280" };
        list.forEach(function(c) {
            camps.innerHTML += "<div class='item-registro'><div><strong>" + c.nome + "</strong><br><small style='color:#8a8a8a'>" + fmtData(c.data) + " | " + c.local + "</small></div><span class='badge' style='background:" + (cores[c.resultado]||"#262626") + "'>" + c.resultado + "</span></div>";
        });
    }

    document.getElementById("rodape-aluno").textContent = "Perfil: " + (a.perfil||"Aluno") + " | " + ct;
}

// ============================================================
// CAMPEONATOS E AUTORIZAÇÕES
// ============================================================
function renderCampeonatos() {
    var sel = document.getElementById("camp-atleta");
    sel.innerHTML = "<option value=''>Selecione o Atleta</option>";
    DB.alunos.forEach(function(a) { sel.innerHTML += "<option value='" + a.id + "'>" + a.nome + "</option>"; });
    document.getElementById("camp-lista").innerHTML = "";
    document.getElementById("aut-lista").innerHTML = "";
}

function carregarAtleta() {
    var id = document.getElementById("camp-atleta").value;
    if (!id) return;
    var a = DB.alunos.find(function(x) { return x.id === id; });
    if (!a) return;

    var cl = document.getElementById("camp-lista");
    cl.innerHTML = "";
    var camps = a.campeonatos || [];
    var cores = { "Vitória": "#16a34a", "Derrota": "#ba0f14", "Empate": "#d97706", "W.O": "#6b7280" };
    if (!camps.length) { cl.innerHTML = "<p style='color:#8a8a8a;text-align:center;padding:12px'>Nenhum campeonato.</p>"; }
    else {
        camps.forEach(function(c, i) {
            cl.innerHTML += "<div class='item-registro'><div><strong>" + c.nome + "</strong><br><small style='color:#8a8a8a'>" + fmtData(c.data) + " | " + c.local + "</small></div><div style='display:flex;flex-direction:column;align-items:flex-end;gap:4px'><span class='badge' style='background:" + (cores[c.resultado]||"#333") + "'>" + c.resultado + "</span><button class='btn btn-vermelho' style='padding:2px 6px;font-size:10px;width:auto' onclick='excluirCamp(\"" + id + "\"," + i + ")'>Remover</button></div></div>";
        });
    }

    var al = document.getElementById("aut-lista");
    al.innerHTML = "";
    var auts = a.autorizacoes || [];
    if (!auts.length) { al.innerHTML = "<p style='color:#8a8a8a;text-align:center;padding:12px'>Nenhuma autorização.</p>"; }
    else {
        auts.forEach(function(au, i) {
            al.innerHTML += "<div class='item-registro'><div><strong>" + au.descricao + "</strong><br><small style='color:#8a8a8a'>" + au.data + "</small></div><div style='display:flex;flex-direction:column;align-items:flex-end;gap:4px'>" + (au.foto ? "<div style='width:40px;height:40px;border-radius:4px;background:url(" + au.foto + ") center/cover;border:1px solid #ba0f14'></div>" : "") + "<button class='btn btn-vermelho' style='padding:2px 6px;font-size:10px;width:auto' onclick='excluirAut(\"" + id + "\"," + i + ")'>Remover</button></div></div>";
        });
    }
}

function salvarCamp() {
    var id   = document.getElementById("camp-atleta").value;
    var nome = (document.getElementById("camp-nome").value || "").trim();
    var data = document.getElementById("camp-data").value;
    var loc  = (document.getElementById("camp-local").value || "").trim();
    var res  = document.getElementById("camp-resultado").value;
    if (!id)   { alert("Selecione o atleta."); return; }
    if (!nome) { alert("Informe o nome do campeonato."); return; }
    var a = DB.alunos.find(function(x) { return x.id === id; });
    if (!a) return;
    if (!a.campeonatos) a.campeonatos = [];
    a.campeonatos.push({ id: String(Date.now()), nome: nome, data: data, local: loc, resultado: res });
    log("Admin [" + currentUser.nivel + "]", "Campeonato", a.nome + " — " + nome + ": " + res);
    document.getElementById("camp-nome").value = "";
    document.getElementById("camp-data").value = "";
    document.getElementById("camp-local").value = "";
    alert("✅ Campeonato registrado!");
    carregarAtleta();
}

function excluirCamp(idAluno, idx) {
    if (!confirm("Remover campeonato?")) return;
    var a = DB.alunos.find(function(x) { return x.id === idAluno; });
    if (a && a.campeonatos) { log("Admin", "Remoção Camp", a.nome + " — " + (a.campeonatos[idx]||{}).nome); a.campeonatos.splice(idx, 1); }
    carregarAtleta();
}

function salvarAut() {
    var id   = document.getElementById("camp-atleta").value;
    var desc = (document.getElementById("aut-desc").value || "").trim();
    var prev = document.getElementById("aut-preview");
    var foto = prev.dataset.foto || "";
    if (!id)   { alert("Selecione o atleta."); return; }
    if (!desc) { alert("Descreva o documento."); return; }
    var a = DB.alunos.find(function(x) { return x.id === id; });
    if (!a) return;
    if (!a.autorizacoes) a.autorizacoes = [];
    a.autorizacoes.push({ id: String(Date.now()), descricao: desc, data: new Date().toLocaleDateString("pt-BR"), foto: foto });
    log("Admin [" + currentUser.nivel + "]", "Autorização", "\"" + desc + "\" adicionado para " + a.nome);
    document.getElementById("aut-desc").value = "";
    prev.style.backgroundImage = "none"; prev.textContent = "Doc"; delete prev.dataset.foto;
    alert("✅ Autorização registrada!");
    carregarAtleta();
}

function excluirAut(idAluno, idx) {
    if (!confirm("Remover autorização?")) return;
    var a = DB.alunos.find(function(x) { return x.id === idAluno; });
    if (a && a.autorizacoes) { log("Admin", "Remoção Aut", a.nome + " — " + (a.autorizacoes[idx]||{}).descricao); a.autorizacoes.splice(idx, 1); }
    carregarAtleta();
}

// ============================================================
// CONFIGURAÇÕES
// ============================================================
function renderConfig() {
    document.getElementById("conf-comercial").value  = DB.precos.Comercial;
    document.getElementById("conf-atleta").value     = DB.precos.Atleta;
    document.getElementById("conf-particular").value = DB.precos.Particular;
    document.getElementById("conf-instrutor").value  = DB.precos.Instrutor;

    var sel = document.getElementById("conf-ct-sel");
    sel.innerHTML = "<option value=''>Selecione</option>";
    DB.cts.forEach(function(c) { sel.innerHTML += "<option value='" + c.id + "'>" + c.nome + "</option>"; });

    var tl = document.getElementById("timeline-auditoria");
    tl.innerHTML = "";
    DB.logs.forEach(function(l) {
        tl.innerHTML += "<div class='timeline-item'><div class='meta'>" + l.data + " | <strong>" + l.autor + "</strong></div><div class='acao' style='color:#ba0f14;font-weight:bold;font-size:11px;text-transform:uppercase'>" + l.acao + "</div><div style='color:#fff;margin-top:2px;font-size:12px'>" + l.detalhe + "</div></div>";
    });
}

function carregarPrecoCT() {
    var id = document.getElementById("conf-ct-sel").value;
    if (!id) return;
    var ct = DB.cts.find(function(c) { return c.id === id; });
    if (ct) document.getElementById("conf-ct-valor").value = ct.mensalidade || 0;
}

function salvarPrecoCT() {
    var id = document.getElementById("conf-ct-sel").value;
    var v  = parseFloat(document.getElementById("conf-ct-valor").value) || 0;
    if (!id) { alert("Selecione um CT."); return; }
    var ct = DB.cts.find(function(c) { return c.id === id; });
    if (ct) { ct.mensalidade = v; log("Admin [" + currentUser.nivel + "]", "Preço CT", ct.nome + " → " + fmt(v)); alert("✅ Preço de " + ct.nome + " atualizado!"); renderConfig(); }
}

function salvarPrecos() {
    DB.precos.Comercial  = parseFloat(document.getElementById("conf-comercial").value) || 0;
    DB.precos.Atleta     = parseFloat(document.getElementById("conf-atleta").value) || 0;
    DB.precos.Particular = parseFloat(document.getElementById("conf-particular").value) || 0;
    DB.precos.Instrutor  = parseFloat(document.getElementById("conf-instrutor").value) || 0;
    log("Admin [" + currentUser.nivel + "]", "Preços Globais", "Tabela de preços atualizada.");
    alert("✅ Preços atualizados!");
    renderConfig();
}

// ============================================================
// INICIALIZAÇÃO — BIND DE TODOS OS EVENTOS
// ============================================================
document.addEventListener("DOMContentLoaded", function() {

    // Login
    document.getElementById("btn-login").addEventListener("click", executarLogin);
    document.getElementById("login-senha").addEventListener("keydown", function(e) { if (e.key === "Enter") executarLogin(); });
    document.getElementById("toggle-senha").addEventListener("click", function() {
        var inp = document.getElementById("login-senha");
        inp.type = inp.type === "password" ? "text" : "password";
    });

    // Recuperação de senha
    document.getElementById("link-esqueceu").addEventListener("click", function() { ir(2); });
    document.getElementById("link-voltar-login").addEventListener("click", function() { ir(1); });
    document.getElementById("btn-recuperar").addEventListener("click", executarRecuperacao);

    // Sair
    document.getElementById("btn-sair").addEventListener("click", function() { currentUser = null; ir(1); });
    document.getElementById("btn-sair-aluno").addEventListener("click", function() { currentUser = null; ir(1); });

    // Navegação por data-nav
    document.querySelectorAll("[data-nav]").forEach(function(el) {
        el.addEventListener("click", function() { ir(parseInt(el.dataset.nav)); });
    });

    // Cards do painel
    document.querySelectorAll(".card-premium[data-nav]").forEach(function(el) {
        el.addEventListener("click", function() { ir(parseInt(el.dataset.nav)); });
    });

    // Footer
    document.querySelector(".btn-footer").addEventListener("click", function() { ir(9); });

    // Modal
    document.getElementById("btn-modal-fechar").addEventListener("click", fecharModal);
    document.getElementById("btn-modal-copiar").addEventListener("click", copiarModal);

    // Foto aluno cadastro
    document.getElementById("aluno-foto-preview").addEventListener("click", function() { document.getElementById("foto-upload").click(); });
    bindFoto("foto-upload", "aluno-foto-preview");

    // Foto edição
    document.getElementById("edit-foto-preview").addEventListener("click", function() { document.getElementById("edit-foto-file").click(); });
    bindFoto("edit-foto-file", "edit-foto-preview");

    // Documento do aluno — câmera e arquivo
    document.getElementById("btn-cad-doc-camera").addEventListener("click", function() {
        abrirCamera("cad-doc-video", "cad-doc-camera-div");
    });
    document.getElementById("btn-cad-doc-arquivo").addEventListener("click", function() {
        document.getElementById("cad-doc-arquivo").click();
    });
    bindFoto("cad-doc-arquivo", "cad-doc-preview");
    document.getElementById("btn-cad-doc-capturar").addEventListener("click", function() {
        capturarFoto("cad-doc-video", "cad-doc-preview", "cad-doc-camera-div");
    });

    // Autorização — câmera e arquivo
    document.getElementById("btn-aut-camera").addEventListener("click", function() {
        abrirCamera("aut-video", "aut-camera-div");
    });
    document.getElementById("btn-aut-arquivo").addEventListener("click", function() {
        document.getElementById("aut-arquivo-input").click();
    });
    bindFoto("aut-arquivo-input", "aut-preview");
    document.getElementById("btn-aut-capturar").addEventListener("click", function() {
        capturarFoto("aut-video", "aut-preview", "aut-camera-div");
    });

    // Cadastro aluno
    document.getElementById("btn-salvar-aluno").addEventListener("click", salvarAluno);

    // Cadastro CT
    document.getElementById("btn-salvar-ct").addEventListener("click", salvarCT);

    // Dashboard não tem botão adicional — cobrarEmail e cobrarMensagem chamados inline

    // Equipe
    document.getElementById("btn-salvar-adm").addEventListener("click", salvarAdmin);

    // Presença
    document.getElementById("btn-camera-qr").addEventListener("click", ativarCamera);
    document.getElementById("btn-checkin").addEventListener("click", function() {
        var id = document.getElementById("presenca-aluno").value;
        if (id) registrarEntrada(id);
    });

    // Busca registros
    document.getElementById("busca-reativa").addEventListener("input", renderRegistros);

    // Edição
    document.getElementById("btn-salvar-edicao").addEventListener("click", salvarEdicao);

    // Relatórios
    document.getElementById("btn-filtrar-rel").addEventListener("click", renderRelatorio);
    document.getElementById("btn-exportar-rel").addEventListener("click", exportarRelatorio);
    document.getElementById("rep-perfil").addEventListener("change", renderRelatorio);
    document.getElementById("rep-modalidade").addEventListener("change", renderRelatorio);

    // Campeonatos
    document.getElementById("btn-salvar-camp").addEventListener("click", salvarCamp);
    document.getElementById("btn-salvar-aut").addEventListener("click", salvarAut);

    // Configurações
    document.getElementById("btn-salvar-precos").addEventListener("click", salvarPrecos);
    document.getElementById("btn-salvar-preco-ct").addEventListener("click", salvarPrecoCT);

    // Uppercase graduação
    document.getElementById("cad-graduacao").addEventListener("input", function() { this.value = this.value.toUpperCase(); });
    document.getElementById("edit-graduacao").addEventListener("input", function() { this.value = this.value.toUpperCase(); });

    console.log("✅ Ogro Team v4.0 iniciado.");
});
