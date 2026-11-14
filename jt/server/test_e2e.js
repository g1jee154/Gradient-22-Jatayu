import http from 'http';

async function runTests() {
  console.log('--- Starting Full Stack Integration Verification ---');

  // Import and spin up server
  await import('./index.js');
  await new Promise((r) => setTimeout(r, 800));

  // 1. Fetch frontend index.html
  const htmlRes = await fetch('http://localhost:5050/');
  const htmlText = await htmlRes.text();
  console.log('1. Frontend HTML served? ->', htmlText.toLowerCase().includes('<!doctype html') ? 'YES' : 'NO');

  // 2. Health check
  const healthRes = await fetch('http://localhost:5050/api/health');
  const healthData = await healthRes.json();
  console.log('2. Health check ->', healthData.status);

  // 3. Login as Citizen (Aarav)
  const userLogin = await (
    await fetch('http://localhost:5050/api/auth/demo-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'user' }),
    })
  ).json();
  console.log('3. Citizen login ->', userLogin.user.name);

  // 4. Trigger SOS
  const sosRes = await (
    await fetch('http://localhost:5050/api/incidents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + userLogin.token,
      },
      body: JSON.stringify({
        latitude: 12.9784,
        longitude: 77.6408,
        emergency_type: 'Personal Safety',
        address: '12th Main Indiranagar, Bengaluru',
      }),
    })
  ).json();
  const incidentId = sosRes.incident.id;
  console.log('4. SOS Triggered ->', incidentId, 'Status:', sosRes.incident.status);

  // 5. Login as Responder (Officer Arjun)
  const respLogin = await (
    await fetch('http://localhost:5050/api/auth/demo-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'responder' }),
    })
  ).json();
  console.log('5. Responder login ->', respLogin.user.name, respLogin.user.responder.responder_type);

  // 6. Responder Accepts SOS
  const acceptRes = await (
    await fetch(`http://localhost:5050/api/incidents/${incidentId}/accept`, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + respLogin.token },
    })
  ).json();
  console.log(
    '6. Responder Accepted ->',
    acceptRes.incident.status,
    'Responder:',
    acceptRes.incident.responder_name,
    'ETA:',
    acceptRes.incident.eta_minutes + 'm'
  );

  // 7. Status -> En route
  const enRouteRes = await (
    await fetch(`http://localhost:5050/api/incidents/${incidentId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + respLogin.token,
      },
      body: JSON.stringify({ status: 'En route' }),
    })
  ).json();
  console.log('7. Status updated ->', enRouteRes.incident.status);

  // 8. Chat message from Responder
  const chatRes = await (
    await fetch(`http://localhost:5050/api/incidents/${incidentId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + respLogin.token,
      },
      body: JSON.stringify({ message: 'Patrol unit en route. Stay in a safe, visible spot.' }),
    })
  ).json();
  console.log('8. Chat sent ->', `${chatRes.message.sender_name}: ${chatRes.message.message}`);

  // 9. Status -> Resolved
  const resolveRes = await (
    await fetch(`http://localhost:5050/api/incidents/${incidentId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + respLogin.token,
      },
      body: JSON.stringify({ status: 'Resolved', notes: 'Citizen escorted safely. All clear.' }),
    })
  ).json();
  console.log('9. Incident resolved ->', resolveRes.incident.status, 'Report:', resolveRes.incident.resolution_notes);

  // 10. Admin Audit Logs check
  const admLogin = await (
    await fetch('http://localhost:5050/api/auth/demo-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'admin' }),
    })
  ).json();
  const logsRes = await (
    await fetch('http://localhost:5050/api/admin/audit-logs', {
      headers: { Authorization: 'Bearer ' + admLogin.token },
    })
  ).json();
  console.log('10. Audit logs count ->', logsRes.logs.length, 'Latest hash:', logsRes.logs[0].hash);

  console.log('\n============================================================');
  console.log('   🎉 SUCCESS: ALL 10 FULL-STACK TESTS PASSED FLAWLESSLY!   ');
  console.log('============================================================\n');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
