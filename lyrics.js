var request = require('request');
var cheerio = require('cheerio');
var itunes = require('playback');
var fs = require('fs');
var gui = require('nw.gui');
var win = gui.Window.get();
var app = gui.App;

win.on('close', function() {this.hide()});
app.on('reopen', function() {win.show(); win.focus()})
itunes.on('playing', function(data) {
   NRdiv = document.getElementById('iTunesNotRunning');
   lyricsDiv = document.getElementById('lyrics');
   topbarDiv = document.getElementById('topbar');
   if(!data) {
        NRdiv.style.display = 'block';
        lyricsDiv.style.display = 'none';
        topbarDiv.style.display = 'none';
        return;
   }
   NRdiv.style.display = 'none';
   lyricsDiv.style.display = 'block';
   topbarDiv.style.display = 'block';

   getLyrics(data.artist, data.name);
})

var lyrics_dir = process.env['HOME']+'/.lyrics';


document.onkeydown = function(evt) {
    if ((evt.which == '115' || evt.which == '83' ) && (evt.ctrlKey || evt.metaKey))
        {
            evt.preventDefault();
            var lyricsDiv = document.getElementById('lyrics');
            lyricsDiv.removeAttribute('class');
            lyricsDiv.removeAttribute('contenteditable');
            var lyrics = lyricsDiv.innerText;
            var artist = document.getElementById('artist').textContent;
            var title = document.getElementById('title').textContent;
            artist = artist.replace(/ /g, "_");title = title.replace(/ /g, "_")
            saveLyrics(artist, title, lyrics);
            return false;
        }
    if (evt.keyCode == 27) {
            evt.preventDefault();
            var lyricsDiv = document.getElementById('lyrics');
            lyricsDiv.removeAttribute('class');
            lyricsDiv.removeAttribute('contenteditable');
            var artist = document.getElementById('artist').textContent;
            var title = document.getElementById('title').textContent;
            artist = artist.replace(/ /g, "_");title = title.replace(/ /g, "_")
            readLyrics(artist, title);
    }
    var tag = evt.target.tagName.toLowerCase();
    if (tag != 'input' && tag != 'textarea' && evt.target.getAttribute('contenteditable') != 'true') { 
        if (String.fromCharCode(evt.keyCode) == "R") {
            itunes.currentTrack();
        }
        if (String.fromCharCode(evt.keyCode) == "D") {
            require('nw.gui').Window.get().showDevTools()
        }
        if (String.fromCharCode(evt.keyCode) == "S") {
            toggleSearch();
        }
        if (String.fromCharCode(evt.keyCode) == "E") {
            editMode();
        }
    };
}

function autoSizeText(el) {
    el.style.fontSize = null;
    function resizeText() {
        var style = window.getComputedStyle(el);
        var elNewFontSize = (parseInt(style.getPropertyValue('font-size').slice(0,-2)) -1) + 'px';
        el.style.fontSize = elNewFontSize;
    }
    while (el.offsetWidth+50 > window.innerWidth) { resizeText(); }
}

function editMode() {
    var lyricsDiv = document.getElementById("lyrics"); 
    document.getElementById('NoLyricsFound').style.display = 'none';
    lyricsDiv.style.display = 'block';
    lyricsDiv.setAttribute('class', "editmode");
    lyricsDiv.setAttribute('contenteditable', "true");
}

function onSearch(e) {
    if (!e) e = window.event;
    if (e.keyCode == '13') {
        aBox = document.getElementById('searchArtist');
        tBox = document.getElementById('searchTitle');
        NRdiv = document.getElementById('iTunesNotRunning');
        NRdiv.style.display = 'none';
        toggleSearch();
        getLyrics(aBox.value, tBox.value);
    };
};

document.getElementById('searchArtist').onkeypress = onSearch;
document.getElementById('searchTitle').onkeypress = onSearch;


function toggleSearch() {
    sBox = document.getElementById('search');
    lBox = document.getElementById('lyrics');
    if(typeof sBox == "undefined") {return;}
    if(sBox.style.display == "none") {
        lBox.style.display = "none";
        sBox.style.display = "block";
    }
    else {
        sBox.style.display = "none";
        lBox.style.display = "block";
    }
}
function setTopbar(artist, title) {
    document.getElementById('topbar').style.display = 'block'; //Make topbar visible
    var divArtist = document.getElementById('artist');
    divArtist.innerText = artist;
    var divTitle = document.getElementById('title');
    divTitle.innerText = title;
    autoSizeText(divArtist); autoSizeText(divTitle);
}

function setLyrics(lyrics) {
    lyricsDiv = document.getElementById('lyrics')
    lyricsDiv.innerText = lyrics
}

function saveLyrics(artist, title, lyrics) {
    if(!fs.existsSync(lyrics_dir)) {fs.mkdirSync(lyrics_dir)}
    fs.writeFile(lyrics_dir+'/'+artist+':'+title+'.txt', lyrics.toString('utf-8'))
}

function readLyrics(artist, title, callback) {
    if(fs.existsSync(lyrics_dir+'/'+artist+':'+title+'.txt')) {
        fs.readFile(lyrics_dir+'/'+artist+':'+title+'.txt', 'utf-8', function (error, data) {
            if(error) throw error
            if(callback == null) {
                setLyrics(data);
            }
            else { callback(data) }
        })
        return true;
    }
    else {return false}
}

function getLyrics(artist, title, callback) {
    if(!artist || !title) {return false}
    setTopbar(artist, title);
    artist = artist.replace(/ /g, "_");title = title.replace(/ /g, "_");
    if(readLyrics(artist, title, callback)) {return}
    request('http://lyrics.wikia.com/'+artist+':'+title, function (error, response, html) {
      if (!error && response.statusCode == 200) {
        var $ = cheerio.load(html);

        // Extracting the lyrics
        lyricBox = $('div.lyricbox');
        lyricBox.find('div.rtMatcher').remove(); // Removing ads
        lyricBox.find('br').each(function(i,e) { $(this).replaceWith("\n")}); // Adding newlines
        myLyrics = lyricBox.text().trim();  // Removing trailing newlines
        if(!callback) {
            document.getElementById('NoLyricsFound').style.display = 'none';
            //Saving lyrics
            saveLyrics(artist, title, myLyrics.toString());
            setLyrics(myLyrics);
        }
        else { callback(myLyrics); }
      }
      else {
        setLyrics('');
        document.getElementById('lyrics').style.display = 'none';
        document.getElementById('NoLyricsFound').style.display = 'block';
      }
    })
}

itunes.currentTrack();
