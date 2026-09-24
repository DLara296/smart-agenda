const { createApp } = require('./app');

const PORT = process.env.PORT || 3030;
const { app } = createApp({ database: process.env.DATABASE_URL || ':memory:' });

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Smart Agenda API available at http://localhost:${PORT}/v1`);
});