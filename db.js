const connection = {
    user: '',
    host: '',
    database: '',
    password: '',
    port: 5432,
    allowExitOnIdle: true
}

// const pool = new Pool(connection)

const pgp = require("pg-promise")()

const pool = pgp(connection)


module.exports = pool