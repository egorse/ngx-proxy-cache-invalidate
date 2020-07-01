#!/bin/sh
set -e

#
# Build the nginx
#
echo "Build"
make .build/nginx     # Build nginx
rm -rf .build/.zone_* # Clear cache
rm -rf .build/logs/*  # Clear logs

#
# Spawn:
#  - nginx
#
echo "Setup"
#valgrind --tool=memcheck --leak-check=full --trace-children=yes --log-file=.build/logs/valgrind-nginx.log -q \
.build/nginx -c ../nginx.conf & # The pid will be in .build/nginx.pid
while [ ! -f .build/nginx.pid ] ; do sleep 1; done # Wait until nginx got up and running

echo "Test"
FAILED=0
node_modules/.bin/_mocha test.js || FAILED=1

#
# Killall processes
#
echo "Teardown"
for f in .build/*.pid; do
    kill $(cat $f) 2>/dev/null || true
    rm -f $f
done

#
#
#
if [ $FAILED -ne 0 ]; then
    echo "FAILED!!!"
else
    echo "Pass!!!"
fi
