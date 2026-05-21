const DB = {

    cts: [],

    alunos: [],

    avisos: []

};

let currentUser = null;

function irPara(id){

    document.querySelectorAll('.page').forEach(p=>{
        p.classList.remove('active');
    });

    document.getElementById('p'+id).classList.add('active');

}


document.querySelectorAll('[data-nav]').forEach(btn=>{

    btn.addEventListener('click',()=>{

        irPara(btn.dataset.nav);

    });

});

function login(){

    irPara(3);

}

function salvarCT(){

    DB.cts.push({
        id: Date.now().toString(),
        nome: document.getElementById('ct-nome').value,
        responsavel: document.getElementById('ct-responsavel').value,
        instrutor: document.getElementById('ct-instrutor').value,
        mensalidade: document.getElementById('ct-mensalidade').value
    });

    atualizarSelects();

    alert('CT cadastrado');

}

function salvarAluno(){

    DB.alunos.push({

        id: Date.now().toString(),
        nome: document.getElementById('cad-nome').value,
        email: document.getElementById('cad-email').value,
        ctId: document.getElementById('cad-ct').value,
        perfil: document.getElementById('cad-perfil').value,
        status: document.getElementById('cad-status').value,
        motivoSuspensao: document.getElementById('motivo-suspensao').value,
        mural: []

    });

    alert('Aluno salvo');

}

function atualizarSelects(){

    let html = '<option value="">Selecione</option>';

    DB.cts.forEach(ct=>{

        html += `<option value="${ct.id}">${ct.nome}</option>`;

    });

    document.getElementById('cad-ct').innerHTML = html;
    document.getElementById('pag-ct').innerHTML = html;
    document.getElementById('conf-ct').innerHTML = html;
    document.getElementById('aviso-ct').innerHTML = html;

}

function atualizarAlunosPagamento(){

    let ctId = document.getElementById('pag-ct').value;

    let alunos = DB.alunos.filter(a=>a.ctId===ctId);

    let html = '';

    alunos.forEach(a=>{

        html += `<option value="${a.id}">${a.nome}</option>`;

    });

    document.getElementById('pag-aluno').innerHTML = html;

}

function registrarPagamento(){

    alert('Pagamento registrado');

}

function alterarMensalidade(){

    let ct = document.getElementById('conf-ct').value;

    let perfil = document.getElementById('conf-perfil').value;

    let valor = document.getElementById('conf-valor').value;

    enviarAvisoAlteracaoMensalidade(ct,perfil,valor);

    alert('Mensalidade atualizada');

}

function enviarAvisoAlteracaoMensalidade(ctId,perfil,valor){

    DB.alunos.forEach(aluno=>{

        if(aluno.ctId===ctId && aluno.perfil===perfil){

            aluno.mural.unshift({
                titulo:'Mensalidade Atualizada',
                texto:'Novo valor R$ '+valor,
                data:new Date().toLocaleString()
            });

        }

    });

}

function enviarAvisoGeral(){

    let ctId = document.getElementById('aviso-ct').value;

    let titulo = document.getElementById('aviso-titulo').value;

    let texto = document.getElementById('aviso-texto').value;

    DB.alunos.forEach(aluno=>{

        if(aluno.ctId===ctId){

            aluno.mural.unshift({
                titulo,
                texto,
                data:new Date().toLocaleString()
            });

        }

    });

    alert('Aviso enviado');

}

function validarSuspensao(){

    let status = document.getElementById('cad-status').value;

    if(status==='Suspenso'){

        document.getElementById('motivo-suspensao-box').style.display='block';

    }else{

        document.getElementById('motivo-suspensao-box').style.display='none';

    }

}


document.getElementById('cad-status').addEventListener('change',validarSuspensao);
