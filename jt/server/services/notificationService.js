import { addAuditLog } from '../db.js';

// Clean phone number format (removes dashes, spaces)
export function sanitizePhone(phone) {
  if (!phone) return '';
  let cleaned = phone.replace(/[^\d+]/g, '');
  if (!cleaned.startsWith('+')) {
    if (cleaned.length === 10) cleaned = '+91' + cleaned; // default India
    else cleaned = '+' + cleaned;
  }
  return cleaned;
}

export async function dispatchRealEmergencyAlert({ user, incident, contacts, baseUrl = 'http://localhost:5050' }) {
  const trackingUrl = `${baseUrl}/incident/${incident.id}`;
  const coordinatesStr = `${incident.latitude?.toFixed(4)}, ${incident.longitude?.toFixed(4)}`;

  const messageText = `🚨 EMERGENCY ALERT from ${user.name} (${user.phone || 'No phone'}): ${incident.emergency_type} at ${incident.address || 'Unknown address'} (GPS: ${coordinatesStr}). Live Tracker: ${trackingUrl}`;

  console.log(`[ALERT DISPATCH] Initiating emergency broadcast for Incident ${incident.id}...`);

  const results = [];

  for (const contact of contacts) {
    const targetPhone = sanitizePhone(contact.phone);
    let gatewaySent = false;
    let gatewayError = null;

    // 1. Try Twilio if credentials configured in environment
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
      try {
        const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
        const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            To: targetPhone,
            From: process.env.TWILIO_PHONE_NUMBER,
            Body: messageText
          })
        });
        const twilioData = await res.json();
        if (res.ok) {
          gatewaySent = true;
          console.log(`[TWILIO] Real SMS delivered to ${targetPhone} (SID: ${twilioData.sid})`);
        } else {
          gatewayError = twilioData.message;
        }
      } catch (err) {
        gatewayError = err.message;
      }
    }

    // 2. Try Fast2SMS (Indian SMS Gateway) if configured
    if (!gatewaySent && process.env.FAST2SMS_API_KEY) {
      try {
        const rawPhone = targetPhone.replace('+91', '').replace('+', '');
        const res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
          method: 'POST',
          headers: {
            'authorization': process.env.FAST2SMS_API_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            route: 'q',
            message: messageText,
            language: 'english',
            flash: 0,
            numbers: rawPhone
          })
        });
        const data = await res.json();
        if (data.return) {
          gatewaySent = true;
          console.log(`[FAST2SMS] Real SMS sent to ${rawPhone}`);
        }
      } catch (err) {
        gatewayError = err.message;
      }
    }

    // 3. Try Generic Webhook if configured
    if (!gatewaySent && process.env.SMS_WEBHOOK_URL) {
      try {
        const res = await fetch(process.env.SMS_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: targetPhone, message: messageText, incidentId: incident.id })
        });
        if (res.ok) gatewaySent = true;
      } catch (e) {}
    }

    // 4. Generate direct mobile carrier dispatch deep-links (1-tap native SMS & WhatsApp)
    const nativeSmsLink = `sms:${targetPhone}?&body=${encodeURIComponent(messageText)}`;
    const whatsAppLink = `https://api.whatsapp.com/send?phone=${targetPhone.replace('+', '')}&text=${encodeURIComponent(messageText)}`;

    results.push({
      contactId: contact.id,
      name: contact.name,
      phone: targetPhone,
      relationship: contact.relationship,
      status: gatewaySent ? 'Delivered via SMS Gateway' : 'Ready for 1-Tap Carrier / WhatsApp Dispatch',
      gatewaySent,
      gatewayError,
      messageText,
      nativeSmsLink,
      whatsAppLink
    });

    addAuditLog(
      user.email,
      `Emergency notification to ${contact.name} (${targetPhone})`,
      gatewaySent ? 'Carrier Gateway SMS Sent' : `Carrier deep-link ready: ${targetPhone}`
    );
  }

  return {
    totalContacts: contacts.length,
    messageText,
    results
  };
}
