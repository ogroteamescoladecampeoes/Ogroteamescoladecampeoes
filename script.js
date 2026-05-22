// ========================================================
// BANCO LOCAL
// ========================================================

const DB = {
    precos: {
        Comercial: 0,
        Atleta: 0,
        Particular: 0,
        Instrutor: 0,
        Bolsista: 0
    },

    precosPorCT: {},

    logs: [],

    pagamentos: [],

    alunos: [],

    cts: []
};


// ========================================================
// USUÁRIO LOGADO
// ========================================================

const currentUser = {
    nome: 'Administrador',
    nivel: 'Master'
};


// ========================================================
// HELPERS
// ========================================================

function $(id) {
    return document.getElementById(id);
}

function formatarData(data) {
    if (!data) return '-';

    const d = new Date(data + 'T00:00:00');

    return d.toLocaleDateString('pt-BR');
}

function getCTNome(id) {
    const ct = DB.cts.find(c => c.id === id);
    return ct ? ct.nome : 'CT não encontrado';
}

function log(autor, acao, detalhe) {
    DB.logs.unshift({
        data: new Date().toLocaleString('pt-BR'),
        autor,
        acao,
        detalhe
    });

    salvarLocal();
}

function salvarLocal() {
    localStorage.setItem('ogroteam_db', JSON.stringify(DB));
}

function carregarLocal() {
    const dados = localStorage.getItem('ogroteam_db');

    if (!dados) return;

    try {
        const parsed = JSON.parse(dados);
        Object.assign(DB, parsed);
    } catch (erro) {
        console.error('Erro ao carregar localStorage', erro);
    }
}


// ========================================================
// MODAL
// ========================================================

function mostrarModal(titulo, mensagem) {
    $('modal-title').textContent = titulo;
    $('modal-message').textContent = mensagem;

    $('modal').classList.remove('hidden');
}

function fecharModal() {
    $('modal').classList.add('hidden');
}

window.fecharModal = fecharModal;


// ========================================================
// POPULAR CTS
// ========================================================

function popularCTs(idSelect, incluirTodos = true) {

    const select = $(idSelect);

    if (!select) return;

    select.innerHTML = '';

    if (incluirTodos) {
        select.innerHTML += '<option value="">Todos</option>';
    }

    DB.cts.forEach(ct => {
        select.innerHTML += `
            <option value="${ct.id}">
                ${ct.nome}
            </option>
        `;
    });
}


// ========================================================
// CONFIGURAÇÕES
// ========================================================

function renderConfig() {

    $('conf-comercial').value = DB.precos.Comercial || 0;
    $('conf-atleta').value = DB.precos.Atleta || 0;
    $('conf-particular').value = DB.precos.Particular || 0;
    $('conf-instrutor').value = DB.precos.Instrutor || 0;
    $('conf-bolsista').value = DB.precos.Bolsista || 0;

    popularCTs('conf-ct-sel', false);

    const timeline = $('timeline-auditoria');

    if (!timeline) return;

    timeline.innerHTML = '';

    DB.logs.forEach(l => {

        const div = document.createElement('div');

        div.className = 'timeline-item';

        div.innerHTML = `
            <div class="meta">
                ${l.data} | <strong>${l.autor}</strong>
            </div>

            <div class="acao">
                ${l.acao}
            </div>

            <div class="detalhe">
                ${l.detalhe}
            </div>
        `;

        timeline.appendChild(div);
    });
}


// ========================================================
// CARREGAR PREÇO CT
// ========================================================

function carregarPrecoCT() {

    const id = $('conf-ct-sel').value;

    if (!id) return;

    const ct = DB.cts.find(c => c.id === id);

    const precos = DB.precosPorCT[id] || {};

    $('conf-ct-comercial').value = precos.Comercial ?? ct?.mensalidade ?? '';
    $('conf-ct-atleta').value = precos.Atleta ?? '';
    $('conf-ct-particular').value = precos.Particular ?? '';
    $('conf-ct-instrutor').value = precos.Instrutor ?? '';
    $('conf-ct-bolsista').value = precos.Bolsista ?? '';
}


