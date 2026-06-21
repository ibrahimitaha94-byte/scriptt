const express = require('express');
const axios   = require('axios');
const app     = express();

app.get('/', function(req, res) {
  res.send('✅ Service actif. Utilise /export?token=TON_TOKEN');
});

app.get('/export', async function(req, res) {
  var token = req.query.token;
  if (!token) {
    return res.status(400).json({ error: 'Ajoute ?token=TON_TOKEN_ICI dans l\'URL' });
  }

  try {
    var allConvos = [];
    var url = 'https://graph.facebook.com/v18.0/me/conversations?platform=messenger&limit=100&access_token=' + token;
    var pageCount = 0;

    while (url && pageCount < 50) {
      var resp = await axios.get(url);
      var convos = resp.data.data || [];

      for (var i = 0; i < convos.length; i++) {
        try {
          var msgUrl = 'https://graph.facebook.com/v18.0/' + convos[i].id +
            '?fields=messages.limit(20){message,from,created_time}&access_token=' + token;
          var msgResp = await axios.get(msgUrl);

          allConvos.push({
            conversationId: convos[i].id,
            messages: (msgResp.data.messages && msgResp.data.messages.data) || []
          });
        } catch (e) {
          console.error('[Export] Erreur conversation', convos[i].id, e.message);
        }
      }

      url = (resp.data.paging && resp.data.paging.next) ? resp.data.paging.next : null;
      pageCount++;
    }

    console.log('[Export] Terminé —', allConvos.length, 'conversations');
    res.json({ total: allConvos.length, conversations: allConvos });

  } catch (e) {
    var err = e.response ? e.response.data : e.message;
    res.status(500).json({ error: err });
  }
});

var PORT = process.env.PORT || 3000;
app.listen(PORT, function() {
  console.log('[Export Server] Démarré sur le port ' + PORT);
});
