require('dotenv').config();
const { startServer } = require('./server');

startServer().catch(error => {
	console.error(JSON.stringify({ event: 'server_startup_error', message: error.message }));
	process.exitCode = 1;
});