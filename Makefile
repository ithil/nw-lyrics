NW_PATH = `./build/getNWPath.sh`
APPNAME= 'Lyrics-NW.app'

all:
	test -d $(NW_PATH) || echo "Error: node-webkit is not installed"
	cp -r $(NW_PATH) ./$(APPNAME)
	cp ./build/Info.plist ./$(APPNAME)/Contents
	cp ./imgs/icon.icns ./$(APPNAME)/Contents/Resources/app.icns
	mkdir -p ./$(APPNAME)/Contents/Resources/app.nw
	cp -r ./package.json ./lyrics.js ./lyrics.html ./style.css ./node_modules ./jquery-2.1.3.min.js ./$(APPNAME)/Contents/Resources/app.nw 

link:
	test -d $(NW_PATH) || echo "Error: node-webkit is not installed"
	mkdir -p ./$(APPNAME)
	mkdir -p ./$(APPNAME)/Contents
	ln -s $(NW_PATH)/Contents/Frameworks ./$(APPNAME)/Contents
	cp $(NW_PATH)/Contents/PkgInfo ./$(APPNAME)/Contents
	cp -r $(NW_PATH)/Contents/MacOS ./$(APPNAME)/Contents
	cp ./build/Info.plist ./$(APPNAME)/Contents
	mkdir -p ./$(APPNAME)/Contents/Resources
	cp ./imgs/icon.icns ./$(APPNAME)/Contents/Resources/app.icns
	mkdir -p ./$(APPNAME)/Contents/Resources/app.nw
	cp -r ./package.json ./lyrics.js ./lyrics.html ./style.css ./node_modules ./jquery-2.1.3.min.js ./$(APPNAME)/Contents/Resources/app.nw 

clean:
	rm -rf ./$(APPNAME)

install:
	test -d $(APPNAME) || echo "Error: Run `make` or `make link` first"
	cp -R ./$(APPNAME) /Applications
	
