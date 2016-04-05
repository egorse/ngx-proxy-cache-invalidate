About
=====
`ngx-proxy-cache-invalidate` is `nginx` module which adds ability to invalidate **whole cache zone**.
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
    set $do_invalidate 0;
    if ($request_method = PUT) {
        set $do_invalidate 1;
    }
    proxy_cache_invalidate $do_invalidate;

Credits
=======    
 * Igor Sysoev, Nginx, Inc. - http://www.nginx.org
 * FRiCKLE <info@frickle.com>, Piotr Sikora <piotr.sikora@frickle.com> - https://github.com/FRiCKLE/ngx_cache_purge
 * Evan Miller - http://www.evanmiller.org/nginx-modules-guide.html
