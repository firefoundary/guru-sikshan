import express from 'express';
import cors from 'cors';
import teacherRoutes from './teacher-routes.js';
import dashboardRoutes from './dashboard-routes.js';
import adminRoutes from './admin-routes.js'; // ADD THIS

const app = express();

app.use(cors({
  origin: [
    'http://localhost:8080',
    'http://127.0.0.1:8080',
    'http://localhost:5173',
    'http://127.0.0.1:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/teacher', teacherRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes); 

const PORT = parseInt(process.env.PORT || '3000', 10);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend running on port ${PORT}`);
  console.log(`Local: http://localhost:${PORT}`);
  console.log(`Network: http://0.0.0.0:${PORT}`);
  console.log('\nAvailable routes:');
  console.log('  Teacher App: /api/teacher/*');
  console.log('  Dashboard: /api/dashboard/*');
  console.log('  Admin: /api/admin/*'); 
});
