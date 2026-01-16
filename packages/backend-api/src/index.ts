import express from 'express';
import cors from 'cors';
import pool from './db.js';
const app = express();
app.use(cors());
app.use(express.json());

app.get('/health' , (req,res) => {
    res.json({ status: 'ok'});
});

app.post('/api/feedback', (req, res) => {
    console.log('✅ FEEDBACK ROUTE HIT!');
    console.log('Data:', req.body);
    res.status(200).json({ success: true, message: 'Feedback received' });
  });

const PORT = parseInt(process.env.PORT || '3000', 10);
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend running on port ${PORT}`);
    console.log(`Local: http://localhost:${PORT}`);
    console.log(`Network: http://0.0.0.0:${PORT}`);
});