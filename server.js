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
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/servicos/:idPerfil', async (req, res) => {
    const { idPerfil } = req.params;
    try {
        const { data, error } = await supabase
            .from('Servicos')
            .select('*')
            .eq('idPerfil', idPerfil);

        if (error) {
            console.error('Erro ao buscar dados:', error);
            return res.status(500).json({ error: 'Erro ao buscar serviços' });
        }

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

        res.json(formattedResults);
    } catch (error) {
        console.error('Erro inesperado:', error.message);
        res.status(500).json({ error: 'Erro inesperado ao buscar dados' });
    }
});

// Rota para buscar dados do perfil no Supabase
app.get('/perfil/:idPerfil', async (req, res) => {
    const { idPerfil } = req.params;

    try {
        // Faz a consulta à tabela "Perfis" no Supabase
        const { data, error } = await supabase
            .from('Perfis')
            .select('*')
            .eq('idPerfil', idPerfil)
            .single();

        if (error) throw error;
        if (data) res.json(data);
        else res.status(404).send('Perfil não encontrado');


    } catch (error) {
        console.error('Erro ao buscar o perfil:', error.message);
        res.status(500).send('Erro ao buscar o perfil'); // Retorna erro genérico ao cliente
    }
});

app.get('/agendamentos', (req, res) => {
    res.render('agendamentos');
});


app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
