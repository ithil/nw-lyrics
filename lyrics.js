var request = require('request')
var cheerio = require('cheerio')
var exec = require('child_process').exec
var fs = require('fs')

var lyrics_dir = process.env['HOME']+'/.lyrics'

document.onkeydown = function(evt) {
    var tag = evt.target.tagName.toLowerCase();
    if (tag != 'input' && tag != 'textarea') { 
        if (String.fromCharCode(evt.keyCode) == "R") {
            refreshLyrics();
        }
        if (String.fromCharCode(evt.keyCode) == "D") {
            require('nw.gui').Window.get().showDevTools()
        }
        if (String.fromCharCode(evt.keyCode) == "S") {
            toggleSearch();
        }
    };
}

function onSearch(e) {
    if (!e) e = window.event;
    if (e.keyCode == '13') {
        aBox = document.getElementById('searchArtist');
        tBox = document.getElementById('searchTitle');
        info = [aBox.value, tBox.value];
        toggleSearch();
        getLyrics(info);
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
function refreshLyrics(info) {
    if(info) {getLyrics(info); return}
    exec('osascript nowplaying.scpt', 
            function (error, stdout, stderr) {
                output = String(stdout)
                if(output && output.length > 0) {
                   info = output.split("\n") 
                }
                getLyrics(info)
             })
}

function setTopbar(artist, title) {
    document.getElementById('topbar').style.display = 'block'; //Make topbar visible
    document.getElementById('artist').innerText = artist;
    document.getElementById('title').innerText = title;
}

setLyrics = function(lyrics) {
        lyricsDiv = document.getElementById('lyrics')
        lyricsDiv.innerText = lyrics
}

function getLyrics(info) {
    if(!info) {return}
    setTopbar(info[0], info[1])
    artist = info[0].replace(/ /g, "_");title = info[1].replace(/ /g, "_")
    if(fs.existsSync(lyrics_dir+'/'+artist+':'+title+'.txt')) {
        fs.readFile(lyrics_dir+'/'+artist+':'+title+'.txt', function (error, data) {
            if(error) throw error
            setLyrics(data)
        })
        return;
    }
    request('http://lyrics.wikia.com/'+artist+':'+title, function (error, response, html) {
      if (!error && response.statusCode == 200) {
        //console.log(html)
        var $ = cheerio.load(html)

        // Extracting the lyrics
        lyricBox = $('div.lyricbox')
        lyricBox.find('div.rtMatcher').remove() // Removing ads
        lyricBox.find('br').each(function(i,e) { $(this).replaceWith("\n")}) // Adding newlines
        myLyrics = lyricBox.text().trim()  // Removing trailing newlines
        //Saving lyrics
        if(!fs.existsSync(lyrics_dir)) {fs.mkdirSync(lyrics_dir)}
        fs.writeFile(lyrics_dir+'/'+artist+':'+title+'.txt', myLyrics.toString())
        setLyrics(myLyrics)
      }
    })
}

refreshLyrics()
