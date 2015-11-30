#!/bin/bash
/System/Library/Frameworks/CoreServices.framework/Versions/A/Frameworks/LaunchServices.framework/Versions/A/Support/lsregister -dump | grep -e 'path:.*nwjs.app$' | awk '{print substr($0,index($0,"/"))}'
