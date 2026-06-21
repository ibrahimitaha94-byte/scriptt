const axios = require('axios');
const fs    = require('fs');

const token = process.argv[2];

if (!token) {
  console.log('❌ Utilisation : node export.js TON_TOKEN_ICI');
  process.exit(1);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  var allConvos = [];
  var url = 'https://graph.facebook.com/v18.0/me/conversations?platform=messenger&limit=100&access_token=' + token;
  var pageCount = 0;

  console.log('🔄 Démarrage de l\'export...\n');

  try {
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
          console.error('⚠️  Erreur sur une conversation, on continue:', e.message);
        }

        process.stdout.write('\r📥 ' + allConvos.length + ' conversations récupérées...');
        await sleep(100);
      }

      url = (resp.data.paging && resp.data.paging.next) ? resp.data.paging.next : null;
      pageCount++;
    }

    var output = { total: allConvos.length, conversations: allConvos };
    fs.writeFileSync('conversations-export.json', JSON.stringify(output, null, 2));

    console.log('\n\n✅ Terminé ! ' + allConvos.length + ' conversations sauvegardées');

  } catch (e) {
    var err = e.response ? JSON.stringify(e.response.data) : e.message;
    console.error('\n❌ Erreur :', err);
  }
}

main();
