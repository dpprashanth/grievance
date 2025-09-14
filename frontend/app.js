// Logout button functionality for all roles
function logout() {
    currentUser = null;
    document.getElementById('l1-ui').style.display = 'none';
    document.getElementById('l2-ui').style.display = 'none';
    document.getElementById('l3-ui').style.display = 'none';
    document.getElementById('login-ui').style.display = 'block';
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    document.getElementById('login-error').style.display = 'none';
        clearInterval(l2Interval); clearInterval(l3Interval);
}
document.getElementById('logout-btn').onclick = logout;
document.getElementById('logout-btn-l2').onclick = logout;
document.getElementById('logout-btn-l3').onclick = logout;

let currentUser = null;

let l1Interval = null;
let l2Interval = null;
let l3Interval = null;
document.getElementById('login-form').onsubmit = async function(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const res = await fetch('http://localhost:8000/login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({username, password})
    });
    if (res.ok) {
        currentUser = await res.json();
        document.getElementById('login-ui').style.display = 'none';
        if (currentUser.hierarchy === 'L1') {
            document.getElementById('l1-ui').style.display = 'block';
            document.getElementById('submitter').value = currentUser.id;
            loadL1Grievances();
            clearInterval(l1Interval); clearInterval(l2Interval); clearInterval(l3Interval);
            l1Interval = setInterval(loadL1Grievances, 5000);
        } else if (currentUser.hierarchy === 'L2') {
            document.getElementById('l2-ui').style.display = 'block';
            setupL2Filter();
            loadL2Grievances();
            clearInterval(l1Interval); clearInterval(l2Interval); clearInterval(l3Interval);
            l2Interval = setInterval(loadL2Grievances, 5000);
        } else if (currentUser.hierarchy === 'L3') {
            document.getElementById('l3-ui').style.display = 'block';
            setupL3Filter();
            loadL3Grievances();
            clearInterval(l1Interval); clearInterval(l2Interval); clearInterval(l3Interval);
            l3Interval = setInterval(loadL3Grievances, 5000);
        }
    } else {
        document.getElementById('login-error').style.display = 'block';
        document.getElementById('login-error').innerText = 'Invalid username or password.';
    }
};

document.getElementById('grievance-form').onsubmit = async function(e) {
    e.preventDefault();
    if (!currentUser || currentUser.hierarchy !== 'L1') {
        document.getElementById('l1-result').innerText = 'Access denied. Only L1 employees can submit grievances.';
        return;
    }
    const description = document.getElementById('description').value;
    const submitter = currentUser.id;
    const res = await fetch('http://localhost:8000/grievance', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({description, submitter_id: submitter})
    });
    const data = await res.json();
    document.getElementById('l1-result').innerText = data.message || 'Grievance submitted!';
    await loadL1Grievances();
};


async function loadL1Grievances() {
    const res = await fetch(`http://localhost:8000/grievances/l1/${currentUser.id}`);
    const grievances = await res.json();
    const table = document.createElement('table');
    table.className = 'table table-bordered';
    table.innerHTML = `<thead><tr><th>Summary</th><th>Date & Time</th><th>Status</th></tr></thead><tbody></tbody>`;
    grievances.forEach(g => {
        const row = document.createElement('tr');
        let status = g.status;
        // Escalate if older than 2 days and not acknowledged
        if (status === 'Open') {
            const created = new Date(g.created_at);
            if (!isNaN(created.getTime())) {
                const now = new Date();
                if ((now - created) / (1000 * 60 * 60 * 24) > 2) status = 'Escalated';
            }
        }
        row.innerHTML = `<td>${g.summary}</td><td>${g.created_at}</td><td>${status}</td>`;
        table.querySelector('tbody').appendChild(row);
    });
    document.getElementById('l1-grievances-table').innerHTML = '';
    document.getElementById('l1-grievances-table').appendChild(table);
}

function setupL2Filter() {
    document.getElementById('l2-filter-all').onclick = () => loadL2Grievances();
    document.getElementById('l2-filter-ack').onclick = () => loadL2Grievances();
}

async function loadL2Grievances() {
    let show_ack = null;
    let url = 'http://localhost:8000/grievances/all';
    if (document.getElementById('l2-filter-ack').checked) {
        show_ack = true;
        url = `http://localhost:8000/grievances/all?acknowledged_by=${currentUser.id}`;
    }
    const res = await fetch(url);
    const grievances = await res.json();
    const table = document.createElement('table');
    table.className = 'table table-bordered';
    table.innerHTML = `<thead><tr><th>Summary</th><th>Date & Time</th><th>Status</th><th>Action</th></tr></thead><tbody></tbody>`;
    grievances.forEach(g => {
        const row = document.createElement('tr');
        let status = g.status;
        // Escalate if older than 2 days and not acknowledged
    if (status === 'Submitted') {
            const created = new Date(g.created_at);
            if (!isNaN(created.getTime())) {
                const now = new Date();
                if ((now - created) / (1000 * 60 * 60 * 24) > 2) status = 'Escalated';
            }
        }
        row.innerHTML = `<td>${g.summary}</td><td>${g.created_at}</td><td>${status}</td>`;
        if (status === 'Submitted') {
            const btn = document.createElement('button');
            btn.className = 'btn btn-primary btn-sm';
            btn.innerText = 'Acknowledge';
            btn.onclick = () => acknowledgeGrievance(g.id);
            const td = document.createElement('td');
            td.appendChild(btn);
            row.appendChild(td);
        } else {
            row.innerHTML += '<td></td>';
        }
        table.querySelector('tbody').appendChild(row);
    });
    document.getElementById('l2-grievances-table').innerHTML = '';
    document.getElementById('l2-grievances-table').appendChild(table);
}

