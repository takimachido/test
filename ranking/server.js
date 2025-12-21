const axios = require('axios');

app.get('/kalshi-markets', async (req, res) => {
  try {
    const response = await axios.get('https://api.kalshi.com/trade-api/v2/markets', {
      params: {
        limit: 10,
        status: 'open',
        sort: 'volume'
      }
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Oops' });
  }
});
