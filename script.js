'use strict';

const DB = {
  alunos: [
    {
      id: '1',
      nome: 'João Silva',
      ctId: 'ct1',
      status: 'Em dia',
      campeonatos: [
        {
          nome: 'Copa Rio',
          data: '2026-05-10',
          local: 'Rio de Janeiro',
          resultado: 'Vitória'
        }
      ]
    }
  ],

  pagamentos: [],

  cts: [
    {
      id: 'ct1',
      nome: 'OGRO TEAM Matriz',
      mensalidade: 150
    }
  ],

  logs: [],

  precos: {
    Comercial: 150,
    Atleta: 120,
    Particular: 200,
    Instrutor: 90,
    Bolsista: 0
  },

  precosPorCT: {}
};

const currentUser = {
  nome: 'Admin',
  nivel: 'Master'
};

function $(id) {
  return document.getElementById(id);
}

function formatarData(data) {
  return new Date(data).toLocaleDateString('pt-BR');
}

function mostrarModal(titulo, msg) {
  alert(`${titulo}\n\n${msg}`);
}

function log(autor, acao, detalhe) {

  DB.logs.unshift({
    autor,
    acao,
    detalhe,
    data: new Date().toLocaleString('pt-BR')
  });

  renderConfig();
}

function getCTNome(id) {

  const ct = DB.cts.find(c => c.id === id);

  return ct ? ct.nome : 'CT';
}

function popularCTs(selectId) {

  const select = $(selectId);

  if (!select) return;

  select.innerHTML = '<option value="">Selecione o CT</option>';

  DB.cts.forEach(ct => {

    select.innerHTML += `
      <option value="${ct.id}">
        ${ct.nome}
      </option>
    `;
  });
}

function renderConfig() {

  $('conf-comercial').value = DB.precos.Comercial;
  $('conf-atleta').value = DB.precos.Atleta;
  $('conf-particular').value = DB.precos.Particular;
  $('conf-instrutor').value = DB.precos.Instrutor;
  $('conf-bolsista').value = DB.precos.Bolsista;

  popularCTs('conf-ct-sel');

  const tl = $('timeline-auditoria');

  tl.innerHTML = '';

  DB.logs.forEach(l => {

    tl.innerHTML += `
      <div class="timeline-item">
        <div class="meta">
          ${l.data} | ${l.autor}
        </div>

        <strong>${l.acao}</strong>

        <div>${l.detalhe}</div>
      </div>
    `;
  });
}

function carregarPrecoCT() {

  const id = $('conf-ct-sel').value;

  if (!id) return;

  const ct = DB.cts.find(c => c.id === id);

  const precosCT = DB.precosPorCT[id] || {};

  $('conf-ct-comercial').value = precosCT.Comercial || ct.mensalidade;
  $('conf-ct-atleta').value = precosCT.Atleta || '';
  $('conf-ct-particular').value = precosCT.Particular || '';
  $('conf-ct-instrutor').value = precosCT.Instrutor || '';
  $('conf-ct-bolsista').value = precosCT.Bolsista || '';
}

function salvarPrecoCT() {

  const id = $('conf-ct-sel').value;

  if (!id) {
    mostrarModal('ATENÇÃO', 'Selecione um CT');
    return;
  }

  DB.precosPorCT[id] = {
    Comercial: parseFloat($('conf-ct-comercial').value) || 0,
    Atleta: parseFloat($('conf-ct-atleta').value) || 0,
    Particular: parseFloat($('conf-ct-particular').value) || 0,
    Instrutor: parseFloat($('conf-ct-instrutor').value) || 0,
    Bolsista: parseFloat($('conf-ct-bolsista').value) || 0
  };

  log('Admin', 'Preço CT', 'Preços atualizados');

  mostrarModal('SUCESSO', 'Preços salvos');
}

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
}

window.carregarAtleta = function() {

  const id = $('camp-atleta').value;

  const al = DB.alunos.find(a => a.id === id);

  const lista = $('camp-lista');

  lista.innerHTML = '';

  if (!al) return;

  al.campeonatos.forEach(c => {

    lista.innerHTML += `
      <div class="item-registro">
        <div>
          <strong>${c.nome}</strong>
          <br>
          <small>${formatarData(c.data)}</small>
        </div>

        <span class="badge">
          ${c.resultado}
        </span>
      </div>
    `;
  });
}

function renderPagamentos() {

  const lista = $('pag-lista');

  lista.innerHTML = '';

  const filtro = $('pag-filtro-nome').value.toLowerCase();

  const pagamentos = DB.pagamentos.filter(p => {

    const aluno = DB.alunos.find(a => a.id === p.alunoId);

    return aluno.nome.toLowerCase().includes(filtro);
  });

  let total = 0;

  pagamentos.forEach(p => total += p.valor);

  $('pag-total-filtro').textContent = `R$ ${total.toFixed(2)}`;
  $('pag-total-geral').textContent = `R$ ${total.toFixed(2)}`;
  $('pag-count').textContent = pagamentos.length;

  pagamentos.forEach(p => {

    const aluno = DB.alunos.find(a => a.id === p.alunoId);

    lista.innerHTML += `
      <div class="item-registro">
        <div>
          <strong>${aluno.nome}</strong>
          <br>
          <small>${formatarData(p.data)}</small>
        </div>

        <div>
          R$ ${p.valor.toFixed(2)}
        </div>
      </div>
    `;
  });
}

window.abrirFormPagamento = function(metodo) {

  $('pag-metodo').value = metodo;

  $('form-novo-pagamento').style.display = 'block';

  popularCTs('pag-ct-sel');

  const sel = $('pag-aluno-sel');

  sel.innerHTML = '<option value="">Selecione o aluno</option>';

  DB.alunos.forEach(a => {

    sel.innerHTML += `
      <option value="${a.id}">
        ${a.nome}
      </option>
    `;
  });
}

function registrarPagamento() {

  const alunoId = $('pag-aluno-sel').value;
  const valor = parseFloat($('pag-valor').value);
  const metodo = $('pag-metodo').value;

  if (!alunoId || !valor) {
    mostrarModal('ATENÇÃO', 'Preencha os dados');
    return;
  }

  DB.pagamentos.unshift({
    id: Date.now().toString(),
    alunoId,
    valor,
    metodo,
    data: new Date().toISOString().split('T')[0]
  });

  log('Admin', 'Pagamento', `R$ ${valor.toFixed(2)}`);

  $('form-novo-pagamento').style.display = 'none';

  $('pag-valor').value = '';

  renderPagamentos();

  mostrarModal('SUCESSO', 'Pagamento registrado');
}

document.addEventListener('DOMContentLoaded', () => {

  renderConfig();
  renderCampeonatos();
  renderPagamentos();

  log('Sistema', 'Inicialização', 'Sistema carregado');
});
