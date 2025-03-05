const express = require("express");
const app = express();
const crypto = require('crypto');
const bodyParser = require('body-parser');
const { ethers, BaseWallet } = require('ethers');
const axios = require('axios');
const cors = require("cors");
const fs = require('fs');
const PORT = 5000;

app.use(express.json());
app.use(cors());
app.use(bodyParser.json());

const DB_FILE = 'balance.json';

const getWalletBalance = () => {
    if (fs.existsSync(DB_FILE)) {
        const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        return data.balance;
    }
    return 1000; 
};

const updateWalletBalance = (balance) => {
    fs.writeFileSync(DB_FILE, JSON.stringify({ balance }), 'utf8');
};

const generateHash = (seed, roll) => {
    return crypto.createHash('sha256').update(seed + roll).digest('hex');
};

app.get("/",(req,res)=>{
    res.send("hello server speaking......");
})

app.get("/get-balance",async (req,res)=>{
    const walletBalance = getWalletBalance();
    res.json({ balance: walletBalance });
})

app.post('/roll-dice', async (req, res) => {
    let walletBalance = getWalletBalance();
    const { betAmount } = req.body;
    console.log(betAmount);
    if (!betAmount || betAmount <= 0) {
        return res.status(400).json({ error: 'Invalid bet amount' });
    }

    const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
    let ethPrice = Math.round(response.data.ethereum.usd);
    if (!ethPrice) {
        return res.status(500).json({ error: 'Failed to fetch ETH price' });
    }

    if (betAmount > walletBalance) {
        return res.status(400).json({ error: 'Insufficient balance' });
    }

    const roll = Math.floor(Math.random() * 6) + 1;

    console.log("roll generated",roll);

    const seed = crypto.randomBytes(16).toString('hex');
    const hash = generateHash(seed, roll);

    let winnings = 0;
    if (roll >= 4) {
        winnings = betAmount * 2;
        walletBalance += winnings;
    } else {
        walletBalance -= betAmount;
    }

    updateWalletBalance(walletBalance);

    res.json({
        roll,
        hash,
        seed,
        winnings,
        newBalance: walletBalance
    });
})

app.listen(PORT,()=>{
    console.log(`server connected at ${PORT}`);
})