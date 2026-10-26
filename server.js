const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.use(express.json());
app.use(cors());

// 1. MongoDB Connection
const MONGO_URI = "mongodb+srv://<username>:<password>@cluster.mongodb.net/nexhash?retryWrites=true&w=majority";
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('MongoDB Connected Successfully')).catch(err => console.log('DB Error:', err));

// 2. Advanced User Schema (Dost ke panel jaisa proper tracking)
const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  username: { type: String, default: '' },
  ghsPower: { type: Number, default: 0.01 },
  minedBalance: { type: Number, default: 0 },
  claimedBalance: { type: Number, default: 0 },
  lockedDeposit: { type: Number, default: 0 },
  totalApprovedDeposit: { type: Number, default: 0 },
  totalApprovedWithdraw: { type: Number, default: 0 },
  accountStatus: { type: String, default: 'ACTIVE' },
  planStatus: { type: String, default: 'INACTIVE' },
  planExpiryDate: { type: Date, default: null },
  referredBy: { type: String, default: '' },
  referralsCount: {
    l1: { type: Number, default: 0 },
    l2: { type: Number, default: 0 },
    l3: { type: Number, default: 0 }
  },
  totalReferralCommission: { type: Number, default: 0 }
});

const User = mongoose.model('User', userSchema);

// 3. Telegram Bot Setup
const BOT_TOKEN = "8849275432:AAHY4YmbQaqXsoZ86eZxEt2sZIaCzGUk900";
const ADMIN_CHAT_ID = "7437877993";
const WEB_APP_URL = "https://aapki-hosted-website-url.com"; // Apni live website ka URL dalein

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// --- TELEGRAM /START WITH REFERRAL SUPPORT ---
bot.onText(/\/start(.*)/, async (msg, match) => {
  const chatId = msg.chat.id.toString();
  const username = msg.from.username ? `@${msg.from.username}` : msg.from.first_name;
  const startParam = match[1] ? match[1].trim() : '';

  try {
    let user = await User.findOne({ userId: chatId });
    if (!user) {
      user = new User({ userId: chatId, username });
      if (startParam && startParam !== chatId) {
        user.referredBy = startParam;
        // Update L1 referral count for upline
        let upline = await User.findOne({ userId: startParam });
        if (upline) {
          upline.referralsCount.l1 += 1;
          await upline.save();
        }
      }
      await user.save();
    }
  } catch (err) {
    console.log("Start error:", err);
  }

  const options = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '⛏️ ➔ Open NexHash Mining', web_app: { url: WEB_APP_URL } }
        ]
      ]
    }
  };

  bot.sendMessage(chatId, `🎁 Welcome to NexHash Mining!\n\nReady to grow your portfolio?\n\n🚀 Launch the App to begin your journey!`, options);
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

// Sync User Data (Mining & Balances)
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

// --- ADMIN STATS & CONTROL API ---
app.get('/api/admin/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const users = await User.find();
    let totalDeposit = users.reduce((acc, u) => acc + (u.totalApprovedDeposit || 0), 0);
    let totalWithdraw = users.reduce((acc, u) => acc + (u.totalApprovedWithdraw || 0), 0);
    let activePlans = users.filter(u => u.planStatus === 'ACTIVE').length;

    res.json({
      totalUsers,
      totalDeposit,
      totalWithdraw,
      activePlans
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