// ========================================================
// SALVAR PREÇO CT
// ========================================================

function salvarPrecoCT() {

    const id = $('conf-ct-sel').value;

    if (!id) {
        mostrarModal('ATENÇÃO', 'Selecione um CT');
        return;
    }

    const ct = DB.cts.find(c => c.id === id);

    DB.precosPorCT[id] = {
        Comercial: parseFloat($('conf-ct-comercial').value) || 0,
        Atleta: parseFloat($('conf-ct-atleta').value) || 0,
        Particular: parseFloat($('conf-ct-particular').value) || 0,
        Instrutor: parseFloat($('conf-ct-instrutor').value) || 0,
        Bolsista: parseFloat($('conf-ct-bolsista').value) || 0
    };

    salvarLocal();

    log(
        `Admin [${currentUser.nivel}]`,
        'Preço CT',
        `${ct?.nome || id} atualizado`
    );

    mostrarModal(
        'SUCESSO',
        'Preços atualizados com sucesso'
    );
}

window.salvarPrecoCT = salvarPrecoCT;


// ========================================================
// CAMPEONATOS
// ========================================================

function renderCampeonatos() {

    const sel = $('camp-atleta');

    sel.innerHTML = '<option value="">Selecione o atleta</option>';

    DB.alunos.forEach(a => {
        sel.innerHTML += `
            <option value="${a.id}">
                ${a.nome}
            </option>
        `;
    });

    $('camp-lista').innerHTML = '';
    $('aut-lista').innerHTML = '';
}


function carregarAtleta() {

    const id = $('camp-atleta').value;

    const al = DB.alunos.find(a => a.id === id);

    const campLista = $('camp-lista');
    const autLista = $('aut-lista');

    campLista.innerHTML = '';
    autLista.innerHTML = '';

    if (!al) return;

    const camps = al.campeonatos || [];

    camps.forEach((c, i) => {

        const div = document.createElement('div');

        div.className = 'item-registro';

        div.innerHTML = `
            <div>
                <strong>${c.nome}</strong>
                <br>
                <small>
                    ${formatarData(c.data)}
                </small>
            </div>

            <button onclick="excluirCamp('${id}', ${i})">
                Remover
            </button>
        `;

        campLista.appendChild(div);
    });
}

window.carregarAtleta = carregarAtleta;


// ========================================================
// EXCLUIR CAMPEONATO
// ========================================================

function excluirCamp(idAluno, idx) {

    const aluno = DB.alunos.find(a => a.id === idAluno);

    if (!aluno) return;

    aluno.campeonatos.splice(idx, 1);

    salvarLocal();

    carregarAtleta();
}

window.excluirCamp = excluirCamp;


// ========================================================
// PAGAMENTOS
// ========================================================

function renderPagamentos() {

    const lista = $('pag-lista');

    lista.innerHTML = '';

    let total = 0;

    DB.pagamentos.forEach(p => {

        total += p.valor;

        const aluno = DB.alunos.find(a => a.id === p.alunoId);

        const div = document.createElement('div');

        div.className = 'item-registro';

        div.innerHTML = `
            <div>
                <strong>${aluno?.nome || 'Aluno'}</strong>
                <br>
                <small>${formatarData(p.data)}</small>
            </div>

            <div>
                R$ ${p.valor.toFixed(2)}
            </div>
        `;

        lista.appendChild(div);
    });

    $('pag-total-filtro').textContent = `R$ ${total.toFixed(2)}`;
    $('pag-total-geral').textContent = `R$ ${total.toFixed(2)}`;
    $('pag-count').textContent = DB.pagamentos.length;
}


// ========================================================
// ABRIR FORM PAGAMENTO
// ========================================================

function abrirFormPagamento(metodo) {

    $('pag-metodo').value = metodo;

    $('form-novo-pagamento').style.display = 'block';

    popularCTs('pag-ct-sel', false);

    const sel = $('pag-aluno-sel');

    sel.innerHTML = '<option value="">Selecione</option>';

    DB.alunos.forEach(a => {
        sel.innerHTML += `
            <option value="${a.id}">
                ${a.nome}
            </option>
        `;
    });
}

