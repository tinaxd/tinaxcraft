#!/bin/bash -x
npm run build && \
cp -r dist/* ../tinaxcraft-deploy/ && \
mv ../tinaxcraft-deploy/index.html ../tinaxcraft-deploy/home.html && \
touch ../tinaxcraft-deploy/index.php && \
echo '<?php include_once("home.html"); ?>' > ../tinaxcraft-deploy/index.php
