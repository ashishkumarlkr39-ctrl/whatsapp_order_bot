const express = require('express');
const bodyParser = require('body-parser');
const twilio = require('twilio');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Environment variables (set these on Render or your host)
const accountSid = process.env.TWILIO_ACCOUNT_SID || '';
const authToken = process.env.TWILIO_AUTH_TOKEN || '';
const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER || '';

const client = twilio(accountSid, authToken);

// Simple session store (in-memory). For production use a DB.
const userState = {};

// send message via Twilio WhatsApp (uses Twilio sandbox or your WhatsApp-enabled number)
function sendMsg(to, message) {
  // Twilio client expects full whatsapp: format for from/to
  return client.messages.create({
    from: `whatsapp:${whatsappNumber}`,
    to: `whatsapp:${to}`,
    body: message
  });
}

// POST /whatsapp will be the webhook Twilio calls for incoming messages
app.post('/whatsapp', async (req, res) => {
  try {
    const incoming = (req.body.Body || '').trim();
    const fromRaw = req.body.From || '';
    const from = fromRaw.replace('whatsapp:', '');

    if (!from) {
      return res.status(400).send('No sender');
    }

    if (!userState[from]) {
      userState[from] = { step: 'start' };
    }

    const state = userState[from];

    // Start / menu trigger
    if (/^hi$/i.test(incoming) || /^hello$/i.test(incoming) || /^menu$/i.test(incoming)) {
      state.step = 'choose_cuisine';
      await sendMsg(from,
        'Welcome to Flavour Junction! Please choose a cuisine by sending the number:\\n\\n1) Indian 🇮🇳\\n2) Italian 🇮🇹\\n3) Chinese 🇨🇳\\n4) American 🇺🇸'
      );
      return res.send('<Response></Response>');
    }

    // If choosing cuisine
    if (state.step === 'choose_cuisine') {
      if (incoming === '1') {
        state.step = 'indian_menu';
        await sendMsg(from,
          'Indian Menu:\\n1) Paneer Tikka - ₹120\\n2) Chole Bhature - ₹90\\n3) Masala Dosa - ₹110\\n\\nSend item number to order.'
        );
        return res.send('<Response></Response>');
      } else if (incoming === '2') {
        state.step = 'italian_menu';
        await sendMsg(from,
          'Italian Menu:\\n1) Margherita Pizza - ₹150\\n2) Pasta Alfredo - ₹170\\n3) Garlic Bread - ₹80\\n\\nSend item number to order.'
        );
        return res.send('<Response></Response>');
      } else if (incoming === '3') {
        state.step = 'chinese_menu';
        await sendMsg(from,
          'Chinese Menu:\\n1) Veg Hakka Noodles - ₹120\\n2) Fried Rice - ₹110\\n3) Spring Rolls - ₹90\\n\\nSend item number to order.'
        );
        return res.send('<Response></Response>');
      } else if (incoming === '4') {
        state.step = 'american_menu';
        await sendMsg(from,
          'American Menu:\\n1) Burger - ₹130\\n2) Fries - ₹70\\n3) Hot Dog - ₹140\\n\\nSend item number to order.'
        );
        return res.send('<Response></Response>');
      } else {
        await sendMsg(from, 'Invalid option. Please reply with 1, 2, 3 or 4 to choose a cuisine.');
        return res.send('<Response></Response>');
      }
    }

    // Handle item selection depending on menu
    const orderMaps = {
      indian_menu: {
        '1': { name: 'Paneer Tikka', price: 120 },
        '2': { name: 'Chole Bhature', price: 90 },
        '3': { name: 'Masala Dosa', price: 110 }
      },
      italian_menu: {
        '1': { name: 'Margherita Pizza', price: 150 },
        '2': { name: 'Pasta Alfredo', price: 170 },
        '3': { name: 'Garlic Bread', price: 80 }
      },
      chinese_menu: {
        '1': { name: 'Veg Hakka Noodles', price: 120 },
        '2': { name: 'Fried Rice', price: 110 },
        '3': { name: 'Spring Rolls', price: 90 }
      },
      american_menu: {
        '1': { name: 'Burger', price: 130 },
        '2': { name: 'Fries', price: 70 },
        '3': { name: 'Hot Dog', price: 140 }
      }
    };

    if (state.step && orderMaps[state.step]) {
      const menuForState = orderMaps[state.step];
      if (menuForState[incoming]) {
        // create a simple order confirmation and reset session
        const item = menuForState[incoming];
        // In production you would save order to DB and generate order id/otp
        await sendMsg(from, `✅ Order received: ${item.name} — ₹${item.price}\\nWe will prepare it shortly. Thank you!`);
        userState[from] = { step: 'start' }; // reset
        return res.send('<Response></Response>');
      } else {
        await sendMsg(from, 'Invalid item number. Please send the correct item number from the menu.');
        return res.send('<Response></Response>');
      }
    }

    // If user asks for track or help
    if (/^track$/i.test(incoming)) {
      await sendMsg(from, 'Order Status: Being Prepared. (Demo message)');
      return res.send('<Response></Response>');
    }

    // Default fallback
    await sendMsg(from, "Please send 'Hi' to start ordering. Send 'menu' to see cuisine options.");
    return res.send('<Response></Response>');

  } catch (err) {
    console.error('Webhook error:', err && err.message);
    return res.status(500).send('Server error');
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log('WhatsApp bot running on port', PORT);
});
