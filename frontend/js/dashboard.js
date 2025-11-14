// ================================
// 🌐 SOCKET.IO LIVE STATS
// ================================
const socket = io();

// DOM elements
const uptimeEl = document.getElementById('uptime');
const rpsEl = document.getElementById('rps');
const clientsEl = document.getElementById('clients');
const mongoEl = document.getElementById('mongo');
const cpuEl = document.getElementById('cpu');
const memEl = document.getElementById('mem');
const loadEl = document.getElementById('load');
const alertEl = document.getElementById('alert');

// Chart data
const labels = [];
const uptimeData = [];
const rpsData = [];
const clientsData = [];
const cpuData = [];
const memData = [];

// Chart helpers
const createGradient = (ctx, color) => {
    const grad = ctx.createLinearGradient(0,0,0,200);
    grad.addColorStop(0, color + 'aa');
    grad.addColorStop(1, color + '22');
    return grad;
};

const createChart = (ctx, label, color, dataArray) => {
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label,
                data: dataArray,
                borderColor: color,
                backgroundColor: createGradient(ctx, color),
                fill: true,
                tension: 0.3,
                pointRadius: 0
            }]
        },
        options: {
            animation: { duration: 500 },
            responsive: true,
            scales: { y: { beginAtZero: true }},
            plugins: { legend: { display: true }}
        }
    });
};

// Initialize charts
const uptimeChart = createChart(document.getElementById('uptimeChart'), 'Uptime', '#38bdf8', uptimeData);
const rpsChart = createChart(document.getElementById('rpsChart'), 'RPS', '#22c55e', rpsData);
const clientsChart = createChart(document.getElementById('clientsChart'), 'Clients', '#f59e0b', clientsData);
const cpuChart = createChart(document.getElementById('cpuChart'), 'CPU %', '#f97316', cpuData);
const memChart = createChart(document.getElementById('memChart'), 'Memory %', '#e11d48', memData);

// Update stats from socket
socket.on('stats', data => {
    uptimeEl.innerText = Math.floor(data.uptime) + 's';
    rpsEl.innerText = data.rps;
    clientsEl.innerText = data.clients;
    mongoEl.innerHTML = data.mongo ? '<span class="green">Connected</span>' : '<span class="red">Disconnected</span>';
    cpuEl.innerText = data.cpu.toFixed(1) + '%';
    memEl.innerText = data.mem.toFixed(1) + '%';
    loadEl.innerText = data.load.toFixed(2);

    // Alerts
    if(!data.mongo || data.rps > 50 || data.cpu > 70 || data.mem > 80){
        alertEl.style.display = 'block';
        alertEl.innerText = !data.mongo ? 'MongoDB disconnected!' :
                            data.rps > 50 ? 'High RPS!' :
                            data.cpu > 70 ? 'High CPU!' : 'High Memory!';
    } else alertEl.style.display = 'none';

    // Chart updates
    const time = new Date().toLocaleTimeString();
    labels.push(time); if(labels.length > 60) labels.shift();
    uptimeData.push(Math.floor(data.uptime)); if(uptimeData.length > 60) uptimeData.shift();
    rpsData.push(data.rps); if(rpsData.length > 60) rpsData.shift();
    clientsData.push(data.clients); if(clientsData.length > 60) clientsData.shift();
    cpuData.push(data.cpu); if(cpuData.length > 60) cpuData.shift();
    memData.push(data.mem); if(memData.length > 60) memData.shift();

    uptimeChart.update(); rpsChart.update(); clientsChart.update(); cpuChart.update(); memChart.update();
});

// ================================
// 🌐 TABLE FETCHING & API
// ================================
const apiBase = '/api';

async function fetchData(endpoint){
    try{
        const res = await fetch(`${apiBase}/${endpoint}`);
        if(!res.ok) throw new Error('Failed to fetch');
        return await res.json();
    }catch(err){
        console.error(err);
        return [];
    }
}

