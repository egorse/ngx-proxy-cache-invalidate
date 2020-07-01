#!/bin/sh
set -e

#
# Build the nginx
#
make .build/nginx
rm -rf .build/.zone_*

#
# Spawn:
#  - rest server
#  - nginx
#
node ../common/rest-server.js 9002 &
echo $! > .build/node.pid
valgrind --tool=memcheck --leak-check=full --trace-children=yes --log-file=.build/logs/valgrind-nginx.log -q .build/nginx -c ../nginx.conf & # The pid will be in .build/nginx.pid
while [ ! -f .build/nginx.pid ] ; do sleep 1; done # The valgrind adds delay to start up. Wait until nginx got up and running

echo "\n/counter"
curl -o - -X GET http://127.0.0.1:9000/counter
curl -o - -X GET http://127.0.0.1:9000/counter
curl -o - -X GET http://127.0.0.1:9000/counter
echo "\n/zone_one/counter"
curl -o - -X GET http://127.0.0.1:9000/zone_one/counter
curl -o - -X GET http://127.0.0.1:9000/zone_one/counter
curl -o - -X GET http://127.0.0.1:9000/zone_one/counter
echo "\n/zone_two/counter"
curl -o - -X GET http://127.0.0.1:9000/zone_two/counter
curl -o - -X GET http://127.0.0.1:9000/zone_two/counter
curl -o - -X GET http://127.0.0.1:9000/zone_two/counter

echo "\n/zone_one/counter?invalidate=1"
curl -o - -X GET http://127.0.0.1:9000/zone_one/counter?invalidate=1
curl -o - -X GET http://127.0.0.1:9000/zone_one/counter?invalidate=1
curl -o - -X GET http://127.0.0.1:9000/zone_one/counter?invalidate=1
echo "\n/zone_two/counter?invalidate=1"
curl -o - -X GET http://127.0.0.1:9000/zone_two/counter?invalidate=1
curl -o - -X GET http://127.0.0.1:9000/zone_two/counter?invalidate=1
curl -o - -X GET http://127.0.0.1:9000/zone_two/counter?invalidate=1

echo "\n/counter"
curl -o - -X GET http://127.0.0.1:9000/counter
curl -o - -X GET http://127.0.0.1:9000/counter
curl -o - -X GET http://127.0.0.1:9000/counter
echo "\n/zone_one/counter"
curl -o - -X GET http://127.0.0.1:9000/zone_one/counter
curl -o - -X GET http://127.0.0.1:9000/zone_one/counter
curl -o - -X GET http://127.0.0.1:9000/zone_one/counter
echo "\n/zone_two/counter"
curl -o - -X GET http://127.0.0.1:9000/zone_two/counter
curl -o - -X GET http://127.0.0.1:9000/zone_two/counter
curl -o - -X GET http://127.0.0.1:9000/zone_two/counter

#
# Killall processes
#
for f in .build/*.pid; do
    kill $(cat $f)
    rm -f $f
done
