const express = require('express');
const axios = require('axios').default;
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000

const corsOptions = {
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

app.all('/*name', (req, res) => {
  console.log('originalUrl', req.originalUrl);
  console.log('method', req.method);
  console.log('body', req.body);
  const recipient = req.originalUrl.split('/')[1];
  console.log('recipient:', recipient);

  const recipientURL = process.env[recipient];
  console.log('recipientURL:', recipientURL);

  if (recipientURL) {
    const axiosConfig = {
      method: req.method,
      url: `${recipientURL}${req.originalUrl}`,
      ...(Object.keys(req.body || {}).length > 0 && { data: req.body })
    };

    console.log('axiosConfig:', axiosConfig);

    axios(axiosConfig)
      .then(function (response) {
        console.log('response from recipient', response.data);
        res.json(response.data);
      })
      .catch(error => {
        console.log('some error:', JSON.stringify(error));
        if (error.response) {
          const {
            status,
            data
          } = error.response;
          res.status(status).json(data);
        } else {
          res.status(502).json({ error: error.message });
        }
      });
  } else {
    res.status(502).json({ error: 'Cannot process request' });
  }

});

app.listen(PORT, () => {
  console.log(`bff-service listening on port ${PORT}`);
})