var request = require('request');
var cheerio = require('cheerio');
var itunes = require('playback');
var fs = require('fs');
var gui = require('nw.gui');
var win = gui.Window.get();
var app = gui.App;
var np = { };

win.on('close', function() {this.hide()});
app.on('reopen', function() {win.show(); win.focus()})
itunes.on('playing', function(data) {
   NRdiv = document.getElementById('iTunesNotRunning');
   lyricsDiv = document.getElementById('lyrics');
   headerDiv = document.getElementById('header');
   if(!data) {
        NRdiv.style.display = 'block';
        lyricsDiv.style.display = 'none';
        headerDiv.style.display = 'none';
        return;
   }
   NRdiv.style.display = 'none';
   lyricsDiv.style.display = 'block';
   headerDiv.style.display = 'block';

   getLyrics(data.artist, data.name);
   window.scrollTo(0,0);
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

function editMode(focus) {
    var lyricsDiv = document.getElementById("lyrics"); 
    document.getElementById('NoLyricsFound').style.display = 'none';
    lyricsDiv.style.display = 'block';
    lyricsDiv.setAttribute('class', "editmode");
    lyricsDiv.setAttribute('contenteditable', "true");
    if(focus) { lyricsDiv.focus(); }
}

function markAsInstrumental(artist, title) {
    var artist = artist || np.artist;
    var title = title || np.title;
    saveLyrics(artist, title, "Instrumental");
    setLyrics('Instrumental');
    document.getElementById('NoLyricsFound').style.display = 'none';
    document.getElementById('lyrics').style.display = 'block';
}

function webSearch(artist, title) {
    var artist = artist || np.artist;
    var title = title || np.title;
    var query = artist + ' ' + title + ' lyrics';
    gui.Shell.openExternal('http://google.com/search?q='+encodeURI(query));
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
function setHeader(artist, title) {
    document.getElementById('header').style.display = 'block'; //Make header visible
    var divArtist = document.getElementById('artist');
    divArtist.innerText = artist;
    var divTitle = document.getElementById('title');
    divTitle.innerText = title;
    autoSizeText(divArtist); autoSizeText(divTitle);
}

function setLyrics(lyrics) {
    lyricsDiv = document.getElementById('lyrics');
    lyricsDiv.innerText = lyrics;
}

function saveLyrics(artist, title, lyrics) {
    if(!fs.existsSync(lyrics_dir)) {fs.mkdirSync(lyrics_dir)}
    fs.writeFile(lyrics_dir+'/'+artist+':'+title+'.txt', lyrics.toString()+'\n');
}

function readLyrics(artist, title, callback) {
    if(fs.existsSync(lyrics_dir+'/'+artist+':'+title+'.txt')) {
        fs.readFile(lyrics_dir+'/'+artist+':'+title+'.txt', 'utf8', function (error, data) {
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
    setHeader(artist, title);
    np.artist = artist; np.title = title;
    artist = artist.replace(/ /g, "_");title = title.replace(/ /g, "_");
    if(readLyrics(artist, title, callback)) {document.getElementById('NoLyricsFound').style.display = 'none'; return;}
    request('http://lyrics.wikia.com/'+artist+':'+title, function (error, response, html) {
      if (!error && response.statusCode == 200) {
        var $ = cheerio.load(html);

        // Extracting the lyrics
        lyricBox = $('div.lyricbox');
        lyricBox.find('div.rtMatcher').remove(); // Removing ads
        lyricBox.find('script').remove();
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

function addMenu() {
    var alignLyrics = function (pos) { document.getElementById('lyrics').style.textAlign = pos; }
    var zoom = function (n) {if(n==0) {win.zoomLevel=0} else {win.zoomLevel = win.zoomLevel + n}}
    var menubar = new gui.Menu({type: 'menubar'})
    var alignMenu = new gui.Menu(), zoomMenu = new gui.Menu();
    win.menu = menubar;
    var leftButton = new gui.MenuItem({ label: 'Left', click: function() { alignLyrics('left'); } });
    var centerButton = new gui.MenuItem({ label: 'Center', click: function() { alignLyrics('center'); } });
    var rightButton = new gui.MenuItem({ label: 'Right', click: function() { alignLyrics('right'); } });
    var zoomIn = new gui.MenuItem({ label: 'Zoom In', click: function() { zoom(1); } });
    var zoomOut = new gui.MenuItem({ label: 'Zoom out', click: function() { zoom(-1); } });
    var zoomReset = new gui.MenuItem({ label: 'Reset Zoom', click: function() { zoom(0); } });
    alignMenu.append(leftButton);
    alignMenu.append(centerButton);
    alignMenu.append(rightButton);
    zoomMenu.append(zoomIn);
    zoomMenu.append(zoomOut);
    zoomMenu.append(zoomReset);
    win.menu.insert(new gui.MenuItem({ label: 'Align', submenu: alignMenu }), 2)
    win.menu.insert(new gui.MenuItem({ label: 'Zoom', submenu: zoomMenu }), 3)
}

addMenu();
itunes.currentTrack();
