const express = require('express');
const mysql = require('mysql2');
const path = require('path');

const app = express();
const port = 3000;

// Configura o EJS como motor de visualização
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware para analisar o corpo das requisições
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Conexão com o banco de dados
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '6142',
    database: 'barbearia'
});

connection.connect((err) => {
    if (err) throw err;
    console.log('Conectado ao banco de dados MySQL');
});

// Rota para a página inicial
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Rota para a página de seleção de horário
app.get('/data', (req, res) => {
    connection.query('SELECT * FROM horarios', (err, results) => {
        if (err) throw err;
        res.render('data', { horarios: results });
    });
});

app.post('/horarios', (req, res) => {
    const { date } = req.body;

    // Supondo que você tenha uma função que busca os horários no banco de dados
    const query = 'SELECT id, DATE_FORMAT(hora, "%H:%i") AS hora FROM horarios WHERE dia = ? AND disponivel = 1';
    connection.query(query, [date], (error, results) => {
        if (error) {
            return res.status(500).json({ error: 'Erro ao buscar horários' });
        }
        res.json(results);
    });
});


// Rota para agendar
app.post('/agendar', (req, res) => {
    const horarioId = req.body.horarioId;

    // Atualiza o banco de dados para marcar o horário como ocupado
    connection.query('UPDATE horarios SET ocupado = TRUE WHERE id = ?', [horarioId], (err) => {
        if (err) throw err;
        res.send('Agendamento realizado com sucesso!');
    });
});

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