// Populate tables
async function populateTables(){
    const users = await fetchData('users');
    const usersTbody = document.querySelector('#usersTable tbody');
    usersTbody.innerHTML = '';
    users.forEach(u => {
        usersTbody.innerHTML += `
        <tr>
            <td>${u._id}</td>
            <td>${u.firstName} ${u.lastName}</td>
            <td>${u.email}</td>
            <td>${u.role}</td>
            <td>
                <button class="btn gradient-btn" onclick="editUser('${u._id}')">Edit</button>
                <button class="btn cancel-btn" onclick="deleteUser('${u._id}')">Delete</button>
            </td>
        </tr>`;
    });

    const courses = await fetchData('courses');
    const coursesTbody = document.querySelector('#coursesTable tbody');
    coursesTbody.innerHTML = '';
    courses.forEach(c => {
        coursesTbody.innerHTML += `
        <tr>
            <td>${c._id}</td>
            <td>${c.title}</td>
            <td>${c.category}</td>
            <td>
                <button class="btn gradient-btn" onclick="editCourse('${c._id}')">Edit</button>
                <button class="btn cancel-btn" onclick="deleteCourse('${c._id}')">Delete</button>
            </td>
        </tr>`;
    });

    const services = await fetchData('services');
    const servicesTbody = document.querySelector('#servicesTable tbody');
    servicesTbody.innerHTML = '';
    services.forEach(s => {
        servicesTbody.innerHTML += `
        <tr>
            <td>${s._id}</td>
            <td>${s.title}</td>
            <td>${s.description}</td>
            <td>
                <button class="btn gradient-btn" onclick="editService('${s._id}')">Edit</button>
                <button class="btn cancel-btn" onclick="deleteService('${s._id}')">Delete</button>
            </td>
        </tr>`;
    });

    const consultations = await fetchData('consultations');
    const consultsTbody = document.querySelector('#consultationsTable tbody');
    consultsTbody.innerHTML = '';
    consultations.forEach(c => {
        consultsTbody.innerHTML += `
        <tr>
            <td>${c._id}</td>
            <td>${c.userName}</td>
            <td>${c.consultantName}</td>
            <td>${new Date(c.date).toLocaleString()}</td>
            <td>${c.status}</td>
            <td>
                <button class="btn gradient-btn" onclick="editConsultation('${c._id}')">Edit</button>
                <button class="btn cancel-btn" onclick="deleteConsultation('${c._id}')">Delete</button>
            </td>
        </tr>`;
    });

    const partners = await fetchData('partners');
    const partnersTbody = document.querySelector('#partnersTable tbody');
    partnersTbody.innerHTML = '';
    partners.forEach(p => {
        partnersTbody.innerHTML += `
        <tr>
            <td>${p._id}</td>
            <td>${p.name}</td>
            <td>${p.website}</td>
            <td>
                <button class="btn gradient-btn" onclick="editPartner('${p._id}')">Edit</button>
                <button class="btn cancel-btn" onclick="deletePartner('${p._id}')">Delete</button>
            </td>
        </tr>`;
    });
}

// Initial load
populateTables();

// ================================
// 🌐 MODAL FUNCTIONS
// ================================
const modalOverlay = document.getElementById('modalOverlay');
const modalTitle = document.getElementById('modalTitle');
const modalContent = document.getElementById('modalContent');

function openModal(title, content){
    modalTitle.innerText = title;
    modalContent.innerHTML = content;
    modalOverlay.classList.remove('hidden');
}
function closeModal(){
    modalOverlay.classList.add('hidden');
}
function submitModal(){
    // Custom save function per modal type
    console.log('Modal submitted');
    closeModal();
}

// ================================
// 🌐 DARK MODE TOGGLE
// ================================
function toggleDarkMode(){
    if(document.body.classList.contains('dark')){
        document.body.classList.remove('dark');
    }else{
        document.body.classList.add('dark');
    }
}

// ================================
// 🌐 CRUD PLACEHOLDERS (implement with fetch API calls)
// ================================
function editUser(id){ openModal('Edit User', `<p>Edit user ${id} here</p>`); }
function deleteUser(id){ console.log('Delete user', id); }
function editCourse(id){ openModal('Edit Course', `<p>Edit course ${id} here</p>`); }
function deleteCourse(id){ console.log('Delete course', id); }
function editService(id){ openModal('Edit Service', `<p>Edit service ${id} here</p>`); }
function deleteService(id){ console.log('Delete service', id); }
function editConsultation(id){ openModal('Edit Consultation', `<p>Edit consultation ${id} here</p>`); }
function deleteConsultation(id){ console.log('Delete consultation', id); }
function editPartner(id){ openModal('Edit Partner', `<p>Edit partner ${id} here</p>`); }
function deletePartner(id){ console.log('Delete partner', id); }
