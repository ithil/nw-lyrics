var request = require('request');
var cheerio = require('cheerio');
var google = require('google');
var lyricsProviders = new Object();

function addLyricsProvider(name, func) {
    var item = {"name": name, "func": func};
    lyricsProviders[name] = item;
}

addLyricsProvider("LyricWikia", function(artist, title, callback) {
    artist = encodeURI(artist.replace(/ /g, "_"));title = encodeURI(title.replace(/ /g, "_"));
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

addLyricsProvider("MetroLyrics", function(artist, title, callback) {
    google('site:metrolyrics.com '+title+' '+artist, function(gErr, gNext, gLinks) {
        if(gErr) callback(false);
        request(gLinks[0].link, function (error, response, html) {
          if (!error && response.statusCode == 200) {
            var ch$ = cheerio.load(html);
            // Extracting the lyrics
            var myLyrics = "";
            ch$('div#lyrics-body-text p.verse').each(function() {
                myLyrics = myLyrics.concat(ch$(this).text().trim()+"\n\n");
            });
            callback(true, myLyrics.trim());
          }
          else {
            callback(false);
          }
        });
    });
});

addLyricsProvider("AZLyrics", function(artist, title, callback) {
    google('site:azlyrics.com '+title+' '+artist, function(gErr, gNext, gLinks) {
        if(gErr) callback(false);
        request(gLinks[0].link, function (error, response, html) {
          if (!error && response.statusCode == 200) {
            var ch$ = cheerio.load(html);
            // Extracting the lyrics
            var myLyrics = ch$(ch$('div.ringtone').nextAll('div')[0]).text().trim()
            if(myLyrics) {
                callback(true, myLyrics.trim());
            }
            else {callback(false);}
          }
          else {
            callback(false);
          }
        });
    });
});

module.exports = exports = lyricsProviders;