window.abrirFormPagamento = abrirFormPagamento;


// ========================================================
// REGISTRAR PAGAMENTO
// ========================================================

function registrarPagamento() {

    const alunoId = $('pag-aluno-sel').value;

    const valor = parseFloat($('pag-valor').value);

    const metodo = $('pag-metodo').value;

    const data = $('pag-data').value || new Date().toISOString().split('T')[0];

    if (!alunoId) {
        mostrarModal('ATENÇÃO', 'Selecione o aluno');
        return;
    }

    if (!valor || valor <= 0) {
        mostrarModal('ATENÇÃO', 'Informe um valor válido');
        return;
    }

    const aluno = DB.alunos.find(a => a.id === alunoId);

    DB.pagamentos.push({
        id: Date.now().toString(),
        alunoId,
        valor,
        metodo,
        data,
        ctId: aluno.ctId,
        status: 'Pago'
    });

    salvarLocal();

    renderPagamentos();

    mostrarModal(
        'SUCESSO',
        'Pagamento registrado'
    );
}

window.registrarPagamento = registrarPagamento;


// ========================================================
// CONTRATOS
// ========================================================

async function verificarVencimentosContratos() {

    const hoje = new Date();

    const avisos = [];

    DB.cts.forEach(ct => {

        if (!ct.contrato?.dataFim) return;

        const fim = new Date(ct.contrato.dataFim);

        const dias = Math.floor(
            (fim - hoje) / (1000 * 60 * 60 * 24)
        );

        if (dias <= 30 && dias >= 0) {
            avisos.push(
                `Contrato ${ct.nome} vence em ${dias} dia(s)`
            );
        }

        if (dias < 0) {
            avisos.push(
                `Contrato ${ct.nome} vencido`
            );
        }
    });

    if (avisos.length === 0) return;

    mostrarModal(
        'AVISOS',
        avisos.join('\n\n')
    );

    if (!window.firebaseDB) return;

    const { db, collection, addDoc } = window.firebaseDB;

    for (const aviso of avisos) {

        try {
            await addDoc(
                collection(db, 'avisos'),
                {
                    mensagem: aviso,
                    criadoEm: new Date()
                }
            );
        }
        catch (erro) {
            console.error(erro);
        }
    }
}


// ========================================================
// FOTO
// ========================================================

function lerFoto(event, previewId) {

    const file = event.target.files[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {

        const el = $(previewId);

        el.style.backgroundImage = `url(${reader.result})`;

        el.dataset.foto = reader.result;

        el.textContent = '';
    };

    reader.readAsDataURL(file);
}


function resetPreview(id, texto) {

    const el = $(id);

    el.style.backgroundImage = 'none';

    el.textContent = texto;

    delete el.dataset.foto;
}


function pararStream(stream) {

    if (!stream) return;

    stream.getTracks().forEach(track => track.stop());
}


function abrirCameraStream(videoId, callback) {

    navigator.mediaDevices
        .getUserMedia({ video: true })
        .then(stream => {

            callback(stream);

            const video = $(videoId);

            video.srcObject = stream;

            video.play();
        })
        .catch(() => {
            mostrarModal(
                'ERRO',
                'Câmera indisponível'
            );
        });
}


function capturarFoto(videoId, previewId) {

    const video = $(videoId);

    const canvas = document.createElement('canvas');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');

    ctx.drawImage(video, 0, 0);

    const foto = canvas.toDataURL('image/jpeg', 0.8);

    const preview = $(previewId);

    preview.style.backgroundImage = `url(${foto})`;

    preview.dataset.foto = foto;

    preview.textContent = '';
}


// ========================================================
// EVENTOS
// ========================================================

document.addEventListener('DOMContentLoaded', () => {

    carregarLocal();

    renderConfig();

    renderCampeonatos();

    renderPagamentos();

    verificarVencimentosContratos();

    $('conf-ct-sel')?.addEventListener(
        'change',
        carregarPrecoCT
    );

    $('camp-atleta')?.addEventListener(
        'change',
        carregarAtleta
    );
});
