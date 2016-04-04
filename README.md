About
=====
`ngx_proxy_cache_invalidate` is `nginx` module which adds ability to invalidate **whole cache zone**.
It does not purge the cache nor clear filesystem but make each of elements "expired" as
if the file would be actually removed.

Side effects:
 - If you have multiple instances of nginx sharing cache zone via filesystem,
   the cache invalidated _only_ for instance handling directive.
 - If the nginx restarted between invalidation and the cache update, the cache will have old values.

Status
======
Tested with `1.8.0`, `1.8.1` under `valgrind`.

Configuration directives (same location syntax)
===============================================
proxy_cache_invalidate
-------------------
* **syntax**: `proxy_cache_invalidate string ...;`
* **default**: `none`
* **context**: `http`, `server`, `location`

Defines conditions under which the cache zone defined by `proxy_cache` will be invalidated prior processing request.
If at least one value of the string parameters is not empty and is not equal to “0” then the cache zone will be invalidated:

    proxy_cache            zone_one;
    proxy_cache_invalidate $cookie_invalidate $arg_invalidate;

Credits
=======    
 * Igor Sysoev, Nginx, Inc. - http://www.nginx.org
 * FRiCKLE <info@frickle.com>, Piotr Sikora <piotr.sikora@frickle.com> - https://github.com/FRiCKLE/ngx_cache_purge
 * Evan Miller - http://www.evanmiller.org/nginx-modules-guide.html

License
=======
    Copyright (c) 2015 Sergey Egorov <egorovhome@gmail.com>

    All rights reserved.

    Redistribution and use in source and binary forms, with or without
    modification, are permitted provided that the following conditions
    are met:
    1. Redistributions of source code must retain the above copyright
       notice, this list of conditions and the following disclaimer.
    2. Redistributions in binary form must reproduce the above copyright
       notice, this list of conditions and the following disclaimer in the
       documentation and/or other materials provided with the distribution.

    THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
    "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
    LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
    A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
    HOLDERS OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
    SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
    LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
    DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
    THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
    (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
    OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
