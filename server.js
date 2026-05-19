import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 8081;

// Serve static files from test-pages
app.use(express.static('test-pages'));

// SPA fallback - serve index.html for any route
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'test-pages', 'Pulse', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/Pulse/`);
});
