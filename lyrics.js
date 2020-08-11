const Configstore = require('configstore');
const config = new Configstore("nw-lyrics");

var fs = require('fs');
const { exec } = require('child_process');
var request = require('request')
var ddg = require('node-ddg').default;
var osascript = require('node-osascript');
var Spotify = require('node-spotify-api');
var spotify = new Spotify({
  id: config.get('spotify.credentials.id'),
  secret: config.get('spotify.credentials.secret')
});
var gui = require('nw.gui');
var win = gui.Window.get();
var app = gui.App;
var np = { };
var lyricsProviders = (function() {
  var obj = require('./lyricsProviders.js');
  var arr = new Array();
  $.each(obj, function(name, item) {
    arr.push(item);
  });
  return arr;
})();
var npProviders = require('./nowPlayingProviders.js');
var lyrics_dir = process.env['HOME']+'/.lyrics';

$(document).ready(function() {
 lyricsDiv = $('#lyrics');
 headerDiv = $('#header');
 loaderDiv = $('#loader');
 noLyricsDiv = $('#NoLyricsFound');
 getNowPlaying();
});

win.on('close', function(event) {
  if(event=="quit") {
    win.close(true);
  }
  else{
    this.leaveFullscreen();
    this.hide();
  }
});
app.on('reopen', function() {win.show(); win.focus()})

