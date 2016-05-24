var should = require('should'),
    should_http = require('should-http'),
    request = require('superagent');

//
// Dummy REST server
//
var express = require('express'),
    bodyParser = require('body-parser');
    server,
    app = express(),
    data = {
        counter: 0
    };

app.use(bodyParser.json());
app.get('/counter', function (req, res) {
    data.counter++;
    res.send(data);
});
app.put('/counter', function (req, res) {
    data.counter = req.body.counter;
    res.send(data);
});
app.get(function (req, res) {
    // THIS PLACE SHALL NEVER BE CALLED!!!
    shoule(req).be.empty();
});

var server;

//
//
//
function check_counter(n, done) {
    return function (err, res) {
        should(err).be.null();
        res.should.have.status(200);
        res.should.be.json();
        res.body.counter.should.be.eql(n);
        done();
    }
};

function test_url_counter(url, n) {
    var value = n;
    var test_name = 'shall return counter ' + value;
    it(test_name, function (done) {
        request
            .get(url)
            .end(check_counter(value, done));
    });
}

//
//
//
var url_rest_server_counter          = 'http://127.0.0.1:9102/counter';
var url_proxy_no_cache_counter       = 'http://127.0.0.1:9100/counter';
var url_proxy_cache_zone_one_counter = 'http://127.0.0.1:9100/zone_one/counter';
var url_proxy_cache_zone_two_counter = 'http://127.0.0.1:9100/zone_two/counter';

describe('The ngx_proxy_cache_invalidate', function () {

    //
    //
    //
    describe('The REST server', function () {
        it('shall start', function (done) {
            server = app.listen(9102, done);
        });
        test_url_counter(url_rest_server_counter, 1);
    });

    //
    //
    //
    describe('The NGINX server', function () {
        it('shall run', function (done) {
            request
                .get('http://127.0.0.1:9100/absent_url')
                .end(function (err, res) {
                    should(err).not.be.null();
                    res.should.have.status(404);
                    done();
                });
        });

        //
        // Test no cached data
        //
        test_url_counter(url_proxy_no_cache_counter, 2);
        test_url_counter(url_proxy_no_cache_counter, 3);
        test_url_counter(url_proxy_no_cache_counter, 4);
        test_url_counter(url_proxy_no_cache_counter, 5);

        //
        // Test zone one
        //
        test_url_counter(url_proxy_cache_zone_one_counter, 6);
        test_url_counter(url_proxy_cache_zone_one_counter, 6);
        test_url_counter(url_proxy_cache_zone_one_counter, 6);
        test_url_counter(url_proxy_cache_zone_one_counter, 6);

        //
        // Test zone two
        //
        test_url_counter(url_proxy_cache_zone_two_counter, 7);
        test_url_counter(url_proxy_cache_zone_two_counter, 7);
        test_url_counter(url_proxy_cache_zone_two_counter, 7);
        test_url_counter(url_proxy_cache_zone_two_counter, 7);

        //
        // The zone one shall has 5sec caching time
        //
        test_url_counter(url_proxy_cache_zone_one_counter, 6);
        it('The NGINX server zone one need 5 sec to expire', function (done) {
            this.timeout(10000);
            setTimeout(done, 5000+1000);
        });
        test_url_counter(url_proxy_cache_zone_one_counter, 8);
        test_url_counter(url_proxy_cache_zone_one_counter, 8);
        test_url_counter(url_proxy_cache_zone_one_counter, 8);
        test_url_counter(url_proxy_cache_zone_one_counter, 8);

        //
        // Even the zone one is expired,
        // the zone two still shall has old value
        //
        test_url_counter(url_proxy_cache_zone_two_counter, 7);
        test_url_counter(url_proxy_cache_zone_two_counter, 7);
        test_url_counter(url_proxy_cache_zone_two_counter, 7);
        test_url_counter(url_proxy_cache_zone_two_counter, 7);

        //
        // Try to update counter via zone_two
        // It shall invalidate the cache
        //
        it('PUT shall update counter', function (done) {
            request
                .put(url_proxy_cache_zone_two_counter)
                .type('json')
                .send({ counter: 0 })
                .end(check_counter(0, done));
        });
        // Then the first GET shall populate it
        test_url_counter(url_proxy_cache_zone_two_counter, 1);
        test_url_counter(url_proxy_cache_zone_two_counter, 1);
        test_url_counter(url_proxy_cache_zone_two_counter, 1);
        test_url_counter(url_proxy_cache_zone_two_counter, 1);
    });

    describe('The REST server', function () {
        it('shall be closed', function (done) {
            server.close(done);
        })
    });
});
