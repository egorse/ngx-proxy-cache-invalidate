var should = require('should'),
    should_http = require('should-http'),
    request = require('superagent');

//
// Dummy REST server
//
var express = require('express'),
    bodyParser = require('body-parser'),
    cookieParser = require('cookie-parser'),
    server,
    app = express(),
    session_id = '5b428f61-3292-4cc1-ac6d-ecbf126dd976',
    data = {
        counter: 0,
        auth_counter: 0
    };

app.use(bodyParser.json());
app.use(cookieParser());
app.get('/counter', function (req, res) {
    data.counter++;
    res.send(data);
});
app.put('/counter', function (req, res) {
    data.counter = req.body.counter;
    res.send(data);
});

//
//
//
app.post('/login', function (req, res) {
    data.auth_counter = 0;
    res.cookie('SESSIONID', session_id);
    res.sendStatus(200);
});
app.get('/check', function (req, res) {
    data.auth_counter++;
    if (req.cookies["SESSIONID"] != session_id) {
        res.sendStatus(403);
        return;
    }

    res.sendStatus(200);
});

//
//
//
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
function check_auth_counter(n, done) {
    return function (err, res) {
        should(err).be.null();
        res.should.have.status(200);
        res.should.be.json();
        res.body.auth_counter.should.be.eql(n);
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
function test_url_auth_counter(url, n) {
    var value = n;
    var test_name = 'shall return auth_counter ' + value;
    it(test_name, function (done) {
        request
            .get(url)
            .end(check_auth_counter(value, done));
    });
}

//
//
//
var url_rest_server_counter   = 'http://127.0.0.1:9102/counter';
var url_proxy                 = 'http://127.0.0.1:9100';
var url_proxy_direct          = url_proxy + '/counter';
var url_proxy_cache           = url_proxy + '/zone_data/counter';

describe('The auth_request cache', function () {

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
        // Test data
        //
        test_url_counter(url_proxy_direct, 2);
        test_url_counter(url_proxy_direct, 3);
        test_url_counter(url_proxy_cache,  4);
        test_url_counter(url_proxy_direct, 5);
        test_url_counter(url_proxy_cache,      4);
        test_url_counter(url_proxy_direct, 6);
        test_url_counter(url_proxy_cache,      4);
        test_url_counter(url_proxy_direct, 7);

        //
        // Auth test sequence
        //
        test_url_auth_counter(url_proxy_direct, 0); // counter became 8
        it('shall login succesfully', function (done) {
            request
                .post(url_proxy + '/user/login')
                .end(function (err, res) {
                    should(err).be.null();
                    res.should.have.status(200);
                    // TODO Proper cookies test for SESSIONID
                    done();
                });
        });

        it('shall access cached protected counter', function (done) {
            request
                .get(url_proxy + '/private_data/counter')
                .set('Cookie', 'SESSIONID=' + session_id)
                .end(function (err, res) {
                    res.should.have.status(200);
                    res.should.be.json();
                    res.body.counter.should.be.eql(9);
                    done();
                });
        });
        it('shall access cached protected counter', function (done) {
            request
                .get(url_proxy + '/private_data/counter')
                .set('Cookie', 'SESSIONID=' + session_id)
                .end(function (err, res) {
                    res.should.have.status(200);
                    res.should.be.json();
                    res.body.counter.should.be.eql(9);
                    done();
                });
        });
        it('shall access cached protected counter', function (done) {
            request
                .get(url_proxy + '/private_data/counter')
                .set('Cookie', 'SESSIONID=' + session_id)
                .end(function (err, res) {
                    res.should.have.status(200);
                    res.should.be.json();
                    res.body.counter.should.be.eql(9);
                    done();
                });
        });
        test_url_counter(url_proxy_direct, 10);
        test_url_auth_counter(url_proxy_direct, 1);
    });

    describe('The REST server', function () {
        it('shall be closed', function (done) {
            server.close(done);
        })
    });
});
