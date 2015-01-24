var request = require('request');
var cheerio = require('cheerio');
var itunes = require('playback');
var fs = require('fs');
var gui = require('nw.gui');
var win = gui.Window.get();
var app = gui.App;
var np = { };
var lyrics_dir = process.env['HOME']+'/.lyrics';

$(document).ready(function() {
   NRdiv = $('#iTunesNotRunning');
   lyricsDiv = $('#lyrics');
   headerDiv = $('#header');
   loaderDiv = $('#loader');
   noLyricsDiv = $('#NoLyricsFound');
   itunes.currentTrack();
});

win.on('close', function() {this.hide()});
app.on('reopen', function() {win.show(); win.focus()})
itunes.on('playing', function(data) {
   if(!data) {
        NRdiv.show();
        lyricsDiv.hide();
        headerDiv.hide();
        loaderDiv.hide();
        return;
   }
   checkIfNewSong(data.artist, data.name, function (artist, title) {
       setCurrentTrack(artist, title);
   });
})

$(document).keydown(function(evt) {
    if ((evt.which == '115' || evt.which == '83' ) && (evt.ctrlKey || evt.metaKey)) // Cmd+S
        {
            evt.preventDefault();
            lyricsDiv.removeAttr('class');
            lyricsDiv.removeAttr('contenteditable');
            var lyrics = lyricsDiv.text();
            var artist = np.artist.replace(/ /g, "_"); var title = np.title.replace(/ /g, "_")
            saveLyrics(artist, title, lyrics);
            return false;
        }
    if (evt.keyCode == 27) { // Escape
            evt.preventDefault();
            lyricsDiv.removeAttr('class');
            lyricsDiv.removeAttr('contenteditable');
            var artist = np.artist.replace(/ /g, "_"); var title = np.title.replace(/ /g, "_")
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
});

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
    noLyricsDiv.hide();
    lyricsDiv.show();
    lyricsDiv.attr('class', "editmode");
    lyricsDiv.attr('contenteditable', "true");
    if(focus) { lyricsDiv.focus(); }
}

function markAsInstrumental(artist, title) {
    var artist = artist || np.artist;
    var title = title || np.title;
    saveLyrics(artist, title, "Instrumental");
    setLyrics('Instrumental');
    noLyricsDiv.hide();
    lyricsDiv.show();
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
        var aBox = $('#searchArtist');
        var tBox = $('#searchTitle');
        var artist = aBox.val();
        var title = tBox.val();
        toggleSearch();
        setCurrentTrack(artist, title);
    };
};

$('#searchArtist').keypress(onSearch);
$('#searchTitle').keypress(onSearch);

$('#header').dblclick(function() {
    var aBox = $('#searchArtist');
    var tBox = $('#searchTitle');
    aBox.val(np.artist);
    tBox.val(np.title);
    toggleSearch();
});

function toggleSearch() {
    var sBox = $('#search');
    var lBox = lyricsDiv;
    if(typeof sBox == "undefined") {return;}
    sBox.toggle();
    lBox.toggle();
}

function setHeader(artist, title) {
    headerDiv.show(); //Make header visible
    var divArtist = $('#artist');
    divArtist.text(artist);
    var divTitle = $('#title');
    divTitle.text(title);
    autoSizeText(divArtist[0]); autoSizeText(divTitle[0]);
}

function checkIfNewSong(artist, title, callback) {
    if(!( (np.title == title) && (np.artist == artist) )) {
        callback(artist, title);
    }
}

function setCurrentTrack(artist, title) {
    lyricsDiv.hide();
    loaderDiv.show();
    NRdiv.hide();
    np.artist = artist; np.title = title;
    setHeader(artist, title);
    getLyrics(artist, title);
    window.scrollTo(0,0);
}

function setLyrics(lyrics) {
    lyricsDiv.show();
    lyricsDiv[0].innerText = lyrics; //jQuery would ignore the newlines
    noLyricsDiv.hide();
    loaderDiv.hide();
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
    artist = artist.replace(/ /g, "_");title = title.replace(/ /g, "_");
    if(readLyrics(artist, title, callback)) {return;}
    request('http://lyrics.wikia.com/'+artist+':'+title, function (error, response, html) {
      if (!error && response.statusCode == 200) {
        var ch$ = cheerio.load(html);

        // Extracting the lyrics
        lyricBox = ch$('div.lyricbox');
        lyricBox.find('div.rtMatcher').remove(); // Removing ads
        lyricBox.find('script').remove();
        lyricBox.find('br').each(function(i,e) { ch$(this).replaceWith("\n")}); // Adding newlines
        myLyrics = lyricBox.text().trim();  // Removing trailing newlines
        if(!callback) {
            //Saving lyrics
            saveLyrics(artist, title, myLyrics.toString());
            setLyrics(myLyrics);
        }
        else { callback(myLyrics); }
      }
      else {
        setLyrics('');
        lyricsDiv.hide();
        noLyricsDiv.show();
      }
    })
}

function addMenu() {
    var alignLyrics = function (pos) { lyricsDiv.css('text-align', pos); }
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
