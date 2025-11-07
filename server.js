
const express = require("express");
const bodyParser = require("body-parser");
const twilio = require("twilio");
require("dotenv").config();

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);

const menu = {
  1: "Margherita Pizza - ₹150",
  2: "Veg Burger - ₹80",
  3: "Pasta - ₹120",
  4: "Masala Fries - ₹70"
};

let sessions = {};

app.post("/whatsapp", async (req, res) => {
  const from = req.body.From;
  const msg = req.body.Body.trim().toLowerCase();

  if (!sessions[from]) {
    sessions[from] = { stage: "menu", cart: [] };
    return sendMsg(res, "Welcome! Order karne ke liye item no. bheje:
1. Margherita Pizza
2. Veg Burger
3. Pasta
4. Masala Fries

Done likhke complete karein.");
  }

  const user = sessions[from];

  if (user.stage === "menu") {
    if (msg === "done") {
      user.stage = "otp";
      user.otp = "1234";
      return sendMsg(res, "Your OTP is 1234. Please reply: otp 1234");
    }
    if (menu[msg]) {
      user.cart.push(menu[msg]);
      return sendMsg(res, "Added: " + menu[msg] + "
Aur item bheje ya 'done' likhe.");
    }
    return sendMsg(res, "Galat item. Sahi number bheje.");
  }

  if (user.stage === "otp") {
    if (msg === "otp 1234") {
      user.stage = "done";
      return sendMsg(res, "Order Confirm
Aapka order:
" + user.cart.join("
") + "

Order status track karne ke liye 'track' likhe.");
    }
    return sendMsg(res, "Galat OTP. Try again.");
  }

  if (msg === "track") {
    return sendMsg(res, "Order Status: Being Prepared");
  }

  return sendMsg(res, "Type 'menu' to start again.");
});

function sendMsg(res, text) {
  const twiml = new twilio.twiml.MessagingResponse();
  twiml.message(text);
  res.type("text/xml");
  return res.send(twiml.toString());
}

app.listen(3000, () => console.log("Server running on port 3000"));