function setupL3Filter() {
    // No filter buttons for L3 page
}

async function loadL3Grievances() {
    // Fetch both escalated and acknowledged grievances for L3
        // Fetch all grievances and filter client-side
        const res = await fetch('http://localhost:8000/grievances/all');
        const allGrievancesRaw = await res.json();
        const uniqueGrievances = allGrievancesRaw.filter(g => {
            return g.status === 'Escalated' || (g.status && g.status.startsWith('Acknowledged') && g.acknowledged_by === currentUser.name);
        });
    const container = document.getElementById('l3-grievances-table');
    if (!container) return;
    container.innerHTML = '';
    const filterDiv = document.querySelector('#l3-ui .mb-2');
    if (!uniqueGrievances || uniqueGrievances.length === 0) {
        if (filterDiv) filterDiv.style.display = 'none';
        const msg = document.createElement('div');
        msg.className = 'alert alert-info';
        msg.innerText = 'No escalated or acknowledged grievances';
        container.appendChild(msg);
        return;
    } else {
        if (filterDiv) filterDiv.style.display = '';
    }
    const table = document.createElement('table');
    table.className = 'table table-bordered';
    table.innerHTML = `<thead><tr><th>Summary</th><th>Date & Time</th><th>Status</th><th>Action</th></tr></thead><tbody></tbody>`;
    uniqueGrievances.forEach(g => {
        const row = document.createElement('tr');
        row.innerHTML = `<td>${g.summary || g.description}</td><td>${g.created_at || ''}</td><td>${g.status || 'Escalated'}</td>`;
        // Show acknowledge button only for escalated grievances
        if ((g.status === 'Escalated' || g.status === 'Escalated') && (!g.acknowledged_by || g.acknowledged_by === null)) {
            const td = document.createElement('td');
            const btn = document.createElement('button');
            btn.className = 'btn btn-primary btn-sm';
            btn.innerText = 'Acknowledge';
            btn.onclick = () => acknowledgeGrievanceL3(g.id);
            td.appendChild(btn);
            row.appendChild(td);
        } else {
            row.innerHTML += '<td></td>';
        }
        table.querySelector('tbody').appendChild(row);
    });
    container.appendChild(table);
}

// Only one acknowledgeGrievance function, using currentUser.id
async function acknowledgeGrievance(id) {
    if (!currentUser || currentUser.hierarchy !== 'L2') {
        alert('Access denied. Only L2 employees can acknowledge grievances.');
        return;
    }
    const l2_id = currentUser.id;
    const res = await fetch(`http://localhost:8000/grievance/${id}/acknowledge`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({l2_id})
    });
    const data = await res.json();
    alert(data.message);
    loadL2Grievances();
}

async function loadL3Grievances() {
    const res = await fetch('http://localhost:8000/grievances/l3');
    const grievances = await res.json();
    const container = document.getElementById('l3-grievances-table');
    if (!container) return;
    container.innerHTML = '';
    const filterDiv = document.querySelector('#l3-ui .mb-2');
    if (!grievances || grievances.length === 0) {
        if (filterDiv) filterDiv.style.display = 'none';
        const msg = document.createElement('div');
        msg.className = 'alert alert-info';
        msg.innerText = 'No escalated grievances';
        container.appendChild(msg);
        return;
    } else {
        if (filterDiv) filterDiv.style.display = '';
    }
    const table = document.createElement('table');
    table.className = 'table table-bordered';
    table.innerHTML = `<thead><tr><th>Summary</th><th>Date & Time</th><th>Status</th></tr></thead><tbody></tbody>`;
    grievances.forEach(g => {
        const row = document.createElement('tr');
        row.innerHTML = `<td>${g.summary || g.description}</td><td>${g.created_at || ''}</td><td>${g.status || 'Escalated'}</td>`;
        // Add acknowledge button for L3 only if status is 'Escalated'
        if (g.status === 'Escalated' && (!g.acknowledged_by || g.acknowledged_by === null)) {
            const td = document.createElement('td');
            const btn = document.createElement('button');
            btn.className = 'btn btn-primary btn-sm';
            btn.innerText = 'Acknowledge';
            btn.onclick = () => acknowledgeGrievanceL3(g.id);
            td.appendChild(btn);
            row.appendChild(td);
        } else {
            row.innerHTML += '<td></td>';
        }
        table.querySelector('tbody').appendChild(row);
    });
    container.appendChild(table);

// L3 acknowledge function
async function acknowledgeGrievanceL3(id) {
    if (!currentUser || currentUser.hierarchy !== 'L3') {
        alert('Access denied. Only L3 employees can acknowledge grievances.');
        return;
    }
    const l3_id = currentUser.id;
    const res = await fetch(`http://localhost:8000/grievance/${id}/acknowledge`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({l2_id: l3_id})
    });
    const data = await res.json();
    alert(data.message);
    loadL3Grievances();
}
}
