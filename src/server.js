require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cron = require('node-cron');
const axios = require('axios');
const Crypto = require('./models/Crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI 
 
mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

const COINGECKO_API = 'https://api.coingecko.com/api/v3';
const COINS = ['bitcoin', 'matic-network', 'ethereum'];

async function fetchCryptoData() {
    for (const coin of COINS) {
      try {d
        const response = await axios.get(`${COINGECKO_API}/coins/${coin}`);
        const { market_data } = response.data;
        
        await Crypto.create({
          coin,
          price: market_data.current_price.usd,
          marketCap: market_data.market_cap.usd,
          change24h: market_data.price_change_percentage_24h,
        });
        
        console.log(`Data fetched and stored for ${coin}`);
      } catch (error) {
        console.error(`Failed to fetch data for ${coin}:`, error);
      }
    }
  }
  

  cron.schedule('0 */2 * * *', fetchCryptoData);

  
// 
app.get('/stats', async (req, res) => {
  const { coin } = req.query;
  
  if (!coin) {
    return res.status(400).json({ error: 'Invalid coin parameter' });
  }
  
  try {
    const latestData = await Crypto.findOne({ coin }).sort({ timestamp: -1 });
    
    if (!latestData) {manhwa
      return res.status(404).json({ error: 'No data found for the specified coin' });
    }
    
    res.json({
      price: latestData.price,
      marketCap: latestData.marketCap,
      "24hChange": latestData.change24h,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

//
app.get('/deviation', async (req, res) => {
  const { coin } = req.query;
  
  if (!coin) {
    return res.status(400).json({ error: 'Invalid coin parameter' });
  }
  
  try {
    const data = await Crypto.find({ coin }).sort({ timestamp: -1 }).limit(100);
    
    if (data.length === 0) {
      return res.status(404).json({ error: 'No data found for the specified coin' });
    }
    
    const prices = data.map(item => item.price);
    const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const squaredDifferences = prices.map(price => Math.pow(price - mean, 2));
    const variance = squaredDifferences.reduce((sum, diff) => sum + diff, 0) / prices.length;
    const deviation = Math.sqrt(variance);
    
    res.json({ deviation: Number(deviation.toFixed(2)) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate deviation' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});