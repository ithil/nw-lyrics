![Icon](http://i.imgur.com/u5TWPYJ.png) Lyrics NW
=========

Lyrics App for Mac OS X build ontop of Node-Webkit

![Screenshot](http://i.imgur.com/LhfoW0d.png)
##Features
* Automatically **fetches** lyrics to track played in iTunes
* Lyrics is being **saved** to *~/.lyrics*
* You can **add** lyrics manually (if it's not on lyrics.wikia.com) or **edit** it (by double-clicking the lyrics)
* Pressing **S** you can fetch lyrics manually as well (if it's not in your iTunes library, for example)

##Limitations and caveats
* If `node-webkit` is already installed on your system you are advised to use `make link`, as it decreases the size significantly (~75MB vs. ~5MB). **Note**, however, that if you move or remove `node-webkit`, `nw-lyrics` will fail to start!
* Since `nw-lyrics` is built ontop the heavyweight `node-webkit` it might take a while to start up. However, once it's started it runs smoothly.
