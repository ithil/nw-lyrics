var request = require('request');
var cheerio = require('cheerio');
var lyricsProviders = new Object();

function addLyricsProvider(name, func) {
    var item = {"name": name, "func": func};
    lyricsProviders[name] = item;
}

addLyricsProvider("LyricWikia", function(artist, title, callback) {
    artist = artist.replace(/ /g, "_");title = title.replace(/ /g, "_");
    request('http://lyrics.wikia.com/'+artist+':'+title, function (error, response, html) {
      if (!error && response.statusCode == 200) {
        var ch$ = cheerio.load(html);
        // Extracting the lyrics
        lyricBox = ch$('div.lyricbox');
        lyricBox.find('div.rtMatcher').remove(); // Removing ads
        lyricBox.find('script').remove();
        lyricBox.find('br').each(function(i,e) { ch$(this).replaceWith("\n")}); // Adding newlines
        myLyrics = lyricBox.text().trim();  // Removing trailing newlines
        callback(true, myLyrics);
      }
      else {
        callback(false);
      }
   });
});

module.exports = exports = lyricsProviders;
