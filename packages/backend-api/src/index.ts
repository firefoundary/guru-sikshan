import express from 'express';
import cors from 'cors';
import teacherRoutes from './teacher-routes.js';
import dashboardRoutes from './dashboard-routes.js';

const app = express();

// ✅ FIXED: Explicitly allow your Frontend ports
app.use(cors({
  origin: [
    'http://localhost:8080',      // Teacher App (localhost)
    'http://127.0.0.1:8080',      // Teacher App (IPv4)
    'http://localhost:5173',      // Dashboard (Vite default)
    'http://127.0.0.1:5173'       // Dashboard (IPv4)
  ],
  credentials: true,              // Allow cookies/auth headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount routes
app.use('/api/teacher', teacherRoutes);
app.use('/api/dashboard', dashboardRoutes);

const PORT = parseInt(process.env.PORT || '3000', 10);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend running on port ${PORT}`);
  console.log(`Local: http://localhost:${PORT}`);
  console.log(`Network: http://0.0.0.0:${PORT}`);
  console.log('\nAvailable routes:');
  console.log('  Teacher App: /api/teacher/*');
  console.log('  Dashboard: /api/dashboard/*');
});