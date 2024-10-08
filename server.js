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


// Rota para a página inicial
app.get('/:barbearia/:barbeiro', async (req, res) => {
    const [barbearia, barbeiro] = [req.params.barbearia, req.params.barbeiro];
    let perfil;
    try {
        const { data, error } = await supabase
            .from('Perfis')
            .select('*')
            .eq('nickname', barbeiro);
        if (error) return res.status(500).json({ error: 'Erro ao buscar perfil' });
        perfil = data[0];
    } catch (error) {
        res.status(500).send('Erro ao buscar o perfil');
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
        return res.status(500).json({ error: 'Erro ao buscar serviços 2' });
    }
});

/*app.get('/:barbearia/:barbeiro/datas', async (req, res) => {
    const barbeiro = req.params.barbeiro;
    let idPerfil, defaultConfig;

    try {
        const { data, error } = await supabase
            .from('Perfis')
            .select('idPerfil')
            .eq('nickname', barbeiro);
        if (error) return res.status(500).json({ error: 'Erro ao buscar perfil' });
        idPerfil = data[0].idPerfil;
    } catch (error) {
        res.status(500).send('Erro ao buscar o perfil');
    }

    try {
        const { data, error } = await supabase
            .from('Padroes')
            .select('intervaloPadrao, horarioInicioPadrao, horarioFimPadrao')
            .eq('idPerfil', idPerfil);
        if (error) return res.status(500).json({ error: 'Erro ao buscar configurações padrões' });
        defaultConfig = data[0];
    } catch (error) {
        res.status(500).send('Erro ao buscar configurações padrões');
    }

    try {
        const hoje = new Date().toLocaleDateString('en-CA');
        console.log("hoje: ", hoje);
        const { data, error } = await supabase
            .from('Horarios')
            .select('horaInicio, horaFim, dia')
            .eq('idPerfil', idPerfil);
        if (error) return res.status(500).json({ error: 'Erro ao buscar horários' });
    } catch (error) {
        res.status(500).send('Erro ao buscar horários');
    }

    res.render('data');
});*/

app.get('/:barbearia/:barbeiro/datas', (req, res) => {
    res.render('data');
});

// Exemplo de rota para horários disponíveis
app.get('/horarios-disponiveis', async (req, res) => {
    // Definir o horário de abertura e fechamento
    const horarioAbertura = 9; // 9:00 AM
    const horarioFechamento = 18; // 6:00 PM
    const duracao = 30; // 30 minutos por corte
    let horariosDisponiveis = [];

    // Gerar os slots de horários
    for (let hora = horarioAbertura; hora < horarioFechamento; hora++) {
        horariosDisponiveis.push(`${hora}:00`);
        horariosDisponiveis.push(`${hora}:30`);
    }

    // Aqui você pode buscar do banco de dados os horários já ocupados e filtrá-los

    res.json(horariosDisponiveis);
});

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
