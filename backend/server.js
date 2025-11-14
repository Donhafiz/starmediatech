'use strict';

const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const compression = require('compression');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const socketIo = require('socket.io');
const sanitizeHtml = require('sanitize-html');
const os = require('os');

dotenv.config();
const app = express();
app.disable('x-powered-by');

// ===============================
// 🛡️ SECURITY & PARSING
// ===============================
app.use(helmet({ crossOriginEmbedderPolicy: false }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());
const clientOrigins = (process.env.CLIENT_URL || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => { if (!origin) return cb(null, true); if (clientOrigins.includes(origin)) return cb(null, true); return cb(new Error('CORS blocked'), false); },
  credentials: true
}));
app.use(morgan('dev'));

// Serve frontend static files (static assets and pages)
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));


// Basic input sanitization
app.use((req, res, next) => {
  ['body', 'query', 'params'].forEach(key => {
    if (req[key]) {
      for (const field in req[key]) {
        if (typeof req[key][field] === 'string') {
          req[key][field] = sanitizeHtml(req[key][field], { allowedTags: [], allowedAttributes: {} });
        }
      }
    }
  });
  next();
});

// Rate Limiter
const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15*60*1000,
  max: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: { error: 'Too many requests' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api', limiter);

// ===============================
// 🌐 DATABASE
// ===============================
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/starmediatech';
let dbConnected = false;

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    dbConnected = true;
    console.log(`✅ MongoDB Connected: ${MONGODB_URI}`);
  } catch (err) {
    dbConnected = false;
    console.error('❌ MongoDB Connection Error:', err.message);
    process.exit(1);
  }
}

// ===============================
// 🔹 STATS TRACKING
// ===============================
let requestCount = 0;
let rps = 0;
let lastSecond = Date.now();

app.use((req, res, next) => {
  requestCount++;
  const now = Date.now();
  if (now - lastSecond > 1000) {
    rps = requestCount;
    requestCount = 0;
    lastSecond = now;
  }
  next();
});

