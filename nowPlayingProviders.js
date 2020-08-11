var request = require('request');
var osascript = require('node-osascript');

var npProviders = new Object();

function addNPProvider(name, func) {
  var item = {"name": name, "func": func};
  npProviders[name] = item;
}


function lastFmCurrentSong(opt, callback) {
  request('http://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user='+opt.config.get('lastfm.user')+'&api_key='+opt.config.get('lastfm.api_key')+'&format=json&limit=1', function (error, response, content) {
    if (!error && response.statusCode == 200) {
      obj = JSON.parse(content)['recenttracks']['track'][0];
      artist = obj['artist']['#text'];
      title = obj['name'];
      callback(artist, title);
    }
  });
}
addNPProvider("LastFM", lastFmCurrentSong);

function spotifyCurrentSong(opt, callback) {
  osascript.execute('tell application "Spotify" to set mytrack to name of current track as string\ntell application "Spotify" to set myartist to artist of current track as string\n{artist:myartist, track:mytrack}',
  function(err, result, raw) {
    if (err) return console.error(err);
    if (result.artist && result.track) {
      callback(result.artist, result.track);
    }
  }
  );
}
addNPProvider("Spotify Desktop", spotifyCurrentSong);

function itunesCurrentSong(opt, callback) {
  osascript.execute('tell application "iTunes" to set mytrack to name of current track as string\ntell application "iTunes" to set myartist to artist of current track as string\n{artist:myartist, track:mytrack}',
  function(err, result, raw) {
    if (err) return console.error(err);
    if (result.artist && result.track) {
      callback(result.artist, result.track);
    }
  }
  );
}
addNPProvider("iTunes", itunesCurrentSong);

module.exports = exports = npProviders;
