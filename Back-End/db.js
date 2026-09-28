
const mysql = require("mysql2/promise");
require("dotenv").config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "cafecentral",

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function testarConexao() {
    let conexao;

    try {
        conexao = await pool.getConnection();
        await conexao.ping();

        console.log("Conexão com o MySQL realizada com sucesso!");
        return true;
    } catch (erro) {
        console.error("Erro ao conectar ao MySQL:", erro.message);
        throw erro;
    } finally {
        if (conexao) {
            conexao.release();
        }
    }
}

module.exports = {
    pool,
    testarConexao
};