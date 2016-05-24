#!/bin/sh
set -e
TEST_DURATION_SEC=600
TEST_CONCURENCY=10
TEST_N=5000000

#
# Build the nginx
#
echo "Build"
make .build/nginx     # Build nginx
rm -rf .build/.zone_* # Clear cache

#
# Spawn:
#  - rest server
#  - nginx
#
echo "Setup"
node ../common/rest-server.js 9002 &
echo $! > .build/node.pid
valgrind --tool=memcheck --leak-check=full --trace-children=yes --log-file=.build/logs/valgrind-nginx.log -q .build/nginx -c ../nginx.conf & # The pid will be in .build/nginx.pid
while [ ! -f .build/nginx.pid ] ; do sleep 1; done # The valgrind adds delay to start up. Wait until nginx got up and running

echo "Test"

echo "Starting clients..."
ab -t $TEST_DURATION_SEC -c $TEST_CONCURENCY -n $TEST_N -k http://127.0.0.1:9000/counter1          > .build/logs/ab-counter1.log &
echo $! > .build/ab1.pid
ab -t $TEST_DURATION_SEC -c $TEST_CONCURENCY -n $TEST_N -k http://127.0.0.1:9000/zone_one/counter2 > .build/logs/ab-counter2.log &
echo $! > .build/ab2.pid
ab -t $TEST_DURATION_SEC -c $TEST_CONCURENCY -n $TEST_N -k http://127.0.0.1:9000/zone_one/counter3 > .build/logs/ab-counter3.log &
echo $! > .build/ab3.pid
ab -t $TEST_DURATION_SEC -c $TEST_CONCURENCY -n $TEST_N -k http://127.0.0.1:9000/zone_two/counter4 > .build/logs/ab-counter4.log &
echo $! > .build/ab4.pid
ab -t $TEST_DURATION_SEC -c $TEST_CONCURENCY -n $TEST_N -k http://127.0.0.1:9000/zone_two/counter5 > .build/logs/ab-counter5.log &
echo $! > .build/ab5.pid

echo "Start droppers..."
ab -t $TEST_DURATION_SEC -c $TEST_CONCURENCY -n $TEST_N -k http://127.0.0.1:9000/zone_one/counter11?invalidate=1 > .build/logs/ab-counter11.log &
echo $! > .build/ab11.pid
ab -t $TEST_DURATION_SEC -c $TEST_CONCURENCY -n $TEST_N -k http://127.0.0.1:9000/zone_two/counter12?invalidate=1 > .build/logs/ab-counter12.log &
echo $! > .build/ab12.pid

echo "Waiting clients to complete..."
sleep $TEST_DURATION_SEC
sleep 2

#
# Killall processes
#
echo "Teardown"
for f in .build/*.pid; do
    kill $(cat $f) 2>/dev/null || true
    rm -f $f
done
#killall memcheck-amd64-
