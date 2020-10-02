var request = require('request');
var cheerio = require('cheerio');
var ddg = require('node-ddg').default;
var lyricsProviders = new Object();

function addLyricsProvider(name, func) {
  var item = {"name": name, "func": func};
  lyricsProviders[name] = item;
}

addLyricsProvider("Genius", function(artist, title, callback) {
  ddg({query:'site:genius.com '+title+' '+artist, maxResults: 3}).then(function(results) {
    if(results.length < 1) {callback(false); return(false)}
    request(results[0].url, function (error, response, html) {
      if (!error && response.statusCode == 200) {
        var ch$ = cheerio.load(html);
        // Extracting the lyrics
        var myLyrics = ch$('.lyrics').text().trim()
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

addLyricsProvider("MetroLyrics", function(artist, title, callback) {
  ddg({query:'site:metrolyrics.com '+title+' '+artist, maxResults: 3}).then(function(results) {
    if(results.length < 1) {callback(false); return(false)}
    request(results[0].url, function (error, response, html) {
      if (!error && response.statusCode == 200) {
        var ch$ = cheerio.load(html);
        if(ch$('div#lyrics-body-text p.verse').length > 1) {
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
      }
      else {
        callback(false);
      }
    });
  });
});

addLyricsProvider("AZLyrics", function(artist, title, callback) {
  ddg({query:'site:azlyrics.com '+title+' '+artist, maxResults: 3}).then(function(results) {
    if(results.length < 1) {callback(false); return(false)}
    request(results[0].url, function (error, response, html) {
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

addLyricsProvider("Songtexte.com", function(artist, title, callback) {
  ddg({query:'site:songtexte.com '+title+' '+artist, maxResults: 3}).then(function(results) {
    if(results.length < 1) {callback(false); return(false)}
    request(results[0].url, function (error, response, html) {
      if (!error && response.statusCode == 200) {
        var ch$ = cheerio.load(html);
        // Extracting the lyrics
        var myLyrics = ch$('#lyrics').text().trim()
        if(myLyrics && !(myLyrics.includes('Leider kein Songtext vorhanden.'))) { // Dirty but necessary
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

addLyricsProvider("Musixmatch", function(artist, title, callback) {
  ddg({query:'site:musixmatch.com '+title+' '+artist, maxResults: 3}).then(function(results) {
    if(results.length < 1) {callback(false); return(false)}
    request(results[0].url, function (error, response, html) {
      if (!error && response.statusCode == 200) {
        var ch$ = cheerio.load(html);
        // Extracting the lyrics
        var myLyrics = ch$('.mxm-lyrics__content').text().trim()
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

addLyricsProvider("LetsSingIt", function(artist, title, callback) {
  ddg({query:'site:letssingit.com '+title+' '+artist, maxResults: 3}).then(function(results) {
    if(results.length < 1) {callback(false); return(false)}
    request(results[0].url, function (error, response, html) {
      if (!error && response.statusCode == 200) {
        var ch$ = cheerio.load(html);
        // Extracting the lyrics
        var myLyrics = ch$('#lyrics').text().trim()
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

addLyricsProvider("J-Lyrics.net", function(artist, title, callback) {
  ddg({query:'site:j-lyric.net '+title+' '+artist, maxResults: 3}).then(function(results) {
    if(results.length < 1) {callback(false); return(false)}
    request(results[0].url, function (error, response, html) {
      if (!error && response.statusCode == 200) {
        var ch$ = cheerio.load(html);
        // Extracting the lyrics
        var myLyrics = ch$('#lyricBody').text().trim()
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

addLyricsProvider("Uta-Net", function(artist, title, callback) {
  ddg({query:'site:uta-net.com '+title+' '+artist, maxResults: 3}).then(function(results) {
    if(results.length < 1) {callback(false); return(false)}
    request(results[0].url, function (error, response, html) {
      if (!error && response.statusCode == 200) {
        var ch$ = cheerio.load(html);
        var svgUrl = ch$('#ipad_kashi').find('img').attr('src');
        request('http://www.uta-net.com/'+svgUrl, function (error, response, svg) {
          if (!error && response.statusCode == 200) {
            var svg$ = cheerio.load(svg);
            var myLyrics = '';
            svg$('text').each(function (i, e) {
              myLyrics += e.children[0].data+"\n"
            });
            if(myLyrics) {
              callback(true, myLyrics.trim());
            }
            else {callback(false);}
          }
        });
      }
      else {
        callback(false);
      }
    });
  });
});

module.exports = exports = lyricsProviders;
