const express = require('express');
const axios   = require('axios');
const app     = express();

var exportState = { running: false, done: false, progress: 0, error: null, results: [] };

app.get('/', function(req, res) {
  res.send('✅ Service actif. Utilise /export/start?token=TON_TOKEN pour démarrer.');
});

app.get('/export/start', function(req, res) {
  var token = req.query.token;
  if (!token) return res.status(400).json({ error: 'Ajoute ?token=TON_TOKEN_ICI' });
  if (exportState.running) return res.json({ message: 'Déjà en cours', progress: exportState.progress });

  exportState = { running: true, done: false, progress: 0, error: null, results: [] };
  res.json({ message: '✅ Export démarré ! Vérifie la progression sur /export/status' });

  runExportInBackground(token);
});

app.get('/export/status', function(req, res) {
  res.json({
    running: exportState.running,
    done: exportState.done,
    progress: exportState.progress,
    error: exportState.error
  });
});

app.get('/export/result', function(req, res) {
  if (!exportState.done) {
    return res.status(400).json({ error: 'Pas encore terminé', progress: exportState.progress });
  }
  res.json({ total: exportState.results.length, conversations: exportState.results });
});

async function runExportInBackground(token) {
  try {
    var url = 'https://graph.facebook.com/v18.0/me/conversations?platform=messenger&limit=100&access_token=' + encodeURIComponent(token);
    var pageCount = 0;

    while (url && pageCount < 50) {
      var resp = await axios.get(url);
      var convos = resp.data.data || [];

      for (var i = 0; i < convos.length; i++) {
        try {
          var msgUrl = 'https://graph.facebook.com/v18.0/' + convos[i].id +
            '?fields=messages.limit(20){message,from,created_time}&access_token=' + encodeURIComponent(token);
          var msgResp = await axios.get(msgUrl);

          exportState.results.push({
            conversationId: convos[i].id,
            messages: (msgResp.data.messages && msgResp.data.messages.data) || []
          });
        } catch (e) {
          console.error('[Export] Erreur conversation', convos[i].id, e.message);
        }
        exportState.progress = exportState.results.length;
      }

      url = (resp.data.paging && resp.data.paging.next) ? resp.data.paging.next : null;
      pageCount++;
    }

    exportState.done = true;
    exportState.running = false;
    console.log('[Export] Terminé —', exportState.results.length, 'conversations');

  } catch (e) {
    var err = e.response ? JSON.stringify(e.response.data) : e.message;
    console.error('[Export] Erreur:', err);
    exportState.error = err;
    exportState.running = false;
  }
}

var PORT = process.env.PORT || 3000;
app.listen(PORT, function() {
  console.log('[Export Server] Démarré sur le port ' + PORT);
});
