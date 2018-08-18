var request = require('request');
var cheerio = require('cheerio');
var google = require('google');
var lyricsProviders = new Object();

function addLyricsProvider(name, func) {
  var item = {"name": name, "func": func};
  lyricsProviders[name] = item;
}

function lyricWikia(artist, title, callback) {
  artist = encodeURI(artist.replace(/ /g, "_"));title = encodeURI(title.replace(/ /g, "_"));
  request('http://lyrics.wikia.com/'+artist+':'+title, function (error, response, html) {
    if (!error && response.statusCode == 200) {
      var ch$ = cheerio.load(html);
      if(ch$('.redirectText').length) {
        arr = ch$('.redirectText a').attr('title').split(':');
        lyricWikia(arr[0], arr[1], callback);
        return true;
      }
      if(ch$('ul.categories a[title*="Unlicensed Lyrics"]').length) {
        callback(false); // Abort if lyrics is incomplete/non-existent
        return false;    // due to licensing issues
      }
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
}

addLyricsProvider("LyricWikia", lyricWikia);

addLyricsProvider("MetroLyrics", function(artist, title, callback) {
  google('site:metrolyrics.com '+title+' '+artist, function(gErr, gRes) {
    if(gErr || !gRes.links[0]) {callback(false); return false;}
    request(gRes.links[0].link, function (error, response, html) {
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
  google('site:azlyrics.com '+title+' '+artist, function(gErr, gRes) {
    if(gErr || !gRes.links[0]) {callback(false); return false;}
    request(gRes.links[0].link, function (error, response, html) {
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
  google('site:songtexte.com '+title+' '+artist, function(gErr, gRes) {
    if(gErr || !gRes.links[0]) {callback(false); return false;}
    request(gRes.links[0].link, function (error, response, html) {
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
  google('site:musixmatch.com '+title+' '+artist, function(gErr, gRes) {
    if(gErr || !gRes.links[0]) {callback(false); return false;}
    request(gRes.links[0].link, function (error, response, html) {
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
  google('site:letssingit.com '+title+' '+artist, function(gErr, gRes) {
    if(gErr || !gRes.links[0]) {callback(false); return false;}
    request(gRes.links[0].link, function (error, response, html) {
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
  google('site:j-lyric.net '+title+' '+artist, function(gErr, gRes) {
    if(gErr || !gRes.links[0]) {callback(false); return false;}
    request(gRes.links[0].link, function (error, response, html) {
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
  google('site:uta-net.com '+title+' '+artist, function(gErr, gRes) {
    if(gErr || !gRes.links[0]) {callback(false); return false;}
    request(gRes.links[0].link, function (error, response, html) {
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
