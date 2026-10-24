const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.use(express.json());
app.use(cors());

// 1. MongoDB Connection (Apna MongoDB URI yahan dalein)
const MONGO_URI = "mongodb+srv://<username>:<password>@cluster.mongodb.net/nexhash?retryWrites=true&w=majority";
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('MongoDB Connected Successfully')).catch(err => console.log('DB Error:', err));

// 2. User Schema & Model
const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  ghsPower: { type: Number, default: 0.01 },
  minedBalance: { type: Number, default: 0 },
  claimedBalance: { type: Number, default: 0 },
  lockedDeposit: { type: Number, default: 0 }
});

const User = mongoose.model('User', userSchema);

// 3. Telegram Bot Setup
const BOT_TOKEN = "8849275432:AAHY4YmbQaqXsoZ86eZxEt2sZIaCzGUk900"; // Aapka Bot Token
const ADMIN_CHAT_ID = "7437877993"; // Aapki Admin Chat ID
const WEB_APP_URL = "https://aapki-hosted-website-url.com"; // Yahan apni live website/hosting ka URL dalein jahan index.html hosted hai

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// --- TELEGRAM BOT /START COMMAND (Single Web App Button) ---
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  
  const options = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '⛏️ ➔ Open NexHash Mining', web_app: { url: WEB_APP_URL } }
        ]
      ]
    }
  };

  bot.sendMessage(chatId, "🎁 Welcome to NexHash Mining!\n\nReady to grow your portfolio?\n\n🚀 Launch the App to begin your journey!", options);
});

// --- API ENDPOINTS FOR FRONTEND ---

// Get User Data
app.get('/api/user/:userId', async (req, res) => {
  try {
    let user = await User.findOne({ userId: req.params.userId });
    if (!user) {
      user = new User({ userId: req.params.userId });
      await user.save();
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update User Data (Mining Claim / Balance Sync)
app.post('/api/user/update', async (req, res) => {
  try {
    const { userId, ghsPower, claimedBalance, minedBalance } = req.body;
    let user = await User.findOneAndUpdate(
      { userId },
      { ghsPower, claimedBalance, minedBalance },
      { new: true, upsert: true }
    );
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- ADMIN TELEGRAM BOT COMMANDS ---

// Command to Add GHS Power: /addghs <userId> <amount>
bot.onText(/\/addghs (.+)/, async (msg, match) => {
  if (msg.chat.id.toString() !== ADMIN_CHAT_ID) return;
  
  const args = match[1].split(' ');
  const targetUserId = args[0];
  const amount = parseFloat(args[1]);

  if (!targetUserId || isNaN(amount)) {
    return bot.sendMessage(msg.chat.id, "❌ Sahi format use karein:\n`/addghs <userId> <amount>`", { parse_mode: 'Markdown' });
  }

  try {
    let user = await User.findOne({ userId: targetUserId });
    if (!user) {
      user = new User({ userId: targetUserId, ghsPower: 0.01 + amount });
    } else {
      user.ghsPower += amount;
    }
    await user.save();

    bot.sendMessage(msg.chat.id, `✅ Success!\nUser ID: \`${targetUserId}\`\nAdded GHS: +${amount}\nTotal GHS Power: ${user.ghsPower}`, { parse_mode: 'Markdown' });
  } catch (err) {
    bot.sendMessage(msg.chat.id, `❌ Error: ${err.message}`);
  }
});

// Command to Add Balance: /addbalance <userId> <amount>
bot.onText(/\/addbalance (.+)/, async (msg, match) => {
  if (msg.chat.id.toString() !== ADMIN_CHAT_ID) return;
  
  const args = match[1].split(' ');
  const targetUserId = args[0];
  const amount = parseFloat(args.slice(1).join(' '));

  if (!targetUserId || isNaN(amount)) {
    return bot.sendMessage(msg.chat.id, "❌ Sahi format use karein:\n`/addbalance <userId> <amount>`", { parse_mode: 'Markdown' });
  }

  try {
    let user = await User.findOne({ userId: targetUserId });
    if (!user) {
      user = new User({ userId: targetUserId, claimedBalance: amount });
    } else {
      user.claimedBalance += amount;
    }
    await user.save();

    bot.sendMessage(msg.chat.id, `✅ Success!\nUser ID: \`${targetId}\`\nAdded Balance: +${amount} USDT\nTotal Balance: ${user.claimedBalance} USDT`, { parse_mode: 'Markdown' });
  } catch (err) {
    bot.sendMessage(msg.chat.id, `❌ Error: ${err.message}`);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
