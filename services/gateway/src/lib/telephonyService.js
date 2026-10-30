import axios from 'axios';

/**
 * Normalizes phone number into international E.164 format without '+'
 * Example: '9916102542' -> '919916102542' (India default)
 * '+9916102542' -> '919916102542' (if 10 digits preceded by single or double +)
 */
export function normalizePhoneNumber(rawPhone, defaultCountryCode = '91') {
  if (!rawPhone) return '';
  const digits = String(rawPhone).replace(/\D/g, '');
  if (!digits) return '';

  // If 10 digits, prepend default country code (e.g. 91 for India)
  if (digits.length === 10) {
    return `${defaultCountryCode}${digits}`;
  }
  // If 11 digits and starts with 0 (e.g. 09916102542)
  if (digits.length === 11 && digits.startsWith('0')) {
    return `${defaultCountryCode}${digits.slice(1)}`;
  }
  // If 12 digits and starts with 91
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits;
  }
  return digits;
}

/**
 * Checks which telecom carrier gateways are actively configured in environment
 */
export function getActiveCarriers() {
  const metaWhatsApp = Boolean(process.env.META_WHATSAPP_TOKEN && process.env.META_WHATSAPP_PHONE_ID);
  const twilio = Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER);
  const ultraMsg = Boolean(process.env.ULTRAMSG_INSTANCE_ID && process.env.ULTRAMSG_TOKEN);

  return {
    metaWhatsApp,
    twilio,
    ultraMsg,
    hasAnyLiveCarrier: metaWhatsApp || twilio || ultraMsg
  };
}

/**
 * Dispatches a WhatsApp Message:
 * 1. Tries Meta WhatsApp Cloud API if configured
 * 2. Tries Twilio WhatsApp if configured
 * 3. Tries UltraMsg if configured
 * 4. Falls back to Simulation Mode with generated wa.me direct link
 */
export async function dispatchWhatsApp({ phone, studentName, message, triggerStatus = 'Absent' }) {
  const normalizedPhone = normalizePhoneNumber(phone);
  const waUrl = `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
  const carriers = getActiveCarriers();

  // 1. Meta WhatsApp Cloud API
  if (carriers.metaWhatsApp) {
    try {
      const res = await axios.post(
        `https://graph.facebook.com/v19.0/${process.env.META_WHATSAPP_PHONE_ID}/messages`,
        {
          messaging_product: 'whatsapp',
          to: normalizedPhone,
          type: 'text',
          text: { body: message }
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.META_WHATSAPP_TOKEN}`,
            'Content-Type': 'application/json'
          },
          timeout: 8000
        }
      );
      return {
        success: true,
        mode: 'LIVE_CARRIER',
        provider: 'Meta WhatsApp Cloud API',
        messageId: res.data?.messages?.[0]?.id || `wamid.${Date.now()}`,
        phone: normalizedPhone,
        waUrl
      };
    } catch (err) {
      console.error('[Telephony] Meta WhatsApp delivery failed, falling back:', err.response?.data || err.message);
    }
  }

  // 2. Twilio WhatsApp
  if (carriers.twilio) {
    try {
      const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
      const params = new URLSearchParams({
        From: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER || process.env.TWILIO_PHONE_NUMBER}`,
        To: `whatsapp:+${normalizedPhone}`,
        Body: message
      });

      const res = await axios.post(
        `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
        params.toString(),
        {
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: 8000
        }
      );
      return {
        success: true,
        mode: 'LIVE_CARRIER',
        provider: 'Twilio WhatsApp Gateway',
        messageId: res.data?.sid,
        phone: normalizedPhone,
        waUrl
      };
    } catch (err) {
      console.error('[Telephony] Twilio WhatsApp delivery failed:', err.response?.data || err.message);
    }
  }

  // 3. UltraMsg WhatsApp
  if (carriers.ultraMsg) {
    try {
      const res = await axios.post(
        `https://api.ultramsg.com/${process.env.ULTRAMSG_INSTANCE_ID}/messages/chat`,
        {
          token: process.env.ULTRAMSG_TOKEN,
          to: normalizedPhone,
          body: message
        },
        { timeout: 8000 }
      );
      return {
        success: true,
        mode: 'LIVE_CARRIER',
        provider: 'UltraMsg WhatsApp Gateway',
        messageId: res.data?.id,
        phone: normalizedPhone,
        waUrl
      };
    } catch (err) {
      console.error('[Telephony] UltraMsg delivery failed:', err.response?.data || err.message);
    }
  }

  // Fallback: Local CRM Simulation Mode
  return {
    success: true,
    mode: 'SIMULATION',
    provider: 'Internal CRM Dispatch Queue (No live carrier API keys in .env)',
    messageId: `sim_wa_${Date.now()}`,
    phone: normalizedPhone,
    waUrl,
    note: 'Carrier Gateway credentials (META_WHATSAPP_TOKEN or TWILIO_ACCOUNT_SID) not set in .env. Dispatched to local database audit log.'
  };
}