app.on('open', function(droppedContent) {
  var spotifyPattern = new RegExp('open.spotify.com/track/([^?/]+)');
  var ytPattern = /.*(?:youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=)([^#\&\?]*).*/;
  var links = droppedContent.split(RegExp('https?://'));
  if (links[1]) {
    var match = links[1].match(spotifyPattern);
    if (match && match[1]) {
      spotify.request('https://api.spotify.com/v1/tracks/'+match[1])
      .then(function(data) {
        setCurrentTrack(data.artists[0].name, data.name)})
      .catch(function(err) {console.log(err)});
    }
    else if (links[1].match(ytPattern)) {
      exec('/usr/local/bin/youtube-dl -j "https://'+links[1]+'"', (err, stdout, stderr) => {
        if (err) {
          console.error('Error: '+stderr);
        }
        else {
          video = JSON.parse(stdout);
          if(video.artist && video.track) {
            setCurrentTrack(video.artist, video.track);
          }
        }
      });
    }
  }
});

win.on('enter-fullscreen', function() {
  $("html *").addClass('fullscreen');
  lyricsDiv.hide();
  $('title').text(np.title + " \u2013 " + np.artist);
  setTimeout(function() {lyricsDiv.show();}, 0);
});
win.on('restore', function() {
  $("html *").removeClass('fullscreen');
  $('title').text("Lyrics");
  lyricsDiv.hide();
  setTimeout(function() {lyricsDiv.show();}, 0);
  autoSizeText($('#title')[0]);
  autoSizeText($('#artist')[0]);
});
window.addEventListener('resize', function(event){
  autoSizeText($('#title')[0]);
  autoSizeText($('#artist')[0]);
});

$(document).keydown(function(evt) {
  if ((evt.which == '115' || evt.which == '83' ) && (evt.ctrlKey || evt.metaKey)) // Cmd+S
  {
    evt.preventDefault();
    lyricsDiv.removeClass('editmode');
    lyricsDiv.removeAttr('contenteditable');
    var lyrics = lyricsDiv[0].innerText;
    applyInstrumentalCss();
    saveLyrics(np.artist, np.title, lyrics);
    return false;
  }
  if ((evt.which == '187') && (evt.ctrlKey || evt.metaKey)) // Cmd + +
  {
    evt.preventDefault();
    zoom(1);
  }
  if ((evt.which == '189') && (evt.ctrlKey || evt.metaKey)) // Cmd + -
  {
    evt.preventDefault();
    zoom(-1);
  }
  if ((evt.which == '48') && (evt.ctrlKey || evt.metaKey)) // Cmd + 0
  {
    evt.preventDefault();
    zoom(0);
  }
  if ((evt.which == '109' || evt.which == '77' ) && (evt.ctrlKey || evt.metaKey)) // Cmd+M
  {
    evt.preventDefault();
    var artist = np.artist;
    var title = np.title;
    var query = artist + ' ' + title;
    gui.Shell.openExternal('http://songmeanings.com/query/?query='+encodeURIComponent(query));
    return false;
  }
  if ((evt.which == '109' || evt.which == '71' ) && (evt.ctrlKey || evt.metaKey)) // Cmd+G
  {
    evt.preventDefault();
    var artist = np.artist;
    var title = np.title;
    ddg({query:'site:genius.com '+title+' '+artist, maxResults: 3}).then(function(results) {
      if(results.length < 1) {callback(false); return(false)}
      gui.Shell.openExternal(results[0].url);
    });
    return false;
  }
  if (evt.keyCode == 27) { // Escape
    evt.preventDefault();
    if (lyricsDiv.hasClass('editmode') || $('#search').is(':visible')) {
      lyricsDiv.removeClass('editmode');
      lyricsDiv.removeAttr('contenteditable');
      var artist = np.artist.replace(/ /g, "_"); var title = np.title.replace(/ /g, "_")
      toggleSearch(false);
      readLyrics(artist, title);
    }
    else if ($('#jumpToWord').is(':visible')) {
      $('#jumpToWord').val('').blur().hide();
      $('#lyrics').unhighlight();
    }
    else {
      win.leaveFullscreen();
    }
  }
  var tag = evt.target.tagName.toLowerCase();
  if (tag != 'input' && tag != 'textarea' && evt.target.getAttribute('contenteditable') != 'true') {
    if (String.fromCharCode(evt.keyCode) == "R") {
      getNowPlaying();
    }
    if (String.fromCharCode(evt.keyCode) == "D") {
      require('nw.gui').Window.get().showDevTools()
    }
    if (String.fromCharCode(evt.keyCode) == "S") {
      toggleSearch();
    }
    if (String.fromCharCode(evt.keyCode) == "E") {
      editMode(true);
    }
    if (String.fromCharCode(evt.keyCode) == "F") {
      evt.preventDefault();
      $('#jumpToWord').show().focus();
    }
    if (String.fromCharCode(evt.keyCode) == "G" && evt.shiftKey) {
      // Scroll to bottom
      $('html, body').animate({
        scrollTop: $(document).height()
      }, 200);
    }
    else if (String.fromCharCode(evt.keyCode) == "G") {
      // Scroll to top
      $('html, body').animate({
        scrollTop: 0
      }, 200);
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
  lyricsDiv.addClass("editmode");
  lyricsDiv.removeClass('instrumental');
  lyricsDiv.attr('contenteditable', "true");
  if(focus) { lyricsDiv.focus(); }
}

function markAsInstrumental(artist, title) {
  var artist = artist || np.artist;
  var title = title || np.title;
  saveLyrics(artist, title, "Instrumental");
  setLyrics('Instrumental');
  applyInstrumentalCss();
  noLyricsDiv.hide();
  lyricsDiv.show();
}

function applyInstrumentalCss() {
  var txt = lyricsDiv.text();
  if(/^(\W+|^)Instrumental/.test(txt)) {;
    lyricsDiv.addClass('instrumental');
  }
  else {
    lyricsDiv.removeClass('instrumental');
  }
}

function webSearch(artist, title) {
  var artist = artist || np.artist;
  var title = title || np.title;
  var query = artist + ' ' + title + ' lyrics';
  gui.Shell.openExternal('http://google.com/search?q='+encodeURIComponent(query));
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

var currentHighlight = 0;
function onJumpToWord(e) {
  if (!e) e = window.event;
  if (e.shiftKey && e.keyCode == '9') { // Shift+Tab
  }
  if (e.keyCode == '9') { // Tab
    if(e.shiftKey) {
      currentHighlight -= 1;
    }
    else {
      currentHighlight += 1;
    }
    numHighlights = $('.highlight').length;
    if(numHighlights == 0) return;
    if (currentHighlight >= numHighlights) currentHighlight = 0;
    if (currentHighlight < 0) currentHighlight = numHighlights - 1;
    $('html, body').animate({
      scrollTop: $('.highlight')[currentHighlight].offsetTop
    }, 200);
    $('html *').removeClass('currentHighlight');
    $($('.highlight')[currentHighlight]).addClass('currentHighlight');
  }
  else if (e.keyCode == '13') { // Enter
    $('#jumpToWord').val('').blur().hide();
    $('#lyrics').unhighlight();
  }
  else if (e.keyCode != '27' && e.keyCode != '16') { // Everything but Escape
    var word = $('#jumpToWord').val();
    currentHighlight = 0;
    $('#lyrics').unhighlight();
    $('#lyrics').highlight(word);
    if($('.highlight').length > 0) {
      $('html, body').animate({
          scrollTop: $('.highlight')[0].offsetTop
      }, 200);
    }
  }
};

$('#jumpToWord').keyup(onJumpToWord);
$('#jumpToWord').keydown(function(e) {
  if (e.keyCode == '9') { // Tab
    e.preventDefault();
    e.stopPropagation();
  }
})

$('#header').dblclick(function() {
  var aBox = $('#searchArtist');
  var tBox = $('#searchTitle');
  aBox.val(np.artist);
  tBox.val(np.title);
  toggleSearch();
});

function toggleSearch(display) {
  var sBox = $('#search');
  var lBox = lyricsDiv;
  if(typeof sBox == "undefined") {return;}
  sBox.toggle(display);
  var inverseBool=function(b){if(typeof b=="undefined"){return b}else{return !b}}
  lBox.toggle(inverseBool(display));
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
  np.artist = artist; np.title = title;
  setHeader(artist, title);
  if(win.isFullscreen) {
    $('title').text(title + " \u2013 " + artist);
  }
  readLyrics(artist, title, function(succ, lyrics) {
    if (succ) {
      setLyrics(lyrics);
    }
    else {
      getLyrics(artist, title, function(succ, lyrics) {
        if(succ) {
          //Saving lyrics
          saveLyrics(artist, title, lyrics.toString());
          setLyrics(lyrics);
        }
        else {
          setLyrics('');
          lyricsDiv.hide();
          noLyricsDiv.show();
        }
      });
    }
  });
  window.scrollTo(0,0);
}

function setLyrics(lyrics) {
  lyricsDiv.show();
  lyricsDiv[0].innerText = lyrics; //jQuery would ignore the newlines
  noLyricsDiv.hide();
  loaderDiv.hide();
  applyInstrumentalCss();
}

function requeryLyrics(artist, title) {
  loaderDiv.show();
  getLyrics(artist, title, function(succ, lyrics) {
    if(succ) {
      //Saving lyrics
      saveLyrics(artist, title, lyrics.toString());
      setLyrics(lyrics);
    }
    loaderDiv.hide();
  });
}

function cleanFileName(str, reverse) {
  var fakeSlash = String.fromCharCode(8725);
  var realSlash = "/";
  return str.replace(RegExp(reverse?fakeSlash:realSlash,"g"), reverse?realSlash:fakeSlash);
}

function saveLyrics(artist, title, lyrics) {
  if(!fs.existsSync(lyrics_dir)) {fs.mkdirSync(lyrics_dir)}
  artist = cleanFileName(artist.replace(/ /g, "_"));title = cleanFileName(title.replace(/ /g, "_"));
  fs.writeFile(lyrics_dir+'/'+artist+':'+title+'.txt', lyrics.toString()+'\n');
}

function readLyrics(artist, title, callback) {
  if(!artist || !title) return false;
  artist = cleanFileName(artist.replace(/ /g, "_"));title = cleanFileName(title.replace(/ /g, "_"));
  if(fs.existsSync(lyrics_dir+'/'+artist+':'+title+'.txt')) {
    fs.readFile(lyrics_dir+'/'+artist+':'+title+'.txt', 'utf8', function (error, data) {
      if(error) throw error
      if(callback == null) {
        setLyrics(data);
      }
      else { callback(true, data) }
    });
  }
  else {
    callback(false);
  }
}

function getLyrics(artist, title, callback) {
  if(!artist || !title) {return false}
  var lyricsProvidersArr = Object.keys(lyricsProviders).map(function (key) {return lyricsProviders[key]});
  var asyncLoop = function (arr, index) {
    var item = arr[index];
    if(item) {
      item.func(artist, title, function (succ, lyrics) {
        if(succ) {
          callback(true, lyrics);
        }
        else {
          asyncLoop(arr, index+1);
        }
      });
    }
    else {
      callback(false);
    }
  }
  asyncLoop(lyricsProvidersArr, 0);
}

function getNowPlaying() {
  var defaultNP = config.get('nowplaying.default');
  var provider = defaultNP ? npProviders[defaultNP]  : npProviders[Object.keys(npProviders)[0]]
  provider.func({ config: config }, function(artist, title) {
    setCurrentTrack(artist, title)
  })
}

var zoom = function (n) {
  if(n==0) {win.zoomLevel=0} else {win.zoomLevel = win.zoomLevel + n}
  autoSizeText($('#title')[0]);
  autoSizeText($('#artist')[0]);
}

function addMenu() {
  var alignLyrics = function (pos) { lyricsDiv.css('text-align', pos); }
  var menubar = new gui.Menu({type: 'menubar'});
  menubar.createMacBuiltin("Lyrics");
  var alignMenu = new gui.Menu(), zoomMenu = new gui.Menu(), songMenu = new gui.Menu(), npMenu = new gui.Menu();
  win.menu = menubar;
  // Align menu
  win.menu.insert(new gui.MenuItem({ label: 'Align', submenu: alignMenu }), 2);
  alignMenu.append(new gui.MenuItem({ label: 'Left', click: function() { alignLyrics('left'); } }));
  alignMenu.append(new gui.MenuItem({ label: 'Center', click: function() { alignLyrics('center'); } }));
  alignMenu.append(new gui.MenuItem({ label: 'Right', click: function() { alignLyrics('right'); } }));
  // Zoom menu
  win.menu.insert(new gui.MenuItem({ label: 'Zoom', submenu: zoomMenu }), 3);
  zoomMenu.append(new gui.MenuItem({ label: 'Zoom In', click: function() { zoom(1); } }));
  zoomMenu.append(new gui.MenuItem({ label: 'Zoom out', click: function() { zoom(-1); } }));
  zoomMenu.append(new gui.MenuItem({ label: 'Reset Zoom', click: function() { zoom(0); } }));
  // Song menu
  win.menu.insert(new gui.MenuItem({ label: 'Song', submenu: songMenu }), 4);
  songMenu.append(new gui.MenuItem({ label: 'Requery Lyrics', click: function() { requeryLyrics(np.artist, np.title); } }));
  songMenu.append(new gui.MenuItem({ label: 'Mark as Instrumental', click: function() { markAsInstrumental(); } }));
  songMenu.append(new gui.MenuItem({ label: 'Web Search', click: function() { webSearch(); } }));
  // Now Playing menu
  win.menu.insert(new gui.MenuItem({ label: 'Now Playing', submenu: npMenu }), 5);
  var uncheckNPItems = function() {
    for (var item of win.menu.items[5].submenu.items) {
      item.checked = false;
    }
  }
  for (var name in npProviders) {
    npMenu.append(new gui.MenuItem({
      type: 'checkbox',
      checked: config.get('nowplaying.default') == name,
      label: name,
      click: function() {
        config.set('nowplaying.default', this.label);
        uncheckNPItems();
        this.checked = true;
      }
    }));
  }
}
addMenu();
