require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Create a single supabase client for interacting with your database
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const express = require('express');
const path = require('path');

const app = express();
const port = 3000;

// Configura o EJS como motor de visualização
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware para analisar o corpo das requisições
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

function gerarHorariosDisponiveis(horarioInicioDia, horarioFimDia, duracaoSessao, horariosOcupados, dia, horarioIntervalo = null) {
    // Obter o horário atual
    const today = new Date();
    const dataAtual = today.toISOString().split('T')[0];

    const horarioAtualAgora = new Date();
    const horarioAtualStr = `${String(horarioAtualAgora.getHours()).padStart(2, "0")}:${String(horarioAtualAgora.getMinutes()).padStart(2, "0")}`;

    // Converter horas e minutos da duração da sessão para minutos totais
    const [hours, minutes] = duracaoSessao.split(":");
    const duracaoEmMinutos = parseInt(hours) * 60 + parseInt(minutes);

    // Verificar se existe um intervalo de almoço
    let inicioIntervalo = null;
    let fimIntervalo = null;
    if (horarioIntervalo) {
        inicioIntervalo = horarioIntervalo[0];
        fimIntervalo = horarioIntervalo[1];
    }
    let horariosDisponiveis = [];
    let horariosDisponiveisCompletos = [];
    let horarioAtual = horarioInicioDia;

    // Função auxiliar para adicionar minutos a um horário no formato HH:mm
    function adicionarMinutos(horario, minutos) {
        let [h, m] = horario.split(":").map(Number);
        m += minutos;
        h += Math.floor(m / 60);
        m = m % 60;
        h = h % 24; // Evitar ultrapassar 24 horas
        return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }

    // Percorrer os horários de acordo com o intervalo definido
    while (horarioAtual < horarioFimDia) {

        let horarioFim = adicionarMinutos(horarioAtual, duracaoEmMinutos);

        // Verificar se o horário atual é antes da hora atual (do sistema)
        if ((horarioAtual >= horarioAtualStr) || (dia > dataAtual)) {
            // Verificar se o horário atual está nos horários ocupados ou no intervalo de almoço (se existir)
            const estaNoIntervaloDeAlmoco = horarioIntervalo && (horarioAtual >= inicioIntervalo && horarioAtual < fimIntervalo);
            if (!horariosOcupados.includes(horarioAtual) && !estaNoIntervaloDeAlmoco) {
                horariosDisponiveis.push(`${horarioAtual}`)
                horariosDisponiveisCompletos.push(`${horarioAtual} até ${horarioFim}`);
            }
        }

        // Avançar o horário atual para o próximo intervalo
        horarioAtual = adicionarMinutos(horarioAtual, duracaoEmMinutos);
    }
    //Horários completos está em horariosDisponiveisCompletos
    //Horários somente inicio está em horariosDisponiveis
    return horariosDisponiveis;
}

function diaSemana(dia) {
    const data = new Date(dia);
    const diasDaSemana = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'];
    return diasDaSemana[data.getDay()];
}

// Rota para a página inicial
app.get('/:barbearia/:barbeiro', async (req, res) => {
    const [barbearia, barbeiro] = [req.params.barbearia, req.params.barbeiro];
    let perfil;
    try {
        const { data, error } = await supabase
            .from('Perfis')
            .select('*')
            .eq('nickname', barbeiro);
        if (error) return res.status(500).json({ error: 'Erro interno ao buscar perfil' });
        perfil = data[0];
    } catch (error) {
        res.status(500).send('Erro externo ao buscar o perfil');
    }

    try {
        const { data, error } = await supabase
            .from('Servicos')
            .select('*')
            .eq('idPerfil', perfil.idPerfil);
        if (error) return res.status(500).json({ error: 'Erro ao buscar serviços 1' });

        function formatTimeDuration(time) {
            const [hours, minutes, seconds] = time.split(':').map(Number);

            if (hours > 0 && minutes > 0) {
                return `${hours} hora${hours > 1 ? 's' : ''} e ${minutes} minuto${minutes > 1 ? 's' : ''}`;
            } else if (hours > 0) {
                return `${hours} hora${hours > 1 ? 's' : ''}`;
            } else {
                return `${minutes} minuto${minutes > 1 ? 's' : ''}`;
            }
        }

        const formattedResults = data.map(service => ({
            ...service,
            tempo: formatTimeDuration(service.tempo_real)
        }));

        res.render('index', { barbearia: barbearia, barbeiro: barbeiro, perfil: perfil, servicos: formattedResults });

    } catch (error) {
        return res.status(500).json({ error: 'Erro nos Serviços' });
    }
});

app.get('/:barbearia/:barbeiro/data', async (req, res) => {
    res.render('data');
});

app.post('/horarios-disponiveis', async (req, res) => {
    const { dia, barbeiro, barbearia } = req.body;
    let idPerfil, semanaBarbeiro;

    // Busca o usuário
    try {
        const { data, error } = await supabase
            .from('Perfis')
            .select('idPerfil')
            .eq('nickname', barbeiro);
        if (error) return res.status(500).json({ error: 'Erro interno ao buscar perfil' });
        idPerfil = data[0]['idPerfil'];
    } catch (error) {
        res.status(500).send('Erro externo ao buscar o perfil');
    }

    // Busca a configuração da semana do barbeiro
    try {
        const { data: semana, error: semanaError } = await supabase
            .from('Dias_Semana')
            .select('*')
            .eq('idPerfil', idPerfil);
        if (semanaError) return res.status(500).json({ error: 'Erro interno ao buscar semana' });
        semanaBarbeiro = semana[0];
    } catch (error) {
        res.status(500).send('Erro externo ao buscar semana');
    }

    // Se o dia escolhido for um dia do estabelecimento estar fechado
    if (!semanaBarbeiro[diaSemana(dia)]) {
        return res.json([]);
    }

    // Buscar horários ocupados
    try {
        const { data, error } = await supabase
            .from('Horarios')
            .select('horaInicio')
            .eq('idPerfil', idPerfil)
            .eq('dia', dia)
        if (error) {
            return res.status(500).json({ error: 'Erro ao buscar horários ocupados' });
        }
        const horariosOcupados = data.map(item => item.horaInicio.slice(0, 5));
        const horarioInicioDia = semanaBarbeiro['horaAbertura'].slice(0, 5);
        const horarioFimDia = semanaBarbeiro['horaFechamento'].slice(0, 5);
        const duracaoSessao = semanaBarbeiro['intervaloServicos'].slice(0, 5);
        let horariosDisponiveis;
        if (semanaBarbeiro['almocoInicio'] && semanaBarbeiro['almocoFim']) {
            const horarioIntervalo = [semanaBarbeiro['almocoInicio'].slice(0, 5), semanaBarbeiro['almocoFim'].slice(0, 5)];
            horariosDisponiveis = gerarHorariosDisponiveis(horarioInicioDia, horarioFimDia, duracaoSessao, horariosOcupados, dia, horarioIntervalo)
        } else {
            horariosDisponiveis = gerarHorariosDisponiveis(horarioInicioDia, horarioFimDia, duracaoSessao, horariosOcupados, dia)
        }

        res.json(horariosDisponiveis);

    } catch (error) {
        res.status(500).json({ error: 'Erro ao processar a solicitação' });
    }
});

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}/barbearia/jeffadas`);
});