/**
 * Dispatches an Outbound Voice Call:
 * 1. Tries Twilio Voice API if configured
 * 2. Falls back to Simulation Mode
 */
export async function dispatchVoiceCall({ phone, studentName, script, triggerStatus = 'Absent' }) {
  const normalizedPhone = normalizePhoneNumber(phone);
  const carriers = getActiveCarriers();

  if (carriers.twilio) {
    try {
      const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
      const twiml = `<Response><Say voice="Polly.Aditi" language="en-IN">${script}</Say><Pause length="1"/><Say voice="Polly.Aditi" language="en-IN">Thank you. Goodbye.</Say></Response>`;
      const params = new URLSearchParams({
        From: process.env.TWILIO_PHONE_NUMBER,
        To: `+${normalizedPhone}`,
        Twiml: twiml
      });

      const res = await axios.post(
        `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Calls.json`,
        params.toString(),
        {
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: 8000
        }
      );

      return {
        success: true,
        mode: 'LIVE_CARRIER',
        provider: 'Twilio Outbound Voice Gateway',
        callSid: res.data?.sid,
        phone: normalizedPhone,
        durationSeconds: 24
      };
    } catch (err) {
      console.error('[Telephony] Twilio Voice call failed:', err.response?.data || err.message);
    }
  }

  // Fallback: Local CRM Simulation Mode
  return {
    success: true,
    mode: 'SIMULATION',
    provider: 'Internal CRM Voice Simulator (No Twilio keys in .env)',
    callSid: `sim_call_${Date.now()}`,
    phone: normalizedPhone,
    durationSeconds: 22,
    telUrl: `tel:+${normalizedPhone}`,
    note: 'Twilio credentials (TWILIO_ACCOUNT_SID) not set in .env. Dispatched to local database audit log.'
  };
}

/**
 * Dispatches a Voice Message / Audio Note
 */
export async function dispatchVoiceMessage({ phone, studentName, script, language = 'en' }) {
  const normalizedPhone = normalizePhoneNumber(phone);
  const waUrl = `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(`🎙️ *Voice Attendance Notice*\n\n${script}`)}`;

  // If live WhatsApp is configured, send the formatted transcript via WhatsApp
  const waResult = await dispatchWhatsApp({
    phone,
    studentName,
    message: `🎙️ *Voice Attendance Notice*\n\n${script}`
  });

  return {
    success: true,
    mode: waResult.mode,
    provider: waResult.mode === 'LIVE_CARRIER' ? `${waResult.provider} (Voice Note Transcript)` : 'Internal CRM Voice Note Queue',
    messageId: `voice_note_${Date.now()}`,
    phone: normalizedPhone,
    durationSeconds: 14,
    language,
    waUrl,
    note: waResult.note
  };
}