// ===============================
// 🚦 ROUTES
// ===============================
app.get('/api', (req, res) => {
  res.json({ success: true, message: 'Star Media Tech API', available: ['/api/health', '/api/ready', '/api/auth', '/api/users', '/api/courses', '/api/consultations', '/api/services', '/api/admin'] });
});
app.get('/api/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));
app.get('/api/ready', (req, res) => res.json({ ready: true }));

// Serve frontend index and page files for non-API routes (SPA-friendly)
app.get(['/index.html', '/pages/*', '/css/*', '/js/*', '/images/*'], (req, res, next) => {
  const filePath = path.join(frontendPath, req.path.replace(/^\//, ''));
  res.sendFile(filePath, err => { if (err) next(); });
});

// ===============================
// 🌌 DASHBOARD
// ===============================
app.get('/', (req, res) => {
  const env = process.env.NODE_ENV || 'development';
  res.send(`
  <html>
  <head>
    <title>Star Media Tech Next-Gen Dashboard</title>
    <link rel="icon" href="https://img.icons8.com/ios-filled/50/2563eb/star.png"/>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="/socket.io/socket.io.js"></script>
    <style>
      body{font-family:'Segoe UI',sans-serif;margin:0;padding:20px;background:#0f172a;color:#f1f5f9;transition:all 0.3s;}
      h1{text-align:center;font-size:2.5rem;color:#38bdf8;margin-bottom:10px;}
      .card-container{display:flex;flex-wrap:wrap;justify-content:space-around;}
      .card{background:#1e293b;padding:20px;margin:10px;border-radius:15px;min-width:200px;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.5);}
      .metric{font-size:1.2rem;margin:5px 0;}
      .green{color:#22c55e;font-weight:bold;}
      .yellow{color:#facc15;font-weight:bold;}
      .red{color:#ef4444;font-weight:bold;}
      .alert-msg{display:none;background:#ef4444;color:white;padding:10px;margin:10px 0;border-radius:8px;text-align:center;animation:flash 1s infinite;}
      @keyframes flash{0%,100%{opacity:1;}50%{opacity:0.3;}}
      .chart-container{background:#1e293b;padding:20px;margin:20px 0;border-radius:16px;box-shadow:0 4px 20px rgba(0,0,0,0.5);}
      footer{text-align:center;margin-top:50px;color:#94a3b8;font-size:0.9rem;}
      .toggle-btn{cursor:pointer;padding:5px 15px;background:#38bdf8;border:none;color:white;border-radius:8px;position:fixed;top:20px;right:20px;}
    </style>
  </head>
  <body>
    <button class="toggle-btn" onclick="toggleDarkMode()">Toggle Dark/Light</button>
    <h1>🚀 Star Media Tech Next-Gen Dashboard</h1>
    <div class="alert-msg" id="alert"></div>

    <div class="card-container">
      <div class="card metric">MongoDB: <span id="mongo">${dbConnected?'<span class="green">Connected</span>':'<span class="red">Disconnected</span>'}</span></div>
      <div class="card metric">Uptime: <span id="uptime">0s</span></div>
      <div class="card metric">RPS: <span id="rps">0</span></div>
      <div class="card metric">Clients: <span id="clients">0</span></div>
      <div class="card metric">CPU Usage: <span id="cpu">0%</span></div>
      <div class="card metric">Memory Usage: <span id="mem">0%</span></div>
      <div class="card metric">Load Avg: <span id="load">0</span></div>
    </div>

    <div class="chart-container"><canvas id="uptimeChart"></canvas></div>
    <div class="chart-container"><canvas id="rpsChart"></canvas></div>
    <div class="chart-container"><canvas id="clientsChart"></canvas></div>
    <div class="chart-container"><canvas id="cpuChart"></canvas></div>
    <div class="chart-container"><canvas id="memChart"></canvas></div>

    <footer>© ${new Date().getFullYear()} Star Media Tech</footer>

    <script>
      const socket=io();
      const labels=[],uptimeData=[],rpsData=[],clientsData=[],cpuData=[],memData=[];
      const alertEl=document.getElementById('alert');

      const createGradient=(ctx,color)=>{
        const grad=ctx.createLinearGradient(0,0,0,200);
        grad.addColorStop(0,color+'aa');
        grad.addColorStop(1,color+'22');
        return grad;
      };

      const createChart=(ctx,label,color,dataArray)=>{
        return new Chart(ctx,{
          type:'line',
          data:{labels,datasets:[{label,data:dataArray,borderColor:color,backgroundColor:createGradient(ctx,color),fill:true,tension:0.3,pointRadius:0}]},
          options:{animation:{duration:500},responsive:true,scales:{y:{beginAtZero:true}},plugins:{legend:{display:true}}}
        });
      };

      const uptimeChart=createChart(document.getElementById('uptimeChart'),'Uptime','#38bdf8',uptimeData);
      const rpsChart=createChart(document.getElementById('rpsChart'),'RPS','#22c55e',rpsData);
      const clientsChart=createChart(document.getElementById('clientsChart'),'Clients','#f59e0b',clientsData);
      const cpuChart=createChart(document.getElementById('cpuChart'),'CPU %','#f97316',cpuData);
      const memChart=createChart(document.getElementById('memChart'),'Memory %','#e11d48',memData);

      socket.on('stats',data=>{
        document.getElementById('uptime').innerText=Math.floor(data.uptime)+'s';
        document.getElementById('rps').innerText=data.rps;
        document.getElementById('clients').innerText=data.clients;
        document.getElementById('mongo').innerHTML=data.mongo?'<span class="green">Connected</span>':'<span class="red">Disconnected</span>';
        document.getElementById('cpu').innerText=data.cpu.toFixed(1)+'%';
        document.getElementById('mem').innerText=data.mem.toFixed(1)+'%';
        document.getElementById('load').innerText=data.load.toFixed(2);

        if(!data.mongo || data.rps>50 || data.cpu>70 || data.mem>80){
          alertEl.style.display='block';
          alertEl.innerText=!data.mongo?'MongoDB disconnected!':data.rps>50?'High RPS!':data.cpu>70?'High CPU!':'High Memory!';
        } else alertEl.style.display='none';

        const time=new Date().toLocaleTimeString();
        labels.push(time); if(labels.length>60) labels.shift();
        uptimeData.push(Math.floor(data.uptime)); if(uptimeData.length>60) uptimeData.shift();
        rpsData.push(data.rps); if(rpsData.length>60) rpsData.shift();
        clientsData.push(data.clients); if(clientsData.length>60) clientsData.shift();
        cpuData.push(data.cpu); if(cpuData.length>60) cpuData.shift();
        memData.push(data.mem); if(memData.length>60) memData.shift();

        uptimeChart.update(); rpsChart.update(); clientsChart.update(); cpuChart.update(); memChart.update();
      });

      function toggleDarkMode(){
        if(document.body.style.background==='white'){
          document.body.style.background='#0f172a';
          document.body.style.color='#f1f5f9';
        }else{
          document.body.style.background='white';
          document.body.style.color='black';
        }
      }
    </script>
  </body>
  </html>
  `);
});

// ===============================
// ⚠️ ERROR HANDLING
// ===============================
app.use((req,res)=>res.status(404).json({success:false,message:'Route not found'}));
app.use((err,req,res,next)=>{ console.error('❌ Error:',err.message); res.status(500).json({success:false,message:'Server Error'}); });

// ===============================
// 🚀 SERVER
// ===============================
const PORT=process.env.PORT||5000;
const server=http.createServer(app);
const io=socketIo(server,{cors:{origin:'*'}});

let shuttingDown=false;
async function shutdown(reason){
  if(shuttingDown) return;
  shuttingDown=true;
  console.log(`\nShutting down due to: ${reason}`);
  try{
    await new Promise((resolve,reject)=>server.close(err=>err?reject(err):resolve()));
    console.log('HTTP server closed');
    await mongoose.connection.close(false);
    console.log('MongoDB connection closed');
    io.close();
    console.log('Socket.IO closed');
  }catch(err){console.error('Error during shutdown:',err);}
  finally{process.exit(0);}
}

process.on('uncaughtException',err=>shutdown(`uncaughtException: ${err.message}`));
process.on('unhandledRejection',err=>shutdown(`unhandledRejection: ${err}`));
process.on('SIGINT',()=>shutdown('SIGINT'));
process.on('SIGTERM',()=>shutdown('SIGTERM'));

// ===============================
// 🌐 SOCKET.IO STATS
// ===============================
let connectedClients=0;
io.on('connection',socket=>{
  connectedClients++;

  const interval=setInterval(()=>{
    const memUsage=process.memoryUsage().heapUsed/process.memoryUsage().heapTotal*100;
    const cpuLoad=os.loadavg()[0]/os.cpus().length*100;
    const uptime=process.uptime();
    socket.emit('stats',{uptime,rps,clients:connectedClients,mongo:dbConnected,cpu:cpuLoad,mem:memUsage,load:os.loadavg()[0]});
  },1000);

  socket.on('disconnect',()=>{ connectedClients--; clearInterval(interval); });
});

// ===============================
// 🌐 START SERVER
// ===============================
connectDB().then(()=>server.listen(PORT,()=>console.log(`🚀 Server running at http://localhost:${PORT}`)));
